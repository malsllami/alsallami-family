import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FamilyTree from './FamilyTree'

const API = import.meta.env.VITE_API_URL

export default function TreeViewer() {
  const navigate  = useNavigate()
  const [verified, setVerified] = useState(
    sessionStorage.getItem('viewer_verified') === '1'
  )
  const [code,    setCode]    = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) return
    setLoading(true)
    setError('')
    try {
      const r = await fetch(API, {
        method: 'POST',
        body: JSON.stringify({ action: 'verifyViewerCode', code: trimmed }),
      })
      const d = await r.json()
      if (d.success) {
        sessionStorage.setItem('viewer_verified', '1')
        setVerified(true)
      } else {
        setError('الرمز غير صحيح، تواصل مع مدير العائلة للحصول عليه')
      }
    } catch {
      setError('تعذر الاتصال، تحقق من الإنترنت وأعد المحاولة')
    }
    setLoading(false)
  }

  if (verified) return <FamilyTree viewerMode={true} />

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'var(--background-main)' }}>

      {/* زر العودة */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 right-6 font-nav text-sm flex items-center gap-2"
        style={{ color: 'rgba(255,255,255,0.4)' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="12 5 19 12 12 19"/>
        </svg>
        الرئيسية
      </button>

      <div className="w-full max-w-sm">

        {/* العنوان */}
        <div className="text-center mb-10">
          <div className="flex items-center gap-3 mb-5 justify-center">
            <span className="h-px w-10 bg-[var(--gold-main)] opacity-40 block" />
            <span className="font-nav text-xs tracking-[0.4em] text-[var(--gold-main)] opacity-70">مشاهدة الشجرة</span>
            <span className="h-px w-10 bg-[var(--gold-main)] opacity-40 block" />
          </div>
          <h1 className="text-3xl font-bold text-[var(--gold-main)]">شجرة عائلة السلامي</h1>
          <p className="font-nav text-gray-400 text-sm mt-3 leading-relaxed">
            أدخل الرمز العائلي لاستعراض الشجرة كاملاً
          </p>
        </div>

        {/* البطاقة */}
        <form onSubmit={handleSubmit} className="site-card rounded-3xl p-8 flex flex-col gap-5">

          <div>
            <label className="font-nav text-sm text-gray-300 block mb-2 text-right">
              الرمز العائلي
            </label>
            <input
              className="form-input text-center text-xl tracking-[0.3em]"
              type="text"
              value={code}
              onChange={e => { setCode(e.target.value); setError('') }}
              placeholder="أدخل الرمز"
              autoComplete="off"
              autoFocus
            />
          </div>

          {error && (
            <p className="font-nav text-sm text-red-400 text-center leading-relaxed">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="btn-primary w-full font-nav font-bold py-4 rounded-2xl text-black text-base flex items-center justify-center gap-2"
            style={{ background: 'var(--gold-main)', opacity: (!code.trim() || loading) ? 0.6 : 1 }}
          >
            {loading ? (
              <>
                <span className="btn-spinner" style={{ borderTopColor: 'rgba(0,0,0,0.6)' }} />
                جاري التحقق...
              </>
            ) : 'دخول للشجرة'}
          </button>

        </form>

        <p className="text-center font-nav text-xs mt-6" style={{ color: 'rgba(255,255,255,0.25)' }}>
          للحصول على الرمز تواصل مع مدير العائلة
        </p>

      </div>
    </div>
  )
}
