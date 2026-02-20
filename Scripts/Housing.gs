/**
 * ============================================================================
 * HOME PPK 2026 - Housing.gs — 🏠 บ้านพักและผู้พักอาศัย
 * ============================================================================
 * จัดการข้อมูลบ้านพัก, ผู้พักอาศัย, ผู้ร่วมพัก, ตั้งค่าระบบ, ประกาศ,
 * สิทธิ์การเข้าถึง, ระเบียบ PDF
 * 
 * ฟีเจอร์:
 *   - Housing CRUD: getHousingList, addHousing, updateHousing, deleteHousing
 *   - Residents CRUD: getResidentsList, addResident, updateResident, removeResident
 *   - Profile: getUserProfile, handleUpdateProfile
 *   - Coresidents: getCoresidents, addCoresident, updateCoresident, removeCoresident
 *   - Settings: getSettings, handleUpdateSettings
 *   - Announcements: getAnnouncements, handleAddAnnouncement, deleteAnnouncement
 *   - Permissions: getPermissions, updatePermissions
 *   - Housing Format: getHousingFormat, saveHousingFormat
 *   - WaterRate: (ย้ายไป Billing.gs แล้ว — ใช้ getWaterRate() จาก Billing.gs)
 *   - Available Housing: getAvailableHousing
 *   - Regulations PDF: getRegulationsPdf, uploadRegulationsPdf
 *   - Export/Import: exportResidents, importResidents
 * 
 * Version: 1.0
 * วันที่สร้าง: 17 กุมภาพันธ์ 2569
 * Step: 20 (ระยะที่ 2)
 * ============================================================================
 * 
 * Dependencies: Config.gs, Database.gs
 * Next: Billing.gs (Step 21)
 * 
 * ============================================================================
 */

// ============================================================================
// HOUSING — CRUD บ้านพัก
// ============================================================================

/**
 * ดึงรายการบ้านพักทั้งหมด (ใช้ cache)
 * @returns {Object} { success, data: [...] }
 */
function getHousingList() {
  var data = getCachedData('housing', SPREADSHEET_IDS.MAIN, SHEET_NAMES.HOUSING);

  // Auto-cleanup: ลบรายการที่ display_number ไม่ตรงรูปแบบ "บ้าน N" / "แฟลต N"
  var validPattern = /^(บ้าน|แฟลต) \d+$/;
  var invalid = data.filter(function(row) {
    var dn = String(row.display_number || '').trim();
    return dn && !validPattern.test(dn);
  });

  if (invalid.length > 0) {
    invalid.forEach(function(row) {
      try { deleteRowFromSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.HOUSING, 'id', row.id); } catch(e) {}
    });
    invalidateCache('housing');
    data = getCachedData('housing', SPREADSHEET_IDS.MAIN, SHEET_NAMES.HOUSING);
    Logger.log('getHousingList: auto-removed ' + invalid.length + ' duplicate entries');
  }

  return { success: true, data: data };
}

/**
 * ดึงบ้านว่าง (status=available)
 * @returns {Object} { success, data: [...] }
 */
function getAvailableHousing() {
  var all = getCachedData('housing', SPREADSHEET_IDS.MAIN, SHEET_NAMES.HOUSING);
  var available = all.filter(function(row) {
    return row.status === 'available';
  });
  return { success: true, data: available };
}

/**
 * เพิ่มบ้านพักใหม่
 * @param {Object} data - { type, number, zone, status, note }
 * @returns {Object} { success, message, id }
 */
function addHousing(data) {
  // Validation
  if (!data.type) return { success: false, error: 'กรุณาระบุประเภทบ้านพัก (house/flat)' };
  if (!data.number) return { success: false, error: 'กรุณาระบุหมายเลขบ้าน/ห้อง' };

  // สร้าง display_number อัตโนมัติ
  var prefix = data.type === 'flat' ? DEFAULTS.flat_prefix : DEFAULTS.house_prefix;
  var displayNumber = data.display_number || (prefix + ' ' + data.number);

  // ตรวจซ้ำ
  var existing = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.HOUSING, 'display_number', displayNumber);
  if (existing) {
    return { success: false, error: 'บ้านพัก "' + displayNumber + '" มีในระบบแล้ว' };
  }

  var id = getNextId(ID_PREFIXES.HOU);
  var now = new Date().toISOString();

  var housingData = {
    id: id,
    type: data.type,
    number: data.number,
    display_number: displayNumber,
    zone: data.zone || '',
    status: data.status || 'available',
    note: data.note || '',
    created_at: now,
    updated_at: ''
  };

  var result = appendRowToSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.HOUSING, housingData);
  if (!result.success) {
    return { success: false, error: 'ไม่สามารถเพิ่มบ้านพักได้' };
  }

  // Invalidate cache
  invalidateCache('housing');

  // Log
  writeLog('ADD_HOUSING', data._userId || 'ADMIN', 'เพิ่มบ้านพัก: ' + displayNumber, 'Housing');

  return { success: true, message: 'เพิ่มบ้านพักสำเร็จ', id: id };
}

/**
 * แก้ไขข้อมูลบ้านพัก
 * @param {string} id - Housing ID
 * @param {Object} data - ข้อมูลที่ต้องการแก้
 * @returns {Object} { success, message }
 */
function updateHousing(id, data) {
  if (!id) return { success: false, error: 'กรุณาระบุ ID บ้านพัก' };

  // สร้าง display_number ถ้ามี type + number
  var updateData = {};
  var keys = Object.keys(data);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (k !== 'id' && k !== '_userId') {
      updateData[k] = data[k];
    }
  }

  // ถ้าเปลี่ยน type หรือ number → อัปเดต display_number
  if (data.type && data.number) {
    var prefix = data.type === 'flat' ? DEFAULTS.flat_prefix : DEFAULTS.house_prefix;
    updateData.display_number = data.display_number || (prefix + ' ' + data.number);
  }

  updateData.updated_at = new Date().toISOString();

  var result = updateRowInSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.HOUSING, 'id', id, updateData);
  if (!result.success) {
    return result;
  }

  // Invalidate cache
  invalidateCache('housing');

  // Log
  writeLog('UPDATE_HOUSING', data._userId || 'ADMIN', 'แก้ไขบ้านพัก: ' + id, 'Housing');

  return { success: true, message: 'แก้ไขบ้านพักสำเร็จ' };
}

