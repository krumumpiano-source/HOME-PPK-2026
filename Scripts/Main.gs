/**
 * ============================================================================
 * HOME PPK 2026 - Main.gs — 🌐 Router หลัก (จุดเข้า Web App)
 * ============================================================================
 * Entry Point ของ Web App — รับ request จาก Frontend (ผ่าน fetch())
 * แล้วส่งต่อไปยังไฟล์ .gs ที่ถูกต้อง
 * 
 * ฟีเจอร์:
 *   - doGet(e): รับ GET request → route ตาม e.parameter.action
 *   - doPost(e): รับ POST request → parse JSON body → route ตาม action
 *   - Session validation: ตรวจ token ก่อนเข้าถึง protected routes
 *   - jsonResponse / errorResponse: สร้าง JSON response มาตรฐาน
 *   - routeGetAction / routePostAction: จัดการ routing แยก GET/POST
 *   - safeExecute wrapper: try-catch + logging ทุก route
 * 
 * Version: 1.0
 * วันที่สร้าง: 17 กุมภาพันธ์ 2569
 * Step: 18 (ระยะที่ 2)
 * ============================================================================
 * 
 * Dependencies: Config.gs, Database.gs
 * Next: Auth.gs (Step 19) — ต้อง deploy Main.gs ก่อนเพื่อทดสอบ Web App
 * 
 * HTML Serving Method: fetch() เรียก Web App URL (ไม่ใช่ google.script.run)
 * Frontend ใช้ callBackend(action, data) → fetch(WEB_APP_URL, {...})
 * 
 * CORS Note:
 *   GAS Web App deployed as "Anyone" จะ redirect (302) ก่อนตอบ
 *   Frontend ต้องใช้ redirect: 'follow' ใน fetch options
 *   ใช้ Content-Type: text/plain (ไม่ใช่ application/json) เพราะ GAS
 *   ไม่รับ preflight CORS request
 * 
 * ============================================================================
 */

// ============================================================================
// PUBLIC ACTIONS — ไม่ต้องตรวจ session
// ============================================================================

const PUBLIC_ACTIONS = ['login', 'register', 'resetPassword', 'findEmail', 'logout'];

// ============================================================================
// ADMIN-ONLY ACTIONS — ผู้พักอาศัยทั่วไปเข้าไม่ได้
// ============================================================================

const ADMIN_ONLY_ACTIONS = [
  'getHousing', 'getResidents', 'getWaterBills', 'getElectricBills',
  'getBillSummaryAll', 'getNotificationHistory', 'getSlipSubmissions',
  'getQueue', 'getIncome', 'getExpense', 'getMonthlyWithdraw',
  'loadAccountingData', 'getCarryForward', 'calculateAutoEntries',
  'getWaterBillTotal', 'getElectricBillPEA', 'getPendingRegistrations',
  'submitWaterBill', 'submitElectricBill', 'saveNotification',
  'addHousing', 'updateHousing', 'deleteHousing',
  'addResident', 'updateResident', 'removeResident',
  'approveRegistration', 'rejectRegistration',
  'saveAccountingEntry', 'deleteAccountingEntry',
  'saveWithdraw', 'deleteWithdraw',
  'cleanupDuplicateHousing'
];

// ============================================================================
// GET ACTIONS — route mapping
// ============================================================================

const GET_ACTIONS = {
  'getSettings':              'getSettings',
  'getHousing':               'getHousingList',
  'getResidents':             'getResidentsList',
  'getUserProfile':           'getUserProfile',
  'getCoresidents':           'getCoresidents',
  'getWaterBills':            'getWaterBills',
  'getElectricBills':         'getElectricBills',
  'getSlipSubmissions':       'getSlipSubmissions',
  'getPaymentHistory':        'getPaymentHistory',
  'getOutstanding':           'getOutstanding',
  'getRequests':              'getRequests',
  'getQueue':                 'getQueue',
  'getIncome':                'getIncome',
  'getExpense':               'getExpense',
  'getAnnouncements':         'getAnnouncements',
  'getPendingRegistrations':  'getPendingRegistrations',
  'getNotificationHistory':   'getNotificationHistory',
  'getHousingFormat':         'getHousingFormat',
  'getWaterRate':             'getWaterRate',
  'getCurrentUser':           'getCurrentUser',

  // ── Dashboard (single call) ──
  'getDashboardData':         'getDashboardData',

  // ── batchGet — รวมหลาย action ใน 1 request ──
  'batchGet':                 'handleBatchGet',

  // ── Billing Summary ──
  'getBillSummaryAll':        'getBillSummaryAll',
  'getCommonFee':             'getCommonFee',
  'getDueDate':               'getDueDate',

  // ── Finance ──
  'getMonthlyWithdraw':       'getMonthlyWithdraw',
  'loadAccountingData':       'loadAccountingData',
  'getCarryForward':          'getCarryForward',
  'calculateAutoEntries':     'calculateAutoEntries',
  'getWaterBillTotal':        'getWaterBillTotal',
  'getElectricBillPEA':       'getElectricBillPEA',

  // ── Housing / Regulations ──
  'getRegulationsPdf':        'getRegulationsPdf'
};

