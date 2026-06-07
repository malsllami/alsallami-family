/* ═══════════════════════════════════════════════════════════════════════════
   setup.gs — إعداد جداول موقع عائلة السلامي  v2.1
   ═══════════════════════════════════════════════════════════════════════════ */

var SPREADSHEET_ID = '1ZZkmGrwXT_yVGIRmWl373uuvo2YqbG5P4yX8TkCIS2Y';

/* ══ بيانات المدير تُقرأ من جدول الإعدادات — لا توجد بيانات مشفّرة هنا ══
   بعد تشغيل createAllSheets، افتح جدول الإعدادات وأدخل البيانات التالية:
   • اسم المدير
   • رقم جوال المدير
   • الرمز السري كعضو
   • الرمز السري للوحة المدير
   ثم شغّل setupFirstAdmin                                                 */

/* ══ ألوان رؤوس الجداول ══════════════════════════════════════════════════ */
var CLR = {
  members:  '#0d3b6e',   // أزرق داكن   — الأعضاء والتسجيل
  family:   '#1a4a2e',   // أخضر داكن   — الأسرة (زوجات، أبناء)
  tree:     '#1a3d4a',   // تيل داكن    — الشجرة
  funds:    '#4a2e0d',   // بني داكن    — الصناديق
  articles: '#2e0d4a',   // بنفسجي داكن — المقالات
  settings: '#2a2a2a',   // رمادي داكن  — الإعدادات
};

/* ═══════════════════════════════════════════════════════════════════════════
   تعريف الجداول — كل الكود يقرأ بالاسم لا بالموضع (header-based)
   ═══════════════════════════════════════════════════════════════════════════ */

function getSheetDefs() {
  return [

    /* ─── 1. الأعضاء ─────────────────────────────────────────────────────── */
    {
      name:  'الأعضاء',
      color: CLR.members,
      headers: [
        'رقم العضو', 'الاسم الأول', 'اسم الأب', 'اسم الجد',
        'الفخذ', 'الجيل', 'رقم الجوال', 'البريد الإلكتروني',
        'تاريخ الميلاد', 'العمر', 'المدينة', 'المهنة', 'الحالة الاجتماعية',
        'كلمة المرور', 'كلمة المرور المؤقتة', 'انتهاء المؤقتة',
        'الدور', 'حالة الحساب', 'تاريخ التسجيل',
        'رقم الهوية', 'حي/ميت'
      ],
      widths: [
        120, 160, 150, 150,
        160, 120, 140, 210,
        140,  80, 140, 150, 140,
        220, 220, 170,
        100, 130, 160,
        140, 100
      ],
    },

    /* ─── 2. طلبات التسجيل ───────────────────────────────────────────────── */
    {
      name:  'طلبات التسجيل',
      color: CLR.members,
      headers: [
        'رقم الطلب', 'الاسم الأول', 'اسم الأب', 'اسم الجد',
        'الفخذ', 'الجيل', 'رقم الجوال', 'البريد الإلكتروني',
        'تاريخ الميلاد', 'المدينة', 'المهنة', 'الحالة الاجتماعية',
        'الحالة', 'تاريخ الطلب', 'ملاحظات',
        'رقم الهوية', 'رقم عقدة الأب', 'كلمة المرور المشفرة', 'حي/ميت',
        'اسم الوالد', 'الفخذ المختار', 'المسار الشجري', 'بيانات المطابقة'
      ],
      widths: [
        120, 160, 150, 150,
        160, 120, 140, 210,
        140, 140, 150, 140,
        120, 160, 280,
        140, 150, 220, 100,
        160, 140, 320, 280
      ],
    },

    /* ─── 3. الزوجات ─────────────────────────────────────────────────────── */
    {
      name:  'الزوجات',
      color: CLR.family,
      headers: ['رقم السجل', 'رقم العضو', 'اسم الزوجة', 'عائلة الزوجة', 'حالة الزواج', 'حي/ميت', 'ملاحظات'],
      widths:  [120, 120, 210, 190, 130, 100, 280],
    },

    /* ─── 4. الأبناء ─────────────────────────────────────────────────────── */
    {
      name:  'الأبناء',
      color: CLR.family,
      headers: ['رقم السجل', 'رقم العضو الأب', 'رقم عقدة الأب', 'الاسم', 'الجنس', 'تاريخ الميلاد', 'حي/ميت', 'المهنة', 'رقم الهوية', 'رقم عضو الابن', 'ملاحظات'],
      widths:  [120, 150, 150, 190, 100, 150, 100, 130, 140, 140, 280],
    },

    /* ─── 5. الشجرة العائلية ─────────────────────────────────────────────── */
    {
      name:  'الشجرة العائلية',
      color: CLR.tree,
      headers: [
        'رقم العقدة', 'رقم العضو', 'اسم العضو',
        'رقم الأب', 'اسم الأب', 'مستوى الجيل', 'المسار', 'حي/ميت'
      ],
      widths: [120, 120, 190, 120, 190, 130, 320, 100],
    },

    /* ─── 6. طلبات الشجرة ────────────────────────────────────────────────── */
    {
      name:  'طلبات الشجرة',
      color: CLR.tree,
      headers: [
        'رقم الطلب', 'رقم العضو', 'اسم العضو',
        'رقم الأب المقترح', 'اسم الأب المقترح',
        'مستوى الجيل', 'المسار', 'الحالة', 'تاريخ الطلب', 'ملاحظات'
      ],
      widths: [120, 120, 190, 150, 210, 130, 320, 120, 160, 280],
    },

    /* ─── 7. الصناديق ────────────────────────────────────────────────────── */
    {
      name:  'الصناديق',
      color: CLR.funds,
      headers: ['رقم الصندوق', 'الاسم', 'الوصف', 'اللون', 'الرؤية', 'تاريخ الإنشاء', 'الحالة'],
      widths:  [130, 210, 320, 100, 380, 160, 120],
    },

    /* ─── 8. مديرو الصناديق ──────────────────────────────────────────────── */
    {
      name:  'مديرو الصناديق',
      color: CLR.funds,
      headers: ['رقم السجل', 'رقم الصندوق', 'الاسم', 'المنصب', 'رقم الجوال'],
      widths:  [120, 130, 210, 190, 150],
    },

    /* ─── 9. أهداف الصناديق ──────────────────────────────────────────────── */
    {
      name:  'أهداف الصناديق',
      color: CLR.funds,
      headers: ['رقم السجل', 'رقم الصندوق', 'الهدف', 'الترتيب'],
      widths:  [120, 130, 430, 100],
    },

    /* ─── 10. شروط الصناديق ─────────────────────────────────────────────── */
    {
      name:  'شروط الصناديق',
      color: CLR.funds,
      headers: ['رقم السجل', 'رقم الصندوق', 'الشرط', 'الترتيب'],
      widths:  [120, 130, 430, 100],
    },

    /* ─── 11. أعضاء الصناديق ────────────────────────────────────────────── */
    {
      name:  'أعضاء الصناديق',
      color: CLR.funds,
      headers: [
        'رقم السجل', 'رقم الصندوق', 'رقم العضو', 'اسم العضو',
        'تاريخ الاشتراك', 'الرصيد الحالي', 'الأقساط المستحقة',
        'تاريخ اكتمال الاستحقاق', 'المبلغ الكامل'
      ],
      widths: [120, 130, 120, 210, 160, 150, 170, 210, 160],
    },

    /* ─── 12. المقالات ───────────────────────────────────────────────────── */
    {
      name:  'المقالات',
      color: CLR.articles,
      headers: [
        'رقم المقال', 'النوع', 'العنوان', 'التصنيف', 'الوصف',
        'التاريخ', 'رابط الخريطة', 'اسم الموقع', 'المنطقة',
        'نص المقال', 'نص تفصيلي', 'مقدمة القبائل', 'تاريخ النشر'
      ],
      widths: [120, 100, 260, 150, 320, 130, 380, 210, 210, 430, 430, 320, 160],
    },

    /* ─── 13. قبائل المقال ───────────────────────────────────────────────── */
    {
      name:  'قبائل المقال',
      color: CLR.articles,
      headers: ['رقم السجل', 'رقم المقال', 'اسم القبيلة', 'الوصف', 'الترتيب'],
      widths:  [120, 120, 210, 400, 100],
    },

    /* ─── 14. قرى المقال ─────────────────────────────────────────────────── */
    {
      name:  'قرى المقال',
      color: CLR.articles,
      headers: ['رقم السجل', 'رقم المقال', 'اسم القرية', 'الوصف', 'مميزة', 'الترتيب'],
      widths:  [120, 120, 210, 400, 100, 100],
    },

    /* ─── 15. المعلومات الجغرافية ────────────────────────────────────────── */
    {
      name:  'المعلومات الجغرافية',
      color: CLR.articles,
      headers: ['رقم السجل', 'رقم المقال', 'التسمية', 'القيمة', 'الترتيب'],
      widths:  [120, 120, 210, 320, 100],
    },

    /* ─── 16. الإعدادات ─────────────────────────────────────────────────── */
    {
      name:       'الإعدادات',
      color:      CLR.settings,
      headers:    ['المفتاح', 'القيمة'],
      widths:     [260, 480],
      isSettings: true,
    },

  ];
}

