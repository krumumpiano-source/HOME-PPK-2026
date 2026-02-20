/**
 * ============================================================================
 * HOME PPK 2026 - Request.gs — 📋 คำร้องและระบบคิว
 * ============================================================================
 * จัดการคำร้อง 4 ประเภท (เข้าพัก/ย้าย/คืน/ซ่อม) + ระบบคิวรอเข้าพัก
 * 
 * ฟีเจอร์:
 *   - Submit: handleSubmitRequest (4 ประเภท)
 *   - Get: getRequests, getRequestDetail
 *   - Review: handleReviewRequest
 *   - Year Sheets: createRequestYearSheet
 *   - Queue: getQueue, addToQueue, removeFromQueue, updateQueueOrder,
 *            approveFromQueue, setQueueExpiryDate, checkAndExpireQueue
 *   - Attachments: saveRequestAttachments
 * 
 * Version: 1.0
 * วันที่สร้าง: 17 กุมภาพันธ์ 2569
 * Step: 23 (ระยะที่ 2)
 * ============================================================================
 * 
 * Dependencies: Config.gs, Database.gs, Housing.gs
 * Next: Finance.gs (Step 24)
 * 
 * Spreadsheets:
 *   - [REQUESTS] → Residence_{year}, Transfer_{year}, Return_{year},
 *                   Repair_{year}, Queue
 *   - Drive      → RequestAttachments/{type}/ (ไฟล์แนบ)
 * 
 * Notes:
 *   - stay_type: 'alone' | 'family'
 *   - transfer_type: 'flat_to_house' | 'house_to_flat' | 'change_unit'
 *   - urgency: 'normal' | 'urgent' | 'urgent_high'
 *   - cost_responsibility: 'self' | 'school'
 *   - status: pending → reviewing → waiting → approved → completed
 *             pending → rejected
 *             waiting → expired
 *   - Queue: แผ่นงานตายตัว ไม่แยกปี
 *   - คำร้อง 4 ประเภท: แผ่นงานตามปี {Type}_{year}
 * 
 * ============================================================================
 */

// ============================================================================
// SCHEMAS — Headers ของแผ่นงานตามปี
// ============================================================================

var RESIDENCE_REQUEST_HEADERS = [
  'id', 'submitted_at', 'prefix', 'firstname', 'lastname',
  'phone', 'email', 'position', 'subject_group',
  'stay_type', 'reason', 'attachment_file_ids',
  'status', 'queue_position', 'expiry_date',
  'reviewed_by', 'reviewed_at', 'review_note',
  'assigned_house', 'user_id'
];

var TRANSFER_REQUEST_HEADERS = [
  'id', 'submitted_at', 'prefix', 'firstname', 'lastname',
  'phone', 'email', 'position', 'subject_group',
  'current_house', 'transfer_type', 'preferred_house',
  'reason', 'attachment_file_ids',
  'status', 'reviewed_by', 'reviewed_at', 'review_note',
  'assigned_house', 'user_id'
];

var RETURN_REQUEST_HEADERS = [
  'id', 'submitted_at', 'prefix', 'firstname', 'lastname',
  'phone', 'email', 'position', 'subject_group',
  'current_house', 'return_date', 'reason',
  'attachment_file_ids',
  'status', 'reviewed_by', 'reviewed_at', 'review_note',
  'user_id'
];

var REPAIR_REQUEST_HEADERS = [
  'id', 'submitted_at', 'prefix', 'firstname', 'lastname',
  'phone', 'email', 'current_house',
  'repair_detail', 'urgency', 'cost_responsibility',
  'attachment_file_ids',
  'status', 'reviewed_by', 'reviewed_at', 'review_note',
  'user_id'
];

var QUEUE_HEADERS = [
  'id', 'request_id', 'request_year',
  'prefix', 'firstname', 'lastname',
  'phone', 'email', 'stay_type',
  'queue_position', 'added_at', 'expiry_date',
  'status', 'assigned_house', 'approved_at',
  'note'
];

