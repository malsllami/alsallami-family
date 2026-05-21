/* ═══════════════════════════════════════════════════════════════════════════
   Auth.gs — المصادقة وإدارة كلمات المرور
   ═══════════════════════════════════════════════════════════════════════════ */

/* ═══ تطبيع المدخلات (أرقام عربية ← إنجليزية + تنظيف) ══════════════════ */

function normalizeInput(str) {
  str = String(str || '').trim();
  // تحويل الأرقام العربية والعبرية إلى إنجليزية
  str = str.replace(/[٠١٢٣٤٥٦٧٨٩]/g, function(d) {
    return String('٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  });
  // تحويل الأرقام الفارسية
  str = str.replace(/[۰۱۲۳۴۵۶۷۸۹]/g, function(d) {
    return String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
  });
  return str;
}

// تطبيع رقم الجوال → آخر 9 أرقام دائماً (بدون صفر) للمقارنة الآمنة
function normalizePhone(phone) {
  phone = normalizeInput(phone);
  phone = phone.replace(/[\s\-\(\)\.\+]/g, ''); // إزالة المسافات والرموز

  // أزل مفاتيح الدولة
  if (phone.startsWith('00966'))    phone = phone.slice(5);
  else if (phone.startsWith('966')) phone = phone.slice(3);
  else if (phone.startsWith('0'))   phone = phone.slice(1);

  // النتيجة دائماً: آخر 9 أرقام (5XXXXXXXX)
  return phone.slice(-9);
}

/* ═══ تسجيل الدخول ════════════════════════════════════════════════════════ */

function login(body) {
  // يقبل: phone أو memberId
  var identifier = normalizeInput(body.phone || body.memberId || '');
  var password   = normalizeInput(body.password || '');

  if (!identifier || !password) {
    return { success: false, message: 'رقم الجوال وكلمة المرور مطلوبان' };
  }

  // ابحث أولاً برقم الجوال (عمود 6 = رقم الجوال)
  var found = findRowByPhone(normalizePhone(identifier));

  // إذا ما وُجد بالجوال — ابحث برقم العضو (عمود 0)
  if (!found) found = findRow('الأعضاء', 0, identifier);

  if (!found) {
    // فحص إن كان الجوال موجوداً في طلب مرفوض
    try {
      var reqsAll = sheetToObjects('طلبات التسجيل');
      for (var rci = 0; rci < reqsAll.length; rci++) {
        var rc = reqsAll[rci];
        if (String(rc['الحالة'] || '') === 'مرفوض' &&
            normalizePhone(String(rc['رقم الجوال'] || '')) === normalizePhone(identifier)) {
          return {
            success:  false,
            rejected: true,
            reason:   String(rc['ملاحظات'] || ''),
            message:  'تم رفض طلب تسجيلك',
          };
        }
      }
    } catch(_) {}
    return { success: false, message: 'بيانات الدخول غير صحيحة' };
  }

  var member = rowToObject(found.headers, found.rowData);

  if (member['حالة الحساب'] === 'موقوف') {
    return { success: false, message: 'هذا الحساب موقوف، تواصل مع المدير' };
  }

  var hashed = hashPassword(password);

  // تحقق من كلمة المرور المؤقتة أولاً
  var tempPass   = String(member['كلمة المرور المؤقتة'] || '');
  var tempExpiry = member['انتهاء المؤقتة'];

  if (tempPass && tempPass !== '') {
    var now    = new Date();
    var expiry = new Date(tempExpiry);
    if (now <= expiry && hashed === tempPass) {
      return {
        success:       true,
        requireChange: true,
        message:       'يجب تغيير كلمة المرور المؤقتة الآن',
        user:          buildUserObject(member),
      };
    }
  }

  // تحقق من كلمة المرور الأساسية
  if (hashed !== String(member['كلمة المرور'])) {
    return { success: false, message: 'بيانات الدخول غير صحيحة' };
  }

  return {
    success: true,
    message: 'تم تسجيل الدخول بنجاح',
    user:    buildUserObject(member),
  };
}

// بحث برقم الجوال المطبّع في عمود رقم الجوال (عمود 6)
function findRowByPhone(normalizedPhone) {
  var sheet   = getSheet('الأعضاء');
  var data    = sheet.getDataRange().getValues();
  var headers = data[0];
  var col     = headers.indexOf('رقم الجوال');
  if (col === -1) return null;

  for (var i = 1; i < data.length; i++) {
    if (!data[i][0]) continue; // صف فارغ
    var stored = normalizePhone(String(data[i][col] || ''));
    if (stored === normalizedPhone) {
      return { rowIndex: i + 1, rowData: data[i], headers: headers };
    }
  }
  return null;
}

/* ═══ تسجيل عضو جديد ════════════════════════════════════════════════════ */

function register(body) {
  var firstName    = normalizeInput(body['الاسم الأول'] || body.firstName       || '');
  var fatherName   = normalizeInput(body['اسم الأب']    || body.fatherName      || '');
  var grandName    = normalizeInput(body['اسم الجد']    || body.grandfatherName || '');
  var rawPhone     =                body['رقم الجوال']  || body.phone           || '';
  var parentNodeId = normalizeInput(body.parentNodeId   || '');

  if (!firstName) return { success: false, message: 'الاسم الأول مطلوب' };
  if (!rawPhone)  return { success: false, message: 'رقم الجوال مطلوب' };

  var phone = normalizePhone(normalizeInput(rawPhone));

  // تحقق من عدم تكرار رقم الجوال
  var existingMember = findRowByPhone(phone);
  if (existingMember) {
    return { success: false, message: 'رقم الجوال مسجّل مسبقاً' };
  }

  // تحقق من طلب معلق بنفس الرقم
  var pending = sheetToObjects('طلبات التسجيل');
  var hasPending = pending.some(function(r) {
    return normalizePhone(String(r['رقم الجوال'] || '')) === phone && r['الحالة'] === 'معلق';
  });
  if (hasPending) {
    return { success: false, message: 'يوجد طلب تسجيل معلق لهذا الرقم، انتظر مراجعة المدير' };
  }

  var sheet     = getSheet('طلبات التسجيل');
  var requestId = generateId('REG');
  var today     = formatDate(new Date());

  // بناء الصف بناءً على رؤوس الأعمدة الفعلية (يدعم الأعمدة القديمة والجديدة)
  var headers = sheet.getDataRange().getValues()[0];
  var colMap = {
    'رقم الطلب':           requestId,
    'الاسم الأول':         firstName,
    'اسم الأب':            fatherName,
    'اسم الجد':            grandName,
    'الفخذ':               normalizeInput(body.branch      || body['الفخذ']             || ''),
    'الجيل':               normalizeInput(body.generation  || body['الجيل']             || ''),
    'رقم الجوال':          phone,
    'البريد الإلكتروني':   normalizeInput(body.email       || body['البريد الإلكتروني'] || ''),
    'تاريخ الميلاد':       normalizeInput(body.birthDate   || body['تاريخ الميلاد']     || ''),
    'المدينة':             normalizeInput(body.city        || body['المدينة']           || ''),
    'المهنة':              normalizeInput(body.job         || body['المهنة']            || ''),
    'الحالة':              'معلق',
    'تاريخ الطلب':         today,
    'ملاحظات':             '',
    'رقم الهوية':          normalizeInput(body.nationalId  || ''),
    'رقم عقدة الأب':       parentNodeId,
    'كلمة المرور المشفرة': body.password ? hashPassword(normalizeInput(body.password)) : '',
    'حي/ميت':              'حي',
    'الحالة الاجتماعية':   normalizeInput(body.maritalStatus || ''),
  };
  var row = headers.map(function(h) {
    return colMap[h] !== undefined ? colMap[h] : '';
  });

  sheet.appendRow(row);
  formatLastRow(sheet);

  return {
    success:   true,
    requestId: requestId,
    message:   'تم إرسال طلب التسجيل بنجاح، سيتم مراجعته من قِبَل المدير',
  };
}

/* ═══ تغيير كلمة المرور ══════════════════════════════════════════════════ */

function changePassword(body) {
  var memberId    = normalizeInput(body.memberId    || '');
  var oldPassword = normalizeInput(body.oldPassword || body.currentPassword || '');
  var newPassword = normalizeInput(body.newPassword || '');

  if (!memberId || !newPassword) {
    return { success: false, message: 'البيانات ناقصة' };
  }
  if (newPassword.length < 6) {
    return { success: false, message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' };
  }

  var found = findRow('الأعضاء', 0, memberId);
  if (!found) return { success: false, message: 'العضو غير موجود' };

  var member = rowToObject(found.headers, found.rowData);
  var isTempChange = body.isTempChange === true;

  if (!isTempChange) {
    if (hashPassword(oldPassword) !== String(member['كلمة المرور'])) {
      return { success: false, message: 'كلمة المرور القديمة غير صحيحة' };
    }
  }

  var sheet       = getSheet('الأعضاء');
  var headers     = found.headers;
  var passCol     = headers.indexOf('كلمة المرور')          + 1;
  var tempPassCol = headers.indexOf('كلمة المرور المؤقتة') + 1;
  var tempExpCol  = headers.indexOf('انتهاء المؤقتة')       + 1;

  sheet.getRange(found.rowIndex, passCol).setValue(hashPassword(newPassword));
  sheet.getRange(found.rowIndex, tempPassCol).setValue('');
  sheet.getRange(found.rowIndex, tempExpCol).setValue('');

  return { success: true, message: 'تم تغيير كلمة المرور بنجاح' };
}

/* ═══ إنشاء كلمة مرور مؤقتة (المدير فقط) ═══════════════════════════════ */

function setTempPassword(body) {
  var memberId = normalizeInput(body.memberId || '');
  if (!memberId) return { success: false, message: 'رقم العضو مطلوب' };

  var found = findRow('الأعضاء', 0, memberId);
  if (!found) return { success: false, message: 'العضو غير موجود' };

  var temp   = generateTempPassword();
  var expiry = new Date();
  expiry.setHours(expiry.getHours() + 24);

  var sheet       = getSheet('الأعضاء');
  var headers     = found.headers;
  var tempPassCol = headers.indexOf('كلمة المرور المؤقتة') + 1;
  var tempExpCol  = headers.indexOf('انتهاء المؤقتة')       + 1;

  sheet.getRange(found.rowIndex, tempPassCol).setValue(hashPassword(temp));
  sheet.getRange(found.rowIndex, tempExpCol).setValue(formatDate(expiry));

  return {
    success:      true,
    tempPassword: temp,
    expiresAt:    formatDate(expiry),
    message:      'تم إنشاء كلمة المرور المؤقتة — صالحة 24 ساعة',
  };
}

/* ═══ التحقق من رمز المدير ══════════════════════════════════════════════ */

function verifyAdminPin(body) {
  var pin = normalizeInput(body.pin || '');
  if (!pin) return { success: false, message: 'رمز المدير مطلوب' };

  // يقرأ الجدول مباشرة ويقبل أي مفتاح يحتوي على "لوحة" أو هو "رمز المدير" تحديداً
  var correct = '';
  try {
    var sheet = getSheet('الإعدادات');
    var data  = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var rowKey = String(data[i][0] || '').trim();
      var rowVal = String(data[i][1] || '').trim();
      if (!rowVal) continue;
      if (rowKey.indexOf('لوحة') !== -1 || rowKey === 'رمز المدير') {
        correct = normalizeInput(rowVal);
        break;
      }
    }
  } catch(e) { Logger.log('خطأ قراءة الإعدادات: ' + e.message); }

  if (!correct) return { success: false, message: 'لم يُعثر على رمز في الإعدادات' };
  if (pin !== correct) return { success: false, message: 'خطأ — الرمز المخزن: [' + correct + '] (طول:' + correct.length + ') | الإدخال: [' + pin + '] (طول:' + pin.length + ')' };
  return { success: true, message: 'تم التحقق بنجاح' };
}

/* ═══ بناء كائن المستخدم ════════════════════════════════════════════════ */

function buildUserObject(member) {
  var role = String(member['الدور'] || '');
  return {
    memberId:        String(member['رقم العضو']          || ''),
    firstName:       String(member['الاسم الأول']        || ''),
    fatherName:      String(member['اسم الأب']           || ''),
    grandfatherName: String(member['اسم الجد']           || ''),
    branch:          String(member['الفخذ']              || ''),
    generation:      String(member['الجيل']              || ''),
    phone:           String(member['رقم الجوال']         || ''),
    email:           String(member['البريد الإلكتروني']  || ''),
    city:            String(member['المدينة']            || ''),
    job:             String(member['المهنة']             || ''),
    birthDate:       formatDate(member['تاريخ الميلاد']),
    maritalStatus:   String(member['الحالة الاجتماعية'] || ''),
    roles:           [role === 'مدير' ? 'admin' : 'member'],
    status:          String(member['حالة الحساب']       || 'نشط'),
  };
}

/* ═══ تنسيق الصف الجديد ════════════════════════════════════════════════ */

function formatLastRow(sheet) {
  var lastRow = sheet.getLastRow();
  var cols    = sheet.getLastColumn();
  if (lastRow < 2) return;
  var range   = sheet.getRange(lastRow, 1, 1, cols);
  range.setHorizontalAlignment('center');
  range.setVerticalAlignment('middle');
  range.setFontSize(12);
  range.setWrap(true);
  sheet.setRowHeight(lastRow, 36);
}
