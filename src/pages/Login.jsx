import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuth from '../context/useAuth'
import PasswordInput from '../components/PasswordInput'
import PhoneInput from '../components/PhoneInput'

export default function Login() {
  const { login }   = useAuth()
  const navigate    = useNavigate()
  const [phone,       setPhone]       = useState('')
  const [countryCode, setCountryCode] = useState('+966')
  const [password, setPassword] = useState('')
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState('')
  const [isRejected,     setIsRejected]     = useState(false)
  const [rejectedReason, setRejectedReason] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsRejected(false)
    setRejectedReason('')
    try {
      setLoading(true)
      const response = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        body: JSON.stringify({
          action:   'login',
          phone:    countryCode + phone.trim(),
          password: password.trim(),
        }),
      })
      const result = await response.json()
      if (result.success) {
        const userData = result.user
        sessionStorage.removeItem('adminUnlocked')
        localStorage.setItem('user', JSON.stringify(userData))
        login(userData)
        navigate('/member-dashboard')
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

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16">

      <div
        className="relative w-full max-w-md"
        style={{
          background:          'rgba(255,255,255,0.04)',
          border:              '1px solid rgba(255,255,255,0.09)',
          borderRadius:         35,
          padding:              40,
          backdropFilter:      'blur(24px)',
          WebkitBackdropFilter:'blur(24px)',
          boxShadow:           '0 24px 64px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >

        {/* ── حدود المدار المتحركة أثناء التحميل ── */}
        {loading && (
          <div
            style={{
              position:             'absolute',
              inset:                -1,
              borderRadius:          36,
              background:           'conic-gradient(from 0deg, transparent 0%, transparent 68%, rgba(198,161,107,0.9) 85%, transparent 100%)',
              animation:            'border-orbit 1.8s linear infinite',
              WebkitMask:           'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite:  'xor',
              maskComposite:        'exclude',
              padding:               1,
              pointerEvents:        'none',
            }}
          />
        )}

        {/* العنوان */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-[var(--gold-main)]">
            تسجيل الدخول
          </h1>
        </div>

        {/* النموذج */}
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
                  <p style={{ color: '#fdba74' }}>
                    <span className="font-bold">السبب: </span>{rejectedReason}
                  </p>
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

          <PhoneInput
            value={phone}
            onChange={setPhone}
            countryCode={countryCode}
            onCountryChange={setCountryCode}
            label="رقم الجوال"
            placeholder="5xxxxxxxx"
          />

          <PasswordInput
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="كلمة المرور"
          />

          {/* زر الدخول — يتحول إلى دائرة دوارة عند التحميل */}
          <div className="flex justify-center pt-1">
            <button
              type="submit"
              disabled={loading}
              className="font-nav bg-[var(--gold-main)] text-black font-bold flex items-center justify-center overflow-hidden"
              style={{
                height:       56,
                width:        loading ? 56 : '100%',
                borderRadius: loading ? '50%' : 14,
                transition:   'width 0.5s cubic-bezier(0.23,1,0.32,1), border-radius 0.5s cubic-bezier(0.23,1,0.32,1)',
              }}
            >
              {loading ? <div className="btn-spinner" /> : 'دخول'}
            </button>
          </div>

        </form>

        {/* رابط التسجيل */}
        <div className="text-center pt-8">
          <Link
            to="/register"
            className="font-nav text-gray-300 hover:text-[var(--gold-main)] transition-colors duration-200"
          >
            طلب عضوية جديدة
          </Link>
        </div>

      </div>

    </div>
  )
}