/**
 * ลบบ้านพัก
 * @param {string} id - Housing ID
 * @returns {Object} { success, message }
 */
function deleteHousing(id) {
  if (!id) return { success: false, error: 'กรุณาระบุ ID บ้านพัก' };

  // ตรวจว่ามีผู้พักอาศัยอยู่หรือไม่
  var housing = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.HOUSING, 'id', id);
  if (!housing) {
    // ไม่พบใน sheet (อาจถูกลบไปแล้ว) — ถือว่าลบสำเร็จ
    invalidateCache('housing');
    return { success: true, message: 'ลบบ้านพักสำเร็จ (ไม่มีในชีท)' };
  }

  // อนุญาตให้ลบได้แม้มีผู้พักอาศัยอยู่ (frontend จะแจ้งเตือนผู้ใช้ก่อนแล้ว)
  var result = deleteRowFromSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.HOUSING, 'id', id);
  if (!result.success) {
    return result;
  }

  // Invalidate cache
  invalidateCache('housing');

  // Log
  writeLog('DELETE_HOUSING', 'ADMIN', 'ลบบ้านพัก: ' + (housing.display_number || id), 'Housing');

  return { success: true, message: 'ลบบ้านพักสำเร็จ' };
}

// ============================================================================
// RESIDENTS — CRUD ผู้พักอาศัย
// ============================================================================

/**
 * ดึงรายการผู้พักอาศัยทั้งหมด (ใช้ cache)
 * @returns {Object} { success, data: [...] }
 */
function getResidentsList() {
  var data = getCachedData('residents', SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS);
  return { success: true, data: data };
}

/**
 * เพิ่มผู้พักอาศัยใหม่
 * @param {Object} data - ข้อมูลผู้พักอาศัย
 * @returns {Object} { success, message, id }
 */
function addResident(data) {
  if (!data.firstname || !data.lastname) {
    return { success: false, error: 'กรุณากรอกชื่อ-นามสกุล' };
  }

  var id = getNextId(ID_PREFIXES.RES);
  var now = new Date().toISOString();

  var residentData = {
    id: id,
    resident_type: data.resident_type || data.residentType || 'staff',
    prefix: data.prefix || '',
    firstname: data.firstname || '',
    lastname: data.lastname || '',
    position: data.position || '',
    subject_group: data.subject_group || data.position || '',
    phone: data.phone || '',
    email: data.email || '',
    house_number: data.house_number || '',
    address_no: data.address_no || '',
    address_road: data.address_road || '',
    address_village: data.address_village || '',
    subdistrict: data.subdistrict || '',
    district: data.district || '',
    province: data.province || '',
    zipcode: data.zipcode || '',
    move_in_date: data.move_in_date || '',
    cohabitants: data.cohabitants || 0,
    cohabitant_names: data.cohabitant_names || '[]',
    profile_photo: data.profile_photo || '',
    status: data.status || 'active',
    created_at: now,
    updated_at: ''
  };

  // ถ้าเป็น staff → อัปเดตสถานะบ้านเป็น occupied
  if (residentData.resident_type === 'staff' && residentData.house_number) {
    _updateHousingStatus(residentData.house_number, 'occupied');
  }

  var result = appendRowToSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS, residentData);
  if (!result.success) {
    return { success: false, error: 'ไม่สามารถเพิ่มผู้พักอาศัยได้' };
  }

  // ถ้ามี password → สร้าง Users record ด้วย
  if (data.password) {
    var userId = getNextId(ID_PREFIXES.USR);
    var userData = {
      id: userId,
      email: (data.email || '').trim().toLowerCase(),
      phone: data.phone || '',
      password_hash: hashPassword(data.password),
      resident_id: id,
      role: data.role || 'user',
      is_active: 'TRUE',
      pdpa_consent: 'TRUE',
      last_login: '',
      created_at: now
    };
    appendRowToSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.USERS, userData);
    invalidateCache('users');
  }

  // Invalidate cache
  invalidateCache('residents');

  // Log
  writeLog('ADD_RESIDENT', data._userId || 'ADMIN',
    'เพิ่มผู้พัก: ' + (data.prefix || '') + (data.firstname || '') + ' ' + (data.lastname || ''),
    'Housing');

  return { success: true, message: 'เพิ่มผู้พักอาศัยสำเร็จ', id: id };
}

/**
 * แก้ไขข้อมูลผู้พักอาศัย
 * @param {string} id - Resident ID
 * @param {Object} data - ข้อมูลที่ต้องการแก้
 * @returns {Object} { success, message }
 */
function updateResident(id, data) {
  if (!id) return { success: false, error: 'กรุณาระบุ ID ผู้พักอาศัย' };

  var updateData = {};
  var keys = Object.keys(data);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (k !== 'id' && k !== '_userId' && k !== 'password') {
      updateData[k] = data[k];
    }
  }

  updateData.updated_at = new Date().toISOString();

  var result = updateRowInSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS, 'id', id, updateData);
  if (!result.success) {
    return result;
  }

  // ถ้ามี password → อัปเดต Users ด้วย
  if (data.password) {
    var user = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.USERS, 'resident_id', id);
    if (user) {
      updateRowInSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.USERS, 'id', user.id, {
        password_hash: hashPassword(data.password)
      });
      invalidateCache('users');
    }
  }

  // Invalidate cache
  invalidateCache('residents');

  // Log
  writeLog('UPDATE_RESIDENT', data._userId || 'ADMIN', 'แก้ไขผู้พัก: ' + id, 'Housing');

  return { success: true, message: 'แก้ไขผู้พักอาศัยสำเร็จ' };
}

/**
 * ย้ายบ้านผู้พักอาศัย
 * @param {string} id - Resident ID
 * @param {string} newHouse - เลขบ้านใหม่
 * @returns {Object} { success, message }
 */
