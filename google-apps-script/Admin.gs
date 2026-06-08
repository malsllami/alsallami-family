/* ═══════════════════════════════════════════════════════════════════════════
   Admin.gs — لوحة المدير والإحصائيات
   ═══════════════════════════════════════════════════════════════════════════ */

function columnToLetter(col) {
  var letter = '';
  while (col > 0) {
    var rem = (col - 1) % 26;
    letter  = String.fromCharCode(65 + rem) + letter;
    col     = Math.floor((col - 1) / 26);
  }
  return letter;
}

/* ═══ إحصائيات لوحة المدير ══════════════════════════════════════════════ */

function getAdminStats(body) {
  var members   = sheetToObjects('الأعضاء');
  var requests  = sheetToObjects('طلبات التسجيل');
  var treeReqs  = sheetToObjects('طلبات الشجرة');
  var funds     = sheetToObjects('الصناديق');
  var articles  = sheetToObjects('المقالات');
  var treeNodes = sheetToObjects('الشجرة العائلية');

  var activeMembers  = members.filter(function(m)  { return m['حالة الحساب'] !== 'موقوف'; }).length;
  var pendingReg     = requests.filter(function(r) { return r['الحالة'] === 'معلق'; }).length;
  var pendingTree    = treeReqs.filter(function(r) { return r['الحالة'] === 'معلق'; }).length;
  var activeFunds    = funds.filter(function(f)    { return f['الحالة'] !== 'مغلق'; }).length;
  var totalArticles  = articles.length;
  var totalTreeNodes = treeNodes.length;
  var maxGen = 0;
  treeNodes.forEach(function(n) {
    var g = parseInt(n['مستوى الجيل'] || 0, 10);
    if (g > maxGen) maxGen = g;
  });

  // توزيع الجيل
  var generationMap = {};
  members.forEach(function(m) {
    var g = String(m['الجيل'] || 'غير محدد');
    generationMap[g] = (generationMap[g] || 0) + 1;
  });

  // توزيع المدن
  var cityMap = {};
  members.forEach(function(m) {
    var c = String(m['المدينة'] || 'غير محدد');
    if (c) cityMap[c] = (cityMap[c] || 0) + 1;
  });

  // إحصائيات API من PropertiesService
  var props     = PropertiesService.getScriptProperties();
  var tz        = 'Asia/Riyadh';
  var now       = new Date();
  var apiDaily  = [];
  var apiWeek   = 0;
  var apiToday  = 0;
  for (var di = 6; di >= 0; di--) {
    var d   = new Date(now.getTime() - di * 24 * 3600 * 1000);
    var key = 'api_' + Utilities.formatDate(d, tz, 'yyyy-MM-dd');
    var cnt = parseInt(props.getProperty(key) || '0', 10);
    apiDaily.push(cnt);
    apiWeek += cnt;
    if (di === 0) apiToday = cnt;
  }
  var apiLimit = 500;

  return {
    success: true,
    stats: {
      totalMembers:    members.length,
      activeMembers:   activeMembers,
      pendingRequests: pendingReg,
      pendingTree:     pendingTree,
      totalFunds:      activeFunds,
      totalArticles:   totalArticles,
      totalTreeNodes:  totalTreeNodes,
      totalGenerations: maxGen,
      scriptCount:     apiToday,
      scriptLimit:     apiLimit,
      scriptUsage:     Math.min(100, Math.round((apiToday / apiLimit) * 100)),
      todayRequests:   apiToday,
      weekRequests:    apiWeek,
      dailyStats:      apiDaily,
    },
    charts: {
      byGeneration: generationMap,
      byCity:       cityMap,
    }
  };
}

/* ═══ جلب طلبات التسجيل المعلقة ═════════════════════════════════════════ */

function getPendingRequests(body) {
  var all      = sheetToObjects('طلبات التسجيل');
  var statusFilter = body.status || 'معلق';

  var filtered = statusFilter === 'الكل'
    ? all
    : all.filter(function(r) { return r['الحالة'] === statusFilter; });

  var result = filtered.map(function(r) {
    return {
      requestId:   String(r['رقم الطلب']            || ''),
      name:        String(r['الاسم الأول']           || ''),
      fatherName:  String(r['اسم الأب']              || ''),
      grandName:   String(r['اسم الجد']              || ''),
      branch:      String(r['الفخذ']                 || ''),
      generation:  String(r['الجيل']                 || ''),
      phone:       String(r['رقم الجوال']            || ''),
      email:       String(r['البريد الإلكتروني']     || ''),
      birthDate:   formatDate(r['تاريخ الميلاد']),
      city:        String(r['المدينة']               || ''),
      job:         String(r['المهنة']                || ''),
      nationalId:  String(r['رقم الهوية']            || ''),
      parentNodeId:String(r['رقم عقدة الأب']         || ''),
      status:      String(r['الحالة']                || ''),
      date:        formatDate(r['تاريخ الطلب']),
      notes:       String(r['ملاحظات']               || ''),
    };
  });

  return { success: true, requests: result, total: result.length };
}

