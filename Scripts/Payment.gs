/**
 * ============================================================================
 * HOME PPK 2026 - Payment.gs — 💳 ชำระเงินและตรวจสลิป
 * ============================================================================
 * จัดการอัปโหลดสลิป, ตรวจสลิป, อนุมัติ/ปฏิเสธ, บันทึกมือ,
 * ประวัติชำระ, ยอดค้างชำระ, รูปสลิป → Drive
 * 
 * ฟีเจอร์:
 *   - Slip: handleSubmitSlip, getSlipSubmissions, getSlipDetail, handleReviewSlip
 *   - Manual: recordManualPayment
 *   - History: getPaymentHistory
 *   - Outstanding: getOutstanding, updateOutstanding
 *   - Image: uploadSlipImage, saveSlipImage, getSlipImageUrl
 *   - Year Sheets: createSlipYearSheet, createPaymentHistoryYearSheet
 * 
 * Version: 1.0
 * วันที่สร้าง: 17 กุมภาพันธ์ 2569
 * Step: 22 (ระยะที่ 2)
 * ============================================================================
 * 
 * Dependencies: Config.gs, Database.gs, Housing.gs, Billing.gs
 * Next: Request.gs (Step 23)
 * 
 * Spreadsheets:
 *   - [PAYMENTS] → SlipSubmissions_{year}, PaymentHistory_{year}, Outstanding
 *   - Drive      → Slips/{year}/{month}/ (รูปสลิป)
 * 
 * ============================================================================
 */

// ============================================================================
// SCHEMAS — Headers ของแผ่นงานตามปี (sync กับ setup.gs)
// ============================================================================

const SLIP_SUBMISSIONS_HEADERS = [
  'id', 'month', 'house_number', 'resident_name',
  'email', 'notified_amount', 'paid_amount', 'slip_file_ids',
  'status', 'payment_method', 'is_manual', 'reviewed_by',
  'reviewed_at', 'review_note', 'submitted_at'
];

const PAYMENT_HISTORY_HEADERS = [
  'id', 'month', 'house_number', 'resident_name',
  'water_amount', 'electric_amount', 'common_fee', 'total_amount',
  'paid_amount', 'payment_date', 'slip_id', 'status'
];

const OUTSTANDING_HEADERS = [
  'id', 'house_number', 'resident_name', 'year', 'month',
  'water_amount', 'electric_amount', 'common_fee', 'total_due',
  'paid_amount', 'balance', 'last_updated'
];

// ============================================================================
// SLIP SUBMISSIONS — อัปโหลด/ส่งสลิป
// ============================================================================

/**
 * ส่งสลิปใหม่
 * - สร้าง SlipSubmissions_{year} อัตโนมัติถ้ายังไม่มี
 * - บันทึกรูปสลิปลง Drive folder ตามปี/เดือน
 * - สถานะเริ่มต้น: 'pending'
 * @param {Object} data - {
 *   period, house_number, resident_name, email,
 *   notified_amount, paid_amount, slip_images: [base64...],
 *   payment_method, _userId
 * }
 * @returns {Object} { success, message, slipId }
 */
