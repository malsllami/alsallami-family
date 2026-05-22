/* ═══════════════════════════════════════════════════════════════════════════
   Tree.gs — الشجرة العائلية
   ═══════════════════════════════════════════════════════════════════════════ */

/* ═══ جلب الشجرة العائلية كاملة ══════════════════════════════════════════ */

function getFamilyTree(body) {
  var nodes = sheetToObjects('الشجرة العائلية');

  // جلب الزوجات والأبناء والأعضاء مرة واحدة
  var wivesAll    = [];
  var childrenAll = [];
  var membersAll  = [];
  try { wivesAll    = sheetToObjects('الزوجات'); } catch(e) {}
  try { childrenAll = sheetToObjects('الأبناء'); } catch(e) {}
  try { membersAll  = sheetToObjects('الأعضاء'); } catch(e) {}

  // بناء الشجرة — كل عقدة تصبح كائناً مع مصفوفة أبنائها
  var nodeMap = {};
  nodes.forEach(function(n) {
    var id       = String(n['رقم العقدة'] || '');
    var memberId = String(n['رقم العضو']  || '');
    if (!id || nodeMap[id]) return;

    // زوجات هذا العضو
    var nodeWives = [];
    if (memberId) {
      nodeWives = wivesAll.filter(function(w) {
        return String(w['رقم العضو']) === memberId;
      }).map(function(w) {
        var rid   = String(w['رقم السجل'] || '');
        var alive = w['حي/ميت'] === 'متوفى' ? false : true;
        return {
          id:           'wife_' + rid,
          wifeRecordId: rid,
          name:         String(w['اسم الزوجة'] || ''),
          gender:       'female',
          alive:        alive,
          isWife:       true,
        };
      });
    }

    nodeMap[id] = {
      id:         id,
      memberId:   memberId,
      name:       String(n['اسم العضو']    || ''),
      parentId:   String(n['رقم الأب']     || ''),
      parentName: String(n['اسم الأب']     || ''),
      generation: Number(n['مستوى الجيل'] || 1),
      path:       String(n['المسار']       || ''),
      gender:     'male',
      alive:      n['حي/ميت'] === 'حي' || n['حي/ميت'] === true,
      marital:    '',
      job:        '',
      location:   '',
      phone:      '',
      wives:      nodeWives,
      children:   [],
    };
  });

  // إثراء بيانات الشجرة من جدول الأعضاء (المهنة والمدينة)
  Object.keys(nodeMap).forEach(function(id) {
    var node   = nodeMap[id];
    if (!node.memberId) return;
    var member = membersAll.find(function(m) { return String(m['رقم العضو']) === node.memberId; });
    if (!member) return;
    if (member['المهنة'])            node.job     = String(member['المهنة']);
    if (member['المدينة'])           node.location = String(member['المدينة']);
    if (member['الحالة الاجتماعية']) node.marital  = String(member['الحالة الاجتماعية']);
    if (member['رقم الجوال'])        node.phone    = String(member['رقم الجوال']);
  });

  // ربط عقد الشجرة بآبائهم
  var roots = [];
  Object.keys(nodeMap).forEach(function(id) {
    var node     = nodeMap[id];
    var parentId = node.parentId;
    if (parentId && nodeMap[parentId]) {
      nodeMap[parentId].children.push(node);
    } else {
      roots.push(node);
    }
  });

  // بناء فهرس للأرقام التي لها عقدة فعلية في الشجرة
  var memberIdsWithNodes = {};
  nodes.forEach(function(n) {
    var mid = String(n['رقم العضو'] || '');
    if (mid) memberIdsWithNodes[mid] = true;
  });

  // إضافة الأبناء والبنات من جدول الأبناء (كلا الجنسين)
  // يُتخطى أي سجل له عقدة فعلية في الشجرة أو سجل تكراري
  var seenChildren = {};
  Object.keys(nodeMap).forEach(function(id) {
    var node = nodeMap[id];
    if (!node.memberId) return;
    childrenAll.filter(function(c) {
      return String(c['رقم العضو الأب']) === node.memberId;
    }).forEach(function(c) {
      var childKey = String(c['رقم العضو الأب'] || '') + '|' + String(c['الاسم'] || '') + '|' + String(c['الجنس'] || '') + '|' + String(c['رقم الهوية'] || '');
      if (seenChildren[childKey]) return;
      seenChildren[childKey] = true;

      // تخطي فقط إذا كان للابن عقدة حقيقية في الشجرة
      var preId = String(c['رقم عضو الابن'] || '');
      if (preId && memberIdsWithNodes[preId]) return;

      var rid      = String(c['رقم السجل'] || '');
      var isFemale = String(c['الجنس']) === 'أنثى';
      var alive    = c['حي/ميت'] === 'متوفى' ? false : true;
      node.children.push({
        id:             (isFemale ? 'daughter_' : 'son_') + rid,
        childRecordId:  rid,
        name:           String(c['الاسم'] || ''),
        gender:         isFemale ? 'female' : 'male',
        isDaughter:     isFemale,
        isSon:          !isFemale,
        isChildRecord:  true,
        alive:          alive,
        fatherName:     node.name,
        fatherMemberId: node.memberId,
        children:       [],
        wives:          [],
      });
    });
  });

  return { success: true, tree: roots, totalNodes: nodes.length };
}

