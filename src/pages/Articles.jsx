import { useState } from 'react'

/* ════ بيانات أولية — كل المحتوى قابل للتعديل من المدير ══════════════════ */
const ARTICLES_INITIAL = [
  {
    id: 'a1',
    type: 'featured',
    title: 'وادي حلي بن يعقوب',
    category: 'جغرافيا وتاريخ',
    description: 'من أعرق أودية المنطقة الجنوبية، يمتد عبر قرى عريقة تحمل إرثاً تاريخياً وعمقاً قبلياً أصيلاً',
    date: '2024-01-01',
    mapUrl: 'https://www.openstreetmap.org/export/embed.html?bbox=41.0%2C18.6%2C41.9%2C19.5&layer=mapnik&marker=19.05%2C41.42',
    mapLabel: 'وادي حلي بن يعقوب',
    mapSubLabel: 'منطقة مكة المكرمة — محافظة القنفذة',
    aboutText: 'وادي حلي بن يعقوب واحد من أجمل الأودية في المنطقة الجنوبية من المملكة العربية السعودية، يقع ضمن نطاق محافظة القنفذة التابعة لمنطقة مكة المكرمة. يتميز الوادي بطبيعته الخلابة وأرضه الخصبة التي جعلته وجهة للعيش والاستقرار منذ القدم. تجري فيه المياه الموسمية التي تُحيي مزارعه وتُغذي قراه المتناثرة على ضفتيه.\n\nيكتسب الوادي أهميته من موقعه الاستراتيجي الذي يربط التهامة بالمناطق الجبلية، مما جعله ممراً تاريخياً للقوافل التجارية. ويعدّ اليوم مقصداً للراغبين في الاستقرار ضمن بيئة طبيعية هادئة تجمع بين البساطة والأصالة.',
    tribesIntro: 'يسكن الوادي عدد من القبائل العربية الأصيلة التي توارثت هذه الأرض جيلاً بعد جيل، وتتميز هذه القبائل بقيمها الراسخة وتماسكها الاجتماعي وحفاظها على الموروث القبلي.',
    tribes: [
      { name: 'آل السلامي',       desc: 'من أعرق عائلات الوادي وأكثرها عدداً وامتداداً' },
      { name: 'قبيلة آل يعقوب',   desc: 'نُسب إليهم الوادي وهم من أوائل المستوطنين' },
      { name: 'قبائل بني مالك',    desc: 'تمتد قراهم على امتداد المجرى الرئيسي للوادي' },
      { name: 'عائلات قحطانية',   desc: 'تمثل الإرث القحطاني الأصيل في المنطقة' },
    ],
    villages: [
      { name: 'قرية حدبة السلالمة', desc: 'موطن عائلة السلامي الأصلي، تقع على ربوة مشرفة على الوادي وتتميز بطبيعتها الجبلية الجميلة. تضم عدداً من المنازل التراثية الأصيلة التي تحكي قصة أجداد العائلة.', highlight: true },
      { name: 'قرية المخواة',   desc: 'من أكبر قرى الوادي وتحتضن أسواقاً أسبوعية تجذب أبناء المنطقة.',              highlight: false },
      { name: 'قرية الشقيق',   desc: 'تتميز بموقعها الساحلي القريب وكانت منفذاً بحرياً تاريخياً للمنطقة.',            highlight: false },
      { name: 'قرية العبدية',  desc: 'من القرى الزراعية المعروفة بإنتاجها من المانجو والموز والنخيل.',               highlight: false },
      { name: 'قرية حلي',      desc: 'تمثل المركز التاريخي للوادي وبها عدد من الآثار والمعالم القديمة.',             highlight: false },
      { name: 'قرية القضب',    desc: 'تشتهر بينابيعها المائية ومصايفها الجبلية الهادئة.',                           highlight: false },
    ],
    geoInfo: [
      { label: 'المنطقة الإدارية', value: 'مكة المكرمة' },
      { label: 'المحافظة',         value: 'القنفذة' },
      { label: 'التوجه',           value: 'جنوب غرب المملكة' },
      { label: 'المناخ',           value: 'حار رطب — صيف / معتدل — شتاء' },
    ],
    body: '',
  },
]