function handleSubmitSlip(data) {
  // ── Validation ──
  if (!data.period) return { success: false, error: 'กรุณาระบุงวดเดือน' };
  if (!data.house_number) return { success: false, error: 'กรุณาระบุเลขบ้าน' };

  var parts = _parsePeriod(data.period);
  if (!parts) return { success: false, error: 'รูปแบบงวดไม่ถูกต้อง' };

  var slipSheetName = getYearSheetName('SlipSubmissions', parts.year);
  var now = new Date().toISOString();

  // สร้างแผ่นงาน SlipSubmissions_{year} (ถ้ายังไม่มี)
  createSlipYearSheet(parts.year);

  // ── ตรวจซ้ำ: ส่งสลิปเดือนนี้แล้วหรือยัง (เฉพาะ pending/approved) ──
  // ข้ามการตรวจซ้ำถ้าเป็น manual payment ที่บันทึกโดย admin
  if (!data.is_manual) {
    try {
      var existing = readSheetData(SPREADSHEET_IDS.PAYMENTS, slipSheetName);
      var duplicate = existing.filter(function(row) {
        return String(row.house_number) === String(data.house_number) &&
               String(row.month) === parts.month &&
               (row.status === 'pending' || row.status === 'approved');
      });
      if (duplicate.length > 0) {
        return { success: false, error: 'บ้าน ' + data.house_number + ' ส่งสลิปเดือนนี้แล้ว (สถานะ: ' + duplicate[0].status + ')' };
      }
    } catch (e) {
      // Sheet ยังไม่มี → ไม่มีซ้ำ
    }
  }

  // ── บันทึกรูปสลิป → Drive (ถ้ามี) ──
  var fileIds = [];
  if (data.slip_images && data.slip_images.length > 0) {
    var imageResult = saveSlipImage(data.slip_images, data.house_number, data.period);
    if (imageResult.success) {
      fileIds = imageResult.fileIds;
    }
  } else if (data.slip_file_ids) {
    // กรณีส่ง file IDs มาโดยตรง (upload ทีละรูปก่อน)
    fileIds = Array.isArray(data.slip_file_ids) ? data.slip_file_ids : [data.slip_file_ids];
  }

  // ── สร้าง slip record ──
  var slipId = getNextId(ID_PREFIXES.SLP);
  var slipData = {
    id: slipId,
    month: parts.month,
    house_number: data.house_number || '',
    resident_name: data.resident_name || '',
    email: data.email || '',
    notified_amount: Number(data.notified_amount) || 0,
    paid_amount: Number(data.paid_amount) || 0,
    slip_file_ids: fileIds.join(','),
    status: 'pending',
    payment_method: data.payment_method || 'transfer',
    is_manual: 'FALSE',
    reviewed_by: '',
    reviewed_at: '',
    review_note: '',
    submitted_at: now
  };

  var result = appendRowToSheet(SPREADSHEET_IDS.PAYMENTS, slipSheetName, slipData);
  if (!result.success) {
    return { success: false, error: 'ไม่สามารถบันทึกสลิปได้ — กรุณาลองใหม่' };
  }

  // Log
  writeLog('SUBMIT_SLIP', data._userId || data.email || 'USER',
    'ส่งสลิป: ' + data.house_number + ' เดือน ' + data.period + ' (' + slipId + ')', 'Payment');

  return {
    success: true,
    message: 'ส่งสลิปสำเร็จ — กรุณารอแอดมินตรวจสอบ',
    slipId: slipId
  };
}

/**
 * ดึงสลิปทั้งหมดตามเดือน
 * @param {string} period - เช่น '2569-02'
 * @returns {Object} { success, data: [...] }
 */
function getSlipSubmissions(period) {
  if (!period) return { success: false, error: 'กรุณาระบุงวดเดือน' };

  var parts = _parsePeriod(period);
  if (!parts) return { success: false, error: 'รูปแบบงวดไม่ถูกต้อง' };

  var slipSheetName = getYearSheetName('SlipSubmissions', parts.year);

  try {
    var allData = readSheetData(SPREADSHEET_IDS.PAYMENTS, slipSheetName);
    var monthData = allData.filter(function(row) {
      return String(row.month) === parts.month;
    });
    return { success: true, data: monthData };
  } catch (e) {
    return { success: true, data: [] };
  }
}

/**
 * ดึงรายละเอียดสลิป + URL รูป
 * @param {string} slipId - Slip ID (SLP-xxx)
 * @returns {Object} { success, slip, imageUrls: [...] }
 */
function getSlipDetail(slipId) {
  if (!slipId) return { success: false, error: 'กรุณาระบุ Slip ID' };

  // ค้นหาใน SlipSubmissions ของปีปัจจุบันก่อน
  var slip = _findSlipById(slipId, CURRENT_YEAR);

  // ถ้าไม่เจอ → ลองปีก่อน
  if (!slip) {
    slip = _findSlipById(slipId, CURRENT_YEAR - 1);
  }

  if (!slip) {
    return { success: false, error: 'ไม่พบสลิป ID: ' + slipId };
  }

  // ดึง URL รูปจาก file IDs
  var imageUrls = [];
  if (slip.slip_file_ids) {
    var ids = String(slip.slip_file_ids).split(',');
    ids.forEach(function(fileId) {
      fileId = fileId.trim();
      if (fileId) {
        try {
          var url = 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w800';
          imageUrls.push({ fileId: fileId, url: url });
        } catch (e) {
          // ไฟล์อาจถูกลบ
        }
      }
    });
  }

  return { success: true, slip: slip, imageUrls: imageUrls };
}

/**
 * อนุมัติ/ปฏิเสธสลิป
 * - approved → สร้าง PaymentHistory + อัปเดต Outstanding
 * - rejected → อัปเดตสถานะเท่านั้น
 * @param {Object} data - { slipId, status ('approved'|'rejected'|'match'|'mismatch'), note, _userId }
 * @returns {Object} { success, message }
 */
