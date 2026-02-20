/**
 * ============================================================================
 * HOME PPK 2026 - Config.gs — ⚙️ ศูนย์กลางค่าตั้ง
 * ============================================================================
 * เก็บ ID, ค่าคงที่ และค่าเริ่มต้นทั้งหมดไว้ที่เดียว
 * ทุกไฟล์ .gs อ้างอิงค่าจากไฟล์นี้
 * เวลาย้าย/เปลี่ยน Sheet/Folder → แก้แค่ไฟล์นี้
 * 
 * Version: 1.0
 * วันที่สร้าง: 17 กุมภาพันธ์ 2569
 * Step: 16 (ระยะที่ 2)
 * ============================================================================
 * 
 * IDs ทั้งหมดมาจากรายงาน setup_report (รัน setupAll() เมื่อ 17 ก.พ. 2569)
 * 
 * ============================================================================
 */

// ============================================================================
// FOLDER IDs — 25 โฟลเดอร์
// ============================================================================

const FOLDER_IDS = {
  // ── โฟลเดอร์หลัก ──
  ROOT:                 '1SXKp_IoghVjemM5PtOimHRY-XvgX-O8l',
  DATA:                 '1PaizJ3ykCFCAEQep1Df1wGTKUYhK7_mw',
  SLIPS:                '1dvOTXTqFv38UH4Oirt41AmLi11dZ7HNG',
  REQUEST_ATTACHMENTS:  '154nAS8Ssw223YvUKWMkxVG5jP592WFYf',
  ACCOUNTING_RECEIPTS:  '1iycNHSfceR9aSOIotc3UbXbTNntpBc66',
  DOCUMENTS:            '18kp2jGnO-fNw0rKdJEAEnmxYjCwf029A',
  BACKUPS:              '1TwqBZkzAS65T3vVSLE6sOfD6YTa4PHP1',
  SCRIPTS:              '1tSN73KZRlZV5uM3_RsI3nsE2gwLypeeJ',

  // ── โฟลเดอร์ประเภทคำร้อง (ภายใน RequestAttachments) ──
  RESIDENCE_REQ:        '1F5mleAj-DF3zk3-K5fXoop_rHYNcLd73',
  TRANSFER_REQ:         '141e9DtEeuUtVTTN-j8xwmtVH9KjjMTlU',
  RETURN_REQ:           '1NEPgLDNe1DIa94QotTmMdW_nbD6Cin99',
  REPAIR_REQ:           '11VG5-Al5lmcfbPtJ6CZ8AeMNtHolJvHU'
};

// ============================================================================
// SLIP YEAR/MONTH FOLDER IDs — สลิป ปี/เดือน
// ============================================================================

const SLIP_FOLDERS = {
  '2569': {
    ROOT: '15xzaAL5TwX9Lu-fG7NEeQHPIC9V-QAdV',
    MONTHS: {
      '01': '1cNZwGrw2NalSjItrv_wiF56wHWXhAl8X',   // มกราคม
      '02': '1Or9o6_M5kwFMNx4fmR30pkBp-RicSF40',   // กุมภาพันธ์
      '03': '1B2R4y4INZvmsDx7bjhosoUWkykqadr8S',   // มีนาคม
      '04': '1ewZH3ZbRP9uWl3qSz3NljwphdexM-nHA',   // เมษายน
      '05': '1jCz1HXuTsqmntf1F0gyUQYk4OzSjhUh_',   // พฤษภาคม
      '06': '1FyNXO7UijJ1YALP8R4LYKRNVc8C2-XaL',   // มิถุนายน
      '07': '1cJV5Bp_Hkb3mxloqTvNx7b6EqK36Ee_7',   // กรกฎาคม
      '08': '13ZK2Me4Q7ChMTxILdmjJiFU7gn6ncdgG',   // สิงหาคม
      '09': '1nMH3KSovbXXX2pvQFkd9hYy_pMHwn24D',   // กันยายน
      '10': '1WfwMQAz4A9qtpaa6o-tdrpC1WW7QFm6w',   // ตุลาคม
      '11': '1jf_IkNs82kWrR4yf3c3zrxtR4FLNWqaz',   // พฤศจิกายน
      '12': '1er_tvG_IIJ0KbIRvz_zUAaVxSIs_cGSp'    // ธันวาคม
    }
  }
};

