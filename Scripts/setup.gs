/**
 * ============================================================================
 * HOME PPK 2026 - Setup Script
 * ============================================================================
 * สคริปต์สำหรับสร้างโครงสร้างโฟลเดอร์ ไฟล์ Google Sheets และคอลัมน์
 * Version: 2.0
 * วันที่สร้าง: 15 กุมภาพันธ์ 2569
 * อัปเดตล่าสุด: 17 กุมภาพันธ์ 2569
 * ============================================================================
 * 
 * ⚠️ สิ่งที่แก้ไข (v2.0):
 *   - S0-1: ลบฟังก์ชันซ้ำ 14 ตัว (doGet, doPost, readSheetData, CRUD, handlers)
 *           เหลือแค่ setup helpers เท่านั้น
 *   - S0-2: เปลี่ยนโครงสร้าง SCHEMAS + SPREADSHEET_FILES
 *           จาก 5 ไฟล์ → 8 ไฟล์ (แยก WATER/ELECTRIC/WITHDRAW/NOTIFICATIONS)
 *           ย้าย WaterRates/CommonFee/Exemptions → MAIN
 *           เพิ่ม PendingReg_{ปี}, แผ่นงานตามปี
 *           เพิ่มโฟลเดอร์ AccountingReceipts
 *   - S0-8: เพิ่ม DEFAULT_SETTINGS จาก 9 → 46 รายการ (ตรงตาม แก้ไขตามนี้โดยด่วน.md §2)
 *   - แก้ไขคอลัมน์ทุก schema ให้ตรงกับ เทมเพลตโฟลเดอร์และชีท.md
 * 
 * ============================================================================
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // ← ID โฟลเดอร์ราก (ROOT) ที่มีอยู่แล้วใน Google Drive
  // จาก: https://drive.google.com/drive/folders/1SXKp_IoghVjemM5PtOimHRY-XvgX-O8l
  ROOT_FOLDER_ID: '1SXKp_IoghVjemM5PtOimHRY-XvgX-O8l',

  // ชื่อโฟลเดอร์หลัก (ใช้แค่ในรายงาน ไม่สร้างใหม่)
  ROOT_FOLDER_NAME: 'HOME PPK 2026',

  // ปี พ.ศ. เริ่มต้น
  START_YEAR: 2569,

  // ชื่อเดือนภาษาไทย
  THAI_MONTHS: [
    '01-มกราคม', '02-กุมภาพันธ์', '03-มีนาคม', '04-เมษายน',
    '05-พฤษภาคม', '06-มิถุนายน', '07-กรกฎาคม', '08-สิงหาคม',
    '09-กันยายน', '10-ตุลาคม', '11-พฤศจิกายน', '12-ธันวาคม'
  ],

  // Default Settings (46 รายการ) — sync กับ admin-settings.html + แก้ไขตามนี้โดยด่วน.md §2
  DEFAULT_SETTINGS: [
    // ── กลุ่ม 1: ค่าพื้นฐาน ──
    { key: 'org_name',           value: 'งานส่งเสริม กำกับ ดูแล และพัฒนาบ้านพักครู', description: 'ชื่อหน่วยงาน' },
    { key: 'school_name',        value: 'โรงเรียนพะเยาพิทยาคม',                     description: 'ชื่อโรงเรียน' },
    { key: 'admin_email',        value: '',    description: 'อีเมลผู้ดูแลระบบ' },
    { key: 'admin_phone',        value: '',    description: 'เบอร์โทรผู้ดูแลระบบ' },
    { key: 'water_rate',         value: '',    description: 'อัตราค่าน้ำ (บาท/หน่วย) — ⚠️ กำหนดโดยแอดมินเท่านั้น ต้องตั้งค่าก่อนใช้งาน' },
    { key: 'common_fee_house',   value: '110', description: 'ค่าส่วนกลางบ้านพัก (บาท/เดือน)' },
    { key: 'common_fee_flat',    value: '110', description: 'ค่าส่วนกลางแฟลต (บาท/เดือน)' },
    { key: 'garbage_fee',        value: '310', description: 'ค่าขยะ (บาท/เดือน)' },
    { key: 'due_date',           value: '15',  description: 'วันกำหนดชำระ (วันที่ของเดือน)' },
    { key: 'reminder_days',      value: '5',   description: 'จำนวนวันก่อนครบกำหนดที่ส่งเตือน' },
    { key: 'house_prefix',       value: 'บ้าน',   description: 'คำนำหน้าบ้าน' },
    { key: 'flat_prefix',        value: 'แฟลต',   description: 'คำนำหน้าแฟลต' },
    // ── กลุ่ม 2: ค่าไฟ ──
    { key: 'electric_method',    value: 'bill', description: 'วิธีบันทึกค่าไฟ: bill (ตามบิล) / unit (ตามหน่วย)' },
    { key: 'electric_rate',      value: '',     description: 'อัตราค่าไฟ (บาท/หน่วย) — ⚠️ กำหนดโดยแอดมิน ใช้เมื่อ electric_method=unit เท่านั้น (method=bill ไม่ต้องตั้ง)' },
    { key: 'electric_min_charge', value: '0',   description: 'ค่าไฟขั้นต่ำ (บาท) — 0 = ไม่มีขั้นต่ำ' },
    { key: 'electric_rounding',  value: 'ceil', description: 'การปัดเศษค่าไฟ: none/round/ceil/floor' },
    // ── กลุ่ม 3: ค่าน้ำเพิ่มเติม ──
    { key: 'water_min_charge',   value: '0',    description: 'ค่าน้ำขั้นต่ำ (บาท) — 0 = ไม่มีขั้นต่ำ' },
    { key: 'water_rounding',     value: 'none', description: 'การปัดเศษค่าน้ำ: none/round/ceil/floor' },
    // ── กลุ่ม 4: รูปแบบเลขที่ ──
    { key: 'house_number_format', value: '{prefix} {number}', description: 'รูปแบบเลขบ้านพัก' },
    { key: 'flat_number_format',  value: '{prefix} {number}', description: 'รูปแบบเลขแฟลต' },
    // ── กลุ่ม 5: ระบบ ──
    { key: 'require_login',        value: 'true',  description: 'บังคับเข้าสู่ระบบ: true/false' },
    { key: 'allow_reset_password', value: 'true',  description: 'อนุญาตรีเซ็ตรหัสผ่าน: true/false' },
    { key: 'allow_registration',   value: 'true',  description: 'เปิดรับสมัครสมาชิก: true/false' },
    { key: 'queue_expiry_days',    value: '180',   description: 'จำนวนวันหมดอายุคิว (ค่าเริ่มต้น 180 วัน)' },
    // ── กลุ่ม 6: เจ้าหน้าที่ลงนาม ──
    { key: 'meter_recorder',      value: '', description: 'ชื่อผู้บันทึกมิเตอร์' },
    { key: 'meter_checker',       value: '', description: 'ชื่อผู้ตรวจสอบมิเตอร์' },
    { key: 'head_of_promotion',   value: '', description: 'ชื่อหัวหน้างานส่งเสริมฯ' },
    { key: 'vice_director',       value: '', description: 'ชื่อรองผู้อำนวยการ' },
    { key: 'director',            value: '', description: 'ชื่อผู้อำนวยการ' },
    // ── กลุ่ม 7: อีเมล ──
    { key: 'email_sender',        value: '', description: 'ชื่อผู้ส่งอีเมล' },
    { key: 'email_signature',     value: '', description: 'ลายเซ็นท้ายอีเมล' },
    { key: 'email_reminder_note', value: '', description: 'ข้อความเพิ่มเติมในอีเมลแจ้งเตือน' },
    { key: 'email_receipt_note',  value: '', description: 'ข้อความเพิ่มเติมในอีเมลใบเสร็จ' },
    // ── กลุ่ม 8: Checkbox อีเมลแจ้งยอด (7 รายการ) ──
    { key: 'reminder_include_water',    value: 'true',  description: 'แสดงค่าน้ำในอีเมลแจ้งยอด' },
    { key: 'reminder_include_electric', value: 'true',  description: 'แสดงค่าไฟในอีเมลแจ้งยอด' },
    { key: 'reminder_include_common',   value: 'true',  description: 'แสดงค่าส่วนกลางในอีเมลแจ้งยอด' },
    { key: 'reminder_include_total',    value: 'true',  description: 'แสดงยอดรวมในอีเมลแจ้งยอด' },
    { key: 'reminder_include_due',      value: 'true',  description: 'แสดงวันครบกำหนดในอีเมลแจ้งยอด' },
    { key: 'reminder_include_meter',    value: 'true',  description: 'แสดงเลขมิเตอร์ในอีเมลแจ้งยอด' },
    { key: 'reminder_include_qr',       value: 'false', description: 'แสดง QR Code ในอีเมลแจ้งยอด' },
    // ── กลุ่ม 8: Checkbox อีเมลใบเสร็จ (6 รายการ) ──
    { key: 'receipt_include_water',    value: 'true', description: 'แสดงค่าน้ำในอีเมลใบเสร็จ' },
    { key: 'receipt_include_electric', value: 'true', description: 'แสดงค่าไฟในอีเมลใบเสร็จ' },
    { key: 'receipt_include_common',   value: 'true', description: 'แสดงค่าส่วนกลางในอีเมลใบเสร็จ' },
    { key: 'receipt_include_total',    value: 'true', description: 'แสดงยอดรวมในอีเมลใบเสร็จ' },
    { key: 'receipt_include_paid',     value: 'true', description: 'แสดงยอดที่ชำระในอีเมลใบเสร็จ' },
    { key: 'receipt_include_date',     value: 'true', description: 'แสดงวันที่ชำระในอีเมลใบเสร็จ' }
  ]
};

// ============================================================================
// SHEET SCHEMAS — ตรงกับ เทมเพลตโฟลเดอร์และชีท.md
// ============================================================================

const SCHEMAS = {

  // ===== [MAIN] ฐานข้อมูลหลัก (10 แผ่นงาน + PendingReg_{ปี}) =====
  MAIN: {
    // 1.1 Housing — ข้อมูลบ้านพัก
    Housing: [
      'id', 'type', 'number', 'display_number', 'zone',
      'status', 'note', 'created_at', 'updated_at'
    ],
    // 1.2 Residents — ผู้พักอาศัย
    Residents: [
      'id', 'resident_type', 'prefix', 'firstname', 'lastname',
      'position', 'subject_group', 'phone', 'email', 'house_number',
      'address_no', 'address_road', 'address_village', 'subdistrict', 'district',
      'province', 'zipcode', 'move_in_date', 'cohabitants', 'cohabitant_names',
      'profile_photo', 'status', 'created_at', 'updated_at'
    ],
    // 1.3 Users — บัญชีผู้ใช้
    Users: [
      'id', 'email', 'phone', 'password_hash', 'resident_id',
      'role', 'is_active', 'pdpa_consent', 'last_login', 'created_at'
    ],
    // 1.4 Permissions — สิทธิ์การจัดการ
    Permissions: [
      'user_id', 'water', 'electric', 'notify', 'slip',
      'withdraw', 'accounting', 'request', 'admin', 'updated_at', 'updated_by'
    ],
    // 1.5 Settings — ค่าตั้งระบบ
    Settings: [
      'key', 'value', 'description', 'updated_at', 'updated_by'
    ],
    // 1.6 Announcements — ประกาศ
    Announcements: [
      'id', 'text', 'priority', 'expiry_date', 'is_active',
      'created_by', 'created_at'
    ],
    // 1.7 Logs — บันทึกกิจกรรม
    Logs: [
      'id', 'timestamp', 'user_email', 'action', 'module',
      'details', 'ip_address'
    ],
    // 1.8 WaterRates — อัตราค่าน้ำ
    WaterRates: [
      'id', 'min_units', 'max_units', 'rate', 'effective_date',
      'created_at', 'created_by'
    ],
    // 1.9 CommonFee — ค่าส่วนกลาง
    CommonFee: [
      'id', 'type', 'amount', 'effective_date', 'created_at', 'created_by'
    ],
    // 1.10 Exemptions — การยกเว้น
    Exemptions: [
      'id', 'house_number', 'exemption_type', 'reason', 'start_date',
      'end_date', 'created_at', 'created_by'
    ]
  },

  // PendingReg_{ปี} — แยกออกเพราะชื่อ sheet เปลี่ยนตามปี
  PENDING_REG: [
    'id', 'email', 'phone', 'prefix', 'firstname',
    'lastname', 'position', 'address_no', 'address_road', 'address_village',
    'subdistrict', 'district', 'province', 'zipcode', 'password_hash',
    'pdpa_consent', 'status', 'reviewed_by', 'reviewed_at', 'review_note',
    'submitted_at'
  ],

  // ===== [WATER] ค่าน้ำ — แผ่นงานตามปี เช่น '2569' =====
  WATER_YEAR: [
    'id', 'month', 'house_number', 'resident_name',
    'prev_meter', 'curr_meter', 'units', 'rate', 'amount',
    'saved_at', 'saved_by'
  ],

  // ===== [ELECTRIC] ค่าไฟ — แผ่นงานตามปี เช่น '2569' =====
  ELECTRIC_YEAR: [
    'id', 'month', 'house_number', 'resident_name',
    'amount', 'pea_total', 'lost_house', 'lost_flat',
    'saved_at', 'saved_by'
  ],

  // ===== [NOTIFICATIONS] แจ้งยอดชำระ — แผ่นงานตามปี เช่น '2569' =====
  NOTIFICATIONS_YEAR: [
    'id', 'month', 'house_number', 'resident_name',
    'prev_meter', 'curr_meter', 'water_amount', 'electric_amount',
    'common_fee', 'total_amount', 'is_exempt', 'due_date',
    'saved_at', 'saved_by'
  ],

  // ===== [PAYMENTS] การชำระเงิน =====
  PAYMENTS: {
    // SlipSubmissions_{ปี}
    SlipSubmissions: [
      'id', 'month', 'house_number', 'resident_name',
      'email', 'notified_amount', 'paid_amount', 'slip_file_ids',
      'status', 'payment_method', 'is_manual', 'reviewed_by',
      'reviewed_at', 'review_note', 'submitted_at'
    ],
    // PaymentHistory_{ปี}
    PaymentHistory: [
      'id', 'month', 'house_number', 'resident_name',
      'water_amount', 'electric_amount', 'common_fee', 'total_amount',
      'paid_amount', 'payment_date', 'slip_id', 'status'
    ],
    // Outstanding (ตายตัว ไม่แยกปี)
    Outstanding: [
      'id', 'house_number', 'resident_name', 'year', 'month',
      'water_amount', 'electric_amount', 'common_fee', 'total_due',
      'paid_amount', 'balance', 'last_updated'
    ]
  },

  // ===== [REQUESTS] คำร้อง (sync กับ Request.gs HEADERS) =====
  REQUESTS: {
    // Residence_{ปี} — sync กับ RESIDENCE_REQUEST_HEADERS
    Residence: [
      'id', 'submitted_at', 'prefix', 'firstname', 'lastname',
      'phone', 'email', 'position', 'subject_group',
      'stay_type', 'reason', 'attachment_file_ids',
      'status', 'queue_position', 'expiry_date',
      'reviewed_by', 'reviewed_at', 'review_note',
      'assigned_house', 'user_id'
    ],
    // Transfer_{ปี} — sync กับ TRANSFER_REQUEST_HEADERS
    Transfer: [
      'id', 'submitted_at', 'prefix', 'firstname', 'lastname',
      'phone', 'email', 'position', 'subject_group',
      'current_house', 'transfer_type', 'preferred_house',
      'reason', 'attachment_file_ids',
      'status', 'reviewed_by', 'reviewed_at', 'review_note',
      'assigned_house', 'user_id'
    ],
    // Return_{ปี} — sync กับ RETURN_REQUEST_HEADERS
    Return: [
      'id', 'submitted_at', 'prefix', 'firstname', 'lastname',
      'phone', 'email', 'position', 'subject_group',
      'current_house', 'return_date', 'reason',
      'attachment_file_ids',
      'status', 'reviewed_by', 'reviewed_at', 'review_note',
      'user_id'
    ],
    // Repair_{ปี} — sync กับ REPAIR_REQUEST_HEADERS
    Repair: [
      'id', 'submitted_at', 'prefix', 'firstname', 'lastname',
      'phone', 'email', 'current_house',
      'repair_detail', 'urgency', 'cost_responsibility',
      'attachment_file_ids',
      'status', 'reviewed_by', 'reviewed_at', 'review_note',
      'user_id'
    ],
    // Queue (ตายตัว ไม่แยกปี) — sync กับ QUEUE_HEADERS
    Queue: [
      'id', 'request_id', 'request_year',
      'prefix', 'firstname', 'lastname',
      'phone', 'email', 'stay_type',
      'queue_position', 'added_at', 'expiry_date',
      'status', 'assigned_house', 'approved_at',
      'note'
    ]
  },

  // ===== [ACCOUNTING] บัญชี — แผ่นงานตามปี เช่น '2569' (sync กับ ACCOUNTING_YEAR_HEADERS) =====
  ACCOUNTING_YEAR: [
    'id', 'month', 'type', 'category',
    'name', 'amount', 'source',
    'receipt_file_id', 'note',
    'saved_at', 'saved_by'
  ],

  // ===== [WITHDRAW] สรุปเบิกจ่าย — แผ่นงานตามปี เช่น '2569' (sync กับ WITHDRAW_YEAR_HEADERS) =====
  WITHDRAW_YEAR: [
    'id', 'month', 'garbage_fee',
    'additional_items', 'total_withdraw',
    'saved_at', 'saved_by'
  ]
};

// ============================================================================
// GOOGLE SHEETS FILES CONFIGURATION — 8 ไฟล์
// ============================================================================

const SPREADSHEET_FILES = [
  {
    key: 'MAIN',
    name: '[MAIN] ฐานข้อมูลหลัก',
    type: 'fixed',                // แผ่นงานชื่อตายตัว
    fixedSheets: ['Housing', 'Residents', 'Users', 'Permissions', 'Settings',
                  'Announcements', 'Logs', 'WaterRates', 'CommonFee', 'Exemptions'],
    yearSheets: [{ prefix: 'PendingReg', schema: 'PENDING_REG' }]
  },
  {
    key: 'WATER',
    name: '[WATER] ค่าน้ำ',
    type: 'yearly',               // แผ่นงานชื่อตามปี
    yearSchema: 'WATER_YEAR'
  },
  {
    key: 'ELECTRIC',
    name: '[ELECTRIC] ค่าไฟ',
    type: 'yearly',
    yearSchema: 'ELECTRIC_YEAR'
  },
  {
    key: 'NOTIFICATIONS',
    name: '[NOTIFICATIONS] แจ้งยอดชำระ',
    type: 'yearly',
    yearSchema: 'NOTIFICATIONS_YEAR'
  },
  {
    key: 'PAYMENTS',
    name: '[PAYMENTS] การชำระเงิน',
    type: 'mixed',                // ทั้ง fixed + yearly
    fixedSheets: ['Outstanding'],
    yearSheets: [
      { prefix: 'SlipSubmissions', schema: null },  // ใช้ SCHEMAS.PAYMENTS.SlipSubmissions
      { prefix: 'PaymentHistory', schema: null }     // ใช้ SCHEMAS.PAYMENTS.PaymentHistory
    ]
  },
  {
    key: 'REQUESTS',
    name: '[REQUESTS] คำร้อง',
    type: 'mixed',
    fixedSheets: ['Queue'],
    yearSheets: [
      { prefix: 'Residence', schema: null },
      { prefix: 'Transfer',  schema: null },
      { prefix: 'Return',    schema: null },
      { prefix: 'Repair',    schema: null }
    ]
  },
  {
    key: 'ACCOUNTING',
    name: '[ACCOUNTING] บัญชี',
    type: 'yearly',
    yearSchema: 'ACCOUNTING_YEAR'
  },
  {
    key: 'WITHDRAW',
    name: '[WITHDRAW] สรุปเบิกจ่าย',
    type: 'yearly',
    yearSchema: 'WITHDRAW_YEAR'
  }
];

// ============================================================================
// MAIN SETUP FUNCTION
// ============================================================================

/**
 * ฟังก์ชันหลักสำหรับ Setup ทั้งระบบ
 * รันฟังก์ชันนี้เพื่อสร้างโครงสร้างทั้งหมด
 */
