import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TreeNavigator from '../components/TreeNavigator';
import PhoneInput from '../components/PhoneInput';
import DateInput from '../components/DateInput';
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
          sonNodeId:       selectedSon ? selectedSon.id : undefined,
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
            <p className="font-nav text-sm font-semibold mb-1" style={{ color: 'var(--gold-main)' }}>
              اختر والدك من الشجرة *
            </p>
            <p className="font-nav text-xs mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
              ابدأ باختيار الفخذ ثم تدرّج — اضغط &quot;هذا والدي&quot; عند والدك، أو &quot;هذا أنا&quot; إن كان اسمك موجوداً مسبقاً في الشجرة
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
                <p className="font-nav text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>الوالد المختار:</p>
                <p className="font-nav text-sm font-semibold" style={{ color: 'var(--gold-main)' }}>{selectedFather.name}</p>
                {selectedFather.branch && (
                  <p className="font-nav text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    الفخذ: <span style={{ color: 'rgba(198,161,107,0.8)' }}>{selectedFather.branch}</span>
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
                <p className="font-nav text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>موقعك في الشجرة:</p>
                <p className="font-nav text-sm font-semibold" style={{ color: '#2dd4bf' }}>{selectedSelf.name}</p>
                <p className="font-nav text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
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
                <p className="font-nav text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>ابنك الموجود في الشجرة:</p>
                <p className="font-nav text-sm font-semibold" style={{ color: '#a78bfa' }}>{selectedSon.name}</p>
                <p className="font-nav text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
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
                  <p className="font-nav text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>الجد المختار:</p>
                  <p className="font-nav text-sm font-semibold" style={{ color: '#fb923c' }}>{selectedGrandfa.name}</p>
                  {(selectedGrandfa.children || []).find(c => (c.name || '').split(' ')[0].trim() === fatherNotInTree.trim()) && (
                    <p className="font-nav text-xs mt-2" style={{ color: '#34d399' }}>
                      ✓ تم العثور على اسم والدك في أبناء هذا الجد — سيُربط تلقائياً
                    </p>
                  )}
                </div>
                <div>
                  <label className="font-nav text-xs mb-1.5 block" style={{ color: 'rgba(255,255,255,0.45)' }}>
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
              <input type="password" name="password" value={formData.password}
                onChange={handleChange} className="form-input" placeholder="6 أحرف على الأقل" minLength={6} />
            </Field>
            <Field label="تأكيد كلمة المرور *">
              <input type="password" name="confirmPassword" value={formData.confirmPassword}
                onChange={handleChange} className="form-input" placeholder="أعد كتابة كلمة المرور" />
            </Field>
          </div>

          <div className="pt-4 space-y-3">
            <button type="submit" disabled={loading || (!selectedFather && !(selectedGrandfa && fatherNotInTree.trim()))}
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
