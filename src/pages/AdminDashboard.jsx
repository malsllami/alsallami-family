import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PasswordInput from '../components/PasswordInput'
import TreeNavigator from '../components/TreeNavigator'
import SearchableSelect from '../components/SearchableSelect'
import { normalizeDigits } from '../utils/normalizeInput'
import PhoneInput, { splitIntlPhone } from '../components/PhoneInput'
import { callFunction } from '../services/api'
// xlsx تُحمَّل ديناميكيًا فقط عند الضغط على زر "نسخة احتياطية" (استيراد داخل
// handleExportBackup) — مكتبة كبيرة (+300kb) يستخدمها المدير فقط أحيانًا،
// لا داعي أن يحمّلها كل زائر للموقع ضمن الحزمة الأساسية

/* تحويل شجرة هرمية إلى مصفوفة مسطحة تشمل عقد الأعضاء وسجلات الأبناء الذكور
   — يمرّر مصفوفة أسماء كل الأجداد تراكميًا أثناء المشي (الأقرب أولاً) بدل
   مستويين ثابتين فقط، لأن تشابه الأسماء يحدث أحيانًا حتى بعد الجد المباشر
   (مثال: "أحمد بن محمد بن أحمد بن محمد بن صاحب"). عرض السلسلة الكاملة
   يُقتصَر لاحقًا (بدالة nodeFullName) على ما بعد جد الفخذ فقط — الأجداد
   المشتركون فوق الفخذ لا يُميّزون شيئًا فتُحذف لتقصير الاسم */
function buildFlatTree(roots) {
  const flat = []
  function walk(n, pId, pGen, depth, ancestors) {
    if (n.isWife) return
    if (!n.isChildRecord) {
      const g = n.generation || 1
      flat.push({ id: n.id, name: n.name, parentId: pId || n.parentId || '', gen: g, depth, ancestors, memberId: n.memberId || '', photoUrl: n.photoUrl || '', archived: !!n.archived })
      ;(n.children || []).forEach(c => walk(c, n.id, g, depth + 1, [n.name, ...ancestors]))
    } else if (!n.isDaughter && n.childRecordId) {
      flat.push({
        id: 'child_' + n.childRecordId,
        childRecordId: n.childRecordId,
        name: n.name,
        parentId: pId,
        gen: (pGen || 1) + 1,
        depth: depth + 1,
        isChildRecord: true,
        ancestors: [n.name, ...ancestors],
      })
    }
  }
  roots.forEach(r => walk(r, '', 0, 0, []))
  return flat
}

/* يجد عمق الفخوذ ديناميكياً — يسير في الأبناء الوحيدين من الجذر حتى يصل لتفرع */
function findBranchDepth(flatTree) {
  const nonChild = flatTree.filter(n => !n.isChildRecord)
  let cur = nonChild.find(n => !n.parentId)
  if (!cur) return 2
  while (true) {
    const kids = nonChild.filter(n => n.parentId === cur.id)
    if (kids.length !== 1) return (cur.depth || 0) + 1
    cur = kids[0]
  }
}

/* رابط الموقع — يُدرَج داخل رسائل واتساب لتفعيل بطاقة معاينة الشعار (Open Graph) */
const SITE_URL = 'https://malsllami.github.io/alsallami-family/'

/* تطبيع رقم جوال سعودي إلى صيغة دولية بدون + لاستخدامه في رابط wa.me */
function normalizeToIntlPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('966')) return digits
  if (digits.startsWith('0'))   return '966' + digits.slice(1)
  return '966' + digits
}

/* رابط واتساب ترحيبي للعضو بعد اعتماد عضويته — نص فقط (wa.me) مع رابط الموقع لإظهار الشعار */
function buildWelcomeWhatsAppLink(req) {
  const fullName = [req.name, req.fatherName, req.grandName].filter(Boolean).join(' ') || req.name || ''
  const message =
    `🌿 أهلاً وسهلاً بك ${fullName} في قبيلة السلامي – فخذ العفاريت 🌿\n` +
    `تم قبول طلب عضويتك بنجاح ✅\n${SITE_URL}`
  return `https://wa.me/${normalizeToIntlPhone(req.phone)}?text=${encodeURIComponent(message)}`
}