/* ═══ قبول طلب تسجيل ═══════════════════════════════════════════════════ */

function approveRequest(body) {
  var requestId = String(body.requestId || '').trim();
  if (!requestId) return { success: false, message: 'رقم الطلب مطلوب' };

  var found = findRow('طلبات التسجيل', 0, requestId);
  if (!found) return { success: false, message: 'الطلب غير موجود' };

  var req     = rowToObject(found.headers, found.rowData);
  var reqSheet = getSheet('طلبات التسجيل');

  // تحديث حالة الطلب
  var statusCol = found.headers.indexOf('الحالة') + 1;
  reqSheet.getRange(found.rowIndex, statusCol).setValue('مقبول');

  // البحث عن رقم عضو محجوز مسبقاً (أضافه الأب في جدول الأبناء)
  var preAssignedId = '';
  var reqNid = String(req['رقم الهوية'] || '').trim();
  if (reqNid) {
    var childRecs = sheetToObjects('الأبناء');
    for (var ci = 0; ci < childRecs.length; ci++) {
      if (String(childRecs[ci]['رقم الهوية'] || '').trim() === reqNid) {
        var candidate = String(childRecs[ci]['رقم عضو الابن'] || '');
        if (candidate) { preAssignedId = candidate; break; }
      }
    }
  }

  // إنشاء حساب العضو — استخدم الرقم المحجوز إن وُجد وإلا ولّد جديداً
  var memberId = preAssignedId || generateId('M');
  var tempPass = generateTempPassword();
  var today    = formatDate(new Date());

  // استخدم كلمة المرور المشفرة من الطلب إن وُجدت، وإلا ولّد كلمة مؤقتة
  var presetHash  = String(req['كلمة المرور المشفرة'] || '');
  var hasPreset   = presetHash !== '';
  var passHash    = hasPreset ? presetHash : hashPassword(tempPass);
  var tempHash    = hasPreset ? '' : hashPassword(tempPass);
  var tempExpiry  = hasPreset ? '' : formatDate(new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000));

  var memberSheet   = getSheet('الأعضاء');
  var memberHeaders = memberSheet.getDataRange().getValues()[0];

  // ══ تحقق من وجود عضو مضاف من المدير بنفس رقم الهوية (دون تسجيل) ══
  var existingAdminRowIdx = -1;
  if (reqNid && !preAssignedId) {
    var nidColIdx2  = memberHeaders.indexOf('رقم الهوية');
    var phColIdx2   = memberHeaders.indexOf('رقم الجوال');
    var pwColIdx2   = memberHeaders.indexOf('كلمة المرور');
    var allMVals    = memberSheet.getDataRange().getValues();
    for (var mri = 1; mri < allMVals.length; mri++) {
      if (!allMVals[mri][0]) continue;
      var mNid2  = String(nidColIdx2  > -1 ? allMVals[mri][nidColIdx2]  : '').replace(/[^\d]/g,'').trim();
      var mPhone2 = String(phColIdx2  > -1 ? allMVals[mri][phColIdx2]   : '').trim();
      var mPass2  = String(pwColIdx2  > -1 ? allMVals[mri][pwColIdx2]   : '').trim();
      if (mNid2 === reqNid && (!mPhone2 || !mPass2)) {
        memberId            = String(allMVals[mri][0]).trim(); // استخدم رقم العضو الموجود
        existingAdminRowIdx = mri + 1;                        // رقم الصف (1-based)
        break;
      }
    }
  }

  // احسب العمر من تاريخ الميلاد كرقم ثابت
  var reqBday  = req['تاريخ الميلاد'];
  var reqAge   = '';
  if (reqBday) {
    try {
      var bDate = (reqBday instanceof Date) ? reqBday : new Date(String(reqBday));
      if (!isNaN(bDate.getTime())) {
        var ageNum = Math.floor((new Date() - bDate) / (365.25 * 24 * 60 * 60 * 1000));
        if (ageNum >= 0 && ageNum < 150) reqAge = ageNum;
      }
    } catch(_) {}
  }

  var colMap = {
    'رقم العضو':           memberId,
    'الاسم الأول':         String(req['الاسم الأول']        || ''),
    'اسم الأب':            String(req['اسم الأب']           || ''),
    'اسم الجد':            String(req['اسم الجد']           || ''),
    'الفخذ':               String(req['الفخذ']              || ''),
    'الجيل':               String(req['الجيل']              || ''),
    'رقم الجوال':          String(req['رقم الجوال']         || ''),
    'البريد الإلكتروني':   String(req['البريد الإلكتروني']  || ''),
    'تاريخ الميلاد':       formatDate(req['تاريخ الميلاد']),
    'العمر':               reqAge,
    'المدينة':             String(req['المدينة']            || ''),
    'المهنة':              String(req['المهنة']             || ''),
    'كلمة المرور':         passHash,
    'كلمة المرور المؤقتة': tempHash,
    'انتهاء المؤقتة':      tempExpiry,
    'الدور':               'عضو',
    'حالة الحساب':         'نشط',
    'تاريخ التسجيل':       today,
    'رقم الهوية':          String(req['رقم الهوية']         || ''),
    'حي/ميت':              String(req['حي/ميت']             || 'حي'),
    'الحالة الاجتماعية':   String(req['الحالة الاجتماعية']  || ''),
  };

  if (existingAdminRowIdx > 0) {
    // تحديث الصف الموجود — دمج البيانات الجديدة مع الموجودة
    var existingVals = memberSheet.getRange(existingAdminRowIdx, 1, 1, memberHeaders.length).getValues()[0];
    var ALWAYS_UPDATE = ['كلمة المرور', 'كلمة المرور المؤقتة', 'انتهاء المؤقتة',
                         'رقم الجوال', 'البريد الإلكتروني', 'الدور', 'حالة الحساب',
                         'تاريخ التسجيل', 'رقم العضو'];
    var mergedRow = memberHeaders.map(function(h, hi) {
      var newVal = colMap[h];
      var oldVal = existingVals[hi];
      if (ALWAYS_UPDATE.indexOf(h) > -1) return newVal !== undefined ? newVal : oldVal;
      return (newVal !== undefined && String(newVal) !== '') ? newVal : oldVal;
    });
    memberSheet.getRange(existingAdminRowIdx, 1, 1, mergedRow.length).setValues([mergedRow]);
    formatLastRow(memberSheet);
  } else {
    // إنشاء صف جديد
    var newRow = memberHeaders.map(function(h) {
      return colMap[h] !== undefined ? colMap[h] : '';
    });
    var colAVals2 = memberSheet.getRange(1, 1, memberSheet.getMaxRows(), 1).getValues();
    var targetRow2 = 2;
    for (var ri2 = 1; ri2 < colAVals2.length; ri2++) {
      if (String(colAVals2[ri2][0]).trim() === '') { targetRow2 = ri2 + 1; break; }
    }
    memberSheet.getRange(targetRow2, 1, 1, newRow.length).setValues([newRow]);
    formatLastRow(memberSheet);
  }

  // ربط تلقائي بالشجرة إذا كان رقم الهوية مسجل مسبقاً من قبل الأب
  var autoNodeId   = '';
  var autoLinked   = false;
  var treeReason   = '';

  // ربط تلقائي (0): اختار "هذا أنا" — العضو موجود في الشجرة بالفعل، اربط مباشرة بالعقدة الذاتية
  var selfNodeId = String(req['رقم العقدة الذاتية'] || '').trim();
  if (!autoLinked && selfNodeId) {
    try {
      var selfRow0 = findRow('الشجرة العائلية', 0, selfNodeId);
      if (selfRow0) {
        var mCol0 = selfRow0.headers.indexOf('رقم العضو') + 1;
        if (mCol0 > 0) {
          getSheet('الشجرة العائلية').getRange(selfRow0.rowIndex, mCol0).setValue(memberId);
          autoNodeId = selfNodeId;
          autoLinked = true;
          treeReason = 'ربط مباشر بالعقدة الذاتية (هذا أنا)';
        }
      }
    } catch(e0) { Logger.log('خطأ ربط الشجرة (0): ' + e0.message); }
  }

  if (preAssignedId && reqNid) {
    try {
      var treeSheet2 = getSheet('الشجرة العائلية');
      var existing2  = sheetToObjects('الشجرة العائلية');
      var tHeaders2  = treeSheet2.getDataRange().getValues()[0];

      // البحث عن عقدة بنفس رقم الهوية والاسم الأول بدون رقم عضو
      var firstName = String(colMap['الاسم الأول'] || '');
      var existingNode = null;
      for (var ei = 0; ei < existing2.length; ei++) {
        var en = existing2[ei];
        if (!String(en['رقم العضو'] || '').trim() &&
            String(en['اسم العضو'] || '').trim() === firstName &&
            String(en['حي/ميت'] || '') === 'حي') {
          existingNode = en;
          break;
        }
      }

      if (existingNode) {
        // ربط العقدة الموجودة بالعضو الجديد
        autoNodeId = String(existingNode['رقم العقدة'] || '');
        var linkRow = findRow('الشجرة العائلية', 0, autoNodeId);
        if (linkRow) {
          var memCol = linkRow.headers.indexOf('رقم العضو') + 1;
          if (memCol > 0) {
            treeSheet2.getRange(linkRow.rowIndex, memCol).setValue(memberId);
            autoLinked = true;
            treeReason = 'تم ربطه تلقائياً لأن والده سجله مسبقاً';
          }
        }
      }
    } catch(e) { Logger.log('خطأ ربط الشجرة: ' + e.message); }
  }

  // ربط تلقائي بالشجرة إذا اختار العضو والده في نموذج التسجيل وكان اسمه موجوداً في أبناء والده
  if (!autoLinked) {
    var parentNodeIdFromReg = String(req['رقم عقدة الأب'] || '').trim();
    if (parentNodeIdFromReg) {
      try {
        var treeNodesArr = sheetToObjects('الشجرة العائلية');
        var treeSheetReg = getSheet('الشجرة العائلية');
        var tHeadersReg  = treeSheetReg.getDataRange().getValues()[0];

        var parentNodeReg = null;
        for (var pi3 = 0; pi3 < treeNodesArr.length; pi3++) {
          if (String(treeNodesArr[pi3]['رقم العقدة']) === parentNodeIdFromReg) {
            parentNodeReg = treeNodesArr[pi3]; break;
          }
        }

        if (parentNodeReg) {
          var fnReg        = String(colMap['الاسم الأول'] || '');
          var fatherMIdReg = String(parentNodeReg['رقم العضو'] || '');

          // البحث عن سجل ابن مطابق في جدول الأبناء
          var childRecsArr = sheetToObjects('الأبناء');
          var matchedChildRec = null;
          for (var cri = 0; cri < childRecsArr.length; cri++) {
            var cr          = childRecsArr[cri];
            var crNidMatch  = reqNid && String(cr['رقم الهوية'] || '').trim() === reqNid;
            var crNameMatch = String(cr['الاسم'] || '').split(' ')[0].trim() === fnReg;
            var crFatherOk  = fatherMIdReg && String(cr['رقم العضو الأب'] || '') === fatherMIdReg;
            if (crNidMatch || (crFatherOk && crNameMatch)) { matchedChildRec = cr; break; }
          }

          if (matchedChildRec) {
            // اسم العضو موجود في أبناء والده — اربط وأنشئ عقدة
            linkChildRecordToMember(memberId, fnReg, fatherMIdReg, reqNid);

            var alreadyInTree = false;
            for (var xi3 = 0; xi3 < treeNodesArr.length; xi3++) {
              if (String(treeNodesArr[xi3]['رقم العضو']) === memberId) { alreadyInTree = true; break; }
            }
            if (!alreadyInTree) {
              var pNameReg  = String(parentNodeReg['اسم العضو'] || '');
              var genReg    = Number(parentNodeReg['مستوى الجيل'] || 1) + 1;
              var pathReg   = String(parentNodeReg['المسار'] || pNameReg) + ' ← ' + fnReg;
              var nodeIdReg = generateId('N');
              var tColReg   = {
                'رقم العقدة':  nodeIdReg, 'رقم العضو': memberId, 'اسم العضو': fnReg,
                'رقم الأب':    parentNodeIdFromReg, 'اسم الأب': pNameReg,
                'مستوى الجيل': genReg, 'المسار': pathReg, 'حي/ميت': 'حي',
              };
              treeSheetReg.appendRow(tHeadersReg.map(function(h) { return tColReg[h] !== undefined ? tColReg[h] : ''; }));
              formatLastRow(treeSheetReg);
              syncFatherChildrenToTree(memberId, nodeIdReg, fnReg, genReg, pathReg);
              autoNodeId = nodeIdReg;
              autoLinked = true;
            }
          }
          // إذا لم يُوجد سجل مطابق: العضو غير موجود في أبناء والده — يقدم طلب ربط لاحقاً من لوحة التحكم
        }
      } catch(e2) { Logger.log('خطأ ربط الشجرة من نموذج التسجيل: ' + e2.message); }
    }
  }

  // ربط تلقائي (3): عقدة أضافها المدير مباشرة — تطابق الاسم ورقم عقدة الأب
  if (!autoLinked && parentNodeIdFromReg && colMap['الاسم الأول']) {
    try {
      var treeNodesL = sheetToObjects('الشجرة العائلية');
      var treeSheetL = getSheet('الشجرة العائلية');
      for (var li = 0; li < treeNodesL.length; li++) {
        var tn = treeNodesL[li];
        if (!String(tn['رقم العضو'] || '').trim() &&
            String(tn['اسم العضو'] || '').trim() === colMap['الاسم الأول'] &&
            String(tn['رقم الأب']  || '').trim() === parentNodeIdFromReg) {
          var lRow = findRow('الشجرة العائلية', 0, String(tn['رقم العقدة']));
          if (lRow) {
            var mCol = lRow.headers.indexOf('رقم العضو') + 1;
            if (mCol > 0) {
              treeSheetL.getRange(lRow.rowIndex, mCol).setValue(memberId);
              autoNodeId = String(tn['رقم العقدة']);
              autoLinked = true;
              treeReason = 'ربط تلقائي بعقدة أضافها المدير مسبقاً';
            }
          }
          break;
        }
      }
    } catch(e3) { Logger.log('خطأ ربط الشجرة (3): ' + e3.message); }
  }

  // ربط تلقائي (4): اختار "هذا ابني" — المستخدم أب لعقدة موجودة
  var sonNodeIdFromReg = String(req['رقم عقدة الابن'] || '').trim();
  if (!autoLinked && sonNodeIdFromReg) {
    try {
      var treeS4   = sheetToObjects('الشجرة العائلية');
      var sheetS4  = getSheet('الشجرة العائلية');
      var hdrsS4   = sheetS4.getDataRange().getValues()[0];
      var sonNodeS4 = null;
      for (var si4 = 0; si4 < treeS4.length; si4++) {
        if (String(treeS4[si4]['رقم العقدة']) === sonNodeIdFromReg) { sonNodeS4 = treeS4[si4]; break; }
      }
      if (sonNodeS4) {
        var sonParentS4  = String(sonNodeS4['رقم الأب']     || '');
        var sonGenS4     = Number(sonNodeS4['مستوى الجيل'] || 1);
        var sonPathS4    = String(sonNodeS4['المسار']       || '');
        var userGenS4    = sonGenS4 - 1;
        var userPathS4   = sonPathS4.split(' ← ').slice(0, -1).join(' ← ');
        var parentS4     = treeS4.find(function(n) { return String(n['رقم العقدة']) === sonParentS4; });
        var parentNameS4 = parentS4 ? String(parentS4['اسم العضو'] || '') : '';
        var userNodeS4   = generateId('N');
        var fnS4         = colMap['الاسم الأول'] || '';
        var tMapS4 = {
          'رقم العقدة': userNodeS4, 'رقم العضو': memberId, 'اسم العضو': fnS4,
          'رقم الأب': sonParentS4, 'اسم الأب': parentNameS4,
          'مستوى الجيل': userGenS4, 'المسار': userPathS4, 'حي/ميت': 'حي',
        };
        sheetS4.appendRow(hdrsS4.map(function(h) { return tMapS4[h] !== undefined ? tMapS4[h] : ''; }));
        formatLastRow(sheetS4);
        // إعادة تعيين الابن تحت المستخدم الجديد
        var sonRowS4 = findRow('الشجرة العائلية', 0, sonNodeIdFromReg);
        if (sonRowS4) {
          var setS4 = function(col, val) {
            var c = sonRowS4.headers.indexOf(col) + 1;
            if (c > 0) sheetS4.getRange(sonRowS4.rowIndex, c).setValue(val);
          };
          setS4('رقم الأب', userNodeS4);
          setS4('اسم الأب', fnS4);
        }
        syncFatherChildrenToTree(memberId, userNodeS4, fnS4, userGenS4, userPathS4);
        autoNodeId = userNodeS4;
        autoLinked = true;
        treeReason = 'ربط تلقائي — العضو أب لعقدة موجودة في الشجرة';
      }
    } catch(e4) { Logger.log('خطأ ربط الشجرة (4): ' + e4.message); }
  }

  return {
    success:      true,
    memberId:     memberId,
    nodeId:       autoNodeId || null,
    autoLinked:   autoLinked,
    tempPassword: hasPreset ? null : tempPass,
    message:      autoLinked
      ? 'تم قبول الطلب وإنشاء الحساب وربطه بالشجرة تلقائياً'
      : (hasPreset
          ? 'تم قبول الطلب وإنشاء الحساب'
          : 'تم قبول الطلب وإنشاء الحساب. كلمة المرور المؤقتة: ' + tempPass)
  };
}

