import { useState } from 'react'
import PasswordInput from '../components/PasswordInput'
import { normalizeDigits } from '../utils/normalizeInput'

const JOBS           = ['موظف', 'طالب', 'متقاعد', 'رجل أعمال', 'أخرى']
const MARITAL_STATUS = ['أعزب', 'متزوج', 'مطلق', 'أرمل']

const INITIAL = {
  firstName: '', phone: '', nationalId: '', birthDate: '',
  job: '', jobOther: '', maritalStatus: '', password: '', confirmPassword: '',
}

export default function Register() {
  const [form,    setForm]    = useState(INITIAL)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error,   setError]   = useState('')

  const NUMERIC_FIELDS = ['phone', 'nationalId']
  const set = e => {
    const val = NUMERIC_FIELDS.includes(e.target.name)
      ? normalizeDigits(e.target.value)
      : e.target.value
    setForm(p => ({ ...p, [e.target.name]: val }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')

    const nameRe = /^[؀-ۿ]+([\s][؀-ۿ]+)*$/
    if (!nameRe.test(form.firstName.trim()))           { setError('الاسم الأول يجب أن يكون بالعربية'); return }
    if (!form.phone.trim())                             { setError('رقم الجوال مطلوب'); return }
    if (!form.nationalId.trim())                        { setError('رقم الهوية مطلوب'); return }
    if (!/^\d{10}$/.test(form.nationalId.replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))))
                                                        { setError('رقم الهوية يجب أن يكون 10 أرقام'); return }
    if (!form.birthDate)                                { setError('تاريخ الميلاد مطلوب'); return }
    if (!form.job)                                      { setError('المهنة مطلوبة'); return }
    if (form.job === 'أخرى' && !form.jobOther.trim())   { setError('يرجى تحديد المهنة'); return }
    if (!form.maritalStatus)                            { setError('الحالة الاجتماعية مطلوبة'); return }
    if (form.password.length < 6)                       { setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return }
    if (form.password !== form.confirmPassword)          { setError('كلمة المرور وتأكيدها غير متطابقتين'); return }

    const jobFinal = form.job === 'أخرى' ? form.jobOther.trim() : form.job

    try {
      setLoading(true)
      const res = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        body: JSON.stringify({
          action:        'register',
          firstName:     form.firstName.trim(),
          phone:         form.phone.trim(),
          nationalId:    form.nationalId.trim(),
          birthDate:     form.birthDate,
          job:           jobFinal,
          maritalStatus: form.maritalStatus,
          password:      form.password,
        }),
      })
      const result = await res.json()
      if (result.success) {
        setSuccess(result.message)
        setForm(INITIAL)
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

        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-[var(--gold-main)]">طلب عضوية جديدة</h1>
          <p className="mt-3 font-nav text-sm text-gray-400">سيتم مراجعة طلبك واعتماده من الإدارة</p>
        </div>

        {/* تنبيه الانتساب القبلي */}
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

          {/* الاسم الأول */}
          <F label="الاسم الأول *">
            <input name="firstName" required value={form.firstName}
              onChange={set} className="form-input" placeholder="اسمك الأول فقط — مثال: محمد" />
          </F>

          {/* جوال + هوية */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <F label="رقم الجوال *">
              <input name="phone" required inputMode="numeric" value={form.phone}
                onChange={set} className="form-input" placeholder="05xxxxxxxx" />
            </F>
            <F label="رقم الهوية *">
              <input name="nationalId" required inputMode="numeric" value={form.nationalId}
                onChange={set} className="form-input" placeholder="10 أرقام" maxLength={10} />
            </F>
          </div>

          {/* تاريخ + مهنة */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <F label="تاريخ الميلاد *">
              <input type="date" name="birthDate" required value={form.birthDate}
                onChange={set} className="form-input" />
            </F>
            <F label="المهنة *">
              <select name="job" required value={form.job} onChange={set} className="form-input">
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

          {/* الحالة الاجتماعية */}
          <F label="الحالة الاجتماعية *">
            <select name="maritalStatus" required value={form.maritalStatus} onChange={set} className="form-input">
              <option value="">— اختر —</option>
              {MARITAL_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </F>

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