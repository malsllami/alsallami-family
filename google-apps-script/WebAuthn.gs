/* ═══════════════════════════════════════════════════════════════════════════
   WebAuthn.gs — بصمة الجهاز الحقيقية (Device Fingerprint)
   الغراء بين طبقة التحقق التشفيري (Crypto/WebAuthnCore.gs) وجدول "بيانات البصمة":
   حفلا التسجيل والدخول، ودعم أجهزة متعددة لكل عضو. على غرار مشروع "سهم" بالضبط.
   Glue between the crypto verification layer and the "بيانات البصمة" table:
   register/login ceremonies, multi-device support per member — mirrors the "سهم" project.
   ═══════════════════════════════════════════════════════════════════════════ */

var RP_ID     = 'malsllami.github.io';
var RP_ORIGIN = 'https://malsllami.github.io';
var WEBAUTHN_CHALLENGE_TTL_SECONDS = 120;

/* ═══ توليد وتخزين واستهلاك الـ challenge (عبر الكاش، لمرة واحدة فقط) ═══ */

function generateChallenge_() {
  var hex = '';
  for (var i = 0; i < 3; i++) hex += Utilities.getUuid().replace(/-/g, '');
  hex = hex.slice(0, 64); // 32 بايت (256 بت) من مصدر UUID عشوائي آمن
  var bytes = [];
  for (var j = 0; j < hex.length; j += 2) bytes.push(parseInt(hex.substr(j, 2), 16));
  return bytesToBase64Url_(bytes);
}

function storeChallenge_(key, challenge) {
  CacheService.getScriptCache().put('waChal_' + key, challenge, WEBAUTHN_CHALLENGE_TTL_SECONDS);
}

// قراءة لمرة واحدة فقط (تُحذف فور القراءة) لمنع إعادة استخدام نفس challenge
function consumeChallenge_(key) {
  var cache = CacheService.getScriptCache();
  var val = cache.get('waChal_' + key);
  if (val) cache.remove('waChal_' + key);
  return val;
}

/* ═══ قراءة/كتابة جدول "بيانات البصمة" ═══════════════════════════════════ */

function findDeviceByCredentialId_(credentialId) {
  var data = getSheet('بيانات البصمة').getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][3]) === credentialId) {
      return {
        row: i + 1, id: data[i][0], memberId: String(data[i][1]), deviceName: data[i][2],
        credentialId: data[i][3], algorithm: data[i][4], publicKeyJson: data[i][5],
        signCount: Number(data[i][6]) || 0, linkedDate: data[i][7], lastUsed: data[i][8], status: data[i][9],
      };
    }
  }
  return null;
}

function getActiveDevicesForMember_(memberId) {
  var data = getSheet('بيانات البصمة').getDataRange().getValues();
  var list = [];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(memberId) && data[i][9] === 'نشط') {
      list.push({ id: data[i][0], deviceName: data[i][2], credentialId: data[i][3], linkedDate: data[i][7], lastUsed: data[i][8] });
    }
  }
  return list;
}

/* ═══ getMemberDevices — قائمة أجهزة العضو (لعرضها في لوحته) ═══════════════ */

function getMemberDevices(body) {
  var memberId = normalizeInput(body.memberId || '');
  if (!memberId) return { success: false, message: 'رقم العضو مطلوب' };

  var data = getSheet('بيانات البصمة').getDataRange().getValues();
  var list = [];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]) === memberId) {
      list.push({ id: data[i][0], deviceName: data[i][2], linkedDate: data[i][7], lastUsed: data[i][8], status: data[i][9] });
    }
  }
  return { success: true, devices: list };
}

/* ═══ revokeDevice — إلغاء ربط جهاز (من لوحة العضو) ═══════════════════════ */

function revokeDevice(body) {
  var memberId = normalizeInput(body.memberId || '');
  var deviceId = normalizeInput(body.deviceId || '');
  if (!memberId || !deviceId) return { success: false, message: 'بيانات ناقصة' };

  var sheet = getSheet('بيانات البصمة');
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === deviceId) {
      if (String(data[i][1]) !== memberId) return { success: false, message: 'هذا الجهاز لا يخص هذا العضو' };
      sheet.getRange(i + 1, 10).setValue('ملغى'); // العمود 10 = الحالة
      return { success: true, message: 'تم إلغاء ربط الجهاز' };
    }
  }
  return { success: false, message: 'الجهاز غير موجود' };
}

