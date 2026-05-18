import { useState, useMemo } from 'react'

/* شجرة افتراضية — تُستبدل ببيانات API */
const RAW_TREE = {
  id:'root', name:'أحمد بن صاحب العفريتي', gender:'male', alive:false,
  children:[
    { id:'c1', name:'شامي',    gender:'male', alive:false, children:[] },
    { id:'c2', name:'صاحب',   gender:'male', alive:false, children:[] },
    { id:'c3', name:'يحيى',   gender:'male', alive:false, children:[] },
    { id:'c4', name:'علي',    gender:'male', alive:false, children:[] },
    { id:'c5', name:'إبراهيم', gender:'male', alive:false, location:'الشقيق', children:[] },
  ],
}

function addLevels(node, level = 1) {
  const kids = (node.children || [])
    .filter(c => !c.gender || c.gender === 'male')
    .map(c => addLevels(c, level + 1))
  return { ...node, generationLevel: level, children: kids }
}

/* ═══════════════════════════════════════════════════════════════════════ */
export default function TreeNavigator({ treeData, onSelect, selected }) {
  const tree = useMemo(() => addLevels(treeData ?? RAW_TREE), [treeData])

  // pathNodes = العقد المختارة في كل مستوى بالترتيب
  const [pathNodes, setPathNodes] = useState([])

  const handleChange = (levelIndex, nodeId) => {
    const parentNode = levelIndex === 0 ? tree : pathNodes[levelIndex - 1]
    const options    = parentNode?.children || []
    const node       = options.find(c => c.id === nodeId)

    const newPath = pathNodes.slice(0, levelIndex)
    if (node) newPath.push(node)
    setPathNodes(newPath)

    if (!node) { onSelect(null); return }

    onSelect({
      parentId:        node.id,
      parentName:      node.name,
      generationLevel: node.generationLevel + 1,
      path:            newPath.map(n => n.name.split(' ')[0]).join(' ← '),
    })
  }

  // بناء مستويات القوائم المنسدلة
  const displayLevels = useMemo(() => {
    const levels = []
    let options = tree.children || []

    for (let i = 0; ; i++) {
      if (!options.length) break

      levels.push({
        index:      i,
        options,
        label:      i === 0 ? 'الفخذ' : `أبناء ${pathNodes[i - 1]?.name?.split(' ')[0] || ''}`,
        selectedId: pathNodes[i]?.id || '',
      })

      const sel = pathNodes[i]
      if (!sel) break
      options = sel.children || []
    }

    return levels
  }, [tree, pathNodes])

  const lastNode = pathNodes[pathNodes.length - 1] ?? null

  return (
    <div className="space-y-3">

      {displayLevels.map(lvl => (
        <div key={lvl.index}>
          <p className="font-nav text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {lvl.label}
          </p>
          <select
            value={lvl.selectedId}
            onChange={e => handleChange(lvl.index, e.target.value)}
            className="form-input w-full"
            style={{ direction: 'rtl', cursor: 'pointer' }}
          >
            <option value="">— اختر —</option>
            {lvl.options.map(n => (
              <option key={n.id} value={n.id}>
                {n.name}
                {n.location ? ` — ${n.location}` : ''}
                {n.alive === false ? ' (متوفى)' : ''}
              </option>
            ))}
          </select>
        </div>
      ))}

      {/* ملخص الاختيار */}
      {lastNode && (
        <div className="rounded-2xl p-4 mt-1"
          style={{ background: 'rgba(198,161,107,0.06)', border: '1px solid rgba(198,161,107,0.2)' }}>
          <p className="font-nav text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>الأب المختار</p>
          <p className="font-bold text-sm text-[var(--gold-main)]">{lastNode.name}</p>
          <p className="font-nav text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            جيلك في الشجرة:&nbsp;
            <span className="text-white font-bold">{lastNode.generationLevel + 1}</span>
            &nbsp;·&nbsp;
            {pathNodes.map(n => n.name.split(' ')[0]).join(' ← ')}
          </p>
        </div>
      )}

      {/* رسالة إذا وصل لآخر مستوى بدون ما يختار */}
      {lastNode && !(lastNode.children?.length) && (
        <p className="font-nav text-[11px] text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>
          هذا آخر مستوى متاح في الشجرة — إذا لم يكن أبوك موجوداً اختر &quot;أبي غير موجود&quot;
        </p>
      )}

    </div>
  )
}
