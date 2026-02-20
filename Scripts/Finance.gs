/**
 * ============================================================================
 * HOME PPK 2026 - Finance.gs — 📑 การเงินและบัญชี
 * ============================================================================
 * สรุปเบิก-จ่ายรายเดือน, บัญชีรายรับ-รายจ่ายกองทุน
 * 
 * ฟีเจอร์:
 *   - Withdraw: getMonthlyWithdraw, handleSaveWithdraw, createWithdrawYearSheet
 *   - Billing Totals: getWaterBillTotal, getElectricBillPEA
 *   - Accounting: loadAccountingData, handleSaveAccounting, deleteAccountingEntry,
 *                 calculateAutoEntries, getCarryForward, createAccountingYearSheet
 *   - Income/Expense: getIncome, getExpense
 *   - Receipt: uploadReceiptImage
 * 
 * Version: 1.0
 * วันที่สร้าง: 17 กุมภาพันธ์ 2569
 * Step: 24 (ระยะที่ 2)
 * ============================================================================
 * 
 * Dependencies: Config.gs, Database.gs, Housing.gs, Billing.gs
 * Next: Notification.gs (Step 25)
 * 
 * Spreadsheets:
 *   - [WITHDRAW]   → แผ่นงานปี เช่น '2569' (สรุปเบิกจ่าย)
 *   - [ACCOUNTING] → แผ่นงานปี เช่น '2569' (บัญชี)
 *   - [WATER]      → อ่านยอดรวมค่าน้ำ
 *   - [ELECTRIC]   → อ่านยอด กฟภ.
 *   - Drive        → AccountingReceipts/ (รูปหลักฐาน)
 * 
 * Notes:
 *   - monthly-withdraw ใช้ garbageFee default = 310
 *   - accounting ใช้ carryForward ยกยอดจากเดือนก่อน
 *   - auto entries ดึงจาก billing + withdraw อัตโนมัติ
 *   - แผ่นงานแยกตามปี พ.ศ. สร้างอัตโนมัติ
 * 
 * ============================================================================
 */

// ============================================================================
// SCHEMAS — Headers ของแผ่นงานตามปี
// ============================================================================

var WITHDRAW_YEAR_HEADERS = [
  'id', 'month', 'garbage_fee',
  'additional_items', 'total_withdraw',
  'saved_at', 'saved_by'
];

var ACCOUNTING_YEAR_HEADERS = [
  'id', 'month', 'type', 'category',
  'name', 'amount', 'source',
  'receipt_file_id', 'note',
  'saved_at', 'saved_by'
];

// ============================================================================
// MONTHLY WITHDRAW — สรุปเบิกจ่ายรายเดือน
// ============================================================================

/**
 * ดึงข้อมูลเบิกจ่ายรายเดือน
 * @param {string} period - เช่น '2569-02'
 * @returns {Object} { success, data }
 */
function getMonthlyWithdraw(period) {
  if (!period) return { success: false, error: 'กรุณาระบุงวดเดือน' };

  var parts = _parsePeriod(period);
  if (!parts) return { success: false, error: 'รูปแบบงวดไม่ถูกต้อง' };

  var sheetName = getYearOnlySheetName(parts.year);

  try {
    var allData = readSheetData(SPREADSHEET_IDS.WITHDRAW, sheetName);
    var monthData = allData.filter(function(row) {
      return String(row.month) === parts.month;
    });

    if (monthData.length === 0) {
      // ไม่มีข้อมูล → return default
      return {
        success: true,
        data: {
          period: period,
          garbageFee: DEFAULTS.garbage_fee,
          additionalItems: [],
          totalWithdraw: 0,
          saved: false
        }
      };
    }

    // มีข้อมูล → parse
    var record = monthData[monthData.length - 1]; // ล่าสุด
    var additionalItems = [];
    try {
      additionalItems = JSON.parse(record.additional_items || '[]');
    } catch (e) { /* parse error */ }

    return {
      success: true,
      data: {
        period: period,
        garbageFee: Number(record.garbage_fee) || DEFAULTS.garbage_fee,
        additionalItems: additionalItems,
        totalWithdraw: Number(record.total_withdraw) || 0,
        savedAt: record.saved_at,
        savedBy: record.saved_by,
        saved: true
      }
    };
  } catch (e) {
    return {
      success: true,
      data: {
        period: period,
        garbageFee: DEFAULTS.garbage_fee,
        additionalItems: [],
        totalWithdraw: 0,
        saved: false
      }
    };
  }
}