/* ═══ دالة مساعدة — مزامنة أبناء الأب الذين لم يُضافوا للشجرة بعد ══════ */

function syncFatherChildrenToTree(fatherMemberId, fatherNodeId, fatherNodeName, fatherGen, fatherPath) {
  var childrenAll = sheetToObjects('الأبناء');
  var treeSheet   = getSheet('الشجرة العائلية');
  var treeHdrs    = treeSheet.getDataRange().getValues()[0];
  var existing    = sheetToObjects('الشجرة العائلية');

  // فهرس الأرقام الموجودة مسبقاً في الشجرة
  var nodesById = {};
  existing.forEach(function(n) {
    var mid = String(n['رقم العضو'] || '');
    if (mid) nodesById[mid] = true;
  });

  childrenAll.filter(function(c) {
    return String(c['رقم العضو الأب'] || '') === fatherMemberId;
  }).forEach(function(c) {
    var preId  = String(c['رقم عضو الابن'] || '');
    var gender = String(c['الجنس'] || '').trim();
    var hasNid = String(c['رقم الهوية'] || '').trim() !== '';
    if (!preId) return;                          // لا رقم محجوز — لا شيء نضيفه
    if (nodesById[preId]) return;                // له عقدة مسبقاً — لا تكرار
    if (gender === 'أنثى' && !hasNid) return;   // أنثى بدون هوية — لا تُضاف للشجرة

    var childName = String(c['الاسم'] || '');
    var childGen  = fatherGen + 1;
    var childPath = fatherPath + ' ← ' + childName;
    var nodeId    = generateId('N');
    var alive     = c['حي/ميت'] === 'متوفى' ? 'متوفى' : 'حي';
    var tMap = {
      'رقم العقدة':  nodeId,
      'رقم العضو':   preId,
      'اسم العضو':   childName,
      'رقم الأب':    fatherNodeId,
      'اسم الأب':    fatherNodeName,
      'مستوى الجيل': childGen,
      'المسار':      childPath,
      'حي/ميت':      alive,
    };
    treeSheet.appendRow(treeHdrs.map(function(h) { return tMap[h] !== undefined ? tMap[h] : ''; }));
    formatLastRow(treeSheet);
    nodesById[preId] = true; // تحديث الفهرس المؤقت
  });
}

/* ═══ دالة مساعدة — ربط سجل الابن بعضويته عند الموافقة ════════════════ */

function linkChildRecordToMember(memberId, memberName, fatherMemberId, nationalId) {
  var childSheet = getSheet('الأبناء');
  var childData  = childSheet.getDataRange().getValues();
  var headers    = childData[0];
  var linkedCol  = headers.indexOf('رقم عضو الابن')  + 1;
  if (linkedCol < 1) return '';
  var fatherCol  = headers.indexOf('رقم العضو الأب') + 1;
  var nameCol    = headers.indexOf('الاسم')           + 1;
  var nidCol     = headers.indexOf('رقم الهوية')      + 1;

  var firstName  = memberName ? memberName.split(' ')[0] : '';
  var nid        = nationalId ? String(nationalId).trim() : '';

  for (var i = 1; i < childData.length; i++) {
    var rowLinked = String(childData[i][linkedCol - 1] || '');
    var oldLinked = rowLinked;

    // مطابقة برقم الهوية (أدق) أو بمعرف الأب + الاسم
    var matchByNid    = nid && nidCol > 0 && String(childData[i][nidCol - 1] || '').trim() === nid;
    var matchByParent = fatherMemberId && fatherCol > 0 && nameCol > 0 &&
                        String(childData[i][fatherCol - 1]) === fatherMemberId &&
                        String(childData[i][nameCol   - 1]) === firstName;

    if (matchByNid || matchByParent) {
      childSheet.getRange(i + 1, linkedCol).setValue(memberId);
      return oldLinked;
    }
  }
  return '';
}

/* ═══ إرسال طلب ربط بالشجرة ═════════════════════════════════════════════ */