// ============================================================================
// REQUEST TYPE MAPPING
// ============================================================================

var REQUEST_TYPE_MAP = {
  'residence': {
    prefix: 'Residence',
    idPrefix: ID_PREFIXES.REQ,
    headers: RESIDENCE_REQUEST_HEADERS
  },
  'transfer': {
    prefix: 'Transfer',
    idPrefix: ID_PREFIXES.TRF,
    headers: TRANSFER_REQUEST_HEADERS
  },
  'return': {
    prefix: 'Return',
    idPrefix: ID_PREFIXES.RTN,
    headers: RETURN_REQUEST_HEADERS
  },
  'repair': {
    prefix: 'Repair',
    idPrefix: ID_PREFIXES.RPR,
    headers: REPAIR_REQUEST_HEADERS
  }
};

// ============================================================================
// SUBMIT REQUEST — ส่งคำร้องใหม่
// ============================================================================

/**
 * ส่งคำร้องใหม่ (4 ประเภท)
 * - สร้างแผ่นงาน {Type}_{year} อัตโนมัติถ้ายังไม่มี
 * - บันทึกไฟล์แนบลง Drive (ถ้ามี)
 * - สถานะเริ่มต้น: 'pending'
 * @param {Object} data - { type, userId, prefix, firstname, lastname, phone, ... }
 * @returns {Object} { success, message, requestId }
 */
function handleSubmitRequest(data) {
  var type = data.type || '';

  // ── Validation ──
  if (!type || !REQUEST_TYPE_MAP[type]) {
    return { success: false, error: 'ประเภทคำร้องไม่ถูกต้อง (ต้องเป็น residence/transfer/return/repair)' };
  }
  if (!data.firstname || !data.lastname) {
    return { success: false, error: 'กรุณากรอกชื่อ-นามสกุล' };
  }

  var typeConfig = REQUEST_TYPE_MAP[type];
  var now = new Date().toISOString();
  var submittedAt = data.submitted_at || now;

  // ดึง year จาก submitted_at
  var year = _getYearFromDate(submittedAt);
  var sheetName = getYearSheetName(typeConfig.prefix, year);

  // สร้างแผ่นงาน (ถ้ายังไม่มี)
  createRequestYearSheet(type, year);

  // สร้าง ID
  var requestId = getNextId(typeConfig.idPrefix);

  // ── บันทึกไฟล์แนบ (ถ้ามี) ──
  var fileIds = '';
  if (data.attachments && data.attachments.length > 0) {
    try {
      var saved = saveRequestAttachments(data.attachments, type, requestId);
      fileIds = saved.join(',');
    } catch (e) {
      writeLog('ATTACHMENT_ERROR', data._userId || 'UNKNOWN', 
        'บันทึกไฟล์แนบไม่สำเร็จ: ' + e.message, 'Request');
    }
  }

  // ── สร้างข้อมูลคำร้อง ──
  var requestData = {
    id: requestId,
    submitted_at: submittedAt,
    prefix: data.prefix || '',
    firstname: data.firstname || '',
    lastname: data.lastname || '',
    phone: data.phone || '',
    email: data.email || '',
    status: 'pending',
    attachment_file_ids: fileIds,
    user_id: data._userId || data.userId || ''
  };

  // เพิ่มฟิลด์เฉพาะตามประเภท
  switch (type) {
    case 'residence':
      requestData.position = data.position || '';
      requestData.subject_group = data.subject_group || '';
      requestData.stay_type = data.stay_type || 'alone';
      requestData.reason = data.reason || '';
      requestData.queue_position = '';
      requestData.expiry_date = '';
      requestData.assigned_house = '';
      break;

    case 'transfer':
      requestData.position = data.position || '';
      requestData.subject_group = data.subject_group || '';
      requestData.current_house = data.current_house || '';
      requestData.transfer_type = data.transfer_type || '';
      requestData.preferred_house = data.preferred_house || '';
      requestData.reason = data.reason || '';
      requestData.assigned_house = '';
      break;

    case 'return':
      requestData.position = data.position || '';
      requestData.subject_group = data.subject_group || '';
      requestData.current_house = data.current_house || '';
      requestData.return_date = data.return_date || '';
      requestData.reason = data.reason || '';
      break;

    case 'repair':
      requestData.current_house = data.current_house || '';
      requestData.repair_detail = data.repair_detail || '';
      requestData.urgency = data.urgency || 'normal';
      requestData.cost_responsibility = data.cost_responsibility || 'self';
      break;
  }

  requestData.reviewed_by = '';
  requestData.reviewed_at = '';
  requestData.review_note = '';

  // ── บันทึก ──
  var result = appendRowToSheet(SPREADSHEET_IDS.REQUESTS, sheetName, requestData);
  if (!result.success) {
    return { success: false, error: 'ไม่สามารถบันทึกคำร้องได้' };
  }

  // Log
  writeLog('SUBMIT_REQUEST', requestData.user_id || 'UNKNOWN',
    'ส่งคำร้อง ' + type + ': ' + requestId + ' (' + data.firstname + ' ' + data.lastname + ')', 'Request');

  return { success: true, message: 'ส่งคำร้องสำเร็จ', requestId: requestId };
}