/**
 * บันทึกข้อมูลเบิกจ่ายรายเดือน
 * - ถ้ามีข้อมูลเดือนนี้แล้ว → overwrite
 * @param {Object} data - { period, garbageFee, additionalItems: [{name, amount}], totalWithdraw }
 * @returns {Object} { success, message }
 */
function handleSaveWithdraw(data) {
  if (!data.period) return { success: false, error: 'กรุณาระบุงวดเดือน' };

  var parts = _parsePeriod(data.period);
  if (!parts) return { success: false, error: 'รูปแบบงวดไม่ถูกต้อง' };

  var sheetName = getYearOnlySheetName(parts.year);
  var now = new Date().toISOString();

  // สร้างแผ่นงานปี (ถ้ายังไม่มี)
  createWithdrawYearSheet(parts.year);

  // ลบข้อมูลเดือนนี้ที่มีอยู่ (overwrite)
  _deleteMonthData(SPREADSHEET_IDS.WITHDRAW, sheetName, parts.month);

  // คำนวณ total
  var garbageFee = Number(data.garbageFee) || Number(data.garbage_fee) || DEFAULTS.garbage_fee;
  var additionalItems = data.additionalItems || data.additional_items || [];
  var additionalTotal = 0;
  for (var i = 0; i < additionalItems.length; i++) {
    additionalTotal += Number(additionalItems[i].amount) || 0;
  }
  var totalWithdraw = garbageFee + additionalTotal;

  var withdrawData = {
    id: getNextId(ID_PREFIXES.WTD),
    month: parts.month,
    garbage_fee: garbageFee,
    additional_items: JSON.stringify(additionalItems),
    total_withdraw: totalWithdraw,
    saved_at: now,
    saved_by: data._userId || 'ADMIN'
  };

  var result = appendRowToSheet(SPREADSHEET_IDS.WITHDRAW, sheetName, withdrawData);
  if (!result.success) return result;

  // Log
  writeLog('SAVE_WITHDRAW', data._userId || 'ADMIN',
    'บันทึกเบิกจ่าย: ' + data.period + ' (รวม ' + totalWithdraw + ' บาท)', 'Finance');

  return { success: true, message: 'บันทึกเบิกจ่ายสำเร็จ', totalWithdraw: totalWithdraw };
}

/**
 * สร้างแผ่นงานปีใหม่สำหรับเบิกจ่าย (ถ้ายังไม่มี)
 * @param {number|string} year - ปี พ.ศ.
 */
function createWithdrawYearSheet(year) {
  var sheetName = getYearOnlySheetName(year);
  getOrCreateSheet(SPREADSHEET_IDS.WITHDRAW, sheetName, WITHDRAW_YEAR_HEADERS);
}

// ============================================================================
// BILLING TOTALS — ดึงยอดรวมจาก Billing.gs
// ============================================================================

/**
 * ดึงยอดรวมค่าน้ำทั้งเดือน
 * @param {string} period - เช่น '2569-02'
 * @returns {Object} { success, total }
 */
function getWaterBillTotal(period) {
  if (!period) return { success: false, error: 'กรุณาระบุงวดเดือน' };

  var parts = _parsePeriod(period);
  if (!parts) return { success: false, error: 'รูปแบบงวดไม่ถูกต้อง' };

  var sheetName = getYearOnlySheetName(parts.year);

  try {
    var allData = readSheetData(SPREADSHEET_IDS.WATER, sheetName);
    var monthData = allData.filter(function(row) {
      return String(row.month) === parts.month;
    });

    var total = 0;
    for (var i = 0; i < monthData.length; i++) {
      total += Number(monthData[i].amount) || 0;
    }

    return { success: true, total: total };
  } catch (e) {
    return { success: true, total: 0 };
  }
}

/**
 * ดึงยอด กฟภ. (PEA total) ของเดือน
 * @param {string} period - เช่น '2569-02'
 * @returns {Object} { success, peaTotal, lostHouse, lostFlat }
 */
