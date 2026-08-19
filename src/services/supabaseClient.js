// ═══════════════════════════════════════════════════════════════════════════
// supabaseClient.js — عميل Supabase واحد مشترك لكل الموقع (المرحلة 6)
// Single shared Supabase client instance for the whole site.
// يدير الجلسة تلقائيًا (تخزين + تحديث تلقائي لرمز الدخول) عبر localStorage
// الداخلي الخاص بمكتبة Supabase (مفتاح منفصل تمامًا عن مفتاح 'user' القديم
// المستخدم للتوافق مع الصفحات غير المُحدَّثة بعد — انظر services/auth.js).
// ═══════════════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('VITE_SUPABASE_URL أو VITE_SUPABASE_ANON_KEY غير مُعرَّفين في .env')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})
