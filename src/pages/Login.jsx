import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuth from '../context/useAuth'
import PasswordInput from '../components/PasswordInput'
import PhoneInput from '../components/PhoneInput'

const API = import.meta.env.VITE_API_URL
const post = (body) =>
  fetch(API, { method: 'POST', body: JSON.stringify(body) }).then(r => r.json())

/* mode: 'login' | 'forgot' | 'changeRequired' */

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

  /* ── forgot password ── */
  const [fpNid,      setFpNid]      = useState('')
  const [fpPhone,    setFpPhone]    = useState('')
  const [fpCC,       setFpCC]       = useState('+966')
  const [fpLoading,  setFpLoading]  = useState(false)
  const [fpResult,   setFpResult]   = useState(null)

  const isLoading = loading || fpLoading || changeLoading

  /* ── login submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsRejected(false)
    try {
      setLoading(true)
      const result = await post({
        action:     'login',
        nationalId: nationalId.trim(),
        password:   password.trim(),
      })
      if (result.success) {
        if (result.requireChange) {
          /* كلمة مرور مؤقتة — اجبر على التغيير قبل الدخول */
          setPendingUser(result.user)
          setNewPw(''); setConfirmPw(''); setChangeError('')
          setMode('changeRequired')
        } else {
          sessionStorage.removeItem('adminUnlocked')
          localStorage.setItem('user', JSON.stringify(result.user))
          login(result.user)
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

  /* ── force-change submit ── */
  const handleForceChange = async (e) => {
    e.preventDefault()
    if (newPw.length < 6) return setChangeError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
    if (newPw !== confirmPw) return setChangeError('كلمة المرور وتأكيدها غير متطابقان')
    setChangeError('')
    try {
      setChangeLoading(true)
      const result = await post({
        action:       'changePassword',
        memberId:     pendingUser.memberId,
        newPassword:  newPw,
        isTempChange: true,
      })
      if (result.success) {
        sessionStorage.removeItem('adminUnlocked')
        localStorage.setItem('user', JSON.stringify(pendingUser))
        login(pendingUser)
        navigate('/member-dashboard')
      } else {
        setChangeError(result.message || 'حدث خطأ أثناء تغيير كلمة المرور')
      }
    } catch {
      setChangeError('تعذّر الاتصال بالخادم')
    } finally {
      setChangeLoading(false)
    }
  }

  /* ── forgot password submit ── */
  const handleForgot = async (e) => {
    e.preventDefault()
    setFpResult(null)
    try {
      setFpLoading(true)
      const result = await post({
        action:     'forgotPassword',
        nationalId: fpNid.trim(),
        phone:      fpCC + fpPhone.trim(),
      })
      setFpResult({
        status:  result.status || (result.success ? 'approved' : 'not_found'),
        message: result.message,
      })
    } catch {
      setFpResult({ status: 'error', message: 'تعذّر الاتصال بالخادم' })
    } finally {
      setFpLoading(false)
    }
  }

  /* ── styles ── */
  const statusStyle = {
    approved:  { bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.35)',  hdr: 'rgba(34,197,94,0.18)',  hdrBorder: 'rgba(34,197,94,0.25)',  icon: '✅', color: '#4ade80', sub: 'rgba(134,239,172,0.8)' },
    pending:   { bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.35)', hdr: 'rgba(251,191,36,0.18)', hdrBorder: 'rgba(251,191,36,0.25)', icon: '⏳', color: '#fbbf24', sub: 'rgba(253,230,138,0.8)' },
    rejected:  { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.35)',  hdr: 'rgba(239,68,68,0.18)',  hdrBorder: 'rgba(239,68,68,0.25)',  icon: '🚫', color: '#f87171', sub: 'rgba(252,165,165,0.8)' },
    not_found: { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.35)',  hdr: 'rgba(239,68,68,0.18)',  hdrBorder: 'rgba(239,68,68,0.25)',  icon: '❌', color: '#f87171', sub: 'rgba(252,165,165,0.8)' },
    error:     { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.35)',  hdr: 'rgba(239,68,68,0.18)',  hdrBorder: 'rgba(239,68,68,0.25)',  icon: '⚠️', color: '#f87171', sub: 'rgba(252,165,165,0.8)' },
  }
  const LABEL = {
    approved: 'تم إنشاء كلمة مرور مؤقتة', pending: 'الطلب قيد المراجعة',
    rejected: 'تم رفض الطلب', not_found: 'البيانات غير صحيحة', error: 'خطأ في الاتصال',
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

        {/* ════════ نسيت كلمة المرور ════════ */}
        {mode === 'forgot' && (
          <>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-[var(--gold-main)]">استعادة كلمة المرور</h1>
              <p className="font-nav text-sm mt-2" style={{ color: 'rgba(255,255,255,0.80)' }}>
                أدخل رقم هويتك ورقم جوالك المسجّل للتحقق
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

              <PhoneInput value={fpPhone} onChange={setFpPhone} countryCode={fpCC}
                onCountryChange={setFpCC} label="رقم الجوال" placeholder="5xxxxxxxx" />

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
                      {fpResult.status === 'approved' && (
                        <button type="button"
                          onClick={() => { setMode('login'); setFpResult(null) }}
                          className="font-nav mt-3 w-full py-2.5 rounded-xl font-bold text-sm transition-all duration-200"
                          style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.35)', color: '#4ade80' }}>
                          انتقل إلى تسجيل الدخول
                        </button>
                      )}
                    </div>
                  </div>
                )
              })()}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setMode('login'); setFpResult(null) }}
                  className="font-nav flex-1 py-3.5 rounded-2xl text-sm font-bold transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.88)' }}>
                  رجوع
                </button>
                {fpResult?.status !== 'approved' && (
                  <button type="submit"
                    disabled={fpLoading || fpNid.length !== 10 || fpPhone.length < 9}
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

      </div>
    </div>
  )
}
