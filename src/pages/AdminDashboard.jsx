import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PasswordInput from '../components/PasswordInput'
import TreeNavigator from '../components/TreeNavigator'
import { normalizeDigits } from '../utils/normalizeInput'
import PhoneInput from '../components/PhoneInput'

/* تحويل شجرة هرمية إلى مصفوفة مسطحة تشمل عقد الأعضاء وسجلات الأبناء الذكور */
function buildFlatTree(roots) {
  const flat = []
  function walk(n, pId, pGen) {
    if (n.isWife) return
    if (!n.isChildRecord) {
      const g = n.generation || 1
      flat.push({ id: n.id, name: n.name, parentId: pId || n.parentId || '', gen: g })
      ;(n.children || []).forEach(c => walk(c, n.id, g))
    } else if (!n.isDaughter && n.childRecordId) {
      flat.push({
        id: 'child_' + n.childRecordId,
        childRecordId: n.childRecordId,
        name: n.name,
        parentId: pId,
        gen: (pGen || 1) + 1,
        isChildRecord: true,
      })
    }
  }
  roots.forEach(r => walk(r, '', 0))
  return flat
}

/* ═══════════ مؤشر لون الاستهلاك ═══════════ */
function usageTheme(pct) {
  if (pct >= 90) return { bar: '#ef4444', glow: 'rgba(239,68,68,0.4)',  bg: 'rgba(239,68,68,0.1)',  text: '#ef4444', label: 'حرج'   }
  if (pct >= 75) return { bar: '#f97316', glow: 'rgba(249,115,22,0.4)', bg: 'rgba(249,115,22,0.1)', text: '#f97316', label: 'مرتفع' }
  if (pct >= 55) return { bar: '#eab308', glow: 'rgba(234,179,8,0.4)',  bg: 'rgba(234,179,8,0.1)',  text: '#eab308', label: 'متوسط' }
  return           { bar: '#22c55e', glow: 'rgba(34,197,94,0.4)',  bg: 'rgba(34,197,94,0.1)',  text: '#22c55e', label: 'طبيعي' }
}