// ============================================================================
// GET REQUESTS — ดึงคำร้อง
// ============================================================================

/**
 * ดึงคำร้องตามประเภท/ปี/สถานะ
 * @param {string} type - 'residence' | 'transfer' | 'return' | 'repair'
 * @param {string|number} year - ปี พ.ศ.
 * @param {Object} [filters] - { status, house_number }
 * @returns {Object} { success, data: [...] }
 */
function getRequests(type, year, filters) {
  if (!type || !REQUEST_TYPE_MAP[type]) {
    return { success: false, error: 'ประเภทคำร้องไม่ถูกต้อง' };
  }

  year = year || String(CURRENT_YEAR);
  var typeConfig = REQUEST_TYPE_MAP[type];
  var sheetName = getYearSheetName(typeConfig.prefix, year);

  try {
    var allData = readSheetData(SPREADSHEET_IDS.REQUESTS, sheetName);

    // Apply filters
    if (filters) {
      if (filters.status) {
        allData = allData.filter(function(row) {
          return String(row.status) === String(filters.status);
        });
      }
      if (filters.house_number) {
        allData = allData.filter(function(row) {
          return String(row.current_house) === String(filters.house_number) ||
                 String(row.assigned_house) === String(filters.house_number);
        });
      }
      if (filters.userId || filters.user_id) {
        var uid = filters.userId || filters.user_id;
        allData = allData.filter(function(row) {
          return String(row.user_id) === String(uid);
        });
      }
    }

    return { success: true, data: allData };
  } catch (e) {
    // Sheet ยังไม่มี → ไม่มีข้อมูล
    return { success: true, data: [] };
  }
}

/**
 * ดึงรายละเอียดคำร้อง + URL ไฟล์แนบ
 * @param {string} type - ประเภทคำร้อง
 * @param {string|number} year - ปี พ.ศ.
 * @param {string} id - Request ID
 * @returns {Object} { success, data, attachmentUrls: [...] }
 */
