import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TreeNavigator from '../components/TreeNavigator';
import { normalizeDigits } from '../utils/normalizeInput';

export default function Register() {
  const navigate = useNavigate();

  const JOBS           = ['موظف', 'طالب', 'متقاعد', 'رجل أعمال', 'أخرى'];
  const MARITAL_STATUS = ['أعزب', 'متزوج', 'مطلق', 'أرمل'];

  const [formData, setFormData] = useState({
    firstName: '', phone: '', nationalId: '', birthDate: '',
    job: '', jobOther: '', maritalStatus: '', password: '', confirmPassword: '',
  });

  const [treeData,       setTreeData]       = useState(null);
  const [treeLoading,    setTreeLoading]    = useState(false);
  const [selectedFather, setSelectedFather] = useState(null);  // { id, name, generationLevel, path, children }
  const [fatherMatch,    setFatherMatch]    = useState(null);  // 'found' | 'notfound' | null
  const [loading,        setLoading]        = useState(false);
  const [message,        setMessage]        = useState('');
  const [messageType,    setMessageType]    = useState('');

  const NUMERIC_FIELDS = ['phone', 'nationalId'];
  const handleChange = (e) => {
    const { name, value } = e.target;
    const newVal = NUMERIC_FIELDS.includes(name) ? normalizeDigits(value) : value;
    setFormData(prev => ({ ...prev, [name]: newVal }));
    // إذا تغير الاسم بعد اختيار الأب — أعد حساب التطابق
    if (name === 'firstName' && selectedFather) checkMatch(newVal, selectedFather);
  };

  // تحميل الشجرة
  useEffect(() => {
    let mounted = true;
    setTreeLoading(true);
    fetch(import.meta.env.VITE_API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'getFamilyTree' }),
    })
      .then(r => r.json())
      .then(d => { if (mounted && d.success && d.tree) setTreeData(d.tree); })
      .catch(() => {})
      .finally(() => { if (mounted) setTreeLoading(false); });
    return () => { mounted = false; };
  }, []);

  // البحث عن اسم المسجّل في أبناء الأب المختار
  const checkMatch = useCallback((firstName, fatherNode) => {
    if (!firstName || !fatherNode) { setFatherMatch(null); return; }
    const name = firstName.trim();
    const children = fatherNode.children || [];
    const found = children.some(c =>
      c.name && c.name.split(' ')[0].trim() === name
    );
    setFatherMatch(found ? 'found' : 'notfound');
  }, []);

  const handleSelectFather = (node) => {
    setSelectedFather(node);
    checkMatch(formData.firstName, node);
  };

  const validate = () => {
    const nameRe = /^[؀-ۿ]+([\s][؀-ۿ]+)*$/;
    if (!nameRe.test(formData.firstName.trim()))        { setMessage('الاسم الأول يجب أن يكون بالعربية'); return false; }
    if (!formData.nationalId.trim())                    { setMessage('رقم الهوية مطلوب'); return false; }
    if (!/^\d{10}$/.test(formData.nationalId.replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))))
                                                        { setMessage('رقم الهوية يجب أن يكون 10 أرقام'); return false; }
    if (!formData.birthDate)                            { setMessage('تاريخ الميلاد مطلوب'); return false; }
    if (!selectedFather)                                { setMessage('يجب اختيار والدك من الشجرة'); return false; }
    if (!formData.phone.trim())                         { setMessage('رقم الجوال مطلوب'); return false; }
    if (!formData.maritalStatus)                        { setMessage('الحالة الاجتماعية مطلوبة'); return false; }
    if (!formData.job)                                  { setMessage('المهنة مطلوبة'); return false; }
    if (formData.job === 'أخرى' && !formData.jobOther.trim()) { setMessage('يرجى تحديد المهنة'); return false; }
    if (formData.password.length < 6)                  { setMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return false; }
    if (formData.password !== formData.confirmPassword) { setMessage('كلمة المرور وتأكيدها غير متطابقتين'); return false; }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(''); setMessageType('');
    if (!validate()) { setMessageType('error'); return; }

    const jobFinal = formData.job === 'أخرى' ? formData.jobOther.trim() : formData.job;

    setLoading(true);
    try {
      const res = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action:           'register',
          firstName:        formData.firstName.trim(),
          phone:            formData.phone.trim(),
          nationalId:       formData.nationalId.trim(),
          birthDate:        formData.birthDate,
          job:              jobFinal,
          maritalStatus:    formData.maritalStatus,
          password:         formData.password,
          parentNodeId:     selectedFather.id,
          parentNodeName:   selectedFather.name,
          generationLevel:  (selectedFather.generationLevel || 0) + 1,
          matchedInFather:  fatherMatch === 'found',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('تم إرسال طلب التسجيل بنجاح — سيتم مراجعته من قِبل المدير');
        setMessageType('success');
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setMessage(data.message || 'حدث خطأ');
        setMessageType('error');
      }
    } catch {
      setMessage('تعذّر الاتصال بالخادم');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="relative w-full max-w-2xl"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 35, padding: 40, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)' }}>

        {loading && (
          <div style={{ position: 'absolute', inset: -1, borderRadius: 36,
            background: 'conic-gradient(from 0deg,transparent 0%,transparent 68%,rgba(198,161,107,0.9) 85%,transparent 100%)',
            animation: 'border-orbit 1.8s linear infinite',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor', maskComposite: 'exclude', padding: 1, pointerEvents: 'none' }} />
        )}

        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-[var(--gold-main)]">طلب عضوية جديدة</h1>
          <p className="mt-3 font-nav text-sm text-gray-400">سيتم مراجعة طلبك واعتماده من الإدارة</p>
        </div>

        {/* تنبيه الانتساب */}
        <div className="mb-6 rounded-2xl overflow-hidden font-nav text-sm"
          style={{ border: '1px solid rgba(251,146,60,0.40)', background: 'rgba(251,146,60,0.07)' }}>
          <div className="flex items-center gap-2 px-4 py-2.5"
            style={{ background: 'rgba(251,146,60,0.14)', borderBottom: '1px solid rgba(251,146,60,0.22)' }}>
            <span style={{ fontSize: 17 }}>⚠️</span>
            <span className="font-bold" style={{ color: '#fb923c' }}>تنبيه مهم قبل التسجيل</span>
          </div>
          <p className="px-4 py-3 leading-relaxed" style={{ color: 'rgba(253,186,116,0.85)' }}>
            العضوية مقتصرة حصراً على أبناء{' '}
            <span className="font-bold" style={{ color: '#fdba74' }}>قبيلة السلامي فخذ العفاريت</span>
            {' '}— حفاظاً على دقة السجل العائلي.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {message && (
            <div className="font-nav text-sm text-center py-2.5 px-4 rounded-2xl"
              style={messageType === 'success'
                ? { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399' }
                : { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
              {message}
            </div>
          )}

          {/* 1. الاسم الأول */}
          <Field label="الاسم الأول *">
            <input name="firstName" required value={formData.firstName}
              onChange={handleChange} className="form-input" placeholder="اسمك الأول فقط — مثال: محمد" />
          </Field>

          {/* 2. رقم الهوية + تاريخ الميلاد */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="رقم الهوية *">
              <input name="nationalId" required inputMode="numeric" value={formData.nationalId}
                onChange={handleChange} className="form-input" placeholder="10 أرقام" maxLength={10} />
            </Field>
            <Field label="تاريخ الميلاد *">
              <input type="date" name="birthDate" required value={formData.birthDate}
                onChange={handleChange} className="form-input" />
            </Field>
          </div>

          {/* 3. اختيار الأب من الشجرة */}
          <div className="rounded-2xl p-5"
            style={{ background: 'rgba(198,161,107,0.04)', border: '1px solid rgba(198,161,107,0.18)' }}>
            <p className="font-nav text-sm font-semibold mb-1" style={{ color: 'var(--gold-main)' }}>
              اختر والدك من الشجرة *
            </p>
            <p className="font-nav text-xs mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
              ابدأ باختيار الفخذ ثم تدرّج إلى والدك — اضغط &quot;هذا والدي&quot; عند العثور عليه
            </p>

            {treeLoading ? (
              <p className="font-nav text-xs text-center py-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
                جاري تحميل الشجرة...
              </p>
            ) : (
              <TreeNavigator
                treeData={treeData}
                onSelect={() => {}}
                selected={null}
                onSelectFather={handleSelectFather}
                selectedFatherId={selectedFather?.id}
              />
            )}

            {/* نتيجة المطابقة */}
            {selectedFather && (
              <div className="mt-4 rounded-xl p-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="font-nav text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>الوالد المختار:</p>
                <p className="font-nav text-sm font-semibold" style={{ color: 'var(--gold-main)' }}>{selectedFather.name}</p>
                {fatherMatch === 'found' && (
                  <p className="font-nav text-xs mt-2" style={{ color: '#34d399' }}>
                    ✓ تم العثور على اسمك في قائمة أبناء هذا الوالد — سيتم الربط تلقائياً
                  </p>
                )}
                {fatherMatch === 'notfound' && (
                  <p className="font-nav text-xs mt-2" style={{ color: 'rgba(245,158,11,0.9)' }}>
                    ⚠ اسمك غير موجود في قائمة أبناء هذا الوالد — سيُرسل الطلب للمدير للمراجعة
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 4. رقم الجوال */}
          <Field label="رقم الجوال *">
            <input name="phone" required inputMode="numeric" value={formData.phone}
              onChange={handleChange} className="form-input" placeholder="05xxxxxxxx" />
          </Field>

          {/* 5. الحالة الاجتماعية + المهنة */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="الحالة الاجتماعية *">
              <select name="maritalStatus" required value={formData.maritalStatus} onChange={handleChange} className="form-input">
                <option value="">— اختر —</option>
                {MARITAL_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="المهنة *">
              <select name="job" required value={formData.job} onChange={handleChange} className="form-input">
                <option value="">— اختر المهنة —</option>
                {JOBS.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </Field>
          </div>
          {formData.job === 'أخرى' && (
            <Field label="اذكر مهنتك">
              <input name="jobOther" value={formData.jobOther}
                onChange={handleChange} className="form-input" placeholder="مثال: مقاول" />
            </Field>
          )}

          {/* 6. كلمة المرور */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="كلمة المرور *">
              <input type="password" name="password" value={formData.password}
                onChange={handleChange} className="form-input" placeholder="6 أحرف على الأقل" minLength={6} />
            </Field>
            <Field label="تأكيد كلمة المرور *">
              <input type="password" name="confirmPassword" value={formData.confirmPassword}
                onChange={handleChange} className="form-input" placeholder="أعد كتابة كلمة المرور" />
            </Field>
          </div>

          <div className="pt-4 flex justify-center gap-4">
            <button type="submit" disabled={loading || !selectedFather}
              className="font-nav bg-[var(--gold-main)] text-black font-bold flex items-center justify-center overflow-hidden transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ height: 56, width: loading ? 56 : '100%', borderRadius: loading ? '50%' : 14,
                transition: 'width 0.5s cubic-bezier(0.23,1,0.32,1), border-radius 0.5s cubic-bezier(0.23,1,0.32,1)' }}>
              {loading ? <div className="btn-spinner" /> : 'إرسال طلب العضوية'}
            </button>
            <button type="button" onClick={() => navigate('/login')}
              className="px-6 py-3 border-2 border-[var(--gold-main)] text-[var(--gold-main)] rounded-xl hover:bg-[var(--gold-main)]/10 font-semibold transition-colors font-nav">
              لديك حساب؟
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block mb-1.5 text-sm text-gray-400 font-nav">{label}</label>
      {children}
    </div>
  );
}