function moveResident(id, newHouse) {
  if (!id) return { success: false, error: 'กรุณาระบุ ID ผู้พักอาศัย' };
  if (!newHouse) return { success: false, error: 'กรุณาระบุบ้านปลายทาง' };

  var resident = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS, 'id', id);
  if (!resident) {
    return { success: false, error: 'ไม่พบผู้พักอาศัย ID: ' + id };
  }

  var oldHouse = resident.house_number;

  // อัปเดตบ้านใหม่
  var result = updateRowInSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS, 'id', id, {
    house_number: newHouse,
    updated_at: new Date().toISOString()
  });

  if (!result.success) {
    return result;
  }

  // อัปเดตสถานะบ้านเก่า (ถ้าไม่มีคนอยู่แล้ว)
  if (oldHouse) {
    _checkAndUpdateHousingStatus(oldHouse);
  }

  // อัปเดตสถานะบ้านใหม่
  _updateHousingStatus(newHouse, 'occupied');

  // Invalidate cache
  invalidateCaches(['residents', 'housing']);

  // Log
  writeLog('MOVE_RESIDENT', 'ADMIN',
    'ย้ายบ้าน: ' + id + ' จาก ' + oldHouse + ' ไป ' + newHouse, 'Housing');

  return { success: true, message: 'ย้ายบ้านสำเร็จ' };
}

/**
 * ลบผู้พักอาศัย
 * @param {string} id - Resident ID
 * @returns {Object} { success, message }
 */
function removeResident(id) {
  if (!id) return { success: false, error: 'กรุณาระบุ ID ผู้พักอาศัย' };

  var resident = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS, 'id', id);
  if (!resident) {
    // ไม่พบใน sheet (อาจถูกลบไปแล้ว) — ถือว่าลบสำเร็จ
    invalidateCache('residents');
    return { success: true, message: 'ลบผู้พักอาศัยสำเร็จ (ไม่มีในชีท)' };
  }

  var houseNumber = resident.house_number;

  // ลบ Resident
  var result = deleteRowFromSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS, 'id', id);
  if (!result.success) {
    return result;
  }

  // ลบ User ที่เชื่อมกัน (ถ้ามี)
  var user = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.USERS, 'resident_id', id);
  if (user) {
    deleteRowFromSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.USERS, 'id', user.id);
    // ลบ Permissions (ถ้ามี)
    var perm = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.PERMISSIONS, 'user_id', user.id);
    if (perm) {
      deleteRowFromSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.PERMISSIONS, 'user_id', user.id);
    }
    invalidateCaches(['users', 'permissions']);
  }

  // ลบ co-residents (ผู้ร่วมพักที่เชื่อมกับ resident นี้)
  // ผู้ร่วมพักเก็บเป็น JSON ใน cohabitant_names → ไม่ต้องลบแถวแยก
  // แต่ถ้ามี resident_type=cohabitant ที่ house_number เดียวกัน → ไม่ลบอัตโนมัติ

  // อัปเดตสถานะบ้าน (ถ้าไม่มีคนอยู่แล้ว)
  if (houseNumber) {
    _checkAndUpdateHousingStatus(houseNumber);
  }

  // Invalidate cache
  invalidateCache('residents');

  // Log
  writeLog('REMOVE_RESIDENT', 'ADMIN',
    'ลบผู้พัก: ' + (resident.prefix || '') + (resident.firstname || '') + ' ' + (resident.lastname || ''),
    'Housing');

  return { success: true, message: 'ลบผู้พักอาศัยสำเร็จ' };
}

// ============================================================================
// PROFILE — โปรไฟล์ผู้ใช้
// ============================================================================

/**
 * ดึงโปรไฟล์ user
 * @param {string} userId - User ID
 * @returns {Object} { success, user, resident }
 */
function getUserProfile(userId) {
  if (!userId) {
    return { success: false, error: 'ไม่พบข้อมูลผู้ใช้' };
  }

  var user = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.USERS, 'id', userId);
  if (!user) {
    return { success: false, error: 'ไม่พบบัญชีผู้ใช้' };
  }

  var resident = null;
  if (user.resident_id) {
    resident = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS, 'id', user.resident_id);
  }

  // ลบ password_hash ก่อนส่ง
  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      is_active: user.is_active,
      resident_id: user.resident_id,
      last_login: user.last_login
    },
    resident: resident || null
  };
}

/**
 * อัปเดตโปรไฟล์ (settings.html)
 * @param {Object} data - { _userId, phone, position, subject_group, address_*, profilePhoto, ... }
 * @returns {Object} { success, message }
 */
function handleUpdateProfile(data) {
  var userId = data._userId || '';
  if (!userId) return { success: false, error: 'ไม่พบข้อมูลผู้ใช้' };

  // ดึง user เพื่อหา resident_id
  var user = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.USERS, 'id', userId);
  if (!user) return { success: false, error: 'ไม่พบบัญชีผู้ใช้' };

  // ── อัปเดต Residents ──
  if (user.resident_id) {
    var residentUpdate = {};
    var profileFields = [
      'prefix', 'firstname', 'lastname', 'position', 'subject_group',
      'phone', 'email', 'address_no', 'address_road', 'address_village',
      'subdistrict', 'district', 'province', 'zipcode',
      'move_in_date', 'profile_photo', 'cohabitants', 'cohabitant_names'
    ];

    for (var i = 0; i < profileFields.length; i++) {
      var field = profileFields[i];
      // รองรับทั้ง snake_case และ camelCase จาก frontend
      var camelField = _snakeToCamel(field);
      if (data[field] !== undefined) {
        residentUpdate[field] = data[field];
      } else if (data[camelField] !== undefined) {
        residentUpdate[field] = data[camelField];
      }
    }

    if (Object.keys(residentUpdate).length > 0) {
      residentUpdate.updated_at = new Date().toISOString();
      updateRowInSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS, 'id', user.resident_id, residentUpdate);
    }
  }

  // ── อัปเดต Users (phone, email) ──
  var userUpdate = {};
  if (data.phone !== undefined) userUpdate.phone = data.phone;
  if (data.email !== undefined) userUpdate.email = data.email;
  if (Object.keys(userUpdate).length > 0) {
    updateRowInSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.USERS, 'id', userId, userUpdate);
  }

  // Invalidate cache
  invalidateCaches(['residents', 'users']);

  // Log
  writeLog('UPDATE_PROFILE', userId, 'อัปเดตโปรไฟล์', 'Housing');

  return { success: true, message: 'อัปเดตโปรไฟล์สำเร็จ' };
}

// ============================================================================
// CORESIDENTS — ผู้ร่วมพัก
// ============================================================================

/**
 * ดึงผู้ร่วมพัก (จาก cohabitant_names ของ resident หลัก)
 * @param {string} residentId - Resident ID ของผู้พักหลัก
 * @returns {Object} { success, data: [...] }
 */