function handleReviewSlip(data) {
  if (!data.slipId) return { success: false, error: 'กรุณาระบุ Slip ID' };
  if (!data.status) return { success: false, error: 'กรุณาระบุสถานะ' };

  var validStatuses = ['approved', 'rejected', 'match', 'mismatch', 'no-resident', 'unpaid'];
  if (validStatuses.indexOf(data.status) === -1) {
    return { success: false, error: 'สถานะไม่ถูกต้อง: ' + data.status };
  }

  // ค้นหาสลิป
  var slip = _findSlipById(data.slipId, CURRENT_YEAR);
  if (!slip) {
    slip = _findSlipById(data.slipId, CURRENT_YEAR - 1);
  }
  if (!slip) {
    return { success: false, error: 'ไม่พบสลิป ID: ' + data.slipId };
  }

  // ค้นหาปีของสลิป
  var slipYear = _getSlipYear(data.slipId);
  var slipSheetName = getYearSheetName('SlipSubmissions', slipYear);
  var now = new Date().toISOString();

  // ── อัปเดตสถานะสลิป ──
  var updateData = {
    status: data.status,
    reviewed_by: data._userId || 'ADMIN',
    reviewed_at: now,
    review_note: data.note || ''
  };

  // ถ้ามี payment_method / is_manual
  if (data.payment_method) updateData.payment_method = data.payment_method;
  if (data.is_manual !== undefined) updateData.is_manual = data.is_manual ? 'TRUE' : 'FALSE';
  if (data.paid_amount !== undefined) updateData.paid_amount = Number(data.paid_amount);

  var updateResult = updateRowInSheet(SPREADSHEET_IDS.PAYMENTS, slipSheetName, 'id', data.slipId, updateData);
  if (!updateResult.success) return updateResult;

  // ── ถ้า approved/match → สร้าง PaymentHistory + อัปเดต Outstanding ──
  if (data.status === 'approved' || data.status === 'match') {
    _createPaymentHistoryFromSlip(slip, slipYear, data);
    _updateOutstandingFromSlip(slip, slipYear, data);
  }

  // Log
  writeLog('REVIEW_SLIP', data._userId || 'ADMIN',
    'ตรวจสลิป ' + data.slipId + ': ' + data.status +
    (data.note ? ' (' + data.note + ')' : ''), 'Payment');

  return { success: true, message: 'ตรวจสอบสลิปสำเร็จ (สถานะ: ' + data.status + ')' };
}

// ============================================================================
// MANUAL PAYMENT — บันทึกรับเงินสดมือ
// ============================================================================

/**
 * บันทึกรับเงินสด/มือ (ไม่มีสลิป)
 * @param {Object} data - { house_number, period, paid_amount, note, _userId }
 * @returns {Object} { success, message, paymentId }
 */
function recordManualPayment(data) {
  if (!data.house_number) return { success: false, error: 'กรุณาระบุเลขบ้าน' };
  if (!data.period) return { success: false, error: 'กรุณาระบุงวดเดือน' };
  if (!data.paid_amount) return { success: false, error: 'กรุณาระบุจำนวนเงิน' };

  var parts = _parsePeriod(data.period);
  if (!parts) return { success: false, error: 'รูปแบบงวดไม่ถูกต้อง' };

  var now = new Date().toISOString();
  var slipSheetName = getYearSheetName('SlipSubmissions', parts.year);
  var payHistSheetName = getYearSheetName('PaymentHistory', parts.year);

  // สร้างแผ่นงาน (ถ้ายังไม่มี)
  createSlipYearSheet(parts.year);
  createPaymentHistoryYearSheet(parts.year);

  // ดึงชื่อผู้พัก
  var residentName = data.resident_name || '';
  if (!residentName) {
    var residentsResult = getResidentsList();
    if (residentsResult.success && residentsResult.data) {
      var found = residentsResult.data.filter(function(r) {
        return String(r.house_number) === String(data.house_number) && r.resident_type === 'staff';
      });
      if (found.length > 0) {
        residentName = (found[0].prefix || '') + (found[0].firstname || '') + ' ' + (found[0].lastname || '');
        residentName = residentName.trim();
      }
    }
  }

  // ── สร้าง SlipSubmissions record (is_manual = TRUE) ──
  var slipId = getNextId(ID_PREFIXES.SLP);
  var slipData = {
    id: slipId,
    month: parts.month,
    house_number: data.house_number,
    resident_name: residentName,
    email: '',
    notified_amount: 0,
    paid_amount: Number(data.paid_amount),
    slip_file_ids: '',
    status: 'approved',
    payment_method: data.payment_method || 'cash',
    is_manual: 'TRUE',
    reviewed_by: data._userId || 'ADMIN',
    reviewed_at: now,
    review_note: data.note || 'บันทึกรับเงินสด',
    submitted_at: now
  };

  appendRowToSheet(SPREADSHEET_IDS.PAYMENTS, slipSheetName, slipData);

  // ── สร้าง PaymentHistory ──
  var billSummary = getBillSummary(data.house_number, data.period);
  var summary = billSummary.success ? billSummary.summary : {};

  var payId = getNextId(ID_PREFIXES.PAY);
  var payData = {
    id: payId,
    month: parts.month,
    house_number: data.house_number,
    resident_name: residentName,
    water_amount: summary.water || 0,
    electric_amount: summary.electric || 0,
    common_fee: summary.commonFee || 0,
    total_amount: summary.total || 0,
    paid_amount: Number(data.paid_amount),
    payment_date: now,
    slip_id: slipId,
    status: 'paid'
  };

  appendRowToSheet(SPREADSHEET_IDS.PAYMENTS, payHistSheetName, payData);

  // ── อัปเดต Outstanding ──
  _updateOutstandingAfterPayment(data.house_number, parts, Number(data.paid_amount));

  // Log
  writeLog('MANUAL_PAYMENT', data._userId || 'ADMIN',
    'รับเงินสด: ' + data.house_number + ' ' + data.period + ' = ' + data.paid_amount + ' บาท', 'Payment');

  return {
    success: true,
    message: 'บันทึกรับเงินสำเร็จ',
    paymentId: payId,
    slipId: slipId
  };
}

