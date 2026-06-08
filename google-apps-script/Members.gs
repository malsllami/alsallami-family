/* ═══════════════════════════════════════════════════════════════════════════
   Members.gs — بيانات الأعضاء والأسرة
   ═══════════════════════════════════════════════════════════════════════════ */

/* ═══ جلب بيانات عضو واحد ════════════════════════════════════════════════ */

function getMemberData(body) {
  var memberId = String(body.memberId || '').trim();
  if (!memberId) return { success: false, message: 'رقم العضو مطلوب' };

  var found = findRow('الأعضاء', 0, memberId);
  if (!found) return { success: false, message: 'العضو غير موجود' };

  var member = rowToObject(found.headers, found.rowData);
  var user   = buildUserObject(member);

  function normalizeFatherName(fatherName, grandfatherName) {
    fatherName = String(fatherName || '').trim();
    grandfatherName = String(grandfatherName || '').trim();
    if (!fatherName) return '';
    if (grandfatherName) {
      var suffix = ' ' + grandfatherName;
      if (fatherName.endsWith(suffix)) {
        fatherName = fatherName.slice(0, fatherName.length - suffix.length).trim();
      }
    }
    return fatherName;
  }

  // ضمان وجود الحقول الإضافية
  if (!user.email)      user.email         = String(member['البريد الإلكتروني'] || '');
  if (!user.city)       user.city          = String(member['المدينة']           || '');
  if (!user.job)        user.job           = String(member['المهنة']            || '');
  if (!user.nationalId) user.nationalId    = String(member['رقم الهوية']        || '');
  if (!user.branch)     user.branch        = String(member['الفخذ']              || '');

  user.fatherName      = normalizeFatherName(member['اسم الأب'], member['اسم الجد']);
  user.grandfatherName = String(member['اسم الجد'] || '');

  // جلب الزوجات
  var wives = sheetToObjects('الزوجات').filter(function(w) {
    return String(w['رقم العضو']) === memberId;
  }).map(function(w) {
    return {
      id:     String(w['رقم السجل']    || ''),
      name:   String(w['اسم الزوجة']  || ''),
      family: String(w['عائلة الزوجة'] || ''),
      status: String(w['حالة الزواج'] || 'مستمرة'),
      alive:  w['حي/ميت'] === 'متوفى' ? false : true,
      notes:  String(w['ملاحظات']     || ''),
    };
  });

  // جلب الأبناء
  var seenChildIds = {};
  var children = sheetToObjects('الأبناء').filter(function(c) {
    return String(c['رقم العضو الأب']) === memberId;
  }).map(function(c) {
    return {
      id:         String(c['رقم السجل']      || ''),
      name:       String(c['الاسم']          || ''),
      gender:     String(c['الجنس']          || 'ذكر'),
      birthDate:  formatDate(c['تاريخ الميلاد']),
      alive:      c['حي/ميت'] === 'متوفى' ? false : true,
      job:        String(c['المهنة']         || ''),
      nationalId: String(c['رقم الهوية']     || ''),
      notes:      String(c['ملاحظات']        || ''),
    };
  }).filter(function(c) {
    if (!c.id) return true;
    if (seenChildIds[c.id]) return false;
    seenChildIds[c.id] = true;
    return true;
  });

  // فحص ما إذا تمت إضافة هذا العضو مسبقاً كابن من قِبل والده
  var preLinked = null;
  var nid = String(member['رقم الهوية'] || '').trim();
  if (nid) {
    var allChildren = sheetToObjects('الأبناء');
    for (var ci = 0; ci < allChildren.length; ci++) {
      var cr = allChildren[ci];
      if (String(cr['رقم الهوية'] || '').trim() === nid &&
          String(cr['رقم عضو الابن'] || '').trim() === memberId) {
        var fatherMId   = String(cr['رقم العضو الأب'] || '');
        var fatherName  = '';
        if (fatherMId) {
          var fatherRow = findRow('الأعضاء', 0, fatherMId);
          if (fatherRow) {
            var fatherObj = rowToObject(fatherRow.headers, fatherRow.rowData);
            fatherName = String(fatherObj['الاسم الأول'] || '');
            if (!user.fatherName) user.fatherName = fatherName;
            if (!user.grandfatherName && fatherObj['اسم الأب']) user.grandfatherName = String(fatherObj['اسم الأب']);
            if (!user.branch && fatherObj['الفخذ']) user.branch = String(fatherObj['الفخذ']);

            var missingMemberCols = {};
            if (user.fatherName && !String(member['اسم الأب'] || '').trim()) missingMemberCols['اسم الأب'] = user.fatherName;
            if (user.grandfatherName && !String(member['اسم الجد'] || '').trim()) missingMemberCols['اسم الجد'] = user.grandfatherName;
            if (user.branch && !String(member['الفخذ'] || '').trim()) missingMemberCols['الفخذ'] = user.branch;
            if (Object.keys(missingMemberCols).length) {
              var memberSheet = getSheet('الأعضاء');
              var memberHeaders = found.headers;
              Object.keys(missingMemberCols).forEach(function(colName) {
                var colIndex = memberHeaders.indexOf(colName) + 1;
                if (colIndex > 0) memberSheet.getRange(found.rowIndex, colIndex).setValue(missingMemberCols[colName]);
              });
            }
          }
        }
        preLinked = {
          fatherMemberId: fatherMId,
          fatherName:     fatherName || 'والدك',
          childName:      String(cr['الاسم'] || ''),
        };
        break;
      }
    }
    if (!preLinked) {
      for (var ci = 0; ci < allChildren.length; ci++) {
        var cr = allChildren[ci];
        if (String(cr['رقم الهوية'] || '').trim() === nid) {
          var fatherMId   = String(cr['رقم العضو الأب'] || '');
          var fatherName  = '';
          if (fatherMId) {
            var fatherRow = findRow('الأعضاء', 0, fatherMId);
            if (fatherRow) {
              var fatherObj = rowToObject(fatherRow.headers, fatherRow.rowData);
              fatherName = String(fatherObj['الاسم الأول'] || '');
              if (!user.fatherName) user.fatherName = fatherName;
              if (!user.grandfatherName && fatherObj['اسم الأب']) user.grandfatherName = String(fatherObj['اسم الأب']);
              if (!user.branch && fatherObj['الفخذ']) user.branch = String(fatherObj['الفخذ']);

              var missingMemberCols = {};
              if (user.fatherName && !String(member['اسم الأب'] || '').trim()) missingMemberCols['اسم الأب'] = user.fatherName;
              if (user.grandfatherName && !String(member['اسم الجد'] || '').trim()) missingMemberCols['اسم الجد'] = user.grandfatherName;
              if (user.branch && !String(member['الفخذ'] || '').trim()) missingMemberCols['الفخذ'] = user.branch;
              if (Object.keys(missingMemberCols).length) {
                var memberSheet = getSheet('الأعضاء');
                var memberHeaders = found.headers;
                Object.keys(missingMemberCols).forEach(function(colName) {
                  var colIndex = memberHeaders.indexOf(colName) + 1;
                  if (colIndex > 0) memberSheet.getRange(found.rowIndex, colIndex).setValue(missingMemberCols[colName]);
                });
              }
            }
          }
          preLinked = {
            fatherMemberId: fatherMId,
            fatherName:     fatherName || 'والدك',
            childName:      String(cr['الاسم'] || ''),
          };
          if (String(cr['رقم عضو الابن'] || '').trim() !== memberId) {
            var childRow = findRow('الأبناء', 0, String(cr['رقم السجل'] || ''));
            if (childRow) {
              var col = childRow.headers.indexOf('رقم عضو الابن') + 1;
              if (col > 0) getSheet('الأبناء').getRange(childRow.rowIndex, col).setValue(memberId);
            }
          }
          break;
        }
      }
    }
  }

  // جلب آخر طلب شجرة مرفوض لهذا العضو (لعرض سبب الرفض)
  var treeRequestStatus = null;
  try {
    var treeReqs = sheetToObjects('طلبات الشجرة');
    var memberTreeReqs = treeReqs.filter(function(r) {
      return String(r['رقم العضو'] || '') === memberId;
    });
    if (memberTreeReqs.length) {
      var lastReq = memberTreeReqs[memberTreeReqs.length - 1];
      treeRequestStatus = {
        status: String(lastReq['الحالة'] || ''),
        reason: String(lastReq['سبب الرفض'] || ''),
        date:   String(lastReq['تاريخ الطلب'] || ''),
      };
    }
  } catch(_) {}

  return {
    success:           true,
    member:            user,
    wives:             wives,
    children:          children,
    preLinked:         preLinked,
    treeRequestStatus: treeRequestStatus,
  };
}

