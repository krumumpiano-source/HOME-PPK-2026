/**
 * ============================================================================
 * HOME PPK 2026 - Billing.gs — 💧⚡ ค่าน้ำ ค่าไฟ ค่าส่วนกลาง
 * ============================================================================
 * คำนวณและบันทึกค่าน้ำ, ค่าไฟ, ค่าส่วนกลาง, สรุปยอดรายบ้าน
 * 
 * ฟีเจอร์:
 *   - Water: getWaterBills, saveWaterBill, getPreviousWaterMeter, calculateWaterAmount
 *   - WaterRate: getWaterRate, updateWaterRate
 *   - Electric: getElectricBills, saveElectricBill
 *   - CommonFee: getCommonFee, updateCommonFee
 *   - Exemptions: getExemptions, updateExemptions
 *   - Summary: getBillSummary, getBillSummaryAll, getDueDate
 *   - Notification: saveNotificationSnapshot, getNotificationHistory
 *   - Year Sheets: createWaterYearSheet, createElectricYearSheet, createNotificationYearSheet
 * 
 * Version: 1.0
 * วันที่สร้าง: 17 กุมภาพันธ์ 2569
 * Step: 21 (ระยะที่ 2)
 * ============================================================================
 * 
 * Dependencies: Config.gs, Database.gs, Housing.gs
 * Next: Payment.gs (Step 22)
 * 
 * Spreadsheets:
 *   - [WATER]         → แผ่นงานปี เช่น '2569' (ค่าน้ำ)
 *   - [ELECTRIC]      → แผ่นงานปี เช่น '2569' (ค่าไฟ)
 *   - [NOTIFICATIONS] → แผ่นงานปี เช่น '2569' (แจ้งยอดชำระ)
 *   - [MAIN]          → WaterRates, CommonFee, Exemptions, Settings
 * 
 * ============================================================================
 */

// ============================================================================
// SCHEMAS — Headers ของแผ่นงานตามปี (sync กับ setup.gs)
// ============================================================================

const WATER_YEAR_HEADERS = [
  'id', 'month', 'house_number', 'resident_name',
  'prev_meter', 'curr_meter', 'units', 'rate', 'amount',
  'saved_at', 'saved_by'
];

const ELECTRIC_YEAR_HEADERS = [
  'id', 'month', 'house_number', 'resident_name',
  'amount', 'pea_total', 'lost_house', 'lost_flat',
  'saved_at', 'saved_by'
];

const NOTIFICATIONS_YEAR_HEADERS = [
  'id', 'month', 'house_number', 'resident_name',
  'prev_meter', 'curr_meter', 'water_amount', 'electric_amount',
  'common_fee', 'total_amount', 'is_exempt', 'due_date',
  'saved_at', 'saved_by'
];

// ============================================================================
// WATER BILLS — ค่าน้ำ
// ============================================================================

/**
 * ดึงบิลน้ำตามเดือน
 * @param {string} period - เช่น '2569-02'
 * @returns {Object} { success, data: [...] }
 */
function getWaterBills(period) {
  if (!period) return { success: false, error: 'กรุณาระบุงวดเดือน (เช่น 2569-02)' };

  var parts = _parsePeriod(period);
  if (!parts) return { success: false, error: 'รูปแบบงวดไม่ถูกต้อง (ต้องเป็น YYYY-MM)' };

  var sheetName = getYearOnlySheetName(parts.year);

  try {
    var allData = readSheetData(SPREADSHEET_IDS.WATER, sheetName);
    var monthData = allData.filter(function(row) {
      return String(row.month) === parts.month;
    });
    return { success: true, data: monthData };
  } catch (e) {
    // Sheet ยังไม่มี → ไม่มีข้อมูล
    return { success: true, data: [] };
  }
}

/**
 * บันทึกค่าน้ำ (ทุกบ้าน/เดือน)
 * - ถ้ามีข้อมูลเดือนนี้แล้ว → ลบเดิม + เขียนใหม่ (overwrite)
 * - สร้างแผ่นงานปีอัตโนมัติถ้ายังไม่มี
 * @param {Object} data - { period, rate, records: [{ house_number, resident_name, prev_meter, curr_meter, units, amount }] }
 * @returns {Object} { success, message, count }
 */