// ============================================================================
// SPREADSHEET IDs — 8 ไฟล์
// ============================================================================

const SPREADSHEET_IDS = {
  MAIN:          '1dd3A0dLTWH-kS039jeKI5hW4J6YkMzYbL2lGFJ-OTLo',   // [MAIN] ฐานข้อมูลหลัก
  WATER:         '1Pts3g9ERLoHx38RX_HIw1rSN09LolBG6ajBg2-ggMJ0',   // [WATER] ค่าน้ำ
  ELECTRIC:      '1U-TftIkFye9UUzl5vTsNdHloownuJAHbZeOTw_PQ-tA',   // [ELECTRIC] ค่าไฟ
  NOTIFICATIONS: '16ffpM7mm8t7sWNpQa-B0pOCvtlHEje8yDx8p5EVr6Kc',   // [NOTIFICATIONS] แจ้งยอดชำระ
  PAYMENTS:      '1r-KKoMQzOBs31nHprcQRjdRdqyfMruCKqweZeNLN4As',   // [PAYMENTS] การชำระเงิน
  REQUESTS:      '1C8ZbAedKCs31iLbnGBzshN9iZN-N7ZfOrT8W2PjQb2I',   // [REQUESTS] คำร้อง
  ACCOUNTING:    '1oRUwt9qo0pF8nEV-j6Mry_10Rq1tcamqZ18R17ZCf5c',   // [ACCOUNTING] บัญชี
  WITHDRAW:      '1gMMI2ulRo935Yz3KRN9CkTm_oSXqO9mXlKbhMuW1GhI'   // [WITHDRAW] สรุปเบิกจ่าย
};

// ============================================================================
// SHEET NAMES — ชื่อแผ่นงาน
// ============================================================================

const SHEET_NAMES = {
  // ── MAIN (10 แผ่นงานตายตัว + PendingReg_{ปี}) ──
  HOUSING:       'Housing',
  RESIDENTS:     'Residents',
  USERS:         'Users',
  PERMISSIONS:   'Permissions',
  SETTINGS:      'Settings',
  ANNOUNCEMENTS: 'Announcements',
  LOGS:          'Logs',
  WATER_RATES:   'WaterRates',
  COMMON_FEE:    'CommonFee',
  EXEMPTIONS:    'Exemptions',

  // ── PAYMENTS (1 ตายตัว + 2 ตามปี) ──
  OUTSTANDING:   'Outstanding',

  // ── REQUESTS (1 ตายตัว + 4 ตามปี) ──
  QUEUE:         'Queue'
};

/**
 * สร้างชื่อ sheet ตามปี
 * @param {string} prefix - เช่น 'PendingReg', 'SlipSubmissions', 'Residence'
 * @param {number|string} year - ปี พ.ศ. เช่น 2569
 * @returns {string} เช่น 'PendingReg_2569'
 */
function getYearSheetName(prefix, year) {
  return `${prefix}_${year}`;
}

/**
 * สร้างชื่อ sheet ปีเดียว (WATER, ELECTRIC, NOTIFICATIONS, ACCOUNTING, WITHDRAW)
 * @param {number|string} year - ปี พ.ศ. เช่น 2569
 * @returns {string} เช่น '2569'
 */
function getYearOnlySheetName(year) {
  return String(year);
}

// ============================================================================
// ปี พ.ศ. ปัจจุบัน
// ============================================================================

const CURRENT_YEAR = 2569;

// ============================================================================
// THAI MONTHS — ชื่อเดือนไทย
// ============================================================================

const THAI_MONTHS = [
  '01-มกราคม', '02-กุมภาพันธ์', '03-มีนาคม', '04-เมษายน',
  '05-พฤษภาคม', '06-มิถุนายน', '07-กรกฎาคม', '08-สิงหาคม',
  '09-กันยายน', '10-ตุลาคม', '11-พฤศจิกายน', '12-ธันวาคม'
];