/* ═══ تعديل بيانات العضو الشخصية ════════════════════════════════════════ */

function updateMemberInfo(body) {
  var memberId = String(body.memberId || '').trim();
  if (!memberId) return { success: false, message: 'رقم العضو مطلوب' };

  var found = findRow('الأعضاء', 0, memberId);
  if (!found) return { success: false, message: 'العضو غير موجود' };

  var sheet   = getSheet('الأعضاء');
  var headers = found.headers;
  var rowIdx  = found.rowIndex;

  var allowed = ['الاسم الأول', 'البريد الإلكتروني', 'رقم الجوال', 'المدينة', 'المهنة', 'الفخذ', 'رقم الهوية', 'تاريخ الميلاد', 'الحالة الاجتماعية', 'اسم الأب', 'اسم الجد'];

  allowed.forEach(function(field) {
    if (body[field] !== undefined) {
      var col = headers.indexOf(field) + 1;
      if (col > 0) sheet.getRange(rowIdx, col).setValue(String(body[field]).trim());
    }
  });

  return { success: true, message: 'تم تحديث البيانات بنجاح' };
}

/* ═══ إضافة زوجة ════════════════════════════════════════════════════════ */

function addWife(body) {
  var memberId = String(body.memberId || '').trim();
  var name     = String(body.name     || '').trim();
  if (!memberId || !name) return { success: false, message: 'رقم العضو واسم الزوجة مطلوبان' };

  var sheet   = getSheet('الزوجات');
  var headers = sheet.getDataRange().getValues()[0];
  var id      = generateId('W');

  var map = {};
  map['رقم السجل']    = id;
  map['رقم العضو']    = memberId;
  map['اسم الزوجة']  = name;
  map['عائلة الزوجة'] = String(body.family || '').trim();
  map['حالة الزواج']  = String(body.status || 'مستمرة').trim();
  map['حي/ميت']       = body.alive === false ? 'متوفى' : 'حي';
  map['ملاحظات']      = String(body.notes  || '').trim();

  sheet.appendRow(headers.map(function(h) { return map[h] !== undefined ? map[h] : ''; }));
  formatLastRow(sheet);

  return { success: true, wifeId: id, message: 'تمت إضافة الزوجة بنجاح' };
}