function setupAll() {
  console.log('🚀 เริ่มต้น Setup ระบบ HOME PPK 2026 (v2.0)...');

  try {
    // 0. ตรวจสอบว่า ROOT_FOLDER_ID ใช้งานได้
    try {
      const testRoot = DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID);
      console.log(`✅ พบโฟลเดอร์ราก: "${testRoot.getName()}" — จะสร้างโครงสร้างภายในนี้`);
    } catch (e) {
      const msg = `❌ ไม่พบโฟลเดอร์ ROOT_FOLDER_ID: ${CONFIG.ROOT_FOLDER_ID} — ` +
                  'กรุณาตรวจสอบว่า ID ถูกต้อง และคุณมีสิทธิ์เข้าถึง';
      console.error(msg);
      throw new Error(msg);
    }

    // ตรวจสอบว่ามีโฟลเดอร์ Data อยู่แล้วหรือไม่ (ป้องกันรัน Setup ซ้ำ)
    const rootCheck = DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID);
    const existingData = rootCheck.getFoldersByName('Data');
    if (existingData.hasNext()) {
      const msg = '❌ พบโฟลเดอร์ "Data" อยู่แล้วในโฟลเดอร์ราก — ดูเหมือนเคยรัน Setup แล้ว\n' +
                  'กรุณาลบโฟลเดอร์ย่อยเดิมก่อนรัน Setup ใหม่';
      console.error(msg);
      throw new Error(msg);
    }
    console.log('✅ ตรวจสอบโฟลเดอร์ซ้ำผ่าน — พร้อมสร้างโครงสร้าง');

    // 1. สร้างโครงสร้างโฟลเดอร์ (14 โฟลเดอร์ + 12 เดือน)
    const folders = setupFolders();
    console.log('✅ สร้างโฟลเดอร์เสร็จสิ้น');

    // 2. สร้าง Google Sheets (8 ไฟล์)
    const spreadsheets = setupSpreadsheets(folders.data);
    console.log('✅ สร้าง Google Sheets เสร็จสิ้น');

    // 3. บันทึกข้อมูลการตั้งค่าเริ่มต้น (46 รายการ)
    setupDefaultSettings(spreadsheets);
    console.log('✅ บันทึกค่าเริ่มต้นเสร็จสิ้น');

    // 4. สร้างรายงานสรุป
    const report = generateSetupReport(folders, spreadsheets);
    console.log('✅ สร้างรายงานเสร็จสิ้น');

    console.log('🎉 Setup ระบบเสร็จสมบูรณ์!');
    return report;

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
    throw error;
  }
}

// ============================================================================
// FOLDER SETUP — 14 โฟลเดอร์ (ตรงกับเทมเพลตฯ §1)
// ============================================================================

/**
 * สร้างโครงสร้างโฟลเดอร์ทั้งหมด
 */