// ============================================================================
// POST ACTIONS — route mapping
// ============================================================================

const POST_ACTIONS = {
  // ── Auth (Public) ──
  'login':                    'handleLogin',
  'register':                 'handleRegister',
  'resetPassword':            'handleResetPassword',
  'findEmail':                'handleFindEmail',
  'logout':                   'handleLogout',

  // ── Auth (Protected) ──
  'changePassword':           'handleChangePassword',
  'approveRegistration':      'approveRegistration',
  'rejectRegistration':       'rejectRegistration',

  // ── Profile ──
  'updateProfile':            'handleUpdateProfile',

  // ── Coresidents ──
  'addCoresident':            'addCoresident',
  'updateCoresident':         'updateCoresident',
  'removeCoresident':         'removeCoresident',

  // ── Housing ──
  'addHousing':               'addHousing',
  'updateHousing':            'updateHousing',
  'deleteHousing':            'deleteHousing',

  // ── Residents ──
  'addResident':              'addResident',
  'updateResident':           'updateResident',
  'removeResident':           'removeResident',

  // ── Billing ──
  'submitWaterBill':          'saveWaterBill',
  'submitElectricBill':       'saveElectricBill',

  // ── Payment ──
  'submitSlip':               'handleSubmitSlip',
  'reviewSlip':               'handleReviewSlip',

  // ── Requests ──
  'submitRequest':            'handleSubmitRequest',
  'reviewRequest':            'handleReviewRequest',
  'updateQueue':              'handleUpdateQueue',

  // ── Finance ──
  'saveWithdraw':             'handleSaveWithdraw',
  'saveAccounting':           'handleSaveAccounting',
  'uploadReceiptImage':       'uploadReceiptImage',

  // ── Settings ──
  'updateSettings':           'handleUpdateSettings',
  'saveHousingFormat':        'saveHousingFormat',

  // ── Announcements ──
  'addAnnouncement':          'handleAddAnnouncement',
  'deleteAnnouncement':       'deleteAnnouncement',

  // ── Permissions ──
  'updatePermissions':        'updatePermissions',

  // ── Notification ──
  'sendNotification':         'handleSendNotification',
  'saveNotificationSnapshot': 'saveNotificationSnapshot',

  // ── Admin Maintenance ──
  'cleanupDuplicateHousing':  'cleanupDuplicateHousing',

  // ── Export/Import ──
  'exportResidents':          'exportResidents',
  'importResidents':          'importResidents',

  // ── Slip Image ──
  'uploadSlipImage':          'uploadSlipImage'
};

// ============================================================================
// HTML PAGES — รายชื่อหน้าทั้งหมดที่เสิร์ฟจาก GAS (ไม่มี .html)
// ============================================================================
// GITHUB PAGES URL  Frontend ย้ายไป GitHub Pages | GAS = Backend API เท่านั้น
// ============================================================================

var GITHUB_PAGES_URL = 'https://krumumpiano-source.github.io/HOME-PPK-2026/login.html';

// doGet — รับ GET request
// ============================================================================

/**
 * Entry point สำหรับ GET request
 * - ถ้าไม่มี action → เสิร์ฟ HTML page (ดู HTML_PAGES)
 * - ถ้ามี action → route ไปยัง API handler
 * @param {Object} e - event object จาก GAS Web App
 * @returns {HtmlOutput|ContentService.TextOutput}
 */
function doGet(e) {
  try {
    var params = e ? (e.parameter || {}) : {};
    var action = params.action || '';

    // ถ้าไม่มี action → redirect ไป GitHub Pages (Frontend ย้ายไปแล้ว)
    if (!action) {
      return HtmlService.createHtmlOutput(
        '<!DOCTYPE html><html><head>'
        + '<meta http-equiv="refresh" content="0;url=' + GITHUB_PAGES_URL + '">'
        + '<title>HOME PPK 2026</title></head><body>'
        + '<p style="font-family:sans-serif;text-align:center;padding:2rem;">'
        + 'กำลังนำทางไปยังระบบ... <a href="' + GITHUB_PAGES_URL + '">คลิกที่นี่</a></p>'
        + '</body></html>'
      ).setTitle('HOME PPK 2026');
    }

    // ตรวจว่า action มี route
    if (!GET_ACTIONS[action]) {
      return errorResponse('INVALID_ACTION', 'ไม่พบ action: ' + action);
    }

    // Session validation สำหรับ GET (ยกเว้น public)
    if (!PUBLIC_ACTIONS.includes(action)) {
      var token = params.token || '';
      if (!token) {
        return errorResponse('AUTH_REQUIRED', 'ต้องระบุ token');
      }
      var session = validateSession(token);
      if (!session) {
        return jsonResponse({ success: false, error: 'SESSION_EXPIRED' });
      }
      // แนบ userId + role + residentId + houseNumber จาก session
      params._userId = session.userId;
      params._role = session.role || 'user';
      params._residentId = session.residentId || '';
      params._houseNumber = session.houseNumber || '';

      // ตรวจสิทธิ์ admin-only actions
      if (ADMIN_ONLY_ACTIONS.includes(action) && params._role !== 'admin') {
        return errorResponse('FORBIDDEN', 'ไม่มีสิทธิ์เข้าถึง action นี้');
      }
    }

    // Route ไปยังฟังก์ชันที่ถูกต้อง
    var result = routeGetAction(action, params);
    return jsonResponse(result);

  } catch (err) {
    writeLog('ERROR', 'SYSTEM', 'doGet: ' + err.message, 'Main');
    return errorResponse('INTERNAL_ERROR', err.message);
  }
}

