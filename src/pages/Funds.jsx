import { useState, useEffect, useCallback } from 'react'

/* ════ ألوان ═══════════════════════════════════════════════════════════════ */
const C = {
  blue:   { bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.22)',  accent: '#60a5fa',          soft: 'rgba(59,130,246,0.13)'  },
  purple: { bg: 'rgba(139,92,246,0.08)',  border: 'rgba(139,92,246,0.22)',  accent: '#a78bfa',          soft: 'rgba(139,92,246,0.13)'  },
  gold:   { bg: 'rgba(198,161,107,0.08)', border: 'rgba(198,161,107,0.25)', accent: 'var(--gold-main)', soft: 'rgba(198,161,107,0.13)' },
}
const COLOR_LABELS = { blue: 'أزرق', purple: 'بنفسجي', gold: 'ذهبي' }
const BLANK_FUND = {
  name: '', color: 'blue', vision: '', description: '', objectives: [], conditions: [], directors: [],
}

/* ════ helper ════════════════════════════════════════════════════════════════ */
async function callApi(body) {
  const res = await fetch(import.meta.env.VITE_API_URL, { method: 'POST', body: JSON.stringify(body) })
  return res.json()
}

/* ════ مكونات مساعدة ══════════════════════════════════════════════════════ */
function StatCard({ label, value, sub, c }) {
  return (
    <div className="rounded-2xl p-4 text-center" style={{ background: c.soft, border: `1px solid ${c.border}` }}>
      <p className="text-2xl font-bold" style={{ color: c.accent }}>{value.toLocaleString('ar-SA')}</p>
      {sub && <p className="font-nav text-xs text-gray-500 mt-0.5">{sub}</p>}
      <p className="font-nav text-xs text-gray-400 mt-1">{label}</p>
    </div>
  )
}

function FundCard({ title, icon, c, children }) {
  return (
    <div className="rounded-[24px] p-5" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
      <div className="flex items-center gap-2 mb-4">
        <span>{icon}</span>
        <span className="font-nav text-sm font-semibold" style={{ color: c.accent }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

function IconBtn({ onClick, disabled, color, title, children }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 hover:opacity-80 disabled:opacity-40"
      style={{ background: `rgba(${color},0.1)`, border: `1px solid rgba(${color},0.22)` }}>
      {children}
    </button>
  )
}

/* ════ تصدير ═══════════════════════════════════════════════════════════════ */
function exportCSV(fund, members) {
  const rows = [
    ['الاسم', 'رقم العضوية', 'تاريخ الانضمام', 'المبلغ الكامل (ريال)'],
    ...members.map(m => [m.name, m.memberId, m.joinDate, m.totalAmount || 0]),
  ]
  const csv = '﻿' + rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })),
    download: `${fund.name}.csv`,
  }).click()
}

