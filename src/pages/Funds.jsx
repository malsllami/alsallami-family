import { useState, useEffect, useCallback } from 'react'
import { callFunction } from '../services/api'
import SearchableSelect from '../components/SearchableSelect'

/* ════ ألوان ═══════════════════════════════════════════════════════════════ */
const C = {
  blue:   { bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.22)',  accent: '#60a5fa',          soft: 'rgba(59,130,246,0.13)'  },
  purple: { bg: 'rgba(139,92,246,0.08)',  border: 'rgba(139,92,246,0.22)',  accent: '#a78bfa',          soft: 'rgba(139,92,246,0.13)'  },
  gold:   { bg: 'rgba(198,161,107,0.08)', border: 'rgba(198,161,107,0.25)', accent: 'var(--gold-main)', soft: 'rgba(198,161,107,0.13)' },
}
const COLOR_LABELS = { blue: 'أزرق', purple: 'بنفسجي', gold: 'ذهبي' }
const BLANK_FUND = {
  name: '', color: 'blue', vision: '', description: '', objectives: [], conditions: [],
}
/* "مجلس الإدارة" لم يعد مفهومًا منفصلاً — الرئيس/المدير/أمين الصندوق أعضاء
   عاديون بالصندوق لهم "منصب" غير فارغ، بقرار محمد الصريح */
const BLANK_MEMBER = {
  id: null, treeNodeId: '', name: '', role: '', status: 'نشيط', memberId: null,
  joinDate: new Date().toISOString().slice(0, 10), balance: 0, dues: 0, maturityDate: '', totalAmount: 0,
}
const STATUS_LABELS = { 'نشيط': 'نشيط', 'موقوف': 'موقوف', 'منسحب': 'منسحب', 'متوفى': 'متوفى' }
const STATUS_STYLE = {
  'نشيط':  { bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)',  text: '#4ade80' },
  'موقوف': { bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)', text: '#fbbf24' },
  'منسحب': { bg: 'rgba(156,163,175,0.12)', border: 'rgba(156,163,175,0.3)', text: '#9ca3af' },
  'متوفى': { bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.35)', text: '#6b7280' },
}
/* سجل إنفاق الصندوق — للأعضاء المسجَّلين دخول فقط، الإضافة/الحذف لمدير
   الصندوق أو المدير العام حصرًا */
const BLANK_EXPENSE = { amount: '', reason: '', date: new Date().toISOString().slice(0, 10) }

/* ════ helper ════════════════════════════════════════════════════════════════ */
const callApi = (body) => callFunction('manage-funds', body)

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

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE['نشيط']
  return (
    <span className="font-nav text-[10px] px-2 py-0.5 rounded-full font-bold"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text }}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

/* ════ تصدير ═══════════════════════════════════════════════════════════════ */
function exportCSV(fund, members) {
  const rows = [
    ['الاسم', 'المنصب', 'الحالة', 'تاريخ الانضمام', 'المبلغ الكامل (ريال)'],
    ...members.map(m => [m.name, m.role || '—', STATUS_LABELS[m.status] || m.status, m.joinDate, m.totalAmount || 0]),
  ]
  const csv = '﻿' + rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })),
    download: `${fund.name}.csv`,
  }).click()
}