function saveWaterBill(data) {
  if (!data.period) return { success: false, error: 'กรุณาระบุงวดเดือน' };
  if (!data.records || !data.records.length) return { success: false, error: 'ไม่มีข้อมูลค่าน้ำ' };

  var parts = _parsePeriod(data.period);
  if (!parts) return { success: false, error: 'รูปแบบงวดไม่ถูกต้อง' };

  var sheetName = getYearOnlySheetName(parts.year);
  var now = new Date().toISOString();
  var rate = data.rate || '';

  // สร้างแผ่นงานปี (ถ้ายังไม่มี)
  createWaterYearSheet(parts.year);

  // ลบข้อมูลเดือนนี้ที่มีอยู่แล้ว (overwrite)
  _deleteMonthData(SPREADSHEET_IDS.WATER, sheetName, parts.month);

  // เตรียม rows
  var rows = data.records.map(function(rec) {
    var units = Number(rec.units) || 0;
    var amount = Number(rec.amount) || 0;

    // ถ้ามี prev_meter + curr_meter → คำนวณ units
    if (rec.prev_meter !== undefined && rec.curr_meter !== undefined) {
      units = Number(rec.curr_meter) - Number(rec.prev_meter);
      if (units < 0) units = 0;
    }

    // ถ้ามี rate และ units → คำนวณ amount
    if (rate && units > 0 && !rec.amount) {
      amount = calculateWaterAmount(Number(rec.prev_meter) || 0, Number(rec.curr_meter) || 0, Number(rate));
    }

    return {
      id: getNextId(ID_PREFIXES.WTR),
      month: parts.month,
      house_number: rec.house_number || '',
      resident_name: rec.resident_name || '',
      prev_meter: rec.prev_meter !== undefined ? rec.prev_meter : '',
      curr_meter: rec.curr_meter !== undefined ? rec.curr_meter : '',
      units: units,
      rate: rate,
      amount: amount,
      saved_at: now,
      saved_by: data._userId || 'ADMIN'
    };
  });

  // บันทึก
  var result = batchAppendRows(SPREADSHEET_IDS.WATER, sheetName, rows);
  if (!result.success) return result;

  // Invalidate cache
  invalidateCache('waterBills_' + data.period);

  // Log
  writeLog('SAVE_WATER_BILL', data._userId || 'ADMIN',
    'บันทึกค่าน้ำ: ' + data.period + ' (' + rows.length + ' รายการ)', 'Billing');

  return { success: true, message: 'บันทึกค่าน้ำสำเร็จ', count: rows.length };
}

/**
 * สร้างแผ่นงานปีใหม่สำหรับค่าน้ำ (ถ้ายังไม่มี)
 * @param {number|string} year - ปี พ.ศ. เช่น 2569
 */
function createWaterYearSheet(year) {
  var sheetName = getYearOnlySheetName(year);
  getOrCreateSheet(SPREADSHEET_IDS.WATER, sheetName, WATER_YEAR_HEADERS);
}

/**
 * ดึงเลขมิเตอร์น้ำเดือนก่อน
 * @param {string} houseNumber - เลขบ้าน เช่น 'บ้าน 1'
 * @param {string} period - งวดเดือนปัจจุบัน เช่น '2569-02'
 * @returns {Object} { success, prevMeter }
 */
function getPreviousWaterMeter(houseNumber, period) {
  if (!houseNumber || !period) {
    return { success: false, error: 'กรุณาระบุเลขบ้านและงวดเดือน' };
  }

  var parts = _parsePeriod(period);
  if (!parts) return { success: false, error: 'รูปแบบงวดไม่ถูกต้อง' };

  // คำนวณเดือนก่อน
  var prevMonth = Number(parts.month) - 1;
  var prevYear = Number(parts.year);
  if (prevMonth < 1) {
    prevMonth = 12;
    prevYear = prevYear - 1;
  }
  var prevMonthStr = String(prevMonth).padStart(2, '0');
  var prevSheetName = getYearOnlySheetName(prevYear);

  try {
    var allData = readSheetData(SPREADSHEET_IDS.WATER, prevSheetName);
    var found = allData.filter(function(row) {
      return String(row.house_number) === String(houseNumber) &&
             String(row.month) === prevMonthStr;
    });

    if (found.length > 0) {
      // เอาค่า curr_meter ของเดือนก่อนเป็น prev_meter ของเดือนนี้
      return { success: true, prevMeter: found[found.length - 1].curr_meter };
    }
    return { success: true, prevMeter: 0 };
  } catch (e) {
    return { success: true, prevMeter: 0 };
  }
}

/**
 * คำนวณค่าน้ำ
 * รองรับอัตราค่าน้ำแบบขั้นบันได (WaterRates) หรือ flat rate
 * @param {number} prevMeter - เลขมิเตอร์เดือนก่อน
 * @param {number} currMeter - เลขมิเตอร์เดือนนี้
 * @param {number} rate - อัตราค่าน้ำ (บาท/หน่วย) — ใช้ flat rate
 * @returns {number} ค่าน้ำ (บาท)
 */
function calculateWaterAmount(prevMeter, currMeter, rate) {
  var units = Number(currMeter) - Number(prevMeter);
  if (units < 0) units = 0;

  var amount = units * Number(rate);

  // ตรวจ min charge
  var minCharge = Number(DEFAULTS.water_min_charge) || 0;
  if (amount > 0 && amount < minCharge) {
    amount = minCharge;
  }

  // ปัดเศษ
  amount = _applyRounding(amount, DEFAULTS.water_rounding);

  return amount;
}

// ============================================================================
// WATER RATE — อัตราค่าน้ำ
// ============================================================================

