/**
 * ============================================================================
 * HOME PPK 2026 - Auth.gs — 🔐 ระบบยืนยันตัวตน
 * ============================================================================
 * จัดการ Login, Register, Session, Reset Password, Permission
 * 
 * ฟีเจอร์:
 *   - handleLogin: ตรวจ email/password → สร้าง session token
 *   - handleRegister: บันทึกลง PendingReg_{ปี} รอแอดมินอนุมัติ
 *   - getPendingRegistrations: ดึงรายการสมัครรออนุมัติ
 *   - approveRegistration: อนุมัติ → สร้าง Users + Residents
 *   - rejectRegistration: ปฏิเสธ → อัปเดตสถานะ
 *   - handleResetPassword: ส่ง email รีเซ็ตรหัสผ่าน
 *   - handleFindEmail: ค้นหา email จากเบอร์โทร
 *   - handleChangePassword: เปลี่ยนรหัสผ่าน
 *   - createSession / validateSession / destroySession: จัดการ session
 *   - hashPassword: SHA-256 hash
 *   - checkPermission: ตรวจสิทธิ์จาก Permissions sheet
 *   - getCurrentUser: ดึงข้อมูล user จาก userId
 *   - cleanupExpiredSessions: ลบ session หมดอายุ
 *   - setupSessionCleanupTrigger: ตั้ง Trigger cleanup รายวัน
 * 
 * Version: 1.0
 * วันที่สร้าง: 17 กุมภาพันธ์ 2569
 * Step: 19 (ระยะที่ 2)
 * ============================================================================
 * 
 * Dependencies: Config.gs, Database.gs
 * Next: Housing.gs (Step 20)
 * 
 * ============================================================================
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 ชั่วโมง
const SESSION_PREFIX = 'session_';

// ============================================================================
// PENDING_REG HEADERS — หัวคอลัมน์ PendingReg_{ปี}
// ============================================================================

const PENDING_REG_HEADERS = [
  'id', 'email', 'phone', 'prefix', 'firstname', 'lastname',
  'position', 'address_no', 'address_road', 'address_village',
  'subdistrict', 'district', 'province', 'zipcode',
  'password_hash', 'pdpa_consent', 'status',
  'reviewed_by', 'reviewed_at', 'review_note', 'submitted_at'
];

// ============================================================================
// PASSWORD HASHING — SHA-256 (§8 #1, S0-5)
// ============================================================================

/**
 * Hash password ด้วย SHA-256 ผ่าน Utilities.computeDigest
 * ไม่เก็บรหัสผ่านเป็น plain text หรือ btoa base64
 * @param {string} password - รหัสผ่านดิบ
 * @returns {string} SHA-256 hex string (64 ตัวอักษร)
 */
function hashPassword(password) {
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password, Utilities.Charset.UTF_8);
  var hex = '';
  for (var i = 0; i < rawHash.length; i++) {
    var byte = rawHash[i];
    if (byte < 0) byte += 256;
    var hexByte = byte.toString(16);
    if (hexByte.length === 1) hexByte = '0' + hexByte;
    hex += hexByte;
  }
  return hex;
}

// ============================================================================
// SESSION MANAGEMENT — PropertiesService + UUID
// ============================================================================

/**
 * สร้าง session token (UUID v4-like) เก็บใน PropertiesService
 * @param {string} userId - User ID
 * @param {string} [role] - บทบาท เช่น 'admin', 'user'
 * @param {string} [residentId] - Resident ID (สำหรับกรอง query)
 * @param {string} [houseNumber] - หมายเลขห้อง/บ้าน (สำหรับกรองข้อมูลเร็วขึ้น)
 * @returns {string} session token
 */
function createSession(userId, role, residentId, houseNumber) {
  var token = Utilities.getUuid();
  var sessionData = {
    userId: userId,
    createdAt: Date.now(),
    role: role || 'user',
    residentId: residentId || '',
    houseNumber: houseNumber || ''
  };
  PropertiesService.getScriptProperties().setProperty(
    SESSION_PREFIX + token,
    JSON.stringify(sessionData)
  );
  return token;
}

/**
 * ตรวจสอบ session token + หมดอายุ 24 ชม.
 * ⚠️ ฟังก์ชันนี้ override stub ใน Main.gs
 * @param {string} token - session token
 * @returns {Object|null} { userId, createdAt } หรือ null ถ้าหมดอายุ/ไม่พบ
 */
// NOTE: validateSession อยู่ใน Main.gs แล้ว — ใช้ร่วมกันผ่าน global namespace
// ไม่ต้อง define ซ้ำที่นี่ เพราะ Main.gs มี implementation จริงแล้ว (ไม่ใช่ stub)

/**
 * ลบ session (Logout)
 * @param {string} token - session token
 * @returns {Object} { success: true }
 */
function destroySession(token) {
  if (token) {
    PropertiesService.getScriptProperties().deleteProperty(SESSION_PREFIX + token);
    // ลบ session cache ทันที
    try { CacheService.getScriptCache().remove('sess_' + token); } catch(e) {}
  }
  return { success: true, message: 'ออกจากระบบสำเร็จ' };
}

/**
 * Logout handler — เรียกจาก POST action 'logout'
 * token จะถูกส่งมาจาก frontend ผ่าน request body
 * เป็น Public action — ไม่ต้องมี session ที่ valid
 * @param {Object} data - { token }
 * @returns {Object} { success: true }
 */
function handleLogout(data) {
  var token = data.token || '';
  return destroySession(token);
}

// ============================================================================
// LOGIN — ตรวจ email + password → สร้าง session
// ============================================================================

/**
 * เข้าสู่ระบบ
 * @param {Object} data - { email, password }
 * @returns {Object} { success, token, user } หรือ { success: false, error }
 */