// ============================================================================
// PAYMENT HISTORY — ประวัติชำระ
// ============================================================================

/**
 * ดึงประวัติชำระเงิน
 * @param {string} userId - User ID (ดึงเฉพาะของ user นี้) หรือ null (ดึงทั้งหมด)
 * @param {string} [month] - เดือน (optional filter)
 * @param {string|number} [year] - ปี (optional filter, default ปีปัจจุบัน)
 * @returns {Object} { success, data: [...] }
 */
function getPaymentHistory(userId, month, year, houseNumber) {
  year = year || CURRENT_YEAR;
  var payHistSheetName = getYearSheetName('PaymentHistory', year);

  try {
    // ── Cache 5 นาที ต่อปี — ลด Sheets read ──
    var _cache = CacheService.getScriptCache();
    var _cacheKey = 'payhist_' + year;
    var allData = null;
    var _cached = _cache.get(_cacheKey);
    if (_cached) { try { allData = JSON.parse(_cached); } catch(e) {} }
    if (!allData) {
      allData = readSheetData(SPREADSHEET_IDS.PAYMENTS, payHistSheetName);
      var _str = JSON.stringify(allData);
      if (_str.length < 95000) _cache.put(_cacheKey, _str, 300); // 5 นาที
    }

    // กรองตาม house_number (ถ้ามีจาก session → ข้าม Users/Residents lookup)
    if (houseNumber) {
      allData = allData.filter(function(row) {
        return String(row.house_number) === String(houseNumber);
      });
    } else if (userId) {
      // fallback: lookup จาก Users → Residents (ช้ากว่า แต่ยังรองรับ)
      var user = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.USERS, 'id', userId);
      if (user && user.resident_id) {
        var resident = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS, 'id', user.resident_id);
        if (resident && resident.house_number) {
          allData = allData.filter(function(row) {
            return String(row.house_number) === String(resident.house_number);
          });
        }
      }
    }

    // กรองตามเดือน (ถ้ามี)
    if (month) {
      var monthStr = String(month).padStart(2, '0');
      allData = allData.filter(function(row) {
        return String(row.month) === monthStr;
      });
    }

    return { success: true, data: allData };
  } catch (e) {
    return { success: true, data: [] };
  }
}

// ============================================================================
// OUTSTANDING — ยอดค้างชำระ
// ============================================================================

/**
 * ดึงยอดค้างชำระ (Outstanding sheet — ไม่แยกปี)
 * @param {string} [period] - กรองตามงวด (optional)
 * @returns {Object} { success, data: [...] }
 */
function getOutstanding(period) {
  try {
    // ── Cache 5 นาที — ลด Sheets read ใน PAYMENTS spreadsheet ──
    var _cache = CacheService.getScriptCache();
    var _cacheKey = 'outstanding';
    var allData = null;
    var _cached = _cache.get(_cacheKey);
    if (_cached) { try { allData = JSON.parse(_cached); } catch(e) {} }
    if (!allData) {
      allData = readSheetData(SPREADSHEET_IDS.PAYMENTS, SHEET_NAMES.OUTSTANDING);
      var _str = JSON.stringify(allData);
      if (_str.length < 95000) _cache.put(_cacheKey, _str, 300); // 5 นาที
    }

    if (period) {
      var parts = _parsePeriod(period);
      if (parts) {
        allData = allData.filter(function(row) {
          return String(row.year) === parts.year && String(row.month) === parts.month;
        });
      }
    }

    // กรองเฉพาะที่ค้าง (balance > 0)
    var outstanding = allData.filter(function(row) {
      return Number(row.balance) > 0;
    });

    return { success: true, data: outstanding };
  } catch (e) {
    return { success: true, data: [] };
  }
}