function getCoresidents(residentId) {
  if (!residentId) return { success: false, error: 'กรุณาระบุ Resident ID' };

  var resident = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS, 'id', residentId);
  if (!resident) {
    return { success: false, error: 'ไม่พบผู้พักอาศัย' };
  }

  var coresidents = [];
  try {
    var raw = resident.cohabitant_names || '[]';
    coresidents = JSON.parse(String(raw));
  } catch (e) {
    coresidents = [];
  }

  return { success: true, data: coresidents };
}

/**
 * ดึงผู้ร่วมพักอาศัยที่เป็นบุคลากรโรงเรียน (is_ppk_staff === true) ทั้งหมดในระบบ
 * สแกนทุก Resident แล้วรวบรวม coresidents ที่มี is_ppk_staff === true
 * @returns {Object} { success, data: [...] }
 */
function getStaffCoresidents() {
  var residents = readSheetData(SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS);
  var staffList = [];
  for (var i = 0; i < residents.length; i++) {
    var resident = residents[i];
    var cohabitants = [];
    try {
      cohabitants = JSON.parse(String(resident.cohabitant_names || '[]'));
    } catch (e) { cohabitants = []; }
    for (var j = 0; j < cohabitants.length; j++) {
      if (cohabitants[j].is_ppk_staff === true) {
        staffList.push({
          id: cohabitants[j].id || '',
          house_number: resident.house_number || '',
          resident_name: (resident.prefix || '') + (resident.firstname || '') + ' ' + (resident.lastname || ''),
          prefix: cohabitants[j].prefix || '',
          firstname: cohabitants[j].firstname || cohabitants[j].name || '',
          lastname: cohabitants[j].lastname || '',
          phone: cohabitants[j].phone || '',
          email: cohabitants[j].email || '',
          position: cohabitants[j].position || '',
          subject_group: cohabitants[j].subject_group || '',
          relation: cohabitants[j].relation || cohabitants[j].status || ''
        });
      }
    }
  }
  return { success: true, data: staffList };
}

/**
 * เพิ่มผู้ร่วมพัก
 * @param {Object} data - { _userId, name, relation }
 * @returns {Object} { success, message }
 */
function addCoresident(data) {
  var userId = data._userId || '';
  if (!userId) return { success: false, error: 'ไม่พบข้อมูลผู้ใช้' };

  // รองรับทั้ง firstname/lastname แยก และ name เดี่ยว
  var firstname = data.firstname || data.name || '';
  var lastname  = data.lastname || '';
  if (!firstname) return { success: false, error: 'กรุณาระบุชื่อผู้ร่วมพัก' };

  // ดึง resident จาก userId
  var user = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.USERS, 'id', userId);
  if (!user || !user.resident_id) return { success: false, error: 'ไม่พบข้อมูลผู้พักอาศัย' };

  var resident = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS, 'id', user.resident_id);
  if (!resident) return { success: false, error: 'ไม่พบข้อมูลผู้พักอาศัย' };

  // อ่าน cohabitant_names เดิม
  var coresidents = [];
  try {
    coresidents = JSON.parse(String(resident.cohabitant_names || '[]'));
  } catch (e) {
    coresidents = [];
  }

  // เพิ่มผู้ร่วมพักใหม่ (schema เต็มรูปแบบ)
  var newCoresident = {
    id: getNextId('COR'),
    relation: data.relation || data.status || '',
    prefix: data.prefix || '',
    firstname: firstname,
    lastname: lastname,
    phone: data.phone || '',
    is_ppk_staff: data.is_ppk_staff || false,
    email: data.email || '',
    position: data.position || '',
    subject_group: data.subject_group || '',
    added_at: new Date().toISOString()
  };
  coresidents.push(newCoresident);

  // อัปเดต Residents
  updateRowInSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS, 'id', user.resident_id, {
    cohabitants: coresidents.length,
    cohabitant_names: JSON.stringify(coresidents),
    updated_at: new Date().toISOString()
  });

  // Invalidate cache
  invalidateCache('residents');

  return { success: true, message: 'เพิ่มผู้ร่วมพักสำเร็จ', id: newCoresident.id };
}

/**
 * แก้ไขผู้ร่วมพัก
 * @param {string} id - Coresident ID
 * @param {Object} data - { _userId, name, relation }
 * @returns {Object} { success, message }
 */
function updateCoresident(id, data) {
  if (!id) return { success: false, error: 'กรุณาระบุ ID ผู้ร่วมพัก' };

  var userId = data._userId || '';
  if (!userId) return { success: false, error: 'ไม่พบข้อมูลผู้ใช้' };

  var user = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.USERS, 'id', userId);
  if (!user || !user.resident_id) return { success: false, error: 'ไม่พบข้อมูลผู้พักอาศัย' };

  var resident = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS, 'id', user.resident_id);
  if (!resident) return { success: false, error: 'ไม่พบข้อมูลผู้พักอาศัย' };

  var coresidents = [];
  try {
    coresidents = JSON.parse(String(resident.cohabitant_names || '[]'));
  } catch (e) {
    return { success: false, error: 'ข้อมูลผู้ร่วมพักเสียหาย' };
  }

  // ค้นหาและอัปเดต (รองรับ schema เต็มรูปแบบ)
  var found = false;
  for (var i = 0; i < coresidents.length; i++) {
    if (coresidents[i].id === id) {
      // backward compat: รองรับ name เดี่ยว
      if (data.firstname !== undefined) coresidents[i].firstname = data.firstname;
      if (data.lastname !== undefined) coresidents[i].lastname = data.lastname;
      if (data.name !== undefined && !data.firstname) coresidents[i].firstname = data.name;
      // relation รองรับทั้ง relation และ status จาก frontend
      var newRelation = data.relation || data.status;
      if (newRelation !== undefined) coresidents[i].relation = newRelation;
      if (data.prefix !== undefined) coresidents[i].prefix = data.prefix;
      if (data.phone !== undefined) coresidents[i].phone = data.phone;
      if (data.is_ppk_staff !== undefined) coresidents[i].is_ppk_staff = data.is_ppk_staff;
      if (data.email !== undefined) coresidents[i].email = data.email;
      if (data.position !== undefined) coresidents[i].position = data.position;
      if (data.subject_group !== undefined) coresidents[i].subject_group = data.subject_group;
      found = true;
      break;
    }
  }

  if (!found) return { success: false, error: 'ไม่พบผู้ร่วมพัก ID: ' + id };

  updateRowInSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS, 'id', user.resident_id, {
    cohabitant_names: JSON.stringify(coresidents),
    updated_at: new Date().toISOString()
  });

  invalidateCache('residents');

  return { success: true, message: 'แก้ไขผู้ร่วมพักสำเร็จ' };
}