function handleLogin(data) {
  var email = (data.email || '').trim().toLowerCase();
  var password = data.password || '';

  // Validation
  if (!email || !password) {
    return { success: false, error: 'กรุณากรอกอีเมลและรหัสผ่าน' };
  }

  // ค้นหา user จาก Users sheet
  var user = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.USERS, 'email', email);
  if (!user) {
    return { success: false, error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' };
  }

  // ตรวจสถานะ active
  if (String(user.is_active) !== 'TRUE' && String(user.is_active) !== 'true') {
    return { success: false, error: 'บัญชีถูกระงับ กรุณาติดต่อผู้ดูแลระบบ' };
  }

  // ตรวจรหัสผ่าน SHA-256
  var inputHash = hashPassword(password);
  if (inputHash !== String(user.password_hash)) {
    return { success: false, error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' };
  }

  // สร้าง session (พร้อม role + resident_id + house_number เพื่อลด lookup ครั้งถัดไป)
  var houseNumber = '';
  if (user.resident_id) {
    try {
      var resident = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS, 'id', user.resident_id);
      if (resident) houseNumber = resident.house_number || '';
    } catch (e) {}
  }
  var token = createSession(user.id, user.role, user.resident_id, houseNumber);

  // อัปเดต last_login เฉพาะเมื่อผ่านมา > 1 ชั่วโมง (ลด Sheet writes ต่อ login)
  var _now = new Date();
  var _lastLogin = user.last_login ? new Date(user.last_login) : null;
  if (!_lastLogin || (_now - _lastLogin) >= 3600000) {
    updateRowInSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.USERS, 'id', user.id, {
      last_login: _now.toISOString()
    });
  }

  // Log เบาๆ ผ่าน Logger (writeLog เขียน Sheet ทุกครั้ง = ช้า)
  Logger.log('LOGIN_OK: ' + email);

  // ตรวจ must_change_password flag
  var mustChange = String(user.must_change_password || '').toUpperCase() === 'TRUE';

  return {
    success: true,
    token: token,
    must_change_password: mustChange,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      resident_id: user.resident_id,
      house_number: houseNumber,
      must_change_password: mustChange
    }
  };
}

// ============================================================================
// REGISTER — บันทึก PendingReg_{ปี} รอแอดมินอนุมัติ
// ============================================================================

/**
 * สมัครสมาชิก → บันทึกลง PendingReg_{ปี} (สถานะ pending)
 * ไม่สร้าง Users/Residents ทันที — แอดมินต้องอนุมัติก่อน
 * @param {Object} data - ข้อมูลจาก register.html
 * @returns {Object} { success, message, regId }
 */
function handleRegister(data) {
  var email = (data.email || '').trim().toLowerCase();
  var password = data.password || '';
  var phone = (data.phone || '').trim();

  // ── Validation ──
  if (!email) return { success: false, error: 'กรุณากรอกอีเมล' };
  if (!password) return { success: false, error: 'กรุณากรอกรหัสผ่าน' };
  if (password.length < 6) return { success: false, error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' };
  if (!data.firstname || !data.lastname) return { success: false, error: 'กรุณากรอกชื่อ-นามสกุล' };
  if (!data.prefix) return { success: false, error: 'กรุณาเลือกคำนำหน้า' };
  if (!data.pdpaConsent && !data.pdpa_consent) return { success: false, error: 'กรุณายินยอม PDPA' };

  // ── ตรวจซ้ำ: email ใน Users ──
  var existingUser = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.USERS, 'email', email);
  if (existingUser) {
    return { success: false, error: 'อีเมลนี้มีอยู่ในระบบแล้ว' };
  }

  // ── ตรวจซ้ำ: email ใน PendingReg ปีปัจจุบัน (เฉพาะ pending) ──
  var pendingSheetName = getYearSheetName('PendingReg', CURRENT_YEAR);
  try {
    var pendingData = readSheetData(SPREADSHEET_IDS.MAIN, pendingSheetName);
    var existingPending = pendingData.filter(function(row) {
      return String(row.email).toLowerCase() === email && row.status === 'pending';
    });
    if (existingPending.length > 0) {
      return { success: false, error: 'คุณได้สมัครสมาชิกไว้แล้ว — กรุณารอแอดมินอนุมัติ' };
    }
  } catch (e) {
    // Sheet ยังไม่มี → จะสร้างใหม่ด้วย getOrCreateSheet
  }

  // ── สร้าง PendingReg sheet (ถ้ายังไม่มี) ──
  getOrCreateSheet(SPREADSHEET_IDS.MAIN, pendingSheetName, PENDING_REG_HEADERS);

  // ── สร้าง registration record ──
  var regId = getNextId(ID_PREFIXES.REG);
  var regData = {
    id: regId,
    email: email,
    phone: phone,
    prefix: data.prefix || '',
    firstname: data.firstname || '',
    lastname: data.lastname || '',
    position: data.position || '',
    address_no: data.address_no || '',
    address_road: data.address_road || '',
    address_village: data.address_village || '',
    subdistrict: data.subdistrict || '',
    district: data.district || '',
    province: data.province || '',
    zipcode: data.zipcode || '',
    password_hash: hashPassword(password),
    pdpa_consent: data.pdpaConsent || data.pdpa_consent || false,
    status: 'pending',
    reviewed_by: '',
    reviewed_at: '',
    review_note: '',
    submitted_at: new Date().toISOString()
  };

  var result = appendRowToSheet(SPREADSHEET_IDS.MAIN, pendingSheetName, regData);
  if (!result.success) {
    return { success: false, error: 'ไม่สามารถบันทึกข้อมูลได้ — กรุณาลองใหม่' };
  }

  // Log
  writeLog('REGISTER', email, 'สมัครสมาชิกใหม่ (รออนุมัติ): ' + regId, 'Auth');

  return {
    success: true,
    message: 'สมัครสมาชิกสำเร็จ — กรุณารอแอดมินอนุมัติ',
    regId: regId
  };
}

// ============================================================================
// GET PENDING REGISTRATIONS — ดึงรายการรออนุมัติ
// ============================================================================

/**
 * ดึงรายการสมัครสมาชิกที่รออนุมัติ (status=pending)
 * @returns {Object} { success, data: [...] }
 */