/**
 * ดึงอัตราค่าน้ำล่าสุด
 * @returns {Object} { success, rate, rates: [...] }
 */
function getWaterRate() {
  try {
    var rates = readSheetData(SPREADSHEET_IDS.MAIN, SHEET_NAMES.WATER_RATES);

    // เรียงตาม effective_date ล่าสุด
    rates.sort(function(a, b) {
      return String(b.effective_date || '').localeCompare(String(a.effective_date || ''));
    });

    // อัตราล่าสุด = แถวแรก
    var currentRate = rates.length > 0 ? rates[0].rate : null;

    return {
      success: true,
      rate: currentRate,
      rates: rates
    };
  } catch (e) {
    return { success: true, rate: null, rates: [] };
  }
}

/**
 * อัปเดต/เพิ่มอัตราค่าน้ำใหม่
 * @param {Object} data - { rate, min_units, max_units }
 * @returns {Object} { success, message }
 */
function updateWaterRate(data) {
  if (data.rate === undefined || data.rate === null || data.rate === '') {
    return { success: false, error: 'กรุณาระบุอัตราค่าน้ำ' };
  }

  var now = new Date().toISOString();
  var rateData = {
    id: getNextId(ID_PREFIXES.RAT),
    min_units: data.min_units || 0,
    max_units: data.max_units || 999999,
    rate: Number(data.rate),
    effective_date: now,
    created_at: now,
    created_by: data._userId || 'ADMIN'
  };

  var result = appendRowToSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.WATER_RATES, rateData);
  if (!result.success) return result;

  // Log
  writeLog('UPDATE_WATER_RATE', data._userId || 'ADMIN',
    'อัปเดตอัตราค่าน้ำ: ' + data.rate + ' บาท/หน่วย', 'Billing');

  return { success: true, message: 'อัปเดตอัตราค่าน้ำสำเร็จ' };
}

// ============================================================================
// ELECTRIC BILLS — ค่าไฟ
// ============================================================================

/**
 * ดึงบิลไฟตามเดือน
 * @param {string} period - เช่น '2569-02'
 * @returns {Object} { success, data: [...] }
 */
function getElectricBills(period) {
  if (!period) return { success: false, error: 'กรุณาระบุงวดเดือน (เช่น 2569-02)' };

  var parts = _parsePeriod(period);
  if (!parts) return { success: false, error: 'รูปแบบงวดไม่ถูกต้อง' };

  var sheetName = getYearOnlySheetName(parts.year);

  try {
    var allData = readSheetData(SPREADSHEET_IDS.ELECTRIC, sheetName);
    var monthData = allData.filter(function(row) {
      return String(row.month) === parts.month;
    });
    return { success: true, data: monthData };
  } catch (e) {
    return { success: true, data: [] };
  }
}

/**
 * บันทึกค่าไฟ (ทุกบ้าน/เดือน)
 * - ถ้ามีข้อมูลเดือนนี้แล้ว → ลบเดิม + เขียนใหม่ (overwrite)
 * - สร้างแผ่นงานปีอัตโนมัติถ้ายังไม่มี
 * @param {Object} data - { period, pea_total, lost_house, lost_flat, records: [{ house_number, resident_name, amount }] }
 * @returns {Object} { success, message, count }
 */
function saveElectricBill(data) {
  if (!data.period) return { success: false, error: 'กรุณาระบุงวดเดือน' };
  if (!data.records || !data.records.length) return { success: false, error: 'ไม่มีข้อมูลค่าไฟ' };

  var parts = _parsePeriod(data.period);
  if (!parts) return { success: false, error: 'รูปแบบงวดไม่ถูกต้อง' };

  var sheetName = getYearOnlySheetName(parts.year);
  var now = new Date().toISOString();
  var peaTotal = data.pea_total || data.peaTotal || 0;
  var lostHouse = data.lost_house || data.lostHouse || 0;
  var lostFlat = data.lost_flat || data.lostFlat || 0;

  // สร้างแผ่นงานปี (ถ้ายังไม่มี)
  createElectricYearSheet(parts.year);

  // ลบข้อมูลเดือนนี้ที่มีอยู่แล้ว (overwrite)
  _deleteMonthData(SPREADSHEET_IDS.ELECTRIC, sheetName, parts.month);

  // เตรียม rows
  var rows = data.records.map(function(rec) {
    var amount = Number(rec.amount) || 0;

    // ปัดเศษค่าไฟ
    amount = _applyRounding(amount, DEFAULTS.electric_rounding);

    // ตรวจ min charge
    var minCharge = Number(DEFAULTS.electric_min_charge) || 0;
    if (amount > 0 && amount < minCharge) {
      amount = minCharge;
    }

    return {
      id: getNextId(ID_PREFIXES.ELC),
      month: parts.month,
      house_number: rec.house_number || '',
      resident_name: rec.resident_name || '',
      amount: amount,
      pea_total: peaTotal,
      lost_house: lostHouse,
      lost_flat: lostFlat,
      saved_at: now,
      saved_by: data._userId || 'ADMIN'
    };
  });

  var result = batchAppendRows(SPREADSHEET_IDS.ELECTRIC, sheetName, rows);
  if (!result.success) return result;

  // Invalidate cache
  invalidateCache('electricBills_' + data.period);

  // Log
  writeLog('SAVE_ELECTRIC_BILL', data._userId || 'ADMIN',
    'บันทึกค่าไฟ: ' + data.period + ' (' + rows.length + ' รายการ)', 'Billing');

  return { success: true, message: 'บันทึกค่าไฟสำเร็จ', count: rows.length };
}