const BLANK_ARTICLE = {
  type: 'standard', title: '', category: '', description: '', body: '',
  date: new Date().toISOString().split('T')[0],
}

/* ════ مكوّن مقسّم الأقسام ════════════════════════════════════════════════ */
function ArticleSection({ title, icon, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">{icon}</span>
        <h3 className="text-xl font-bold text-white">{title}</h3>
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>
      {children}
    </div>
  )
}

/* ════ فاصل أقسام المودال ═══════════════════════════════════════════════ */
function ModalSection({ label }) {
  return (
    <div className="flex items-center gap-3 pt-3">
      <div className="h-px flex-1" style={{ background: 'rgba(198,161,107,0.18)' }} />
      <span className="font-nav text-xs font-semibold" style={{ color: 'var(--gold-main)' }}>{label}</span>
      <div className="h-px flex-1" style={{ background: 'rgba(198,161,107,0.18)' }} />
    </div>
  )
}

/* ════ زر إزالة صغير ════════════════════════════════════════════════════ */
function RemoveBtn({ onClick }) {
  return (
    <button type="button" onClick={onClick}
      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 hover:bg-red-500/10 transition-colors"
      style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  )
}

/* ════ أزرار تعديل + حذف (للمدير فقط) ════════════════════════════════════ */
function AdminControls({ article, isAdmin, onEdit, onDelete, deletingId }) {
  if (!isAdmin) return null
  return (
    <div className="flex gap-2 flex-shrink-0">
      <button onClick={() => onEdit(article)}
        className="font-nav text-xs px-3 py-1.5 rounded-xl transition-all duration-200"
        style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.22)', color: '#60a5fa' }}>
        تعديل
      </button>
      <button onClick={() => onDelete(article.id)} disabled={deletingId === article.id}
        className="font-nav text-xs px-3 py-1.5 rounded-xl transition-all duration-200 disabled:opacity-50"
        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
        {deletingId === article.id ? '...' : 'حذف'}
      </button>
    </div>
  )
}

