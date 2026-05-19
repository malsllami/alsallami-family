import { useState, useEffect } from 'react'
import PasswordInput from '../components/PasswordInput'
import { normalizeDigits } from '../utils/normalizeInput'
import MiniTree from '../components/MiniTree'
import TreeNavigator from '../components/TreeNavigator'

function calcAge(birthDate) {
  if (!birthDate) return null
  const born = new Date(birthDate)
  const now = new Date()
  let age = now.getFullYear() - born.getFullYear()
  if (now.getMonth() < born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())) age--
  return age
}

const T = {
  blue:    { bg: 'rgba(59,130,246,0.08)',   border: 'rgba(59,130,246,0.2)',   accent: '#60a5fa',          soft: 'rgba(59,130,246,0.14)'   },
  purple:  { bg: 'rgba(139,92,246,0.08)',   border: 'rgba(139,92,246,0.2)',   accent: '#a78bfa',          soft: 'rgba(139,92,246,0.14)'   },
  teal:    { bg: 'rgba(20,184,166,0.08)',   border: 'rgba(20,184,166,0.2)',   accent: '#2dd4bf',          soft: 'rgba(20,184,166,0.14)'   },
  rose:    { bg: 'rgba(244,63,94,0.08)',    border: 'rgba(244,63,94,0.2)',    accent: '#fb7185',          soft: 'rgba(244,63,94,0.14)'    },
  emerald: { bg: 'rgba(16,185,129,0.08)',   border: 'rgba(16,185,129,0.2)',   accent: '#34d399',          soft: 'rgba(16,185,129,0.14)'   },
  gold:    { bg: 'rgba(198,161,107,0.08)',  border: 'rgba(198,161,107,0.2)',  accent: 'var(--gold-main)', soft: 'rgba(198,161,107,0.14)'  },
}

const JOBS = ['موظف', 'طالب', 'متقاعد', 'أعمال حرة']

/* ── مكونات مساعدة ── */

function Card({ t, icon, title, action, children, className = '' }) {
  return (
    <div className={`rounded-[28px] p-6 ${className}`} style={{ background: t.bg, border: `1px solid ${t.border}` }}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: t.soft, border: `1px solid ${t.border}` }}>
            {icon}
          </div>
          <span className="font-nav text-sm font-semibold" style={{ color: t.accent }}>{title}</span>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function InfoRow({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/[0.05] last:border-0">
      <span className="font-nav text-sm" style={{ color: accent || 'rgba(255,255,255,0.82)' }}>{value || '—'}</span>
      <span className="font-nav text-xs text-gray-500">{label}</span>
    </div>
  )
}

function Skeleton({ lines = 3 }) {
  return (
    <div className="space-y-3 py-1">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 rounded-lg animate-pulse"
          style={{ background: 'rgba(255,255,255,0.06)', width: i % 2 === 0 ? '70%' : '50%' }} />
      ))}
    </div>
  )
}

function SlidePanel({ open, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 0.38s cubic-bezier(0.23,1,0.32,1)' }}>
      <div style={{ overflow: 'hidden' }}>
        <div className="pt-4 space-y-3">{children}</div>
      </div>
    </div>
  )
}

function SmallBtn({ t, onClick, label, danger }) {
  return (
    <button onClick={onClick}
      className="font-nav text-[11px] px-2.5 py-1 rounded-lg transition-all duration-200"
      style={danger
        ? { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }
        : { background: t.soft, border: `1px solid ${t.border}`, color: t.accent }
      }>
      {label}
    </button>
  )
}

function AliveToggle({ alive, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!alive)}
      className="font-nav text-[11px] px-3 py-1 rounded-xl transition-all duration-200"
      style={{
        background: alive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)',
        border:     alive ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.2)',
        color:      alive ? '#34d399' : '#f87171',
      }}>
      {alive ? 'حي' : 'متوفى'}
    </button>
  )
}