/**
 * อัปเดตยอดค้างชำระทั้งหมดสำหรับงวดที่ระบุ
 * คำนวณจาก BillSummaryAll - PaymentHistory
 * @param {string} period - งวดเดือน เช่น '2569-02'
 * @returns {Object} { success, message, count }
 */
function updateOutstanding(period) {
  if (!period) return { success: false, error: 'กรุณาระบุงวดเดือน' };

  var parts = _parsePeriod(period);
  if (!parts) return { success: false, error: 'รูปแบบงวดไม่ถูกต้อง' };

  // ดึงยอดรวมทุกบ้าน
  var billResult = getBillSummaryAll(period);
  if (!billResult.success) return billResult;

  // ดึงประวัติชำระ
  var payHistSheetName = getYearSheetName('PaymentHistory', parts.year);
  var paymentMap = {};
  try {
    var payments = readSheetData(SPREADSHEET_IDS.PAYMENTS, payHistSheetName);
    payments.filter(function(p) {
      return String(p.month) === parts.month && p.status === 'paid';
    }).forEach(function(p) {
      if (!paymentMap[p.house_number]) paymentMap[p.house_number] = 0;
      paymentMap[p.house_number] += Number(p.paid_amount) || 0;
    });
  } catch (e) { /* ไม่มีข้อมูล */ }

  var now = new Date().toISOString();
  var updatedCount = 0;

  billResult.data.forEach(function(bill) {
    var paidAmount = paymentMap[bill.house_number] || 0;
    var balance = bill.total - paidAmount;
    if (balance < 0) balance = 0;

    if (balance > 0) {
      // ตรวจว่ามี Outstanding record อยู่แล้วหรือไม่
      var existing = null;
      try {
        var outData = readSheetData(SPREADSHEET_IDS.PAYMENTS, SHEET_NAMES.OUTSTANDING);
        existing = outData.filter(function(r) {
          return String(r.house_number) === String(bill.house_number) &&
                 String(r.year) === parts.year &&
                 String(r.month) === parts.month;
        });
      } catch (e) { /* sheet ยังไม่มี */ }

      if (existing && existing.length > 0) {
        // อัปเดต
        updateRowInSheet(SPREADSHEET_IDS.PAYMENTS, SHEET_NAMES.OUTSTANDING, 'id', existing[0].id, {
          paid_amount: paidAmount,
          balance: balance,
          last_updated: now
        });
      } else {
        // เพิ่มใหม่
        appendRowToSheet(SPREADSHEET_IDS.PAYMENTS, SHEET_NAMES.OUTSTANDING, {
          id: getNextId(ID_PREFIXES.OUT),
          house_number: bill.house_number,
          resident_name: bill.resident_name,
          year: parts.year,
          month: parts.month,
          water_amount: bill.water_amount,
          electric_amount: bill.electric_amount,
          common_fee: bill.common_fee,
          total_due: bill.total,
          paid_amount: paidAmount,
          balance: balance,
          last_updated: now
        });
      }
      updatedCount++;
    } else {
      // ชำระครบแล้ว → ลบ Outstanding (ถ้ามี)
      try {
        var outData = readSheetData(SPREADSHEET_IDS.PAYMENTS, SHEET_NAMES.OUTSTANDING);
        var toRemove = outData.filter(function(r) {
          return String(r.house_number) === String(bill.house_number) &&
                 String(r.year) === parts.year &&
                 String(r.month) === parts.month;
        });
        toRemove.forEach(function(r) {
          deleteRowFromSheet(SPREADSHEET_IDS.PAYMENTS, SHEET_NAMES.OUTSTANDING, 'id', r.id);
        });
      } catch (e) { /* ไม่มี record ให้ลบ */ }
    }
  });

  // Log
  writeLog('UPDATE_OUTSTANDING', 'SYSTEM',
    'อัปเดตค้างชำระ: ' + period + ' (' + updatedCount + ' รายการ)', 'Payment');

  return { success: true, message: 'อัปเดตค้างชำระสำเร็จ', count: updatedCount };
}

// ============================================================================
// SLIP IMAGE — รูปสลิป → Drive
// ============================================================================

/**
 * อัปโหลดรูปสลิปทีละรูป (เรียกจาก Frontend ทีละรูป — S0-6 limit safeguard)
 * @param {Object} data - { image (base64), houseId, period, index }
 * @returns {Object} { success, fileId }
 */
