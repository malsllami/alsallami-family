import { useState, useMemo, useEffect } from 'react'

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
export default function TreeNavigator({ treeData, onSelect, selected, currentMemberId, onSelectFather, selectedFatherId, onSelectGrandfather, selectedGrandfatherId, onSelectSelf, selectedSelfId, onSelectSon, selectedSonId, minFatherGen = 1 }) {
  const tree = useMemo(() => {
    const raw = Array.isArray(treeData)
      ? { id: 'root', name: 'الشجرة', gender: 'male', alive: true, generationLevel: 0, children: treeData }
      : (treeData ?? RAW_TREE)
    return addLevels(raw, raw.generationLevel || 0)
  }, [treeData])

  // المستويات الثابتة: أي مستوى فيه خيار واحد فقط يُثبَّت تلقائياً
  const fixedPath = useMemo(() => {
    const fp = []
    let options = tree.children || []
    while (options.length === 1) {
      fp.push(options[0])
      options = options[0].children || []
    }
    return fp
  }, [tree])

  const [pathNodes, setPathNodes] = useState([])

  // تهيئة المسار بالمستويات الثابتة عند تغيير الشجرة
  useEffect(() => {
    setPathNodes(prev => [...fixedPath, ...prev.slice(fixedPath.length)])
  }, [fixedPath])

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
        label:      i === fixedPath.length
          ? `الجيل ${genNum} — اختر الفخذ`
          : `الجيل ${genNum} — أبناء ${prevName}`,
        selectedId: pathNodes[i]?.id || '',
      })

      const sel = pathNodes[i]
      if (!sel) break
      if ((selectedSelfId && sel.id === selectedSelfId) || (selectedSonId && sel.id === selectedSonId)) break
      options = sel.children || []
    }

    // إخفاء المستويات الثابتة — تُعرض كترويسة ثابتة فقط
    return levels.filter(l => l.index >= fixedPath.length)
  }, [tree, pathNodes, selectedSelfId, selectedSonId, fixedPath])

  const lastNode   = pathNodes[pathNodes.length - 1] ?? null
  const isSelf     = Boolean(selectedSelfId && lastNode?.id === selectedSelfId)
  const myGenLevel = lastNode ? (isSelf ? lastNode.generationLevel : lastNode.generationLevel + 1) : null

  return (
    <div className="space-y-3">

      {/* الأجداد الثابتون — لا يحتاج المستخدم لاختيارهم */}
      {fixedPath.length > 0 && (
        <div className="rounded-xl px-3 py-2.5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: 6 }}>
          <p className="font-nav text-xs mb-2 font-semibold" style={{ color: 'rgba(255,255,255,0.45)' }}>سلسلة الأجداد</p>
          <div className="flex flex-wrap items-center gap-2">
            {/* الجذر — يظهر فقط إن لم يكن عقدة اصطناعية */}
            {tree.name !== 'الشجرة' && (
              <span className="flex items-center gap-1.5">
                <span className="font-nav text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  {tree.name}
                </span>
                <span className="font-nav text-xs px-2 py-0.5 rounded-full font-bold"
                  style={{ background: 'rgba(198,161,107,0.15)', color: 'var(--gold-main)', border: '1px solid rgba(198,161,107,0.3)' }}>
                  {tree.generationLevel ?? 0}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>←</span>
              </span>
            )}
            {fixedPath.map((n, i) => (
              <span key={n.id} className="flex items-center gap-1.5">
                <span className="font-nav text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  {n.name}
                </span>
                <span className="font-nav text-xs px-2 py-0.5 rounded-full font-bold"
                  style={{ background: 'rgba(198,161,107,0.15)', color: 'var(--gold-main)', border: '1px solid rgba(198,161,107,0.3)' }}>
                  {n.generationLevel}
                </span>
                {i < fixedPath.length - 1 && (
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>←</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {displayLevels.map(lvl => (
        <div key={lvl.index} className="rounded-xl p-3"
          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2.5 mb-2.5">
            <span className="font-nav text-sm font-bold px-3 py-1 rounded-full"
              style={{ background: 'rgba(198,161,107,0.18)', color: 'var(--gold-main)', border: '1px solid rgba(198,161,107,0.35)' }}>
              جيل {lvl.genNum}
            </span>
            <p className="font-nav text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {lvl.index === 0 ? 'اختر الفخذ' : `أبناء ${pathNodes[lvl.index - 1]?.name?.split(' ')[0] || ''}`}
            </p>
          </div>
          <select
            value={lvl.selectedId}
            onChange={e => handleChange(lvl.index, e.target.value)}
            className="form-input w-full"
            style={{ direction: 'rtl', cursor: 'pointer', fontSize: 15 }}
          >
            <option value="">— اختر —</option>
            {lvl.options.map(n => {
              var isCurrent = currentMemberId && n.memberId === currentMemberId
              return (
                <option key={n.id} value={n.id} disabled={isCurrent}>
                  {n.name}{n.alive === false ? ' (متوفى)' : ' (حي)'}{isCurrent ? ' (أنت)' : ''}
                </option>
              )
            })}
          </select>
          {(onSelectFather || onSelectGrandfather || onSelectSelf) && pathNodes[lvl.index] && (pathNodes[lvl.index]?.generationLevel ?? 0) >= minFatherGen && (
            <div className="flex gap-2 mt-3">
              {onSelectFather && (
                <button
                  type="button"
                  onClick={() => {
                    const computedPath = pathNodes.slice(0, lvl.index + 1).map(n => n.name.split(' ')[0]).join(' ← ')
                    onSelectFather({ ...pathNodes[lvl.index], computedPath }, pathNodes)
                  }}
                  className="flex-1 font-nav text-sm py-2.5 rounded-xl transition-all duration-200 font-semibold"
                  style={
                    selectedFatherId && selectedFatherId === pathNodes[lvl.index]?.id
                      ? { background: 'rgba(198,161,107,0.22)', border: '2px solid rgba(198,161,107,0.6)', color: 'var(--gold-main)', fontWeight: 700 }
                      : { background: 'rgba(198,161,107,0.08)', border: '1px solid rgba(198,161,107,0.3)', color: 'var(--gold-main)' }
                  }>
                  {selectedFatherId && selectedFatherId === pathNodes[lvl.index]?.id ? '✓ هذا والدي' : 'هذا والدي'}
                </button>
              )}
              {onSelectGrandfather && (
                <button
                  type="button"
                  onClick={() => {
                    const computedPath = pathNodes.slice(0, lvl.index + 1).map(n => n.name.split(' ')[0]).join(' ← ')
                    onSelectGrandfather({ ...pathNodes[lvl.index], computedPath }, pathNodes)
                  }}
                  className="flex-1 font-nav text-sm py-2.5 rounded-xl transition-all duration-200 font-semibold"
                  style={
                    selectedGrandfatherId && selectedGrandfatherId === pathNodes[lvl.index]?.id
                      ? { background: 'rgba(251,146,60,0.22)', border: '2px solid rgba(251,146,60,0.6)', color: '#fb923c', fontWeight: 700 }
                      : { background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.3)', color: '#fb923c' }
                  }>
                  {selectedGrandfatherId && selectedGrandfatherId === pathNodes[lvl.index]?.id ? '✓ هذا جدي' : 'هذا جدي'}
                </button>
              )}
              {onSelectSelf && pathNodes[lvl.index] && (
                <button
                  type="button"
                  onClick={() => {
                    const computedPath = pathNodes.slice(0, lvl.index + 1).map(n => n.name.split(' ')[0]).join(' ← ')
                    onSelectSelf({ ...pathNodes[lvl.index], computedPath }, pathNodes.slice(0, lvl.index + 1))
                  }}
                  className="flex-1 font-nav text-sm py-2.5 rounded-xl transition-all duration-200 font-semibold"
                  style={
                    selectedSelfId && selectedSelfId === pathNodes[lvl.index]?.id
                      ? { background: 'rgba(20,184,166,0.22)', border: '2px solid rgba(20,184,166,0.6)', color: '#2dd4bf', fontWeight: 700 }
                      : { background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.3)', color: '#2dd4bf' }
                  }>
                  {selectedSelfId && selectedSelfId === pathNodes[lvl.index]?.id ? '✓ هذا أنا' : 'هذا أنا'}
                </button>
              )}
              {onSelectSon && (pathNodes[lvl.index]?.generationLevel ?? 0) >= 6 && (
                <button
                  type="button"
                  onClick={() => {
                    const computedPath = pathNodes.slice(0, lvl.index + 1).map(n => n.name.split(' ')[0]).join(' ← ')
                    onSelectSon({ ...pathNodes[lvl.index], computedPath }, pathNodes.slice(0, lvl.index + 1))
                  }}
                  className="flex-1 font-nav text-sm py-2.5 rounded-xl transition-all duration-200 font-semibold"
                  style={
                    selectedSonId && selectedSonId === pathNodes[lvl.index]?.id
                      ? { background: 'rgba(167,139,250,0.22)', border: '2px solid rgba(167,139,250,0.6)', color: '#a78bfa', fontWeight: 700 }
                      : { background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.3)', color: '#a78bfa' }
                  }>
                  {selectedSonId && selectedSonId === pathNodes[lvl.index]?.id ? '✓ هذا ابني' : 'هذا ابني'}
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      {/* ملخص الاختيار — سلسلة الانتساب */}
      {lastNode && (
        <div className="rounded-2xl p-4 mt-1 space-y-3"
          style={{ background: 'rgba(198,161,107,0.06)', border: '1px solid rgba(198,161,107,0.25)' }}>

          {/* سلسلة الأجيال */}
          <div>
            <p className="font-nav text-sm font-semibold mb-2.5" style={{ color: 'rgba(255,255,255,0.6)' }}>سلسلة انتسابك</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {pathNodes.map((n, i) => {
                const isLastAndSelf = isSelf && i === pathNodes.length - 1
                return (
                  <span key={n.id} className="flex items-center gap-1.5">
                    <span className="font-nav text-sm font-bold"
                      style={{ color: isLastAndSelf ? 'var(--gold-main)' : 'rgba(255,255,255,0.85)' }}>
                      {isLastAndSelf ? 'أنت' : n.name.split(' ')[0]}
                    </span>
                    <span className="font-nav text-xs px-2 py-0.5 rounded-full font-bold"
                      style={isLastAndSelf
                        ? { background: 'rgba(198,161,107,0.3)', color: 'var(--gold-main)', border: '1px solid rgba(198,161,107,0.5)' }
                        : { background: 'rgba(198,161,107,0.15)', color: 'var(--gold-main)', border: '1px solid rgba(198,161,107,0.25)' }}>
                      {n.generationLevel}
                    </span>
                    {!isLastAndSelf && <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>←</span>}
                  </span>
                )
              })}
              {!isSelf && (
                <span className="flex items-center gap-1.5">
                  <span className="font-nav text-sm font-bold" style={{ color: 'var(--gold-main)' }}>أنت</span>
                  <span className="font-nav text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ background: 'rgba(198,161,107,0.3)', color: 'var(--gold-main)', border: '1px solid rgba(198,161,107,0.5)' }}>
                    {myGenLevel}
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* رقم جيلك */}
          <div className="flex items-center gap-3 pt-2.5"
            style={{ borderTop: '1px solid rgba(198,161,107,0.15)' }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-lg"
              style={{ background: 'rgba(198,161,107,0.18)', color: 'var(--gold-main)', border: '1px solid rgba(198,161,107,0.4)', flexShrink: 0 }}>
              {myGenLevel}
            </div>
            <div>
              <p className="font-nav text-sm font-bold" style={{ color: 'var(--gold-main)' }}>
                الجيل {myGenLevel}
              </p>
              <p className="font-nav text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {isSelf
                  ? `أنت: ${lastNode.name.split(' ')[0]} في الشجرة`
                  : `والدك في الشجرة: ${lastNode.name.split(' ')[0]}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* رسالة إذا وصل لآخر مستوى */}
      {lastNode && !(lastNode.children?.length) && (
        <p className="font-nav text-xs text-center py-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
          هذا آخر مستوى متاح — استخدم زر &quot;هذا والدي&quot; أو &quot;هذا جدي&quot; في الصف أعلاه
        </p>
      )}

    </div>
  )
}