function getElectricBillPEA(period) {
  if (!period) return { success: false, error: 'กรุณาระบุงวดเดือน' };

  var parts = _parsePeriod(period);
  if (!parts) return { success: false, error: 'รูปแบบงวดไม่ถูกต้อง' };

  var sheetName = getYearOnlySheetName(parts.year);

  try {
    var allData = readSheetData(SPREADSHEET_IDS.ELECTRIC, sheetName);
    var monthData = allData.filter(function(row) {
      return String(row.month) === parts.month;
    });

    if (monthData.length === 0) {
      return { success: true, peaTotal: 0, lostHouse: 0, lostFlat: 0 };
    }

    // PEA total, lost_house, lost_flat มีค่าเดียวกันทุกแถว (เก็บซ้ำ)
    var firstRow = monthData[0];
    return {
      success: true,
      peaTotal: Number(firstRow.pea_total) || 0,
      lostHouse: Number(firstRow.lost_house) || 0,
      lostFlat: Number(firstRow.lost_flat) || 0
    };
  } catch (e) {
    return { success: true, peaTotal: 0, lostHouse: 0, lostFlat: 0 };
  }
}

// ============================================================================
// ACCOUNTING — บัญชีรายรับ-รายจ่าย
// ============================================================================

/**
 * ดึงรายการบัญชีตามเดือน
 * @param {string} period - เช่น '2569-02'
 * @returns {Object} { success, incomeItems: [...], expenseItems: [...], carryForward }
 */
function loadAccountingData(period) {
  if (!period) return { success: false, error: 'กรุณาระบุงวดเดือน' };

  var parts = _parsePeriod(period);
  if (!parts) return { success: false, error: 'รูปแบบงวดไม่ถูกต้อง' };

  var sheetName = getYearOnlySheetName(parts.year);

  try {
    var allData = readSheetData(SPREADSHEET_IDS.ACCOUNTING, sheetName);
    var monthData = allData.filter(function(row) {
      return String(row.month) === parts.month;
    });

    var incomeItems = [];
    var expenseItems = [];

    monthData.forEach(function(row) {
      var item = {
        id: row.id,
        name: row.name || '',
        amount: Number(row.amount) || 0,
        category: row.category || '',
        source: row.source || 'manual',
        receiptFileId: row.receipt_file_id || '',
        note: row.note || ''
      };

      if (row.type === 'income') {
        incomeItems.push(item);
      } else if (row.type === 'expense') {
        expenseItems.push(item);
      }
    });

    // ยอดยกมา
    var carryForward = getCarryForward(period);

    return {
      success: true,
      incomeItems: incomeItems,
      expenseItems: expenseItems,
      carryForward: carryForward
    };
  } catch (e) {
    return {
      success: true,
      incomeItems: [],
      expenseItems: [],
      carryForward: getCarryForward(period)
    };
  }
}

/**
 * บันทึกบัญชีทั้งเดือน (ทั้ง auto + manual)
 * - ลบรายการเดิมของเดือนนี้ → เขียนใหม่ทั้งหมด (snapshot)
 * @param {Object} data - { period, carryForward, incomeItems: [...], expenseItems: [...] }
 * @returns {Object} { success, message }
 */
