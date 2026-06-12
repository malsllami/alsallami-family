import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import PhoneInput from '../components/PhoneInput'

/* ════ بيانات افتراضية — تُستبدل بجلب من API عند توفر الباكند ════════════ */
const FALLBACK = {
  id:'N000', name:'إبراهيم العفريتي', gender:'male', alive:false, marital:'married', job:'', wives:[], children:[
    { id:'N001', name:'أحمد', gender:'male', alive:false, marital:'married', job:'', wives:[], children:[
      { id:'N002', name:'صاحب',    gender:'male', alive:false, marital:'married', job:'', wives:[], children:[] },
      { id:'N003', name:'شامي',    gender:'male', alive:false, marital:'married', job:'', wives:[], children:[] },
      { id:'N004', name:'يحيى',    gender:'male', alive:false, marital:'married', job:'', wives:[], children:[] },
      { id:'N005', name:'علي',     gender:'male', alive:false, marital:'married', job:'', wives:[], children:[] },
      { id:'N006', name:'إبراهيم', gender:'male', alive:false, marital:'married', job:'', wives:[], children:[] },
    ]},
  ],
}

/* ════ ثوابت التصميم ════════════════════════════════════════════════════════ */
const MR    = 34   // وحدة التخطيط الأفقي
const WR    = 22
const DR    = 5
const V_GAP = 155
const H_GAP = 44
const PAD   = 64
const WDG   = 12
const WCG   = 8
const WWG   = 8

/* نصف قطر العقدة حسب العمق — الأجداد أكبر، الأحفاد أصغر */
function nodeR(depth) {
  if (depth === 0) return 44
  if (depth === 1) return 39
  if (depth === 2) return 36
  return Math.max(30, 36 - (depth - 2))
}

const GOLD    = 'rgba(198,161,107,0.72)'
const WIFE_LC = 'rgba(251,113,133,0.28)'
const BAR_H     = 60   // ارتفاع شريط الأدوات

const COMPOUND_PREFIXES = ['عبد', 'أبو', 'أبي', 'ابن', 'بنت', 'أم', 'ام']
const firstName = str => {
  const parts = (str || '').split(' ')
  if (parts.length >= 2 && COMPOUND_PREFIXES.includes(parts[0])) {
    return parts[0] + ' ' + parts[1]
  }
  return parts[0]
}

/* لوحة ألوان الأجيال — حدود ملونة على خلفية موحدة داكنة */
const GEN_PALETTE = [
  { stroke: '#C6A16B', line: 'rgba(198,161,107,0.40)', glow: 'drop-shadow(0 0 8px rgba(198,161,107,0.70))' },
  { stroke: '#00c896', line: 'rgba(0,200,150,0.35)',   glow: 'drop-shadow(0 0 8px rgba(0,200,150,0.35))'   },
  { stroke: '#818cf8', line: 'rgba(99,102,241,0.35)',  glow: 'drop-shadow(0 0 7px rgba(99,102,241,0.45))'  },
  { stroke: '#c084fc', line: 'rgba(168,85,247,0.35)',  glow: 'drop-shadow(0 0 7px rgba(168,85,247,0.45))'  },
  { stroke: '#eab308', line: 'rgba(234,179,8,0.35)',   glow: 'drop-shadow(0 0 7px rgba(234,179,8,0.42))'   },
  { stroke: '#34d399', line: 'rgba(16,185,129,0.35)',  glow: 'drop-shadow(0 0 8px rgba(0,200,150,0.35))'   },
  { stroke: '#fb923c', line: 'rgba(249,115,22,0.35)',  glow: 'drop-shadow(0 0 6px rgba(249,115,22,0.34))'  },
  { stroke: '#f472b6', line: 'rgba(236,72,153,0.35)',  glow: 'drop-shadow(0 0 7px rgba(236,72,153,0.45))'  },
]
const genPalette = (depth) => GEN_PALETTE[depth % GEN_PALETTE.length]

/* ════ وظائف مساعدة للشجرة ═════════════════════════════════════════════════ */
function flatByDepth(node, targetDepth, currentDepth) {
  if (currentDepth === targetDepth) return [node]
  return (node.children || []).flatMap(c => flatByDepth(c, targetDepth, currentDepth + 1))
}
// يجد عمق نقطة تفرع الفخوذ: يسير في الذكور الوحيدين حتى يصل لعقدة ذات أبناء متعددة
function findBranchPointDepth(node, depth) {
  if (!node) return depth || 0
  const kids = (node.children || []).filter(c => c.gender === 'male')
  if (kids.length !== 1) return depth || 0
  return findBranchPointDepth(kids[0], (depth || 0) + 1)
}
function findNodeById(node, id) {
  if (node.id === id) return node
  for (const c of (node.children || [])) {
    const r = findNodeById(c, id)
    if (r) return r
  }
  return null
}
function updateNodeInTree(node, nodeId, updates) {
  if (node.id === nodeId) return { ...node, ...updates }
  return { ...node, children: (node.children || []).map(c => updateNodeInTree(c, nodeId, updates)) }
}
function updateWifeInTree(node, wifeId, updates) {
  const wives = (node.wives || []).map(w => w.id === wifeId ? { ...w, ...updates } : w)
  return { ...node, wives, children: (node.children || []).map(c => updateWifeInTree(c, wifeId, updates)) }
}
// يُبقي من الشجرة فقط المسار الواصل إلى targetId + كامل فرعه
function pruneToPath(node, targetId) {
  if (node.id === targetId) return node
  const kept = (node.children || []).map(c => pruneToPath(c, targetId)).filter(Boolean)
  if (!kept.length) return null
  return { ...node, children: kept }
}
// يقطع الشجرة عند maxDepth (يُزيل الأبناء تحت الحد)
function shallowTree(node, maxDepth, depth = 0) {
  if (depth >= maxDepth) return { ...node, children: [] }
  return { ...node, children: (node.children || []).map(c => shallowTree(c, maxDepth, depth + 1)) }
}
// يجد المسار من الجذر إلى targetId ويعيد مصفوفة مرتبة من معرّفات العقد
function findPath(node, targetId, path = []) {
  const next = [...path, node.id]
  if (node.id === targetId) return next
  for (const c of (node.children || [])) {
    const r = findPath(c, targetId, next)
    if (r) return r
  }
  return null
}

