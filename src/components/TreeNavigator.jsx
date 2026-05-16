import { useState, useMemo } from 'react'

/* ═══ شجرة تجريبية مع مستويات الأجيال — تُستبدل بـ API ════════════════════ */
const RAW_TREE = {
  id:'root', name:'سالم الجد الأكبر', gender:'male', alive:false,
  children:[
    {
      id:'c1', name:'محمد سالم', gender:'male', alive:false,
      children:[
        {
          id:'c11', name:'عبدالله محمد', gender:'male', alive:true,
          children:[
            { id:'c111', name:'سالم عبدالله',  gender:'male', alive:true,  children:[] },
            { id:'c113', name:'خالد عبدالله',  gender:'male', alive:true,  children:[] },
          ],
        },
        {
          id:'c12', name:'أحمد محمد', gender:'male', alive:true,
          children:[
            { id:'c121', name:'يوسف أحمد', gender:'male', alive:true, children:[] },
          ],
        },
      ],
    },
    {
      id:'c2', name:'علي سالم', gender:'male', alive:true,
      children:[
        { id:'c21', name:'ناصر علي', gender:'male', alive:true, children:[] },
      ],
    },
  ],
}

/* أضف مستوى الجيل تلقائياً */
function addLevels(node, level = 1) {
  return { ...node, generationLevel: level, children: (node.children || []).filter(c => c.gender === 'male').map(c => addLevels(c, level + 1)) }
}
const TREE = addLevels(RAW_TREE)

/* ═══ المكوّن الرئيسي ════════════════════════════════════════════════════ */
export default function TreeNavigator({ treeData, onSelect, selected }) {
  const tree    = useMemo(() => treeData ? addLevels(treeData) : TREE, [treeData])
  const [stack, setStack] = useState([])   // مسار التنقل

  const current   = stack[stack.length - 1] ?? null
  const nodes     = current ? (current.children || []) : (tree.children || [])
  const canExpand = n => (n.children || []).length > 0

  const pushStack  = n => setStack(s => [...s, n])
  const popStack   = ()  => setStack(s => s.slice(0, -1))
  const gotoIndex  = i   => setStack(s => s.slice(0, i + 1))
  const gotoRoot   = ()  => setStack([])

  const handleSelect = node => {
    onSelect({
      parentId:        node.id,
      parentName:      node.name,
      generationLevel: node.generationLevel + 1,         // ابن الأب دائماً جيل + 1
      path:            [...stack.map(n => n.name), node.name].join(' ← '),
    })
  }

  return (
    <div className="space-y-4">

      {/* ── مسار التنقل (Breadcrumb) ── */}
      <div className="flex items-center flex-wrap gap-1 font-nav text-sm">
        <button
          onClick={gotoRoot}
          className="transition-colors duration-150"
          style={{ color: stack.length === 0 ? 'rgba(255,255,255,0.8)' : '#60a5fa' }}
        >
          الشجرة
        </button>
        {stack.map((n, i) => (
          <span key={n.id} className="flex items-center gap-1">
            <span className="text-gray-600">›</span>
            <button
              onClick={() => gotoIndex(i)}
              className="transition-colors duration-150"
              style={{ color: i === stack.length - 1 ? 'rgba(255,255,255,0.8)' : '#60a5fa' }}
            >
              {n.name.split(' ')[0]}
            </button>
          </span>
        ))}
      </div>

      {/* ── معلومة المستوى ── */}
      <div className="flex items-center justify-between">
        <span className="font-nav text-xs px-3 py-1 rounded-full"
          style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#93c5fd' }}>
          الجيل {(current?.generationLevel ?? 0) + 1}
        </span>
        {stack.length > 0 && (
          <button onClick={popStack}
            className="font-nav text-xs text-gray-500 hover:text-white transition-colors">
            ‹ رجوع
          </button>
        )}
      </div>

      {/* ── العقد الحالية ── */}
      {nodes.length === 0 ? (
        <div className="py-10 text-center font-nav text-sm text-gray-600">
          لا يوجد أبناء مسجلون في هذا المستوى
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {nodes.map(node => {
            const isSel = selected?.parentId === node.id
            return (
              <div key={node.id}
                className="rounded-2xl p-4 transition-all duration-200"
                style={{
                  background: isSel ? 'rgba(198,161,107,0.1)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isSel ? 'rgba(198,161,107,0.4)' : 'rgba(255,255,255,0.08)'}`,
                }}>

                {/* معلومات الشخص */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-sm text-white">{node.name}</p>
                    <p className="font-nav text-xs text-gray-500 mt-0.5">
                      الجيل {node.generationLevel}
                      {node.alive
                        ? <span style={{ color: '#4ade80' }}> · حي</span>
                        : <span className="text-gray-600"> · متوفى</span>}
                    </p>
                  </div>
                  {node.alive && (
                    <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                      style={{ background: '#4ade80', boxShadow: '0 0 5px #4ade80' }} />
                  )}
                </div>

                {/* أزرار */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSelect(node)}
                    className="flex-1 font-nav text-xs py-1.5 rounded-xl transition-all duration-200"
                    style={{
                      background: isSel ? 'rgba(198,161,107,0.18)' : 'rgba(198,161,107,0.07)',
                      border: `1px solid rgba(198,161,107,${isSel ? '0.5' : '0.2'})`,
                      color: 'var(--gold-main)',
                    }}
                  >
                    {isSel ? '✓ محدد كأب' : 'اختر كأب'}
                  </button>

                  {canExpand(node) && (
                    <button
                      onClick={() => pushStack(node)}
                      className="font-nav text-xs py-1.5 px-3 rounded-xl transition-all duration-200"
                      style={{
                        background: 'rgba(59,130,246,0.08)',
                        border: '1px solid rgba(59,130,246,0.2)',
                        color: '#60a5fa',
                      }}
                    >
                      أبناؤه ›
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── ملخص الاختيار ── */}
      {selected && (
        <div className="rounded-2xl p-4 mt-2"
          style={{ background: 'rgba(198,161,107,0.06)', border: '1px solid rgba(198,161,107,0.2)' }}>
          <p className="font-nav text-xs text-gray-500 mb-1">الاختيار الحالي</p>
          <p className="font-bold text-sm text-[var(--gold-main)]">
            الأب: {selected.parentName}
          </p>
          <p className="font-nav text-xs text-gray-400 mt-1">
            جيلك في الشجرة: <span className="text-white font-bold">{selected.generationLevel}</span>
            &nbsp;·&nbsp; المسار: {selected.path}
          </p>
        </div>
      )}

    </div>
  )
}
