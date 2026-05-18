/* ═══════════════════════════════════════════════════════════════════════════
   Funds.gs — الصناديق العائلية
   ═══════════════════════════════════════════════════════════════════════════ */

/* ═══ جلب جميع الصناديق مع تفاصيلها ══════════════════════════════════════ */

function getFunds(body) {
  var funds      = sheetToObjects('الصناديق');
  var directors  = sheetToObjects('مديرو الصناديق');
  var objectives = sheetToObjects('أهداف الصناديق');
  var conditions = sheetToObjects('شروط الصناديق');

  var result = funds.map(function(f) {
    var fid = String(f['رقم الصندوق'] || '');

    var fundDirectors = directors
      .filter(function(d) { return String(d['رقم الصندوق']) === fid; })
      .sort(function(a, b) { return a['الترتيب'] - b['الترتيب']; })
      .map(function(d) {
        return {
          id:    String(d['رقم السجل'] || ''),
          name:  String(d['الاسم']     || ''),
          role:  String(d['المنصب']    || ''),
          phone: String(d['رقم الجوال'] || ''),
        };
      });

    var fundObjectives = objectives
      .filter(function(o) { return String(o['رقم الصندوق']) === fid; })
      .sort(function(a, b) { return a['الترتيب'] - b['الترتيب']; })
      .map(function(o) { return String(o['الهدف'] || ''); });

    var fundConditions = conditions
      .filter(function(c) { return String(c['رقم الصندوق']) === fid; })
      .sort(function(a, b) { return a['الترتيب'] - b['الترتيب']; })
      .map(function(c) { return String(c['الشرط'] || ''); });

    return {
      id:          fid,
      name:        String(f['الاسم']          || ''),
      description: String(f['الوصف']          || ''),
      color:       String(f['اللون']          || 'blue'),
      vision:      String(f['الرؤية']         || ''),
      createdAt:   formatDate(f['تاريخ الإنشاء']),
      status:      String(f['الحالة']         || 'نشط'),
      directors:   fundDirectors,
      objectives:  fundObjectives,
      conditions:  fundConditions,
    };
  });

  return { success: true, funds: result, total: result.length };
}

/* ═══ إنشاء صندوق جديد ═══════════════════════════════════════════════════ */

function createFund(body) {
  var fund = body.fund;
  if (!fund || !fund.name) {
    return { success: false, message: 'اسم الصندوق مطلوب' };
  }

  var fundId = generateId('F');
  var today  = formatDate(new Date());

  // أضف الصندوق الرئيسي
  var fundSheet = getSheet('الصناديق');
  fundSheet.appendRow([
    fundId,
    String(fund.name        || ''),
    String(fund.description || ''),
    String(fund.color       || 'blue'),
    String(fund.vision      || ''),
    today,
    'نشط',
  ]);
  formatLastRow(fundSheet);

  // أضف المديرين
  saveFundRelations(fundId, fund.directors  || [], 'مديرو الصناديق',  addDirectorRow);
  saveFundRelations(fundId, fund.objectives || [], 'أهداف الصناديق',  addObjectiveRow);
  saveFundRelations(fundId, fund.conditions || [], 'شروط الصناديق',   addConditionRow);

  return { success: true, fundId: fundId, message: 'تم إنشاء الصندوق بنجاح' };
}

/* ═══ تحديث صندوق ════════════════════════════════════════════════════════ */

function updateFund(body) {
  var fund = body.fund;
  if (!fund || !fund.id) return { success: false, message: 'رقم الصندوق مطلوب' };

  var fundId = String(fund.id);
  var found  = findRow('الصناديق', 0, fundId);
  if (!found) return { success: false, message: 'الصندوق غير موجود' };

  // تحديث البيانات الأساسية
  var sheet   = getSheet('الصناديق');
  var headers = found.headers;
  var rowIdx  = found.rowIndex;

  var fields = {
    'الاسم':  fund.name,
    'الوصف':  fund.description,
    'اللون':  fund.color,
    'الرؤية': fund.vision,
    'الحالة': fund.status,
  };

  Object.keys(fields).forEach(function(key) {
    if (fields[key] !== undefined) {
      var col = headers.indexOf(key) + 1;
      if (col > 0) sheet.getRange(rowIdx, col).setValue(String(fields[key]));
    }
  });

  // حذف وإعادة إضافة العلاقات
  deleteRelatedRows('مديرو الصناديق', 'رقم الصندوق', fundId);
  deleteRelatedRows('أهداف الصناديق', 'رقم الصندوق', fundId);
  deleteRelatedRows('شروط الصناديق',  'رقم الصندوق', fundId);

  saveFundRelations(fundId, fund.directors  || [], 'مديرو الصناديق', addDirectorRow);
  saveFundRelations(fundId, fund.objectives || [], 'أهداف الصناديق', addObjectiveRow);
  saveFundRelations(fundId, fund.conditions || [], 'شروط الصناديق',  addConditionRow);

  return { success: true, message: 'تم تحديث الصندوق بنجاح' };
}

/* ═══ حذف صندوق ══════════════════════════════════════════════════════════ */