const THAI_MONTH_NAMES = {
  '01': 'มกราคม',    '02': 'กุมภาพันธ์',  '03': 'มีนาคม',     '04': 'เมษายน',
  '05': 'พฤษภาคม',   '06': 'มิถุนายน',    '07': 'กรกฎาคม',    '08': 'สิงหาคม',
  '09': 'กันยายน',   '10': 'ตุลาคม',      '11': 'พฤศจิกายน',  '12': 'ธันวาคม'
};

// ============================================================================
// DEFAULTS — ค่าเริ่มต้น (sync กับ setup.gs DEFAULT_SETTINGS 46 รายการ)
// ============================================================================

const DEFAULTS = {
  // ── กลุ่ม 1: ค่าพื้นฐาน ──
  org_name:            'งานส่งเสริม กำกับ ดูแล และพัฒนาบ้านพักครู',
  school_name:         'โรงเรียนพะเยาพิทยาคม',
  water_rate:          '',          // ⚠️ กำหนดโดยแอดมินที่ admin-settings.html แท็บ Water
  common_fee_house:    110,
  common_fee_flat:     110,
  garbage_fee:         310,
  due_date:            15,
  reminder_days:       5,
  house_prefix:        'บ้าน',
  flat_prefix:         'แฟลต',

  // ── กลุ่ม 2: ค่าไฟ ──
  electric_method:     'bill',      // bill (ตามบิล) / unit (ตามหน่วย)
  electric_rate:       '',          // ⚠️ กำหนดโดยแอดมิน ใช้เมื่อ method=unit
  electric_min_charge: 0,
  electric_rounding:   'ceil',      // none/round/ceil/floor

  // ── กลุ่ม 3: ค่าน้ำเพิ่มเติม ──
  water_min_charge:    0,
  water_rounding:      'none',      // none/round/ceil/floor

  // ── กลุ่ม 4: รูปแบบเลขที่ ──
  house_number_format: '{prefix} {number}',
  flat_number_format:  '{prefix} {number}',

  // ── กลุ่ม 5: ระบบ ──
  require_login:         'true',
  allow_reset_password:  'true',
  allow_registration:    'true',
  queue_expiry_days:     180
};

// ============================================================================
// ID PREFIXES — คำนำหน้า ID อัตโนมัติ
// ============================================================================

const ID_PREFIXES = {
  HOU: 'HOU',    // Housing (บ้านพัก)
  RES: 'RES',    // Residents (ผู้พักอาศัย)
  USR: 'USR',    // Users (บัญชีผู้ใช้)
  WTR: 'WTR',    // Water (ค่าน้ำ)
  ELC: 'ELC',    // Electric (ค่าไฟ)
  SLP: 'SLP',    // Slip Submissions (สลิป)
  PAY: 'PAY',    // Payment History (ประวัติชำระ)
  REQ: 'REQ',    // Residence Requests (คำร้องเข้าพัก)
  TRF: 'TRF',    // Transfer Requests (คำร้องย้าย)
  RTN: 'RTN',    // Return Requests (คำร้องคืน)
  RPR: 'RPR',    // Repair Requests (คำร้องซ่อม)
  QUE: 'QUE',    // Queue (คิว)
  INC: 'INC',    // Income (รายรับ)
  EXP: 'EXP',    // Expense (รายจ่าย)
  WTD: 'WTD',    // Withdraw (เบิกจ่าย)
  ANN: 'ANN',    // Announcements (ประกาศ)
  LOG: 'LOG',    // Logs (บันทึกกิจกรรม)
  RAT: 'RAT',    // WaterRates (อัตราค่าน้ำ)
  CMF: 'CMF',    // CommonFee (ค่าส่วนกลาง)
  EXM: 'EXM',    // Exemptions (การยกเว้น)
  OUT: 'OUT',    // Outstanding (ค้างชำระ)
  ACT: 'ACT',    // Accounting (บัญชี)
  NTF: 'NTF',    // Notifications (แจ้งยอดชำระ)
  REG: 'REG'     // PendingReg (สมัครสมาชิกรอดำเนินการ)
};