function getRequestDetail(type, year, id) {
  if (!type || !id) return { success: false, error: 'กรุณาระบุประเภทและ ID คำร้อง' };

  year = year || String(CURRENT_YEAR);
  var typeConfig = REQUEST_TYPE_MAP[type];
  if (!typeConfig) return { success: false, error: 'ประเภทคำร้องไม่ถูกต้อง' };

  var sheetName = getYearSheetName(typeConfig.prefix, year);

  try {
    var row = findRowByValue(SPREADSHEET_IDS.REQUESTS, sheetName, 'id', id);
    if (!row) return { success: false, error: 'ไม่พบคำร้อง ID: ' + id };

    // ดึง URL ไฟล์แนบ
    var attachmentUrls = [];
    if (row.attachment_file_ids) {
      var fileIds = String(row.attachment_file_ids).split(',');
      for (var i = 0; i < fileIds.length; i++) {
        var fid = fileIds[i].trim();
        if (fid) {
          try {
            var file = DriveApp.getFileById(fid);
            attachmentUrls.push({
              fileId: fid,
              name: file.getName(),
              url: file.getUrl(),
              mimeType: file.getMimeType()
            });
          } catch (e) {
            attachmentUrls.push({ fileId: fid, error: 'ไม่พบไฟล์' });
          }
        }
      }
    }

    return { success: true, data: row, attachmentUrls: attachmentUrls };
  } catch (e) {
    return { success: false, error: 'เกิดข้อผิดพลาด: ' + e.message };
  }
}

// ============================================================================
// REVIEW REQUEST — อนุมัติ/ปฏิเสธคำร้อง
// ============================================================================

/**
 * อนุมัติ/ปฏิเสธคำร้อง
 * - ถ้า 'approved' + residence → เพิ่มเข้าคิว (ถ้าไม่มีบ้านว่าง) หรือจัดบ้าน
 * - ถ้า 'approved' + transfer → ย้ายบ้าน
 * - ถ้า 'approved' + return → คืนบ้าน
 * - ถ้า 'approved' + repair → บันทึกสถานะ
 * @param {Object} data - { type, year, id, status, note, assigned_house }
 * @returns {Object} { success, message }
 */
function handleReviewRequest(data) {
  var type = data.type || '';
  var year = data.year || String(CURRENT_YEAR);
  var id = data.id || '';
  var newStatus = data.status || '';
  var note = data.note || '';

  if (!type || !REQUEST_TYPE_MAP[type]) {
    return { success: false, error: 'ประเภทคำร้องไม่ถูกต้อง' };
  }
  if (!id) return { success: false, error: 'กรุณาระบุ ID คำร้อง' };
  if (!newStatus) return { success: false, error: 'กรุณาระบุสถานะ' };

  var typeConfig = REQUEST_TYPE_MAP[type];
  var sheetName = getYearSheetName(typeConfig.prefix, year);
  var now = new Date().toISOString();

  // ดึงคำร้องปัจจุบัน
  var request = findRowByValue(SPREADSHEET_IDS.REQUESTS, sheetName, 'id', id);
  if (!request) return { success: false, error: 'ไม่พบคำร้อง ID: ' + id };

  // อัปเดตสถานะ
  var updateData = {
    status: newStatus,
    reviewed_by: data._userId || 'ADMIN',
    reviewed_at: now,
    review_note: note
  };

  // ── จัดการเพิ่มเติมตามสถานะ ──
  if (newStatus === 'approved') {
    switch (type) {
      case 'residence':
        if (data.assigned_house) {
          // มีบ้านให้ → จัดให้เลย
          updateData.assigned_house = data.assigned_house;
          updateData.status = 'completed';

          // อัปเดต Housing status → occupied
          var housing = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.HOUSING, 'display_number', data.assigned_house);
          if (housing) {
            updateRowInSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.HOUSING, 'id', housing.id, {
              status: 'occupied',
              updated_at: now
            });
            invalidateCache('housing');
          }
        } else {
          // ไม่มีบ้าน → เข้าคิว
          updateData.status = 'waiting';
          addToQueue({
            request_id: id,
            request_year: year,
            prefix: request.prefix,
            firstname: request.firstname,
            lastname: request.lastname,
            phone: request.phone,
            email: request.email,
            stay_type: request.stay_type
          });
        }
        break;

      case 'transfer':
        if (data.assigned_house) {
          updateData.assigned_house = data.assigned_house;
          updateData.status = 'completed';

          // ย้ายผู้พัก → Housing.gs moveResident
          try {
            var resident = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS,
              'house_number', request.current_house);
            if (resident) {
              moveResident(resident.id, data.assigned_house);
            }
          } catch (e) {
            writeLog('TRANSFER_ERROR', data._userId || 'ADMIN',
              'ย้ายผู้พักไม่สำเร็จ: ' + e.message, 'Request');
          }
        }
        break;

      case 'return':
        updateData.status = 'completed';
        // คืนบ้าน → เปลี่ยน Housing status → available + ลบผู้พัก
        try {
          var returnHousing = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.HOUSING,
            'display_number', request.current_house);
          if (returnHousing) {
            updateRowInSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.HOUSING, 'id', returnHousing.id, {
              status: 'available',
              updated_at: now
            });
            invalidateCache('housing');
          }

          // ลบผู้พักออกจาก Residents
          var returnResident = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS,
            'house_number', request.current_house);
          if (returnResident && returnResident.resident_type === 'staff') {
            removeResident(returnResident.id);
          }
        } catch (e) {
          writeLog('RETURN_ERROR', data._userId || 'ADMIN',
            'คืนบ้านไม่สำเร็จ: ' + e.message, 'Request');
        }
        break;

      case 'repair':
        updateData.status = 'completed';
        break;
    }
  }

  // อัปเดตคำร้อง
  var result = updateRowInSheet(SPREADSHEET_IDS.REQUESTS, sheetName, 'id', id, updateData);
  if (!result.success) return result;

  // Log
  writeLog('REVIEW_REQUEST', data._userId || 'ADMIN',
    type + ' ' + id + ' → ' + updateData.status + (note ? ' (' + note + ')' : ''), 'Request');

  return { success: true, message: 'อัปเดตคำร้องสำเร็จ', status: updateData.status };
}