function submitTreeRequest(body) {
  var memberId   = String(body.memberId   || '').trim();
  var memberName = String(body.memberName || '').trim();
  var parentId   = String(body.parentId   || '').trim();
  var parentName = String(body.parentName || '').trim();

  if (!memberId || !parentId) {
    return { success: false, message: 'بيانات الطلب غير مكتملة' };
  }

  var memberRow = findRow('الأعضاء', 0, memberId);
  if (!memberRow) return { success: false, message: 'العضو غير موجود' };
  var member = rowToObject(memberRow.headers, memberRow.rowData);
  var missing = [];
  if (!String(member['الاسم الأول'] || '').trim()) missing.push('الاسم الأول');
  if (!String(member['رقم الجوال'] || '').trim()) missing.push('رقم الجوال');
  if (!String(member['رقم الهوية'] || '').trim()) missing.push('رقم الهوية');
  if (!String(member['تاريخ الميلاد'] || '').trim()) missing.push('تاريخ الميلاد');
  if (!String(member['المهنة'] || '').trim()) missing.push('المهنة');
  if (!String(member['الحالة الاجتماعية'] || '').trim()) missing.push('الحالة الاجتماعية');
  if (!String(member['اسم الأب'] || '').trim()) missing.push('اسم الأب');
  if (!String(member['اسم الجد'] || '').trim()) missing.push('اسم الجد');
  if (missing.length) {
    return { success: false, message: 'اكمل بياناتك أولاً: ' + missing.join('، ') };
  }

  // تحقق أن العضو ليس لديه طلب معلق
  var existing = sheetToObjects('طلبات الشجرة');
  var hasPending = existing.some(function(r) {
    return String(r['رقم العضو']) === memberId && r['الحالة'] === 'معلق';
  });
  if (hasPending) {
    return { success: false, message: 'لديك طلب معلق بالفعل، انتظر مراجعة المدير' };
  }

  var sheet     = getSheet('طلبات الشجرة');
  var requestId = generateId('TR');
  var today     = formatDate(new Date());

  // إذا ما أُرسل الاسم — جلبه من جدول الأعضاء
  if (!memberName) {
    var found = findRow('الأعضاء', 0, memberId);
    if (found) {
      memberName = String(found.rowData[found.headers.indexOf('الاسم الأول')] || '');
    }
  }

  var headers = sheet.getDataRange().getValues()[0];
  var colMap  = {
    'رقم الطلب':         requestId,
    'رقم العضو':         memberId,
    'اسم العضو':         memberName,
    'رقم الأب المقترح':  parentId,
    'اسم الأب المقترح':  parentName,
    'مستوى الجيل':       Number(body.generationLevel || 0),
    'المسار':            String(body.path || ''),
    'الحالة':            'معلق',
    'تاريخ الطلب':       today,
    'ملاحظات':           String(body.note || ''),
  };
  sheet.appendRow(headers.map(function(h) { return colMap[h] !== undefined ? colMap[h] : ''; }));
  formatLastRow(sheet);

  return {
    success:   true,
    requestId: requestId,
    message:   'تم إرسال طلب الربط بالشجرة بنجاح'
  };
}

/* ═══ جلب طلبات الشجرة (للمدير) ═════════════════════════════════════════ */

function getTreeRequests(body) {
  var all    = sheetToObjects('طلبات الشجرة');
  var status = body.status || 'معلق';

  var filtered = status === 'الكل'
    ? all
    : all.filter(function(r) { return r['الحالة'] === status; });

  var result = filtered.map(function(r) {
    return {
      requestId:   String(r['رقم الطلب']           || ''),
      memberId:    String(r['رقم العضو']            || ''),
      memberName:  String(r['اسم العضو']            || ''),
      parentId:    String(r['رقم الأب المقترح']     || ''),
      parentName:  String(r['اسم الأب المقترح']     || ''),
      generation:  Number(r['مستوى الجيل']          || 0),
      path:        String(r['المسار']               || ''),
      status:      String(r['الحالة']               || ''),
      date:        formatDate(r['تاريخ الطلب']),
      notes:       String(r['ملاحظات']              || ''),
    };
  });

  return { success: true, requests: result, total: result.length };
}

/* ═══ قبول طلب الشجرة ════════════════════════════════════════════════════ */