/* ════ الصفحة الرئيسية ════════════════════════════════════════════════════ */
export default function Articles() {
  const user    = JSON.parse(localStorage.getItem('user') || 'null')
  const isAdmin = user?.roles?.includes('admin')

  const [articles,   setArticles]   = useState(ARTICLES_INITIAL)
  const [modal,      setModal]      = useState(null)   // null | 'new' | articleId
  const [draft,      setDraft]      = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [expanded,   setExpanded]   = useState(null)

  /* ── تعديل المسودة ── */
  const setD = (f) => (e) => setDraft(d => ({ ...d, [f]: e.target.value }))

  const addItem    = (field, blank) =>
    setDraft(d => ({ ...d, [field]: [...(d[field] || []), blank] }))
  const removeItem = (field, i) =>
    setDraft(d => ({ ...d, [field]: d[field].filter((_, idx) => idx !== i) }))
  const setItem    = (field, i, key) => (e) =>
    setDraft(d => ({
      ...d,
      [field]: d[field].map((x, idx) =>
        idx === i ? { ...x, [key]: key === 'highlight' ? e.target.checked : e.target.value } : x
      ),
    }))

  /* ── فتح المودال ── */
  const openNew = () => {
    setDraft({ ...BLANK_ARTICLE, id: `a${Date.now()}` })
    setModal('new')
  }
  const openEdit = (a) => {
    setDraft({
      ...a,
      tribes:   (a.tribes   || []).map(t => ({ ...t })),
      villages: (a.villages || []).map(v => ({ ...v })),
      geoInfo:  (a.geoInfo  || []).map(g => ({ ...g })),
    })
    setModal(a.id)
  }

  /* ── حفظ ── */
  const handleSave = async () => {
    if (!draft.title.trim()) return alert('عنوان المقال مطلوب')
    try {
      setSaving(true)
      try {
        await fetch(import.meta.env.VITE_API_URL, {
          method: 'POST',
          body: JSON.stringify({ action: modal === 'new' ? 'createArticle' : 'updateArticle', article: draft }),
        })
      } catch { /* API offline — update local state anyway */ }
      if (modal === 'new') {
        setArticles(prev => [...prev, draft])
      } else {
        setArticles(prev => prev.map(a => a.id === draft.id ? draft : a))
      }
      setModal(null)
    } finally { setSaving(false) }
  }

  /* ── حذف ── */
  const handleDelete = async (articleId) => {
    if (!confirm('هل تريد حذف هذا المقال نهائياً؟')) return
    try {
      setDeletingId(articleId)
      try {
        await fetch(import.meta.env.VITE_API_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'deleteArticle', articleId }),
        })
      } catch { /* API offline — update local state anyway */ }
      setArticles(prev => prev.filter(a => a.id !== articleId))
      if (expanded === articleId) setExpanded(null)
    } finally { setDeletingId(null) }
  }

  const featuredArticle  = articles.find(a => a.type === 'featured')
  const standardArticles = articles.filter(a => a.type !== 'featured')

  return (
    <div className="px-5 lg:px-10 py-10 space-y-10 max-w-5xl mx-auto">

      {/* ══ العنوان ══ */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-bold text-[var(--gold-main)]">المقالات</h1>
          <p className="mt-2 font-nav text-sm text-gray-400">تعريف بوادي حلي بن يعقوب والقرى التابعة</p>
        </div>
        {isAdmin && (
          <button onClick={openNew}
            className="font-nav text-sm px-5 py-2.5 rounded-2xl transition-all duration-200"
            style={{ background: 'rgba(198,161,107,0.12)', border: '1px solid rgba(198,161,107,0.3)', color: 'var(--gold-main)' }}>
            + إضافة مقال
          </button>
        )}
      </div>

      {/* ══ المقال المميز ══ */}
      {featuredArticle && (
        <article className="rounded-[32px] overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>

          {/* رأس */}
          <div className="px-8 py-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="px-3 py-1 rounded-full font-nav text-xs"
                style={{ background: 'rgba(198,161,107,0.12)', border: '1px solid rgba(198,161,107,0.25)', color: 'var(--gold-main)' }}>
                {featuredArticle.category}
              </div>
              <AdminControls article={featuredArticle} isAdmin={isAdmin} onEdit={openEdit} onDelete={handleDelete} deletingId={deletingId} />
            </div>
            <h2 className="text-3xl font-bold text-white leading-relaxed mb-3">{featuredArticle.title}</h2>
            <p className="font-nav text-gray-400 text-sm leading-7">{featuredArticle.description}</p>
          </div>

          {/* الخريطة */}
          <div style={{ height: 380, position: 'relative', background: 'rgba(0,0,0,0.4)' }}>
            <iframe
              title={featuredArticle.mapLabel}
              src={featuredArticle.mapUrl}
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              loading="lazy"
            />
            <div style={{
              position: 'absolute', bottom: 12, right: 12,
              background: 'rgba(8,13,20,0.85)', border: '1px solid rgba(198,161,107,0.3)',
              borderRadius: 14, padding: '8px 14px', backdropFilter: 'blur(8px)',
            }}>
              <p className="font-nav text-xs" style={{ color: 'var(--gold-main)' }}>📍 {featuredArticle.mapLabel}</p>
              <p className="font-nav text-xs text-gray-400 mt-0.5">{featuredArticle.mapSubLabel}</p>
            </div>
          </div>

          {/* المحتوى */}
          <div className="px-8 py-8 space-y-10">

            {/* عن الوادي */}
            {featuredArticle.aboutText && (
              <ArticleSection title="عن الوادي" icon="🏔️">
                {featuredArticle.aboutText.split('\n\n').map((para, i) => (
                  <p key={i} className="font-nav text-gray-300 leading-8 text-sm mt-4 first:mt-0">{para}</p>
                ))}
              </ArticleSection>
            )}

            {/* القبائل */}
            {featuredArticle.tribes?.length > 0 && (
              <ArticleSection title="القبائل الساكنة" icon="🏕️">
                {featuredArticle.tribesIntro && (
                  <p className="font-nav text-gray-300 leading-8 text-sm mb-5">{featuredArticle.tribesIntro}</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {featuredArticle.tribes.map((t, i) => (
                    <div key={i} className="rounded-2xl p-4"
                      style={{ background: 'rgba(198,161,107,0.06)', border: '1px solid rgba(198,161,107,0.14)' }}>
                      <p className="font-bold text-[var(--gold-main)] text-sm mb-1">{t.name}</p>
                      <p className="font-nav text-xs text-gray-400 leading-5">{t.desc}</p>
                    </div>
                  ))}
                </div>
              </ArticleSection>
            )}

            {/* القرى */}
            {featuredArticle.villages?.length > 0 && (
              <ArticleSection title="أبرز القرى والمواقع" icon="🏘️">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {featuredArticle.villages.map((v, i) => (
                    <div key={i} className="rounded-2xl p-4"
                      style={{
                        background: v.highlight ? 'rgba(198,161,107,0.1)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${v.highlight ? 'rgba(198,161,107,0.3)' : 'rgba(255,255,255,0.08)'}`,
                      }}>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {v.highlight && <span className="text-xs">📍</span>}
                        <p className="font-bold text-sm" style={{ color: v.highlight ? 'var(--gold-main)' : 'rgba(255,255,255,0.85)' }}>
                          {v.name}
                        </p>
                        {v.highlight && (
                          <span className="font-nav text-xs px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(198,161,107,0.2)', color: 'var(--gold-main)' }}>
                            موطن العائلة
                          </span>
                        )}
                      </div>
                      <p className="font-nav text-xs text-gray-400 leading-5">{v.desc}</p>
                    </div>
                  ))}
                </div>
              </ArticleSection>
            )}

            {/* المعلومات الجغرافية */}
            {featuredArticle.geoInfo?.length > 0 && (
              <ArticleSection title="معلومات جغرافية" icon="🗺️">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {featuredArticle.geoInfo.map((info, i) => (
                    <div key={i} className="rounded-2xl p-4 text-center"
                      style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
                      <p className="font-nav text-xs text-gray-500 mb-1">{info.label}</p>
                      <p className="font-bold text-sm text-blue-300">{info.value}</p>
                    </div>
                  ))}
                </div>
              </ArticleSection>
            )}

          </div>
        </article>
      )}

      {/* ══ المقالات الإضافية ══ */}
      {standardArticles.length > 0 && (
        <div className="space-y-5">
          <h2 className="text-2xl font-bold text-white">مقالات أخرى</h2>
          {standardArticles.map(a => (
            <article key={a.id} className="rounded-[28px] overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="px-7 py-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      {a.category && (
                        <span className="px-3 py-1 rounded-full font-nav text-xs"
                          style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8' }}>
                          {a.category}
                        </span>
                      )}
                      {a.date && (
                        <span className="font-nav text-xs text-gray-600">
                          {new Date(a.date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{a.title}</h3>
                    {a.description && <p className="font-nav text-sm text-gray-400 leading-6">{a.description}</p>}
                  </div>
                  <AdminControls article={a} isAdmin={isAdmin} onEdit={openEdit} onDelete={handleDelete} deletingId={deletingId} />
                </div>
                {a.body && (
                  <button onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                    className="mt-4 font-nav text-sm transition-colors duration-200"
                    style={{ color: expanded === a.id ? 'rgba(255,255,255,0.35)' : 'var(--gold-main)' }}>
                    {expanded === a.id ? '↑ إخفاء المحتوى' : '↓ قراءة المزيد'}
                  </button>
                )}
              </div>
              {a.body && (
                <div style={{ display: 'grid', gridTemplateRows: expanded === a.id ? '1fr' : '0fr', transition: 'grid-template-rows 0.38s cubic-bezier(0.23,1,0.32,1)' }}>
                  <div style={{ overflow: 'hidden' }}>
                    <div className="px-7 pb-7 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      {a.body.split('\n\n').map((para, i) => (
                        <p key={i} className="font-nav text-sm text-gray-300 leading-8 mb-4 last:mb-0">{para}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {/* ══ مودال الإضافة / التعديل ══ */}
      {modal && draft && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
          style={{ background: 'rgba(5,10,16,0.8)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
          onClick={e => e.target === e.currentTarget && setModal(null)}
        >
          <div
            className="w-full max-w-2xl rounded-[32px] overflow-hidden flex flex-col"
            style={{ background: 'rgba(15,22,32,0.99)', border: '1px solid rgba(198,161,107,0.22)', maxHeight: '92vh',
              boxShadow: '0 48px 120px rgba(0,0,0,0.75)' }}
          >
            {/* رأس */}
            <div className="px-8 pt-7 pb-5 flex items-center justify-between flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h2 className="text-xl font-bold text-[var(--gold-main)]">
                {modal === 'new' ? 'إضافة مقال جديد' : `تعديل: ${draft.title}`}
              </h2>
              <button onClick={() => setModal(null)}
                className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/5 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2.2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* المحتوى */}
            <div className="overflow-y-auto px-8 py-6 space-y-4 flex-1">

              {/* ─── الأساسي ─── */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="font-nav text-xs text-gray-500 mb-1.5 block">عنوان المقال *</label>
                  <input value={draft.title} onChange={setD('title')} className="form-input" placeholder="أدخل عنوان المقال" />
                </div>
                <div>
                  <label className="font-nav text-xs text-gray-500 mb-1.5 block">التصنيف</label>
                  <input value={draft.category} onChange={setD('category')} className="form-input" placeholder="مثال: تاريخ وتراث" />
                </div>
                <div>
                  <label className="font-nav text-xs text-gray-500 mb-1.5 block">التاريخ</label>
                  <input type="date" value={draft.date} onChange={setD('date')} className="form-input" />
                </div>
                <div className="col-span-2">
                  <label className="font-nav text-xs text-gray-500 mb-1.5 block">الوصف المختصر</label>
                  <textarea value={draft.description} onChange={setD('description')} className="form-input resize-none" rows={2}
                    placeholder="جملة أو جملتان تصفان المقال..." />
                </div>
              </div>

              {/* ─── حقول المقال المميز ─── */}
              {draft.type === 'featured' && (
                <>
                  <ModalSection label="الخريطة" />

                  <div>
                    <label className="font-nav text-xs text-gray-500 mb-1.5 block">
                      رابط الخريطة <span className="text-gray-600">(iframe src)</span>
                    </label>
                    <input value={draft.mapUrl || ''} onChange={setD('mapUrl')} className="form-input" dir="ltr"
                      placeholder="https://www.openstreetmap.org/export/embed.html?..." />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-nav text-xs text-gray-500 mb-1.5 block">اسم الموقع</label>
                      <input value={draft.mapLabel || ''} onChange={setD('mapLabel')} className="form-input" placeholder="مثال: وادي حلي بن يعقوب" />
                    </div>
                    <div>
                      <label className="font-nav text-xs text-gray-500 mb-1.5 block">المنطقة</label>
                      <input value={draft.mapSubLabel || ''} onChange={setD('mapSubLabel')} className="form-input" placeholder="مثال: محافظة القنفذة" />
                    </div>
                  </div>

                  <ModalSection label="عن الوادي" />

                  <div>
                    <label className="font-nav text-xs text-gray-500 mb-1.5 block">
                      النص <span className="text-gray-600">(سطر فارغ بين الفقرات)</span>
                    </label>
                    <textarea value={draft.aboutText || ''} onChange={setD('aboutText')} className="form-input resize-none" rows={6}
                      placeholder={'الفقرة الأولى...\n\nالفقرة الثانية...'} />
                  </div>

                  <ModalSection label="القبائل الساكنة" />

                  <div>
                    <label className="font-nav text-xs text-gray-500 mb-1.5 block">المقدمة</label>
                    <textarea value={draft.tribesIntro || ''} onChange={setD('tribesIntro')} className="form-input resize-none" rows={2}
                      placeholder="نص تمهيدي عن القبائل..." />
                  </div>
                  <div className="space-y-2">
                    {(draft.tribes || []).map((t, i) => (
                      <div key={i} className="rounded-xl p-3 space-y-2"
                        style={{ background: 'rgba(198,161,107,0.04)', border: '1px solid rgba(198,161,107,0.1)' }}>
                        <div className="flex gap-2">
                          <input value={t.name} onChange={setItem('tribes', i, 'name')} className="form-input flex-1" placeholder="اسم القبيلة / العائلة" />
                          <RemoveBtn onClick={() => removeItem('tribes', i)} />
                        </div>
                        <input value={t.desc} onChange={setItem('tribes', i, 'desc')} className="form-input" placeholder="وصف مختصر" />
                      </div>
                    ))}
                    <button type="button" onClick={() => addItem('tribes', { name: '', desc: '' })}
                      className="font-nav text-xs px-3 py-1.5 rounded-xl transition-all duration-200"
                      style={{ background: 'rgba(198,161,107,0.08)', border: '1px solid rgba(198,161,107,0.18)', color: 'var(--gold-main)' }}>
                      + إضافة قبيلة
                    </button>
                  </div>

                  <ModalSection label="أبرز القرى والمواقع" />

                  <div className="space-y-2">
                    {(draft.villages || []).map((v, i) => (
                      <div key={i} className="rounded-xl p-3 space-y-2"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div className="flex gap-2 items-center">
                          <input value={v.name} onChange={setItem('villages', i, 'name')} className="form-input flex-1" placeholder="اسم القرية / الموقع" />
                          <label className="flex items-center gap-1.5 flex-shrink-0 cursor-pointer">
                            <input type="checkbox" checked={!!v.highlight} onChange={setItem('villages', i, 'highlight')}
                              className="w-3.5 h-3.5 accent-[var(--gold-main)]" />
                            <span className="font-nav text-xs" style={{ color: 'var(--gold-main)' }}>مميزة</span>
                          </label>
                          <RemoveBtn onClick={() => removeItem('villages', i)} />
                        </div>
                        <textarea value={v.desc} onChange={setItem('villages', i, 'desc')} className="form-input resize-none" rows={2}
                          placeholder="وصف القرية..." />
                      </div>
                    ))}
                    <button type="button" onClick={() => addItem('villages', { name: '', desc: '', highlight: false })}
                      className="font-nav text-xs px-3 py-1.5 rounded-xl transition-all duration-200"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
                      + إضافة قرية
                    </button>
                  </div>

                  <ModalSection label="معلومات جغرافية" />

                  <div className="space-y-2">
                    {(draft.geoInfo || []).map((g, i) => (
                      <div key={i} className="flex gap-2">
                        <input value={g.label} onChange={setItem('geoInfo', i, 'label')} className="form-input flex-1" placeholder="التسمية" />
                        <input value={g.value} onChange={setItem('geoInfo', i, 'value')} className="form-input flex-1" placeholder="القيمة" />
                        <RemoveBtn onClick={() => removeItem('geoInfo', i)} />
                      </div>
                    ))}
                    <button type="button" onClick={() => addItem('geoInfo', { label: '', value: '' })}
                      className="font-nav text-xs px-3 py-1.5 rounded-xl transition-all duration-200"
                      style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', color: '#60a5fa' }}>
                      + إضافة معلومة
                    </button>
                  </div>
                </>
              )}

              {/* ─── حقول المقال العادي ─── */}
              {draft.type !== 'featured' && (
                <div>
                  <label className="font-nav text-xs text-gray-500 mb-1.5 block">
                    محتوى المقال <span className="text-gray-600">(سطر فارغ بين الفقرات)</span>
                  </label>
                  <textarea value={draft.body || ''} onChange={setD('body')} className="form-input resize-none" rows={12}
                    placeholder={'اكتب محتوى المقال هنا...\n\nأضف فقرة ثانية بترك سطر فارغ.'} />
                </div>
              )}

            </div>

            {/* أزرار */}
            <div className="px-8 py-5 flex gap-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 font-nav text-sm py-3 rounded-2xl font-bold transition-all duration-200 disabled:opacity-50"
                style={{ background: 'var(--gold-main)', color: '#000' }}>
                {saving ? 'جاري الحفظ...' : modal === 'new' ? 'نشر المقال' : 'حفظ التغييرات'}
              </button>
              <button onClick={() => setModal(null)}
                className="font-nav text-sm py-3 px-6 rounded-2xl transition-all duration-200"
                style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)' }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