function uploadSlipImage(data) {
  if (!data.image) return { success: false, error: 'ไม่มีข้อมูลรูปภาพ' };
  if (!data.houseId || !data.period) return { success: false, error: 'กรุณาระบุเลขบ้านและงวดเดือน' };

  var parts = _parsePeriod(data.period);
  if (!parts) return { success: false, error: 'รูปแบบงวดไม่ถูกต้อง' };

  // ดึง folder ID ตามเดือน
  var folderId = getSlipFolderId(data.period);
  if (!folderId) {
    // ถ้าไม่มี folder → ใช้ SLIPS root
    folderId = FOLDER_IDS.SLIPS;
  }

  try {
    var folder = DriveApp.getFolderById(folderId);

    // แปลง base64 → blob
    var base64Data = String(data.image);
    // ลบ data URI prefix ถ้ามี (เช่น "data:image/jpeg;base64,")
    if (base64Data.indexOf(',') !== -1) {
      base64Data = base64Data.split(',')[1];
    }

    var blob = Utilities.newBlob(
      Utilities.base64Decode(base64Data),
      'image/jpeg',
      _sanitizeFileName(data.houseId) + '_' + data.period + '_' + (data.index || 0) + '.jpg'
    );

    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return { success: true, fileId: file.getId() };
  } catch (e) {
    return { success: false, error: 'ไม่สามารถบันทึกรูปได้: ' + e.message };
  }
}

/**
 * บันทึกรูปสลิปหลายรูป (batch — ใช้ภายใน)
 * @param {string[]} images - array ของ base64 strings
 * @param {string} houseId - เลขบ้าน
 * @param {string} period - งวดเดือน
 * @returns {Object} { success, fileIds: [...] }
 */
function saveSlipImage(images, houseId, period) {
  if (!images || !images.length) return { success: true, fileIds: [] };

  var fileIds = [];
  for (var i = 0; i < images.length; i++) {
    var result = uploadSlipImage({
      image: images[i],
      houseId: houseId,
      period: period,
      index: i
    });
    if (result.success) {
      fileIds.push(result.fileId);
    }
  }

  return { success: true, fileIds: fileIds };
}

/**
 * ดึง URL รูปสลิป
 * @param {string} slipId - Slip ID
 * @returns {Object} { success, urls: [...] }
 */
function getSlipImageUrl(slipId) {
  var detailResult = getSlipDetail(slipId);
  if (!detailResult.success) return detailResult;

  return { success: true, urls: detailResult.imageUrls };
}

// ============================================================================
// YEAR SHEET CREATION
// ============================================================================

/**
 * สร้างแผ่นงาน SlipSubmissions_{year} ใหม่ (ถ้ายังไม่มี)
 * @param {number|string} year - ปี พ.ศ.
 */
function createSlipYearSheet(year) {
  var sheetName = getYearSheetName('SlipSubmissions', year);
  getOrCreateSheet(SPREADSHEET_IDS.PAYMENTS, sheetName, SLIP_SUBMISSIONS_HEADERS);
}

/**
 * สร้างแผ่นงาน PaymentHistory_{year} ใหม่ (ถ้ายังไม่มี)
 * @param {number|string} year - ปี พ.ศ.
 */
function createPaymentHistoryYearSheet(year) {
  var sheetName = getYearSheetName('PaymentHistory', year);
  getOrCreateSheet(SPREADSHEET_IDS.PAYMENTS, sheetName, PAYMENT_HISTORY_HEADERS);
}

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

/**
 * ค้นหาสลิปตาม ID ในปีที่ระบุ
 * @param {string} slipId - Slip ID
 * @param {number|string} year - ปี พ.ศ.
 * @returns {Object|null}
 * @private
 */
function _findSlipById(slipId, year) {
  var sheetName = getYearSheetName('SlipSubmissions', year);
  try {
    return findRowByValue(SPREADSHEET_IDS.PAYMENTS, sheetName, 'id', slipId);
  } catch (e) {
    return null;
  }
}

/**
 * หาปีของสลิปจาก ID (ลองปีปัจจุบัน → ปีก่อน)
 * @param {string} slipId - Slip ID
 * @returns {number|string} ปี พ.ศ.
 * @private
 */
function _getSlipYear(slipId) {
  // ลองปีปัจจุบันก่อน
  var slip = _findSlipById(slipId, CURRENT_YEAR);
  if (slip) return CURRENT_YEAR;

  // ลองปีก่อน
  slip = _findSlipById(slipId, CURRENT_YEAR - 1);
  if (slip) return CURRENT_YEAR - 1;

  return CURRENT_YEAR; // default
}