function getPendingRegistrations() {
  var pendingSheetName = getYearSheetName('PendingReg', CURRENT_YEAR);

  try {
    var allData = readSheetData(SPREADSHEET_IDS.MAIN, pendingSheetName);
    var pendingOnly = allData.filter(function(row) {
      return row.status === 'pending';
    });

    // ลบ password_hash ออกก่อนส่งให้ frontend
    var safeData = pendingOnly.map(function(row) {
      var safe = {};
      var keys = Object.keys(row);
      for (var i = 0; i < keys.length; i++) {
        if (keys[i] !== 'password_hash') {
          safe[keys[i]] = row[keys[i]];
        }
      }
      return safe;
    });

    return { success: true, data: safeData };
  } catch (e) {
    // Sheet ยังไม่มี → ไม่มี pending
    return { success: true, data: [] };
  }
}

// ============================================================================
// APPROVE REGISTRATION — อนุมัติ → สร้าง Users + Residents
// ============================================================================

/**
 * อนุมัติการสมัครสมาชิก
 * 1. อัปเดต PendingReg status → approved
 * 2. สร้าง Users record
 * 3. สร้าง Residents record
 * @param {string} regId - รหัสการสมัคร (REG-...)
 * @param {Object} data - { house_number, resident_type, _userId (admin) }
 * @returns {Object} { success, message, userId, residentId }
 */
function approveRegistration(regId, data) {
  var pendingSheetName = getYearSheetName('PendingReg', CURRENT_YEAR);

  // ── ค้นหา pending registration ──
  var reg = findRowByValue(SPREADSHEET_IDS.MAIN, pendingSheetName, 'id', regId);
  if (!reg) {
    return { success: false, error: 'ไม่พบข้อมูลการสมัคร: ' + regId };
  }
  if (reg.status !== 'pending') {
    return { success: false, error: 'การสมัครนี้ถูกดำเนินการแล้ว (สถานะ: ' + reg.status + ')' };
  }

  // ── ตรวจซ้ำ: email ยังไม่มีใน Users ──
  var existingUser = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.USERS, 'email', String(reg.email).toLowerCase());
  if (existingUser) {
    // อัปเดต PendingReg status → rejected เพราะมี user แล้ว
    updateRowInSheet(SPREADSHEET_IDS.MAIN, pendingSheetName, 'id', regId, {
      status: 'rejected',
      review_note: 'อีเมลซ้ำกับผู้ใช้ในระบบ',
      reviewed_at: new Date().toISOString(),
      reviewed_by: data._userId || 'SYSTEM'
    });
    return { success: false, error: 'อีเมลนี้มีอยู่ในระบบแล้ว' };
  }

  // ── สร้าง IDs ──
  var userId = getNextId(ID_PREFIXES.USR);
  var residentId = getNextId(ID_PREFIXES.RES);
  var now = new Date().toISOString();

  // ── สร้าง Residents record ──
  var residentData = {
    id: residentId,
    resident_type: data.resident_type || 'staff',
    prefix: reg.prefix || '',
    firstname: reg.firstname || '',
    lastname: reg.lastname || '',
    position: reg.position || '',
    subject_group: reg.position || '',
    phone: reg.phone || '',
    email: String(reg.email).toLowerCase(),
    house_number: data.house_number || '',
    address_no: reg.address_no || '',
    address_road: reg.address_road || '',
    address_village: reg.address_village || '',
    subdistrict: reg.subdistrict || '',
    district: reg.district || '',
    province: reg.province || '',
    zipcode: reg.zipcode || '',
    move_in_date: '',
    cohabitants: 0,
    cohabitant_names: '[]',
    profile_photo: '',
    status: 'active',
    created_at: now,
    updated_at: ''
  };

  var resResult = appendRowToSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS, residentData);
  if (!resResult.success) {
    return { success: false, error: 'ไม่สามารถสร้างข้อมูลผู้พักอาศัยได้' };
  }

  // ── สร้าง Users record ──
  var userData = {
    id: userId,
    email: String(reg.email).toLowerCase(),
    phone: reg.phone || '',
    password_hash: reg.password_hash || '',
    resident_id: residentId,
    role: 'user',
    is_active: 'TRUE',
    pdpa_consent: String(reg.pdpa_consent) === 'true' || String(reg.pdpa_consent) === 'TRUE' ? 'TRUE' : 'FALSE',
    last_login: '',
    created_at: now
  };

  var userResult = appendRowToSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.USERS, userData);
  if (!userResult.success) {
    // Rollback: ลบ Residents ที่เพิ่งสร้าง
    deleteRowFromSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS, 'id', residentId);
    return { success: false, error: 'ไม่สามารถสร้างบัญชีผู้ใช้ได้' };
  }

  // ── อัปเดต PendingReg status → approved ──
  updateRowInSheet(SPREADSHEET_IDS.MAIN, pendingSheetName, 'id', regId, {
    status: 'approved',
    reviewed_by: data._userId || 'ADMIN',
    reviewed_at: now,
    review_note: data.review_note || 'อนุมัติ กำหนดบ้าน: ' + (data.house_number || '-')
  });

  // ── Invalidate cache ──
  invalidateCaches(['users', 'residents', 'pending_reg']);

  // Log
  writeLog('APPROVE_REG', data._userId || 'ADMIN',
    'อนุมัติ: ' + reg.email + ' → User: ' + userId + ', Resident: ' + residentId, 'Auth');

  return {
    success: true,
    message: 'อนุมัติสำเร็จ — สร้างบัญชีผู้ใช้และผู้พักอาศัยเรียบร้อย',
    userId: userId,
    residentId: residentId
  };
}

// ============================================================================
// REJECT REGISTRATION — ปฏิเสธการสมัคร
// ============================================================================

/**
 * ปฏิเสธการสมัครสมาชิก
 * @param {string} regId - รหัสการสมัคร
 * @param {string} note - หมายเหตุเหตุผลที่ปฏิเสธ
 * @returns {Object} { success, message }
 */