/**
 * ลบผู้ร่วมพัก
 * @param {string} id - Coresident ID
 * @returns {Object} { success, message }
 */
function removeCoresident(id) {
  if (!id) return { success: false, error: 'กรุณาระบุ ID ผู้ร่วมพัก' };

  // ต้องค้นหา resident ที่มี coresident นี้
  var allResidents = readSheetData(SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS);
  var targetResident = null;
  var coresidents = [];

  for (var r = 0; r < allResidents.length; r++) {
    try {
      var parsed = JSON.parse(String(allResidents[r].cohabitant_names || '[]'));
      for (var c = 0; c < parsed.length; c++) {
        if (parsed[c].id === id) {
          targetResident = allResidents[r];
          coresidents = parsed;
          break;
        }
      }
      if (targetResident) break;
    } catch (e) {
      // skip
    }
  }

  if (!targetResident) {
    return { success: false, error: 'ไม่พบผู้ร่วมพัก ID: ' + id };
  }

  // ลบ coresident
  coresidents = coresidents.filter(function(c) { return c.id !== id; });

  updateRowInSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS, 'id', targetResident.id, {
    cohabitants: coresidents.length,
    cohabitant_names: JSON.stringify(coresidents),
    updated_at: new Date().toISOString()
  });

  invalidateCache('residents');

  return { success: true, message: 'ลบผู้ร่วมพักสำเร็จ' };
}

// ============================================================================
// SETTINGS — ค่าตั้งระบบ (key-value)
// ============================================================================

/**
 * ดึงค่าตั้งทั้งหมด เป็น object { key: value }
 * @returns {Object} { success, data: { key1: value1, ... } }
 */
function getSettings() {
  var rows = getCachedData('settings', SPREADSHEET_IDS.MAIN, SHEET_NAMES.SETTINGS);
  var settings = {};
  for (var i = 0; i < rows.length; i++) {
    settings[rows[i].key] = rows[i].value;
  }
  return { success: true, data: settings };
}

/**
 * อัปเดตค่าตั้ง (บันทึกหลายค่าพร้อมกัน)
 * @param {Object} data - { _userId, key1: value1, key2: value2, ... }
 * @returns {Object} { success, message, updatedCount }
 */
function handleUpdateSettings(data) {
  var userId = data._userId || 'ADMIN';
  var now = new Date().toISOString();
  var updatedCount = 0;

  var keys = Object.keys(data);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (key === '_userId' || key === 'action' || key === 'token') continue;

    var value = data[key];

    // ตรวจว่ามี key นี้อยู่แล้วหรือไม่
    var existing = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.SETTINGS, 'key', key);

    if (existing) {
      // อัปเดต
      updateRowInSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.SETTINGS, 'key', key, {
        value: String(value),
        updated_at: now,
        updated_by: userId
      });
    } else {
      // เพิ่มใหม่
      appendRowToSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.SETTINGS, {
        key: key,
        value: String(value),
        description: '',
        updated_at: now,
        updated_by: userId
      });
    }
    updatedCount++;
  }

  // Invalidate cache
  invalidateCache('settings');

  // Log
  writeLog('UPDATE_SETTINGS', userId, 'อัปเดตค่าตั้ง ' + updatedCount + ' รายการ', 'Housing');

  return { success: true, message: 'อัปเดตค่าตั้งสำเร็จ', updatedCount: updatedCount };
}

// ============================================================================
// HOUSING FORMAT — รูปแบบเลขที่บ้าน/แฟลต
// ============================================================================

/**
 * ดึงรูปแบบเลขที่บ้าน/แฟลต
 * @returns {Object} { success, data: { house_prefix, flat_prefix, house_number_format, flat_number_format } }
 */
function getHousingFormat() {
  var settings = getSettings();
  var sData = settings.data || {};
  return {
    success: true,
    data: {
      house_prefix: sData.house_prefix || DEFAULTS.house_prefix,
      flat_prefix: sData.flat_prefix || DEFAULTS.flat_prefix,
      house_number_format: sData.house_number_format || DEFAULTS.house_number_format,
      flat_number_format: sData.flat_number_format || DEFAULTS.flat_number_format
    }
  };
}

/**
 * บันทึกรูปแบบเลขที่บ้าน/แฟลต
 * @param {Object} data - { house_prefix, flat_prefix, house_number_format, flat_number_format }
 * @returns {Object} { success, message }
 */
function saveHousingFormat(data) {
  var settingsUpdate = {
    _userId: data._userId || 'ADMIN'
  };

  if (data.house_prefix !== undefined) settingsUpdate.house_prefix = data.house_prefix;
  if (data.flat_prefix !== undefined) settingsUpdate.flat_prefix = data.flat_prefix;
  if (data.house_number_format !== undefined) settingsUpdate.house_number_format = data.house_number_format;
  if (data.flat_number_format !== undefined) settingsUpdate.flat_number_format = data.flat_number_format;

  return handleUpdateSettings(settingsUpdate);
}

// ============================================================================
// WATER RATE — ย้ายไป Billing.gs แล้ว (แก้ปัญหาฟังก์ชันซ้ำใน GAS namespace)
// → ใช้ getWaterRate() จาก Billing.gs แทน
// ============================================================================

// ============================================================================
// ANNOUNCEMENTS — ประกาศ
// ============================================================================

/**
 * ดึงประกาศที่ยัง active
 * @returns {Object} { success, data: [...] }
 */
function getAnnouncements() {
  var all = getCachedData('announcements', SPREADSHEET_IDS.MAIN, SHEET_NAMES.ANNOUNCEMENTS);
  var now = new Date();

  // กรองเฉพาะ active + ยังไม่หมดอายุ
  var active = all.filter(function(row) {
    if (String(row.is_active) !== 'TRUE' && String(row.is_active) !== 'true') return false;
    if (row.expiry_date) {
      var expiry = new Date(row.expiry_date);
      if (expiry < now) return false;
    }
    return true;
  });

  return { success: true, data: active };
}

/**
 * เพิ่มประกาศใหม่
 * @param {Object} data - { text, priority, expiry_date, _userId }
 * @returns {Object} { success, message, id }
 */
