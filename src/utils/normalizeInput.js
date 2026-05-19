const AR = '٠١٢٣٤٥٦٧٨٩'
const FA = '۰۱۲۳۴۵۶۷۸۹'

export function normalizeDigits(str) {
  return String(str || '')
    .replace(/[٠-٩]/g, d => AR.indexOf(d))
    .replace(/[۰-۹]/g, d => FA.indexOf(d))
}
