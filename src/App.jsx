import logo from './assets/logo.png'
import { useNavigate } from 'react-router-dom'
import { useRef, useState, useCallback, useEffect } from 'react'

const MAP_EMBED = 'https://maps.google.com/maps?q=18.759126,41.4451226&z=17&output=embed'
const MAP_LINK  = 'https://maps.app.goo.gl/ZJK3h6mLLRwnuHAk6'

/* ── icons ────────────────────────────────────────────────────────────────── */
const TreeIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v6M12 22v-6M12 8a4 4 0 1 0 0-4 4 4 0 0 0 0 4zM12 22a3 3 0 1 0 0-4 3 3 0 0 0 0 4zM6 16a3 3 0 1 0 0-4 3 3 0 0 0 0 4zM18 16a3 3 0 1 0 0-4 3 3 0 0 0 0 4z"/>
    <line x1="9" y1="14" x2="6" y2="14"/><line x1="15" y1="14" x2="18" y2="14"/>
    <line x1="9" y1="14" x2="12" y2="10"/><line x1="15" y1="14" x2="12" y2="10"/>
  </svg>
)
const FundIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="3"/>
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
    <line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
  </svg>
)
const ArticleIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
)
const JoinIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
  </svg>
)
const WhatsAppIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="#25D366">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)
const GmailIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24">
    <path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 010 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.691 2.28 24 3.434 24 5.457z"/>
  </svg>
)

/* ── services cards ─────────────────────────────────────────────────────── */
const SERVICES = [
  {
    icon: <TreeIcon />,
    title: 'شجرة العائلة',
    desc: 'استعرض التسلسل العائلي الكامل بطريقة تفاعلية بين الأجيال',
    path: '/family-tree',
    bg:   'rgba(20,184,166,0.09)',
    border:'rgba(20,184,166,0.25)',
    accent:'#2dd4bf',
    glow: 'rgba(20,184,166,0.18)',
  },
  {
    icon: <FundIcon />,
    title: 'الصناديق العائلية',
    desc: 'تعرّف على صناديق الدعم والتكافل وآلية الاستفادة منها',
    path: '/funds',
    bg:   'rgba(198,161,107,0.09)',
    border:'rgba(198,161,107,0.28)',
    accent:'var(--gold-main)',
    glow: 'rgba(198,161,107,0.2)',
  },
  {
    icon: <ArticleIcon />,
    title: 'المقالات والتاريخ',
    desc: 'تعرّف على وادي حلي وجذور عائلة السلامي وموروثها الأصيل',
    path: '/articles',
    bg:   'rgba(99,102,241,0.09)',
    border:'rgba(99,102,241,0.25)',
    accent:'#818cf8',
    glow: 'rgba(99,102,241,0.18)',
  },
  {
    icon: <JoinIcon />,
    title: 'انضم للعائلة',
    desc: 'سجّل بياناتك وكن جزءاً من منصة عائلة السلامي',
    path: '/register',
    bg:   'rgba(34,197,94,0.09)',
    border:'rgba(34,197,94,0.25)',
    accent:'#4ade80',
    glow: 'rgba(34,197,94,0.18)',
  },
]