/* ═══ تعديل طلب تسجيل معلق (قبل الموافقة) ══════════════════════════════ */

function updatePendingRequest(body) {
  var requestId = String(body.requestId || '').trim();
  if (!requestId) return { success: false, message: 'رقم الطلب مطلوب' };

  var found = findRow('طلبات التسجيل', 0, requestId);
  if (!found) return { success: false, message: 'الطلب غير موجود' };

  var req = rowToObject(found.headers, found.rowData);
  if (String(req['الحالة'] || '') !== 'معلق') {
    return { success: false, message: 'لا يمكن تعديل طلب غير معلق' };
  }

  var sheet   = getSheet('طلبات التسجيل');
  var headers = found.headers;
  var rowIdx  = found.rowIndex;

  var editable = ['الاسم الأول', 'اسم الأب', 'اسم الجد', 'رقم الجوال', 'رقم الهوية', 'الفخذ', 'المهنة', 'تاريخ الميلاد', 'المدينة'];
  editable.forEach(function(field) {
    if (body[field] !== undefined && body[field] !== null) {
      var col = headers.indexOf(field) + 1;
      if (col > 0) sheet.getRange(rowIdx, col).setValue(normalizeInput(String(body[field])));
    }
  });

  return { success: true, message: 'تم تحديث بيانات الطلب' };
}