/* ════ وظائف التخطيط ══════════════════════════════════════════════════════ */
function visKids(node, pub) {
  // عام: جميع الذكور (مسجلون + أبناء مضافون) — الإناث في الوضع الكامل فقط
  // عند تسجيل الابن لاحقاً يُكتب رقم عضو الابن في GAS ويُتخطى السجل تلقائياً
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
  const r   = nodeR(depth)
  if (!ch.length) return [{ ...node, cx: x0 + MR, cy, r, depth }]
  const childOut = []
  let x = x0
  for (const c of ch) {
    childOut.push(...buildNodes(c, x, depth + 1, pub, showWives))
    x += sw(c, pub, showWives) + H_GAP
  }
  const firstCX = childOut.find(n => n.id === ch[0].id).cx
  const lastCX  = childOut.find(n => n.id === ch[ch.length - 1].id).cx
  return [{ ...node, cx: Math.round((firstCX + lastCX) / 2), cy, r, depth }, ...childOut]
}
function buildLines(node, byId, pub) {
  const ch = visKids(node, pub)
  if (!ch.length) return []
  const p   = byId[node.id], pR = p.r ?? MR
  const d   = p.depth ?? 0
  const fc  = byId[ch[0].id], cR = fc.r ?? MR
  const midY = p.cy + pR + (fc.cy - cR - p.cy - pR) / 2
  const childXs = ch.map(c => byId[c.id].cx)
  const segs = [
    { x1: p.cx, y1: p.cy + pR,                                   x2: p.cx,                                  y2: midY, d },
    { x1: Math.min(p.cx, ...childXs), y1: midY, x2: Math.max(p.cx, ...childXs), y2: midY, d },
  ]
  for (const c of ch) {
    const cp = byId[c.id], cpR = cp.r ?? MR
    segs.push({ x1: cp.cx, y1: midY, x2: cp.cx, y2: cp.cy - cpR, d })
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
      wives.push({ ...w, cx: wifeCX, cy: n.cy, diamondX, diamondY: n.cy, husbandName: n.name })
    })
    const lastW = wives[wives.length - 1]
    wLines.push({ x1: n.cx + n.r, y1: n.cy, x2: lastW.cx + WR, y2: n.cy })
  }
  return { wives, wLines }
}

/* ════ مكونات SVG ══════════════════════════════════════════════════════════ */
function CircleNode({ n, active, onClick, dimmed, isMe }) {
  const { cx, cy, r, alive, name, depth = 0 } = n
  const [hov, setHov] = useState(false)
  const pal  = genPalette(depth)

  const dimOp      = depth === 0 ? 1.0 : depth === 1 ? 0.85 : 0.70
  const strokeColor = (active || isMe) ? '#C6A16B' : pal.stroke
  const strokeW     = (active || isMe) ? 2.5 : hov ? 2.3 : 2.0
  const strokeOp    = (active || isMe) ? 1.0 : hov ? Math.min(dimOp + 0.15, 1.0) : dimOp
  const glowFilter  = isMe
    ? 'drop-shadow(0 0 14px rgba(198,161,107,1.0))'
    : active
    ? 'drop-shadow(0 0 10px rgba(198,161,107,0.85))'
    : pal.glow

  return (
    <g
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        cursor: 'pointer',
        transformBox: 'fill-box',
        transformOrigin: 'center',
        transform: hov ? 'scale(1.05)' : 'scale(1)',
        transition: 'transform .25s ease, opacity .35s ease',
        opacity: dimmed ? 0.12 : 1,
      }}
    >
      {/* هالة موقعي */}
      {isMe && (
        <>
          <circle cx={cx} cy={cy} r={r + 18}
            fill="none" stroke="rgba(198,161,107,0.15)" strokeWidth={6}
            style={{ filter: 'blur(5px)' }} />
          <circle cx={cx} cy={cy} r={r + 10}
            fill="none" stroke="rgba(198,161,107,0.45)" strokeWidth={3}
            style={{ filter: 'blur(2px)' }} />
          <circle cx={cx} cy={cy} r={r + 5}
            fill="none" stroke="rgba(198,161,107,0.7)" strokeWidth={1.5} />
        </>
      )}
      {/* حلقة الحياة */}
      {alive && (
        <circle cx={cx} cy={cy} r={r + 5}
          fill="none" stroke="#00c896" strokeWidth={5} strokeOpacity={0.40}
          style={{ filter: 'blur(3px)' }} />
      )}
      <circle cx={cx} cy={cy} r={r}
        fill="#18222d"
        stroke={strokeColor}
        strokeWidth={strokeW}
        strokeDasharray={alive ? 'none' : '5,3'}
        strokeOpacity={strokeOp}
        style={{ filter: glowFilter }}
      />
      {(() => {
        const display = firstName(name)
        const isCompound = display.includes(' ')
        const fill = alive ? '#ffffff' : 'rgba(255,255,255,0.52)'
        const commonProps = {
          textAnchor: 'middle',
          dominantBaseline: 'middle',
          fill,
          fontWeight: '700',
          fontFamily: 'Cairo,sans-serif',
          style: { userSelect: 'none', pointerEvents: 'none', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.45))' },
        }
        if (isCompound) {
          const [p1, p2] = display.split(' ')
          const fs = Math.min(13, Math.max(10, r * 0.38))
          return (
            <text x={cx} y={cy} {...commonProps} fontSize={fs}>
              <tspan x={cx} dy={`-${fs * 0.65}px`}>{p1}</tspan>
              <tspan x={cx} dy={`${fs * 1.3}px`}>{p2}</tspan>
            </text>
          )
        }
        return (
          <text x={cx} y={cy} {...commonProps} fontSize={15}>
            {display}
          </text>
        )
      })()}
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