function setupFolders() {
  console.log('📁 กำลังสร้างโครงสร้างโฟลเดอร์...');

  // ใช้โฟลเดอร์ราก (ROOT) ที่มีอยู่แล้ว — ไม่สร้างใหม่
  const rootFolder = DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID);
  const rootId = rootFolder.getId();

  // สร้างโฟลเดอร์ย่อย (7 โฟลเดอร์ระดับ 1)
  const folders = {
    root:               { name: CONFIG.ROOT_FOLDER_NAME, id: rootId, url: rootFolder.getUrl() },
    data:               createSubFolder(rootFolder, 'Data'),
    slips:              createSubFolder(rootFolder, 'Slips'),
    requestAttachments: createSubFolder(rootFolder, 'RequestAttachments'),
    accountingReceipts: createSubFolder(rootFolder, 'AccountingReceipts'),   // ← เพิ่มใหม่
    documents:          createSubFolder(rootFolder, 'Documents'),
    backups:            createSubFolder(rootFolder, 'Backups'),
    scripts:            createSubFolder(rootFolder, 'Scripts')
  };

  // สร้างโฟลเดอร์ Slips/{ปี}/{เดือน}
  const slipsFolder = DriveApp.getFolderById(folders.slips.id);
  folders.slipYears = {};
  folders.slipYears[CONFIG.START_YEAR] = createYearFolders(slipsFolder, CONFIG.START_YEAR);

  // สร้างโฟลเดอร์ RequestAttachments/4 ประเภท
  const requestFolder = DriveApp.getFolderById(folders.requestAttachments.id);
  folders.requestTypes = {
    residence: createSubFolder(requestFolder, 'ResidenceRequests'),
    transfer:  createSubFolder(requestFolder, 'TransferRequests'),
    return:    createSubFolder(requestFolder, 'ReturnRequests'),
    repair:    createSubFolder(requestFolder, 'RepairRequests')
  };

  return folders;
}

/**
 * สร้างโฟลเดอร์ย่อย
 */
function createSubFolder(parentFolder, name) {
  const folder = parentFolder.createFolder(name);
  return { name: name, id: folder.getId(), url: folder.getUrl() };
}

/**
 * สร้างโฟลเดอร์ปี + 12 เดือน
 */
function createYearFolders(parentFolder, year) {
  const yearFolder = parentFolder.createFolder(String(year));
  const months = {};

  CONFIG.THAI_MONTHS.forEach(monthName => {
    const monthFolder = yearFolder.createFolder(monthName);
    months[monthName] = { name: monthName, id: monthFolder.getId(), url: monthFolder.getUrl() };
  });

  return { name: String(year), id: yearFolder.getId(), url: yearFolder.getUrl(), months: months };
}

// ============================================================================
// SPREADSHEET SETUP — 8 ไฟล์ (ตรงกับเทมเพลตฯ §2)
// ============================================================================

/**
 * สร้าง Google Sheets ทั้ง 8 ไฟล์
 */
function setupSpreadsheets(dataFolder) {
  console.log('📊 กำลังสร้าง Google Sheets 8 ไฟล์...');

  const folder = DriveApp.getFolderById(dataFolder.id);
  const spreadsheets = {};
  const year = CONFIG.START_YEAR;

  SPREADSHEET_FILES.forEach(fileConfig => {
    // สร้าง Spreadsheet
    const ss = SpreadsheetApp.create(fileConfig.name);
    const ssId = ss.getId();

    // ย้ายไปโฟลเดอร์ Data
    DriveApp.getFileById(ssId).moveTo(folder);

    const sheetNames = [];

    // ── ประเภท 1: fixed — แผ่นงานชื่อตายตัว ──
    if (fileConfig.type === 'fixed' || fileConfig.type === 'mixed') {
      if (fileConfig.fixedSheets) {
        fileConfig.fixedSheets.forEach(sheetName => {
          const headers = getHeadersForFixedSheet(fileConfig.key, sheetName);
          createSheetWithHeaders(ss, sheetName, headers, sheetNames.length === 0);
          sheetNames.push(sheetName);
        });
      }
    }

    // ── ประเภท 2: yearly — แผ่นงานตามปี ──
    if (fileConfig.type === 'yearly') {
      const headers = SCHEMAS[fileConfig.yearSchema];
      const sheetName = String(year);
      createSheetWithHeaders(ss, sheetName, headers, sheetNames.length === 0);
      sheetNames.push(sheetName);
    }

    // ── ประเภท 3: mixed — fixed + yearly ──
    if (fileConfig.yearSheets) {
      fileConfig.yearSheets.forEach(ys => {
        let headers;
        if (ys.schema) {
          // schema ชี้ตรง (เช่น PENDING_REG)
          headers = SCHEMAS[ys.schema];
        } else {
          // ใช้ schema จาก SCHEMAS[fileConfig.key][ys.prefix]
          headers = SCHEMAS[fileConfig.key][ys.prefix];
        }
        const sheetName = `${ys.prefix}_${year}`;
        createSheetWithHeaders(ss, sheetName, headers, sheetNames.length === 0);
        sheetNames.push(sheetName);
      });
    }

    // ลบ Sheet1 ถ้ายังเหลือ
    const sheet1 = ss.getSheetByName('Sheet1');
    if (sheet1 && ss.getSheets().length > 1) {
      ss.deleteSheet(sheet1);
    }

    spreadsheets[fileConfig.key] = {
      name: fileConfig.name,
      id: ssId,
      url: ss.getUrl(),
      sheets: sheetNames
    };
  });

  return spreadsheets;
}

/**
 * ค้นหา headers สำหรับ fixed sheet
 */
function getHeadersForFixedSheet(fileKey, sheetName) {
  // MAIN มี schema เป็น object
  if (fileKey === 'MAIN' && SCHEMAS.MAIN[sheetName]) {
    return SCHEMAS.MAIN[sheetName];
  }
  // PAYMENTS, REQUESTS มี fixed sheets (Outstanding, Queue)
  if (SCHEMAS[fileKey] && SCHEMAS[fileKey][sheetName]) {
    return SCHEMAS[fileKey][sheetName];
  }
  return [];
}

/**
 * สร้าง Sheet พร้อม Headers + format
 */
function createSheetWithHeaders(spreadsheet, sheetName, headers, isFirst) {
  let sheet;

  if (isFirst) {
    // ใช้ Sheet แรกที่มีอยู่ (Sheet1) แล้วเปลี่ยนชื่อ
    const existing = spreadsheet.getSheets()[0];
    if (existing) {
      existing.setName(sheetName);
      sheet = existing;
    } else {
      sheet = spreadsheet.insertSheet(sheetName);
    }
  } else {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  if (headers && headers.length > 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    // Format Header Row
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#4285f4')
      .setFontColor('#ffffff')
      .setHorizontalAlignment('center');

    // Freeze header row
    sheet.setFrozenRows(1);

    // Set column width
    headers.forEach((_, colIndex) => {
      sheet.setColumnWidth(colIndex + 1, 130);
    });
  }

  return sheet;
}

// ============================================================================
// DEFAULT SETTINGS — 46 รายการ
// ============================================================================

/**
 * บันทึกค่าเริ่มต้นใน Settings Sheet + WaterRates + CommonFee
 */
function setupDefaultSettings(spreadsheets) {
  console.log(`⚙️ กำลังบันทึกค่าเริ่มต้น (${CONFIG.DEFAULT_SETTINGS.length} รายการ)...`);

  const mainSS = spreadsheets['MAIN'];
  if (!mainSS) return;

  const ss = SpreadsheetApp.openById(mainSS.id);
  const now = new Date();

  // ── 1. Settings (key-value pairs) ──
  const settingsSheet = ss.getSheetByName('Settings');
  if (settingsSheet) {
    const data = CONFIG.DEFAULT_SETTINGS.map(s => [s.key, s.value, s.description, now, 'System']);
    if (data.length > 0) {
      settingsSheet.getRange(2, 1, data.length, 5).setValues(data);
    }
  }

  // ── 2. WaterRates — ไม่สร้างค่าเริ่มต้น ──
  // ⚠️ อัตราค่าน้ำถูกกำหนดโดยแอดมินเท่านั้น
  // แอดมินต้องตั้งค่าอัตราค่าน้ำผ่าน admin-settings.html ก่อนใช้งานระบบบันทึกค่าน้ำ
  // WaterRates sheet จะว่างจนกว่าแอดมินจะกำหนดอัตรา
  console.log('   ℹ️ WaterRates: ว่าง — รอแอดมินกำหนดอัตราค่าน้ำผ่าน admin-settings.html');

  // ── 3. CommonFee (บ้านพัก + แฟลต) ──
  const commonFeeSheet = ss.getSheetByName('CommonFee');
  if (commonFeeSheet) {
    const id1 = 'CMF' + now.getTime() + '_0001';
    const id2 = 'CMF' + now.getTime() + '_0002';
    commonFeeSheet.getRange(2, 1, 2, 6).setValues([
      [id1, 'house', 110, '2569-01-01', now, 'System'],
      [id2, 'flat',  110, '2569-01-01', now, 'System']
    ]);
  }

  console.log(`   ✅ Settings: ${CONFIG.DEFAULT_SETTINGS.length} รายการ`);
  console.log('   ℹ️ WaterRates: ว่าง — รอแอดมินกำหนด');
  console.log('   ✅ CommonFee: 2 รายการ (บ้าน 110, แฟลต 110)');
  console.log('\n   ⚠️ สิ่งที่แอดมินต้องทำหลัง Setup:');
  console.log('      1. ตั้งค่าอัตราค่าน้ำ (WaterRates) ผ่าน admin-settings.html');
  console.log('      2. ตั้งค่าอัตราค่าไฟ (electric_rate) ถ้าใช้ method=unit ผ่าน admin-settings.html');
}

// ============================================================================
// REPORT
// ============================================================================

/**
 * สร้างรายงานสรุปการ Setup
 */
function generateSetupReport(folders, spreadsheets) {
  const report = {
    timestamp: new Date().toISOString(),
    version: '2.0',
    folders: folders,
    spreadsheets: spreadsheets,
    summary: {
      totalFolders: countFolders(folders),
      totalSpreadsheets: Object.keys(spreadsheets).length,
      totalSheets: countSheets(spreadsheets),
      totalSettings: CONFIG.DEFAULT_SETTINGS.length
    }
  };

  console.log('\n════════════════════════════════════════');
  console.log('📋 รายงานการ Setup ระบบ HOME PPK 2026 v2.0');
  console.log('════════════════════════════════════════');
  console.log(`📁 โฟลเดอร์ทั้งหมด: ${report.summary.totalFolders}`);
  console.log(`📊 ไฟล์ Spreadsheet: ${report.summary.totalSpreadsheets}`);
  console.log(`📄 Sheets ทั้งหมด: ${report.summary.totalSheets}`);
  console.log(`⚙️ Settings: ${report.summary.totalSettings} รายการ`);
  console.log('════════════════════════════════════════');

  console.log('\n📁 โครงสร้างโฟลเดอร์:');
  console.log(`   ROOT: ${folders.root.url}`);
  console.log(`   Data: ${folders.data.url}`);
  console.log(`   Slips: ${folders.slips.url}`);
  console.log(`   RequestAttachments: ${folders.requestAttachments.url}`);
  console.log(`   AccountingReceipts: ${folders.accountingReceipts.url}`);
  console.log(`   Documents: ${folders.documents.url}`);
  console.log(`   Backups: ${folders.backups.url}`);
  console.log(`   Scripts: ${folders.scripts.url}`);

  console.log('\n📊 Google Sheets:');
  Object.keys(spreadsheets).forEach(key => {
    const ss = spreadsheets[key];
    console.log(`   ${ss.name}: ${ss.url}`);
    console.log(`      Sheets: [${ss.sheets.join(', ')}]`);
  });

  console.log('\n════════════════════════════════════════');
  console.log('📋 ID สำหรับ Config.gs — คัดลอกค่าด้านล่างนี้:');
  console.log('════════════════════════════════════════');

  console.log('\n// ── Folder IDs ──');
  console.log(`const ROOT_FOLDER_ID = '${folders.root.id}';`);
  console.log(`const DATA_FOLDER_ID = '${folders.data.id}';`);
  console.log(`const SLIPS_FOLDER_ID = '${folders.slips.id}';`);
  console.log(`const REQUEST_ATTACHMENTS_FOLDER_ID = '${folders.requestAttachments.id}';`);
  if (folders.requestTypes) {
    console.log(`const RESIDENCE_REQ_FOLDER_ID = '${folders.requestTypes.residence.id}';`);
    console.log(`const TRANSFER_REQ_FOLDER_ID = '${folders.requestTypes.transfer.id}';`);
    console.log(`const RETURN_REQ_FOLDER_ID = '${folders.requestTypes.return.id}';`);
    console.log(`const REPAIR_REQ_FOLDER_ID = '${folders.requestTypes.repair.id}';`);
  }
  console.log(`const ACCOUNTING_RECEIPTS_FOLDER_ID = '${folders.accountingReceipts.id}';`);
  console.log(`const DOCUMENTS_FOLDER_ID = '${folders.documents.id}';`);
  console.log(`const BACKUPS_FOLDER_ID = '${folders.backups.id}';`);
  console.log(`const SCRIPTS_FOLDER_ID = '${folders.scripts.id}';`);

  console.log('\n// ── Spreadsheet IDs ──');
  console.log('const SPREADSHEET_IDS = {');
  Object.keys(spreadsheets).forEach(key => {
    console.log(`  ${key}: '${spreadsheets[key].id}',`);
  });
  console.log('};');

  // บันทึกรายงานลงไฟล์
  saveReportToDrive(folders.root.id, report);

  return report;
}

// ============================================================================
// UTILITY FUNCTIONS — เฉพาะ setup helpers เท่านั้น
// ============================================================================

/**
 * นับจำนวนโฟลเดอร์
 */
function countFolders(folders) {
  let count = 0;

  // โฟลเดอร์หลัก: root + data + slips + requestAttachments + accountingReceipts + documents + backups + scripts = 8
  count += 8;

  // โฟลเดอร์ปี + 12 เดือน
  if (folders.slipYears) {
    Object.keys(folders.slipYears).forEach(year => {
      count += 1; // ปี
      count += Object.keys(folders.slipYears[year].months).length; // 12 เดือน
    });
  }

  // โฟลเดอร์ประเภทคำร้อง (4)
  if (folders.requestTypes) {
    count += Object.keys(folders.requestTypes).length;
  }

  return count;
}

/**
 * นับจำนวน Sheets
 */
function countSheets(spreadsheets) {
  let count = 0;
  Object.values(spreadsheets).forEach(ss => {
    count += ss.sheets.length;
  });
  return count;
}

/**
 * บันทึกรายงานลง Drive
 */
function saveReportToDrive(folderId, report) {
  const folder = DriveApp.getFolderById(folderId);
  const content = JSON.stringify(report, null, 2);
  const fileName = `setup_report_${new Date().toISOString().split('T')[0]}.json`;
  folder.createFile(fileName, content, MimeType.PLAIN_TEXT);
}

/**
 * สร้างโฟลเดอร์เดือนสำหรับปีใหม่ (เรียกจาก Backend เมื่อขึ้นปีใหม่)
 * @param {string} slipsFolderId - ID ของโฟลเดอร์ Slips
 * @param {number} year - ปี พ.ศ.
 */
function createNewYearFolders(slipsFolderId, year) {
  const slipsFolder = DriveApp.getFolderById(slipsFolderId);
  return createYearFolders(slipsFolder, year);
}

/**
 * ดึง ID ของ Spreadsheet ทั้งหมดจากโฟลเดอร์ Data
 * @param {string} dataFolderId - ID ของโฟลเดอร์ Data
 */
function getAllSpreadsheetIds(dataFolderId) {
  const folder = DriveApp.getFolderById(dataFolderId);
  const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
  const result = {};

  while (files.hasNext()) {
    const file = files.next();
    result[file.getName()] = { id: file.getId(), url: file.getUrl() };
  }

  return result;
}

/**
 * ตรวจสอบว่าโฟลเดอร์มีอยู่แล้วหรือไม่
 * @param {string} folderName - ชื่อโฟลเดอร์
 */
function checkFolderExists(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  return folders.hasNext();
}

/**
 * ค้นหาโฟลเดอร์ตามชื่อ
 * @param {string} folderName - ชื่อโฟลเดอร์
 */
function findFolderByName(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    const folder = folders.next();
    return { id: folder.getId(), url: folder.getUrl() };
  }
  return null;
}

