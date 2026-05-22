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

  // ضمان وجود الحقول الإضافية
  if (!user.email)         user.email         = String(member['البريد الإلكتروني'] || '');
  if (!user.city)          user.city          = String(member['المدينة']           || '');
  if (!user.job)           user.job           = String(member['المهنة']            || '');
  if (!user.nationalId)    user.nationalId    = String(member['رقم الهوية']        || '');
  if (!user.fatherName)    user.fatherName    = String(member['اسم الأب']           || '');
  if (!user.grandfatherName) user.grandfatherName = String(member['اسم الجد']       || '');
  if (!user.branch)        user.branch        = String(member['الفخذ']              || '');

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
            fatherName = [fatherObj['الاسم الأول'], fatherObj['اسم الأب']].filter(Boolean).join(' ');
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
              fatherName = [fatherObj['الاسم الأول'], fatherObj['اسم الأب']].filter(Boolean).join(' ');
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

  return {
    success:   true,
    member:    user,
    wives:     wives,
    children:  children,
    preLinked: preLinked,
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
  if (fatherNode && (!isFemale || hasNidBody)) {
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