function handleSaveAccounting(data) {
  if (!data.period) return { success: false, error: 'กรุณาระบุงวดเดือน' };

  var parts = _parsePeriod(data.period);
  if (!parts) return { success: false, error: 'รูปแบบงวดไม่ถูกต้อง' };

  var sheetName = getYearOnlySheetName(parts.year);
  var now = new Date().toISOString();

  // สร้างแผ่นงานปี (ถ้ายังไม่มี)
  createAccountingYearSheet(parts.year);

  // ลบข้อมูลเดือนนี้ (overwrite)
  _deleteMonthData(SPREADSHEET_IDS.ACCOUNTING, sheetName, parts.month);

  // เตรียม rows
  var rows = [];

  // รายรับ
  var incomeItems = data.incomeItems || data.income_items || [];
  for (var i = 0; i < incomeItems.length; i++) {
    var inc = incomeItems[i];
    rows.push({
      id: inc.id || getNextId(ID_PREFIXES.INC),
      month: parts.month,
      type: 'income',
      category: inc.category || '',
      name: inc.name || '',
      amount: Number(inc.amount) || 0,
      source: inc.source || 'manual',
      receipt_file_id: inc.receiptFileId || inc.receipt_file_id || '',
      note: inc.note || '',
      saved_at: now,
      saved_by: data._userId || 'ADMIN'
    });
  }

  // รายจ่าย
  var expenseItems = data.expenseItems || data.expense_items || [];
  for (var j = 0; j < expenseItems.length; j++) {
    var exp = expenseItems[j];
    rows.push({
      id: exp.id || getNextId(ID_PREFIXES.EXP),
      month: parts.month,
      type: 'expense',
      category: exp.category || '',
      name: exp.name || '',
      amount: Number(exp.amount) || 0,
      source: exp.source || 'manual',
      receipt_file_id: exp.receiptFileId || exp.receipt_file_id || '',
      note: exp.note || '',
      saved_at: now,
      saved_by: data._userId || 'ADMIN'
    });
  }

  if (rows.length > 0) {
    var result = batchAppendRows(SPREADSHEET_IDS.ACCOUNTING, sheetName, rows);
    if (!result.success) return result;
  }

  // Log
  writeLog('SAVE_ACCOUNTING', data._userId || 'ADMIN',
    'บันทึกบัญชี: ' + data.period + ' (รายรับ ' + incomeItems.length + ', รายจ่าย ' + expenseItems.length + ')', 'Finance');

  return { success: true, message: 'บันทึกบัญชีสำเร็จ', count: rows.length };
}

/**
 * ลบรายการบัญชี
 * @param {Object} data - { period, id }
 * @returns {Object} { success, message }
 */
function deleteAccountingEntry(data) {
  if (!data.period || !data.id) return { success: false, error: 'กรุณาระบุงวดและ ID รายการ' };

  var parts = _parsePeriod(data.period);
  if (!parts) return { success: false, error: 'รูปแบบงวดไม่ถูกต้อง' };

  var sheetName = getYearOnlySheetName(parts.year);

  var result = deleteRowFromSheet(SPREADSHEET_IDS.ACCOUNTING, sheetName, 'id', data.id);
  if (!result.success) return result;

  writeLog('DELETE_ACCOUNTING', data._userId || 'ADMIN',
    'ลบรายการบัญชี: ' + data.id, 'Finance');

  return { success: true, message: 'ลบรายการสำเร็จ' };
}

// ============================================================================
// AUTO ENTRIES — ดึงรายการอัตโนมัติ
// ============================================================================

/**
 * ดึงรายการอัตโนมัติจากหน้าอื่น
 * - รายรับ: ค่าส่วนกลาง, ค่าไฟปัดเศษ
 * - รายจ่าย: ค่าขยะ, ค่าอื่นๆ จากเบิกจ่าย
 * @param {string} period - เช่น '2569-02'
 * @returns {Object} { success, incomeItems: [...], expenseItems: [...] }
 */