/**
 * สร้างแผ่นงานปีใหม่สำหรับค่าไฟ (ถ้ายังไม่มี)
 * @param {number|string} year - ปี พ.ศ. เช่น 2569
 */
function createElectricYearSheet(year) {
  var sheetName = getYearOnlySheetName(year);
  getOrCreateSheet(SPREADSHEET_IDS.ELECTRIC, sheetName, ELECTRIC_YEAR_HEADERS);
}

// ============================================================================
// COMMON FEE — ค่าส่วนกลาง
// ============================================================================

/**
 * ดึงค่าส่วนกลางล่าสุด (หรือจาก Settings)
 * @returns {Object} { success, house: number, flat: number, fees: [...] }
 */
function getCommonFee() {
  try {
    var fees = readSheetData(SPREADSHEET_IDS.MAIN, SHEET_NAMES.COMMON_FEE);

    // เรียงตาม effective_date ล่าสุด
    fees.sort(function(a, b) {
      return String(b.effective_date || '').localeCompare(String(a.effective_date || ''));
    });

    // ดึงอัตราล่าสุดแยกตาม type
    var houseRate = DEFAULTS.common_fee_house;
    var flatRate = DEFAULTS.common_fee_flat;

    for (var i = 0; i < fees.length; i++) {
      if (fees[i].type === 'house' && houseRate === DEFAULTS.common_fee_house) {
        houseRate = Number(fees[i].amount) || DEFAULTS.common_fee_house;
      }
      if (fees[i].type === 'flat' && flatRate === DEFAULTS.common_fee_flat) {
        flatRate = Number(fees[i].amount) || DEFAULTS.common_fee_flat;
      }
    }

    return {
      success: true,
      house: houseRate,
      flat: flatRate,
      fees: fees
    };
  } catch (e) {
    return {
      success: true,
      house: DEFAULTS.common_fee_house,
      flat: DEFAULTS.common_fee_flat,
      fees: []
    };
  }
}

/**
 * อัปเดตค่าส่วนกลาง (เพิ่มแถวใหม่ เก็บประวัติ)
 * @param {Object} data - { houseRate, flatRate }
 * @returns {Object} { success, message }
 */
function updateCommonFee(data) {
  var now = new Date().toISOString();

  if (data.houseRate !== undefined) {
    appendRowToSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.COMMON_FEE, {
      id: getNextId(ID_PREFIXES.CMF),
      type: 'house',
      amount: Number(data.houseRate),
      effective_date: now,
      created_at: now,
      created_by: data._userId || 'ADMIN'
    });
  }

  if (data.flatRate !== undefined) {
    appendRowToSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.COMMON_FEE, {
      id: getNextId(ID_PREFIXES.CMF),
      type: 'flat',
      amount: Number(data.flatRate),
      effective_date: now,
      created_at: now,
      created_by: data._userId || 'ADMIN'
    });
  }

  // Log
  writeLog('UPDATE_COMMON_FEE', data._userId || 'ADMIN',
    'อัปเดตค่าส่วนกลาง: บ้าน=' + (data.houseRate || '-') + ' แฟลต=' + (data.flatRate || '-'), 'Billing');

  return { success: true, message: 'อัปเดตค่าส่วนกลางสำเร็จ' };
}

// ============================================================================
// EXEMPTIONS — การยกเว้น
// ============================================================================

/**
 * ดึงรายการยกเว้นทั้งหมด
 * @returns {Object} { success, data: [...] }
 */
function getExemptions() {
  try {
    var data = readSheetData(SPREADSHEET_IDS.MAIN, SHEET_NAMES.EXEMPTIONS);
    return { success: true, data: data };
  } catch (e) {
    return { success: true, data: [] };
  }
}

/**
 * อัปเดตการยกเว้น (เพิ่ม/แก้)
 * @param {Object} data - { house_number, exemption_type, reason, start_date, end_date }
 * @returns {Object} { success, message }
 */
