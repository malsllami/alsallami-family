import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TreeNavigator from '../components/TreeNavigator';
import PhoneInput from '../components/PhoneInput';
import DateInput from '../components/DateInput';
import PasswordInput from '../components/PasswordInput';
import { normalizeDigits } from '../utils/normalizeInput';

export default function Register() {
  const navigate = useNavigate();

  const JOBS           = ['موظف', 'طالب', 'متقاعد', 'رجل أعمال', 'أخرى'];
  const MARITAL_STATUS = ['أعزب', 'متزوج', 'مطلق', 'أرمل'];

  const [formData, setFormData] = useState({
    firstName: '', phone: '', nationalId: '', birthDate: '',
    job: '', jobOther: '', maritalStatus: '', password: '', confirmPassword: '',
    email: '', city: '',
  });
  const [countryCode, setCountryCode] = useState('+966');

  const [treeData,          setTreeData]          = useState(null);
  const [treeLoading,       setTreeLoading]       = useState(true);
  const [selectedFather,    setSelectedFather]    = useState(null);
  const [selectedGrandfa,   setSelectedGrandfa]   = useState(null);
  const [selectedSelf,      setSelectedSelf]      = useState(null);
  const [selectedSon,       setSelectedSon]       = useState(null);
  const [fatherNotInTree,   setFatherNotInTree]   = useState('');
  const [fatherMatch,       setFatherMatch]       = useState(null);  // 'found' | 'notfound' | null
  const [loading,           setLoading]           = useState(false);
  const [message,           setMessage]           = useState('');
  const [messageType,       setMessageType]       = useState('');
  const [registrantHint,    setRegistrantHint]    = useState(null);  // { type, text } | null
  const [successInfo,       setSuccessInfo]       = useState(null);  // { requestId, branch, name }

  const NUMERIC_FIELDS = ['nationalId'];
  const handleChange = (e) => {
    const { name, value } = e.target;
    const newVal = NUMERIC_FIELDS.includes(name) ? normalizeDigits(value) : value;
    setFormData(prev => ({ ...prev, [name]: newVal }));
    if (name === 'firstName' && selectedFather) checkMatch(newVal, selectedFather);
    if (name === 'nationalId') {
      const digits = newVal.replace(/\D/g, '');
      if (digits.length === 10) {
        fetch(import.meta.env.VITE_API_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'checkRegistrant', nationalId: digits }),
        })
          .then(r => r.json())
          .then(d => {
            if (!d.success || !d.found) { setRegistrantHint(null); return; }
            if (d.type === 'child_record') {
              setRegistrantHint({ type: 'child', text: `تم العثور على بياناتك في سجلات الأبناء — ابحث عن والدك "${d.fatherName}" واضغط "هذا والدي"` });
            } else if (d.type === 'admin_member') {
              setRegistrantHint({ type: 'admin', text: `وُجد حسابك في النظام — بياناتك ستُكمَل تلقائياً عند الموافقة` });
            } else if (d.type === 'already_registered') {
              setRegistrantHint({ type: 'error', text: 'هذا الرقم مسجَّل مسبقاً، يرجى تسجيل الدخول' });
            }
          })
          .catch(() => setRegistrantHint(null));
      } else {
        setRegistrantHint(null);
      }
    }
  };

  // تحميل الشجرة
  useEffect(() => {
    let mounted = true;
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
    const pathStr = node.computedPath || node.path || '';
    const pathParts = pathStr.split(' ← ').map(s => s.trim()).filter(Boolean);
    const branch = pathParts[2] || pathParts[1] || pathParts[0] || '';
    setSelectedFather({ ...node, branch });
    setSelectedGrandfa(null); setSelectedSelf(null); setSelectedSon(null);
    setFatherNotInTree('');
    checkMatch(formData.firstName, node);
  };

  const handleSelectGrandfather = (node) => {
    setSelectedGrandfa(node);
    setSelectedFather(null); setSelectedSelf(null); setSelectedSon(null);
    setFatherMatch(null);
  };

  const handleSelectSelf = (selfNode, path) => {
    const grandfatherName = path.length >= 3 ? (path[path.length - 3].name || '').split(' ')[0] : '';
    const pathStr = selfNode.computedPath || selfNode.path || '';
    const pathParts = pathStr.split(' ← ').map(s => s.trim()).filter(Boolean);
    const branch = pathParts[2] || pathParts[1] || pathParts[0] || '';
    setSelectedSelf({ ...selfNode, branch, derivedGrandfatherName: grandfatherName });
    setSelectedFather(null); setSelectedGrandfa(null); setSelectedSon(null);
    setFatherMatch(null);
  };

  const handleSelectSon = (sonNode, path) => {
    // path from root to sonNode (inclusive) — user is sonNode's parent
    const fatherNode      = path.length >= 2 ? path[path.length - 2] : null;
    const grandfatherNode = path.length >= 3 ? path[path.length - 3] : null;
    const pathStr = sonNode.computedPath || '';
    const pathParts = pathStr.split(' ← ').map(s => s.trim()).filter(Boolean);
    const branch = pathParts[2] || pathParts[1] || pathParts[0] || '';
    // user's path = son's path minus son's own name
    const userPathParts = pathParts.slice(0, -1);
    setSelectedSon({
      ...sonNode,
      branch,
      derivedFatherName:       fatherNode      ? fatherNode.name.split(' ')[0]      : (sonNode.parentName || '').split(' ')[0],
      derivedGrandfatherName:  grandfatherNode  ? grandfatherNode.name.split(' ')[0] : '',
      derivedGeneration:       (sonNode.generationLevel || 1) - 1,
      derivedParentId:         sonNode.parentId || '',
      derivedParentName:       fatherNode ? fatherNode.name : (sonNode.parentName || ''),
      derivedUserPath:         userPathParts.join(' ← '),
    });
    setSelectedFather(null); setSelectedGrandfa(null); setSelectedSelf(null);
    setFatherMatch(null);
  };

  const validate = () => {
    const nameRe = /^[؀-ۿ]+([\s][؀-ۿ]+)*$/;
    if (!nameRe.test(formData.firstName.trim()))        { setMessage('الاسم الأول يجب أن يكون بالعربية'); return false; }
    if (!formData.nationalId.trim())                    { setMessage('رقم الهوية مطلوب'); return false; }
    if (!/^\d{10}$/.test(formData.nationalId.replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))))
                                                        { setMessage('رقم الهوية يجب أن يكون 10 أرقام'); return false; }
    if (!formData.birthDate)                            { setMessage('تاريخ الميلاد مطلوب'); return false; }
    if (!selectedFather && !selectedSelf && !selectedSon && !(selectedGrandfa && fatherNotInTree.trim()))
                                                        { setMessage('يجب اختيار والدك من الشجرة، أو اختيار جدك وكتابة اسم والدك'); return false; }
    if (selectedGrandfa && !fatherNotInTree.trim() && !selectedSelf && !selectedSon) { setMessage('يرجى كتابة اسم والدك'); return false; }
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

    // Resolve grandfather-mode: check if typed father name exists among grandfather's children
    let grandfaChildMatch = null;
    if (selectedGrandfa && fatherNotInTree.trim()) {
      grandfaChildMatch = (selectedGrandfa.children || []).find(
        c => (c.name || '').split(' ')[0].trim() === fatherNotInTree.trim()
      ) || null;
    }

    // Determine effective parent node
    const parentNode = selectedSelf
      ? { id: selectedSelf.parentId || '', generationLevel: (selectedSelf.generationLevel || 1) - 1 }
      : selectedSon
        ? { id: selectedSon.derivedParentId, generationLevel: selectedSon.derivedGeneration }
        : selectedFather
          ? selectedFather
          : grandfaChildMatch
            ? { ...grandfaChildMatch, branch: selectedGrandfa.branch || '' }
            : selectedGrandfa;

    setLoading(true);
    try {
      const res = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        body: JSON.stringify({
          action:          'register',
          firstName:       formData.firstName.trim(),
          phone:           countryCode + formData.phone.trim(),
          nationalId:      formData.nationalId.trim(),
          birthDate:       formData.birthDate,
          job:             jobFinal,
          maritalStatus:   formData.maritalStatus,
          password:        formData.password,
          email:           formData.email.trim(),
          city:            formData.city.trim(),
          parentNodeId:    selectedSelf ? (selectedSelf.parentId || '')
                         : selectedSon  ? selectedSon.derivedParentId
                         : parentNode.id,
          fatherName:      selectedSelf  ? (selectedSelf.parentName || '').split(' ')[0]
                         : selectedSon   ? selectedSon.derivedFatherName
                         : selectedFather ? selectedFather.name.split(' ')[0]
                         : fatherNotInTree.trim(),
          grandfatherName: selectedSelf  ? (selectedSelf.derivedGrandfatherName || '')
                         : selectedSon   ? selectedSon.derivedGrandfatherName
                         : selectedFather ? (selectedFather.parentName || '').split(' ')[0]
                         : (selectedGrandfa?.name || '').split(' ')[0],
          generation:      selectedSelf  ? String(selectedSelf.generationLevel || 1)
                         : selectedSon   ? String(selectedSon.derivedGeneration)
                         : String((parentNode.generationLevel || 0) + 1),
          branch:          selectedSelf  ? (selectedSelf.branch || '')
                         : selectedSon   ? (selectedSon.branch || '')
                         : (selectedFather?.branch) || (selectedGrandfa?.computedPath || selectedGrandfa?.path || '').split(' ← ')[2] || '',
          matchedInFather: !selectedSelf && !selectedSon && (fatherMatch === 'found' || Boolean(grandfaChildMatch)),
          fatherNotInTree: !selectedSelf && !selectedSon && Boolean(selectedGrandfa && !grandfaChildMatch),
          grandfatherId:   !selectedSelf && !selectedSon && selectedGrandfa && !grandfaChildMatch ? selectedGrandfa.id : undefined,
          sonNodeId:       selectedSon  ? selectedSon.id  : undefined,
          selfNodeId:      selectedSelf ? selectedSelf.id : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const branchFinal = selectedSelf  ? (selectedSelf.branch  || '')
                          : selectedSon   ? (selectedSon.branch   || '')
                          : (selectedFather?.branch) ||
                            (selectedGrandfa?.computedPath || selectedGrandfa?.path || '').split(' ← ')[2] || '';
        setSuccessInfo({ requestId: data.requestId || '', branch: branchFinal, name: formData.firstName.trim() });
        setMessage('تم إرسال طلب التسجيل بنجاح — سيتم مراجعته من قِبل المدير');
        setMessageType('success');
      } else {
        setMessage(data.message || 'حدث خطأ');
        setMessageType(data.status === 'pending' ? 'pending' : 'error');
      }
    } catch {
      setMessage('تعذّر الاتصال بالخادم');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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
                : messageType === 'pending'
                  ? { background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.28)', color: '#eab308' }
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
          {registrantHint && (
            <div className="font-nav text-sm px-4 py-3 rounded-2xl"
              style={registrantHint.type === 'error'
                ? { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }
                : registrantHint.type === 'admin'
                  ? { background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.3)', color: '#2dd4bf' }
                  : { background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.3)', color: '#fdba74' }
              }>
              {registrantHint.text}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="رقم الهوية *">
              <input name="nationalId" required inputMode="numeric" value={formData.nationalId}
                onChange={handleChange} className="form-input" placeholder="10 أرقام" maxLength={10} />
            </Field>
            <Field label="تاريخ الميلاد *">
              <DateInput
                value={formData.birthDate}
                onChange={val => setFormData(prev => ({ ...prev, birthDate: val }))}
                required
              />
            </Field>
          </div>

          {/* 3. اختيار الأب من الشجرة */}
          <div className="rounded-2xl p-5"
            style={{ background: 'rgba(198,161,107,0.04)', border: '1px solid rgba(198,161,107,0.18)' }}>
            <p className="font-nav text-base font-bold mb-2" style={{ color: 'var(--gold-main)' }}>
              اختر والدك من الشجرة *
            </p>
            <p className="font-nav text-sm mb-4 leading-relaxed" style={{ color: 'rgba(255,255,255,0.90)' }}>
              ابدأ باختيار الفخذ ثم تدرّج — اضغط <span style={{ color: 'var(--gold-main)', fontWeight: 700 }}>&quot;هذا والدي&quot;</span> عند والدك، أو <span style={{ color: '#2dd4bf', fontWeight: 700 }}>&quot;هذا أنا&quot;</span> إن كان اسمك موجوداً مسبقاً في الشجرة
            </p>

            {treeLoading ? (
              <p className="font-nav text-xs text-center py-4" style={{ color: 'rgba(255,255,255,0.70)' }}>
                جاري تحميل الشجرة...
              </p>
            ) : (
              <TreeNavigator
                treeData={treeData}
                onSelect={() => {}}
                selected={null}
                onSelectFather={handleSelectFather}
                selectedFatherId={selectedFather?.id}
                onSelectGrandfather={handleSelectGrandfather}
                selectedGrandfatherId={selectedGrandfa?.id}
                onSelectSelf={handleSelectSelf}
                selectedSelfId={selectedSelf?.id}
                onSelectSon={handleSelectSon}
                selectedSonId={selectedSon?.id}
              />
            )}

            {/* الوالد المختار */}
            {selectedFather && (
              <div className="mt-4 rounded-xl p-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="font-nav text-xs mb-1" style={{ color: 'rgba(255,255,255,0.72)' }}>الوالد المختار:</p>
                <p className="font-nav text-sm font-semibold" style={{ color: 'var(--gold-main)' }}>{selectedFather.name}</p>
                {selectedFather.branch && (
                  <p className="font-nav text-xs mt-1" style={{ color: 'rgba(255,255,255,0.72)' }}>
                    الفخذ: <span style={{ color: 'var(--gold-main)' }}>{selectedFather.branch}</span>
                  </p>
                )}
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

            {/* موقعي في الشجرة — هذا أنا */}
            {selectedSelf && (
              <div className="mt-4 rounded-xl p-3"
                style={{ background: 'rgba(20,184,166,0.06)', border: '1px solid rgba(20,184,166,0.25)' }}>
                <p className="font-nav text-xs mb-1" style={{ color: 'rgba(255,255,255,0.72)' }}>موقعك في الشجرة:</p>
                <p className="font-nav text-sm font-semibold" style={{ color: '#2dd4bf' }}>{selectedSelf.name}</p>
                <p className="font-nav text-xs mt-1" style={{ color: 'rgba(255,255,255,0.72)' }}>
                  الجيل: <span style={{ color: '#2dd4bf' }}>{selectedSelf.generationLevel}</span>
                  {selectedSelf.parentName && <> &nbsp;|&nbsp; الوالد: <span style={{ color: '#2dd4bf' }}>{selectedSelf.parentName}</span></>}
                </p>
                <p className="font-nav text-xs mt-2" style={{ color: '#34d399' }}>
                  ✓ موجود في الشجرة — سيتم الربط التلقائي بحسابك عند الموافقة
                </p>
              </div>
            )}

            {/* ابني في الشجرة — هذا ابني */}
            {selectedSon && (
              <div className="mt-4 rounded-xl p-3"
                style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.25)' }}>
                <p className="font-nav text-xs mb-1" style={{ color: 'rgba(255,255,255,0.72)' }}>ابنك الموجود في الشجرة:</p>
                <p className="font-nav text-sm font-semibold" style={{ color: '#a78bfa' }}>{selectedSon.name}</p>
                <p className="font-nav text-xs mt-1" style={{ color: 'rgba(255,255,255,0.72)' }}>
                  جيله: <span style={{ color: '#a78bfa' }}>{selectedSon.generationLevel}</span>
                  &nbsp;|&nbsp; جيلك أنت: <span style={{ color: '#a78bfa' }}>{selectedSon.derivedGeneration}</span>
                  {selectedSon.derivedFatherName && <> &nbsp;|&nbsp; والدك: <span style={{ color: '#a78bfa' }}>{selectedSon.derivedFatherName}</span></>}
                </p>
                <p className="font-nav text-xs mt-2" style={{ color: '#34d399' }}>
                  ✓ سيتم إضافتك في الشجرة كوالد لهذه العقدة عند الموافقة
                </p>
              </div>
            )}

            {/* الجد المختار — الوالد غير موجود */}
            {selectedGrandfa && (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl p-3"
                  style={{ background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.2)' }}>
                  <p className="font-nav text-xs mb-1" style={{ color: 'rgba(255,255,255,0.72)' }}>الجد المختار:</p>
                  <p className="font-nav text-sm font-semibold" style={{ color: '#fb923c' }}>{selectedGrandfa.name}</p>
                  {(selectedGrandfa.children || []).find(c => (c.name || '').split(' ')[0].trim() === fatherNotInTree.trim()) && (
                    <p className="font-nav text-xs mt-2" style={{ color: '#34d399' }}>
                      ✓ تم العثور على اسم والدك في أبناء هذا الجد — سيُربط تلقائياً
                    </p>
                  )}
                </div>
                <div>
                  <label className="font-nav text-xs mb-1.5 block" style={{ color: 'rgba(255,255,255,0.80)' }}>
                    اسم والدك (غير الموجود في الشجرة) *
                  </label>
                  <input type="text" value={fatherNotInTree}
                    onChange={e => setFatherNotInTree(e.target.value)}
                    className="form-input" placeholder="اسم الأب الكامل" />
                </div>
              </div>
            )}
          </div>

          {/* 4. رقم الجوال */}
          <Field label="رقم الجوال *">
            <PhoneInput
              value={formData.phone}
              onChange={val => setFormData(prev => ({ ...prev, phone: val }))}
              countryCode={countryCode}
              onCountryChange={setCountryCode}
            />
          </Field>

          {/* 5. البريد الإلكتروني + المدينة */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="البريد الإلكتروني">
              <input name="email" type="email" value={formData.email}
                onChange={handleChange} className="form-input" placeholder="example@email.com" dir="ltr" />
            </Field>
            <Field label="المدينة">
              <input name="city" value={formData.city}
                onChange={handleChange} className="form-input" placeholder="مثال: جدة" />
            </Field>
          </div>

          {/* 6. الحالة الاجتماعية + المهنة */}
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

          {/* 7. كلمة المرور */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="كلمة المرور *">
              <PasswordInput name="password" value={formData.password}
                onChange={handleChange} placeholder="6 أحرف على الأقل" minLength={6} />
            </Field>
            <Field label="تأكيد كلمة المرور *">
              <PasswordInput name="confirmPassword" value={formData.confirmPassword}
                onChange={handleChange} placeholder="أعد كتابة كلمة المرور" />
            </Field>
          </div>

          <div className="pt-4 space-y-3">
            <button type="submit" disabled={loading || (!selectedFather && !selectedSelf && !selectedSon && !(selectedGrandfa && fatherNotInTree.trim()))}
              className="font-nav bg-[var(--gold-main)] text-black font-bold flex items-center justify-center overflow-hidden transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed w-full"
              style={{ height: 56, borderRadius: loading ? '50%' : 14,
                transition: 'border-radius 0.5s cubic-bezier(0.23,1,0.32,1)' }}>
              {loading ? <div className="btn-spinner" /> : 'إرسال طلب العضوية'}
            </button>
            <button type="button" onClick={() => navigate('/login')}
              className="w-full py-3 border-2 border-[var(--gold-main)] text-[var(--gold-main)] rounded-xl hover:bg-[var(--gold-main)]/10 font-semibold transition-colors font-nav">
              لديك حساب؟ تسجيل الدخول
            </button>
          </div>

        </form>
      </div>
    </div>

    {/* بطاقة منبثقة بعد الإرسال الناجح */}
    {successInfo && messageType === 'success' && (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-5"
        style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
        <div className="w-full max-w-sm rounded-3xl p-7 text-center"
          style={{ background: 'rgba(18,18,20,0.98)', border: '1px solid rgba(255,255,255,0.10)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>

          {/* أيقونة النجاح */}
          <div className="flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-5"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>

          <h2 className="font-nav font-bold text-xl mb-2" style={{ color: '#34d399' }}>تم إرسال طلبك</h2>
          <p className="font-nav text-sm mb-1" style={{ color: 'rgba(255,255,255,0.72)' }}>
            سيتم مراجعته من قِبل المدير
          </p>
          {successInfo.requestId && (
            <p className="font-nav text-xs mb-5" style={{ color: 'rgba(255,255,255,0.45)' }}>
              رقم الطلب: <span style={{ color: 'var(--gold-main)' }}>#{successInfo.requestId}</span>
            </p>
          )}

          {/* زر واتساب */}
          <a
            href={`https://wa.me/966555889581?text=${encodeURIComponent(
              `مرحباً،\nرقم طلب انضمامي: #${successInfo.requestId}\nأطلب اعتماد طلب الانضمام إلى موقع عائلة السلامي\nالتسلسل: ${successInfo.branch || successInfo.name}`
            )}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl font-nav font-bold text-sm mb-3 transition-all hover:opacity-90"
            style={{ background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.35)', color: '#25d366' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            تواصل مع المدير لاعتماد الطلب
          </a>

          {/* زر تسجيل الدخول */}
          <button type="button" onClick={() => navigate('/login')}
            className="w-full py-3 font-nav font-bold text-sm rounded-2xl transition-all hover:opacity-90"
            style={{ background: 'var(--gold-main)', color: '#000' }}>
            الانتقال إلى تسجيل الدخول
          </button>
        </div>
      </div>
    )}
    </>
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