function handleAddAnnouncement(data) {
  if (!data.text) return { success: false, error: 'กรุณากรอกเนื้อหาประกาศ' };

  var id = getNextId(ID_PREFIXES.ANN);
  var now = new Date().toISOString();

  var annData = {
    id: id,
    text: data.text,
    priority: data.priority || 'normal',
    expiry_date: data.expiry_date || data.expiryDate || '',
    is_active: 'TRUE',
    created_by: data._userId || 'ADMIN',
    created_at: now
  };

  var result = appendRowToSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.ANNOUNCEMENTS, annData);
  if (!result.success) {
    return { success: false, error: 'ไม่สามารถเพิ่มประกาศได้' };
  }

  invalidateCache('announcements');
  writeLog('ADD_ANNOUNCEMENT', data._userId || 'ADMIN',
    'เพิ่มประกาศ: ' + data.text.substring(0, 50), 'Housing');

  return { success: true, message: 'เพิ่มประกาศสำเร็จ', id: id };
}

/**
 * ลบประกาศ (set is_active = FALSE)
 * @param {string} id - Announcement ID
 * @returns {Object} { success, message }
 */
function deleteAnnouncement(id) {
  if (!id) return { success: false, error: 'กรุณาระบุ ID ประกาศ' };

  var result = updateRowInSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.ANNOUNCEMENTS, 'id', id, {
    is_active: 'FALSE'
  });

  if (!result.success) {
    return result;
  }

  invalidateCache('announcements');
  writeLog('DELETE_ANNOUNCEMENT', 'ADMIN', 'ลบประกาศ: ' + id, 'Housing');

  return { success: true, message: 'ลบประกาศสำเร็จ' };
}

// ============================================================================
// PERMISSIONS — สิทธิ์การจัดการ
// ============================================================================

/**
 * ดึง Permissions matrix ทั้งหมด
 * @returns {Object} { success, data: [...] }
 */
function getPermissions() {
  var data = getCachedData('permissions', SPREADSHEET_IDS.MAIN, SHEET_NAMES.PERMISSIONS);
  return { success: true, data: data };
}

/**
 * อัปเดตสิทธิ์ทีม (หลายคนพร้อมกัน)
 * @param {Object} data - { permissions: [{ user_id, water, electric, ... }] }
 * @returns {Object} { success, message }
 */
function updatePermissions(data) {
  var permissions = data.permissions || [];
  if (!Array.isArray(permissions) || permissions.length === 0) {
    return { success: false, error: 'กรุณาระบุข้อมูลสิทธิ์' };
  }

  var now = new Date().toISOString();
  var updatedCount = 0;

  for (var i = 0; i < permissions.length; i++) {
    var perm = permissions[i];
    if (!perm.user_id) continue;

    var permData = {
      water: String(perm.water) === 'true' || String(perm.water) === 'TRUE' ? 'TRUE' : 'FALSE',
      electric: String(perm.electric) === 'true' || String(perm.electric) === 'TRUE' ? 'TRUE' : 'FALSE',
      notify: String(perm.notify) === 'true' || String(perm.notify) === 'TRUE' ? 'TRUE' : 'FALSE',
      slip: String(perm.slip) === 'true' || String(perm.slip) === 'TRUE' ? 'TRUE' : 'FALSE',
      withdraw: String(perm.withdraw) === 'true' || String(perm.withdraw) === 'TRUE' ? 'TRUE' : 'FALSE',
      accounting: String(perm.accounting) === 'true' || String(perm.accounting) === 'TRUE' ? 'TRUE' : 'FALSE',
      request: String(perm.request) === 'true' || String(perm.request) === 'TRUE' ? 'TRUE' : 'FALSE',
      admin: String(perm.admin) === 'true' || String(perm.admin) === 'TRUE' ? 'TRUE' : 'FALSE',
      updated_at: now,
      updated_by: data._userId || 'ADMIN'
    };

    // ตรวจว่ามี permission record อยู่แล้วหรือไม่
    var existing = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.PERMISSIONS, 'user_id', perm.user_id);

    if (existing) {
      updateRowInSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.PERMISSIONS, 'user_id', perm.user_id, permData);
    } else {
      permData.user_id = perm.user_id;
      appendRowToSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.PERMISSIONS, permData);
    }
    updatedCount++;
  }

  invalidateCache('permissions');
  writeLog('UPDATE_PERMISSIONS', data._userId || 'ADMIN',
    'อัปเดตสิทธิ์ ' + updatedCount + ' คน', 'Housing');

  return { success: true, message: 'อัปเดตสิทธิ์สำเร็จ', updatedCount: updatedCount };
}

// ============================================================================
// REGULATIONS PDF — ระเบียบบ้านพัก
// ============================================================================

/**
 * ดึง URL ระเบียบ PDF ล่าสุดจากโฟลเดอร์ Documents
 * @returns {Object} { success, url, fileName }
 */
function getRegulationsPdf() {
  try {
    var folder = DriveApp.getFolderById(FOLDER_IDS.DOCUMENTS);
    var files = folder.getFilesByType(MimeType.PDF);
    var latestFile = null;
    var latestDate = null;

    while (files.hasNext()) {
      var file = files.next();
      var created = file.getDateCreated();
      if (!latestDate || created > latestDate) {
        latestDate = created;
        latestFile = file;
      }
    }

    if (!latestFile) {
      return { success: false, error: 'ไม่พบไฟล์ระเบียบ PDF — กรุณาอัปโหลด' };
    }

    return {
      success: true,
      url: latestFile.getUrl(),
      fileName: latestFile.getName(),
      fileId: latestFile.getId(),
      downloadUrl: 'https://drive.google.com/uc?export=download&id=' + latestFile.getId()
    };
  } catch (e) {
    return { success: false, error: 'ไม่สามารถเข้าถึงโฟลเดอร์เอกสาร: ' + e.message };
  }
}

/**
 * อัปโหลด PDF ระเบียบใหม่ (แทนไฟล์เดิม)
 * @param {Object} data - { base64, fileName }
 * @returns {Object} { success, url, fileId }
 */