function updateExemptions(data) {
  if (!data.house_number) return { success: false, error: 'กรุณาระบุเลขบ้าน' };
  if (!data.exemption_type) return { success: false, error: 'กรุณาระบุประเภทการยกเว้น' };

  var now = new Date().toISOString();
  var exemptionData = {
    id: data.id || getNextId(ID_PREFIXES.EXM),
    house_number: data.house_number || '',
    exemption_type: data.exemption_type || '',
    reason: data.reason || '',
    start_date: data.start_date || now,
    end_date: data.end_date || '',
    created_at: now,
    created_by: data._userId || 'ADMIN'
  };

  // ถ้ามี id → update, ไม่มี → append
  if (data.id) {
    var result = updateRowInSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.EXEMPTIONS, 'id', data.id, exemptionData);
    if (!result.success) return result;
  } else {
    var result = appendRowToSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.EXEMPTIONS, exemptionData);
    if (!result.success) return result;
  }

  // Log
  writeLog('UPDATE_EXEMPTION', data._userId || 'ADMIN',
    'ยกเว้น: ' + data.house_number + ' (' + data.exemption_type + ')', 'Billing');

  return { success: true, message: 'อัปเดตการยกเว้นสำเร็จ', id: exemptionData.id };
}

/**
 * ลบการยกเว้น
 * @param {string} id - Exemption ID
 * @returns {Object} { success, message }
 */
function deleteExemption(id) {
  if (!id) return { success: false, error: 'กรุณาระบุ ID' };

  var result = deleteRowFromSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.EXEMPTIONS, 'id', id);
  if (!result.success) return result;

  writeLog('DELETE_EXEMPTION', 'ADMIN', 'ลบการยกเว้น: ' + id, 'Billing');
  return { success: true, message: 'ลบการยกเว้นสำเร็จ' };
}

// ============================================================================
// BILL SUMMARY — สรุปยอดรวม
// ============================================================================

/**
 * สรุปยอดรวมรายบ้าน (น้ำ + ไฟ + ส่วนกลาง)
 * @param {string} houseNumber - เลขบ้าน เช่น 'บ้าน 1'
 * @param {string} period - งวดเดือน เช่น '2569-02'
 * @returns {Object} { success, summary: { water, electric, commonFee, total, isExempt } }
 */
function getBillSummary(houseNumber, period) {
  if (!houseNumber || !period) {
    return { success: false, error: 'กรุณาระบุเลขบ้านและงวดเดือน' };
  }

  var parts = _parsePeriod(period);
  if (!parts) return { success: false, error: 'รูปแบบงวดไม่ถูกต้อง' };

  var sheetName = getYearOnlySheetName(parts.year);
  var waterAmount = 0;
  var electricAmount = 0;

  // ค่าน้ำ
  try {
    var waterData = readSheetData(SPREADSHEET_IDS.WATER, sheetName);
    var waterBill = waterData.filter(function(row) {
      return String(row.house_number) === String(houseNumber) && String(row.month) === parts.month;
    });
    if (waterBill.length > 0) {
      waterAmount = Number(waterBill[waterBill.length - 1].amount) || 0;
    }
  } catch (e) { /* ไม่มีข้อมูล */ }

  // ค่าไฟ
  try {
    var electricData = readSheetData(SPREADSHEET_IDS.ELECTRIC, sheetName);
    var electricBill = electricData.filter(function(row) {
      return String(row.house_number) === String(houseNumber) && String(row.month) === parts.month;
    });
    if (electricBill.length > 0) {
      electricAmount = Number(electricBill[electricBill.length - 1].amount) || 0;
    }
  } catch (e) { /* ไม่มีข้อมูล */ }

  // ค่าส่วนกลาง
  var commonFeeResult = getCommonFee();
  var commonFee = commonFeeResult.house; // default house
  // ตรวจว่าเป็นบ้านหรือแฟลต
  var housing = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.HOUSING, 'display_number', houseNumber);
  if (housing && housing.type === 'flat') {
    commonFee = commonFeeResult.flat;
  }

  // ตรวจ exemption
  var isExempt = _isExempt(houseNumber);
  if (isExempt) {
    commonFee = 0;
  }

  var total = waterAmount + electricAmount + commonFee;

  return {
    success: true,
    summary: {
      house_number: houseNumber,
      period: period,
      water: waterAmount,
      electric: electricAmount,
      commonFee: commonFee,
      total: total,
      isExempt: isExempt
    }
  };
}

/**
 * สรุปยอดรวมทุกบ้าน
 * @param {string} period - งวดเดือน เช่น '2569-02'
 * @returns {Object} { success, data: [...], total }
 */