function approveTreeRequest(body) {
  var requestId = String(body.requestId || '').trim();
  if (!requestId) return { success: false, message: 'رقم الطلب مطلوب' };

  var found = findRow('طلبات الشجرة', 0, requestId);
  if (!found) return { success: false, message: 'الطلب غير موجود' };

  var req = rowToObject(found.headers, found.rowData);

  var reqSheet  = getSheet('طلبات الشجرة');
  var statusCol = found.headers.indexOf('الحالة') + 1;
  reqSheet.getRange(found.rowIndex, statusCol).setValue('مقبول');

  var memberId   = String(req['رقم العضو']        || '');
  var memberName = String(req['اسم العضو']        || '');
  var parentId   = String(req['رقم الأب المقترح'] || '');
  var parentName = String(req['اسم الأب المقترح'] || '');
  var generation = Number(req['مستوى الجيل']      || 1);
  var path       = String(req['المسار']           || '');
  var notes      = String(req['ملاحظات']          || '');

  var treeSheet   = getSheet('الشجرة العائلية');
  var existing    = sheetToObjects('الشجرة العائلية');
  var treeHeaders = treeSheet.getDataRange().getValues()[0];

  /* ─── حالة "الأب غير موجود" ─────────────────────────────────────────── */
  if (parentId === 'NOTFOUND') {
    var ancestorId = String(body.ancestorId || '').trim();
    if (!ancestorId) {
      var ancestorMatch = notes.match(/\[([A-Z0-9]+)\]/);
      ancestorId = ancestorMatch ? ancestorMatch[1] : '';
    }

    if (!ancestorId) {
      return { success: true, message: 'تم قبول الطلب. لا يوجد سياق محفوظ — أضف الأب يدوياً في الشجرة.' };
    }

    var ancestorNode = existing.find(function(n) { return String(n['رقم العقدة']) === ancestorId; });
    if (!ancestorNode) {
      return { success: false, message: 'العقدة الأصل [' + ancestorId + '] غير موجودة في الشجرة' };
    }

    var ancestorName   = String(ancestorNode['اسم العضو'] || '');
    var ancestorGenLvl = Number(ancestorNode['مستوى الجيل'] || 1);
    var fatherGenLvl   = ancestorGenLvl + 1;
    var memberGenLvl   = ancestorGenLvl + 2;
    var fatherPath     = path + ' ← ' + parentName.split(' ')[0];
    var memberPath     = fatherPath + ' ← ' + memberName.split(' ')[0];

    // إضافة الأب المفقود كعقدة تاريخية (بدون رقم عضو)
    var fatherNodeId = generateId('N');
    var fatherMap = {
      'رقم العقدة':  fatherNodeId,
      'رقم العضو':   '',
      'اسم العضو':   parentName,
      'رقم الأب':    ancestorId,
      'اسم الأب':    ancestorName,
      'مستوى الجيل': fatherGenLvl,
      'المسار':      fatherPath,
      'حي/ميت':      'متوفى',
    };
    treeSheet.appendRow(treeHeaders.map(function(h) { return fatherMap[h] !== undefined ? fatherMap[h] : ''; }));
    formatLastRow(treeSheet);

    // إضافة العضو تحت الأب الجديد أو تحديث صفه الموجود
    var existingMbr = existing.find(function(n) { return String(n['رقم العضو']) === memberId; });
    var mbrParent   = existingMbr ? String(existingMbr['رقم الأب'] || '') : null;

    if (!existingMbr) {
      var mbrNodeId = generateId('N');
      var mbrMap = {
        'رقم العقدة':  mbrNodeId,
        'رقم العضو':   memberId,
        'اسم العضو':   memberName,
        'رقم الأب':    fatherNodeId,
        'اسم الأب':    parentName,
        'مستوى الجيل': memberGenLvl,
        'المسار':      memberPath,
        'حي/ميت':      'حي',
      };
      treeSheet.appendRow(treeHeaders.map(function(h) { return mbrMap[h] !== undefined ? mbrMap[h] : ''; }));
      formatLastRow(treeSheet);
    } else if (mbrParent === 'NOTFOUND' || mbrParent === '') {
      var mbrFound = findRow('الشجرة العائلية', 0, String(existingMbr['رقم العقدة'] || ''));
      if (mbrFound) {
        var setCell = function(colName, val) {
          var c = mbrFound.headers.indexOf(colName) + 1;
          if (c > 0) treeSheet.getRange(mbrFound.rowIndex, c).setValue(val);
        };
        setCell('رقم الأب',    fatherNodeId);
        setCell('اسم الأب',    parentName);
        setCell('مستوى الجيل', memberGenLvl);
        setCell('المسار',      memberPath);
      }
    }

    return { success: true, message: 'تمت إضافة الأب [' + parentName + '] وربط العضو به في الشجرة' };
  }

  /* ─── طلب عادي ──────────────────────────────────────────────────────── */
  var parentNode = existing.find(function(n) { return String(n['رقم العقدة']) === parentId; });
  if (!parentNode) {
    return {
      success: false,
      message: 'رقم الأب [' + parentId + '] غير موجود في الشجرة — تأكد أن العضو اختار من القائمة المحدَّثة'
    };
  }

  // رقم عضو الأب — لربط سجل الابن في جدول الأبناء
  var fatherMemberId = String(parentNode['رقم العضو'] || '');

  var existingEntry  = existing.find(function(n) { return String(n['رقم العضو']) === memberId; });
  var existingParent = existingEntry ? String(existingEntry['رقم الأب'] || '') : null;

  if (!existingEntry) {
    var mbrNid = '';
    var mbrFound2 = findRow('الأعضاء', 0, memberId);
    if (mbrFound2) mbrNid = String(mbrFound2.rowData[mbrFound2.headers.indexOf('رقم الهوية')] || '');
    var oldLinkedMemberId = linkChildRecordToMember(memberId, memberName, fatherMemberId, mbrNid);
    if (oldLinkedMemberId && oldLinkedMemberId !== memberId) {
      var placeholderNode = existing.find(function(n) { return String(n['رقم العضو']) === oldLinkedMemberId; });
      if (placeholderNode) {
        var placeholderFound = findRow('الشجرة العائلية', 0, String(placeholderNode['رقم العقدة'] || ''));
        if (placeholderFound) {
          var setCell3 = function(colName, val) {
            var c = placeholderFound.headers.indexOf(colName) + 1;
            if (c > 0) treeSheet.getRange(placeholderFound.rowIndex, c).setValue(val);
          };
          setCell3('رقم العضو', memberId);
          if (memberName) setCell3('اسم العضو', memberName);
        }
        return { success: true, message: 'تم ربط العضو الموجود مسبقاً في الشجرة برقم العضوية الفعلي' };
      }
    }

    var nodeId = generateId('N');
    var colMap = {
      'رقم العقدة':  nodeId,
      'رقم العضو':   memberId,
      'اسم العضو':   memberName,
      'رقم الأب':    parentId,
      'اسم الأب':    parentName,
      'مستوى الجيل': generation,
      'المسار':      path,
      'حي/ميت':      'حي',
    };
    treeSheet.appendRow(treeHeaders.map(function(h) { return colMap[h] !== undefined ? colMap[h] : ''; }));
    formatLastRow(treeSheet);

    // ربط سجل الابن في جدول الأبناء برقم عضويته
    linkChildRecordToMember(memberId, memberName, fatherMemberId, mbrNid);

    // إضافة أبناء هذا العضو الذين سُجِّلوا مسبقاً ولا عقدة لهم في الشجرة
    syncFatherChildrenToTree(memberId, nodeId, memberName, generation, path);

    return { success: true, message: 'تمت إضافة العضو للشجرة العائلية' };
  }

  if (existingParent === 'NOTFOUND' || existingParent === '') {
    var entryFound = findRow('الشجرة العائلية', 0, String(existingEntry['رقم العقدة'] || ''));
    var updatedNodeId   = String(existingEntry['رقم العقدة'] || '');
    var updatedGen      = generation;
    if (entryFound) {
      var setCell2 = function(colName, val) {
        var c = entryFound.headers.indexOf(colName) + 1;
        if (c > 0) treeSheet.getRange(entryFound.rowIndex, c).setValue(val);
      };
      setCell2('رقم الأب',    parentId);
      setCell2('اسم الأب',    parentName);
      setCell2('مستوى الجيل', generation);
      setCell2('المسار',      path);
    }

    // ربط سجل الابن في جدول الأبناء برقم عضويته
    var mbrNid2 = '';
    var mbrFound3 = findRow('الأعضاء', 0, memberId);
    if (mbrFound3) mbrNid2 = String(mbrFound3.rowData[mbrFound3.headers.indexOf('رقم الهوية')] || '');
    linkChildRecordToMember(memberId, memberName, fatherMemberId, mbrNid2);

    // إضافة أبناء هذا العضو الذين سُجِّلوا مسبقاً ولا عقدة لهم في الشجرة
    syncFatherChildrenToTree(memberId, updatedNodeId, memberName, updatedGen, path);

    return { success: true, message: 'تم تحديث موقع العضو في الشجرة' };
  }

  return { success: true, message: 'العضو موجود في الشجرة بالفعل' };
}

