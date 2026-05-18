import { useState, useEffect } from 'react'
import PasswordInput from '../components/PasswordInput'

const JOBS = ['موظف', 'طالب', 'متقاعد', 'رجل أعمال', 'أخرى']

const INITIAL = {
  firstName: '', phone: '', nationalId: '', birthDate: '',
  job: '', jobOther: '', password: '', confirmPassword: '',
}

function flattenTree(node, list = []) {
  if (!node) return list
  if (node.id && !node.isWife && !node.isChildRecord) list.push(node)
  ;(node.children || []).forEach(c => flattenTree(c, list))
  return list
}

export default function Register() {
  const [form,    setForm]    = useState(INITIAL)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error,   setError]   = useState('')

  // شجرة الاختيار
  const [treeNodes,   setTreeNodes]   = useState([])
  const [branches,    setBranches]    = useState([])  // الفخوذ الخمسة (مستوى 3)
  const [selBranch,   setSelBranch]   = useState('')  // ID الفخذ المختار
  const [selParent,   setSelParent]   = useState('')  // ID الأب المختار
  const [parentLabel, setParentLabel] = useState('')  // مسار الأب للعرض
  const [noParent,    setNoParent]    = useState(false)

  useEffect(() => {
    const API = import.meta.env.VITE_API_URL
    if (!API) return
    fetch(API, { method: 'POST', body: JSON.stringify({ action: 'getFamilyTree' }) })
      .then(r => r.json())
      .then(d => {
        if (!d.success || !d.tree?.length) return
        const root = d.tree[0]
        const all  = flattenTree(root)
        setTreeNodes(all)
        // الفخوذ = أبناء أحمد (مستوى الجيل 3)
        const br = all.filter(n => n.generation === 3)
        setBranches(br)
      })
      .catch(() => {})
  }, [])

  const nodesInBranch = selBranch
    ? treeNodes.filter(n => n.id !== selBranch && (n.path || '').includes(
        treeNodes.find(b => b.id === selBranch)?.name || '___'
      ))
    : []

  const set = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleParentChange = (nodeId) => {
    setSelParent(nodeId)
    const node = treeNodes.find(n => n.id === nodeId)
    setParentLabel(node ? node.path || node.name : '')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')

    const nameRe = /^[؀-ۿ]+([\s][؀-ۿ]+)*$/
    if (!nameRe.test(form.firstName.trim()))           { setError('الاسم الأول يجب أن يكون بالعربية'); return }
    if (!form.phone.trim())                             { setError('رقم الجوال مطلوب'); return }
    if (form.nationalId && !/^\d{10}$/.test(form.nationalId.replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))))
                                                        { setError('رقم الهوية يجب أن يكون 10 أرقام'); return }
    if (form.password.length < 6)                       { setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return }
    if (form.password !== form.confirmPassword)          { setError('كلمة المرور وتأكيدها غير متطابقتين'); return }
    if (form.job === 'أخرى' && !form.jobOther.trim())   { setError('يرجى تحديد المهنة'); return }

    const jobFinal      = form.job === 'أخرى' ? form.jobOther.trim() : form.job
    const selBranchNode = treeNodes.find(n => n.id === selBranch)
    const selParentNode = treeNodes.find(n => n.id === selParent)

    try {
      setLoading(true)
      const res = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        body: JSON.stringify({
          action:        'register',
          firstName:     form.firstName.trim(),
          fatherName:    selParentNode?.name || '',
          grandfatherName: selParentNode
            ? (treeNodes.find(n => n.id === selParentNode.parentId)?.name || '')
            : '',
          phone:         form.phone.trim(),
          nationalId:    form.nationalId.trim(),
          birthDate:     form.birthDate,
          job:           jobFinal,
          branch:        selBranchNode?.name || '',
          parentNodeId:  selParent || '',
          password:      form.password,
        }),
      })
      const result = await res.json()
      if (result.success) {
        setSuccess(result.message)
        setForm(INITIAL)
        setSelBranch(''); setSelParent(''); setParentLabel(''); setNoParent(false)
      } else setError(result.message || 'حدث خطأ')
    } catch {
      setError('تعذّر الاتصال بالخادم')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="relative w-full max-w-2xl"
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

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[var(--gold-main)]">طلب عضوية جديدة</h1>
          <p className="mt-3 font-nav text-sm text-gray-400">سيتم مراجعة طلبك واعتماده من الإدارة</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {error && <Alert type="error">{error}</Alert>}
          {success && <Alert type="success">{success}</Alert>}

          {/* الاسم الأول */}
          <F label="الاسم الأول *">
            <input name="firstName" required value={form.firstName}
              onChange={set} className="form-input" placeholder="اسمك الأول فقط — مثال: محمد" />
          </F>

          {/* ── اختيار الفخذ ── */}
          {branches.length > 0 && (
            <div className="rounded-2xl p-4 space-y-3"
              style={{ background:'rgba(198,161,107,0.06)', border:'1px solid rgba(198,161,107,0.18)' }}>
              <p className="font-nav text-sm" style={{ color:'var(--gold-main)' }}>سلسلة الانتساب (اختياري)</p>

              <F label="اختر فخذك">
                <select value={selBranch}
                  onChange={e => { setSelBranch(e.target.value); setSelParent(''); setParentLabel('') }}
                  className="form-input">
                  <option value="">— اختر الفخذ —</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </F>

              {selBranch && !noParent && (
                <F label="اختر أباك من الشجرة">
                  <select value={selParent} onChange={e => handleParentChange(e.target.value)} className="form-input">
                    <option value="">— اختر الأب —</option>
                    {/* الفخذ نفسه كخيار */}
                    {(() => {
                      const br = treeNodes.find(n => n.id === selBranch)
                      return br ? <option key={br.id} value={br.id}>{br.path || br.name}</option> : null
                    })()}
                    {nodesInBranch.map(n => <option key={n.id} value={n.id}>{n.path || n.name}</option>)}
                  </select>
                </F>
              )}

              {selParent && parentLabel && (
                <div className="font-nav text-xs px-3 py-2 rounded-xl"
                  style={{ background:'rgba(74,222,128,0.08)', border:'1px solid rgba(74,222,128,0.2)', color:'#4ade80' }}>
                  السلسلة: {parentLabel} ← {form.firstName || '...'}
                </div>
              )}

              <button type="button" onClick={() => { setNoParent(v => !v); setSelParent(''); setParentLabel('') }}
                className="font-nav text-xs"
                style={{ color: noParent ? '#f87171' : 'rgba(255,255,255,0.35)' }}>
                {noParent ? '↩ عودة للاختيار' : 'أبي غير موجود في الشجرة'}
              </button>
            </div>
          )}

          {/* جوال + هوية */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <F label="رقم الجوال *">
              <input name="phone" required inputMode="numeric" value={form.phone}
                onChange={set} className="form-input" placeholder="05xxxxxxxx" />
            </F>
            <F label="رقم الهوية">
              <input name="nationalId" inputMode="numeric" value={form.nationalId}
                onChange={set} className="form-input" placeholder="10 أرقام" maxLength={10} />
            </F>
          </div>

          {/* تاريخ + مهنة */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <F label="تاريخ الميلاد">
              <input type="date" name="birthDate" value={form.birthDate}
                onChange={set} className="form-input" />
            </F>
            <F label="المهنة">
              <select name="job" value={form.job} onChange={set} className="form-input">
                <option value="">— اختر المهنة —</option>
                {JOBS.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </F>
          </div>
          {form.job === 'أخرى' && (
            <F label="اذكر مهنتك">
              <input name="jobOther" value={form.jobOther}
                onChange={set} className="form-input" placeholder="مثال: مقاول" />
            </F>
          )}

          {/* كلمة المرور */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <F label="كلمة المرور *">
              <PasswordInput name="password" value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="6 أحرف على الأقل" />
            </F>
            <F label="تأكيد كلمة المرور *">
              <PasswordInput name="confirmPassword" value={form.confirmPassword}
                onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                placeholder="أعد كتابة كلمة المرور" />
            </F>
          </div>

          <div className="pt-4 flex justify-center">
            <button type="submit" disabled={loading}
              className="font-nav bg-[var(--gold-main)] text-black font-bold flex items-center justify-center overflow-hidden"
              style={{ height:56, width:loading ? 56 : '100%',
                borderRadius:loading ? '50%' : 14,
                transition:'width 0.5s cubic-bezier(0.23,1,0.32,1), border-radius 0.5s cubic-bezier(0.23,1,0.32,1)' }}>
              {loading ? <div className="btn-spinner" /> : 'إرسال طلب العضوية'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

function F({ label, children }) {
  return (
    <div>
      <label className="block mb-1.5 text-sm text-gray-400 font-nav">{label}</label>
      {children}
    </div>
  )
}

function Alert({ type, children }) {
  const s = type === 'error'
    ? { background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', color:'#f87171' }
    : { background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)', color:'#34d399' }
  return <div className="font-nav text-sm text-center py-2.5 px-4 rounded-2xl" style={s}>{children}</div>
}