/* ═══ تعديل زوجة ════════════════════════════════════════════════════════ */

function updateWife(body) {
  var wifeId = String(body.wifeId || '').trim();
  if (!wifeId) return { success: false, message: 'رقم السجل مطلوب' };

  var found = findRow('الزوجات', 0, wifeId);
  if (!found) return { success: false, message: 'السجل غير موجود' };

  var sheet   = getSheet('الزوجات');
  var headers = found.headers;
  var rowIdx  = found.rowIndex;

  var fields = {
    'اسم الزوجة':  body.name,
    'عائلة الزوجة': body.family,
    'حالة الزواج':  body.status,
  };
  if (body.alive !== undefined)
    fields['حي/ميت'] = (body.alive === false || body.alive === 'false') ? 'متوفى' : 'حي';

  Object.keys(fields).forEach(function(f) {
    if (fields[f] !== undefined && fields[f] !== null) {
      var col = headers.indexOf(f) + 1;
      if (col > 0) sheet.getRange(rowIdx, col).setValue(String(fields[f]).trim());
    }
  });

  return { success: true, message: 'تم التعديل بنجاح' };
}

/* ═══ حذف زوجة ══════════════════════════════════════════════════════════ */

function removeWife(body) {
  var wifeId = String(body.wifeId || '').trim();
  if (!wifeId) return { success: false, message: 'رقم السجل مطلوب' };

  var found = findRow('الزوجات', 0, wifeId);
  if (!found) return { success: false, message: 'السجل غير موجود' };

  getSheet('الزوجات').deleteRow(found.rowIndex);
  return { success: true, message: 'تم الحذف بنجاح' };
}

/* ═══ إضافة ابن / ابنة ═══════════════════════════════════════════════════ */