/**
 * สร้าง Backup ของ Spreadsheets (เฉพาะตอน setup — runtime ใช้ createBackup() ใน Database.gs)
 * เปลี่ยนชื่อเป็น setupCreateBackup เพื่อไม่ซ้ำกับ Database.gs
 * @param {string} dataFolderId - ID ของโฟลเดอร์ Data
 * @param {string} backupFolderId - ID ของโฟลเดอร์ Backups
 */
function setupCreateBackup(dataFolderId, backupFolderId) {
  const dataFolder = DriveApp.getFolderById(dataFolderId);
  const backupFolder = DriveApp.getFolderById(backupFolderId);
  const files = dataFolder.getFilesByType(MimeType.GOOGLE_SHEETS);
  const dateStr = new Date().toISOString().split('T')[0];

  while (files.hasNext()) {
    const file = files.next();
    const backupName = `Backup_${dateStr}_${file.getName()}`;
    file.makeCopy(backupName, backupFolder);
  }

  console.log(`✅ สร้าง Backup เสร็จสิ้น: ${dateStr}`);
}

// ============================================================================
// SEED HOUSING DATA — เพิ่มบ้านพัก/แฟลตเริ่มต้น
// ============================================================================

/**
 * เพิ่มบ้านพัก 17 หลัง + แฟลต 16 หน่วย ลงชีท Housing โดยตรง
 * วิธีใช้: เปิด GAS Editor → เลือกฟังก์ชัน seedHousingData → กด Run
 */
function seedHousingData() {
  var now = new Date().toISOString();
  var entries = [];

  // บ้านพัก 1-17
  for (var i = 1; i <= 17; i++) {
    var hid = getNextId(ID_PREFIXES.HOU);
    entries.push({
      id: hid,
      type: 'house',
      number: String(i),
      display_number: 'บ้าน ' + i,
      zone: '',
      status: 'available',
      note: '',
      created_at: now,
      updated_at: ''
    });
  }

  // แฟลต 1-16
  for (var j = 1; j <= 16; j++) {
    var fid = getNextId(ID_PREFIXES.HOU);
    entries.push({
      id: fid,
      type: 'flat',
      number: String(j),
      display_number: 'แฟลต ' + j,
      zone: '',
      status: 'available',
      note: '',
      created_at: now,
      updated_at: ''
    });
  }

  var result = batchAppendRows(SPREADSHEET_IDS.MAIN, SHEET_NAMES.HOUSING, entries);
  invalidateCache('housing');

  var msg = 'seedHousingData: เพิ่ม ' + entries.length + ' รายการ — ' + JSON.stringify(result);
  Logger.log(msg);
  SpreadsheetApp.getActiveSpreadsheet && SpreadsheetApp.flush();
  return msg;
}

// ============================================================================
// SEED RESIDENTS DATA — เพิ่มผู้พักอาศัยหลักทุกบ้าน/แฟลต
// ============================================================================

/**
 * เพิ่มผู้พักอาศัยหลักลงชีท Residents + อัปเดตสถานะบ้านพักเป็น occupied
 * วิธีใช้: เปิด GAS Editor → เลือกฟังก์ชัน seedResidentsData → กด Run
 */
function seedResidentsData() {
  var now = new Date().toISOString();

  // ---- ข้อมูลบ้านพัก 1-17 ----
  var houses = [
    { num: '1',  prefix: '',       firstname: 'บ้านพักนักการ',    lastname: '' },
    { num: '2',  prefix: 'นางสาว', firstname: 'พิมพ์ใจ',          lastname: 'สมศรี' },
    { num: '3',  prefix: 'นาง',    firstname: 'บุษบา',            lastname: 'อริยะคำ' },
    { num: '4',  prefix: 'นาย',    firstname: 'รณชัย',            lastname: 'วรรณรัตน์' },
    { num: '5',  prefix: 'นางสาว', firstname: 'ปิโยรส',           lastname: 'ใจเอื้อ' },
    { num: '6',  prefix: '',       firstname: 'บ้านพักครูจีน',    lastname: '' },
    { num: '7',  prefix: 'นางสาว', firstname: 'รัตนา',            lastname: 'สบายจิตร' },
    { num: '8',  prefix: 'นาย',    firstname: 'เจษฏาวัชส์',        lastname: 'เสียงเย็น' },
    { num: '9',  prefix: 'นาย',    firstname: 'พงศธร',            lastname: 'โพธิแก้ว' },
    { num: '10', prefix: 'นาง',    firstname: 'จีรพา',            lastname: 'กันทา' },
    { num: '11', prefix: 'น.ส.',   firstname: 'ลัดดาวัลย์',        lastname: 'บุญคุ้ม' },
    { num: '12', prefix: 'น.ส.',   firstname: 'ญาณกร',            lastname: 'ศรีชาติ' },
    { num: '13', prefix: 'นาง',    firstname: 'ดารากร',           lastname: 'จางคพิเชียร' },
    { num: '14', prefix: 'นางสาว', firstname: 'เจนจิรา',          lastname: 'จันทร์หล้า' },
    { num: '15', prefix: 'น.ส.',   firstname: 'กานท์ชญา',         lastname: 'อ่อนนวล' },
    { num: '16', prefix: 'นาง',    firstname: 'ดวงจันทร์',         lastname: 'หลายแห่ง' },
    { num: '17', prefix: 'นาย',    firstname: 'เฉลิมพล',          lastname: 'ปามา' }
  ];

  // ---- ข้อมูลแฟลต 1-16 ----
  var flats = [
    { num: '1',  prefix: 'นาย',    firstname: 'ณัฐพงศ์',          lastname: 'คำเป็ง' },
    { num: '2',  prefix: 'น.ส.',   firstname: 'กันยา',            lastname: 'กันทะ' },
    { num: '3',  prefix: 'น.ส.',   firstname: 'ขวัญดาว',          lastname: 'วงษ์พันธ์' },
    { num: '4',  prefix: '',       firstname: 'แฟลตครูญี่ปุ่น',   lastname: '' },
    { num: '5',  prefix: 'นาย',    firstname: 'สุมงคล',           lastname: 'จ่อยพิรัตน์' },
    { num: '6',  prefix: 'นาย',    firstname: 'ทรงศักดิ์',         lastname: 'แก้ววิลัย' },
    { num: '7',  prefix: 'นาย',    firstname: 'พงศกร',            lastname: 'หงษ์ระนัย' },
    { num: '8',  prefix: 'นาย',    firstname: 'พงศกร',            lastname: 'วังศิลา' },
    { num: '9',  prefix: 'น.ส.',   firstname: 'สุกันญา',          lastname: 'ตามสมัย' },
    { num: '10', prefix: 'น.ส.',   firstname: 'ดารากรณ์',         lastname: 'นาคสุกเอี่ยม' },
    { num: '11', prefix: 'นางสาว', firstname: 'กนกพร',            lastname: 'ภู่ปรางทอง' },
    { num: '12', prefix: 'นาย',    firstname: 'ราชนุชา',          lastname: 'อินจันทร์' },
    { num: '13', prefix: 'น.ส.',   firstname: 'จริญญา',           lastname: 'ศิลธรรม' },
    { num: '14', prefix: 'นาย',    firstname: 'จิรพันธ์',         lastname: 'จันจินะ' },
    { num: '15', prefix: 'นางสาว', firstname: 'รุจิรา',           lastname: 'กาจินา' },
    { num: '16', prefix: 'นาย',    firstname: 'จรูญพงษ์',         lastname: 'ชลสินธุ์' }
  ];

  var entries = [];

  // สร้าง residents จากบ้านพัก
  for (var i = 0; i < houses.length; i++) {
    var h = houses[i];
    var houseNumber = 'บ้าน ' + h.num;
    var rid = getNextId(ID_PREFIXES.RES);
    entries.push({
      id: rid,
      resident_type: 'staff',
      prefix: h.prefix,
      firstname: h.firstname,
      lastname: h.lastname,
      position: '',
      subject_group: '',
      phone: '',
      email: '',
      house_number: houseNumber,
      address_no: '', address_road: '', address_village: '',
      subdistrict: '', district: '', province: '', zipcode: '',
      move_in_date: '',
      cohabitants: 0,
      cohabitant_names: '[]',
      profile_photo: '',
      status: 'active',
      created_at: now,
      updated_at: ''
    });
  }

  // สร้าง residents จากแฟลต
  for (var j = 0; j < flats.length; j++) {
    var f = flats[j];
    var flatNumber = 'แฟลต ' + f.num;
    var frid = getNextId(ID_PREFIXES.RES);
    entries.push({
      id: frid,
      resident_type: 'staff',
      prefix: f.prefix,
      firstname: f.firstname,
      lastname: f.lastname,
      position: '',
      subject_group: '',
      phone: '',
      email: '',
      house_number: flatNumber,
      address_no: '', address_road: '', address_village: '',
      subdistrict: '', district: '', province: '', zipcode: '',
      move_in_date: '',
      cohabitants: 0,
      cohabitant_names: '[]',
      profile_photo: '',
      status: 'active',
      created_at: now,
      updated_at: ''
    });
  }

  // เพิ่มลงชีท Residents
  var resResult = batchAppendRows(SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS, entries);
  invalidateCache('residents');

  // อัปเดตสถานะบ้านพักเป็น occupied ทุกหลัง
  var allHouseNumbers = [];
  for (var x = 0; x < houses.length; x++) allHouseNumbers.push('บ้าน ' + houses[x].num);
  for (var y = 0; y < flats.length; y++) allHouseNumbers.push('แฟลต ' + flats[y].num);

  for (var k = 0; k < allHouseNumbers.length; k++) {
    try {
      updateRowInSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.HOUSING, 'display_number', allHouseNumbers[k], {
        status: 'occupied',
        updated_at: now
      });
    } catch(e) {
      Logger.log('ไม่พบ housing: ' + allHouseNumbers[k] + ' — ' + e.message);
    }
  }
  invalidateCache('housing');

  var msg = 'seedResidentsData: เพิ่ม ' + entries.length + ' คน — ' + JSON.stringify(resResult);
  Logger.log(msg);
  return msg;
}