/* ═══ تعديل بيانات عقدة في الشجرة (المدير) ══════════════════════════════ */

function updateTreeNode(body) {
  var nodeId = String(body.nodeId || '').trim();
  var name   = String(body.name   || '').trim();
  var status = String(body.status || '').trim();

  if (!nodeId) return { success: false, message: 'رقم العقدة مطلوب' };

  var found = findRow('الشجرة العائلية', 0, nodeId);
  if (!found) return { success: false, message: 'العقدة غير موجودة' };

  var sheet = getSheet('الشجرة العائلية');

  if (name) {
    var nameCol = found.headers.indexOf('اسم العضو') + 1;
    if (nameCol > 0) sheet.getRange(found.rowIndex, nameCol).setValue(name);
  }

  if (status === 'حي' || status === 'متوفى') {
    var aliveCol = found.headers.indexOf('حي/ميت') + 1;
    if (aliveCol > 0) sheet.getRange(found.rowIndex, aliveCol).setValue(status);
  }

  // تحديث بيانات العضو في جدول الأعضاء (الجوال + الحالة الاجتماعية + المهنة + المدينة)
  var memberId = String(found.rowData[found.headers.indexOf('رقم العضو')] || '').trim();
  if (memberId && (body.phone !== undefined || body.marital !== undefined || body.job !== undefined || body.location !== undefined)) {
    var mFound = findRow('الأعضاء', 0, memberId);
    if (mFound) {
      var mSheet = getSheet('الأعضاء');
      var mHdrs  = mFound.headers;
      if (body.phone !== undefined) {
        var phoneCol = mHdrs.indexOf('رقم الجوال') + 1;
        if (phoneCol > 0) mSheet.getRange(mFound.rowIndex, phoneCol).setValue(String(body.phone || '').trim());
      }
      if (body.marital !== undefined) {
        var maritalCol = mHdrs.indexOf('الحالة الاجتماعية') + 1;
        if (maritalCol > 0) mSheet.getRange(mFound.rowIndex, maritalCol).setValue(String(body.marital || '').trim());
      }
      if (body.job !== undefined) {
        var jobCol = mHdrs.indexOf('المهنة') + 1;
        if (jobCol > 0) mSheet.getRange(mFound.rowIndex, jobCol).setValue(String(body.job || '').trim());
      }
      if (body.location !== undefined) {
        var locationCol = mHdrs.indexOf('المدينة') + 1;
        if (locationCol > 0) mSheet.getRange(mFound.rowIndex, locationCol).setValue(String(body.location || '').trim());
      }
    }
  }

  return { success: true, message: 'تم تحديث بيانات العقدة' };
}