function addChild(body) {
  var memberId = String(body.memberId || '').trim();
  var name     = String(body.name     || '').trim();
  var birthDate = String(body.birthDate || '').trim();
  var nationalId = String(body.nationalId || '').trim();
  if (!memberId || !name) return { success: false, message: 'رقم العضو واسم الابن مطلوبان' };
  if (!birthDate) return { success: false, message: 'تاريخ الميلاد مطلوب' };
  if (!nationalId) return { success: false, message: 'رقم الهوية مطلوب' };

  var treeNodes = sheetToObjects('الشجرة العائلية');
  var fatherNode = null;
  for (var ti = 0; ti < treeNodes.length; ti++) {
    if (String(treeNodes[ti]['رقم العضو'] || '') === memberId) { fatherNode = treeNodes[ti]; break; }
  }
  // إذا لم يُوجد برقم العضو — ابحث بالاسم (حالة عقدة أضافها المدير بدون ربط رقم عضو)
  if (!fatherNode) {
    var allMbrs = sheetToObjects('الأعضاء');
    var mbr = null;
    for (var mi = 0; mi < allMbrs.length; mi++) {
      if (String(allMbrs[mi]['رقم العضو'] || '') === memberId) { mbr = allMbrs[mi]; break; }
    }
    if (mbr) {
      var mbFirstName = String(mbr['الاسم الأول'] || '').trim();
      var mbFatherName = String(mbr['اسم الأب'] || '').trim();
      for (var ti2 = 0; ti2 < treeNodes.length; ti2++) {
        var tn2 = treeNodes[ti2];
        if (!String(tn2['رقم العضو'] || '').trim() &&
            String(tn2['اسم العضو'] || '').trim() === mbFirstName) {
          // تحقق إضافي بالأب إن أمكن
          var tnParentName = String(tn2['اسم الأب'] || '').trim();
          if (!mbFatherName || !tnParentName || tnParentName === mbFatherName) {
            fatherNode = tn2;
            // اكتب رقم العضو في عقدة الشجرة لتجنب التكرار مستقبلاً
            try {
              var lRow2 = findRow('الشجرة العائلية', 0, String(tn2['رقم العقدة']));
              if (lRow2) {
                var mCol2 = lRow2.headers.indexOf('رقم العضو') + 1;
                if (mCol2 > 0) getSheet('الشجرة العائلية').getRange(lRow2.rowIndex, mCol2).setValue(memberId);
              }
            } catch(e) { Logger.log('خطأ كتابة رقم العضو في الشجرة: ' + e.message); }
            break;
          }
        }
      }
    }
  }
  if (!fatherNode) return { success: false, message: 'يجب أن تكون مرتبطاً في الشجرة أولاً حتى يمكن إضافة الابن في التسلسل' };

  var sheet      = getSheet('الأبناء');
  var headers    = sheet.getDataRange().getValues()[0];
  var id         = generateId('C');

  // إذا كان الابن مسجلاً مسبقاً كعضو برقم هويته → استخدم رقمه الحالي
  // وإلا → ولّد رقم عضو محجوز مسبقاً لاستخدامه عند تسجيله مستقبلاً
  var preAssignedMemberId = '';
  if (nationalId) {
    var allMembers = sheetToObjects('الأعضاء');
    for (var mi = 0; mi < allMembers.length; mi++) {
      if (String(allMembers[mi]['رقم الهوية'] || '').trim() === nationalId) {
        preAssignedMemberId = String(allMembers[mi]['رقم العضو'] || '');
        break;
      }
    }
  }
  if (!preAssignedMemberId) preAssignedMemberId = generateId('M');

  // إضافة الابن مباشرة في الشجرة تحت الأب إذا كان الأب موجوداً فيها
  var childNodeId = '';
  var isFemale   = String(body.gender || '').trim() === 'أنثى';
  var hasNidBody = nationalId !== '';

  // إذا كان رقم العضو المحجوز للابن موجوداً مسبقاً في الشجرة → لا تُنشئ عقدة مكررة
  var alreadyInTreeAsChild = false;
  if (preAssignedMemberId) {
    for (var tc = 0; tc < treeNodes.length; tc++) {
      if (String(treeNodes[tc]['رقم العضو'] || '') === preAssignedMemberId) {
        alreadyInTreeAsChild = true;
        childNodeId = String(treeNodes[tc]['رقم العقدة'] || '');
        break;
      }
    }
  }

  // بحث احتياطي: عقدة بنفس الاسم الأول تحت نفس الأب (ولو مختلفة رقم العضو)
  if (!alreadyInTreeAsChild && fatherNode) {
    var normArAC = function(s) {
      return String(s || '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').trim();
    };
    var childFirstName = normArAC(name.split(' ')[0]);
    var fatherNodeIdAC = String(fatherNode['رقم العقدة'] || '');
    for (var tc2 = 0; tc2 < treeNodes.length; tc2++) {
      var tn2 = treeNodes[tc2];
      if (String(tn2['رقم الأب'] || '').trim() !== fatherNodeIdAC) continue;
      if (normArAC(String(tn2['اسم العضو'] || '').split(' ')[0]) !== childFirstName) continue;
      // عقدة موجودة بنفس الاسم — ربط رقم العضو بها بدلاً من إنشاء عقدة مكررة
      alreadyInTreeAsChild = true;
      childNodeId = String(tn2['رقم العقدة'] || '');
      var storedMid = String(tn2['رقم العضو'] || '').trim();
      if (preAssignedMemberId && storedMid !== preAssignedMemberId) {
        try {
          var dupRow = findRow('الشجرة العائلية', 0, childNodeId);
          if (dupRow) {
            var dupMCol = dupRow.headers.indexOf('رقم العضو') + 1;
            if (dupMCol > 0) getSheet('الشجرة العائلية').getRange(dupRow.rowIndex, dupMCol).setValue(preAssignedMemberId);
          }
        } catch(e) { Logger.log('خطأ ربط عقدة الابن: ' + e.message); }
      }
      break;
    }
  }

  if (fatherNode && !alreadyInTreeAsChild && (!isFemale || hasNidBody)) {
    var treeSheet = getSheet('الشجرة العائلية');
    var treeHdrs  = treeSheet.getDataRange().getValues()[0];
    childNodeId   = generateId('N');
    var gen  = Number(fatherNode['مستوى الجيل'] || 1) + 1;
    var path = String(fatherNode['المسار'] || fatherNode['اسم العضو'] || '') + ' ← ' + name;
    var tMap = {
      'رقم العقدة':  childNodeId,
      'رقم العضو':   preAssignedMemberId,
      'اسم العضو':   name,
      'رقم الأب':    String(fatherNode['رقم العقدة'] || ''),
      'اسم الأب':    String(fatherNode['اسم العضو']  || ''),
      'مستوى الجيل': gen,
      'المسار':      path,
      'حي/ميت':      body.alive === false ? 'متوفى' : 'حي',
    };
    treeSheet.appendRow(treeHdrs.map(function(h) { return tMap[h] !== undefined ? tMap[h] : ''; }));
    formatLastRow(treeSheet);
  }

  var map = {};
  map['رقم السجل']      = id;
  map['رقم العضو الأب'] = memberId;
  map['رقم عقدة الأب']  = fatherNode ? String(fatherNode['رقم العقدة'] || '') : '';
  map['الاسم']          = name;
  map['الجنس']          = String(body.gender    || 'ذكر').trim();
  map['تاريخ الميلاد']  = String(body.birthDate || '').trim();
  map['حي/ميت']         = body.alive === false ? 'متوفى' : 'حي';
  map['المهنة']          = String(body.job       || '').trim();
  map['رقم الهوية']     = nationalId;
  map['رقم عضو الابن']  = preAssignedMemberId;
  map['ملاحظات']        = String(body.notes     || '').trim();

  sheet.appendRow(headers.map(function(h) { return map[h] !== undefined ? map[h] : ''; }));
  formatLastRow(sheet);

  return {
    success:            true,
    childId:            id,
    nodeId:             childNodeId,
    preAssignedMemberId: preAssignedMemberId,
    addedToTree:        !!childNodeId,
    message: 'تمت إضافة الابن بنجاح' + (childNodeId ? ' وإضافته للشجرة العائلية' : ' (سيُضاف للشجرة عند ربط الأب بها)')
  };
}