// ============================================================================
// UPDATE RESIDENTS COHABITANTS — อัปเดตผู้ร่วมพักจากข้อมูลแบบสำรวจ
// ============================================================================

/**
 * อัปเดตจำนวนและรายชื่อผู้ร่วมพักให้ทุกคนในชีท Residents
 * วิธีใช้: เปิด GAS Editor → เลือก updateResidentsCohabitants → กด Run
 */
function updateResidentsCohabitants() {
  var now = new Date().toISOString();

  // ข้อมูลผู้ร่วมพักจากแบบสำรวจ (key = firstname ตัดช่องว่าง)
  var cohabitantMap = {
    'พงศธร โพธิแก้ว':        { count: 2, names: JSON.stringify(['นางเบญจมาภรณ์ โพธิแก้ว (คู่สมรส)', 'เด็กชายวาทยกร โพธิแก้ว (บุตร)']) },
    'ลัดดาวัลย์ บุญคุ้ม':    { count: 2, names: JSON.stringify(['ด.ญ.ณัฏฐกานต์ นันติตานนท์ (บุตร)', 'ด.ญ.กัลยกร นันติตานนท์ (บุตร)']) },
    'ดวงจันทร์ หลายแห่ง':    { count: 3, names: JSON.stringify(['นายนิภทร์ หลายแห่ง (คู่สมรส)', 'เด็กชายปภินวิช หลายแห่ง (บุตร)', 'เด็กชายปภาวินท์ หลายแห่ง (บุตร)']) },
    'ดารากรณ์ นาคสุกเอี่ยม': { count: 3, names: JSON.stringify(['เด็กหญิงอารยา ขุนมิน (บุตร)', 'เด็กหญิงนาราชา ขุนมิน (บุตร)', 'นางสาววราภรณ์ อินจันทร์ (บุคลากร)']) },
    'บุษบา อริยะคำ':          { count: 3, names: JSON.stringify(['นายนิรันดร อริยะคำ (คู่สมรส)', 'เด็กหญิงณัฐณิชา อริยะคำ (บุตร)', 'เด็กชายนราธิป อริยะคำ (บุตร)']) },
    'ขวัญดาว วงษ์พันธ์':      { count: 1, names: JSON.stringify(['นางสาวอรอนงค์ ยามเลย (บุคลากร)']) },
    'เฉลิมพล ปามา':           { count: 0, names: JSON.stringify([]) },
    'กานท์ชญา อ่อนนวล':       { count: 3, names: JSON.stringify(['นายชัยณรง เงินห้อย (คู่สมรส)', 'เด็กหญิงวิมลพรรณ เมืองอินทร์ (บุตร)', 'นายพันธงมิน เมืองอินทร์ (บุตร)']) },
    'ญาณกร ศรีชาติ':           { count: 4, names: JSON.stringify(['เด็กหญิงกัญญาวีร์ หาญชนะ (บุตร)', 'นางทองศรี ศรีชาติ (มารดา)', 'นายพงษ์ศักดิ์ ศรีชาติ (บิดา)', 'นางสาวญาณกร ศรีชาติ (บุคลากร)']) },
    'ทรงศักดิ์ แก้ววิลัย':     { count: 1, names: JSON.stringify(['นายศิวดล เขื่อนแก้ว (อื่นๆ)']) },
    'ปิโยรส ใจเอื้อ':           { count: 0, names: JSON.stringify([]) },
    'รุจิรา กาจินา':            { count: 0, names: JSON.stringify([]) },
    'ราชนุชา อินจันทร์':        { count: 0, names: JSON.stringify([]) },
    'กันยา กันทะ':              { count: 2, names: JSON.stringify(['นายธวัชชัย ดาก้อน (คู่สมรส)', 'นายเอกวัส ดาก้อน (บุตร)']) },
    'พงศกร วังศิลา':            { count: 0, names: JSON.stringify([]) },
    'รณชัย วรรณรัตน์':          { count: 2, names: JSON.stringify(['นางสาวรัชตวรรณ กวางเดินดง (คู่สมรส)', 'เด็กชายรชฏ วรรณรัตน์ (บุตร)']) },
    'เจษฏาวัชส์ เสียงเย็น':     { count: 0, names: JSON.stringify([]) },
    'รัตนา สบายจิตร':           { count: 1, names: JSON.stringify(['ร.ต.ท. นิวัตร สาระมนต์ (คู่สมรส)']) },
    'จริญญา ศิลธรรม':           { count: 0, names: JSON.stringify([]) },
    'พงศกร หงษ์ระนัย':          { count: 0, names: JSON.stringify([]) },
    'กนกพร ภู่ปรางทอง':         { count: 2, names: JSON.stringify(['นายรุ่นซิน หลี่ (คู่สมรส)', 'นายนิติกรณ์ ภู่ปรางทอง (พี่ชาย)']) },
    'จีรพา กันทา':              { count: 3, names: JSON.stringify(['นายศิริวัฒน์ กันทา (คู่สมรส)', 'นายธรณ์เทพ กันทา (บุตร)', 'เด็กชายธีรวัฒน์ กันทา (บุตร)']) },
    'ดารากร จางคพิเชียร':       { count: 5, names: JSON.stringify(['นายรัฐกานท์ จางคพิเชียร (คู่สมรส)', 'นายสุข ยศวงค์ (บิดา)', 'นางสมพร ยศวงค์ (มารดา)', 'ด.ญ.พุทธิดา จางคพิเชียร (บุตร)', 'ด.ช.ชยกร จางคพิเชียร (บุตร)']) },
    'เจนจิรา จันทร์หล้า':       { count: 1, names: JSON.stringify(['เด็กชายพุทธคุณ สมบูรณ์สิริ (บุตร)']) },
    'สุมงคล จ่อยพิรัตน์':       { count: 3, names: JSON.stringify(['นางสาววิไลวรรณ อาซอง (คู่สมรส)', 'เด็กชายแผ่นดิน จ่อยพิรัตน์ (บุตร)', 'เด็กชายธารน้ำ จ่อยพิรัตน์ (บุตร)']) },
    'จรูญพงษ์ ชลสินธุ์':        { count: 0, names: JSON.stringify([]) },
    'ณัฐพงศ์ คำเป็ง':           { count: 0, names: JSON.stringify([]) },
    'สุกันญา ตามสมัย':          { count: 0, names: JSON.stringify([]) },
    'พิมพ์ใจ สมศรี':            { count: 3, names: JSON.stringify(['นายรังสรรค์ บุญฮุย (คู่สมรส)', 'เด็กหญิงพิชญธิดา บุญฮุย (บุตร)', 'เด็กหญิงพิชญวดี บุญฮุย (บุตร)']) }
  };

  var sheet = getSheetByName(SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var firstnameCol = headers.indexOf('firstname');
  var lastnameCol  = headers.indexOf('lastname');
  var cohabitantsCol = headers.indexOf('cohabitants');
  var cohabitantNamesCol = headers.indexOf('cohabitant_names');
  var updatedAtCol = headers.indexOf('updated_at');

  var updated = 0;
  for (var i = 1; i < data.length; i++) {
    var fn = (data[i][firstnameCol] || '').trim();
    var ln = (data[i][lastnameCol] || '').trim();
    var key = fn + ' ' + ln;
    if (cohabitantMap[key]) {
      var info = cohabitantMap[key];
      if (cohabitantsCol >= 0)      sheet.getRange(i+1, cohabitantsCol+1).setValue(info.count);
      if (cohabitantNamesCol >= 0)  sheet.getRange(i+1, cohabitantNamesCol+1).setValue(info.names);
      if (updatedAtCol >= 0)        sheet.getRange(i+1, updatedAtCol+1).setValue(now);
      updated++;
    }
  }

  invalidateCache('residents');
  SpreadsheetApp.flush();
  var msg = 'updateResidentsCohabitants: อัปเดต ' + updated + ' จาก ' + (data.length-1) + ' รายการ';
  Logger.log(msg);
  return msg;
}

// ============================================================================
// UPDATE COHABITANTS BATCH 2 — ผู้ร่วมพักบุคลากรเพิ่มเติม
// ============================================================================

/**
 * อัปเดตผู้ร่วมพักอาศัย (บุคลากร) สำหรับบ้านพัก/แฟลตที่มีผู้ร่วมพักเพิ่มเติม
 * วิธีใช้: เปิด GAS Editor → เลือก updateCohabitantsBatch2 → กด Run
 */
function updateCohabitantsBatch2() {
  var now = new Date().toISOString();

  // key = "firstname lastname" (trim), value = รายชื่อผู้ร่วมพักที่ต้องเพิ่ม/อัปเดต
  var updates = [
    // บ้าน
    { key: 'ปิโยรส ใจเอื้อ',        count: 1, names: JSON.stringify(['นางสาวชุลีมาศ คำบุญเรือง (บุคลากร)']) },
    { key: 'เจษฏาวัชส์ เสียงเย็น',  count: 1, names: JSON.stringify(['นายอดิสรณ์ ปินตามูล (บุคลากร)']) },
    { key: 'เฉลิมพล ปามา',          count: 1, names: JSON.stringify(['นายกัญจน์ณัฏฐ์ โลกคำลือ (บุคลากร)']) },
    // แฟลต (ขวัญดาว มี อรอนงค์ อยู่แล้วจาก batch1 — ข้ามไป)
    { key: 'พงศกร วังศิลา',          count: 1, names: JSON.stringify(['นายอภินันท์ ผ่องกมล (บุคลากร)']) },
    { key: 'สุกันญา ตามสมัย',        count: 1, names: JSON.stringify(['น.ส.กัญนิกา สีเสน (บุคลากร)']) },
    { key: 'จริญญา ศิลธรรม',         count: 1, names: JSON.stringify(['น.ส.ปาริฉัตร์ คันธิสา (บุคลากร)']) },
    { key: 'จิรพันธ์ จันจินะ',       count: 1, names: JSON.stringify(['นายอุดม พลทองมาก (บุคลากร)']) }
  ];

  var sheet = getSheetByName(SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var firstnameCol      = headers.indexOf('firstname');
  var lastnameCol       = headers.indexOf('lastname');
  var cohabitantsCol    = headers.indexOf('cohabitants');
  var cohabitantNamesCol = headers.indexOf('cohabitant_names');
  var updatedAtCol      = headers.indexOf('updated_at');

  var updated = 0;
  for (var i = 1; i < data.length; i++) {
    var fn  = (data[i][firstnameCol] || '').trim();
    var ln  = (data[i][lastnameCol]  || '').trim();
    var key = fn + ' ' + ln;

    for (var j = 0; j < updates.length; j++) {
      if (updates[j].key === key) {
        // ดึง cohabitant_names ที่มีอยู่แล้ว แล้วรวม
        var existingNames = [];
        try { existingNames = JSON.parse(data[i][cohabitantNamesCol] || '[]'); } catch(e) {}
        var newNames = JSON.parse(updates[j].names);
        var merged = existingNames.concat(newNames);
        var mergedCount = parseInt(data[i][cohabitantsCol] || 0) + updates[j].count;

        if (cohabitantsCol >= 0)       sheet.getRange(i+1, cohabitantsCol+1).setValue(mergedCount);
        if (cohabitantNamesCol >= 0)   sheet.getRange(i+1, cohabitantNamesCol+1).setValue(JSON.stringify(merged));
        if (updatedAtCol >= 0)         sheet.getRange(i+1, updatedAtCol+1).setValue(now);
        updated++;
        break;
      }
    }
  }

  invalidateCache('residents');
  SpreadsheetApp.flush();
  var msg = 'updateCohabitantsBatch2: อัปเดต ' + updated + ' รายการ';
  Logger.log(msg);
  return msg;
}

// ============================================================================
// CLEANUP DUPLICATE HOUSING — ลบรายการบ้าน/แฟลตซ้ำที่ถูกสร้างก่อนหน้า
// ============================================================================

/**
 * ลบรายการบ้าน/แฟลตที่ซ้ำกัน (รูปแบบเก่า) ออกจากชีท Housing
 *
 * รายการที่จะถูกลบ (รูปแบบเก่า):
 *   - display_number = "บ้านพัก บ้าน1", "บ้านพัก บ้าน2", ...
 *   - display_number = "แฟลต แฟลต1", "แฟลต แฟลต2", ...
 *   - display_number ที่มีรูปแบบไม่ตรงกับ "บ้าน N" หรือ "แฟลต N"
 *
 * รายการที่จะ คง ไว้ (รูปแบบใหม่):
 *   - "บ้าน 1" ... "บ้าน 17"
 *   - "แฟลต 1" ... "แฟลต 16"
 *
 * วิธีใช้: GAS Editor → เลือก cleanupDuplicateHousing → ▶ Run
 */
function cleanupDuplicateHousing() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.MAIN);
  var sheet = ss.getSheetByName(SHEET_NAMES.HOUSING);
  if (!sheet) {
    return { success: false, error: 'ไม่พบชีท Housing' };
  }

  var allData = sheet.getDataRange().getValues();
  if (allData.length < 2) {
    return { success: true, message: 'ไม่มีข้อมูลในชีท Housing', deleted: 0 };
  }

  var headers = allData[0];
  var idIdx = headers.indexOf('id');
  var displayIdx = headers.indexOf('display_number');

  if (idIdx === -1 || displayIdx === -1) {
    return { success: false, error: 'ไม่พบคอลัมน์ id หรือ display_number' };
  }

  // Pattern ที่ถูกต้อง: "บ้าน N" หรือ "แฟลต N" (N = ตัวเลข)
  var validPattern = /^(บ้าน|แฟลต) \d+$/;

  var toDeleteIds = [];
  var toDeleteNames = [];

  for (var i = 1; i < allData.length; i++) {
    var row = allData[i];
    var displayNumber = String(row[displayIdx] || '').trim();
    var rowId = String(row[idIdx] || '').trim();

    if (!rowId || !displayNumber) continue;

    if (!validPattern.test(displayNumber)) {
      toDeleteIds.push(rowId);
      toDeleteNames.push(displayNumber);
    }
  }

  if (toDeleteIds.length === 0) {
    return { success: true, message: 'ไม่พบรายการซ้ำ', deleted: 0 };
  }

  var deleted = 0;
  var errors = [];
  for (var k = 0; k < toDeleteIds.length; k++) {
    try {
      var result = deleteRowFromSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.HOUSING, 'id', toDeleteIds[k]);
      if (result && result.success) {
        deleted++;
      } else {
        errors.push(toDeleteNames[k]);
      }
    } catch (e) {
      errors.push(toDeleteNames[k] + ': ' + e.message);
    }
  }

  invalidateCache('housing');
  invalidateCache('residents');

  var summary = 'ลบสำเร็จ ' + deleted + '/' + toDeleteIds.length + ' รายการ';
  Logger.log('cleanupDuplicateHousing: ' + summary);
  return { success: true, message: summary, deleted: deleted, total: toDeleteIds.length, errors: errors, removed: toDeleteNames.slice(0, deleted) };
}