// ============================================================================
// doPost — รับ POST request
// ============================================================================

/**
 * Entry point สำหรับ POST request
 * Parse JSON body → route ตาม action
 * @param {Object} e - event object จาก GAS Web App
 * @returns {ContentService.TextOutput} JSON response
 */
function doPost(e) {
  try {
    // Parse request body
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }

    var action = body.action || '';
    var token = body.token || '';

    // ลบ action และ token ออกจาก data
    var data = {};
    var keys = Object.keys(body);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i] !== 'action' && keys[i] !== 'token') {
        data[keys[i]] = body[keys[i]];
      }
    }

    if (!action) {
      return errorResponse('MISSING_ACTION', 'ต้องระบุ action');
    }

    // ตรวจว่า action มี route
    if (!POST_ACTIONS[action]) {
      return errorResponse('INVALID_ACTION', 'ไม่พบ action: ' + action);
    }

    // Session validation สำหรับ protected actions
    if (!PUBLIC_ACTIONS.includes(action)) {
      if (!token) {
        return errorResponse('AUTH_REQUIRED', 'ต้องระบุ token');
      }
      var session = validateSession(token);
      if (!session) {
        return jsonResponse({ success: false, error: 'SESSION_EXPIRED' });
      }
      data._userId = session.userId;
      data._role = session.role || 'user';
      data._residentId = session.residentId || '';
      data._houseNumber = session.houseNumber || '';

      // ตรวจสิทธิ์ admin-only actions
      if (ADMIN_ONLY_ACTIONS.includes(action) && data._role !== 'admin') {
        return errorResponse('FORBIDDEN', 'ไม่มีสิทธิ์เข้าถึง action นี้');
      }
    }

    // Route ไปยังฟังก์ชันที่ถูกต้อง
    var result = routePostAction(action, data);

    // Invalidate cache หลัง write operations สำเร็จ
    if (result && result.success) {
      var housingWrites = ['addHousing','updateHousing','deleteHousing','addResident','updateResident','removeResident','cleanupDuplicateHousing'];
      var settingsWrites = ['updateSettings','saveHousingFormat'];
      var announcementWrites = ['addAnnouncement','deleteAnnouncement'];
      var paymentWrites = ['reviewSlip','manualPayment','submitSlip','updateOutstanding'];
      if (housingWrites.indexOf(action) !== -1) invalidateCache('housing','residents');
      if (settingsWrites.indexOf(action) !== -1) invalidateCache('settings','housingFormat','waterRate','commonFee');
      if (announcementWrites.indexOf(action) !== -1) invalidateCache('announcements');
      if (paymentWrites.indexOf(action) !== -1) {
        var sc = CacheService.getScriptCache();
        sc.remove('outstanding');
        sc.remove('payhist_' + CURRENT_YEAR);
        sc.remove('payhist_' + (CURRENT_YEAR - 1));
      }
    }

    return jsonResponse(result);

  } catch (err) {
    writeLog('ERROR', 'SYSTEM', 'doPost: ' + err.message, 'Main');
    return errorResponse('INTERNAL_ERROR', err.message);
  }
}

// ============================================================================
// RESPONSE HELPERS — สร้าง JSON response
// ============================================================================

/**
 * สร้าง JSON response ผ่าน ContentService
 * @param {Object} data - ข้อมูลที่จะส่งกลับ
 * @returns {ContentService.TextOutput} JSON response
 */
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * สร้าง error response มาตรฐาน
 * @param {string} code - error code เช่น 'INVALID_ACTION', 'AUTH_REQUIRED'
 * @param {string} message - ข้อความ error
 * @returns {ContentService.TextOutput} JSON error response
 */
function errorResponse(code, message) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: false,
      error: code,
      message: message || 'เกิดข้อผิดพลาด'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================================
// SESSION VALIDATION — ตรวจ token (เรียก Auth.gs)
// ============================================================================

/**
 * ตรวจสอบ session token
 * ใน Phase นี้ (ก่อน Auth.gs พร้อม) → return stub
 * เมื่อ Auth.gs พร้อม (Step 19) → ฟังก์ชันนี้จะถูก override โดย Auth.gs
 * 
 * @param {string} token - session token
 * @returns {Object|null} session data { userId, createdAt } หรือ null ถ้าหมดอายุ
 */