/* ═══ تعديل ابن / بنت ════════════════════════════════════════════════════ */

function updateChild(body) {
  var childId = String(body.childId || '').trim();
  if (!childId) return { success: false, message: 'رقم السجل مطلوب' };

  var found = findRow('الأبناء', 0, childId);
  if (!found) return { success: false, message: 'السجل غير موجود' };

  var sheet   = getSheet('الأبناء');
  var headers = found.headers;
  var rowIdx  = found.rowIndex;

  var fields = {
    'الاسم':         body.name,
    'الجنس':         body.gender,
    'تاريخ الميلاد': body.birthDate,
    'المهنة':        body.job,
    'رقم الهوية':    body.nationalId,
  };
  if (body.alive !== undefined)
    fields['حي/ميت'] = (body.alive === false || body.alive === 'false') ? 'متوفى' : 'حي';

  Object.keys(fields).forEach(function(f) {
    if (fields[f] !== undefined && fields[f] !== null) {
      var col = headers.indexOf(f) + 1;
      if (col > 0) sheet.getRange(rowIdx, col).setValue(String(fields[f]).trim());
    }
  });

  return { success: true, message: 'تم التعديل بنجاح' };
}

/* ═══ حذف ابن ════════════════════════════════════════════════════════════ */

function removeChild(body) {
  var childId = String(body.childId || '').trim();
  if (!childId) return { success: false, message: 'رقم السجل مطلوب' };

  var found = findRow('الأبناء', 0, childId);
  if (!found) return { success: false, message: 'السجل غير موجود' };

  getSheet('الأبناء').deleteRow(found.rowIndex);
  return { success: true, message: 'تم الحذف بنجاح' };
}
