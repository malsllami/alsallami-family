import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

/* ════ بيانات افتراضية — تُستبدل بجلب من API عند توفر الباكند ════════════ */
const FALLBACK = {
  id:'root', name:'سالم الجد الأكبر', gender:'male', birthYear:1880, alive:false, marital:'married', job:'business',
  wives:[{id:'w1',name:'أم محمد'}],
  children:[
    {
      id:'c1', name:'محمد سالم', gender:'male', birthYear:1915, alive:false, marital:'married', job:'retired',
      wives:[{id:'w2',name:'أم عبدالله'}],
      children:[
        {
          id:'c11', name:'عبدالله محمد', gender:'male', birthYear:1948, alive:true, marital:'married', job:'retired',
          wives:[{id:'w3',name:'فاطمة'},{id:'w3b',name:'مريم'}],
          children:[
            { id:'c111', name:'سالم عبدالله',  gender:'male',   birthYear:1975, alive:true,  marital:'married', job:'employee', wives:[{id:'w4',name:'ريم'}],  children:[] },
            { id:'c112', name:'نورة عبدالله',  gender:'female', birthYear:1978, alive:true,  marital:'married', job:'',         marriedOut:true, wives:[],       children:[] },
            { id:'c113', name:'خالد عبدالله',  gender:'male',   birthYear:1982, alive:true,  marital:'single',  job:'student',  wives:[],         children:[] },
          ],
        },
        {
          id:'c12', name:'أحمد محمد', gender:'male', birthYear:1952, alive:true, marital:'married', job:'business',
          wives:[{id:'w5',name:'هند'},{id:'w6',name:'سارة'}],
          children:[
            { id:'c121', name:'يوسف أحمد',  gender:'male',   birthYear:1980, alive:true, marital:'married', job:'employee', wives:[{id:'w7',name:'لمى'}], children:[] },
            { id:'c122', name:'سلمى أحمد',  gender:'female', birthYear:1985, alive:true, marital:'married', job:'',         wives:[],                      children:[] },
          ],
        },
      ],
    },
    {
      id:'c2', name:'علي سالم', gender:'male', birthYear:1922, alive:true, marital:'single', job:'retired',
      wives:[], children:[
        { id:'c21', name:'ناصر علي', gender:'male', birthYear:1955, alive:true, marital:'married', job:'employee', wives:[{id:'w8',name:'أمل'}], children:[] },
      ],
    },
  ],
}

/* ════ ثوابت التصميم ════════════════════════════════════════════════════════ */
const MR    = 34
const FR    = 28
const WR    = 22
const DR    = 5
const V_GAP = 155
const H_GAP = 44
const PAD   = 64
const WDG   = 12
const WCG   = 8
const WWG   = 8

const GOLD      = 'rgba(198,161,107,0.72)'
const GOLD_FULL = 'rgba(198,161,107,1)'
const LINE_C    = 'rgba(198,161,107,0.28)'
const WIFE_LC   = 'rgba(251,113,133,0.28)'
const BAR_H     = 60   // ارتفاع شريط الأدوات

const JOBS = { student:'طالب', employee:'موظف', retired:'متقاعد', business:'رجل أعمال' }
const calcAge   = (by, alive) => alive ? new Date().getFullYear() - by : null
const firstName = str => (str || '').split(' ')[0]

