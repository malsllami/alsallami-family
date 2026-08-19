// ═══════════════════════════════════════════════════════════════════════════
// api.js — طبقة اتصال موحّدة بكل Edge Functions الجديدة (المرحلة 6)
// يستبدل كل نداءات fetch(import.meta.env.VITE_API_URL, ...) المتكررة يدويًا
// بمكان واحد. يستخدم supabase.functions.invoke الذي يُرفق تلقائيًا:
//   - رأس apikey (مفتاح anon العام)
//   - رأس Authorization: Bearer <access_token> إن كان المستخدم مسجَّل دخول
//     (يُدار تلقائيًا عبر عميل Supabase المشترك — بلا أي كود إضافي هنا)
// ═══════════════════════════════════════════════════════════════════════════

import { supabase } from './supabaseClient'

/**
 * ينادي Edge Function باسمها ويُرجع دائمًا كائنًا بشكل {success, message?, ...}
 * — حتى لو رجعت الدالة كود حالة غير 200 (403/500)، نستخرج جسم JSON الحقيقي
 * (الذي كتبته الدالة نفسها) بدل رسالة خطأ عامة غير مفيدة.
 * @param {string} functionName اسم الدالة بالضبط كما نُشرت (مثال: 'login')
 * @param {object} body الجسم المُرسَل (يشمل action لو الدالة متعددة العمليات)
 */
export async function callFunction(functionName, body = {}) {
  try {
    const { data, error } = await supabase.functions.invoke(functionName, { body })

    if (error) {
      // FunctionsHttpError يحمل استجابة الخادم الفعلية بـerror.context — نقرأها
      // لأن دوالنا كلها ترجع {success:false, message:'...'} حتى بأكواد 403/500
      try {
        const ctx = error.context
        if (ctx && typeof ctx.json === 'function') {
          const body = await ctx.json()
          if (body?.message) return { success: false, message: body.message }
        }
      } catch { /* تجاهل — نستخدم رسالة عامة بالأسفل */ }
      return { success: false, message: 'تعذّر الاتصال بالخادم' }
    }

    return data
  } catch {
    return { success: false, message: 'تعذّر الاتصال بالخادم' }
  }
}