/* ═══ رفض طلب تسجيل ════════════════════════════════════════════════════ */

function rejectRequest(body) {
  var requestId = String(body.requestId || '').trim();
  var notes     = String(body.notes     || '').trim();

  if (!requestId) return { success: false, message: 'رقم الطلب مطلوب' };

  var found = findRow('طلبات التسجيل', 0, requestId);
  if (!found) return { success: false, message: 'الطلب غير موجود' };

  var sheet     = getSheet('طلبات التسجيل');
  var headers   = found.headers;
  var statusCol = headers.indexOf('الحالة')    + 1;
  var notesCol  = headers.indexOf('ملاحظات')   + 1;

  sheet.getRange(found.rowIndex, statusCol).setValue('مرفوض');
  if (notes && notesCol > 0) {
    sheet.getRange(found.rowIndex, notesCol).setValue(notes);
  }

  return { success: true, message: 'تم رفض الطلب' };
}

/* ═══ جلب جميع الأعضاء ═════════════════════════════════════════════════ */

function getAllMembers(body) {
  var members = sheetToObjects('الأعضاء');
  var result  = members.map(function(m) {
    return buildUserObject(m);
  });
  return { success: true, members: result, total: result.length };
}

/* ═══ تفعيل / تعطيل حساب عضو ══════════════════════════════════════════ */