// ============================================================================
// YEAR SHEET — สร้างแผ่นงานปีใหม่ 
// ============================================================================

/**
 * สร้างแผ่นงานปีใหม่อัตโนมัติพร้อม Header (ตามประเภทคำร้อง)
 * @param {string} type - 'residence' | 'transfer' | 'return' | 'repair'
 * @param {string|number} year - ปี พ.ศ.
 */
function createRequestYearSheet(type, year) {
  var typeConfig = REQUEST_TYPE_MAP[type];
  if (!typeConfig) return;

  var sheetName = getYearSheetName(typeConfig.prefix, year);
  getOrCreateSheet(SPREADSHEET_IDS.REQUESTS, sheetName, typeConfig.headers);
}

// ============================================================================
// QUEUE — ระบบคิวรอเข้าพัก
// ============================================================================

/**
 * ดึงรายการคิวรอเข้าพักทั้งหมด (เรียงตาม queue_position)
 * @returns {Object} { success, data: [...] }
 */
function getQueue() {
  try {
    var data = readSheetData(SPREADSHEET_IDS.REQUESTS, SHEET_NAMES.QUEUE);

    // กรองเฉพาะ active (status = waiting)
    data = data.filter(function(row) {
      return row.status === 'waiting';
    });

    // เรียงตาม queue_position
    data.sort(function(a, b) {
      return (Number(a.queue_position) || 999) - (Number(b.queue_position) || 999);
    });

    return { success: true, data: data };
  } catch (e) {
    return { success: true, data: [] };
  }
}

/**
 * เพิ่มเข้าคิว
 * @param {Object} data - { request_id, request_year, prefix, firstname, lastname, ... }
 * @returns {Object} { success, message, queueId, position }
 */