function InlineEditButtons({ t, onSave, onCancel, loading }) {
  return (
    <div className="flex gap-2 pt-1">
      <button onClick={onSave} disabled={loading}
        className="flex-1 font-nav text-xs py-2 rounded-xl disabled:opacity-50"
        style={{ background: t.soft, border: `1px solid ${t.border}`, color: t.accent }}>
        {loading ? '...' : 'حفظ'}
      </button>
      <button onClick={onCancel}
        className="flex-1 font-nav text-xs py-2 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
        إلغاء
      </button>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════ */

export default function MemberDashboard() {
  const savedUser = JSON.parse(localStorage.getItem('user'))
  const mustChangePassword = savedUser?.mustChangePassword

  const [memberData,    setMemberData]    = useState(null)
  const [dataLoading,   setDataLoading]   = useState(true)
  const [preLinked,     setPreLinked]     = useState(null)

  /* التواصل */
  const [editContact,    setEditContact]    = useState(false)
  const [draft,          setDraft]          = useState({ firstName: '', phone: '', email: '', city: '', job: '' })
  const [contactLoading, setContactLoading] = useState(false)

  /* الزوجات */
  const [showAddWife,    setShowAddWife]    = useState(false)
  const [wifeName,       setWifeName]       = useState('')
  const [wifeStatus,     setWifeStatus]     = useState('مستمرة')
  const [wifeAddAlive,   setWifeAddAlive]   = useState(true)
  const [wifeLoading,    setWifeLoading]    = useState(false)
  const [editingWifeId,  setEditingWifeId]  = useState(null)
  const [wifeDraft,      setWifeDraft]      = useState({ name: '', status: 'مستمرة', alive: true })
  const [wifeEditLoad,   setWifeEditLoad]   = useState(false)

  /* الأبناء */
  const [showAddChild,    setShowAddChild]    = useState(false)
  const [newChild,        setNewChild]        = useState({ name: '', birthDate: '', gender: 'ذكر', alive: true, job: '', nationalId: '' })
  const [childLoading,    setChildLoading]    = useState(false)
  const [editingChildId,  setEditingChildId]  = useState(null)
  const [childDraft,      setChildDraft]      = useState({ name: '', gender: 'ذكر', birthDate: '', alive: true, job: '', nationalId: '' })
  const [childEditLoad,   setChildEditLoad]   = useState(false)

  /* بيانات الهوية */
  const [editId,      setEditId]      = useState(false)
  const [idDraft,     setIdDraft]     = useState({ nationalId: '', branch: '' })
  const [idLoading,   setIdLoading]   = useState(false)

  /* بيانات الميلاد */
  const [editBirth,     setEditBirth]     = useState(false)
  const [birthDraft,    setBirthDraft]    = useState({ birthDate: '' })
  const [birthLoading,  setBirthLoading]  = useState(false)

  /* كلمة المرور */
  const [passwordData,    setPasswordData]    = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [showChangePw,    setShowChangePw]    = useState(false)
  const [changePwLoading, setChangePwLoading] = useState(false)

  /* ربط الشجرة */
  const [showTreeLink,    setShowTreeLink]    = useState(false)
  const [selectedParent,  setSelectedParent]  = useState(null)
  const [treeLinkLoading, setTreeLinkLoading] = useState(false)
  const [treeLinkMsg,     setTreeLinkMsg]     = useState(null)
  const [fatherNotFound,  setFatherNotFound]  = useState(false)
  const [notFoundName,    setNotFoundName]    = useState('')
  const [notFoundNote,    setNotFoundNote]    = useState('')
  const [notFoundAncestor,setNotFoundAncestor]= useState(null)
  const [treeData,        setTreeData]        = useState(null)
  const [treeLoading,     setTreeLoading]     = useState(false)
  const [familyAncestors, setFamilyAncestors] = useState(null)

  const setPw = (field) => (e) => setPasswordData(p => ({ ...p, [field]: e.target.value }))
  const API   = import.meta.env.VITE_API_URL
  const post  = (body) => fetch(API, { method: 'POST', body: JSON.stringify(body) }).then(r => r.json())

  /* جلب الشجرة للشجرة المصغرة */
  useEffect(() => {
    if (!API || treeData) return
    post({ action: 'getFamilyTree' })
      .then(d => { if (d.success && d.tree?.length > 0) setTreeData(d.tree[0]) })
      .catch(() => {})
  }, [])

  /* استخراج موقع العضو في الشجرة */
  useEffect(() => {
    if (!treeData || !savedUser?.memberId) return
    const memberId = savedUser.memberId
    function findByMemberId(node) {
      if (node.memberId === memberId) return node
      for (const c of (node.children || [])) { const r = findByMemberId(c); if (r) return r }
      return null
    }
    function findById(node, id) {
      if (node.id === id) return node
      for (const c of (node.children || [])) { const r = findById(c, id); if (r) return r }
      return null
    }
    const memberNode = findByMemberId(treeData)
    if (!memberNode) return
    const fatherNode = memberNode.parentId ? findById(treeData, memberNode.parentId) : null
    setFamilyAncestors({
      fatherName:      memberNode.parentName || null,
      grandfatherName: fatherNode?.parentName || null,
      path:            memberNode.path       || '',
      generation:      memberNode.generation || null,
    })
  }, [treeData])

  /* جلب الشجرة عند فتح لوحة الربط */
  useEffect(() => {
    if (!showTreeLink || treeData || !API) return
    setTreeLoading(true)
    post({ action: 'getFamilyTree' })
      .then(d => { if (d.success && d.tree?.length > 0) setTreeData(d.tree[0]) })
      .catch(() => {})
      .finally(() => setTreeLoading(false))
  }, [showTreeLink, treeData])

  /* جلب بيانات العضو */
  useEffect(() => {
    const load = async () => {
      try {
        const data = await post({ action: 'getMemberData', memberId: savedUser.memberId })
        if (data.success) {
          const m = { ...data.member, wives: data.wives || [], children: data.children || [] }
          setMemberData(m)
          if (data.preLinked) setPreLinked(data.preLinked)
          setDraft({ firstName: m.firstName || '', phone: m.phone || '', email: m.email || '', city: m.city || '', job: m.job || '' })
        }
      } catch (e) { console.error(e) }
      finally { setDataLoading(false) }
    }
    load()
  }, [])

  /* ── تعديل بيانات التواصل ── */
  const handleUpdateContact = async () => {
    if (!draft.firstName) return alert('الاسم مطلوب')
    try {
      setContactLoading(true)
      const result = await post({
        action: 'updateMemberInfo',
        memberId: savedUser.memberId,
        'الاسم الأول':       draft.firstName,
        'رقم الجوال':        draft.phone,
        'البريد الإلكتروني': draft.email,
        'المدينة':           draft.city,
        'المهنة':            draft.job,
      })
      if (result.success) {
        setMemberData(p => ({ ...p, ...draft }))
        localStorage.setItem('user', JSON.stringify({ ...savedUser, firstName: draft.firstName }))
        setEditContact(false)
      } else { alert(result.message) }
    } catch { alert('حدث خطأ') }
    finally { setContactLoading(false) }
  }

  /* ── تعديل بيانات الهوية ── */
  const handleUpdateId = async () => {
    try {
      setIdLoading(true)
      const result = await post({
        action: 'updateMemberInfo',
        memberId: savedUser.memberId,
        'رقم الهوية': idDraft.nationalId,
        'الفخذ':      idDraft.branch,
      })
      if (result.success) {
        setMemberData(p => ({ ...p, nationalId: idDraft.nationalId, branch: idDraft.branch }))
        setEditId(false)
      } else { alert(result.message) }
    } catch { alert('حدث خطأ') }
    finally { setIdLoading(false) }
  }

  /* ── تعديل بيانات الميلاد ── */
  const handleUpdateBirth = async () => {
    const computedMarital = ((m.wives?.length || 0) > 0) ? 'متزوج' : 'أعزب'
    try {
      setBirthLoading(true)
      const result = await post({
        action: 'updateMemberInfo',
        memberId: savedUser.memberId,
        'تاريخ الميلاد': birthDraft.birthDate,
        'الحالة الاجتماعية': computedMarital,
      })
      if (result.success) {
        setMemberData(p => ({ ...p, birthDate: birthDraft.birthDate, maritalStatus: computedMarital }))
        setEditBirth(false)
      } else { alert(result.message) }
    } catch { alert('حدث خطأ') }
    finally { setBirthLoading(false) }
  }

  /* ── إضافة زوجة ── */
  const handleAddWife = async () => {
    if (!wifeName.trim()) return alert('اسم الزوجة مطلوب')
    try {
      setWifeLoading(true)
      const result = await post({ action: 'addWife', memberId: savedUser.memberId, name: wifeName.trim(), status: wifeStatus, alive: wifeAddAlive })
      if (result.success) {
        setMemberData(p => ({ ...p, wives: [...(p.wives || []), { id: result.wifeId, name: wifeName.trim(), status: wifeStatus, alive: wifeAddAlive }] }))
        setWifeName(''); setWifeStatus('مستمرة'); setWifeAddAlive(true); setShowAddWife(false)
      } else { alert(result.message) }
    } catch { alert('حدث خطأ') }
    finally { setWifeLoading(false) }
  }

  /* ── تعديل زوجة ── */
  const startEditWife = (w) => {
    setWifeDraft({ name: w.name, status: w.status || 'مستمرة', alive: w.alive !== false })
    setEditingWifeId(w.id)
    setShowAddWife(false)
  }
  const handleUpdateWife = async () => {
    try {
      setWifeEditLoad(true)
      const result = await post({ action: 'updateWife', wifeId: editingWifeId, ...wifeDraft })
      if (result.success) {
        setMemberData(p => ({ ...p, wives: p.wives.map(w => w.id === editingWifeId ? { ...w, ...wifeDraft } : w) }))
        setEditingWifeId(null)
      } else { alert(result.message) }
    } catch { alert('حدث خطأ') }
    finally { setWifeEditLoad(false) }
  }

  /* ── حذف زوجة ── */
  const handleRemoveWife = async (wifeId) => {
    if (!confirm('هل تريد حذف هذه الزوجة؟')) return
    try {
      const result = await post({ action: 'removeWife', wifeId })
      if (result.success) setMemberData(p => ({ ...p, wives: p.wives.filter(w => w.id !== wifeId) }))
      else alert(result.message)
    } catch { alert('حدث خطأ') }
  }

  /* ── إضافة ابن / بنت ── */
  const handleAddChild = async () => {
    if (!newChild.name.trim()) return alert('الاسم مطلوب')
    try {
      setChildLoading(true)
      const result = await post({ action: 'addChild', memberId: savedUser.memberId, name: newChild.name.trim(), gender: newChild.gender, birthDate: newChild.birthDate, alive: newChild.alive, job: newChild.job, nationalId: newChild.nationalId })
      if (result.success) {
        setMemberData(p => ({ ...p, children: [...(p.children || []), { id: result.childId, name: newChild.name.trim(), gender: newChild.gender, birthDate: newChild.birthDate, alive: newChild.alive, job: newChild.job, nationalId: newChild.nationalId }] }))
        setNewChild({ name: '', birthDate: '', gender: 'ذكر', alive: true, job: '', nationalId: '' }); setShowAddChild(false)
      } else { alert(result.message) }
    } catch { alert('حدث خطأ') }
    finally { setChildLoading(false) }
  }

  /* ── تعديل ابن ── */
  const startEditChild = (c) => {
    setChildDraft({ name: c.name, gender: c.gender || 'ذكر', birthDate: c.birthDate || '', alive: c.alive !== false, job: c.job || '', nationalId: c.nationalId || '' })
    setEditingChildId(c.id)
    setShowAddChild(false)
  }
  const handleUpdateChild = async () => {
    try {
      setChildEditLoad(true)
      const result = await post({ action: 'updateChild', childId: editingChildId, ...childDraft })
      if (result.success) {
        setMemberData(p => ({ ...p, children: p.children.map(c => c.id === editingChildId ? { ...c, ...childDraft } : c) }))
        setEditingChildId(null)
      } else { alert(result.message) }
    } catch { alert('حدث خطأ') }
    finally { setChildEditLoad(false) }
  }

  /* ── حذف ابن ── */
  const handleRemoveChild = async (childId) => {
    if (!confirm('هل تريد حذف هذا الابن؟')) return
    try {
      const result = await post({ action: 'removeChild', childId })
      if (result.success) setMemberData(p => ({ ...p, children: p.children.filter(c => c.id !== childId) }))
      else alert(result.message)
    } catch { alert('حدث خطأ') }
  }

  /* ── إرسال طلب ربط الشجرة ── */
  const handleSubmitTreeLink = async () => {
    if (!fatherNotFound && !selectedParent) return
    if (fatherNotFound && !notFoundName.trim()) return
    try {
      setTreeLinkLoading(true)
      setTreeLinkMsg(null)
      const ancestorTag = notFoundAncestor ? '[' + notFoundAncestor.parentId + ']' : ''
      const payload = fatherNotFound
        ? { action: 'submitTreeRequest', memberId: savedUser.memberId,
            parentId: 'NOTFOUND', parentName: notFoundName.trim(),
            generationLevel: notFoundAncestor ? notFoundAncestor.generationLevel : 0,
            path: notFoundAncestor ? notFoundAncestor.path : '',
            note: ancestorTag + (notFoundNote.trim() ? ' ' + notFoundNote.trim() : '') }
        : { action: 'submitTreeRequest', memberId: savedUser.memberId,
            parentId: selectedParent.parentId, parentName: selectedParent.parentName,
            generationLevel: selectedParent.generationLevel, path: selectedParent.path, note: '' }
      const result = await post(payload)
      setTreeLinkMsg({ success: result.success, text: result.message || (result.success ? 'تم إرسال الطلب بنجاح، في انتظار موافقة المدير' : 'حدث خطأ') })
      if (result.success) {
        setSelectedParent(null); setFatherNotFound(false)
        setNotFoundName(''); setNotFoundNote(''); setNotFoundAncestor(null); setShowTreeLink(false)
      }
    } catch { setTreeLinkMsg({ success: false, text: 'تعذّر الاتصال بالخادم' }) }
    finally { setTreeLinkLoading(false) }
  }

  /* ── تغيير كلمة المرور ── */
  const callChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword)
      return { error: 'جميع الحقول مطلوبة' }
    if (passwordData.newPassword !== passwordData.confirmPassword)
      return { error: 'تأكيد كلمة المرور غير مطابق' }
    return post({ action: 'changePassword', memberId: savedUser.memberId, currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword })
  }
  const handleForceChange = async () => {
    try {
      const result = await callChangePassword()
      if (result?.error) { alert(result.error); return }
      if (result?.success) { localStorage.setItem('user', JSON.stringify({ ...savedUser, mustChangePassword: 'N' })); alert('تم تغيير كلمة المرور بنجاح'); window.location.reload() }
      else alert(result?.message)
    } catch { alert('حدث خطأ') }
  }
  const handleDashboardChange = async () => {
    try {
      setChangePwLoading(true)
      const result = await callChangePassword()
      if (result?.error) { alert(result.error); return }
      if (result?.success) { alert('تم تغيير كلمة المرور بنجاح'); setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' }); setShowChangePw(false) }
      else alert(result?.message)
    } catch { alert('حدث خطأ') }
    finally { setChangePwLoading(false) }
  }

  /* ── شاشة الإجبار ── */
  if (mustChangePassword === 'Y') {
    return (
      <div className="fixed inset-0 bg-[#36404a] flex items-center justify-center px-6 z-[9999]">
        <div className="w-full max-w-lg bg-white/10 border border-white/10 rounded-[35px] p-10 backdrop-blur-xl">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-red-400">تغيير كلمة المرور إجباري</h1>
            <p className="mt-5 text-gray-300 leading-8">يجب تغيير كلمة المرور قبل استخدام المنصة.</p>
          </div>
          <div className="mt-10 space-y-5">
            <PasswordInput placeholder="كلمة المرور الحالية"       value={passwordData.currentPassword} onChange={setPw('currentPassword')} />
            <PasswordInput placeholder="كلمة المرور الجديدة"       value={passwordData.newPassword}     onChange={setPw('newPassword')} />
            <PasswordInput placeholder="تأكيد كلمة المرور الجديدة" value={passwordData.confirmPassword}  onChange={setPw('confirmPassword')} />
          </div>
          <button onClick={handleForceChange}
            className="font-nav w-full mt-8 bg-red-500 text-white py-4 rounded-2xl font-bold hover:opacity-90 duration-300">
            تغيير كلمة المرور
          </button>
        </div>
      </div>
    )
  }

  const m = memberData || {}
  const age = calcAge(m.birthDate)
  const totalChildren = (m.children || []).length
  const visibleWives  = (m.wives    || []).filter(w => w.status !== 'منفصلة' || totalChildren > 0)
  const maritalStatus = ((m.wives?.length || 0) > 0) ? 'متزوج' : 'أعزب'

  /* ══════════ لوحة العضو ══════════ */
  return (
    <div className="px-5 lg:px-10 py-10 space-y-5">

      {/* العنوان */}
      <div>
        <h1 className="text-4xl font-bold text-[var(--gold-main)]">لوحة العضو</h1>
        <p className="mt-2 font-nav text-sm text-gray-400">
          {dataLoading ? 'جاري التحميل...' : [m.firstName, m.fatherName, m.grandfatherName].filter(Boolean).join(' ') || savedUser.firstName}
        </p>
      </div>

      {/* إشعار: تمت إضافتك في الشجرة من قِبل والدك */}
      {preLinked && (
        <div className="rounded-[20px] px-5 py-4 flex items-start gap-4"
          style={{ background: 'rgba(20,184,166,0.07)', border: '1px solid rgba(20,184,166,0.22)' }}>
          <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center mt-0.5"
            style={{ background: 'rgba(20,184,166,0.12)', border: '1px solid rgba(20,184,166,0.25)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="#2dd4bf" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="4" r="2"/>
              <circle cx="4" cy="20" r="2"/>
              <circle cx="20" cy="20" r="2"/>
              <line x1="12" y1="6"  x2="12" y2="12"/>
              <line x1="12" y1="12" x2="4"  y2="18"/>
              <line x1="12" y1="12" x2="20" y2="18"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-nav text-sm font-semibold" style={{ color: '#2dd4bf' }}>
              تمت إضافتك في الشجرة العائلية من قِبل والدك
            </p>
            <p className="font-nav text-xs mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
              قام <span style={{ color: 'rgba(255,255,255,0.75)' }}>{preLinked.fatherName}</span> بتسجيلك مسبقاً ضمن أبنائه في الشجرة — موقعك في الشجرة محجوز باسمك.
            </p>
          </div>
          <button onClick={() => setPreLinked(null)}
            className="font-nav text-xs mt-0.5 flex-shrink-0"
            style={{ color: 'rgba(255,255,255,0.25)' }}>✕</button>
        </div>
      )}

      {/* الصف الأول: الهوية + الميلاد + التواصل */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* 🔵 الهوية */}
        <Card t={T.blue} title="الهوية" icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.blue.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2"/>
            <circle cx="9" cy="10" r="2"/>
            <line x1="15" y1="8" x2="19" y2="8"/>
            <line x1="15" y1="12" x2="19" y2="12"/>
            <line x1="7" y1="16" x2="17" y2="16"/>
          </svg>
        } action={!dataLoading && (
          <button
            onClick={() => { setEditId(e => !e); setIdDraft({ nationalId: m.nationalId || '', branch: m.branch || '' }) }}
            className="font-nav text-xs px-3 py-1.5 rounded-xl transition-all duration-200"
            style={{ border: `1px solid ${editId ? T.blue.border : 'rgba(255,255,255,0.1)'}`, color: editId ? T.blue.accent : 'rgba(255,255,255,0.4)', background: editId ? T.blue.soft : 'transparent' }}>
            {editId ? 'إلغاء' : 'تعديل'}
          </button>
        )}>
          {dataLoading ? <Skeleton lines={4} /> : !editId ? (
            <>
              <InfoRow label="رقم العضوية" value={`#${savedUser.memberId}`} accent={T.blue.accent} />
              <InfoRow label="الاسم الأول"  value={m.firstName} />
              <InfoRow label="اسم الأب"     value={m.fatherName} />
              <InfoRow label="اسم الجد"     value={m.grandfatherName} />
              <InfoRow label="رقم الهوية"   value={m.nationalId} />
              <InfoRow label="الفخذ"        value={m.branch} />
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="font-nav text-xs text-gray-500 mb-1.5 block">رقم الهوية</label>
                <input type="text" inputMode="numeric" maxLength={10} value={idDraft.nationalId}
                  onChange={e => setIdDraft(p => ({ ...p, nationalId: normalizeDigits(e.target.value) }))}
                  className="form-input" placeholder="10 أرقام" />
              </div>
              <div>
                <label className="font-nav text-xs text-gray-500 mb-1.5 block">الفخذ</label>
                <input type="text" value={idDraft.branch}
                  onChange={e => setIdDraft(p => ({ ...p, branch: e.target.value }))}
                  className="form-input" placeholder="اسم الفخذ" />
              </div>
              <button onClick={handleUpdateId} disabled={idLoading}
                className="w-full font-nav text-sm py-2.5 rounded-2xl font-bold transition-all duration-200 disabled:opacity-50"
                style={{ background: T.blue.soft, border: `1px solid ${T.blue.border}`, color: T.blue.accent }}>
                {idLoading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
            </div>
          )}
        </Card>

        {/* 🟣 الميلاد */}
        <Card t={T.purple} title="بيانات الميلاد" icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.purple.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        } action={!dataLoading && (
          <button
            onClick={() => { setEditBirth(e => !e); setBirthDraft({ birthDate: m.birthDate || '' }) }}
            className="font-nav text-xs px-3 py-1.5 rounded-xl transition-all duration-200"
            style={{ border: `1px solid ${editBirth ? T.purple.border : 'rgba(255,255,255,0.1)'}`, color: editBirth ? T.purple.accent : 'rgba(255,255,255,0.4)', background: editBirth ? T.purple.soft : 'transparent' }}>
            {editBirth ? 'إلغاء' : 'تعديل'}
          </button>
        )}>
          {dataLoading ? <Skeleton lines={3} /> : !editBirth ? (
            <>
              <InfoRow label="تاريخ الميلاد"    value={m.birthDate ? new Date(m.birthDate).toLocaleDateString('ar-SA') : null} />
              <InfoRow label="العمر"             value={age !== null ? `${age} سنة` : null} accent={T.purple.accent} />
              <InfoRow label="الجنس"             value={m.gender} />
              <InfoRow label="الحالة الاجتماعية" value={maritalStatus} accent={T.purple.accent} />
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="font-nav text-xs text-gray-500 mb-1.5 block">تاريخ الميلاد</label>
                <input type="date" value={birthDraft.birthDate}
                  onChange={e => setBirthDraft({ birthDate: e.target.value })}
                  className="form-input" />
              </div>
              <div>
                <label className="font-nav text-xs text-gray-500 mb-1.5 block">الحالة الاجتماعية</label>
                <div className="form-input flex items-center justify-between" style={{ pointerEvents: 'none' }}>
                  <span className="font-nav text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>محسوبة من الزوجات تلقائياً</span>
                  <span style={{ color: T.purple.accent }}>{maritalStatus}</span>
                </div>
              </div>
              <button onClick={handleUpdateBirth} disabled={birthLoading}
                className="w-full font-nav text-sm py-2.5 rounded-2xl font-bold transition-all duration-200 disabled:opacity-50"
                style={{ background: T.purple.soft, border: `1px solid ${T.purple.border}`, color: T.purple.accent }}>
                {birthLoading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
            </div>
          )}
        </Card>

        {/* 🩵 التواصل — قابل للتعديل */}
        <Card t={T.teal} title="بيانات التواصل" icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.teal.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.16h3a2 2 0 0 1 2 1.72c.13 1 .36 1.97.7 2.9a2 2 0 0 1-.45 2.11L7.91 8.9a16 16 0 0 0 6.29 6.29l.9-.9a2 2 0 0 1 2.11-.45c.93.34 1.9.57 2.9.7a2 2 0 0 1 1.72 2.02z"/>
          </svg>
        } action={!dataLoading && (
          <button
            onClick={() => { setEditContact(e => !e); setDraft({ firstName: m.firstName || '', phone: m.phone || '', email: m.email || '', city: m.city || '', job: m.job || '' }) }}
            className="font-nav text-xs px-3 py-1.5 rounded-xl transition-all duration-200"
            style={{ border: `1px solid ${editContact ? T.teal.border : 'rgba(255,255,255,0.1)'}`, color: editContact ? T.teal.accent : 'rgba(255,255,255,0.4)', background: editContact ? T.teal.soft : 'transparent' }}>
            {editContact ? 'إلغاء' : 'تعديل'}
          </button>
        )}>
          {dataLoading ? <Skeleton lines={3} /> : !editContact ? (
            <>
              <InfoRow label="الاسم الأول"       value={m.firstName} />
              <InfoRow label="رقم الجوال"        value={m.phone} accent={T.teal.accent} />
              <InfoRow label="البريد الإلكتروني" value={m.email} />
              <InfoRow label="المدينة"           value={m.city} />
              <InfoRow label="المهنة"            value={m.job} />
            </>
          ) : (
            <div className="space-y-3">
              {[
                { key: 'firstName', label: 'الاسم الأول',       type: 'text'  },
                { key: 'phone',     label: 'رقم الجوال',        type: 'text'  },
                { key: 'email',     label: 'البريد الإلكتروني', type: 'email' },
                { key: 'city',      label: 'المدينة',           type: 'text'  },
              ].map(({ key, label, type }) => (
                <div key={key}>
                  <label className="font-nav text-xs text-gray-500 mb-1.5 block">{label}</label>
                  <input type={type} value={draft[key]} onChange={e => setDraft(p => ({ ...p, [key]: key === 'phone' ? normalizeDigits(e.target.value) : e.target.value }))} className="form-input" />
                </div>
              ))}
              <div>
                <label className="font-nav text-xs text-gray-500 mb-1.5 block">المهنة</label>
                <select value={draft.job} onChange={e => setDraft(p => ({ ...p, job: e.target.value }))} className="form-input">
                  <option value="">— اختر —</option>
                  {JOBS.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
              </div>
              <button onClick={handleUpdateContact} disabled={contactLoading}
                className="w-full font-nav text-sm py-2.5 rounded-2xl font-bold transition-all duration-200 disabled:opacity-50"
                style={{ background: T.teal.soft, border: `1px solid ${T.teal.border}`, color: T.teal.accent }}>
                {contactLoading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
            </div>
          )}
        </Card>
      </div>

      {/* الصف الثاني: الأبناء */}
      <div className="grid grid-cols-1 gap-5">

        {/* 🌸 الزوجات — مخفية */}

        {/* 🌿 الأبناء */}
        <Card t={T.emerald} title="الأبناء" icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.emerald.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        } action={!dataLoading && (
          <button onClick={() => { setShowAddChild(v => !v); setEditingChildId(null) }}
            className="font-nav text-xs px-3 py-1.5 rounded-xl transition-all duration-200"
            style={{ border: `1px solid ${showAddChild ? T.emerald.border : 'rgba(255,255,255,0.1)'}`, color: showAddChild ? T.emerald.accent : 'rgba(255,255,255,0.4)', background: showAddChild ? T.emerald.soft : 'transparent' }}>
            {showAddChild ? 'إلغاء' : '+ إضافة'}
          </button>
        )}>
          {dataLoading ? <Skeleton lines={3} /> : (
            <>
              {!(m.children?.filter(c => c.gender !== 'أنثى').length) ? (
                <p className="font-nav text-sm text-gray-600 py-1">لا يوجد أبناء مسجلون</p>
              ) : m.children.filter(c => c.gender !== 'أنثى').map((c, i) => (
                editingChildId === c.id ? (
                  /* وضع التعديل */
                  <div key={c.id} className="py-3 border-b border-white/[0.05] last:border-0 space-y-2">
                    <input type="text" value={childDraft.name} placeholder="الاسم"
                      onChange={e => setChildDraft(p => ({ ...p, name: e.target.value }))} className="form-input" />
                    <input type="date" value={childDraft.birthDate}
                      onChange={e => setChildDraft(p => ({ ...p, birthDate: e.target.value }))} className="form-input" />
                    <select value={childDraft.job}
                      onChange={e => setChildDraft(p => ({ ...p, job: e.target.value }))} className="form-input">
                      <option value="">— المهنة / الحالة —</option>
                      {JOBS.map(j => <option key={j} value={j}>{j}</option>)}
                    </select>
                    <input type="text" inputMode="numeric" maxLength={10}
                      placeholder="رقم الهوية (اختياري)"
                      value={childDraft.nationalId}
                      onChange={e => setChildDraft(p => ({ ...p, nationalId: normalizeDigits(e.target.value) }))}
                      className="form-input" />
                    <div>
                      <label className="font-nav text-xs text-gray-500 mb-1.5 block">الحالة الصحية</label>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setChildDraft(p => ({ ...p, alive: true }))}
                          className="flex-1 font-nav text-xs py-2 rounded-xl transition-all"
                          style={{ background: childDraft.alive ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${childDraft.alive ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`, color: childDraft.alive ? '#34d399' : 'rgba(255,255,255,0.3)' }}>
                          حي
                        </button>
                        <button type="button" onClick={() => setChildDraft(p => ({ ...p, alive: false }))}
                          className="flex-1 font-nav text-xs py-2 rounded-xl transition-all"
                          style={{ background: !childDraft.alive ? 'rgba(156,163,175,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${!childDraft.alive ? 'rgba(156,163,175,0.3)' : 'rgba(255,255,255,0.08)'}`, color: !childDraft.alive ? '#9ca3af' : 'rgba(255,255,255,0.3)' }}>
                          متوفى
                        </button>
                      </div>
                    </div>
                    <InlineEditButtons t={T.emerald} onSave={handleUpdateChild} onCancel={() => setEditingChildId(null)} loading={childEditLoad} />
                  </div>
                ) : (
                  /* وضع العرض */
                  <div key={c.id || i} className="flex items-center justify-between py-2.5 border-b border-white/[0.05] last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center font-nav text-xs font-bold flex-shrink-0"
                        style={{ background: T.emerald.soft, color: T.emerald.accent }}>
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-nav text-sm text-white/85">{c.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {c.birthDate && <span className="font-nav text-[10px] text-gray-600">{calcAge(c.birthDate)} سنة</span>}
                          {c.job && (
                            <span className="font-nav text-[10px] px-1.5 py-0.5 rounded-full"
                              style={{ background: T.emerald.soft, color: T.emerald.accent }}>{c.job}</span>
                          )}
                          {c.alive === false && (
                            <span className="font-nav text-[10px] px-1.5 py-0.5 rounded-full"
                              style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171' }}>متوفى</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <SmallBtn t={T.emerald} onClick={() => startEditChild(c)} label="تعديل" />
                      <SmallBtn t={T.emerald} onClick={() => handleRemoveChild(c.id)} label="حذف" danger />
                    </div>
                  </div>
                )
              ))}

              {/* نموذج إضافة ابن */}
              <SlidePanel open={showAddChild}>
                <input type="text" placeholder="الاسم" value={newChild.name}
                  onChange={e => setNewChild(p => ({ ...p, name: e.target.value }))} className="form-input" />
                <input type="date" value={newChild.birthDate}
                  onChange={e => setNewChild(p => ({ ...p, birthDate: e.target.value }))} className="form-input" />
                <select value={newChild.job}
                  onChange={e => setNewChild(p => ({ ...p, job: e.target.value }))} className="form-input">
                  <option value="">— المهنة / الحالة —</option>
                  {JOBS.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
                <input type="text" inputMode="numeric" maxLength={10}
                  placeholder="رقم الهوية (اختياري)"
                  value={newChild.nationalId}
                  onChange={e => setNewChild(p => ({ ...p, nationalId: normalizeDigits(e.target.value) }))}
                  className="form-input" />
                <div>
                  <label className="font-nav text-xs text-gray-500 mb-1.5 block">الحالة الصحية</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setNewChild(p => ({ ...p, alive: true }))}
                      className="flex-1 font-nav text-xs py-2 rounded-xl transition-all"
                      style={{ background: newChild.alive ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${newChild.alive ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`, color: newChild.alive ? '#34d399' : 'rgba(255,255,255,0.3)' }}>
                      حي
                    </button>
                    <button type="button" onClick={() => setNewChild(p => ({ ...p, alive: false }))}
                      className="flex-1 font-nav text-xs py-2 rounded-xl transition-all"
                      style={{ background: !newChild.alive ? 'rgba(156,163,175,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${!newChild.alive ? 'rgba(156,163,175,0.3)' : 'rgba(255,255,255,0.08)'}`, color: !newChild.alive ? '#9ca3af' : 'rgba(255,255,255,0.3)' }}>
                      متوفى
                    </button>
                  </div>
                </div>
                <button onClick={handleAddChild} disabled={childLoading}
                  className="w-full font-nav text-sm py-2.5 rounded-2xl font-bold transition-all duration-200 disabled:opacity-50"
                  style={{ background: T.emerald.soft, border: `1px solid ${T.emerald.border}`, color: T.emerald.accent }}>
                  {childLoading ? 'جاري الإضافة...' : 'إضافة ابن'}
                </button>
              </SlidePanel>
            </>
          )}
        </Card>
      </div>

      {/* الشجرة المصغرة */}
      {!dataLoading && (
        <div className="rounded-[28px] p-6"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(198,161,107,0.1)', border: '1px solid rgba(198,161,107,0.25)' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="var(--gold-main)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="23" y1="11" x2="17" y2="11"/>
                <line x1="20" y1="8" x2="20" y2="14"/>
              </svg>
            </div>
            <span className="font-nav text-sm font-semibold text-[var(--gold-main)]">شجرتك العائلية</span>
          </div>
          <MiniTree
            memberName={m.firstName}
            fatherName={familyAncestors?.fatherName || m.fatherName}
            grandfatherName={familyAncestors?.grandfatherName || m.grandfatherName}
            wives={m.wives || []}
            children={m.children || []}
          />
          {familyAncestors?.path && (
            <p className="text-center font-nav text-[11px] mt-3" style={{ color: 'rgba(255,255,255,0.28)' }}>
              موقعك في الشجرة: {familyAncestors.path}
              {familyAncestors.generation ? ` · الجيل ${familyAncestors.generation}` : ''}
            </p>
          )}
          <div className="flex justify-center mt-3">
            <a href={`${import.meta.env.BASE_URL}family-tree`}
              className="font-nav text-xs transition-colors duration-200"
              style={{ color: 'rgba(198,161,107,0.55)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--gold-main)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(198,161,107,0.55)'}>
              عرض موقعي في الشجرة الكاملة ←
            </a>
          </div>
        </div>
      )}

      {/* ربطك بالشجرة */}
      <div className="rounded-[28px] p-6" style={{ background: T.emerald.bg, border: `1px solid ${T.emerald.border}` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: T.emerald.soft, border: `1px solid ${T.emerald.border}` }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke={T.emerald.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="4" r="2"/>
                <circle cx="4" cy="20" r="2"/>
                <circle cx="20" cy="20" r="2"/>
                <line x1="12" y1="6"  x2="12" y2="12"/>
                <line x1="12" y1="12" x2="4"  y2="18"/>
                <line x1="12" y1="12" x2="20" y2="18"/>
              </svg>
            </div>
            <span className="font-nav text-sm font-semibold" style={{ color: T.emerald.accent }}>ربطك بالشجرة العائلية</span>
          </div>
          <button onClick={() => { setShowTreeLink(v => !v); setTreeLinkMsg(null) }}
            className="font-nav text-xs px-3 py-1.5 rounded-xl transition-all duration-200"
            style={{ border: `1px solid ${showTreeLink ? T.emerald.border : 'rgba(255,255,255,0.1)'}`, color: showTreeLink ? T.emerald.accent : 'rgba(255,255,255,0.4)', background: showTreeLink ? T.emerald.soft : 'transparent' }}>
            {showTreeLink ? 'إلغاء' : 'ربط بالشجرة'}
          </button>
        </div>

        {treeLinkMsg && (
          <div className="mt-4 px-4 py-3 rounded-2xl font-nav text-sm"
            style={{ background: treeLinkMsg.success ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: treeLinkMsg.success ? '1px solid rgba(16,185,129,0.22)' : '1px solid rgba(239,68,68,0.22)', color: treeLinkMsg.success ? T.emerald.accent : '#f87171' }}>
            {treeLinkMsg.text}
          </div>
        )}

        <SlidePanel open={showTreeLink}>
          <div className="flex gap-2 mb-3">
            <button onClick={() => { setFatherNotFound(false); setSelectedParent(null) }}
              className="flex-1 font-nav text-xs py-2 rounded-xl transition-all duration-200"
              style={{ background: !fatherNotFound ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${!fatherNotFound ? 'rgba(59,130,246,0.35)' : 'rgba(255,255,255,0.08)'}`, color: !fatherNotFound ? '#93c5fd' : '#6b7280' }}>
              اختر من الشجرة
            </button>
            <button onClick={() => { setFatherNotFound(true); setSelectedParent(null) }}
              className="flex-1 font-nav text-xs py-2 rounded-xl transition-all duration-200"
              style={{ background: fatherNotFound ? 'rgba(251,146,60,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${fatherNotFound ? 'rgba(251,146,60,0.35)' : 'rgba(255,255,255,0.08)'}`, color: fatherNotFound ? '#fb923c' : '#6b7280' }}>
              أبي غير موجود
            </button>
          </div>

          {!fatherNotFound ? (
            <>
              <p className="font-nav text-xs text-gray-500 leading-5 pb-2">
                اختر الشخص الذي تنتمي إليه مباشرةً (أبوك في الشجرة) — سيُحسب جيلك تلقائياً وتُرسل الطلب للمدير لمراجعته.
              </p>
              {treeLoading ? (
                <p className="font-nav text-xs text-center py-4" style={{ color: 'rgba(255,255,255,0.35)' }}>جاري تحميل الشجرة...</p>
              ) : (
                <TreeNavigator treeData={treeData} onSelect={setSelectedParent} selected={selectedParent} />
              )}
              {selectedParent && !treeLoading && (
                <button onClick={handleSubmitTreeLink} disabled={treeLinkLoading}
                  className="w-full font-nav text-sm py-3 rounded-2xl font-bold transition-all duration-200 disabled:opacity-50 mt-2"
                  style={{ background: T.emerald.soft, border: `1px solid ${T.emerald.border}`, color: T.emerald.accent }}>
                  {treeLinkLoading ? 'جاري الإرسال...' : `إرسال طلب الربط — الجيل ${selectedParent.generationLevel}`}
                </button>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <p className="font-nav text-xs leading-5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                اختر أقرب شخص تعرفه في الشجرة — ثم اكتب اسم أبيك الغير موجود.
              </p>
              {treeLoading ? (
                <p className="font-nav text-xs text-center py-4" style={{ color: 'rgba(255,255,255,0.35)' }}>جاري تحميل الشجرة...</p>
              ) : (
                <TreeNavigator treeData={treeData} onSelect={setNotFoundAncestor} selected={notFoundAncestor} />
              )}
              <div className="pt-1">
                <p className="font-nav text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>اسم أبيك (غير الموجود في الشجرة)</p>
                <input type="text" value={notFoundName} onChange={e => setNotFoundName(e.target.value)}
                  placeholder="اسم الأب الكامل *" className="form-input" />
              </div>
              <textarea value={notFoundNote} onChange={e => setNotFoundNote(e.target.value)}
                placeholder="ملاحظة إضافية للمدير..." className="form-input resize-none" rows={2} />
              <button onClick={handleSubmitTreeLink} disabled={treeLinkLoading || !notFoundName.trim()}
                className="w-full font-nav text-sm py-3 rounded-2xl font-bold transition-all duration-200 disabled:opacity-50"
                style={{ background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.3)', color: '#fb923c' }}>
                {treeLinkLoading ? 'جاري الإرسال...' : 'إرسال الطلب للمدير'}
              </button>
            </div>
          )}
        </SlidePanel>
      </div>

      {/* تغيير كلمة المرور */}
      <div className="rounded-[28px] p-6" style={{ background: T.gold.bg, border: `1px solid ${T.gold.border}` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: T.gold.soft, border: `1px solid ${T.gold.border}` }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--gold-main)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <span className="font-nav text-sm font-semibold text-[var(--gold-main)]">تغيير كلمة المرور</span>
          </div>
          <button onClick={() => { setShowChangePw(v => !v); setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' }) }}
            className="font-nav text-xs px-3 py-1.5 rounded-xl transition-all duration-200"
            style={{ border: `1px solid ${showChangePw ? T.gold.border : 'rgba(255,255,255,0.1)'}`, color: showChangePw ? 'var(--gold-main)' : 'rgba(255,255,255,0.4)', background: showChangePw ? T.gold.soft : 'transparent' }}>
            {showChangePw ? 'إلغاء' : 'تغيير'}
          </button>
        </div>
        <SlidePanel open={showChangePw}>
          <PasswordInput placeholder="كلمة المرور الحالية"       value={passwordData.currentPassword} onChange={setPw('currentPassword')} />
          <PasswordInput placeholder="كلمة المرور الجديدة"       value={passwordData.newPassword}     onChange={setPw('newPassword')} />
          <PasswordInput placeholder="تأكيد كلمة المرور الجديدة" value={passwordData.confirmPassword}  onChange={setPw('confirmPassword')} />
          <button onClick={handleDashboardChange} disabled={changePwLoading}
            className="w-full font-nav text-sm py-3 rounded-2xl font-bold transition-all duration-200 disabled:opacity-50"
            style={{ background: T.gold.soft, border: `1px solid ${T.gold.border}`, color: 'var(--gold-main)' }}>
            {changePwLoading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </button>
        </SlidePanel>
      </div>

    </div>
  )
}