/* ═══ تحديث حالة حي/متوفى لعقدة في الشجرة ══════════════════════════════ */

function updateNodeAliveStatus(body) {
  var nodeId = String(body.nodeId || '').trim();
  var status = String(body.status || '').trim();

  if (!nodeId) return { success: false, message: 'رقم العقدة مطلوب' };
  if (status !== 'حي' && status !== 'متوفى') return { success: false, message: 'الحالة يجب أن تكون حي أو متوفى' };

  var found = findRow('الشجرة العائلية', 0, nodeId);
  if (!found) return { success: false, message: 'العقدة غير موجودة' };

  var sheet    = getSheet('الشجرة العائلية');
  var aliveCol = found.headers.indexOf('حي/ميت') + 1;
  if (aliveCol < 1) return { success: false, message: 'عمود حي/ميت غير موجود في الجدول' };

  sheet.getRange(found.rowIndex, aliveCol).setValue(status);
  return { success: true, message: 'تم تحديث الحالة إلى: ' + status };
}

/* ═══ تحديث حالة زوجة (حي/متوفى) ════════════════════════════════════════ */

function updateWifeStatus(body) {
  var wifeId = String(body.wifeId || '').trim();
  var status = String(body.status || '').trim();

  if (!wifeId)                                return { success: false, message: 'رقم سجل الزوجة مطلوب' };
  if (status !== 'حي' && status !== 'متوفى') return { success: false, message: 'الحالة يجب أن تكون حي أو متوفى' };

  var found = findRow('الزوجات', 0, wifeId);
  if (!found) return { success: false, message: 'سجل الزوجة غير موجود' };

  var sheet    = getSheet('الزوجات');
  var aliveCol = found.headers.indexOf('حي/ميت') + 1;
  if (aliveCol < 1) return { success: false, message: 'عمود حي/ميت غير موجود في جدول الزوجات — أضفه أولاً' };

  sheet.getRange(found.rowIndex, aliveCol).setValue(status);
  return { success: true, message: 'تم تحديث حالة الزوجة' };
}

/* ═══ تحديث حالة ابن/بنت (حي/متوفى) ════════════════════════════════════ */

function updateChildStatus(body) {
  var childId = String(body.childId || '').trim();
  var status  = String(body.status  || '').trim();

  if (!childId)                               return { success: false, message: 'رقم سجل الابن مطلوب' };
  if (status !== 'حي' && status !== 'متوفى') return { success: false, message: 'الحالة يجب أن تكون حي أو متوفى' };

  var found = findRow('الأبناء', 0, childId);
  if (!found) return { success: false, message: 'سجل الابن غير موجود' };

  var sheet    = getSheet('الأبناء');
  var aliveCol = found.headers.indexOf('حي/ميت') + 1;
  if (aliveCol < 1) return { success: false, message: 'عمود حي/ميت غير موجود في جدول الأبناء — أضفه أولاً' };

  sheet.getRange(found.rowIndex, aliveCol).setValue(status);
  return { success: true, message: 'تم تحديث حالة الابن' };
}

