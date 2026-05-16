import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PasswordInput from '../components/PasswordInput'

/* ═══════════ مؤشر لون الاستهلاك ═══════════ */
function usageTheme(pct) {
  if (pct >= 90) return { bar: '#ef4444', glow: 'rgba(239,68,68,0.4)',  bg: 'rgba(239,68,68,0.1)',  text: '#ef4444', label: 'حرج'   }
  if (pct >= 75) return { bar: '#f97316', glow: 'rgba(249,115,22,0.4)', bg: 'rgba(249,115,22,0.1)', text: '#f97316', label: 'مرتفع' }
  if (pct >= 55) return { bar: '#eab308', glow: 'rgba(234,179,8,0.4)',  bg: 'rgba(234,179,8,0.1)',  text: '#eab308', label: 'متوسط' }
  return           { bar: '#22c55e', glow: 'rgba(34,197,94,0.4)',  bg: 'rgba(34,197,94,0.1)',  text: '#22c55e', label: 'طبيعي' }
}

export default function AdminDashboard() {
  const user     = JSON.parse(localStorage.getItem('user'))
  const navigate = useNavigate()

  /* ── بوابة الرمز — phase: 'locked' | 'verifying' | 'success' | 'open' ── */
  const [phase,    setPhase]    = useState(() => sessionStorage.getItem('adminUnlocked') === '1' ? 'open' : 'locked')
  const [pin,      setPin]      = useState('')
  const [pinError, setPinError] = useState('')

  const handleVerifyPin = async () => {
    if (!pin.trim()) { setPinError('أدخل رمز الدخول'); return }
    try {
      setPhase('verifying')
      setPinError('')
      const res = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'verifyAdminPin', memberId: user.memberId, pin }),
      })
      const result = await res.json()
      if (result.success) {
        sessionStorage.setItem('adminUnlocked', '1')
        setPhase('success')
        setTimeout(() => setPhase('open'), 800)
      } else {
        setPinError(result.message || 'الرمز غير صحيح')
        setPin('')
        setPhase('locked')
      }
    } catch {
      setPinError('حدث خطأ أثناء التحقق')
      setPhase('locked')
    }
  }

  const [stats,       setStats]       = useState(null)
  const [statsLoading,setStatsLoading]= useState(true)
  const [animated,    setAnimated]    = useState(0)

  const [showPw,  setShowPw]  = useState(false)
  const [pwData,  setPwData]  = useState({ current: '', next: '', confirm: '' })
  const [pwLoading,setPwLoading] = useState(false)

  const [tempMemberId, setTempMemberId] = useState('')
  const [tempPassword, setTempPassword] = useState('')
  const [tempLoading,  setTempLoading]  = useState(false)
  const [tempResult,   setTempResult]   = useState(null)

  const [treeRequests,        setTreeRequests]        = useState([])
  const [treeRequestsLoading, setTreeRequestsLoading] = useState(true)
  const [treeActionLoading,   setTreeActionLoading]   = useState(null)

  /* جلب إحصائيات المنصة */
  useEffect(() => {
    const load = async () => {
      try {
        const res  = await fetch(import.meta.env.VITE_API_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'getAdminStats' }),
        })
        const data = await res.json()
        if (data.success) setStats(data)
      } catch (e) { console.error(e) }
      finally    { setStatsLoading(false) }
    }
    load()
  }, [])

  /* تحريك شريط الاستهلاك بعد التحميل */
  useEffect(() => {
    if (statsLoading) return
    const id = setTimeout(() => setAnimated(stats?.scriptUsage ?? 0), 300)
    return () => clearTimeout(id)
  }, [statsLoading, stats?.scriptUsage])

  /* تحديث عداد المتواجدين كل دقيقة */
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res  = await fetch(import.meta.env.VITE_API_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'getOnlineUsers' }),
        })
        const data = await res.json()
        if (data.success)
          setStats(prev => ({ ...prev, onlineUsers: data.onlineUsers }))
      } catch {}
    }, 60_000)
    return () => clearInterval(id)
  }, [])

  /* جلب طلبات الربط بالشجرة */
  const fetchTreeRequests = async () => {
    try {
      setTreeRequestsLoading(true)
      const res  = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'getTreeRequests' }),
      })
      const data = await res.json()
      if (data.success) setTreeRequests(data.requests || [])
    } catch (e) { console.error(e) }
    finally { setTreeRequestsLoading(false) }
  }
  useEffect(() => { fetchTreeRequests() }, [])

  const handleTreeAction = async (requestId, action) => {
    try {
      setTreeActionLoading(requestId + action)
      const res = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        body: JSON.stringify({ action, requestId }),
      })
      const result = await res.json()
      if (result.success)
        setTreeRequests(prev => prev.filter(r => r.id !== requestId))
      else
        alert(result.message || 'حدث خطأ')
    } catch { alert('تعذّر الاتصال بالخادم') }
    finally { setTreeActionLoading(null) }
  }

  /* توليد كلمة مرور عشوائية */
  const genTempPassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  }

  /* تعيين كلمة مرور مؤقتة لعضو */
  const handleSetTempPassword = async () => {
    if (!tempMemberId || !tempPassword) return alert('أدخل رقم العضوية وكلمة المرور المؤقتة')
    try {
      setTempLoading(true)
      setTempResult(null)
      const res = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'setTempPassword', memberId: tempMemberId, tempPassword }),
      })
      const result = await res.json()
      setTempResult(result)
      if (result.success) { setTempMemberId(''); setTempPassword('') }
    } catch { setTempResult({ success: false, message: 'حدث خطأ أثناء الاتصال بالخادم' }) }
    finally  { setTempLoading(false) }
  }

  /* تغيير كلمة المرور */
  const handleChangePassword = async () => {
    if (!pwData.current || !pwData.next || !pwData.confirm)
      return alert('جميع الحقول مطلوبة')
    if (pwData.next !== pwData.confirm)
      return alert('تأكيد كلمة المرور غير مطابق')
    try {
      setPwLoading(true)
      const res = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'changePassword',
          memberId:        user.memberId,
          currentPassword: pwData.current,
          newPassword:     pwData.next,
        }),
      })
      const result = await res.json()
      if (result.success) {
        alert('تم تغيير كلمة المرور بنجاح')
        setShowPw(false)
        setPwData({ current: '', next: '', confirm: '' })
      } else {
        alert(result.message)
      }
    } catch { alert('حدث خطأ أثناء الاتصال بالخادم') }
    finally  { setPwLoading(false) }
  }

  /* البيانات المُشتقة */
  const scriptUsage   = stats?.scriptUsage   ?? 0
  const scriptCount   = stats?.scriptCount   ?? 0
  const scriptLimit   = stats?.scriptLimit   ?? 6_000
  const todayRequests = stats?.todayRequests ?? 0
  const weekRequests  = stats?.weekRequests  ?? 0
  const onlineUsers   = stats?.onlineUsers   ?? 1
  const dailyStats    = stats?.dailyStats    ?? [0, 0, 0, 0, 0, 0, 0]
  const maxStat       = Math.max(...dailyStats, 1)
  const theme         = usageTheme(scriptUsage)

  const today = new Date().toLocaleDateString('ar-SA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  /* ═══════════ الواجهة ═══════════ */
  return (
    <>

      {/* ── بوابة الرمز — modal overlay ── */}
      {phase !== 'open' && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center px-5"
          style={{
            backdropFilter:      'blur(14px)',
            WebkitBackdropFilter:'blur(14px)',
            background:          'rgba(10,15,22,0.62)',
            opacity:             phase === 'success' ? 0 : 1,
            transition:          'opacity 0.55s ease',
            pointerEvents:       phase === 'success' ? 'none' : 'auto',
          }}
        >
          <div
            className="relative w-full"
            style={{
              maxWidth:   400,
              background: 'rgba(18,26,36,0.98)',
              border:     '1px solid rgba(198,161,107,0.22)',
              borderRadius: 36,
              padding:    '52px 44px 44px',
              boxShadow:  '0 48px 120px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)',
              transform:  phase === 'success' ? 'scale(0.93)' : 'scale(1)',
              transition: 'transform 0.55s cubic-bezier(0.23,1,0.32,1)',
            }}
          >

            {/* حدود مدارية أثناء التحقق */}
            {phase === 'verifying' && (
              <div style={{
                position:'absolute', inset:-1, borderRadius:37,
                background:'conic-gradient(from 0deg,transparent 0%,transparent 68%,rgba(198,161,107,0.9) 85%,transparent 100%)',
                animation:'border-orbit 1.8s linear infinite',
                WebkitMask:'linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0)',
                WebkitMaskComposite:'xor', maskComposite:'exclude', padding:1, pointerEvents:'none',
              }}/>
            )}

            {/* أيقونة القفل / نجاح */}
            <div className="flex justify-center mb-8">
              <div
                className="w-[72px] h-[72px] rounded-[20px] flex items-center justify-center"
                style={{
                  background: phase === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(198,161,107,0.1)',
                  border:     `1.5px solid ${phase === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(198,161,107,0.26)'}`,
                  boxShadow:  phase === 'success' ? '0 0 32px rgba(34,197,94,0.2)' : '0 0 32px rgba(198,161,107,0.1)',
                  transition: 'all 0.4s ease',
                }}
              >
                {phase === 'success' ? (
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
                    stroke="#4ade80" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                ) : (
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
                    stroke="var(--gold-main)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                )}
              </div>
            </div>

            {/* العنوان */}
            <div className="text-center mb-8">
              <h1 className="text-[22px] font-bold text-[var(--gold-main)]">تأكيد الوصول الإداري</h1>
              <p className="mt-2.5 font-nav text-sm text-gray-500 leading-6">
                {phase === 'success'
                  ? 'تم التحقق بنجاح، جاري الدخول...'
                  : 'أدخل رمز المدير الخاص بك للمتابعة'}
              </p>
            </div>

            {/* الإدخال والزر */}
            {phase !== 'success' && (
              <>
                <PasswordInput
                  placeholder="رمز الدخول"
                  value={pin}
                  onChange={e => { setPin(e.target.value); setPinError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleVerifyPin()}
                />

                {pinError && (
                  <div className="mt-3 px-4 py-2.5 rounded-2xl font-nav text-sm text-center"
                    style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.22)', color:'#f87171' }}>
                    {pinError}
                  </div>
                )}

                <div className="flex justify-center mt-5">
                  <button
                    onClick={handleVerifyPin}
                    disabled={phase === 'verifying'}
                    className="font-nav bg-[var(--gold-main)] text-black font-bold flex items-center justify-center overflow-hidden"
                    style={{
                      height:       52,
                      width:        phase === 'verifying' ? 52 : '100%',
                      borderRadius: phase === 'verifying' ? '50%' : 14,
                      transition:   'width 0.5s cubic-bezier(0.23,1,0.32,1), border-radius 0.5s cubic-bezier(0.23,1,0.32,1)',
                    }}
                  >
                    {phase === 'verifying' ? <div className="btn-spinner"/> : 'متابعة'}
                  </button>
                </div>

                <button
                  onClick={() => navigate('/')}
                  className="font-nav w-full mt-4 text-sm text-gray-600 hover:text-gray-400 transition-colors duration-200 py-2"
                >
                  ← العودة للموقع
                </button>
              </>
            )}

          </div>
        </div>
      )}

      {/* ── لوحة المدير — تظهر بعد فتح البوابة ── */}
      <div
        className="px-5 lg:px-10 py-10 space-y-7"
        style={{
          opacity:    phase === 'open' ? 1 : 0,
          transform:  phase === 'open' ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.5s ease 0.15s, transform 0.5s cubic-bezier(0.23,1,0.32,1) 0.15s',
          pointerEvents: phase === 'open' ? 'auto' : 'none',
        }}
      >

      {/* ── العنوان ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-[var(--gold-main)]">لوحة تحكم المدير</h1>
          <p className="mt-2 font-nav text-gray-400">
            مرحباً {user?.firstName}، إليك نظرة عامة على المنصة
          </p>
        </div>
        <div
          className="font-nav text-sm text-gray-400 px-4 py-2.5 rounded-2xl flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          {today}
        </div>
      </div>

      {/* ══════════════════════════════════════
          الصف الأول: استهلاك السكربت + المتواجدون
         ══════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* بطاقة الاستهلاك */}
        <div className="rounded-[28px] p-7 lg:col-span-2" style={{ background: 'rgba(234,179,8,0.07)', border: '1px solid rgba(234,179,8,0.18)', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>

          <div className="flex items-start justify-between mb-7">
            <div>
              <p className="font-nav text-sm text-gray-400 mb-3">استهلاك السكربت اليومي</p>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span
                  className="text-6xl font-black tabular-nums transition-colors duration-500"
                  style={{ color: theme.text }}
                >
                  {scriptUsage}%
                </span>
                <span
                  className="font-nav text-sm px-3 py-1.5 rounded-full font-semibold"
                  style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.bar}28` }}
                >
                  {theme.label}
                </span>
              </div>
              <p className="mt-2 font-nav text-xs text-gray-500">
                {scriptCount.toLocaleString('ar')} من أصل {scriptLimit.toLocaleString('ar')} طلب يومي
              </p>
            </div>

            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: theme.bg, border: `1px solid ${theme.bar}28` }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke={theme.bar} strokeWidth="2.2" strokeLinecap="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
          </div>

          {/* شريط التقدم بمناطق الألوان */}
          <div style={{ direction: 'ltr' }}>

            {/* المسار */}
            <div
              className="relative h-5 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              {/* خلفية مناطق الألوان */}
              <div
                className="absolute inset-0 opacity-[0.18]"
                style={{
                  background:
                    'linear-gradient(to right,' +
                    '#22c55e 0%,#22c55e 55%,' +
                    '#eab308 55%,#eab308 75%,' +
                    '#f97316 75%,#f97316 90%,' +
                    '#ef4444 90%,#ef4444 100%)',
                }}
              />
              {/* شريط الملء */}
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
                style={{
                  width:     `${animated}%`,
                  background: theme.bar,
                  boxShadow:  `0 0 14px ${theme.glow}`,
                }}
              />
            </div>

            {/* علامات العتبات */}
            <div className="relative h-5 mt-1">
              {[
                { at: 55, label: '55%', color: '#eab308' },
                { at: 75, label: '75%', color: '#f97316' },
                { at: 90, label: '90%', color: '#ef4444' },
              ].map(m => (
                <div
                  key={m.at}
                  className="absolute flex flex-col items-center"
                  style={{ left: `${m.at}%`, transform: 'translateX(-50%)' }}
                >
                  <div className="w-px h-2" style={{ background: m.color, opacity: 0.55 }} />
                  <span className="font-nav text-[9px] mt-0.5" style={{ color: m.color }}>
                    {m.label}
                  </span>
                </div>
              ))}
            </div>

            {/* تسميات المناطق */}
            <div className="flex font-nav text-[10px] mt-0.5">
              <span style={{ width: '55%', color: '#22c55e', opacity: 0.65 }}>طبيعي</span>
              <span style={{ width: '20%', color: '#eab308', opacity: 0.65 }}>متوسط</span>
              <span style={{ width: '15%', color: '#f97316', opacity: 0.65 }}>مرتفع</span>
              <span style={{ color: '#ef4444', opacity: 0.65 }}>حرج</span>
            </div>

          </div>

          <p className="mt-5 font-nav text-xs text-gray-600">
            يتجدد حد الاستخدام تلقائياً كل 24 ساعة منتصف الليل
          </p>
        </div>

        {/* بطاقة المتواجدين */}
        <div className="rounded-[28px] p-7 flex flex-col" style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.18)', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>
          <div className="flex items-center justify-between">
            <p className="font-nav text-sm text-gray-400">المتواجدون الآن</p>
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: '#4ade80', boxShadow: '0 0 8px #4ade8088' }}
            />
          </div>

          <div className="flex-1 flex items-center justify-center py-6">
            <div className="text-center">
              <div className="relative w-32 h-32 mx-auto">
                <div
                  className="absolute inset-0 rounded-full animate-ping"
                  style={{ background: 'rgba(34,197,94,0.07)', animationDuration: '2.2s' }}
                />
                <div
                  className="absolute inset-3 rounded-full animate-ping"
                  style={{ background: 'rgba(34,197,94,0.05)', animationDuration: '2.2s', animationDelay: '0.4s' }}
                />
                <div
                  className="relative w-32 h-32 rounded-full flex items-center justify-center"
                  style={{
                    background: 'radial-gradient(circle, rgba(34,197,94,0.14) 0%, rgba(34,197,94,0.04) 100%)',
                    border:     '1.5px solid rgba(34,197,94,0.28)',
                    boxShadow:  '0 0 36px rgba(34,197,94,0.14)',
                  }}
                >
                  <span className="text-5xl font-black text-green-400 tabular-nums">
                    {onlineUsers}
                  </span>
                </div>
              </div>
              <p className="mt-5 font-nav text-gray-400 text-sm">زائر نشط</p>
              <p className="mt-1 font-nav text-[11px] text-gray-600">يُحدَّث كل دقيقة</p>
            </div>
          </div>
        </div>

      </div>

      {/* ══════════════════════════════════════
          الصف الثاني: إحصائيات الطلبات + بيانات المدير
         ══════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* إحصائيات الطلبات */}
        <div className="rounded-[28px] p-7" style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>
          <p className="font-nav text-sm text-gray-400 mb-6">إحصائيات طلبات API</p>

          {/* اليوم / الأسبوع */}
          <div className="grid grid-cols-2 gap-4 mb-7">
            <div
              className="rounded-2xl p-5 text-center"
              style={{
                background: 'rgba(198,161,107,0.07)',
                border:     '1px solid rgba(198,161,107,0.18)',
              }}
            >
              <p className="font-nav text-xs text-gray-400 mb-3">اليوم</p>
              <p className="text-5xl font-black text-[var(--gold-main)] tabular-nums leading-none">
                {todayRequests}
              </p>
              <p className="font-nav text-xs text-gray-500 mt-3">طلب</p>
            </div>

            <div
              className="rounded-2xl p-5 text-center"
              style={{
                background: 'rgba(99,102,241,0.07)',
                border:     '1px solid rgba(99,102,241,0.22)',
              }}
            >
              <p className="font-nav text-xs text-gray-400 mb-3">هذا الأسبوع</p>
              <p className="text-5xl font-black text-indigo-400 tabular-nums leading-none">
                {weekRequests}
              </p>
              <p className="font-nav text-xs text-gray-500 mt-3">طلب</p>
            </div>
          </div>

          {/* رسم بياني صغير — آخر 7 أيام */}
          <div>
            <p className="font-nav text-xs text-gray-500 mb-3">آخر 7 أيام</p>
            <div className="flex items-end gap-1.5 h-16" style={{ direction: 'ltr' }}>
              {dailyStats.map((val, i) => {
                const isToday = i === dailyStats.length - 1
                const h       = Math.max(8, (val / maxStat) * 100)
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm transition-all duration-700"
                    style={{
                      height:           `${h}%`,
                      background:       isToday ? 'var(--gold-main)' : 'rgba(198,161,107,0.2)',
                      boxShadow:        isToday ? '0 0 10px rgba(198,161,107,0.4)' : 'none',
                      transitionDelay:  `${i * 70}ms`,
                    }}
                    title={`${val} طلب`}
                  />
                )
              })}
            </div>
            <div
              className="flex mt-2 font-nav text-[9px] text-gray-600"
              style={{ direction: 'ltr' }}
            >
              {['أحد','اثن','ثلا','أرب','خمس','جمع','اليوم'].map(d => (
                <span key={d} className="flex-1 text-center">{d}</span>
              ))}
            </div>
          </div>
        </div>

        {/* بيانات المدير الشخصية */}
        <div className="rounded-[28px] p-7" style={{ background: 'rgba(198,161,107,0.07)', border: '1px solid rgba(198,161,107,0.18)', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>
          <p className="font-nav text-sm text-gray-400 mb-5">بيانات المدير الشخصية</p>

          <div className="divide-y divide-white/[0.06]">
            {[
              { label: 'الاسم',       value: user?.firstName,    style: { color: 'var(--gold-main)', fontWeight: 700, fontSize: 18 } },
              { label: 'رقم العضوية', value: `#${user?.memberId}`,style: { fontFamily: 'monospace', color: '#fff' } },
              { label: 'الدور',       value: 'مدير النظام',     style: { color: 'var(--gold-main)' } },
              { label: 'الجوال',      value: user?.phone || '—', style: { color: '#9ca3af' } },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-3.5">
                <span className="font-nav text-sm" style={row.style}>{row.value}</span>
                <span className="font-nav text-xs text-gray-500">{row.label}</span>
              </div>
            ))}
          </div>

          {/* زر تغيير كلمة المرور */}
          <button
            onClick={() => setShowPw(v => !v)}
            className="mt-5 w-full font-nav text-sm py-3 rounded-2xl transition-all duration-250"
            style={{
              border:     '1px solid rgba(255,255,255,0.1)',
              color:      showPw ? 'var(--gold-main)' : 'rgba(255,255,255,0.5)',
              background: showPw ? 'rgba(198,161,107,0.06)' : 'transparent',
            }}
          >
            {showPw ? '↑ إلغاء' : 'تغيير كلمة المرور'}
          </button>

          {/* حقول التغيير */}
          <div
            style={{
              display:       'grid',
              gridTemplateRows: showPw ? '1fr' : '0fr',
              transition:    'grid-template-rows 0.38s cubic-bezier(0.23,1,0.32,1)',
            }}
          >
            <div style={{ overflow: 'hidden' }}>
              <div className="pt-4 space-y-3">
                <PasswordInput
                  placeholder="كلمة المرور الحالية"
                  value={pwData.current}
                  onChange={e => setPwData(p => ({ ...p, current: e.target.value }))}
                />
                <PasswordInput
                  placeholder="كلمة المرور الجديدة"
                  value={pwData.next}
                  onChange={e => setPwData(p => ({ ...p, next: e.target.value }))}
                />
                <PasswordInput
                  placeholder="تأكيد كلمة المرور الجديدة"
                  value={pwData.confirm}
                  onChange={e => setPwData(p => ({ ...p, confirm: e.target.value }))}
                />
                <button
                  onClick={handleChangePassword}
                  disabled={pwLoading}
                  className="w-full font-nav bg-[var(--gold-main)] text-black py-3 rounded-2xl font-bold text-sm hover:opacity-90 transition-all duration-200 disabled:opacity-50"
                >
                  {pwLoading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ══════════════════════════════════════
          كلمة مرور مؤقتة لعضو
         ══════════════════════════════════════ */}
      <div className="rounded-[28px] p-7" style={{ background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.18)', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>

        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="font-nav text-sm text-gray-400 mb-1">كلمة مرور مؤقتة للعضو</p>
            <p className="font-nav text-xs text-gray-600">أدخل رقم العضوية وكلمة مرور مؤقتة — سيُطلب من العضو تغييرها عند أول دخول</p>
          </div>
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.22)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="#eab308" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* رقم العضوية */}
          <div>
            <label className="block font-nav text-xs text-gray-500 mb-2">رقم العضوية</label>
            <input
              type="text"
              placeholder="مثال: 1042"
              value={tempMemberId}
              onChange={e => { setTempMemberId(e.target.value); setTempResult(null) }}
              className="form-input"
            />
          </div>

          {/* كلمة المرور المؤقتة */}
          <div>
            <label className="block font-nav text-xs text-gray-500 mb-2">كلمة المرور المؤقتة</label>
            <div className="flex gap-2">
              <PasswordInput
                placeholder="اكتب أو ولّد تلقائياً"
                value={tempPassword}
                onChange={e => { setTempPassword(e.target.value); setTempResult(null) }}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={() => { setTempPassword(genTempPassword()); setTempResult(null) }}
                title="توليد عشوائي"
                className="flex-shrink-0 px-4 rounded-2xl font-nav text-sm transition-all duration-200 hover:opacity-80"
                style={{
                  background: 'rgba(234,179,8,0.1)',
                  border:     '1.5px solid rgba(234,179,8,0.28)',
                  color:      '#eab308',
                }}
              >
                توليد
              </button>
            </div>
          </div>

        </div>

        {/* نتيجة العملية */}
        {tempResult && (
          <div
            className="mt-4 px-4 py-3 rounded-2xl font-nav text-sm"
            style={{
              background: tempResult.success ? 'rgba(34,197,94,0.08)'  : 'rgba(239,68,68,0.08)',
              border:     tempResult.success ? '1px solid rgba(34,197,94,0.22)' : '1px solid rgba(239,68,68,0.22)',
              color:      tempResult.success ? '#4ade80' : '#f87171',
            }}
          >
            {tempResult.message}
          </div>
        )}

        {/* زر التطبيق */}
        <button
          onClick={handleSetTempPassword}
          disabled={tempLoading}
          className="mt-5 font-nav text-sm py-3 px-8 rounded-2xl font-bold transition-all duration-200 disabled:opacity-50"
          style={{
            background: 'rgba(234,179,8,0.12)',
            border:     '1px solid rgba(234,179,8,0.32)',
            color:      '#eab308',
          }}
        >
          {tempLoading ? 'جاري التطبيق...' : 'تطبيق كلمة المرور المؤقتة'}
        </button>

      </div>

      {/* ══════════════════════════════════════
          طلبات الربط بالشجرة
         ══════════════════════════════════════ */}
      <div className="rounded-[28px] p-7" style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>

        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="font-nav text-sm text-gray-400 mb-1">طلبات الربط بالشجرة العائلية</p>
            <p className="font-nav text-xs text-gray-600">مراجعة طلبات الأعضاء للانتساب إلى شجرة العائلة</p>
          </div>
          <div className="flex items-center gap-3">
            {treeRequests.length > 0 && (
              <span className="font-nav text-xs px-3 py-1.5 rounded-full font-bold"
                style={{ background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(16,185,129,0.28)', color: '#34d399' }}>
                {treeRequests.length} معلق
              </span>
            )}
            <button
              onClick={fetchTreeRequests}
              className="font-nav text-xs px-3 py-1.5 rounded-xl transition-all duration-200 hover:opacity-80"
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.22)', color: '#34d399' }}>
              تحديث
            </button>
          </div>
        </div>

        {treeRequestsLoading ? (
          <div className="space-y-3">
            {[1,2].map(i => (
              <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        ) : treeRequests.length === 0 ? (
          <div className="py-10 text-center font-nav text-sm text-gray-600">
            لا توجد طلبات معلقة
          </div>
        ) : (
          <div className="space-y-3">
            {treeRequests.map(req => (
              <div key={req.id} className="rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(16,185,129,0.12)' }}>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <p className="font-bold text-sm text-white">{req.memberName}</p>
                    <span className="font-nav text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.22)' }}>
                      #{req.memberId}
                    </span>
                    <span className="font-nav text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(198,161,107,0.1)', color: 'var(--gold-main)', border: '1px solid rgba(198,161,107,0.22)' }}>
                      الجيل {req.generationLevel}
                    </span>
                  </div>
                  <p className="font-nav text-xs text-gray-400">
                    الأب المطلوب: <span className="text-white">{req.parentName}</span>
                  </p>
                  {req.path && (
                    <p className="font-nav text-[10px] text-gray-600 mt-1 truncate">
                      المسار: {req.path}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleTreeAction(req.id, 'approveTreeRequest')}
                    disabled={!!treeActionLoading}
                    className="font-nav text-xs py-2 px-4 rounded-xl font-bold transition-all duration-200 disabled:opacity-50"
                    style={{ background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }}>
                    {treeActionLoading === req.id + 'approveTreeRequest' ? '...' : 'موافقة'}
                  </button>
                  <button
                    onClick={() => handleTreeAction(req.id, 'rejectTreeRequest')}
                    disabled={!!treeActionLoading}
                    className="font-nav text-xs py-2 px-4 rounded-xl transition-all duration-200 disabled:opacity-50"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', color: '#f87171' }}>
                    {treeActionLoading === req.id + 'rejectTreeRequest' ? '...' : 'رفض'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  </>
)
}