function validateSession(token) {
  if (!token) return null;

  // ── ตรวจ CacheService ก่อน (เร็ว ~5ms) ──
  var cache = CacheService.getScriptCache();
  var cacheKey = 'sess_' + token;
  var cached = cache.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch(e) {}
  }

  // ── อ่าน PropertiesService (ช้า ~300ms) เฉพาะเมื่อ cache miss ──
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty('session_' + token);
  if (!raw) return null;

  try {
    var sessionData = JSON.parse(raw);
    var MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 ชั่วโมง

    // ตรวจหมดอายุ realtime
    if (Date.now() - sessionData.createdAt > MAX_AGE_MS) {
      props.deleteProperty('session_' + token);
      cache.remove(cacheKey);
      return null;
    }

    // Cache session 5 นาที ลด PropertiesService read
    cache.put(cacheKey, JSON.stringify(sessionData), 300);
    return sessionData; // { userId, createdAt }
  } catch (e) {
    props.deleteProperty('session_' + token);
    cache.remove(cacheKey);
    return null;
  }
}

// ============================================================================
// GAS CACHE HELPER — Server-side cache ด้วย CacheService (TTL 5 นาที)
// ============================================================================

/**
 * ดึงข้อมูลจาก Cache ก่อน ถ้า miss → รันฟังก์ชัน แล้ว cache ผล
 * @param {string} key     - cache key
 * @param {Function} fn    - ฟังก์ชันที่ return data
 * @param {number} ttlSec  - อายุ cache (วินาที, default 300 = 5 นาที)
 * @returns {Object} ผลลัพธ์จาก fn หรือจาก cache
 */
function gasCache(key, fn, ttlSec) {
  ttlSec = ttlSec || 300;
  var cache = CacheService.getScriptCache();
  var cacheKey = 'data_' + key;
  try {
    var cached = cache.get(cacheKey);
    if (cached) {
      var parsed = JSON.parse(cached);
      parsed._fromCache = true;
      return parsed;
    }
  } catch (e) {}

  var result = fn();
  if (result && result.success !== false) {
    try {
      var str = JSON.stringify(result);
      // CacheService จำกัด 100KB ต่อ key
      if (str.length < 100000) cache.put(cacheKey, str, ttlSec);
    } catch (e) {}
  }
  return result;
}

/**
 * ล้าง cache หลัง write operations (housing, residents, settings, announcements)
 * @param {...string} keys - ชื่อ cache key ที่ต้องการล้าง
 */
function invalidateCache() {
  var keys = Array.prototype.slice.call(arguments);
  var cache = CacheService.getScriptCache();
  try {
    cache.removeAll(keys.map(function(k) { return 'data_' + k; }));
  } catch (e) {}
}

// ============================================================================
// GET ROUTER — ส่งต่อ GET action ไปยังฟังก์ชันที่ถูกต้อง
// ============================================================================

/**
 * Route GET actions ไปยังฟังก์ชันที่ถูกต้อง
 * ใช้ safeExecute เพื่อ try-catch + logging ทุก route
 * 
 * @param {string} action - ชื่อ action
 * @param {Object} params - parameters จาก URL
 * @returns {Object} ผลลัพธ์จากฟังก์ชัน handler
 */
function routeGetAction(action, params) {
  return safeExecute(function() {
    switch (action) {
      // ── Settings & Housing ── (cache 5 นาที)
      case 'getSettings':
        return gasCache('settings', function() { return getSettings(); });
      case 'getHousing':
        return gasCache('housing', function() { return getHousingList(); });
      case 'getResidents':
        return gasCache('residents', function() { return getResidentsList(); });
      case 'getAnnouncements':
        return gasCache('announcements', function() { return getAnnouncements(); }, 180);
      case 'getUserProfile':
        return getUserProfile(params.userId || params._userId);
      case 'getCoresidents':
        var _coResidentId = params.residentId;
        if (!_coResidentId && params._userId) {
          var _coUser = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.USERS, 'id', params._userId);
          if (_coUser) _coResidentId = _coUser.resident_id;
        }
        return getCoresidents(_coResidentId);
      case 'getStaffCoresidents':
        return getStaffCoresidents();
      case 'getHousingFormat':
        return gasCache('housingFormat', function() { return getHousingFormat(); });
      case 'getWaterRate':
        return gasCache('waterRate', function() { return getWaterRate(); });

      // ── batchGet — รวมหลาย action ใน 1 request ──
      case 'batchGet':
        return handleBatchGet(params);

      // ── Billing ──
      case 'getWaterBills':
        return getWaterBills(params.period);
      case 'getElectricBills':
        return getElectricBills(params.period);
      case 'getNotificationHistory':
        return getNotificationHistory(params.period);

      // ── Payment ──
      case 'getSlipSubmissions':
        return getSlipSubmissions(params.period);
      case 'getPaymentHistory':
        return getPaymentHistory(params.userId || params._userId, params.month, params.year, params._houseNumber);
      case 'getOutstanding':
        return getOutstanding(params.period);

      // ── Requests ──
      case 'getRequests':
        return getRequests(params.type, params.year, params);
      case 'getQueue':
        return getQueue();

      // ── Finance ──
      case 'getIncome':
        return getIncome(params.period);
      case 'getExpense':
        return getExpense(params.period);
      case 'getMonthlyWithdraw':
        return getMonthlyWithdraw(params.period);
      case 'loadAccountingData':
        return loadAccountingData(params.period);
      case 'getCarryForward':
        return { success: true, carryForward: getCarryForward(params.period) };
      case 'calculateAutoEntries':
        return calculateAutoEntries(params.period);
      case 'getWaterBillTotal':
        return getWaterBillTotal(params.period);
      case 'getElectricBillPEA':
        return getElectricBillPEA(params.period);

      // ── Billing Summary ──
      case 'getBillSummaryAll':
        return getBillSummaryAll(params.period);
      case 'getCommonFee':
        return gasCache('commonFee', function() { return getCommonFee(); });
      case 'getDueDate':
        return gasCache('dueDate', function() { return getDueDate(); });

      // ── Housing / Regulations ──
      case 'getRegulationsPdf':
        return getRegulationsPdf();

      // ── Auth ──
      case 'getPendingRegistrations':
        return getPendingRegistrations();
      case 'getCurrentUser':
        return getCurrentUser(params._userId);

      // ── Dashboard (single call) ──
      case 'getDashboardData':
        return getDashboardData(params);

      default:
        return { success: false, error: 'UNKNOWN_GET_ACTION', action: action };
    }
  }, 'GET:' + action);
}