function printFund(fund, members) {
  const rows = members.map(m =>
    `<tr><td>${m.name}</td><td>${m.memberId}</td><td>${m.joinDate}</td><td>${(m.totalAmount || 0).toLocaleString('ar-SA')} ريال</td></tr>`
  ).join('')
  const win = window.open('', '_blank')
  win.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>${fund.name}</title>
    <style>body{font-family:'Segoe UI',Tahoma,sans-serif;direction:rtl;padding:30px;color:#111}
    h1{color:#333;border-bottom:2px solid #c6a16b;padding-bottom:8px;margin-bottom:20px}
    table{width:100%;border-collapse:collapse;margin-top:16px}
    th{background:#f5f0e8;color:#5a4220;padding:10px 12px;font-weight:bold;text-align:right;border:1px solid #ddd}
    td{padding:9px 12px;border:1px solid #ddd;text-align:right}tr:nth-child(even)td{background:#fafaf8}
    .meta{color:#888;font-size:13px;margin-bottom:16px}@media print{body{padding:0}}</style>
    </head><body><h1>${fund.name} — قائمة الأعضاء</h1>
    <p class="meta">إجمالي الأعضاء: ${members.length} | تاريخ الطباعة: ${new Date().toLocaleDateString('ar-SA')}</p>
    <table><thead><tr><th>الاسم</th><th>رقم العضوية</th><th>تاريخ الانضمام</th><th>المبلغ</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <p class="meta" style="margin-top:20px">* هذا المستند سري ومخصص لإدارة الصندوق فقط</p></body></html>`)
  win.document.close(); win.focus(); win.print()
}

/* ════ الصفحة الرئيسية ════════════════════════════════════════════════════ */
export default function Funds() {
  const user     = JSON.parse(localStorage.getItem('user') || 'null')
  const isAdmin  = user?.roles?.includes('admin')
  const isMember = !!user

  const [funds,      setFunds]      = useState([])
  const [members,    setMembers]    = useState([])
  const [active,     setActive]     = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(null)
  const [draft,      setDraft]      = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const fund = funds.find(f => f.id === active) ?? funds[0] ?? null
  const c    = C[fund?.color] || C.blue

  /* ── تحميل الصناديق ── */
  const loadFunds = useCallback(async () => {
    try {
      const data = await callApi({ action: 'getFunds' })
      if (data.success) {
        setFunds(data.funds)
        setActive(prev => prev || (data.funds[0]?.id ?? null))
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  /* ── تحميل أعضاء الصندوق الحالي ── */
  const loadMembers = useCallback(async (fundId) => {
    if (!fundId) { setMembers([]); return }
    try {
      const data = await callApi({ action: 'getFundMembers', fundId })
      if (data.success) setMembers(data.members)
      else setMembers([])
    } catch { setMembers([]) }
  }, [])

  useEffect(() => { loadFunds() }, [loadFunds])
  useEffect(() => { loadMembers(active) }, [active, loadMembers])

  /* ── فتح المودال ── */
  const openNew = () => {
    setDraft({ ...BLANK_FUND })
    setModal('new')
  }
  const openEdit = (f) => {
    setDraft({
      ...f,
      objectives: [...f.objectives],
      conditions: [...f.conditions],
      directors:  f.directors.map(d => ({ ...d })),
    })
    setModal('edit')
  }

  /* ── تعديل المسودة ── */
  const setD     = (field) => (e) => setDraft(d => ({ ...d, [field]: e.target.value }))
  const setLines = (field) => (e) => setDraft(d => ({ ...d, [field]: e.target.value.split('\n') }))

  const addDirector = () =>
    setDraft(d => ({ ...d, directors: [...d.directors, { name: '', role: '', phone: '' }] }))
  const removeDirector = (i) =>
    setDraft(d => ({ ...d, directors: d.directors.filter((_, idx) => idx !== i) }))
  const setDir = (i, field) => (e) =>
    setDraft(d => ({ ...d, directors: d.directors.map((x, idx) => idx === i ? { ...x, [field]: e.target.value } : x) }))

  /* ── حفظ ── */
  const handleSave = async () => {
    if (!draft.name.trim()) return alert('اسم الصندوق مطلوب')
    const clean = {
      ...draft,
      objectives: draft.objectives.filter(o => o.trim()),
      conditions: draft.conditions.filter(c => c.trim()),
      directors:  draft.directors.filter(d => d.name.trim()),
    }
    setSaving(true)
    try {
      const action = modal === 'new' ? 'createFund' : 'updateFund'
      const data = await callApi({ action, fund: clean })
      if (data.success) {
        await loadFunds()
        if (data.fundId) setActive(data.fundId)
        setModal(null)
      } else {
        alert(data.message || 'حدث خطأ')
      }
    } catch {
      alert('حدث خطأ في الاتصال بالخادم')
    } finally {
      setSaving(false)
    }
  }

  /* ── حذف ── */
  const handleDelete = async (fundId) => {
    if (!confirm('هل تريد حذف هذا الصندوق نهائياً؟ لا يمكن التراجع عن هذه العملية.')) return
    setDeletingId(fundId)
    try {
      await callApi({ action: 'deleteFund', fundId })
      if (active === fundId) setActive(null)
      await loadFunds()
    } catch {
      alert('حدث خطأ')
    } finally {
      setDeletingId(null)
    }
  }

  /* ── حالة التحميل ── */
  if (loading) {
    return (
      <div className="px-5 lg:px-10 py-10 flex items-center justify-center h-64">
        <p className="font-nav text-gray-500">جاري التحميل...</p>
      </div>
    )
  }

  const totalDistributed = members.reduce((s, m) => s + (Number(m.totalAmount) || 0), 0)

  return (
    <div className="px-5 lg:px-10 py-10 space-y-7">

      {/* ══ العنوان ══ */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-bold text-[var(--gold-main)]">الصناديق</h1>
          <p className="mt-2 font-nav text-sm text-gray-400">صناديق عائلة السلامي لدعم ورعاية أبنائها</p>
        </div>
        {isAdmin && (
          <button onClick={openNew}
            className="font-nav text-sm px-5 py-2.5 rounded-2xl transition-all duration-200"
            style={{ background: 'rgba(198,161,107,0.12)', border: '1px solid rgba(198,161,107,0.3)', color: 'var(--gold-main)' }}>
            + إضافة صندوق
          </button>
        )}
      </div>

      {/* ══ تبويبات الصناديق ══ */}
      <div className="flex flex-wrap gap-3 items-center">
        {funds.map(f => {
          const fc = C[f.color] || C.blue
          const isAct = f.id === (active ?? funds[0]?.id)
          return (
            <div key={f.id} className="flex items-center gap-1.5">
              <button onClick={() => setActive(f.id)}
                className="font-nav text-sm px-5 py-2.5 rounded-2xl transition-all duration-200"
                style={{
                  background: isAct ? fc.soft : 'rgba(255,255,255,0.04)',
                  border:     isAct ? `1px solid ${fc.border}` : '1px solid rgba(255,255,255,0.1)',
                  color:      isAct ? fc.accent : 'rgba(255,255,255,0.85)',
                  fontWeight: isAct ? '600' : '400',
                }}>
                {f.name}
              </button>
              {isAdmin && (
                <>
                  <IconBtn onClick={() => openEdit(f)} color="59,130,246" title="تعديل">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.2" strokeLinecap="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </IconBtn>
                  <IconBtn onClick={() => handleDelete(f.id)} disabled={deletingId === f.id} color="239,68,68" title="حذف">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.2" strokeLinecap="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </IconBtn>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* ══ محتوى الصندوق المحدد ══ */}
      {fund && (
        <>
          {/* إحصائيات سريعة */}
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
            <StatCard label="إجمالي الأعضاء"   value={members.length}      c={c} />
            <StatCard label="إجمالي الصرف"     value={totalDistributed}    c={c} sub="ريال سعودي" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* العمود الرئيسي */}
            <div className="lg:col-span-2 space-y-5">
              <FundCard title="رؤية الصندوق" icon="🎯" c={c}>
                <p className="font-nav text-sm text-gray-300 leading-7">{fund.vision || '—'}</p>
              </FundCard>

              {fund.objectives.length > 0 && (
                <FundCard title="أهداف الصندوق" icon="📌" c={c}>
                  <ul className="space-y-2">
                    {fund.objectives.map((o, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.accent }} />
                        <span className="font-nav text-sm text-gray-300 leading-6">{o}</span>
                      </li>
                    ))}
                  </ul>
                </FundCard>
              )}

              {fund.conditions.length > 0 && (
                <FundCard title="شروط الاستفادة" icon="📋" c={c}>
                  <ul className="space-y-2">
                    {fund.conditions.map((cond, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="font-nav text-xs mt-0.5 px-1.5 py-0.5 rounded flex-shrink-0"
                          style={{ background: c.soft, color: c.accent }}>{i + 1}</span>
                        <span className="font-nav text-sm text-gray-300 leading-6">{cond}</span>
                      </li>
                    ))}
                  </ul>
                </FundCard>
              )}
            </div>

            {/* العمود الجانبي */}
            <div className="space-y-5">
              {fund.directors.length > 0 && (
                <FundCard title="مجلس الإدارة" icon="👥" c={c}>
                  <div className="space-y-3">
                    {fund.directors.map((d, i) => (
                      <div key={i} className="flex items-center gap-3 py-2"
                        style={{ borderBottom: i < fund.directors.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: c.soft, border: `1px solid ${c.border}` }}>
                          <span className="text-xs font-bold" style={{ color: c.accent }}>{d.name[0]}</span>
                        </div>
                        <div>
                          <p className="font-nav text-sm text-white">{d.name}</p>
                          <p className="font-nav text-xs text-gray-500">{d.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </FundCard>
              )}

              {/* أعضاء الصندوق */}
              <div className="rounded-[24px] overflow-hidden" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                <div className="px-5 py-4" style={{ borderBottom: `1px solid ${c.border}` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>📊</span>
                      <span className="font-nav text-sm font-semibold" style={{ color: c.accent }}>أعضاء الصندوق</span>
                    </div>
                    {isAdmin && members.length > 0 && (
                      <div className="flex gap-2">
                        <button onClick={() => exportCSV(fund, members)}
                          className="font-nav text-xs px-2.5 py-1.5 rounded-xl transition-all duration-200"
                          style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' }}>
                          Excel
                        </button>
                        <button onClick={() => printFund(fund, members)}
                          className="font-nav text-xs px-2.5 py-1.5 rounded-xl transition-all duration-200"
                          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
                          PDF
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {isMember ? (
                  <div className="px-5 py-3">
                    {members.length === 0 ? (
                      <p className="font-nav text-sm text-gray-600 py-3">لا يوجد أعضاء مسجلون</p>
                    ) : members.map((m, i) => (
                      <div key={m.id || i} className="flex items-center justify-between py-2.5"
                        style={{ borderBottom: i < members.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                        <div>
                          <p className="font-nav text-sm text-white">{m.name}</p>
                          <p className="font-nav text-xs text-gray-500">عضو #{m.memberId}</p>
                        </div>
                        <div className="text-left">
                          <p className="font-nav text-sm font-bold" style={{ color: c.accent }}>
                            {(m.totalAmount || 0).toLocaleString('ar-SA')}
                            <span className="text-xs font-normal text-gray-500 mr-1">ريال</span>
                          </p>
                          <p className="font-nav text-xs text-gray-500">{m.joinDate}</p>
                        </div>
                      </div>
                    ))}
                    <p className="font-nav text-xs text-gray-600 pt-2 pb-1">
                      يعرض {members.length} عضو
                    </p>
                  </div>
                ) : (
                  <div className="px-5 py-6 text-center">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                      style={{ background: c.soft, border: `1px solid ${c.border}` }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke={c.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </div>
                    <p className="font-nav text-sm text-gray-400 mb-1">عدد الأعضاء</p>
                    <p className="text-3xl font-bold mb-1" style={{ color: c.accent }}>{members.length}</p>
                    <p className="font-nav text-xs text-gray-500">سجّل دخولك لعرض قائمة الأعضاء</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {funds.length === 0 && (
        <div className="py-20 text-center font-nav text-gray-600">
          لا توجد صناديق — {isAdmin ? 'اضغط "+ إضافة صندوق" لإنشاء أول صندوق' : 'لا توجد صناديق مسجلة حالياً'}
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
            {/* رأس المودال */}
            <div className="px-8 pt-8 pb-5 flex items-center justify-between flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h2 className="text-xl font-bold text-[var(--gold-main)]">
                {modal === 'new' ? 'إضافة صندوق جديد' : `تعديل: ${draft.name}`}
              </h2>
              <button onClick={() => setModal(null)}
                className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/5 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.80)" strokeWidth="2.2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* المحتوى */}
            <div className="overflow-y-auto px-8 py-6 space-y-5 flex-1">

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="font-nav text-xs text-gray-500 mb-1.5 block">اسم الصندوق *</label>
                  <input value={draft.name} onChange={setD('name')} className="form-input" placeholder="مثال: صندوق التكافل الأسري" />
                </div>
                <div>
                  <label className="font-nav text-xs text-gray-500 mb-1.5 block">اللون</label>
                  <select value={draft.color} onChange={setD('color')} className="form-input">
                    {Object.entries(COLOR_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-nav text-xs text-gray-500 mb-1.5 block">رؤية الصندوق</label>
                <textarea value={draft.vision} onChange={setD('vision')} className="form-input resize-none" rows={3}
                  placeholder="وصف مختصر لرؤية الصندوق وأهميته..." />
              </div>

              <div>
                <label className="font-nav text-xs text-gray-500 mb-1.5 block">
                  الأهداف <span className="text-gray-600">(سطر لكل هدف)</span>
                </label>
                <textarea value={draft.objectives.join('\n')} onChange={setLines('objectives')}
                  className="form-input resize-none" rows={5}
                  placeholder={'هدف أول\nهدف ثانٍ\nهدف ثالث'} />
              </div>

              <div>
                <label className="font-nav text-xs text-gray-500 mb-1.5 block">
                  شروط الاستفادة <span className="text-gray-600">(سطر لكل شرط)</span>
                </label>
                <textarea value={draft.conditions.join('\n')} onChange={setLines('conditions')}
                  className="form-input resize-none" rows={5}
                  placeholder={'شرط أول\nشرط ثانٍ\nشرط ثالث'} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-nav text-xs text-gray-500">مجلس الإدارة</label>
                  <button onClick={addDirector}
                    className="font-nav text-xs px-3 py-1.5 rounded-xl transition-all duration-200"
                    style={{ background: 'rgba(198,161,107,0.1)', border: '1px solid rgba(198,161,107,0.22)', color: 'var(--gold-main)' }}>
                    + إضافة عضو
                  </button>
                </div>
                <div className="space-y-2">
                  {draft.directors.map((d, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input value={d.name} onChange={setDir(i, 'name')} className="form-input flex-1" placeholder="الاسم الكامل" />
                      <input value={d.role} onChange={setDir(i, 'role')} className="form-input flex-1" placeholder="الدور / المنصب" />
                      <button onClick={() => removeDirector(i)}
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 hover:bg-red-500/10 transition-colors"
                        style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                  {draft.directors.length === 0 && (
                    <p className="font-nav text-xs text-gray-600 py-2 text-center">لا يوجد أعضاء — اضغط "+ إضافة عضو"</p>
                  )}
                </div>
              </div>
            </div>

            {/* أزرار الحفظ */}
            <div className="px-8 py-5 flex gap-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 font-nav text-sm py-3 rounded-2xl font-bold transition-all duration-200 disabled:opacity-50"
                style={{ background: 'var(--gold-main)', color: '#000' }}>
                {saving ? 'جاري الحفظ...' : modal === 'new' ? 'إضافة الصندوق' : 'حفظ التغييرات'}
              </button>
              <button onClick={() => setModal(null)}
                className="font-nav text-sm py-3 px-6 rounded-2xl transition-all duration-200"
                style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.82)' }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