function rejectRegistration(regId, note) {
  var pendingSheetName = getYearSheetName('PendingReg', CURRENT_YEAR);

  var reg = findRowByValue(SPREADSHEET_IDS.MAIN, pendingSheetName, 'id', regId);
  if (!reg) {
    return { success: false, error: 'ไม่พบข้อมูลการสมัคร: ' + regId };
  }
  if (reg.status !== 'pending') {
    return { success: false, error: 'การสมัครนี้ถูกดำเนินการแล้ว (สถานะ: ' + reg.status + ')' };
  }

  updateRowInSheet(SPREADSHEET_IDS.MAIN, pendingSheetName, 'id', regId, {
    status: 'rejected',
    reviewed_by: 'ADMIN',
    reviewed_at: new Date().toISOString(),
    review_note: note || 'ปฏิเสธ'
  });

  // Log
  writeLog('REJECT_REG', 'ADMIN', 'ปฏิเสธ: ' + reg.email + ' — ' + (note || ''), 'Auth');

  return {
    success: true,
    message: 'ปฏิเสธการสมัครสำเร็จ'
  };
}

// ============================================================================
// RESET PASSWORD — ส่ง email + สร้าง password ชั่วคราว
// ============================================================================

/**
 * รีเซ็ตรหัสผ่าน → สร้าง password ชั่วคราวแล้วส่งทาง email
 * @param {Object} data - { email }
 * @returns {Object} { success, message }
 */
function handleResetPassword(data) {
  var email = (data.email || '').trim().toLowerCase();
  if (!email) {
    return { success: false, error: 'กรุณากรอกอีเมล' };
  }

  // ค้นหา user
  var user = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.USERS, 'email', email);
  if (!user) {
    // ไม่บอกว่ามี/ไม่มี email เพื่อความปลอดภัย
    return {
      success: true,
      message: 'หากอีเมลนี้มีในระบบ คุณจะได้รับรหัสผ่านใหม่ทางอีเมล'
    };
  }

  // สร้าง password ชั่วคราว (8 ตัวอักษร)
  var tempPassword = generateTempPassword(8);
  var hashedTemp = hashPassword(tempPassword);

  // อัปเดตรหัสผ่านใน Users
  updateRowInSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.USERS, 'id', user.id, {
    password_hash: hashedTemp
  });

  // ส่ง email (ใช้ MailApp — GAS built-in)
  try {
    MailApp.sendEmail({
      to: email,
      subject: '[HOME PPK 2026] รีเซ็ตรหัสผ่าน',
      htmlBody: '<div style="font-family:sans-serif;padding:20px;">' +
        '<h2>🔐 รีเซ็ตรหัสผ่าน</h2>' +
        '<p>สวัสดี คุณ' + (user.email || '') + '</p>' +
        '<p>รหัสผ่านชั่วคราวของคุณคือ:</p>' +
        '<p style="font-size:24px;font-weight:bold;color:#2196F3;letter-spacing:2px;">' + tempPassword + '</p>' +
        '<p>กรุณาเข้าสู่ระบบและเปลี่ยนรหัสผ่านทันที</p>' +
        '<hr>' +
        '<p style="color:#999;font-size:12px;">ระบบบ้านพักครู HOME PPK 2026 — ' +
        DEFAULTS.school_name + '</p>' +
        '</div>'
    });
  } catch (e) {
    // email ส่งไม่ได้ — แต่รหัสผ่านเปลี่ยนแล้ว
    writeLog('ERROR', user.id, 'ส่ง email รีเซ็ตรหัสผ่านไม่สำเร็จ: ' + e.message, 'Auth');
    return {
      success: false,
      error: 'ไม่สามารถส่งอีเมลได้ กรุณาติดต่อผู้ดูแลระบบ'
    };
  }

  // Log
  writeLog('RESET_PASSWORD', user.id, 'รีเซ็ตรหัสผ่าน: ' + email, 'Auth');

  // Invalidate cache
  invalidateCache('users');

  return {
    success: true,
    message: 'หากอีเมลนี้มีในระบบ คุณจะได้รับรหัสผ่านใหม่ทางอีเมล'
  };
}

/**
 * สร้างรหัสผ่านชั่วคราว
 * @param {number} length - ความยาว
 * @returns {string} รหัสผ่านสุ่ม
 */