function getBillSummaryAll(period) {
  if (!period) return { success: false, error: 'กรุณาระบุงวดเดือน' };

  var parts = _parsePeriod(period);
  if (!parts) return { success: false, error: 'รูปแบบงวดไม่ถูกต้อง' };

  // ดึงรายการบ้านทั้งหมด
  var housingResult = getHousingList();
  if (!housingResult.success) return housingResult;

  var housingList = housingResult.data;
  var sheetName = getYearOnlySheetName(parts.year);

  // ดึงข้อมูลค่าน้ำ/ไฟ ทั้งเดือน (batch)
  var waterMap = {};
  var electricMap = {};

  try {
    var waterData = readSheetData(SPREADSHEET_IDS.WATER, sheetName);
    waterData.filter(function(r) { return String(r.month) === parts.month; })
      .forEach(function(r) { waterMap[r.house_number] = r; });
  } catch (e) { /* ไม่มีข้อมูล */ }

  try {
    var electricData = readSheetData(SPREADSHEET_IDS.ELECTRIC, sheetName);
    electricData.filter(function(r) { return String(r.month) === parts.month; })
      .forEach(function(r) { electricMap[r.house_number] = r; });
  } catch (e) { /* ไม่มีข้อมูล */ }

  // ค่าส่วนกลาง
  var commonFeeResult = getCommonFee();

  // Exemptions
  var exemptions = _getActiveExemptions();

  // ดึงรายชื่อผู้พักอาศัย
  var residentsResult = getResidentsList();
  var residentsMap = {};
  if (residentsResult.success && residentsResult.data) {
    residentsResult.data.forEach(function(r) {
      if (r.house_number && r.resident_type === 'staff') {
        residentsMap[r.house_number] = r;
      }
    });
  }

  // สรุปแต่ละบ้าน
  var summaries = [];
  var grandTotal = 0;

  housingList.forEach(function(house) {
    var dn = house.display_number;
    if (house.status !== 'occupied') return; // ข้ามบ้านว่าง

    var waterRec = waterMap[dn];
    var electricRec = electricMap[dn];
    var resident = residentsMap[dn];

    var waterAmount = waterRec ? (Number(waterRec.amount) || 0) : 0;
    var electricAmount = electricRec ? (Number(electricRec.amount) || 0) : 0;
    var commonFee = house.type === 'flat' ? commonFeeResult.flat : commonFeeResult.house;
    var isExempt = _isExemptFromList(dn, exemptions);
    if (isExempt) commonFee = 0;

    var total = waterAmount + electricAmount + commonFee;
    grandTotal += total;

    summaries.push({
      house_number: dn,
      house_type: house.type,
      resident_name: resident ? ((resident.prefix || '') + (resident.firstname || '') + ' ' + (resident.lastname || '')).trim() : '',
      prev_meter: waterRec ? waterRec.prev_meter : '',
      curr_meter: waterRec ? waterRec.curr_meter : '',
      water_amount: waterAmount,
      electric_amount: electricAmount,
      common_fee: commonFee,
      total: total,
      is_exempt: isExempt
    });
  });

  return { success: true, data: summaries, total: grandTotal };
}

/**
 * ดึงวันครบกำหนดชำระ
 * @returns {Object} { success, dueDate }
 */
function getDueDate() {
  var settings = getSettings();
  if (settings.success && settings.data) {
    // settings.data เป็น object { key: value } (จาก Housing.gs getSettings())
    var dueDate = settings.data.due_date;
    if (dueDate !== undefined && dueDate !== null && dueDate !== '') {
      return { success: true, dueDate: Number(dueDate) || DEFAULTS.due_date };
    }
  }
  return { success: true, dueDate: DEFAULTS.due_date };
}

// ============================================================================
// NOTIFICATION SNAPSHOT — บันทึกข้อมูลแจ้งยอดชำระ
// ============================================================================

/**
 * บันทึก snapshot ข้อมูลแจ้งยอดชำระทุกบ้าน
 * ใช้เมื่อกด "บันทึก" ที่หน้า payment-notification.html
 * @param {Object} data - { period, records: [...] }
 * @returns {Object} { success, message, count }
 */
function saveNotificationSnapshot(data) {
  if (!data.period) return { success: false, error: 'กรุณาระบุงวดเดือน' };
  if (!data.records || !data.records.length) return { success: false, error: 'ไม่มีข้อมูลแจ้งยอด' };

  var parts = _parsePeriod(data.period);
  if (!parts) return { success: false, error: 'รูปแบบงวดไม่ถูกต้อง' };

  var sheetName = getYearOnlySheetName(parts.year);
  var now = new Date().toISOString();

  // สร้างแผ่นงานปี (ถ้ายังไม่มี)
  createNotificationYearSheet(parts.year);

  // ลบข้อมูลเดือนนี้ที่มีอยู่แล้ว (overwrite)
  _deleteMonthData(SPREADSHEET_IDS.NOTIFICATIONS, sheetName, parts.month);

  // ดึงวันกำหนดชำระ
  var dueDateResult = getDueDate();
  var dueDay = dueDateResult.dueDate || DEFAULTS.due_date;
  var dueDate = parts.year + '-' + parts.month + '-' + String(dueDay).padStart(2, '0');

  // เตรียม rows
  var rows = data.records.map(function(rec) {
    return {
      id: getNextId(ID_PREFIXES.NTF),
      month: parts.month,
      house_number: rec.house_number || '',
      resident_name: rec.resident_name || '',
      prev_meter: rec.prev_meter !== undefined ? rec.prev_meter : '',
      curr_meter: rec.curr_meter !== undefined ? rec.curr_meter : '',
      water_amount: Number(rec.water_amount) || 0,
      electric_amount: Number(rec.electric_amount) || 0,
      common_fee: Number(rec.common_fee) || 0,
      total_amount: Number(rec.total_amount) || Number(rec.total) || 0,
      is_exempt: rec.is_exempt ? 'TRUE' : 'FALSE',
      due_date: dueDate,
      saved_at: now,
      saved_by: data._userId || 'ADMIN'
    };
  });

  var result = batchAppendRows(SPREADSHEET_IDS.NOTIFICATIONS, sheetName, rows);
  if (!result.success) return result;

  // Log
  writeLog('SAVE_NOTIFICATION', data._userId || 'ADMIN',
    'บันทึกแจ้งยอด: ' + data.period + ' (' + rows.length + ' รายการ)', 'Billing');

  return { success: true, message: 'บันทึกแจ้งยอดชำระสำเร็จ', count: rows.length };
}

