// تحقق تشفيري من توقيعات RSA PKCS#1 v1.5 مع SHA-256 (خوارزمية RS256 في WebAuthn، احتياطية بعد ES256)
// RSA PKCS#1 v1.5 SHA-256 signature verification — WebAuthn RS256 fallback algorithm

// بادئة DigestInfo القياسية لـ SHA-256 في PKCS#1 v1.5 (RFC 8017 §9.2، ثابتة معروفة)
const SHA256_DIGEST_INFO_PREFIX_ = [
  0x30, 0x31, 0x30, 0x0d, 0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01, 0x05, 0x00, 0x04, 0x20,
];

// hashBytes: بايتات هاش SHA-256 للبيانات الموقَّعة | sigBytes/modulusBytes/exponentBytes: بايتات خام
function verifyRsaPkcs1Sha256_(hashBytes, sigBytes, modulusBytes, exponentBytes) {
  const n = bigIntFromBytes_(modulusBytes);
  const e = bigIntFromBytes_(exponentBytes);
  const s = bigIntFromBytes_(sigBytes);
  const k = modulusBytes.length; // طول المعامل بالبايت

  if (s >= n) return false;
  const m = modPow_(s, e, n);
  const em = bytesFromBigInt_(m, k);

  // ترميز EMSA-PKCS1-v1_5: 0x00 0x01 [0xFF...] 0x00 [DigestInfo || Hash]
  if (em[0] !== 0x00 || em[1] !== 0x01) return false;
  let pos = 2;
  while (pos < em.length && em[pos] === 0xff) pos++;
  if (em[pos] !== 0x00) return false;
  pos++;

  const expected = SHA256_DIGEST_INFO_PREFIX_.concat(hashBytes);
  const actual = em.slice(pos);
  return bytesEqual_(actual, expected);
}

// ── اختبار ذاتي بمتجه موثوق مولَّد ومتحقَّق منه محلياً عبر openssl (RSA-2048 حقيقي، PKCS#1 v1.5/SHA-256) ──
// شغّلها يدوياً من محرر Apps Script (testRsaPkcs1_) قبل الاعتماد عليها في الإنتاج.
function testRsaPkcs1_() {
  const modulusHex = 'A9542D25D5D5FF2D178B2E82474780C17AB2AAF1B274F5D95E4A9FC33F69F31835441533D14BDA0AF6A76F62E9B9B3DED0CD954C214590B9860392B41D6915D65158B7FD9E9E63A22DDD24F45DC10E87C61065EF1D16E66F42B59A86D776F8D2FE39C0DB7FFE4F805769765945791CB6234DD1EC523B9B95B0879EBBA9FBD605E352B3A59DA3AD155EDC6232D003367F19BA2DF3F8FCD097458CF3409D355622850F554ED6BEFF8737496C58F677F7BEDC91E801B569D007E17F2BD9747DA3E0F7B6419D030DE5B78A9D81F51F467C6A2F9E8B2CE31991F3616CA2249C0A1822E3DBE88F6F65F772A343F12781F7E3C9128956A4F21A7B169F10AE9215A51C41';
  const sigHex = '824d77a4b78d8cbb9dfba16d18f9ff8d25d7e0588b55bff8660ecd9e1bddc067875840f9fa013ae91b792f78e2a9023809a533e08edb0a3f661e282c1ce6696e9a57d32867e526cddc33fc8b4954d01d05db3168e04f25968e712a4023a2aee912ef98a379b8c9ebc7e6423c1c6808c2192f77ac1f8e3ee741035cd034e5d08a119e0018e87fa3d00232abc382b049dc653739099cb2c5fe76deb54c7bfe35fb2a9c5a0d88e6872b365c89baef26781a7fc986aeea8b7e2b097789c77abd0ec64b581a06a5da55e48e8ab24225b2be9a16c1d47830762301603dca3e3b3568d013a40539f620886014d7812280932d6b302f556bba2790324eaebad56ab064d5';
  const message = 'sahm-webauthn-rs256-test-vector'; // النص ثابت — التوقيع أعلاه مولَّد تحديداً لهذه السلسلة عبر openssl، لا تُغيّره

  const modulusBytes = bytesFromBigInt_(BigInt('0x' + modulusHex), 256);
  const exponentBytes = bytesFromBigInt_(BigInt(65537));
  const sigBytes = bytesFromBigInt_(BigInt('0x' + sigHex), 256);
  const hash = sha256_(normalizeBytes_(Utilities.newBlob(message).getBytes()));

  const valid = verifyRsaPkcs1Sha256_(hash, sigBytes, modulusBytes, exponentBytes);

  const tamperedHash = sha256_(normalizeBytes_(Utilities.newBlob(message + '-tampered').getBytes()));
  const invalid = verifyRsaPkcs1Sha256_(tamperedHash, sigBytes, modulusBytes, exponentBytes);

  return {
    validSignatureAccepted: valid === true,
    tamperedSignatureRejected: invalid === false,
    passed: valid === true && invalid === false,
  };
}
