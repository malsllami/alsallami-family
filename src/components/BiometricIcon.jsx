// أيقونة البصمة — تتغيّر حسب نوع الجهاز (Face ID / Touch ID / بصمة إصبع / Windows Hello)
// Biometric icon — swaps shape based on detected platform (Face ID / Touch ID / fingerprint / Windows Hello)
export default function BiometricIcon({ kind = 'generic', size = 18, color = '#a78bfa' }) {
  if (kind === 'faceid') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {/* أقواس زوايا المسح — نمط أيقونة Face ID المعروف */}
        <path d="M4 8V6a2 2 0 0 1 2-2h2" />
        <path d="M16 4h2a2 2 0 0 1 2 2v2" />
        <path d="M20 16v2a2 2 0 0 1-2 2h-2" />
        <path d="M8 20H6a2 2 0 0 1-2-2v-2" />
        <circle cx="9" cy="10" r="0.8" fill={color} stroke="none" />
        <circle cx="15" cy="10" r="0.8" fill={color} stroke="none" />
        <path d="M9 15c1 1 5 1 6 0" />
      </svg>
    )
  }

  if (kind === 'windows') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
        <rect x="3"    y="3"    width="8.2" height="8.2" />
        <rect x="12.8" y="3"    width="8.2" height="8.2" />
        <rect x="3"    y="12.8" width="8.2" height="8.2" />
        <rect x="12.8" y="12.8" width="8.2" height="8.2" />
      </svg>
    )
  }

  // fingerprint / touchid / generic — نفس أيقونة البصمة القياسية
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 11a2 2 0 0 0-2 2c0 1.6-.8 3.1-2 4M8 17.5A6 6 0 0 1 6 13a6 6 0 0 1 12 0c0 .8-.1 1.6-.4 2.3M14 13a2 2 0 0 1 4 0c0 2.5-.6 4.9-1.7 7M12 5a8 8 0 0 1 8 8c0 1-.1 2-.4 2.9" />
    </svg>
  )
}
