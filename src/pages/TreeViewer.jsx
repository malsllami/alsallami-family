import { useNavigate } from 'react-router-dom'

/* صفحة مشاهدة الشجرة للأهل — معطّلة مؤقتاً */
export default function TreeViewer() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'var(--background-main)' }}>

      <button
        onClick={() => navigate('/')}
        className="absolute top-6 right-6 font-nav text-sm flex items-center gap-2"
        style={{ color: 'rgba(255,255,255,0.4)' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        الرئيسية
      </button>

      <div className="w-full max-w-sm text-center">
        <div className="flex items-center gap-3 mb-6 justify-center">
          <span className="h-px w-10 bg-[var(--gold-main)] opacity-40 block" />
          <span className="font-nav text-xs tracking-[0.4em] text-[var(--gold-main)] opacity-70">شجرة العائلة</span>
          <span className="h-px w-10 bg-[var(--gold-main)] opacity-40 block" />
        </div>

        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgba(198,161,107,0.08)', border: '1px solid rgba(198,161,107,0.2)' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke="var(--gold-main)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-[var(--gold-main)]">غير متاح حالياً</h1>
        <p className="font-nav text-gray-400 text-sm mt-4 leading-relaxed">
          هذه الميزة غير متاحة في الوقت الحالي.
          <br />
          للاطلاع على الشجرة يرجى التسجيل كعضو.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <button onClick={() => navigate('/register')}
            className="btn-primary font-nav py-3 rounded-2xl font-bold text-black text-sm"
            style={{ background: 'var(--gold-main)' }}>
            التسجيل كعضو
          </button>
          <button onClick={() => navigate('/')}
            className="font-nav py-3 rounded-2xl text-sm"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
            العودة للرئيسية
          </button>
        </div>
      </div>
    </div>
  )
}