/* ════ وظائف التخطيط ══════════════════════════════════════════════════════ */
function visKids(node, pub) {
  return (node.children || []).filter(c => pub ? c.gender === 'male' : true)
}
function wExt(node, showWives) {
  if (!showWives) return 0
  const nW = (node.wives || []).length
  if (!nW) return 0
  return WDG + nW * (2 * DR + WCG + 2 * WR) + (nW - 1) * WWG
}
function sw(node, pub, showWives) {
  const ch  = visKids(node, pub)
  const we  = wExt(node, showWives)
  const chW = ch.length
    ? ch.reduce((s, c) => s + sw(c, pub, showWives), 0) + H_GAP * (ch.length - 1)
    : 0
  return Math.max(Math.max(MR, Math.ceil(chW / 2)) + MR + we, chW, 2 * MR)
}
function buildNodes(node, x0, depth, pub, showWives) {
  const ch  = visKids(node, pub)
  const cy  = PAD + MR + depth * V_GAP
  const r   = node.gender === 'female' ? FR : MR
  if (!ch.length) return [{ ...node, cx: x0 + MR, cy, r }]
  const childOut = []
  let x = x0
  for (const c of ch) {
    childOut.push(...buildNodes(c, x, depth + 1, pub, showWives))
    x += sw(c, pub, showWives) + H_GAP
  }
  const firstCX = childOut.find(n => n.id === ch[0].id).cx
  const lastCX  = childOut.find(n => n.id === ch[ch.length - 1].id).cx
  return [{ ...node, cx: Math.round((firstCX + lastCX) / 2), cy, r }, ...childOut]
}
function buildLines(node, byId, pub) {
  const ch = visKids(node, pub)
  if (!ch.length) return []
  const p   = byId[node.id], pR = p.r ?? MR
  const fc  = byId[ch[0].id], cR = fc.r ?? MR
  const midY = p.cy + pR + (fc.cy - cR - p.cy - pR) / 2
  const childXs = ch.map(c => byId[c.id].cx)
  const segs = [
    { x1: p.cx, y1: p.cy + pR,             x2: p.cx,              y2: midY },
    { x1: Math.min(p.cx, ...childXs), y1: midY, x2: Math.max(p.cx, ...childXs), y2: midY },
  ]
  for (const c of ch) {
    const cp = byId[c.id], cpR = cp.r ?? MR
    segs.push({ x1: cp.cx, y1: midY, x2: cp.cx, y2: cp.cy - cpR })
    segs.push(...buildLines(c, byId, pub))
  }
  return segs
}
function buildWivesData(nodes, showWives) {
  if (!showWives) return { wives: [], wLines: [] }
  const wives = [], wLines = []
  for (const n of nodes) {
    const nW = (n.wives || []).length
    if (!nW) continue
    n.wives.forEach((w, i) => {
      const step     = 2 * WR + WWG + 2 * DR + WCG
      const wifeCX   = n.cx + n.r + WDG + 2 * DR + WCG + WR + i * step
      const diamondX = wifeCX - WR - WCG - DR
      wives.push({ ...w, cx: wifeCX, cy: n.cy, diamondX, diamondY: n.cy })
    })
    const lastW = wives[wives.length - 1]
    wLines.push({ x1: n.cx + n.r, y1: n.cy, x2: lastW.cx + WR, y2: n.cy })
  }
  return { wives, wLines }
}

/* ════ مكونات SVG ══════════════════════════════════════════════════════════ */
function CircleNode({ n, active, onClick }) {
  const { cx, cy, r, gender, alive, marriedOut, name } = n
  const isMO = !!marriedOut
  let fill, textFill, dash, strokeW
  if (isMO) {
    fill = 'rgba(139,92,246,0.15)'; textFill = '#c4b5fd'; dash = '5,3'; strokeW = active ? 2.5 : 1.8
  } else if (gender === 'female') {
    fill = 'rgba(244,63,94,0.13)';  textFill = '#fda4af'; dash = 'none'; strokeW = active ? 2.5 : 1.8
  } else {
    fill     = active ? 'rgba(198,161,107,0.18)' : 'rgba(59,130,246,0.13)'
    textFill = active ? 'var(--gold-main)' : 'rgba(255,255,255,0.92)'
    dash = 'none'; strokeW = active ? 2.5 : 1.8
  }
  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      {alive && (
        <circle cx={cx} cy={cy} r={r + 4}
          fill="none" stroke="rgba(74,222,128,0.2)" strokeWidth={5}
          style={{ filter: 'blur(5px)' }} />
      )}
      <circle cx={cx} cy={cy} r={r}
        fill={fill} stroke={active ? GOLD_FULL : GOLD}
        strokeWidth={strokeW} strokeDasharray={dash}
        style={{ filter: active ? 'drop-shadow(0 0 7px rgba(198,161,107,0.55))' : undefined }}
      />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
        fill={textFill} fontSize={isMO ? 11 : 12} fontWeight={active ? '600' : '500'}
        fontFamily="Tajawal,system-ui,sans-serif"
        style={{ userSelect: 'none', pointerEvents: 'none' }}>
        {firstName(name)}
      </text>
    </g>
  )
}
function WifeCircle({ cx, cy, name }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={WR + 3}
        fill="none" stroke="rgba(244,63,94,0.12)" strokeWidth={4}
        style={{ filter: 'blur(4px)' }} />
      <circle cx={cx} cy={cy} r={WR}
        fill="rgba(244,63,94,0.12)" stroke={GOLD} strokeWidth={1.4} strokeDasharray="5,3" />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
        fill="rgba(253,164,175,0.9)" fontSize={11}
        fontFamily="Tajawal,system-ui,sans-serif"
        style={{ userSelect: 'none', pointerEvents: 'none' }}>
        {firstName(name)}
      </text>
    </g>
  )
}
function MarriageDiamond({ cx, cy }) {
  return (
    <polygon
      points={`${cx},${cy - DR} ${cx + DR},${cy} ${cx},${cy + DR} ${cx - DR},${cy}`}
      fill="rgba(198,161,107,0.85)" stroke="rgba(198,161,107,1)" strokeWidth={0.8}
    />
  )
}