// ============================================================================
// CLEAR ALL DATA — ล้างข้อมูลบ้าน/แฟลต และผู้พักอาศัยออกทั้งหมด
// ============================================================================

/**
 * ล้างข้อมูลชีท Housing และ Residents ออกทั้งหมด (คงไว้แค่แถว header)
 * ⚠️ ระวัง: ข้อมูลจะถูกลบถาวร ไม่สามารถกู้คืนได้
 * วิธีใช้: GAS Editor → เลือก clearAllData → ▶ Run
 */
function clearAllData() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.MAIN);
  var results = {};

  // ---- ล้างชีท Housing ----
  var housingSheet = ss.getSheetByName(SHEET_NAMES.HOUSING);
  if (housingSheet) {
    var hLastRow = housingSheet.getLastRow();
    if (hLastRow > 1) {
      housingSheet.deleteRows(2, hLastRow - 1);
      results.housing = 'ลบ ' + (hLastRow - 1) + ' แถว';
    } else {
      results.housing = 'ไม่มีข้อมูล (ว่างอยู่แล้ว)';
    }
  } else {
    results.housing = 'ไม่พบชีท';
  }

  // ---- ล้างชีท Residents ----
  var residentsSheet = ss.getSheetByName(SHEET_NAMES.RESIDENTS);
  if (residentsSheet) {
    var rLastRow = residentsSheet.getLastRow();
    if (rLastRow > 1) {
      residentsSheet.deleteRows(2, rLastRow - 1);
      results.residents = 'ลบ ' + (rLastRow - 1) + ' แถว';
    } else {
      results.residents = 'ไม่มีข้อมูล (ว่างอยู่แล้ว)';
    }
  } else {
    results.residents = 'ไม่พบชีท';
  }

  // ---- invalidate cache ----
  invalidateCache('housing');
  invalidateCache('residents');
  SpreadsheetApp.flush();

  var msg = 'clearAllData เสร็จสิ้น — Housing: ' + results.housing + ' | Residents: ' + results.residents;
  Logger.log(msg);
  return { success: true, message: msg, details: results };
}

// ============================================================================
// SEED ALL IN ONE — เพิ่มบ้าน + คน + ผู้ร่วมพักทีเดียว
// ============================================================================

/**
 * เพิ่มข้อมูลบ้านพัก/แฟลต + ผู้พักอาศัยหลัก + ผู้ร่วมพักอาศัย ทีเดียวครบในฟังก์ชันเดียว
 * รวม batch1 + batch2 ในขั้นตอนเดียว ไม่ต้องรันหลายขั้นตอน
 * ⚠️ แนะนำ: รัน clearAllData() ก่อนเพื่อล้างข้อมูลเก่าออกก่อน
 * วิธีใช้: GAS Editor → เลือก seedAllInOne → ▶ Run
 */