function toggleMemberStatus(body) {
  var memberId = String(body.memberId || '').trim();
  if (!memberId) return { success: false, message: 'رقم العضو مطلوب' };

  var found = findRow('الأعضاء', 0, memberId);
  if (!found) return { success: false, message: 'العضو غير موجود' };

  var sheet     = getSheet('الأعضاء');
  var headers   = found.headers;
  var statusCol = headers.indexOf('حالة الحساب') + 1;
  var current   = String(found.rowData[statusCol - 1] || 'نشط');
  var newStatus = current === 'نشط' ? 'موقوف' : 'نشط';

  sheet.getRange(found.rowIndex, statusCol).setValue(newStatus);

  return {
    success:   true,
    newStatus: newStatus,
    message:   'تم تغيير حالة الحساب إلى: ' + newStatus
  };
}

/* ═══ إضافة عضو مباشرة (المدير فقط) ══════════════════════════════════════ */

function addMember(body) {
  var firstName    = normalizeInput(body.firstName    || '');
  var rawPhone     = body.phone                       || '';
  var nationalId   = normalizeInput(body.nationalId   || '');
  var parentNodeId = normalizeInput(body.parentNodeId || '');
  var tempPassword = normalizeInput(body.tempPassword || '');
  var role         = normalizeInput(body.role         || 'عضو');
  var aliveStatus  = normalizeInput(body.aliveStatus  || 'حي');
  var isDeceased   = aliveStatus === 'متوفى';

  if (!firstName) return { success: false, message: 'الاسم الأول مطلوب' };

  // تحقق من تفرد رقم الهوية والجوال — فقط إذا أُدخلا
  var phone = '';
  if (!isDeceased) {
    if (nationalId) {
      var members = sheetToObjects('الأعضاء');
      var dupNId  = members.some(function(m) { return String(m['رقم الهوية'] || '').trim() === nationalId; });
      if (dupNId) return { success: false, message: 'رقم الهوية مسجّل مسبقاً' };
    }
    if (rawPhone) {
      phone = normalizePhone(normalizeInput(rawPhone));
      if (findRowByPhone(phone)) return { success: false, message: 'رقم الجوال مسجّل مسبقاً' };
    }
  }

  // بيانات الاتصال مكتملة؟ (هوية + جوال + كلمة مرور)
  var hasContactInfo = !isDeceased && rawPhone && nationalId && tempPassword && tempPassword.length >= 6;

  // جلب بيانات الأب من الشجرة أو من سجل الأبناء
  var generation          = '';
  var parentNode          = null;
  var fatherName          = normalizeInput(body.fatherName         || '');
  var parentChildRecordId = normalizeInput(body.parentChildRecordId|| '');
  var treeNodes           = parentNodeId ? sheetToObjects('الشجرة العائلية') : [];

  if (parentNodeId && parentChildRecordId) {
    // الأب سجل ابن (غير مسجل كعضو) — نُنشئ له عقدة في الشجرة أولاً
    var childRecs = sheetToObjects('الأبناء');
    var childRec  = null;
    for (var ci = 0; ci < childRecs.length; ci++) {
      if (String(childRecs[ci]['رقم السجل']) === parentChildRecordId) { childRec = childRecs[ci]; break; }
    }
    if (childRec) {
      if (!fatherName) fatherName = String(childRec['الاسم'] || '');
      var grandParentMemberId = String(childRec['رقم العضو الأب'] || '');
      var grandParentNode     = null;
      for (var gpi = 0; gpi < treeNodes.length; gpi++) {
        if (String(treeNodes[gpi]['رقم العضو']) === grandParentMemberId) { grandParentNode = treeNodes[gpi]; break; }
      }
      if (grandParentNode) {
        var crGen    = Number(grandParentNode['مستوى الجيل'] || 1) + 1;
        var crNodeId = generateId('N');
        var crPath   = String(grandParentNode['المسار'] || grandParentNode['اسم العضو'] || '') + ' ← ' + fatherName;
        var crSheet  = getSheet('الشجرة العائلية');
        var crHdrs   = crSheet.getDataRange().getValues()[0];
        var crMap    = {
          'رقم العقدة':  crNodeId, 'رقم العضو':   '', 'اسم العضو':   fatherName,
          'رقم الأب':    String(grandParentNode['رقم العقدة']), 'اسم الأب': String(grandParentNode['اسم العضو'] || ''),
          'مستوى الجيل': crGen, 'المسار': crPath, 'حي/ميت': String(childRec['حي/ميت'] || 'حي'),
        };
        crSheet.appendRow(crHdrs.map(function(h) { return crMap[h] !== undefined ? crMap[h] : ''; }));
        formatLastRow(crSheet);
        parentNodeId = crNodeId;
        parentNode   = crMap;
        generation   = String(crGen + 1);
      }
    }
  } else if (parentNodeId) {
    for (var ti = 0; ti < treeNodes.length; ti++) {
      if (String(treeNodes[ti]['رقم العقدة']) === parentNodeId) { parentNode = treeNodes[ti]; break; }
    }
    if (parentNode) {
      if (!fatherName) fatherName = String(parentNode['اسم العضو'] || '');
      generation = String(Number(parentNode['مستوى الجيل'] || 1) + 1);
    }
  }

  // ── شجرة فقط: متوفى أو حي بدون بيانات تواصل كاملة ─────────────────
  if (isDeceased || !hasContactInfo) {
    var dSheet   = getSheet('الشجرة العائلية');
    var dHdrs    = dSheet.getDataRange().getValues()[0];
    var dPName   = parentNode ? String(parentNode['اسم العضو'] || '') : (fatherName || '');
    var dGen     = parentNode ? (Number(parentNode['مستوى الجيل'] || 1) + 1) : 1;
    var dPath    = parentNode ? (String(parentNode['المسار'] || dPName) + ' ← ' + firstName) : firstName;
    var dNodeId  = generateId('N');
    var dColMap  = {
      'رقم العقدة':  dNodeId, 'رقم العضو': '', 'اسم العضو': firstName,
      'رقم الأب':    parentNodeId || '', 'اسم الأب': dPName,
      'مستوى الجيل': dGen, 'المسار': dPath, 'حي/ميت': aliveStatus,
    };
    dSheet.appendRow(dHdrs.map(function(h) { return dColMap[h] !== undefined ? dColMap[h] : ''; }));
    formatLastRow(dSheet);
    var dMsg = isDeceased
      ? 'تم إضافة ' + firstName + ' إلى الشجرة العائلية'
      : 'تم إضافة ' + firstName + ' إلى الشجرة. سيُربط بحسابه تلقائياً عند تسجيله في الموقع';
    return { success: true, nodeId: dNodeId, message: dMsg };
  }

  var memberId   = generateId('M');
  var today      = formatDate(new Date());
  var passHash   = isDeceased ? '' : hashPassword(tempPassword);
  var tempExpiry = isDeceased ? '' : formatDate(new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000));

  var memberSheet   = getSheet('الأعضاء');
  var memberHeaders = memberSheet.getDataRange().getValues()[0];

  var colMap = {
    'رقم العضو':           memberId,
    'الاسم الأول':         firstName,
    'اسم الأب':            fatherName,
    'اسم الجد':            normalizeInput(body.grandfatherName || ''),
    'الفخذ':               normalizeInput(body.branch          || ''),
    'الجيل':               generation,
    'رقم الجوال':          phone,
    'البريد الإلكتروني':   normalizeInput(body.email           || ''),
    'تاريخ الميلاد':       normalizeInput(body.birthDate        || ''),
    'العمر':               '',
    'المدينة':             normalizeInput(body.city             || ''),
    'المهنة':              normalizeInput(body.job              || ''),
    'كلمة المرور':         passHash,
    'كلمة المرور المؤقتة': passHash,
    'انتهاء المؤقتة':      tempExpiry,
    'الدور':               role,
    'حالة الحساب':         isDeceased ? 'موقوف' : 'نشط',
    'تاريخ التسجيل':       today,
    'رقم الهوية':          nationalId,
    'حي/ميت':              aliveStatus,
    'الحالة الاجتماعية':   isDeceased ? '' : normalizeInput(body.maritalStatus || ''),
    'الحي':                normalizeInput(body.neighborhood  || ''),
  };

  var newRow = memberHeaders.map(function(h) {
    return colMap[h] !== undefined ? colMap[h] : '';
  });

  // اكتب في أول صف فارغ من الأعلى (تجنباً للمعادلات التي تملأ نهاية الجدول)
  var colAVals = memberSheet.getRange(1, 1, memberSheet.getMaxRows(), 1).getValues();
  var targetRow = 2;
  for (var ri = 1; ri < colAVals.length; ri++) {
    if (String(colAVals[ri][0]).trim() === '') { targetRow = ri + 1; break; }
  }
  memberSheet.getRange(targetRow, 1, 1, newRow.length).setValues([newRow]);
  formatLastRow(memberSheet);

  // كتابة الحالة الاجتماعية صراحةً لتجاوز أي تحقق بيانات في الجدول
  if (!isDeceased) {
    var msColIdx = memberHeaders.indexOf('الحالة الاجتماعية');
    if (msColIdx > -1) {
      var msRange = memberSheet.getRange(targetRow, msColIdx + 1);
      msRange.clearDataValidations();
      msRange.setValue(normalizeInput(body.maritalStatus || ''));
    }
  }

  var bdayColIdx = memberHeaders.indexOf('تاريخ الميلاد');
  var ageColIdx  = memberHeaders.indexOf('العمر');
  if (bdayColIdx > -1 && ageColIdx > -1) {
    var bdayRaw = String(body.birthDate || '').trim();
    if (bdayRaw) {
      try {
        var bDateAm = new Date(bdayRaw);
        if (!isNaN(bDateAm.getTime())) {
          var ageAm = Math.floor((new Date() - bDateAm) / (365.25 * 24 * 60 * 60 * 1000));
          if (ageAm >= 0 && ageAm < 150) memberSheet.getRange(targetRow, ageColIdx + 1).setValue(ageAm);
        }
      } catch(_) {}
    }
  }

  // ربط تلقائي بالشجرة
  var autoNodeId = '';
  if (parentNodeId && parentNode) {
    try {
      var treeSheet = getSheet('الشجرة العائلية');
      var tHeaders  = treeSheet.getDataRange().getValues()[0];
      var pName     = String(parentNode['اسم العضو'] || '');
      var gen       = Number(parentNode['مستوى الجيل'] || 1) + 1;
      var path      = String(parentNode['المسار'] || pName) + ' ← ' + firstName;
      autoNodeId    = generateId('N');
      var tColMap   = {
        'رقم العقدة':  autoNodeId,
        'رقم العضو':   memberId,
        'اسم العضو':   firstName,
        'رقم الأب':    parentNodeId,
        'اسم الأب':    pName,
        'مستوى الجيل': gen,
        'المسار':      path,
        'حي/ميت':      normalizeInput(body.aliveStatus || 'حي'),
      };
      var tRow = tHeaders.map(function(h) { return tColMap[h] !== undefined ? tColMap[h] : ''; });
      treeSheet.appendRow(tRow);
      formatLastRow(treeSheet);
      linkChildRecordToMember(memberId, firstName, String(parentNode['رقم العضو'] || ''), nationalId);
    } catch(e) { Logger.log('خطأ ربط الشجرة: ' + e.message); }
  }

  return {
    success:  true,
    memberId: memberId,
    nodeId:   autoNodeId || null,
    message:  'تم إضافة العضو بنجاح' + (autoNodeId ? ' وربطه بالشجرة' : ''),
  };
}