// ============================================================================
// POST ROUTER — ส่งต่อ POST action ไปยังฟังก์ชันที่ถูกต้อง
// ============================================================================

/**
 * Route POST actions ไปยังฟังก์ชันที่ถูกต้อง
 * ใช้ safeExecute เพื่อ try-catch + logging ทุก route
 * 
 * @param {string} action - ชื่อ action
 * @param {Object} data - ข้อมูลจาก request body
 * @returns {Object} ผลลัพธ์จากฟังก์ชัน handler
 */
function routePostAction(action, data) {
  return safeExecute(function() {
    switch (action) {
      // ── Auth (Public) ──
      case 'login':
        return handleLogin(data);
      case 'register':
        return handleRegister(data);
      case 'resetPassword':
        return handleResetPassword(data);
      case 'findEmail':
        return handleFindEmail(data);
      case 'logout':
        return handleLogout(data);

      // ── Auth (Protected) ──
      case 'changePassword':
        return handleChangePassword(data);
      case 'approveRegistration':
        return approveRegistration(data.regId, data);
      case 'rejectRegistration':
        return rejectRegistration(data.regId, data.note);

      // ── Profile ──
      case 'updateProfile':
        return handleUpdateProfile(data);

      // ── Coresidents ──
      case 'addCoresident':
        return addCoresident(data);
      case 'updateCoresident':
        return updateCoresident(data.id, data);
      case 'removeCoresident':
        return removeCoresident(data.id);

      // ── Housing ──
      case 'addHousing':
        return addHousing(data);
      case 'updateHousing':
        return updateHousing(data.id, data);
      case 'deleteHousing':
        return deleteHousing(data.id);

      // ── Residents ──
      case 'addResident':
        return addResident(data);
      case 'updateResident':
        return updateResident(data.id, data);
      case 'removeResident':
        return removeResident(data.id);

      // ── Billing ──
      case 'submitWaterBill':
        return saveWaterBill(data);
      case 'submitElectricBill':
        return saveElectricBill(data);

      // ── Payment ──
      case 'submitSlip':
        return handleSubmitSlip(data);
      case 'reviewSlip':
        return handleReviewSlip(data);
      case 'uploadSlipImage':
        return uploadSlipImage(data);

      // ── Requests ──
      case 'submitRequest':
        return handleSubmitRequest(data);
      case 'reviewRequest':
        return handleReviewRequest(data);
      case 'updateQueue':
        return handleUpdateQueue(data);

      // ── Finance ──
      case 'saveWithdraw':
        return handleSaveWithdraw(data);
      case 'saveAccounting':
        return handleSaveAccounting(data);
      case 'uploadReceiptImage':
        return uploadReceiptImage(data);

      // ── Settings ──
      case 'updateSettings':
        return handleUpdateSettings(data);
      case 'saveHousingFormat':
        return saveHousingFormat(data);

      // ── Announcements ──
      case 'addAnnouncement':
        return handleAddAnnouncement(data);
      case 'deleteAnnouncement':
        return deleteAnnouncement(data.id);

      // ── Permissions ──
      case 'updatePermissions':
        return updatePermissions(data);

      // ── Notification ──
      case 'sendNotification':
        return handleSendNotification(data);
      case 'saveNotificationSnapshot':
        return saveNotificationSnapshot(data);

      // ── Export/Import ──
      case 'exportResidents':
        return exportResidents(data);
      case 'importResidents':
        return importResidents(data);

      // ── Admin Maintenance ──
      case 'cleanupDuplicateHousing':
        return cleanupDuplicateHousing();
      case 'clearAllData':
        return clearAllData();

      default:
        return { success: false, error: 'UNKNOWN_POST_ACTION', action: action };
    }
  }, 'POST:' + action);
}

// ============================================================================
// DASHBOARD DATA — single-call รวมข้อมูลสำหรับหน้า Dashboard
// ============================================================================

