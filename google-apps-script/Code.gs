/* ═══════════════════════════════════════════════════════════════════════════
   Code.gs — نقطة الدخول الرئيسية للـ API
   موقع عائلة السلامي — Google Apps Script
   ═══════════════════════════════════════════════════════════════════════════ */

var SS_ID = '1ZZkmGrwXT_yVGIRmWl373uuvo2YqbG5P4yX8TkCIS2Y';

/* ═══ doPost — يستقبل جميع طلبات الموقع ══════════════════════════════════ */

// طلبات القراءة الروتينية — لا تُحسب في العداد اليومي
var READ_ONLY_ACTIONS = {
  'getFamilyTree': true, 'getAdminStats': true, 'getTreeStats': true,
  'getPendingRequests': true, 'getTreeRequests': true, 'getAllMembers': true,
  'getOnlineUsers': true, 'getFunds': true, 'getFundMembers': true,
  'getArticles': true, 'getMemberData': true, 'verifyViewerCode': true, 'getSettings': true,
};

function trackApiCall(action) {
  if (READ_ONLY_ACTIONS[action]) return;
  try {
    var props = PropertiesService.getScriptProperties();
    var today = Utilities.formatDate(new Date(), 'Asia/Riyadh', 'yyyy-MM-dd');
    var key   = 'api_' + today;
    var n     = parseInt(props.getProperty(key) || '0', 10) + 1;
    props.setProperty(key, String(n));
  } catch(_) {}
}

function doPost(e) {
  try {
    var body   = JSON.parse(e.postData.contents);
    var action = body.action;

    if (!action) return respond({ success: false, message: 'لم يُحدَّد الإجراء' });

    trackApiCall(action);

    // ── المصادقة ──────────────────────────────────────────────────────────
    if (action === 'login')              return respond(login(body));
    if (action === 'register')           return respond(register(body));
    if (action === 'checkRegistrant')   return respond(checkRegistrant(body));
    if (action === 'checkChildMatch')    return respond(checkChildMatch(body));
    if (action === 'forgotPassword')     return respond(forgotPassword(body));
    if (action === 'changePassword')     return respond(changePassword(body));
    if (action === 'setTempPassword')    return respond(setTempPassword(body));
    if (action === 'verifyAdminPin') {
      var _pin  = String(body.pin || '').trim();
      var _sett = SpreadsheetApp.openById(SS_ID).getSheetByName('الإعدادات');
      var _rows = _sett ? _sett.getDataRange().getValues() : [];
      var _code = '';
      for (var _i = 1; _i < _rows.length; _i++) {
        var _k = String(_rows[_i][0] || '').trim();
        var _v = String(_rows[_i][1] || '').trim();
        if (_v && (_k.indexOf('لوحة') !== -1 || _k === 'رمز المدير')) { _code = _v; break; }
      }
      if (!_pin)  return respond({ success: false, message: 'رمز المدير مطلوب' });
      if (!_code) return respond({ success: false, message: 'لم يُعثر على رمز المدير في الإعدادات' });
      var _match = _pin === _code;
      return respond({ success: _match, message: _match ? 'تم التحقق بنجاح' : 'الرمز غير صحيح' });
    }

    // ── الأعضاء ───────────────────────────────────────────────────────────
    if (action === 'getMemberData')      return respond(getMemberData(body));
    if (action === 'updateMemberInfo')   return respond(updateMemberInfo(body));
    if (action === 'addWife')            return respond(addWife(body));
    if (action === 'updateWife')         return respond(updateWife(body));
    if (action === 'removeWife')         return respond(removeWife(body));
    if (action === 'addChild')           return respond(addChild(body));
    if (action === 'updateChild')        return respond(updateChild(body));
    if (action === 'removeChild')        return respond(removeChild(body));

    // ── الإدارة ───────────────────────────────────────────────────────────
    if (action === 'getAdminStats')      return respond(getAdminStats(body));
    if (action === 'getTreeStats')       return respond(getTreeStats(body));
    if (action === 'getPendingRequests') return respond(getPendingRequests(body));
    if (action === 'approveRequest')          return respond(approveRequest(body));
    if (action === 'rejectRequest')           return respond(rejectRequest(body));
    if (action === 'updatePendingRequest')    return respond(updatePendingRequest(body));
    if (action === 'getOnlineUsers')     return respond(getOnlineUsers(body));
    if (action === 'getAllMembers')       return respond(getAllMembers(body));
    if (action === 'toggleMemberStatus') return respond(toggleMemberStatus(body));
    if (action === 'addMember')          return respond(addMember(body));

    // ── الشجرة العائلية ───────────────────────────────────────────────────
    if (action === 'getFamilyTree')          return respond(getFamilyTree(body));
    if (action === 'submitTreeRequest')      return respond(submitTreeRequest(body));
    if (action === 'getTreeRequests')        return respond(getTreeRequests(body));
    if (action === 'approveTreeRequest')     return respond(approveTreeRequest(body));
    if (action === 'rejectTreeRequest')      return respond(rejectTreeRequest(body));
    if (action === 'updateTreeNode')          return respond(updateTreeNode(body));
    if (action === 'updateNodeAliveStatus')  return respond(updateNodeAliveStatus(body));
    if (action === 'updateWifeStatus')       return respond(updateWifeStatus(body));
    if (action === 'updateChildStatus')      return respond(updateChildStatus(body));
    if (action === 'addTreeNode')            return respond(addTreeNode(body));

    // ── مشاهد الشجرة ─────────────────────────────────────────────────────
    if (action === 'verifyViewerCode')  return respond(verifyViewerCode(body));

    // ── الصناديق ──────────────────────────────────────────────────────────
    if (action === 'getFunds')           return respond(getFunds(body));
    if (action === 'createFund')         return respond(createFund(body));
    if (action === 'updateFund')         return respond(updateFund(body));
    if (action === 'deleteFund')         return respond(deleteFund(body));
    if (action === 'getFundMembers')     return respond(getFundMembers(body));
    if (action === 'addFundMember')      return respond(addFundMember(body));
    if (action === 'updateFundMember')   return respond(updateFundMember(body));
    if (action === 'removeFundMember')   return respond(removeFundMember(body));

    // ── المقالات ──────────────────────────────────────────────────────────
    if (action === 'getArticles')        return respond(getArticles(body));
    if (action === 'createArticle')      return respond(createArticle(body));
    if (action === 'updateArticle')      return respond(updateArticle(body));
    if (action === 'deleteArticle')      return respond(deleteArticle(body));

    // ── الإعدادات العامة ──────────────────────────────────────────────────
    if (action === 'getSettings') {
      var sheet = getSheet('الإعدادات');
      var sData = sheet.getDataRange().getValues();
      var sResult = {};
      for (var si = 1; si < sData.length; si++) {
        var sKey = String(sData[si][0] || '').trim();
        var sVal = String(sData[si][1] || '').trim();
        if (sKey) sResult[sKey] = sVal;
      }
      return respond({ success: true, settings: sResult });
    }

    return respond({ success: false, message: 'إجراء غير معروف: ' + action });

  } catch (err) {
    Logger.log('خطأ في doPost: ' + err.message);
    return respond({ success: false, message: 'خطأ في الخادم: ' + err.message });
  }
}

