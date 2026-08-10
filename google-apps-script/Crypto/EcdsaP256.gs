// تحقق تشفيري كامل من توقيعات ECDSA على منحنى P-256 (خوارزمية ES256 في WebAuthn)
// Full ECDSA P-256 (secp256r1) signature verification — WebAuthn ES256 algorithm
//
// تنفيذ نقي بحساب النقاط الإحداثية العادية (Affine) عبر BigInt، بلا أي مكتبة خارجية
// أو اتصال شبكي وقت التشغيل. الأداء غير حرج هنا لأنه يعمل مرة واحدة لكل عملية دخول.

const P256_P  = BigInt('0xFFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFF');
const P256_A  = BigInt('0xFFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFC');
const P256_GX = BigInt('0x6B17D1F2E12C4247F8BCE6E563A440F277037D812DEB33A0F4A13945D898C296');
const P256_GY = BigInt('0x4FE342E2FE1A7F9B8EE7EB4A7C0F9E162BCE33576B315ECECBB6406837BF51F5');
const P256_N  = BigInt('0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551');

function ecPointAdd_(p1, p2) {
  if (p1 === null) return p2;
  if (p2 === null) return p1;
  const p = P256_P;
  if (p1.x === p2.x && mod_(p1.y + p2.y, p) === BigInt(0)) return null; // نقطة اللانهاية
  let lambda;
  if (p1.x === p2.x && p1.y === p2.y) {
    lambda = mod_((BigInt(3) * p1.x * p1.x + P256_A) * modInverse_(BigInt(2) * p1.y, p), p);
  } else {
    lambda = mod_((p2.y - p1.y) * modInverse_(p2.x - p1.x, p), p);
  }
  const x3 = mod_(lambda * lambda - p1.x - p2.x, p);
  const y3 = mod_(lambda * (p1.x - x3) - p1.y, p);
  return { x: x3, y: y3 };
}

function ecScalarMul_(k, point) {
  let result = null;
  let addend = point;
  let n = k;
  while (n > BigInt(0)) {
    if (n & BigInt(1)) result = ecPointAdd_(result, addend);
    addend = ecPointAdd_(addend, addend);
    n >>= BigInt(1);
  }
  return result;
}

// يحلل توقيع DER: SEQUENCE { INTEGER r, INTEGER s } — الصيغة المستخدمة في WebAuthn ES256
function parseDerEcdsaSignature_(bytes) {
  let pos = 0;
  if ((bytes[pos++] & 0xff) !== 0x30) throw new Error('توقيع DER غير صالح: SEQUENCE متوقعة');
  pos += derSkipLength_(bytes, pos).size;

  function readInt() {
    if ((bytes[pos++] & 0xff) !== 0x02) throw new Error('عدد صحيح DER متوقع');
    const lenInfo = derReadLength_(bytes, pos);
    pos = lenInfo.nextPos;
    const intBytes = bytes.slice(pos, pos + lenInfo.length);
    pos += lenInfo.length;
    return bigIntFromBytes_(intBytes);
  }
  const r = readInt();
  const s = readInt();
  return { r, s };
}

function derReadLength_(bytes, pos) {
  let len = bytes[pos++] & 0xff;
  if (len & 0x80) {
    const numBytes = len & 0x7f;
    len = 0;
    for (let i = 0; i < numBytes; i++) len = (len << 8) | (bytes[pos++] & 0xff);
  }
  return { length: len, nextPos: pos };
}
function derSkipLength_(bytes, pos) {
  const info = derReadLength_(bytes, pos);
  return { size: info.nextPos - pos };
}

// hashBytes: بايتات هاش SHA-256 لبيانات WebAuthn الموقَّعة (authenticatorData + hash(clientDataJSON))
// sigDerBytes: توقيع DER الوارد من المصادقة | pubX/pubY: إحداثيات المفتاح العام BigInt
function verifyEcdsaP256_(hashBytes, sigDerBytes, pubX, pubY) {
  const { r, s } = parseDerEcdsaSignature_(sigDerBytes);
  if (r <= BigInt(0) || r >= P256_N || s <= BigInt(0) || s >= P256_N) return false;

  const z = bigIntFromBytes_(hashBytes);
  const w = modInverse_(s, P256_N);
  const u1 = mod_(z * w, P256_N);
  const u2 = mod_(r * w, P256_N);

  const point = ecPointAdd_(
    ecScalarMul_(u1, { x: P256_GX, y: P256_GY }),
    ecScalarMul_(u2, { x: pubX, y: pubY })
  );
  if (point === null) return false;
  return mod_(point.x, P256_N) === mod_(r, P256_N);
}

// ── اختبار ذاتي بمتجه اختبار قياسي معروف (RFC 6979 §A.2.5 — ECDSA P-256/SHA-256، رسالة "sample") ──
// القيم مُحقَّقة حرفياً من نص RFC 6979 الخام (rfc-editor.org/rfc/rfc6979.txt) وليست من الذاكرة فقط.
// شغّلها يدوياً من محرر Apps Script (testEcdsaP256_) قبل الاعتماد عليها في الإنتاج.
function testEcdsaP256_() {
  const pubX = BigInt('0x60FED4BA255A9D31C961EB74C6356D68C049B8923B61FA6CE669622E60F29FB6');
  const pubY = BigInt('0x7903FE1008B8BC99A41AE9E95628BC64F2F1B20C2D7E9F5177A3C294D4462299');
  const message = normalizeBytes_(Utilities.newBlob('sample').getBytes());
  const hash = sha256_(message);

  // r, s من نفس المتجه (RFC 6979 §A.2.5)، كل منهما 32 بايت بالضبط
  const r = bytesFromBigInt_(BigInt('0xEFD48B2AACB6A8FD1140DD9CD45E81D69D2C877B56AAF991C34D0EA84EAF3716'), 32);
  const s = bytesFromBigInt_(BigInt('0xF7CB1C942D657C41D436C7A1B6E29F65F3E900DBB9AFF4064DC4AB2F843ACDA8'), 32);
  const der = [0x30, 4 + r.length + s.length, 0x02, r.length, ...r, 0x02, s.length, ...s];

  const valid = verifyEcdsaP256_(hash, der, pubX, pubY);

  // رسالة مُلاعَب بها يجب أن تفشل
  const tamperedHash = sha256_(normalizeBytes_(Utilities.newBlob('sample-tampered').getBytes()));
  const invalid = verifyEcdsaP256_(tamperedHash, der, pubX, pubY);

  return {
    validSignatureAccepted: valid === true,
    tamperedSignatureRejected: invalid === false,
    passed: valid === true && invalid === false,
  };
}