/* ═══ إضافة عقدة مباشرة للشجرة (المدير فقط) ════════════════════════════ */

function addTreeNode(body) {
  var name        = String(body.name        || '').trim();
  var parentId    = String(body.parentId    || '').trim();
  var memberId    = String(body.memberId    || '').trim();
  var aliveStatus = String(body.aliveStatus || 'متوفى').trim();

  if (!name)     return { success: false, message: 'الاسم مطلوب' };
  if (!parentId) return { success: false, message: 'يجب اختيار الأب من الشجرة' };

  var treeSheet = getSheet('الشجرة العائلية');
  var existing  = sheetToObjects('الشجرة العائلية');
  var headers   = treeSheet.getDataRange().getValues()[0];

  // تحقق أن العضو غير موجود مسبقاً
  if (memberId) {
    var already = existing.find(function(n) { return String(n['رقم العضو']) === memberId; });
    if (already) return { success: false, message: 'هذا العضو موجود في الشجرة مسبقاً' };
  }

  var parentNode = existing.find(function(n) { return String(n['رقم العقدة']) === parentId; });
  if (!parentNode) return { success: false, message: 'العقدة الأب غير موجودة' };

  var pName  = String(parentNode['اسم العضو'] || '');
  var gen    = Number(parentNode['مستوى الجيل'] || 1) + 1;
  var path   = String(parentNode['المسار'] || pName) + ' ← ' + name;
  var nodeId = generateId('N');

  var colMap = {
    'رقم العقدة':  nodeId,
    'رقم العضو':   memberId,
    'اسم العضو':   name,
    'رقم الأب':    parentId,
    'اسم الأب':    pName,
    'مستوى الجيل': gen,
    'المسار':      path,
    'حي/ميت':      aliveStatus,
  };
  var newRow = headers.map(function(h) { return colMap[h] !== undefined ? colMap[h] : ''; });
  treeSheet.appendRow(newRow);
  formatLastRow(treeSheet);

  return { success: true, nodeId: nodeId, path: path, message: 'تمت إضافة العقدة بنجاح' };
}

/* ═══ رفض طلب الشجرة ════════════════════════════════════════════════════ */

function rejectTreeRequest(body) {
  var requestId = String(body.requestId || '').trim();
  if (!requestId) return { success: false, message: 'رقم الطلب مطلوب' };

  var found = findRow('طلبات الشجرة', 0, requestId);
  if (!found) return { success: false, message: 'الطلب غير موجود' };

  var sheet     = getSheet('طلبات الشجرة');
  var statusCol = found.headers.indexOf('الحالة') + 1;
  sheet.getRange(found.rowIndex, statusCol).setValue('مرفوض');

  return { success: true, message: 'تم رفض الطلب' };
}

/* ═══ تشغل مرة واحدة فقط — إضافة الأبناء المحجوزة لجدول الشجرة ══════════
   شغّل هذه الدالة من محرر GAS > Run > backfillChildrenToTree           */