/* ════ حساب إحصائيات الشجرة ════════════════════════════════════════════ */
function parseAgeFromDate(dateStr) {
  if (!dateStr) return null
  let d = new Date(dateStr)
  if (isNaN(d.getTime())) {
    const parts = String(dateStr).split('/')
    if (parts.length === 3) {
      d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10))
    }
  }
  if (isNaN(d.getTime())) return null
  const age = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000))
  return (age >= 0 && age < 130) ? age : null
}

function computeTreeStats(root) {
  if (!root) return null
  const all = []
  function walk(node, depth) {
    if (!node || node.isWife) return
    all.push({ alive: node.alive === true, gen: node.generation || (depth + 1), birthDate: node.birthDate || null })
    ;(node.children || []).forEach(c => walk(c, depth + 1))
  }
  walk(root, 0)

  const genMap = {}
  all.forEach(n => {
    if (!genMap[n.gen]) genMap[n.gen] = { count: 0, ages: [] }
    genMap[n.gen].count++
    const age = parseAgeFromDate(n.birthDate)
    if (age !== null) genMap[n.gen].ages.push(age)
  })
  const generations = Object.entries(genMap)
    .map(([g, d]) => ({
      gen: Number(g),
      count: d.count,
      avgAge: d.ages.length > 0 ? Math.round(d.ages.reduce((a, b) => a + b, 0) / d.ages.length) : null,
    }))
    .sort((a, b) => a.gen - b.gen)

  const bpd = findBranchPointDepth(root, 0)
  const branchNodes = flatByDepth(root, bpd + 1, 0).filter(n => n.gender === 'male')
  const branches = branchNodes.map(branch => {
    const baseGen = branch.generation || (bpd + 2)
    let maxGen = baseGen
    let total = 0, alive = 0
    function walkBranch(n) {
      if (n.isWife) return
      total++
      if (n.alive === true) alive++
      const g = n.generation || 0
      if (g > maxGen) maxGen = g
      ;(n.children || []).forEach(walkBranch)
    }
    walkBranch(branch)
    return { name: branch.name, maxGen, span: maxGen - baseGen + 1, total, alive }
  })

  const total = all.length
  const alive = all.filter(n => n.alive).length
  return { total, alive, dead: total - alive, generations, branches }
}