function addToQueue(data) {
  if (!data.request_id) return { success: false, error: 'กรุณาระบุ request_id' };

  // ตรวจซ้ำ
  try {
    var existing = findRowByValue(SPREADSHEET_IDS.REQUESTS, SHEET_NAMES.QUEUE, 'request_id', data.request_id);
    if (existing && existing.status === 'waiting') {
      return { success: false, error: 'คำร้องนี้อยู่ในคิวแล้ว (ลำดับ ' + existing.queue_position + ')' };
    }
  } catch (e) {
    // Queue sheet อาจยังไม่มี → สร้าง
    getOrCreateSheet(SPREADSHEET_IDS.REQUESTS, SHEET_NAMES.QUEUE, QUEUE_HEADERS);
  }

  // หาลำดับถัดไป
  var nextPosition = 1;
  try {
    var allQueue = readSheetData(SPREADSHEET_IDS.REQUESTS, SHEET_NAMES.QUEUE);
    var activeQueue = allQueue.filter(function(r) { return r.status === 'waiting'; });
    if (activeQueue.length > 0) {
      var maxPos = Math.max.apply(null, activeQueue.map(function(r) { return Number(r.queue_position) || 0; }));
      nextPosition = maxPos + 1;
    }
  } catch (e) { /* ไม่มีข้อมูล */ }

  var queueId = getNextId(ID_PREFIXES.QUE);
  var now = new Date().toISOString();

  // คำนวณวันหมดอายุ (ตาม queue_expiry_days จาก settings)
  var expiryDays = Number(DEFAULTS.queue_expiry_days) || 180;
  var expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + expiryDays);

  var queueData = {
    id: queueId,
    request_id: data.request_id,
    request_year: data.request_year || String(CURRENT_YEAR),
    prefix: data.prefix || '',
    firstname: data.firstname || '',
    lastname: data.lastname || '',
    phone: data.phone || '',
    email: data.email || '',
    stay_type: data.stay_type || 'alone',
    queue_position: nextPosition,
    added_at: now,
    expiry_date: expiryDate.toISOString(),
    status: 'waiting',
    assigned_house: '',
    approved_at: '',
    note: data.note || ''
  };

  var result = appendRowToSheet(SPREADSHEET_IDS.REQUESTS, SHEET_NAMES.QUEUE, queueData);
  if (!result.success) return result;

  // Sync queue_position กลับไปที่ Residence_{year}
  try {
    var resSheetName = getYearSheetName('Residence', data.request_year || CURRENT_YEAR);
    updateRowInSheet(SPREADSHEET_IDS.REQUESTS, resSheetName, 'id', data.request_id, {
      queue_position: nextPosition,
      expiry_date: expiryDate.toISOString()
    });
  } catch (e) { /* ไม่สามารถ sync ได้ */ }

  // Log
  writeLog('ADD_TO_QUEUE', data._userId || 'ADMIN',
    'เพิ่มเข้าคิว: ' + queueId + ' ลำดับ ' + nextPosition, 'Request');

  return { success: true, message: 'เพิ่มเข้าคิวสำเร็จ', queueId: queueId, position: nextPosition };
}

/**
 * ลบออกจากคิว
 * @param {string} queueId - Queue ID
 * @returns {Object} { success, message }
 */
function removeFromQueue(queueId) {
  if (!queueId) return { success: false, error: 'กรุณาระบุ Queue ID' };

  var result = updateRowInSheet(SPREADSHEET_IDS.REQUESTS, SHEET_NAMES.QUEUE, 'id', queueId, {
    status: 'removed'
  });
  if (!result.success) return result;

  writeLog('REMOVE_FROM_QUEUE', 'ADMIN', 'ลบออกจากคิว: ' + queueId, 'Request');
  return { success: true, message: 'ลบออกจากคิวสำเร็จ' };
}

/**
 * เรียงลำดับคิวใหม่ (Drag & Drop)
 * @param {Object} data - { orderedIds: ['QUE_xxx', 'QUE_yyy', ...] }
 * @returns {Object} { success, message }
 */