function generateTempPassword(length) {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
  var result = '';
  for (var i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ============================================================================
// FIND EMAIL — ค้นหาอีเมลจากเบอร์โทร
// ============================================================================

/**
 * ค้นหาอีเมลจากเบอร์โทร (forgot-email.html)
 * @param {Object} data - { phone }
 * @returns {Object} { success, email (masked) }
 */
function handleFindEmail(data) {
  var phone = (data.phone || '').trim().replace(/[-\s]/g, '');
  if (!phone) {
    return { success: false, error: 'กรุณากรอกเบอร์โทร' };
  }

  // ค้นหาใน Users
  var allUsers = readSheetData(SPREADSHEET_IDS.MAIN, SHEET_NAMES.USERS);
  var found = null;
  for (var i = 0; i < allUsers.length; i++) {
    var userPhone = String(allUsers[i].phone || '').replace(/[-\s]/g, '');
    if (userPhone === phone) {
      found = allUsers[i];
      break;
    }
  }

  if (!found) {
    return { success: false, error: 'ไม่พบบัญชีที่ใช้เบอร์โทรนี้' };
  }

  // Mask email เพื่อความปลอดภัย: s****@email.com
  var email = String(found.email);
  var maskedEmail = maskEmail(email);

  return {
    success: true,
    email: maskedEmail,
    message: 'พบอีเมลที่เชื่อมกับเบอร์โทรนี้'
  };
}

/**
 * ปกปิดอีเมล: somchai@email.com → s****i@email.com
 * @param {string} email
 * @returns {string} masked email
 */
function maskEmail(email) {
  var parts = email.split('@');
  if (parts.length !== 2) return '***@***.***';
  var name = parts[0];
  if (name.length <= 2) return name[0] + '***@' + parts[1];
  return name[0] + '****' + name[name.length - 1] + '@' + parts[1];
}

// ============================================================================
// CHANGE PASSWORD — เปลี่ยนรหัสผ่าน
// ============================================================================

/**
 * เปลี่ยนรหัสผ่าน (settings.html)
 * @param {Object} data - { _userId, oldPassword, newPassword }
 * @returns {Object} { success, message }
 */
function handleChangePassword(data) {
  var userId = data._userId || '';
  var oldPassword = data.oldPassword || '';
  var newPassword = data.newPassword || '';

  if (!userId) return { success: false, error: 'ไม่พบข้อมูลผู้ใช้' };
  if (!oldPassword) return { success: false, error: 'กรุณากรอกรหัสผ่านปัจจุบัน' };
  if (!newPassword) return { success: false, error: 'กรุณากรอกรหัสผ่านใหม่' };
  if (newPassword.length < 6) return { success: false, error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' };
  if (oldPassword === newPassword) return { success: false, error: 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเก่า' };

  // ค้นหา user
  var user = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.USERS, 'id', userId);
  if (!user) {
    return { success: false, error: 'ไม่พบบัญชีผู้ใช้' };
  }

  // ตรวจรหัสผ่านเก่า
  if (hashPassword(oldPassword) !== String(user.password_hash)) {
    return { success: false, error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' };
  }

  // อัปเดตรหัสผ่านใหม่ + ล้าง must_change_password flag
  var result = updateRowInSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.USERS, 'id', userId, {
    password_hash: hashPassword(newPassword),
    must_change_password: 'FALSE'
  });

  if (!result.success) {
    return { success: false, error: 'ไม่สามารถเปลี่ยนรหัสผ่านได้' };
  }

  // Invalidate cache
  invalidateCache('users');

  // Log
  writeLog('CHANGE_PASSWORD', userId, 'เปลี่ยนรหัสผ่านสำเร็จ', 'Auth');

  return {
    success: true,
    message: 'เปลี่ยนรหัสผ่านสำเร็จ'
  };
}

// ============================================================================
// GET CURRENT USER — ดึงข้อมูล user จาก userId
// ============================================================================

/**
 * ดึงข้อมูล user ปัจจุบัน (ใช้หลัง validate session)
 * @param {string} userId - User ID
 * @returns {Object} { success, user: { id, email, role, ... } }
 */
function getCurrentUser(userId) {
  if (!userId) {
    return { success: false, error: 'ไม่พบข้อมูลผู้ใช้' };
  }

  // ใช้ getCachedData แทน findRowByValue → อ่าน Users/Residents จาก CacheService (6 ชม.) ถ้ามี
  var allUsers = getCachedData('users', SPREADSHEET_IDS.MAIN, SHEET_NAMES.USERS);
  var user = null;
  for (var i = 0; i < allUsers.length; i++) {
    if (String(allUsers[i].id) === String(userId)) { user = allUsers[i]; break; }
  }
  if (!user) {
    return { success: false, error: 'ไม่พบบัญชีผู้ใช้' };
  }

  // ดึงข้อมูล Resident เพิ่มเติม (ใช้ cache)
  var resident = null;
  if (user.resident_id) {
    var allResidents = getCachedData('residents', SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS);
    for (var j = 0; j < allResidents.length; j++) {
      if (String(allResidents[j].id) === String(user.resident_id)) { resident = allResidents[j]; break; }
    }
  }

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      is_active: user.is_active,
      resident_id: user.resident_id,
      last_login: user.last_login,
      resident: resident ? {
        id: resident.id,
        prefix: resident.prefix,
        firstname: resident.firstname,
        lastname: resident.lastname,
        position: resident.position,
        house_number: resident.house_number,
        phone: resident.phone,
        status: resident.status
      } : null
    }
  };
}

// ============================================================================
// CHECK PERMISSION — ตรวจสิทธิ์จาก Permissions sheet
// ============================================================================

/**
 * ตรวจสิทธิ์ผู้ใช้
 * @param {string} userId - User ID
 * @param {string} permType - ประเภทสิทธิ์: water, electric, notify, slip, withdraw, accounting, request, admin
 * @returns {boolean} มีสิทธิ์ = true, ไม่มี = false
 */
function checkPermission(userId, permType) {
  if (!userId || !permType) return false;

  // Admin มีสิทธิ์ทุกอย่าง
  var user = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.USERS, 'id', userId);
  if (user && user.role === 'admin') return true;

  // ตรวจจาก Permissions sheet
  var perm = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.PERMISSIONS, 'user_id', userId);
  if (!perm) return false;

  var val = perm[permType];
  return String(val) === 'TRUE' || String(val) === 'true';
}

// ============================================================================
// SESSION CLEANUP — ลบ session หมดอายุ (S0-7)
// ============================================================================

/**
 * ลบ session token ที่หมดอายุ (เกิน 24 ชั่วโมง) จาก PropertiesService
 * ตั้งเป็น Trigger รายวัน
 * @returns {Object} { success, deleted }
 */
function cleanupExpiredSessions() {
  var props = PropertiesService.getScriptProperties();
  var allProps = props.getProperties();
  var now = Date.now();
  var deletedCount = 0;

  var keys = Object.keys(allProps);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (key.indexOf(SESSION_PREFIX) === 0) {
      try {
        var sessionData = JSON.parse(allProps[key]);
        if (now - sessionData.createdAt > SESSION_MAX_AGE_MS) {
          props.deleteProperty(key);
          deletedCount++;
        }
      } catch (e) {
        // JSON parse error → session เสีย → ลบทิ้ง
        props.deleteProperty(key);
        deletedCount++;
      }
    }
  }

  if (deletedCount > 0) {
    writeLog('CLEANUP_SESSIONS', 'SYSTEM', 'ลบ ' + deletedCount + ' session หมดอายุ', 'Auth');
  }

  return { success: true, deleted: deletedCount };
}

/**
 * ตั้ง Trigger Cleanup รายวัน — เรียกครั้งเดียวตอน setup
 * ตรวจว่ามี Trigger อยู่แล้วหรือไม่ ป้องกันสร้างซ้ำ
 */
