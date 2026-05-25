import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import TreeNavigator from '../components/TreeNavigator';
import { normalizeDigits } from '../utils/normalizeInput';

export default function Register() {
  const navigate = useNavigate();
  
  // ═══ ثوابت ═══
  const JOBS = ['موظف', 'طالب', 'متقاعد', 'رجل أعمال', 'أخرى'];
  const MARITAL_STATUS = ['أعزب', 'متزوج', 'مطلق', 'أرمل'];
  
  // ═══ الفخوذ الصحيحة ═══
  const branches = [
    'آل صاحب',
    'آل شامي',
    'آل يحيى',
    'آل علي " سيد "',
    'آل ابراهيم " الشقيق "'
  ];

  // ═══ States ═══
  const [formData, setFormData] = useState({
    firstName: '',
    fatherName: '',
    grandfatherName: '',
    phone: '',
    email: '',
    nationalId: '',
    birthDate: '',
    city: '',
    job: '',
    jobOther: '',
    password: '',
    confirmPassword: '',
    branch: '',
    maritalStatus: '',
  });

  const [selectedFather, setSelectedFather] = useState(null);
  const [treeData, setTreeData] = useState([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [matchResult, setMatchResult] = useState(null);

  // ═══ الحقول الرقمية للتنسيق ═══
  const NUMERIC_FIELDS = ['phone', 'nationalId'];

  // ═══ Functions ═══
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    const newValue = NUMERIC_FIELDS.includes(name) ? normalizeDigits(value) : value;
    setFormData(prev => ({ ...prev, [name]: newValue }));
  };

  // تحميل الشجرة
  useEffect(() => {
    let isMounted = true;
    
    const fetchTree = async () => {
      setTreeLoading(true);
      try {
        const res = await fetch(import.meta.env.VITE_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getFamilyTree' }),
        });
        const data = await res.json();
        if (isMounted && data.success && data.tree) {
          setTreeData(data.tree);
        }
      } catch (error) {
        console.error('Error loading tree:', error);
      } finally {
        if (isMounted) setTreeLoading(false);
      }
    };
    
    fetchTree();
    return () => { isMounted = false; };
  }, []);

  // التحقق من المطابقة
  const checkMatch = useCallback(async () => {
    if (!selectedFather || !formData.firstName || !formData.nationalId || !formData.birthDate) {
      return;
    }

    try {
      const res = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'checkChildMatch',
          parentNodeId: selectedFather.id,
          firstName: formData.firstName,
          nationalId: formData.nationalId,
          birthDate: formData.birthDate,
        }),
      });
      const data = await res.json();
      if (data.success && data.match) {
        setMatchResult(data.match);
      } else {
        setMatchResult(null);
      }
    } catch (error) {
      console.error('Error checking match:', error);
      setMatchResult(null);
    }
  }, [selectedFather, formData.firstName, formData.nationalId, formData.birthDate]);

  // تحديث اسم الأب والفخذ عند اختيار والد
  useEffect(() => {
    if (selectedFather && selectedFather.name) {
      setFormData(prev => ({
        ...prev,
        fatherName: prev.fatherName || selectedFather.name,
        branch: prev.branch || selectedFather.branch || '',
      }));
    }
  }, [selectedFather]);

  // التحقق من المطابقة مع تأخير
  useEffect(() => {
    if (selectedFather && formData.firstName && formData.nationalId && formData.birthDate) {
      const timer = setTimeout(() => {
        checkMatch();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [selectedFather, formData.firstName, formData.nationalId, formData.birthDate, checkMatch]);

  // التحقق من صحة البيانات
  const validateForm = () => {
    const nameRe = /^[؀-ۿ]+([\s][؀-ۿ]+)*$/;
    if (!nameRe.test(formData.firstName.trim())) {
      setMessage('الاسم الأول يجب أن يكون بالعربية');
      setMessageType('error');
      return false;
    }
    if (!formData.phone.trim()) {
      setMessage('رقم الجوال مطلوب');
      setMessageType('error');
      return false;
    }
    if (!formData.nationalId.trim()) {
      setMessage('رقم الهوية مطلوب');
      setMessageType('error');
      return false;
    }
    if (!/^\d{10}$/.test(formData.nationalId.replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)))) {
      setMessage('رقم الهوية يجب أن يكون 10 أرقام');
      setMessageType('error');
      return false;
    }
    if (!formData.birthDate) {
      setMessage('تاريخ الميلاد مطلوب');
      setMessageType('error');
      return false;
    }
    if (!formData.job) {
      setMessage('المهنة مطلوبة');
      setMessageType('error');
      return false;
    }
    if (formData.job === 'أخرى' && !formData.jobOther.trim()) {
      setMessage('يرجى تحديد المهنة');
      setMessageType('error');
      return false;
    }
    if (!formData.maritalStatus) {
      setMessage('الحالة الاجتماعية مطلوبة');
      setMessageType('error');
      return false;
    }
    if (!selectedFather) {
      setMessage('يجب اختيار الوالد من الشجرة');
      setMessageType('error');
      return false;
    }
    if (formData.password.length < 6) {
      setMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      setMessageType('error');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setMessage('كلمة المرور وتأكيدها غير متطابقتين');
      setMessageType('error');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setMessageType('');

    if (!validateForm()) return;

    const jobFinal = formData.job === 'أخرى' ? formData.jobOther.trim() : formData.job;

    setLoading(true);

    try {
      const payload = {
        action: 'register',
        firstName: formData.firstName.trim(),
        fatherName: formData.fatherName.trim() || selectedFather.name,
        grandfatherName: formData.grandfatherName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        nationalId: formData.nationalId.trim(),
        birthDate: formData.birthDate,
        city: formData.city.trim(),
        job: jobFinal,
        password: formData.password,
        branch: formData.branch || selectedFather.branch || '',
        maritalStatus: formData.maritalStatus,
        parentNodeId: selectedFather.id,
        selectedFatherName: selectedFather.name,
        treePath: selectedFather.path || selectedFather.name,
      };

      const res = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        setMessage('تم إرسال طلب التسجيل بنجاح! سيتم مراجعته من قبل الإدارة.');
        setMessageType('success');
        
        setFormData({
          firstName: '',
          fatherName: '',
          grandfatherName: '',
          phone: '',
          email: '',
          nationalId: '',
          birthDate: '',
          city: '',
          job: '',
          jobOther: '',
          password: '',
          confirmPassword: '',
          branch: '',
          maritalStatus: '',
        });
        setSelectedFather(null);
        setMatchResult(null);

        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setMessage(data.message || 'حدث خطأ أثناء التسجيل');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setMessage('تعذّر الاتصال بالخادم');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // ═══ Render ═══
  
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16"
      style={{ background: 'linear-gradient(135deg, #0f0c1f 0%, #1a1528 100%)' }}>
      <div className="relative w-full max-w-4xl"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 35,
          padding: 40,
          backdropFilter: 'blur(24px)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)'
        }}>

        {loading && (
          <div style={{
            position: 'absolute',
            inset: -1,
            borderRadius: 36,
            background: 'conic-gradient(from 0deg,transparent 0%,transparent 68%,rgba(198,161,107,0.9) 85%,transparent 100%)',
            animation: 'border-orbit 1.8s linear infinite',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            padding: 1,
            pointerEvents: 'none'
          }} />
        )}

        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold" style={{ color: '#c6a16b' }}>طلب عضوية جديدة</h1>
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
            {' '}<span className="font-bold" style={{ color: '#fdba74' }}>قبيلة السلامي</span>.
            {' '}العضوية مقتصرة حصراً على أبناء هذا الفخذ الكريم، وذلك حفاظاً على دقة السجل العائلي.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {message && (
            <div className={`font-nav text-sm text-center py-2.5 px-4 rounded-2xl ${
              messageType === 'success' 
                ? 'bg-green-500/10 border border-green-500/25 text-green-400'
                : 'bg-red-500/10 border border-red-500/25 text-red-400'
            }`}>
              {message}
            </div>
          )}

          {matchResult && (
            <div className="bg-blue-500/10 border border-blue-500/25 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-blue-400 text-xl">ℹ️</span>
                <div>
                  <p className="font-semibold text-blue-400 mb-1">تم العثور على مطابقة!</p>
                  <p className="text-blue-300 text-sm">
                    والدك <span className="font-semibold">{matchResult.fatherName}</span> قام بإضافتك مسبقاً.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-amber-900/20 p-6 rounded-2xl border border-amber-700/30">
            <label className="block text-lg font-semibold mb-3" style={{ color: '#c6a16b' }}>
              اختر والدك من الشجرة <span className="text-red-400">*</span>
            </label>
            
            {treeLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
                <p className="mt-2 text-amber-400">جاري تحميل الشجرة...</p>
              </div>
            ) : (
              <TreeNavigator
                tree={treeData}
                onSelect={setSelectedFather}
                selectedNode={selectedFather}
              />
            )}

            {selectedFather && (
              <div className="mt-4 p-4 bg-black/30 rounded-xl border border-amber-700/30">
                <p className="text-sm text-amber-300">
                  <span className="font-semibold">الوالد المختار:</span> {selectedFather.name}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block mb-1.5 text-sm text-gray-400 font-nav">الاسم الأول *</label>
            <input type="text" name="firstName" required value={formData.firstName}
              onChange={handleChange} className="w-full px-4 py-2 rounded-xl bg-black/30 border border-gray-700 text-white focus:border-amber-500 focus:outline-none transition"
              placeholder="اسمك الأول فقط — مثال: محمد" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-sm text-gray-400 font-nav">اسم الأب</label>
              <input type="text" name="fatherName" value={formData.fatherName}
                onChange={handleChange} placeholder={selectedFather ? selectedFather.name : ''}
                className="w-full px-4 py-2 rounded-xl bg-black/30 border border-gray-700 text-white focus:border-amber-500 focus:outline-none transition bg-gray-800/50" />
            </div>
            <div>
              <label className="block mb-1.5 text-sm text-gray-400 font-nav">اسم الجد</label>
              <input type="text" name="grandfatherName" value={formData.grandfatherName}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-xl bg-black/30 border border-gray-700 text-white focus:border-amber-500 focus:outline-none transition" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-sm text-gray-400 font-nav">رقم الجوال *</label>
              <input type="tel" name="phone" required inputMode="numeric" value={formData.phone}
                onChange={handleChange} className="w-full px-4 py-2 rounded-xl bg-black/30 border border-gray-700 text-white focus:border-amber-500 focus:outline-none transition"
                placeholder="05xxxxxxxx" />
            </div>
            <div>
              <label className="block mb-1.5 text-sm text-gray-400 font-nav">رقم الهوية *</label>
              <input type="text" name="nationalId" required inputMode="numeric" value={formData.nationalId}
                onChange={handleChange} className="w-full px-4 py-2 rounded-xl bg-black/30 border border-gray-700 text-white focus:border-amber-500 focus:outline-none transition"
                placeholder="10 أرقام" maxLength={10} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-sm text-gray-400 font-nav">تاريخ الميلاد *</label>
              <input type="date" name="birthDate" required value={formData.birthDate}
                onChange={handleChange} className="w-full px-4 py-2 rounded-xl bg-black/30 border border-gray-700 text-white focus:border-amber-500 focus:outline-none transition" />
            </div>
            <div>
              <label className="block mb-1.5 text-sm text-gray-400 font-nav">البريد الإلكتروني</label>
              <input type="email" name="email" value={formData.email}
                onChange={handleChange} className="w-full px-4 py-2 rounded-xl bg-black/30 border border-gray-700 text-white focus:border-amber-500 focus:outline-none transition"
                placeholder="example@email.com" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-sm text-gray-400 font-nav">المدينة</label>
              <input type="text" name="city" value={formData.city}
                onChange={handleChange} className="w-full px-4 py-2 rounded-xl bg-black/30 border border-gray-700 text-white focus:border-amber-500 focus:outline-none transition"
                placeholder="مدينة الإقامة" />
            </div>
            <div>
              <label className="block mb-1.5 text-sm text-gray-400 font-nav">الفخذ</label>
              <select name="branch" value={formData.branch} onChange={handleChange}
                className="w-full px-4 py-2 rounded-xl bg-black/30 border border-gray-700 text-white focus:border-amber-500 focus:outline-none transition">
                <option value="">-- اختر الفخذ --</option>
                {branches.map((branch) => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-sm text-gray-400 font-nav">المهنة *</label>
              <select name="job" required value={formData.job} onChange={handleChange}
                className="w-full px-4 py-2 rounded-xl bg-black/30 border border-gray-700 text-white focus:border-amber-500 focus:outline-none transition">
                <option value="">— اختر المهنة —</option>
                {JOBS.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-1.5 text-sm text-gray-400 font-nav">الحالة الاجتماعية *</label>
              <select name="maritalStatus" required value={formData.maritalStatus} onChange={handleChange}
                className="w-full px-4 py-2 rounded-xl bg-black/30 border border-gray-700 text-white focus:border-amber-500 focus:outline-none transition">
                <option value="">— اختر —</option>
                {MARITAL_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {formData.job === 'أخرى' && (
            <div>
              <label className="block mb-1.5 text-sm text-gray-400 font-nav">اذكر مهنتك</label>
              <input type="text" name="jobOther" value={formData.jobOther}
                onChange={handleChange} className="w-full px-4 py-2 rounded-xl bg-black/30 border border-gray-700 text-white focus:border-amber-500 focus:outline-none transition"
                placeholder="مثال: مقاول" />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-sm text-gray-400 font-nav">كلمة المرور *</label>
              <input type="password" name="password" value={formData.password}
                onChange={handleChange} className="w-full px-4 py-2 rounded-xl bg-black/30 border border-gray-700 text-white focus:border-amber-500 focus:outline-none transition"
                placeholder="6 أحرف على الأقل" minLength={6} />
            </div>
            <div>
              <label className="block mb-1.5 text-sm text-gray-400 font-nav">تأكيد كلمة المرور *</label>
              <input type="password" name="confirmPassword" value={formData.confirmPassword}
                onChange={handleChange} className="w-full px-4 py-2 rounded-xl bg-black/30 border border-gray-700 text-white focus:border-amber-500 focus:outline-none transition"
                placeholder="أعد كتابة كلمة المرور" />
            </div>
          </div>

          <div className="pt-4 flex justify-center gap-4">
            <button type="submit" disabled={loading || !selectedFather}
              className="font-nav bg-[#c6a16b] text-black font-bold flex items-center justify-center overflow-hidden transition-all hover:bg-[#d4b07a] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ height: 56, width: loading ? 56 : '100%', borderRadius: loading ? '50%' : 14 }}>
              {loading ? <div className="btn-spinner w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" /> : 'إرسال طلب العضوية'}
            </button>
            
            <button type="button" onClick={() => navigate('/login')}
              className="px-6 py-3 border-2 border-[#c6a16b] text-[#c6a16b] rounded-xl hover:bg-[#c6a16b]/10 font-semibold transition-colors">
              لديك حساب؟
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