function uploadRegulationsPdf(data) {
  if (!data.base64) return { success: false, error: 'กรุณาแนบไฟล์ PDF' };

  try {
    var folder = DriveApp.getFolderById(FOLDER_IDS.DOCUMENTS);

    // ถอด base64 header ถ้ามี
    var base64Data = String(data.base64);
    if (base64Data.indexOf(',') !== -1) {
      base64Data = base64Data.split(',')[1];
    }

    var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), MimeType.PDF,
      data.fileName || 'ระเบียบบ้านพักครู.pdf');

    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    writeLog('UPLOAD_PDF', data._userId || 'ADMIN',
      'อัปโหลดระเบียบ PDF: ' + file.getName(), 'Housing');

    return {
      success: true,
      url: file.getUrl(),
      fileId: file.getId(),
      message: 'อัปโหลดสำเร็จ'
    };
  } catch (e) {
    return { success: false, error: 'อัปโหลดไม่สำเร็จ: ' + e.message };
  }
}

// ============================================================================
// EXPORT / IMPORT — ส่งออก/นำเข้าข้อมูลผู้พัก
// ============================================================================

/**
 * ส่งออกข้อมูลผู้พักอาศัย (JSON)
 * @param {Object} data - { format: 'json' }
 * @returns {Object} { success, data: [...], count }
 */
function exportResidents(data) {
  var residents = readSheetData(SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS);
  var housing = readSheetData(SPREADSHEET_IDS.MAIN, SHEET_NAMES.HOUSING);

  // เพิ่ม housing info ในแต่ละ resident
  var result = residents.map(function(res) {
    var house = null;
    for (var h = 0; h < housing.length; h++) {
      if (housing[h].display_number === res.house_number) {
        house = housing[h];
        break;
      }
    }
    return {
      id: res.id,
      resident_type: res.resident_type,
      prefix: res.prefix,
      firstname: res.firstname,
      lastname: res.lastname,
      position: res.position,
      phone: res.phone,
      email: res.email,
      house_number: res.house_number,
      house_type: house ? house.type : '',
      status: res.status
    };
  });

  writeLog('EXPORT_RESIDENTS', data._userId || 'ADMIN',
    'ส่งออกข้อมูลผู้พัก ' + result.length + ' คน', 'Housing');

  return { success: true, data: result, count: result.length };
}

/**
 * นำเข้าข้อมูลผู้พักอาศัย (JSON array)
 * @param {Object} data - { residents: [{...}, ...] }
 * @returns {Object} { success, message, importedCount, skippedCount }
 */
function importResidents(data) {
  var residents = data.residents || [];
  if (!Array.isArray(residents) || residents.length === 0) {
    return { success: false, error: 'ไม่มีข้อมูลที่จะนำเข้า' };
  }

  var importedCount = 0;
  var skippedCount = 0;

  for (var i = 0; i < residents.length; i++) {
    var res = residents[i];

    // ตรวจซ้ำ (email)
    if (res.email) {
      var existing = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS, 'email', res.email);
      if (existing) {
        skippedCount++;
        continue;
      }
    }

    var result = addResident({
      resident_type: res.resident_type || 'staff',
      prefix: res.prefix || '',
      firstname: res.firstname || '',
      lastname: res.lastname || '',
      position: res.position || '',
      phone: res.phone || '',
      email: res.email || '',
      house_number: res.house_number || '',
      password: res.password || '',
      _userId: data._userId || 'IMPORT'
    });

    if (result.success) {
      importedCount++;
    } else {
      skippedCount++;
    }
  }

  writeLog('IMPORT_RESIDENTS', data._userId || 'ADMIN',
    'นำเข้าผู้พัก: สำเร็จ ' + importedCount + ', ข้าม ' + skippedCount, 'Housing');

  return {
    success: true,
    message: 'นำเข้าสำเร็จ ' + importedCount + ' คน (ข้าม ' + skippedCount + ' คน)',
    importedCount: importedCount,
    skippedCount: skippedCount
  };
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * อัปเดตสถานะบ้าน
 * @param {string} displayNumber - เลขที่แสดงผล เช่น 'บ้าน 1-3'
 * @param {string} status - สถานะใหม่
 * @private
 */
function _updateHousingStatus(displayNumber, status) {
  var housing = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.HOUSING, 'display_number', displayNumber);
  if (housing) {
    updateRowInSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.HOUSING, 'id', housing.id, {
      status: status,
      updated_at: new Date().toISOString()
    });
    invalidateCache('housing');
  }
}

/**
 * ตรวจว่าบ้านยังมีผู้พักอยู่หรือไม่ → อัปเดตเป็น available ถ้าไม่มี
 * @param {string} displayNumber - เลขที่แสดงผล
 * @private
 */
function _checkAndUpdateHousingStatus(displayNumber) {
  var residents = readSheetData(SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS);
  var hasResident = false;
  for (var i = 0; i < residents.length; i++) {
    if (residents[i].house_number === displayNumber &&
        residents[i].status === 'active' &&
        residents[i].resident_type === 'staff') {
      hasResident = true;
      break;
    }
  }

  if (!hasResident) {
    _updateHousingStatus(displayNumber, 'available');
  }
}

/**
 * แปลง snake_case เป็น camelCase
 * @param {string} str - เช่น 'profile_photo'
 * @returns {string} เช่น 'profilePhoto'
 * @private
 */
function _snakeToCamel(str) {
  return str.replace(/_([a-z])/g, function(match, letter) {
    return letter.toUpperCase();
  });
}

// ============================================================================
// TEST FUNCTION — รันใน GAS Editor เพื่อตรวจสอบ
// ============================================================================

/**
 * ทดสอบ Housing.gs — รันใน GAS Editor
 * ✅ ผ่าน = CRUD บ้าน/ผู้พัก/settings ไม่ error
 * ❌ ไม่ผ่าน = error → ตรวจ Housing.gs + Database.gs
 */
