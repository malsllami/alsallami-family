import { useState, useEffect } from 'react'
import PasswordInput from '../components/PasswordInput'
import { normalizeDigits } from '../utils/normalizeInput'
import TreeNavigator from '../components/TreeNavigator'
import PhoneInput from '../components/PhoneInput'

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
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.72)' }}>
        إلغاء
      </button>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════ */

export default function MemberDashboard() {
  const savedUser = JSON.parse(localStorage.getItem('user'))
  const mustChangePassword = savedUser?.mustChangePassword

  const [memberData,         setMemberData]         = useState(null)
  const [dataLoading,        setDataLoading]        = useState(true)
  const [preLinked,          setPreLinked]          = useState(null)
  const [treeRequestStatus,  setTreeRequestStatus]  = useState(null)

  /* التواصل */
  const [editContact,    setEditContact]    = useState(false)
  const [draft,          setDraft]          = useState({ firstName: '', phone: '', email: '', city: '', job: '' })
  const [phoneCountry,   setPhoneCountry]   = useState('+966')
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
  const [idDraft,     setIdDraft]     = useState({ nationalId: '', branch: '', fatherName: '', grandfatherName: '' })
  const [idLoading,   setIdLoading]   = useState(false)

  /* بيانات الميلاد */
  const MARITAL_STATUS = ['أعزب', 'متزوج', 'مطلق', 'أرمل']
  const [editBirth,     setEditBirth]     = useState(false)
  const [birthDraft,    setBirthDraft]    = useState({ birthDate: '', maritalStatus: '' })
  const [birthLoading,  setBirthLoading]  = useState(false)

  /* كلمة المرور */
  const [passwordData,    setPasswordData]    = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [showChangePw,    setShowChangePw]    = useState(false)
  const [changePwLoading, setChangePwLoading] = useState(false)

  /* ربط الشجرة */
  const [showTreeLink,        setShowTreeLink]        = useState(false)
  const [treeLinkLoading,     setTreeLinkLoading]     = useState(false)
  const [treeLinkMsg,         setTreeLinkMsg]         = useState(null)
  const [selectedLinkFather,  setSelectedLinkFather]  = useState(null)
  const [selectedLinkGrandfa, setSelectedLinkGrandfa] = useState(null)
  const [selectedLinkSon,     setSelectedLinkSon]     = useState(null)
  const [selectedLinkSelf,    setSelectedLinkSelf]    = useState(null)
  const [linkFatherName,      setLinkFatherName]      = useState('')
  const [treeData,            setTreeData]            = useState(null)
  const [treeLoading,         setTreeLoading]         = useState(false)
  const [familyAncestors,     setFamilyAncestors]     = useState(null)
  const [memberTreeNode,      setMemberTreeNode]      = useState(null)

  const setPw = (field) => (e) => setPasswordData(p => ({ ...p, [field]: e.target.value }))
  const API   = import.meta.env.VITE_API_URL
  const post  = (body) => fetch(API, { method: 'POST', body: JSON.stringify(body) }).then(r => r.json())

  /* جلب الشجرة للشجرة المصغرة */
  useEffect(() => {
    if (!API || treeData) return
    post({ action: 'getFamilyTree' })
      .then(d => {
        if (d.success && d.tree?.length > 0) {
          setTreeData({ id: 'root', name: 'الشجرة', generationLevel: 0, children: d.tree })
        }
      })
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
    function buildAncestorPath(node, root) {
      const path = [{ name: node.name || node.id, id: node.id, generation: node.generation }]
      let current = node
      while (current.parentId) {
        const parent = findById(root, current.parentId)
        if (!parent) break
        path.unshift({ name: parent.name || parent.id, id: parent.id, generation: parent.generation })
        current = parent
      }
      return path
    }
    // تطبيع الحروف العربية (أ/إ/آ → ا، ة → ه، ى → ي)
    function normAr(s) {
      return (s || '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').trim()
    }

    // Primary: search by memberId
    let memberNode = findByMemberId(treeData)

    // Fallback: match by firstName + fatherName + grandfatherName (3-level to avoid false matches)
    if (!memberNode && memberData?.firstName) {
      const fn = normAr(memberData.firstName)
      const pn = normAr(memberData.fatherName || '')
      const gn = normAr(memberData.grandfatherName || '')
      function findByName(node, parent, grandparent) {
        const nodeFn = normAr((node.name || '').split(' ')[0])
        if (nodeFn === fn) {
          const parentFn  = normAr((parent?.name      || '').split(' ')[0])
          const gpFn      = normAr((grandparent?.name || '').split(' ')[0])
          const parentOk  = !pn || parentFn === pn
          const gpOk      = !gn || gpFn === gn
          if (parentOk && gpOk) return node
        }
        for (const c of (node.children || [])) { const r = findByName(c, node, parent); if (r) return r }
        return null
      }
      memberNode = findByName(treeData, null, null)
    }

    if (!memberNode) {
      setFamilyAncestors(null)
      setMemberTreeNode(null)
      return
    }
    const ancestorPath = buildAncestorPath(memberNode, treeData)
    const fatherNode = memberNode.parentId ? findById(treeData, memberNode.parentId) : null
    const grandfatherNode = fatherNode?.parentId ? findById(treeData, fatherNode.parentId) : null
    setFamilyAncestors({
      fatherName:      fatherNode?.name || memberNode.parentName || null,
      grandfatherName: grandfatherNode?.name || fatherNode?.parentName || null,
      path:            memberNode.path       || ancestorPath.map(n => n.name).join(' ← '),
      generation:      memberNode.generation || memberNode.generationLevel || null,
      ancestorPath:    ancestorPath,
    })
    setMemberTreeNode(memberNode)
  }, [treeData, memberData])

  /* جلب الشجرة عند فتح لوحة الربط */
  useEffect(() => {
    if (!showTreeLink || treeData || !API) return
    setTreeLoading(true)
    post({ action: 'getFamilyTree' })
      .then(d => {
        if (d.success && d.tree?.length > 0) {
          setTreeData({ id: 'root', name: 'الشجرة', generationLevel: 0, children: d.tree })
        }
      })
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
          if (data.treeRequestStatus) setTreeRequestStatus(data.treeRequestStatus)
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
        'رقم الجوال':        phoneCountry + draft.phone,
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
    if (!idDraft.fatherName.trim()) return alert('اسم الأب مطلوب')
    if (!idDraft.grandfatherName.trim()) return alert('اسم الجد مطلوب')
    try {
      setIdLoading(true)
      const result = await post({
        action: 'updateMemberInfo',
        memberId: savedUser.memberId,
        'رقم الهوية': idDraft.nationalId,
        'الفخذ':      idDraft.branch,
        'اسم الأب':   idDraft.fatherName.trim(),
        'اسم الجد':   idDraft.grandfatherName.trim(),
      })
      if (result.success) {
        setMemberData(p => ({ ...p, nationalId: idDraft.nationalId, branch: idDraft.branch, fatherName: idDraft.fatherName.trim(), grandfatherName: idDraft.grandfatherName.trim() }))
        setEditId(false)
      } else { alert(result.message) }
    } catch { alert('حدث خطأ') }
    finally { setIdLoading(false) }
  }

  /* ── تعديل بيانات الميلاد ── */
  const handleUpdateBirth = async () => {
    try {
      setBirthLoading(true)
      const result = await post({
        action: 'updateMemberInfo',
        memberId: savedUser.memberId,
        'تاريخ الميلاد': birthDraft.birthDate,
        'الحالة الاجتماعية': birthDraft.maritalStatus,
      })
      if (result.success) {
        setMemberData(p => ({ ...p, birthDate: birthDraft.birthDate, maritalStatus: birthDraft.maritalStatus }))
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
    if (!newChild.birthDate) return alert('تاريخ الميلاد مطلوب')
    if (!newChild.nationalId.trim()) return alert('رقم الهوية مطلوب')
    if (!familyAncestors?.path) return alert('يجب أن تكون مرتبطاً في الشجرة أولاً حتى يُضاف الابن في التسلسل العائلي')
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

  /* ── handler اختيار "هذا أنا" في طلب ربط الشجرة ── */
  const handleLinkSelectSelf = (node) => {
    setSelectedLinkSelf(node)
    setSelectedLinkFather(null); setSelectedLinkGrandfa(null); setSelectedLinkSon(null); setLinkFatherName('')
  }

  /* ── إرسال طلب ربط الشجرة ── */
  const handleSubmitTreeLink = async () => {
    if (!isProfileCompleteForTree) {
      setTreeLinkMsg({ success: false, text: 'أكمل بياناتك أولاً قبل إرسال طلب الربط بالشجرة.' })
      return
    }
    const hasFather      = Boolean(selectedLinkFather)
    const hasGrandfather = Boolean(selectedLinkGrandfa && linkFatherName.trim())
    const hasSon         = Boolean(selectedLinkSon)
    const hasSelf        = Boolean(selectedLinkSelf)
    if (!hasFather && !hasGrandfather && !hasSon && !hasSelf) return

    // Check if grandfather's children already contain the typed father name
    const grandfatherChildMatch = hasGrandfather
      ? (selectedLinkGrandfa.children || []).find(c => (c.name || '').split(' ')[0].trim() === linkFatherName.trim())
      : null

    try {
      setTreeLinkLoading(true)
      setTreeLinkMsg(null)
      const payload = hasSelf
        ? {
            action: 'submitTreeRequest', memberId: savedUser.memberId,
            parentId:        selectedLinkSelf.id,
            parentName:      (selectedLinkSelf.parentName || selectedLinkSelf.name || '').split(' ')[0],
            generationLevel: selectedLinkSelf.generationLevel || 1,
            path:            selectedLinkSelf.computedPath || selectedLinkSelf.path || '',
            note:            `[SELF:${selectedLinkSelf.id}]`,
          }
        : hasSon
        ? {
            action: 'submitTreeRequest', memberId: savedUser.memberId,
            parentId:        selectedLinkSon.parentId || '',
            parentName:      selectedLinkSon.parentName || '',
            generationLevel: (selectedLinkSon.generationLevel || 1) - 1,
            path:            (selectedLinkSon.computedPath || selectedLinkSon.path || '').split(' ← ').slice(0, -1).join(' ← '),
            note:            `[SON:${selectedLinkSon.id}]`,
          }
        : hasFather
        ? {
            action: 'submitTreeRequest', memberId: savedUser.memberId,
            parentId:        selectedLinkFather.id,
            parentName:      selectedLinkFather.name,
            generationLevel: (selectedLinkFather.generationLevel || 0) + 1,
            path:            selectedLinkFather.computedPath || selectedLinkFather.path || '',
            note: '',
          }
        : grandfatherChildMatch
        ? {
            action: 'submitTreeRequest', memberId: savedUser.memberId,
            parentId:        grandfatherChildMatch.id,
            parentName:      grandfatherChildMatch.name,
            generationLevel: (grandfatherChildMatch.generationLevel || 0) + 1,
            path:            selectedLinkGrandfa.computedPath || selectedLinkGrandfa.path || '',
            note: '',
          }
        : {
            action: 'submitTreeRequest', memberId: savedUser.memberId,
            parentId:        'NOTFOUND',
            parentName:      linkFatherName.trim(),
            generationLevel: (selectedLinkGrandfa.generationLevel || 0) + 2,
            path:            selectedLinkGrandfa.computedPath || selectedLinkGrandfa.path || '',
            note: `والدي "${linkFatherName.trim()}" غير موجود في الشجرة — جده ${selectedLinkGrandfa.name} [${selectedLinkGrandfa.id}]`,
          }
      const result = await post(payload)
      setTreeLinkMsg({ success: result.success, text: result.message || (result.success ? 'تم إرسال الطلب بنجاح، في انتظار موافقة المدير' : 'حدث خطأ') })
      if (result.success) {
        setSelectedLinkFather(null); setSelectedLinkGrandfa(null); setSelectedLinkSon(null); setSelectedLinkSelf(null); setLinkFatherName(''); setShowTreeLink(false)
      }
    } catch {
      setTreeLinkMsg({ success: false, text: 'تعذّر الاتصال بالخادم' })
    } finally {
      setTreeLinkLoading(false)
    }
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
  const incompleteChildren = (m.children || []).filter(c => !c.nationalId || !c.birthDate)
  const visibleWives  = (m.wives    || []).filter(w => w.status !== 'منفصلة' || totalChildren > 0)
  const maritalStatus = m.maritalStatus || '—'
  const isProfileCompleteForTree = Boolean(
    m.firstName && m.phone && m.nationalId && m.birthDate && m.job && m.maritalStatus && m.fatherName && m.grandfatherName
  )

  const memberHasTreePath = Boolean(familyAncestors?.path && memberTreeNode)
  const canOpenTreeLink = Boolean(memberHasTreePath || isProfileCompleteForTree)
  const canAddChild = Boolean(newChild.name.trim() && newChild.birthDate && newChild.nationalId.trim() && familyAncestors?.path)
  const childTreeWarning = !familyAncestors?.path

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
            <p className="font-nav text-xs mt-1" style={{ color: 'rgba(255,255,255,0.80)' }}>
              قام <span style={{ color: 'rgba(255,255,255,0.75)' }}>{preLinked.fatherName}</span> بتسجيلك مسبقاً ضمن أبنائه في الشجرة — موقعك في الشجرة محجوز باسمك.
            </p>
          </div>
          <button onClick={() => setPreLinked(null)}
            className="font-nav text-xs mt-0.5 flex-shrink-0"
            style={{ color: 'rgba(255,255,255,0.58)' }}>✕</button>
        </div>
      )}

      {/* تنبيه: أبناء ببيانات ناقصة */}
      {!dataLoading && incompleteChildren.length > 0 && (
        <div className="rounded-[20px] px-5 py-4"
          style={{ background: 'rgba(234,179,8,0.07)', border: '1px solid rgba(234,179,8,0.28)' }}>
          <p className="font-nav text-sm font-semibold mb-2" style={{ color: '#fbbf24' }}>
            ⚠ يوجد {incompleteChildren.length === 1 ? 'ابن' : `${incompleteChildren.length} أبناء`} ببيانات ناقصة
          </p>
          <ul className="font-nav text-xs space-y-1 mb-3" style={{ color: 'rgba(253,211,77,0.75)' }}>
            {incompleteChildren.map(c => (
              <li key={c.id || c.name}>
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>{c.name}</span>
                {' — '}
                {!c.nationalId && !c.birthDate ? 'رقم الهوية وتاريخ الميلاد مفقودان'
                  : !c.nationalId ? 'رقم الهوية مفقود'
                  : 'تاريخ الميلاد مفقود'}
              </li>
            ))}
          </ul>
          <p className="font-nav text-xs" style={{ color: 'rgba(253,211,77,0.55)' }}>
            يرجى تحديث بيانات أبنائك من قسم «الأبناء» أدناه
          </p>
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
            onClick={() => { setEditId(e => !e); setIdDraft({ nationalId: m.nationalId || '', branch: m.branch || '', fatherName: m.fatherName || '', grandfatherName: m.grandfatherName || '' }) }}
            className="font-nav text-xs px-3 py-1.5 rounded-xl transition-all duration-200"
            style={{ border: `1px solid ${editId ? T.blue.border : 'rgba(255,255,255,0.1)'}`, color: editId ? T.blue.accent : 'rgba(255,255,255,0.72)', background: editId ? T.blue.soft : 'transparent' }}>
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
              {familyAncestors?.generation && (
                <InfoRow label="الجيل في الشجرة" value={`الجيل ${familyAncestors.generation}`} accent={T.blue.accent} />
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="font-nav text-xs text-gray-500 mb-1.5 block">اسم الأب</label>
                <input type="text" value={idDraft.fatherName}
                  onChange={e => setIdDraft(p => ({ ...p, fatherName: e.target.value }))}
                  className="form-input" placeholder="اسم الأب" />
              </div>
              <div>
                <label className="font-nav text-xs text-gray-500 mb-1.5 block">اسم الجد</label>
                <input type="text" value={idDraft.grandfatherName}
                  onChange={e => setIdDraft(p => ({ ...p, grandfatherName: e.target.value }))}
                  className="form-input" placeholder="اسم الجد" />
              </div>
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
            onClick={() => { setEditBirth(e => !e); setBirthDraft({ birthDate: m.birthDate || '', maritalStatus: m.maritalStatus || '' }) }}
            className="font-nav text-xs px-3 py-1.5 rounded-xl transition-all duration-200"
            style={{ border: `1px solid ${editBirth ? T.purple.border : 'rgba(255,255,255,0.1)'}`, color: editBirth ? T.purple.accent : 'rgba(255,255,255,0.72)', background: editBirth ? T.purple.soft : 'transparent' }}>
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
                  onChange={e => setBirthDraft(p => ({ ...p, birthDate: e.target.value }))}
                  className="form-input" />
              </div>
              <div>
                <label className="font-nav text-xs text-gray-500 mb-1.5 block">الحالة الاجتماعية</label>
                <select value={birthDraft.maritalStatus}
                  onChange={e => setBirthDraft(p => ({ ...p, maritalStatus: e.target.value }))}
                  className="form-input">
                  <option value="">— اختر —</option>
                  {MARITAL_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
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
            style={{ border: `1px solid ${editContact ? T.teal.border : 'rgba(255,255,255,0.1)'}`, color: editContact ? T.teal.accent : 'rgba(255,255,255,0.72)', background: editContact ? T.teal.soft : 'transparent' }}>
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
                { key: 'email',     label: 'البريد الإلكتروني', type: 'email' },
                { key: 'city',      label: 'المدينة',           type: 'text'  },
              ].map(({ key, label, type }) => (
                <div key={key}>
                  <label className="font-nav text-xs text-gray-500 mb-1.5 block">{label}</label>
                  <input type={type} value={draft[key]} onChange={e => setDraft(p => ({ ...p, [key]: e.target.value }))} className="form-input" />
                </div>
              ))}
              <div>
                <label className="font-nav text-xs text-gray-500 mb-1.5 block">رقم الجوال</label>
                <PhoneInput
                  value={draft.phone}
                  onChange={val => setDraft(p => ({ ...p, phone: val }))}
                  countryCode={phoneCountry}
                  onCountryChange={setPhoneCountry}
                />
              </div>
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
            style={{ border: `1px solid ${showAddChild ? T.emerald.border : 'rgba(255,255,255,0.1)'}`, color: showAddChild ? T.emerald.accent : 'rgba(255,255,255,0.72)', background: showAddChild ? T.emerald.soft : 'transparent' }}>
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
                          style={{ background: childDraft.alive ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${childDraft.alive ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`, color: childDraft.alive ? '#34d399' : 'rgba(255,255,255,0.62)' }}>
                          حي
                        </button>
                        <button type="button" onClick={() => setChildDraft(p => ({ ...p, alive: false }))}
                          className="flex-1 font-nav text-xs py-2 rounded-xl transition-all"
                          style={{ background: !childDraft.alive ? 'rgba(156,163,175,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${!childDraft.alive ? 'rgba(156,163,175,0.3)' : 'rgba(255,255,255,0.08)'}`, color: !childDraft.alive ? '#9ca3af' : 'rgba(255,255,255,0.62)' }}>
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
                  placeholder="رقم الهوية"
                  value={newChild.nationalId}
                  onChange={e => setNewChild(p => ({ ...p, nationalId: normalizeDigits(e.target.value) }))}
                  className="form-input" />
                <div>
                  <label className="font-nav text-xs text-gray-500 mb-1.5 block">الحالة الصحية</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setNewChild(p => ({ ...p, alive: true }))}
                      className="flex-1 font-nav text-xs py-2 rounded-xl transition-all"
                      style={{ background: newChild.alive ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${newChild.alive ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`, color: newChild.alive ? '#34d399' : 'rgba(255,255,255,0.62)' }}>
                      حي
                    </button>
                    <button type="button" onClick={() => setNewChild(p => ({ ...p, alive: false }))}
                      className="flex-1 font-nav text-xs py-2 rounded-xl transition-all"
                      style={{ background: !newChild.alive ? 'rgba(156,163,175,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${!newChild.alive ? 'rgba(156,163,175,0.3)' : 'rgba(255,255,255,0.08)'}`, color: !newChild.alive ? '#9ca3af' : 'rgba(255,255,255,0.62)' }}>
                      متوفى
                    </button>
                  </div>
                </div>
                {childTreeWarning && (
                  <p className="font-nav text-xs text-yellow-200 mb-2" style={{ color: 'rgba(245,158,11,0.9)' }}>
                    يجب أن تكون مرتبطاً بالشجرة أولاً حتى يتم ضم الابن إلى التسلسل الشجري مع أبيه.
                  </p>
                )}
                <button onClick={handleAddChild} disabled={childLoading || !newChild.name.trim() || !newChild.birthDate || !newChild.nationalId.trim() || !familyAncestors?.path}
                  className="w-full font-nav text-sm py-2.5 rounded-2xl font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: T.emerald.soft, border: `1px solid ${T.emerald.border}`, color: T.emerald.accent }}>
                  {childLoading ? 'جاري الإضافة...' : 'إضافة ابن'}
                </button>
              </SlidePanel>
            </>
          )}
        </Card>
      </div>

      {/* الشجرة المصغرة — تظهر دائماً */}
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

          {memberTreeNode ? (
            <>
              <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="font-nav text-[11px] text-gray-300">مسارك في الشجرة الرئيسية:</p>
                <p className="mt-2 font-nav text-sm text-white" style={{ wordBreak: 'break-word' }}>
                  {familyAncestors?.path || 'غير متوفر'}
                </p>
                {familyAncestors?.generation ? (
                  <p className="font-nav text-[11px] text-gray-400 mt-2">الجيل {familyAncestors.generation}</p>
                ) : null}
              </div>
              {memberTreeNode?.children?.filter(c => !c.isWife).length > 0 && (
                <div className="rounded-2xl p-4 mt-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="font-nav text-[11px] text-gray-300">أبناؤك المسجلون في الشجرة:</p>
                  <p className="mt-2 font-nav text-sm text-white" style={{ wordBreak: 'break-word' }}>
                    {memberTreeNode.children.filter(c => !c.isWife).map(c => c.name).join(' ، ')}
                  </p>
                </div>
              )}
              <div className="flex justify-center mt-3">
                <a href={`${import.meta.env.BASE_URL}family-tree`}
                  className="font-nav text-xs transition-colors duration-200"
                  style={{ color: 'var(--gold-main)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--gold-main)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(198,161,107,0.55)'}>
                  عرض موقعي في الشجرة الكاملة ←
                </a>
              </div>
            </>
          ) : (
            <div className="rounded-2xl p-5 text-center space-y-2"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <p className="font-nav text-sm" style={{ color: 'rgba(255,255,255,0.80)' }}>لم تُضف إلى الشجرة العائلية بعد</p>
              {treeRequestStatus?.status === 'معلق' && (
                <p className="font-nav text-xs" style={{ color: 'rgba(245,158,11,0.8)' }}>طلبك قيد المراجعة من المدير</p>
              )}
              {treeRequestStatus?.status === 'مرفوض' && (
                <div className="rounded-xl p-3 mt-2 text-right"
                  style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <p className="font-nav text-xs font-semibold" style={{ color: '#f87171' }}>تم رفض طلب الربط بالشجرة</p>
                  {treeRequestStatus.reason && (
                    <p className="font-nav text-xs mt-1" style={{ color: 'rgba(248,113,113,0.75)' }}>{treeRequestStatus.reason}</p>
                  )}
                </div>
              )}
            </div>
          )}
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
          {memberHasTreePath ? (
            <button onClick={() => { setShowAddChild(v => !v); setEditingChildId(null) }}
              className="font-nav text-xs px-3 py-1.5 rounded-xl transition-all duration-200"
              style={{ border: `1px solid ${T.emerald.border}`, color: T.emerald.accent, background: T.emerald.soft }}>
              + إضافة أبناء
            </button>
          ) : (
            <button onClick={() => { setShowTreeLink(v => !v); setTreeLinkMsg(null) }}
              disabled={!canOpenTreeLink}
              className="font-nav text-xs px-3 py-1.5 rounded-xl transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40"
              style={{ border: `1px solid ${showTreeLink ? T.emerald.border : 'rgba(255,255,255,0.1)'}`, color: showTreeLink ? T.emerald.accent : 'rgba(255,255,255,0.72)', background: showTreeLink ? T.emerald.soft : 'transparent' }}>
              {showTreeLink ? 'إلغاء' : (canOpenTreeLink ? 'ربط بالشجرة' : (preLinked ? 'أضف أبناءك أولاً' : 'أكمل بياناتك أولاً'))}
            </button>
          )}
        </div>

        {!canOpenTreeLink && (
          <p className="font-nav text-xs text-yellow-200 mt-3" style={{ color: 'rgba(245,158,11,0.9)' }}>
            يجب إكمال الاسم، رقم الجوال، رقم الهوية، تاريخ الميلاد، المهنة، الحالة الاجتماعية، اسم الأب واسم الجد قبل طلب الربط.
          </p>
        )}

        {treeLinkMsg && (
          <div className="mt-4 px-4 py-3 rounded-2xl font-nav text-sm"
            style={{ background: treeLinkMsg.success ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: treeLinkMsg.success ? '1px solid rgba(16,185,129,0.22)' : '1px solid rgba(239,68,68,0.22)', color: treeLinkMsg.success ? T.emerald.accent : '#f87171' }}>
            {treeLinkMsg.text}
          </div>
        )}

        <SlidePanel open={showTreeLink}>
          <p className="font-nav text-xs leading-5 pb-1" style={{ color: 'rgba(255,255,255,0.72)' }}>
            إذا كان اسمك مضافاً مسبقاً في الشجرة اضغط <span style={{ color: '#2dd4bf' }}>هذا أنا</span>.
            وإلا ابحث عن والدك واضغط <span style={{ color: 'var(--gold-main)' }}>هذا والدي</span>.
            إذا لم يكن والدك موجوداً، اختر جدك واضغط <span style={{ color: '#fb923c' }}>هذا جدي</span> ثم اكتب اسم والدك.
          </p>

          {treeLoading ? (
            <p className="font-nav text-xs text-center py-4" style={{ color: 'rgba(255,255,255,0.70)' }}>جاري تحميل الشجرة...</p>
          ) : (
            <TreeNavigator
              treeData={treeData}
              onSelect={() => {}}
              selected={null}
              onSelectFather={node => { setSelectedLinkFather(node); setSelectedLinkGrandfa(null); setSelectedLinkSon(null); setLinkFatherName('') }}
              selectedFatherId={selectedLinkFather?.id}
              onSelectGrandfather={node => { setSelectedLinkGrandfa(node); setSelectedLinkFather(null); setSelectedLinkSon(null) }}
              selectedGrandfatherId={selectedLinkGrandfa?.id}
              onSelectSelf={handleLinkSelectSelf}
              selectedSelfId={selectedLinkSelf?.id}
              onSelectSon={node => { setSelectedLinkSon(node); setSelectedLinkFather(null); setSelectedLinkGrandfa(null); setSelectedLinkSelf(null); setLinkFatherName('') }}
              selectedSonId={selectedLinkSon?.id}
            />
          )}

          {/* موقعي في الشجرة — هذا أنا */}
          {selectedLinkSelf && (
            <div className="rounded-2xl p-4" style={{ background: 'rgba(20,184,166,0.05)', border: '1px solid rgba(20,184,166,0.22)' }}>
              <p className="font-nav text-xs" style={{ color: 'rgba(255,255,255,0.72)' }}>موقعك في الشجرة:</p>
              <p className="font-nav text-sm font-semibold mt-1" style={{ color: '#2dd4bf' }}>{selectedLinkSelf.name}</p>
              <p className="font-nav text-xs mt-1" style={{ color: 'rgba(255,255,255,0.72)' }}>
                الجيل: <span style={{ color: '#2dd4bf' }}>{selectedLinkSelf.generationLevel}</span>
                {selectedLinkSelf.parentName && <> &nbsp;|&nbsp; الوالد: <span style={{ color: '#2dd4bf' }}>{selectedLinkSelf.parentName}</span></>}
              </p>
              <p className="font-nav text-xs mt-2" style={{ color: '#34d399' }}>
                ✓ موجود في الشجرة — سيتم الربط بحسابك عند الموافقة
              </p>
            </div>
          )}

          {/* ابني في الشجرة */}
          {selectedLinkSon && (
            <div className="rounded-2xl p-4" style={{ background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.22)' }}>
              <p className="font-nav text-xs" style={{ color: 'rgba(255,255,255,0.72)' }}>ابنك المختار من الشجرة:</p>
              <p className="font-nav text-sm font-semibold mt-1" style={{ color: '#a78bfa' }}>{selectedLinkSon.name}</p>
              <p className="font-nav text-xs mt-1" style={{ color: 'rgba(255,255,255,0.72)' }}>
                جيله: <span style={{ color: '#a78bfa' }}>{selectedLinkSon.generationLevel}</span>
                &nbsp;— جيلك: <span style={{ color: '#a78bfa' }}>{(selectedLinkSon.generationLevel || 1) - 1}</span>
              </p>
              <p className="font-nav text-xs mt-2" style={{ color: '#34d399' }}>
                ✓ ستُضاف كوالد لهذه العقدة في الشجرة
              </p>
            </div>
          )}

          {/* عرض الوالد المختار */}
          {selectedLinkFather && (
            <div className="rounded-2xl p-4" style={{ background: 'rgba(198,161,107,0.05)', border: '1px solid rgba(198,161,107,0.2)' }}>
              <p className="font-nav text-xs" style={{ color: 'rgba(255,255,255,0.72)' }}>الوالد المختار:</p>
              <p className="font-nav text-sm font-semibold mt-1" style={{ color: 'var(--gold-main)' }}>{selectedLinkFather.name}</p>
            </div>
          )}

          {/* وضع الجد — والد غير موجود */}
          {selectedLinkGrandfa && (
            <div className="space-y-2">
              <div className="rounded-2xl p-4" style={{ background: 'rgba(251,146,60,0.05)', border: '1px solid rgba(251,146,60,0.2)' }}>
                <p className="font-nav text-xs" style={{ color: 'rgba(255,255,255,0.72)' }}>الجد المختار:</p>
                <p className="font-nav text-sm font-semibold mt-1" style={{ color: '#fb923c' }}>{selectedLinkGrandfa.name}</p>
                {(selectedLinkGrandfa.children || []).find(c => (c.name || '').split(' ')[0].trim() === linkFatherName.trim()) && (
                  <p className="font-nav text-xs mt-2" style={{ color: '#34d399' }}>
                    ✓ تم العثور على اسم والدك في أبناء هذا الجد — سيُربط تلقائياً
                  </p>
                )}
              </div>
              <div>
                <p className="font-nav text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.72)' }}>اسم والدك (غير الموجود في الشجرة) *</p>
                <input type="text" value={linkFatherName} onChange={e => setLinkFatherName(e.target.value)}
                  placeholder="اسم الأب الكامل" className="form-input" />
              </div>
            </div>
          )}

          <button
            onClick={handleSubmitTreeLink}
            disabled={treeLinkLoading || (!selectedLinkFather && !selectedLinkSon && !selectedLinkSelf && !(selectedLinkGrandfa && linkFatherName.trim()))}
            className="w-full font-nav text-sm py-3 rounded-2xl font-bold transition-all duration-200 disabled:opacity-50"
            style={{ background: T.emerald.soft, border: `1px solid ${T.emerald.border}`, color: T.emerald.accent }}>
            {treeLinkLoading ? 'جاري الإرسال...' : 'إرسال الطلب للمدير'}
          </button>
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
            style={{ border: `1px solid ${showChangePw ? T.gold.border : 'rgba(255,255,255,0.1)'}`, color: showChangePw ? 'var(--gold-main)' : 'rgba(255,255,255,0.72)', background: showChangePw ? T.gold.soft : 'transparent' }}>
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
