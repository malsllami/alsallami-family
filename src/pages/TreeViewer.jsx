import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function TreeViewer() {
  const navigate = useNavigate();
  
  const [treeData, setTreeData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // التحقق: هل المستخدم عضو مسجل؟
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // التحقق من الجلسة
    const session = localStorage.getItem('familySession');
    setIsLoggedIn(!!session);
    
    // تحميل الشجرة
    loadTree();
  }, []);

  const loadTree = async () => {
    setLoading(true);
    try {
      const res = await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'getFamilyTree' }),
      });

      const data = await res.json();
      if (data.success) {
        setTreeData(data.tree);
      }
    } catch (err) {
      console.error('Error loading tree:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNodeClick = (node) => {
    setSelectedNode(node);
  };

  const closeCard = () => {
    setSelectedNode(null);
  };

  const renderTree = (nodes, level = 0) => {
    if (!nodes || nodes.length === 0) return null;

    return (
      <div className={`${level > 0 ? 'mr-8 mt-2' : ''} space-y-2`}>
        {nodes.map((node) => (
          <div key={node.id}>
            <div 
              onClick={() => handleNodeClick(node)}
              className={`
                p-3 rounded-lg cursor-pointer transition-all
                ${node.memberId 
                  ? 'bg-amber-100 hover:bg-amber-200 border-2 border-amber-300' 
                  : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                }
              `}
            >
              <div className="flex items-center gap-2">
                {node.memberId && (
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                )}
                <p className="font-semibold text-amber-900">{node.name}</p>
              </div>
              {node.generation && (
                <p className="text-xs text-amber-700 mt-1">الجيل {node.generation}</p>
              )}
              {node.job && (
                <p className="text-xs text-gray-600 mt-1">{node.job}</p>
              )}
            </div>
            
            {node.children && node.children.length > 0 && (
              <div className="border-r-2 border-amber-200 pr-4 mt-2">
                {renderTree(node.children, level + 1)}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // بطاقة العضو
  const MemberCard = ({ node, isLoggedIn, onClose }) => {
    if (!node) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}>
        <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}>
          
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-2xl font-bold text-amber-900">{node.name}</h3>
              {node.generation && (
                <p className="text-sm text-amber-700">الجيل {node.generation}</p>
              )}
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-3">
            {/* معلومات متاحة للجميع */}
            {node.parentName && (
              <div className="flex items-start gap-2 text-sm">
                <span className="text-gray-600 min-w-[80px]">الوالد:</span>
                <span className="font-semibold text-gray-900">{node.parentName}</span>
              </div>
            )}

            {node.job && (
              <div className="flex items-start gap-2 text-sm">
                <span className="text-gray-600 min-w-[80px]">المهنة:</span>
                <span className="font-semibold text-gray-900">{node.job}</span>
              </div>
            )}

            {node.location && (
              <div className="flex items-start gap-2 text-sm">
                <span className="text-gray-600 min-w-[80px]">المدينة:</span>
                <span className="font-semibold text-gray-900">{node.location}</span>
              </div>
            )}

            {node.marital && (
              <div className="flex items-start gap-2 text-sm">
                <span className="text-gray-600 min-w-[80px]">الحالة:</span>
                <span className="font-semibold text-gray-900">{node.marital}</span>
              </div>
            )}

            {/* معلومات حساسة - للأعضاء فقط */}
            {isLoggedIn && node.phone && (
              <div className="flex items-start gap-2 text-sm pt-3 border-t border-gray-200">
                <svg className="w-4 h-4 text-amber-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="text-gray-600 min-w-[80px]">الجوال:</span>
                <span className="font-semibold text-gray-900">{node.phone}</span>
              </div>
            )}

            {/* رسالة للزوار */}
            {!isLoggedIn && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-800 mb-2">
                  🔒 بعض البيانات الشخصية محجوبة للخصوصية
                </p>
                <button
                  onClick={() => navigate('/register')}
                  className="text-xs text-amber-600 hover:text-amber-700 font-semibold underline"
                >
                  سجل كعضو لمشاهدة كامل التفاصيل
                </button>
              </div>
            )}

            {/* الزوجات */}
            {node.wives && node.wives.length > 0 && (
              <div className="pt-3 border-t border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-2">الزوجات:</p>
                <div className="space-y-1">
                  {node.wives.map((wife, i) => (
                    <p key={i} className="text-sm text-gray-600">• {wife.name}</p>
                  ))}
                </div>
              </div>
            )}

            {/* الأبناء */}
            {node.children && node.children.length > 0 && (
              <div className="pt-3 border-t border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  الأبناء ({node.children.length}):
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {node.children.slice(0, 8).map((child, i) => (
                    <p key={i} className="text-sm text-gray-600">• {child.name}</p>
                  ))}
                  {node.children.length > 8 && (
                    <p className="text-sm text-amber-600 col-span-2">
                      +{node.children.length - 8} المزيد
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="mt-6 w-full bg-amber-600 text-white py-2 rounded-lg hover:bg-amber-700 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* الهيدر */}
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-amber-900">شجرة عائلة السلامي</h1>
            <p className="text-sm text-amber-700 mt-1">
              {isLoggedIn ? '👤 مرحباً بك' : '👁️ وضع المشاهدة'}
            </p>
          </div>
          <div className="flex gap-3">
            {!isLoggedIn && (
              <>
                <button
                  onClick={() => navigate('/register')}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-semibold"
                >
                  التسجيل
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="px-4 py-2 border-2 border-amber-600 text-amber-600 rounded-lg hover:bg-amber-50 text-sm font-semibold"
                >
                  تسجيل الدخول
                </button>
              </>
            )}
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
            >
              الرئيسية
            </button>
          </div>
        </div>

        {/* الشجرة */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
              <p className="mt-4 text-amber-700">جاري تحميل الشجرة...</p>
            </div>
          ) : treeData ? (
            <>
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 انقر على أي اسم لعرض التفاصيل
                  {!isLoggedIn && ' • بعض البيانات محجوبة للخصوصية'}
                </p>
              </div>
              <div className="overflow-x-auto">
                {renderTree(treeData)}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>لم يتم العثور على بيانات الشجرة</p>
            </div>
          )}
        </div>
      </div>

      {/* بطاقة العضو */}
      {selectedNode && (
        <MemberCard 
          node={selectedNode} 
          isLoggedIn={isLoggedIn} 
          onClose={closeCard} 
        />
      )}
    </div>
  );
}