/* ═══════════════════════════════════════════════════════════════════════════
   setupFamilyTreeFounders — زرع أجداد الشجرة الأساسيين
   شغّل هذه الدالة مرة واحدة فقط بعد إنشاء الجداول
   ═══════════════════════════════════════════════════════════════════════════ */

function setupFamilyTreeFounders() {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('الشجرة العائلية');
  if (!sheet) { Logger.log('جدول الشجرة العائلية غير موجود'); return; }

  var headers = sheet.getDataRange().getValues()[0];

  // تحقق من عدم وجود بيانات مسبقة
  var existing = sheet.getDataRange().getValues();
  for (var i = 1; i < existing.length; i++) {
    if (String(existing[i][0] || '').trim() !== '') {
      Logger.log('⚠️ الجدول يحتوي على بيانات مسبقة — لم يتم التعديل. احذف الصفوف يدوياً إذا أردت إعادة الزرع.');
      return;
    }
  }

  // تعريف الأجداد
  var N_IBRAHIM = 'N_IBRAHIM_ROOT';
  var N_AHMAD   = 'N_AHMAD';
  var N_SAHEB1  = 'N_SAHEB1';
  var N_MOHD    = 'N_MOHD';

  var founders = [
    // الجيل الأول — الجد الأكبر
    { 'رقم العقدة': N_IBRAHIM, 'رقم العضو': '', 'اسم العضو': 'إبراهيم العفريتي',
      'رقم الأب': '', 'اسم الأب': '', 'مستوى الجيل': 1,
      'المسار': 'إبراهيم العفريتي', 'حي/ميت': 'متوفى' },

    // الجيل الثاني
    { 'رقم العقدة': N_AHMAD, 'رقم العضو': '', 'اسم العضو': 'أحمد',
      'رقم الأب': N_IBRAHIM, 'اسم الأب': 'إبراهيم العفريتي', 'مستوى الجيل': 2,
      'المسار': 'إبراهيم العفريتي ← أحمد', 'حي/ميت': 'متوفى' },

    // الجيل الثالث
    { 'رقم العقدة': N_SAHEB1, 'رقم العضو': '', 'اسم العضو': 'صاحب',
      'رقم الأب': N_AHMAD, 'اسم الأب': 'أحمد', 'مستوى الجيل': 3,
      'المسار': 'إبراهيم العفريتي ← أحمد ← صاحب', 'حي/ميت': 'متوفى' },

    // الجيل الرابع
    { 'رقم العقدة': N_MOHD, 'رقم العضو': '', 'اسم العضو': 'محمد',
      'رقم الأب': N_SAHEB1, 'اسم الأب': 'صاحب', 'مستوى الجيل': 4,
      'المسار': 'إبراهيم العفريتي ← أحمد ← صاحب ← محمد', 'حي/ميت': 'متوفى' },

    // الجيل الخامس — أبناء محمد
    { 'رقم العقدة': 'N_SAHEB2', 'رقم العضو': '', 'اسم العضو': 'صاحب',
      'رقم الأب': N_MOHD, 'اسم الأب': 'محمد', 'مستوى الجيل': 5,
      'المسار': 'إبراهيم العفريتي ← أحمد ← صاحب ← محمد ← صاحب', 'حي/ميت': 'متوفى' },

    { 'رقم العقدة': 'N_SHAMI', 'رقم العضو': '', 'اسم العضو': 'شامي',
      'رقم الأب': N_MOHD, 'اسم الأب': 'محمد', 'مستوى الجيل': 5,
      'المسار': 'إبراهيم العفريتي ← أحمد ← صاحب ← محمد ← شامي', 'حي/ميت': 'متوفى' },

    { 'رقم العقدة': 'N_YAHYA', 'رقم العضو': '', 'اسم العضو': 'يحيى',
      'رقم الأب': N_MOHD, 'اسم الأب': 'محمد', 'مستوى الجيل': 5,
      'المسار': 'إبراهيم العفريتي ← أحمد ← صاحب ← محمد ← يحيى', 'حي/ميت': 'متوفى' },

    { 'رقم العقدة': 'N_ALI', 'رقم العضو': '', 'اسم العضو': 'علي',
      'رقم الأب': N_MOHD, 'اسم الأب': 'محمد', 'مستوى الجيل': 5,
      'المسار': 'إبراهيم العفريتي ← أحمد ← صاحب ← محمد ← علي', 'حي/ميت': 'متوفى' },

    { 'رقم العقدة': 'N_IBRAHIM2', 'رقم العضو': '', 'اسم العضو': 'إبراهيم',
      'رقم الأب': N_MOHD, 'اسم الأب': 'محمد', 'مستوى الجيل': 5,
      'المسار': 'إبراهيم العفريتي ← أحمد ← صاحب ← محمد ← إبراهيم', 'حي/ميت': 'متوفى' },
  ];

  founders.forEach(function(node) {
    var row = headers.map(function(h) { return node[h] !== undefined ? node[h] : ''; });
    sheet.appendRow(row);
  });

  Logger.log('✅ تم زرع ' + founders.length + ' عقدة في شجرة العائلة بنجاح');
}