function seedAllInOne() {
  var now = new Date().toISOString();
  var log = [];

  // ==========================================================================
  // ส่วนที่ 1: เพิ่มบ้านพัก 17 หลัง + แฟลต 16 หน่วย
  // ==========================================================================
  var housingEntries = [];

  for (var i = 1; i <= 17; i++) {
    housingEntries.push({
      id: getNextId(ID_PREFIXES.HOU),
      type: 'house',
      number: String(i),
      display_number: 'บ้าน ' + i,
      zone: '',
      status: 'available',
      note: '',
      created_at: now,
      updated_at: ''
    });
  }
  for (var j = 1; j <= 16; j++) {
    housingEntries.push({
      id: getNextId(ID_PREFIXES.HOU),
      type: 'flat',
      number: String(j),
      display_number: 'แฟลต ' + j,
      zone: '',
      status: 'available',
      note: '',
      created_at: now,
      updated_at: ''
    });
  }

  var housingResult = batchAppendRows(SPREADSHEET_IDS.MAIN, SHEET_NAMES.HOUSING, housingEntries);
  invalidateCache('housing');
  log.push('Housing: เพิ่ม ' + housingEntries.length + ' รายการ');

  // ==========================================================================
  // ส่วนที่ 2: เพิ่มผู้พักอาศัย + ผู้ร่วมพัก (รวม batch1 + batch2)
  // format แต่ละ entry: { houseType, num, prefix, firstname, lastname, cohabitants, cohabitantNames }
  // ==========================================================================

  var residents = [
    // ---- บ้านพัก 1-17 ----
    { houseType: 'บ้าน', num: '1',  prefix: '',       firstname: 'บ้านพักนักการ',  lastname: '',                  cohabitants: 0, cohabitantNames: '[]' },
    { houseType: 'บ้าน', num: '2',  prefix: 'นางสาว', firstname: 'พิมพ์ใจ',        lastname: 'สมศรี',             cohabitants: 3, cohabitantNames: JSON.stringify(['นายรังสรรค์ บุญฮุย (คู่สมรส)', 'เด็กหญิงพิชญธิดา บุญฮุย (บุตร)', 'เด็กหญิงพิชญวดี บุญฮุย (บุตร)']) },
    { houseType: 'บ้าน', num: '3',  prefix: 'นาง',    firstname: 'บุษบา',          lastname: 'อริยะคำ',           cohabitants: 3, cohabitantNames: JSON.stringify(['นายนิรันดร อริยะคำ (คู่สมรส)', 'เด็กหญิงณัฐณิชา อริยะคำ (บุตร)', 'เด็กชายนราธิป อริยะคำ (บุตร)']) },
    { houseType: 'บ้าน', num: '4',  prefix: 'นาย',    firstname: 'รณชัย',          lastname: 'วรรณรัตน์',         cohabitants: 2, cohabitantNames: JSON.stringify(['นางสาวรัชตวรรณ กวางเดินดง (คู่สมรส)', 'เด็กชายรชฏ วรรณรัตน์ (บุตร)']) },
    { houseType: 'บ้าน', num: '5',  prefix: 'นางสาว', firstname: 'ปิโยรส',         lastname: 'ใจเอื้อ',           cohabitants: 1, cohabitantNames: JSON.stringify(['นางสาวชุลีมาศ คำบุญเรือง (บุคลากร)']) },
    { houseType: 'บ้าน', num: '6',  prefix: '',       firstname: 'บ้านพักครูจีน',  lastname: '',                  cohabitants: 0, cohabitantNames: '[]' },
    { houseType: 'บ้าน', num: '7',  prefix: 'นางสาว', firstname: 'รัตนา',          lastname: 'สบายจิตร',          cohabitants: 1, cohabitantNames: JSON.stringify(['ร.ต.ท. นิวัตร สาระมนต์ (คู่สมรส)']) },
    { houseType: 'บ้าน', num: '8',  prefix: 'นาย',    firstname: 'เจษฏาวัชส์',     lastname: 'เสียงเย็น',         cohabitants: 1, cohabitantNames: JSON.stringify(['นายอดิสรณ์ ปินตามูล (บุคลากร)']) },
    { houseType: 'บ้าน', num: '9',  prefix: 'นาย',    firstname: 'พงศธร',          lastname: 'โพธิแก้ว',          cohabitants: 2, cohabitantNames: JSON.stringify(['นางเบญจมาภรณ์ โพธิแก้ว (คู่สมรส)', 'เด็กชายวาทยกร โพธิแก้ว (บุตร)']) },
    { houseType: 'บ้าน', num: '10', prefix: 'นาง',    firstname: 'จีรพา',          lastname: 'กันทา',             cohabitants: 3, cohabitantNames: JSON.stringify(['นายศิริวัฒน์ กันทา (คู่สมรส)', 'นายธรณ์เทพ กันทา (บุตร)', 'เด็กชายธีรวัฒน์ กันทา (บุตร)']) },
    { houseType: 'บ้าน', num: '11', prefix: 'น.ส.',   firstname: 'ลัดดาวัลย์',     lastname: 'บุญคุ้ม',           cohabitants: 2, cohabitantNames: JSON.stringify(['ด.ญ.ณัฏฐกานต์ นันติตานนท์ (บุตร)', 'ด.ญ.กัลยกร นันติตานนท์ (บุตร)']) },
    { houseType: 'บ้าน', num: '12', prefix: 'น.ส.',   firstname: 'ญาณกร',          lastname: 'ศรีชาติ',           cohabitants: 4, cohabitantNames: JSON.stringify(['เด็กหญิงกัญญาวีร์ หาญชนะ (บุตร)', 'นางทองศรี ศรีชาติ (มารดา)', 'นายพงษ์ศักดิ์ ศรีชาติ (บิดา)', 'นางสาวญาณกร ศรีชาติ (บุคลากร)']) },
    { houseType: 'บ้าน', num: '13', prefix: 'นาง',    firstname: 'ดารากร',         lastname: 'จางคพิเชียร',       cohabitants: 5, cohabitantNames: JSON.stringify(['นายรัฐกานท์ จางคพิเชียร (คู่สมรส)', 'นายสุข ยศวงค์ (บิดา)', 'นางสมพร ยศวงค์ (มารดา)', 'ด.ญ.พุทธิดา จางคพิเชียร (บุตร)', 'ด.ช.ชยกร จางคพิเชียร (บุตร)']) },
    { houseType: 'บ้าน', num: '14', prefix: 'นางสาว', firstname: 'เจนจิรา',        lastname: 'จันทร์หล้า',        cohabitants: 1, cohabitantNames: JSON.stringify(['เด็กชายพุทธคุณ สมบูรณ์สิริ (บุตร)']) },
    { houseType: 'บ้าน', num: '15', prefix: 'น.ส.',   firstname: 'กานท์ชญา',      lastname: 'อ่อนนวล',           cohabitants: 3, cohabitantNames: JSON.stringify(['นายชัยณรง เงินห้อย (คู่สมรส)', 'เด็กหญิงวิมลพรรณ เมืองอินทร์ (บุตร)', 'นายพันธงมิน เมืองอินทร์ (บุตร)']) },
    { houseType: 'บ้าน', num: '16', prefix: 'นาง',    firstname: 'ดวงจันทร์',      lastname: 'หลายแห่ง',          cohabitants: 3, cohabitantNames: JSON.stringify(['นายนิภทร์ หลายแห่ง (คู่สมรส)', 'เด็กชายปภินวิช หลายแห่ง (บุตร)', 'เด็กชายปภาวินท์ หลายแห่ง (บุตร)']) },
    { houseType: 'บ้าน', num: '17', prefix: 'นาย',    firstname: 'เฉลิมพล',        lastname: 'ปามา',              cohabitants: 1, cohabitantNames: JSON.stringify(['นายกัญจน์ณัฏฐ์ โลกคำลือ (บุคลากร)']) },

    // ---- แฟลต 1-16 ----
    { houseType: 'แฟลต', num: '1',  prefix: 'นาย',    firstname: 'ณัฐพงศ์',        lastname: 'คำเป็ง',            cohabitants: 0, cohabitantNames: '[]' },
    { houseType: 'แฟลต', num: '2',  prefix: 'น.ส.',   firstname: 'กันยา',          lastname: 'กันทะ',             cohabitants: 2, cohabitantNames: JSON.stringify(['นายธวัชชัย ดาก้อน (คู่สมรส)', 'นายเอกวัส ดาก้อน (บุตร)']) },
    { houseType: 'แฟลต', num: '3',  prefix: 'น.ส.',   firstname: 'ขวัญดาว',        lastname: 'วงษ์พันธ์',         cohabitants: 1, cohabitantNames: JSON.stringify(['นางสาวอรอนงค์ ยามเลย (บุคลากร)']) },
    { houseType: 'แฟลต', num: '4',  prefix: '',       firstname: 'แฟลตครูญี่ปุ่น', lastname: '',                  cohabitants: 0, cohabitantNames: '[]' },
    { houseType: 'แฟลต', num: '5',  prefix: 'นาย',    firstname: 'สุมงคล',         lastname: 'จ่อยพิรัตน์',       cohabitants: 3, cohabitantNames: JSON.stringify(['นางสาววิไลวรรณ อาซอง (คู่สมรส)', 'เด็กชายแผ่นดิน จ่อยพิรัตน์ (บุตร)', 'เด็กชายธารน้ำ จ่อยพิรัตน์ (บุตร)']) },
    { houseType: 'แฟลต', num: '6',  prefix: 'นาย',    firstname: 'ทรงศักดิ์',      lastname: 'แก้ววิลัย',         cohabitants: 1, cohabitantNames: JSON.stringify(['นายศิวดล เขื่อนแก้ว (อื่นๆ)']) },
    { houseType: 'แฟลต', num: '7',  prefix: 'นาย',    firstname: 'พงศกร',          lastname: 'หงษ์ระนัย',         cohabitants: 0, cohabitantNames: '[]' },
    { houseType: 'แฟลต', num: '8',  prefix: 'นาย',    firstname: 'พงศกร',          lastname: 'วังศิลา',           cohabitants: 1, cohabitantNames: JSON.stringify(['นายอภินันท์ ผ่องกมล (บุคลากร)']) },
    { houseType: 'แฟลต', num: '9',  prefix: 'น.ส.',   firstname: 'สุกันญา',        lastname: 'ตามสมัย',           cohabitants: 1, cohabitantNames: JSON.stringify(['น.ส.กัญนิกา สีเสน (บุคลากร)']) },
    { houseType: 'แฟลต', num: '10', prefix: 'น.ส.',   firstname: 'ดารากรณ์',       lastname: 'นาคสุกเอี่ยม',      cohabitants: 3, cohabitantNames: JSON.stringify(['เด็กหญิงอารยา ขุนมิน (บุตร)', 'เด็กหญิงนาราชา ขุนมิน (บุตร)', 'นางสาววราภรณ์ อินจันทร์ (บุคลากร)']) },
    { houseType: 'แฟลต', num: '11', prefix: 'นางสาว', firstname: 'กนกพร',          lastname: 'ภู่ปรางทอง',        cohabitants: 2, cohabitantNames: JSON.stringify(['นายรุ่นซิน หลี่ (คู่สมรส)', 'นายนิติกรณ์ ภู่ปรางทอง (พี่ชาย)']) },
    { houseType: 'แฟลต', num: '12', prefix: 'นาย',    firstname: 'ราชนุชา',        lastname: 'อินจันทร์',         cohabitants: 0, cohabitantNames: '[]' },
    { houseType: 'แฟลต', num: '13', prefix: 'น.ส.',   firstname: 'จริญญา',         lastname: 'ศิลธรรม',           cohabitants: 1, cohabitantNames: JSON.stringify(['น.ส.ปาริฉัตร์ คันธิสา (บุคลากร)']) },
    { houseType: 'แฟลต', num: '14', prefix: 'นาย',    firstname: 'จิรพันธ์',        lastname: 'จันจินะ',           cohabitants: 1, cohabitantNames: JSON.stringify(['นายอุดม พลทองมาก (บุคลากร)']) },
    { houseType: 'แฟลต', num: '15', prefix: 'นางสาว', firstname: 'รุจิรา',          lastname: 'กาจินา',            cohabitants: 0, cohabitantNames: '[]' },
    { houseType: 'แฟลต', num: '16', prefix: 'นาย',    firstname: 'จรูญพงษ์',       lastname: 'ชลสินธุ์',          cohabitants: 0, cohabitantNames: '[]' }
  ];

  var residentEntries = [];
  var occupiedHouses = [];

  for (var r = 0; r < residents.length; r++) {
    var res = residents[r];
    var houseNumber = res.houseType + ' ' + res.num;
    residentEntries.push({
      id: getNextId(ID_PREFIXES.RES),
      resident_type: 'staff',
      prefix: res.prefix,
      firstname: res.firstname,
      lastname: res.lastname,
      position: '',
      subject_group: '',
      phone: '',
      email: '',
      house_number: houseNumber,
      address_no: '', address_road: '', address_village: '',
      subdistrict: '', district: '', province: '', zipcode: '',
      move_in_date: '',
      cohabitants: res.cohabitants,
      cohabitant_names: res.cohabitantNames,
      profile_photo: '',
      status: 'active',
      created_at: now,
      updated_at: ''
    });
    occupiedHouses.push(houseNumber);
  }

  var residentResult = batchAppendRows(SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS, residentEntries);
  invalidateCache('residents');
  log.push('Residents: เพิ่ม ' + residentEntries.length + ' คน');

  // ==========================================================================
  // ส่วนที่ 3: อัปเดตสถานะบ้านพักทุกหลังเป็น occupied
  // ==========================================================================
  var updateErrors = [];
  for (var k = 0; k < occupiedHouses.length; k++) {
    try {
      updateRowInSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.HOUSING, 'display_number', occupiedHouses[k], {
        status: 'occupied',
        updated_at: now
      });
    } catch (e) {
      updateErrors.push(occupiedHouses[k] + ': ' + e.message);
    }
  }
  invalidateCache('housing');
  SpreadsheetApp.flush();
  log.push('Housing status: อัปเดต occupied ' + (occupiedHouses.length - updateErrors.length) + '/' + occupiedHouses.length + ' รายการ');

  if (updateErrors.length > 0) {
    log.push('Errors: ' + updateErrors.join(', '));
  }

  var summary = log.join(' | ');
  Logger.log('seedAllInOne: ' + summary);
  return { success: true, message: summary, housing: housingEntries.length, residents: residentEntries.length };
}

// ============================================================================
// UPDATE RESIDENTS BIRTH + EMAIL + PASSWORD — เพิ่มวันเกิด อีเมล รหัสผ่านเริ่มต้น
// ============================================================================

/**
 * อัปเดต birthdate, email ใน Residents sheet
 * สร้าง / อัปเดต User record ใน Users sheet พร้อม:
 *   - password_hash ตามรูปแบบ DDMmmYYYY (ค.ศ.) เช่น 31Dec1985
 *   - must_change_password = TRUE (บังคับเปลี่ยน login ครั้งแรก)
 *
 * ถ้า column birthdate / must_change_password ยังไม่มี → เพิ่มให้อัตโนมัติ
 * วิธีใช้: GAS Editor → เลือก updateResidentsBirthEmailPassword → ▶ Run
 */
