/* ═══════════════════════════════════════════════════════════════════════════
   Articles.gs — المقالات
   ═══════════════════════════════════════════════════════════════════════════ */

/* ═══ جلب جميع المقالات مع تفاصيلها ══════════════════════════════════════ */

function getArticles(body) {
  var articles = sheetToObjects('المقالات');
  var tribes   = sheetToObjects('قبائل المقال');
  var villages = sheetToObjects('قرى المقال');
  var geoInfo  = sheetToObjects('المعلومات الجغرافية');

  var result = articles.map(function(a) {
    var aid = String(a['رقم المقال'] || '');

    var articleTribes = tribes
      .filter(function(t) { return String(t['رقم المقال']) === aid; })
      .sort(function(x, y) { return x['الترتيب'] - y['الترتيب']; })
      .map(function(t) {
        return {
          id:   String(t['رقم السجل']   || ''),
          name: String(t['اسم القبيلة'] || ''),
          desc: String(t['الوصف']       || ''),
        };
      });

    var articleVillages = villages
      .filter(function(v) { return String(v['رقم المقال']) === aid; })
      .sort(function(x, y) { return x['الترتيب'] - y['الترتيب']; })
      .map(function(v) {
        return {
          id:        String(v['رقم السجل']   || ''),
          name:      String(v['اسم القرية']  || ''),
          desc:      String(v['الوصف']       || ''),
          highlight: v['مميزة'] === true || v['مميزة'] === 'نعم',
        };
      });

    var articleGeo = geoInfo
      .filter(function(g) { return String(g['رقم المقال']) === aid; })
      .sort(function(x, y) { return x['الترتيب'] - y['الترتيب']; })
      .map(function(g) {
        return {
          id:    String(g['رقم السجل'] || ''),
          label: String(g['التسمية']  || ''),
          value: String(g['القيمة']   || ''),
        };
      });

    return {
      id:           aid,
      type:         String(a['النوع']              || 'standard'),
      title:        String(a['العنوان']            || ''),
      category:     String(a['التصنيف']            || ''),
      description:  String(a['الوصف']              || ''),
      date:         formatDate(a['التاريخ']),
      mapUrl:       String(a['رابط الخريطة']       || ''),
      mapLabel:     String(a['اسم الموقع']         || ''),
      mapSubLabel:  String(a['المنطقة']            || ''),
      body:         String(a['نص المقال']          || ''),
      aboutText:    String(a['نص تفصيلي']          || ''),
      tribesIntro:  String(a['مقدمة القبائل']      || ''),
      publishedAt:  formatDate(a['تاريخ النشر']),
      tribes:       articleTribes,
      villages:     articleVillages,
      geoInfo:      articleGeo,
    };
  });

  return { success: true, articles: result, total: result.length };
}

/* ═══ إنشاء مقال جديد ════════════════════════════════════════════════════ */

function createArticle(body) {
  var article = body.article;
  if (!article || !article.title) {
    return { success: false, message: 'عنوان المقال مطلوب' };
  }

  var articleId = generateId('A');
  var today     = formatDate(new Date());

  var sheet   = getSheet('المقالات');
  var headers = sheet.getDataRange().getValues()[0];
  var colMap  = {
    'رقم المقال':    articleId,
    'النوع':         String(article.type        || 'standard'),
    'العنوان':       String(article.title       || ''),
    'التصنيف':       String(article.category    || ''),
    'الوصف':         String(article.description || ''),
    'التاريخ':       String(article.date        || today),
    'رابط الخريطة':  String(article.mapUrl      || ''),
    'اسم الموقع':    String(article.mapLabel    || ''),
    'المنطقة':       String(article.mapSubLabel || ''),
    'نص المقال':     String(article.body        || ''),
    'نص تفصيلي':    String(article.aboutText   || ''),
    'مقدمة القبائل': String(article.tribesIntro || ''),
    'تاريخ النشر':   today,
  };
  sheet.appendRow(headers.map(function(h) { return colMap[h] !== undefined ? colMap[h] : ''; }));
  formatLastRow(sheet);

  // احفظ العلاقات
  saveArticleRelations(articleId, article.tribes   || [], 'قبائل المقال',        addTribeRow);
  saveArticleRelations(articleId, article.villages || [], 'قرى المقال',           addVillageRow);
  saveArticleRelations(articleId, article.geoInfo  || [], 'المعلومات الجغرافية', addGeoRow);

  return { success: true, articleId: articleId, message: 'تم نشر المقال بنجاح' };
}