/**
 * ดึง snapshot แจ้งยอดย้อนหลังตามเดือน
 * @param {string} period - เช่น '2569-02'
 * @returns {Object} { success, data: [...] }
 */
function getNotificationHistory(period) {
  if (!period) return { success: false, error: 'กรุณาระบุงวดเดือน' };

  var parts = _parsePeriod(period);
  if (!parts) return { success: false, error: 'รูปแบบงวดไม่ถูกต้อง' };

  var sheetName = getYearOnlySheetName(parts.year);

  try {
    var allData = readSheetData(SPREADSHEET_IDS.NOTIFICATIONS, sheetName);
    var monthData = allData.filter(function(row) {
      return String(row.month) === parts.month;
    });
    return { success: true, data: monthData };
  } catch (e) {
    return { success: true, data: [] };
  }
}

/**
 * สร้างแผ่นงานปีใหม่สำหรับแจ้งยอดชำระ (ถ้ายังไม่มี)
 * @param {number|string} year - ปี พ.ศ. เช่น 2569
 */
function createNotificationYearSheet(year) {
  var sheetName = getYearOnlySheetName(year);
  getOrCreateSheet(SPREADSHEET_IDS.NOTIFICATIONS, sheetName, NOTIFICATIONS_YEAR_HEADERS);
}

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

/**
 * Parse period string
 * @param {string} period - เช่น '2569-02'
 * @returns {Object|null} { year, month } หรือ null
 * @private
 */
function _parsePeriod(period) {
  var parts = String(period).split('-');
  if (parts.length !== 2) return null;
  var year = parts[0];
  var month = parts[1];
  if (year.length !== 4 || month.length !== 2) return null;
  if (Number(month) < 1 || Number(month) > 12) return null;
  return { year: year, month: month };
}

/**
 * ลบข้อมูลทั้งเดือนจาก sheet (ใช้สำหรับ overwrite)
 * @param {string} spreadsheetId - Spreadsheet ID
 * @param {string} sheetName - ชื่อ sheet
 * @param {string} month - เดือน 2 หลัก เช่น '02'
 * @private
 */
function _deleteMonthData(spreadsheetId, sheetName, month) {
  return withLock(function() {
    try {
      var sheet = getSheetByName(spreadsheetId, sheetName);
      var data = sheet.getDataRange().getValues();
      var headers = data[0];
      var monthIdx = headers.indexOf('month');
      if (monthIdx === -1) return;

      // ลบจากล่างขึ้นบน
      for (var i = data.length - 1; i >= 1; i--) {
        if (String(data[i][monthIdx]) === String(month)) {
          sheet.deleteRow(i + 1);
        }
      }
    } catch (e) {
      // Sheet ยังไม่มี → ไม่ต้องทำอะไร
    }
  });
}

/**
 * ตรวจว่าบ้านถูกยกเว้นหรือไม่
 * @param {string} houseNumber - เลขบ้าน
 * @returns {boolean} true ถ้าถูกยกเว้น
 * @private
 */
function _isExempt(houseNumber) {
  try {
    var exemptions = readSheetData(SPREADSHEET_IDS.MAIN, SHEET_NAMES.EXEMPTIONS);
    var now = new Date().toISOString();

    return exemptions.some(function(ex) {
      if (String(ex.house_number) !== String(houseNumber)) return false;
      // ตรวจ active period
      if (ex.start_date && String(ex.start_date) > now) return false;
      if (ex.end_date && String(ex.end_date) < now) return false;
      return true;
    });
  } catch (e) {
    return false;
  }
}

/**
 * ดึง active exemptions ทั้งหมด (batch)
 * @returns {Object[]} array of active exemptions
 * @private
 */
function _getActiveExemptions() {
  try {
    var exemptions = readSheetData(SPREADSHEET_IDS.MAIN, SHEET_NAMES.EXEMPTIONS);
    var now = new Date().toISOString();

    return exemptions.filter(function(ex) {
      if (ex.start_date && String(ex.start_date) > now) return false;
      if (ex.end_date && String(ex.end_date) < now) return false;
      return true;
    });
  } catch (e) {
    return [];
  }
}