export default function AdminDashboard() {
  const user     = JSON.parse(localStorage.getItem('user'))
  const navigate = useNavigate()

  /* ── بوابة الرمز — phase: 'locked' | 'verifying' | 'success' | 'open' ── */
  const [phase,    setPhase]    = useState(() => sessionStorage.getItem('adminUnlocked') === '1' ? 'open' : 'locked')
  const [pin,      setPin]      = useState('')
  const [pinError, setPinError] = useState('')

  const handleVerifyPin = async () => {
    if (!pin.trim()) { setPinError('أدخل رمز الدخول'); return }
    try {
      setPhase('verifying')
      setPinError('')
      const res = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'verifyAdminPin', memberId: user.memberId, pin }),
      })
      const result = await res.json()
      if (result.success) {
        sessionStorage.setItem('adminUnlocked', '1')
        setPhase('success')
        setTimeout(() => setPhase('open'), 800)
      } else {
        setPinError(result.message || 'الرمز غير صحيح')
        setPin('')
        setPhase('locked')
      }
    } catch {
      setPinError('حدث خطأ أثناء التحقق')
      setPhase('locked')
    }
  }

  const [stats,          setStats]          = useState(null)
  const [statsLoading,   setStatsLoading]   = useState(true)
  const [animated,       setAnimated]       = useState(0)
  const [treeStats,      setTreeStats]      = useState(null)
  const [treeStatsLoading, setTreeStatsLoading] = useState(true)

  const [showPw,  setShowPw]  = useState(false)
  const [pwData,  setPwData]  = useState({ current: '', next: '', confirm: '' })
  const [pwLoading,setPwLoading] = useState(false)

  const [regRequests,        setRegRequests]        = useState([])
  const [regRequestsLoading, setRegRequestsLoading] = useState(true)
  const [regActionLoading,   setRegActionLoading]   = useState(null)
  const [regResult,          setRegResult]          = useState(null)
  const [editingReqId,       setEditingReqId]       = useState(null)
  const [editFields,         setEditFields]         = useState({})
  const [editLoading,        setEditLoading]        = useState(false)
  const [editCascade,        setEditCascade]        = useState([])
  const [editTreeBranch,     setEditTreeBranch]     = useState('')
  const [editTreeLoading,    setEditTreeLoading]    = useState(false)
  const [rejectingReqId,     setRejectingReqId]     = useState(null)
  const [rejectReason,       setRejectReason]       = useState('')

  const [treeRequests,        setTreeRequests]        = useState([])
  const [notFoundPanel,       setNotFoundPanel]       = useState(null)   // requestId الذي فُتح لوحة الموقع
  const [adminAncestor,       setAdminAncestor]       = useState(null)   // العقدة التي اختارها المدير
  const [adminTreeData,       setAdminTreeData]       = useState(null)
  const [adminTreeLoading,    setAdminTreeLoading]    = useState(false)
  const [amPhoneCountry,      setAmPhoneCountry]      = useState('+966')
  const [editReqPhoneCountry, setEditReqPhoneCountry] = useState('+966')

  const AM_INITIAL = {
    nationalId:'', firstName:'', phone:'',
    branch:'', parentNodeId:'', parentName:'',
    tempPassword:'', maritalStatus:'',
    job:'', jobOther:'', city:'',
    role:'عضو', aliveStatus:'حي',
  }
  const JOBS_LIST    = ['موظف', 'طالب', 'متقاعد', 'رجل أعمال', 'أخرى']
  const ROLES_LIST   = ['عضو', 'مدير صندوق', 'مدير']
  const MARITAL_LIST = ['أعزب', 'متزوج', 'مطلق', 'أرمل']
  const [amData,     setAmData]     = useState(AM_INITIAL)
  const [amLoading,  setAmLoading]  = useState(false)
  const [amResult,   setAmResult]   = useState(null)
  const [amFlatTree, setAmFlatTree] = useState([])
  const [amCascade,  setAmCascade]  = useState([])
  const [treeRequestsLoading, setTreeRequestsLoading] = useState(true)
  const [treeActionLoading,   setTreeActionLoading]   = useState(null)
  const [treeRejectingId,     setTreeRejectingId]     = useState(null)
  const [treeRejectReason,    setTreeRejectReason]    = useState('')
  const [expandedRegId,       setExpandedRegId]       = useState(null)
  const [expandedTreeId,      setExpandedTreeId]      = useState(null)
  const [raName,    setRaName]    = useState('')
  const [raAlive,   setRaAlive]   = useState('متوفى')
  const [raLoading, setRaLoading] = useState(false)
  const [raResult,  setRaResult]  = useState(null)
  const [iaaTargetId,   setIaaTargetId]   = useState('')
  const [iaaName,       setIaaName]       = useState('')
  const [iaaAlive,      setIaaAlive]      = useState('متوفى')
  const [iaaLoading,    setIaaLoading]    = useState(false)
  const [iaaResult,     setIaaResult]     = useState(null)

  const [openSec, setOpenSec] = useState({ regReq: true, treeReq: true, addMember: true, insertAncestor: false, addRootAncestor: false })
  const toggleSec = k => setOpenSec(p => ({ ...p, [k]: !p[k] }))

  /* جلب إحصائيات المنصة */
  useEffect(() => {
    const load = async () => {
      try {
        const res  = await fetch(import.meta.env.VITE_API_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'getAdminStats' }),
        })
        const data = await res.json()
        if (data.success) setStats({ ...data.stats, charts: data.charts })
      } catch (e) { console.error(e) }
      finally    { setStatsLoading(false) }
    }
    load()
  }, [])

  /* جلب إحصائيات الشجرة */
  useEffect(() => {
    const load = async () => {
      try {
        const res  = await fetch(import.meta.env.VITE_API_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'getTreeStats' }),
        })
        const data = await res.json()
        if (data.success) setTreeStats(data)
      } catch (e) { console.error(e) }
      finally { setTreeStatsLoading(false) }
    }
    load()
  }, [])

  /* تحريك شريط الاستهلاك بعد التحميل */
  useEffect(() => {
    if (statsLoading) return
    const id = setTimeout(() => setAnimated(stats?.scriptUsage ?? 0), 300)
    return () => clearTimeout(id)
  }, [statsLoading, stats?.scriptUsage])

  /* تحديث عداد المتواجدين كل دقيقة */
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res  = await fetch(import.meta.env.VITE_API_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'getOnlineUsers' }),
        })
        const data = await res.json()
        if (data.success)
          setStats(prev => ({ ...prev, onlineUsers: data.onlineUsers }))
      } catch { /* ignore network errors */ }
    }, 60_000)
    return () => clearInterval(id)
  }, [])

  /* جلب طلبات التسجيل — دالة للزر تضبط loading بنفسها */
  const fetchRegRequests = async () => {
    setRegRequestsLoading(true)
    setRegResult(null)
    try {
      const res  = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'getPendingRequests', status: 'معلق' }),
      })
      const data = await res.json()
      if (data.success) setRegRequests(data.requests || [])
    } catch (e) { console.error(e) }
    finally { setRegRequestsLoading(false) }
  }
  /* useEffect يُحمّل بدون setState sync — loading يبدأ true من الـ useState */
  useEffect(() => {
    const load = async () => {
      try {
        const res  = await fetch(import.meta.env.VITE_API_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'getPendingRequests', status: 'معلق' }),
        })
        const data = await res.json()
        if (data.success) setRegRequests(data.requests || [])
      } catch (e) { console.error(e) }
      finally { setRegRequestsLoading(false) }
    }
    load()
  }, [])

  const handleRegAction = async (requestId, action) => {
    try {
      setRegActionLoading(requestId + action)
      const res = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        body: JSON.stringify({ action, requestId }),
      })
      const result = await res.json()
      if (result.success) {
        setRegRequests(prev => prev.filter(r => r.requestId !== requestId))
        setRegResult({ success: true, message: result.message })
      } else {
        setRegResult({ success: false, message: result.message || 'حدث خطأ' })
      }
    } catch { setRegResult({ success: false, message: 'تعذّر الاتصال بالخادم' }) }
    finally { setRegActionLoading(null) }
  }

  /* تعديل بيانات طلب معلق قبل الموافقة */
  const handleStartEdit = async (req) => {
    setEditingReqId(req.requestId)
    const parentNodeId = req.parentNodeId || ''
    const branch       = req.branch       || ''
    setEditFields({
      'الاسم الأول':        req.name         || '',
      'اسم الأب':           req.fatherName   || '',
      'اسم الجد':           req.grandName    || '',
      'رقم الجوال':         req.phone        || '',
      'رقم الهوية':         req.nationalId   || '',
      'الفخذ':              branch,
      'الجيل':              req.generation   || '',
      'المهنة':             req.job          || '',
      'تاريخ الميلاد':      req.birthDate    || '',
      'المدينة':            req.city         || '',
      'البريد الإلكتروني':  req.email        || '',
      'رقم عقدة الأب':      parentNodeId,
      'ملاحظات':            req.notes        || '',
    })

    // تحميل الشجرة عند الحاجة (شبكة بطيئة أو جوال)
    let flatTree = amFlatTree
    if (!flatTree.length) {
      setEditTreeLoading(true)
      try {
        const res  = await fetch(import.meta.env.VITE_API_URL, {
          method: 'POST', body: JSON.stringify({ action: 'getFamilyTree' }),
        })
        const data = await res.json()
        if (data.success && data.tree?.length) {
          flatTree = buildFlatTree(data.tree)
          setAmFlatTree(flatTree)
        }
      } catch { /* ignore */ }
      setEditTreeLoading(false)
    }

    // تهيئة cascade الشجرة
    if (parentNodeId && flatTree.length) {
      const target = flatTree.find(n => n.id === parentNodeId)
      if (target) {
        const path = [target]
        let cur = target
        while (cur.parentId && cur.gen > 3) {
          const parent = flatTree.find(n => n.id === cur.parentId)
          if (!parent) break
          path.unshift(parent)
          cur = parent
        }
        const branchNode = path[0]
        setEditTreeBranch(branchNode?.name || branch)
        const cascade = []
        for (let i = 0; i < path.length - 1; i++) {
          const kids = flatTree.filter(n => n.parentId === path[i].id)
          cascade.push({ label: `أبناء ${path[i].name}`, options: kids, selectedId: path[i + 1].id })
        }
        const finalKids = flatTree.filter(n => n.parentId === target.id)
        if (finalKids.length) cascade.push({ label: `أبناء ${target.name}`, options: finalKids, selectedId: '' })
        setEditCascade(cascade)
        return
      }
    }
    // ابدأ من الفخذ فقط
    const bn = flatTree.find(n => n.name === branch && n.gen === 3 && !n.isChildRecord)
    setEditTreeBranch(branch)
    if (bn) {
      const kids = flatTree.filter(n => n.parentId === bn.id)
      setEditCascade(kids.length ? [{ label: `أبناء ${branch}`, options: kids, selectedId: '' }] : [])
    } else {
      setEditCascade([])
    }
  }
  const handleSaveEdit = async (requestId) => {
    try {
      setEditLoading(true)
      const res = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'updatePendingRequest', requestId, ...editFields, 'رقم الجوال': editReqPhoneCountry + (editFields['رقم الجوال'] || '') }),
      })
      const result = await res.json()
      if (result.success) {
        setRegRequests(prev => prev.map(r => r.requestId !== requestId ? r : {
          ...r,
          name:         editFields['الاسم الأول'],
          fatherName:   editFields['اسم الأب'],
          grandName:    editFields['اسم الجد'],
          phone:        editFields['رقم الجوال'],
          nationalId:   editFields['رقم الهوية'],
          branch:       editFields['الفخذ'],
          generation:   editFields['الجيل'],
          job:          editFields['المهنة'],
          birthDate:    editFields['تاريخ الميلاد'],
          city:         editFields['المدينة'],
          email:        editFields['البريد الإلكتروني'],
          parentNodeId: editFields['رقم عقدة الأب'],
          notes:        editFields['ملاحظات'],
        }))
        setEditingReqId(null)
        setEditFields({})
      } else {
        setRegResult({ success: false, message: result.message || 'حدث خطأ' })
      }
    } catch { setRegResult({ success: false, message: 'تعذّر الاتصال بالخادم' }) }
    finally { setEditLoading(false) }
  }

  /* رفض طلب مع إدخال سبب */
  const handleConfirmReject = async (requestId) => {
    try {
      setRegActionLoading(requestId + 'rejectRequest')
      const res = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'rejectRequest', requestId, notes: rejectReason }),
      })
      const result = await res.json()
      if (result.success) {
        setRegRequests(prev => prev.filter(r => r.requestId !== requestId))
        setRegResult({ success: true, message: result.message })
        setRejectingReqId(null)
        setRejectReason('')
      } else {
        setRegResult({ success: false, message: result.message || 'حدث خطأ' })
      }
    } catch { setRegResult({ success: false, message: 'تعذّر الاتصال بالخادم' }) }
    finally { setRegActionLoading(null) }
  }

  /* تحميل عقد الشجرة للاستخدام في اختيار الأب عند إضافة عضو */
  useEffect(() => {
    const load = async () => {
      try {
        const res  = await fetch(import.meta.env.VITE_API_URL, {
          method: 'POST', body: JSON.stringify({ action: 'getFamilyTree' }),
        })
        const data = await res.json()
        if (data.success && data.tree?.length) setAmFlatTree(buildFlatTree(data.tree))
      } catch { /* ignore network errors */ }
    }
    load()
  }, [])

  /* تحميل الشجرة عند فتح لوحة NOTFOUND */
  useEffect(() => {
    if (!notFoundPanel || adminTreeData) return
    const load = async () => {
      setAdminTreeLoading(true)
      try {
        const r = await fetch(import.meta.env.VITE_API_URL, {
          method: 'POST', body: JSON.stringify({ action: 'getFamilyTree' }),
        })
        const d = await r.json()
        if (d.success && d.tree?.length > 0) setAdminTreeData({ id: 'root', name: 'الشجرة', generationLevel: 0, children: d.tree })
      } catch { /* ignore network errors */ }
      setAdminTreeLoading(false)
    }
    load()
  }, [notFoundPanel, adminTreeData])

  /* موافقة على طلب NOTFOUND مع تحديد موقع الأب */
  const handleApproveNotFound = async (requestId) => {
    if (!adminAncestor) return
    try {
      setTreeActionLoading(requestId + 'approveTreeRequest')
      const res = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'approveTreeRequest', requestId, ancestorId: adminAncestor.parentId }),
      })
      const result = await res.json()
      if (result.success) {
        setTreeRequests(prev => prev.filter(r => r.requestId !== requestId))
        setNotFoundPanel(null)
        setAdminAncestor(null)
      } else {
        alert(result.message || 'حدث خطأ')
      }
    } catch { alert('تعذّر الاتصال بالخادم') }
    finally { setTreeActionLoading(null) }
  }

  /* جلب طلبات الربط بالشجرة */
  const fetchTreeRequests = async () => {
    setTreeRequestsLoading(true)
    try {
      const res  = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'getTreeRequests' }),
      })
      const data = await res.json()
      if (data.success) setTreeRequests(data.requests || [])
    } catch (e) { console.error(e) }
    finally { setTreeRequestsLoading(false) }
  }
  useEffect(() => {
    const load = async () => {
      try {
        const res  = await fetch(import.meta.env.VITE_API_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'getTreeRequests' }),
        })
        const data = await res.json()
        if (data.success) setTreeRequests(data.requests || [])
      } catch (e) { console.error(e) }
      finally { setTreeRequestsLoading(false) }
    }
    load()
  }, [])

  const handleTreeAction = async (requestId, action) => {
    try {
      setTreeActionLoading(requestId + action)
      const res = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        body: JSON.stringify({ action, requestId }),
      })
      const result = await res.json()
      if (result.success)
        setTreeRequests(prev => prev.filter(r => r.id !== requestId))
      else
        alert(result.message || 'حدث خطأ')
    } catch { alert('تعذّر الاتصال بالخادم') }
    finally { setTreeActionLoading(null) }
  }

  const handleConfirmTreeReject = async (requestId) => {
    try {
      setTreeActionLoading(requestId + 'rejectTreeRequest')
      const res = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'rejectTreeRequest', requestId, reason: treeRejectReason }),
      })
      const result = await res.json()
      if (result.success) {
        setTreeRequests(prev => prev.filter(r => r.id !== requestId))
        setTreeRejectingId(null)
        setTreeRejectReason('')
      } else alert(result.message || 'حدث خطأ')
    } catch { alert('تعذّر الاتصال بالخادم') }
    finally { setTreeActionLoading(null) }
  }

  /* مساعدات الشجرة لاختيار الأب */
  const amBranches = amFlatTree.filter(n => n.gen === 3)

  const handleBranchChange = branchName => {
    const bn = amFlatTree.find(n => n.name === branchName && n.gen === 3 && !n.isChildRecord)
    setAmData(p => ({ ...p, branch: branchName, parentNodeId: bn?.id || '', parentName: bn?.name || '' }))
    if (bn) {
      const kids = amFlatTree.filter(n => n.parentId === bn.id)
      setAmCascade(kids.length ? [{ label: `أبناء ${branchName}`, options: kids, selectedId: '' }] : [])
    } else {
      setAmCascade([])
    }
  }

  const handleCascadeChange = (levelIdx, selectedId) => {
    const node = amFlatTree.find(n => n.id === selectedId)
    setAmData(p => ({ ...p, parentNodeId: selectedId || p.parentNodeId, parentName: node?.name || p.parentName }))
    if (!selectedId || node?.isChildRecord) {
      setAmCascade(prev => prev.slice(0, levelIdx + 1).map((l, i) => i === levelIdx ? { ...l, selectedId } : l))
      return
    }
    const kids = amFlatTree.filter(n => n.parentId === selectedId)
    setAmCascade(prev => {
      const next = prev.slice(0, levelIdx + 1).map((l, i) => i === levelIdx ? { ...l, selectedId } : l)
      if (kids.length) next.push({ label: `أبناء ${node?.name || ''}`, options: kids, selectedId: '' })
      return next
    })
  }

  /* مساعدات شجرة نموذج التعديل */
  const handleEditBranchChange = branchName => {
    const bn = amFlatTree.find(n => n.name === branchName && n.gen === 3 && !n.isChildRecord)
    setEditTreeBranch(branchName)
    setEditFields(p => ({ ...p, 'الفخذ': branchName, 'رقم عقدة الأب': bn?.id || '' }))
    if (bn) {
      const kids = amFlatTree.filter(n => n.parentId === bn.id)
      setEditCascade(kids.length ? [{ label: `أبناء ${branchName}`, options: kids, selectedId: '' }] : [])
    } else {
      setEditCascade([])
    }
  }

  const handleEditCascadeChange = (levelIdx, selectedId) => {
    const node = amFlatTree.find(n => n.id === selectedId)
    setEditFields(p => ({ ...p, 'رقم عقدة الأب': selectedId || p['رقم عقدة الأب'] }))
    if (!selectedId || node?.isChildRecord) {
      setEditCascade(prev => prev.slice(0, levelIdx + 1).map((l, i) => i === levelIdx ? { ...l, selectedId } : l))
      return
    }
    const kids = amFlatTree.filter(n => n.parentId === selectedId)
    setEditCascade(prev => {
      const next = prev.slice(0, levelIdx + 1).map((l, i) => i === levelIdx ? { ...l, selectedId } : l)
      if (kids.length) next.push({ label: `أبناء ${node?.name || ''}`, options: kids, selectedId: '' })
      return next
    })
  }

  /* إضافة عضو مباشرة */
  const handleAddMember = async () => {
    const isDeceased = amData.aliveStatus === 'متوفى'
    if (!amData.firstName) return setAmResult({ success: false, message: 'الاسم الأول مطلوب' })
    if (!isDeceased && amData.tempPassword && amData.tempPassword.length < 6)
      return setAmResult({ success: false, message: 'كلمة المرور المؤقتة يجب أن تكون 6 أحرف على الأقل' })
    const jobFinal   = amData.job === 'أخرى' ? amData.jobOther : amData.job
    const parentNode = amFlatTree.find(n => n.id === amData.parentNodeId)
    try {
      setAmLoading(true)
      setAmResult(null)
      const res = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        body: JSON.stringify({
          action:               'addMember',
          nationalId:           amData.nationalId,
          firstName:            amData.firstName,
          phone:                amPhoneCountry + amData.phone,
          branch:               amData.branch,
          parentNodeId:         amData.parentNodeId,
          parentChildRecordId:  parentNode?.childRecordId || '',
          fatherName:           amData.parentName,
          tempPassword:         amData.tempPassword,
          maritalStatus:        amData.maritalStatus,
          job:                  jobFinal,
          city:                 amData.city,
          role:                 amData.role,
          aliveStatus:          amData.aliveStatus,
        }),
      })
      const result = await res.json()
      setAmResult(result)
      if (result.success) {
        setAmData(AM_INITIAL)
        setAmCascade([])
        try {
          const tr = await fetch(import.meta.env.VITE_API_URL, {
            method: 'POST', body: JSON.stringify({ action: 'getFamilyTree' }),
          })
          const td = await tr.json()
          if (td.success && td.tree?.length) setAmFlatTree(buildFlatTree(td.tree))
        } catch { /* ignore network errors */ }
      }
    } catch { setAmResult({ success: false, message: 'تعذّر الاتصال بالخادم' }) }
    finally  { setAmLoading(false) }
  }

  /* إدراج جد وسيط فوق أي عقدة */
  const handleInsertAncestorAbove = async () => {
    if (!iaaTargetId)      return setIaaResult({ success: false, message: 'يجب اختيار العقدة المستهدفة' })
    if (!iaaName.trim())   return setIaaResult({ success: false, message: 'الاسم مطلوب' })
    try {
      setIaaLoading(true); setIaaResult(null)
      const res  = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'insertAncestorAbove', targetNodeId: iaaTargetId, name: iaaName.trim(), aliveStatus: iaaAlive }),
      })
      const data = await res.json()
      setIaaResult(data)
      if (data.success) { setIaaTargetId(''); setIaaName(''); setIaaAlive('متوفى') }
    } catch { setIaaResult({ success: false, message: 'تعذّر الاتصال بالخادم' }) }
    finally  { setIaaLoading(false) }
  }

  /* إضافة جد فوق جذر الشجرة */
  const handleAddRootAncestor = async () => {
    if (!raName.trim()) return setRaResult({ success: false, message: 'الاسم مطلوب' })
    try {
      setRaLoading(true); setRaResult(null)
      const res  = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'addRootAncestor', name: raName.trim(), aliveStatus: raAlive }),
      })
      const data = await res.json()
      setRaResult(data)
      if (data.success) { setRaName(''); setRaAlive('متوفى') }
    } catch { setRaResult({ success: false, message: 'تعذّر الاتصال بالخادم' }) }
    finally  { setRaLoading(false) }
  }

  /* تغيير كلمة المرور */
  const handleChangePassword = async () => {
    if (!pwData.current || !pwData.next || !pwData.confirm)
      return alert('جميع الحقول مطلوبة')
    if (pwData.next !== pwData.confirm)
      return alert('تأكيد كلمة المرور غير مطابق')
    try {
      setPwLoading(true)
      const res = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'changePassword',
          memberId:        user.memberId,
          currentPassword: pwData.current,
          newPassword:     pwData.next,
        }),
      })
      const result = await res.json()
      if (result.success) {
        alert('تم تغيير كلمة المرور بنجاح')
        setShowPw(false)
        setPwData({ current: '', next: '', confirm: '' })
      } else {
        alert(result.message)
      }
    } catch { alert('حدث خطأ أثناء الاتصال بالخادم') }
    finally  { setPwLoading(false) }
  }

  /* البيانات المُشتقة */
  const scriptUsage   = stats?.scriptUsage   ?? 0
  const scriptCount   = stats?.scriptCount   ?? 0
  const scriptLimit   = stats?.scriptLimit   ?? 6_000
  const todayRequests = stats?.todayRequests ?? 0
  const weekRequests  = stats?.weekRequests  ?? 0
  const onlineUsers   = stats?.onlineUsers   ?? 1
  const dailyStats    = stats?.dailyStats    ?? [0, 0, 0, 0, 0, 0, 0]
  const maxStat       = Math.max(...dailyStats, 1)
  const theme         = usageTheme(scriptUsage)

  const today = new Date().toLocaleDateString('ar-SA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  /* ═══════════ الواجهة ═══════════ */
  return (
    <>

      {/* ── بوابة الرمز — modal overlay ── */}
      {phase !== 'open' && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center px-5"
          style={{
            backdropFilter:      'blur(14px)',
            WebkitBackdropFilter:'blur(14px)',
            background:          'rgba(10,15,22,0.62)',
            opacity:             phase === 'success' ? 0 : 1,
            transition:          'opacity 0.55s ease',
            pointerEvents:       phase === 'success' ? 'none' : 'auto',
          }}
        >
          <div
            className="relative w-full"
            style={{
              maxWidth:   400,
              background: 'rgba(18,26,36,0.98)',
              border:     '1px solid rgba(198,161,107,0.22)',
              borderRadius: 36,
              padding:    '52px 44px 44px',
              boxShadow:  '0 48px 120px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)',
              transform:  phase === 'success' ? 'scale(0.93)' : 'scale(1)',
              transition: 'transform 0.55s cubic-bezier(0.23,1,0.32,1)',
            }}
          >

            {/* حدود مدارية أثناء التحقق */}
            {phase === 'verifying' && (
              <div style={{
                position:'absolute', inset:-1, borderRadius:37,
                background:'conic-gradient(from 0deg,transparent 0%,transparent 68%,rgba(198,161,107,0.9) 85%,transparent 100%)',
                animation:'border-orbit 1.8s linear infinite',
                WebkitMask:'linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0)',
                WebkitMaskComposite:'xor', maskComposite:'exclude', padding:1, pointerEvents:'none',
              }}/>
            )}

            {/* أيقونة القفل / نجاح */}
            <div className="flex justify-center mb-8">
              <div
                className="w-[72px] h-[72px] rounded-[20px] flex items-center justify-center"
                style={{
                  background: phase === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(198,161,107,0.1)',
                  border:     `1.5px solid ${phase === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(198,161,107,0.26)'}`,
                  boxShadow:  phase === 'success' ? '0 0 32px rgba(34,197,94,0.2)' : '0 0 32px rgba(198,161,107,0.1)',
                  transition: 'all 0.4s ease',
                }}
              >
                {phase === 'success' ? (
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
                    stroke="#4ade80" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                ) : (
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
                    stroke="var(--gold-main)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                )}
              </div>
            </div>

            {/* العنوان */}
            <div className="text-center mb-8">
              <h1 className="text-[22px] font-bold text-[var(--gold-main)]">تأكيد الوصول الإداري</h1>
              <p className="mt-2.5 font-nav text-sm text-gray-500 leading-6">
                {phase === 'success'
                  ? 'تم التحقق بنجاح، جاري الدخول...'
                  : 'أدخل رمز المدير الخاص بك للمتابعة'}
              </p>
            </div>

            {/* الإدخال والزر */}
            {phase !== 'success' && (
              <>
                <PasswordInput
                  placeholder="رمز الدخول"
                  value={pin}
                  onChange={e => { setPin(normalizeDigits(e.target.value)); setPinError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleVerifyPin()}
                />

                {pinError && (
                  <div className="mt-3 px-4 py-2.5 rounded-2xl font-nav text-sm text-center"
                    style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.22)', color:'#f87171' }}>
                    {pinError}
                  </div>
                )}

                <div className="flex justify-center mt-5">
                  <button
                    onClick={handleVerifyPin}
                    disabled={phase === 'verifying'}
                    className="font-nav bg-[var(--gold-main)] text-black font-bold flex items-center justify-center overflow-hidden"
                    style={{
                      height:       52,
                      width:        phase === 'verifying' ? 52 : '100%',
                      borderRadius: phase === 'verifying' ? '50%' : 14,
                      transition:   'width 0.5s cubic-bezier(0.23,1,0.32,1), border-radius 0.5s cubic-bezier(0.23,1,0.32,1)',
                    }}
                  >
                    {phase === 'verifying' ? <div className="btn-spinner"/> : 'متابعة'}
                  </button>
                </div>

                <button
                  onClick={() => navigate('/')}
                  className="font-nav w-full mt-4 text-sm text-gray-600 hover:text-gray-400 transition-colors duration-200 py-2"
                >
                  ← العودة للموقع
                </button>
              </>
            )}

          </div>
        </div>
      )}

      {/* ── لوحة المدير — تظهر بعد فتح البوابة ── */}
      <div
        className="px-5 lg:px-10 py-10 space-y-7"
        style={{
          opacity:    phase === 'open' ? 1 : 0,
          transform:  phase === 'open' ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.5s ease 0.15s, transform 0.5s cubic-bezier(0.23,1,0.32,1) 0.15s',
          pointerEvents: phase === 'open' ? 'auto' : 'none',
        }}
      >

      {/* ── العنوان ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold text-[var(--gold-main)]">لوحة تحكم المدير</h1>
          <p className="mt-2 font-nav text-gray-400">
            مرحباً {user?.firstName}، إليك نظرة عامة على المنصة
          </p>
        </div>
        <div
          className="font-nav text-sm text-gray-400 px-4 py-2.5 rounded-2xl flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          {today}
        </div>
      </div>

      {/* ══════════════════════════════════════
          الصف الأول: استهلاك السكربت + المتواجدون
         ══════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* بطاقة الاستهلاك */}
        <div className="rounded-2xl sm:rounded-[28px] p-4 sm:p-7 lg:col-span-2" style={{ background: 'rgba(234,179,8,0.07)', border: '1px solid rgba(234,179,8,0.18)', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>

          <div className="flex items-start justify-between mb-7">
            <div>
              <p className="font-nav text-sm text-gray-400 mb-3">استهلاك السكربت اليومي</p>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span
                  className="text-4xl sm:text-6xl font-black tabular-nums transition-colors duration-500"
                  style={{ color: theme.text }}
                >
                  {scriptUsage}%
                </span>
                <span
                  className="font-nav text-sm px-3 py-1.5 rounded-full font-semibold"
                  style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.bar}28` }}
                >
                  {theme.label}
                </span>
              </div>
              <p className="mt-2 font-nav text-xs text-gray-500">
                {scriptCount.toLocaleString('ar')} من أصل {scriptLimit.toLocaleString('ar')} طلب يومي
              </p>
            </div>

            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: theme.bg, border: `1px solid ${theme.bar}28` }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke={theme.bar} strokeWidth="2.2" strokeLinecap="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
          </div>

          {/* شريط التقدم بمناطق الألوان */}
          <div style={{ direction: 'ltr' }}>

            {/* المسار */}
            <div
              className="relative h-5 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              {/* خلفية مناطق الألوان */}
              <div
                className="absolute inset-0 opacity-[0.18]"
                style={{
                  background:
                    'linear-gradient(to right,' +
                    '#22c55e 0%,#22c55e 55%,' +
                    '#eab308 55%,#eab308 75%,' +
                    '#f97316 75%,#f97316 90%,' +
                    '#ef4444 90%,#ef4444 100%)',
                }}
              />
              {/* شريط الملء */}
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
                style={{
                  width:     `${animated}%`,
                  background: theme.bar,
                  boxShadow:  `0 0 14px ${theme.glow}`,
                }}
              />
            </div>

            {/* علامات العتبات */}
            <div className="relative h-5 mt-1">
              {[
                { at: 55, label: '55%', color: '#eab308' },
                { at: 75, label: '75%', color: '#f97316' },
                { at: 90, label: '90%', color: '#ef4444' },
              ].map(m => (
                <div
                  key={m.at}
                  className="absolute flex flex-col items-center"
                  style={{ left: `${m.at}%`, transform: 'translateX(-50%)' }}
                >
                  <div className="w-px h-2" style={{ background: m.color, opacity: 0.55 }} />
                  <span className="font-nav text-[9px] mt-0.5" style={{ color: m.color }}>
                    {m.label}
                  </span>
                </div>
              ))}
            </div>

            {/* تسميات المناطق */}
            <div className="flex font-nav text-[10px] mt-0.5">
              <span style={{ width: '55%', color: '#22c55e', opacity: 0.65 }}>طبيعي</span>
              <span style={{ width: '20%', color: '#eab308', opacity: 0.65 }}>متوسط</span>
              <span style={{ width: '15%', color: '#f97316', opacity: 0.65 }}>مرتفع</span>
              <span style={{ color: '#ef4444', opacity: 0.65 }}>حرج</span>
            </div>

          </div>

          <p className="mt-5 font-nav text-xs text-gray-600">
            يتجدد حد الاستخدام تلقائياً كل 24 ساعة منتصف الليل
          </p>
        </div>

        {/* بطاقة المتواجدين */}
        <div className="rounded-2xl sm:rounded-[28px] p-4 sm:p-7 flex flex-col" style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.18)', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>
          <div className="flex items-center justify-between">
            <p className="font-nav text-sm text-gray-400">المتواجدون الآن</p>
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: '#4ade80', boxShadow: '0 0 8px #4ade8088' }}
            />
          </div>

          <div className="flex-1 flex items-center justify-center py-6">
            <div className="text-center">
              <div className="relative w-24 h-24 sm:w-32 sm:h-32 mx-auto">
                <div
                  className="absolute inset-0 rounded-full animate-ping"
                  style={{ background: 'rgba(34,197,94,0.07)', animationDuration: '2.2s' }}
                />
                <div
                  className="absolute inset-3 rounded-full animate-ping"
                  style={{ background: 'rgba(34,197,94,0.05)', animationDuration: '2.2s', animationDelay: '0.4s' }}
                />
                <div
                  className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center"
                  style={{
                    background: 'radial-gradient(circle, rgba(34,197,94,0.14) 0%, rgba(34,197,94,0.04) 100%)',
                    border:     '1.5px solid rgba(34,197,94,0.28)',
                    boxShadow:  '0 0 36px rgba(34,197,94,0.14)',
                  }}
                >
                  <span className="text-3xl sm:text-5xl font-black text-green-400 tabular-nums">
                    {onlineUsers}
                  </span>
                </div>
              </div>
              <p className="mt-5 font-nav text-gray-400 text-sm">زائر نشط</p>
              <p className="mt-1 font-nav text-[11px] text-gray-600">يُحدَّث كل دقيقة</p>
            </div>
          </div>
        </div>

      </div>

      {/* ══════════════════════════════════════
          الصف الثاني: إحصائيات الطلبات + بيانات المدير
         ══════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* إحصائيات الطلبات */}
        <div className="rounded-2xl sm:rounded-[28px] p-4 sm:p-7" style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>
          <p className="font-nav text-sm text-gray-400 mb-6">إحصائيات طلبات API</p>

          {/* اليوم / الأسبوع */}
          <div className="grid grid-cols-2 gap-4 mb-7">
            <div
              className="rounded-2xl p-5 text-center"
              style={{
                background: 'rgba(198,161,107,0.07)',
                border:     '1px solid rgba(198,161,107,0.18)',
              }}
            >
              <p className="font-nav text-xs text-gray-400 mb-3">اليوم</p>
              <p className="text-3xl sm:text-5xl font-black text-[var(--gold-main)] tabular-nums leading-none">
                {todayRequests}
              </p>
              <p className="font-nav text-xs text-gray-500 mt-3">طلب</p>
            </div>

            <div
              className="rounded-2xl p-5 text-center"
              style={{
                background: 'rgba(99,102,241,0.07)',
                border:     '1px solid rgba(99,102,241,0.22)',
              }}
            >
              <p className="font-nav text-xs text-gray-400 mb-3">هذا الأسبوع</p>
              <p className="text-3xl sm:text-5xl font-black text-indigo-400 tabular-nums leading-none">
                {weekRequests}
              </p>
              <p className="font-nav text-xs text-gray-500 mt-3">طلب</p>
            </div>
          </div>

          {/* رسم بياني صغير — آخر 7 أيام */}
          <div>
            <p className="font-nav text-xs text-gray-500 mb-3">آخر 7 أيام</p>
            <div className="flex items-end gap-1.5 h-16" style={{ direction: 'ltr' }}>
              {dailyStats.map((val, i) => {
                const isToday = i === dailyStats.length - 1
                const h       = Math.max(8, (val / maxStat) * 100)
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm transition-all duration-700"
                    style={{
                      height:           `${h}%`,
                      background:       isToday ? 'var(--gold-main)' : 'rgba(198,161,107,0.2)',
                      boxShadow:        isToday ? '0 0 10px rgba(198,161,107,0.4)' : 'none',
                      transitionDelay:  `${i * 70}ms`,
                    }}
                    title={`${val} طلب`}
                  />
                )
              })}
            </div>
            <div
              className="flex mt-2 font-nav text-[9px] text-gray-600"
              style={{ direction: 'ltr' }}
            >
              {['أحد','اثن','ثلا','أرب','خمس','جمع','اليوم'].map(d => (
                <span key={d} className="flex-1 text-center">{d}</span>
              ))}
            </div>
          </div>
        </div>

        {/* بيانات المدير الشخصية */}
        <div className="rounded-2xl sm:rounded-[28px] p-4 sm:p-7" style={{ background: 'rgba(198,161,107,0.07)', border: '1px solid rgba(198,161,107,0.18)', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>
          <p className="font-nav text-sm text-gray-400 mb-5">بيانات المدير الشخصية</p>

          <div className="divide-y divide-white/[0.06]">
            {[
              { label: 'الاسم',       value: user?.firstName,    style: { color: 'var(--gold-main)', fontWeight: 700, fontSize: 18 } },
              { label: 'رقم العضوية', value: `#${user?.memberId}`,style: { fontFamily: 'monospace', color: '#fff' } },
              { label: 'الدور',       value: 'مدير النظام',     style: { color: 'var(--gold-main)' } },
              { label: 'الجوال',      value: user?.phone || '—', style: { color: '#9ca3af' } },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-3.5">
                <span className="font-nav text-sm" style={row.style}>{row.value}</span>
                <span className="font-nav text-xs text-gray-500">{row.label}</span>
              </div>
            ))}
          </div>

          {/* زر تغيير كلمة المرور */}
          <button
            onClick={() => setShowPw(v => !v)}
            className="mt-5 w-full font-nav text-sm py-3 rounded-2xl transition-all duration-250"
            style={{
              border:     '1px solid rgba(255,255,255,0.1)',
              color:      showPw ? 'var(--gold-main)' : 'rgba(255,255,255,0.82)',
              background: showPw ? 'rgba(198,161,107,0.06)' : 'transparent',
            }}
          >
            {showPw ? '↑ إلغاء' : 'تغيير كلمة المرور'}
          </button>

          {/* حقول التغيير */}
          <div
            style={{
              display:       'grid',
              gridTemplateRows: showPw ? '1fr' : '0fr',
              transition:    'grid-template-rows 0.38s cubic-bezier(0.23,1,0.32,1)',
            }}
          >
            <div style={{ overflow: 'hidden' }}>
              <div className="pt-4 space-y-3">
                <PasswordInput
                  placeholder="كلمة المرور الحالية"
                  value={pwData.current}
                  onChange={e => setPwData(p => ({ ...p, current: e.target.value }))}
                />
                <PasswordInput
                  placeholder="كلمة المرور الجديدة"
                  value={pwData.next}
                  onChange={e => setPwData(p => ({ ...p, next: e.target.value }))}
                />
                <PasswordInput
                  placeholder="تأكيد كلمة المرور الجديدة"
                  value={pwData.confirm}
                  onChange={e => setPwData(p => ({ ...p, confirm: e.target.value }))}
                />
                <button
                  onClick={handleChangePassword}
                  disabled={pwLoading}
                  className="w-full font-nav bg-[var(--gold-main)] text-black py-3 rounded-2xl font-bold text-sm hover:opacity-90 transition-all duration-200 disabled:opacity-50"
                >
                  {pwLoading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ══════════════════════════════════════
          إحصائيات الشجرة العائلية
         ══════════════════════════════════════ */}
      <div className="rounded-2xl sm:rounded-[28px] p-4 sm:p-7"
        style={{ background: 'rgba(198,161,107,0.06)', border: '1px solid rgba(198,161,107,0.18)', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>

        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="font-nav text-sm text-gray-400 mb-1">إحصائيات الشجرة العائلية</p>
            <p className="font-nav text-xs text-gray-600">توزيع الأعضاء على الأجيال مع متوسط الأعمار</p>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(198,161,107,0.12)', border: '1px solid rgba(198,161,107,0.25)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="var(--gold-main)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
        </div>

        {treeStatsLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-12 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        ) : treeStats ? (
          <>
            {/* الإجماليات */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'إجمالي الشجرة',   value: treeStats.totalNodes,      color: 'var(--gold-main)',  bg: 'rgba(198,161,107,0.1)',  border: 'rgba(198,161,107,0.25)' },
                { label: 'مسجلون في الموقع', value: treeStats.totalRegistered, color: '#a78bfa',            bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.22)' },
                { label: 'أحياء',            value: treeStats.totalAlive,      color: '#4ade80',            bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.22)' },
                { label: 'متوفون',           value: treeStats.totalDead,       color: '#9ca3af',            bg: 'rgba(156,163,175,0.08)', border: 'rgba(156,163,175,0.18)' },
              ].map(c => (
                <div key={c.label} className="rounded-2xl p-4 text-center"
                  style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                  <p className="text-2xl sm:text-3xl font-black tabular-nums" style={{ color: c.color }}>
                    {c.value?.toLocaleString('ar') ?? '—'}
                  </p>
                  <p className="font-nav text-[11px] mt-1.5 text-gray-400">{c.label}</p>
                </div>
              ))}
            </div>

            {/* جدول الأجيال */}
            <div className="overflow-x-auto">
              <table className="w-full font-nav text-sm" style={{ borderCollapse: 'separate', borderSpacing: '0 6px' }}>
                <thead>
                  <tr>
                    {['الجيل', 'الإجمالي', 'أحياء', 'متوفون', 'متوسط العمر'].map(h => (
                      <th key={h} className="text-center pb-2 font-semibold"
                        style={{ color: 'rgba(255,255,255,0.70)', fontSize: 11, fontWeight: 600 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(treeStats.generations || []).map(g => {
                    const pctAlive = g.total > 0 ? Math.round((g.alive / g.total) * 100) : 0
                    return (
                      <tr key={g.gen}>
                        {/* الجيل */}
                        <td className="text-center py-2.5 px-2">
                          <span className="font-nav text-xs font-bold px-2.5 py-1 rounded-full"
                            style={{ background: 'rgba(198,161,107,0.12)', color: 'var(--gold-main)', border: '1px solid rgba(198,161,107,0.22)' }}>
                            {g.gen}
                          </span>
                        </td>
                        {/* الإجمالي */}
                        <td className="text-center py-2.5 px-2">
                          <span className="font-bold text-white">{g.total}</span>
                        </td>
                        {/* أحياء */}
                        <td className="text-center py-2.5 px-2">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-bold" style={{ color: '#4ade80' }}>{g.alive}</span>
                            <div className="w-12 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                              <div className="h-full rounded-full" style={{ width: `${pctAlive}%`, background: '#4ade80' }} />
                            </div>
                            <span className="text-[10px]" style={{ color: 'rgba(74,222,128,0.6)' }}>{pctAlive}%</span>
                          </div>
                        </td>
                        {/* متوفون */}
                        <td className="text-center py-2.5 px-2">
                          <span className="font-bold" style={{ color: '#6b7280' }}>{g.dead}</span>
                        </td>
                        {/* متوسط العمر */}
                        <td className="text-center py-2.5 px-2">
                          {g.avgAge != null ? (
                            <span className="font-nav text-xs px-2.5 py-1 rounded-full"
                              style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)' }}>
                              {g.avgAge} سنة
                            </span>
                          ) : (
                            <span style={{ color: 'rgba(255,255,255,0.50)', fontSize: 12 }}>—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="font-nav text-sm text-center py-6" style={{ color: 'rgba(255,255,255,0.58)' }}>
            تعذّر تحميل إحصائيات الشجرة
          </p>
        )}
      </div>

      {/* ══════════════════════════════════════
          طلبات التسجيل المعلقة
         ══════════════════════════════════════ */}
      <div className="rounded-2xl sm:rounded-[28px] p-4 sm:p-7" style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>

        <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSec('regReq')}>
          <div>
            <p className="font-nav text-sm text-gray-400 mb-1">طلبات العضوية المعلقة</p>
            {openSec.regReq && <p className="font-nav text-xs text-gray-600">مراجعة طلبات الانضمام وقبولها أو رفضها</p>}
          </div>
          <div className="flex items-center gap-2">
            {regRequests.length > 0 && (
              <span className="font-nav text-xs px-2.5 py-1 rounded-full font-bold"
                style={{ background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
                {regRequests.length}
              </span>
            )}
            <button onClick={e => { e.stopPropagation(); fetchRegRequests() }}
              className="font-nav text-xs px-3 py-1.5 rounded-xl transition-all duration-200 hover:opacity-80"
              style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc' }}>
              تحديث
            </button>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.62)" strokeWidth="2"
              style={{ transform: openSec.regReq ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s', flexShrink: 0 }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>

        <div style={{ display: openSec.regReq ? 'block' : 'none' }}>
        {regResult && (
          <div className="mb-4 mt-5 px-4 py-3 rounded-2xl font-nav text-sm"
            style={{
              background: regResult.success ? 'rgba(34,197,94,0.08)'  : 'rgba(239,68,68,0.08)',
              border:     regResult.success ? '1px solid rgba(34,197,94,0.22)' : '1px solid rgba(239,68,68,0.22)',
              color:      regResult.success ? '#4ade80' : '#f87171',
            }}>
            {regResult.message}
          </div>
        )}

        {regRequestsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        ) : regRequests.length === 0 ? (
          <div className="py-10 text-center font-nav text-sm text-gray-600">
            لا توجد طلبات معلقة
          </div>
        ) : (
          <div className="space-y-3">
            {regRequests.map(req => (
              <div key={req.requestId}
                className="rounded-2xl p-5 space-y-4"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(99,102,241,0.12)' }}>

                {/* ── معلومات الطلب + أزرار العرض العادي ── */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1 cursor-pointer select-none"
                    onClick={() => setExpandedRegId(expandedRegId === req.requestId ? null : req.requestId)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm text-white">
                        {[req.name, req.fatherName, req.grandName].filter(Boolean).join(' ')}
                      </p>
                      <span className="font-nav text-[10px] px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.22)' }}>
                        #{req.requestId}
                      </span>
                      {req.branch && (
                        <span className="font-nav text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(198,161,107,0.1)', color: 'var(--gold-main)', border: '1px solid rgba(198,161,107,0.2)' }}>
                          {req.branch}
                        </span>
                      )}
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.58)" strokeWidth="2"
                        style={{ transform: expandedRegId === req.requestId ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s', flexShrink: 0 }}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </div>
                    <p className="font-nav text-xs text-gray-400">
                      الجوال: <span className="text-white">{req.phone}</span>
                      {req.nationalId && <> &nbsp;|&nbsp; الهوية: <span className="text-white">{req.nationalId}</span></>}
                    </p>
                    {req.job && <p className="font-nav text-xs text-gray-500">المهنة: {req.job}</p>}
                    <p className="font-nav text-[10px] text-gray-600">تاريخ الطلب: {req.date}</p>
                  </div>

                  {/* الأزرار — تظهر فقط في وضع العرض العادي */}
                  {editingReqId !== req.requestId && rejectingReqId !== req.requestId && (
                    <div className="flex gap-2 flex-shrink-0 flex-wrap">
                      <button
                        onClick={() => handleRegAction(req.requestId, 'approveRequest')}
                        disabled={!!regActionLoading}
                        className="font-nav text-xs py-2 px-4 rounded-xl font-bold transition-all duration-200 disabled:opacity-50"
                        style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.28)', color: '#4ade80' }}>
                        {regActionLoading === req.requestId + 'approveRequest' ? '...' : 'قبول'}
                      </button>
                      <button
                        onClick={() => handleStartEdit(req)}
                        disabled={!!regActionLoading}
                        className="font-nav text-xs py-2 px-4 rounded-xl transition-all duration-200 disabled:opacity-50"
                        style={{ background: 'rgba(198,161,107,0.08)', border: '1px solid rgba(198,161,107,0.22)', color: 'var(--gold-main)' }}>
                        تعديل
                      </button>
                      <button
                        onClick={() => { setRejectingReqId(req.requestId); setRejectReason('') }}
                        disabled={!!regActionLoading}
                        className="font-nav text-xs py-2 px-4 rounded-xl transition-all duration-200 disabled:opacity-50"
                        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', color: '#f87171' }}>
                        رفض
                      </button>
                    </div>
                  )}
                </div>

                {/* ── وضع التعديل المباشر ── */}
                {editingReqId === req.requestId && (
                  <div className="space-y-3 pt-1 border-t border-white/[0.06]">
                    <p className="font-nav text-xs" style={{ color: 'var(--gold-main)' }}>تعديل البيانات قبل الموافقة</p>

                    {/* التسلسل في الشجرة */}
                    <div className="p-3 rounded-2xl space-y-2"
                      style={{ background: 'rgba(198,161,107,0.05)', border: '1px solid rgba(198,161,107,0.18)' }}>
                      <p className="font-nav text-[10px]" style={{ color: 'var(--gold-main)' }}>التسلسل في الشجرة العائلية</p>
                      <select className="form-input text-xs" value={editTreeBranch}
                        disabled={editTreeLoading}
                        onChange={e => handleEditBranchChange(e.target.value)}>
                        <option value="">
                          {editTreeLoading ? '— جاري تحميل الشجرة... —' : '— اختر الفخذ —'}
                        </option>
                        {amBranches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                      </select>
                      {editCascade.map((level, i) => (
                        <div key={i}>
                          <p className="font-nav text-[10px] text-gray-500 mb-1">{level.label}</p>
                          <select className="form-input text-xs" value={level.selectedId}
                            onChange={e => handleEditCascadeChange(i, e.target.value)}>
                            <option value="">— اتركه فارغاً لاختيار الأب الحالي —</option>
                            {level.options.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                          </select>
                        </div>
                      ))}
                      {editFields['رقم عقدة الأب'] && (
                        <p className="font-nav text-[10px] px-3 py-1.5 rounded-xl"
                          style={{ background: 'rgba(198,161,107,0.1)', color: 'var(--gold-main)' }}>
                          الأب المختار: {amFlatTree.find(n => n.id === editFields['رقم عقدة الأب'])?.name || editFields['رقم عقدة الأب']}
                        </p>
                      )}
                    </div>

                    {/* بيانات الاسم والمعلومات الأخرى */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {[
                        ['الاسم الأول','الاسم الأول','text'],
                        ['اسم الأب','اسم الأب','text'],
                        ['اسم الجد','اسم الجد','text'],
                        ['رقم الهوية','الهوية','numeric'],
                        ['المدينة','المدينة','text'],
                        ['الجيل','الجيل','text'],
                        ['المهنة','المهنة','text'],
                        ['تاريخ الميلاد','تاريخ الميلاد','text'],
                        ['البريد الإلكتروني','البريد الإلكتروني','text'],
                      ].map(([field, ph, mode]) => (
                        <input key={field} className="form-input text-xs" placeholder={ph}
                          inputMode={mode} value={editFields[field] || ''}
                          onChange={e => setEditFields(p => ({ ...p, [field]: mode === 'numeric' ? normalizeDigits(e.target.value) : e.target.value }))} />
                      ))}
                    </div>
                    <textarea
                      className="form-input text-xs w-full resize-none"
                      rows={2} placeholder="ملاحظات"
                      style={{ direction: 'rtl' }}
                      value={editFields['ملاحظات'] || ''}
                      onChange={e => setEditFields(p => ({ ...p, 'ملاحظات': e.target.value }))}
                    />
                    <PhoneInput
                      value={editFields['رقم الجوال'] || ''}
                      onChange={val => setEditFields(p => ({ ...p, 'رقم الجوال': val }))}
                      countryCode={editReqPhoneCountry}
                      onCountryChange={setEditReqPhoneCountry}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveEdit(req.requestId)} disabled={editLoading}
                        className="flex-1 font-nav text-xs py-2.5 rounded-xl font-bold transition-all"
                        style={{ background: 'rgba(198,161,107,0.14)', border: '1px solid rgba(198,161,107,0.3)', color: 'var(--gold-main)' }}>
                        {editLoading ? 'جاري الحفظ...' : 'حفظ التعديل'}
                      </button>
                      <button onClick={() => { setEditingReqId(null); setEditFields({}); setEditCascade([]); setEditTreeBranch('') }}
                        className="font-nav text-xs py-2.5 px-4 rounded-xl transition-all"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.72)' }}>
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}

                {/* ── وضع الرفض مع سبب ── */}
                {rejectingReqId === req.requestId && (
                  <div className="space-y-3 pt-1 border-t border-white/[0.06]">
                    <p className="font-nav text-xs" style={{ color: '#f87171' }}>سبب الرفض — سيظهر للمتقدم عند محاولة تسجيل الدخول</p>
                    <textarea
                      className="form-input w-full resize-none font-nav text-sm"
                      rows={3} style={{ direction: 'rtl' }}
                      placeholder="مثال: الأخ الكريم، نعتذر — الاشتراك مقتصر على أبناء قبيلة السلامي فخذ العفاريت"
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)} />
                    <div className="flex gap-2">
                      <button onClick={() => handleConfirmReject(req.requestId)} disabled={!!regActionLoading}
                        className="flex-1 font-nav text-xs py-2.5 rounded-xl font-bold transition-all"
                        style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                        {regActionLoading === req.requestId + 'rejectRequest' ? 'جاري الرفض...' : 'تأكيد الرفض'}
                      </button>
                      <button onClick={() => { setRejectingReqId(null); setRejectReason('') }}
                        className="font-nav text-xs py-2.5 px-4 rounded-xl transition-all"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.72)' }}>
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}

                {/* ── لوحة التفاصيل الموسعة ── */}
                {expandedRegId === req.requestId && (
                  <div className="pt-4 border-t border-white/[0.06] space-y-4">

                    {/* شارة الشجرة */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/\[SON:[A-Z0-9]+\]/.test(req.notes || '') ? (
                        <span className="font-nav text-xs px-3 py-1.5 rounded-full font-bold"
                          style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.28)', color: '#4ade80' }}>
                          موجود في الشجرة
                        </span>
                      ) : req.parentNodeId ? (
                        <span className="font-nav text-xs px-3 py-1.5 rounded-full font-bold"
                          style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.28)', color: '#eab308' }}>
                          والده في الشجرة — سيُضاف
                        </span>
                      ) : (
                        <span className="font-nav text-xs px-3 py-1.5 rounded-full font-bold"
                          style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.28)', color: '#fb923c' }}>
                          يحتاج إضافة للشجرة
                        </span>
                      )}
                    </div>

                    {/* تسلسل عائلي */}
                    {[req.branch, req.grandName, req.fatherName, req.name].some(Boolean) && (
                      <div>
                        <p className="font-nav text-[10px] text-gray-500 mb-2">التسلسل العائلي</p>
                        <div className="flex items-center gap-1 flex-wrap" style={{ direction: 'rtl' }}>
                          {[req.branch, req.grandName, req.fatherName, req.name].filter(Boolean).map((node, idx, arr) => (
                            <span key={idx} className="flex items-center gap-1">
                              <span className="font-nav text-xs px-2.5 py-1 rounded-xl"
                                style={{
                                  background: idx === arr.length - 1 ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)',
                                  border: idx === arr.length - 1 ? '1px solid rgba(99,102,241,0.35)' : '1px solid rgba(255,255,255,0.07)',
                                  color: idx === arr.length - 1 ? '#a5b4fc' : 'rgba(255,255,255,0.85)',
                                  fontWeight: idx === arr.length - 1 ? 700 : 400,
                                }}>
                                {node}
                              </span>
                              {idx < arr.length - 1 && <span className="font-nav text-[10px] text-gray-600">←</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* بيانات تفصيلية */}
                    {[
                      { label: 'الجيل', value: req.generation },
                      { label: 'تاريخ الميلاد', value: req.birthDate },
                      { label: 'المدينة', value: req.city },
                      { label: 'البريد الإلكتروني', value: req.email },
                    ].some(f => f.value) && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {[
                          { label: 'الجيل', value: req.generation },
                          { label: 'تاريخ الميلاد', value: req.birthDate },
                          { label: 'المدينة', value: req.city },
                          { label: 'البريد الإلكتروني', value: req.email },
                        ].filter(f => f.value).map(field => (
                          <div key={field.label} className="rounded-xl px-3 py-2"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <p className="font-nav text-[10px] text-gray-500 mb-0.5">{field.label}</p>
                            <p className="font-nav text-xs text-white">{field.value}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* رقم عقدة الأب في الشجرة */}
                    {req.parentNodeId && (
                      <div className="rounded-xl px-3 py-2"
                        style={{ background: 'rgba(234,179,8,0.04)', border: '1px solid rgba(234,179,8,0.18)' }}>
                        <p className="font-nav text-[10px] mb-0.5" style={{ color: '#ca8a04' }}>رقم عقدة الأب في الشجرة</p>
                        <p className="font-mono text-xs select-all" style={{ color: '#eab308', letterSpacing: '0.02em' }}>{req.parentNodeId}</p>
                      </div>
                    )}

                    {req.notes && !/\[SON:/.test(req.notes) && (
                      <div className="rounded-xl px-3 py-2"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <p className="font-nav text-[10px] text-gray-500 mb-0.5">ملاحظات</p>
                        <p className="font-nav text-xs text-gray-300">{req.notes}</p>
                      </div>
                    )}

                  </div>
                )}

              </div>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* ══════════════════════════════════════
          طلبات الربط بالشجرة
         ══════════════════════════════════════ */}
      <div className="rounded-2xl sm:rounded-[28px] p-4 sm:p-7" style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>

        <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSec('treeReq')}>
          <div>
            <p className="font-nav text-sm text-gray-400 mb-1">طلبات الربط بالشجرة العائلية</p>
            {openSec.treeReq && <p className="font-nav text-xs text-gray-600">مراجعة طلبات الأعضاء للانتساب إلى شجرة العائلة</p>}
          </div>
          <div className="flex items-center gap-2">
            {treeRequests.length > 0 && (
              <span className="font-nav text-xs px-2.5 py-1 rounded-full font-bold"
                style={{ background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(16,185,129,0.28)', color: '#34d399' }}>
                {treeRequests.length}
              </span>
            )}
            <button onClick={e => { e.stopPropagation(); fetchTreeRequests() }}
              className="font-nav text-xs px-3 py-1.5 rounded-xl transition-all duration-200 hover:opacity-80"
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.22)', color: '#34d399' }}>
              تحديث
            </button>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.62)" strokeWidth="2"
              style={{ transform: openSec.treeReq ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s', flexShrink: 0 }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>

        <div style={{ display: openSec.treeReq ? 'block' : 'none' }}>
        {treeRequestsLoading ? (
          <div className="space-y-3">
            {[1,2].map(i => (
              <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        ) : treeRequests.length === 0 ? (
          <div className="py-10 text-center font-nav text-sm text-gray-600">
            لا توجد طلبات معلقة
          </div>
        ) : (
          <div className="space-y-3">
            {treeRequests.map(req => {
              const isNotFound  = req.parentId === 'NOTFOUND'
              const panelOpen   = notFoundPanel === req.requestId
              return (
                <div key={req.requestId}>
                  <div className="rounded-2xl p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                    style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${isNotFound ? 'rgba(251,146,60,0.2)' : 'rgba(16,185,129,0.12)'}` }}>

                    <div className="flex-1 min-w-0 cursor-pointer select-none"
                      onClick={() => setExpandedTreeId(expandedTreeId === req.requestId ? null : req.requestId)}>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <p className="font-bold text-sm text-white">{req.memberName}</p>
                        <span className="font-nav text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.22)' }}>
                          #{req.memberId}
                        </span>
                        {isNotFound
                          ? <span className="font-nav text-[10px] px-2 py-0.5 rounded-full font-bold"
                              style={{ background: 'rgba(251,146,60,0.12)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.28)' }}>
                              أب غير موجود
                            </span>
                          : <span className="font-nav text-[10px] px-2 py-0.5 rounded-full"
                              style={{ background: 'rgba(198,161,107,0.1)', color: 'var(--gold-main)', border: '1px solid rgba(198,161,107,0.22)' }}>
                              الجيل {req.generation}
                            </span>
                        }
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.58)" strokeWidth="2"
                          style={{ transform: expandedTreeId === req.requestId ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s', flexShrink: 0 }}>
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </div>
                      <p className="font-nav text-xs mt-1" style={{ color: 'rgba(255,255,255,0.80)' }}>
                        {isNotFound
                          ? <span style={{ color: '#fb923c' }}>الأب المفقود: <span className="font-semibold" style={{ color: '#fdba74' }}>{req.parentName}</span></span>
                          : <>الأب: <span style={{ color: 'rgba(255,255,255,0.75)' }}>{req.parentName}</span></>
                        }
                      </p>
                      <p className="font-nav text-xs mt-1.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.82)', direction: 'rtl' }}>
                        {req.path
                          ? <>{req.path} ← <span className="font-bold" style={{ color: '#4ade80' }}>{req.memberName}</span></>
                          : <span className="font-bold" style={{ color: '#4ade80' }}>{req.memberName}</span>
                        }
                      </p>
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      {isNotFound ? (
                        <button
                          onClick={() => { setNotFoundPanel(panelOpen ? null : req.requestId); setAdminAncestor(null) }}
                          disabled={!!treeActionLoading}
                          className="font-nav text-xs py-2 px-4 rounded-xl font-bold transition-all duration-200 disabled:opacity-50"
                          style={{ background: panelOpen ? 'rgba(251,146,60,0.18)' : 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.35)', color: '#fb923c' }}>
                          {panelOpen ? 'إلغاء' : 'حدد موقع الأب'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleTreeAction(req.requestId, 'approveTreeRequest')}
                          disabled={!!treeActionLoading}
                          className="font-nav text-xs py-2 px-4 rounded-xl font-bold transition-all duration-200 disabled:opacity-50"
                          style={{ background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }}>
                          {treeActionLoading === req.requestId + 'approveTreeRequest' ? '...' : 'موافقة'}
                        </button>
                      )}
                      <button
                        onClick={() => { setTreeRejectingId(treeRejectingId === req.requestId ? null : req.requestId); setTreeRejectReason('') }}
                        disabled={!!treeActionLoading}
                        className="font-nav text-xs py-2 px-4 rounded-xl transition-all duration-200 disabled:opacity-50"
                        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', color: '#f87171' }}>
                        {treeRejectingId === req.requestId ? 'إلغاء' : 'رفض'}
                      </button>
                    </div>
                  </div>

                  {/* وضع رفض طلب الشجرة مع سبب */}
                  {treeRejectingId === req.requestId && (
                    <div className="space-y-3 pt-3 border-t border-white/[0.06]">
                      <p className="font-nav text-xs" style={{ color: '#f87171' }}>سبب الرفض — سيظهر للعضو في لوحته</p>
                      <textarea
                        className="form-input w-full resize-none font-nav text-sm"
                        rows={3} style={{ direction: 'rtl' }}
                        placeholder="مثال: الاسم المختار لا يطابق التسلسل الشجري المعروف..."
                        value={treeRejectReason}
                        onChange={e => setTreeRejectReason(e.target.value)} />
                      <div className="flex gap-2">
                        <button onClick={() => handleConfirmTreeReject(req.requestId)} disabled={!!treeActionLoading}
                          className="flex-1 font-nav text-xs py-2.5 rounded-xl font-bold transition-all"
                          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                          {treeActionLoading === req.requestId + 'rejectTreeRequest' ? 'جاري الرفض...' : 'تأكيد الرفض'}
                        </button>
                        <button onClick={() => { setTreeRejectingId(null); setTreeRejectReason('') }}
                          className="font-nav text-xs py-2.5 px-4 rounded-xl transition-all"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.72)' }}>
                          إلغاء
                        </button>
                      </div>
                    </div>
                  )}

                  {/* لوحة تحديد موقع الأب المفقود */}
                  {isNotFound && panelOpen && (
                    <div className="rounded-2xl p-5 mt-1.5"
                      style={{ background: 'rgba(251,146,60,0.04)', border: '1px solid rgba(251,146,60,0.18)' }}>
                      <p className="font-nav text-xs mb-4" style={{ color: 'rgba(255,255,255,0.80)' }}>
                        اختر في الشجرة الشخص الذي يُعدّ أباً لـ &quot;{req.parentName}&quot; — الجيل يُحسب تلقائياً
                      </p>
                      {adminTreeLoading ? (
                        <p className="font-nav text-xs text-center py-4" style={{ color: 'rgba(255,255,255,0.62)' }}>
                          جاري تحميل الشجرة...
                        </p>
                      ) : (
                        <TreeNavigator
                          treeData={adminTreeData}
                          onSelect={setAdminAncestor}
                          selected={adminAncestor}
                        />
                      )}
                      {adminAncestor && (
                        <button
                          onClick={() => handleApproveNotFound(req.requestId)}
                          disabled={!!treeActionLoading}
                          className="mt-4 w-full font-nav text-sm py-3 rounded-2xl font-bold transition-all duration-200 disabled:opacity-50"
                          style={{ background: 'rgba(251,146,60,0.14)', border: '1px solid rgba(251,146,60,0.38)', color: '#fb923c' }}>
                          {treeActionLoading === req.requestId + 'approveTreeRequest'
                            ? 'جاري الإضافة...'
                            : `تأكيد: إضافة "${req.parentName}" تحت ${adminAncestor.parentName} — الجيل ${adminAncestor.generationLevel}`}
                        </button>
                      )}
                    </div>
                  )}

                  {/* ── لوحة التفاصيل الموسعة ── */}
                  {expandedTreeId === req.requestId && (
                    <div className="rounded-2xl p-4 mt-1.5 space-y-4"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(16,185,129,0.1)' }}>

                      {/* شارة الشجرة */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/\[SON:[A-Z0-9]+\]/.test(req.notes || '') ? (
                          <span className="font-nav text-xs px-3 py-1.5 rounded-full font-bold"
                            style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.28)', color: '#4ade80' }}>
                            موجود في الشجرة
                          </span>
                        ) : isNotFound ? (
                          <span className="font-nav text-xs px-3 py-1.5 rounded-full font-bold"
                            style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.28)', color: '#fb923c' }}>
                            يحتاج تحديد موقع الأب
                          </span>
                        ) : (
                          <span className="font-nav text-xs px-3 py-1.5 rounded-full font-bold"
                            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }}>
                            والده موجود في الشجرة
                          </span>
                        )}
                      </div>

                      {/* مسار التسلسل */}
                      <div>
                        <p className="font-nav text-[10px] text-gray-500 mb-2">مسار التسلسل في الشجرة</p>
                        <div className="flex items-center gap-1 flex-wrap" style={{ direction: 'rtl' }}>
                          {(req.path ? req.path.split(' ← ') : []).concat(req.memberName).filter(Boolean).map((node, idx, arr) => (
                            <span key={idx} className="flex items-center gap-1">
                              <span className="font-nav text-xs px-2.5 py-1 rounded-xl"
                                style={{
                                  background: idx === arr.length - 1 ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.04)',
                                  border: idx === arr.length - 1 ? '1px solid rgba(16,185,129,0.35)' : '1px solid rgba(255,255,255,0.07)',
                                  color: idx === arr.length - 1 ? '#34d399' : 'rgba(255,255,255,0.85)',
                                  fontWeight: idx === arr.length - 1 ? 700 : 400,
                                }}>
                                {node}
                              </span>
                              {idx < arr.length - 1 && <span className="font-nav text-[10px] text-gray-600">←</span>}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* بيانات تفصيلية */}
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: 'رقم العضو', value: req.memberId },
                          { label: 'الجيل', value: req.generation ? `الجيل ${req.generation}` : '' },
                          { label: 'الأب المقترح', value: req.parentName },
                          { label: 'تاريخ الطلب', value: req.date },
                        ].filter(f => f.value).map(field => (
                          <div key={field.label} className="rounded-xl px-3 py-2"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <p className="font-nav text-[10px] text-gray-500 mb-0.5">{field.label}</p>
                            <p className="font-nav text-xs text-white">{field.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* رقم عقدة الأب في الشجرة */}
                      {!isNotFound && req.parentId && (
                        <div className="rounded-xl px-3 py-2"
                          style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.18)' }}>
                          <p className="font-nav text-[10px] mb-0.5" style={{ color: 'rgba(16,185,129,0.7)' }}>رقم عقدة الأب في الشجرة</p>
                          <p className="font-mono text-xs select-all" style={{ color: '#34d399', letterSpacing: '0.02em' }}>{req.parentId}</p>
                        </div>
                      )}

                      {req.notes && !/\[SON:/.test(req.notes) && (
                        <div className="rounded-xl px-3 py-2"
                          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <p className="font-nav text-[10px] text-gray-500 mb-0.5">ملاحظات</p>
                          <p className="font-nav text-xs text-gray-300">{req.notes}</p>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        </div>
      </div>

      {/* ══════════════════════════════════════
          إضافة عضو مباشرة
         ══════════════════════════════════════ */}
      <div className="rounded-2xl sm:rounded-[28px] p-4 sm:p-7" style={{ background: 'rgba(198,161,107,0.07)', border: '1px solid rgba(198,161,107,0.22)', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>

        <div className="flex items-start justify-between cursor-pointer" onClick={() => toggleSec('addMember')}>
          <div>
            <p className="font-nav text-sm text-gray-400 mb-1">إضافة عضو مباشرة</p>
            {openSec.addMember && <p className="font-nav text-xs text-gray-600">للمدير أو الأعضاء غير المتمكنين من التسجيل الإلكتروني</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(198,161,107,0.1)', border: '1px solid rgba(198,161,107,0.25)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="var(--gold-main)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.62)" strokeWidth="2"
              style={{ transform: openSec.addMember ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>

        <div style={{ display: openSec.addMember ? 'block' : 'none' }}>

        {/* الاسم الأول — دائماً */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AmField label="الاسم الأول *">
            <input className="form-input"
              placeholder={amData.aliveStatus === 'متوفى' ? 'اسم المتوفى' : 'محمد'}
              value={amData.firstName}
              onChange={e => setAmData(p => ({ ...p, firstName: e.target.value }))} />
          </AmField>
          <div className="flex items-end pb-1">
            <p className="font-nav text-xs leading-relaxed" style={{ color: 'rgba(156,163,175,0.6)' }}>
              {amData.aliveStatus === 'متوفى'
                ? <>سيُضاف للشجرة فقط<br/>بدون حساب تسجيل دخول</>
                : <>بيانات التواصل اختيارية<br/>تُكمَّل عند تسجيل العضو في الموقع</>}
            </p>
          </div>
        </div>

        {/* رقم الهوية ورقم الجوال — للأحياء، اختيارية */}
        {amData.aliveStatus !== 'متوفى' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <AmField label="رقم الهوية (اختياري)">
              <input className="form-input" placeholder="10 أرقام" inputMode="numeric" maxLength={10}
                value={amData.nationalId}
                onChange={e => setAmData(p => ({ ...p, nationalId: normalizeDigits(e.target.value) }))} />
            </AmField>
            <AmField label="رقم الجوال (اختياري)">
              <PhoneInput
                value={amData.phone}
                onChange={val => setAmData(p => ({ ...p, phone: val }))}
                countryCode={amPhoneCountry}
                onCountryChange={setAmPhoneCountry}
              />
            </AmField>
          </div>
        )}

        {/* موقع العضو في الشجرة */}
        <div className="mt-4 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="font-nav text-xs text-gray-500 mb-3">موقع العضو في الشجرة العائلية</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AmField label="الفخذ">
              <select className="form-input" value={amData.branch}
                onChange={e => handleBranchChange(e.target.value)}>
                <option value="">— اختر الفخذ —</option>
                {amBranches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
              </select>
            </AmField>
            {amData.parentName && (
              <AmField label="الأب المختار">
                <div className="form-input flex items-center gap-2" style={{ color: 'var(--gold-main)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                  {amData.parentName}
                </div>
              </AmField>
            )}
          </div>

          {amCascade.length > 0 && (
            <div className="mt-3 space-y-3">
              {amCascade.map((level, i) => (
                <AmField key={i} label={level.label}>
                  <select className="form-input" value={level.selectedId}
                    onChange={e => handleCascadeChange(i, e.target.value)}>
                    <option value="">— اتركه فارغاً لاختيار الأب الحالي —</option>
                    {level.options.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                  </select>
                </AmField>
              ))}
            </div>
          )}
        </div>

        {/* البيانات التفصيلية — للأحياء فقط */}
        {amData.aliveStatus !== 'متوفى' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            <AmField label="كلمة المرور المؤقتة (اختياري)">
              <PasswordInput className="form-input" placeholder="6 أحرف على الأقل"
                value={amData.tempPassword}
                onChange={e => setAmData(p => ({ ...p, tempPassword: e.target.value }))} />
            </AmField>

            <AmField label="الحالة الاجتماعية">
              <select className="form-input" value={amData.maritalStatus}
                onChange={e => setAmData(p => ({ ...p, maritalStatus: e.target.value }))}>
                <option value="">— اختر —</option>
                {MARITAL_LIST.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </AmField>

            <AmField label="المهنة">
              <select className="form-input" value={amData.job}
                onChange={e => setAmData(p => ({ ...p, job: e.target.value }))}>
                <option value="">— اختر —</option>
                {JOBS_LIST.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </AmField>

            {amData.job === 'أخرى' && (
              <AmField label="اذكر المهنة">
                <input className="form-input" placeholder="مثال: مقاول" value={amData.jobOther}
                  onChange={e => setAmData(p => ({ ...p, jobOther: e.target.value }))} />
              </AmField>
            )}

            <AmField label="المدينة">
              <input className="form-input" placeholder="الرياض" value={amData.city}
                onChange={e => setAmData(p => ({ ...p, city: e.target.value }))} />
            </AmField>
          </div>
        )}

        {/* الدور وحالة العضو */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="mb-2 font-nav text-xs text-gray-500">الدور</p>
            <div className="flex gap-2">
              {ROLES_LIST.map(r => (
                <button key={r} type="button"
                  onClick={() => setAmData(p => ({ ...p, role: r }))}
                  className="flex-1 font-nav text-xs py-2.5 rounded-2xl transition-all duration-200"
                  style={{
                    background: amData.role === r ? 'rgba(198,161,107,0.15)' : 'rgba(255,255,255,0.03)',
                    border:     amData.role === r ? '1px solid rgba(198,161,107,0.4)' : '1px solid rgba(255,255,255,0.08)',
                    color:      amData.role === r ? 'var(--gold-main)' : 'rgba(255,255,255,0.70)',
                  }}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 font-nav text-xs text-gray-500">حالة العضو</p>
            <div className="flex gap-3">
              {['حي', 'متوفى'].map(val => (
                <button key={val} type="button"
                  onClick={() => setAmData(p => ({ ...p, aliveStatus: val }))}
                  className="flex-1 font-nav text-sm py-2.5 rounded-2xl transition-all duration-200"
                  style={{
                    background: amData.aliveStatus === val
                      ? (val === 'حي' ? 'rgba(34,197,94,0.15)' : 'rgba(107,114,128,0.15)')
                      : 'rgba(255,255,255,0.03)',
                    border: amData.aliveStatus === val
                      ? (val === 'حي' ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(107,114,128,0.4)')
                      : '1px solid rgba(255,255,255,0.08)',
                    color: amData.aliveStatus === val
                      ? (val === 'حي' ? '#4ade80' : '#9ca3af')
                      : 'rgba(255,255,255,0.70)',
                  }}>
                  {val === 'حي' ? '🟢 حي' : '⬜ متوفى'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* النتيجة */}
        {amResult && (
          <div className="mt-5 px-4 py-3 rounded-2xl font-nav text-sm"
            style={{
              background: amResult.success ? 'rgba(34,197,94,0.08)'  : 'rgba(239,68,68,0.08)',
              border:     amResult.success ? '1px solid rgba(34,197,94,0.22)' : '1px solid rgba(239,68,68,0.22)',
              color:      amResult.success ? '#4ade80' : '#f87171',
            }}>
            {amResult.message}
            {amResult.success && amResult.memberId && (
              <span className="mr-3 text-gray-400">رقم العضو: {amResult.memberId}</span>
            )}
            {amResult.success && !amResult.memberId && amResult.nodeId && (
              <span className="mr-3 text-gray-400">رقم عقدة الشجرة: {amResult.nodeId}</span>
            )}
          </div>
        )}

        <button onClick={handleAddMember} disabled={amLoading}
          className="mt-5 font-nav text-sm py-3 px-8 rounded-2xl font-bold transition-all duration-200 disabled:opacity-50"
          style={{ background: 'rgba(198,161,107,0.14)', border: '1px solid rgba(198,161,107,0.35)', color: 'var(--gold-main)' }}>
          {amLoading ? 'جاري الإضافة...' : 'إضافة العضو'}
        </button>

        </div>
      </div>

      {/* ══════════════════════════════════════
          إدراج جد وسيط فوق أي عقدة
         ══════════════════════════════════════ */}
      <div className="rounded-2xl sm:rounded-[28px] p-4 sm:p-7" style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.18)', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>

        <div className="flex items-start justify-between cursor-pointer" onClick={() => toggleSec('insertAncestor')}>
          <div>
            <p className="font-nav text-sm text-gray-400 mb-1">إدراج جد وسيط في الشجرة</p>
            {openSec.insertAncestor && <p className="font-nav text-xs text-gray-600">يُدرَج الجد فوق عقدة موجودة مع تحديث مستويات الجيل لفرعها كله</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(168,85,247,0.8)" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 5 5 12"/>
              </svg>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.62)" strokeWidth="2"
              style={{ transform: openSec.insertAncestor ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>

        <div style={{ display: openSec.insertAncestor ? 'block' : 'none' }}>

          <div className="mt-5 p-4 rounded-2xl" style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.2)' }}>
            <p className="font-nav text-xs" style={{ color: 'rgba(216,180,254,0.85)' }}>
              مثال: لإضافة "صاحب" بين إبراهيم وأحمد — اختر "أحمد" من القائمة واكتب "صاحب". سيصبح أحمد وفرعه كله أبناء صاحب.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 font-nav text-xs text-gray-500">العقدة التي ستصبح ابناً *</label>
              <select className="form-input" value={iaaTargetId}
                onChange={e => setIaaTargetId(e.target.value)}>
                <option value="">— اختر من الشجرة —</option>
                {amFlatTree.filter(n => !n.isChildRecord).map(n => (
                  <option key={n.id} value={n.id}>
                    {'  '.repeat(Math.max(0, (n.gen || 1) - 1))}{n.name} (جيل {n.gen || 1})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-1.5 font-nav text-xs text-gray-500">اسم الجد الوسيط *</label>
              <input className="form-input" placeholder="مثال: صاحب" value={iaaName}
                onChange={e => setIaaName(e.target.value)} />
            </div>
          </div>

          <div className="mt-4">
            <p className="font-nav text-xs text-gray-500 mb-2">الحالة</p>
            <div className="flex gap-3">
              {['حي', 'متوفى'].map(val => (
                <button key={val} type="button" onClick={() => setIaaAlive(val)}
                  className="flex-1 font-nav text-sm py-2.5 rounded-2xl transition-all duration-200"
                  style={{
                    background: iaaAlive === val
                      ? (val === 'حي' ? 'rgba(34,197,94,0.15)' : 'rgba(107,114,128,0.15)')
                      : 'rgba(255,255,255,0.03)',
                    border: iaaAlive === val
                      ? (val === 'حي' ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(107,114,128,0.4)')
                      : '1px solid rgba(255,255,255,0.08)',
                    color: iaaAlive === val
                      ? (val === 'حي' ? '#4ade80' : '#9ca3af')
                      : 'rgba(255,255,255,0.70)',
                  }}>
                  {val === 'حي' ? '🟢 حي' : '⬜ متوفى'}
                </button>
              ))}
            </div>
          </div>

          {iaaResult && (
            <div className="mt-4 px-4 py-3 rounded-2xl font-nav text-sm"
              style={{
                background: iaaResult.success ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                border:     iaaResult.success ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(239,68,68,0.2)',
                color:      iaaResult.success ? '#4ade80' : '#f87171',
              }}>
              {iaaResult.message}
            </div>
          )}

          <button onClick={handleInsertAncestorAbove} disabled={iaaLoading}
            className="mt-5 font-nav text-sm py-3 px-8 rounded-2xl font-bold transition-all duration-200 disabled:opacity-50"
            style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.35)', color: '#c084fc' }}>
            {iaaLoading ? 'جاري الإدراج...' : 'إدراج الجد الوسيط'}
          </button>

        </div>
      </div>

      {/* ══════════════════════════════════════
          إضافة جد فوق جذر الشجرة
         ══════════════════════════════════════ */}
      <div className="rounded-2xl sm:rounded-[28px] p-4 sm:p-7" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.18)', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>

        <div className="flex items-start justify-between cursor-pointer" onClick={() => toggleSec('addRootAncestor')}>
          <div>
            <p className="font-nav text-sm text-gray-400 mb-1">إضافة جد فوق جذر الشجرة</p>
            {openSec.addRootAncestor && <p className="font-nav text-xs text-gray-600">يُضاف الجد فوق إبراهيم العفريتي ويُحدَّث مستوى الجيل لجميع العقد تلقائياً</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(239,68,68,0.7)" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <polyline points="16 11 18 13 22 9"/>
              </svg>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.62)" strokeWidth="2"
              style={{ transform: openSec.addRootAncestor ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>

        <div style={{ display: openSec.addRootAncestor ? 'block' : 'none' }}>

          <div className="mt-5 p-4 rounded-2xl" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p className="font-nav text-xs" style={{ color: 'rgba(252,165,165,0.85)' }}>
              تحذير: هذا الإجراء يُعيد ترقيم مستويات الجيل لجميع العقد في الشجرة. لا تُكرّره إلا إذا كنت تضيف جداً جديداً فعلاً.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 font-nav text-xs text-gray-500">اسم الجد *</label>
              <input className="form-input" placeholder="مثال: سالم" value={raName}
                onChange={e => setRaName(e.target.value)} />
            </div>
          </div>

          <div className="mt-4">
            <p className="font-nav text-xs text-gray-500 mb-2">الحالة</p>
            <div className="flex gap-3">
              {['حي', 'متوفى'].map(val => (
                <button key={val} type="button" onClick={() => setRaAlive(val)}
                  className="flex-1 font-nav text-sm py-2.5 rounded-2xl transition-all duration-200"
                  style={{
                    background: raAlive === val
                      ? (val === 'حي' ? 'rgba(34,197,94,0.15)' : 'rgba(107,114,128,0.15)')
                      : 'rgba(255,255,255,0.03)',
                    border: raAlive === val
                      ? (val === 'حي' ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(107,114,128,0.4)')
                      : '1px solid rgba(255,255,255,0.08)',
                    color: raAlive === val
                      ? (val === 'حي' ? '#4ade80' : '#9ca3af')
                      : 'rgba(255,255,255,0.70)',
                  }}>
                  {val === 'حي' ? '🟢 حي' : '⬜ متوفى'}
                </button>
              ))}
            </div>
          </div>

          {raResult && (
            <div className="mt-4 px-4 py-3 rounded-2xl font-nav text-sm"
              style={{
                background: raResult.success ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                border:     raResult.success ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(239,68,68,0.2)',
                color:      raResult.success ? '#4ade80' : '#f87171',
              }}>
              {raResult.message}
            </div>
          )}

          <button onClick={handleAddRootAncestor} disabled={raLoading}
            className="mt-5 font-nav text-sm py-3 px-8 rounded-2xl font-bold transition-all duration-200 disabled:opacity-50"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171' }}>
            {raLoading ? 'جاري الإضافة...' : 'إضافة الجد وتحديث الشجرة'}
          </button>

        </div>
      </div>

    </div>
  </>
)
}

function AmField({ label, children }) {
  return (
    <div>
      <label className="block mb-1.5 font-nav text-xs text-gray-500">{label}</label>
      {children}
    </div>
  )
}
