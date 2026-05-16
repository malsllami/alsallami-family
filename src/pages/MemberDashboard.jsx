import { useState, useEffect } from 'react'
import PasswordInput from '../components/PasswordInput'
import MiniTree from '../components/MiniTree'
import TreeNavigator from '../components/TreeNavigator'

function calcAge(birthDate) {
  if (!birthDate) return null
  const born = new Date(birthDate)
  const now = new Date()
  let age = now.getFullYear() - born.getFullYear()
  if (now.getMonth() < born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())) age--
  return age
}

const T = {
  blue:    { bg: 'rgba(59,130,246,0.08)',   border: 'rgba(59,130,246,0.2)',   accent: '#60a5fa',        soft: 'rgba(59,130,246,0.14)'   },
  purple:  { bg: 'rgba(139,92,246,0.08)',   border: 'rgba(139,92,246,0.2)',   accent: '#a78bfa',        soft: 'rgba(139,92,246,0.14)'   },
  teal:    { bg: 'rgba(20,184,166,0.08)',   border: 'rgba(20,184,166,0.2)',   accent: '#2dd4bf',        soft: 'rgba(20,184,166,0.14)'   },
  rose:    { bg: 'rgba(244,63,94,0.08)',    border: 'rgba(244,63,94,0.2)',    accent: '#fb7185',        soft: 'rgba(244,63,94,0.14)'    },
  emerald: { bg: 'rgba(16,185,129,0.08)',   border: 'rgba(16,185,129,0.2)',   accent: '#34d399',        soft: 'rgba(16,185,129,0.14)'   },
  gold:    { bg: 'rgba(198,161,107,0.08)',  border: 'rgba(198,161,107,0.2)',  accent: 'var(--gold-main)', soft: 'rgba(198,161,107,0.14)' },
}

function Card({ t, icon, title, action, children, className = '' }) {
  return (
    <div className={`rounded-[28px] p-6 ${className}`} style={{ background: t.bg, border: `1px solid ${t.border}` }}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: t.soft, border: `1px solid ${t.border}` }}>
            {icon}
          </div>
          <span className="font-nav text-sm font-semibold" style={{ color: t.accent }}>{title}</span>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function InfoRow({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/[0.05] last:border-0">
      <span className="font-nav text-sm" style={{ color: accent || 'rgba(255,255,255,0.82)' }}>{value || '—'}</span>
      <span className="font-nav text-xs text-gray-500">{label}</span>
    </div>
  )
}

function Skeleton({ lines = 3 }) {
  return (
    <div className="space-y-3 py-1">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 rounded-lg animate-pulse"
          style={{ background: 'rgba(255,255,255,0.06)', width: i % 2 === 0 ? '70%' : '50%' }} />
      ))}
    </div>
  )
}

function EditBtn({ t, open, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="font-nav text-xs px-3 py-1.5 rounded-xl transition-all duration-200"
      style={{
        border:     `1px solid ${open ? t.border : 'rgba(255,255,255,0.1)'}`,
        color:      open ? t.accent : 'rgba(255,255,255,0.4)',
        background: open ? t.soft   : 'transparent',
      }}
    >
      {open ? 'إلغاء' : '+ إضافة'}
    </button>
  )
}

function SlidePanel({ open, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 0.38s cubic-bezier(0.23,1,0.32,1)' }}>
      <div style={{ overflow: 'hidden' }}>
        <div className="pt-4 space-y-3">{children}</div>
      </div>
    </div>
  )
}