// ============================================================================
// DRIVE URLs — ลิงก์สำหรับเปิดตรง (optional)
// ============================================================================

const DRIVE_URLS = {
  ROOT_FOLDER:  'https://drive.google.com/drive/folders/1SXKp_IoghVjemM5PtOimHRY-XvgX-O8l',
  MAIN_SHEET:   'https://docs.google.com/spreadsheets/d/1dd3A0dLTWH-kS039jeKI5hW4J6YkMzYbL2lGFJ-OTLo/edit',
  WATER_SHEET:  'https://docs.google.com/spreadsheets/d/1Pts3g9ERLoHx38RX_HIw1rSN09LolBG6ajBg2-ggMJ0/edit',
  ELECTRIC_SHEET:      'https://docs.google.com/spreadsheets/d/1U-TftIkFye9UUzl5vTsNdHloownuJAHbZeOTw_PQ-tA/edit',
  NOTIFICATIONS_SHEET: 'https://docs.google.com/spreadsheets/d/16ffpM7mm8t7sWNpQa-B0pOCvtlHEje8yDx8p5EVr6Kc/edit',
  PAYMENTS_SHEET:      'https://docs.google.com/spreadsheets/d/1r-KKoMQzOBs31nHprcQRjdRdqyfMruCKqweZeNLN4As/edit',
  REQUESTS_SHEET:      'https://docs.google.com/spreadsheets/d/1C8ZbAedKCs31iLbnGBzshN9iZN-N7ZfOrT8W2PjQb2I/edit',
  ACCOUNTING_SHEET:    'https://docs.google.com/spreadsheets/d/1oRUwt9qo0pF8nEV-j6Mry_10Rq1tcamqZ18R17ZCf5c/edit',
  WITHDRAW_SHEET:      'https://docs.google.com/spreadsheets/d/1gMMI2ulRo935Yz3KRN9CkTm_oSXqO9mXlKbhMuW1GhI/edit'
};

// ============================================================================
// HELPER — ดึง Folder ID สำหรับสลิปตามเดือน
// ============================================================================

/**
 * ดึง folder ID สำหรับสลิปของเดือนที่ระบุ
 * @param {string} period - เช่น '2569-02', '2569-03'
 * @returns {string|null} folder ID หรือ null ถ้าไม่มี
 */
function getSlipFolderId(period) {
  const parts = period.split('-');
  if (parts.length !== 2) return null;

  const year = parts[0];
  const month = parts[1]; // '01', '02', ...

  if (SLIP_FOLDERS[year] && SLIP_FOLDERS[year].MONTHS[month]) {
    return SLIP_FOLDERS[year].MONTHS[month];
  }
  return null;
}

/**
 * ดึง folder ID สำหรับสลิปปี
 * @param {string|number} year - ปี พ.ศ. เช่น 2569
 * @returns {string|null} folder ID หรือ null ถ้าไม่มี
 */
function getSlipYearFolderId(year) {
  const y = String(year);
  if (SLIP_FOLDERS[y]) {
    return SLIP_FOLDERS[y].ROOT;
  }
  return null;
}

/**
 * ดึง folder ID สำหรับเอกสารแนบคำร้องตามประเภท
 * @param {string} requestType - 'residence' | 'transfer' | 'return' | 'repair'
 * @returns {string|null} folder ID หรือ null
 */
function getRequestFolderId(requestType) {
  const map = {
    'residence': FOLDER_IDS.RESIDENCE_REQ,
    'transfer':  FOLDER_IDS.TRANSFER_REQ,
    'return':    FOLDER_IDS.RETURN_REQ,
    'repair':    FOLDER_IDS.REPAIR_REQ
  };
  return map[requestType] || null;
}

// ============================================================================
// TEST FUNCTION — รันใน GAS Editor เพื่อตรวจสอบ
// ============================================================================

/**
 * ทดสอบ Config.gs — รันใน GAS Editor
 * ✅ ผ่าน = Log แสดงค่าครบ ไม่มี null/undefined
 * ❌ ไม่ผ่าน = มี null/undefined → ตรวจ Config.gs
 */