function handleUpdateQueue(data) {
  var orderedIds = data.orderedIds || data.ordered_ids || [];
  if (!orderedIds || orderedIds.length === 0) {
    return { success: false, error: 'กรุณาระบุลำดับ Queue IDs' };
  }

  var updates = orderedIds.map(function(id, index) {
    return {
      id: id,
      data: { queue_position: index + 1 }
    };
  });

  var result = batchUpdateRows(SPREADSHEET_IDS.REQUESTS, SHEET_NAMES.QUEUE, 'id', updates);
  if (!result.success) return result;

  writeLog('REORDER_QUEUE', data._userId || 'ADMIN',
    'เรียงคิวใหม่: ' + orderedIds.length + ' รายการ', 'Request');

  return { success: true, message: 'เรียงลำดับคิวใหม่สำเร็จ' };
}

/**
 * อนุมัติจากคิว → จัดบ้าน + ย้ายสถานะ
 * @param {Object} data - { queueId, houseId (display_number) }
 * @returns {Object} { success, message }
 */
function approveFromQueue(data) {
  var queueId = data.queueId || data.queue_id || '';
  var houseDisplayNumber = data.houseId || data.house_id || data.assigned_house || '';

  if (!queueId) return { success: false, error: 'กรุณาระบุ Queue ID' };
  if (!houseDisplayNumber) return { success: false, error: 'กรุณาระบุบ้านที่จะจัด' };

  // ดึงข้อมูลคิว
  var queueItem = findRowByValue(SPREADSHEET_IDS.REQUESTS, SHEET_NAMES.QUEUE, 'id', queueId);
  if (!queueItem) return { success: false, error: 'ไม่พบรายการคิว: ' + queueId };
  if (queueItem.status !== 'waiting') {
    return { success: false, error: 'รายการคิวนี้ไม่ได้อยู่ในสถานะรอ (สถานะ: ' + queueItem.status + ')' };
  }

  var now = new Date().toISOString();

  // อัปเดตคิว
  var queueResult = updateRowInSheet(SPREADSHEET_IDS.REQUESTS, SHEET_NAMES.QUEUE, 'id', queueId, {
    status: 'approved',
    assigned_house: houseDisplayNumber,
    approved_at: now
  });
  if (!queueResult.success) return queueResult;

  // อัปเดต Housing status → occupied
  var housing = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.HOUSING, 'display_number', houseDisplayNumber);
  if (housing) {
    updateRowInSheet(SPREADSHEET_IDS.MAIN, SHEET_NAMES.HOUSING, 'id', housing.id, {
      status: 'occupied',
      updated_at: now
    });
    invalidateCache('housing');
  }

  // อัปเดตคำร้อง Residence_{year} → completed
  try {
    var resSheetName = getYearSheetName('Residence', queueItem.request_year || CURRENT_YEAR);
    updateRowInSheet(SPREADSHEET_IDS.REQUESTS, resSheetName, 'id', queueItem.request_id, {
      status: 'completed',
      assigned_house: houseDisplayNumber,
      reviewed_at: now
    });
  } catch (e) { /* ไม่สามารถ sync ได้ */ }

  // Log
  writeLog('APPROVE_FROM_QUEUE', data._userId || 'ADMIN',
    'อนุมัติจากคิว: ' + queueId + ' → ' + houseDisplayNumber, 'Request');

  return { success: true, message: 'อนุมัติและจัดบ้านสำเร็จ', house: houseDisplayNumber };
}

/**
 * ตั้งวันหมดอายุคิว
 * @param {Object} data - { queueId, date }
 * @returns {Object} { success, message }
 */
function setQueueExpiryDate(data) {
  var queueId = data.queueId || data.queue_id || '';
  var date = data.date || data.expiry_date || '';

  if (!queueId) return { success: false, error: 'กรุณาระบุ Queue ID' };
  if (!date) return { success: false, error: 'กรุณาระบุวันหมดอายุ' };

  var result = updateRowInSheet(SPREADSHEET_IDS.REQUESTS, SHEET_NAMES.QUEUE, 'id', queueId, {
    expiry_date: date
  });
  if (!result.success) return result;

  writeLog('SET_QUEUE_EXPIRY', data._userId || 'ADMIN',
    'ตั้งวันหมดอายุ: ' + queueId + ' → ' + date, 'Request');

  return { success: true, message: 'ตั้งวันหมดอายุสำเร็จ' };
}