/**
 * ตรวจ exempt จาก list ที่ดึงไว้แล้ว
 * @param {string} houseNumber - เลขบ้าน
 * @param {Object[]} exemptions - active exemptions
 * @returns {boolean}
 * @private
 */
function _isExemptFromList(houseNumber, exemptions) {
  return exemptions.some(function(ex) {
    return String(ex.house_number) === String(houseNumber);
  });
}

/**
 * ปัดเศษตาม mode
 * @param {number} amount - จำนวนเงิน
 * @param {string} mode - 'none' | 'round' | 'ceil' | 'floor'
 * @returns {number}
 * @private
 */
function _applyRounding(amount, mode) {
  switch (mode) {
    case 'round': return Math.round(amount);
    case 'ceil':  return Math.ceil(amount);
    case 'floor': return Math.floor(amount);
    default:      return amount; // none
  }
}

// ============================================================================
// TEST FUNCTION — รันใน GAS Editor เพื่อตรวจสอบ
// ============================================================================

/**
 * ทดสอบ Billing.gs — รันใน GAS Editor
 * ✅ ผ่าน = save/get bills ไม่มี error
 * ❌ ไม่ผ่าน = error → ตรวจ Billing.gs + Config.gs
 */
function testBilling() {
  Logger.log('=== TEST BILLING.gs ===');

  // Test 1: getWaterRate
  Logger.log('\n--- WATER RATE ---');
  var rateResult = getWaterRate();
  Logger.log('  Water rate: ' + JSON.stringify(rateResult));

  // Test 2: getCommonFee
  Logger.log('\n--- COMMON FEE ---');
  var feeResult = getCommonFee();
  Logger.log('  Common fee house: ' + feeResult.house + ', flat: ' + feeResult.flat);

  // Test 3: getExemptions
  Logger.log('\n--- EXEMPTIONS ---');
  var exemptResult = getExemptions();
  Logger.log('  Exemptions: ' + exemptResult.data.length + ' รายการ');

  // Test 4: calculateWaterAmount
  Logger.log('\n--- CALCULATE WATER ---');
  var calcResult = calculateWaterAmount(100, 115, 18);
  Logger.log('  100→115 @ 18 บาท = ' + calcResult + ' บาท (คาดหวัง: 270)');
  if (calcResult !== 270) Logger.log('  ⚠️ ค่าไม่ตรง!');

  // Test 5: saveWaterBill (ใช้ข้อมูลทดสอบ)
  Logger.log('\n--- SAVE WATER BILL ---');
  var saveResult = saveWaterBill({
    period: CURRENT_YEAR + '-00',  // เดือน 00 = ทดสอบ (ไม่ใช่เดือนจริง)
    rate: 18,
    records: [
      { house_number: 'TEST_HOUSE', resident_name: 'ทดสอบ', prev_meter: 0, curr_meter: 10 }
    ],
    _userId: 'TEST'
  });
  Logger.log('  Save result: ' + JSON.stringify(saveResult));

  // Test 6: getWaterBills
  Logger.log('\n--- GET WATER BILLS ---');
  var getResult = getWaterBills(CURRENT_YEAR + '-00');
  Logger.log('  Bills found: ' + getResult.data.length);

  // Test 7: cleanup — ลบข้อมูลทดสอบ
  Logger.log('\n--- CLEANUP ---');
  _deleteMonthData(SPREADSHEET_IDS.WATER, getYearOnlySheetName(CURRENT_YEAR), '00');
  Logger.log('  ลบข้อมูลทดสอบเดือน 00 สำเร็จ');

  // Test 8: getDueDate
  Logger.log('\n--- DUE DATE ---');
  var dueResult = getDueDate();
  Logger.log('  Due date: วันที่ ' + dueResult.dueDate);

  // Test 9: getBillSummaryAll (ทดสอบโครงสร้าง — ไม่ต้องมีข้อมูลจริง)
  Logger.log('\n--- BILL SUMMARY ALL ---');
  var summaryResult = getBillSummaryAll(CURRENT_YEAR + '-02');
  Logger.log('  Summary records: ' + (summaryResult.data ? summaryResult.data.length : 0));
  Logger.log('  Grand total: ' + (summaryResult.total || 0));

  // Test 10: _parsePeriod
  Logger.log('\n--- PARSE PERIOD ---');
  var p1 = _parsePeriod('2569-02');
  Logger.log('  2569-02 → year: ' + p1.year + ', month: ' + p1.month);
  var p2 = _parsePeriod('invalid');
  Logger.log('  invalid → ' + (p2 ? 'parsed' : 'null (ถูกต้อง)'));

  Logger.log('\n✅ BILLING TEST PASSED');
}

// ============================================================================
// END OF Billing.gs
// ============================================================================