/* ═══ التسجيل — ربط بصمة جهاز جديد لعضو مسجّل دخوله بالفعل (من لوحة العضو) ═══ */

function beginDeviceRegistration(body) {
  var memberId = normalizeInput(body.memberId || '');
  if (!memberId) return { success: false, message: 'رقم العضو مطلوب' };

  var found = findRow('الأعضاء', 0, memberId);
  if (!found) return { success: false, message: 'العضو غير موجود' };
  var member = rowToObject(found.headers, found.rowData);
  if (member['حالة الحساب'] === 'موقوف') return { success: false, message: 'العضوية موقوفة، تواصل مع المدير' };

  var challenge = generateChallenge_();
  storeChallenge_('reg_' + memberId, challenge);

  return {
    success: true, challenge: challenge, memberId: memberId,
    memberName: String(member['الاسم الأول'] || ''),
  };
}

function completeDeviceRegistration(body) {
  var memberId = normalizeInput(body.memberId || '');
  var found = findRow('الأعضاء', 0, memberId);
  if (!found) return { success: false, message: 'العضو غير موجود' };

  var challenge = consumeChallenge_('reg_' + memberId);
  if (!challenge) return { success: false, message: 'انتهت صلاحية طلب التسجيل، حاول مرة أخرى' };

  var result;
  try {
    result = verifyRegistrationResponse_({
      clientDataJSONB64:   body.clientDataJSON,
      attestationObjectB64: body.attestationObject,
      expectedChallengeB64: challenge,
      expectedOrigin:       RP_ORIGIN,
      expectedRpId:         RP_ID,
    });
  } catch (err) {
    return { success: false, message: 'فشل التحقق من البصمة: ' + err.message };
  }

  if (findDeviceByCredentialId_(result.credentialId)) {
    return { success: false, message: 'هذا الجهاز مربوط مسبقاً' };
  }

  var deviceId = generateId('DEV');
  getSheet('بيانات البصمة').appendRow([
    deviceId, memberId, normalizeInput(body.deviceName || 'جهاز غير مسمّى'), result.credentialId,
    result.algorithm, result.publicKeyJson, result.signCount,
    formatDate(new Date()), formatDate(new Date()), 'نشط',
  ]);

  return { success: true, deviceId: deviceId, message: 'تم ربط بصمة جهازك بنجاح' };
}

/* ═══ الدخول اللاحق — من صفحة تسجيل الدخول، قبل أي مصادقة أخرى ═══════════ */

function beginDeviceLogin(body) {
  var nationalId = normalizeInput(body.nationalId || '').replace(/[^\d]/g, '');
  if (!nationalId) return { success: false, message: 'رقم الهوية مطلوب' };

  var found = findRowByNationalId(nationalId);
  if (!found) return { success: false, message: 'رقم الهوية غير مسجَّل' };
  var member = rowToObject(found.headers, found.rowData);
  if (member['حالة الحساب'] === 'موقوف') return { success: false, message: 'العضوية موقوفة، تواصل مع المدير' };

  var memberId = String(member['رقم العضو'] || '');
  var devices  = getActiveDevicesForMember_(memberId);
  if (devices.length === 0) {
    return { success: true, needsRegistration: true, memberId: memberId, memberName: String(member['الاسم الأول'] || '') };
  }

  var challenge = generateChallenge_();
  storeChallenge_('login_' + memberId, challenge);

  return {
    success: true, challenge: challenge, memberId: memberId,
    credentialIds: devices.map(function(d) { return d.credentialId; }),
  };
}

