import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuth from '../context/useAuth'
import PasswordInput from '../components/PasswordInput'
import PhoneInput from '../components/PhoneInput'
import DateInput from '../components/DateInput'
import { loginWithPasskey, isWebAuthnSupported, detectBiometricPlatform } from '../services/webauthn'
import BiometricIcon from '../components/BiometricIcon'
import { callFunction } from '../services/api'
import { loginWithCredentials, applySessionAndUser } from '../services/auth'
import { supabase } from '../services/supabaseClient'

/* mode: 'login' | 'forgot' | 'changeRequired' | 'setRecoveryCode' */

// نسخة موحَّدة — نفس صيغة كل ملفات الموقع الأخرى (Register.jsx وغيرها)
function normalizeToIntlPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('00966')) return digits.slice(2)
  if (digits.startsWith('966')) return digits
  if (digits.startsWith('0')) return '966' + digits.slice(1)
  return '966' + digits
}

const FP_COOLDOWN_STORAGE_KEY = 'fp_cooldown_until'

export default function Login() {
  const { login }   = useAuth()
  const navigate    = useNavigate()
  const [mode, setMode] = useState('login')

  /* ── login ── */
  const [nationalId, setNationalId] = useState('')
  const [password,   setPassword]   = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [isRejected,     setIsRejected]     = useState(false)
  const [rejectedReason, setRejectedReason] = useState('')

  /* ── forced change (after temp password login) ── */
  const [pendingUser,    setPendingUser]    = useState(null)
  const [newPw,          setNewPw]          = useState('')
  const [confirmPw,      setConfirmPw]      = useState('')
  const [changeLoading,  setChangeLoading]  = useState(false)
  const [changeError,    setChangeError]    = useState('')

  /* ── forgot password — 4 عوامل (schema/21) + قفل تدريجي + مسار رمز مؤقت من المدير ── */
  const [fpNid,      setFpNid]      = useState('')
  const [fpPhone,    setFpPhone]    = useState('')
  const [fpCC,       setFpCC]       = useState('+966')
  const [fpBirthDate, setFpBirthDate] = useState('')
  const [fpRecoveryCode, setFpRecoveryCode] = useState('')
  const [fpLoading,  setFpLoading]  = useState(false)
  const [fpResult,   setFpResult]   = useState(null)
  // يُستعاد من sessionStorage عبر lazy initializer (بدل useEffect منفصل) —
  // يضمن أن العداد التنازلي "يصمد" فعليًا عبر إعادة تحميل الصفحة
  const [fpCooldownUntil, setFpCooldownUntil] = useState(() => {
    const saved = sessionStorage.getItem(FP_COOLDOWN_STORAGE_KEY)
    if (!saved) return null
    const d = new Date(saved)
    if (d.getTime() > Date.now()) return d
    sessionStorage.removeItem(FP_COOLDOWN_STORAGE_KEY)
    return null
  })
  const [fpCooldownRemaining, setFpCooldownRemaining] = useState(0) // ثوانٍ متبقية — يُحدَّث فقط من داخل الـinterval أدناه
  const [fpUseAdminCode, setFpUseAdminCode] = useState(false) // مسار الرمز المؤقت من المدير
  const [fpAdminTempCode, setFpAdminTempCode] = useState('')
  const [adminPhone, setAdminPhone] = useState('') // للتواصل عند القفل النهائي
  const [waFields, setWaFields] = useState({ nationalId: '', phone: '', firstName: '', fatherName: '', grandfatherName: '', branch: '' })

  /* ── forced recovery-code setup (عضو قديم لم يعيّن رمزه بعد — بعد دخول ناجح) ── */
  const [pendingRecoveryUser, setPendingRecoveryUser] = useState(null)
  const [newRecoveryCode, setNewRecoveryCode] = useState('')
  const [confirmRecoveryCode, setConfirmRecoveryCode] = useState('')
  const [recoveryCodeLoading, setRecoveryCodeLoading] = useState(false)
  const [recoveryCodeError, setRecoveryCodeError] = useState('')

  /* ── الدخول بالبصمة ── */
  const [bioLoading, setBioLoading] = useState(false)
  const bioPlatform = detectBiometricPlatform()

  const isLoading = loading || fpLoading || changeLoading || bioLoading || recoveryCodeLoading

  // رقم جوال المدير — لزر "تواصل مع المدير" عند القفل النهائي (نفس نمط Register.jsx)
  useEffect(() => {
    let mounted = true
    supabase.from('الإعدادات العامة').select('*').eq('المفتاح', 'رقم جوال المدير').maybeSingle()
      .then(({ data }) => { if (mounted && data) setAdminPhone(normalizeToIntlPhone(data['القيمة'])) })
    return () => { mounted = false }
  }, [])

  // عداد تنازلي حي لفترة الانتظار (5 دقائق) — كل تحديث لـfpCooldownRemaining
  // يحدث حصرًا من داخل callback الـinterval (غير متزامن)، لا في جسم الـ
  // effect مباشرة؛ لا حاجة لتصفيرها صراحة عند fpCooldownUntil=null — عرضها
  // بالواجهة أصلاً مشروط بـfpResult.status==='cooldown' الذي يتغيّر معه
  useEffect(() => {
    if (!fpCooldownUntil) return
    sessionStorage.setItem(FP_COOLDOWN_STORAGE_KEY, fpCooldownUntil.toISOString())
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((fpCooldownUntil.getTime() - Date.now()) / 1000))
      setFpCooldownRemaining(remaining)
      if (remaining <= 0) {
        setFpCooldownUntil(null)
        sessionStorage.removeItem(FP_COOLDOWN_STORAGE_KEY)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [fpCooldownUntil])

  /* ── login submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsRejected(false)
    try {
      setLoading(true)
      const result = await loginWithCredentials(nationalId.trim(), password.trim())
      if (result.success) {
        sessionStorage.removeItem('adminUnlocked')
        login(result.user) // الجلسة الحقيقية + نسخة التوافق بـlocalStorage مضبوطتان أصلًا داخل loginWithCredentials
        if (result.requireChange) {
          /* كلمة مرور مؤقتة — اجبر على التغيير قبل الدخول (ثم يُتحقَّق من
             رمز الاستعادة بعد نجاح التغيير — انظر handleForceChange) */
          setPendingUser(result.user)
          setNewPw(''); setConfirmPw(''); setChangeError('')
          setMode('changeRequired')
        } else if (result.user.needsRecoveryCodeSetup === 'Y') {
          /* عضو قديم لم يعيّن رمز استعادته بعد (schema/21) — إجباري قبل الدخول */
          setPendingRecoveryUser(result.user)
          setNewRecoveryCode(''); setConfirmRecoveryCode(''); setRecoveryCodeError('')
          setMode('setRecoveryCode')
        } else {
          navigate('/member-dashboard')
        }
      } else if (result.rejected) {
        setIsRejected(true)
        setRejectedReason(result.reason || '')
      } else {
        setError(result.message || 'بيانات الدخول غير صحيحة')
      }
    } catch {
      setError('تعذّر الاتصال بالخادم، تحقق من اتصالك بالإنترنت')
    } finally {
      setLoading(false)
    }
  }

  /* ── الدخول بالبصمة (WebAuthn) — "بلا اسم مستخدم"، خطوتان منفصلتان وجوباً ──
     1) لا حاجة لكتابة رقم الهوية إطلاقاً — الجهاز نفسه (Face ID/Touch ID/
        Windows Hello) يتعرّف على هوية العضو المرتبطة به مباشرة.
     2) خطوتان منفصلتان لأن متصفحات صارمة مثل Safari (آيفون/آيباد) ترفض فتح
        نافذة البصمة إذا مرّ أي تأخير شبكي بين ضغطة المستخدم واستدعاء
        navigator.credentials.get، فتفشل العملية بصمت. الحل: نجلب الـ
        challenge في الخطوة الأولى، ثم نستدعي واجهة البصمة فوراً في زر ثانٍ
        منفصل دون أي انتظار شبكي قبلها. ── */
  const [bioReady, setBioReady] = useState(null) // challenge جاهز | null

  const handleBiometricPrepare = async () => {
    setError('')
    setIsRejected(false)
    setBioReady(null)
    try {
      setBioLoading(true)
      const begin = await callFunction('manage-webauthn', { action: 'beginLogin' })
      if (!begin.success) { setError(begin.message || 'تعذّر الدخول بالبصمة'); return }
      setBioReady(begin.options)
    } catch {
      setError('تعذّر الاتصال بالخادم')
    } finally {
      setBioLoading(false)
    }
  }

  const handleBiometricComplete = async () => {
    if (!bioReady) return
    setError('')
    try {
      setBioLoading(true)
      // نداء واجهة البصمة أولاً وفوراً — بلا أي await قبله — للحفاظ على "تفاعل المستخدم الحديث"
      const assertion = await loginWithPasskey(bioReady)
      const result = await callFunction('manage-webauthn', { action: 'completeLogin', response: assertion })
      if (result.success) {
        sessionStorage.removeItem('adminUnlocked')
        const applied = await applySessionAndUser(result.session, result.user)
        if (!applied.success) { setError(applied.message); return }
        login(result.user)
        navigate('/member-dashboard')
      } else {
        setError(result.message || 'لا توجد بصمة مربوطة بهذا الجهاز — سجّل الدخول بكلمة المرور ثم فعّلها من لوحة العضو')
      }
    } catch (err) {
      setError(err.message || 'فشل الدخول بالبصمة')
    } finally {
      setBioLoading(false)
      setBioReady(null)
    }
  }

  /* ── force-change submit ── */
  const handleForceChange = async (e) => {
    e.preventDefault()
    if (newPw.length < 6) return setChangeError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
    if (newPw !== confirmPw) return setChangeError('كلمة المرور وتأكيدها غير متطابقان')
    setChangeError('')
    try {
      setChangeLoading(true)
      // الجلسة مضبوطة أصلًا من نجاح تسجيل الدخول قبل قليل (حتى مع كلمة مرور
      // مؤقتة) — الدالة تحدّد العضو من رمز الجلسة نفسه، لا حاجة لتمرير memberId
      const result = await callFunction('manage-member', { action: 'changePassword', newPassword: newPw })
      if (result.success) {
        sessionStorage.removeItem('adminUnlocked')
        const updatedUser = { ...pendingUser, mustChangePassword: 'N' }
        // خلل مُصلَح: تغيير كلمة المرور يُبطِل جلسة الدخول القديمة تلقائيًا
        // من طرف Supabase — لو تنقّلنا للوحة بنفس الجلسة القديمة تفشل كل
        // نداءات البيانات بصمت وتظهر لوحة العضو فارغة تمامًا رغم أن الحساب
        // سليم. الدالة تُصدر جلسة جديدة صالحة وتُعيدها بالاستجابة (result.session)
        // — نضبطها هنا؛ لو تعذّر إصدارها لأي سبب (أفضل جهد بالخادم)، نُعيد
        // تسجيل الدخول تلقائيًا بكلمة المرور الجديدة كخطة بديلة بدل تنقّل بجلسة ميتة
        if (result.session) {
          const applied = await applySessionAndUser(result.session, updatedUser)
          if (!applied.success) {
            const relogin = await loginWithCredentials(nationalId.trim(), newPw.trim())
            if (!relogin.success) { setChangeError('تم تغيير كلمة المرور، لكن تعذّر بدء الجلسة — سجّل الدخول من جديد'); return }
          }
        } else {
          const relogin = await loginWithCredentials(nationalId.trim(), newPw.trim())
          if (!relogin.success) { setChangeError('تم تغيير كلمة المرور، لكن تعذّر بدء الجلسة — سجّل الدخول من جديد'); return }
        }
        localStorage.setItem('user', JSON.stringify(updatedUser))
        login(updatedUser)
        if (pendingUser?.needsRecoveryCodeSetup === 'Y') {
          setPendingRecoveryUser(updatedUser)
          setNewRecoveryCode(''); setConfirmRecoveryCode(''); setRecoveryCodeError('')
          setMode('setRecoveryCode')
        } else {
          navigate('/member-dashboard')
        }
      } else {
        setChangeError(result.message || 'حدث خطأ أثناء تغيير كلمة المرور')
      }
    } catch {
      setChangeError('تعذّر الاتصال بالخادم')
    } finally {
      setChangeLoading(false)
    }
  }

  /* ── تعيين رمز الاستعادة الإجباري (عضو قديم — بعد دخول ناجح) ── */
  const handleSetRecoveryCode = async (e) => {
    e.preventDefault()
    if (!/^\d{6}$/.test(newRecoveryCode)) return setRecoveryCodeError('رمز الاستعادة يجب أن يكون 6 أرقام')
    if (newRecoveryCode !== confirmRecoveryCode) return setRecoveryCodeError('رمز الاستعادة وتأكيده غير متطابقين')
    setRecoveryCodeError('')
    try {
      setRecoveryCodeLoading(true)
      const result = await callFunction('manage-member', { action: 'setRecoveryCode', recoveryCode: newRecoveryCode })
      if (result.success) navigate('/member-dashboard')
      else setRecoveryCodeError(result.message || 'حدث خطأ أثناء حفظ رمز الاستعادة')
    } catch {
      setRecoveryCodeError('تعذّر الاتصال بالخادم')
    } finally {
      setRecoveryCodeLoading(false)
    }
  }

  /* ── forgot password submit — المسار العادي (4 عوامل) أو مسار الرمز
     المؤقت من المدير (يتجاوز الأربعة عوامل والقفل دفعة واحدة) ── */
  const handleForgot = async (e) => {
    e.preventDefault()
    setFpResult(null)
    setFpLoading(true)
    const payload = fpUseAdminCode
      ? { nationalId: fpNid, adminTempCode: fpAdminTempCode }
      : { nationalId: fpNid, phone: fpCC + fpPhone.trim(), birthDate: fpBirthDate, recoveryCode: fpRecoveryCode }
    let result
    try {
      result = await callFunction('forgot-password', payload)
    } catch {
      result = { success: false, status: 'error', message: 'تعذّر الاتصال بالخادم' }
    }
    setFpResult({ status: result.status || (result.success ? 'approved' : 'error'), message: result.message || 'حدث خطأ' })
    setFpCooldownUntil(result.status === 'cooldown' && result.retryAt ? new Date(result.retryAt) : null)
    setFpLoading(false)
  }

  /* ── styles ── */
  const statusStyle = {
    approved:  { bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.35)',  hdr: 'rgba(34,197,94,0.18)',  hdrBorder: 'rgba(34,197,94,0.25)',  icon: '✅', color: '#4ade80', sub: 'rgba(134,239,172,0.8)' },
    pending:   { bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.35)', hdr: 'rgba(251,191,36,0.18)', hdrBorder: 'rgba(251,191,36,0.25)', icon: '⏳', color: '#fbbf24', sub: 'rgba(253,230,138,0.8)' },
    rejected:  { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.35)',  hdr: 'rgba(239,68,68,0.18)',  hdrBorder: 'rgba(239,68,68,0.25)',  icon: '🚫', color: '#f87171', sub: 'rgba(252,165,165,0.8)' },
    not_found: { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.35)',  hdr: 'rgba(239,68,68,0.18)',  hdrBorder: 'rgba(239,68,68,0.25)',  icon: '❌', color: '#f87171', sub: 'rgba(252,165,165,0.8)' },
    error:     { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.35)',  hdr: 'rgba(239,68,68,0.18)',  hdrBorder: 'rgba(239,68,68,0.25)',  icon: '⚠️', color: '#f87171', sub: 'rgba(252,165,165,0.8)' },
    invalid:   { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.35)',  hdr: 'rgba(239,68,68,0.18)',  hdrBorder: 'rgba(239,68,68,0.25)',  icon: '❌', color: '#f87171', sub: 'rgba(252,165,165,0.8)' },
    cooldown:  { bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.35)', hdr: 'rgba(251,191,36,0.18)', hdrBorder: 'rgba(251,191,36,0.25)', icon: '⏳', color: '#fbbf24', sub: 'rgba(253,230,138,0.8)' },
    locked:    { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.35)',  hdr: 'rgba(239,68,68,0.18)',  hdrBorder: 'rgba(239,68,68,0.25)',  icon: '🔒', color: '#f87171', sub: 'rgba(252,165,165,0.8)' },
  }
  const LABEL = {
    approved: 'تم إنشاء كلمة مرور مؤقتة', pending: 'الطلب قيد المراجعة',
    rejected: 'تم رفض الطلب', not_found: 'البيانات غير صحيحة', error: 'خطأ في الاتصال',
    invalid: 'بيانات غير صحيحة', cooldown: 'يرجى الانتظار', locked: 'تم تجاوز حد المحاولات',
  }

  /* ─────────────────────────── render ─────────────────────────── */
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16">
      <div
        className="relative w-full max-w-md"
        style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 35, padding: 40,
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        {/* حدود المدار المتحركة */}
        {isLoading && (
          <div style={{
            position: 'absolute', inset: -1, borderRadius: 36,
            background: 'conic-gradient(from 0deg, transparent 0%, transparent 68%, rgba(198,161,107,0.9) 85%, transparent 100%)',
            animation: 'border-orbit 1.8s linear infinite',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor', maskComposite: 'exclude', padding: 1, pointerEvents: 'none',
          }} />
        )}

        {/* ════════ تسجيل الدخول ════════ */}
        {mode === 'login' && (
          <>
            <div className="text-center">
              <h1 className="text-4xl font-bold text-[var(--gold-main)]">تسجيل الدخول</h1>
            </div>

            <form onSubmit={handleSubmit} className="mt-10 space-y-5">
              {isRejected && (
                <div className="font-nav text-sm rounded-2xl overflow-hidden"
                  style={{ border: '1px solid rgba(251,146,60,0.45)', background: 'rgba(251,146,60,0.08)' }}>
                  <div className="flex items-center gap-2 px-4 py-2.5"
                    style={{ background: 'rgba(251,146,60,0.15)', borderBottom: '1px solid rgba(251,146,60,0.25)' }}>
                    <span style={{ fontSize: 18 }}>⚠️</span>
                    <span className="font-bold" style={{ color: '#fb923c' }}>تم رفض طلب التسجيل</span>
                  </div>
                  <div className="px-4 py-3 space-y-2" style={{ color: '#fed7aa' }}>
                    {rejectedReason && (
                      <p style={{ color: '#fdba74' }}><span className="font-bold">السبب: </span>{rejectedReason}</p>
                    )}
                    <p style={{ color: 'rgba(253,186,116,0.80)', fontSize: 12 }}>
                      نعتذر منك أيها الكريم — العضوية مقتصرة على أبناء قبيلة السلامي فخذ العفاريت.
                      إن كنت منهم وتعتقد أن هذا القرار خاطئ، يُرجى التواصل مع الإدارة.
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="font-nav text-sm text-center py-2.5 px-4 rounded-2xl"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
                  {error}
                </div>
              )}

              <div>
                <label className="font-nav text-sm mb-1.5 block" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  رقم الهوية الوطنية
                </label>
                <input
                  type="text" inputMode="numeric" maxLength={10}
                  value={nationalId}
                  onChange={e => setNationalId(e.target.value.replace(/\D/g, ''))}
                  placeholder="10 أرقام" dir="ltr"
                  className="font-nav w-full px-4 text-center text-base outline-none"
                  style={{
                    height: 52, borderRadius: 14,
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff', letterSpacing: 3,
                  }}
                />
              </div>

              <PasswordInput value={password} onChange={e => setPassword(e.target.value)}
                placeholder="كلمة المرور" />

              <div className="flex justify-center pt-1">
                <button type="submit" disabled={loading}
                  className="font-nav bg-[var(--gold-main)] text-black font-bold flex items-center justify-center overflow-hidden"
                  style={{
                    height: 56, width: loading ? 56 : '100%',
                    borderRadius: loading ? '50%' : 14,
                    transition: 'width 0.5s cubic-bezier(0.23,1,0.32,1), border-radius 0.5s cubic-bezier(0.23,1,0.32,1)',
                  }}>
                  {loading ? <div className="btn-spinner" /> : 'دخول'}
                </button>
              </div>

              {/* الدخول بالبصمة — يظهر فقط إن كان الجهاز/المتصفح يدعم WebAuthn، خطوتان منفصلتان */}
              {isWebAuthnSupported() && !bioReady && (
                <button type="button" onClick={handleBiometricPrepare} disabled={isLoading}
                  className="font-nav w-full flex items-center justify-center gap-2.5 text-sm font-bold transition-all disabled:opacity-50"
                  style={{
                    height: 52, borderRadius: 14,
                    background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.3)', color: '#a78bfa',
                  }}>
                  <BiometricIcon kind={bioPlatform.kind} />
                  {bioLoading ? 'جاري التحقق...' : `الدخول بـ${bioPlatform.label}`}
                </button>
              )}
              {isWebAuthnSupported() && bioReady && (
                <button type="button" onClick={handleBiometricComplete} disabled={isLoading}
                  className="font-nav w-full flex items-center justify-center gap-2.5 text-sm font-bold transition-all disabled:opacity-50 animate-pulse"
                  style={{
                    height: 52, borderRadius: 14,
                    background: 'rgba(167,139,250,0.16)', border: '1px solid rgba(167,139,250,0.5)', color: '#a78bfa',
                  }}>
                  <BiometricIcon kind={bioPlatform.kind} />
                  {bioLoading ? 'جاري التحقق...' : `اضغط لإكمال ${bioPlatform.label}`}
                </button>
              )}
            </form>

            <div className="text-center pt-6 space-y-3">
              <button type="button"
                onClick={() => { setMode('forgot'); setFpResult(null); setFpNid(''); setFpPhone('') }}
                className="font-nav text-sm transition-colors duration-200"
                style={{ color: 'var(--gold-main)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--gold-main)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(198,161,107,0.65)'}>
                نسيت كلمة المرور؟
              </button>
              <div>
                <Link to="/register"
                  className="font-nav text-gray-300 hover:text-[var(--gold-main)] transition-colors duration-200">
                  طلب عضوية جديدة
                </Link>
              </div>
            </div>
          </>
        )}

        {/* ════════ تغيير كلمة المرور الإجباري ════════ */}
        {mode === 'changeRequired' && (
          <>
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                  stroke="#f87171" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <h1 className="text-2xl font-bold" style={{ color: '#f87171' }}>تغيير كلمة المرور مطلوب</h1>
              <p className="font-nav text-sm mt-2 leading-6" style={{ color: 'rgba(255,255,255,0.80)' }}>
                أنت تستخدم كلمة مرور مؤقتة — يجب تغييرها الآن قبل الدخول إلى منصتك
              </p>
            </div>

            <form onSubmit={handleForceChange} className="mt-8 space-y-4">
              {changeError && (
                <div className="font-nav text-sm text-center py-2.5 px-4 rounded-2xl"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
                  {changeError}
                </div>
              )}

              <PasswordInput value={newPw} onChange={e => setNewPw(e.target.value)}
                placeholder="كلمة المرور الجديدة (6 أحرف على الأقل)" />

              <PasswordInput value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                placeholder="تأكيد كلمة المرور الجديدة" />

              <button type="submit" disabled={changeLoading || newPw.length < 6 || !confirmPw}
                className="font-nav w-full py-4 rounded-2xl font-bold transition-all duration-200 disabled:opacity-40"
                style={{ background: 'rgba(239,68,68,0.85)', color: '#fff' }}>
                {changeLoading ? <div className="btn-spinner mx-auto" /> : 'حفظ كلمة المرور والدخول'}
              </button>
            </form>
          </>
        )}

        {/* ════════ نسيت كلمة المرور — 4 عوامل، أو رمز مؤقت من المدير ════════ */}
        {mode === 'forgot' && (
          <>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-[var(--gold-main)]">استعادة كلمة المرور</h1>
              <p className="font-nav text-sm mt-2" style={{ color: 'rgba(255,255,255,0.80)' }}>
                {fpUseAdminCode ? 'أدخل رقم هويتك والرمز المؤقت الذي أعطاك إياه المدير' : 'أدخل بياناتك الأربعة للتحقق من هويتك'}
              </p>
            </div>

            <form onSubmit={handleForgot} className="mt-8 space-y-5">
              <div>
                <label className="font-nav text-sm mb-1.5 block" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  رقم الهوية الوطنية
                </label>
                <input type="text" inputMode="numeric" maxLength={10} value={fpNid}
                  onChange={e => setFpNid(e.target.value.replace(/\D/g, ''))}
                  placeholder="10 أرقام" dir="ltr"
                  className="font-nav w-full px-4 text-center text-base outline-none"
                  style={{
                    height: 52, borderRadius: 14,
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff', letterSpacing: 3,
                  }} />
              </div>

              {fpUseAdminCode ? (
                <div>
                  <label className="font-nav text-sm mb-1.5 block" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    الرمز المؤقت من المدير
                  </label>
                  <input type="text" inputMode="numeric" maxLength={6} value={fpAdminTempCode}
                    onChange={e => setFpAdminTempCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="6 أرقام" dir="ltr"
                    className="font-nav w-full px-4 text-center text-base outline-none"
                    style={{
                      height: 52, borderRadius: 14,
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff', letterSpacing: 4,
                    }} />
                </div>
              ) : (
                <>
                  <PhoneInput value={fpPhone} onChange={setFpPhone} countryCode={fpCC}
                    onCountryChange={setFpCC} label="رقم الجوال" placeholder="5xxxxxxxx" />

                  <div>
                    <label className="font-nav text-sm mb-1.5 block" style={{ color: 'rgba(255,255,255,0.85)' }}>
                      تاريخ الميلاد
                    </label>
                    <DateInput value={fpBirthDate} onChange={setFpBirthDate} />
                  </div>

                  <div>
                    <label className="font-nav text-sm mb-1.5 block" style={{ color: 'rgba(255,255,255,0.85)' }}>
                      رمز الاستعادة
                    </label>
                    <input type="text" inputMode="numeric" maxLength={6} value={fpRecoveryCode}
                      onChange={e => setFpRecoveryCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="6 أرقام" dir="ltr"
                      className="font-nav w-full px-4 text-center text-base outline-none"
                      style={{
                        height: 52, borderRadius: 14,
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff', letterSpacing: 4,
                      }} />
                  </div>
                </>
              )}

              {fpResult && (() => {
                const s   = statusStyle[fpResult.status] || statusStyle.error
                const lbl = LABEL[fpResult.status] || 'نتيجة'
                return (
                  <div className="font-nav text-sm rounded-2xl overflow-hidden"
                    style={{ border: `1px solid ${s.border}`, background: s.bg }}>
                    <div className="flex items-center gap-2 px-4 py-2.5"
                      style={{ background: s.hdr, borderBottom: `1px solid ${s.hdrBorder}` }}>
                      <span style={{ fontSize: 16 }}>{s.icon}</span>
                      <span className="font-bold" style={{ color: s.color }}>{lbl}</span>
                    </div>
                    <div className="px-4 py-3">
                      <p style={{ color: s.sub }}>{fpResult.message}</p>

                      {fpResult.status === 'cooldown' && fpCooldownRemaining > 0 && (
                        <p className="font-nav mt-2 text-center font-bold" style={{ color: '#fbbf24', fontSize: 20, letterSpacing: 1 }}>
                          {String(Math.floor(fpCooldownRemaining / 60)).padStart(2, '0')}:{String(fpCooldownRemaining % 60).padStart(2, '0')}
                        </p>
                      )}

                      {fpResult.status === 'approved' && (
                        <button type="button"
                          onClick={() => { setMode('login'); setFpResult(null) }}
                          className="font-nav mt-3 w-full py-2.5 rounded-xl font-bold text-sm transition-all duration-200"
                          style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.35)', color: '#4ade80' }}>
                          انتقل إلى تسجيل الدخول
                        </button>
                      )}

                      {/* قفل نهائي — نموذج تواصل واتساب مع المدير، حقول تُكتب يدويًا وليست
                          مسحوبة تلقائيًا (طلب محمد الصريح) */}
                      {fpResult.status === 'locked' && (
                        <div className="mt-4 space-y-2.5">
                          <p className="font-nav text-xs" style={{ color: 'rgba(252,165,165,0.75)' }}>
                            عبّئ بياناتك أدناه لإرسالها للمدير عبر واتساب:
                          </p>
                          {[
                            ['nationalId', 'رقم الهوية'], ['phone', 'رقم الجوال'],
                            ['firstName', 'الاسم الأول'], ['fatherName', 'اسم الأب'],
                            ['grandfatherName', 'اسم الجد'], ['branch', 'الفخذ'],
                          ].map(([key, label]) => (
                            <input key={key} type="text" value={waFields[key]} placeholder={label}
                              onChange={e => setWaFields(p => ({ ...p, [key]: e.target.value }))}
                              className="font-nav w-full px-3.5 text-sm outline-none"
                              style={{
                                height: 42, borderRadius: 10,
                                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff',
                              }} />
                          ))}
                          <a
                            href={adminPhone ? `https://wa.me/${adminPhone}?text=${encodeURIComponent(
                              `مرحباً، تجاوزت عدد محاولات استعادة كلمة المرور. بياناتي:\n` +
                              `رقم الهوية: ${waFields.nationalId}\nرقم الجوال: ${waFields.phone}\n` +
                              `الاسم الأول: ${waFields.firstName}\nاسم الأب: ${waFields.fatherName}\n` +
                              `اسم الجد: ${waFields.grandfatherName}\nالفخذ: ${waFields.branch}\n` +
                              `أرجو مساعدتي باستعادة حسابي.`
                            )}` : undefined}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-nav font-bold text-sm transition-all hover:opacity-90"
                            style={{ background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.35)', color: '#25d366' }}>
                            📱 مراسلة المدير عبر واتساب
                          </a>
                          {/* مسار بديل — إذا أعطاه المدير رمزًا مؤقتًا فعلاً بعد التواصل */}
                          <button type="button"
                            onClick={() => { setFpUseAdminCode(true); setFpResult(null); setFpCooldownUntil(null) }}
                            className="font-nav w-full text-xs text-center py-1.5"
                            style={{ color: 'var(--gold-main)' }}>
                            لديّ رمز مؤقت من المدير بالفعل؟
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}

              {!fpUseAdminCode && !(fpResult?.status === 'locked') && (
                <button type="button"
                  onClick={() => setFpUseAdminCode(true)}
                  className="font-nav w-full text-xs text-center"
                  style={{ color: 'rgba(198,161,107,0.65)' }}>
                  لديّ رمز مؤقت من المدير؟
                </button>
              )}
              {fpUseAdminCode && (
                <button type="button"
                  onClick={() => { setFpUseAdminCode(false); setFpResult(null) }}
                  className="font-nav w-full text-xs text-center"
                  style={{ color: 'rgba(198,161,107,0.65)' }}>
                  الرجوع لإدخال البيانات الأربعة
                </button>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setMode('login'); setFpResult(null); setFpUseAdminCode(false) }}
                  className="font-nav flex-1 py-3.5 rounded-2xl text-sm font-bold transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.88)' }}>
                  رجوع
                </button>
                {fpResult?.status !== 'approved' && fpResult?.status !== 'locked' && (
                  <button type="submit"
                    disabled={
                      fpLoading || fpCooldownRemaining > 0 || fpNid.length !== 10 ||
                      (fpUseAdminCode ? fpAdminTempCode.length !== 6 : (fpPhone.length < 9 || !fpBirthDate || fpRecoveryCode.length !== 6))
                    }
                    className="font-nav flex-[2] py-3.5 rounded-2xl font-bold transition-all duration-200 disabled:opacity-40"
                    style={{ background: 'var(--gold-main)', color: '#000' }}>
                    {fpLoading
                      ? <span className="btn-spinner mx-auto block" style={{ width: 20, height: 20 }} />
                      : 'تحقق'}
                  </button>
                )}
              </div>
            </form>
          </>
        )}

        {/* ════════ تعيين رمز استعادة إجباري (عضو قديم — بعد دخول ناجح) ════════ */}
        {mode === 'setRecoveryCode' && (
          <>
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)' }}>
                <span style={{ fontSize: 24 }}>🔑</span>
              </div>
              <h1 className="text-2xl font-bold" style={{ color: '#fbbf24' }}>تعيين رمز استعادة</h1>
              <p className="font-nav text-sm mt-2 leading-6" style={{ color: 'rgba(255,255,255,0.80)' }}>
                مرحباً {pendingRecoveryUser?.firstName} — رمز استعادة (6 أرقام) يُستخدم لاحقاً لو نسيت كلمة مرورك. اختره واحفظه في مكان آمن.
              </p>
            </div>

            <form onSubmit={handleSetRecoveryCode} className="mt-8 space-y-4">
              {recoveryCodeError && (
                <div className="font-nav text-sm text-center py-2.5 px-4 rounded-2xl"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
                  {recoveryCodeError}
                </div>
              )}

              <input type="text" inputMode="numeric" maxLength={6} value={newRecoveryCode}
                onChange={e => setNewRecoveryCode(e.target.value.replace(/\D/g, ''))}
                placeholder="رمز الاستعادة (6 أرقام)" dir="ltr"
                className="font-nav w-full px-4 text-center text-base outline-none"
                style={{
                  height: 52, borderRadius: 14,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff', letterSpacing: 4,
                }} />
              <input type="text" inputMode="numeric" maxLength={6} value={confirmRecoveryCode}
                onChange={e => setConfirmRecoveryCode(e.target.value.replace(/\D/g, ''))}
                placeholder="تأكيد رمز الاستعادة" dir="ltr"
                className="font-nav w-full px-4 text-center text-base outline-none"
                style={{
                  height: 52, borderRadius: 14,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff', letterSpacing: 4,
                }} />

              <button type="submit" disabled={recoveryCodeLoading || newRecoveryCode.length !== 6 || !confirmRecoveryCode}
                className="font-nav w-full py-4 rounded-2xl font-bold transition-all duration-200 disabled:opacity-40"
                style={{ background: 'var(--gold-main)', color: '#000' }}>
                {recoveryCodeLoading ? <div className="btn-spinner mx-auto" /> : 'حفظ ومتابعة'}
              </button>
            </form>
          </>
        )}

      </div>
    </div>
  )
}