function printFund(fund, members) {
  const rows = members.map(m =>
    `<tr><td>${m.name}</td><td>${m.role || '—'}</td><td>${STATUS_LABELS[m.status] || m.status}</td><td>${m.joinDate || '—'}</td><td>${(m.totalAmount || 0).toLocaleString('ar-SA')} ريال</td></tr>`
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
    <table><thead><tr><th>الاسم</th><th>المنصب</th><th>الحالة</th><th>تاريخ الانضمام</th><th>المبلغ</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <p class="meta" style="margin-top:20px">* هذا المستند سري ومخصص لإدارة الصندوق فقط</p></body></html>`)
  win.document.close(); win.focus(); win.print()
}

/* ════ الصفحة الرئيسية ════════════════════════════════════════════════════ */
export default function Funds() {
  const user     = JSON.parse(localStorage.getItem('user') || 'null')
  const isAdmin  = user?.roles?.includes('admin')
  const isMember = !!user

  const [funds,       setFunds]       = useState([])
  const [members,     setMembers]     = useState([])
  const [treeNodes,   setTreeNodes]   = useState([]) // {treeNodeId, memberId, name, fatherName, grandfatherName} لاختيار عضو صندوق من الشجرة
  const [active,      setActive]      = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [modal,       setModal]       = useState(null)
  const [draft,       setDraft]       = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [deletingId,  setDeletingId]  = useState(null)
  const [memberModal, setMemberModal] = useState(null) // 'new' | 'edit' | null
  const [memberDraft, setMemberDraft] = useState(null)
  const [savingMember, setSavingMember] = useState(false)
  const [expenses,      setExpenses]      = useState([])
  const [expenseTotal,  setExpenseTotal]  = useState(0)
  const [expenseModal,  setExpenseModal]  = useState(false)
  const [expenseDraft,  setExpenseDraft]  = useState(BLANK_EXPENSE)
  const [savingExpense, setSavingExpense] = useState(false)

  const fund = funds.find(f => f.id === active) ?? funds[0] ?? null
  const c    = C[fund?.color] || C.blue

  /* مدير عام، أو عضو بهذا الصندوق تحديدًا له منصب إداري + حساب مربوط + حالة
     نشيط (نفس منطق requireFundAdmin بالخادم) — يعتمد على أعضاء الصندوق
     النشط المُحمَّلين حاليًا فقط */
  const isFundAdmin = isAdmin || (isMember && members.some(m =>
    m.memberId === user.memberId && m.role?.trim() && m.status === 'نشيط'
  ))

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

  /* ── تحميل أعضاء الصندوق الحالي (لأي عضو مسجَّل دخول فقط) ── */
  const loadMembers = useCallback(async (fundId) => {
    if (!fundId || !isMember) { setMembers([]); return }
    try {
      const data = await callApi({ action: 'getFundMembers', fundId })
      if (data.success) setMembers(data.members)
      else setMembers([])
    } catch { setMembers([]) }
  }, [isMember])

  /* ── تحميل سجل إنفاق الصندوق الحالي (لأي عضو مسجَّل دخول فقط — الزائر
     لا يراه إطلاقًا، ولا حتى الإجمالي) ── */
  const loadExpenses = useCallback(async (fundId) => {
    if (!fundId || !isMember) { setExpenses([]); setExpenseTotal(0); return }
    try {
      const data = await callApi({ action: 'getFundExpenses', fundId })
      if (data.success) { setExpenses(data.expenses); setExpenseTotal(data.total) }
      else { setExpenses([]); setExpenseTotal(0) }
    } catch { setExpenses([]); setExpenseTotal(0) }
  }, [isMember])

  useEffect(() => { loadFunds() }, [loadFunds])
  useEffect(() => { loadMembers(active) }, [active, loadMembers])
  useEffect(() => { loadExpenses(active) }, [active, loadExpenses])

  /* يجد عمق جد الفخذ ديناميكيًا — يسير في الابن الوحيد من الجذر حتى يصل لتفرع
     (نفس نمط findBranchDepth في AdminDashboard.jsx) */
  function findBranchDepthRaw(roots) {
    let cur = (roots && roots.length === 1) ? roots[0] : null
    if (!cur) return 0
    let depth = 0
    while (true) {
      const kids = cur.children || []
      if (kids.length !== 1) return depth + 1
      cur = kids[0]
      depth++
    }
  }
  const [branchDepth, setBranchDepth] = useState(0)

  /* ── قائمة كل عقد الشجرة (لاختيار فرد لإضافته للصندوق) ──
     نحمل مصفوفة كل الأجداد (الأقرب أولاً) من مسار الشجرة نفسه أثناء المشي
     عليها — أسماء الأفراد الأولى وحدها تتكرر كثيرًا (أحمد، محمد...)، وأحيانًا
     حتى بعد الجد المباشر، فيستحيل التمييز بدون السلسلة كاملة حتى جد الفخذ.
     نستبعد العقد الاصطناعية غير المربوطة فعليًا بالشجرة (son_...) لأنها
     ليست صفوفًا حقيقية بجدول "الشجرة العائلية" — لا يمكن اختيارها كعضو. */
  const loadTreeNodes = useCallback(async () => {
    if (treeNodes.length) return
    try {
      const data = await callFunction('manage-tree', { action: 'getFamilyTree' })
      if (!data.success) return
      const flat = []
      const walk = (n, depth, ancestors) => {
        if (!String(n.id).startsWith('son_')) {
          flat.push({ treeNodeId: n.id, memberId: n.memberId || null, name: n.name, depth, ancestors })
        }
        ;(n.children || []).forEach(c => walk(c, depth + 1, [n.name, ...ancestors]))
      }
      ;(data.tree || []).forEach(root => walk(root, 0, []))
      setBranchDepth(findBranchDepthRaw(data.tree || []))
      setTreeNodes(flat)
    } catch { /* ignore */ }
  }, [treeNodes.length])

  /* اسم كامل مميّز لعرضه بقائمة الاختيار — الاسم + كل الأجداد حتى جد الفخذ
     (ما فوق جد الفخذ مشترك بين الجميع فلا يميّز شيئًا، لذا يُحذف) */
  const fullDisplayName = (m) => {
    if (!m || !m.name) return ''
    const keep = Math.max(0, (m.depth || 0) - branchDepth)
    return [m.name, ...(m.ancestors || []).slice(0, keep)].join(' بن ')
  }

  /* ── فتح مودال الصندوق ── */
  const openNew = () => {
    setDraft({ ...BLANK_FUND })
    setModal('new')
  }
  const openEdit = (f) => {
    setDraft({ ...f, objectives: [...f.objectives], conditions: [...f.conditions] })
    setModal('edit')
  }

  /* ── تعديل مسودة الصندوق ── */
  const setD     = (field) => (e) => setDraft(d => ({ ...d, [field]: e.target.value }))
  const setLines = (field) => (e) => setDraft(d => ({ ...d, [field]: e.target.value.split('\n') }))

  /* ── حفظ الصندوق ── */
  const handleSave = async () => {
    if (!draft.name.trim()) return alert('اسم الصندوق مطلوب')
    const clean = {
      ...draft,
      objectives: draft.objectives.filter(o => o.trim()),
      conditions: draft.conditions.filter(c => c.trim()),
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

  /* ── حذف الصندوق ── */
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

  /* ── مودال إدارة أعضاء الصندوق ── */
  const openNewMember = () => { loadTreeNodes(); setMemberDraft({ ...BLANK_MEMBER }); setMemberModal('new') }
  const openEditMember = (m) => { loadTreeNodes(); setMemberDraft({ ...m }); setMemberModal('edit') }
  const setM = (field) => (e) => setMemberDraft(d => ({ ...d, [field]: e.target.value }))

  /* اختيار فرد من الشجرة يملأ الاسم ورقم العضو (إن كان مسجَّلاً) تلقائيًا */
  const pickTreeNode = (treeNodeId) => {
    const picked = treeNodes.find(n => n.treeNodeId === treeNodeId)
    setMemberDraft(d => ({ ...d, treeNodeId, name: picked ? picked.name : d.name, memberId: picked?.memberId || null }))
  }

  const handleSaveMember = async () => {
    if (!memberDraft.treeNodeId) return alert('يجب اختيار الفرد من الشجرة')
    setSavingMember(true)
    try {
      const action = memberModal === 'new' ? 'addFundMember' : 'updateFundMember'
      const data = await callApi({
        action,
        id: memberDraft.id || undefined,
        fundId: fund.id,
        treeNodeId: memberDraft.treeNodeId,
        name: memberDraft.name,
        role: memberDraft.role,
        status: memberDraft.status,
        memberId: memberDraft.memberId,
        joinDate: memberDraft.joinDate,
        balance: memberDraft.balance,
        dues: memberDraft.dues,
        maturityDate: memberDraft.maturityDate,
        totalAmount: memberDraft.totalAmount,
      })
      if (data.success) {
        await loadMembers(fund.id)
        setMemberModal(null)
      } else {
        alert(data.message || 'حدث خطأ')
      }
    } catch {
      alert('حدث خطأ في الاتصال بالخادم')
    } finally {
      setSavingMember(false)
    }
  }

  const handleRemoveMember = async (id) => {
    if (!confirm('هل تريد إزالة هذا العضو من الصندوق؟')) return
    try {
      const data = await callApi({ action: 'removeFundMember', id })
      if (data.success) await loadMembers(fund.id)
      else alert(data.message || 'حدث خطأ')
    } catch {
      alert('حدث خطأ في الاتصال بالخادم')
    }
  }

  /* ── مودال تسجيل إنفاق من الصندوق ── */
  const openNewExpense = () => { setExpenseDraft({ ...BLANK_EXPENSE }); setExpenseModal(true) }
  const setE = (field) => (e) => setExpenseDraft(d => ({ ...d, [field]: e.target.value }))

  const handleSaveExpense = async () => {
    const amount = Number(expenseDraft.amount)
    if (!amount || amount <= 0) return alert('المبلغ يجب أن يكون رقمًا أكبر من صفر')
    if (!expenseDraft.reason.trim()) return alert('سبب الإنفاق مطلوب')
    setSavingExpense(true)
    try {
      const data = await callApi({
        action: 'addFundExpense',
        fundId: fund.id,
        amount,
        reason: expenseDraft.reason.trim(),
        date: expenseDraft.date,
      })
      if (data.success) {
        await loadExpenses(fund.id)
        setExpenseModal(false)
      } else {
        alert(data.message || 'حدث خطأ')
      }
    } catch {
      alert('حدث خطأ في الاتصال بالخادم')
    } finally {
      setSavingExpense(false)
    }
  }

  const handleRemoveExpense = async (id) => {
    if (!confirm('هل تريد حذف عملية الإنفاق هذه؟')) return
    try {
      const data = await callApi({ action: 'removeFundExpense', id })
      if (data.success) await loadExpenses(fund.id)
      else alert(data.message || 'حدث خطأ')
    } catch {
      alert('حدث خطأ في الاتصال بالخادم')
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
                <IconBtn onClick={() => handleDelete(f.id)} disabled={deletingId === f.id} color="239,68,68" title="حذف">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.2" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </IconBtn>
              )}
            </div>
          )
        })}
      </div>

      {/* ══ محتوى الصندوق المحدد ══ */}
      {fund && (
        <>
          {/* إحصائيات سريعة + تعديل الصندوق */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className={`grid gap-4 flex-1 min-w-[260px] ${isMember ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'}`}>
              <StatCard label="إجمالي الأعضاء"   value={fund.membersCount || 0}  c={c} />
              <StatCard label="إجمالي مبلغ الصندوق" value={fund.totalAmount || 0} c={c} sub="ريال سعودي" />
              {/* الإنفاق والمتبقي — للأعضاء المسجَّلين فقط، مطابقةً لخصوصية بطاقة الإنفاق نفسها */}
              {isMember && (
                <>
                  <StatCard label="إجمالي الإنفاق" value={expenseTotal || 0} c={c} sub="ريال سعودي" />
                  <StatCard label="المتبقي بعد الإنفاق" value={Math.max(0, (fund.totalAmount || 0) - (expenseTotal || 0))} c={c} sub="ريال سعودي" />
                </>
              )}
            </div>
            {isFundAdmin && (
              <button onClick={() => openEdit(fund)}
                className="font-nav text-sm px-4 py-2.5 rounded-2xl transition-all duration-200 flex items-center gap-2"
                style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)', color: '#60a5fa' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                تعديل الصندوق
              </button>
            )}
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

              {/* إنفاق الصندوق — للأعضاء المسجَّلين دخول فقط، الزائر لا يراها إطلاقًا */}
              {isMember && (
                <div className="rounded-[24px] p-5" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span>💸</span>
                      <span className="font-nav text-sm font-semibold" style={{ color: c.accent }}>إنفاق الصندوق</span>
                      <span className="font-nav text-xs text-gray-500">
                        (إجمالي: {expenseTotal.toLocaleString('ar-SA')} ريال)
                      </span>
                    </div>
                    {isFundAdmin && (
                      <button onClick={openNewExpense}
                        className="font-nav text-xs px-3 py-1.5 rounded-xl transition-all duration-200"
                        style={{ background: 'rgba(198,161,107,0.1)', border: '1px solid rgba(198,161,107,0.25)', color: 'var(--gold-main)' }}>
                        + تسجيل إنفاق
                      </button>
                    )}
                  </div>
                  {expenses.length === 0 ? (
                    <p className="font-nav text-sm text-gray-600 py-2">لا توجد عمليات إنفاق مسجَّلة</p>
                  ) : (
                    <div className="space-y-2">
                      {expenses.map(e => (
                        <div key={e.id} className="flex items-center justify-between gap-3 py-2.5"
                          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <div className="min-w-0">
                            <p className="font-nav text-sm text-gray-300">{e.reason}</p>
                            <p className="font-nav text-xs text-gray-500 mt-0.5">{e.date}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <p className="font-nav text-sm font-bold" style={{ color: '#f87171' }}>
                              -{e.amount.toLocaleString('ar-SA')}
                              <span className="text-xs font-normal text-gray-500 mr-1">ريال</span>
                            </p>
                            {isFundAdmin && (
                              <button onClick={() => handleRemoveExpense(e.id)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/10 transition-colors flex-shrink-0"
                                style={{ border: '1px solid rgba(239,68,68,0.2)' }} title="حذف">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5">
                                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* العمود الجانبي — أعضاء الصندوق (يشمل مجلس الإدارة: من له منصب) */}
            <div className="space-y-5">
              <div className="rounded-[24px] overflow-hidden" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                <div className="px-5 py-4" style={{ borderBottom: `1px solid ${c.border}` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>📊</span>
                      <span className="font-nav text-sm font-semibold" style={{ color: c.accent }}>أعضاء الصندوق</span>
                    </div>
                    <div className="flex gap-2">
                      {isFundAdmin && (
                        <button onClick={openNewMember}
                          className="font-nav text-xs px-2.5 py-1.5 rounded-xl transition-all duration-200"
                          style={{ background: 'rgba(198,161,107,0.1)', border: '1px solid rgba(198,161,107,0.25)', color: 'var(--gold-main)' }}>
                          + إضافة
                        </button>
                      )}
                      {isAdmin && members.length > 0 && (
                        <>
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
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {isMember ? (
                  <div className="px-5 py-3">
                    {members.length === 0 ? (
                      <p className="font-nav text-sm text-gray-600 py-3">لا يوجد أعضاء مسجلون</p>
                    ) : members.map((m, i) => (
                      <div key={m.id || i} className="flex items-center justify-between gap-2 py-2.5"
                        style={{ borderBottom: i < members.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-nav text-sm text-white">{m.name}</p>
                            {m.role?.trim() && (
                              <span className="font-nav text-[10px] px-2 py-0.5 rounded-full font-bold"
                                style={{ background: c.soft, border: `1px solid ${c.border}`, color: c.accent }}>
                                {m.role}
                              </span>
                            )}
                            <StatusBadge status={m.status} />
                          </div>
                          <p className="font-nav text-xs text-gray-500 mt-0.5">{m.joinDate || '—'}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-left">
                            <p className="font-nav text-sm font-bold" style={{ color: c.accent }}>
                              {(m.totalAmount || 0).toLocaleString('ar-SA')}
                              <span className="text-xs font-normal text-gray-500 mr-1">ريال</span>
                            </p>
                          </div>
                          {isFundAdmin && (
                            <div className="flex gap-1">
                              <button onClick={() => openEditMember(m)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-blue-500/10 transition-colors flex-shrink-0"
                                style={{ border: '1px solid rgba(96,165,250,0.2)' }} title="تعديل">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.4" strokeLinecap="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                              </button>
                              <button onClick={() => handleRemoveMember(m.id)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/10 transition-colors flex-shrink-0"
                                style={{ border: '1px solid rgba(239,68,68,0.2)' }} title="إزالة">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5">
                                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <p className="font-nav text-xs text-gray-600 pt-2 pb-1">
                      يعرض {members.length} عضو
                    </p>
                  </div>
                ) : (
                  /* زائر غير مسجَّل دخول: الاسم والمنصب فقط (لتمييز المدير عن
                     العضو العادي) — بلا أي بيانات مالية أو حالة فردية */
                  <div className="px-5 py-3">
                    {(fund.publicMembers || []).length === 0 ? (
                      <p className="font-nav text-sm text-gray-600 py-3">لا يوجد أعضاء مسجلون</p>
                    ) : fund.publicMembers.map((m, i) => (
                      <div key={i} className="flex items-center gap-1.5 flex-wrap py-2"
                        style={{ borderBottom: i < fund.publicMembers.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                        <p className="font-nav text-sm text-white">{m.name}</p>
                        {m.role?.trim() && (
                          <span className="font-nav text-[10px] px-2 py-0.5 rounded-full font-bold"
                            style={{ background: c.soft, border: `1px solid ${c.border}`, color: c.accent }}>
                            {m.role}
                          </span>
                        )}
                      </div>
                    ))}
                    <p className="font-nav text-xs text-gray-600 pt-2 pb-1">
                      سجّل دخولك لعرض التفاصيل الكاملة (الأرصدة والحالات)
                    </p>
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

      {/* ══ مودال إضافة/تعديل الصندوق ══ */}
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

              <p className="font-nav text-[11px] text-gray-600">
                إدارة الأعضاء (بما فيهم مجلس الإدارة) صارت من بطاقة "أعضاء الصندوق" مباشرة — زر "+ إضافة" هناك.
              </p>
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

      {/* ══ مودال إضافة/تعديل عضو صندوق ══ */}
      {memberModal && memberDraft && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
          style={{ background: 'rgba(5,10,16,0.8)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
          onClick={e => e.target === e.currentTarget && setMemberModal(null)}
        >
          <div
            className="w-full max-w-lg rounded-[32px] overflow-hidden flex flex-col"
            style={{ background: 'rgba(15,22,32,0.99)', border: '1px solid rgba(198,161,107,0.22)', maxHeight: '92vh',
              boxShadow: '0 48px 120px rgba(0,0,0,0.75)' }}
          >
            <div className="px-8 pt-8 pb-5 flex items-center justify-between flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h2 className="text-xl font-bold text-[var(--gold-main)]">
                {memberModal === 'new' ? 'إضافة عضو للصندوق' : `تعديل: ${memberDraft.name}`}
              </h2>
              <button onClick={() => setMemberModal(null)}
                className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/5 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.80)" strokeWidth="2.2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto px-8 py-6 space-y-4 flex-1">

              {memberModal === 'new' ? (
                <div>
                  <label className="font-nav text-xs text-gray-500 mb-1.5 block">اختر الفرد من الشجرة *</label>
                  <SearchableSelect
                    options={treeNodes}
                    value={memberDraft.treeNodeId}
                    onChange={pickTreeNode}
                    getId={n => n.treeNodeId}
                    getLabel={n => fullDisplayName(n)}
                  />
                </div>
              ) : (
                <div>
                  <label className="font-nav text-xs text-gray-500 mb-1.5 block">الاسم</label>
                  <input value={memberDraft.name} onChange={setM('name')} className="form-input" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-nav text-xs text-gray-500 mb-1.5 block">
                    المنصب <span className="text-gray-600">(اختياري — رئيس / مدير / أمين صندوق...)</span>
                  </label>
                  <input value={memberDraft.role || ''} onChange={setM('role')} className="form-input" placeholder="فارغ = عضو عادي" />
                </div>
                <div>
                  <label className="font-nav text-xs text-gray-500 mb-1.5 block">حالة العضو</label>
                  <select value={memberDraft.status} onChange={setM('status')} className="form-input">
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>

              {memberDraft.role?.trim() && (
                <p className="font-nav text-[11px] leading-relaxed" style={{ color: memberDraft.memberId ? '#4ade80' : 'rgba(245,158,11,0.9)' }}>
                  {memberDraft.memberId
                    ? '✓ هذا الفرد له حساب دخول حقيقي — سيحصل على صلاحية إدارة هذا الصندوق طالما حالته "نشيط"'
                    : '⚠ هذا الفرد ليس له حساب دخول بالموقع — لن يحصل على صلاحيات إدارة فعلية رغم المنصب (اسم عرض فقط)'}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-nav text-xs text-gray-500 mb-1.5 block">تاريخ الاشتراك</label>
                  <input type="date" value={memberDraft.joinDate || ''} onChange={setM('joinDate')} className="form-input" />
                </div>
                <div>
                  <label className="font-nav text-xs text-gray-500 mb-1.5 block">تاريخ اكتمال الاستحقاق</label>
                  <input type="date" value={memberDraft.maturityDate || ''} onChange={setM('maturityDate')} className="form-input" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-nav text-xs text-gray-500 mb-1.5 block">الرصيد الحالي</label>
                  <input type="number" value={memberDraft.balance} onChange={setM('balance')} className="form-input" />
                </div>
                <div>
                  <label className="font-nav text-xs text-gray-500 mb-1.5 block">الأقساط المستحقة</label>
                  <input type="number" value={memberDraft.dues} onChange={setM('dues')} className="form-input" />
                </div>
                <div>
                  <label className="font-nav text-xs text-gray-500 mb-1.5 block">المبلغ الكامل</label>
                  <input type="number" value={memberDraft.totalAmount} onChange={setM('totalAmount')} className="form-input" />
                </div>
              </div>
            </div>

            <div className="px-8 py-5 flex gap-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={handleSaveMember} disabled={savingMember}
                className="flex-1 font-nav text-sm py-3 rounded-2xl font-bold transition-all duration-200 disabled:opacity-50"
                style={{ background: 'var(--gold-main)', color: '#000' }}>
                {savingMember ? 'جاري الحفظ...' : memberModal === 'new' ? 'إضافة العضو' : 'حفظ التغييرات'}
              </button>
              <button onClick={() => setMemberModal(null)}
                className="font-nav text-sm py-3 px-6 rounded-2xl transition-all duration-200"
                style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.82)' }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ مودال تسجيل إنفاق من الصندوق ══ */}
      {expenseModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
          style={{ background: 'rgba(5,10,16,0.8)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
          onClick={e => e.target === e.currentTarget && setExpenseModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-[32px] overflow-hidden flex flex-col"
            style={{ background: 'rgba(15,22,32,0.99)', border: '1px solid rgba(198,161,107,0.22)', maxHeight: '92vh',
              boxShadow: '0 48px 120px rgba(0,0,0,0.75)' }}
          >
            <div className="px-8 pt-8 pb-5 flex items-center justify-between flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h2 className="text-xl font-bold text-[var(--gold-main)]">تسجيل إنفاق</h2>
              <button onClick={() => setExpenseModal(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/5 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.80)" strokeWidth="2.2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto px-8 py-6 space-y-4 flex-1">
              <div>
                <label className="font-nav text-xs text-gray-500 mb-1.5 block">المبلغ (ريال) *</label>
                <input type="number" value={expenseDraft.amount} onChange={setE('amount')} className="form-input" placeholder="0" />
              </div>
              <div>
                <label className="font-nav text-xs text-gray-500 mb-1.5 block">سبب الإنفاق *</label>
                <textarea value={expenseDraft.reason} onChange={setE('reason')} className="form-input resize-none" rows={3}
                  placeholder="مثال: شراء مستلزمات واجب العزاء لعائلة..." />
              </div>
              <div>
                <label className="font-nav text-xs text-gray-500 mb-1.5 block">التاريخ</label>
                <input type="date" value={expenseDraft.date} onChange={setE('date')} className="form-input" />
              </div>
            </div>

            <div className="px-8 py-5 flex gap-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={handleSaveExpense} disabled={savingExpense}
                className="flex-1 font-nav text-sm py-3 rounded-2xl font-bold transition-all duration-200 disabled:opacity-50"
                style={{ background: 'var(--gold-main)', color: '#000' }}>
                {savingExpense ? 'جاري الحفظ...' : 'تسجيل الإنفاق'}
              </button>
              <button onClick={() => setExpenseModal(false)}
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