/**
 * สร้าง PaymentHistory จาก slip ที่อนุมัติ
 * @param {Object} slip - Slip record
 * @param {number|string} year - ปี
 * @param {Object} reviewData - { _userId, paid_amount }
 * @private
 */
function _createPaymentHistoryFromSlip(slip, year, reviewData) {
  var payHistSheetName = getYearSheetName('PaymentHistory', year);
  createPaymentHistoryYearSheet(year);

  // ดึง bill summary สำหรับบ้านนี้
  var period = year + '-' + String(slip.month).padStart(2, '0');
  var billSummary = getBillSummary(slip.house_number, period);
  var summary = billSummary.success ? billSummary.summary : {};

  var paidAmount = reviewData.paid_amount !== undefined ?
    Number(reviewData.paid_amount) : (Number(slip.paid_amount) || 0);

  var payId = getNextId(ID_PREFIXES.PAY);
  var payData = {
    id: payId,
    month: slip.month,
    house_number: slip.house_number,
    resident_name: slip.resident_name,
    water_amount: summary.water || 0,
    electric_amount: summary.electric || 0,
    common_fee: summary.commonFee || 0,
    total_amount: summary.total || 0,
    paid_amount: paidAmount,
    payment_date: new Date().toISOString(),
    slip_id: slip.id,
    status: 'paid'
  };

  appendRowToSheet(SPREADSHEET_IDS.PAYMENTS, payHistSheetName, payData);
}

/**
 * อัปเดต Outstanding หลังอนุมัติสลิป
 * @param {Object} slip - Slip record
 * @param {number|string} year - ปี
 * @param {Object} reviewData - { paid_amount }
 * @private
 */
function _updateOutstandingFromSlip(slip, year, reviewData) {
  var period = year + '-' + String(slip.month).padStart(2, '0');
  var parts = _parsePeriod(period);
  if (!parts) return;

  var paidAmount = reviewData.paid_amount !== undefined ?
    Number(reviewData.paid_amount) : (Number(slip.paid_amount) || 0);

  _updateOutstandingAfterPayment(slip.house_number, parts, paidAmount);
}

/**
 * อัปเดต Outstanding หลังรับชำระ
 * @param {string} houseNumber - เลขบ้าน
 * @param {Object} parts - { year, month }
 * @param {number} paidAmount - จำนวนที่ชำระ
 * @private
 */
function _updateOutstandingAfterPayment(houseNumber, parts, paidAmount) {
  var now = new Date().toISOString();

  try {
    var outData = readSheetData(SPREADSHEET_IDS.PAYMENTS, SHEET_NAMES.OUTSTANDING);
    var existing = outData.filter(function(r) {
      return String(r.house_number) === String(houseNumber) &&
             String(r.year) === parts.year &&
             String(r.month) === parts.month;
    });

    if (existing.length > 0) {
      var rec = existing[0];
      var newPaid = (Number(rec.paid_amount) || 0) + paidAmount;
      var newBalance = (Number(rec.total_due) || 0) - newPaid;
      if (newBalance < 0) newBalance = 0;

      if (newBalance === 0) {
        // ชำระครบ → ลบ Outstanding
        deleteRowFromSheet(SPREADSHEET_IDS.PAYMENTS, SHEET_NAMES.OUTSTANDING, 'id', rec.id);
      } else {
        // ยังค้าง → อัปเดต
        updateRowInSheet(SPREADSHEET_IDS.PAYMENTS, SHEET_NAMES.OUTSTANDING, 'id', rec.id, {
          paid_amount: newPaid,
          balance: newBalance,
          last_updated: now
        });
      }
    }
    // ถ้าไม่มี Outstanding → ไม่ต้องทำอะไร (ยังไม่ได้สร้างจาก updateOutstanding)
  } catch (e) {
    // Outstanding sheet ยังไม่มี → ข้าม
  }
}

/**
 * ทำให้ชื่อไฟล์ปลอดภัย (ลบอักขระพิเศษ)
 * @param {string} name
 * @returns {string}
 * @private
 */
function _sanitizeFileName(name) {
  return String(name).replace(/[^a-zA-Z0-9ก-๙\-_]/g, '_');
}

// ============================================================================
// TEST FUNCTION — รันใน GAS Editor เพื่อตรวจสอบ
// ============================================================================

/**
 * ทดสอบ Payment.gs — รันใน GAS Editor
 * ✅ ผ่าน = submit/review slip ไม่มี error
 * ❌ ไม่ผ่าน = error → ตรวจ Payment.gs + Config.gs + Billing.gs
 */
