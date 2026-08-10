// أغلفة مساعدة فوق أدوات Base64 المدمجة في Apps Script + تحويلات BigInt/بايتات
// Helpers around Apps Script's built-in Base64 utilities + BigInt/byte conversions
//
// ملاحظة مهمة: Utilities.base64Decode* تُرجع بايتات موقّعة (-128..127) في Apps Script،
// لذا يجب دائماً تطبيع القيم بـ (b & 0xff) قبل أي عملية بتّية أو حسابية عليها.

function base64UrlToBytes_(b64url) {
  return normalizeBytes_(Utilities.base64DecodeWebSafe(b64url));
}

function base64ToBytes_(b64) {
  return normalizeBytes_(Utilities.base64Decode(b64));
}

function normalizeBytes_(byteArray) {
  const out = new Array(byteArray.length);
  for (let i = 0; i < byteArray.length; i++) out[i] = byteArray[i] & 0xff;
  return out;
}

// معيار WebAuthn (وترميز المتصفح نفسه) يستخدم base64url بلا تبطين (RFC 4648 §5 بلا '=') —
// Utilities.base64EncodeWebSafe في Apps Script تُضيف تبطيناً افتراضياً، فيجب حذفه هنا لمطابقة
// قيم challenge/credentialId التي يرسلها المتصفح حرفياً وإلا تفشل كل المقارنات بصمت.
function bytesToBase64Url_(byteArray) {
  return Utilities.base64EncodeWebSafe(byteArray).replace(/=+$/, '');
}

function bytesToUtf8_(byteArray) {
  return Utilities.newBlob(byteArray).getDataAsString('UTF-8');
}

function bigIntFromBytes_(byteArray) {
  if (!byteArray || byteArray.length === 0) return BigInt(0);
  let hex = '0x';
  for (let i = 0; i < byteArray.length; i++) {
    hex += (byteArray[i] & 0xff).toString(16).padStart(2, '0');
  }
  return BigInt(hex);
}

function bytesFromBigInt_(bi, length) {
  let hex = bi.toString(16);
  if (hex.length % 2) hex = '0' + hex;
  const out = [];
  for (let i = 0; i < hex.length; i += 2) out.push(parseInt(hex.substr(i, 2), 16));
  if (length) {
    while (out.length < length) out.unshift(0);
    while (out.length > length && out[0] === 0) out.shift();
  }
  return out;
}

function sha256_(byteArray) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, byteArray);
  return normalizeBytes_(digest);
}

function bytesEqual_(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if ((a[i] & 0xff) !== (b[i] & 0xff)) return false;
  return true;
}

function concatBytes_(a, b) {
  return a.concat(b);
}