/* ═══ تنظيف الصفوف الفارغة من جدول الأعضاء (تُشغَّل مرة واحدة فقط) ══════ */

function cleanEmptyMemberRows() {
  var sheet = getSheet('الأعضاء');
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2) { Logger.log('لا توجد صفوف للتنظيف'); return; }

  var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var toDelete = [];

  for (var i = data.length - 1; i >= 0; i--) {
    var isEmpty = data[i].every(function(cell) { return String(cell).trim() === ''; });
    if (isEmpty) toDelete.push(i + 2); // +2 because row 1 is header, array is 0-indexed
  }

  Logger.log('صفوف فارغة للحذف: ' + toDelete.length);
  toDelete.forEach(function(rowNum) { sheet.deleteRow(rowNum); });
  Logger.log('تم الحذف. آخر صف الآن: ' + sheet.getLastRow());
}

/* ═══ عداد المتصلين (تقريبي عبر وقت آخر تسجيل دخول) ═══════════════════ */

function getOnlineUsers(body) {
  // في Apps Script لا يوجد جلسات حقيقية
  // نعيد عدد الأعضاء النشطين كمؤشر
  var members = sheetToObjects('الأعضاء');
  var active  = members.filter(function(m) {
    return m['حالة الحساب'] !== 'موقوف';
  }).length;

  return { success: true, onlineCount: active };
}