/* ════ لوحة الإحصائيات ══════════════════════════════════════════════════ */
function StatsPanel({ stats, onClose }) {
  if (!stats) return null
  const maxCount = stats.generations.reduce((a, g) => Math.max(a, g.count), 1)
  return (
    <div className="fixed inset-0 z-[9998] flex items-start justify-center px-4"
      style={{ paddingTop: 72 }}
      onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-[460px] rounded-[26px] z-10 flex flex-col"
        style={{
          maxHeight: 'calc(100svh - 90px)',
          background: 'rgba(12,22,34,0.98)',
          border: '1px solid rgba(255,255,255,0.10)',
          backdropFilter: 'blur(28px)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.75)',
        }}
        onClick={e => e.stopPropagation()}>

        {/* رأس اللوحة */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-200 hover:bg-white/10 transition-all text-sm">✕</button>
          <span className="font-bold text-[var(--gold-main)] text-base">إحصائيات الشجرة العائلية</span>
          <div className="w-8" />
        </div>

        {/* المحتوى */}
        <div className="overflow-y-auto p-5 space-y-5" style={{ scrollbarWidth: 'none' }}>

          {/* الإجمالي + الأحياء + المتوفون */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl p-4 text-center"
              style={{ background: 'rgba(198,161,107,0.08)', border: '1px solid rgba(198,161,107,0.22)' }}>
              <p className="font-nav text-[10px] text-gray-500 mb-2">إجمالي الشجرة</p>
              <p className="text-3xl font-black tabular-nums" style={{ color: 'var(--gold-main)' }}>{stats.total}</p>
              <p className="font-nav text-[10px] text-gray-500 mt-1">شخص</p>
            </div>
            <div className="rounded-2xl p-4 text-center"
              style={{ background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.2)' }}>
              <p className="font-nav text-[10px] text-gray-500 mb-2">أحياء</p>
              <p className="text-3xl font-black tabular-nums text-green-400">{stats.alive}</p>
              <p className="font-nav text-[10px] text-green-700 mt-1">
                {stats.total ? Math.round(stats.alive / stats.total * 100) : 0}%
              </p>
            </div>
            <div className="rounded-2xl p-4 text-center"
              style={{ background: 'rgba(156,163,175,0.05)', border: '1px solid rgba(156,163,175,0.16)' }}>
              <p className="font-nav text-[10px] text-gray-500 mb-2">متوفون</p>
              <p className="text-3xl font-black tabular-nums text-gray-400">{stats.dead}</p>
              <p className="font-nav text-[10px] text-gray-600 mt-1">
                {stats.total ? Math.round(stats.dead / stats.total * 100) : 0}%
              </p>
            </div>
          </div>

          {/* توزيع الأجيال */}
          <div>
            <p className="font-nav text-xs mb-3" style={{ color: 'rgba(255,255,255,0.70)' }}>توزيع الأجيال</p>
            <div className="space-y-2">
              {stats.generations.map(g => (
                <div key={g.gen} className="rounded-xl px-4 py-2.5"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="font-nav text-xs font-bold w-14 flex-shrink-0"
                      style={{ color: genPalette(g.gen - 1).stroke }}>
                      الجيل {g.gen}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.max(4, (g.count / maxCount) * 100)}%`,
                          background: genPalette(g.gen - 1).stroke,
                          opacity: 0.75,
                        }} />
                    </div>
                    <span className="font-nav text-sm font-bold text-white tabular-nums w-8 text-right flex-shrink-0">
                      {g.count}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span />
                    {g.avgAge !== null
                      ? <span className="font-nav text-[10px]" style={{ color: 'rgba(255,255,255,0.60)' }}>
                          متوسط العمر: {g.avgAge} سنة
                        </span>
                      : <span className="font-nav text-[10px]" style={{ color: 'rgba(255,255,255,0.50)' }}>
                          لا توجد بيانات أعمار
                        </span>
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* أعماق الفخوذ */}
          {stats.branches.length > 0 && (
            <div>
              <p className="font-nav text-xs mb-3" style={{ color: 'rgba(255,255,255,0.70)' }}>عمق كل فخذ</p>
              <div className="space-y-2">
                {stats.branches.map(b => (
                  <div key={b.name} className="rounded-xl px-4 py-3"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(16,185,129,0.12)' }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-sm text-white">فخذ {b.name}</span>
                      <span className="font-nav text-[11px] px-2.5 py-1 rounded-full font-bold flex-shrink-0"
                        style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399' }}>
                        {b.span} {b.span === 1 ? 'جيل' : 'أجيال'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-nav text-[11px]">
                      <span className="text-gray-400">{b.total} شخص</span>
                      <span style={{ color: '#4ade80' }}>{b.alive} حي</span>
                      <span className="text-gray-600">{b.total - b.alive} متوفٍ</span>
                      <span className="text-gray-500 mr-auto">حتى الجيل {b.maxGen}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="font-nav text-[10px] text-center pb-1" style={{ color: 'rgba(255,255,255,0.46)' }}>
            تتحدث تلقائياً عند أي تغيير في الشجرة
          </p>
        </div>
      </div>
    </div>
  )
}

/* ════ نافذة التفاصيل ════════════════════════════════════════════════════ */
function Popup({ node, onClose, isAdmin, user, onUpdateNode }) {
  const mapMarital = (m) => {
    if (m === 'married') return 'متزوج'
    if (m === 'single')  return 'أعزب'
    return m || ''
  }

  const [editing,         setEditing]         = useState(false)
  const [editName,        setEditName]        = useState(node.name)
  const [editAlive,       setEditAlive]       = useState(node.alive)
  const [editPhone,       setEditPhone]       = useState(node.phone || '')
  const [editPhoneCountry,setEditPhoneCountry]= useState('+966')
  const [editMarital,     setEditMarital]     = useState(mapMarital(node.marital))
  const [editJob,         setEditJob]         = useState(node.job || '')
  const [editLocation,    setEditLocation]    = useState(node.location || '')
  const [saving,          setSaving]          = useState(false)

  /* ── جلب بيانات العضو المسجل إن وجد ── */
  const [profile,        setProfile]        = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const API = import.meta.env.VITE_API_URL

  useEffect(() => {
    if (!node.memberId || !API) return
    setProfileLoading(true)
    fetch(API, { method: 'POST', body: JSON.stringify({ action: 'getMemberData', memberId: node.memberId }) })
      .then(r => r.json())
      .then(d => { if (d.success && d.member) setProfile(d.member) })
      .catch(() => {})
      .finally(() => setProfileLoading(false))
  }, [node.memberId])

  /* دمج بيانات التسجيل فوق بيانات الشجرة */
  const display = profile ? {
    alive:      profile.alive !== undefined ? profile.alive : node.alive,
    marital:    profile.maritalStatus || node.marital,
    job:        profile.job           || node.job,
    location:   profile.city          || node.location,
    phone:      profile.phone         || node.phone,
    nationalId: profile.nationalId    || null,
    birthDate:  profile.birthDate     || node.birthDate || null,
    generation: node.generationLevel  || null,
    name:       node.name,
    photoUrl:   profile.photoUrl      || node.photoUrl  || null,
  } : {
    alive:      node.alive,
    marital:    node.marital,
    job:        node.job,
    location:   node.location,
    phone:      node.phone,
    nationalId: null,
    birthDate:  node.birthDate || null,
    generation: node.generationLevel || null,
    name:       node.name,
    photoUrl:   node.photoUrl || null,
  }

  const isWifeDaughter = node.isWife || node.isDaughter || node.isSon
  const isLoggedIn     = !!user
  const isFemaleColor  = isWifeDaughter || node.gender === 'female'

  const lineage = node.isWife
    ? (node.husbandName ? `زوجة ${firstName(node.husbandName)}` : 'زوجة')
    : node.isDaughter
    ? (node.fatherName  ? `بنت ${firstName(node.fatherName)}`   : 'بنت')
    : node.isSon
    ? (node.fatherName  ? `ابن ${firstName(node.fatherName)}`    : 'ابن')
    : null

  const cancelEdit = () => {
    setEditing(false)
    setEditName(node.name)
    setEditAlive(node.alive)
    setEditPhone(node.phone || '')
    setEditMarital(mapMarital(node.marital))
    setEditJob(node.job || '')
    setEditLocation(node.location || '')
  }

  const handleSave = async () => {
    setSaving(true)
    if (API) {
      try {
        if (node.isWife) {
          await fetch(API, { method: 'POST', body: JSON.stringify({
            action: 'updateWifeStatus', wifeId: node.wifeRecordId, status: editAlive ? 'حي' : 'متوفى',
          }) })
        } else if (node.isDaughter || node.isSon) {
          await fetch(API, { method: 'POST', body: JSON.stringify({
            action: 'updateChildStatus', childId: node.childRecordId, status: editAlive ? 'حي' : 'متوفى',
          }) })
        } else {
          await fetch(API, { method: 'POST', body: JSON.stringify({
            action:   'updateTreeNode',
            nodeId:   node.id,
            name:     editName.trim(),
            status:   editAlive ? 'حي' : 'متوفى',
            phone:    editPhoneCountry + editPhone.trim(),
            marital:  editMarital,
            job:      editJob,
            location: editLocation.trim(),
          }) })
        }
      } catch { /* network error — local state still updated */ }
    }
    const updates = isWifeDaughter
      ? { alive: editAlive }
      : { name: editName.trim(), alive: editAlive, phone: editPhoneCountry + editPhone.trim(), marital: editMarital, job: editJob, location: editLocation.trim() }
    onUpdateNode(node.id, updates)
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-[340px] rounded-[26px] p-6 z-10"
        onClick={e => e.stopPropagation()}
        style={{ background: 'rgba(20,28,38,0.98)', border: '1px solid rgba(255,255,255,0.11)', backdropFilter: 'blur(24px)', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>

        {/* ── رأس النافذة ── */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-200 hover:bg-white/10 transition-all text-sm">✕</button>
          <div className="flex items-center gap-2">
            {profile && (
              <span className="font-nav text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }}>
                عضو مسجل
              </span>
            )}
            {isAdmin && !editing && (
              <button onClick={() => setEditing(true)}
                className="font-nav text-xs px-3 py-1.5 rounded-xl transition-all"
                style={{ background: 'rgba(198,161,107,0.1)', border: '1px solid rgba(198,161,107,0.25)', color: 'var(--gold-main)' }}>
                تعديل
              </button>
            )}
            {isAdmin && editing && (
              <button onClick={cancelEdit}
                className="font-nav text-xs px-3 py-1.5 rounded-xl transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.80)' }}>
                إلغاء
              </button>
            )}
          </div>
        </div>

        {/* ── وضع التعديل ── */}
        {editing ? (
          <div className="space-y-3">
            <p className="font-nav text-xs text-center mb-2" style={{ color: 'rgba(255,255,255,0.70)' }}>
              تعديل بيانات {node.isWife ? 'الزوجة' : node.isDaughter ? 'الابنة' : node.isSon ? 'الابن' : 'العقدة'}
            </p>

            {!isWifeDaughter && (
              <EF label="الاسم">
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                  className="form-input w-full" style={{ direction: 'rtl' }} />
              </EF>
            )}

            <EF label="الحال">
              <div className="flex gap-2">
                <button onClick={() => setEditAlive(true)} className="flex-1 font-nav text-sm py-2 rounded-xl transition-all"
                  style={{ background: editAlive ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${editAlive ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.08)'}`, color: editAlive ? '#4ade80' : 'rgba(255,255,255,0.72)' }}>
                  حي
                </button>
                <button onClick={() => setEditAlive(false)} className="flex-1 font-nav text-sm py-2 rounded-xl transition-all"
                  style={{ background: !editAlive ? 'rgba(156,163,175,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${!editAlive ? 'rgba(156,163,175,0.3)' : 'rgba(255,255,255,0.08)'}`, color: !editAlive ? '#9ca3af' : 'rgba(255,255,255,0.72)' }}>
                  متوفى
                </button>
              </div>
            </EF>

            {!isWifeDaughter && <>
              <EF label="الحالة الاجتماعية">
                <select value={editMarital} onChange={e => setEditMarital(e.target.value)}
                  className="form-input w-full" style={{ direction: 'rtl' }}>
                  <option value="">— اختر —</option>
                  <option value="متزوج">متزوج</option>
                  <option value="أعزب">أعزب</option>
                  <option value="مطلق">مطلق</option>
                  <option value="أرمل">أرمل</option>
                </select>
              </EF>
              <EF label="المهنة">
                <select value={editJob} onChange={e => setEditJob(e.target.value)}
                  className="form-input w-full" style={{ direction: 'rtl' }}>
                  <option value="">— اختر —</option>
                  <option value="موظف">موظف</option>
                  <option value="طالب">طالب</option>
                  <option value="رجل أعمال">رجل أعمال</option>
                  <option value="متقاعد">متقاعد</option>
                  <option value="عاطل">عاطل</option>
                </select>
              </EF>
              <EF label="المدينة">
                <input type="text" value={editLocation} onChange={e => setEditLocation(e.target.value)}
                  className="form-input w-full" style={{ direction: 'rtl' }} placeholder="مثال: الرياض، جدة..." />
              </EF>
              <EF label="رقم الجوال">
                <PhoneInput
                  value={editPhone}
                  onChange={setEditPhone}
                  countryCode={editPhoneCountry}
                  onCountryChange={setEditPhoneCountry}
                />
              </EF>
            </>}

            <button onClick={handleSave} disabled={saving || (!isWifeDaughter && !editName.trim())}
              className="w-full font-nav text-sm py-3 rounded-2xl font-bold transition-all disabled:opacity-50"
              style={{ background: 'rgba(198,161,107,0.12)', border: '1px solid rgba(198,161,107,0.3)', color: 'var(--gold-main)' }}>
              {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </button>
          </div>
        ) : profileLoading ? (
          <div className="py-8 flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'rgba(198,161,107,0.4)', borderTopColor: 'transparent' }} />
            <p className="font-nav text-xs" style={{ color: 'rgba(255,255,255,0.62)' }}>جاري تحميل البيانات...</p>
          </div>
        ) : (
          <>
            {/* ── وضع العرض ── */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                style={{ background: isFemaleColor ? 'rgba(244,63,94,0.1)' : 'rgba(59,130,246,0.1)', border: `2px solid ${GOLD}` }}>
                {display.photoUrl
                  ? <img src={display.photoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  : <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                      stroke={isFemaleColor ? '#fb7185' : '#60a5fa'}
                      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="4" /><path d="M6 20v-2a6 6 0 0 1 12 0v2" />
                    </svg>
                }
              </div>
            </div>
            <p className="text-center text-lg font-bold text-[var(--gold-main)] mb-1">{display.name}</p>
            <div className="flex items-center justify-center gap-2 mb-1">
              {display.generation && (
                <span className="font-nav text-[11px] px-2.5 py-0.5 rounded-full font-bold"
                  style={{ background: 'rgba(198,161,107,0.15)', border: '1px solid rgba(198,161,107,0.35)', color: 'var(--gold-main)' }}>
                  الجيل {display.generation}
                </span>
              )}
              {lineage && (
                <span className="font-nav text-xs" style={{ color: 'rgba(255,255,255,0.72)' }}>{lineage}</span>
              )}
            </div>
            {(() => {
              const age = parseAgeFromDate(display.birthDate)
              return (
                <div className="divide-y divide-white/[0.06]">
                  <PR label="الحال" value={display.alive ? 'حي' : 'متوفى'} color={display.alive ? '#4ade80' : '#9ca3af'} />
                  {age !== null && <PR label="العمر" value={`${age} سنة`} />}
                  {!isWifeDaughter && (display.alive ? (
                    <>
                      <PR label="الحالة الاجتماعية" value={display.marital ? mapMarital(display.marital) : '—'} />
                      <PR label="المهنة"  value={display.job      || '—'} />
                      <PR label="المدينة" value={display.location || '—'} color={display.location ? '#a78bfa' : undefined} />
                      {isLoggedIn && <PR label="الجوال"     value={display.phone      || '—'} />}
                      {isLoggedIn && display.nationalId && <PR label="رقم الهوية" value={display.nationalId} />}
                    </>
                  ) : (
                    display.location && <PR label="المدينة" value={display.location} color="#a78bfa" />
                  ))}
                </div>
              )
            })()}
            {!isLoggedIn && node.memberId && display.alive && (
              <p className="font-nav text-[10px] text-center mt-3" style={{ color: 'rgba(255,255,255,0.52)' }}>
                سجّل دخولك لرؤية رقم الجوال والهوية
              </p>
            )}
            {isAdmin && !isWifeDaughter && (
              <div className="mt-3 pt-3 space-y-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] select-all" style={{ color: 'rgba(255,255,255,0.70)', letterSpacing: '0.02em' }}>
                    {node.id}
                  </span>
                  <span className="font-nav text-[10px] text-gray-600">رقم العقدة</span>
                </div>
                {node.memberId && (
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] select-all" style={{ color: '#34d399', letterSpacing: '0.02em' }}>
                      {node.memberId}
                    </span>
                    <span className="font-nav text-[10px] text-gray-600">رقم العضو</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
function EF({ label, children }) {
  return (
    <div>
      <label className="font-nav text-xs mb-1.5 block" style={{ color: 'rgba(255,255,255,0.72)' }}>{label}</label>
      {children}
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
export default function FamilyTree({ viewerMode = false }) {
  const navigate   = useNavigate()
  const user       = JSON.parse(localStorage.getItem('user') || 'null')

  /* ── حالة الشجرة ── */
  const [treeRoot,   setTreeRoot]  = useState(FALLBACK)
  const [loading,    setLoading]   = useState(!!import.meta.env.VITE_API_URL)
  const pub = true
  const [branch,     setBranch]    = useState(null)
  const [sel,        setSel]       = useState(null)
  const [tx,         setTx]        = useState({ x: 0, y: 0, s: 0.5 })
  const [isDragging, setDrag]      = useState(false)
  const showWives = false
  const isAdmin      = !viewerMode && user?.roles?.includes('admin')
  const [lineageMode, setLineageMode] = useState(false)
  const [showStats,   setShowStats]   = useState(false)
  const initDone  = useRef(false)

  const treeStats = useMemo(() => computeTreeStats(treeRoot), [treeRoot])
  const branchPointDepth = useMemo(() => findBranchPointDepth(treeRoot, 0), [treeRoot])

  /* ── جلب بيانات الشجرة من API (جاهز للربط بالباكند) ── */
  useEffect(() => {
    const API = import.meta.env.VITE_API_URL
    if (!API) return
    const load = async () => {
      try {
        const r = await fetch(API, { method: 'POST', body: JSON.stringify({ action: 'getFamilyTree' }) })
        const d = await r.json()
        if (d.success && d.tree?.length > 0) setTreeRoot(d.tree[0])
      } catch { /* keep FALLBACK on error */ }
      finally { setLoading(false) }
    }
    load()
  }, [])

  /* ── بناء الشجرة ── */
  // عند اختيار فخذ: أبقِ إبراهيم→أحمد→الفخذ المختار وأزل الفخوذ الأخرى
  const effectiveRoot = useMemo(() => {
    if (!branch || branch === 'all') return treeRoot
    return pruneToPath(treeRoot, branch) || treeRoot
  }, [branch, treeRoot])

  const { nodes, lines, wives, wLines, svgW, svgH } = useMemo(() => {
    // بدون فخذ: اعرض من الجذر حتى مستوى الفخوذ ديناميكياً — الكل: كامل الشجرة
    const renderRoot      = (!branch && !lineageMode) ? shallowTree(effectiveRoot, branchPointDepth + 1) : effectiveRoot
    const nl              = buildNodes(renderRoot, PAD, 0, !showWives, showWives)
    const byId            = Object.fromEntries(nl.map(n => [n.id, n]))
    const ll              = buildLines(renderRoot, byId, !showWives)
    const { wives, wLines } = buildWivesData(nl, showWives)
    const allX            = [...nl.map(n => n.cx + n.r), ...wives.map(w => w.cx + WR)]
    const allY            = nl.map(n => n.cy + n.r)
    return {
      nodes: nl, lines: ll, wives, wLines,
      svgW: Math.max(0, ...allX) + PAD,
      svgH: Math.max(0, ...allY) + PAD,
    }
  }, [effectiveRoot, showWives, branch, branchPointDepth, lineageMode])

  /* ── موقع العضو الحالي في الشجرة ── */
  const myNode = useMemo(() => {
    if (!user?.memberId) return null
    return nodes.find(n => n.memberId === user.memberId) || null
  }, [nodes, user])

  /* ── وضع مسار الانتساب ── */
  const ancestryPath = useMemo(() => {
    if (!lineageMode || !myNode) return null
    return findPath(effectiveRoot, myNode.id)
  }, [lineageMode, myNode, effectiveRoot])

  const ancestryPathSet = useMemo(() => {
    if (!ancestryPath) return null
    return new Set(ancestryPath)
  }, [ancestryPath])

  const ancestryLineSegs = useMemo(() => {
    if (!ancestryPath || ancestryPath.length < 2) return []
    const byId = Object.fromEntries(nodes.map(n => [n.id, n]))
    const segs = []
    for (let i = 0; i < ancestryPath.length - 1; i++) {
      const p = byId[ancestryPath[i]]
      const c = byId[ancestryPath[i + 1]]
      if (!p || !c) continue
      const midY = p.cy + p.r + (c.cy - c.r - p.cy - p.r) / 2
      segs.push({ x1: p.cx, y1: p.cy + p.r, x2: p.cx,  y2: midY,        gen: i })
      if (Math.abs(p.cx - c.cx) > 1)
        segs.push({ x1: p.cx, y1: midY,      x2: c.cx,  y2: midY,        gen: i })
      segs.push({ x1: c.cx, y1: midY,        x2: c.cx,  y2: c.cy - c.r, gen: i })
    }
    return segs
  }, [ancestryPath, nodes])

  const centerOn = (n) => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    setTx(prev => ({
      s: prev.s,
      x: vw / 2 - n.cx * prev.s,
      y: BAR_H + (vh - BAR_H) / 2 - n.cy * prev.s,
    }))
  }

  const handleUpdateNode = (nodeId, updates) => {
    setTreeRoot(prev => updateWifeInTree(updateNodeInTree(prev, nodeId, updates), nodeId, updates))
    setSel(prev => prev?.id === nodeId ? { ...prev, ...updates } : prev)
  }


  // الفخوذ: المستوى الأول بعد نقطة التفرع (ديناميكي)
  const branches = useMemo(() => {
    return flatByDepth(treeRoot, branchPointDepth + 1, 0)
      .filter(c => c.gender === 'male')
      .map(c => ({ id: c.id, name: c.name }))
  }, [treeRoot, branchPointDepth])

  /* ══════════════════ Pan / Zoom ══════════════════ */
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
  }, [setTx])

  /* ملاءمة الشجرة للشاشة (يُستخدم عبر الزر فقط) */
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
  }, [svgW, svgH, setTx])

  /* العرض الافتراضي: زووم ثابت يُظهر إبراهيم أعلى الشاشة */
  const defaultView = useCallback(() => {
    const vw = window.innerWidth
    const s  = 0.65
    const rootTopInSvg = PAD + MR - nodeR(0)   // الحافة العليا لعقدة إبراهيم
    setTx({ s, x: vw / 2 - (svgW / 2) * s, y: BAR_H + 20 - rootTopInSvg * s })
  }, [svgW, setTx])

  // عند أول تحميل للبيانات الحقيقية
  useEffect(() => {
    if (svgW > 0 && !initDone.current) {
      initDone.current = true
      requestAnimationFrame(defaultView)
    }
  }, [svgW, defaultView])

  // عند تغيير الفخذ: أعد التمركز
  useEffect(() => {
    if (initDone.current) {
      if (branch === 'all') requestAnimationFrame(fitToScreen)
      else requestAnimationFrame(defaultView)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch])

  // عند تفعيل وضع الانتساب: اضبط العرض ليشمل المسار كاملاً
  useEffect(() => {
    if (!lineageMode || !ancestryPath || !nodes.length) return
    const byId = Object.fromEntries(nodes.map(n => [n.id, n]))
    const pNodes = ancestryPath.map(id => byId[id]).filter(Boolean)
    if (!pNodes.length) return
    const xs = pNodes.flatMap(n => [n.cx - n.r - 40, n.cx + n.r + 40])
    const ys = pNodes.flatMap(n => [n.cy - n.r - 40, n.cy + n.r + 40])
    const minX = Math.min(...xs), maxX = Math.max(...xs)
    const minY = Math.min(...ys), maxY = Math.max(...ys)
    const pw = maxX - minX, ph = maxY - minY
    const vw = window.innerWidth, vh = window.innerHeight
    const avW = vw - 80, avH = vh - BAR_H - 80
    const s = Math.max(0.15, Math.min(avW / pw, avH / ph, 2))
    requestAnimationFrame(() => setTx({
      s,
      x: vw / 2 - (minX + pw / 2) * s,
      y: BAR_H + avH / 2 - (minY + ph / 2) * s + 20,
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineageMode, ancestryPath])

  useEffect(() => {
    const prev = { overflow: document.body.style.overflow, touchAction: document.body.style.touchAction }
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'
    return () => {
      document.body.style.overflow = prev.overflow
      document.body.style.touchAction = prev.touchAction
    }
  }, [])

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
      e.preventDefault()
      if (e.touches.length !== 2) return
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
    <div style={{ width: '100vw', height: '100svh', background: '#0f1c2e', overflow: 'hidden', position: 'relative', touchAction: 'none' }}>

      {/* ── شريط الأدوات العلوي ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: BAR_H,
        background: 'rgba(15,28,46,0.92)',
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
          style={{ color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--gold-main)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.85)'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          <span className="hidden sm:inline">الرئيسية</span>
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
              color: branch ? '#60a5fa' : 'rgba(255,255,255,0.90)',
              maxWidth: 'clamp(100px, 30vw, 160px)',
            }}
          >
            <option value="" style={{ background: '#1a2533' }}>🌳 {treeRoot?.name || 'الجذر'} + الفخوذ</option>
            <option value="all" style={{ background: '#1a2533' }}>🌐 الكل</option>
            {branches.map(b => (
              <option key={b.id} value={b.id} style={{ background: '#1a2533' }}>فخذ {b.name}</option>
            ))}
          </select>

          {/* زر الإحصائيات */}
          <button
            onClick={() => setShowStats(v => !v)}
            title="إحصائيات الشجرة"
            className="font-nav text-xs sm:text-sm px-2 sm:px-3 py-1.5 rounded-xl transition-all duration-200 flex items-center gap-1.5"
            style={{
              background: showStats ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${showStats ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)'}`,
              color: showStats ? '#818cf8' : 'rgba(255,255,255,0.88)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
            <span className="hidden sm:inline">إحصائيات</span>
          </button>

          {/* زر موقعي في الشجرة */}
          {!viewerMode && user?.memberId && !lineageMode && (
            <button
              onClick={() => {
                if (!myNode) setBranch('all')
                setLineageMode(true)
                setSel(null)
              }}
              className="font-nav text-xs sm:text-sm px-2 sm:px-3 py-1.5 rounded-xl transition-all duration-200"
              style={{
                background: 'rgba(198,161,107,0.12)',
                border: '1px solid rgba(198,161,107,0.3)',
                color: 'var(--gold-main)',
                whiteSpace: 'nowrap',
              }}
            >
              <span className="hidden sm:inline">موقعي</span>
              <span className="sm:hidden">◎</span>
            </button>
          )}

          {/* زر الخروج من وضع الانتساب */}
          {lineageMode && (
            <button
              onClick={() => setLineageMode(false)}
              className="font-nav text-xs sm:text-sm px-2 sm:px-3 py-1.5 rounded-xl transition-all duration-200"
              style={{
                background: 'rgba(198,161,107,0.18)',
                border: '1px solid rgba(198,161,107,0.55)',
                color: 'var(--gold-main)',
                whiteSpace: 'nowrap',
                fontWeight: 700,
              }}
            >
              <span className="hidden sm:inline">✕ الشجرة كاملة</span>
              <span className="sm:hidden">✕</span>
            </button>
          )}

          {/* زر تبديل العرض — معطّل (شجرة ذكور دائماً) */}
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
              stroke={genPalette(l.d ?? 0).line} strokeWidth={1.2}
              opacity={lineageMode ? 0.15 : 0.65} />
          ))}

          {/* خطوط وحدة الزواج */}
          {wLines.map((l, i) => (
            <line key={`wl${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke={WIFE_LC} strokeWidth={1.4} strokeDasharray="6,3"
              opacity={lineageMode ? 0.1 : 1} />
          ))}

          {/* خطوط مسار الانتساب — تظهر جيلاً بعد جيل */}
          {lineageMode && (
            <>
              <defs>
                <style>{`
                  @keyframes ancestryDraw {
                    from { stroke-dashoffset: 99999; opacity: 0; }
                    to   { stroke-dashoffset: 0;     opacity: 1; }
                  }
                `}</style>
              </defs>
              {ancestryLineSegs.map((l, i) => {
                const delay = `${l.gen * 0.28}s`
                return (
                  <g key={`alg${i}`}>
                    {/* هالة خارجية ضبابية */}
                    <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                      stroke="rgba(198,161,107,0.25)" strokeWidth={14} strokeLinecap="round"
                      strokeDasharray="99999" strokeDashoffset="99999"
                      style={{
                        filter: 'blur(6px)',
                        animation: `ancestryDraw 0.45s ease forwards`,
                        animationDelay: delay,
                      }} />
                    {/* هالة وسطى */}
                    <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                      stroke="rgba(198,161,107,0.55)" strokeWidth={5} strokeLinecap="round"
                      strokeDasharray="99999" strokeDashoffset="99999"
                      style={{
                        filter: 'blur(2px)',
                        animation: `ancestryDraw 0.45s ease forwards`,
                        animationDelay: delay,
                      }} />
                    {/* الخط الرئيسي */}
                    <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                      stroke="rgba(198,161,107,0.95)" strokeWidth={2.5} strokeLinecap="round"
                      strokeDasharray="99999" strokeDashoffset="99999"
                      style={{
                        filter: 'drop-shadow(0 0 4px rgba(198,161,107,1))',
                        animation: `ancestryDraw 0.45s ease forwards`,
                        animationDelay: delay,
                      }} />
                  </g>
                )
              })}
            </>
          )}

          {/* عقد الأشخاص */}
          {nodes.map(n => (
            <CircleNode key={n.id} n={n} active={sel?.id === n.id}
              onClick={() => onNodeClick(n)}
              dimmed={lineageMode && ancestryPathSet ? !ancestryPathSet.has(n.id) : false}
              isMe={lineageMode && n.id === myNode?.id}
            />
          ))}

          {/* الزوجات + الماسات */}
          {wives.map((w, i) => (
            <g key={`wu${i}`} onClick={() => onNodeClick(w)} style={{ cursor: 'pointer' }}>
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
          style={{ color: 'rgba(255,255,255,0.70)', minWidth: 40 }}>
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
        background: 'rgba(15,28,46,0.82)',
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
        <LegendDot fill="rgba(59,130,246,0.1)"  stroke={GOLD} alive label="حي" />
        <LegendDot fill="rgba(59,130,246,0.05)" stroke="rgba(198,161,107,0.45)" dash label="متوفى" />
      </div>

      {/* ── شريط وضع الانتساب ── */}
      {lineageMode && myNode && (
        <div style={{
          position: 'absolute', top: BAR_H + 10, left: '50%', transform: 'translateX(-50%)',
          zIndex: 50, background: 'rgba(15,28,46,0.92)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(198,161,107,0.4)', borderRadius: 14,
          padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 12, color: 'var(--gold-main)', fontFamily: 'Cairo,sans-serif' }}>مسارك في الشجرة:</span>
          <span style={{ fontSize: 13, color: 'var(--gold-main)', fontWeight: 700, fontFamily: 'Cairo,sans-serif' }}>
            {ancestryPath
              ? ancestryPath.map((id, i) => {
                  const n = nodes.find(x => x.id === id)
                  return n ? (i === ancestryPath.length - 1
                    ? <span key={id} style={{ color: '#C6A16B', fontWeight: 900 }}>{firstName(n.name)}</span>
                    : <span key={id}>{firstName(n.name)} ← </span>
                  ) : null
                })
              : firstName(myNode.name)}
          </span>
        </div>
      )}

      {/* ── loading ── */}
      {loading && (
        <div style={{ position: 'absolute', top: BAR_H + 16, left: '50%', transform: 'translateX(-50%)', zIndex: 60 }}>
          <div className="font-nav text-sm text-gray-500">جاري تحميل الشجرة...</div>
        </div>
      )}

      {/* ── لوحة الإحصائيات ── */}
      {showStats && <StatsPanel stats={treeStats} onClose={() => setShowStats(false)} />}

      {/* ── نافذة التفاصيل ── */}
      {sel && <Popup key={sel.id} node={sel} onClose={() => setSel(null)} isAdmin={isAdmin} user={user} onUpdateNode={handleUpdateNode} />}
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
      <span className="font-nav" style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)' }}>{label}</span>
    </div>
  )
}