function testPayment() {
  Logger.log('=== TEST PAYMENT.gs ===');

  // Test 1: createSlipYearSheet
  Logger.log('\n--- CREATE YEAR SHEETS ---');
  createSlipYearSheet(CURRENT_YEAR);
  Logger.log('  SlipSubmissions_' + CURRENT_YEAR + ' ✓');
  createPaymentHistoryYearSheet(CURRENT_YEAR);
  Logger.log('  PaymentHistory_' + CURRENT_YEAR + ' ✓');

  // Test 2: handleSubmitSlip (ข้อมูลทดสอบ)
  Logger.log('\n--- SUBMIT SLIP ---');
  var submitResult = handleSubmitSlip({
    period: CURRENT_YEAR + '-00',
    house_number: 'TEST_HOUSE',
    resident_name: 'ทดสอบ สลิป',
    email: 'test@test.com',
    notified_amount: 500,
    paid_amount: 500,
    payment_method: 'transfer',
    _userId: 'TEST'
  });
  Logger.log('  Submit result: ' + JSON.stringify(submitResult));
  var testSlipId = submitResult.slipId;

  // Test 3: getSlipSubmissions
  Logger.log('\n--- GET SLIP SUBMISSIONS ---');
  var slipResult = getSlipSubmissions(CURRENT_YEAR + '-00');
  Logger.log('  Slips found: ' + slipResult.data.length);

  // Test 4: getSlipDetail
  Logger.log('\n--- GET SLIP DETAIL ---');
  if (testSlipId) {
    var detailResult = getSlipDetail(testSlipId);
    Logger.log('  Slip detail: ' + (detailResult.success ? 'found' : 'not found'));
  }

  // Test 5: handleReviewSlip
  Logger.log('\n--- REVIEW SLIP ---');
  if (testSlipId) {
    var reviewResult = handleReviewSlip({
      slipId: testSlipId,
      status: 'approved',
      note: 'ทดสอบอนุมัติ',
      _userId: 'TEST_ADMIN'
    });
    Logger.log('  Review result: ' + JSON.stringify(reviewResult));
  }

  // Test 6: getPaymentHistory
  Logger.log('\n--- PAYMENT HISTORY ---');
  var historyResult = getPaymentHistory(null, '00', CURRENT_YEAR);
  Logger.log('  History records: ' + historyResult.data.length);

  // Test 7: getOutstanding
  Logger.log('\n--- OUTSTANDING ---');
  var outResult = getOutstanding();
  Logger.log('  Outstanding records: ' + outResult.data.length);

  // Test 8: recordManualPayment
  Logger.log('\n--- MANUAL PAYMENT ---');
  var manualResult = recordManualPayment({
    house_number: 'TEST_HOUSE_2',
    period: CURRENT_YEAR + '-00',
    paid_amount: 300,
    note: 'ทดสอบรับเงินสด',
    _userId: 'TEST_ADMIN'
  });
  Logger.log('  Manual result: ' + JSON.stringify(manualResult));

  // Test 9: Cleanup — ลบข้อมูลทดสอบ
  Logger.log('\n--- CLEANUP ---');
  var slipSheet = getYearSheetName('SlipSubmissions', CURRENT_YEAR);
  var paySheet = getYearSheetName('PaymentHistory', CURRENT_YEAR);

  // ลบ slip ทดสอบ
  try {
    var testSlips = readSheetData(SPREADSHEET_IDS.PAYMENTS, slipSheet);
    testSlips.filter(function(r) { return r.month === '00'; })
      .forEach(function(r) {
        deleteRowFromSheet(SPREADSHEET_IDS.PAYMENTS, slipSheet, 'id', r.id);
      });
  } catch (e) {}

  // ลบ payment history ทดสอบ
  try {
    var testPay = readSheetData(SPREADSHEET_IDS.PAYMENTS, paySheet);
    testPay.filter(function(r) { return r.month === '00'; })
      .forEach(function(r) {
        deleteRowFromSheet(SPREADSHEET_IDS.PAYMENTS, paySheet, 'id', r.id);
      });
  } catch (e) {}

  Logger.log('  ลบข้อมูลทดสอบเดือน 00 สำเร็จ');

  // Test 10: _sanitizeFileName
  Logger.log('\n--- SANITIZE FILENAME ---');
  Logger.log('  "บ้าน 1" → "' + _sanitizeFileName('บ้าน 1') + '"');
  Logger.log('  "แฟลต A-101" → "' + _sanitizeFileName('แฟลต A-101') + '"');

  Logger.log('\n✅ PAYMENT TEST PASSED');
}

// ============================================================================
// END OF Payment.gs
// ============================================================================