function deleteFund(body) {
  var fundId = String(body.fundId || '').trim();
  if (!fundId) return { success: false, message: 'رقم الصندوق مطلوب' };

  var found = findRow('الصناديق', 0, fundId);
  if (!found) return { success: false, message: 'الصندوق غير موجود' };

  getSheet('الصناديق').deleteRow(found.rowIndex);

  // حذف جميع البيانات المرتبطة
  deleteRelatedRows('مديرو الصناديق',  'رقم الصندوق', fundId);
  deleteRelatedRows('أهداف الصناديق',  'رقم الصندوق', fundId);
  deleteRelatedRows('شروط الصناديق',   'رقم الصندوق', fundId);
  deleteRelatedRows('أعضاء الصناديق',  'رقم الصندوق', fundId);

  return { success: true, message: 'تم حذف الصندوق وجميع بياناته' };
}

/* ═══ أعضاء الصندوق ══════════════════════════════════════════════════════ */

function getFundMembers(body) {
  var fundId = String(body.fundId || '').trim();
  if (!fundId) return { success: false, message: 'رقم الصندوق مطلوب' };

  var all = sheetToObjects('أعضاء الصناديق');
  var members = all.filter(function(m) {
    return String(m['رقم الصندوق']) === fundId;
  }).map(function(m) {
    return {
      id:          String(m['رقم السجل']                 || ''),
      memberId:    String(m['رقم العضو']                 || ''),
      name:        String(m['اسم العضو']                 || ''),
      joinDate:    formatDate(m['تاريخ الاشتراك']),
      balance:     Number(m['الرصيد الحالي']             || 0),
      dues:        Number(m['الأقساط المستحقة']          || 0),
      maturityDate:formatDate(m['تاريخ اكتمال الاستحقاق']),
      totalAmount: Number(m['المبلغ الكامل']             || 0),
    };
  });

  return { success: true, members: members, total: members.length };
}

function addFundMember(body) {
  var fundId = String(body.fundId   || '').trim();
  var name   = String(body.name     || '').trim();
  if (!fundId || !name) return { success: false, message: 'رقم الصندوق والاسم مطلوبان' };

  var sheet = getSheet('أعضاء الصناديق');
  var id    = generateId('FM');
  var row   = [
    id,
    fundId,
    String(body.memberId     || ''),
    name,
    String(body.joinDate     || formatDate(new Date())),
    Number(body.balance      || 0),
    Number(body.dues         || 0),
    String(body.maturityDate || ''),
    Number(body.totalAmount  || 0),
  ];

  sheet.appendRow(row);
  formatLastRow(sheet);
  return { success: true, id: id, message: 'تم إضافة العضو للصندوق' };
}

function updateFundMember(body) {
  var id = String(body.id || '').trim();
  if (!id) return { success: false, message: 'رقم السجل مطلوب' };

  var found = findRow('أعضاء الصناديق', 0, id);
  if (!found) return { success: false, message: 'السجل غير موجود' };

  var sheet   = getSheet('أعضاء الصناديق');
  var headers = found.headers;
  var rowIdx  = found.rowIndex;

  var fields = {
    'اسم العضو':              body.name,
    'تاريخ الاشتراك':          body.joinDate,
    'الرصيد الحالي':           body.balance,
    'الأقساط المستحقة':        body.dues,
    'تاريخ اكتمال الاستحقاق': body.maturityDate,
    'المبلغ الكامل':           body.totalAmount,
  };

  Object.keys(fields).forEach(function(key) {
    if (fields[key] !== undefined) {
      var col = headers.indexOf(key) + 1;
      if (col > 0) sheet.getRange(rowIdx, col).setValue(fields[key]);
    }
  });

  return { success: true, message: 'تم تحديث بيانات العضو' };
}

function removeFundMember(body) {
  var id = String(body.id || '').trim();
  if (!id) return { success: false, message: 'رقم السجل مطلوب' };

  var found = findRow('أعضاء الصناديق', 0, id);
  if (!found) return { success: false, message: 'السجل غير موجود' };

  getSheet('أعضاء الصناديق').deleteRow(found.rowIndex);
  return { success: true, message: 'تم إزالة العضو من الصندوق' };
}

/* ═══ دوال مساعدة للصناديق ══════════════════════════════════════════════ */

function saveFundRelations(fundId, items, sheetName, addFn) {
  var sheet = getSheet(sheetName);
  items.forEach(function(item, i) {
    var row = addFn(fundId, item, i + 1);
    if (row) {
      sheet.appendRow(row);
      formatLastRow(sheet);
    }
  });
}

function addDirectorRow(fundId, d, order) {
  if (!d || !d.name) return null;
  return [generateId('D'), fundId, String(d.name || ''), String(d.role || ''), String(d.phone || '')];
}

function addObjectiveRow(fundId, obj, order) {
  if (!obj || obj === '') return null;
  return [generateId('O'), fundId, String(obj), order];
}

function addConditionRow(fundId, cond, order) {
  if (!cond || cond === '') return null;
  return [generateId('CN'), fundId, String(cond), order];
}

// حذف جميع الصفوف المرتبطة بصندوق في جدول فرعي
function deleteRelatedRows(sheetName, colName, fundId) {
  var sheet   = getSheet(sheetName);
  var data    = sheet.getDataRange().getValues();
  var headers = data[0];
  var col     = headers.indexOf(colName);
  if (col === -1) return;

  // الحذف من الأسفل للأعلى لتجنب اختلاف الأرقام
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][col]) === String(fundId)) {
      sheet.deleteRow(i + 1);
    }
  }
}