/* ═══ تحديث مقال ═════════════════════════════════════════════════════════ */

function updateArticle(body) {
  var article = body.article;
  if (!article || !article.id) return { success: false, message: 'رقم المقال مطلوب' };

  var articleId = String(article.id);
  var found     = findRow('المقالات', 0, articleId);
  if (!found) return { success: false, message: 'المقال غير موجود' };

  var sheet   = getSheet('المقالات');
  var headers = found.headers;
  var rowIdx  = found.rowIndex;

  var fields = {
    'النوع':          article.type,
    'العنوان':        article.title,
    'التصنيف':        article.category,
    'الوصف':          article.description,
    'التاريخ':        article.date,
    'رابط الخريطة':   article.mapUrl,
    'اسم الموقع':     article.mapLabel,
    'المنطقة':        article.mapSubLabel,
    'نص المقال':      article.body,
    'نص تفصيلي':     article.aboutText,
    'مقدمة القبائل':  article.tribesIntro,
  };

  Object.keys(fields).forEach(function(key) {
    if (fields[key] !== undefined) {
      var col = headers.indexOf(key) + 1;
      if (col > 0) sheet.getRange(rowIdx, col).setValue(String(fields[key]));
    }
  });

  // تحديث العلاقات — احذف وأعد
  deleteArticleRelations(articleId, 'قبائل المقال');
  deleteArticleRelations(articleId, 'قرى المقال');
  deleteArticleRelations(articleId, 'المعلومات الجغرافية');

  saveArticleRelations(articleId, article.tribes   || [], 'قبائل المقال',        addTribeRow);
  saveArticleRelations(articleId, article.villages || [], 'قرى المقال',           addVillageRow);
  saveArticleRelations(articleId, article.geoInfo  || [], 'المعلومات الجغرافية', addGeoRow);

  return { success: true, message: 'تم تحديث المقال بنجاح' };
}

/* ═══ حذف مقال ═══════════════════════════════════════════════════════════ */

function deleteArticle(body) {
  var articleId = String(body.articleId || '').trim();
  if (!articleId) return { success: false, message: 'رقم المقال مطلوب' };

  var found = findRow('المقالات', 0, articleId);
  if (!found) return { success: false, message: 'المقال غير موجود' };

  getSheet('المقالات').deleteRow(found.rowIndex);

  deleteArticleRelations(articleId, 'قبائل المقال');
  deleteArticleRelations(articleId, 'قرى المقال');
  deleteArticleRelations(articleId, 'المعلومات الجغرافية');

  return { success: true, message: 'تم حذف المقال بنجاح' };
}

/* ═══ دوال مساعدة للمقالات ═════════════════════════════════════════════ */

function saveArticleRelations(articleId, items, sheetName, addFn) {
  var sheet = getSheet(sheetName);
  items.forEach(function(item, i) {
    var row = addFn(articleId, item, i + 1);
    if (row) {
      sheet.appendRow(row);
      formatLastRow(sheet);
    }
  });
}

function addTribeRow(articleId, t, order) {
  if (!t || !t.name) return null;
  return [generateId('T'), articleId, String(t.name || ''), String(t.desc || ''), order];
}

function addVillageRow(articleId, v, order) {
  if (!v || !v.name) return null;
  return [generateId('V'), articleId, String(v.name || ''), String(v.desc || ''), v.highlight ? 'نعم' : 'لا', order];
}

function addGeoRow(articleId, g, order) {
  if (!g || !g.label) return null;
  return [generateId('G'), articleId, String(g.label || ''), String(g.value || ''), order];
}

function deleteArticleRelations(articleId, sheetName) {
  var sheet   = getSheet(sheetName);
  var data    = sheet.getDataRange().getValues();
  var headers = data[0];
  var col     = headers.indexOf('رقم المقال');
  if (col === -1) return;

  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][col]) === String(articleId)) {
      sheet.deleteRow(i + 1);
    }
  }
}