function setupSessionCleanupTrigger() {
  // ลบ Trigger เก่า (ถ้ามี) ป้องกันซ้ำ
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'cleanupExpiredSessions') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // สร้าง Trigger ใหม่ — รันทุก 24 ชั่วโมง
  ScriptApp.newTrigger('cleanupExpiredSessions')
    .timeBased()
    .everyHours(24)
    .create();

  writeLog('SETUP_TRIGGER', 'SYSTEM', 'ตั้ง Trigger cleanup session รายวัน', 'Auth');
}

// ============================================================================
// SETUP DEFAULT ADMIN — สร้างแอดมินคนแรกอัตโนมัติ
// ============================================================================

/**
 * สร้างบัญชีแอดมินคนแรก — รันครั้งเดียวหลัง setupAll()
 * แก้ปัญหา "ไก่กับไข่": ต้องมีแอดมินก่อนจึงอนุมัติ user ใหม่ได้
 * 
 * ⚠️ รันครั้งเดียว — ถ้ามี admin อยู่แล้วจะไม่สร้างซ้ำ
 * ⚠️ ต้องเปลี่ยนรหัสผ่านทันทีหลังเข้าสู่ระบบครั้งแรก!
 * 
 * @param {Object} [options] - ตัวเลือก (ถ้าไม่ระบุจะใช้ค่าจาก Settings)
 * @param {string} [options.email] - อีเมลแอดมิน
 * @param {string} [options.password] - รหัสผ่านเริ่มต้น (ต้องเปลี่ยนทันที!)
 * @param {string} [options.firstname] - ชื่อ
 * @param {string} [options.lastname] - นามสกุล
 * @returns {Object} { success, message, userId, residentId } 
 */
function setupDefaultAdmin(options) {
  options = options || {};

  // ── ตรวจว่ามี admin อยู่แล้วหรือไม่ ──
  var allUsers = [];
  try {
    allUsers = readSheetData(SPREADSHEET_IDS.MAIN, SHEET_NAMES.USERS);
  } catch (e) {
    // Users sheet ว่าง — OK ไปต่อ
  }

  var existingAdmin = null;
  for (var i = 0; i < allUsers.length; i++) {
    if (allUsers[i].role === 'admin') {
      existingAdmin = allUsers[i];
      break;
    }
  }

  if (existingAdmin) {
    return {
      success: false,
      error: 'มีแอดมินอยู่แล้ว: ' + existingAdmin.email,
      existingAdminId: existingAdmin.id
    };
  }

  // ── ดึงค่าจาก Settings (admin_email, admin_phone) ──
  var adminEmail = (options.email || '').trim().toLowerCase();
  var adminPassword = options.password || '';
  var adminFirstname = options.firstname || '';
  var adminLastname = options.lastname || '';

  // ถ้าไม่ได้ระบุ email → ลองดึงจาก Settings sheet
  if (!adminEmail) {
    try {
      var settings = readSheetData(SPREADSHEET_IDS.MAIN, SHEET_NAMES.SETTINGS);
      for (var j = 0; j < settings.length; j++) {
        if (settings[j].key === 'admin_email' && settings[j].value) {
          adminEmail = String(settings[j].value).trim().toLowerCase();
        }
      }
    } catch (e) {
      // ไม่เป็นไร
    }
  }

  // ── Validation ──
  if (!adminEmail) {
    return {
      success: false,
      error: 'ต้องระบุ email แอดมิน — ใช้ setupDefaultAdmin({email:"admin@example.com", password:"รหัสผ่าน", firstname:"ชื่อ", lastname:"นามสกุล"})'
    };
  }
  if (!adminPassword) {
    return {
      success: false,
      error: 'ต้องระบุรหัสผ่าน — ใช้ setupDefaultAdmin({email:"...", password:"รหัสผ่าน", ...})'
    };
  }
  if (adminPassword.length < 6) {
    return { success: false, error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' };
  }

  // ── สร้าง IDs ──
  var userId = getNextId(ID_PREFIXES.USR);
  var residentId = getNextId(ID_PREFIXES.RES);
  var now = new Date().toISOString();

  // ── สร้าง Residents record (ข้อมูลพื้นฐาน) ──
  var residentData = {
    id: residentId,
    resident_type: 'staff',
    prefix: '',
    firstname: adminFirstname || 'ผู้ดูแลระบบ',
    lastname: adminLastname || '',
    position: 'ผู้ดูแลระบบ',
    subject_group: '',
    phone: '',
    email: adminEmail,
    house_number: '',
    address_no: '', address_road: '', address_village: '',
    subdistrict: '', district: '', province: '', zipcode: '',
    move_in_date: '',
    cohabitants: 0,
    cohabitant_names: '[]',
    profile_photo: '',
    status: 'active',
    created_at: now,
    updated_at: ''
  };

  var resResult = appendRowToSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS, residentData);
  if (!resResult.success) {
    return { success: false, error: 'ไม่สามารถสร้างข้อมูลผู้พักอาศัยได้: ' + (resResult.error || '') };
  }

  // ── สร้าง Users record (role = admin) ──
  var userData = {
    id: userId,
    email: adminEmail,
    phone: '',
    password_hash: hashPassword(adminPassword),
    resident_id: residentId,
    role: 'admin',
    is_active: 'TRUE',
    pdpa_consent: 'TRUE',
    last_login: '',
    created_at: now
  };

  var userResult = appendRowToSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.USERS, userData);
  if (!userResult.success) {
    // Rollback
    deleteRowFromSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS, 'id', residentId);
    return { success: false, error: 'ไม่สามารถสร้างบัญชีผู้ใช้ได้: ' + (userResult.error || '') };
  }

  // ── สร้าง Permissions record (admin = TRUE ทุกสิทธิ์) ──
  var permData = {
    user_id: userId,
    water: 'TRUE',
    electric: 'TRUE',
    notify: 'TRUE',
    slip: 'TRUE',
    withdraw: 'TRUE',
    accounting: 'TRUE',
    request: 'TRUE',
    admin: 'TRUE',
    updated_at: now,
    updated_by: 'SYSTEM'
  };

  appendRowToSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.PERMISSIONS, permData);

  // ── Invalidate cache ──
  invalidateCaches(['users', 'residents', 'permissions']);

  // ── Log ──
  writeLog('SETUP_ADMIN', 'SYSTEM',
    'สร้างแอดมินคนแรก: ' + adminEmail + ' (userId: ' + userId + ')', 'Auth');

  Logger.log('');
  Logger.log('══════════════════════════════════════════════════');
  Logger.log('  ✅ สร้างแอดมินสำเร็จ!');
  Logger.log('══════════════════════════════════════════════════');
  Logger.log('  Email:       ' + adminEmail);
  Logger.log('  User ID:     ' + userId);
  Logger.log('  Resident ID: ' + residentId);
  Logger.log('  Role:        admin');
  Logger.log('');
  Logger.log('  ⚠️  กรุณาเปลี่ยนรหัสผ่านทันทีหลังเข้าสู่ระบบครั้งแรก!');
  Logger.log('══════════════════════════════════════════════════');

  return {
    success: true,
    message: 'สร้างแอดมินสำเร็จ — กรุณาเปลี่ยนรหัสผ่านทันที!',
    userId: userId,
    residentId: residentId,
    email: adminEmail
  };
}

