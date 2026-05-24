import { useState, useMemo } from 'react'

const RAW_TREE = {
  id:'root', name:'إبراهيم العفريتي', gender:'male', alive:false,
  children:[
    {
      id:'c0', name:'أحمد', gender:'male', alive:false,
      children:[
        { id:'c1', name:'شامي',    gender:'male', alive:false, children:[] },
        { id:'c2', name:'صاحب',   gender:'male', alive:false, children:[] },
        { id:'c3', name:'يحيى',   gender:'male', alive:false, children:[] },
        { id:'c4', name:'علي',    gender:'male', alive:false, children:[] },
        { id:'c5', name:'إبراهيم', gender:'male', alive:false, children:[] },
      ]
    },
  ],
}

function addLevels(node, level = 1) {
  const kids = (node.children || [])
    .filter(c => !c.gender || c.gender === 'male')
    .map(c => addLevels(c, level + 1))
  return { ...node, generationLevel: level, children: kids }
}

/* ═══════════════════════════════════════════════════════════════════════ */
export default function TreeNavigator({ treeData, onSelect, selected, currentMemberId }) {
  const tree = useMemo(() => {
    const raw = Array.isArray(treeData)
      ? { id: 'root', name: 'الشجرة', gender: 'male', alive: true, generationLevel: 0, children: treeData }
      : (treeData ?? RAW_TREE)
    return addLevels(raw, raw.generationLevel || 0)
  }, [treeData])

  const [pathNodes, setPathNodes] = useState([])

  const handleChange = (levelIndex, nodeId) => {
    const parentNode = levelIndex === 0 ? tree : pathNodes[levelIndex - 1]
    const options    = parentNode?.children || []
    const node       = options.find(c => c.id === nodeId)

    const newPath = pathNodes.slice(0, levelIndex)
    if (node) newPath.push(node)
    setPathNodes(newPath)

    if (!node || (currentMemberId && node.memberId === currentMemberId)) { onSelect(null); return }

    onSelect({
      parentId:        node.id,
      parentName:      node.name,
      generationLevel: node.generationLevel + 1,
      path:            newPath.map(n => n.name.split(' ')[0]).join(' ← '),
    })
  }

  const displayLevels = useMemo(() => {
    const levels = []
    let options = tree.children || []

    for (let i = 0; ; i++) {
      if (!options.length) break

      const firstOpt = options[0]
      const genNum   = firstOpt?.generationLevel || ''
      const prevName = pathNodes[i - 1]?.name?.split(' ')[0] || ''

      levels.push({
        index:      i,
        options,
        genNum,
        label:      i === 0
          ? `الجيل ${genNum} — اختر الفخذ`
          : `الجيل ${genNum} — أبناء ${prevName}`,
        selectedId: pathNodes[i]?.id || '',
      })

      const sel = pathNodes[i]
      if (!sel) break
      options = sel.children || []
    }

    return levels
  }, [tree, pathNodes])

  const lastNode   = pathNodes[pathNodes.length - 1] ?? null
  const myGenLevel = lastNode ? lastNode.generationLevel + 1 : null

  return (
    <div className="space-y-3">

      {displayLevels.map(lvl => (
        <div key={lvl.index}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-nav text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(198,161,107,0.15)', color: 'var(--gold-main)', letterSpacing: '0.02em' }}>
              جيل {lvl.genNum}
            </span>
            <p className="font-nav text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {lvl.index === 0 ? 'اختر الفخذ' : `أبناء ${pathNodes[lvl.index - 1]?.name?.split(' ')[0] || ''}`}
            </p>
          </div>
          <select
            value={lvl.selectedId}
            onChange={e => handleChange(lvl.index, e.target.value)}
            className="form-input w-full"
            style={{ direction: 'rtl', cursor: 'pointer' }}
          >
            <option value="">— اختر —</option>
            {lvl.options.map(n => {
              var isCurrent = currentMemberId && n.memberId === currentMemberId
              return (
                <option key={n.id} value={n.id} disabled={isCurrent}>
                  {n.name}{n.location ? ` — ${n.location}` : ''}{n.alive === false ? ' (متوفى)' : ''}{isCurrent ? ' (أنت)' : ''}
                </option>
              )
            })}
          </select>
        </div>
      ))}

      {/* ملخص الاختيار — سلسلة الانتساب */}
      {lastNode && (
        <div className="rounded-2xl p-4 mt-1 space-y-3"
          style={{ background: 'rgba(198,161,107,0.05)', border: '1px solid rgba(198,161,107,0.2)' }}>

          {/* سلسلة الأجيال */}
          <div>
            <p className="font-nav text-[10px] mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>سلسلة انتسابك</p>
            <div className="flex flex-wrap items-center gap-1">
              {pathNodes.map((n, i) => (
                <span key={n.id} className="flex items-center gap-1">
                  <span className="font-nav text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.75)' }}>
                    {n.name.split(' ')[0]}
                  </span>
                  <span className="font-nav text-[9px] px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(198,161,107,0.12)', color: 'var(--gold-main)' }}>
                    {n.generationLevel}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>←</span>
                </span>
              ))}
              <span className="flex items-center gap-1">
                <span className="font-nav text-xs font-bold" style={{ color: 'var(--gold-main)' }}>أنت</span>
                <span className="font-nav text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{ background: 'rgba(198,161,107,0.25)', color: 'var(--gold-main)', border: '1px solid rgba(198,161,107,0.4)' }}>
                  {myGenLevel}
                </span>
              </span>
            </div>
          </div>

          {/* رقم جيلك */}
          <div className="flex items-center gap-2 pt-2"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm"
              style={{ background: 'rgba(198,161,107,0.15)', color: 'var(--gold-main)', border: '1px solid rgba(198,161,107,0.3)' }}>
              {myGenLevel}
            </div>
            <div>
              <p className="font-nav text-xs font-semibold" style={{ color: 'var(--gold-main)' }}>
                الجيل {myGenLevel}
              </p>
              <p className="font-nav text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                أبوك في الشجرة: {lastNode.name.split(' ')[0]}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* رسالة إذا وصل لآخر مستوى */}
      {lastNode && !(lastNode.children?.length) && (
        <p className="font-nav text-[11px] text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>
          هذا آخر مستوى متاح — إذا لم يكن أبوك موجوداً اختر &quot;أبي غير موجود&quot;
        </p>
      )}

    </div>
  )
}