function backfillChildrenToTree() {
  var treeNodes   = sheetToObjects('الشجرة العائلية');
  var treeSheet   = getSheet('الشجرة العائلية');
  var treeHdrs    = treeSheet.getDataRange().getValues()[0];

  var childSheet  = getSheet('الأبناء');
  var childData   = childSheet.getDataRange().getValues();
  var childHdrs   = childData[0];

  var preIdColIdx  = childHdrs.indexOf('رقم عضو الابن');
  var fatherColIdx = childHdrs.indexOf('رقم العضو الأب');
  var nameColIdx   = childHdrs.indexOf('الاسم');
  var genderColIdx = childHdrs.indexOf('الجنس');
  var nidColIdx    = childHdrs.indexOf('رقم الهوية');
  var aliveColIdx  = childHdrs.indexOf('حي/ميت');

  Logger.log('أعمدة الأبناء: preId=' + preIdColIdx + ' father=' + fatherColIdx +
             ' name=' + nameColIdx + ' gender=' + genderColIdx + ' nid=' + nidColIdx);

  // فهرس عقد الشجرة
  var nodeByMemberId = {};
  treeNodes.forEach(function(n) {
    var mid = String(n['رقم العضو'] || '').trim();
    if (mid) nodeByMemberId[mid] = n;
  });
  Logger.log('أعضاء في الشجرة: ' + Object.keys(nodeByMemberId).join(', '));

  var added = 0;
  var skipped = { noFather: 0, female: 0, exists: 0, noRow: 0 };

  for (var ri = 1; ri < childData.length; ri++) {
    var row       = childData[ri];
    var fatherMId = fatherColIdx >= 0 ? String(row[fatherColIdx] || '').trim() : '';
    var childName = nameColIdx   >= 0 ? String(row[nameColIdx]   || '').trim() : '';
    if (!fatherMId || !childName) { skipped.noRow++; continue; }

    var fatherNode = nodeByMemberId[fatherMId];
    if (!fatherNode) { skipped.noFather++; Logger.log('أب غير موجود: ' + fatherMId + ' / ' + childName); continue; }

    var gender = genderColIdx >= 0 ? String(row[genderColIdx] || '').trim() : '';
    var hasNid = nidColIdx    >= 0 && String(row[nidColIdx]   || '').trim() !== '';
    if (gender === 'أنثى' && !hasNid) { skipped.female++; continue; }

    var preId = preIdColIdx >= 0 ? String(row[preIdColIdx] || '').trim() : '';
    if (!preId) {
      preId = generateId('M');
      if (preIdColIdx >= 0) childSheet.getRange(ri + 1, preIdColIdx + 1).setValue(preId);
      row[preIdColIdx] = preId;
    }

    if (nodeByMemberId[preId]) { skipped.exists++; continue; }

    var fGen      = Number(fatherNode['مستوى الجيل'] || 1);
    var fPath     = String(fatherNode['المسار'] || fatherNode['اسم العضو'] || '');
    var childGen  = fGen + 1;
    var childPath = fPath + ' ← ' + childName;
    var nodeId    = generateId('N');
    var alive     = aliveColIdx >= 0 && String(row[aliveColIdx] || '') === 'متوفى' ? 'متوفى' : 'حي';

    var tMap = {
      'رقم العقدة':  nodeId,
      'رقم العضو':   preId,
      'اسم العضو':   childName,
      'رقم الأب':    String(fatherNode['رقم العقدة'] || ''),
      'اسم الأب':    String(fatherNode['اسم العضو']  || ''),
      'مستوى الجيل': childGen,
      'المسار':      childPath,
      'حي/ميت':      alive,
    };
    treeSheet.appendRow(treeHdrs.map(function(h) { return tMap[h] !== undefined ? tMap[h] : ''; }));
    formatLastRow(treeSheet);
    nodeByMemberId[preId] = tMap;
    Logger.log('اضيف: ' + childName + ' (preId=' + preId + ') تحت ' + fatherMId);
    added++;
  }

  Logger.log('النتيجة: اضيف=' + added +
             ' | أب غائب=' + skipped.noFather +
             ' | أنثى بدون هوية=' + skipped.female +
             ' | موجود مسبقاً=' + skipped.exists +
             ' | صف فارغ=' + skipped.noRow);
}

/* ═══ تشغل مرة واحدة — حذف عقد الإناث بدون هوية من الشجرة ══════════════
   شغّل من محرر GAS إذا أضافت backfillChildrenToTree إناثاً بالخطأ      */

function removeFemalNodesWithoutId() {
  var childSheet  = getSheet('الأبناء');
  var childData   = childSheet.getDataRange().getValues();
  var childHdrs   = childData[0];
  var preIdCol    = childHdrs.indexOf('رقم عضو الابن');
  var genderCol   = childHdrs.indexOf('الجنس');
  var nidCol      = childHdrs.indexOf('رقم الهوية');

  // جمع معرفات الإناث بدون هوية
  var toRemove = {};
  for (var ri = 1; ri < childData.length; ri++) {
    var gender = String(childData[ri][genderCol] || '').trim();
    var nid    = String(childData[ri][nidCol]    || '').trim();
    var preId  = String(childData[ri][preIdCol]  || '').trim();
    if (gender === 'أنثى' && !nid && preId) {
      toRemove[preId] = true;
      // امسح رقم عضو الابن من جدول الأبناء
      childSheet.getRange(ri + 1, preIdCol + 1).setValue('');
    }
  }

  if (!Object.keys(toRemove).length) {
    Logger.log('لا توجد عقد إناث للحذف');
    return;
  }

  // احذف العقد المقابلة من جدول الشجرة
  var treeSheet = getSheet('الشجرة العائلية');
  var treeData  = treeSheet.getDataRange().getValues();
  var treeHdrs  = treeData[0];
  var mIdCol    = treeHdrs.indexOf('رقم العضو');
  var deleted   = 0;

  for (var ti = treeData.length - 1; ti >= 1; ti--) {
    var mid = String(treeData[ti][mIdCol] || '').trim();
    if (mid && toRemove[mid]) {
      treeSheet.deleteRow(ti + 1);
      deleted++;
    }
  }

  Logger.log('تم حذف ' + deleted + ' عقدة أنثى بدون هوية من جدول الشجرة');
}