/* ════ نافذة التفاصيل ════════════════════════════════════════════════════ */
function Popup({ node, onClose }) {
  const a = calcAge(node.birthYear, node.alive)
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-[300px] rounded-[26px] p-6 z-10"
        onClick={e => e.stopPropagation()}
        style={{ background: 'rgba(20,28,38,0.98)', border: '1px solid rgba(255,255,255,0.11)', backdropFilter: 'blur(24px)', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
        <button onClick={onClose}
          className="absolute top-4 left-4 w-8 h-8 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-200 hover:bg-white/10 transition-all text-sm">✕</button>
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: node.gender === 'female' ? 'rgba(244,63,94,0.1)' : 'rgba(59,130,246,0.1)', border: `2px solid ${GOLD}` }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke={node.gender === 'female' ? '#fb7185' : '#60a5fa'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" /><path d="M6 20v-2a6 6 0 0 1 12 0v2" />
            </svg>
          </div>
        </div>
        <p className="text-center text-lg font-bold text-[var(--gold-main)] mb-5">{node.name}</p>
        <div className="divide-y divide-white/[0.06]">
          {a !== null && <PR label="العمر" value={`${a} سنة`} />}
          <PR label="الحال" value={node.alive ? 'حي' : 'متوفى'} color={node.alive ? '#4ade80' : '#9ca3af'} />
          <PR label="الحالة الاجتماعية" value={node.marital === 'married' ? 'متزوج' : 'أعزب'} />
          {JOBS[node.job] && <PR label="العمل" value={JOBS[node.job]} />}
          {node.marriedOut && <PR label="ملاحظة" value="متزوجة خارج القبيلة" color="#a78bfa" />}
        </div>
      </div>
    </div>
  )
}
function PR({ label, value, color }) {
  return (
    <div className="flex justify-between items-center py-2.5">
      <span className="font-nav text-sm" style={{ color: color || 'rgba(255,255,255,0.82)' }}>{value}</span>
      <span className="font-nav text-xs text-gray-500">{label}</span>
    </div>
  )
}

/* ════ الصفحة الرئيسية ════════════════════════════════════════════════════ */
export default function FamilyTree() {
  const navigate   = useNavigate()
  const user       = JSON.parse(localStorage.getItem('user') || 'null')

  /* ── حالة الشجرة ── */
  const [treeRoot, setTreeRoot] = useState(FALLBACK)
  const [loading,  setLoading]  = useState(false)
  const [pub,      setPub]      = useState(true)
  const [branch,   setBranch]   = useState(null)
  const [sel,      setSel]      = useState(null)
  const showWives = !pub && !!user

  /* ── جلب بيانات الشجرة من API (جاهز للربط بالباكند) ── */
  useEffect(() => {
    const API = import.meta.env.VITE_API_URL
    if (!API) return // لا يوجد باكند بعد، نستخدم البيانات الافتراضية
    setLoading(true)
    fetch(API, { method: 'POST', body: JSON.stringify({ action: 'getFamilyTree' }) })
      .then(r => r.json())
      .then(d => { if (d.success && d.tree) setTreeRoot(d.tree) })
      .catch(() => {}) // في حال الفشل نبقى مع البيانات الافتراضية
      .finally(() => setLoading(false))
  }, [])

  /* ── بناء الشجرة ── */
  const effectiveRoot = useMemo(() => {
    if (!branch) return treeRoot
    const b = (treeRoot.children || []).find(c => c.id === branch)
    return b ? { ...treeRoot, children: [b] } : treeRoot
  }, [branch, treeRoot])

  const { nodes, lines, wives, wLines, svgW, svgH } = useMemo(() => {
    const nl              = buildNodes(effectiveRoot, PAD, 0, !showWives, showWives)
    const byId            = Object.fromEntries(nl.map(n => [n.id, n]))
    const ll              = buildLines(effectiveRoot, byId, !showWives)
    const { wives, wLines } = buildWivesData(nl, showWives)
    const allX            = [...nl.map(n => n.cx + n.r), ...wives.map(w => w.cx + WR)]
    const allY            = nl.map(n => n.cy + n.r)
    return {
      nodes: nl, lines: ll, wives, wLines,
      svgW: Math.max(0, ...allX) + PAD,
      svgH: Math.max(0, ...allY) + PAD,
    }
  }, [effectiveRoot, showWives])

  const branches = useMemo(
    () => (treeRoot.children || [])
      .filter(c => !pub || c.gender === 'male')
      .map(c => ({ id: c.id, name: c.name })),
    [treeRoot, pub],
  )

  /* ══════════════════ Pan / Zoom ══════════════════ */
  const [tx, setTx]           = useState({ x: 0, y: 0, s: 0.5 })
  const [isDragging, setDrag] = useState(false)
  const svgRef  = useRef(null)
  const drag    = useRef({ active: false, moved: false, sx: 0, sy: 0, stx: 0, sty: 0 })
  const pinch   = useRef({ dist: 1, midX: 0, midY: 0 })

  const MIN_S = 0.05
  const MAX_S = 8

  /* تكبير نحو نقطة معينة */
  const zoomAt = useCallback((cx, cy, factor) => {
    setTx(prev => {
      const newS = Math.min(Math.max(prev.s * factor, MIN_S), MAX_S)
      const r    = newS / prev.s
      return { s: newS, x: cx - r * (cx - prev.x), y: cy - r * (cy - prev.y) }
    })
  }, [])

  /* ملاءمة الشجرة للشاشة */
  const fitToScreen = useCallback(() => {
    const vw  = window.innerWidth
    const vh  = window.innerHeight
    const avW = vw  - 32
    const avH = vh  - BAR_H - 32
    const s   = Math.max(MIN_S, Math.min(avW / svgW, avH / svgH, 1))
    setTx({
      s,
      x: (vw  - svgW * s) / 2,
      y: BAR_H + (avH - svgH * s) / 2 + 16,
    })
  }, [svgW, svgH])

  useEffect(() => { fitToScreen() }, [fitToScreen])

  /* زوم عبر عجلة الماوس */
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = e => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.12 : 0.9)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  /* زوم بالقرصة (pinch) */
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onTS = e => {
      if (e.touches.length !== 2) return
      const [t1, t2] = e.touches
      const rect = el.getBoundingClientRect()
      pinch.current = {
        dist: Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY),
        midX: (t1.clientX + t2.clientX) / 2 - rect.left,
        midY: (t1.clientY + t2.clientY) / 2 - rect.top,
      }
    }
    const onTM = e => {
      if (e.touches.length !== 2) return
      e.preventDefault()
      const [t1, t2] = e.touches
      const rect    = el.getBoundingClientRect()
      const newDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
      const newMidX = (t1.clientX + t2.clientX) / 2 - rect.left
      const newMidY = (t1.clientY + t2.clientY) / 2 - rect.top
      const factor  = newDist / pinch.current.dist
      const { midX, midY } = pinch.current
      setTx(prev => {
        const newS = Math.min(Math.max(prev.s * factor, MIN_S), MAX_S)
        const r    = newS / prev.s
        return {
          s: newS,
          x: midX - r * (midX - prev.x) + (newMidX - midX),
          y: midY - r * (midY - prev.y) + (newMidY - midY),
        }
      })
      pinch.current = { dist: newDist, midX: newMidX, midY: newMidY }
    }
    el.addEventListener('touchstart', onTS, { passive: true })
    el.addEventListener('touchmove',  onTM, { passive: false })
    return () => {
      el.removeEventListener('touchstart', onTS)
      el.removeEventListener('touchmove',  onTM)
    }
  }, [])

  /* تحريك بالسحب (Drag to Pan) */
  const onPD = e => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { active: true, moved: false, sx: e.clientX, sy: e.clientY, stx: tx.x, sty: tx.y }
  }
  const onPM = e => {
    if (!drag.current.active) return
    const dx = e.clientX - drag.current.sx
    const dy = e.clientY - drag.current.sy
    if (!drag.current.moved && Math.hypot(dx, dy) < 4) return
    if (!drag.current.moved) { drag.current.moved = true; setDrag(true) }
    setTx(prev => ({ ...prev, x: drag.current.stx + dx, y: drag.current.sty + dy }))
  }
  const onPU = () => { drag.current.active = false; setDrag(false) }

  /* ضغط على العقدة (يُلغى عند السحب) */
  const onNodeClick = node => {
    if (drag.current.moved) return
    setSel(s => s?.id === node.id ? null : node)
  }

  /* ════════════════ الواجهة ════════════════ */
  return (
    <div style={{ width: '100vw', height: '100svh', background: '#080d14', overflow: 'hidden', position: 'relative' }}>

      {/* ── شريط الأدوات العلوي ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: BAR_H,
        background: 'rgba(8,13,20,0.92)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px', zIndex: 50, gap: 12,
      }}>

        {/* زر الرجوع */}
        <button
          onClick={() => navigate('/')}
          className="font-nav flex items-center gap-2 text-sm transition-colors duration-200"
          style={{ color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--gold-main)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          الرئيسية
        </button>

        {/* العنوان */}
        <span className="font-bold text-[var(--gold-main)] text-lg hidden sm:block" style={{ flexShrink: 0 }}>
          شجرة عائلة السلامي
        </span>

        {/* أدوات التحكم */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap' }}>

          {/* فلتر الفخذ */}
          <select
            value={branch || ''}
            onChange={e => { setBranch(e.target.value || null); setSel(null) }}
            className="font-nav text-sm rounded-xl px-3 py-1.5 outline-none cursor-pointer"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: `1px solid ${branch ? 'rgba(96,165,250,0.4)' : 'rgba(255,255,255,0.1)'}`,
              color: branch ? '#60a5fa' : 'rgba(255,255,255,0.65)',
              maxWidth: 130,
            }}
          >
            <option value="" style={{ background: '#1a2533' }}>🌳 الكل</option>
            {branches.map(b => (
              <option key={b.id} value={b.id} style={{ background: '#1a2533' }}>{b.name}</option>
            ))}
          </select>

          {/* زر تبديل العرض — الأعضاء فقط */}
          {user && (
            <button
              onClick={() => { setPub(v => !v); setSel(null); setBranch(null) }}
              className="font-nav text-sm px-3 py-1.5 rounded-xl transition-all duration-200"
              style={{
                background: pub ? 'transparent' : 'rgba(198,161,107,0.12)',
                border: `1px solid ${pub ? 'rgba(255,255,255,0.1)' : 'rgba(198,161,107,0.3)'}`,
                color: pub ? 'rgba(255,255,255,0.45)' : 'var(--gold-main)',
                whiteSpace: 'nowrap',
              }}
            >
              {pub ? '👁 كامل' : '🌐 عام'}
            </button>
          )}
        </div>
      </div>

      {/* ── لوحة SVG القابلة للتحريك ── */}
      <svg
        ref={svgRef}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          touchAction: 'none',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onPointerDown={onPD}
        onPointerMove={onPM}
        onPointerUp={onPU}
        onPointerLeave={onPU}
        onPointerCancel={onPU}
      >
        <g transform={`translate(${tx.x} ${tx.y}) scale(${tx.s})`}>

          {/* خطوط الأب–الأبناء */}
          {lines.map((l, i) => (
            <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke={LINE_C} strokeWidth={1.6} />
          ))}

          {/* خطوط وحدة الزواج */}
          {wLines.map((l, i) => (
            <line key={`wl${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke={WIFE_LC} strokeWidth={1.4} strokeDasharray="6,3" />
          ))}

          {/* عقد الأشخاص */}
          {nodes.map(n => (
            <CircleNode key={n.id} n={n} active={sel?.id === n.id}
              onClick={() => onNodeClick(n)} />
          ))}

          {/* الزوجات + الماسات */}
          {wives.map((w, i) => (
            <g key={`wu${i}`}>
              <MarriageDiamond cx={w.diamondX} cy={w.diamondY} />
              <WifeCircle cx={w.cx} cy={w.cy} name={w.name} />
            </g>
          ))}

        </g>
      </svg>

      {/* ── أدوات التكبير (يمين سفل) ── */}
      <div style={{
        position: 'absolute', bottom: 24, right: 20, zIndex: 50,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      }}>

        {/* ملاءمة الشاشة */}
        <button
          onClick={fitToScreen}
          title="ملاءمة الشاشة"
          style={btnStyle}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(198,161,107,0.5)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
          </svg>
        </button>

        {/* تكبير */}
        <button
          onClick={() => zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1.25)}
          style={btnStyle}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(198,161,107,0.5)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
        >+</button>

        {/* نسبة التكبير */}
        <div className="font-nav text-xs text-center"
          style={{ color: 'rgba(255,255,255,0.35)', minWidth: 40 }}>
          {Math.round(tx.s * 100)}%
        </div>

        {/* تصغير */}
        <button
          onClick={() => zoomAt(window.innerWidth / 2, window.innerHeight / 2, 0.8)}
          style={btnStyle}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(198,161,107,0.5)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
        >−</button>

      </div>

      {/* ── مفتاح الألوان (يسار سفل) ── */}
      <div style={{
        position: 'absolute', bottom: 24, left: 20, zIndex: 50,
        background: 'rgba(8,13,20,0.82)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16, padding: '10px 14px',
        backdropFilter: 'blur(12px)',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        <LegendDot fill="rgba(59,130,246,0.13)"  stroke={GOLD}  label="ذكر" />
        {showWives && <>
          <LegendDot fill="rgba(244,63,94,0.13)"  stroke={GOLD}  label="أنثى" />
          <LegendDot fill="rgba(139,92,246,0.15)" stroke={GOLD} dash label="متزوجة خارجاً" />
          <LegendDot fill="rgba(244,63,94,0.12)"  stroke={GOLD} dash label="زوجة ◆" />
        </>}
        <LegendDot fill="rgba(59,130,246,0.1)"  stroke={GOLD} alive label="توهج = حي" />
      </div>

      {/* ── loading ── */}
      {loading && (
        <div style={{ position: 'absolute', top: BAR_H + 16, left: '50%', transform: 'translateX(-50%)', zIndex: 60 }}>
          <div className="font-nav text-sm text-gray-500">جاري تحميل الشجرة...</div>
        </div>
      )}

      {/* ── نافذة التفاصيل ── */}
      {sel && <Popup node={sel} onClose={() => setSel(null)} />}
    </div>
  )
}

/* ════ مساعدات الأسلوب ═══════════════════════════════════════════════════ */
const btnStyle = {
  width: 40, height: 40, borderRadius: 12,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(255,255,255,0.7)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 18, cursor: 'pointer',
  transition: 'border-color 0.2s',
}

function LegendDot({ fill, stroke, dash, alive, label }) {
  const r = 7
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width={r * 2 + 6} height={r * 2 + 6}>
        {alive && <circle cx={r + 3} cy={r + 3} r={r + 2} fill="none" stroke="rgba(74,222,128,0.3)" strokeWidth={3} />}
        <circle cx={r + 3} cy={r + 3} r={r}
          fill={fill} stroke={stroke} strokeWidth={1.4}
          strokeDasharray={dash ? '4,2' : 'none'} />
      </svg>
      <span className="font-nav" style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{label}</span>
    </div>
  )
}
