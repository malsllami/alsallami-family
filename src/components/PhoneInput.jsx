import { useState } from 'react'
import { normalizeDigits } from '../utils/normalizeInput'

const COUNTRIES = [
  { code: '+966', flag: '🇸🇦', name: 'السعودية' },
  { code: '+971', flag: '🇦🇪', name: 'الإمارات' },
  { code: '+965', flag: '🇰🇼', name: 'الكويت' },
  { code: '+974', flag: '🇶🇦', name: 'قطر' },
  { code: '+973', flag: '🇧🇭', name: 'البحرين' },
  { code: '+968', flag: '🇴🇲', name: 'عُمان' },
  { code: '+962', flag: '🇯🇴', name: 'الأردن' },
  { code: '+20',  flag: '🇪🇬', name: 'مصر' },
  { code: '+1',   flag: '🇺🇸', name: 'أمريكا' },
  { code: '+44',  flag: '🇬🇧', name: 'بريطانيا' },
]

const BOX = {
  background:   'rgba(48,60,72,0.85)',
  border:       '1.5px solid rgba(255,255,255,0.09)',
  borderRadius: 14,
}
const BOX_FOCUS = {
  borderColor: 'rgba(198,161,107,0.58)',
  boxShadow:   '0 0 0 3px rgba(198,161,107,0.08)',
}

export default function PhoneInput({
  value, onChange,
  countryCode = '+966', onCountryChange,
  placeholder = '5xxxxxxxx',
  label,
}) {
  const [focused, setFocused] = useState(false)
  const selected = COUNTRIES.find(c => c.code === countryCode) || COUNTRIES[0]

  return (
    <div>
      {label && (
        <label className="block mb-1.5 text-sm text-gray-400 font-nav">{label}</label>
      )}
      <div dir="ltr" style={{
        display:      'flex',
        alignItems:   'center',
        overflow:     'hidden',
        height:       52,
        transition:   'border-color 0.25s, box-shadow 0.25s',
        ...BOX,
        ...(focused ? BOX_FOCUS : {}),
      }}>

        {/* مُختار الدولة */}
        <div style={{ position: 'relative', flexShrink: 0, height: '100%', minWidth: 86 }}>
          {/* العرض المرئي */}
          <div style={{
            display:      'flex',
            alignItems:   'center',
            gap:          5,
            padding:      '0 10px',
            height:       '100%',
            borderRight:  '1px solid rgba(255,255,255,0.10)',
            pointerEvents:'none',
          }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>{selected.flag}</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontFamily: 'monospace', fontWeight: 600 }}>
              {selected.code}
            </span>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.70)', marginTop: 1 }}>▼</span>
          </div>
          {/* select شفاف */}
          <select
            value={countryCode}
            onChange={e => onCountryChange && onCountryChange(e.target.value)}
            style={{
              position:          'absolute',
              inset:              0,
              opacity:            0,
              cursor:            'pointer',
              width:             '100%',
              height:            '100%',
              WebkitAppearance:  'none',
              appearance:        'none',
            }}
          >
            {COUNTRIES.map(c => (
              <option key={c.code} value={c.code}>{c.flag} {c.name} ({c.code})</option>
            ))}
          </select>
        </div>

        {/* حقل الرقم — بدون form-input class */}
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={e => onChange(normalizeDigits(e.target.value))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          style={{
            flex:             1,
            minWidth:         0,
            background:       'transparent',
            border:           'none',
            borderRadius:     0,
            outline:          'none',
            boxShadow:        'none',
            WebkitAppearance: 'none',
            appearance:       'none',
            color:            '#fff',
            fontSize:         15,
            padding:          '0 14px',
            height:           '100%',
            direction:        'ltr',
            textAlign:        'left',
            fontFamily:       'inherit',
          }}
        />
      </div>
    </div>
  )
}
