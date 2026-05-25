import { useState, useEffect } from 'react'
import PasswordInput from '../components/PasswordInput'
import { normalizeDigits } from '../utils/normalizeInput'

const JOBS = ['مولود', 'طالب', 'موظف', 'رجل أعمال', 'متقاعد']
const MARITAL_STATUS = ['أعزب', 'متزوج', 'أرمل', 'منفصل']
const BRANCHES = [
  { id: 'صاحب', label: 'صاحب' },
  { id: 'شامي', label: 'شامي' },
  { id: 'علي', label: 'علي "سندي"' },
  { id: 'ابراهيم', label: 'إبراهيم "الشقيق"' },
  { id: 'يحيى', label: 'يحيى' }
]

const INITIAL = {
  firstName: '', phone: '', nationalId: '', birthDate: '',
  job: '', maritalStatus: '', password: '', confirmPassword: '',
  selectedBranch: '', selectedFatherId: '', selectedFatherName: ''
}

export default function Register() {
  const [form, setForm] = useState(INITIAL)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  
  const [treeData, setTreeData] = useState(null)
  const [treeLoading, setTreeLoading] = useState(false)
  const [currentPath, setCurrentPath] = useState([])
  const [childrenAtLevel, setChildrenAtLevel] = useState([])
  const [matchingStatus, setMatchingStatus] = useState(null)

  const NUMERIC_FIELDS = ['phone', 'nationalId']
  const set = e => {
    const val = NUMERIC_FIELDS.includes(e.target.name)
      ? normalizeDigits(e.target.value)
      : e.target.value
    setForm(p => ({ ...p, [e.target.name]: val }))
  }

  useEffect(() => {
    loadTree()
  }, [])

  const loadTree = async () => {
    setTreeLoading(true)
    try {
      const res = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'getFamilyTree' })
      })
      const result = await res.json()
      if (result.success && result.tree) {
        setTreeData(result.tree)
        const root = result.tree.find(n => n['الاسم الأول'] === 'إبراهيم' && !n['رقم الأب'])
        if (root) {
          const ahmad = result.tree.find(n => 
            n['الاسم الأول'] === 'أحمد' && n['رقم الأب'] === root['رقم العقدة']
          )
          if (ahmad) {
            setCurrentPath([
              { id: root['رقم العقدة'], name: 'إبراهيم العفريتي', generation: root['الجيل'] },
              { id: ahmad['رقم العقدة'], name: 'أحمد', generation: ahmad['الجيل'] }
            ])
          }
        }
      }
    } catch (err) {
      console.error('خطأ في جلب الشجرة:', err)
    } finally {
      setTreeLoading(false)
    }
  }

  const handleBranchSelect = (branchId) => {
    if (!treeData) return
    setForm(p => ({ ...p, selectedBranch: branchId, selectedFatherId: '', selectedFatherName: '' }))
    setMatchingStatus(null)
    
    const ahmadNode = currentPath[1]
    const branchNode = treeData.find(n => 
      n['الاسم الأول'] === branchId && n['رقم الأب'] === ahmadNode?.id
    )
    
    if (branchNode) {
      const newPath = [
        ...currentPath,
        { id: branchNode['رقم العقدة'], name: branchId, generation: branchNode['الجيل'] }
      ]
      setCurrentPath(newPath)
      loadChildrenAtLevel(branchNode['رقم العقدة'])
    }
  }

  const loadChildrenAtLevel = (nodeId) => {
    if (!treeData) return
    const children = treeData.filter(n => n['رقم الأب'] === nodeId)
    setChildrenAtLevel(children.map(c => ({
      id: c['رقم العقدة'],
      name: c['الاسم الأول'],
      memberId: c['رقم العضو'],
      generation: c['الجيل'],
      isAlive: c['الحالة'] === 'حي'
    })))
  }

  const handleNodeSelect = (node) => {
    const newPath = [...currentPath, node]
    setCurrentPath(newPath)
    loadChildrenAtLevel(node.id)
    setMatchingStatus(null)
  }

  const handleGoBack = () => {
    if (currentPath.length <= 2) return
    const newPath = currentPath.slice(0, -1)
    setCurrentPath(newPath)
    loadChildrenAtLevel(newPath[newPath.length - 1].id)
    setMatchingStatus(null)
    setForm(p => ({ ...p, selectedFatherId: '', selectedFatherName: '' }))
  }

  const handleSelectFather = async (node) => {
    setForm(p => ({ 
      ...p, 
      selectedFatherId: node.id,
      selectedFatherName: node.name
    }))
    
    if (!form.firstName.trim()) {
      setMatchingStatus({ found: false, message: 'يرجى إدخال اسمك أولاً' })
      return
    }
    
    try {
      const res = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'checkChildMatch',
          fatherNodeId: node.id,
          firstName: form.firstName.trim(),
          nationalId: form.nationalId.trim(),
          birthDate: form.birthDate
        })
      })
      const result = await res.json()
      
      if (result.success && result.found) {
        setMatchingStatus({ 
          found: true, 
          message: 'تم العثور على بياناتك في الشجرة! سيتم ربط حسابك تلقائياً.',
          matchedChild: result.child
        })
      } else {
        setMatchingStatus({ 
          found: false, 
          message: 'لم يتم العثور على اسمك ضمن أبناء هذا الوالد. سيتم إرسال طلب للمدير للمراجعة.'
        })
      }
    } catch (err) {
      console.error('خطأ في التحقق من المطابقة:', err)
      setMatchingStatus({ found: false, message: 'خطأ في التحقق من البيانات' })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')

    const nameRe = /^[؀-ۿ]+([\s][؀-ۿ]+)*$/
    if (!nameRe.test(form.firstName.trim())) { setError('الاسم الأول يجب أن يكون بالعربية'); return }
    if (!form.phone.trim()) { setError('رقم الجوال مطلوب'); return }
    if (!form.nationalId.trim()) { setError('رقم الهوية مطلوب'); return }
    if (!/^\d{10}$/.test(form.nationalId.replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))))
      { setError('رقم الهوية يجب أن يكون 10 أرقام'); return }
    if (!form.birthDate) { setError('تاريخ الميلاد مطلوب'); return }
    if (!form.selectedBranch) { setError('يرجى اختيار الفخذ'); return }
    if (!form.selectedFatherId) { setError('يرجى اختيار والدك من الشجرة'); return }
    if (!form.job) { setError('المهنة مطلوبة'); return }
    if (!form.maritalStatus) { setError('الحالة الاجتماعية مطلوبة'); return }
    if (form.password.length < 6) { setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return }
    if (form.password !== form.confirmPassword) { setError('كلمة المرور وتأكيدها غير متطابقتين'); return }

    try {
      setLoading(true)
      const res = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'register',
          firstName: form.firstName.trim(),
          phone: form.phone.trim(),
          nationalId: form.nationalId.trim(),
          birthDate: form.birthDate,
          job: form.job,
          maritalStatus: form.maritalStatus,
          password: form.password,
          parentNodeId: form.selectedFatherId,
          parentName: form.selectedFatherName,
          selectedBranch: form.selectedBranch,
          treePath: currentPath.map(p => p.name).join(' ← '),
          matchingData: matchingStatus
        }),
      })
      const result = await res.json()
      if (result.success) {
        setSuccess(result.message)
        setForm(INITIAL)
        setCurrentPath(currentPath.slice(0, 2))
        setChildrenAtLevel([])
        setMatchingStatus(null)
      } else setError(result.message || 'حدث خطأ')
    } catch {
      setError('تعذّر الاتصال بالخادم')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="relative w-full max-w-3xl"
        style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)',
          borderRadius:35, padding:40, backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)',
          boxShadow:'0 24px 64px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)' }}>

        {loading && (
          <div style={{ position:'absolute', inset:-1, borderRadius:36,
            background:'conic-gradient(from 0deg,transparent 0%,transparent 68%,rgba(198,161,107,0.9) 85%,transparent 100%)',
            animation:'border-orbit 1.8s linear infinite',
            WebkitMask:'linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0)',
            WebkitMaskComposite:'xor', maskComposite:'exclude', padding:1, pointerEvents:'none' }} />
        )}

        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-[var(--gold-main)]">طلب عضوية جديدة</h1>
          <p className="mt-3 font-nav text-sm text-gray-400">سيتم مراجعة طلبك واعتماده من الإدارة</p>
        </div>

        <div className="mb-6 rounded-2xl overflow-hidden font-nav text-sm"
          style={{ border: '1px solid rgba(251,146,60,0.40)', background: 'rgba(251,146,60,0.07)' }}>
          <div className="flex items-center gap-2 px-4 py-2.5"
            style={{ background: 'rgba(251,146,60,0.14)', borderBottom: '1px solid rgba(251,146,60,0.22)' }}>
            <span style={{ fontSize: 17 }}>⚠️</span>
            <span className="font-bold" style={{ color: '#fb923c' }}>تنبيه مهم قبل التسجيل</span>
          </div>
          <p className="px-4 py-3 leading-relaxed" style={{ color: 'rgba(253,186,116,0.85)' }}>
            نُرحّب بكم أيها الكرام — غير أننا نعتذر بأدب شديد عن قبول طلبات من خارج
            {' '}<span className="font-bold" style={{ color: '#fdba74' }}>قبيلة السلامي فخذ العفاريت</span>.
            {' '}العضوية مقتصرة حصراً على أبناء هذا الفخذ الكريم، وذلك حفاظاً على دقة السجل العائلي.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {error && <Alert type="error">{error}</Alert>}
          {success && <Alert type="success">{success}</Alert>}

          <F label="الاسم الأول *">
            <input name="firstName" required value={form.firstName}
              onChange={set} className="form-input" placeholder="اسمك الأول فقط — مثال: محمد" />
          </F>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <F label="رقم الجوال *">
              <input name="phone" type="tel" required value={form.phone}
                onChange={set} className="form-input" placeholder="05xxxxxxxx" maxLength="10" />
            </F>
            <F label="رقم الهوية الوطنية *">
              <input name="nationalId" required value={form.nationalId}
                onChange={set} className="form-input" placeholder="10 أرقام" maxLength="10" />
            </F>
          </div>

          <F label="تاريخ الميلاد *">
            <input name="birthDate" type="date" required value={form.birthDate}
              onChange={set} className="form-input" max={new Date().toISOString().split('T')[0]} />
          </F>

          <F label="الفخذ *">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {BRANCHES.map(branch => (
                <button
                  key={branch.id}
                  type="button"
                  onClick={() => handleBranchSelect(branch.id)}
                  className={`px-4 py-3 rounded-xl font-nav text-sm transition-all ${
                    form.selectedBranch === branch.id
                      ? 'bg-[var(--gold-main)] text-black font-bold'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {branch.label}
                </button>
              ))}
            </div>
          </F>

          {form.selectedBranch && (
            <div className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[var(--gold-main)]">اختر والدك من الشجرة</h3>
                {currentPath.length > 2 && (
                  <button
                    type="button"
                    onClick={handleGoBack}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm transition"
                  >
                    ← رجوع
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
                {currentPath.map((node, i) => (
                  <span key={i} className="flex items-center gap-2">
                    {node.name}
                    {i < currentPath.length - 1 && <span>←</span>}
                  </span>
                ))}
              </div>

              {treeLoading ? (
                <p className="text-center text-gray-400">جارٍ التحميل...</p>
              ) : childrenAtLevel.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                  {childrenAtLevel.map(child => (
                    <div key={child.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex-1">
                        <p className="font-nav">{child.name}</p>
                        <p className="text-xs text-gray-500">{child.isAlive ? 'حي' : 'متوفى'}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectFather(child)}
                          className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm transition"
                        >
                          هذا والدي
                        </button>
                        <button
                          type="button"
                          onClick={() => handleNodeSelect(child)}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm transition"
                        >
                          عرض أبنائه
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-400">لا يوجد أبناء مسجلين في هذا المستوى</p>
              )}

              {matchingStatus && (
                <div className={`p-3 rounded-lg ${matchingStatus.found ? 'bg-green-900/30 border-green-500/50' : 'bg-orange-900/30 border-orange-500/50'} border`}>
                  <p className="text-sm">{matchingStatus.message}</p>
                </div>
              )}

              {form.selectedFatherId && (
                <div className="p-3 rounded-lg bg-[var(--gold-main)]/20 border border-[var(--gold-main)]/50">
                  <p className="text-sm font-bold">الوالد المختار: {form.selectedFatherName}</p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <F label="المهنة *">
              <select name="job" required value={form.job} onChange={set} className="form-input">
                <option value="">اختر...</option>
                {JOBS.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </F>
            <F label="الحالة الاجتماعية *">
              <select name="maritalStatus" required value={form.maritalStatus} onChange={set} className="form-input">
                <option value="">اختر...</option>
                {MARITAL_STATUS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </F>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PasswordInput label="كلمة المرور *" name="password" value={form.password}
              onChange={set} placeholder="6 أحرف على الأقل" required minLength="6" />
            <PasswordInput label="تأكيد كلمة المرور *" name="confirmPassword" value={form.confirmPassword}
              onChange={set} placeholder="أعد إدخال كلمة المرور" required minLength="6" />
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-4 rounded-2xl font-bold text-lg transition disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, var(--gold-main), var(--gold-dark))',
              color: '#000', boxShadow: '0 8px 24px rgba(198,161,107,0.25)' }}>
            {loading ? 'جارٍ الإرسال...' : 'إرسال الطلب'}
          </button>
        </form>
      </div>
    </div>
  )
}

function F({ label, children }) {
  return (
    <div>
      <label className="block mb-2 font-nav text-sm text-gray-300">{label}</label>
      {children}
    </div>
  )
}

function Alert({ type, children }) {
  const colors = type === 'error'
    ? { bg: 'rgba(220,38,38,0.15)', border: 'rgba(220,38,38,0.4)', text: '#fca5a5' }
    : { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.4)', text: '#86efac' }
  
  return (
    <div className="rounded-xl p-4 font-nav text-sm"
      style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}>
      {children}
    </div>
  )
}
