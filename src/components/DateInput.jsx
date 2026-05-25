import { useState } from 'react'

const HIJRI_MONTHS = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني',
  'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
  'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',
]
const GREGORIAN_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
]

function hijriToGregorian(hy, hm, hd) {
  const JD = Math.floor((11 * hy + 3) / 30) + 354 * hy + 30 * hm - Math.floor((hm - 1) / 2) + hd + 1948440 - 385
  let l = JD + 68569
  let n = Math.floor((4 * l) / 146097)
  l = l - Math.floor((146097 * n + 3) / 4)
  let i = Math.floor((4000 * (l + 1)) / 1461001)
  l = l - Math.floor((1461 * i) / 4) + 31
  let j = Math.floor((80 * l) / 2447)
  const d = l - Math.floor((2447 * j) / 80)
  l = Math.floor(j / 11)
  const m = j + 2 - 12 * l
  const y = 100 * (n - 49) + i + l
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}

function hijriDaysInMonth(hm, hy) {
  if (hm === 12) return Math.floor((11 * hy + 8) / 30) > Math.floor((11 * (hy - 1) + 8) / 30) ? 30 : 29
  return hm % 2 === 1 ? 30 : 29
}

function gregorianDaysInMonth(month, year) {
  return new Date(year, month, 0).getDate()
}

const THIS_YEAR = new Date().getFullYear()
// Correct formula: Hijri year = (Gregorian - 622) × (365.25 / 354.36)
const APPROX_HIJRI_YEAR = Math.floor((THIS_YEAR - 622) * (365.25 / 354.36))

const SEL = {
  background:   'rgba(48,60,72,0.85)',
  border:       '1.5px solid rgba(255,255,255,0.09)',
  borderRadius: 14,
  padding:      '13px 12px',
  color:        '#fff',
  fontSize:     14,
  outline:      'none',
  width:        '100%',
  fontFamily:   'inherit',
  WebkitAppearance: 'none',
  appearance:   'none',
}

const NUM = {
  ...SEL,
  textAlign: 'center',
  MozAppearance: 'textfield',
}

const BTN_ACTIVE = {
  background: 'rgba(198,161,107,0.18)',
  border:     '1.5px solid rgba(198,161,107,0.5)',
  color:      'var(--gold-main)',
  fontWeight: 700,
}
const BTN_IDLE = {
  background: 'rgba(255,255,255,0.04)',
  border:     '1.5px solid rgba(255,255,255,0.1)',
  color:      'rgba(255,255,255,0.45)',
}

function initFromValue(value) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number)
    return { y, m, d }
  }
  return { y: THIS_YEAR - 30, m: 1, d: 1 }
}

export default function DateInput({ value, onChange, required }) {
  const [mode, setMode] = useState('gregorian')

  // Gregorian state — initialised from value prop
  const init = initFromValue(value)
  const [gYear,  setGYear]  = useState(init.y)
  const [gMonth, setGMonth] = useState(init.m)
  const [gDay,   setGDay]   = useState(init.d)

  // Hijri state
  const [hYear,  setHYear]  = useState(APPROX_HIJRI_YEAR - 30)
  const [hMonth, setHMonth] = useState(1)
  const [hDay,   setHDay]   = useState(1)
  const [hijriConverted, setHijriConverted] = useState('')

  const applyGregorian = (y, m, d) => {
    const days = gregorianDaysInMonth(m, y)
    const safeD = Math.min(d, days)
    onChange(`${y}-${String(m).padStart(2,'0')}-${String(safeD).padStart(2,'0')}`)
  }

  const applyHijri = (hy, hm, hd) => {
    const g = hijriToGregorian(hy, hm, hd)
    setHijriConverted(g)
    onChange(g)
  }

  const hDays  = hijriDaysInMonth(hMonth, hYear)
  const gDays  = gregorianDaysInMonth(gMonth, gYear)
  const safeHDay = Math.min(hDay, hDays)
  const safeGDay = Math.min(gDay, gDays)

  const Arrow = () => (
    <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.35)', fontSize:10, pointerEvents:'none' }}>▼</span>
  )

  const DaySelect = ({ days, val, onChg }) => (
    <div style={{ position:'relative' }}>
      <select value={val} onChange={e => onChg(+e.target.value)} style={SEL}>
        {Array.from({ length: days }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
      </select>
      <Arrow />
    </div>
  )

  const MonthSelect = ({ months, val, onChg }) => (
    <div style={{ position:'relative' }}>
      <select value={val} onChange={e => onChg(+e.target.value)} style={SEL}>
        {months.map((name, i) => <option key={i+1} value={i+1}>{name}</option>)}
      </select>
      <Arrow />
    </div>
  )

  return (
    <div>
      {/* مفتاح التبديل */}
      <div className="flex gap-2 mb-2">
        {[['gregorian','ميلادي'],['hijri','هجري']].map(([m, label]) => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className="font-nav text-xs px-4 py-1.5 rounded-xl transition-all"
            style={mode === m ? BTN_ACTIVE : BTN_IDLE}>
            {label}
          </button>
        ))}
      </div>

      {mode === 'gregorian' ? (
        /* ── ميلادي: ثلاثة عناصر موحّدة ── */
        <div className="grid grid-cols-3 gap-2">
          <DaySelect
            days={gDays} val={safeGDay}
            onChg={d => { setGDay(d); applyGregorian(gYear, gMonth, d) }}
          />
          <MonthSelect
            months={GREGORIAN_MONTHS} val={gMonth}
            onChg={m => { setGMonth(m); applyGregorian(gYear, m, gDay) }}
          />
          <input
            type="number" min={1900} max={THIS_YEAR}
            value={gYear}
            onChange={e => { const y = +e.target.value; setGYear(y); if (y >= 1900 && y <= THIS_YEAR + 1) applyGregorian(y, gMonth, gDay) }}
            style={NUM}
            placeholder="السنة م"
          />
        </div>
      ) : (
        /* ── هجري: ثلاثة عناصر موحّدة ── */
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <DaySelect
              days={hDays} val={safeHDay}
              onChg={d => { setHDay(d); applyHijri(hYear, hMonth, d) }}
            />
            <MonthSelect
              months={HIJRI_MONTHS} val={hMonth}
              onChg={m => { setHMonth(m); applyHijri(hYear, m, hDay) }}
            />
            <input
              type="number" min={1200} max={APPROX_HIJRI_YEAR + 1}
              value={hYear}
              onChange={e => { const y = +e.target.value; setHYear(y); if (y >= 1200) applyHijri(y, hMonth, hDay) }}
              style={NUM}
              placeholder="السنة هـ"
            />
          </div>
          {hijriConverted && (
            <p className="font-nav text-xs" style={{ color: 'rgba(198,161,107,0.7)' }}>
              الميلادي المكافئ: <span style={{ color: 'var(--gold-main)', fontWeight: 600 }}>{hijriConverted}</span>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