function updateResidentsBirthEmailPassword() {
  var now = new Date().toISOString();
  var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.MAIN);

  // ===== helper: ensure column exists in sheet, return col index (0-based) =====
  function ensureColumn(sheet, colName) {
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var idx = headers.indexOf(colName);
    if (idx === -1) {
      sheet.getRange(1, headers.length + 1).setValue(colName);
      Logger.log('เพิ่มคอลัมน์ใหม่: ' + colName);
      return headers.length; // 0-based new index
    }
    return idx;
  }

  // ===== thai months =====
  var thaiMonths = ['', 'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                    'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  var engMonths  = ['', 'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // ===== convert raw "d/m/y" → { day, month, yearCE, yearBE, thaiDate, password } =====
  function parseBirth(raw) {
    if (!raw) return null;
    var parts = raw.split('/');
    if (parts.length < 3) return null;
    var d = parseInt(parts[0]);
    var m = parseInt(parts[1]);
    var y = parseInt(parts[2]);
    if (y >= 2400) y = y - 543; // BE → CE
    var yBE = y + 543;
    var thaiDate = d + ' ' + thaiMonths[m] + ' ' + yBE;
    var password  = d + engMonths[m] + y;
    return { day: d, month: m, yearCE: y, yearBE: yBE, thaiDate: thaiDate, password: password };
  }

  // ===== DATA: key = "firstname lastname" as in Residents sheet =====
  // format: { braw: "d/m/y_or_BE", email: "..." }
  // braw=null หมายถึงไม่มีข้อมูลวันเกิด (ยังไม่ได้รับ)
  var data = [
    { fn: 'พงศธร',    ln: 'โพธิแก้ว',         braw: '31/12/1985', email: 'krumum.piano@gmail.com' },
    { fn: 'ลัดดาวัลย์', ln: 'บุญคุ้ม',          braw: '9/8/1980',   email: 'laddawan.b@ppk.ac.th' },
    { fn: 'ดวงจันทร์', ln: 'หลายแห่ง',         braw: '20/7/2530',  email: 'duangjan.k@ppk.ac.th' },
    { fn: 'ดารากรณ์',  ln: 'นาคสุกเอี่ยม',      braw: '20/3/2530',  email: 'darakorn.k@ppk.ac.th' },
    { fn: 'บุษบา',     ln: 'อริยะคำ',           braw: '19/7/1986',  email: 'budsabappk885@gmail.com' },
    { fn: 'ขวัญดาว',   ln: 'วงษ์พันธ์',         braw: '8/1/1996',   email: 'khwandao.w@ppk.ac.th' },
    { fn: 'เฉลิมพล',   ln: 'ปามา',              braw: '22/12/1986', email: 'chalermpon.p@ppk.ac.th' },
    { fn: 'กานท์ชญา',  ln: 'อ่อนนวล',           braw: '7/11/1980',  email: 'ganchaya.o@ppk.ac.th' },
    { fn: 'ญาณกร',     ln: 'ศรีชาติ',           braw: '25/12/2534', email: 'yanakorn.s@ppk.ac.th' },
    { fn: 'ทรงศักดิ์',  ln: 'แก้ววิลัย',         braw: '13/1/2527',  email: 'songsak.k@ppk.ac.th' },
    { fn: 'ปิโยรส',    ln: 'ใจเอื้อ',            braw: '5/9/2529',   email: 'piyorod.j@ppk.ac.th' },
    { fn: 'รุจิรา',    ln: 'กาจินา',            braw: '20/11/1990', email: 'rujira.ka@ppk.ac.th' },
    { fn: 'ราชนุชา',   ln: 'อินจันทร์',          braw: '7/12/1974',  email: 'rachnucha.i@ppk.ac.th' },
    { fn: 'กันยา',     ln: 'กันทะ',             braw: '25/12/1978', email: 'kanya.k@ppk.ac.th' },
    { fn: 'พงศกร',     ln: 'วังศิลา',           braw: '2/11/1992',  email: 'phongsakon.wa@ppk.ac.th' },
    { fn: 'รณชัย',     ln: 'วรรณรัตน์',         braw: '13/9/1987',  email: 'ronnachai.w@ppk.ac.th' },
    { fn: 'เจษฏาวัชส์', ln: 'เสียงเย็น',          braw: '15/1/2519',  email: 'jatsatavach.s@ppk.ac.th' },
    { fn: 'รัตนา',     ln: 'สบายจิตร',          braw: '6/6/2517',   email: 'rattana.s@ppk.ac.th' },
    { fn: 'จริญญา',    ln: 'ศิลธรรม',           braw: '3/2/1992',   email: 'jarinya.s@ppk.ac.th' },
    { fn: 'พงศกร',     ln: 'หงษ์ระนัย',          braw: '12/5/2518',  email: 'pongsakorn.h@ppk.ac.th' },
    { fn: 'กนกพร',     ln: 'ภู่ปรางทอง',         braw: '4/5/2530',   email: 'kanokporn.p@ppk.ac.th' },
    { fn: 'จีรพา',     ln: 'กันทา',             braw: '7/2/1982',   email: 'jeerapa.g@ppk.ac.th' },
    { fn: 'ดารากร',    ln: 'จางคพิเชียร',        braw: '30/8/2528',  email: 'darakorn.j@ppk.ac.th' },
    { fn: 'เจนจิรา',   ln: 'จันทร์หล้า',         braw: '14/7/2526',  email: 'janejira.c@ppk.ac.th' },
    { fn: 'สุมงคล',    ln: 'จ่อยพิรัตน์',        braw: '11/4/2537',  email: 'sumongkhon@ppk.ac.th' },
    { fn: 'จรูญพงษ์',  ln: 'ชลสินธุ์',           braw: '22/3/1992',  email: 'jaroonpong.c@ppk.ac.th' },
    { fn: 'ณัฐพงศ์',   ln: 'คำเป็ง',            braw: '17/10/2537', email: 'nattapong.k@ppk.ac.th' },
    { fn: 'สุกันญา',   ln: 'ตามสมัย',           braw: '22/1/1984',  email: '' },
    { fn: 'พิมพ์ใจ',   ln: 'สมศรี',             braw: '18/9/1988',  email: 'krupimjai.s@ppk.ac.th' },
    { fn: 'จิรพันธ์',  ln: 'จันจินะ',           braw: null,         email: 'chiraphan.c@ppk.ac.th' },
    { fn: 'ณัฐพงศ์',   ln: 'คำเป็ง',            braw: '17/10/2537', email: 'nattapong.k@ppk.ac.th' } // alias สำหรับ ณัฐพงษ์
  ];

  // deduplicate by fn+ln
  var seen = {};
  data = data.filter(function(d) {
    var k = d.fn + '|' + d.ln;
    if (seen[k]) return false;
    seen[k] = true;
    return true;
  });

  // ===== Open Residents sheet =====
  var resSheet = ss.getSheetByName(SHEET_NAMES.RESIDENTS);
  if (!resSheet) return { success: false, error: 'ไม่พบชีท Residents' };

  // Ensure birthdate column
  var bdColIdx = ensureColumn(resSheet, 'birthdate');

  var resData = resSheet.getDataRange().getValues();
  var resHeaders = resData[0];
  var resFnIdx      = resHeaders.indexOf('firstname');
  var resLnIdx      = resHeaders.indexOf('lastname');
  var resEmailIdx   = resHeaders.indexOf('email');
  var resUpdIdx     = resHeaders.indexOf('updated_at');
  // Re-read bdColIdx in case header row changed
  bdColIdx = resHeaders.indexOf('birthdate');
  if (bdColIdx === -1) {
    // Was just added — re-read
    var freshHeaders = resSheet.getRange(1, 1, 1, resSheet.getLastColumn()).getValues()[0];
    bdColIdx = freshHeaders.indexOf('birthdate');
  }

  // ===== Open Users sheet =====
  var usersSheet = ss.getSheetByName(SHEET_NAMES.USERS);
  if (!usersSheet) return { success: false, error: 'ไม่พบชีท Users' };

  // Ensure must_change_password column
  var mcpColIdx = ensureColumn(usersSheet, 'must_change_password');

  var usersData = usersSheet.getDataRange().getValues();
  var usersHeaders = usersData[0];
  var uEmailIdx    = usersHeaders.indexOf('email');
  var uPassIdx     = usersHeaders.indexOf('password_hash');
  var uActiveIdx   = usersHeaders.indexOf('is_active');
  var uRoleIdx     = usersHeaders.indexOf('role');
  var uIdIdx       = usersHeaders.indexOf('id');
  var uResIdIdx    = usersHeaders.indexOf('resident_id');
  // Re-read mcpColIdx
  mcpColIdx = usersHeaders.indexOf('must_change_password');
  if (mcpColIdx === -1) {
    var freshU = usersSheet.getRange(1, 1, 1, usersSheet.getLastColumn()).getValues()[0];
    mcpColIdx = freshU.indexOf('must_change_password');
  }

  var resUpdated   = 0;
  var usersUpdated = 0;
  var usersCreated = 0;
  var errors       = [];

  for (var i = 0; i < data.length; i++) {
    var entry = data[i];
    var birth = parseBirth(entry.braw);
    var emailLower = (entry.email || '').toLowerCase().trim();

    // --- Find resident row ---
    var resRowIdx = -1;
    for (var r = 1; r < resData.length; r++) {
      var fn = (resData[r][resFnIdx] || '').trim();
      var ln = (resData[r][resLnIdx] || '').trim();
      if (fn === entry.fn && ln === entry.ln) {
        resRowIdx = r;
        break;
      }
    }

    if (resRowIdx === -1) {
      errors.push('ไม่พบ: ' + entry.fn + ' ' + entry.ln);
      continue;
    }

    // Update Residents: birthdate + email
    if (birth && bdColIdx >= 0) {
      resSheet.getRange(resRowIdx + 1, bdColIdx + 1).setValue(birth.thaiDate);
    }
    if (emailLower && resEmailIdx >= 0) {
      resSheet.getRange(resRowIdx + 1, resEmailIdx + 1).setValue(emailLower);
    }
    if (resUpdIdx >= 0) {
      resSheet.getRange(resRowIdx + 1, resUpdIdx + 1).setValue(now);
    }
    resUpdated++;

    // --- Only process password if we have email AND birthdate ---
    if (!emailLower || !birth) continue;

    var passwordRaw = birth.password; // เช่น "31Dec1985"
    var passwordHash = hashPassword(passwordRaw);

    // Find User by email
    var userRowIdx = -1;
    // Re-read Users data (in case changed)
    for (var u = 1; u < usersData.length; u++) {
      var uEmail = (usersData[u][uEmailIdx] || '').toLowerCase().trim();
      if (uEmail === emailLower) {
        userRowIdx = u;
        break;
      }
    }

    if (userRowIdx !== -1) {
      // Update existing user
      usersSheet.getRange(userRowIdx + 1, uPassIdx + 1).setValue(passwordHash);
      if (mcpColIdx >= 0) {
        usersSheet.getRange(userRowIdx + 1, mcpColIdx + 1).setValue('TRUE');
      }
      usersUpdated++;
    } else {
      // Create new User record
      var resId  = (resData[resRowIdx][resHeaders.indexOf('id')] || '').trim();
      var newUid = getNextId(ID_PREFIXES.USR || 'USR');
      var newRow = usersHeaders.map(function(h) {
        if (h === 'id')                  return newUid;
        if (h === 'email')               return emailLower;
        if (h === 'phone')               return '';
        if (h === 'password_hash')       return passwordHash;
        if (h === 'resident_id')         return resId;
        if (h === 'role')                return 'user';
        if (h === 'is_active')           return 'TRUE';
        if (h === 'pdpa_consent')        return 'TRUE';
        if (h === 'last_login')          return '';
        if (h === 'created_at')          return now;
        if (h === 'must_change_password') return 'TRUE';
        return '';
      });
      usersSheet.appendRow(newRow);
      // push to local copy to avoid duplicates in same run
      usersData.push(newRow);
      usersCreated++;
    }
  }

  invalidateCache('residents');
  invalidateCache('users');
  SpreadsheetApp.flush();

  var summary = 'Residents อัปเดต ' + resUpdated + ' | Users อัปเดต ' + usersUpdated + ' สร้างใหม่ ' + usersCreated;
  if (errors.length) summary += ' | ไม่พบ: ' + errors.join(', ');
  Logger.log('updateResidentsBirthEmailPassword: ' + summary);
  return { success: true, message: summary };
}

// ============================================================================
// END OF SCRIPT — v2.0
// ============================================================================
// ⚠️ หมายเหตุ:
//   ฟังก์ชัน doGet, doPost, readSheetData, appendRowToSheet, updateRowInSheet,
//   deleteRowFromSheet, handleLogin, handleRegister, handleSubmitSlip,
//   handleSubmitRequest, getSettings, getHousing, getResidents, generateId
//   ถูกลบออกจากไฟล์นี้แล้ว (S0-1)
//   → ฟังก์ชันเหล่านี้จะอยู่ในไฟล์ Backend แยก: Main.gs, Database.gs, Auth.gs ฯลฯ
// ============================================================================
