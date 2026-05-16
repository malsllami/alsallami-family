import {
  useEffect,
  useState,
} from 'react'

export default function PendingRequests() {

  /**************************************************
   * الحالات
   **************************************************/

  const [requests, setRequests] = useState([])

  const [loading, setLoading] = useState(true)

  const [actionId, setActionId] = useState(null)

  /**************************************************
   * جلب الطلبات
   **************************************************/

  const fetchRequests = async () => {

    try {

      const response = await fetch(

        import.meta.env.VITE_API_URL,

        {

          method: 'POST',

          body: JSON.stringify({

            action: 'getPendingRequests',

          }),

        }

      )

      const result = await response.json()

      if (result.success) {

        setRequests(result.data || [])

      }

    } catch (error) {

      console.error(error)

    } finally {

      setLoading(false)

    }

  }

  /**************************************************
   * اعتماد الطلب
   **************************************************/

  const handleApprove = async (requestId) => {

    const confirmApprove = window.confirm(
      'هل أنت متأكد من اعتماد الطلب؟'
    )

    if (!confirmApprove) return

    setActionId(requestId)

    try {

      const response = await fetch(

        import.meta.env.VITE_API_URL,

        {

          method: 'POST',

          body: JSON.stringify({

            action: 'approveRequest',

            requestId,

          }),

        }

      )

      const result = await response.json()

      if (result.success) {

        alert('تم اعتماد العضو بنجاح')

        fetchRequests()

      } else {

        alert(result.message || 'فشل اعتماد الطلب')

      }

    } catch (error) {

      console.error(error)

      alert('حدث خطأ أثناء الاتصال بالخادم')

    } finally {

      setActionId(null)

    }

  }

  /**************************************************
   * رفض الطلب
   **************************************************/

  const handleReject = async (requestId) => {

    const confirmReject = window.confirm(
      'هل أنت متأكد من رفض الطلب؟'
    )

    if (!confirmReject) return

    setActionId(requestId)

    try {

      const response = await fetch(

        import.meta.env.VITE_API_URL,

        {

          method: 'POST',

          body: JSON.stringify({

            action: 'rejectRequest',

            requestId,

          }),

        }

      )

      const result = await response.json()

      if (result.success) {

        alert('تم رفض الطلب')

        fetchRequests()

      } else {

        alert(result.message || 'فشل رفض الطلب')

      }

    } catch (error) {

      console.error(error)

      alert('حدث خطأ أثناء الاتصال بالخادم')

    } finally {

      setActionId(null)

    }

  }

  /**************************************************
   * تحميل أولي
   **************************************************/

  useEffect(() => {

    fetchRequests()

  }, [])

  /**************************************************
   * تحميل
   **************************************************/

  if (loading) {

    return (

      <div className="min-h-screen flex items-center justify-center text-white text-2xl">

        جاري تحميل الطلبات...

      </div>

    )

  }

  /**************************************************
   * الصفحة
   **************************************************/

  return (

    <div className="px-5 lg:px-10 py-10">

      {/* العنوان */}

      <div className="mb-10">

        <h1 className="text-4xl font-bold text-[var(--gold-main)]">

          طلبات التسجيل

        </h1>

      </div>

      {/* لا توجد طلبات */}

      {requests.length === 0 && (

        <div className="bg-white/5 border border-white/10 rounded-[30px] p-10 text-center text-gray-300">

          لا توجد طلبات حالياً

        </div>

      )}

      {/* الطلبات */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {requests.map((request) => (

          <div

            key={request.requestId}

            className="bg-white/5 border border-white/10 rounded-[30px] p-6"

          >

            {/* الاسم الثلاثي */}

            <h2 className="text-2xl font-bold text-[var(--gold-main)]">

              {[request.firstName, request.fatherName, request.grandfatherName]
                .filter(Boolean)
                .join(' ')}

            </h2>

            {/* البيانات */}

            <div className="mt-6 space-y-3 text-gray-300">

              <p>

                رقم الهوية:
                {' '}
                {request.nationalId}

              </p>

              <p>

                رقم الجوال:
                {' '}
                {request.phone}

              </p>

              <p>

                الفخذ:
                {' '}
                {request.branch || request.branchId}

              </p>

              <p>

                تاريخ الميلاد:
                {' '}
                {request.birthDate}

              </p>

              <p>

                الجنس:
                {' '}
                {request.gender}

              </p>

              <p>

                الحالة الاجتماعية:
                {' '}
                {request.maritalStatus}

              </p>

            </div>

            {/* أزرار الإجراءات */}

            <div className="mt-8 flex gap-3">

              <button

                onClick={() => handleApprove(request.requestId)}

                disabled={actionId === request.requestId}

                className="font-nav flex-1 bg-[var(--gold-main)] text-black py-4 rounded-2xl font-bold hover:opacity-90 duration-300 disabled:opacity-50 disabled:cursor-not-allowed"

              >

                {actionId === request.requestId ? 'جاري المعالجة...' : 'اعتماد'}

              </button>

              <button

                onClick={() => handleReject(request.requestId)}

                disabled={actionId === request.requestId}

                className="font-nav flex-1 bg-red-500/20 border border-red-500/40 text-red-400 py-4 rounded-2xl font-bold hover:bg-red-500/30 duration-300 disabled:opacity-50 disabled:cursor-not-allowed"

              >

                رفض

              </button>

            </div>

          </div>

        ))}

      </div>

    </div>

  )

}