function calculateAutoEntries(period) {
  if (!period) return { success: false, error: 'กรุณาระบุงวดเดือน' };

  var parts = _parsePeriod(period);
  if (!parts) return { success: false, error: 'รูปแบบงวดไม่ถูกต้อง' };

  var incomeItems = [];
  var expenseItems = [];

  // ── รายรับ 1: ค่าส่วนกลาง ──
  try {
    var commonFeeResult = getCommonFee();
    var housingResult = getHousingList();

    if (housingResult.success && housingResult.data) {
      var totalCommonFee = 0;
      var occupiedCount = 0;

      housingResult.data.forEach(function(house) {
        if (house.status === 'occupied') {
          var fee = house.type === 'flat' ? commonFeeResult.flat : commonFeeResult.house;
          // ตรวจ exemption
          var isExempt = false;
          try { isExempt = _isExempt(house.display_number); } catch (e) {}
          if (!isExempt) {
            totalCommonFee += fee;
            occupiedCount++;
          }
        }
      });

      if (totalCommonFee > 0) {
        incomeItems.push({
          id: getNextId(ID_PREFIXES.INC),
          name: 'ค่าส่วนกลาง (' + occupiedCount + ' หลัง)',
          amount: totalCommonFee,
          category: 'common_fee',
          source: 'auto'
        });
      }
    }
  } catch (e) { /* ข้ามถ้าไม่มีข้อมูล */ }

  // ── รายรับ 2: ค่าไฟปัดเศษ (ส่วนต่างระหว่างปัดเศษกับค่าจริง) ──
  try {
    var sheetName = getYearOnlySheetName(parts.year);
    var electricData = readSheetData(SPREADSHEET_IDS.ELECTRIC, sheetName);
    var monthElectric = electricData.filter(function(r) {
      return String(r.month) === parts.month;
    });

    if (monthElectric.length > 0) {
      var totalRounded = 0;
      monthElectric.forEach(function(r) {
        totalRounded += Number(r.amount) || 0;
      });

      // PEA total = ค่าไฟจริง (ก่อนปัดเศษ)
      var peaTotal = Number(monthElectric[0].pea_total) || 0;
      var roundingDiff = totalRounded - peaTotal;

      if (roundingDiff > 0) {
        incomeItems.push({
          id: getNextId(ID_PREFIXES.INC),
          name: 'ค่าไฟปัดเศษ',
          amount: Math.round(roundingDiff * 100) / 100,
          category: 'electric_rounding',
          source: 'auto'
        });
      }
    }
  } catch (e) { /* ข้ามถ้าไม่มีข้อมูล */ }

  // ── รายจ่าย 1: ค่าขยะ ──
  try {
    var withdrawResult = getMonthlyWithdraw(period);
    if (withdrawResult.success && withdrawResult.data && withdrawResult.data.saved) {
      var wData = withdrawResult.data;

      // ค่าขยะ
      if (wData.garbageFee > 0) {
        expenseItems.push({
          id: getNextId(ID_PREFIXES.EXP),
          name: 'ค่าขยะ',
          amount: wData.garbageFee,
          category: 'garbage',
          source: 'auto'
        });
      }

      // รายการเพิ่มเติมจากเบิกจ่าย
      if (wData.additionalItems && wData.additionalItems.length > 0) {
        wData.additionalItems.forEach(function(item) {
          if (Number(item.amount) > 0) {
            expenseItems.push({
              id: getNextId(ID_PREFIXES.EXP),
              name: item.name || 'รายการเพิ่มเติม',
              amount: Number(item.amount),
              category: 'additional',
              source: 'auto'
            });
          }
        });
      }
    }
  } catch (e) { /* ข้ามถ้าไม่มีข้อมูล */ }

  return {
    success: true,
    incomeItems: incomeItems,
    expenseItems: expenseItems
  };
}

// ============================================================================
// CARRY FORWARD — ยอดยกมา
// ============================================================================

/**
 * ดึงยอดยกมาจากเดือนก่อน
 * คำนวณ: ยอดยกมาเดิม + รายรับ - รายจ่าย ของเดือนก่อน
 * @param {string} period - เช่น '2569-02'
 * @returns {number} ยอดยกมา
 */
function getCarryForward(period) {
  if (!period) return 0;

  var parts = _parsePeriod(period);
  if (!parts) return 0;

  // คำนวณเดือนก่อน
  var month = Number(parts.month);
  var year = Number(parts.year);

  var prevMonth, prevYear;
  if (month === 1) {
    prevMonth = '12';
    prevYear = String(year - 1);
  } else {
    prevMonth = String(month - 1).padStart(2, '0');
    prevYear = String(year);
  }

  var prevPeriod = prevYear + '-' + prevMonth;

  try {
    var prevSheetName = getYearOnlySheetName(prevYear);
    var prevData = readSheetData(SPREADSHEET_IDS.ACCOUNTING, prevSheetName);
    var prevMonthData = prevData.filter(function(row) {
      return String(row.month) === prevMonth;
    });

    if (prevMonthData.length === 0) return 0;

    var totalIncome = 0;
    var totalExpense = 0;

    prevMonthData.forEach(function(row) {
      if (row.type === 'income') {
        totalIncome += Number(row.amount) || 0;
      } else if (row.type === 'expense') {
        totalExpense += Number(row.amount) || 0;
      }
    });

    // ยอดยกมา = ยอดยกมาของเดือนก่อน + รายรับ - รายจ่าย
    var prevCarryForward = getCarryForward(prevPeriod);
    return prevCarryForward + totalIncome - totalExpense;
  } catch (e) {
    return 0;
  }
}