/**
 * ตรวจ+หมดอายุคิวอัตโนมัติ
 * เรียกจาก Trigger หรือ manual
 * @returns {Object} { success, expired: number }
 */
function checkAndExpireQueue() {
  try {
    var allQueue = readSheetData(SPREADSHEET_IDS.REQUESTS, SHEET_NAMES.QUEUE);
    var now = new Date().toISOString();
    var expiredCount = 0;

    allQueue.forEach(function(item) {
      if (item.status !== 'waiting') return;
      if (!item.expiry_date) return;

      if (String(item.expiry_date) < now) {
        // หมดอายุ
        updateRowInSheet(SPREADSHEET_IDS.REQUESTS, SHEET_NAMES.QUEUE, 'id', item.id, {
          status: 'expired'
        });

        // Sync กลับ Residence_{year}
        try {
          var resSheetName = getYearSheetName('Residence', item.request_year || CURRENT_YEAR);
          updateRowInSheet(SPREADSHEET_IDS.REQUESTS, resSheetName, 'id', item.request_id, {
            status: 'expired'
          });
        } catch (e) { /* ไม่สามารถ sync */ }

        expiredCount++;
      }
    });

    if (expiredCount > 0) {
      writeLog('QUEUE_EXPIRE', 'SYSTEM', 'คิวหมดอายุ: ' + expiredCount + ' รายการ', 'Request');
    }

    return { success: true, expired: expiredCount };
  } catch (e) {
    return { success: true, expired: 0 };
  }
}

// ============================================================================
// ATTACHMENTS — ไฟล์แนบคำร้อง
// ============================================================================

/**
 * บันทึกไฟล์แนบลง Drive
 * @param {Array} files - array of { name, mimeType, base64 }
 * @param {string} type - ประเภทคำร้อง
 * @param {string} requestId - Request ID
 * @returns {string[]} array of file IDs
 */
function saveRequestAttachments(files, type, requestId) {
  var folderId = getRequestFolderId(type);
  if (!folderId) {
    throw new Error('ไม่พบโฟลเดอร์สำหรับคำร้อง: ' + type);
  }

  var folder = DriveApp.getFolderById(folderId);
  var fileIds = [];

  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    var fileName = requestId + '_' + (i + 1) + '_' + (file.name || 'attachment');

    try {
      // แปลง base64 → Blob
      var base64Content = String(file.base64 || '').replace(/^data:[^;]+;base64,/, '');
      if (!base64Content) continue;

      var blob = Utilities.newBlob(
        Utilities.base64Decode(base64Content),
        file.mimeType || 'application/octet-stream',
        fileName
      );

      var driveFile = folder.createFile(blob);
      driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fileIds.push(driveFile.getId());
    } catch (e) {
      writeLog('ATTACHMENT_ERROR', 'SYSTEM',
        'บันทึกไฟล์แนบไม่สำเร็จ: ' + fileName + ' — ' + e.message, 'Request');
    }
  }

  return fileIds;
}

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

/**
 * ดึงปี พ.ศ. จากวันที่
 * @param {string} dateStr - วันที่ เช่น '2569-02-17' หรือ ISO string
 * @returns {string} ปี เช่น '2569'
 * @private
 */
function _getYearFromDate(dateStr) {
  if (!dateStr) return String(CURRENT_YEAR);
  var parts = String(dateStr).split('-');
  if (parts.length >= 1 && parts[0].length === 4) {
    return parts[0];
  }
  return String(CURRENT_YEAR);
}

// ============================================================================
// END OF Request.gs
// ============================================================================
