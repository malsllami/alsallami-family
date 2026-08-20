import { useState, useRef, useEffect } from 'react'

/* ════════════════════════════════════════════════════════════════════════
   SearchableSelect — قائمة اختيار قابلة للبحث بالكتابة (Combobox)
   بديل عن <select> الطويل الذي يتطلب تمرير السهم للأسفل يدويًا للبحث عن
   عضو/عقدة بين مئات الخيارات. الكتابة تُصفّي القائمة فورًا؛ الضغط على
   نتيجة يختارها. تدعم الأرقام العربية/الإنجليزية والنص العربي بشكل طبيعي
   لأنها لا تُطبّع الإدخال — فقط بحث نصي بسيط (يتجاهل حالة الأحرف).
   ════════════════════════════════════════════════════════════════════════ */
export default function SearchableSelect({
  options,            // مصفوفة العناصر الخام
  value,              // المعرف المختار حاليًا (أو '')
  onChange,           // (id, item) => void
  getId,              // item => id
  getLabel,           // item => نص العرض الكامل
  placeholder = 'ابحث بالاسم...',
  emptyLabel = '— اختر —',
  disabled = false,
  className = '',
}) {
  const [query,  setQuery]  = useState('')
  const [open,   setOpen]   = useState(false)
  const wrapRef = useRef(null)

  const selected = options.find(o => getId(o) === value) || null

  // إغلاق القائمة عند الضغط خارجها
  useEffect(() => {
    if (!open) return
    const onDown = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const q = query.trim()
  const filtered = q
    ? options.filter(o => getLabel(o).toLowerCase().includes(q.toLowerCase()))
    : options

  const handlePick = (item) => {
    if (item.__empty) onChange('', null)
    else onChange(getId(item), item)
    setQuery('')
    setOpen(false)
  }

  const handleClear = (e) => {
    e.stopPropagation()
    onChange('', null)
    setQuery('')
  }

  return (
    <div ref={wrapRef} className={`relative ${className}`} style={{ direction: 'rtl' }}>
      <div className="relative">
        <input
          type="text"
          disabled={disabled}
          className="form-input w-full"
          style={{ paddingLeft: selected ? 30 : undefined }}
          placeholder={selected ? getLabel(selected) : placeholder}
          value={open ? query : ''}
          onFocus={() => { setOpen(true); setQuery('') }}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
        />
        {selected && !open && (
          <button type="button" onClick={handleClear}
            title="إلغاء الاختيار"
            className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center"
            style={{ left: 8, width: 20, height: 20, borderRadius: 999, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', fontSize: 12, lineHeight: 1 }}>
            ✕
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl overflow-hidden"
          style={{
            maxHeight: 260, overflowY: 'auto',
            background: '#182230', border: '1px solid rgba(255,255,255,0.14)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
          }}>
          <div
            onClick={() => handlePick({ __empty: true })}
            className="font-nav text-sm px-3 py-2 cursor-pointer"
            style={{ color: 'rgba(255,255,255,0.5)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            onMouseDown={e => e.preventDefault()}
          >
            {emptyLabel}
          </div>
          {filtered.length === 0 && (
            <div className="font-nav text-sm px-3 py-2.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
              لا توجد نتائج مطابقة
            </div>
          )}
          {filtered.slice(0, 200).map(item => (
            <div
              key={getId(item)}
              onMouseDown={e => e.preventDefault()}
              onClick={() => handlePick(item)}
              className="font-nav text-sm px-3 py-2 cursor-pointer transition-colors"
              style={{
                color: getId(item) === value ? 'var(--gold-main)' : 'rgba(255,255,255,0.85)',
                background: getId(item) === value ? 'rgba(198,161,107,0.1)' : 'transparent',
              }}
              onMouseEnter={e => { if (getId(item) !== value) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
              onMouseLeave={e => { if (getId(item) !== value) e.currentTarget.style.background = 'transparent' }}
            >
              {getLabel(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