export default function App() {
  const navigate = useNavigate()
  const heroRef  = useRef(null)
  const user     = JSON.parse(localStorage.getItem('user') || 'null')

  const [logoOffset, setLogoOffset] = useState({ x: 0, y: 0 })
  const [stats,      setStats]      = useState(null)
  const [mapOpen,    setMapOpen]    = useState(false)

  /* parallax */
  const handleMouseMove = useCallback((e) => {
    if (!heroRef.current) return
    const rect = heroRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width  - 0.5) * -9
    const y = ((e.clientY - rect.top)  / rect.height - 0.5) * -7
    setLogoOffset({ x, y })
  }, [])
  const handleMouseLeave = useCallback(() => setLogoOffset({ x: 0, y: 0 }), [])

  /* fetch real stats */
  useEffect(() => {
    fetch(import.meta.env.VITE_API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'getAdminStats' }),
    })
      .then(r => r.json())
      .then(d => { if (d.success) setStats(d.stats) })
      .catch(() => {})
  }, [])

  const fmt = (n) => n != null ? Number(n).toLocaleString('ar-SA') : '—'

  return (
    <div className="min-h-screen bg-[#36404a] text-white flex flex-col">

      {/* ══════════════ Hero ══════════════ */}
      <main
        ref={heroRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="flex-1 flex items-center px-8 lg:px-20"
      >
        <div className="w-full flex flex-col-reverse lg:flex-row items-center justify-between gap-8 py-10">

          {/* النص */}
          <div className="flex-1 max-w-[600px] text-center lg:text-right">
            <div className="flex items-center gap-3 mb-6 justify-center lg:justify-start">
              <span className="h-px w-12 bg-[var(--gold-main)] opacity-40 block" />
              <span className="font-nav text-xs tracking-[0.45em] text-[var(--gold-main)] opacity-70">الموقع الرسمي</span>
              <span className="h-px w-12 bg-[var(--gold-main)] opacity-40 block" />
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-[1.4]">
              أهلاً بكم في
              <br />
              <span className="lg:mr-8 block">الموقع الرسمي</span>
              <span className="lg:mr-20 block text-[var(--gold-main)]">لعائلة السلامي</span>
            </h1>

            {/* فخذ العفاريت */}
            <div className="mt-5 flex items-center gap-4 justify-center lg:justify-start">
              <span className="h-px flex-1 max-w-[60px] bg-gradient-to-l from-[var(--gold-main)] to-transparent opacity-60" />
              <span
                className="font-black"
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'clamp(1.4rem, 3vw, 2rem)',
                  color: 'var(--gold-main)',
                }}
              >
                فخذ العفاريت
              </span>
              <span className="h-px flex-1 max-w-[60px] bg-gradient-to-r from-[var(--gold-main)] to-transparent opacity-60" />
            </div>

            <p className="mt-6 text-xl text-gray-300 leading-loose max-w-[480px] lg:mr-0 mx-auto">
              منصة تجمع أفراد العائلة وتوثّق تاريخنا وتحفظ ذكرياتنا للأجيال القادمة
            </p>

            <div className="mt-8 flex items-center gap-2 justify-center lg:justify-start">
              <div className="h-px w-16 bg-gradient-to-l from-[var(--gold-main)] to-transparent opacity-50" />
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--gold-main)] opacity-60 flex-shrink-0" />
              <div className="h-px w-16 bg-gradient-to-r from-[var(--gold-main)] to-transparent opacity-50" />
            </div>

            <div className="mt-8 flex flex-wrap gap-4 justify-center lg:justify-start">
              <button onClick={() => navigate('/family-tree')}
                className="btn-primary font-nav bg-[var(--gold-main)] text-black px-10 py-[14px] rounded-2xl text-lg font-bold">
                استعراض شجرة العائلة
              </button>
              {!user && (
                <button onClick={() => navigate('/register')}
                  className="btn-outline font-nav border-2 border-[var(--gold-main)] text-[var(--gold-main)] px-10 py-[13px] rounded-2xl text-lg font-bold hover:bg-[var(--gold-main)] hover:text-black">
                  انضم إلى العائلة
                </button>
              )}
            </div>
          </div>

          {/* اللوقو */}
          <div className="flex-1 relative flex justify-center items-center">
            <div className="absolute w-[340px] h-[340px] bg-[var(--gold-main)] opacity-[0.04] blur-[70px] rounded-full pointer-events-none" />
            <div className="relative rounded-[30px] p-5"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(198,161,107,0.22)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), inset 0 0 40px rgba(0,0,0,0.18), 0 24px 64px rgba(0,0,0,0.5)',
                transform: `translate(${logoOffset.x}px, ${logoOffset.y}px)`,
                transition: 'transform 0.6s cubic-bezier(0.23,1,0.32,1)',
              }}>
              <div className="rounded-2xl overflow-hidden"
                style={{ boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.45)', border: '1px solid rgba(198,161,107,0.12)' }}>
                <img src={logo} alt="شعار عائلة السلامي"
                  className="w-[285px] md:w-[330px] lg:w-[365px] object-contain block"
                  style={{ filter: 'contrast(1.3) saturate(1.5) brightness(0.92) drop-shadow(0 3px 6px rgba(0,0,0,0.55))' }} />
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* ══════════════ من نحن ══════════════ */}
      <section className="px-8 lg:px-20 pb-16" dir="rtl">

        {/* الترويسة */}
        <div className="text-center mb-10">
          <p className="font-nav text-sm mb-2" style={{ color: 'var(--gold-main)', letterSpacing: '0.12em' }}>اصالة وجذور</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-[var(--gold-main)]">من نحن</h2>
        </div>

        {/* بطاقة العنوان الرئيسي */}
        <div className="rounded-[28px] p-7 mb-5"
          style={{ background: 'rgba(198,161,107,0.06)', border: '1px solid rgba(198,161,107,0.18)', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>
          <h3 className="font-nav font-bold text-xl mb-4 text-[var(--gold-main)]">
            عائلة السلامي : ارث يمتد عبر الاجيال
          </h3>
          <p className="font-nav text-sm text-gray-300 leading-8">
            نحن عائلة تفخر بجذورها الممتدة في عمق التاريخ، نجمع بين عراقة الماضي وطموح المستقبل لبناء مجتمع عائلي متماسك يقتدي بقيم الاجداد
          </p>
        </div>

        {/* بطاقتا التاريخ والرؤية */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <div className="rounded-[24px] p-6"
            style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)', boxShadow: '0 4px 20px rgba(0,0,0,0.14)' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <h3 className="font-nav font-bold text-base" style={{ color: '#a5b4fc' }}>لمحة تاريخية</h3>
            </div>
            <p className="font-nav text-sm text-gray-300 leading-8">
              من رحم الجزيرة العربية انطلقت مسيرة عائلة السلامي، حاملةً معها خصال الكرم والشجاعة والوفاء. بدأت رحلة العائلة منذ قرون مضت حيث استقرت في مناطق مختلفة مساهمةً في البناء الاجتماعي والاقتصادي، واشتُهر أبناؤها بالحكمة في القول والسداد في الرأي
            </p>
          </div>

          <div className="rounded-[24px] p-6"
            style={{ background: 'rgba(20,184,166,0.06)', border: '1px solid rgba(20,184,166,0.18)', boxShadow: '0 4px 20px rgba(0,0,0,0.14)' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(20,184,166,0.15)', border: '1px solid rgba(20,184,166,0.3)', color: '#2dd4bf' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
              </div>
              <h3 className="font-nav font-bold text-base" style={{ color: '#2dd4bf' }}>رؤية العائلة</h3>
            </div>
            <p className="font-nav text-sm text-gray-300 leading-8">
              نسعى لأن نكون نموذجاً رائداً في التلاحم العائلي من خلال الحفاظ على موروثنا الثقافي وتطوير مهارات أبنائنا وتقديم العون لكل فرد من أفراد الأسرة، ليبقى اسم السلامي رمزاً للعطاء والتميز
            </p>
          </div>
        </div>

        {/* قيمنا الجوهرية */}
        <div className="rounded-[24px] p-6 mb-2"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h3 className="font-nav font-bold text-base text-center mb-6 text-[var(--gold-main)]">قيمنا الجوهرية</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                title: 'التكافل',
                text: 'نؤمن أن قوة العائلة تكمن في مساندة أفرادها لبعضهم البعض سواء في الأفراح أو الأزمات لخلق بيئة آمنة وداعمة للجميع',
                color: '#4ade80', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
              },
              {
                title: 'الاصالة',
                text: 'نعتز بهويتنا وتقاليدنا العربية الأصيلة ونعمل جاهدين على غرسها في نفوس الأجيال الصاعدة لضمان استمراريتها',
                color: 'var(--gold-main)', bg: 'rgba(198,161,107,0.08)', border: 'rgba(198,161,107,0.2)',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
              },
              {
                title: 'التواصل',
                text: 'نسخّر كافة الوسائل لتعزيز أواصر القربى واللقاءات الدورية بين أبناء العائلة لتقريب المسافات وتوطيد المحبة',
                color: '#60a5fa', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
              },
            ].map(v => (
              <div key={v.title} className="rounded-[18px] p-5"
                style={{ background: v.bg, border: `1px solid ${v.border}` }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: v.bg, border: `1px solid ${v.border}`, color: v.color }}>
                    {v.icon}
                  </div>
                  <h4 className="font-nav font-bold text-sm" style={{ color: v.color }}>{v.title}</h4>
                </div>
                <p className="font-nav text-xs text-gray-300 leading-7">{v.text}</p>
              </div>
            ))}
          </div>
        </div>

      </section>

      {/* ══════════════ بطاقة الخريطة ══════════════ */}
      <section className="px-8 lg:px-20 pb-16">
        <button
          onClick={() => setMapOpen(true)}
          className="w-full text-right rounded-[32px] overflow-hidden transition-all duration-300 group"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 40px rgba(198,161,107,0.15)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.2)'}
        >
          {/* الرأس */}
          <div className="px-6 py-4 flex items-center justify-between"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-3">
              <span className="text-xl">📍</span>
              <div className="text-right">
                <p className="font-nav text-sm font-bold" style={{ color: 'var(--gold-main)' }}>
                  قرية حدبة السلالمة — وادي حلي
                </p>
                <p className="font-nav text-xs text-gray-500 mt-0.5">محافظة القنفذة، المنطقة الجنوبية</p>
              </div>
            </div>
            <div className="flex items-center gap-2 font-nav text-xs transition-transform duration-300 group-hover:translate-x-[-4px]"
              style={{ color: 'var(--gold-main)' }}>
              <span>عرض الخريطة كاملة</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </div>
          </div>

          {/* الخريطة المصغرة */}
          <div style={{ height: 220, position: 'relative', pointerEvents: 'none' }}>
            <iframe
              title="موقع قرية حدبة السلالمة"
              src={MAP_EMBED}
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            {/* غطاء شفاف يمنع تفاعل الـ iframe ويجعل الضغط يذهب للبطاقة */}
            <div style={{ position: 'absolute', inset: 0 }} />
          </div>
        </button>
      </section>

      {/* ══════════════ إحصائيات حقيقية ══════════════ */}
      <section className="px-8 lg:px-20 pb-16">
        <div className="rounded-[32px] p-8 lg:p-12"
          style={{ background: 'linear-gradient(135deg, rgba(46,57,72,0.9) 0%, rgba(38,48,60,0.9) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}>

          <div className="text-center mb-10">
            <h2 className="text-3xl lg:text-4xl font-bold text-[var(--gold-main)]">إحصائيات العائلة</h2>
            <p className="mt-3 font-nav text-gray-300 text-base">أرقام حقيقية محدّثة من قاعدة البيانات</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { value: fmt(stats?.totalMembers),    label: 'إجمالي الأعضاء',    sub: 'عضو مسجّل'   },
              { value: fmt(stats?.activeMembers),   label: 'الأعضاء النشطون',   sub: 'حساب نشط'    },
              { value: fmt(stats?.totalFunds),      label: 'الصناديق النشطة',   sub: 'صندوق عائلي' },
              { value: fmt(stats?.totalArticles),   label: 'المقالات المنشورة', sub: 'مقال'         },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl p-5 text-center"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(198,161,107,0.15)' }}>
                <p className="text-4xl font-black text-[var(--gold-main)]">{s.value}</p>
                <p className="font-nav text-xs text-gray-400 mt-1">{s.sub}</p>
                <p className="font-nav text-sm text-gray-200 mt-2 font-semibold">{s.label}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ══════════════ Footer ══════════════ */}
      <footer className="px-8 lg:px-20 pb-10">
        <div className="rounded-[32px] px-8 py-10"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>

          <div className="flex flex-col lg:flex-row items-center justify-between gap-10">

            {/* الهوية */}
            <div className="text-center lg:text-right">
              <h2 className="text-3xl font-bold text-[var(--gold-main)]">عائلة السلامي</h2>
              <p className="mt-4 text-gray-300 leading-loose max-w-[500px] font-nav text-sm">
                منصة عائلية تهدف إلى توثيق شجرة العائلة وتعزيز التواصل بين أفرادها والأجيال القادمة.
              </p>
            </div>

            {/* التواصل */}
            <div className="flex gap-4">

              {/* واتساب */}
              <a href="https://wa.me/966555889581" target="_blank" rel="noopener noreferrer"
                className="group flex flex-col items-center gap-2 px-5 py-4 rounded-2xl transition-all duration-300"
                style={{ background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.22)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,211,102,0.14)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(37,211,102,0.08)'}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.3)' }}>
                  <WhatsAppIcon />
                </div>
                <span className="font-nav text-sm font-semibold" style={{ color: '#25D366' }}>واتساب</span>
              </a>

              {/* البريد */}
              <a href="mailto:malsllami@gmail.com"
                className="group flex flex-col items-center gap-2 px-5 py-4 rounded-2xl transition-all duration-300"
                style={{ background: 'rgba(234,67,53,0.08)', border: '1px solid rgba(234,67,53,0.22)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(234,67,53,0.14)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(234,67,53,0.08)'}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(234,67,53,0.1)', border: '1px solid rgba(234,67,53,0.28)' }}>
                  <GmailIcon />
                </div>
                <span className="font-nav text-sm font-semibold" style={{ color: '#EA4335' }}>البريد الإلكتروني</span>
              </a>

            </div>
          </div>

          <div className="mt-10 pt-6 text-center font-nav text-gray-400 text-sm"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            جميع الحقوق محفوظة © عائلة السلامي
          </div>
        </div>
      </footer>

      {/* ══════════════ مودال الخريطة الكاملة ══════════════ */}
      {mapOpen && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col"
          style={{ background: 'rgba(5,10,16,0.97)', backdropFilter: 'blur(12px)' }}
        >
          {/* شريط العنوان */}
          <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(198,161,107,0.18)', background: 'rgba(15,22,32,0.98)' }}>
            <div className="flex items-center gap-3">
              <span className="text-xl">📍</span>
              <div>
                <p className="font-nav text-sm font-bold" style={{ color: 'var(--gold-main)' }}>
                  قرية حدبة السلالمة — وادي حلي
                </p>
                <p className="font-nav text-xs text-gray-500">محافظة القنفذة، المنطقة الجنوبية</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a href={MAP_LINK} target="_blank" rel="noopener noreferrer"
                className="font-nav text-xs px-4 py-2 rounded-xl transition-all duration-200"
                style={{ background: 'rgba(198,161,107,0.12)', border: '1px solid rgba(198,161,107,0.3)', color: 'var(--gold-main)' }}>
                فتح في خرائط Google
              </a>
              <button onClick={() => setMapOpen(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/5 transition-colors"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2.2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          {/* الخريطة */}
          <div className="flex-1">
            <iframe
              title="خريطة قرية حدبة السلالمة"
              src={MAP_EMBED}
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </div>
      )}

    </div>
  )
}