export default function MemberDashboard() {
  const savedUser = JSON.parse(localStorage.getItem('user'))
  const mustChangePassword = savedUser?.mustChangePassword

  const [memberData,    setMemberData]    = useState(null)
  const [dataLoading,   setDataLoading]   = useState(true)

  const [editContact,   setEditContact]   = useState(false)
  const [draft,         setDraft]         = useState({ firstName: '', phone: '' })
  const [contactLoading,setContactLoading]= useState(false)

  const [showAddWife,   setShowAddWife]   = useState(false)
  const [wifeName,      setWifeName]      = useState('')
  const [wifeLoading,   setWifeLoading]   = useState(false)

  const [showAddChild,  setShowAddChild]  = useState(false)
  const [newChild,      setNewChild]      = useState({ name: '', birthDate: '', gender: 'ذكر' })
  const [childLoading,  setChildLoading]  = useState(false)

  const [passwordData,  setPasswordData]  = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [showChangePw,  setShowChangePw]  = useState(false)
  const [changePwLoading,setChangePwLoading] = useState(false)

  const [showTreeLink,    setShowTreeLink]    = useState(false)
  const [selectedParent,  setSelectedParent]  = useState(null)
  const [treeLinkLoading, setTreeLinkLoading] = useState(false)
  const [treeLinkMsg,     setTreeLinkMsg]     = useState(null)

  const setPw = (field) => (e) => setPasswordData(p => ({ ...p, [field]: e.target.value }))

  /* جلب بيانات العضو الكاملة */
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(import.meta.env.VITE_API_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'getMemberData', memberId: savedUser.memberId }),
        })
        const data = await res.json()
        if (data.success) {
          setMemberData(data)
          setDraft({ firstName: data.firstName || '', phone: data.phone || '' })
        }
      } catch (e) { console.error(e) }
      finally { setDataLoading(false) }
    }
    load()
  }, [])

  /* تحديث الاسم والجوال */
  const handleUpdateContact = async () => {
    if (!draft.firstName) return alert('الاسم مطلوب')
    try {
      setContactLoading(true)
      const res = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'updateMemberInfo', memberId: savedUser.memberId, firstName: draft.firstName, phone: draft.phone }),
      })
      const result = await res.json()
      if (result.success) {
        setMemberData(p => ({ ...p, firstName: draft.firstName, phone: draft.phone }))
        localStorage.setItem('user', JSON.stringify({ ...savedUser, firstName: draft.firstName, phone: draft.phone }))
        setEditContact(false)
      } else { alert(result.message) }
    } catch { alert('حدث خطأ') }
    finally { setContactLoading(false) }
  }

  /* إضافة زوجة */
  const handleAddWife = async () => {
    if (!wifeName.trim()) return alert('اسم الزوجة مطلوب')
    try {
      setWifeLoading(true)
      const res = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'addWife', memberId: savedUser.memberId, wifeName: wifeName.trim() }),
      })
      const result = await res.json()
      if (result.success) {
        setMemberData(p => ({ ...p, wives: [...(p.wives || []), { id: result.wifeId || Date.now(), name: wifeName.trim() }] }))
        setWifeName(''); setShowAddWife(false)
      } else { alert(result.message) }
    } catch { alert('حدث خطأ') }
    finally { setWifeLoading(false) }
  }

  /* إضافة ابن / بنت */
  const handleAddChild = async () => {
    if (!newChild.name.trim()) return alert('الاسم مطلوب')
    try {
      setChildLoading(true)
      const res = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'addChild', memberId: savedUser.memberId, ...newChild, childName: newChild.name }),
      })
      const result = await res.json()
      if (result.success) {
        setMemberData(p => ({ ...p, children: [...(p.children || []), { id: result.childId || Date.now(), ...newChild }] }))
        setNewChild({ name: '', birthDate: '', gender: 'ذكر' }); setShowAddChild(false)
      } else { alert(result.message) }
    } catch { alert('حدث خطأ') }
    finally { setChildLoading(false) }
  }

  /* إرسال طلب ربط الشجرة */
  const handleSubmitTreeLink = async () => {
    if (!selectedParent) return
    try {
      setTreeLinkLoading(true)
      setTreeLinkMsg(null)
      const res = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        body: JSON.stringify({
          action:          'submitTreeRequest',
          memberId:        savedUser.memberId,
          parentId:        selectedParent.parentId,
          parentName:      selectedParent.parentName,
          generationLevel: selectedParent.generationLevel,
          path:            selectedParent.path,
        }),
      })
      const result = await res.json()
      setTreeLinkMsg({ success: result.success, text: result.message || (result.success ? 'تم إرسال الطلب بنجاح، في انتظار موافقة المدير' : 'حدث خطأ') })
      if (result.success) { setSelectedParent(null); setShowTreeLink(false) }
    } catch { setTreeLinkMsg({ success: false, text: 'تعذّر الاتصال بالخادم' }) }
    finally { setTreeLinkLoading(false) }
  }

  /* API تغيير كلمة المرور */
  const callChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword)
      return { error: 'جميع الحقول مطلوبة' }
    if (passwordData.newPassword !== passwordData.confirmPassword)
      return { error: 'تأكيد كلمة المرور غير مطابق' }
    const res = await fetch(import.meta.env.VITE_API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'changePassword', memberId: savedUser.memberId, currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword }),
    })
    return res.json()
  }

  const handleForceChange = async () => {
    try {
      const result = await callChangePassword()
      if (result?.error) { alert(result.error); return }
      if (result?.success) {
        localStorage.setItem('user', JSON.stringify({ ...savedUser, mustChangePassword: 'N' }))
        alert('تم تغيير كلمة المرور بنجاح')
        window.location.reload()
      } else { alert(result?.message) }
    } catch { alert('حدث خطأ') }
  }

  const handleDashboardChange = async () => {
    try {
      setChangePwLoading(true)
      const result = await callChangePassword()
      if (result?.error) { alert(result.error); return }
      if (result?.success) {
        alert('تم تغيير كلمة المرور بنجاح')
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
        setShowChangePw(false)
      } else { alert(result?.message) }
    } catch { alert('حدث خطأ') }
    finally { setChangePwLoading(false) }
  }

  /* ── شاشة الإجبار ── */
  if (mustChangePassword === 'Y') {
    return (
      <div className="fixed inset-0 bg-[#36404a] flex items-center justify-center px-6 z-[9999]">
        <div className="w-full max-w-lg bg-white/10 border border-white/10 rounded-[35px] p-10 backdrop-blur-xl">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-red-400">تغيير كلمة المرور إجباري</h1>
            <p className="mt-5 text-gray-300 leading-8">يجب تغيير كلمة المرور قبل استخدام المنصة.</p>
          </div>
          <div className="mt-10 space-y-5">
            <PasswordInput placeholder="كلمة المرور الحالية"       value={passwordData.currentPassword} onChange={setPw('currentPassword')} />
            <PasswordInput placeholder="كلمة المرور الجديدة"       value={passwordData.newPassword}     onChange={setPw('newPassword')} />
            <PasswordInput placeholder="تأكيد كلمة المرور الجديدة" value={passwordData.confirmPassword}  onChange={setPw('confirmPassword')} />
          </div>
          <button onClick={handleForceChange}
            className="font-nav w-full mt-8 bg-red-500 text-white py-4 rounded-2xl font-bold hover:opacity-90 duration-300">
            تغيير كلمة المرور
          </button>
        </div>
      </div>
    )
  }

  const m = memberData || {}
  const age = calcAge(m.birthDate)

  /* ── لوحة العضو ── */
  return (
    <div className="px-5 lg:px-10 py-10 space-y-5">

      {/* العنوان */}
      <div>
        <h1 className="text-4xl font-bold text-[var(--gold-main)]">لوحة العضو</h1>
        <p className="mt-2 font-nav text-sm text-gray-400">
          {dataLoading
            ? 'جاري التحميل...'
            : [m.firstName, m.fatherName, m.grandfatherName].filter(Boolean).join(' ') || savedUser.firstName}
        </p>
      </div>

      {/* الصف الأول: الهوية + الميلاد + التواصل */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* 🔵 الهوية */}
        <Card t={T.blue} title="الهوية" icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.blue.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2"/>
            <circle cx="9" cy="10" r="2"/>
            <line x1="15" y1="8" x2="19" y2="8"/>
            <line x1="15" y1="12" x2="19" y2="12"/>
            <line x1="7" y1="16" x2="17" y2="16"/>
          </svg>
        }>
          {dataLoading ? <Skeleton lines={4} /> : (
            <>
              <InfoRow label="رقم العضوية" value={`#${savedUser.memberId}`} accent={T.blue.accent} />
              <InfoRow label="الاسم الأول"  value={m.firstName} />
              <InfoRow label="اسم الأب"     value={m.fatherName} />
              <InfoRow label="اسم الجد"     value={m.grandfatherName} />
              <InfoRow label="رقم الهوية"   value={m.nationalId} />
              <InfoRow label="الفخذ"        value={m.branch} />
            </>
          )}
        </Card>

        {/* 🟣 الميلاد */}
        <Card t={T.purple} title="بيانات الميلاد" icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.purple.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        }>
          {dataLoading ? <Skeleton lines={3} /> : (
            <>
              <InfoRow label="تاريخ الميلاد"    value={m.birthDate ? new Date(m.birthDate).toLocaleDateString('ar-SA') : null} />
              <InfoRow label="العمر"             value={age !== null ? `${age} سنة` : null} accent={T.purple.accent} />
              <InfoRow label="الجنس"             value={m.gender} />
              <InfoRow label="الحالة الاجتماعية" value={m.maritalStatus} />
            </>
          )}
        </Card>

        {/* 🩵 التواصل + تعديل */}
        <Card t={T.teal} title="بيانات التواصل" icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.teal.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.16h3a2 2 0 0 1 2 1.72c.13 1 .36 1.97.7 2.9a2 2 0 0 1-.45 2.11L7.91 8.9a16 16 0 0 0 6.29 6.29l.9-.9a2 2 0 0 1 2.11-.45c.93.34 1.9.57 2.9.7a2 2 0 0 1 1.72 2.02z"/>
          </svg>
        } action={!dataLoading && (
          <button
            onClick={() => { setEditContact(e => !e); setDraft({ firstName: m.firstName || '', phone: m.phone || '' }) }}
            className="font-nav text-xs px-3 py-1.5 rounded-xl transition-all duration-200"
            style={{
              border: `1px solid ${editContact ? T.teal.border : 'rgba(255,255,255,0.1)'}`,
              color:  editContact ? T.teal.accent : 'rgba(255,255,255,0.4)',
              background: editContact ? T.teal.soft : 'transparent',
            }}>
            {editContact ? 'إلغاء' : 'تعديل'}
          </button>
        )}>
          {dataLoading ? <Skeleton lines={2} /> : !editContact ? (
            <>
              <InfoRow label="الاسم الأول" value={m.firstName} />
              <InfoRow label="رقم الجوال"  value={m.phone} accent={T.teal.accent} />
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="font-nav text-xs text-gray-500 mb-1.5 block">الاسم الأول</label>
                <input type="text" value={draft.firstName} onChange={e => setDraft(p => ({ ...p, firstName: e.target.value }))} className="form-input" />
              </div>
              <div>
                <label className="font-nav text-xs text-gray-500 mb-1.5 block">رقم الجوال</label>
                <input type="text" value={draft.phone} onChange={e => setDraft(p => ({ ...p, phone: e.target.value }))} className="form-input" />
              </div>
              <button onClick={handleUpdateContact} disabled={contactLoading}
                className="w-full font-nav text-sm py-2.5 rounded-2xl font-bold transition-all duration-200 disabled:opacity-50"
                style={{ background: T.teal.soft, border: `1px solid ${T.teal.border}`, color: T.teal.accent }}>
                {contactLoading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
            </div>
          )}
        </Card>

      </div>

      {/* الصف الثاني: الزوجات + الأبناء */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* 🌸 الزوجات */}
        <Card t={T.rose} title="الزوجات" icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.rose.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        } action={!dataLoading && <EditBtn t={T.rose} open={showAddWife} onToggle={() => setShowAddWife(v => !v)} />}>

          {dataLoading ? <Skeleton lines={2} /> : (
            <>
              {!(m.wives?.length) ? (
                <p className="font-nav text-sm text-gray-600 py-1">لا توجد زوجات مسجلة</p>
              ) : m.wives.map((w, i) => (
                <div key={w.id || i} className="flex items-center justify-between py-2.5 border-b border-white/[0.05] last:border-0">
                  <span className="font-nav text-sm text-white/85">{w.name}</span>
                  <span className="font-nav text-xs px-2.5 py-1 rounded-full"
                    style={{ background: T.rose.soft, color: T.rose.accent }}>
                    زوجة {i + 1}
                  </span>
                </div>
              ))}

              <SlidePanel open={showAddWife}>
                <input type="text" placeholder="اسم الزوجة" value={wifeName}
                  onChange={e => setWifeName(e.target.value)} className="form-input" />
                <button onClick={handleAddWife} disabled={wifeLoading}
                  className="w-full font-nav text-sm py-2.5 rounded-2xl font-bold transition-all duration-200 disabled:opacity-50"
                  style={{ background: T.rose.soft, border: `1px solid ${T.rose.border}`, color: T.rose.accent }}>
                  {wifeLoading ? 'جاري الإضافة...' : 'إضافة زوجة'}
                </button>
              </SlidePanel>
            </>
          )}
        </Card>

        {/* 🌿 الأبناء */}
        <Card t={T.emerald} title="الأبناء" icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.emerald.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        } action={!dataLoading && <EditBtn t={T.emerald} open={showAddChild} onToggle={() => setShowAddChild(v => !v)} />}>

          {dataLoading ? <Skeleton lines={3} /> : (
            <>
              {!(m.children?.length) ? (
                <p className="font-nav text-sm text-gray-600 py-1">لا يوجد أبناء مسجلون</p>
              ) : m.children.map((c, i) => (
                <div key={c.id || i} className="flex items-center justify-between py-2.5 border-b border-white/[0.05] last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center font-nav text-xs font-bold flex-shrink-0"
                      style={{ background: T.emerald.soft, color: T.emerald.accent }}>
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-nav text-sm text-white/85">{c.name}</p>
                      {c.birthDate && <p className="font-nav text-[10px] text-gray-600">{calcAge(c.birthDate)} سنة</p>}
                    </div>
                  </div>
                  <span className="font-nav text-xs px-2.5 py-1 rounded-full"
                    style={{
                      background: c.gender === 'أنثى' ? 'rgba(244,63,94,0.12)' : T.emerald.soft,
                      color:      c.gender === 'أنثى' ? '#fb7185'              : T.emerald.accent,
                    }}>
                    {c.gender || 'ذكر'}
                  </span>
                </div>
              ))}

              <SlidePanel open={showAddChild}>
                <input type="text" placeholder="الاسم" value={newChild.name}
                  onChange={e => setNewChild(p => ({ ...p, name: e.target.value }))} className="form-input" />
                <input type="date" value={newChild.birthDate}
                  onChange={e => setNewChild(p => ({ ...p, birthDate: e.target.value }))} className="form-input" />
                <select value={newChild.gender}
                  onChange={e => setNewChild(p => ({ ...p, gender: e.target.value }))} className="form-input">
                  <option value="ذكر">ذكر</option>
                  <option value="أنثى">أنثى</option>
                </select>
                <button onClick={handleAddChild} disabled={childLoading}
                  className="w-full font-nav text-sm py-2.5 rounded-2xl font-bold transition-all duration-200 disabled:opacity-50"
                  style={{ background: T.emerald.soft, border: `1px solid ${T.emerald.border}`, color: T.emerald.accent }}>
                  {childLoading ? 'جاري الإضافة...' : 'إضافة ابن / بنت'}
                </button>
              </SlidePanel>
            </>
          )}
        </Card>

      </div>

      {/* الشجرة المصغرة */}
      {!dataLoading && (
        <div className="rounded-[28px] p-6"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(198,161,107,0.1)', border: '1px solid rgba(198,161,107,0.25)' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="var(--gold-main)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="23" y1="11" x2="17" y2="11"/>
                <line x1="20" y1="8" x2="20" y2="14"/>
              </svg>
            </div>
            <span className="font-nav text-sm font-semibold text-[var(--gold-main)]">شجرتك العائلية</span>
          </div>
          <MiniTree
            memberName={m.firstName}
            fatherName={m.fatherName}
            grandfatherName={m.grandfatherName}
            wives={m.wives || []}
            children={m.children || []}
          />
        </div>
      )}

      {/* 🌿 ربطك بالشجرة */}
      <div className="rounded-[28px] p-6"
        style={{ background: T.emerald.bg, border: `1px solid ${T.emerald.border}` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: T.emerald.soft, border: `1px solid ${T.emerald.border}` }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke={T.emerald.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="4"  r="2"/>
                <circle cx="4"  cy="20" r="2"/>
                <circle cx="20" cy="20" r="2"/>
                <line x1="12" y1="6"  x2="12" y2="12"/>
                <line x1="12" y1="12" x2="4"  y2="18"/>
                <line x1="12" y1="12" x2="20" y2="18"/>
              </svg>
            </div>
            <span className="font-nav text-sm font-semibold" style={{ color: T.emerald.accent }}>
              ربطك بالشجرة العائلية
            </span>
          </div>
          <button
            onClick={() => { setShowTreeLink(v => !v); setTreeLinkMsg(null) }}
            className="font-nav text-xs px-3 py-1.5 rounded-xl transition-all duration-200"
            style={{
              border:     `1px solid ${showTreeLink ? T.emerald.border : 'rgba(255,255,255,0.1)'}`,
              color:      showTreeLink ? T.emerald.accent : 'rgba(255,255,255,0.4)',
              background: showTreeLink ? T.emerald.soft : 'transparent',
            }}>
            {showTreeLink ? 'إلغاء' : 'ربط بالشجرة'}
          </button>
        </div>

        {/* رسالة نتيجة */}
        {treeLinkMsg && (
          <div className="mt-4 px-4 py-3 rounded-2xl font-nav text-sm"
            style={{
              background: treeLinkMsg.success ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
              border:     treeLinkMsg.success ? '1px solid rgba(16,185,129,0.22)' : '1px solid rgba(239,68,68,0.22)',
              color:      treeLinkMsg.success ? T.emerald.accent : '#f87171',
            }}>
            {treeLinkMsg.text}
          </div>
        )}

        <SlidePanel open={showTreeLink}>
          <p className="font-nav text-xs text-gray-500 leading-5 pb-2">
            اختر الشخص الذي تنتمي إليه مباشرةً (أبوك في الشجرة) — سيُحسب جيلك تلقائياً وتُرسل الطلب للمدير لمراجعته.
          </p>
          <TreeNavigator onSelect={setSelectedParent} selected={selectedParent} />
          {selectedParent && (
            <button
              onClick={handleSubmitTreeLink}
              disabled={treeLinkLoading}
              className="w-full font-nav text-sm py-3 rounded-2xl font-bold transition-all duration-200 disabled:opacity-50 mt-2"
              style={{ background: T.emerald.soft, border: `1px solid ${T.emerald.border}`, color: T.emerald.accent }}>
              {treeLinkLoading ? 'جاري الإرسال...' : `إرسال طلب الربط — الجيل ${selectedParent.generationLevel}`}
            </button>
          )}
        </SlidePanel>
      </div>

      {/* 🔑 تغيير كلمة المرور */}
      <div className="rounded-[28px] p-6" style={{ background: T.gold.bg, border: `1px solid ${T.gold.border}` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: T.gold.soft, border: `1px solid ${T.gold.border}` }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--gold-main)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <span className="font-nav text-sm font-semibold text-[var(--gold-main)]">تغيير كلمة المرور</span>
          </div>
          <button
            onClick={() => { setShowChangePw(v => !v); setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' }) }}
            className="font-nav text-xs px-3 py-1.5 rounded-xl transition-all duration-200"
            style={{
              border:     `1px solid ${showChangePw ? T.gold.border : 'rgba(255,255,255,0.1)'}`,
              color:      showChangePw ? 'var(--gold-main)' : 'rgba(255,255,255,0.4)',
              background: showChangePw ? T.gold.soft : 'transparent',
            }}>
            {showChangePw ? 'إلغاء' : 'تغيير'}
          </button>
        </div>

        <SlidePanel open={showChangePw}>
          <PasswordInput placeholder="كلمة المرور الحالية"       value={passwordData.currentPassword} onChange={setPw('currentPassword')} />
          <PasswordInput placeholder="كلمة المرور الجديدة"       value={passwordData.newPassword}     onChange={setPw('newPassword')} />
          <PasswordInput placeholder="تأكيد كلمة المرور الجديدة" value={passwordData.confirmPassword}  onChange={setPw('confirmPassword')} />
          <button onClick={handleDashboardChange} disabled={changePwLoading}
            className="w-full font-nav text-sm py-3 rounded-2xl font-bold transition-all duration-200 disabled:opacity-50"
            style={{ background: T.gold.soft, border: `1px solid ${T.gold.border}`, color: 'var(--gold-main)' }}>
            {changePwLoading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </button>
        </SlidePanel>
      </div>

    </div>
  )
}
