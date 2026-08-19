// ═══════════════════════════════════════════════════════════════════════════
// auth.js — إدارة الجلسة الحقيقية (المرحلة 6)
// يستبدل نظام localStorage['user'] القديم (بلا أي رمز حقيقي) بجلسة Supabase
// Auth حقيقية (JWT + تحديث تلقائي). للحفاظ على عمل بقية الصفحات التي لم
// تُحدَّث بعد (لا تزال تقرأ JSON.parse(localStorage.getItem('user')) مباشرة
// دون مرور بـAuthContext — موثَّق بتقرير الاستكشاف)، نستمر بكتابة نفس شكل
// كائن المستخدم القديم لـlocalStorage['user'] بالتوازي مع جلسة Supabase
// الحقيقية — بمثابة "طبقة توافق" مؤقتة حتى تُحدَّث كل الصفحات تباعًا.
// ═══════════════════════════════════════════════════════════════════════════

import { supabase } from './supabaseClient'
import { callFunction } from './api'

const LEGACY_USER_KEY = 'user'

/** يقرأ كائن المستخدم الحالي (نفس الشكل القديم بالضبط) — null إن لم يكن مسجَّلًا */
export function getCurrentUser() {
  const raw = localStorage.getItem(LEGACY_USER_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

function saveLegacyUser(user) {
  localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(user))
}

/**
 * دخول برقم الهوية وكلمة المرور — يستدعي دالة `login`، وعند النجاح يضبط
 * جلسة Supabase الحقيقية (لتُرفَق تلقائيًا بكل نداء API لاحق) + يحفظ كائن
 * المستخدم بالشكل القديم للتوافق مع الصفحات غير المُحدَّثة بعد.
 * @returns {Promise<{success:boolean, user?:object, requireChange?:boolean, rejected?:boolean, reason?:string, message?:string, status?:string}>}
 */
export async function loginWithCredentials(nationalId, password) {
  const result = await callFunction('login', { nationalId, password })
  if (!result.success) return result

  const { session, user } = result

  // يضبط جلسة Supabase الحقيقية — كل نداء لاحق عبر callFunction() سيحمل
  // تلقائيًا Authorization: Bearer <access_token> الصحيح
  const { error: sessionErr } = await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  })
  if (sessionErr) return { success: false, message: 'تعذّر بدء الجلسة' }

  saveLegacyUser(user)

  // نفس سلوك الصفحة الحالية: كلمة مرور مؤقتة (بعد الهجرة أو تسجيل جديد) →
  // يُطلَب تغييرها فورًا قبل إتاحة الدخول الكامل للوحة
  if (user.mustChangePassword === 'Y') {
    return { success: true, requireChange: true, user }
  }

  return { success: true, user }
}

/** يضبط الجلسة من نتيجة نجاح خارجية (مثل الدخول بالبصمة عبر manage-webauthn) */
export async function applySessionAndUser(session, user) {
  const { error } = await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  })
  if (error) return { success: false, message: 'تعذّر بدء الجلسة' }
  saveLegacyUser(user)
  return { success: true, user }
}

/** تسجيل خروج كامل — يمسح جلسة Supabase الحقيقية وكل بيانات التوافق القديمة */
export async function logout() {
  await supabase.auth.signOut()
  localStorage.removeItem(LEGACY_USER_KEY)
  sessionStorage.removeItem('adminUnlocked')
}
