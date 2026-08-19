// ═══════════════════════════════════════════════════════════════════════════
// webauthn.js — طبقة رقيقة فوق @simplewebauthn/browser (المرحلة 6)
// يستبدل التطبيق اليدوي السابق (بناء/ترميز خيارات WebAuthn يدويًا) بمكتبة
// قياسية (معيار الصناعة) تطابق تمامًا الشكل الذي تُصدره/تتوقعه manage-webauthn
// (المبنية على @simplewebauthn/server بالخلفية).
//
// ملاحظة مهمة: rpId لم يعد يُمرَّر يدويًا من الواجهة — يأتي مضمَّنًا داخل
// "options" التي يُرجعها الخادم أصلًا (بحسب معيار WebAuthn)، فلا حاجة لثابت
// RP_ID مكرَّر بأكثر من ملف (كان يحتاج تزامنًا يدويًا عند تغيير النطاق).
//
// قيد حرج يجب الحفاظ عليه دائمًا: نمط "خطوتين منفصلتين" — Safari (آيفون/
// آيباد) يرفض فتح نافذة البصمة لو مرّ أي تأخير شبكي بين ضغطة المستخدم
// واستدعاء startAuthentication/startRegistration. لذلك:
//   1) نداء API لجلب "options" فقط (بدون أي استدعاء WebAuthn بعده مباشرة)
//   2) زر منفصل يستدعي loginWithPasskey/registerPasskey فورًا بلا await قبله
// ═══════════════════════════════════════════════════════════════════════════

import {
  startAuthentication,
  startRegistration,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser'

export function isWebAuthnSupported() {
  return browserSupportsWebAuthn()
}

// يكتشف نوع بصمة الجهاز المرجّح حسب نظام التشغيل، لعرض تسمية وأيقونة مناسبة
// (Face ID لآيفون/آيباد، Touch ID لماك، بصمة إصبع لأندرويد، Windows Hello للويندوز)
export function detectBiometricPlatform() {
  if (typeof navigator === 'undefined') return { kind: 'generic', label: 'البصمة' }
  const ua       = navigator.userAgent || ''
  const platform = navigator.platform  || ''
  // آيباد الحديث يظهر أحياناً كـ "MacIntel" لكن مع دعم اللمس — نميّزه عن ماك الفعلي
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (isIOS)                                  return { kind: 'faceid',      label: 'Face ID' }
  if (/Android/.test(ua))                     return { kind: 'fingerprint', label: 'بصمة الإصبع' }
  if (/Mac/.test(platform))                   return { kind: 'touchid',     label: 'Touch ID' }
  if (/Win/.test(platform) || /Windows/.test(ua)) return { kind: 'windows', label: 'Windows Hello' }
  return { kind: 'generic', label: 'البصمة' }
}

/**
 * حفل الدخول بالبصمة — يُستدعى فورًا بزر منفصل بلا await قبله (انظر التحذير أعلاه).
 * @param {object} options الكائن الكامل المُرجَع من manage-webauthn (action: beginLogin)
 * @returns {Promise<object>} AuthenticationResponseJSON — يُرسَل كما هو لـcompleteLogin
 */
export function loginWithPasskey(options) {
  return startAuthentication({ optionsJSON: options })
}

/**
 * حفل تسجيل جهاز جديد — يُستدعى فورًا بزر منفصل بلا await قبله.
 * @param {object} options الكائن الكامل المُرجَع من manage-webauthn (action: beginRegistration)
 * @returns {Promise<object>} RegistrationResponseJSON — يُرسَل كما هو لـcompleteRegistration
 */
export function registerPasskey(options) {
  return startRegistration({ optionsJSON: options })
}