/**
 * ดึงข้อมูลทั้งหมดสำหรับหน้า Dashboard ใน 1 API call
 * แทนที่ getCurrentUser + getAnnouncements + getOutstanding + getPaymentHistory
 * กรองข้อมูลตาม houseNumber เสมอ (ทั้ง resident และ admin ที่อยู่บ้านพักด้วย)
 * admin ที่ไม่มี resident_id จะเห็น outstanding ทั้งหมด
 * @param {Object} params - { _userId, _role, _residentId, _houseNumber }
 * @returns {Object} { success, user, announcements, outstanding, recentPayments }
 */
function getDashboardData(params) {
  var userId = params._userId;
  var role = params._role || 'user';
  var houseNumber = params._houseNumber;
  var residentId = params._residentId;
  var result = { success: true };

  // ── 1. User info ──
  try { result.user = getCurrentUser(userId); } catch (e) { result.user = { success: false }; }

  // ── 2. Announcements (เล็ก → อ่านเร็ว) ──
  try {
    var annResult = getAnnouncements();
    result.announcements = annResult.success ? annResult.data : [];
  } catch (e) { result.announcements = []; }

  // ── 3. Outstanding ──
  try {
    var outResult = getOutstanding();
    var outData = outResult.success ? outResult.data : [];
    if (houseNumber) {
      // กรองเฉพาะบ้านตัวเอง (ใช้กับทุก role รวมถึง admin ที่พักอาศัยด้วย)
      // admin ที่ไม่มี houseNumber (ไม่ได้พักอยู่) จะเห็น outstanding ทั้งหมด
      outData = outData.filter(function(r) {
        return String(r.house_number) === String(houseNumber);
      });
    }
    result.outstanding = outData;
  } catch (e) { result.outstanding = []; }

  // ── 4. Recent Payment History (เฉพาะบ้านตัวเอง) ──
  try {
    var payResult = getPaymentHistory(userId, null, null, houseNumber);
    result.recentPayments = payResult.success ? payResult.data : [];
  } catch (e) { result.recentPayments = []; }

  return result;
}

// ============================================================================
// MODULE REFERENCES — ฟังก์ชันทั้งหมดอยู่ในไฟล์ .gs ที่เกี่ยวข้อง
// ============================================================================

// ============================================================================
// BATCH GET — รวมหลาย action ใน 1 HTTP request
// ============================================================================

/**
 * batchGet: รับ keys=action1,action2,... → รันทุก action แล้วตอบรวมกัน
 * ลด HTTP round-trips จาก 5 ครั้ง → 1 ครั้ง
 * ตัวอย่าง: GET ?action=batchGet&keys=getSettings,getHousing,getResidents&token=xxx
 */
function handleBatchGet(params) {
  var keys = (params.keys || '').split(',').map(function(k) { return k.trim(); }).filter(Boolean);
  if (!keys.length) return { success: false, error: 'ต้องระบุ keys' };

  var ALLOWED_BATCH_KEYS = [
    'getSettings', 'getHousing', 'getResidents', 'getAnnouncements',
    'getPendingRegistrations', 'getHousingFormat', 'getWaterRate',
    'getCommonFee', 'getDueDate', 'getQueue'
  ];

  var results = {};
  keys.forEach(function(key) {
    if (!ALLOWED_BATCH_KEYS.includes(key)) {
      results[key] = { success: false, error: 'ไม่อนุญาต key: ' + key };
      return;
    }
    try {
      results[key] = routeGetAction(key, params);
    } catch (e) {
      results[key] = { success: false, error: e.message };
    }
  });

  return { success: true, results: results, _batchedAt: Date.now() };
}


// ✅ ไฟล์ .gs ครบทุกโมดูลแล้ว — ไม่มี stub เหลือ
// ============================================================================

// ── Auth stubs (Step 19: Auth.gs) — ✅ ย้ายไป Auth.gs แล้ว ──
// ฟังก์ชันทั้งหมดอยู่ใน Auth.gs: handleLogin, handleRegister, handleResetPassword,
// handleFindEmail, handleChangePassword, approveRegistration, rejectRegistration,
// getPendingRegistrations, getCurrentUser

// ── Housing stubs (Step 20: Housing.gs) — ✅ ย้ายไป Housing.gs แล้ว ──
// ฟังก์ชันทั้งหมดอยู่ใน Housing.gs: getSettings, getHousingList, getResidentsList,
// getUserProfile, getCoresidents, getAnnouncements, getHousingFormat, getWaterRate,
// handleUpdateProfile, addCoresident, updateCoresident, removeCoresident,
// addHousing, updateHousing, deleteHousing, addResident, updateResident, removeResident,
// handleUpdateSettings, saveHousingFormat, handleAddAnnouncement, deleteAnnouncement,
// updatePermissions, exportResidents, importResidents, getAvailableHousing,
// getPermissions, getRegulationsPdf, uploadRegulationsPdf, moveResident

// ── Billing (Step 21): ฟังก์ชันทั้งหมดอยู่ใน Billing.gs ──
// getWaterBills, getElectricBills, saveWaterBill, saveElectricBill,
// getNotificationHistory, saveNotificationSnapshot, getBillSummary, getBillSummaryAll,
// getCommonFee, setCommonFee, getExemptList, setExempt