/* ═══════════════════════════════════════════════════════════════════════════
   fullSetup — إنشاء كامل من الصفر (جداول + مدير + رمز)
   ═══════════════════════════════════════════════════════════════════════════ */

function fullSetup() {
  var ui  = SpreadsheetApp.getUi();
  var res = ui.alert(
    '🚀 إعداد كامل من الصفر',
    'سيتم:\n• حذف جميع بيانات الجداول الموجودة\n• إعادة إنشاء الجداول بالأعمدة الجديدة\n\n' +
    'بعد الإنشاء:\n1. افتح جدول الإعدادات\n2. أدخل بيانات المدير (الاسم، الجوال، كلمة المرور، رمز اللوحة)\n3. شغّل "إنشاء حساب المدير فقط"\n\nهل تريد المتابعة؟',
    ui.ButtonSet.YES_NO
  );
  if (res !== ui.Button.YES) return;

  createAllSheets_();

  ui.alert(
    '✅ تم إنشاء الجداول',
    'الخطوة التالية:\n1. افتح جدول "الإعدادات"\n2. أدخل بيانات المدير في الأسطر المخصصة\n3. شغّل القائمة: إنشاء حساب المدير فقط\n4. شغّل: زرع بيانات الشجرة الأساسية',
    ui.ButtonSet.OK
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   إنشاء الجداول
   ═══════════════════════════════════════════════════════════════════════════ */

function createAllSheets_() {
  var ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
  var defs = getSheetDefs();

  defs.forEach(function(def) {
    Logger.log('إنشاء: ' + def.name);
    buildSheet_(ss, def);
  });

  // احذف الأوراق الافتراضية الفارغة
  ['Sheet1', 'ورقة1', 'Feuille 1'].forEach(function(n) {
    var s = ss.getSheetByName(n);
    if (s && ss.getNumSheets() > 1) ss.deleteSheet(s);
  });

  // رتّب الأوراق
  defs.forEach(function(def, i) {
    var s = ss.getSheetByName(def.name);
    if (s) { ss.setActiveSheet(s); ss.moveActiveSheet(i + 1); }
  });

  SpreadsheetApp.flush();
  Logger.log('✅ تم إنشاء ' + defs.length + ' جداول');
}

/* زر منفصل في القائمة */
function createAllSheets() {
  createAllSheets_();
  Browser.msgBox('✅ تم', 'تم إنشاء جميع الجداول.\nشغّل setupFirstAdmin لإنشاء حساب المدير.', Browser.Buttons.OK);
}

/* ═══════════════════════════════════════════════════════════════════════════
   بناء ورقة واحدة
   ═══════════════════════════════════════════════════════════════════════════ */

function buildSheet_(ss, def) {
  var sheet = ss.getSheetByName(def.name);
  if (sheet) { sheet.clear(); } else { sheet = ss.insertSheet(def.name); }

  var cols      = def.headers.length;
  var ROWS_INIT = 500;

  /* رأس الجدول */
  var hRange = sheet.getRange(1, 1, 1, cols);
  hRange.setValues([def.headers]);
  hRange.setBackground(def.color || '#0d3b6e');
  hRange.setFontColor('#FFFFFF');
  hRange.setFontWeight('bold');
  hRange.setFontSize(14);
  hRange.setHorizontalAlignment('center');
  hRange.setVerticalAlignment('middle');
  hRange.setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
  sheet.setRowHeight(1, 48);
  sheet.setFrozenRows(1);

  /* عرض الأعمدة */
  def.widths.forEach(function(w, i) { sheet.setColumnWidth(i + 1, w); });

  /* حدود */
  sheet.getRange(1, 1, ROWS_INIT, cols).setBorder(
    true, true, true, true, true, true,
    '#b0b0b0', SpreadsheetApp.BorderStyle.SOLID
  );

  /* تنسيق خلايا البيانات */
  var dRange = sheet.getRange(2, 1, ROWS_INIT - 1, cols);
  dRange.setHorizontalAlignment('center');
  dRange.setVerticalAlignment('middle');
  dRange.setWrap(true);
  dRange.setFontSize(12);
  for (var r = 2; r <= Math.min(ROWS_INIT, 200); r++) {
    sheet.setRowHeight(r, 36);
  }

  /* لون تبادلي للجداول الصغيرة */
  if (def.isSettings || cols <= 5) {
    for (var i = 0; i < 30; i++) {
      sheet.getRange(i + 2, 1, 1, cols)
           .setBackground(i % 2 === 0 ? '#f5f7fa' : '#ffffff');
    }
  }

  /* عمود العمر — يُكتب كرقم ثابت عند الإضافة، لا كمعادلة */
  if (def.headers) {
    var ageTargetIdx2 = def.headers.indexOf('العمر') + 1;
    if (ageTargetIdx2 > 0) {
      sheet.getRange(1, ageTargetIdx2)
           .setBackground('#1a5c1a')
           .setNote('يُحسب تلقائياً عند إضافة العضو — رقم ثابت لا تعدّله');
    }
  }

  /* الإعدادات الافتراضية */
  if (def.isSettings) { addDefaultSettings_(sheet); }
}

/* ═══════════════════════════════════════════════════════════════════════════
   الإعدادات الافتراضية
   ═══════════════════════════════════════════════════════════════════════════ */

function addDefaultSettings_(sheet) {
  var today = Utilities.formatDate(new Date(), 'Asia/Riyadh', 'yyyy-MM-dd');
  var rows = [
    // ── بيانات المدير — أدخلها يدوياً في الجدول ──
    ['اسم المدير',                ''],
    ['رقم جوال المدير',           ''],
    ['الرمز السري كعضو',          ''],
    ['الرمز السري للوحة المدير',  ''],
    // ── بيانات التواصل ──
    ['جوال التواصل',              ''],
    ['ايميل التواصل',             ''],
    // ── إعدادات الموقع ──
    ['اسم العائلة',               'السلامي'],
    ['رابط الخريطة الرئيسية',     'https://maps.google.com'],
    ['نسخة السكريبت',             '2.1'],
    ['تاريخ الإنشاء',             today],
  ];

  sheet.getRange(2, 1, rows.length, 2).setValues(rows);

  for (var i = 0; i < rows.length; i++) {
    var rowIdx = i + 2;
    var isEmpty = rows[i][1] === '';
    sheet.getRange(rowIdx, 1, 1, 2).setBackground(i % 2 === 0 ? '#f0f4f8' : '#ffffff');
    sheet.getRange(rowIdx, 1).setFontWeight('bold').setFontColor('#333333');
    sheet.getRange(rowIdx, 2)
      .setFontColor(isEmpty ? '#cc0000' : '#0d3b6e')
      .setNote(isEmpty ? '⬅ أدخل القيمة هنا' : '');
    sheet.setRowHeight(rowIdx, 42);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   إنشاء حساب المدير — يقرأ الأعمدة بالاسم (لا يتأثر بترتيب الأعمدة)
   ═══════════════════════════════════════════════════════════════════════════ */

function setupFirstAdmin_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  /* ── اقرأ بيانات المدير من جدول الإعدادات ── */
  var settSheet = ss.getSheetByName('الإعدادات');
  if (!settSheet) {
    Browser.msgBox('❌ خطأ', 'جدول الإعدادات غير موجود. شغّل "إنشاء الجداول فقط" أولاً.', Browser.Buttons.OK);
    return;
  }

  var adminName     = '';
  var adminPhone    = '';
  var adminPassword = '';

  var settData = settSheet.getDataRange().getValues();
  for (var s = 1; s < settData.length; s++) {
    var key = String(settData[s][0] || '').trim();
    var val = String(settData[s][1] || '').trim();
    if (key === 'اسم المدير')               adminName     = val;
    if (key === 'رقم جوال المدير')          adminPhone    = val;
    if (key === 'الرمز السري كعضو')         adminPassword = val;
  }

  if (!adminPhone || !adminPassword) {
    Browser.msgBox(
      '⚠️ بيانات ناقصة',
      'أدخل البيانات التالية في جدول الإعدادات أولاً:\n• اسم المدير\n• رقم جوال المدير\n• الرمز السري كعضو\n• الرمز السري للوحة المدير',
      Browser.Buttons.OK
    );
    return;
  }

  var sheet = ss.getSheetByName('الأعضاء');
  if (!sheet) { Logger.log('خطأ: جدول الأعضاء غير موجود'); return; }

  var data       = sheet.getDataRange().getValues();
  var headers    = data[0];
  var hashedPass = computeHash_(adminPassword);
  var today      = Utilities.formatDate(new Date(), 'Asia/Riyadh', 'yyyy-MM-dd');

  var colMap = {
    'رقم العضو':           'M001',
    'الاسم الأول':         adminName.split(' ')[0] || adminName,
    'اسم الأب':            '',
    'اسم الجد':            '',
    'الفخذ':               '',
    'الجيل':               '',
    'رقم الجوال':          adminPhone,
    'البريد الإلكتروني':   '',
    'تاريخ الميلاد':       '',
    'العمر':               '',
    'المدينة':             '',
    'المهنة':              '',
    'كلمة المرور':         hashedPass,
    'كلمة المرور المؤقتة': '',
    'انتهاء المؤقتة':      '',
    'الدور':               'مدير',
    'حالة الحساب':         'نشط',
    'تاريخ التسجيل':       today,
    'رقم الهوية':          '',
    'حي/ميت':              'حي',
  };

  var newRow = headers.map(function(h) {
    return colMap[h] !== undefined ? colMap[h] : '';
  });

  /* ابحث عن صف موجود برقم M001 */
  var targetRow = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === 'M001') { targetRow = i + 1; break; }
  }

  if (targetRow > 0) {
    sheet.getRange(targetRow, 1, 1, newRow.length).setValues([newRow]);
  } else {
    sheet.appendRow(newRow);
    targetRow = sheet.getLastRow();
  }

  /* تنسيق الصف */
  var fmtRange = sheet.getRange(targetRow, 1, 1, newRow.length);
  fmtRange.setHorizontalAlignment('center');
  fmtRange.setVerticalAlignment('middle');
  fmtRange.setFontSize(12);
  fmtRange.setWrap(true);
  sheet.setRowHeight(targetRow, 36);

  /* عمود الجوال نصي للحفاظ على الصفر */
  var phoneColIdx = headers.indexOf('رقم الجوال') + 1;
  if (phoneColIdx > 0) {
    sheet.getRange(targetRow, phoneColIdx).setNumberFormat('@');
    sheet.getRange(1, phoneColIdx, 500).setNumberFormat('@');
  }

  SpreadsheetApp.flush();
  Logger.log('✅ تم إنشاء حساب المدير: M001 / الجوال: ' + adminPhone);
  return { name: adminName, phone: adminPhone };
}

/* ═══════════════════════════════════════════════════════════════════════════
   زرع بيانات الشجرة الأساسية (الجذر + الفخوذ الخمسة)
   ═══════════════════════════════════════════════════════════════════════════ */

function setupBaseTree() {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('الشجرة العائلية');
  if (!sheet) { Browser.msgBox('خطأ', 'جدول الشجرة العائلية غير موجود', Browser.Buttons.OK); return; }

  // امسح البيانات القديمة (احتفظ بالترويسة)
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();

  var headers = sheet.getDataRange().getValues()[0];

  var baseNodes = [
    { id:'N000', member:'', name:'إبراهيم العفريتي', parent:'',     parentName:'',                gen:1, path:'إبراهيم العفريتي',                   alive:'متوفى' },
    { id:'N001', member:'', name:'أحمد',              parent:'N000', parentName:'إبراهيم العفريتي', gen:2, path:'إبراهيم العفريتي ← أحمد',            alive:'متوفى' },
    { id:'N002', member:'', name:'صاحب',              parent:'N001', parentName:'أحمد',             gen:3, path:'إبراهيم العفريتي ← أحمد ← صاحب',    alive:'متوفى' },
    { id:'N003', member:'', name:'شامي',              parent:'N001', parentName:'أحمد',             gen:3, path:'إبراهيم العفريتي ← أحمد ← شامي',    alive:'متوفى' },
    { id:'N004', member:'', name:'يحيى',              parent:'N001', parentName:'أحمد',             gen:3, path:'إبراهيم العفريتي ← أحمد ← يحيى',    alive:'متوفى' },
    { id:'N005', member:'', name:'علي',               parent:'N001', parentName:'أحمد',             gen:3, path:'إبراهيم العفريتي ← أحمد ← علي',     alive:'متوفى' },
    { id:'N006', member:'', name:'إبراهيم',           parent:'N001', parentName:'أحمد',             gen:3, path:'إبراهيم العفريتي ← أحمد ← إبراهيم', alive:'متوفى' },
  ];

  baseNodes.forEach(function(n) {
    var colMap = {
      'رقم العقدة':  n.id,
      'رقم العضو':   n.member,
      'اسم العضو':   n.name,
      'رقم الأب':    n.parent,
      'اسم الأب':    n.parentName,
      'مستوى الجيل': n.gen,
      'المسار':      n.path,
      'حي/ميت':      n.alive,
    };
    var row = headers.map(function(h) { return colMap[h] !== undefined ? colMap[h] : ''; });
    sheet.appendRow(row);
  });

  SpreadsheetApp.flush();
  Browser.msgBox('✅ تم', 'تم زرع بيانات الشجرة الأساسية:\nأحمد بن صاحب العفريتي + الفخوذ الخمسة', Browser.Buttons.OK);
}

/* زر منفصل في القائمة */
function setupFirstAdmin() {
  var result = setupFirstAdmin_();
  if (!result) return; // أُوقف بسبب بيانات ناقصة
  Browser.msgBox(
    '✅ حساب المدير',
    'رقم العضو: M001\n' +
    'الاسم: '        + result.name  + '\n' +
    'رقم الجوال: '   + result.phone + '\n' +
    'كلمة المرور: من جدول الإعدادات (الرمز السري كعضو)\n' +
    'رمز اللوحة:  من جدول الإعدادات (الرمز السري للوحة المدير)\n\n' +
    '⚠️ غيّر كلمة المرور من الموقع بعد أول دخول!',
    Browser.Buttons.OK
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   تهيئة الجداول — يمسح البيانات ويبقي الترويسات والإعدادات
   ═══════════════════════════════════════════════════════════════════════════ */

function initializeAllData() {
  var ui  = SpreadsheetApp.getUi();
  var res = ui.alert(
    '⚠️ تهيئة الجداول',
    'سيتم حذف جميع البيانات والاحتفاظ بالترويسات فقط.\nهل أنت متأكد؟',
    ui.ButtonSet.YES_NO
  );
  if (res !== ui.Button.YES) return;

  var ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
  var defs = getSheetDefs();

  defs.forEach(function(def) {
    var sheet = ss.getSheetByName(def.name);
    if (!sheet) return;
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
    }
    if (def.isSettings) { addDefaultSettings_(sheet); }
  });

  SpreadsheetApp.flush();
  ui.alert('✅ تمت التهيئة', 'تم مسح بيانات التجربة. الجداول جاهزة.', ui.ButtonSet.OK);
}

/* ═══════════════════════════════════════════════════════════════════════════
   تشخيص تسجيل الدخول
   ═══════════════════════════════════════════════════════════════════════════ */

function debugLogin() {
  var ss          = SpreadsheetApp.openById(SPREADSHEET_ID);
  var settSheet   = ss.getSheetByName('الإعدادات');
  var adminPhone  = '';
  var adminPass   = '';
  if (settSheet) {
    var sd = settSheet.getDataRange().getValues();
    for (var s = 1; s < sd.length; s++) {
      if (sd[s][0] === 'رقم جوال المدير')  adminPhone = String(sd[s][1] || '');
      if (sd[s][0] === 'الرمز السري كعضو') adminPass  = String(sd[s][1] || '');
    }
  }

  var PHONE     = adminPhone.replace(/^0/, '');
  var inputHash = adminPass ? computeHash_(adminPass) : '(لم تُدخل كلمة مرور)';

  var sheet   = ss.getSheetByName('الأعضاء');
  var data    = sheet.getDataRange().getValues();
  var headers = data[0];

  var phoneColIdx = headers.indexOf('رقم الجوال');
  var passColIdx  = headers.indexOf('كلمة المرور');
  var msg = '=== تشخيص تسجيل الدخول ===\n\nعدد الأعضاء: ' + (data.length - 1) + '\n\n';

  for (var i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    var storedPhone = String(data[i][phoneColIdx] || '');
    var storedHash  = String(data[i][passColIdx]  || '');
    msg += 'العضو: '                 + data[i][0]  + '\n';
    msg += 'الجوال: '                + storedPhone  + '\n';
    msg += 'تطابق الجوال: '         + (PHONE && storedPhone.slice(-9) === PHONE.slice(-9) ? '✅' : '❌') + '\n';
    msg += 'تطابق كلمة المرور: '    + (adminPass && inputHash === storedHash ? '✅' : '❌') + '\n---\n';
  }

  Logger.log(msg);
  Browser.msgBox('تشخيص', msg, Browser.Buttons.OK);
}

/* إصلاح كلمة مرور المدير — يقرأها من جدول الإعدادات */
function fixAdminPassword() {
  var MEMBER_ID = 'M001';
  var ss        = SpreadsheetApp.openById(SPREADSHEET_ID);

  /* اقرأ الكلمة من الإعدادات */
  var settSheet = ss.getSheetByName('الإعدادات');
  var adminPass = '';
  if (settSheet) {
    var sd = settSheet.getDataRange().getValues();
    for (var s = 1; s < sd.length; s++) {
      if (sd[s][0] === 'الرمز السري كعضو') { adminPass = String(sd[s][1] || ''); break; }
    }
  }
  if (!adminPass) {
    Browser.msgBox('⚠️ تنبيه', 'أدخل "الرمز السري كعضو" في جدول الإعدادات أولاً.', Browser.Buttons.OK);
    return;
  }

  var sheet   = ss.getSheetByName('الأعضاء');
  var data    = sheet.getDataRange().getValues();
  var headers = data[0];

  var passColIdx = headers.indexOf('كلمة المرور')          + 1;
  var tmpColIdx  = headers.indexOf('كلمة المرور المؤقتة') + 1;
  var expColIdx  = headers.indexOf('انتهاء المؤقتة')       + 1;
  var hashed     = computeHash_(adminPass);

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === MEMBER_ID) {
      sheet.getRange(i + 1, passColIdx).setValue(hashed);
      if (tmpColIdx > 0) sheet.getRange(i + 1, tmpColIdx).setValue('');
      if (expColIdx > 0) sheet.getRange(i + 1, expColIdx).setValue('');
      Browser.msgBox('✅ تم', 'تم تحديث كلمة المرور للعضو ' + MEMBER_ID, Browser.Buttons.OK);
      return;
    }
  }
  Browser.msgBox('❌ خطأ', 'لم يُعثر على ' + MEMBER_ID, Browser.Buttons.OK);
}

