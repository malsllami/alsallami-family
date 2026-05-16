import { useState } from 'react'
import { Link } from 'react-router-dom'
import useAuth from '../context/useAuth'
import PasswordInput from '../components/PasswordInput'

export default function Login() {
  const { login } = useAuth()
  const [phone,    setPhone]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const response = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'login', phone, password }),
      })
      const result = await response.json()
      if (result.success) {
        const userData = {
          memberId:          result.memberId,
          firstName:         result.firstName,
          phone:             result.phone,
          roles:             result.roles,
          approved:          result.approved,
          mustChangePassword: result.mustChangePassword,
        }
        localStorage.setItem('user', JSON.stringify(userData))
        login(userData)
        window.location.href = '/member-dashboard'
      } else {
        alert(result.message)
      }
    } catch (error) {
      console.log(error)
      alert('حدث خطأ أثناء تسجيل الدخول')
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

          <input
            type="text"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="رقم الجوال"
            className="form-input"
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
