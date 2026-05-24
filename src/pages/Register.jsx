import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import TreeNavigator from '../components/TreeNavigator';

export default function Register() {
  const navigate = useNavigate();
  
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
  
  // استخدام useRef لتجنب التحديثات غير المرغوب فيها
  const isInitialMount = useRef(true);
  const prevSelectedFatherId = useRef(null);

  // ═══ الفخوذ الصحيحة ═══
  const branches = [
    'آل صاحب',
    'آل شامي',
    'آل يحيى',
    'آل علي " سيد "',
    'آل ابراهيم " الشقيق "'
  ];

  // ═══ Functions ═══
  
  // ✅ فصل منطق التحميل عن الـ Effect
  const loadTreeData = useCallback(async () => {
    setTreeLoading(true);
    try {
      const res = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getFamilyTree' }),
      });
      const data = await res.json();
      if (data.success && data.tree) {
        setTreeData(data.tree);
      }
    } catch (error) {
      console.error('Error loading tree:', error);
    } finally {
      setTreeLoading(false);
    }
  }, []);

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setMessageType('');

    if (!formData.firstName || !formData.phone || !formData.nationalId || 
        !formData.birthDate || !formData.password) {
      setMessage('جميع الحقول المطلوبة يجب تعبئتها');
      setMessageType('error');
      return;
    }

    if (!selectedFather) {
      setMessage('يجب اختيار الوالد من الشجرة');
      setMessageType('error');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setMessage('كلمة المرور غير متطابقة');
      setMessageType('error');
      return;
    }

    if (formData.password.length < 6) {
      setMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      setMessageType('error');
      return;
    }

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
        job: formData.job.trim(),
        password: formData.password,
        branch: formData.branch || selectedFather.branch || '',
        maritalStatus: formData.maritalStatus.trim(),
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
      setMessage('حدث خطأ في الاتصال بالخادم');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // ═══ useEffect ═══
  
  // ✅ تحميل الشجرة - استخدام async/await بشكل صحيح داخل useEffect
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
        if (isMounted) {
          setTreeLoading(false);
        }
      }
    };
    
    fetchTree();
    
    return () => {
      isMounted = false;
    };
  }, []); // ✅ array فارغ، يتم التنفيذ مرة واحدة فقط

  // تحديث البيانات عند اختيار والد جديد
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevSelectedFatherId.current = selectedFather?.id;
      return;
    }
    
    if (selectedFather && selectedFather.name && prevSelectedFatherId.current !== selectedFather.id) {
      setFormData(prev => ({
        ...prev,
        fatherName: prev.fatherName || selectedFather.name,
        branch: prev.branch || selectedFather.branch || '',
      }));
      prevSelectedFatherId.current = selectedFather.id;
    }
  }, [selectedFather]);

  // التحقق من المطابقة
  useEffect(() => {
    if (selectedFather && formData.firstName && formData.nationalId && formData.birthDate) {
      const timer = setTimeout(() => {
        checkMatch();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [selectedFather, formData.firstName, formData.nationalId, formData.birthDate, checkMatch]);

  // ═══ Render ═══
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-amber-900 mb-2">تسجيل عضو جديد</h1>
          <p className="text-amber-700">انضم إلى عائلة السلامي</p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8">
          {message && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                messageType === 'success'
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : 'bg-red-100 text-red-800 border border-red-300'
              }`}
            >
              {message}
            </div>
          )}

          {matchResult && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-300 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="font-semibold text-blue-900 mb-1">تم العثور على مطابقة!</p>
                  <p className="text-blue-800 text-sm">
                    والدك <span className="font-semibold">{matchResult.fatherName}</span> قام بإضافتك مسبقاً في سجل الأبناء.
                    {matchResult.matchType === 'exact' && ' (مطابقة تامة: الاسم + الهوية + تاريخ الميلاد)'}
                    {matchResult.matchType === 'name_nid' && ' (مطابقة: الاسم + الهوية)'}
                    {matchResult.matchType === 'name_bd' && ' (مطابقة: الاسم + تاريخ الميلاد)'}
                    {matchResult.matchType === 'name_only' && ' (مطابقة: الاسم فقط)'}
                  </p>
                  {matchResult.preAssignedId && (
                    <p className="text-blue-700 text-sm mt-1">
                      ✓ سيتم ربط حسابك تلقائياً بعد الموافقة
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-amber-50 p-6 rounded-lg border-2 border-amber-200">
              <label className="block text-lg font-semibold text-amber-900 mb-3">
                اختر والدك من الشجرة <span className="text-red-600">*</span>
              </label>
              
              {treeLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                  <p className="mt-2 text-amber-700">جاري تحميل الشجرة...</p>
                </div>
              ) : (
                <TreeNavigator
                  tree={treeData}
                  onSelect={setSelectedFather}
                  selectedNode={selectedFather}
                />
              )}

              {selectedFather && (
                <div className="mt-4 p-4 bg-white rounded-lg border border-amber-300">
                  <p className="text-sm text-amber-900">
                    <span className="font-semibold">الوالد المختار:</span> {selectedFather.name}
                  </p>
                  {selectedFather.path && (
                    <p className="text-xs text-amber-700 mt-1">
                      <span className="font-semibold">المسار:</span> {selectedFather.path}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الاسم الأول <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اسم الأب
                </label>
                <input
                  type="text"
                  name="fatherName"
                  value={formData.fatherName}
                  onChange={handleChange}
                  placeholder={selectedFather ? selectedFather.name : ''}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اسم الجد
                </label>
                <input
                  type="text"
                  name="grandfatherName"
                  value={formData.grandfatherName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الفخذ
                </label>
                <select
                  name="branch"
                  value={formData.branch}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="">-- اختر الفخذ --</option>
                  {branches.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رقم الجوال <span className="text-red-600">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="05xxxxxxxx"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رقم الهوية <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="nationalId"
                  value={formData.nationalId}
                  onChange={handleChange}
                  maxLength="10"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تاريخ الميلاد <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المدينة
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المهنة
                </label>
                <input
                  type="text"
                  name="job"
                  value={formData.job}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الحالة الاجتماعية
                </label>
                <select
                  name="maritalStatus"
                  value={formData.maritalStatus}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="">-- اختر --</option>
                  <option value="أعزب">أعزب</option>
                  <option value="متزوج">متزوج</option>
                  <option value="مطلق">مطلق</option>
                  <option value="أرمل">أرمل</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  كلمة المرور <span className="text-red-600">*</span>
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                  minLength="6"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تأكيد كلمة المرور <span className="text-red-600">*</span>
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <button
                type="submit"
                disabled={loading || !selectedFather}
                className="flex-1 bg-amber-600 text-white py-3 px-6 rounded-lg hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition-colors"
              >
                {loading ? 'جاري الإرسال...' : 'تسجيل'}
              </button>
              
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="px-6 py-3 border-2 border-amber-600 text-amber-600 rounded-lg hover:bg-amber-50 font-semibold transition-colors"
              >
                لديك حساب؟
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}