/* ═══════════════════════════════════════════════════════════════════════════
   تنظيف جدول الأعضاء — يزيل معادلات العمر ويرتب الأعضاء في الأعلى
   ═══════════════════════════════════════════════════════════════════════════ */

function cleanMembersSheet() {
  var ui = SpreadsheetApp.getUi();
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('الأعضاء');
  if (!sheet) { ui.alert('❌ خطأ', 'جدول الأعضاء غير موجود.', ui.ButtonSet.OK); return; }

  var data    = sheet.getDataRange().getValues();
  var headers = data[0];
  var ageIdx  = headers.indexOf('العمر');
  var bdayIdx = headers.indexOf('تاريخ الميلاد');

  // اجمع الصفوف التي فيها بيانات فعلية (عمود رقم العضو غير فارغ)
  var memberRows = [];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0] || '').trim() !== '') {
      memberRows.push(data[i]);
    }
  }

  if (memberRows.length === 0) {
    ui.alert('⚠️ لا توجد بيانات', 'لم يُعثر على أعضاء في الجدول.', ui.ButtonSet.OK);
    return;
  }

  // امسح كل بيانات الجدول (غير الترويسة)
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, headers.length).clearContent();
  }

  // اكتب الأعضاء بدءاً من الصف 2
  var today = new Date();
  for (var r = 0; r < memberRows.length; r++) {
    var row = memberRows[r];

    // احسب العمر كرقم ثابت
    if (ageIdx > -1 && bdayIdx > -1) {
      var bdayVal = row[bdayIdx];
      if (bdayVal) {
        try {
          var bDate = (bdayVal instanceof Date) ? bdayVal : new Date(String(bdayVal));
          if (!isNaN(bDate.getTime())) {
            var calcAge = Math.floor((today - bDate) / (365.25 * 24 * 60 * 60 * 1000));
            if (calcAge >= 0 && calcAge < 150) row[ageIdx] = calcAge;
          }
        } catch(_) {}
      }
    }

    // صحّح تنسيق تاريخ الميلاد إن كان Date object
    if (bdayIdx > -1 && row[bdayIdx] instanceof Date) {
      row[bdayIdx] = Utilities.formatDate(row[bdayIdx], 'Asia/Riyadh', 'yyyy-MM-dd');
    }

    sheet.getRange(r + 2, 1, 1, row.length).setValues([row]);
    formatLastRow(sheet);
  }

  SpreadsheetApp.flush();
  ui.alert(
    '✅ تم التنظيف',
    'تم:\n• نقل ' + memberRows.length + ' عضو إلى أعلى الجدول\n• إزالة معادلات العمر واستبدالها بأرقام ثابتة\n• تصحيح تنسيق تاريخ الميلاد',
    ui.ButtonSet.OK
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   إضافة عمود الحالة الاجتماعية للجدول الموجود (ترقية للجداول القديمة)
   ═══════════════════════════════════════════════════════════════════════════ */

function addMaritalStatusColumn() {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('الأعضاء');
  if (!sheet) {
    Browser.msgBox('❌ خطأ', 'جدول الأعضاء غير موجود.', Browser.Buttons.OK);
    return;
  }

  var headers = sheet.getDataRange().getValues()[0];

  // تحقق إذا كان العمود موجوداً مسبقاً
  if (headers.indexOf('الحالة الاجتماعية') > -1) {
    Browser.msgBox('✅ موجود مسبقاً', 'عمود "الحالة الاجتماعية" موجود بالفعل في جدول الأعضاء.', Browser.Buttons.OK);
    return;
  }

  // أضف العمود بعد 'المهنة'
  var jobIdx = headers.indexOf('المهنة');
  if (jobIdx === -1) {
    Browser.msgBox('❌ خطأ', 'لم يُعثر على عمود "المهنة" في جدول الأعضاء.', Browser.Buttons.OK);
    return;
  }

  var insertCol = jobIdx + 2; // موضع الإدراج (بعد المهنة)
  sheet.insertColumnAfter(jobIdx + 1);

  // ترويسة العمود الجديد
  var hCell = sheet.getRange(1, insertCol);
  hCell.setValue('الحالة الاجتماعية');
  hCell.setBackground(CLR.members);
  hCell.setFontColor('#FFFFFF');
  hCell.setFontWeight('bold');
  hCell.setFontSize(14);
  hCell.setHorizontalAlignment('center');
  hCell.setVerticalAlignment('middle');
  hCell.setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);

  // عرض العمود
  sheet.setColumnWidth(insertCol, 140);

  // تنسيق خلايا البيانات
  var lastRow = Math.max(sheet.getLastRow(), 2);
  var dRange  = sheet.getRange(2, insertCol, lastRow - 1, 1);
  dRange.setHorizontalAlignment('center');
  dRange.setVerticalAlignment('middle');
  dRange.setFontSize(12);
  dRange.setWrap(true);

  SpreadsheetApp.flush();
  Browser.msgBox(
    '✅ تم بنجاح',
    'تم إضافة عمود "الحالة الاجتماعية" في جدول الأعضاء.\n' +
    'الآن بيانات الأعضاء الجدد ستُحفظ بشكل صحيح.',
    Browser.Buttons.OK
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   إضافة الأعمدة الجديدة بأمان — لا تحذف بيانات موجودة
   ═══════════════════════════════════════════════════════════════════════════ */

function addMissingColumns() {
  var ss      = SpreadsheetApp.openById(SPREADSHEET_ID);
  var results = [];

  // تعريف الأعمدة المطلوبة لكل جدول
  var needed = [
    {
      sheet: 'طلبات التسجيل',
      color: CLR.members,
      cols:  ['اسم الوالد', 'الفخذ المختار', 'المسار الشجري', 'بيانات المطابقة'],
      widths:[160, 140, 320, 280],
    },
    {
      sheet: 'طلبات التسجيل',
      color: CLR.members,
      cols:  ['الحالة الاجتماعية'],
      widths:[140],
      after: 'المهنة',
    },
    {
      sheet: 'طلبات التسجيل',
      color: CLR.members,
      cols:  ['رقم عقدة الابن'],
      widths:[150],
      after: 'رقم عقدة الأب',
    },
    {
      sheet: 'الأبناء',
      color: CLR.family,
      cols:  ['رقم عقدة الأب'],
      widths:[150],
      after: 'رقم العضو الأب',
    },
  ];

  needed.forEach(function(def) {
    var sheet = ss.getSheetByName(def.sheet);
    if (!sheet) { results.push('❌ جدول غير موجود: ' + def.sheet); return; }

    var headers   = sheet.getDataRange().getValues()[0];
    var lastRow   = Math.max(sheet.getLastRow(), 1);
    var addedCols = [];

    def.cols.forEach(function(colName, idx) {
      if (headers.indexOf(colName) > -1) return; // موجود مسبقاً

      var insertAt;
      if (def.after) {
        // أضفه بعد العمود المحدد
        var afterIdx = headers.indexOf(def.after);
        insertAt = afterIdx > -1 ? afterIdx + 2 : headers.length + 1;
        sheet.insertColumnAfter(afterIdx > -1 ? afterIdx + 1 : headers.length);
        headers.splice(afterIdx > -1 ? afterIdx + 1 : headers.length, 0, colName);
      } else {
        // أضفه في نهاية الجدول
        insertAt = headers.length + 1;
        headers.push(colName);
      }

      // تنسيق رأس العمود
      var hCell = sheet.getRange(1, insertAt);
      hCell.setValue(colName);
      hCell.setBackground(def.color);
      hCell.setFontColor('#FFFFFF');
      hCell.setFontWeight('bold');
      hCell.setFontSize(14);
      hCell.setHorizontalAlignment('center');
      hCell.setVerticalAlignment('middle');
      hCell.setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);

      // عرض العمود
      sheet.setColumnWidth(insertAt, def.widths[idx] || 160);

      // تنسيق خلايا البيانات
      if (lastRow > 1) {
        var dRange = sheet.getRange(2, insertAt, lastRow - 1, 1);
        dRange.setHorizontalAlignment('center');
        dRange.setVerticalAlignment('middle');
        dRange.setFontSize(12);
        dRange.setWrap(true);
      }

      addedCols.push(colName);
    });

    if (addedCols.length > 0) {
      results.push('✅ ' + def.sheet + ': أُضيف ' + addedCols.join('، '));
    } else {
      results.push('☑️ ' + def.sheet + ': جميع الأعمدة موجودة مسبقاً');
    }
  });

  SpreadsheetApp.flush();
  Browser.msgBox('نتيجة إضافة الأعمدة', results.join('\n'), Browser.Buttons.OK);
}

/* ═══════════════════════════════════════════════════════════════════════════
   القائمة المخصصة
   ═══════════════════════════════════════════════════════════════════════════ */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('⚙️ إدارة الموقع')
    .addItem('🚀 إعداد كامل من الصفر (جداول + مدير)',  'fullSetup')
    .addSeparator()
    .addItem('🏗️  إنشاء الجداول فقط',                  'createAllSheets')
    .addItem('👤  إنشاء حساب المدير فقط',               'setupFirstAdmin')
    .addItem('🌳  زرع بيانات الشجرة الأساسية',           'setupBaseTree')
    .addSeparator()
    .addItem('🗑️  تهيئة الجداول (مسح بيانات التجربة)', 'initializeAllData')
    .addSeparator()
    .addItem('🔍  تشخيص تسجيل الدخول',                 'debugLogin')
    .addItem('🔑  إصلاح كلمة مرور المدير',              'fixAdminPassword')
    .addSeparator()
    .addItem('🔧  إضافة عمود الحالة الاجتماعية',        'addMaritalStatusColumn')
    .addItem('🧹  تنظيف جدول الأعضاء (ترتيب + إصلاح العمر والتاريخ)', 'cleanMembersSheet')
    .addSeparator()
    .addItem('➕  إضافة الأعمدة الجديدة (آمن — لا يحذف بيانات)', 'addMissingColumns')
    .addToUi();
}

/* ═══════════════════════════════════════════════════════════════════════════
   دوال مساعدة
   ═══════════════════════════════════════════════════════════════════════════ */

function columnToLetter_(col) {
  var letter = '';
  while (col > 0) {
    var rem = (col - 1) % 26;
    letter  = String.fromCharCode(65 + rem) + letter;
    col     = Math.floor((col - 1) / 26);
  }
  return letter;
}

function computeHash_(password) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(password),
    Utilities.Charset.UTF_8
  );
  return bytes.map(function(b) {
    return ('0' + (b & 0xFF).toString(16)).slice(-2);
  }).join('');
}