function completeDeviceLogin(body) {
  var memberId = normalizeInput(body.memberId || '');
  var found = findRow('الأعضاء', 0, memberId);
  if (!found) return { success: false, message: 'العضو غير موجود' };
  var member = rowToObject(found.headers, found.rowData);

  var challenge = consumeChallenge_('login_' + memberId);
  if (!challenge) return { success: false, message: 'انتهت صلاحية محاولة الدخول، حاول مرة أخرى' };

  var device = findDeviceByCredentialId_(body.credentialId);
  if (!device || device.memberId !== memberId || device.status !== 'نشط') {
    return { success: false, message: 'جهاز غير معروف أو غير نشط' };
  }

  var result;
  try {
    result = verifyAssertionResponse_({
      clientDataJSONB64:    body.clientDataJSON,
      authenticatorDataB64: body.authenticatorData,
      signatureB64:         body.signature,
      expectedChallengeB64: challenge,
      expectedOrigin:       RP_ORIGIN,
      expectedRpId:         RP_ID,
      storedAlgorithm:      device.algorithm,
      storedPublicKeyJson:  device.publicKeyJson,
      storedSignCount:      device.signCount,
    });
  } catch (err) {
    return { success: false, message: 'فشل التحقق من البصمة: ' + err.message };
  }
  if (!result.valid) return { success: false, message: 'توقيع البصمة غير صالح' };

  var deviceSheet = getSheet('بيانات البصمة');
  deviceSheet.getRange(device.row, 7).setValue(result.newSignCount);  // عداد التوقيع
  deviceSheet.getRange(device.row, 9).setValue(formatDate(new Date())); // آخر استخدام

  return {
    success:      true,
    message:      'تم تسجيل الدخول بنجاح',
    user:         buildUserObject(member),
    cloneWarning: !result.counterOk,
  };
}

/* ═══ الدخول "بلا اسم مستخدم" — بدون طلب رقم الهوية إطلاقاً ══════════════
   يعتمد على أن بصمة الجهاز تُسجَّل كـ"بيانات اعتماد قابلة للاكتشاف" (Discoverable/
   Resident Credential — residentKey:'preferred' عند التسجيل)، فيعرض النظام نفسه
   (Face ID / Touch ID / Windows Hello) هوية العضو المرتبطة بهذا الجهاز مباشرة،
   بلا أي إدخال يدوي. الـ challenge هنا عام (غير مرتبط بعضو محدد) ويُحفظ بذاته
   كمفتاح في الكاش (استهلاك لمرة واحدة)، ثم نحدّد صاحب البصمة من credentialId
   المُعاد من الجهاز نفسه بعد نجاح المصادقة. ══════════════════════════════ */

function beginUsernamelessLogin() {
  var challenge = generateChallenge_();
  CacheService.getScriptCache().put('waAnon_' + challenge, '1', WEBAUTHN_CHALLENGE_TTL_SECONDS);
  return { success: true, challenge: challenge };
}

function completeUsernamelessLogin(body) {
  var clientDataBytes = base64UrlToBytes_(body.clientDataJSON);
  var clientData;
  try { clientData = JSON.parse(bytesToUtf8_(clientDataBytes)); }
  catch (e) { return { success: false, message: 'بيانات الدخول غير صالحة' }; }

  var challenge = clientData.challenge;
  var cache = CacheService.getScriptCache();
  var cacheKey = 'waAnon_' + challenge;
  if (!cache.get(cacheKey)) return { success: false, message: 'انتهت صلاحية محاولة الدخول، حاول مرة أخرى' };
  cache.remove(cacheKey); // استهلاك لمرة واحدة

  var device = findDeviceByCredentialId_(body.credentialId);
  if (!device || device.status !== 'نشط') return { success: false, message: 'لا توجد بصمة مربوطة بهذا الجهاز — سجّل الدخول بكلمة المرور ثم فعّلها من لوحة العضو' };

  var found = findRow('الأعضاء', 0, device.memberId);
  if (!found) return { success: false, message: 'العضو غير موجود' };
  var member = rowToObject(found.headers, found.rowData);
  if (member['حالة الحساب'] === 'موقوف') return { success: false, message: 'العضوية موقوفة، تواصل مع المدير' };

  var result;
  try {
    result = verifyAssertionResponse_({
      clientDataJSONB64:    body.clientDataJSON,
      authenticatorDataB64: body.authenticatorData,
      signatureB64:         body.signature,
      expectedChallengeB64: challenge,
      expectedOrigin:       RP_ORIGIN,
      expectedRpId:         RP_ID,
      storedAlgorithm:      device.algorithm,
      storedPublicKeyJson:  device.publicKeyJson,
      storedSignCount:      device.signCount,
    });
  } catch (err) {
    return { success: false, message: 'فشل التحقق من البصمة: ' + err.message };
  }
  if (!result.valid) return { success: false, message: 'توقيع البصمة غير صالح' };

  var deviceSheet = getSheet('بيانات البصمة');
  deviceSheet.getRange(device.row, 7).setValue(result.newSignCount);
  deviceSheet.getRange(device.row, 9).setValue(formatDate(new Date()));

  return {
    success:      true,
    message:      'تم تسجيل الدخول بنجاح',
    user:         buildUserObject(member),
    cloneWarning: !result.counterOk,
  };
}