function testHousing() {
  Logger.log('=== TEST HOUSING.gs ===');

  // Test 1: getSettings
  Logger.log('\n--- TEST 1: getSettings ---');
  var settings = getSettings();
  Logger.log('  Settings success: ' + settings.success);
  Logger.log('  Settings keys: ' + Object.keys(settings.data || {}).length);
  if (!settings.success) throw new Error('getSettings failed');
  Logger.log('  house_prefix: ' + (settings.data.house_prefix || DEFAULTS.house_prefix));
  Logger.log('  ✅ getSettings OK');

  // Test 2: getHousingList
  Logger.log('\n--- TEST 2: getHousingList ---');
  var houses = getHousingList();
  Logger.log('  Housing success: ' + houses.success);
  Logger.log('  Housing count: ' + (houses.data ? houses.data.length : 0));
  if (!houses.success) throw new Error('getHousingList failed');
  Logger.log('  ✅ getHousingList OK');

  // Test 3: getResidentsList
  Logger.log('\n--- TEST 3: getResidentsList ---');
  var residents = getResidentsList();
  Logger.log('  Residents success: ' + residents.success);
  Logger.log('  Residents count: ' + (residents.data ? residents.data.length : 0));
  if (!residents.success) throw new Error('getResidentsList failed');
  Logger.log('  ✅ getResidentsList OK');

  // Test 4: getAnnouncements
  Logger.log('\n--- TEST 4: getAnnouncements ---');
  var announcements = getAnnouncements();
  Logger.log('  Announcements success: ' + announcements.success);
  Logger.log('  Announcements count: ' + (announcements.data ? announcements.data.length : 0));
  if (!announcements.success) throw new Error('getAnnouncements failed');
  Logger.log('  ✅ getAnnouncements OK');

  // Test 5: getPermissions
  Logger.log('\n--- TEST 5: getPermissions ---');
  var permissions = getPermissions();
  Logger.log('  Permissions success: ' + permissions.success);
  Logger.log('  Permissions count: ' + (permissions.data ? permissions.data.length : 0));
  if (!permissions.success) throw new Error('getPermissions failed');
  Logger.log('  ✅ getPermissions OK');

  // Test 6: getAvailableHousing
  Logger.log('\n--- TEST 6: getAvailableHousing ---');
  var available = getAvailableHousing();
  Logger.log('  Available success: ' + available.success);
  Logger.log('  Available count: ' + (available.data ? available.data.length : 0));
  if (!available.success) throw new Error('getAvailableHousing failed');
  Logger.log('  ✅ getAvailableHousing OK');

  // Test 7: getHousingFormat
  Logger.log('\n--- TEST 7: getHousingFormat ---');
  var format = getHousingFormat();
  Logger.log('  Format success: ' + format.success);
  Logger.log('  house_prefix: ' + format.data.house_prefix);
  Logger.log('  flat_prefix: ' + format.data.flat_prefix);
  if (!format.success) throw new Error('getHousingFormat failed');
  Logger.log('  ✅ getHousingFormat OK');

  // Test 8: getWaterRate (ย้ายไป Billing.gs แล้ว — เรียกจาก Billing.gs namespace)
  Logger.log('\n--- TEST 8: getWaterRate (from Billing.gs) ---');
  var waterRate = getWaterRate(); // → เรียกจาก Billing.gs (GAS global namespace)
  Logger.log('  WaterRate success: ' + waterRate.success);
  Logger.log('  Current rate: ' + waterRate.rate);
  if (!waterRate.success) throw new Error('getWaterRate failed');
  Logger.log('  ✅ getWaterRate OK (from Billing.gs)');

  // Test 9: CRUD Housing
  Logger.log('\n--- TEST 9: CRUD Housing ---');
  var testName = 'TEST_' + Date.now();

  // Add
  var addResult = addHousing({
    type: 'house',
    number: testName,
    zone: 'TEST',
    status: 'available',
    note: 'ทดสอบระบบ'
  });
  Logger.log('  Add: ' + JSON.stringify(addResult));
  if (!addResult.success) throw new Error('addHousing failed');
  var testHousingId = addResult.id;

  // Update
  var updateResult = updateHousing(testHousingId, { status: 'maintenance', note: 'ทดสอบแก้ไข' });
  Logger.log('  Update: ' + JSON.stringify(updateResult));
  if (!updateResult.success) throw new Error('updateHousing failed');

  // Delete
  var deleteResult = deleteHousing(testHousingId);
  Logger.log('  Delete: ' + JSON.stringify(deleteResult));
  if (!deleteResult.success) throw new Error('deleteHousing failed');
  Logger.log('  ✅ CRUD Housing OK');

  // Test 10: handleUpdateSettings
  Logger.log('\n--- TEST 10: handleUpdateSettings ---');
  var updateSettingsResult = handleUpdateSettings({
    _userId: 'TEST',
    test_key_housing: 'test_value_' + Date.now()
  });
  Logger.log('  UpdateSettings: ' + JSON.stringify(updateSettingsResult));
  if (!updateSettingsResult.success) throw new Error('handleUpdateSettings failed');
  Logger.log('  ✅ handleUpdateSettings OK');

  // Test 11: handleAddAnnouncement + deleteAnnouncement
  Logger.log('\n--- TEST 11: CRUD Announcements ---');
  var addAnnResult = handleAddAnnouncement({
    text: 'ทดสอบประกาศ ' + Date.now(),
    priority: 'normal',
    _userId: 'TEST'
  });
  Logger.log('  Add announcement: ' + JSON.stringify(addAnnResult));
  if (!addAnnResult.success) throw new Error('handleAddAnnouncement failed');

  var deleteAnnResult = deleteAnnouncement(addAnnResult.id);
  Logger.log('  Delete announcement: ' + JSON.stringify(deleteAnnResult));
  if (!deleteAnnResult.success) throw new Error('deleteAnnouncement failed');
  Logger.log('  ✅ CRUD Announcements OK');

  // Test 12: getRegulationsPdf
  Logger.log('\n--- TEST 12: getRegulationsPdf ---');
  var pdfResult = getRegulationsPdf();
  Logger.log('  PDF result: success=' + pdfResult.success);
  if (pdfResult.success) {
    Logger.log('  PDF file: ' + pdfResult.fileName);
  } else {
    Logger.log('  PDF: ' + pdfResult.error + ' (ปกติถ้ายังไม่ได้อัปโหลด)');
  }
  Logger.log('  ✅ getRegulationsPdf OK');

  // Test 13: exportResidents
  Logger.log('\n--- TEST 13: exportResidents ---');
  var exportResult = exportResidents({ _userId: 'TEST' });
  Logger.log('  Export success: ' + exportResult.success);
  Logger.log('  Export count: ' + exportResult.count);
  if (!exportResult.success) throw new Error('exportResidents failed');
  Logger.log('  ✅ exportResidents OK');

  // Cleanup: ลบ test settings
  Logger.log('\n--- CLEANUP ---');
  deleteRowFromSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.SETTINGS, 'key', 'test_key_housing');
  Logger.log('  ลบ test_key_housing สำเร็จ');

  Logger.log('\n✅ HOUSING TEST PASSED — ระบบบ้านพักทำงานครบ');
}

// ============================================================================
// END OF Housing.gs
// ============================================================================