export default function AdminDashboard() {
  const user     = JSON.parse(localStorage.getItem('user'))
  const navigate = useNavigate()

  const callSettings      = (body) => callFunction('manage-settings', body)
  const callTree          = (body) => callFunction('manage-tree', body)
  const callRegistrations = (body) => callFunction('manage-registrations', body)

  /* ── بوابة الرمز — phase: 'locked' | 'verifying' | 'success' | 'open' ── */
  const [phase,    setPhase]    = useState(() => sessionStorage.getItem('adminUnlocked') === '1' ? 'open' : 'locked')
  const [pin,      setPin]      = useState('')
  const [pinError, setPinError] = useState('')
  const [backupLoading, setBackupLoading] = useState(false)

  /* نسخة احتياطية لكل بيانات الجداول الحقيقية (بلا بنية DDL — موثَّقة أصلًا
     بملفات schema/*.sql محليًا) كملف إكسل واحد — كل جدول بورقة (Sheet)
     مستقلة بنفس اسمه — مشاركة مباشرة (قوقل درايف/حفظ للجهاز) عبر Web Share
     API إن دعمها المتصفح، وإلا تحميل مباشر كخطة بديلة عامة */
  const handleExportBackup = async () => {
    setBackupLoading(true)
    try {
      const data = await callSettings({ action: 'exportBackup' })
      if (!data.success) { alert('فشل سحب النسخة الاحتياطية: ' + (data.message || 'خطأ غير معروف بالخادم')); return }
      const tableCount = Object.keys(data.tables || {}).length
      if (!tableCount) { alert('لم يرجع الخادم أي جداول — تحقّق من الاتصال'); return }

      const XLSX = await import('xlsx')
      const wb = XLSX.utils.book_new()
      Object.entries(data.tables || {}).forEach(([tableName, rows]) => {
        // json_to_sheet لا يقبل قيمًا متداخلة (كائنات/مصفوفات JSONB) كما هي —
        // تُحوَّل نصًا JSON صريحًا بدل تركها تتحوّل ضمنيًا لـ"[object Object]"
        const flatRows = (rows || []).map(row => {
          const flat = {}
          for (const [k, v] of Object.entries(row)) {
            flat[k] = (v && typeof v === 'object') ? JSON.stringify(v) : v
          }
          return flat
        })
        const ws = XLSX.utils.json_to_sheet(flatRows)
        // أسماء أوراق الإكسل محدودة بـ31 حرفًا كحد أقصى — قصّ آمن لأي اسم جدول أطول
        XLSX.utils.book_append_sheet(wb, ws, tableName.slice(0, 31))
      })
      const filename = `نسخة-احتياطية-قبيلة-السلامي-${new Date().toISOString().slice(0, 10)}.xlsx`

      // مشاركة (جوال) إن كانت مدعومة — أسلوب SheetJS القياسي المُختبَر
      // (XLSX.writeFile) هو المسار الأساسي دائمًا، لأنه أثبت أكثر استقرارًا
      // عبر المتصفحات من بناء File/Blob يدويًا؛ المشاركة فقط طبقة إضافية
      // اختيارية فوقه حين تكون مدعومة، لا بديل له
      let shared = false
      if (navigator.canShare && navigator.share) {
        try {
          const arrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
          const file = new File([arrayBuffer], filename, {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          })
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: 'نسخة احتياطية — قبيلة السلامي' })
            shared = true
          }
        } catch (shareErr) {
          // المستخدم ألغى المشاركة، أو فشلت — نكمل للتحميل المباشر بدل التوقف بصمت
          if (shareErr?.name === 'AbortError') { shared = true } // إلغاء متعمَّد من المستخدم — ليس خطأ
        }
      }

      if (!shared) {
        XLSX.writeFile(wb, filename) // يفتح حوار الحفظ/يبدأ التحميل مباشرة — طريقة SheetJS الرسمية
        alert(`تم إنشاء الملف "${filename}" — تحقّق من مجلد التنزيلات إن لم يظهر إشعار`)
      }
    } catch (err) {
      console.error('handleExportBackup error:', err)
      alert('تعذّرت النسخة الاحتياطية: ' + (err?.message || String(err)))
    } finally {
      setBackupLoading(false)
    }
  }

  const handleVerifyPin = async () => {
    if (!pin.trim()) { setPinError('أدخل رمز الدخول'); return }
    try {
      setPhase('verifying')
      setPinError('')
      const result = await callSettings({ action: 'verifyAdminPin', pin })
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
  const [treeStats,      setTreeStats]      = useState(null)
  const [treeStatsLoading, setTreeStatsLoading] = useState(true)
  const [onlineMembers,  setOnlineMembers]  = useState(null)
  const [visitStats,     setVisitStats]     = useState(null)

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

  /* بطاقة مستقلة: إضافة عضو لفرع مؤرشف — حالة منفصلة تمامًا عن "إضافة عضو
     مباشرة" العادية أعلاه (لا تشاركها amData) حتى لا يختلط تعبئة إحداهما
     بالأخرى. الشجرة هنا تُجلَب بنداء includeArchived منفصل (لا تحمَّل إلا
     عند فتح البطاقة) وتُقتصَر خيارات الأب على العقد المؤرشفة فقط */
  const [amArchData,        setAmArchData]        = useState(AM_INITIAL)
  const [amArchLoading,     setAmArchLoading]      = useState(false)
  const [amArchResult,      setAmArchResult]       = useState(null)
  const [amArchivedTree,    setAmArchivedTree]     = useState([]) // flat، الشجرة كاملة (ظاهرة + مؤرشفة)
  const [amArchTreeLoading, setAmArchTreeLoading]  = useState(false)
  const [amArchPhoneCountry, setAmArchPhoneCountry] = useState('+966')
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

  /* تعديل / حذف الجد */
  const [eaTargetId, setEaTargetId] = useState('')
  const [eaName,     setEaName]     = useState('')
  const [eaStatus,   setEaStatus]   = useState('')
  const [eaOrderDate,setEaOrderDate]= useState('') // ترتيب الميلاد (schema/17) — لترتيب ظهور الأبناء بالشجرة
  const [eaLoading,  setEaLoading]  = useState(false)
  const [eaResult,   setEaResult]   = useState(null)
  const [daTargetId, setDaTargetId] = useState('')
  const [daLoading,  setDaLoading]  = useState(false)
  const [daResult,   setDaResult]   = useState(null)
  const [daConfirm,  setDaConfirm]  = useState(false)
  const [treeManageTab, setTreeManageTab] = useState('edit')

  /* نقل عضو في الشجرة */
  const [mvSourceId,  setMvSourceId]  = useState('')
  const [mvTargetId,  setMvTargetId]  = useState('')
  const [mvCascade,   setMvCascade]   = useState([])
  const [mvBranch,    setMvBranch]    = useState('')
  const [mvLoading,   setMvLoading]   = useState(false)
  const [mvResult,    setMvResult]    = useState(null)

  /* إضافة عقدة جديدة تحت أب موجود بالشجرة — اختياريًا مربوطة بعضو مسجَّل
     مسبقًا (يحل حالة "الأب غير موجود بالشجرة": تُضاف عقدة الأب أولاً بلا
     ربط، ثم عقدة العضو نفسه تحتها مربوطة بحسابه الحقيقي) */
  const [anParentId,  setAnParentId]  = useState('')
  const [anName,      setAnName]      = useState('')
  const [anAlive,     setAnAlive]     = useState('حي')
  const [anMemberId,  setAnMemberId]  = useState('')
  const [anLoading,   setAnLoading]   = useState(false)
  const [anResult,    setAnResult]    = useState(null)
  const [amMembers,   setAmMembers]   = useState([]) // قائمة كل الأعضاء المسجَّلين — تُحمَّل عند فتح التبويب فقط

  /* أرشفة/استعادة فخذ أو فرع كامل (schema/16) — بديل آمن قابل للاسترجاع
     تمامًا عن الحذف الحقيقي الممنوع نهائيًا لبيانات مستخدمين حقيقية */
  const [archNodeId,        setArchNodeId]        = useState('')
  const [archConfirm,       setArchConfirm]       = useState(false)
  const [archLoading,       setArchLoading]       = useState(false)
  const [archResult,        setArchResult]        = useState(null)
  const [archivedBranches,  setArchivedBranches]  = useState([])
  const [archListLoaded,    setArchListLoaded]    = useState(false)
  const [restoringId,       setRestoringId]       = useState('')

  /* تغيير صورة عقدة شجرة (المدير) — الصور تُخزَّن الآن في Supabase Storage
     بدل Google Drive سابقًا. يشمل كل عقد الشجرة (مسجَّلين وأجداد متوفين/غير
     مسجَّلين بلا حساب عضوية — schema/15) وليس الأعضاء المسجَّلين فقط */
  const [phNodeId,     setPhNodeId]     = useState('')
  const [phCurrentUrl, setPhCurrentUrl] = useState('')
  const [phUploading,  setPhUploading]  = useState(false)
  const [phError,      setPhError]      = useState('')

  const [openSec, setOpenSec] = useState({
    scriptStats: false, platformStats: false, onlineUsers: false,
    regReq: false, treeReq: false, treeStats: false,
    addMember: false, addArchivedMember: false, memberPhoto: false, treeManage: false, adminProfile: false,
  })
  const toggleSec = k => setOpenSec(p => ({ ...p, [k]: !p[k] }))

  /* جلب إحصائيات العائلة الحقيقية (أعضاء/طلبات/صناديق/مقالات) */
  useEffect(() => {
    const load = async () => {
      try {
        const data = await callSettings({ action: 'getAdminStats' })
        if (data.success) setStats(data.stats)
      } catch (e) { console.error(e) }
      finally    { setStatsLoading(false) }
    }
    load()
  }, [])

  /* جلب إحصائيات الشجرة */
  useEffect(() => {
    const load = async () => {
      try {
        const data = await callSettings({ action: 'getTreeStats' })
        if (data.success) setTreeStats(data)
      } catch (e) { console.error(e) }
      finally { setTreeStatsLoading(false) }
    }
    load()
  }, [])

  /* المتواجدون الآن — يُحدَّث كل دقيقة (نفس فاصل النبض الدوري بـMainLayout) */
  useEffect(() => {
    const load = () => callSettings({ action: 'getOnlineMembers' }).then(d => { if (d.success) setOnlineMembers(d) }).catch(() => {})
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [])

  /* إحصائيات الزيارات — تتحدّث تلقائيًا كل دقيقة (نفس فاصل المتواجدين الآن) */
  useEffect(() => {
    const load = () => callSettings({ action: 'getVisitStats' }).then(d => { if (d.success) setVisitStats(d) }).catch(() => {})
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [])

  /* جلب طلبات التسجيل — دالة للزر تضبط loading بنفسها */
  const fetchRegRequests = async () => {
    setRegRequestsLoading(true)
    setRegResult(null)
    try {
      const data = await callRegistrations({ action: 'getPendingRequests', status: 'معلق' })
      if (data.success) setRegRequests(data.requests || [])
    } catch (e) { console.error(e) }
    finally { setRegRequestsLoading(false) }
  }
  /* useEffect يُحمّل بدون setState sync — loading يبدأ true من الـ useState */
  useEffect(() => {
    const load = async () => {
      try {
        const data = await callRegistrations({ action: 'getPendingRequests', status: 'معلق' })
        if (data.success) setRegRequests(data.requests || [])
      } catch (e) { console.error(e) }
      finally { setRegRequestsLoading(false) }
    }
    load()
  }, [])

  const handleRegAction = async (req, action) => {
    const requestId = req.requestId
    try {
      setRegActionLoading(requestId + action)
      // approveRequest هي العملية الوحيدة المُستدعاة من هنا حاليًا — تذهب
      // لدالة approve-registration المستقلة (بلا حقل action، بنية ثابتة)
      const result = await callFunction('approve-registration', { requestId })
      if (result.success) {
        setRegRequests(prev => prev.filter(r => r.requestId !== requestId))
        setRegResult({
          success: true,
          message: result.message,
          // زر ترحيب واتساب للعضو — يظهر فقط بعد قبول الطلب (وليس الرفض)
          whatsappLink: action === 'approveRequest' ? buildWelcomeWhatsAppLink(req) : null,
        })
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
    // الرقم المخزَّن دوليًا كاملاً — يُقسَّم لمفتاح الدولة + الرقم المحلي
    // بدل استخدامه كاملاً كـ"رقم محلي" مباشرة (وإلا يُنتَج رقم مضاعف
    // البادئة عند الحفظ بلا تعديل الحقل)
    const splitPhone = splitIntlPhone(req.phone)
    setEditReqPhoneCountry(splitPhone.countryCode)
    setEditFields({
      'الاسم الأول':        req.name         || '',
      'اسم الأب':           req.fatherName   || '',
      'اسم الجد':           req.grandName    || '',
      'رقم الجوال':         splitPhone.local,
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
        const data = await callTree({ action: 'getFamilyTree' })
        if (data.success && data.tree?.length) {
          flatTree = buildFlatTree(data.tree)
          setAmFlatTree(flatTree)
        }
      } catch { /* ignore */ }
      setEditTreeLoading(false)
    }

    // تهيئة cascade الشجرة
    const bd = findBranchDepth(flatTree)
    if (parentNodeId && flatTree.length) {
      const target = flatTree.find(n => n.id === parentNodeId)
      if (target) {
        const path = [target]
        let cur = target
        while (cur.parentId && cur.depth > bd) {
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
    const bn = flatTree.find(n => n.name === branch && n.depth === bd && !n.isChildRecord)
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
      // "الفخذ" حقل نصي وصفي منفصل عن رابط الشجرة الفعلي ('رقم عقدة الأب') —
      // عند اختيار جد من السلسلة الثابتة مباشرة (بدل فخذ قائم)، العضو نفسه
      // يصبح فخذًا جديدًا، فيُسجَّل اسمه هو الوصف بدل إرسال الرمز الداخلي
      const branchValue = String(editFields['الفخذ'] || '').startsWith(TRUNK_PREFIX)
        ? (editFields['الاسم الأول'] || '')
        : editFields['الفخذ']
      const result = await callRegistrations({
        action: 'updatePendingRequest', requestId, ...editFields,
        'الفخذ': branchValue,
        'رقم الجوال': editReqPhoneCountry + (editFields['رقم الجوال'] || ''),
      })
      if (result.success) {
        setRegRequests(prev => prev.map(r => r.requestId !== requestId ? r : {
          ...r,
          name:         editFields['الاسم الأول'],
          fatherName:   editFields['اسم الأب'],
          grandName:    editFields['اسم الجد'],
          phone:        editFields['رقم الجوال'],
          nationalId:   editFields['رقم الهوية'],
          branch:       branchValue,
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
      const result = await callFunction('reject-registration', { requestId, reason: rejectReason })
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
        const data = await callTree({ action: 'getFamilyTree' })
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
        const d = await callTree({ action: 'getFamilyTree' })
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
      const result = await callTree({ action: 'approveTreeRequest', requestId, ancestorId: adminAncestor.parentId })
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
      const data = await callTree({ action: 'getTreeRequests' })
      if (data.success) setTreeRequests(data.requests || [])
    } catch (e) { console.error(e) }
    finally { setTreeRequestsLoading(false) }
  }
  useEffect(() => {
    const load = async () => {
      try {
        const data = await callTree({ action: 'getTreeRequests' })
        if (data.success) setTreeRequests(data.requests || [])
      } catch (e) { console.error(e) }
      finally { setTreeRequestsLoading(false) }
    }
    load()
  }, [])

  const handleTreeAction = async (requestId, action) => {
    try {
      setTreeActionLoading(requestId + action)
      const result = await callTree({ action, requestId })
      if (result.success)
        setTreeRequests(prev => prev.filter(r => r.requestId !== requestId))
      else
        alert(result.message || 'حدث خطأ')
    } catch { alert('تعذّر الاتصال بالخادم') }
    finally { setTreeActionLoading(null) }
  }

  const handleConfirmTreeReject = async (requestId) => {
    try {
      setTreeActionLoading(requestId + 'rejectTreeRequest')
      const result = await callTree({ action: 'rejectTreeRequest', requestId, reason: treeRejectReason })
      if (result.success) {
        setTreeRequests(prev => prev.filter(r => r.requestId !== requestId))
        setTreeRejectingId(null)
        setTreeRejectReason('')
      } else alert(result.message || 'حدث خطأ')
    } catch { alert('تعذّر الاتصال بالخادم') }
    finally { setTreeActionLoading(null) }
  }

  /* مساعدات الشجرة لاختيار الأب */
  const amBranchDepth = findBranchDepth(amFlatTree)
  const amBranches = amFlatTree.filter(n => n.depth === amBranchDepth && !n.isChildRecord)

  /* سلسلة الأجداد فوق الفخوذ (الجد الأول وأي جد وسيط بينه وبين الفخوذ من
     أجداد بابن وحيد) — كل عقد الفخوذ تشترك بنفس هذه السلسلة تمامًا، فتُؤخَذ
     من أول عقدة فخذ فقط. تُحسَب ديناميكيًا من روابط parentId الحيّة بالشجرة
     الحالية (وليست مجرد نص محفوظ) فتتكيّف تلقائيًا مع أي تعديل مستقبلي —
     مثل إضافة جد جديد فوق الجذر عبر تبويب "إضافة فوق الجذر" — بلا أي حاجة
     لتعديل الكود. كل عقدة منها قابلة للاختيار مباشرة كأب جديد (وليست نصًا
     للعرض فقط) لتمكين نقل/إضافة عضو ليصبح فخذًا جديدًا مباشرة تحت الجد
     الأول، أو تحت أي جد وسيط، بدل الاقتصار على الفخوذ الحالية فقط */
  const trunkNodes = (() => {
    const chain = []
    let cur = amBranches[0]
    while (cur && cur.parentId) {
      const parent = amFlatTree.find(n => n.id === cur.parentId && !n.isChildRecord)
      if (!parent) break
      chain.push(parent)
      cur = parent
    }
    return chain.reverse() // من الجد الأول نزولاً حتى مباشرة فوق الفخوذ
  })()
  const TRUNK_PREFIX = '__trunk__:'

  const handleBranchChange = val => {
    if (val.startsWith(TRUNK_PREFIX)) {
      const node = amFlatTree.find(n => n.id === val.slice(TRUNK_PREFIX.length) && !n.isChildRecord)
      setAmData(p => ({ ...p, branch: val, parentNodeId: node?.id || '', parentName: node?.name || '' }))
      setAmCascade([])
      return
    }
    const branchName = val
    const bn = amFlatTree.find(n => n.name === branchName && n.depth === amBranchDepth && !n.isChildRecord)
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
  const handleEditBranchChange = val => {
    if (val.startsWith(TRUNK_PREFIX)) {
      const node = amFlatTree.find(n => n.id === val.slice(TRUNK_PREFIX.length) && !n.isChildRecord)
      setEditTreeBranch(val)
      setEditFields(p => ({ ...p, 'الفخذ': val, 'رقم عقدة الأب': node?.id || '' }))
      setEditCascade([])
      return
    }
    const branchName = val
    const bn = amFlatTree.find(n => n.name === branchName && n.depth === amBranchDepth && !n.isChildRecord)
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
    // "الفخذ" حقل نصي وصفي منفصل عن رابط الشجرة الفعلي (parentNodeId) — عند
    // اختيار جد من السلسلة الثابتة مباشرة (بدل فخذ قائم)، العضو الجديد نفسه
    // يصبح فخذًا جديدًا، فيُسجَّل اسمه هو الوصف بدل إرسال الرمز الداخلي
    const branchValue = amData.branch.startsWith(TRUNK_PREFIX) ? amData.firstName : amData.branch
    try {
      setAmLoading(true)
      setAmResult(null)
      const result = await callRegistrations({
        action:               'addMember',
        nationalId:           amData.nationalId,
        firstName:            amData.firstName,
        phone:                amPhoneCountry + amData.phone,
        branch:               branchValue,
        parentNodeId:         amData.parentNodeId,
        parentChildRecordId:  parentNode?.childRecordId || '',
        fatherName:           amData.parentName,
        tempPassword:         amData.tempPassword,
        maritalStatus:        amData.maritalStatus,
        job:                  jobFinal,
        city:                 amData.city,
        role:                 amData.role,
        aliveStatus:          amData.aliveStatus,
      })
      setAmResult(result)
      if (result.success) {
        setAmData(AM_INITIAL)
        setAmCascade([])
        try {
          const td = await callTree({ action: 'getFamilyTree' })
          if (td.success && td.tree?.length) setAmFlatTree(buildFlatTree(td.tree))
        } catch { /* ignore network errors */ }
      }
    } catch { setAmResult({ success: false, message: 'تعذّر الاتصال بالخادم' }) }
    finally  { setAmLoading(false) }
  }

  /* تحميل الشجرة كاملة (ظاهرة + مؤرشفة) عند فتح بطاقة "إضافة عضو لفرع
     مؤرشف" لأول مرة — includeArchived لا يُفعَّل إلا هنا وبزر "عرض شجرة
     المؤرشفين" (البند 2)، وليس بأي نداء آخر بلوحة المدير */
  useEffect(() => {
    if (!openSec.addArchivedMember || amArchivedTree.length) return
    const load = async () => {
      setAmArchTreeLoading(true)
      try {
        const data = await callTree({ action: 'getFamilyTree', includeArchived: true })
        if (data.success && data.tree?.length) setAmArchivedTree(buildFlatTree(data.tree))
      } catch { /* ignore network errors */ }
      setAmArchTreeLoading(false)
    }
    load()
  }, [openSec.addArchivedMember])

  const amArchOptions     = amArchivedTree.filter(n => !n.isChildRecord && n.archived)
  const amArchBranchDepth = findBranchDepth(amArchivedTree)

  /* اختيار الأب ببطاقة "إضافة عضو لفرع مؤرشف" — قائمة مسطّحة بسيطة (بلا
     تسلسل فخذ/أبناء متدرّج كالبطاقة العادية): الفخذ يُشتَق تلقائيًا بالمشي
     على parentId حتى مستوى الفخوذ لعرضه فقط، والعضو الجديد يُربَط مباشرة
     تحت العقدة المختارة أيًا كان عمقها */
  const handleArchParentChange = (selectedId) => {
    const node = amArchivedTree.find(n => n.id === selectedId)
    let cur = node
    while (cur && cur.depth > amArchBranchDepth) {
      cur = amArchivedTree.find(n => n.id === cur.parentId)
    }
    setAmArchData(p => ({ ...p, parentNodeId: node?.id || '', parentName: node?.name || '', branch: cur?.name || '' }))
  }

  /* إضافة عضو لفرع مؤرشف — نفس عملية "addMember" الخلفية تمامًا (لا علاقة
     لها بالأرشفة من جهة الخادم)؛ الفرق الوحيد هنا هو قائمة اختيار الأب
     المقتصرة على العقد المؤرشفة (البند 4) */
  const handleAddArchivedMember = async () => {
    const isDeceased = amArchData.aliveStatus === 'متوفى'
    if (!amArchData.firstName) return setAmArchResult({ success: false, message: 'الاسم الأول مطلوب' })
    if (!amArchData.parentNodeId) return setAmArchResult({ success: false, message: 'يجب اختيار الأب من القائمة' })
    if (!isDeceased && amArchData.tempPassword && amArchData.tempPassword.length < 6)
      return setAmArchResult({ success: false, message: 'كلمة المرور المؤقتة يجب أن تكون 6 أحرف على الأقل' })
    const jobFinal   = amArchData.job === 'أخرى' ? amArchData.jobOther : amArchData.job
    const parentNode = amArchivedTree.find(n => n.id === amArchData.parentNodeId)
    try {
      setAmArchLoading(true)
      setAmArchResult(null)
      const result = await callRegistrations({
        action:               'addMember',
        nationalId:           amArchData.nationalId,
        firstName:            amArchData.firstName,
        phone:                amArchPhoneCountry + amArchData.phone,
        branch:               amArchData.branch,
        parentNodeId:         amArchData.parentNodeId,
        parentChildRecordId:  parentNode?.childRecordId || '',
        fatherName:           amArchData.parentName,
        tempPassword:         amArchData.tempPassword,
        maritalStatus:        amArchData.maritalStatus,
        job:                  jobFinal,
        city:                 amArchData.city,
        role:                 amArchData.role,
        aliveStatus:          amArchData.aliveStatus,
      })
      setAmArchResult(result)
      if (result.success) {
        setAmArchData(AM_INITIAL)
        try {
          const td = await callTree({ action: 'getFamilyTree', includeArchived: true })
          if (td.success && td.tree?.length) setAmArchivedTree(buildFlatTree(td.tree))
        } catch { /* ignore network errors */ }
      }
    } catch { setAmArchResult({ success: false, message: 'تعذّر الاتصال بالخادم' }) }
    finally  { setAmArchLoading(false) }
  }

  /* إدراج جد وسيط فوق أي عقدة */
  const handleInsertAncestorAbove = async () => {
    if (!iaaTargetId)      return setIaaResult({ success: false, message: 'يجب اختيار العقدة المستهدفة' })
    if (!iaaName.trim())   return setIaaResult({ success: false, message: 'الاسم مطلوب' })
    try {
      setIaaLoading(true); setIaaResult(null)
      const data = await callTree({ action: 'insertAncestorAbove', targetNodeId: iaaTargetId, name: iaaName.trim(), aliveStatus: iaaAlive })
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
      const data = await callTree({ action: 'addRootAncestor', name: raName.trim(), aliveStatus: raAlive })
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
      const result = await callFunction('manage-member', { action: 'changePassword', newPassword: pwData.next })
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

  /* تعديل اسم جد */
  const handleEditAncestor = async () => {
    if (!eaTargetId) return setEaResult({ ok: false, msg: 'اختر العقدة أولاً' })
    if (!eaName.trim() && !eaStatus.trim() && !eaOrderDate) return setEaResult({ ok: false, msg: 'أدخل الاسم أو الحالة أو تاريخ الترتيب' })
    setEaLoading(true); setEaResult(null)
    try {
      const data = await callTree({
        action: 'updateTreeNode', nodeId: eaTargetId,
        name: eaName.trim() || undefined, status: eaStatus || undefined,
        birthOrderDate: eaOrderDate || undefined,
      })
      setEaResult({ ok: data.success, msg: data.message || (data.success ? 'تم التعديل' : 'فشل') })
      if (data.success) { setEaTargetId(''); setEaName(''); setEaStatus(''); setEaOrderDate('') }
    } catch { setEaResult({ ok: false, msg: 'خطأ في الاتصال' }) }
    finally { setEaLoading(false) }
  }

  /* حذف جد */
  const handleDeleteAncestor = async () => {
    if (!daTargetId) return setDaResult({ ok: false, msg: 'اختر العقدة أولاً' })
    if (!daConfirm) return setDaConfirm(true)
    setDaLoading(true); setDaResult(null)
    try {
      const data = await callTree({ action: 'deleteTreeNode', nodeId: daTargetId })
      setDaResult({ ok: data.success, msg: data.message || (data.success ? 'تم الحذف' : 'فشل') })
      if (data.success) { setDaTargetId(''); setDaConfirm(false) }
    } catch { setDaResult({ ok: false, msg: 'خطأ في الاتصال' }) }
    finally { setDaLoading(false); setDaConfirm(false) }
  }

  /* نقل عضو إلى أب جديد */
  const handleMvBranchChange = val => {
    if (val.startsWith(TRUNK_PREFIX)) {
      const node = amFlatTree.find(n => n.id === val.slice(TRUNK_PREFIX.length) && !n.isChildRecord)
      setMvBranch(val)
      setMvTargetId(node?.id || '')
      setMvCascade([])
      return
    }
    const branchName = val
    const bn = amFlatTree.find(n => n.name === branchName && n.depth === amBranchDepth && !n.isChildRecord)
    setMvBranch(branchName)
    setMvTargetId(bn?.id || '')
    if (bn) {
      const kids = amFlatTree.filter(n => n.parentId === bn.id)
      setMvCascade(kids.length ? [{ label: `أبناء ${branchName}`, options: kids, selectedId: '' }] : [])
    } else {
      setMvCascade([])
    }
  }

  const handleMvCascadeChange = (levelIdx, selectedId) => {
    const node = amFlatTree.find(n => n.id === selectedId)
    setMvTargetId(selectedId || mvTargetId)
    if (!selectedId || node?.isChildRecord) {
      setMvCascade(prev => prev.slice(0, levelIdx + 1).map((l, i) => i === levelIdx ? { ...l, selectedId } : l))
      return
    }
    const kids = amFlatTree.filter(n => n.parentId === selectedId)
    setMvCascade(prev => {
      const next = prev.slice(0, levelIdx + 1).map((l, i) => i === levelIdx ? { ...l, selectedId } : l)
      if (kids.length) next.push({ label: `أبناء ${node?.name || ''}`, options: kids, selectedId: '' })
      return next
    })
  }

  const handleMoveTreeNode = async () => {
    if (!mvSourceId) return setMvResult({ ok: false, msg: 'اختر العضو المراد نقله' })
    if (!mvTargetId) return setMvResult({ ok: false, msg: 'اختر الأب الجديد' })
    if (mvSourceId === mvTargetId) return setMvResult({ ok: false, msg: 'لا يمكن نقل عضو تحت نفسه' })
    setMvLoading(true); setMvResult(null)
    try {
      const data = await callTree({ action: 'moveTreeNode', nodeId: mvSourceId, newParentId: mvTargetId })
      setMvResult({ ok: data.success, msg: data.message || (data.success ? 'تم النقل' : 'فشل') })
      if (data.success) {
        setMvSourceId(''); setMvTargetId(''); setMvBranch(''); setMvCascade([])
        try {
          const td = await callTree({ action: 'getFamilyTree' })
          if (td.success && td.tree?.length) setAmFlatTree(buildFlatTree(td.tree))
        } catch { /* ignore */ }
      }
    } catch { setMvResult({ ok: false, msg: 'خطأ في الاتصال' }) }
    finally { setMvLoading(false) }
  }

  /* قائمة كل الأعضاء المسجَّلين — تُحمَّل مرة واحدة فقط عند أول فتح لتبويب "إضافة عقدة" */
  const loadAllMembersForTree = async () => {
    if (amMembers.length) return
    try {
      const data = await callRegistrations({ action: 'getAllMembers' })
      if (data.success) setAmMembers(data.members)
    } catch { /* ignore */ }
  }

  /* اسم كامل مميّز — الاسم + الأب + الجد (تفاديًا لتشابه الأسماء الأولى) */
  const memberFullName = (m) => [m.firstName, m.fatherName, m.grandfatherName].filter(Boolean).join(' بن ')

  /* اسم كامل مميّز لعقدة شجرة — يعرض السلسلة كاملة من العضو حتى جد الفخذ نفسه
     (وليس مستويين ثابتين فقط)، لأن التشابه يحدث أحيانًا حتى بعد الجد المباشر.
     ما فوق جد الفخذ (الأجداد المشتركون بين الجميع) يُحذف لأنه لا يميّز شيئًا */
  const nodeFullName = (n) => {
    if (!n || !n.name) return ''
    const keep = Math.max(0, (n.depth || 0) - amBranchDepth)
    return [n.name, ...(n.ancestors || []).slice(0, keep)].join(' بن ')
  }

  /* نص خيار موحَّد لكل قوائم اختيار عقدة الشجرة — الاسم الكامل + الجيل، مع
     تنبيه "(مؤرشف)" إن كانت العقدة ضمن فرع مؤرشف حاليًا (المدير وحده يرى
     هذي العقد أصلاً بفضل فلترة الرؤية بـmanage-tree، فلا حاجة له لاستعادة
     الفرع أولاً قبل إضافة/نقل أعضاء تحته) */
  const nodeOptionLabel = (n) => `${nodeFullName(n)} (جيل ${n.gen || 1})${n.archived ? ' — مؤرشف 📦' : ''}`

  /* إضافة عقدة جديدة تحت أب مُختار — اختياريًا مربوطة بعضو حقيقي */
  const handleAddTreeNode = async () => {
    if (!anParentId) return setAnResult({ ok: false, msg: 'اختر الأب من الشجرة' })
    if (!anName.trim()) return setAnResult({ ok: false, msg: 'الاسم مطلوب' })
    setAnLoading(true); setAnResult(null)
    try {
      const data = await callTree({
        action: 'addTreeNode', parentId: anParentId, name: anName.trim(),
        aliveStatus: anAlive, memberId: anMemberId || undefined,
      })
      setAnResult({ ok: data.success, msg: data.message || (data.success ? 'تمت الإضافة' : 'فشل') })
      if (data.success) {
        setAnParentId(''); setAnName(''); setAnMemberId(''); setAnAlive('حي')
        try {
          const td = await callTree({ action: 'getFamilyTree' })
          if (td.success && td.tree?.length) setAmFlatTree(buildFlatTree(td.tree))
        } catch { /* ignore */ }
      }
    } catch { setAnResult({ ok: false, msg: 'خطأ في الاتصال' }) }
    finally { setAnLoading(false) }
  }

  /* جلب قائمة الفروع المؤرشفة حاليًا (لعرضها + استعادتها) — بلا شرط، دائمًا
     يجلب نسخة طازجة (استُخدمت "دالة تحميل مرة واحدة" منفصلة أدناه لفتح
     التبويب فقط؛ الاعتماد عليها هنا بعد الأرشفة كان يسبب علّة إغلاق قديم
     (stale closure) — archListLoaded باللحظة التي أُنشئت فيها الدالة يبقى
     "true" رغم استدعاء setArchListLoaded(false) قبلها مباشرة بنفس الدالة،
     فيُلغى التحديث ولا تظهر القائمة الجديدة) */
  const fetchArchivedBranches = async () => {
    try {
      const data = await callTree({ action: 'getArchivedBranches' })
      if (data.success) { setArchivedBranches(data.branches || []); setArchListLoaded(true) }
    } catch { /* ignore */ }
  }
  const loadArchivedBranches = () => {
    if (archListLoaded) return
    fetchArchivedBranches()
  }

  /* أرشفة فرع (يتطلب ضغطًا مرتين للتأكيد — نفس نمط "احذف جد") */
  const handleArchiveBranch = async () => {
    if (!archNodeId) return setArchResult({ ok: false, msg: 'اختر الفرع المراد أرشفته' })
    if (!archConfirm) { setArchConfirm(true); return }
    setArchLoading(true); setArchResult(null)
    try {
      const data = await callTree({ action: 'archiveBranch', nodeId: archNodeId })
      setArchResult({ ok: data.success, msg: data.message || (data.success ? 'تمت الأرشفة' : 'فشل') })
      if (data.success) {
        setArchNodeId(''); setArchConfirm(false)
        try {
          const td = await callTree({ action: 'getFamilyTree' })
          if (td.success && td.tree?.length) setAmFlatTree(buildFlatTree(td.tree))
        } catch { /* ignore */ }
        fetchArchivedBranches()
      }
    } catch { setArchResult({ ok: false, msg: 'خطأ في الاتصال' }) }
    finally { setArchLoading(false) }
  }

  /* استعادة فرع مؤرشف */
  const handleRestoreBranch = async (nodeId) => {
    setRestoringId(nodeId)
    try {
      const data = await callTree({ action: 'restoreBranch', nodeId })
      if (data.success) {
        setArchivedBranches(prev => prev.filter(b => b.nodeId !== nodeId))
        try {
          const td = await callTree({ action: 'getFamilyTree' })
          if (td.success && td.tree?.length) setAmFlatTree(buildFlatTree(td.tree))
        } catch { /* ignore */ }
      } else {
        setArchResult({ ok: false, msg: data.message || 'تعذّرت الاستعادة' })
      }
    } catch { setArchResult({ ok: false, msg: 'خطأ في الاتصال' }) }
    finally { setRestoringId('') }
  }

  /* اختيار عضو لتغيير صورته — يجلب صورته الحالية (إن وُجدت) للمعاينة قبل الرفع */
  const handlePhSelectNode = (nodeId) => {
    setPhNodeId(nodeId)
    setPhError('')
    const node = amFlatTree.find(n => n.id === nodeId)
    setPhCurrentUrl(node?.photoUrl || '')
  }

  /* ضغط الصورة قبل الرفع (نفس أسلوب MemberDashboard.jsx بالضبط — حد أقصى
     400px وجودة 0.82 — لتوحيد حجم الصور المخزَّنة بالباكت بلا فرق حسب من رفعها */
  const compressImage = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const MAX = 400
        const ratio  = Math.min(MAX / img.width, MAX / img.height, 1)
        const canvas = document.createElement('canvas')
        canvas.width  = Math.round(img.width  * ratio)
        canvas.height = Math.round(img.height * ratio)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  /* رفع صورة لعضو آخر (صلاحية المدير مدعومة أصلاً بدالة upload-member-photo) */
  const handlePhUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !phNodeId) return
    setPhUploading(true); setPhError('')
    try {
      const dataUrl = await compressImage(file)
      const base64  = dataUrl.split(',')[1]
      const res = await callFunction('upload-member-photo', { nodeId: phNodeId, base64, mimeType: 'image/jpeg' })
      if (res.success) {
        setPhCurrentUrl(res.photoUrl)
        // تحديث النسخة المحلية بالذاكرة فورًا لتبقى متطابقة لو أُعيد فتح
        // نفس القائمة بلا حاجة لإعادة تحميل الشجرة كاملة من الخادم
        setAmFlatTree(prev => prev.map(n => n.id === phNodeId ? { ...n, photoUrl: res.photoUrl } : n))
      } else {
        setPhError(res.message || 'فشل رفع الصورة')
      }
    } catch { setPhError('خطأ في الاتصال') }
    finally { setPhUploading(false); e.target.value = '' }
  }

  /* البيانات المُشتقة */
  // رابط مباشر لصفحة الاستخدام الحقيقية بلوحة Supabase (حجم القاعدة، نقل
  // البيانات، التخزين) — هذي الأرقام تبقى هناك دائمًا (المصدر الأدق)، بدل
  // تكرارها هنا بشكل أقل دقة
  const SUPABASE_USAGE_URL = 'https://supabase.com/dashboard/project/smdyaausztnoghcuclfl/settings/billing/usage'

  const jobStats       = treeStats?.jobStats    ?? {}
  const totalEmployees = jobStats['موظف']        ?? 0
  const totalStudents  = jobStats['طالب']        ?? 0
  const totalRetirees  = jobStats['متقاعد']      ?? 0

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
          <p className="mt-2 font-nav text-gray-400">مرحباً {user?.firstName} — {today}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <a href={SUPABASE_USAGE_URL} target="_blank" rel="noopener noreferrer"
            className="font-nav text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5"
            style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 20V10M12 20V4M6 20v-6"/>
            </svg>
            إحصائيات
          </a>
          <button onClick={() => toggleSec('adminProfile')}
            className="font-nav text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5"
            style={{
              background: openSec.adminProfile ? 'rgba(198,161,107,0.15)' : 'rgba(255,255,255,0.04)',
              border:     openSec.adminProfile ? '1px solid rgba(198,161,107,0.4)' : '1px solid rgba(255,255,255,0.08)',
              color:      openSec.adminProfile ? 'var(--gold-main)' : 'rgba(255,255,255,0.72)',
            }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/>
            </svg>
            بيانات المدير
          </button>
          <button onClick={handleExportBackup} disabled={backupLoading}
            className="font-nav text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 disabled:opacity-50"
            style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {backupLoading ? 'جاري السحب...' : 'نسخة احتياطية'}
          </button>
          <button onClick={() => setOpenSec(p => Object.fromEntries(Object.keys(p).map(k => [k, true])))}
            className="font-nav text-xs px-3 py-1.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.72)' }}>
            فتح الكل
          </button>
          <button onClick={() => setOpenSec(p => Object.fromEntries(Object.keys(p).map(k => [k, false])))}
            className="font-nav text-xs px-3 py-1.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.72)' }}>
            طي الكل
          </button>
        </div>
      </div>

      {/* ══ الصف الأول — إحصائيات العائلة الحقيقية ══ */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'إجمالي الأعضاء',      value: stats?.totalMembers,          color: 'var(--gold-main)', bg: 'rgba(198,161,107,0.08)', border: 'rgba(198,161,107,0.22)' },
          { label: 'أعضاء نشطون',         value: stats?.activeMembers,         color: '#4ade80',           bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.22)' },
          { label: 'طلبات تسجيل معلّقة',  value: stats?.pendingRegistrations,  color: '#fbbf24',           bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.22)' },
          { label: 'الصناديق',            value: stats?.totalFunds,            color: '#60a5fa',           bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.22)' },
          { label: 'المقالات',            value: stats?.totalArticles,         color: '#a78bfa',           bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.22)' },
        ].map(c => (
          <div key={c.label} className="rounded-2xl sm:rounded-[24px] p-4 sm:p-5 text-center"
            style={{ background: c.bg, border: `1px solid ${c.border}`, boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>
            <p className="text-2xl sm:text-4xl font-black tabular-nums" style={{ color: c.color }}>
              {statsLoading ? '—' : (c.value ?? 0).toLocaleString('ar')}
            </p>
            <p className="font-nav text-[11px] sm:text-xs mt-2 text-gray-400">{c.label}</p>
          </div>
        ))}
      </div>

      {/* ══ المتواجدون الآن + عدّاد الزيارات ══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

        {/* المتواجدون الآن — نشاط حقيقي (نبض دوري كل دقيقة)، بلا أي بيانات وهمية */}
        <div className="rounded-2xl sm:rounded-[28px] p-4 sm:p-6" style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.18)', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="font-nav text-sm text-gray-400">المتواجدون الآن</p>
            <span className="w-2 h-2 rounded-full" style={{ background: '#4ade80', boxShadow: '0 0 8px #4ade8088' }} />
          </div>
          <p className="text-4xl font-black tabular-nums" style={{ color: '#4ade80' }}>
            {onlineMembers ? onlineMembers.count : '—'}
          </p>
          {onlineMembers?.members?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {onlineMembers.members.map((m, i) => (
                <span key={i} className="font-nav text-[11px] px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.22)', color: '#86efac' }}>
                  {m.name}
                </span>
              ))}
            </div>
          )}
          <p className="mt-3 font-nav text-[11px] text-gray-600">نشطون خلال آخر دقيقتين — يُحدَّث تلقائيًا</p>
        </div>

        {/* عدّاد زيارات الموقع */}
        <div className="rounded-2xl sm:rounded-[28px] p-4 sm:p-6" style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>
          <p className="font-nav text-sm text-gray-400 mb-4">زيارات الموقع</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'اليوم', value: visitStats?.today },
              { label: 'آخر 7 أيام', value: visitStats?.last7Days },
              { label: 'الإجمالي', value: visitStats?.total },
            ].map(v => (
              <div key={v.label} className="text-center">
                <p className="text-2xl font-black tabular-nums text-indigo-400 tabular-nums">
                  {visitStats ? (v.value ?? 0).toLocaleString('ar') : '—'}
                </p>
                <p className="font-nav text-[10px] mt-1 text-gray-500">{v.label}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ══════════════════════════════════════
          بيانات المدير الشخصية
         ══════════════════════════════════════ */}
      <div className="rounded-2xl sm:rounded-[28px] p-4 sm:p-7" style={{ background: 'rgba(198,161,107,0.07)', border: '1px solid rgba(198,161,107,0.18)', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>

        <div className="flex items-start justify-between cursor-pointer" onClick={() => toggleSec('adminProfile')}>
          <div>
            <p className="font-nav text-sm text-gray-400 mb-1">بيانات المدير الشخصية</p>
            {openSec.adminProfile && <p className="font-nav text-xs text-gray-600">بياناتك الشخصية وتغيير كلمة المرور</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(198,161,107,0.1)', border: '1px solid rgba(198,161,107,0.25)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="var(--gold-main)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/>
              </svg>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.62)" strokeWidth="2"
              style={{ transform: openSec.adminProfile ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>

        <div style={{ display: openSec.adminProfile ? 'block' : 'none' }}>
          <div className="mt-5 divide-y divide-white/[0.06]">
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
            {regResult.whatsappLink && (
              <a href={regResult.whatsappLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 mt-3 py-2.5 rounded-xl font-bold transition-all hover:opacity-90"
                style={{ background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.35)', color: '#25d366' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                إرسال ترحيب عبر واتساب
              </a>
            )}
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
                        onClick={() => handleRegAction(req, 'approveRequest')}
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
                        {trunkNodes.map(n => (
                          <option key={n.id} value={TRUNK_PREFIX + n.id}>⬆ {n.name} — أب مباشر (فخذ جديد)</option>
                        ))}
                        {amBranches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                      </select>
                      {editCascade.map((level, i) => (
                        <div key={i}>
                          <p className="font-nav text-[10px] text-gray-500 mb-1">{level.label}</p>
                          <select className="form-input text-xs" value={level.selectedId}
                            onChange={e => handleEditCascadeChange(i, e.target.value)}>
                            <option value="">— اتركه فارغاً لاختيار الأب الحالي —</option>
                            {level.options.map(n => <option key={n.id} value={n.id}>{nodeFullName(n)}</option>)}
                          </select>
                        </div>
                      ))}
                      {editFields['رقم عقدة الأب'] && (
                        <p className="font-nav text-[10px] px-3 py-1.5 rounded-xl"
                          style={{ background: 'rgba(198,161,107,0.1)', color: 'var(--gold-main)' }}>
                          الأب المختار: {nodeFullName(amFlatTree.find(n => n.id === editFields['رقم عقدة الأب']) || {}) || editFields['رقم عقدة الأب']}
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

                    {/* تسلسل عائلي — كامل من الشجرة الحقيقية (req.fullLineage، بأي عدد
                        مستويات) إن كان الطلب مرتبطًا بعقدة شجرة فعلية؛ وإلا سقوط
                        احتياطي للحقول النصية الأربعة المكتوبة يدويًا وقت التسجيل */}
                    {(req.fullLineage?.length ? req.fullLineage : [req.branch, req.grandName, req.fatherName, req.name].filter(Boolean)).length > 0 && (
                      <div>
                        <p className="font-nav text-[10px] text-gray-500 mb-2">التسلسل العائلي</p>
                        <div className="flex items-center gap-1 flex-wrap" style={{ direction: 'rtl' }}>
                          {(req.fullLineage?.length ? req.fullLineage : [req.branch, req.grandName, req.fatherName, req.name].filter(Boolean)).map((node, idx, arr) => (
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
                {trunkNodes.map(n => (
                  <option key={n.id} value={TRUNK_PREFIX + n.id}>⬆ {n.name} — أب مباشر (فخذ جديد)</option>
                ))}
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
                    {level.options.map(n => <option key={n.id} value={n.id}>{nodeFullName(n)}</option>)}
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
          إضافة عضو لفرع مؤرشف — بطاقة مستقلة تمامًا للمدير فقط (البند 4).
          الفروع المؤرشفة لم تعد تظهر في نموذج التسجيل الذاتي ولا أي أداة
          أخرى بلوحة المدير (البند 5) — هذه البطاقة هي الطريقة الوحيدة
          لإضافة عضو تحت فرع مؤرشف
         ══════════════════════════════════════ */}
      <div className="rounded-2xl sm:rounded-[28px] p-4 sm:p-7" style={{ background: 'rgba(107,114,128,0.08)', border: '1px solid rgba(107,114,128,0.25)', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>

        <div className="flex items-start justify-between cursor-pointer" onClick={() => toggleSec('addArchivedMember')}>
          <div>
            <p className="font-nav text-sm text-gray-400 mb-1">إضافة عضو لفرع مؤرشف</p>
            {openSec.addArchivedMember && <p className="font-nav text-xs text-gray-600">للمدير فقط — الفروع المؤرشفة لا تظهر بنموذج التسجيل الذاتي، فيُضاف أعضاؤها الجدد يدويًا من هنا</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(107,114,128,0.12)', border: '1px solid rgba(107,114,128,0.3)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 8v6M23 11h-6"/>
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
              </svg>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.62)" strokeWidth="2"
              style={{ transform: openSec.addArchivedMember ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>

        <div style={{ display: openSec.addArchivedMember ? 'block' : 'none' }}>

        {/* يفتح صفحة الشجرة الحقيقية بتبويب جديد (بدل تضمينها كمكوّن متداخل
            داخل نافذة منبثقة — أبسط وأثبت لصفحة كاملة الشاشة أصلًا بتصميمها).
            includeArchived=1 لا يُفعِّل شيئًا فعليًا إلا للمدير (تحقق خادم).
            import.meta.env.BASE_URL لازم (نفس basename بـRouter.jsx) لأن
            الموقع منشور تحت مسار فرعي (GitHub Pages) وليس جذر النطاق */}
        <a href={`${import.meta.env.BASE_URL}family-tree?includeArchived=1`} target="_blank" rel="noopener noreferrer"
          className="mt-4 inline-block font-nav text-xs py-2.5 px-4 rounded-xl transition-all duration-200"
          style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', color: '#a78bfa' }}>
          عرض شجرة المؤرشفين ↗
        </a>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <AmField label="الاسم الأول *">
            <input className="form-input"
              placeholder={amArchData.aliveStatus === 'متوفى' ? 'اسم المتوفى' : 'محمد'}
              value={amArchData.firstName}
              onChange={e => setAmArchData(p => ({ ...p, firstName: e.target.value }))} />
          </AmField>
        </div>

        {amArchData.aliveStatus !== 'متوفى' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <AmField label="رقم الهوية (اختياري)">
              <input className="form-input" placeholder="10 أرقام" inputMode="numeric" maxLength={10}
                value={amArchData.nationalId}
                onChange={e => setAmArchData(p => ({ ...p, nationalId: normalizeDigits(e.target.value) }))} />
            </AmField>
            <AmField label="رقم الجوال (اختياري)">
              <PhoneInput
                value={amArchData.phone}
                onChange={val => setAmArchData(p => ({ ...p, phone: val }))}
                countryCode={amArchPhoneCountry}
                onCountryChange={setAmArchPhoneCountry}
              />
            </AmField>
          </div>
        )}

        <div className="mt-4 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="font-nav text-xs text-gray-500 mb-3">الأب (من الفروع المؤرشفة فقط)</p>
          {amArchTreeLoading ? (
            <p className="font-nav text-xs text-gray-600">جاري تحميل الشجرة...</p>
          ) : (
            <SearchableSelect
              options={amArchOptions}
              value={amArchData.parentNodeId}
              onChange={handleArchParentChange}
              getId={n => n.id}
              getLabel={n => nodeOptionLabel(n)}
              emptyLabel="— اختر من الفروع المؤرشفة —"
            />
          )}
          {amArchData.parentName && (
            <p className="font-nav text-[10px] mt-2" style={{ color: 'rgba(255,255,255,0.55)' }}>
              الفخذ: <span style={{ color: '#9ca3af' }}>{amArchData.branch || '—'}</span>
            </p>
          )}
        </div>

        {amArchData.aliveStatus !== 'متوفى' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            <AmField label="كلمة المرور المؤقتة (اختياري)">
              <PasswordInput className="form-input" placeholder="6 أحرف على الأقل"
                value={amArchData.tempPassword}
                onChange={e => setAmArchData(p => ({ ...p, tempPassword: e.target.value }))} />
            </AmField>

            <AmField label="الحالة الاجتماعية">
              <select className="form-input" value={amArchData.maritalStatus}
                onChange={e => setAmArchData(p => ({ ...p, maritalStatus: e.target.value }))}>
                <option value="">— اختر —</option>
                {MARITAL_LIST.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </AmField>

            <AmField label="المهنة">
              <select className="form-input" value={amArchData.job}
                onChange={e => setAmArchData(p => ({ ...p, job: e.target.value }))}>
                <option value="">— اختر —</option>
                {JOBS_LIST.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </AmField>

            {amArchData.job === 'أخرى' && (
              <AmField label="اذكر المهنة">
                <input className="form-input" placeholder="مثال: مقاول" value={amArchData.jobOther}
                  onChange={e => setAmArchData(p => ({ ...p, jobOther: e.target.value }))} />
              </AmField>
            )}

            <AmField label="المدينة">
              <input className="form-input" placeholder="الرياض" value={amArchData.city}
                onChange={e => setAmArchData(p => ({ ...p, city: e.target.value }))} />
            </AmField>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="mb-2 font-nav text-xs text-gray-500">الدور</p>
            <div className="flex gap-2">
              {ROLES_LIST.map(r => (
                <button key={r} type="button"
                  onClick={() => setAmArchData(p => ({ ...p, role: r }))}
                  className="flex-1 font-nav text-xs py-2.5 rounded-2xl transition-all duration-200"
                  style={{
                    background: amArchData.role === r ? 'rgba(107,114,128,0.15)' : 'rgba(255,255,255,0.03)',
                    border:     amArchData.role === r ? '1px solid rgba(107,114,128,0.4)' : '1px solid rgba(255,255,255,0.08)',
                    color:      amArchData.role === r ? '#9ca3af' : 'rgba(255,255,255,0.70)',
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
                  onClick={() => setAmArchData(p => ({ ...p, aliveStatus: val }))}
                  className="flex-1 font-nav text-sm py-2.5 rounded-2xl transition-all duration-200"
                  style={{
                    background: amArchData.aliveStatus === val
                      ? (val === 'حي' ? 'rgba(34,197,94,0.15)' : 'rgba(107,114,128,0.15)')
                      : 'rgba(255,255,255,0.03)',
                    border: amArchData.aliveStatus === val
                      ? (val === 'حي' ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(107,114,128,0.4)')
                      : '1px solid rgba(255,255,255,0.08)',
                    color: amArchData.aliveStatus === val
                      ? (val === 'حي' ? '#4ade80' : '#9ca3af')
                      : 'rgba(255,255,255,0.70)',
                  }}>
                  {val === 'حي' ? '🟢 حي' : '⬜ متوفى'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {amArchResult && (
          <div className="mt-5 px-4 py-3 rounded-2xl font-nav text-sm"
            style={{
              background: amArchResult.success ? 'rgba(34,197,94,0.08)'  : 'rgba(239,68,68,0.08)',
              border:     amArchResult.success ? '1px solid rgba(34,197,94,0.22)' : '1px solid rgba(239,68,68,0.22)',
              color:      amArchResult.success ? '#4ade80' : '#f87171',
            }}>
            {amArchResult.message}
          </div>
        )}

        <button onClick={handleAddArchivedMember} disabled={amArchLoading}
          className="mt-5 font-nav text-sm py-3 px-8 rounded-2xl font-bold transition-all duration-200 disabled:opacity-50"
          style={{ background: 'rgba(107,114,128,0.16)', border: '1px solid rgba(107,114,128,0.4)', color: '#d1d5db' }}>
          {amArchLoading ? 'جاري الإضافة...' : 'إضافة العضو'}
        </button>

        </div>
      </div>

      {/* ══════════════════════════════════════
          صورة العضو — تُخزَّن الآن في Supabase Storage بدل Google Drive
          سابقًا. الرفع لعضو آخر مدعوم أصلاً بدالة upload-member-photo
          (صلاحية مدير)، لكن لم تكن له واجهة بلوحة المدير قبل الآن
         ══════════════════════════════════════ */}
      <div className="rounded-2xl sm:rounded-[28px] p-4 sm:p-7" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>

        <div className="flex items-start justify-between cursor-pointer"
          onClick={() => toggleSec('memberPhoto')}>
          <div>
            <p className="font-nav text-sm text-gray-400 mb-1">صورة عضو الشجرة</p>
            {openSec.memberPhoto && <p className="font-nav text-xs text-gray-600">رفع أو تغيير الصورة لأي فرد بالشجرة — حتى الأجداد المتوفين بلا حساب عضوية</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3"/>
                <circle cx="9" cy="9" r="2"/>
                <path d="m21 15-5-5L5 21"/>
              </svg>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.62)" strokeWidth="2"
              style={{ transform: openSec.memberPhoto ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>

        <div style={{ display: openSec.memberPhoto ? 'block' : 'none' }}>
          <div className="mt-5 max-w-sm space-y-4">
            <div>
              <label className="block mb-1.5 font-nav text-xs text-gray-500">اختر من الشجرة * (يشمل الأجداد المتوفين وغير المسجَّلين)</label>
              <SearchableSelect
                options={amFlatTree.filter(n => !n.isChildRecord)}
                value={phNodeId}
                onChange={id => handlePhSelectNode(id)}
                getId={n => n.id}
                getLabel={n => nodeOptionLabel(n)}
                emptyLabel="— اختر من الشجرة —"
              />
            </div>

            {phNodeId && (
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(59,130,246,0.08)', border: '2px solid rgba(59,130,246,0.3)' }}>
                  {phCurrentUrl ? (
                    <img src={phCurrentUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(96,165,250,0.55)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/>
                    </svg>
                  )}
                </div>
                <label htmlFor="admin-photo-upload"
                  className="font-nav text-sm py-2.5 px-5 rounded-2xl font-bold transition-all duration-200 cursor-pointer disabled:opacity-50"
                  style={{ background: 'rgba(59,130,246,0.14)', border: '1px solid rgba(59,130,246,0.35)', color: '#60a5fa' }}>
                  {phUploading ? 'جاري الرفع...' : 'اختيار صورة ورفعها'}
                </label>
                <input id="admin-photo-upload" type="file" accept="image/*" className="hidden"
                  disabled={phUploading} onChange={handlePhUpload} />
              </div>
            )}

            {phError && (
              <div className="px-4 py-3 rounded-2xl font-nav text-sm"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                {phError}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          إدارة الشجرة العائلية (4 تبويبات)
         ══════════════════════════════════════ */}
      <div className="rounded-2xl sm:rounded-[28px] p-4 sm:p-7" style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.18)', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>

        <div className="flex items-start justify-between cursor-pointer" onClick={() => toggleSec('treeManage')}>
          <div>
            <p className="font-nav text-sm text-gray-400 mb-1">إدارة الشجرة العائلية</p>
            {openSec.treeManage && <p className="font-nav text-xs text-gray-600">تعديل وحذف وإدراج الأجداد في الشجرة</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(168,85,247,0.8)" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
              </svg>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.62)" strokeWidth="2"
              style={{ transform: openSec.treeManage ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>

        <div style={{ display: openSec.treeManage ? 'block' : 'none' }}>

          {/* التبويبات */}
          <div className="flex gap-2 mt-5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {[
              { key: 'edit',    label: 'تعديل اسم الجد' },
              { key: 'delete',  label: 'احذف جد' },
              { key: 'insert',  label: 'إدراج جد وسيط' },
              { key: 'root',    label: 'إضافة فوق الجذر' },
              { key: 'move',    label: 'نقل عضو' },
              { key: 'addNode', label: 'إضافة عقدة' },
              { key: 'archive', label: 'أرشفة فرع' },
            ].map(t => (
              <button key={t.key} onClick={() => {
                setTreeManageTab(t.key)
                if (t.key === 'addNode') loadAllMembersForTree()
                if (t.key === 'archive') loadArchivedBranches()
              }}
                className="font-nav text-xs py-2 px-4 rounded-xl transition-all duration-200"
                style={{
                  background: treeManageTab === t.key ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.04)',
                  border:     treeManageTab === t.key ? '1px solid rgba(168,85,247,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  color:      treeManageTab === t.key ? '#c084fc' : 'rgba(255,255,255,0.7)',
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* تعديل اسم الجد */}
          {treeManageTab === 'edit' && (
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 font-nav text-xs text-gray-500">العقدة المراد تعديلها *</label>
                  <SearchableSelect
                    options={amFlatTree.filter(n => !n.isChildRecord)}
                    value={eaTargetId}
                    onChange={id => setEaTargetId(id)}
                    getId={n => n.id}
                    getLabel={n => nodeOptionLabel(n)}
                    emptyLabel="— اختر من الشجرة —"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 font-nav text-xs text-gray-500">الاسم الجديد</label>
                  <input className="form-input" placeholder="اتركه فارغاً للاحتفاظ بالاسم" value={eaName}
                    onChange={e => setEaName(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block mb-1.5 font-nav text-xs text-gray-500">
                  تاريخ الترتيب بين الإخوة <span className="text-gray-600">(اختياري — الأكبر يظهر يمينًا)</span>
                </label>
                <input type="date" className="form-input" value={eaOrderDate}
                  onChange={e => setEaOrderDate(e.target.value)} />
                <p className="font-nav text-[10px] text-gray-600 mt-1.5">
                  للعضو المسجَّل: تُستخدَم تلقائيًا من تاريخ ميلاده الحقيقي بلا حاجة لتعبئة هذا الحقل. للجد المتوفى/غير المسجَّل بلا تاريخ ميلاد معروف: أدخل أي تاريخ تقريبي يضعه بالترتيب الصحيح بين إخوته (ليس شرطًا تاريخه الحقيقي).
                </p>
              </div>
              <div>
                <p className="font-nav text-xs text-gray-500 mb-2">الحالة الجديدة</p>
                <div className="flex gap-3">
                  {[
                    { val: '',       label: 'بدون تغيير' },
                    { val: 'حي',     label: '🟢 حي' },
                    { val: 'متوفى',  label: '⬜ متوفى' },
                  ].map(({ val, label }) => (
                    <button key={val || 'keep'} type="button" onClick={() => setEaStatus(val)}
                      className="flex-1 font-nav text-sm py-2.5 rounded-2xl transition-all duration-200"
                      style={{
                        background: eaStatus === val ? (val === 'حي' ? 'rgba(34,197,94,0.15)' : val === 'متوفى' ? 'rgba(107,114,128,0.15)' : 'rgba(255,255,255,0.08)') : 'rgba(255,255,255,0.03)',
                        border:     eaStatus === val ? (val === 'حي' ? '1px solid rgba(34,197,94,0.4)' : val === 'متوفى' ? '1px solid rgba(107,114,128,0.4)' : '1px solid rgba(255,255,255,0.2)') : '1px solid rgba(255,255,255,0.08)',
                        color:      eaStatus === val ? (val === 'حي' ? '#4ade80' : val === 'متوفى' ? '#9ca3af' : '#fff') : 'rgba(255,255,255,0.70)',
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {eaResult && (
                <div className="px-4 py-3 rounded-2xl font-nav text-sm"
                  style={{ background: eaResult.ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: eaResult.ok ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(239,68,68,0.2)', color: eaResult.ok ? '#4ade80' : '#f87171' }}>
                  {eaResult.msg}
                </div>
              )}
              <button onClick={handleEditAncestor} disabled={eaLoading}
                className="font-nav text-sm py-3 px-8 rounded-2xl font-bold transition-all duration-200 disabled:opacity-50"
                style={{ background: 'rgba(198,161,107,0.14)', border: '1px solid rgba(198,161,107,0.35)', color: 'var(--gold-main)' }}>
                {eaLoading ? 'جاري التعديل...' : 'حفظ التعديل'}
              </button>
            </div>
          )}

          {/* احذف جد */}
          {treeManageTab === 'delete' && (
            <div className="mt-5 space-y-4">
              <div className="p-4 rounded-2xl" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <p className="font-nav text-xs" style={{ color: 'rgba(252,165,165,0.85)' }}>
                  تحذير: عند حذف جد، ينتقل أبناؤه إلى جده وتُضبط مستويات الجيل تلقائياً.
                </p>
              </div>
              <div>
                <label className="block mb-1.5 font-nav text-xs text-gray-500">العقدة المراد حذفها *</label>
                <SearchableSelect
                  options={amFlatTree.filter(n => !n.isChildRecord)}
                  value={daTargetId}
                  onChange={id => { setDaTargetId(id); setDaConfirm(false) }}
                  getId={n => n.id}
                  getLabel={n => nodeOptionLabel(n)}
                  emptyLabel="— اختر من الشجرة —"
                />
              </div>
              {daConfirm && (
                <div className="px-4 py-3 rounded-2xl font-nav text-sm"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                  هل أنت متأكد من حذف &quot;{nodeFullName(amFlatTree.find(n => n.id === daTargetId) || {})}&quot;؟ اضغط مرة أخرى للتأكيد.
                </div>
              )}
              {daResult && (
                <div className="px-4 py-3 rounded-2xl font-nav text-sm"
                  style={{ background: daResult.ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: daResult.ok ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(239,68,68,0.2)', color: daResult.ok ? '#4ade80' : '#f87171' }}>
                  {daResult.msg}
                </div>
              )}
              <button onClick={handleDeleteAncestor} disabled={daLoading}
                className="font-nav text-sm py-3 px-8 rounded-2xl font-bold transition-all duration-200 disabled:opacity-50"
                style={{ background: daConfirm ? 'rgba(239,68,68,0.16)' : 'rgba(239,68,68,0.08)', border: `1px solid rgba(239,68,68,${daConfirm ? 0.4 : 0.22})`, color: '#f87171' }}>
                {daLoading ? 'جاري الحذف...' : daConfirm ? 'تأكيد الحذف' : 'حذف الجد'}
              </button>
            </div>
          )}

          {/* إدراج جد وسيط */}
          {treeManageTab === 'insert' && (
            <div className="mt-5 space-y-4">
              <div className="p-4 rounded-2xl" style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.2)' }}>
                <p className="font-nav text-xs" style={{ color: 'rgba(216,180,254,0.85)' }}>
                  مثال: لإضافة "صاحب" بين إبراهيم وأحمد — اختر "أحمد" من القائمة واكتب "صاحب". سيصبح أحمد وفرعه كله أبناء صاحب.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 font-nav text-xs text-gray-500">العقدة التي ستصبح ابناً *</label>
                  <SearchableSelect
                    options={amFlatTree.filter(n => !n.isChildRecord)}
                    value={iaaTargetId}
                    onChange={id => setIaaTargetId(id)}
                    getId={n => n.id}
                    getLabel={n => nodeOptionLabel(n)}
                    emptyLabel="— اختر من الشجرة —"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 font-nav text-xs text-gray-500">اسم الجد الوسيط *</label>
                  <input className="form-input" placeholder="مثال: صاحب" value={iaaName}
                    onChange={e => setIaaName(e.target.value)} />
                </div>
              </div>
              <div>
                <p className="font-nav text-xs text-gray-500 mb-2">الحالة</p>
                <div className="flex gap-3">
                  {['حي', 'متوفى'].map(val => (
                    <button key={val} type="button" onClick={() => setIaaAlive(val)}
                      className="flex-1 font-nav text-sm py-2.5 rounded-2xl transition-all duration-200"
                      style={{
                        background: iaaAlive === val ? (val === 'حي' ? 'rgba(34,197,94,0.15)' : 'rgba(107,114,128,0.15)') : 'rgba(255,255,255,0.03)',
                        border:     iaaAlive === val ? (val === 'حي' ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(107,114,128,0.4)') : '1px solid rgba(255,255,255,0.08)',
                        color:      iaaAlive === val ? (val === 'حي' ? '#4ade80' : '#9ca3af') : 'rgba(255,255,255,0.70)',
                      }}>
                      {val === 'حي' ? '🟢 حي' : '⬜ متوفى'}
                    </button>
                  ))}
                </div>
              </div>
              {iaaResult && (
                <div className="px-4 py-3 rounded-2xl font-nav text-sm"
                  style={{ background: iaaResult.success ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: iaaResult.success ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(239,68,68,0.2)', color: iaaResult.success ? '#4ade80' : '#f87171' }}>
                  {iaaResult.message}
                </div>
              )}
              <button onClick={handleInsertAncestorAbove} disabled={iaaLoading}
                className="font-nav text-sm py-3 px-8 rounded-2xl font-bold transition-all duration-200 disabled:opacity-50"
                style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.35)', color: '#c084fc' }}>
                {iaaLoading ? 'جاري الإدراج...' : 'إدراج الجد الوسيط'}
              </button>
            </div>
          )}

          {/* إضافة جد فوق الجذر */}
          {treeManageTab === 'root' && (
            <div className="mt-5 space-y-4">
              <div className="p-4 rounded-2xl" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <p className="font-nav text-xs" style={{ color: 'rgba(252,165,165,0.85)' }}>
                  تحذير: هذا الإجراء يُعيد ترقيم مستويات الجيل لجميع العقد في الشجرة. لا تُكرّره إلا إذا كنت تضيف جداً جديداً فعلاً.
                </p>
              </div>
              <div>
                <label className="block mb-1.5 font-nav text-xs text-gray-500">اسم الجد *</label>
                <input className="form-input" placeholder="مثال: سالم" value={raName}
                  onChange={e => setRaName(e.target.value)} />
              </div>
              <div>
                <p className="font-nav text-xs text-gray-500 mb-2">الحالة</p>
                <div className="flex gap-3">
                  {['حي', 'متوفى'].map(val => (
                    <button key={val} type="button" onClick={() => setRaAlive(val)}
                      className="flex-1 font-nav text-sm py-2.5 rounded-2xl transition-all duration-200"
                      style={{
                        background: raAlive === val ? (val === 'حي' ? 'rgba(34,197,94,0.15)' : 'rgba(107,114,128,0.15)') : 'rgba(255,255,255,0.03)',
                        border:     raAlive === val ? (val === 'حي' ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(107,114,128,0.4)') : '1px solid rgba(255,255,255,0.08)',
                        color:      raAlive === val ? (val === 'حي' ? '#4ade80' : '#9ca3af') : 'rgba(255,255,255,0.70)',
                      }}>
                      {val === 'حي' ? '🟢 حي' : '⬜ متوفى'}
                    </button>
                  ))}
                </div>
              </div>
              {raResult && (
                <div className="px-4 py-3 rounded-2xl font-nav text-sm"
                  style={{ background: raResult.success ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: raResult.success ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(239,68,68,0.2)', color: raResult.success ? '#4ade80' : '#f87171' }}>
                  {raResult.message}
                </div>
              )}
              <button onClick={handleAddRootAncestor} disabled={raLoading}
                className="font-nav text-sm py-3 px-8 rounded-2xl font-bold transition-all duration-200 disabled:opacity-50"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171' }}>
                {raLoading ? 'جاري الإضافة...' : 'إضافة الجد وتحديث الشجرة'}
              </button>
            </div>
          )}

          {treeManageTab === 'move' && (
            <div className="mt-5 space-y-4">
              <div className="p-4 rounded-2xl" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <p className="font-nav text-xs" style={{ color: 'rgba(165,180,252,0.85)' }}>
                  اختر العضو المراد نقله، ثم حدد أباه الجديد من خلال التسلسل الديناميكي — تُحدَّث المسارات والأجيال تلقائياً.
                </p>
              </div>

              {/* العضو المراد نقله */}
              <div>
                <label className="block mb-1.5 font-nav text-xs text-gray-500">العضو المراد نقله *</label>
                <SearchableSelect
                  options={amFlatTree.filter(n => !n.isChildRecord)}
                  value={mvSourceId}
                  onChange={id => { setMvSourceId(id); setMvResult(null) }}
                  getId={n => n.id}
                  getLabel={n => nodeOptionLabel(n)}
                  emptyLabel="— اختر العضو —"
                />
              </div>

              {/* الأب الجديد — محدد تسلسلي ديناميكي */}
              <div className="p-3 rounded-2xl space-y-2"
                style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.18)' }}>
                <p className="font-nav text-[10px]" style={{ color: '#a5b4fc' }}>الأب الجديد</p>
                <select className="form-input text-xs" value={mvBranch} onChange={e => handleMvBranchChange(e.target.value)}>
                  <option value="">— اختر الفخذ —</option>
                  {trunkNodes.map(n => (
                    <option key={n.id} value={TRUNK_PREFIX + n.id}>⬆ {n.name} — أب مباشر (فخذ جديد)</option>
                  ))}
                  {amBranches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
                {mvCascade.map((level, i) => (
                  <div key={i}>
                    <p className="font-nav text-[10px] text-gray-500 mb-1">{level.label}</p>
                    <select className="form-input text-xs" value={level.selectedId}
                      onChange={e => handleMvCascadeChange(i, e.target.value)}>
                      <option value="">— اتركه فارغاً لاختيار هذا المستوى —</option>
                      {level.options.map(n => <option key={n.id} value={n.id}>{nodeFullName(n)}</option>)}
                    </select>
                  </div>
                ))}
                {mvTargetId && (
                  <p className="font-nav text-[10px] px-3 py-1.5 rounded-xl"
                    style={{ background: 'rgba(99,102,241,0.1)', color: '#a5b4fc' }}>
                    الأب الجديد المختار: {nodeFullName(amFlatTree.find(n => n.id === mvTargetId) || {}) || mvTargetId}
                  </p>
                )}
              </div>

              {mvResult && (
                <div className="px-4 py-3 rounded-2xl font-nav text-sm"
                  style={{ background: mvResult.ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: mvResult.ok ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(239,68,68,0.2)', color: mvResult.ok ? '#4ade80' : '#f87171' }}>
                  {mvResult.msg}
                </div>
              )}
              <button onClick={handleMoveTreeNode} disabled={mvLoading}
                className="font-nav text-sm py-3 px-8 rounded-2xl font-bold transition-all duration-200 disabled:opacity-50"
                style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.35)', color: '#a5b4fc' }}>
                {mvLoading ? 'جاري النقل...' : 'نقل العضو'}
              </button>
            </div>
          )}

          {/* إضافة عقدة — تحل حالة "الأب غير موجود بالشجرة": أضف عقدة الأب
              أولاً بلا ربط، ثم عقدة العضو نفسه تحتها مربوطة بحسابه الحقيقي */}
          {treeManageTab === 'addNode' && (
            <div className="mt-5 space-y-4">
              <div className="p-4 rounded-2xl" style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)' }}>
                <p className="font-nav text-xs" style={{ color: 'rgba(167,243,208,0.85)' }}>
                  لربط عضو مُعتمَد بطلب تسجيل لم يُوجد أبوه بالشجرة: أضف عقدة باسم الأب هنا (بلا ربط) تحت الجد، ثم أضف عقدة ثانية باسم العضو تحت الأب الجديد مع اختيار "ربط بعضو حقيقي" لاسمه.
                </p>
              </div>

              <div>
                <label className="block mb-1.5 font-nav text-xs text-gray-500">الأب (تحته تُضاف العقدة الجديدة) *</label>
                <SearchableSelect
                  options={amFlatTree.filter(n => !n.isChildRecord)}
                  value={anParentId}
                  onChange={id => setAnParentId(id)}
                  getId={n => n.id}
                  getLabel={n => nodeOptionLabel(n)}
                  emptyLabel="— اختر من الشجرة —"
                />
              </div>

              <div>
                <label className="block mb-1.5 font-nav text-xs text-gray-500">اسم العقدة الجديدة *</label>
                <input className="form-input" placeholder="مثال: محمد" value={anName} onChange={e => setAnName(e.target.value)} />
              </div>

              <div>
                <label className="block mb-1.5 font-nav text-xs text-gray-500">
                  ربط بعضو حقيقي <span className="text-gray-600">(اختياري — فقط لو العقدة تمثّل عضوًا مسجَّلاً مسبقًا)</span>
                </label>
                <SearchableSelect
                  options={amMembers}
                  value={anMemberId}
                  onChange={id => setAnMemberId(id)}
                  getId={m => m.memberId}
                  getLabel={m => memberFullName(m)}
                  emptyLabel="— بلا ربط (اسم عرض فقط) —"
                />
              </div>

              <div>
                <p className="font-nav text-xs text-gray-500 mb-2">الحالة</p>
                <div className="flex gap-3">
                  {['حي', 'متوفى'].map(val => (
                    <button key={val} type="button" onClick={() => setAnAlive(val)}
                      className="flex-1 font-nav text-sm py-2.5 rounded-2xl transition-all duration-200"
                      style={{
                        background: anAlive === val ? (val === 'حي' ? 'rgba(34,197,94,0.15)' : 'rgba(107,114,128,0.15)') : 'rgba(255,255,255,0.03)',
                        border:     anAlive === val ? (val === 'حي' ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(107,114,128,0.4)') : '1px solid rgba(255,255,255,0.08)',
                        color:      anAlive === val ? (val === 'حي' ? '#4ade80' : '#9ca3af') : 'rgba(255,255,255,0.70)',
                      }}>
                      {val === 'حي' ? '🟢 حي' : '⬜ متوفى'}
                    </button>
                  ))}
                </div>
              </div>

              {anResult && (
                <div className="px-4 py-3 rounded-2xl font-nav text-sm"
                  style={{ background: anResult.ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: anResult.ok ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(239,68,68,0.2)', color: anResult.ok ? '#4ade80' : '#f87171' }}>
                  {anResult.msg}
                </div>
              )}
              <button onClick={handleAddTreeNode} disabled={anLoading}
                className="font-nav text-sm py-3 px-8 rounded-2xl font-bold transition-all duration-200 disabled:opacity-50"
                style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.35)', color: '#34d399' }}>
                {anLoading ? 'جاري الإضافة...' : 'إضافة العقدة'}
              </button>
            </div>
          )}

          {/* أرشفة فرع — بديل آمن قابل للاسترجاع عن الحذف الحقيقي الممنوع */}
          {treeManageTab === 'archive' && (
            <div className="mt-5 space-y-6">
              <div className="p-4 rounded-2xl" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <p className="font-nav text-xs" style={{ color: 'rgba(252,165,165,0.85)' }}>
                  الأرشفة تُخفي الفرع كاملاً عن الجميع فورًا — بلا أي حذف حقيقي وبلا إيقاف أي حساب، وقابلة للاستعادة الكاملة في أي وقت. تسجيل دخول أعضاء الفرع يبقى يعمل طبيعيًا تمامًا، ويرون فرعهم الخاص عند الدخول، بينما لا يظهر لأي شخص آخر.
                </p>
              </div>

              <div className="space-y-4">
                <p className="font-nav text-sm font-semibold" style={{ color: 'var(--gold-main)' }}>أرشفة فرع جديد</p>
                <div>
                  <label className="block mb-1.5 font-nav text-xs text-gray-500">الفرع المراد أرشفته (يشمل كل من تحته) *</label>
                  <SearchableSelect
                    options={amFlatTree.filter(n => !n.isChildRecord)}
                    value={archNodeId}
                    onChange={id => { setArchNodeId(id); setArchConfirm(false); setArchResult(null) }}
                    getId={n => n.id}
                    getLabel={n => nodeOptionLabel(n)}
                    emptyLabel="— اختر من الشجرة —"
                  />
                </div>

                {archConfirm && (
                  <div className="px-4 py-3 rounded-2xl font-nav text-sm"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                    هل أنت متأكد من أرشفة &quot;{nodeFullName(amFlatTree.find(n => n.id === archNodeId) || {})}&quot; وكل من تحته؟ اضغط مرة أخرى للتأكيد.
                  </div>
                )}
                {archResult && (
                  <div className="px-4 py-3 rounded-2xl font-nav text-sm"
                    style={{ background: archResult.ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: archResult.ok ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(239,68,68,0.2)', color: archResult.ok ? '#4ade80' : '#f87171' }}>
                    {archResult.msg}
                  </div>
                )}
                <button onClick={handleArchiveBranch} disabled={archLoading}
                  className="font-nav text-sm py-3 px-8 rounded-2xl font-bold transition-all duration-200 disabled:opacity-50"
                  style={{ background: archConfirm ? 'rgba(239,68,68,0.16)' : 'rgba(239,68,68,0.08)', border: `1px solid rgba(239,68,68,${archConfirm ? 0.4 : 0.22})`, color: '#f87171' }}>
                  {archLoading ? 'جاري الأرشفة...' : archConfirm ? 'تأكيد الأرشفة' : 'أرشفة الفرع'}
                </button>
              </div>

              <div className="pt-2 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="font-nav text-sm font-semibold pt-4" style={{ color: 'var(--gold-main)' }}>الفروع المؤرشفة حاليًا</p>
                {!archivedBranches.length && (
                  <p className="font-nav text-xs text-gray-600">لا توجد فروع مؤرشفة حاليًا</p>
                )}
                {archivedBranches.map(b => (
                  <div key={b.nodeId} className="flex items-center justify-between px-4 py-3 rounded-2xl"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div>
                      <p className="font-nav text-sm font-semibold text-white">{b.name}</p>
                      <p className="font-nav text-[10px] text-gray-500 mt-0.5">
                        {b.nodeCount} عقدة{b.archivedAt ? ` — أُرشِف بتاريخ ${new Date(b.archivedAt).toLocaleDateString('ar-SA')}` : ''}
                      </p>
                    </div>
                    <button onClick={() => handleRestoreBranch(b.nodeId)} disabled={restoringId === b.nodeId}
                      className="font-nav text-xs py-2 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 flex-shrink-0"
                      style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}>
                      {restoringId === b.nodeId ? 'جاري الاستعادة...' : 'استعادة'}
                    </button>
                  </div>
                ))}
              </div>
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

            {/* توزيع المهن */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: 'موظفون',   value: totalEmployees, color: '#60a5fa', bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.22)' },
                { label: 'طلاب',     value: totalStudents,  color: '#34d399', bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.22)' },
                { label: 'متقاعدون', value: totalRetirees,  color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.22)' },
              ].map(c => (
                <div key={c.label} className="rounded-2xl p-4 text-center"
                  style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                  <p className="text-2xl font-black tabular-nums" style={{ color: c.color }}>
                    {treeStatsLoading ? '—' : c.value.toLocaleString('ar')}
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