// ── Payment (Step 22): ฟังก์ชันทั้งหมดอยู่ใน Payment.gs ──
// getSlipSubmissions, getPaymentHistory, getOutstanding, handleSubmitSlip,
// handleReviewSlip, uploadSlipImage, handleManualPayment, getDueDate

// ── Request (Step 23): ฟังก์ชันทั้งหมดอยู่ใน Request.gs ──
// getRequests, getRequestDetail, getQueue, handleSubmitRequest, handleReviewRequest,
// handleUpdateQueue, addToQueue, removeFromQueue, approveFromQueue

// ── Finance (Step 24): ฟังก์ชันทั้งหมดอยู่ใน Finance.gs ──
// getMonthlyWithdraw, handleSaveWithdraw, getWaterBillTotal, getElectricBillPEA,
// loadAccountingData, handleSaveAccounting, deleteAccountingEntry, calculateAutoEntries,
// getCarryForward, getIncome, getExpense, uploadReceiptImage

// ── Notification (Step 25): ฟังก์ชันทั้งหมดอยู่ใน Notification.gs ──
// handleSendNotification, sendPaymentNotification, sendBulkNotifications,
// sendPaymentReminder, sendBulkReminders, sendReceipt, sendBulkReceipts,
// sendPasswordResetEmail, sendRequestStatusEmail, buildEmailTemplate

// ============================================================================
// TEST FUNCTION — รันใน GAS Editor เพื่อตรวจสอบ
// ============================================================================

/**
 * ทดสอบ Main.gs — รันใน GAS Editor
 * ✅ ผ่าน = doGet/doPost ทำงาน, route ครบ, response format ถูก
 * ❌ ไม่ผ่าน = error → ตรวจ Main.gs
 */