function testConfig() {
  Logger.log('=== TEST CONFIG.gs ===');

  // Test 1: FOLDER_IDS ครบ
  Logger.log('\n--- FOLDER_IDS ---');
  const requiredFolders = [
    'ROOT', 'DATA', 'SLIPS', 'REQUEST_ATTACHMENTS',
    'RESIDENCE_REQ', 'TRANSFER_REQ', 'RETURN_REQ', 'REPAIR_REQ',
    'ACCOUNTING_RECEIPTS', 'DOCUMENTS', 'BACKUPS'
  ];
  requiredFolders.forEach(key => {
    const val = FOLDER_IDS[key];
    Logger.log(`  ${key}: ${val || '❌ MISSING'}`);
    if (!val) throw new Error(`FOLDER_IDS.${key} is missing!`);
  });

  // Test 2: SPREADSHEET_IDS ครบ
  Logger.log('\n--- SPREADSHEET_IDS ---');
  const requiredSheets = [
    'MAIN', 'WATER', 'ELECTRIC', 'PAYMENTS',
    'REQUESTS', 'ACCOUNTING', 'WITHDRAW', 'NOTIFICATIONS'
  ];
  requiredSheets.forEach(key => {
    const val = SPREADSHEET_IDS[key];
    Logger.log(`  ${key}: ${val || '❌ MISSING'}`);
    if (!val) throw new Error(`SPREADSHEET_IDS.${key} is missing!`);
  });

  // Test 3: DEFAULTS ครบ
  Logger.log('\n--- DEFAULTS ---');
  const requiredDefaults = [
    'common_fee_house', 'common_fee_flat',
    'due_date', 'reminder_days', 'house_prefix', 'flat_prefix', 'garbage_fee'
  ];
  requiredDefaults.forEach(key => {
    const val = DEFAULTS[key];
    Logger.log(`  ${key}: ${val}`);
    if (val === undefined) throw new Error(`DEFAULTS.${key} is missing!`);
  });

  // Test 4: water_rate ต้องเป็นค่าว่าง (กำหนดโดยแอดมิน)
  Logger.log(`\n  water_rate: '${DEFAULTS.water_rate}' (ว่าง = ถูกต้อง, รอแอดมินกำหนด)`);

  // Test 5: ID_PREFIXES ครบ
  Logger.log('\n--- ID_PREFIXES ---');
  Logger.log(`  จำนวน prefix: ${Object.keys(ID_PREFIXES).length}`);
  Logger.log(`  prefixes: ${Object.keys(ID_PREFIXES).join(', ')}`);
  if (Object.keys(ID_PREFIXES).length < 20) {
    throw new Error('ID_PREFIXES ไม่ครบ! ต้องมีอย่างน้อย 20 prefix');
  }

  // Test 6: SLIP_FOLDERS ครบ 12 เดือน
  Logger.log('\n--- SLIP_FOLDERS ---');
  const year2569 = SLIP_FOLDERS['2569'];
  if (!year2569) throw new Error('SLIP_FOLDERS.2569 is missing!');
  Logger.log(`  Year 2569 ROOT: ${year2569.ROOT}`);
  for (let m = 1; m <= 12; m++) {
    const mm = String(m).padStart(2, '0');
    const val = year2569.MONTHS[mm];
    Logger.log(`  ${mm}: ${val || '❌ MISSING'}`);
    if (!val) throw new Error(`SLIP_FOLDERS.2569.MONTHS.${mm} is missing!`);
  }

  // Test 7: Helper functions
  Logger.log('\n--- HELPER FUNCTIONS ---');
  const testSlipFolder = getSlipFolderId('2569-02');
  Logger.log(`  getSlipFolderId('2569-02'): ${testSlipFolder}`);
  if (!testSlipFolder) throw new Error('getSlipFolderId failed!');

  const testReqFolder = getRequestFolderId('residence');
  Logger.log(`  getRequestFolderId('residence'): ${testReqFolder}`);
  if (!testReqFolder) throw new Error('getRequestFolderId failed!');

  Logger.log('\n✅ CONFIG TEST PASSED — ค่าครบทุกรายการ');
}

// ============================================================================
// END OF CONFIG.gs
// ============================================================================
