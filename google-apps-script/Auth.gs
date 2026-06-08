/* ═══════════════════════════════════════════════════════════════════════════
   Auth.gs — المصادقة وإدارة كلمات المرور
   تم التحديث: إضافة دعم النموذج الجديد مع اختيار الوالد من الشجرة
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

/* ═══ تسجيل عضو جديد — مُحدَّث ═══════════════════════════════════════════ */

function register(body) {
  // البيانات الأساسية
  var firstName      = normalizeInput(body['الاسم الأول'] || body.firstName || '');
  var rawPhone       = body['رقم الجوال']  || body.phone || '';
  var rawNationalId  = normalizeInput(body['رقم الهوية'] || body.nationalId || '');
  var nationalId     = rawNationalId.replace(/[^\d]/g, '');
  var birthDate      = normalizeInput(body.birthDate || body['تاريخ الميلاد'] || '');
  var rawJob         = normalizeInput(body.job || body['المهنة'] || '');
  var jobOther       = normalizeInput(body.jobOther || '');
  var job            = rawJob === 'أخرى' ? jobOther : rawJob;
  var maritalStatus  = normalizeInput(body.maritalStatus || body['الحالة الاجتماعية'] || '');
  var password       = String(body.password || '');

  // البيانات الجديدة من النموذج المعدل
  var parentNodeId    = normalizeInput(body.parentNodeId || '');
  var parentName      = normalizeInput(body.parentName || '');
  var selectedBranch  = normalizeInput(body.selectedBranch || '');
  var treePath        = String(body.treePath || '');
  var matchingData    = body.matchingData || null;

  // البيانات القديمة (للتوافق مع النماذج القديمة)
  var fatherName     = normalizeInput(body['اسم الأب'] || body.fatherName || '');
  var grandName      = normalizeInput(body['اسم الجد'] || body.grandfatherName || '');

  // التحقق
  if (!firstName) return { success: false, message: 'الاسم الأول مطلوب' };
  if (!rawPhone) return { success: false, message: 'رقم الجوال مطلوب' };
  if (!nationalId) return { success: false, message: 'رقم الهوية مطلوب' };
  if (!/^\d{10}$/.test(nationalId)) return { success: false, message: 'رقم الهوية يجب أن يكون 10 أرقام' };
  if (!birthDate) return { success: false, message: 'تاريخ الميلاد مطلوب' };
  if (!job) return { success: false, message: 'المهنة مطلوبة' };
  if (!maritalStatus) return { success: false, message: 'الحالة الاجتماعية مطلوبة' };
  if (!password || password.length < 6) return { success: false, message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' };

  var phone = normalizePhone(normalizeInput(rawPhone));

  // تحقق من عدم تكرار رقم الجوال
  var existingMember = findRowByPhone(phone);
  if (existingMember) {
    return { success: false, message: 'رقم الجوال مسجّل مسبقاً' };
  }

  // تحقق من وجود طلب سابق بنفس رقم الهوية أو الجوال
  var prevReqs = sheetToObjects('طلبات التسجيل');
  for (var pi = 0; pi < prevReqs.length; pi++) {
    var pr = prevReqs[pi];
    var prNid = String(pr['رقم الهوية'] || '').replace(/[^\d]/g, '').trim();
    var prPh  = normalizePhone(String(pr['رقم الجوال'] || ''));
    if (prNid !== nationalId && prPh !== phone) continue;
    var prStatus = String(pr['الحالة'] || '');
    if (prStatus === 'معلق') {
      return { success: false, status: 'pending', message: 'طلبك قيد المراجعة من قِبَل المدير، يُرجى الانتظار' };
    }
    if (prStatus === 'مرفوض') {
      var reason = String(pr['ملاحظات'] || '').trim();
      var rejMsg = reason
        ? 'تم رفض طلب تسجيلك من قِبَل المدير — السبب: ' + reason
        : 'تم رفض طلب تسجيلك من قِبَل المدير';
      return { success: false, status: 'rejected', message: rejMsg };
    }
  }

  var sheet     = getSheet('طلبات التسجيل');
  var requestId = generateId('REG');
  var today     = formatDate(new Date());

  // بناء الصف بناءً على رؤوس الأعمدة الفعلية
  var headers = sheet.getDataRange().getValues()[0];
  var colMap = {
    'رقم الطلب':            requestId,
    'الاسم الأول':          firstName,
    'اسم الأب':             fatherName,
    'اسم الجد':             grandName,
    'الفخذ':                normalizeInput(body.branch || body['الفخذ'] || selectedBranch),
    'الجيل':                normalizeInput(body.generation || body['الجيل'] || ''),
    'رقم الجوال':           phone,
    'البريد الإلكتروني':    normalizeInput(body.email || body['البريد الإلكتروني'] || ''),
    'تاريخ الميلاد':        birthDate,
    'المدينة':              normalizeInput(body.city || body['المدينة'] || ''),
    'المهنة':               job,
    'الحالة':               'معلق',
    'تاريخ الطلب':          today,
    'ملاحظات':              '',
    'رقم الهوية':           nationalId,
    'رقم عقدة الأب':        parentNodeId,
    'اسم الوالد':           parentName,
    'الفخذ المختار':        selectedBranch,
    'المسار الشجري':        treePath,
    'بيانات المطابقة':      matchingData ? JSON.stringify(matchingData) : '',
    'رقم عقدة الابن':       normalizeInput(body.sonNodeId  || ''),
    'رقم العقدة الذاتية':  normalizeInput(body.selfNodeId || ''),
    'كلمة المرور المشفرة':  hashPassword(password),
    'حي/ميت':               'حي',
    'الحالة الاجتماعية':    maritalStatus,
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

/* ═══ التحقق من وجود رقم هوية في النظام قبل التسجيل ═══════════════════ */

function checkRegistrant(body) {
  try {
    var nationalId = String(body.nationalId || '').replace(/[^\d]/g, '').trim();
    if (nationalId.length !== 10) return { success: true, found: false };

    // 1) تحقق من جدول الأبناء — تم إضافته من قِبَل والده
    var childRecs = sheetToObjects('الأبناء');
    for (var ci = 0; ci < childRecs.length; ci++) {
      var cr   = childRecs[ci];
      var crNid = String(cr['رقم الهوية'] || '').replace(/[^\d]/g, '').trim();
      if (crNid !== nationalId) continue;

      var fMId      = String(cr['رقم العضو الأب']  || '').trim();
      var fNodeId   = String(cr['رقم عقدة الأب']   || '').trim();
      var childPreId = String(cr['رقم عضو الابن']  || '').trim();

      // إذا كان للابن رقم عضو مسبق → تحقق أنه لم يُسجَّل بعد
      if (childPreId) {
        var mems = sheetToObjects('الأعضاء');
        for (var mi = 0; mi < mems.length; mi++) {
          if (String(mems[mi]['رقم العضو'] || '') === childPreId &&
              String(mems[mi]['رقم الجوال'] || '').trim()) {
            return { success: true, found: true, type: 'already_registered',
                     message: 'هذا الرقم مسجَّل مسبقاً، يرجى تسجيل الدخول' };
          }
        }
      }

      // ابحث عن معلومات عقدة الأب في الشجرة
      var treeNodes  = sheetToObjects('الشجرة العائلية');
      var fatherNode = null;
      for (var ti = 0; ti < treeNodes.length; ti++) {
        var tn = treeNodes[ti];
        if ((fNodeId  && String(tn['رقم العقدة'] || '') === fNodeId) ||
            (fMId     && String(tn['رقم العضو']  || '') === fMId)) {
          fatherNode = tn; break;
        }
      }

      return {
        success:        true,
        found:          true,
        type:           'child_record',
        childName:      String(cr['الاسم'] || '').trim(),
        fatherMemberId: fMId,
        fatherNodeId:   fatherNode ? String(fatherNode['رقم العقدة'] || '') : fNodeId,
        fatherName:     fatherNode ? String(fatherNode['اسم العضو']  || '') : '',
        fatherPath:     fatherNode ? String(fatherNode['المسار']     || '') : '',
      };
    }

    // 2) تحقق من جدول الأعضاء — أضافه المدير دون تسجيل (بدون جوال أو كلمة مرور)
    var members = sheetToObjects('الأعضاء');
    for (var mi2 = 0; mi2 < members.length; mi2++) {
      var m    = members[mi2];
      var mNid  = String(m['رقم الهوية']  || '').replace(/[^\d]/g, '').trim();
      var mPh   = String(m['رقم الجوال']  || '').trim();
      var mPw   = String(m['كلمة المرور'] || '').trim();
      if (mNid === nationalId && (!mPh || !mPw)) {
        return {
          success:    true,
          found:      true,
          type:       'admin_member',
          memberId:   String(m['رقم العضو']  || ''),
          firstName:  String(m['الاسم الأول'] || ''),
          fatherName: String(m['اسم الأب']   || ''),
          message:    'وُجد حسابك في النظام — بياناتك ستُكمَل تلقائياً عند قبول الطلب',
        };
      }
    }

    return { success: true, found: false };
  } catch (err) {
    Logger.log('خطأ checkRegistrant: ' + err.message);
    return { success: true, found: false };
  }
}

/* ═══ التحقق من مطابقة الابن — جديد ════════════════════════════════════ */

function checkChildMatch(body) {
  try {
    var fatherNodeId = String(body.fatherNodeId || '').trim();
    var firstName    = String(body.firstName || '').trim();
    var nationalId   = String(body.nationalId || '').trim();
    var birthDate    = String(body.birthDate || '').trim();

    if (!fatherNodeId) return { success: false, message: 'رقم عقدة الوالد مطلوب' };
    if (!firstName)    return { success: false, message: 'الاسم مطلوب' };

    // ابحث في جدول الأبناء: أولاً بعمود رقم عقدة الأب (الصفوف الجديدة)
    // ثم fallback لعمود رقم العضو الأب عبر الشجرة (الصفوف القديمة)
    var treeNodes  = sheetToObjects('الشجرة العائلية');
    var fatherNode = null;
    for (var t = 0; t < treeNodes.length; t++) {
      if (String(treeNodes[t]['رقم العقدة'] || '').trim() === fatherNodeId) {
        fatherNode = treeNodes[t];
        break;
      }
    }
    var fatherMemberId = fatherNode ? String(fatherNode['رقم العضو'] || '').trim() : '';

    var children = sheetToObjects('الأبناء');
    var matches  = [];

    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      var childNodeRef   = String(child['رقم عقدة الأب']  || '').trim();
      var childMemberRef = String(child['رقم العضو الأب'] || '').trim();
      var matchesFather  = (childNodeRef && childNodeRef === fatherNodeId) ||
                           (fatherMemberId && childMemberRef === fatherMemberId);
      if (!matchesFather) continue;

      var childName = String(child['الاسم']         || '').trim();
      var childNid  = String(child['رقم الهوية']    || '').trim();
      var childBd   = String(child['تاريخ الميلاد'] || '').trim();

      // مطابقة دقيقة: اسم + هوية + تاريخ ميلاد
      if (childName === firstName && childNid && childNid === nationalId && childBd && childBd === birthDate) {
        return { success: true, found: true, child: child, matchType: 'exact' };
      }

      // اسم + هوية
      if (childName === firstName && childNid && childNid === nationalId) {
        matches.push({ child: child, matchType: 'name_nid' });
        continue;
      }

      // اسم + تاريخ ميلاد
      if (childName === firstName && childBd && childBd === birthDate) {
        matches.push({ child: child, matchType: 'name_bd' });
        continue;
      }

      // اسم فقط (أضعف)
      if (childName === firstName) {
        matches.push({ child: child, matchType: 'name_only' });
      }
    }

    if (matches.length > 0) {
      return { success: true, found: true, child: matches[0].child, matchType: matches[0].matchType };
    }

    return { success: true, found: false, message: 'لم يتم العثور على مطابقة' };

  } catch (err) {
    Logger.log('خطأ في checkChildMatch: ' + err.message);
    return { success: false, message: 'خطأ في التحقق: ' + err.message };
  }
}

/* ═══ نسيت كلمة المرور ═══════════════════════════════════════════════════ */

function forgotPassword(body) {
  var nationalId = normalizeInput(body.nationalId || '').replace(/[^\d]/g, '');
  var phone      = normalizePhone(normalizeInput(body.phone || ''));

  if (!nationalId || nationalId.length !== 10) {
    return { success: false, status: 'invalid', message: 'رقم الهوية يجب أن يكون 10 أرقام' };
  }
  if (!phone || phone.length < 9) {
    return { success: false, status: 'invalid', message: 'رقم الجوال غير صحيح' };
  }

  // 1) تحقق من جدول الأعضاء (معتمد)
  var members = sheetToObjects('الأعضاء');
  for (var mi = 0; mi < members.length; mi++) {
    var m    = members[mi];
    var mNid = String(m['رقم الهوية']  || '').replace(/[^\d]/g, '').trim();
    var mPh  = normalizePhone(String(m['رقم الجوال'] || ''));
    if (mNid !== nationalId || mPh !== phone) continue;

    // عضو معتمد — أنشئ كلمة مرور مؤقتة ثابتة 123456
    var memberId = String(m['رقم العضو'] || '');
    var mFound   = findRow('الأعضاء', 0, memberId);
    if (mFound) {
      var mSheet      = getSheet('الأعضاء');
      var mHdrs       = mFound.headers;
      var mainPassCol = mHdrs.indexOf('كلمة المرور')          + 1;
      var tempPassCol = mHdrs.indexOf('كلمة المرور المؤقتة') + 1;
      var tempExpCol  = mHdrs.indexOf('انتهاء المؤقتة')       + 1;
      var hashed      = hashPassword('123456');
      var expiry      = new Date();
      expiry.setDate(expiry.getDate() + 30);
      // نضع الكلمة في المؤقتة (لتفعيل requireChange) وفي الأساسية (لقبول حقل "الحالية")
      if (tempPassCol > 0) mSheet.getRange(mFound.rowIndex, tempPassCol).setValue(hashed);
      if (tempExpCol  > 0) mSheet.getRange(mFound.rowIndex, tempExpCol).setValue(formatDate(expiry));
      if (mainPassCol > 0) mSheet.getRange(mFound.rowIndex, mainPassCol).setValue(hashed);
    }
    return {
      success: true,
      status:  'approved',
      message: 'كلمة مرورك المؤقتة هي: 123456 — ادخل الآن وستُطلب منك تغييرها فوراً',
    };
  }

  // 2) تحقق من طلبات التسجيل (معلق أو مرفوض)
  var reqs = sheetToObjects('طلبات التسجيل');
  for (var ri = 0; ri < reqs.length; ri++) {
    var r    = reqs[ri];
    var rNid = String(r['رقم الهوية']  || '').replace(/[^\d]/g, '').trim();
    var rPh  = normalizePhone(String(r['رقم الجوال'] || ''));
    if (rNid !== nationalId || rPh !== phone) continue;
    var status = String(r['الحالة'] || '');
    if (status === 'معلق') {
      return { success: false, status: 'pending',  message: 'طلبك قيد المراجعة من قِبَل المدير، يُرجى الانتظار' };
    }
    if (status === 'مرفوض') {
      return { success: false, status: 'rejected', message: 'تم رفض طلب تسجيلك من قِبَل المدير' };
    }
  }

  return { success: false, status: 'not_found', message: 'البيانات غير صحيحة — تحقق من رقم الهوية ورقم الجوال' };
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
  if (pin !== correct) return { success: false, message: 'الرمز غير صحيح' };
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