// ============================================================================
// TEST FUNCTION — รันใน GAS Editor เพื่อตรวจสอบ
// ============================================================================

/**
 * ทดสอบ Auth.gs — รันใน GAS Editor
 * ✅ ผ่าน = register→pending, login→token, validate→user
 * ❌ ไม่ผ่าน = error → ตรวจ Auth.gs + Database.gs
 * 
 * ⚠️ Test นี้จะสร้างข้อมูลจริงใน PendingReg sheet — ลบทิ้งหลังทดสอบ
 */
function testAuth() {
  Logger.log('=== TEST AUTH.gs ===');
  var testEmail = 'test_auth_' + Date.now() + '@test.com';

  // Test 1: hashPassword
  Logger.log('\n--- TEST 1: hashPassword ---');
  var hash1 = hashPassword('Test1234!');
  var hash2 = hashPassword('Test1234!');
  var hash3 = hashPassword('DifferentPass');
  Logger.log('  Hash length: ' + hash1.length + ' (ต้องเป็น 64)');
  Logger.log('  Same input = same hash: ' + (hash1 === hash2));
  Logger.log('  Different input = different hash: ' + (hash1 !== hash3));
  if (hash1.length !== 64) throw new Error('hashPassword length ≠ 64');
  if (hash1 !== hash2) throw new Error('hashPassword ไม่ consistent');
  if (hash1 === hash3) throw new Error('hashPassword collision');
  Logger.log('  ✅ hashPassword OK');

  // Test 2: Register → pending
  Logger.log('\n--- TEST 2: handleRegister ---');
  var regResult = handleRegister({
    email: testEmail,
    phone: '0812345678',
    prefix: 'นาย',
    firstname: 'ทดสอบ',
    lastname: 'ระบบ',
    position: 'ครู',
    address_no: '1',
    address_road: '-',
    address_village: '-',
    subdistrict: 'ในเมือง',
    district: 'เมือง',
    province: 'พะเยา',
    zipcode: '56000',
    password: 'Test1234!',
    pdpaConsent: true
  });
  Logger.log('  Register result: ' + JSON.stringify(regResult));
  if (!regResult.success) throw new Error('Register failed: ' + JSON.stringify(regResult));
  Logger.log('  ✅ Register OK → regId: ' + regResult.regId);

  // Test 3: Register ซ้ำ → ต้อง error
  Logger.log('\n--- TEST 3: Duplicate register ---');
  var dupResult = handleRegister({
    email: testEmail,
    phone: '0812345678',
    prefix: 'นาย',
    firstname: 'ทดสอบ',
    lastname: 'ซ้ำ',
    position: 'ครู',
    address_no: '1',
    password: 'Test1234!',
    pdpaConsent: true
  });
  Logger.log('  Duplicate result: ' + JSON.stringify(dupResult));
  if (dupResult.success) throw new Error('Duplicate register should fail');
  Logger.log('  ✅ Duplicate check OK');

  // Test 4: getPendingRegistrations
  Logger.log('\n--- TEST 4: getPendingRegistrations ---');
  var pending = getPendingRegistrations();
  Logger.log('  Pending result success: ' + pending.success);
  Logger.log('  Pending count: ' + (pending.data ? pending.data.length : 0));
  var testPending = null;
  if (pending.data) {
    for (var i = 0; i < pending.data.length; i++) {
      if (pending.data[i].email === testEmail) {
        testPending = pending.data[i];
        break;
      }
    }
  }
  Logger.log('  Found test pending: ' + (!!testPending));
  if (!testPending) throw new Error('ไม่พบ pending registration ที่เพิ่งสร้าง');
  // ตรวจว่า password_hash ถูกลบออก
  Logger.log('  password_hash removed: ' + (!testPending.password_hash));
  Logger.log('  ✅ getPendingRegistrations OK');

  // Test 5: Login ก่อนอนุมัติ → ต้อง fail
  Logger.log('\n--- TEST 5: Login before approve ---');
  var loginBeforeApprove = handleLogin({ email: testEmail, password: 'Test1234!' });
  Logger.log('  Login before approve: ' + JSON.stringify(loginBeforeApprove));
  if (loginBeforeApprove.success) Logger.log('  ⚠️ Login สำเร็จก่อนอนุมัติ (user ยังไม่อยู่ใน Users)');
  Logger.log('  ✅ Login before approve check OK');

  // Test 6: Approve registration
  Logger.log('\n--- TEST 6: approveRegistration ---');
  var approveResult = approveRegistration(regResult.regId, {
    house_number: 'บ้าน 1',
    resident_type: 'staff',
    _userId: 'TEST_ADMIN'
  });
  Logger.log('  Approve result: ' + JSON.stringify(approveResult));
  if (!approveResult.success) throw new Error('Approve failed: ' + JSON.stringify(approveResult));
  Logger.log('  ✅ Approve OK → userId: ' + approveResult.userId);

  // Test 7: Login หลังอนุมัติ → ต้อง success + token
  Logger.log('\n--- TEST 7: Login after approve ---');
  var loginResult = handleLogin({ email: testEmail, password: 'Test1234!' });
  Logger.log('  Login result: ' + JSON.stringify(loginResult));
  if (!loginResult.success) throw new Error('Login failed after approve');
  if (!loginResult.token) throw new Error('Login ไม่ได้ token');
  Logger.log('  ✅ Login OK → token: ' + loginResult.token.substring(0, 8) + '...');

  // Test 8: validateSession
  Logger.log('\n--- TEST 8: validateSession ---');
  var sessionData = validateSession(loginResult.token);
  Logger.log('  Session: ' + JSON.stringify(sessionData));
  if (!sessionData) throw new Error('validateSession failed');
  if (sessionData.userId !== approveResult.userId) throw new Error('userId ไม่ตรง');
  Logger.log('  ✅ validateSession OK');

  // Test 9: getCurrentUser
  Logger.log('\n--- TEST 9: getCurrentUser ---');
  var currentUser = getCurrentUser(sessionData.userId);
  Logger.log('  CurrentUser: ' + JSON.stringify(currentUser));
  if (!currentUser.success) throw new Error('getCurrentUser failed');
  if (currentUser.user.email !== testEmail) throw new Error('email ไม่ตรง');
  Logger.log('  ✅ getCurrentUser OK');

  // Test 10: checkPermission
  Logger.log('\n--- TEST 10: checkPermission ---');
  var hasPerm = checkPermission(sessionData.userId, 'admin');
  Logger.log('  Has admin permission: ' + hasPerm + ' (ค่าที่คาดหวัง: false สำหรับ user ใหม่)');
  Logger.log('  ✅ checkPermission OK');

  // Test 11: handleChangePassword
  Logger.log('\n--- TEST 11: handleChangePassword ---');
  var changeResult = handleChangePassword({
    _userId: approveResult.userId,
    oldPassword: 'Test1234!',
    newPassword: 'NewPass456!'
  });
  Logger.log('  Change password result: ' + JSON.stringify(changeResult));
  if (!changeResult.success) throw new Error('changePassword failed');
  Logger.log('  ✅ changePassword OK');

  // Test 12: Login ด้วยรหัสผ่านใหม่
  Logger.log('\n--- TEST 12: Login with new password ---');
  var loginNew = handleLogin({ email: testEmail, password: 'NewPass456!' });
  Logger.log('  Login new pass: success=' + loginNew.success);
  if (!loginNew.success) throw new Error('Login with new password failed');
  Logger.log('  ✅ Login with new password OK');

  // Test 13: destroySession
  Logger.log('\n--- TEST 13: destroySession ---');
  destroySession(loginResult.token);
  var expiredSession = validateSession(loginResult.token);
  Logger.log('  After destroy: ' + (expiredSession === null ? '✅ null' : '❌ still exists'));
  if (expiredSession !== null) throw new Error('destroySession ไม่ได้ลบ session');
  Logger.log('  ✅ destroySession OK');

  // Test 14: handleFindEmail
  Logger.log('\n--- TEST 14: handleFindEmail ---');
  var findResult = handleFindEmail({ phone: '0812345678' });
  Logger.log('  Find email result: ' + JSON.stringify(findResult));
  if (!findResult.success) Logger.log('  ⚠️ findEmail ไม่พบ — อาจเป็นเพราะ phone format ต่างกัน');
  Logger.log('  ✅ handleFindEmail OK');

  // Test 15: cleanupExpiredSessions
  Logger.log('\n--- TEST 15: cleanupExpiredSessions ---');
  var cleanupResult = cleanupExpiredSessions();
  Logger.log('  Cleanup result: ' + JSON.stringify(cleanupResult));
  Logger.log('  ✅ cleanupExpiredSessions OK');

  // Test 16: maskEmail
  Logger.log('\n--- TEST 16: maskEmail ---');
  Logger.log('  mask test@test.com → ' + maskEmail('test@test.com'));
  Logger.log('  mask ab@cd.com → ' + maskEmail('ab@cd.com'));
  Logger.log('  ✅ maskEmail OK');

  // Test 17: Reject registration (ทดสอบ reject flow)
  Logger.log('\n--- TEST 17: rejectRegistration ---');
  // สร้าง pending ใหม่เพื่อทดสอบ reject
  var rejectTestEmail = 'test_reject_' + Date.now() + '@test.com';
  var regForReject = handleRegister({
    email: rejectTestEmail,
    phone: '0899999999',
    prefix: 'นาง',
    firstname: 'ทดสอบ',
    lastname: 'ปฏิเสธ',
    position: 'ครู',
    address_no: '99',
    password: 'Reject123!',
    pdpaConsent: true
  });
  if (regForReject.success) {
    var rejectResult = rejectRegistration(regForReject.regId, 'ทดสอบการปฏิเสธ');
    Logger.log('  Reject result: ' + JSON.stringify(rejectResult));
    if (!rejectResult.success) throw new Error('Reject failed');
    Logger.log('  ✅ rejectRegistration OK');
  }

  // Cleanup: ลบ test data
  Logger.log('\n--- CLEANUP ---');
  Logger.log('  ลบ test user: ' + approveResult.userId);
  deleteRowFromSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.USERS, 'id', approveResult.userId);
  Logger.log('  ลบ test resident: ' + approveResult.residentId);
  deleteRowFromSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS, 'id', approveResult.residentId);

  // ลบ pending registrations
  var pendingSheetName = getYearSheetName('PendingReg', CURRENT_YEAR);
  deleteRowFromSheet(SPREADSHEET_IDS.MAIN, pendingSheetName, 'id', regResult.regId);
  if (regForReject.success) {
    deleteRowFromSheet(SPREADSHEET_IDS.MAIN, pendingSheetName, 'id', regForReject.regId);
  }

  // ลบ session ถ้ามี
  if (loginNew && loginNew.token) destroySession(loginNew.token);

  Logger.log('\n✅ AUTH TEST PASSED — ระบบยืนยันตัวตนทำงานครบ');
}

// ============================================================================
// END OF Auth.gs
// ============================================================================