function testMain() {
  Logger.log('=== TEST MAIN.gs ===');

  // Test 1: doGet ไม่มี action → เสิร์ฟ HTML login page
  Logger.log('\n--- TEST 1: doGet no action → HTML login page ---');
  var htmlResult = doGet({ parameter: {} });
  Logger.log('  Result type: ' + htmlResult.constructor.name);
  // HtmlOutput ไม่มี .success field — ตรวจแค่ว่ามี .getContent()
  var htmlContent = htmlResult.getContent();
  if (!htmlContent || htmlContent.length < 100) throw new Error('doGet HTML content too short');
  Logger.log('  HTML length: ' + htmlContent.length + ' chars ✔');
  Logger.log('  ✅ HTML login page OK');

  // Test 1b: doGet ?page=dashboard → HTML dashboard page
  Logger.log('\n--- TEST 1b: doGet page=dashboard → HTML ---');
  var dashResult = doGet({ parameter: { page: 'dashboard' } });
  var dashContent = dashResult.getContent();
  if (!dashContent || dashContent.length < 100) throw new Error('Dashboard HTML too short');
  Logger.log('  Dashboard HTML length: ' + dashContent.length + ' chars ✔');
  Logger.log('  ✅ HTML page serving OK');

  // Test 2: doGet invalid action → error
  Logger.log('\n--- TEST 2: doGet invalid action → error ---');
  var invalidResult = doGet({ parameter: { action: 'nonexistent' } });
  var invalidJson = JSON.parse(invalidResult.getContent());
  Logger.log('  Error: ' + JSON.stringify(invalidJson));
  if (invalidJson.success !== false) throw new Error('Should return error');
  if (invalidJson.error !== 'INVALID_ACTION') throw new Error('Wrong error code');
  Logger.log('  ✅ Invalid action error OK');

  // Test 3: doPost missing action → error
  Logger.log('\n--- TEST 3: doPost missing action → error ---');
  var missingResult = doPost({ postData: { contents: '{}' } });
  var missingJson = JSON.parse(missingResult.getContent());
  Logger.log('  Error: ' + JSON.stringify(missingJson));
  if (missingJson.success !== false) throw new Error('Should return error');
  if (missingJson.error !== 'MISSING_ACTION') throw new Error('Wrong error code');
  Logger.log('  ✅ Missing action error OK');

  // Test 4: doPost invalid action → error
  Logger.log('\n--- TEST 4: doPost invalid action → error ---');
  var invalidPostResult = doPost({ postData: { contents: '{"action":"nonexistent"}' } });
  var invalidPostJson = JSON.parse(invalidPostResult.getContent());
  Logger.log('  Error: ' + JSON.stringify(invalidPostJson));
  if (invalidPostJson.error !== 'INVALID_ACTION') throw new Error('Wrong error code');
  Logger.log('  ✅ Invalid POST action error OK');

  // Test 5: doPost public action (login) → stub response
  Logger.log('\n--- TEST 5: doPost login (public, no token) → stub ---');
  var loginResult = doPost({ postData: { contents: '{"action":"login","email":"test@test.com","password":"123"}' } });
  var loginJson = JSON.parse(loginResult.getContent());
  Logger.log('  Login stub: ' + JSON.stringify(loginJson));
  // Should not return AUTH_REQUIRED (login is public)
  if (loginJson.error === 'AUTH_REQUIRED') throw new Error('login should be public, no auth required');
  Logger.log('  ✅ Public action OK');

  // Test 6: doPost protected action without token → AUTH_REQUIRED
  Logger.log('\n--- TEST 6: doPost protected action no token → AUTH_REQUIRED ---');
  var noTokenResult = doPost({ postData: { contents: '{"action":"updateSettings"}' } });
  var noTokenJson = JSON.parse(noTokenResult.getContent());
  Logger.log('  No token: ' + JSON.stringify(noTokenJson));
  if (noTokenJson.error !== 'AUTH_REQUIRED') throw new Error('Should require auth');
  Logger.log('  ✅ Protected action requires token OK');

  // Test 7: doPost protected action with invalid token → SESSION_EXPIRED
  Logger.log('\n--- TEST 7: doPost protected action invalid token → SESSION_EXPIRED ---');
  var badTokenResult = doPost({ postData: { contents: '{"action":"updateSettings","token":"fake-token-123"}' } });
  var badTokenJson = JSON.parse(badTokenResult.getContent());
  Logger.log('  Bad token: ' + JSON.stringify(badTokenJson));
  if (badTokenJson.error !== 'SESSION_EXPIRED') throw new Error('Should expire session');
  Logger.log('  ✅ Invalid token session expired OK');

  // Test 8: doGet protected action without token → AUTH_REQUIRED
  Logger.log('\n--- TEST 8: doGet protected action no token → AUTH_REQUIRED ---');
  var getNoTokenResult = doGet({ parameter: { action: 'getSettings' } });
  var getNoTokenJson = JSON.parse(getNoTokenResult.getContent());
  Logger.log('  No token GET: ' + JSON.stringify(getNoTokenJson));
  if (getNoTokenJson.error !== 'AUTH_REQUIRED') throw new Error('Should require auth for GET');
  Logger.log('  ✅ GET protected action requires token OK');

  // Test 9: jsonResponse format
  Logger.log('\n--- TEST 9: jsonResponse format ---');
  var testResp = jsonResponse({ success: true, data: 'test' });
  var testRespContent = testResp.getContent();
  var testRespParsed = JSON.parse(testRespContent);
  Logger.log('  Response: ' + testRespContent);
  if (!testRespParsed.success) throw new Error('jsonResponse format wrong');
  Logger.log('  ✅ jsonResponse format OK');

  // Test 10: errorResponse format
  Logger.log('\n--- TEST 10: errorResponse format ---');
  var errResp = errorResponse('TEST_ERROR', 'ทดสอบ error');
  var errRespParsed = JSON.parse(errResp.getContent());
  Logger.log('  Error response: ' + JSON.stringify(errRespParsed));
  if (errRespParsed.success !== false) throw new Error('errorResponse should be false');
  if (errRespParsed.error !== 'TEST_ERROR') throw new Error('errorResponse code wrong');
  Logger.log('  ✅ errorResponse format OK');

  // Test 11: Route counts
  Logger.log('\n--- TEST 11: Route counts ---');
  var getCount = Object.keys(GET_ACTIONS).length;
  var postCount = Object.keys(POST_ACTIONS).length;
  Logger.log('  GET routes: ' + getCount);
  Logger.log('  POST routes: ' + postCount);
  if (getCount < 17) throw new Error('GET routes < 17');
  if (postCount < 18) throw new Error('POST routes < 18');
  Logger.log('  ✅ Route counts OK');

  // Test 12: PUBLIC_ACTIONS list
  Logger.log('\n--- TEST 12: PUBLIC_ACTIONS ---');
  Logger.log('  Public actions: ' + PUBLIC_ACTIONS.join(', '));
  if (!PUBLIC_ACTIONS.includes('login')) throw new Error('login should be public');
  if (!PUBLIC_ACTIONS.includes('register')) throw new Error('register should be public');
  if (!PUBLIC_ACTIONS.includes('resetPassword')) throw new Error('resetPassword should be public');
  if (!PUBLIC_ACTIONS.includes('findEmail')) throw new Error('findEmail should be public');
  if (PUBLIC_ACTIONS.includes('updateSettings')) throw new Error('updateSettings should NOT be public');
  Logger.log('  ✅ PUBLIC_ACTIONS OK');

  // Test 13: Null safe doGet/doPost
  Logger.log('\n--- TEST 13: Null safety ---');
  var nullGetResult = doGet(null);
  var nullGetContent = nullGetResult.getContent();
  if (!nullGetContent || nullGetContent.length < 100) throw new Error('doGet(null) should return HTML');
  Logger.log('  doGet(null) HTML length: ' + nullGetContent.length + ' ✔');

  var nullPostResult = doPost(null);
  var nullPostJson = JSON.parse(nullPostResult.getContent());
  Logger.log('  doPost(null): ' + JSON.stringify(nullPostJson));
  if (nullPostJson.error !== 'MISSING_ACTION') throw new Error('doPost(null) should return MISSING_ACTION');
  Logger.log('  ✅ Null safety OK');

  Logger.log('\n✅ MAIN TEST PASSED — Router ทำงานครบ');
}

// ============================================================================
// END OF Main.gs
// ============================================================================