// ============================================================================
// INCOME / EXPENSE — สำหรับ GET route
// ============================================================================

/**
 * ดึงรายรับตามเดือน
 * @param {string} period - เช่น '2569-02'
 * @returns {Object} { success, data: [...], total }
 */
function getIncome(period) {
  if (!period) return { success: false, error: 'กรุณาระบุงวดเดือน' };

  var parts = _parsePeriod(period);
  if (!parts) return { success: false, error: 'รูปแบบงวดไม่ถูกต้อง' };

  var sheetName = getYearOnlySheetName(parts.year);

  try {
    var allData = readSheetData(SPREADSHEET_IDS.ACCOUNTING, sheetName);
    var incomeData = allData.filter(function(row) {
      return String(row.month) === parts.month && row.type === 'income';
    });

    var total = 0;
    incomeData.forEach(function(row) { total += Number(row.amount) || 0; });

    return { success: true, data: incomeData, total: total };
  } catch (e) {
    return { success: true, data: [], total: 0 };
  }
}

/**
 * ดึงรายจ่ายตามเดือน
 * @param {string} period - เช่น '2569-02'
 * @returns {Object} { success, data: [...], total }
 */
function getExpense(period) {
  if (!period) return { success: false, error: 'กรุณาระบุงวดเดือน' };

  var parts = _parsePeriod(period);
  if (!parts) return { success: false, error: 'รูปแบบงวดไม่ถูกต้อง' };

  var sheetName = getYearOnlySheetName(parts.year);

  try {
    var allData = readSheetData(SPREADSHEET_IDS.ACCOUNTING, sheetName);
    var expenseData = allData.filter(function(row) {
      return String(row.month) === parts.month && row.type === 'expense';
    });

    var total = 0;
    expenseData.forEach(function(row) { total += Number(row.amount) || 0; });

    return { success: true, data: expenseData, total: total };
  } catch (e) {
    return { success: true, data: [], total: 0 };
  }
}

// ============================================================================
// RECEIPT IMAGE — อัปโหลดรูปหลักฐาน
// ============================================================================

/**
 * อัปโหลดรูปหลักฐานลง Drive (AccountingReceipts/)
 * @param {Object} data - { base64, description, date }
 * @returns {Object} { success, fileId, url }
 */
function uploadReceiptImage(data) {
  if (!data.base64) return { success: false, error: 'กรุณาระบุรูปหลักฐาน' };

  var description = data.description || 'หลักฐาน';
  var dateStr = data.date || new Date().toISOString().split('T')[0];
  var fileName = description.replace(/[\/\\:*?"<>|]/g, '_') + '_' + dateStr + '.jpg';

  try {
    var folder = DriveApp.getFolderById(FOLDER_IDS.ACCOUNTING_RECEIPTS);

    // แปลง base64 → Blob
    var base64Content = String(data.base64).replace(/^data:image\/\w+;base64,/, '');
    var blob = Utilities.newBlob(
      Utilities.base64Decode(base64Content),
      'image/jpeg',
      fileName
    );

    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // Log
    writeLog('UPLOAD_RECEIPT', data._userId || 'ADMIN',
      'อัปโหลดหลักฐาน: ' + fileName, 'Finance');

    return {
      success: true,
      fileId: file.getId(),
      url: file.getUrl(),
      name: fileName
    };
  } catch (e) {
    return { success: false, error: 'อัปโหลดไม่สำเร็จ: ' + e.message };
  }
}

// ============================================================================
// YEAR SHEET — สร้างแผ่นงานปีใหม่
// ============================================================================

/**
 * สร้างแผ่นงานปีใหม่สำหรับบัญชี (ถ้ายังไม่มี)
 * @param {number|string} year - ปี พ.ศ.
 */
function createAccountingYearSheet(year) {
  var sheetName = getYearOnlySheetName(year);
  getOrCreateSheet(SPREADSHEET_IDS.ACCOUNTING, sheetName, ACCOUNTING_YEAR_HEADERS);
}

// ============================================================================
// END OF Finance.gs
// ============================================================================
