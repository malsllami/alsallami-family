import { useState } from 'react'
import PasswordInput from '../components/PasswordInput'

const INITIAL = {
  nationalId: '', firstName: '', fatherName: '', grandfatherName: '',
  branch: '', phone: '', birthDate: '', gender: '', maritalStatus: '', password: '',
}

export default function Register() {
  const [formData, setFormData] = useState(INITIAL)
  const [loading,  setLoading]  = useState(false)

  const set = e => setFormData(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const nameRe = /^[؀-ۿ]+(?:\s[؀-ۿ]+)?$/
    if (!nameRe.test(formData.firstName))       { alert('الاسم الأول يجب أن يكون اسماً واحداً أو اسماً مركباً فقط'); return }
    if (!nameRe.test(formData.fatherName))      { alert('اسم الأب يجب أن يكون اسماً واحداً أو اسماً مركباً فقط');   return }
    if (!nameRe.test(formData.grandfatherName)) { alert('اسم الجد يجب أن يكون اسماً واحداً أو اسماً مركباً فقط');   return }
    try {
      setLoading(true)
      const res = await fetch(
        import.meta.env.VITE_API_URL,
        { method: 'POST', body: JSON.stringify({ action: 'register', ...formData }) },
      )
      const result = await res.json()
      if (result.success) { alert(result.message); setFormData(INITIAL) }
      else alert(result.message)
    } catch (err) {
      console.error(err)
      alert('حدث خطأ أثناء الاتصال بالخادم')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16">

      <div
        className="relative w-full max-w-3xl"
        style={{
          background:          'rgba(255,255,255,0.04)',
          border:              '1px solid rgba(255,255,255,0.09)',
          borderRadius:         35,
          padding:              40,
          backdropFilter:      'blur(24px)',
          WebkitBackdropFilter:'blur(24px)',
          boxShadow:           '0 24px 64px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >

        {/* حدود المدار المتحركة */}
        {loading && (
          <div
            style={{
              position:            'absolute',
              inset:               -1,
              borderRadius:         36,
              background:          'conic-gradient(from 0deg, transparent 0%, transparent 68%, rgba(198,161,107,0.9) 85%, transparent 100%)',
              animation:           'border-orbit 1.8s linear infinite',
              WebkitMask:          'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite:       'exclude',
              padding:              1,
              pointerEvents:       'none',
            }}
          />
        )}

        {/* العنوان */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-[var(--gold-main)]">طلب عضوية جديدة</h1>
          <p className="mt-4 text-gray-300">سيتم مراجعة طلبك واعتماده من الإدارة</p>
        </div>

        {/* النموذج */}
        <form onSubmit={handleSubmit} className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">

          <Field label="رقم الهوية">
            <input type="text"     name="nationalId"      required value={formData.nationalId}      onChange={set} className="form-input" />
          </Field>

          <Field label="الاسم الأول">
            <input type="text"     name="firstName"       required value={formData.firstName}       onChange={set} className="form-input" />
          </Field>

          <Field label="اسم الأب">
            <input type="text"     name="fatherName"      required value={formData.fatherName}      onChange={set} className="form-input" />
          </Field>

          <Field label="اسم الجد">
            <input type="text"     name="grandfatherName" required value={formData.grandfatherName} onChange={set} className="form-input" />
          </Field>

          <Field label="الفخذ">
            <input type="text"     name="branch"          required value={formData.branch}          onChange={set} className="form-input" />
          </Field>

          <Field label="رقم الجوال">
            <input type="text"     name="phone"           required value={formData.phone}           onChange={set} className="form-input" />
          </Field>

          <Field label="تاريخ الميلاد">
            <input type="date"     name="birthDate"       required value={formData.birthDate}       onChange={set} className="form-input" />
          </Field>

          <Field label="الجنس">
            <select name="gender" required value={formData.gender} onChange={set} className="form-input">
              <option value="">اختر</option>
              <option value="ذكر">ذكر</option>
              <option value="أنثى">أنثى</option>
            </select>
          </Field>

          <Field label="الحالة الاجتماعية">
            <select name="maritalStatus" required value={formData.maritalStatus} onChange={set} className="form-input">
              <option value="">اختر</option>
              <option value="اعزب">أعزب</option>
              <option value="متزوج">متزوج</option>
            </select>
          </Field>

          <Field label="كلمة المرور">
            <PasswordInput name="password" required value={formData.password} onChange={set} />
          </Field>

          {/* زر الإرسال */}
          <div className="md:col-span-2 pt-4 flex justify-center">
            <button
              type="submit"
              disabled={loading}
              className="font-nav bg-[var(--gold-main)] text-black font-bold flex items-center justify-center overflow-hidden"
              style={{
                height:       56,
                width:        loading ? 56 : '100%',
                borderRadius: loading ? '50%' : 14,
                transition:   'width 0.5s cubic-bezier(0.23,1,0.32,1), border-radius 0.5s cubic-bezier(0.23,1,0.32,1)',
              }}
            >
              {loading ? <div className="btn-spinner" /> : 'إرسال طلب العضوية'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block mb-2 text-sm text-gray-400 font-nav">{label}</label>
      {children}
    </div>
  )
}
