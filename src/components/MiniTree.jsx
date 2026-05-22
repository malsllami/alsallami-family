import { useMemo } from 'react'

// ── Layout constants ──────────────────────────────────
const PAD = 28
const AW = 104, AH = 36   // ancestor node (grandfather / father)
const MW = 124, MH = 40   // member node (featured)
const WW = 80,  WH = 26   // wife pill
const CW = 84,  CH = 30   // child node
const V  = 72             // vertical gap between levels
const WG = 8              // gap between wives
const CG = 10             // gap between children
const WS = 14             // space from member right edge to first wife

const BLUE = { fill: 'rgba(59,130,246,0.12)',  stroke: 'rgba(59,130,246,0.38)',  text: '#93c5fd' }
const GOLD = { fill: 'rgba(198,161,107,0.18)', stroke: 'rgba(198,161,107,0.65)', text: '#c6a16b' }
const ROSE = { fill: 'rgba(244,63,94,0.12)',   stroke: 'rgba(244,63,94,0.38)',   text: '#fda4af' }
const LINE = 'rgba(255,255,255,0.12)'
const FONT = 'Tajawal, sans-serif'

function trunc(str, max = 8) {
  if (!str) return '—'
  return str.length > max ? str.slice(0, max) + '…' : str
}

export default function MiniTree({
  memberName,
  fatherName,
  grandfatherName,
  branch,
  ancestorPath = [],
  wives     = [],
  children  = [],
}) {
  const effectiveAncestors = useMemo(() => {
    if (ancestorPath.length > 0) return ancestorPath
    const list = []
    if (grandfatherName) list.push({ name: grandfatherName, label: 'الجد' })
    if (fatherName)      list.push({ name: fatherName,      label: 'الأب' })
    return list
  }, [ancestorPath, fatherName, grandfatherName])

  const L = useMemo(() => {
    const nW = wives.length
    const nC = children.length
    const nA = ancestorPath.length

    const wivesW    = nW > 0 ? nW * WW + (nW - 1) * WG : 0
    const childRowW = nC > 0 ? nC * CW + (nC - 1) * CG : 0

    // Member center x from content-left so it sits over children center
    const mCXl = Math.max(MW / 2, childRowW / 2)

    // Total inner content width
    const innerW = Math.max(
      mCXl + MW / 2 + (wivesW > 0 ? WS + wivesW : 0),
      childRowW,
      mCXl + AW / 2,
    )

    const svgW = Math.ceil(innerW + 2 * PAD)

    // Ancestors levels
    const ancestorYs = []
    for (let i = 0; i < nA; i++) {
      ancestorYs.push(PAD + i * (AH + V))
    }

    const lastAncestorY = nA > 0 ? ancestorYs[nA - 1] : PAD
    const memberY = lastAncestorY + AH + V
    const childTopY = memberY + MH + V

    const mCX      = PAD + mCXl
    const mX       = mCX - MW / 2
    const ancestorX = mCX - AW / 2

    const wivesPos = wives.map((w, i) => ({
      ...w,
      cx: mCX + MW / 2 + WS + i * (WW + WG) + WW / 2,
      cy: memberY + MH / 2,
    }))

    const childStartX = mCX - childRowW / 2
    const childrenPos = children.map((c, i) => ({
      ...c,
      cx:  childStartX + i * (CW + CG) + CW / 2,
      top: childTopY,
    }))

    const svgH = Math.ceil((nC > 0 ? childTopY + CH : memberY + MH) + PAD)

    return {
      svgW, svgH,
      ancestorYs, memberY, childTopY,
      mCX, mX, ancestorX,
      wivesPos, childrenPos,
    }
  }, [ancestorPath, wives, children])

  const branchY = L.memberY + MH + V / 2

  return (
    <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
      <svg
        width={L.svgW}
        height={L.svgH}
        style={{ display: 'block', margin: '0 auto' }}
        direction="rtl"
      >

        {/* ── Vertical ancestor connectors ── */}
        {L.ancestorYs.length > 1 && L.ancestorYs.map((y, i) => (
          i < L.ancestorYs.length - 1 ? (
            <line key={`av${i}`}
              x1={L.mCX} y1={y + AH} x2={L.mCX} y2={L.ancestorYs[i + 1]}
              stroke={LINE} strokeWidth={1.5}
            />
          ) : null
        ))}

        {/* ── Ancestor to member connector ── */}
        {L.ancestorYs.length > 0 && (
          <line x1={L.mCX} y1={L.ancestorYs[L.ancestorYs.length - 1] + AH}
                x2={L.mCX} y2={L.memberY}
            stroke={LINE} strokeWidth={1.5}
          />
        )}

        {/* ── Wife dashed connectors ── */}
        {L.wivesPos.map((w, i) => (
          <line key={`wl${i}`}
            x1={L.mX + MW}     y1={L.memberY + MH / 2}
            x2={w.cx - WW / 2} y2={w.cy}
            stroke="rgba(244,63,94,0.28)" strokeWidth={1.2} strokeDasharray="4,3"
          />
        ))}

        {/* ── Children branch ── */}
        {L.childrenPos.length > 0 && (
          <>
            <line x1={L.mCX} y1={L.memberY + MH} x2={L.mCX} y2={branchY}
              stroke={LINE} strokeWidth={1.5} />
            {L.childrenPos.length > 1 && (
              <line
                x1={L.childrenPos[0].cx}
                y1={branchY}
                x2={L.childrenPos[L.childrenPos.length - 1].cx}
                y2={branchY}
                stroke={LINE} strokeWidth={1.5}
              />
            )}
            {L.childrenPos.map((c, i) => (
              <line key={`cl${i}`}
                x1={c.cx} y1={branchY}
                x2={c.cx} y2={c.top}
                stroke={LINE} strokeWidth={1.5}
              />
            ))}
          </>
        )}

        {/* ── Ancestor nodes ── */}
        {effectiveAncestors.map((ancestor, i) => (
          <g key={`a${i}`}>
            <rect x={L.ancestorX} y={L.ancestorYs[i]} width={AW} height={AH} rx={10}
              fill={BLUE.fill} stroke={BLUE.stroke} strokeWidth={1} />
            <text x={L.mCX} y={L.ancestorYs[i] + 12} textAnchor="middle"
              fill="rgba(255,255,255,0.28)" fontSize={9} fontFamily={FONT}>
              {ancestor.label || `الجيل ${ancestor.generation || ''}`}
            </text>
            <text x={L.mCX} y={L.ancestorYs[i] + 26} textAnchor="middle"
              fill={BLUE.text} fontSize={12} fontFamily={FONT}>{trunc(ancestor.name)}</text>
          </g>
        ))}

        {/* ── Member node (gold) ── */}
        <rect x={L.mX} y={L.memberY} width={MW} height={MH} rx={12}
          fill={GOLD.fill} stroke={GOLD.stroke} strokeWidth={1.5} />
        <text x={L.mCX} y={L.memberY + 14} textAnchor="middle"
          fill="rgba(255,255,255,0.28)" fontSize={9} fontFamily={FONT}>أنت</text>
        <text x={L.mCX} y={L.memberY + 24} textAnchor="middle"
          fill={GOLD.text} fontSize={13} fontFamily={FONT} fontWeight="600">
          {trunc(memberName, 11)}
        </text>
        {branch && (
          <text x={L.mCX} y={L.memberY + 38} textAnchor="middle"
            fill="rgba(255,255,255,0.6)" fontSize={10} fontFamily={FONT}>
            {trunc(branch, 10)}
          </text>
        )}

        {/* ── Wife pills ── */}
        {L.wivesPos.map((w, i) => (
          <g key={`w${i}`}>
            <rect
              x={w.cx - WW / 2} y={w.cy - WH / 2}
              width={WW} height={WH} rx={13}
              fill={ROSE.fill} stroke={ROSE.stroke} strokeWidth={1}
            />
            <text x={w.cx} y={w.cy} textAnchor="middle" dominantBaseline="middle"
              fill={ROSE.text} fontSize={11} fontFamily={FONT}>
              {trunc(w.name, 7)}
            </text>
          </g>
        ))}

        {/* ── Children nodes ── */}
        {L.childrenPos.map((c, i) => {
          const isFemale = c.gender === 'أنثى'
          const col = isFemale ? ROSE : BLUE
          return (
            <g key={`c${i}`}>
              <rect
                x={c.cx - CW / 2} y={c.top}
                width={CW} height={CH} rx={isFemale ? 15 : 8}
                fill={col.fill} stroke={col.stroke} strokeWidth={1}
              />
              <text x={c.cx} y={c.top + CH / 2} textAnchor="middle" dominantBaseline="middle"
                fill={col.text} fontSize={11} fontFamily={FONT}>
                {trunc(c.name, 7)}
              </text>
            </g>
          )
        })}

      </svg>
    </div>
  )
}
