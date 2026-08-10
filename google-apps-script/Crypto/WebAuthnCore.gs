// طبقة تحليل وتحقق WebAuthn الكاملة — تجمع CBOR + ECDSA/RSA لتنفيذ حفلي التسجيل والدخول
// Full WebAuthn parsing/verification layer — combines CBOR + ECDSA/RSA for register/login ceremonies
//
// يُطلَب attestation:'none' من العميل عمداً (خصوصية أفضل، ممارسة قياسية موصى بها) — لذا لا حاجة
// للتحقق من توقيع attStmt وقت التسجيل؛ الأمان الحقيقي يقع بالكامل على تحقق التوقيع وقت كل دخول لاحق.

function parseAttestationObject_(bytes) {
  const map = cborDecodeBytes_(bytes);
  return { fmt: map['fmt'], authData: map['authData'] };
}

function parseAuthenticatorData_(bytes) {
  let pos = 0;
  const rpIdHash = bytes.slice(pos, pos + 32); pos += 32;
  const flags = bytes[pos] & 0xff; pos += 1;
  const signCount = (((bytes[pos] & 0xff) << 24) | ((bytes[pos + 1] & 0xff) << 16) |
                      ((bytes[pos + 2] & 0xff) << 8) | (bytes[pos + 3] & 0xff)) >>> 0;
  pos += 4;

  const result = {
    rpIdHash, flags, signCount,
    userPresent: !!(flags & 0x01),
    userVerified: !!(flags & 0x04),
    attestedCredentialDataIncluded: !!(flags & 0x40),
  };

  if (result.attestedCredentialDataIncluded) {
    pos += 16; // aaguid — غير مستخدَم
    const credIdLen = ((bytes[pos] & 0xff) << 8) | (bytes[pos + 1] & 0xff); pos += 2;
    const credentialId = bytes.slice(pos, pos + credIdLen); pos += credIdLen;
    const ctx = { bytes, pos };
    const coseKeyMap = cborDecodeItem_(ctx);
    result.credentialId = credentialId;
    result.publicKey = coseMapToPublicKey_(coseKeyMap);
  }
  return result;
}

function coseMapToPublicKey_(map) {
  const kty = map[1];
  const alg = map[3];
  if (kty === 2) return { kty: 'EC2', alg, x: bigIntFromBytes_(map[-2]), y: bigIntFromBytes_(map[-3]) };
  if (kty === 3) return { kty: 'RSA', alg, n: map[-1], e: map[-2] };
  throw new Error('نوع مفتاح COSE غير مدعوم: ' + kty);
}

function algorithmName_(coseAlg) {
  if (coseAlg === -7) return 'ES256';
  if (coseAlg === -257) return 'RS256';
  return null;
}

// يتحقق من استجابة تسجيل بصمة جديدة (navigator.credentials.create) ويُعيد بيانات الاعتماد لتخزينها
function verifyRegistrationResponse_(opts) {
  const clientDataBytes = base64UrlToBytes_(opts.clientDataJSONB64);
  const clientData = JSON.parse(bytesToUtf8_(clientDataBytes));

  if (clientData.type !== 'webauthn.create') throw new Error('نوع عملية WebAuthn غير صحيح');
  if (clientData.challenge !== opts.expectedChallengeB64) throw new Error('challenge غير مطابق أو منتهي الصلاحية');
  if (clientData.origin !== opts.expectedOrigin) throw new Error('origin غير مطابق');

  const attObj = parseAttestationObject_(base64UrlToBytes_(opts.attestationObjectB64));
  const authData = parseAuthenticatorData_(attObj.authData);

  const expectedRpIdHash = sha256_(normalizeBytes_(Utilities.newBlob(opts.expectedRpId).getBytes()));
  if (!bytesEqual_(authData.rpIdHash, expectedRpIdHash)) throw new Error('rpId غير مطابق');
  if (!authData.userVerified) throw new Error('لم تتم مطالبة بيومترية حقيقية أثناء التسجيل');
  if (!authData.publicKey) throw new Error('لا يوجد مفتاح عام في استجابة التسجيل');

  const algorithm = algorithmName_(authData.publicKey.alg);
  if (!algorithm) throw new Error('خوارزمية غير مدعومة (يُقبل ES256 أو RS256 فقط)');

  const publicKeyRecord = authData.publicKey.kty === 'EC2'
    ? { kty: 'EC2', x: authData.publicKey.x.toString(16), y: authData.publicKey.y.toString(16) }
    : { kty: 'RSA', n: bytesToBase64Url_(authData.publicKey.n), e: bytesToBase64Url_(authData.publicKey.e) };

  return {
    credentialId: bytesToBase64Url_(authData.credentialId),
    algorithm,
    publicKeyJson: JSON.stringify(publicKeyRecord),
    signCount: authData.signCount,
  };
}

// يتحقق من استجابة دخول (navigator.credentials.get) مقابل بيانات اعتماد مخزَّنة مسبقاً
function verifyAssertionResponse_(opts) {
  const clientDataBytes = base64UrlToBytes_(opts.clientDataJSONB64);
  const clientData = JSON.parse(bytesToUtf8_(clientDataBytes));

  if (clientData.type !== 'webauthn.get') throw new Error('نوع عملية WebAuthn غير صحيح');
  if (clientData.challenge !== opts.expectedChallengeB64) throw new Error('challenge غير مطابق أو منتهي الصلاحية');
  if (clientData.origin !== opts.expectedOrigin) throw new Error('origin غير مطابق');

  const authDataBytes = base64UrlToBytes_(opts.authenticatorDataB64);
  const authData = parseAuthenticatorData_(authDataBytes);

  const expectedRpIdHash = sha256_(normalizeBytes_(Utilities.newBlob(opts.expectedRpId).getBytes()));
  if (!bytesEqual_(authData.rpIdHash, expectedRpIdHash)) throw new Error('rpId غير مطابق');
  if (!authData.userVerified) throw new Error('لم تتم مطالبة بيومترية حقيقية أثناء الدخول');

  const clientDataHash = sha256_(clientDataBytes);
  const signedMessage = authDataBytes.concat(clientDataHash);
  const signedHash = sha256_(signedMessage);
  const sigBytes = base64UrlToBytes_(opts.signatureB64);
  const pubKey = JSON.parse(opts.storedPublicKeyJson);

  let ok;
  if (opts.storedAlgorithm === 'ES256') {
    ok = verifyEcdsaP256_(signedHash, sigBytes, BigInt('0x' + pubKey.x), BigInt('0x' + pubKey.y));
  } else if (opts.storedAlgorithm === 'RS256') {
    ok = verifyRsaPkcs1Sha256_(signedHash, sigBytes, base64UrlToBytes_(pubKey.n), base64UrlToBytes_(pubKey.e));
  } else {
    throw new Error('خوارزمية مخزَّنة غير مدعومة');
  }

  if (!ok) return { valid: false };

  // كشف استنساخ محتمل لجهاز المصادقة: العداد يجب أن يتقدم، إلا إن كان الجهاز لا يدعم العداد (0 دائماً)
  const counterOk = authData.signCount === 0 || opts.storedSignCount === 0 || authData.signCount > opts.storedSignCount;

  return { valid: true, newSignCount: authData.signCount, counterOk };
}
