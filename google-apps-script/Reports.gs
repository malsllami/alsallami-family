/* ═══════════════════════════════════════════════════════════════════════════
   Reports.gs — التقرير اليومي لموقع عائلة السلامي
   ═══════════════════════════════════════════════════════════════════════════ */

var REPORT_EMAIL = 'malsllami@gmail.com';

/* ═══ التقرير اليومي — تُشغَّل تلقائياً كل يوم ════════════════════════════ */
function sendDailyReport() {
  var today     = Utilities.formatDate(new Date(), 'Asia/Riyadh', 'yyyy-MM-dd');
  var todayDisp = Utilities.formatDate(new Date(), 'Asia/Riyadh', 'dd/MM/yyyy');

  /* ─── طلبات API اليوم ─────────────────────────────────────────────────── */
  var props    = PropertiesService.getScriptProperties();
  var apiCount = parseInt(props.getProperty('api_' + today) || '0', 10);

  /* ─── أعضاء جدد اليوم ────────────────────────────────────────────────── */
  var members    = sheetToObjects('الأعضاء');
  var newMembers = members.filter(function(m) {
    return formatDate(m['تاريخ التسجيل']) === today;
  });

  /* ─── إجمالي الأعضاء والنشطون ───────────────────────────────────────── */
  var totalMembers  = members.length;
  var activeMembers = members.filter(function(m) {
    return String(m['الحالة'] || '') === 'نشط';
  }).length;

  /* ─── طلبات تحتاج اعتماداً ──────────────────────────────────────────── */
  var pendingApproval = 0;
  var pendingTree     = 0;
  try { pendingApproval = sheetToObjects('طلبات القبول').filter(function(r)  { return r['الحالة'] === 'معلق'; }).length; } catch(e) {}
  try { pendingTree     = sheetToObjects('طلبات الشجرة').filter(function(r) { return r['الحالة'] === 'معلق'; }).length; } catch(e) {}
  var totalPending = pendingApproval + pendingTree;

  /* ─── بناء نص الإيميل ────────────────────────────────────────────────── */
  var lines = [
    'السلام عليكم،',
    '',
    'هذا تقريرك اليومي لموقع عائلة السلامي ليوم ' + todayDisp,
    '',
    '══════════════════════════════',
    '  نشاط اليوم',
    '══════════════════════════════',
    '',
    'طلبات API اليوم   : ' + apiCount + ' طلب',
    'أعضاء جدد اليوم  : ' + newMembers.length + ' عضو',
    '',
  ];

  if (newMembers.length > 0) {
    lines.push('الأعضاء الجدد:');
    newMembers.forEach(function(m) {
      lines.push('  • ' + (m['الاسم الأول'] || '') + ' ' + (m['اسم الأب'] || ''));
    });
    lines.push('');
  }

  lines = lines.concat([
    '══════════════════════════════',
    '  طلبات تحتاج اعتماد',
    '══════════════════════════════',
    '',
    'طلبات القبول المعلقة : ' + pendingApproval,
    'طلبات الشجرة المعلقة : ' + pendingTree,
    'الإجمالي             : ' + totalPending,
    '',
  ]);

  if (totalPending > 0) {
    lines.push('يرجى مراجعة لوحة المدير للاعتماد.');
    lines.push('');
  }

  lines = lines.concat([
    '══════════════════════════════',
    '  إحصائيات عامة',
    '══════════════════════════════',
    '',
    'إجمالي الأعضاء  : ' + totalMembers,
    'الأعضاء النشطون : ' + activeMembers,
    '',
    '══════════════════════════════',
    '',
    'رابط الموقع: https://malsllami.github.io/alsallami-family/',
    'لوحة المدير: https://malsllami.github.io/alsallami-family/admin-dashboard',
    '',
    'تم الإرسال تلقائياً — عائلة السلامي',
  ]);

  var subject = totalPending > 0
    ? '[' + totalPending + ' طلب معلق] تقرير عائلة السلامي — ' + todayDisp
    : 'تقرير عائلة السلامي — ' + todayDisp;

  MailApp.sendEmail({
    to:      REPORT_EMAIL,
    subject: subject,
    body:    lines.join('\n'),
  });

  Logger.log('تم إرسال التقرير اليومي إلى ' + REPORT_EMAIL);
}

/* ═══ إعداد التشغيل التلقائي (شغّلها مرة واحدة فقط) ═══════════════════════
   1. افتح محرر GAS
   2. اختر هذه الدالة من القائمة المنسدلة
   3. اضغط Run مرة واحدة
   ═══════════════════════════════════════════════════════════════════════════ */
function setupDailyTrigger() {
  // احذف أي trigger قديم لتجنب التكرار
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'sendDailyReport') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // trigger جديد: كل يوم بين 12 و 1 فجراً (بتوقيت المشروع)
  ScriptApp.newTrigger('sendDailyReport')
    .timeBased()
    .atHour(0)
    .everyDays(1)
    .create();

  Logger.log('تم إعداد التقرير اليومي بنجاح — سيصل كل يوم بعد منتصف الليل');
}

/* ═══ اختبار فوري — أرسل التقرير الآن للتجربة ════════════════════════════ */
function testReport() {
  sendDailyReport();
  Logger.log('تم إرسال التقرير التجريبي');
}