/* ═══ doGet — للتأكد أن الـ API يعمل ════════════════════════════════════ */

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({
    status:  'ok',
    app:     'عائلة السلامي API',
    version: '1.0',
    time:    new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

/* ═══════════════════════════════════════════════════════════════════════════
   دوال مساعدة مشتركة
   ═══════════════════════════════════════════════════════════════════════════ */

// إرجاع استجابة JSON مع CORS
function respond(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// الحصول على ورقة بالاسم
function getSheet(name) {
  var ss = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('الجدول غير موجود: ' + name);
  return sheet;
}

// الحصول على جميع بيانات ورقة كمصفوفة من الكائنات
function sheetToObjects(sheetName) {
  var sheet  = getSheet(sheetName);
  var data   = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var headers = data[0];
  var rows    = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    // تجاهل الصفوف الفارغة (الخلية الأولى فارغة)
    if (!row[0] || row[0] === '') continue;
    var obj = {};
    headers.forEach(function(h, j) {
      obj[h] = row[j];
    });
    rows.push(obj);
  }
  return rows;
}

// توليد رقم تعريف فريد
function generateId(prefix) {
  var timestamp = new Date().getTime().toString().slice(-6);
  var random    = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return (prefix || '') + timestamp + random;
}

// تشفير كلمة المرور SHA-256
function hashPassword(password) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password,
    Utilities.Charset.UTF_8
  );
  return bytes.map(function(b) {
    return ('0' + (b & 0xFF).toString(16)).slice(-2);
  }).join('');
}

// توليد كلمة مرور مؤقتة عشوائية
function generateTempPassword() {
  var chars  = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  var result = '';
  for (var i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// قراءة إعداد من جدول الإعدادات
function getSetting(key) {
  var sheet = getSheet('الإعدادات');
  var data  = sheet.getDataRange().getValues();
  var k     = String(key).trim();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === k) return data[i][1];
  }
  return null;
}

// البحث عن صف في ورقة حسب عمود وقيمة
function findRow(sheetName, colIndex, value) {
  var sheet = getSheet(sheetName);
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][colIndex]) === String(value)) {
      return { rowIndex: i + 1, rowData: data[i], headers: data[0] };
    }
  }
  return null;
}

// تحويل صف إلى كائن
function rowToObject(headers, row) {
  var obj = {};
  headers.forEach(function(h, i) { obj[h] = row[i]; });
  return obj;
}

// تنسيق التاريخ للتخزين
function formatDate(date) {
  if (!date) return '';
  if (date instanceof Date) {
    return Utilities.formatDate(date, 'Asia/Riyadh', 'yyyy-MM-dd');
  }
  return String(date);
}

/* ═══ التحقق من رمز مشاهد الشجرة ════════════════════════════════════════ */
function verifyViewerCode(body) {
  var code   = String(body.code || '').trim();
  if (!code) return { success: false, message: 'الرمز مطلوب' };

  var stored = getSetting('رمز المشاهد');
  if (!stored) return { success: false, message: 'لم يُعثر على رمز المشاهد في الإعدادات' };

  var match = code === String(stored).trim();
  return { success: match, message: match ? 'تم التحقق' : 'الرمز غير صحيح' };
}
