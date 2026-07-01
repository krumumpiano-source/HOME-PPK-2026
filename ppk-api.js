/**
 * HOME PPK 2026 — Supabase API Wrapper
 * ดัดแปลงจากรูปแบบ Band Management By SoulCiety
 *
 * ใช้ Supabase JS SDK แทน raw fetch()
 * โหลดโดย ppk-app.js อัตโนมัติ — ไม่ต้องใส่ script tag เองในหน้า HTML
 *
 * Config มาจาก supabase/config.js → window._PPK_CONFIG
 */

// ── รอ Supabase SDK + Config โหลดเสร็จ แล้ว init client ──────────────
var _sbCfgUrl = '';
var _sbCfgAnon = '';
var _currentSessionToken = '';

function _createSbClient(token) {
  var opts = { auth: { persistSession: false } };
  if (token) {
    opts.global = { headers: { 'x-session-token': token } };
  }
  return window.supabase.createClient(_sbCfgUrl, _sbCfgAnon, opts);
}

function _updateSupabaseToken(token) {
  token = token || '';
  if (token === _currentSessionToken && window._sb) return;
  _currentSessionToken = token;
  if (_sbCfgUrl && _sbCfgAnon) {
    window._sb = _createSbClient(token);
  }
}

(function initSbClient() {
  function tryInit(tries) {
    tries = tries || 0;
    if (
      typeof window.supabase !== 'undefined' &&
      typeof window.supabase.createClient === 'function' &&
      window._PPK_CONFIG
    ) {
      var cfg = window._PPK_CONFIG;
      _sbCfgUrl = cfg.url;
      _sbCfgAnon = cfg.anon;
      // อ่าน session token จาก localStorage (ถ้ามี) เพื่อส่งไปกับทุก request
      var existingToken = localStorage.getItem('sessionToken') || '';
      _currentSessionToken = existingToken;
      window._sb = _createSbClient(existingToken);
      // Backward compat
      window.SUPABASE_URL      = cfg.url;
      window.SUPABASE_ANON_KEY = cfg.anon;
      console.log('[PPK API] Supabase SDK พร้อมใช้งาน');
    } else if (tries < 200) {
      setTimeout(function () { tryInit(tries + 1); }, 50);
    } else {
      console.error('[PPK API] Supabase SDK หรือ Config โหลดไม่สำเร็จ');
    }
  }
  tryInit();
})();

/* ──────────────────────────────────────────
   Natural Sort สำหรับ house_number
   "บ้าน1" < "บ้าน2" < "บ้าน10" (ไม่ใช่ "บ้าน1" < "บ้าน10" < "บ้าน2")
────────────────────────────────────────── */
function _naturalCmp(a, b) {
    var sa = String(a.house_number || ''), sb = String(b.house_number || '');
    return sa.localeCompare(sb, 'th', { numeric: true, sensitivity: 'base' });
}

/* ──────────────────────────────────────────
   Navigation
────────────────────────────────────────── */
function navigate(page) {
    var m = (page || '').match(/[?&]page=([^&]+)/);
    window.location.href = m ? m[1] + '.html' : page;
}

/* ──────────────────────────────────────────
   Session Token
────────────────────────────────────────── */
function getSessionToken() {
    return localStorage.getItem('sessionToken') || '';
}

/* ──────────────────────────────────────────
   Input Validators (server-side guards)
────────────────────────────────────────── */
function _isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    if (email.length > 320) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}
function _isValidPhone(phone) {
    if (!phone) return true; // phone is optional in register
    var digits = String(phone).replace(/[\s\-().]/g, '');
    return /^\d{9,15}$/.test(digits);
}
function _isValidText(val, min, max) {
    if (typeof val !== 'string') return false;
    var len = val.trim().length;
    return len >= (min || 0) && len <= (max || 255);
}

/* ──────────────────────────────────────────
   รอ _sb client พร้อม
────────────────────────────────────────── */
function _waitSb(cb, tries) {
    tries = tries || 0;
    if (window._sb) { cb(window._sb); return; }
    if (tries > 200) { throw new Error('[PPK] Supabase client ไม่พร้อม'); }
    setTimeout(function () { _waitSb(cb, tries + 1); }, 50);
}

/* ──────────────────────────────────────────
   Supabase SDK — GET (select)
────────────────────────────────────────── */
async function sbGet(table, params) {
    return new Promise(function (resolve, reject) {
        _waitSb(async function (sb) {
            try {
                var q = sb.from(table).select(params && params.select ? params.select : '*');
                Object.keys(params || {}).forEach(function (k) {
                    if (k === 'select' || k === 'order' || k === 'limit') return;
                    var val = String(params[k]);
                    var m = val.match(/^(not\.)?(eq|neq|lt|lte|gt|gte|like|ilike|is|in)\.(.+)$/);
                    if (!m) return;
                    var negate = m[1] === 'not.', op = m[2], v = m[3];
                    if (negate) {
                        if (op === 'is')   q = q.not(k, 'is', null);
                        else if (op === 'in') q = q.not(k, 'in', v.replace(/^\(|\)$/g, '').split(','));
                        else if (op === 'eq') q = q.not(k, 'eq', v);
                    } else {
                        if (op === 'eq')     q = q.eq(k, v);
                        else if (op === 'neq')   q = q.neq(k, v);
                        else if (op === 'lt')    q = q.lt(k, v);
                        else if (op === 'lte')   q = q.lte(k, v);
                        else if (op === 'gt')    q = q.gt(k, v);
                        else if (op === 'gte')   q = q.gte(k, v);
                        else if (op === 'like')  q = q.like(k, v);
                        else if (op === 'ilike') q = q.ilike(k, v);
                        else if (op === 'is')    q = q.is(k, v === 'null' ? null : v === 'true');
                        else if (op === 'in')    q = q.in(k, v.replace(/^\(|\)$/g, '').split(','));
                    }
                });
                if (params && params.order) {
                    var ord = params.order.split('.');
                    q = q.order(ord[0], { ascending: ord[1] !== 'desc' });
                }
                if (params && params.limit) q = q.limit(parseInt(params.limit));
                var res = await q;
                if (res.error) reject(new Error(res.error.message));
                else resolve(res.data || []);
            } catch (e) { reject(e); }
        });
    });
}

/* ──────────────────────────────────────────
   Supabase SDK — UPSERT (insert or update)
────────────────────────────────────────── */
async function sbUpsert(table, body, onConflict) {
    return new Promise(function (resolve, reject) {
        _waitSb(async function (sb) {
            try {
                var q = sb.from(table).upsert(body, { onConflict: onConflict || 'id' }).select();
                var res = await q;
                if (res.error) reject(new Error(res.error.message));
                else {
                    var d = res.data;
                    resolve(Array.isArray(d) && d.length === 1 ? d[0] : d);
                }
            } catch (e) { reject(e); }
        });
    });
}

/* ──────────────────────────────────────────
   Supabase SDK — POST (insert)
────────────────────────────────────────── */
async function sbPost(table, body) {
    return new Promise(function (resolve, reject) {
        _waitSb(async function (sb) {
            try {
                var res = await sb.from(table).insert(body).select();
                if (res.error) reject(new Error(res.error.message));
                else {
                    var d = res.data;
                    resolve(Array.isArray(d) && d.length === 1 ? d[0] : d);
                }
            } catch (e) { reject(e); }
        });
    });
}

/* ──────────────────────────────────────────
   Supabase SDK — PATCH (update)
────────────────────────────────────────── */
async function sbPatch(table, filter, body) {
    return new Promise(function (resolve, reject) {
        _waitSb(async function (sb) {
            try {
                var q = sb.from(table).update(body);
                var hasFilter = false;
                Object.keys(filter || {}).forEach(function (k) {
                    var v = String(filter[k]);
                    var mEq = v.match(/^eq\.(.+)$/);
                    if (mEq) { q = q.eq(k, mEq[1]); hasFilter = true; return; }
                    var mIn = v.match(/^in\.\((.+)\)$/);
                    if (mIn) { q = q.in(k, mIn[1].split(',').map(function(s){ return s.trim(); })); hasFilter = true; return; }
                    var mNeq = v.match(/^neq\.(.+)$/);
                    if (mNeq) { q = q.neq(k, mNeq[1]); hasFilter = true; return; }
                    var mNotIn = v.match(/^not\.in\.\((.+)\)$/);
                    if (mNotIn) { q = q.not(k, 'in', mNotIn[1].split(',').map(function(s){ return s.trim(); })); hasFilter = true; }
                });
                if (!hasFilter) {
                    reject(new Error('sbPatch: no valid filter — aborting to prevent update-all'));
                    return;
                }
                var res = await q.select();
                if (res.error) reject(new Error(res.error.message));
                else resolve(res.data);
            } catch (e) { reject(e); }
        });
    });
}

/* ──────────────────────────────────────────
   Supabase SDK — DELETE
────────────────────────────────────────── */
async function sbDelete(table, filter) {
    return new Promise(function (resolve, reject) {
        _waitSb(async function (sb) {
            try {
                var q = sb.from(table).delete();
                var hasFilter = false;
                Object.keys(filter || {}).forEach(function (k) {
                    var v = String(filter[k]);
                    var mEq = v.match(/^eq\.(.+)$/);
                    if (mEq) { q = q.eq(k, mEq[1]); hasFilter = true; return; }
                    var mIn = v.match(/^in\.\((.+)\)$/);
                    if (mIn) { q = q.in(k, mIn[1].split(',').map(function(s){ return s.trim(); })); hasFilter = true; return; }
                    var mNeq = v.match(/^neq\.(.+)$/);
                    if (mNeq) { q = q.neq(k, mNeq[1]); hasFilter = true; }
                });
                // ป้องกัน delete-all: ถ้าไม่มี filter ใดๆ ที่ valid (รวมกรณี filter={}) ให้ reject ทุกกรณี
                if (!hasFilter) {
                    reject(new Error('sbDelete: no valid filter — aborting to prevent delete-all'));
                    return;
                }
                var res = await q;
                if (res.error) reject(new Error(res.error.message));
                else resolve(true);
            } catch (e) { reject(e); }
        });
    });
}

/* ══════════════════════════════════════════
   Activity Logging (fire-and-forget)
══════════════════════════════════════════ */
function _logActivity(action, userId, description, meta) {
    try {
        sbPost('logs', {
            action:      action || 'unknown',
            user_id:     userId || null,
            description: description || '',
            meta:        meta || {}
        }).catch(function(e) { console.warn('[LOG]', e.message); });
    } catch(e) { /* ignore — logging ต้องไม่ block flow หลัก */ }
}

/* ══════════════════════════════════════════
   SHA-256 ใน Browser
══════════════════════════════════════════ */
async function sha256hex(str) {
    var enc = new TextEncoder().encode(str);
    var buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map(function(b) {
        return b.toString(16).padStart(2, '0');
    }).join('');
}
// Salted hash: sha256(email + ':' + password) — ใช้ email เป็น salt
async function sha256hexSalted(password, email) {
    return sha256hex((email || '').trim().toLowerCase() + ':' + password);
}

/* ══════════════════════════════════════════
   AUTH — Register / Logout / Session
══════════════════════════════════════════ */

/* ── Helper: ค้นหา resident จาก user — fallback email + auto-link ── */
async function _findResidentForUser(userId, userEmail) {
    // 1) ค้นจาก user_id ตรงๆ
    if (userId) {
        try {
            var rows = await sbGet('residents', { user_id: 'eq.' + userId, is_active: 'eq.true', limit: '1' });
            if (rows && rows[0]) return rows[0];
        } catch(e) {}
    }
    // 2) Fallback: ค้นจาก email ใน residents table → auto-link user_id
    if (userEmail) {
        var em = userEmail.trim().toLowerCase();
        try {
            var emRows = await sbGet('residents', { email: 'eq.' + em, is_active: 'eq.true', limit: '1' });
            if (emRows && emRows[0]) {
                if (userId && !emRows[0].user_id) {
                    try { await sbPatch('residents', { id: 'eq.' + emRows[0].id }, { user_id: userId }); } catch(e2) {}
                    emRows[0].user_id = userId;
                }
                return emRows[0];
            }
        } catch(e) {}
    }
    // 3) ค้นจาก coresidents table (ผู้ร่วมพักอาศัย)
    if (userId) {
        try {
            var corRows = await sbGet('coresidents', { user_id: 'eq.' + userId, limit: '1' });
            if (corRows && corRows[0]) {
                // ดึงข้อมูล resident หลักเพื่อได้ house_number
                var mainRes = await sbGet('residents', { id: 'eq.' + corRows[0].resident_id, is_active: 'eq.true', limit: '1' });
                if (mainRes && mainRes[0]) {
                    return { id: corRows[0].id, house_number: mainRes[0].house_number, house_id: mainRes[0].house_id, is_coresident: true };
                }
            }
        } catch(e) {}
    }
    if (userEmail) {
        var em2 = userEmail.trim().toLowerCase();
        try {
            var corEmRows = await sbGet('coresidents', { email: 'eq.' + em2, limit: '1' });
            if (corEmRows && corEmRows[0]) {
                if (userId && !corEmRows[0].user_id) {
                    try { await sbPatch('coresidents', { id: 'eq.' + corEmRows[0].id }, { user_id: userId }); } catch(e3) {}
                }
                var mainRes2 = await sbGet('residents', { id: 'eq.' + corEmRows[0].resident_id, is_active: 'eq.true', limit: '1' });
                if (mainRes2 && mainRes2[0]) {
                    return { id: corEmRows[0].id, house_number: mainRes2[0].house_number, house_id: mainRes2[0].house_id, is_coresident: true };
                }
            }
        } catch(e) {}
    }
    return null;
}

/* ── MIME Whitelist validator ────────────────────────────────
   รองรับ: jpeg, png, webp, gif (รูปภาพ) + pdf (เอกสาร)
   ใช้ก่อนทุก storage upload เพื่อป้องกัน SVG+XSS และไฟล์อันตราย
──────────────────────────────────────────────────────────── */
var _ALLOWED_MIME_IMAGE = ['image/jpeg','image/png','image/webp','image/gif'];
var _ALLOWED_MIME_ALL   = ['image/jpeg','image/png','image/webp','image/gif','application/pdf'];
function _validateMime(mime, allowPdf) {
    var allowed = allowPdf ? _ALLOWED_MIME_ALL : _ALLOWED_MIME_IMAGE;
    return allowed.indexOf((mime || '').toLowerCase()) !== -1;
}

async function ppkLogout() {
    // ลบ session จาก DB ถ้ามี
    try {
        var tk = getSessionToken();
        if (tk) await sbDelete('sessions', { token: 'eq.' + tk });
    } catch(e) {}
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('_sessionCheckTs');
    _updateSupabaseToken('');
    window.location.href = 'login.html';
}

async function ppkRegister(data) {
    var email = (data.email || '').trim().toLowerCase();
    // Input validation
    if (!_isValidEmail(email)) return { success: false, error: 'รูปแบบอีเมลไม่ถูกต้อง' };
    if (!_isValidText(data.firstname || '', 1, 100)) return { success: false, error: 'กรุณากรอกชื่อ (1-100 ตัวอักษร)' };
    if (!_isValidText(data.lastname || '', 1, 100)) return { success: false, error: 'กรุณากรอกนามสกุล (1-100 ตัวอักษร)' };
    if (data.phone && !_isValidPhone(data.phone)) return { success: false, error: 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (ตัวเลข 9-15 หลัก)' };
    var hash = await sha256hexSalted(data.password || '', email);
    // ตรวจสอบอีเมลซ้ำ
    var existU = await sbGet('users', { email: 'eq.' + email, select: 'id', limit: '1' });
    if (existU && existU.length > 0) return { success: false, error: 'อีเมลนี้มีบัญชีในระบบแล้ว' };
    var existP = await sbGet('pending_registrations', { email: 'eq.' + email, status: 'eq.pending', select: 'id', limit: '1' });
    if (existP && existP.length > 0) return { success: false, error: 'อีเมลนี้มีคำขอสมัครรออนุมัติอยู่แล้ว' };
    var row = await sbPost('pending_registrations', {
        email:           email,
        phone:           data.phone || '',
        prefix:          data.prefix || '',
        firstname:       data.firstname || '',
        lastname:        data.lastname || '',
        position:        data.position || '',
        address_no:      data.address_no || '',
        address_road:    data.address_road || '',
        address_village: data.address_village || '',
        subdistrict:     data.subdistrict || '',
        district:        data.district || '',
        province:        data.province || '',
        zipcode:         data.zipcode || '',
        password_hash:   hash,
        pdpa_consent:    !!data.pdpa_consent,
        status:          'pending'
    });
    return { success: true, data: row };
}

/* ══════════════════════════════════════════
   SESSION CHECK — ตรวจ session token กับ DB ก่อน fallback guest
══════════════════════════════════════════ */
// ตรวจสอบ role จาก session ใน DB เท่านั้น (ไม่ fallback localStorage เพื่อความปลอดภัย)
async function _getSessionRole() {
    var tk = getSessionToken();
    if (!tk || tk === 'guest-admin-session') return null;
    try {
        var s = await sbGet('sessions', { token: 'eq.' + tk, select: 'user_id,role,expires_at', limit: '1' });
        var sess = s && s[0];
        if (sess && new Date(sess.expires_at) > new Date()) return { userId: sess.user_id, role: sess.role };
    } catch(e) {}
    return null;
}

async function checkSession(autoRedirect) {
    // ตรวจ localStorage ก่อน แต่ต้อง verify กับ DB ทุก 1 นาที
    // bypass cache ถ้ายังไม่มี permissions (เช่น login จากเวอร์ชันเก่า)
    try {
        var stored = JSON.parse(localStorage.getItem('currentUser') || 'null');
        var lastCheck = parseInt(localStorage.getItem('_sessionCheckTs') || '0');
        var hasPerms = stored && Array.isArray(stored.permissions) && stored.permissions.length > 0;
        if (stored && stored.id && stored.id !== 'USR-GUEST' && hasPerms && (Date.now() - lastCheck < 60000)) return stored;
    } catch(e) {}
    // ตรวจ token กับ sessions table
    var tk = getSessionToken();
    // ยืนยันว่า Supabase client ส่ง session token ไปด้วย
    if (tk && tk !== 'guest-admin-session') _updateSupabaseToken(tk);
    if (tk && tk !== 'guest-admin-session') {
        try {
            var sessRows = await sbGet('sessions', { token: 'eq.' + tk, select: 'user_id,role,resident_id,house_number,expires_at', limit: '1' });
            var sess = sessRows && sessRows[0];
            if (sess && new Date(sess.expires_at) > new Date()) {
                var uRows = await sbGet('users', { id: 'eq.' + sess.user_id, select: 'id,email,prefix,firstname,lastname,role,position,is_active', limit: '1' });
                var u = uRows && uRows[0];
                if (u && u.is_active) {
                    // ดึงสิทธิ์จาก permissions table
                    var _csPermRows = [];
                    try { _csPermRows = await sbGet('permissions', { user_id: 'eq.' + u.id, select: 'permission' }) || []; } catch(e) {}
                    var _csPerms = _csPermRows.map(function(r) { return r.permission; });
                    var userObj = {
                        id: u.id, email: u.email,
                        prefix: u.prefix || '', firstname: u.firstname || '', lastname: u.lastname || '',
                        role: u.role || 'resident', is_active: true, position: u.position || '',
                        houseNumber: sess.house_number || '', residentId: sess.resident_id || null,
                        permissions: _csPerms
                    };
                    localStorage.setItem('currentUser', JSON.stringify(userObj));
                    localStorage.setItem('_sessionCheckTs', String(Date.now()));
                    return userObj;
                }
            }
        } catch(e) { console.warn('checkSession DB:', e); }
    }
    // ไม่มี session ที่ valid → redirect ไป login (ถ้าเปิด autoRedirect)
    if (autoRedirect) {
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('_sessionCheckTs');
        if (typeof ppkToast === 'function') ppkToast('หมดเวลาการใช้งาน กรุณาเข้าสู่ระบบใหม่', 'warning');
        setTimeout(function() { window.location.replace('login.html'); }, 1500);
    }
    return null;
}

/* ══════════════════════════════════════════
   callBackend / callBackendGet
══════════════════════════════════════════ */
async function callBackend(action, data) {
    data = data || {};
    try { return await _routeAction(action, data); }
    catch(err) {
        console.error('callBackend [' + action + ']:', err);
        throw new Error(err.message || 'ไม่สามารถเชื่อมต่อระบบได้');
    }
}

async function callBackendGet(action, params) {
    return callBackend(action, params);
}

/* ══════════════════════════════════════════
   ACTION ROUTER
══════════════════════════════════════════ */
// Actions ที่ต้องเป็น admin/head เท่านั้น (ห้ามมอบหมาย)
var _STRICT_ADMIN_ACTIONS = ['addHousing','updateHousing','deleteHousing','addResident','updateResident','removeResident',
    'approveRegistration','rejectRegistration','approveResidence','approveReturn','updatePermissions','deleteAnnouncement',
    'saveHousingFormat','setupAdmin',
    'getAdminTeam','getUsersList','getAllPermissions','getFloatingUsers','uploadRegulationPdf','deleteRegulationPdf',
    'getBackups','restoreBackup','deleteOldBackups','purgeStaleAutoEntries','exportFullBackup','anonymizeUser',
    'reactivateResident','getMovedOutUsers','forceDeactivateUser','adminInitiatedReturn','headReviewRequest',
    'executeTransfer','waiveAllOutstanding','purgeMovedOutUser','reactivateUserAccount'];

// ── Storage bucket helper: verify bucket exists ──
var _bucketReady = {};
async function _ensureBucket(name) {
    if (_bucketReady[name]) return name;
    // ลองดึงรายละเอียด bucket (ไม่ต้อง upload test file)
    try {
        var listRes = await window._sb.storage.from(name).list('', { limit: 1 });
        if (listRes.error && /bucket/i.test(listRes.error.message || '')) {
            // bucket ไม่มี → ลองสร้าง (อาจไม่สำเร็จถ้า anon ไม่มีสิทธิ์)
            var createRes = await window._sb.storage.createBucket(name, { public: true, fileSizeLimit: 10485760 });
            if (createRes.error) {
                console.warn('Bucket ' + name + ' ไม่พบ กรุณาสร้างผ่าน Supabase Dashboard');
                return name; // ยังคง return name เผื่อ bucket มีอยู่แล้วแต่ list ไม่ได้
            }
        }
    } catch(e) {
        console.warn('_ensureBucket error:', e);
    }
    _bucketReady[name] = true;
    return name;
}

// Actions ที่สามารถมอบหมายให้ผู้ใช้ที่มี permission ได้
var _PERM_ACTION_MAP = {
    submitWaterBill: 'water,water_reader', submitElectricBill: 'electric',
    reviewSlip: 'slip', markReceiptSent: 'slip', reviewRequest: 'request', checkDuplicateResident: 'request',
    sendNotification: 'notify',
    saveWithdraw: 'withdraw', saveAccounting: 'accounting'
};

async function _routeAction(action, data) {
    // Role guard: ตรวจสิทธิ์ก่อนทำ admin actions
    if (_STRICT_ADMIN_ACTIONS.indexOf(action) !== -1) {
        var _sess = await _getSessionRole();
        if (!_sess || (_sess.role !== 'admin' && _sess.role !== 'head')) {
            return { success: false, error: 'คุณไม่มีสิทธิ์ดำเนินการนี้ (ต้องเป็น admin หรือ head)' };
        }
    } else if (_PERM_ACTION_MAP[action]) {
        // ตรวจสิทธิ์: admin/head ผ่านเสมอ หรือ user ที่มี permission ที่ตรงกัน
        var _sess2 = await _getSessionRole();
        if (!_sess2) return { success: false, error: 'กรุณาเข้าสู่ระบบก่อน' };
        if (_sess2.role !== 'admin' && _sess2.role !== 'head') {
            var _reqPerm = _PERM_ACTION_MAP[action];
            var _reqPerms = _reqPerm.indexOf(',') >= 0 ? _reqPerm.split(',') : [_reqPerm];
            var _permRows = [];
            try { _permRows = await sbGet('permissions', { user_id: 'eq.' + _sess2.userId, permission: 'in.(' + _reqPerms.join(',') + ')', limit: '1' }) || []; } catch(e) {}
            if (_permRows.length === 0) {
                return { success: false, error: 'คุณไม่มีสิทธิ์ดำเนินการนี้' };
            }
        }
    }
    switch (action) {
        case 'login': {
            var email = (data.email || '').trim().toLowerCase();
            if (!email) return { success: false, error: 'กรุณากรอกอีเมล' };
            if (!_isValidEmail(email)) return { success: false, error: 'รูปแบบอีเมลไม่ถูกต้อง' };
            var uRows = await sbGet('users', { email: 'eq.' + email, is_active: 'eq.true', limit: '1' });
            if (!uRows || uRows.length === 0) return { success: false, error: 'ไม่พบบัญชีผู้ใช้ หรืออีเมลไม่ถูกต้อง' };
            var u = uRows[0];
            // ✅ ตรวจสอบ account lockout
            if (u.locked_until && new Date(u.locked_until) > new Date()) {
                var remainMin = Math.ceil((new Date(u.locked_until) - new Date()) / 60000);
                return { success: false, error: 'บัญชีนี้ถูกล็อกชั่วคราว กรุณารออีก ' + remainMin + ' นาที (กรอกรหัสผ่านผิดซ้ำหลายครั้ง)' };
            }
            // ตรวจ flag must_change_pw จาก settings table
            var mustChangePw = false;
            try {
                var mcRows = await sbGet('settings', { key: 'eq.must_change_pw_' + u.id, limit: '1' });
                mustChangePw = !!(mcRows && mcRows.length > 0);
            } catch(e) { mustChangePw = false; }
            // Failsafe: ถ้าไม่มี flag แต่ไม่เคย login (ไม่มี session) → ถือเป็น first-login
            if (!mustChangePw) {
                try {
                    var sesRows = await sbGet('sessions', { user_id: 'eq.' + u.id, limit: '1' });
                    if (!sesRows || sesRows.length === 0) { mustChangePw = true; }
                } catch(e2) { /* ignore */ }
            }
            // ถ้าเป็นการเข้าใช้ครั้งแรก → ข้าม password check ให้ตั้งรหัสผ่านเอง
            if (mustChangePw) {
                return { success: true, must_set_password: true, userId: u.id, userName: (u.firstname || '') + ' ' + (u.lastname || '') };
            }
            // เข้าสู่ระบบปกติ — ตรวจรหัสผ่าน
            if (!data.password) return { success: false, error: 'กรุณากรอกรหัสผ่าน' };
            var pwSalted = await sha256hexSalted(data.password, data.email);
            var pwLegacy = await sha256hex(data.password);
            var matched = false;
            if (u.password_hash === pwSalted) { matched = true; }
            else if (u.password_hash === pwLegacy) {
                // Lazy migration: อัปเกรดเป็น salted hash
                matched = true;
                try { await sbPatch('users', { id: 'eq.' + u.id }, { password_hash: pwSalted, updated_at: new Date().toISOString() }); } catch(e) {}
            }
            if (!matched) {
                // ✅ นับครั้งที่ผิด + ล็อคถ้าเกิน 5 ครั้ง
                var newAttempts = (parseInt(u.failed_attempts) || 0) + 1;
                var lockPatch = { failed_attempts: newAttempts, updated_at: new Date().toISOString() };
                if (newAttempts >= 5) {
                    lockPatch.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
                    _logActivity('account_locked', u.id, 'บัญชีถูกล็อกอัตโนมัติ (กรอกรหัสผ่านผิด ' + newAttempts + ' ครั้ง)', { email: email });
                }
                try { await sbPatch('users', { id: 'eq.' + u.id }, lockPatch); } catch(e) {}
                if (newAttempts >= 5) {
                    return { success: false, error: 'รหัสผ่านไม่ถูกต้อง บัญชีถูกล็อกชั่วคราว 15 นาที' };
                }
                var remaining = Math.max(1, 5 - newAttempts);
                return { success: false, error: 'รหัสผ่านไม่ถูกต้อง (เหลืออีก ' + remaining + ' ครั้งก่อนถูกล็อก)' };
            }
            // ✅ Login สำเร็จ — reset lockout counter
            try { await sbPatch('users', { id: 'eq.' + u.id }, { failed_attempts: 0, locked_until: null, updated_at: new Date().toISOString() }); } catch(e) {}
            // ดึงข้อมูล resident ที่ active (fallback email + auto-link)
            var resident = await _findResidentForUser(u.id, u.email);
            // ดึงสิทธิ์จาก permissions table
            var _loginPermRows = [];
            try { _loginPermRows = await sbGet('permissions', { user_id: 'eq.' + u.id, select: 'permission' }) || []; } catch(e) {}
            var _loginPerms = _loginPermRows.map(function(r) { return r.permission; });
            var userObj = {
                id: u.id, email: u.email,
                prefix: u.prefix || '', firstname: u.firstname || '', lastname: u.lastname || '',
                role: u.role || 'resident', is_active: true,
                position: u.position || '',
                houseNumber: resident ? (resident.house_number || '') : '',
                residentId: resident ? resident.id : null,
                must_change_password: false,
                permissions: _loginPerms
            };
            // สร้าง session ใน DB
            var token = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
                ? crypto.randomUUID()
                : ('tok-' + Math.random().toString(36).slice(2) + '-' + Math.random().toString(36).slice(2) + '-' + Date.now().toString(36));
            try {
                await sbPost('sessions', {
                    token: token,
                    user_id: u.id,
                    role: u.role || 'resident',
                    resident_id: resident ? resident.id : null,
                    house_number: resident ? (resident.house_number || '') : '',
                    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                });
            } catch(e) { console.warn('สร้าง session ไม่สำเร็จ:', e); }
            // อัพเดท Supabase client ให้ส่ง session token ไปกับทุก request
            _updateSupabaseToken(token);
            _logActivity('login', u.id, u.firstname + ' ' + u.lastname + ' เข้าสู่ระบบ', { role: u.role, house_number: resident ? resident.house_number : '' });
            return { success: true, user: userObj, token: token };
        }
        case 'logout': {
            var _lusr = null; try { _lusr = JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch(e) {}
            if (_lusr && _lusr.id) _logActivity('logout', _lusr.id, (_lusr.firstname || '') + ' ' + (_lusr.lastname || '') + ' ออกจากระบบ', { role: _lusr.role });
            return ppkLogout();
        }
        case 'logActivity': {
            // ใช้โดย ppk-app.js สำหรับ error monitoring
            var laAction = String(data.action || 'client_error').substring(0, 50);
            var laDesc = String(data.details || data.description || '').substring(0, 200);
            var laMeta = (data.extra || data.meta) || {};
            _logActivity(laAction, sessUserId || null, laDesc, laMeta);
            return { success: true };
        }
        case 'register': {
            var _regResult = await ppkRegister(data);
            if (_regResult && _regResult.success !== false) _logActivity('register', null, (data.firstname || '') + ' ' + (data.lastname || '') + ' สมัครสมาชิก', { email: data.email });
            return _regResult;
        }

        case 'getCurrentUser': {
            // คืน user + resident data จาก DB
            var u = JSON.parse(localStorage.getItem('currentUser') || 'null');
            if (!u) u = await checkSession();
            if (!u) return { success: false, error: 'ไม่พบผู้ใช้' };
            // ดึง resident data เพิ่มเติม (phone, subject_group, house_number ฯลฯ)
            var resObj = null;
            try { resObj = await _findResidentForUser(u.id, u.email); } catch(e) {}
            u.resident = resObj || {};
            return { success: true, user: u };
        }

        case 'changePassword': {
            var userId = data._userId || null;
            if (!userId) {
                // resolve from session
                var cpSess = await sbGet('sessions', { token: 'eq.' + getSessionToken(), select: 'user_id' });
                userId = cpSess && cpSess[0] ? cpSess[0].user_id : null;
            }
            if (!userId) {
                var lsU = JSON.parse(localStorage.getItem('currentUser') || 'null');
                if (lsU && lsU.id) userId = lsU.id;
            }
            if (!userId) return { success: false, error: 'ไม่ระบุ userId' };
            var uRows = await sbGet('users', { id: 'eq.' + userId, select: 'id,email,password_hash', limit: '1' });
            if (!uRows || !uRows[0]) return { success: false, error: 'ไม่พบผู้ใช้' };
            var cpEmail = (uRows[0].email || '').trim().toLowerCase();
            var oldSalted = await sha256hexSalted(data.oldPassword || '', cpEmail);
            var oldLegacy = await sha256hex(data.oldPassword || '');
            if (uRows[0].password_hash !== oldSalted && uRows[0].password_hash !== oldLegacy) return { success: false, error: 'รหัสผ่านเดิมไม่ถูกต้อง' };
            if (!data.newPassword || data.newPassword.length < 8) return { success: false, error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร' };
            var newHash = await sha256hexSalted(data.newPassword || '', cpEmail);
            await sbPatch('users', { id: 'eq.' + userId }, { password_hash: newHash, updated_at: new Date().toISOString() });
            // ลบ flag must_change_pw (ถ้ามี)
            try { await sbDelete('settings', { key: 'eq.must_change_pw_' + userId }); } catch(e) {}
            _logActivity('change_password', userId, 'เปลี่ยนรหัสผ่าน', {});
            return { success: true };
        }

        case 'setFirstPassword': {
            // ตั้งรหัสผ่านครั้งแรก — ใช้ได้เฉพาะ user ที่มี flag must_change_pw
            var userId = data.userId || '';
            if (!userId) return { success: false, error: 'ไม่ระบุ userId' };
            var newPassword = data.newPassword || '';
            if (!newPassword || newPassword.length < 8) return { success: false, error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' };
            // ตรวจสอบว่ามี flag must_change_pw หรือยังไม่เคย login (ไม่มี session)
            var flagRows = await sbGet('settings', { key: 'eq.must_change_pw_' + userId, limit: '1' });
            var hasFlag = !!(flagRows && flagRows.length > 0);
            if (!hasFlag) {
                var sesCheck = await sbGet('sessions', { user_id: 'eq.' + userId, limit: '1' });
                if (sesCheck && sesCheck.length > 0) return { success: false, error: 'ไม่พบสิทธิ์ตั้งรหัสผ่าน กรุณาติดต่อผู้ดูแลระบบ' };
            }
            var fpUser = await sbGet('users', { id: 'eq.' + userId, select: 'email', limit: '1' });
            var fpEmail = (fpUser && fpUser[0] ? fpUser[0].email : '').trim().toLowerCase();
            var newHash = await sha256hexSalted(newPassword, fpEmail);
            await sbPatch('users', { id: 'eq.' + userId }, { password_hash: newHash, updated_at: new Date().toISOString() });
            // ลบ flag (ถ้ามี)
            if (hasFlag) { try { await sbDelete('settings', { key: 'eq.must_change_pw_' + userId }); } catch(e) {} }
            // สร้าง session + return user
            var uRows = await sbGet('users', { id: 'eq.' + userId, is_active: 'eq.true', limit: '1' });
            var u2 = uRows && uRows[0] ? uRows[0] : null;
            if (!u2) return { success: true };
            var resident2 = await _findResidentForUser(u2.id, u2.email);
            var token2 = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
                ? crypto.randomUUID()
                : ('tok-' + Math.random().toString(36).slice(2) + '-' + Math.random().toString(36).slice(2) + '-' + Date.now().toString(36));
            try {
                await sbPost('sessions', { token: token2, user_id: u2.id, role: u2.role || 'resident', resident_id: resident2 ? resident2.id : null, house_number: resident2 ? (resident2.house_number || '') : '', expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString() });
            } catch(e) {}
            _updateSupabaseToken(token2);
            _logActivity('set_first_password', userId, (u2.firstname || '') + ' ' + (u2.lastname || '') + ' ตั้งรหัสผ่านครั้งแรก', { email: u2.email });
            var userObj2 = { id: u2.id, email: u2.email, prefix: u2.prefix || '', firstname: u2.firstname || '', lastname: u2.lastname || '', role: u2.role || 'resident', is_active: true, position: u2.position || '', houseNumber: resident2 ? (resident2.house_number || '') : '', residentId: resident2 ? resident2.id : null };
            return { success: true, user: userObj2, token: token2 };
        }

        case 'getHousing': {
            var rows = await sbGet('housing', { order: 'house_number.asc' });
            var mapped = (rows || []).map(function(h) {
                var prefix = h.type === 'flat' ? 'แฟลต' : 'บ้าน';
                return {
                    id: h.id,
                    type: h.type || 'house',
                    number: h.house_number || '',
                    house_number: h.house_number || '',
                    display_number: '',
                    displayNumber: '',
                    zone: h.building || h.zone || '',
                    building: h.building || '',
                    floor: h.floor || '',
                    status: h.status || 'available',
                    note: h.notes || h.note || ''
                };
            }).sort(_naturalCmp);
            return { success: true, data: mapped };
        }
        case 'addHousing': {
            var _hBody = {
                house_number: data.house_number || data.number || '',
                type: data.type || 'house',
                building: data.building || data.zone || '',
                status: data.status || 'available',
                notes: data.notes || data.note || ''
            };
            if (data.floor && !isNaN(parseInt(data.floor))) _hBody.floor = parseInt(data.floor);
            var row = await sbPost('housing', _hBody);
            invalidateResidentCache();
            return { success: true, data: row };
        }
        case 'updateHousing': {
            var row = await sbPatch('housing', { id: 'eq.' + data.id }, {
                house_number: data.house_number || data.number || undefined,
                type: data.type || undefined,
                building: data.building || data.zone || undefined,
                status: data.status || undefined,
                notes: data.notes || data.note || undefined,
                updated_at: new Date().toISOString()
            });
            invalidateResidentCache();
            return { success: true, data: row };
        }
        case 'deleteHousing': {
            await sbDelete('housing', { id: 'eq.' + data.id });
            invalidateResidentCache();
            return { success: true };
        }

        case 'getResidents': {
            var rows = await sbGet('residents', { is_active: 'eq.true', order: 'house_number.asc' });
            // ดึข user data เพื่อเอา phone, email
            var userIds = (rows || []).map(function(r) { return r.user_id; }).filter(Boolean);
            var users = [];
            if (userIds.length > 0) {
                // ดึงทีละชุด (สูงสุด 50 คน)
                try {
                    users = await sbGet('users', { id: 'in.(' + userIds.join(',') + ')', select: 'id,email,phone,position' });
                } catch(e) { users = []; }
            }
            var userMap = {};
            (users || []).forEach(function(u) { userMap[u.id] = u; });
            // ดึง coresidents ทั้งหมดในคราวเดียว
            var residentIds = (rows || []).map(function(r) { return r.id; }).filter(Boolean);
            var allCoresidents = [];
            if (residentIds.length > 0) {
                try {
                    allCoresidents = await sbGet('coresidents', {
                        resident_id: 'in.(' + residentIds.join(',') + ')',
                        select: 'resident_id,prefix,firstname,lastname,relation'
                    });
                } catch(e) { allCoresidents = []; }
            }
            // จัดกลุ่ม coresidents ตาม resident_id
            var coresidentMap = {};
            (allCoresidents || []).forEach(function(c) {
                if (!coresidentMap[c.resident_id]) coresidentMap[c.resident_id] = [];
                coresidentMap[c.resident_id].push({
                    prefix: c.prefix || '',
                    firstname: c.firstname || '',
                    lastname: c.lastname || '',
                    relation: c.relation || 'ครอบครัว'
                });
            });
            var merged = (rows || []).map(function(r) {
                var u = userMap[r.user_id] || {};
                var cos = coresidentMap[r.id] || [];
                return Object.assign({}, r, {
                    email: r.email || u.email || '',
                    phone: r.phone || u.phone || '',
                    position: r.position || u.position || '',
                    cohabitants: cos.length,
                    cohabitant_names: JSON.stringify(cos)
                });
            });
            merged.sort(_naturalCmp);
            return { success: true, data: merged };
        }
        case 'getInactiveResidents': {
            var inRows = await sbGet('residents', {
                is_active: 'eq.false',
                select: 'house_number,prefix,firstname,lastname,end_date',
                order: 'end_date.desc'
            });
            return { success: true, data: inRows || [] };
        }
        case 'getUserProfile': {
            var sess = await sbGet('sessions', { token: 'eq.' + getSessionToken(), select: 'user_id,resident_id' });
            var sessObj = sess && sess[0] ? sess[0] : null;
            if (!sessObj) {
                var lsUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
                if (lsUser && lsUser.id) sessObj = { user_id: lsUser.id, resident_id: lsUser.residentId || lsUser.resident_id || null };
            }
            if (!sessObj) return { success: false, error: 'SESSION_EXPIRED' };
            var u = await sbGet('users', { id: 'eq.' + sessObj.user_id });
            var uObj = u && u[0] ? u[0] : null;
            var res = null;
            if (sessObj.resident_id) {
                var resArr = await sbGet('residents', { id: 'eq.' + sessObj.resident_id });
                res = resArr && resArr[0] ? resArr[0] : null;
            }
            // Fallback: ค้นหา resident จาก user_id หรือ email (+ auto-link)
            if (!res && sessObj.user_id) {
                res = await _findResidentForUser(sessObj.user_id, uObj ? uObj.email : null);
            }
            return { success: true, user: uObj, resident: res || null };
        }
        case 'getCoresidents': {
            var cResId = data.residentId || null;
            if (!cResId) {
                var cSess = await sbGet('sessions', { token: 'eq.' + getSessionToken(), select: 'resident_id', limit: '1' });
                cResId = cSess && cSess[0] ? cSess[0].resident_id : null;
            }
            if (!cResId) return { success: true, data: [] };
            var rows = await sbGet('coresidents', { resident_id: 'eq.' + cResId });
            return { success: true, data: rows };
        }
        case 'getPendingRegistrations': {
            var rows = await sbGet('pending_registrations', { status: 'eq.pending', order: 'submitted_at.desc' });
            return { success: true, data: rows };
        }
        case 'getFloatingUsers': {
            var allUsers = await sbGet('users', { is_active: 'eq.true', select: 'id,email,prefix,firstname,lastname,position,phone,created_at,role,status' });
            allUsers = allUsers || [];
            var activeRes = await sbGet('residents', { is_active: 'eq.true', select: 'user_id' });
            var resUserIds = {};
            (activeRes || []).forEach(function(r) { if (r.user_id) resUserIds[r.user_id] = true; });
            var floating = allUsers.filter(function(u) { return !resUserIds[u.id]; });
            return { success: true, data: floating };
        }

        case 'getFloatingUserDetail': {
            if (!data.userId) return { success: false, error: 'ไม่ระบุ userId' };
            var _gfdSess = await _getSessionRole();
            if (!_gfdSess || (_gfdSess.role !== 'admin' && _gfdSess.role !== 'head')) return { success: false, error: 'สิทธิ์ไม่เพียงพอ' };
            var _gfdUser = await sbGet('users', { id: 'eq.' + data.userId, select: 'id,email,prefix,firstname,lastname,position,phone,role,status,is_active,created_at,pdpa_consent', limit: '1' }).catch(function() { return []; });
            if (!_gfdUser || !_gfdUser[0]) return { success: false, error: 'ไม่พบผู้ใช้' };
            var _gfdReqs = await sbGet('requests', { user_id: 'eq.' + data.userId, order: 'submitted_at.desc', select: 'id,type,status,submitted_at', limit: '10' }).catch(function() { return []; });
            var _gfdQueue = await sbGet('queue', { user_id: 'eq.' + data.userId, status: 'eq.waiting', select: 'id,position,expires_at', order: 'created_at.desc', limit: '1' }).catch(function() { return []; });
            var _gfdPendReg = await sbGet('pending_registrations', { email: 'eq.' + _gfdUser[0].email, select: 'id,status,submitted_at', order: 'submitted_at.desc', limit: '1' }).catch(function() { return []; });
            return { success: true, data: {
                user: _gfdUser[0],
                requests: _gfdReqs || [],
                queue: (_gfdQueue && _gfdQueue[0]) ? _gfdQueue[0] : null,
                pendingReg: (_gfdPendReg && _gfdPendReg[0]) ? _gfdPendReg[0] : null
            }};
        }

        case 'deleteFloatingUser': {
            if (!data.userId) return { success: false, error: 'ไม่ระบุ userId' };
            var _dfSess = await _getSessionRole();
            if (!_dfSess || (_dfSess.role !== 'admin' && _dfSess.role !== 'head')) return { success: false, error: 'สิทธิ์ไม่เพียงพอ' };
            // ตรวจว่าไม่มี active resident ก่อนลบ
            var _dfRes = await sbGet('residents', { user_id: 'eq.' + data.userId, is_active: 'eq.true', select: 'id', limit: '1' }).catch(function() { return []; });
            if (_dfRes && _dfRes[0]) return { success: false, error: 'ผู้ใช้นี้มีบ้านพักอยู่แล้ว ไม่สามารถลบได้' };
            // ยกเลิกคำขอที่รอดำเนินการ
            await sbPatch('requests', { user_id: 'eq.' + data.userId, status: 'eq.pending' }, { status: 'cancelled', reviewed_note: 'ยกเลิกอัตโนมัติ — แอดมินลบบัญชีผู้ใช้ลอย' }).catch(function() {});
            // ยกเลิก queue
            await sbPatch('queue', { user_id: 'eq.' + data.userId, status: 'eq.waiting' }, { status: 'cancelled' }).catch(function() {});
            // ลบ sessions
            await sbDelete('sessions', { user_id: 'eq.' + data.userId }).catch(function() {});
            // deactivate user
            await sbPatch('users', { id: 'eq.' + data.userId }, { is_active: false, status: 'inactive' });
            _logActivity('delete_floating_user', _dfSess.userId, 'ลบบัญชีผู้ใช้ลอย userId=' + data.userId, { targetUserId: data.userId });
            return { success: true };
        }

        /* ── Phase F: ผู้ย้ายออกที่มียอดค้าง ────── */
        case 'getMovedOutUsers': {
            var _gmuSess = await _getSessionRole();
            if (!_gmuSess || (_gmuSess.role !== 'admin' && _gmuSess.role !== 'head')) return { success: false, error: 'สิทธิ์ไม่เพียงพอ' };
            var _gmuResRows = await sbGet('residents', { is_active: 'eq.false', order: 'end_date.desc', select: 'id,user_id,prefix,firstname,lastname,email,house_number,end_date' }).catch(function() { return []; });
            var _gmuResult = [];
            for (var _gi = 0; _gi < (_gmuResRows || []).length; _gi++) {
                var _gr = _gmuResRows[_gi];
                if (!_gr.house_number) continue;
                var _gmuOut = await sbGet('outstanding', { house_number: 'eq.' + _gr.house_number, moved_out_at: 'not.is.null', status: 'not.in.(paid,waived)' }).catch(function() { return []; });
                if (!_gmuOut || _gmuOut.length === 0) continue;
                var _gmuTotal = _gmuOut.reduce(function(s, r) { return s + (parseFloat(r.total_amount) || 0); }, 0);
                var _gmuUserActive = false;
                if (_gr.user_id) {
                    var _gmuUR = await sbGet('users', { id: 'eq.' + _gr.user_id, select: 'is_active', limit: '1' }).catch(function() { return []; });
                    _gmuUserActive = _gmuUR && _gmuUR[0] ? !!_gmuUR[0].is_active : false;
                }
                _gmuResult.push({
                    residentId: _gr.id, userId: _gr.user_id,
                    fullName: ((_gr.prefix||'') + (_gr.firstname||'') + ' ' + (_gr.lastname||'')).trim(),
                    email: _gr.email || '', houseNumber: _gr.house_number, endDate: _gr.end_date,
                    totalOutstanding: _gmuTotal, userIsActive: _gmuUserActive,
                    outstandingRows: _gmuOut.map(function(o) { return { id: o.id, period: o.period, amount: parseFloat(o.total_amount) || 0 }; })
                });
            }
            return { success: true, data: _gmuResult };
        }

        /* ── เปิดบัญชีคืน (กรณีถูกปิดโดยไม่ตั้งใจ เช่น system deactivate ตอนทำ admin_initiated_return) ── */
        case 'reactivateUserAccount': {
            if (!data.userId) return { success: false, error: 'ไม่ระบุ userId' };
            var _ruaSess = await _getSessionRole();
            if (!_ruaSess || (_ruaSess.role !== 'admin' && _ruaSess.role !== 'head')) return { success: false, error: 'สิทธิ์ไม่เพียงพอ' };
            // ตรวจ user exists
            var _ruaRows = await sbGet('users', { id: 'eq.' + data.userId, select: 'id,is_active,email,firstname,lastname', limit: '1' }).catch(function() { return []; });
            if (!_ruaRows || !_ruaRows[0]) return { success: false, error: 'ไม่พบบัญชีผู้ใช้' };
            if (_ruaRows[0].is_active) return { success: false, error: 'บัญชีนี้เปิดใช้งานอยู่แล้ว' };
            // เปิดบัญชีคืน
            await sbPatch('users', { id: 'eq.' + data.userId }, { is_active: true, updated_at: new Date().toISOString() });
            _logActivity('reactivate_user_account', _ruaSess.userId, 'เปิดบัญชีคืน ' + ((_ruaRows[0].firstname||'') + ' ' + (_ruaRows[0].lastname||'')).trim() + ' userId=' + data.userId, { userId: data.userId });
            return { success: true };
        }

        case 'forceDeactivateUser': {
            if (!data.userId && !data.residentId) return { success: false, error: 'ไม่ระบุ userId/residentId' };
            var _fduSess = await _getSessionRole();
            if (!_fduSess || (_fduSess.role !== 'admin' && _fduSess.role !== 'head')) return { success: false, error: 'สิทธิ์ไม่เพียงพอ' };
            var _fduUserId = data.userId;
            var _fduHouseNumber = '';
            if (!_fduUserId && data.residentId) {
                var _fduResR = await sbGet('residents', { id: 'eq.' + data.residentId, select: 'user_id,house_number', limit: '1' }).catch(function() { return []; });
                if (_fduResR && _fduResR[0]) { _fduUserId = _fduResR[0].user_id; _fduHouseNumber = _fduResR[0].house_number || ''; }
            }
            // ถ้าต้องการยกหนี้ด้วย (waiveOutstanding)
            if (data.waiveOutstanding && _fduHouseNumber) {
                try {
                    await sbPatch('outstanding', { house_number: 'eq.' + _fduHouseNumber, status: 'neq.paid' }, { status: 'waived', updated_at: new Date().toISOString() });
                } catch(e) { console.warn('forceDeactivateUser waive outstanding:', e); }
            } else if (data.waiveOutstanding && _fduUserId) {
                // fallback ค้นหาจาก user_id
                try {
                    var _fduResAll = await sbGet('residents', { user_id: 'eq.' + _fduUserId, select: 'house_number', limit: '5' }).catch(function() { return []; });
                    for (var _fi = 0; _fi < (_fduResAll || []).length; _fi++) {
                        if (_fduResAll[_fi].house_number) {
                            await sbPatch('outstanding', { house_number: 'eq.' + _fduResAll[_fi].house_number, status: 'neq.paid' }, { status: 'waived', updated_at: new Date().toISOString() }).catch(function() {});
                        }
                    }
                } catch(e) {}
            }
            if (_fduUserId) {
                await sbPatch('users', { id: 'eq.' + _fduUserId }, { is_active: false, updated_at: new Date().toISOString() });
                try { await sbDelete('sessions', { user_id: 'eq.' + _fduUserId }); } catch(e) {}
            }
            _logActivity('force_deactivate_user', _fduSess.userId, 'ปิดบัญชีถาวร userId=' + _fduUserId + (data.waiveOutstanding ? ' (ยกหนี้ด้วย)' : ''), { userId: _fduUserId, waiveOutstanding: !!data.waiveOutstanding });
            return { success: true };
        }

        /* ── Admin: บังคับคืนบ้าน (ไม่ต้องมีคำร้องล่วงหน้า) ─── */
        case 'adminInitiatedReturn': {
            if (!data.residentId) return { success: false, error: 'ไม่ระบุ residentId' };
            var _airSess = await _getSessionRole();
            if (!_airSess || (_airSess.role !== 'admin' && _airSess.role !== 'head')) return { success: false, error: 'สิทธิ์ไม่เพียงพอ' };
            // ดึงข้อมูล resident
            var _airResRows = await sbGet('residents', { id: 'eq.' + data.residentId, is_active: 'eq.true', limit: '1' }).catch(function() { return []; });
            if (!_airResRows || !_airResRows[0]) return { success: false, error: 'ไม่พบผู้พักอาศัยที่ active' };
            var _airRes = _airResRows[0];
            var _airUserId = data.userId || _airRes.user_id;
            var _airHouseNumber = _airRes.house_number;
            var _airHouseId = _airRes.house_id;
            var _airEndDate = new Date().toISOString().split('T')[0];

            // ตรวจยอดค้าง
            var _airOutRows = [];
            try { _airOutRows = await sbGet('outstanding', { house_number: 'eq.' + _airHouseNumber, status: 'not.in.(paid,waived)' }) || []; } catch(e) {}
            var _airHasOut = _airOutRows.length > 0;

            // สร้าง request เก็บ log
            var _airReqId = 'RTN' + Date.now().toString(36).toUpperCase();
            try {
                await sbPost('requests', {
                    id: _airReqId, type: 'return', user_id: _airUserId,
                    status: 'approved', initiated_by: 'admin',
                    details: JSON.stringify({ reason: data.reason || 'forced', note: data.note || '', returnDate: _airEndDate }),
                    reviewed_by: _airSess.userId, reviewed_at: new Date().toISOString(),
                    review_note: (data.note || '') + ' [บังคับคืนโดยแอดมิน]'
                });
            } catch(e) { console.warn('adminInitiatedReturn: create request failed', e); }

            // mark outstanding ว่าเป็นหนี้ผู้ย้ายออก (ซ่อนจากผู้พักใหม่)
            if (_airHouseNumber) {
                try { await sbPatch('outstanding', { house_number: 'eq.' + _airHouseNumber, status: 'not.in.(paid,waived)' }, { moved_out_at: new Date().toISOString(), updated_at: new Date().toISOString() }); } catch(e) {}
            }
            // deactivate resident
            await sbPatch('residents', { id: 'eq.' + _airRes.id }, { is_active: false, end_date: _airEndDate, departure_reason: data.reason || 'forced', departed_at: new Date().toISOString(), updated_at: new Date().toISOString() });
            // ลบ coresidents
            try { await sbDelete('coresidents', { resident_id: 'eq.' + _airRes.id }); } catch(e) {}
            // บ้าน → available
            if (_airHouseId) {
                try { await sbPatch('housing', { id: 'eq.' + _airHouseId }, { status: 'available', updated_at: new Date().toISOString() }); } catch(e) {}
            }
            // จัดการ user: ถ้ามียอดค้าง → คงไว้ให้ login ได้ (departing), ถ้าไม่มี → deactivate
            if (_airUserId) {
                if (_airHasOut) {
                    try { await sbPatch('users', { id: 'eq.' + _airUserId }, { status: 'departing', updated_at: new Date().toISOString() }); } catch(e) {}
                } else {
                    await sbPatch('users', { id: 'eq.' + _airUserId }, { is_active: false, updated_at: new Date().toISOString() });
                    try { await sbDelete('sessions', { user_id: 'eq.' + _airUserId }); } catch(e) {}
                }
            }
            invalidateResidentCache();
            _logActivity('admin_initiated_return', _airSess.userId, 'บังคับคืนบ้าน ' + _airHouseNumber + ' เหตุผล: ' + (data.reason || ''), { residentId: data.residentId, houseNumber: _airHouseNumber, reason: data.reason });
            return { success: true, hasOutstanding: _airHasOut };
        }

        /* ── ยกหนี้ทั้งหมด (กองกลางรับผิดชอบ) ─── */
        case 'waiveAllOutstanding': {
            if (!data.residentId && !data.houseNumber) return { success: false, error: 'ไม่ระบุ residentId หรือ houseNumber' };
            var _waoSess = await _getSessionRole();
            if (!_waoSess || (_waoSess.role !== 'admin' && _waoSess.role !== 'head')) return { success: false, error: 'สิทธิ์ไม่เพียงพอ' };
            var _waoHouseNum = data.houseNumber;
            if (!_waoHouseNum && data.residentId) {
                var _waoRes = (await sbGet('residents', { id: 'eq.' + data.residentId, select: 'house_number', limit: '1' }).catch(function() { return []; }))[0];
                if (_waoRes) _waoHouseNum = _waoRes.house_number;
            }
            if (!_waoHouseNum) return { success: false, error: 'ไม่พบบ้านของผู้พักอาศัยนี้' };
            await sbPatch('outstanding', { house_number: 'eq.' + _waoHouseNum, status: 'neq.paid' }, { status: 'waived', updated_at: new Date().toISOString() });
            _logActivity('waive_all_outstanding', _waoSess.userId, 'ยกหนี้ทั้งหมด (กองกลาง) houseNumber=' + _waoHouseNum, { houseNumber: _waoHouseNum, residentId: data.residentId });
            return { success: true };
        }

        /* ── Phase F: บันทึกชำระยอดค้างผู้ย้ายออก ─── */
        case 'markMovedOutOutstandingPaid': {
            if (!data.outstandingId) return { success: false, error: 'ไม่ระบุ outstandingId' };
            var _mopSess = await _getSessionRole();
            if (!_mopSess || (_mopSess.role !== 'admin' && _mopSess.role !== 'head')) return { success: false, error: 'สิทธิ์ไม่เพียงพอ' };
            var _mopRow = (await sbGet('outstanding', { id: 'eq.' + data.outstandingId, select: 'id,status,moved_out_at,house_number', limit: '1' }).catch(function() { return []; }))[0];
            if (!_mopRow) return { success: false, error: 'ไม่พบรายการ' };
            if (_mopRow.status === 'paid') return { success: false, error: 'รายการนี้ชำระแล้ว' };
            if (!_mopRow.moved_out_at) return { success: false, error: 'รายการนี้ไม่ใช่ยอดค้างผู้ย้ายออก' };
            await sbPatch('outstanding', { id: 'eq.' + data.outstandingId }, { status: 'paid', updated_at: new Date().toISOString() });
            _logActivity('mark_moved_out_paid', _mopSess.userId, 'บันทึกชำระยอดค้างผู้ย้ายออก outstandingId=' + data.outstandingId, { outstandingId: data.outstandingId });
            // ตรวจว่าชำระครบหมดแล้วหรือยัง → ถ้าครบ auto-deactivate บัญชี
            if (_mopRow.house_number) {
                var _mopRemain = await sbGet('outstanding', { house_number: 'eq.' + _mopRow.house_number, moved_out_at: 'not.is.null', status: 'not.in.(paid,waived)' }).catch(function() { return [1]; });
                if (_mopRemain && _mopRemain.length === 0) {
                    // ชำระครบแล้ว — หาผู้ย้ายออกและปิดบัญชี
                    var _mopRes = await sbGet('residents', { house_number: 'eq.' + _mopRow.house_number, is_active: 'eq.false', order: 'end_date.desc', select: 'user_id', limit: '1' }).catch(function() { return []; });
                    var _mopUid = _mopRes && _mopRes[0] ? _mopRes[0].user_id : null;
                    if (_mopUid) {
                        await sbPatch('users', { id: 'eq.' + _mopUid }, { is_active: false, status: 'inactive', updated_at: new Date().toISOString() }).catch(function() {});
                        await sbDelete('sessions', { user_id: 'eq.' + _mopUid }).catch(function() {});
                        _logActivity('auto_deactivate_after_payment', _mopSess.userId, 'ปิดบัญชีอัตโนมัติหลังชำระครบ userId=' + _mopUid, { userId: _mopUid });
                    }
                }
            }
            return { success: true };
        }

        /* ── Phase F: บันทึกชำระยอดค้างผู้ย้ายออกทั้งหมดในครั้งเดียว ─── */
        case 'markAllMovedOutOutstandingPaid': {
            if (!data.houseNumber) return { success: false, error: 'ไม่ระบุ houseNumber' };
            var _maopSess = await _getSessionRole();
            if (!_maopSess || (_maopSess.role !== 'admin' && _maopSess.role !== 'head')) return { success: false, error: 'สิทธิ์ไม่เพียงพอ' };
            var _maopRows = await sbGet('outstanding', { house_number: 'eq.' + data.houseNumber, moved_out_at: 'not.is.null', status: 'not.in.(paid,waived)' }).catch(function() { return []; });
            if (!_maopRows || _maopRows.length === 0) return { success: false, error: 'ไม่พบรายการค้างที่ต้องชำระ' };
            var _maopNow = new Date().toISOString();
            for (var _mi = 0; _mi < _maopRows.length; _mi++) {
                await sbPatch('outstanding', { id: 'eq.' + _maopRows[_mi].id }, { status: 'paid', updated_at: _maopNow }).catch(function() {});
            }
            _logActivity('mark_all_moved_out_paid', _maopSess.userId, 'บันทึกชำระยอดค้างทั้งหมด houseNumber=' + data.houseNumber + ' จำนวน=' + _maopRows.length, { houseNumber: data.houseNumber, count: _maopRows.length });
            // auto-deactivate บัญชีผู้ย้ายออก
            var _maopRes = await sbGet('residents', { house_number: 'eq.' + data.houseNumber, is_active: 'eq.false', order: 'end_date.desc', select: 'user_id', limit: '1' }).catch(function() { return []; });
            var _maopUid = _maopRes && _maopRes[0] ? _maopRes[0].user_id : null;
            if (_maopUid) {
                await sbPatch('users', { id: 'eq.' + _maopUid }, { is_active: false, status: 'inactive', updated_at: _maopNow }).catch(function() {});
                await sbDelete('sessions', { user_id: 'eq.' + _maopUid }).catch(function() {});
                _logActivity('auto_deactivate_after_payment', _maopSess.userId, 'ปิดบัญชีอัตโนมัติหลังชำระครบ userId=' + _maopUid, { userId: _maopUid });
            }
            return { success: true, count: _maopRows.length };
        }

        /* ── ลบข้อมูลผู้ย้ายออกทั้งหมด (เสมือนไม่เคยมีตัวตน) ─── */
        case 'purgeMovedOutUser': {
            if (!data.residentId) return { success: false, error: 'ไม่ระบุ residentId' };
            var _pmuSess = await _getSessionRole();
            if (!_pmuSess || _pmuSess.role !== 'admin') return { success: false, error: 'เฉพาะแอดมินเท่านั้น' };
            var _pmuRes = (await sbGet('residents', { id: 'eq.' + data.residentId, select: 'id,user_id,house_number,is_active', limit: '1' }).catch(function() { return []; }))[0];
            if (!_pmuRes) return { success: false, error: 'ไม่พบข้อมูล resident' };
            if (_pmuRes.is_active) return { success: false, error: 'ผู้พักอาศัยนี้ยังอยู่ในบ้าน ไม่สามารถลบได้' };
            // ลบ/ยกหนี้ทุกรายการของบ้านนี้ที่ผูกกับ resident นี้
            if (_pmuRes.house_number) {
                await sbPatch('outstanding', { house_number: 'eq.' + _pmuRes.house_number, status: 'not.in.(paid,waived)' }, { status: 'waived', updated_at: new Date().toISOString() }).catch(function() {});
            }
            // ปิดบัญชี user + ลบ sessions
            if (_pmuRes.user_id) {
                await sbPatch('users', { id: 'eq.' + _pmuRes.user_id }, { is_active: false, status: 'inactive', updated_at: new Date().toISOString() }).catch(function() {});
                await sbDelete('sessions', { user_id: 'eq.' + _pmuRes.user_id }).catch(function() {});
            }
            _logActivity('purge_moved_out_user', _pmuSess.userId, 'ลบข้อมูลผู้ย้ายออก residentId=' + data.residentId + ' houseNumber=' + (_pmuRes.house_number||''), { residentId: data.residentId, userId: _pmuRes.user_id });
            return { success: true };
        }

        /* ── Phase F: ประวัติผู้พักอาศัยรายบ้าน ─── */
        case 'getHouseHistory': {
            if (!data.houseNumber) return { success: false, error: 'ไม่ระบุ houseNumber' };
            var _ghhSess = await _getSessionRole();
            if (!_ghhSess || (_ghhSess.role !== 'admin' && _ghhSess.role !== 'head')) return { success: false, error: 'สิทธิ์ไม่เพียงพอ' };
            var _ghhRows = await sbGet('residents', { house_number: 'eq.' + data.houseNumber, order: 'created_at.desc', select: 'id,user_id,prefix,firstname,lastname,email,is_active,start_date,end_date,created_at' }).catch(function() { return []; });
            // ตรวจสอบสถานะบ้านจาก housing table เพื่อ cross-check
            var _ghhHousing = await sbGet('housing', { or: 'number.eq.' + data.houseNumber + ',house_number.eq.' + data.houseNumber, select: 'status', limit: '1' }).catch(function() { return []; });
            var _ghhHouseStatus = (_ghhHousing && _ghhHousing[0] && _ghhHousing[0].status) || null;
            var _ghhResult = (_ghhRows || []).map(function(r) {
                // ถ้า housing.status = available → บ้านว่างแน่นอน ไม่มีใครอยู่ปัจจุบัน
                var activeByDb = r.is_active && !r.end_date;
                var isActive = activeByDb && _ghhHouseStatus !== 'available';
                return { residentId: r.id, fullName: ((r.prefix||'') + (r.firstname||'') + ' ' + (r.lastname||'')).trim(), email: r.email || '', isActive: isActive, startDate: r.start_date || r.created_at, endDate: r.end_date };
            });
            return { success: true, data: _ghhResult };
        }

        case 'approveRegistration': {
            var regId = data.regId || data.id;
            if (!regId) return { success: false, error: 'ไม่ระบุ regId' };
            var reg = (await sbGet('pending_registrations', { id: 'eq.' + regId }))[0];
            if (!reg) return { success: false, error: 'ไม่พบคำขอ' };
            // ตรวจสอบว่า email มีอยู่ใน users หรือไม่
            var existingUsers = await sbGet('users', { email: 'eq.' + reg.email, select: 'id,is_active,role', limit: '1' });
            var uid;
            if (existingUsers && existingUsers.length > 0) {
                // ห้าม overwrite บัญชี admin/head — ป้องกันการผูก resident ซ้อนกับบัญชีผู้ดูแลระบบ
                if (existingUsers[0].role === 'admin' || existingUsers[0].role === 'head') {
                    return { success: false, error: 'อีเมล ' + reg.email + ' เป็นบัญชีผู้ดูแลระบบ ไม่สามารถอนุมัติซ้อนได้ กรุณาตรวจสอบ' };
                }
                // ใช้ user เดิม — อัปเดตข้อมูลให้ตรงกับคำขอใหม่
                uid = existingUsers[0].id;
                await sbPatch('users', { id: 'eq.' + uid }, {
                    phone: reg.phone, prefix: reg.prefix,
                    firstname: reg.firstname, lastname: reg.lastname, position: reg.position,
                    password_hash: reg.password_hash, pdpa_consent: reg.pdpa_consent,
                    is_active: true
                });
            } else {
                // สร้าง user ใหม่
                uid = 'USR' + Date.now().toString(36).toUpperCase();
                await sbPost('users', {
                    id: uid, email: reg.email, phone: reg.phone, prefix: reg.prefix,
                    firstname: reg.firstname, lastname: reg.lastname, position: reg.position,
                    role: 'resident', password_hash: reg.password_hash, pdpa_consent: reg.pdpa_consent,
                    is_active: true
                });
            }
            // สร้าง resident หรือ coresident ถ้ามี house_number
            var residentId = null;
            if (data.house_number) {
                var hRows = await sbGet('housing', { house_number: 'eq.' + data.house_number, select: 'id', limit: '1' });
                var houseId = hRows && hRows[0] ? hRows[0].id : null;

                if (data.as_coresident) {
                    // เพิ่มเป็นผู้พักอาศัยร่วม — ค้นหา resident หลักของห้องนี้
                    var _mainRes = await sbGet('residents', { house_number: 'eq.' + data.house_number, is_active: 'eq.true', select: 'id', limit: '1' }).catch(function() { return []; });
                    if (!_mainRes || _mainRes.length === 0) {
                        return { success: false, error: 'ไม่พบผู้พักอาศัยหลักใน "' + data.house_number + '" กรุณาตรวจสอบ' };
                    }
                    if (!houseId) return { success: false, error: 'ไม่พบข้อมูลบ้าน/ห้อง "' + data.house_number + '"' };
                    // ตรวจว่ามี coresident record เดิมที่แอดมินใส่ไว้โดยยังไม่มี user_id หรือไม่
                    // ลำดับ match: 1) email ตรง  2) ชื่อ+นามสกุลตรง (กรณีแอดมินใส่ก่อนมีช่อง email)
                    var _existCor = null;
                    try {
                        var _regEmail = (reg.email || '').trim().toLowerCase();
                        // 1) match by email
                        if (_regEmail) {
                            var _existCorR = await sbGet('coresidents', { resident_id: 'eq.' + _mainRes[0].id, email: 'eq.' + _regEmail, user_id: 'is.null', limit: '1' });
                            if (_existCorR && _existCorR[0]) _existCor = _existCorR[0];
                        }
                        // 2) fallback: match by firstname+lastname (ยังไม่มี user_id เท่านั้น)
                        if (!_existCor && reg.firstname && reg.lastname) {
                            var _existCorN = await sbGet('coresidents', { resident_id: 'eq.' + _mainRes[0].id, firstname: 'eq.' + reg.firstname.trim(), lastname: 'eq.' + reg.lastname.trim(), user_id: 'is.null', limit: '1' });
                            if (_existCorN && _existCorN[0]) _existCor = _existCorN[0];
                        }
                    } catch(e) {}
                    var newCor;
                    if (_existCor) {
                        // อัพเดท record เดิมที่แอดมินเพิ่มไว้ด้วยมือ — link user_id และอัพเดทชื่อ/โทรศัพท์/email
                        newCor = await sbPatch('coresidents', { id: 'eq.' + _existCor.id }, {
                            user_id: uid,
                            prefix: reg.prefix || _existCor.prefix || '',
                            firstname: reg.firstname || _existCor.firstname || '',
                            lastname: reg.lastname || _existCor.lastname || '',
                            relation: data.relation || _existCor.relation || 'ผู้พักร่วม',
                            email: reg.email || _existCor.email || '',
                            phone: reg.phone || _existCor.phone || ''
                        });
                        newCor = newCor ? newCor : _existCor;
                    } else {
                        newCor = await sbPost('coresidents', {
                            resident_id: _mainRes[0].id,
                            house_id: houseId,
                            user_id: uid,
                            prefix: reg.prefix || '',
                            firstname: reg.firstname || '',
                            lastname: reg.lastname || '',
                            relation: data.relation || 'ผู้พักร่วม',
                            email: reg.email || '',
                            phone: reg.phone || ''
                        });
                    }
                    residentId = newCor ? newCor.id : null;
                } else {
                    // ตรวจสอบว่าบ้าน/ห้องนี้มีผู้พักอาศัย active อยู่แล้วหรือไม่
                    var _occCheck = await sbGet('residents', { house_number: 'eq.' + data.house_number, is_active: 'eq.true', select: 'id', limit: '1' }).catch(function() { return []; });
                    if (_occCheck && _occCheck.length > 0) {
                        return { success: false, error: 'บ้าน/ห้อง "' + data.house_number + '" มีผู้พักอาศัย active อยู่แล้ว กรุณาตรวจสอบก่อนอนุมัติ หรือเลือก "เพิ่มเป็นผู้พักอาศัยร่วม"' };
                    }
                    if (houseId) {
                        var newRes = await sbPost('residents', {
                            user_id: uid, house_id: houseId,
                            house_number: data.house_number || '',
                            prefix: reg.prefix || '', firstname: reg.firstname || '',
                            lastname: reg.lastname || '', position: reg.position || '',
                            email: reg.email || '', phone: reg.phone || '',
                            resident_type: data.resident_type || '',
                            address_no: reg.address_no || '', address_village: reg.address_village || '',
                            address_road: reg.address_road || '', subdistrict: reg.subdistrict || '',
                            district: reg.district || '', province: reg.province || '',
                            zipcode: reg.zipcode || '',
                            is_active: true
                        });
                        residentId = newRes ? newRes.id : null;
                        await sbPatch('housing', { id: 'eq.' + houseId }, { status: 'occupied', updated_at: new Date().toISOString() });
                    }
                }
            }
            // อัปเดต session ของ user ถ้า login อยู่แล้ว
            await sbPatch('pending_registrations', { id: 'eq.' + regId }, {
                status: 'approved', reviewed_by: data.reviewedBy || null,
                reviewed_at: new Date().toISOString(), review_note: data.note || ''
            });
            invalidateResidentCache();
            _logActivity('approve_registration', data.reviewedBy || null, 'อนุมัติการลงทะเบียน ' + (reg.firstname || '') + ' ' + (reg.lastname || ''), { regId: regId, house_number: data.house_number, email: reg.email });
            return { success: true, userId: uid, residentId: residentId };
        }
        case 'rejectRegistration': {
            var regId = data.regId || data.id;
            if (!regId) return { success: false, error: 'ไม่ระบุ regId' };
            await sbPatch('pending_registrations', { id: 'eq.' + regId }, {
                status: 'rejected', reviewed_by: data.reviewedBy || null,
                reviewed_at: new Date().toISOString(), review_note: data.note || ''
            });
            _logActivity('reject_registration', data.reviewedBy || null, 'ปฏิเสธการลงทะเบียน', { regId: regId, note: data.note });
            return { success: true };
        }
        case 'getWaterBills': {
            var q = { order: 'recorded_at.desc' };
            if (data.period) q.period = 'eq.' + data.period;
            if (data.year) { q.period = 'gte.' + data.year + '-01'; q['period'] = undefined; q['period:gte'] = data.year + '-01'; delete q['period:gte']; q.period = 'gte.' + data.year + '-01'; }
            if (data.houseNumber) q.house_number = 'eq.' + data.houseNumber;
            var rows;
            if (data.year && !data.period) {
                // ดึงทั้งปี: period ตั้งแต่ YYYY-01 ถึง YYYY-12
                var q2 = { order: 'period.asc,house_number.asc' };
                q2['period'] = 'gte.' + data.year + '-01';
                if (data.houseNumber) q2.house_number = 'eq.' + data.houseNumber;
                var allRows = await sbGet('water_bills', q2);
                rows = (allRows || []).filter(function(r) { return r.period && r.period.substring(0, 4) === String(data.year).substring(0, 4); });
            } else {
                var q1 = { order: 'recorded_at.desc' };
                if (data.period) q1.period = 'eq.' + data.period;
                if (data.houseNumber) q1.house_number = 'eq.' + data.houseNumber;
                rows = await sbGet('water_bills', q1);
            }
            return { success: true, data: rows };
        }
        case 'submitWaterBill': {
            if (!data.period) return { success: false, error: 'ไม่ระบุงวด' };
            // รองรับทั้ง batch (records[]) และ single record
            if (data.records && Array.isArray(data.records)) {
                // Validate: ตรวจค่าลบ/ผิดปกติ
                for (var vi = 0; vi < data.records.length; vi++) {
                    var vr = data.records[vi];
                    var _vAmt = parseFloat(vr.amount) || 0;
                    var _vCurr = parseFloat(vr.curr_meter) || 0;
                    var _vPrev = parseFloat(vr.prev_meter) || 0;
                    if (_vAmt < 0) return { success: false, error: 'ยอดเงินติดลบ (' + (vr.house_number || '') + ')' };
                    if (_vCurr > 0 && _vCurr < _vPrev) return { success: false, error: 'เลขมิเตอร์ปัจจุบันน้อยกว่าก่อนหน้า (' + (vr.house_number || '') + ')' };
                }
                var user = {}; try { user = JSON.parse(localStorage.getItem('currentUser') || '{}'); } catch(e) {}
                // Pre-fetch house_id map (house_id is required FK in water_bills)
                var _wHouseMap = {};
                try {
                    var _wHouseRows = await sbGet('housing', { select: 'id,house_number' });
                    (_wHouseRows || []).forEach(function(h) { _wHouseMap[h.house_number] = h.id; });
                } catch(e) {}
                // สำรองข้อมูลเดิมและเก็บ IDs เดิมไว้ (เพื่อลบหลัง insert สำเร็จ — ป้องกันข้อมูลสูญหายถ้า insert fail)
                var _oldWIds = [];
                try { var _bakW = await sbGet('water_bills', { period: 'eq.' + data.period }); _oldWIds = (_bakW || []).map(function(r){ return r.id; }).filter(Boolean); await _autoBackup('submitWaterBill', 'บันทึกค่าน้ำงวด ' + data.period, 'water_bills', 'period', data.period, user.id || null, _bakW); } catch(e) {}
                // Batch insert ก่อน (ลบเก่าหลัง insert สำเร็จ — ป้องกันข้อมูลสูญหายถ้า insert fail)
                var _wBatch = data.records.map(function(rec) {
                    return {
                        house_id: _wHouseMap[rec.house_number] || null,
                        house_number: rec.house_number, period: data.period,
                        year: parseInt(data.year) || 0, month: parseInt(data.month) || 0,
                        prev_meter: parseFloat(rec.prev_meter) || 0, curr_meter: parseFloat(rec.curr_meter) || 0,
                        units_used: parseFloat(rec.units) || 0, rate_per_unit: parseFloat(data.rate) || 0,
                        units_override: rec.units_override != null ? parseFloat(rec.units_override) : null,
                        amount: parseFloat(rec.amount) || 0, recorded_by: user.id || null,
                        reading_date: data.readingDate || null,
                        meter_photo_url: rec.meter_photo_url || null,
                        ocr_raw_text: rec.ocr_raw_text || null,
                        ocr_confidence: rec.ocr_confidence != null ? parseFloat(rec.ocr_confidence) : null,
                        read_by: rec.read_by || user.id || null
                    };
                });
                var inserted = await sbPost('water_bills', _wBatch);
                if (!Array.isArray(inserted)) inserted = [inserted];
                // ลบข้อมูลเดิมหลัง insert สำเร็จ (insert-first, delete-after)
                if (_oldWIds.length > 0) {
                    try { await sbDelete('water_bills', { id: 'in.(' + _oldWIds.join(',') + ')' }); } catch(e) { console.warn('cleanup old water_bills:', e); }
                }
                // Auto-sync บัญชี
                try { await _autoSyncAccounting(data.period); } catch(e) { console.warn('autoSync error', e); }
                _logActivity('submit_water_bill', user.id, 'บันทึกค่าน้ำ งวด ' + data.period + ' (' + _wBatch.length + ' หลัง)', { period: data.period, count: _wBatch.length });
                return { success: true, data: inserted };
            }
            var row = await sbPost('water_bills', { house_id: data.houseId, house_number: data.houseNumber, period: data.period, year: data.year, month: data.month, prev_meter: data.prevMeter, curr_meter: data.currMeter, units_used: data.unitsUsed, rate_per_unit: data.ratePerUnit, amount: data.amount, recorded_by: data.recordedBy });
            _logActivity('submit_water_bill', data.recordedBy, 'บันทึกค่าน้ำ ' + (data.houseNumber || '') + ' งวด ' + (data.period || ''), { house_number: data.houseNumber, period: data.period });
            return { success: true, data: row };
        }

        // ═══ Report Approvals ═══
        case 'getReportApprovals': {
            var q = { order: 'submitted_at.desc' };
            if (data.status) q.status = 'eq.' + data.status;
            if (data.reportType) q.report_type = 'eq.' + data.reportType;
            if (data.period) q.period = 'eq.' + data.period;
            var rows = await sbGet('report_approvals', q);
            return { success: true, data: rows || [] };
        }
        case 'getReportApprovalById': {
            if (!data.id) return { success: false, error: 'ไม่ระบุ id' };
            var rows = await sbGet('report_approvals', { id: 'eq.' + data.id });
            if (!rows || !rows.length) return { success: false, error: 'ไม่พบรายงาน' };
            return { success: true, data: rows[0] };
        }
        case 'signReportApproval': {
            if (!data.id) return { success: false, error: 'ไม่ระบุ id' };
            var user = {}; try { user = JSON.parse(localStorage.getItem('currentUser') || '{}'); } catch(e) {}
            var patch = {
                status: data.status || 'approved',
                reviewed_by: user.id || null,
                reviewed_at: new Date().toISOString(),
                reviewer_note: data.reviewerNote || null,
                updated_at: new Date().toISOString()
            };
            if (data.sigRecorder) patch.sig_recorder = data.sigRecorder;
            if (data.sigChecker) patch.sig_checker = data.sigChecker;
            if (data.sigHead) patch.sig_head = data.sigHead;
            await sbPatch('report_approvals', { id: 'eq.' + data.id }, patch);
            _logActivity('sign_report_approval', user.id || null, (data.status === 'approved' ? 'อนุมัติ' : 'ไม่อนุมัติ') + 'รายงาน', { reportId: data.id, status: data.status });
            return { success: true };
        }
        case 'submitReportForApproval': {
            if (!data.reportType || !data.period || !data.reportHtml) return { success: false, error: 'ข้อมูลไม่ครบ' };
            var user = {}; try { user = JSON.parse(localStorage.getItem('currentUser') || '{}'); } catch(e) {}
            var row = await sbPost('report_approvals', {
                report_type: data.reportType,
                period: data.period,
                year: data.year || null,
                submitted_by: user.id || null,
                report_html: data.reportHtml,
                status: 'pending'
            });
            _logActivity('submit_report', user.id || null, 'ส่งรายงานเพื่ออนุมัติ ' + data.reportType + ' งวด ' + data.period, { reportType: data.reportType, period: data.period });
            return { success: true, data: row };
        }

        case 'getElectricBills': {
            var q = { order: 'recorded_at.desc' };
            if (data.period) q.period = 'eq.' + data.period;
            if (data.houseNumber) q.house_number = 'eq.' + data.houseNumber;
            var rows;
            if (data.year && !data.period) {
                var q2 = { order: 'period.asc,house_number.asc' };
                q2['period'] = 'gte.' + data.year + '-01';
                if (data.houseNumber) q2.house_number = 'eq.' + data.houseNumber;
                var allRows = await sbGet('electric_bills', q2);
                rows = (allRows || []).filter(function(r) { return r.period && r.period.substring(0, 4) === String(data.year).substring(0, 4); });
            } else {
                rows = await sbGet('electric_bills', q);
            }
            // ดึง Lost data ถ้ามี
            var lostInfo = null;
            if (data.period) {
                try {
                    var lostRows = await sbGet('settings', { key: 'eq.electric_lost_' + data.period });
                    if (lostRows && lostRows[0]) lostInfo = JSON.parse(lostRows[0].value);
                } catch(e) {}
            }
            return { success: true, data: rows, lost: lostInfo };
        }
        case 'submitElectricBill': {
            if (!data.period) return { success: false, error: 'ไม่ระบุงวด' };
            // รองรับทั้ง batch (records[]) และ single record
            if (data.records && Array.isArray(data.records)) {
                // Validate: ตรวจค่าลบ
                for (var ei = 0; ei < data.records.length; ei++) {
                    if (parseFloat(data.records[ei].amount) < 0) return { success: false, error: 'ยอดเงินติดลบ (' + (data.records[ei].house_number || '') + ')' };
                }
                var user = {}; try { user = JSON.parse(localStorage.getItem('currentUser') || '{}'); } catch(e) {}
                // Pre-fetch house_id map (house_id is required FK in electric_bills)
                var _eHouseMap = {};
                try {
                    var _eHouseRows = await sbGet('housing', { select: 'id,house_number' });
                    (_eHouseRows || []).forEach(function(h) { _eHouseMap[h.house_number] = h.id; });
                } catch(e) {}
                // สำรองข้อมูลเดิมและเก็บ IDs เดิมไว้ (เพื่อลบหลัง insert สำเร็จ — ป้องกันข้อมูลสูญหายถ้า insert fail)
                var _oldEIds = [];
                try { var _bakE = await sbGet('electric_bills', { period: 'eq.' + data.period }); _oldEIds = (_bakE || []).map(function(r){ return r.id; }).filter(Boolean); await _autoBackup('submitElectricBill', 'บันทึกค่าไฟงวด ' + data.period, 'electric_bills', 'period', data.period, user.id || null, _bakE); } catch(e) {}
                // Batch insert ก่อน (ลบเก่าหลัง insert สำเร็จ — ป้องกันข้อมูลสูญหายถ้า insert fail)
                var _eBatch = data.records.map(function(rec) {
                    var _eAmt = parseFloat(rec.amount) || 0;
                    var obj = {
                        house_id: _eHouseMap[rec.house_number] || null,
                        house_number: rec.house_number, period: data.period,
                        year: parseInt(data.year) || 0, month: parseInt(data.month) || 0,
                        bill_amount: _eAmt, amount: _eAmt,
                        method: data.method || 'bill', recorded_by: user.id || null,
                        reading_date: data.readingDate || null
                    };
                    // unit mode: บันทึกมิเตอร์ด้วย
                    if (data.method === 'unit') {
                        obj.prev_meter = parseFloat(rec.prev_meter) || 0;
                        obj.curr_meter = parseFloat(rec.curr_meter) || 0;
                        obj.units_used = parseFloat(rec.units_used) || 0;
                        obj.rate_per_unit = parseFloat(data.rate_per_unit) || 0;
                    }
                    return obj;
                });
                var inserted = await sbPost('electric_bills', _eBatch);
                if (!Array.isArray(inserted)) inserted = [inserted];
                // ลบข้อมูลเดิมหลัง insert สำเร็จ (insert-first, delete-after)
                if (_oldEIds.length > 0) {
                    try { await sbDelete('electric_bills', { id: 'in.(' + _oldEIds.join(',') + ')' }); } catch(e) { console.warn('cleanup old electric_bills:', e); }
                }
                // บันทึก PEA total + Lost + rounding_surplus ลง settings (ต่อ period)
                if (data.pea_total || data.lost_house || data.lost_flat || data.rounding_surplus || data.electric_diff) {
                    var lostData = JSON.stringify({
                        pea_total: data.pea_total || 0,
                        lost_house: data.lost_house || 0,
                        lost_flat: data.lost_flat || 0,
                        rounding_surplus: data.rounding_surplus || 0,
                        electric_diff: data.electric_diff || 0
                    });
                    try { await sbUpsert('settings', { key: 'electric_lost_' + data.period, value: lostData }, 'key'); } catch(e) { console.warn('settings upsert (electric_lost):', e); }
                }
                // Auto-sync บัญชี
                try { await _autoSyncAccounting(data.period); } catch(e) { console.warn('autoSync error', e); }
                _logActivity('submit_electric_bill', user.id, 'บันทึกค่าไฟ งวด ' + data.period + ' (' + _eBatch.length + ' หลัง)', { period: data.period, count: _eBatch.length });
                return { success: true, data: inserted };
            }
            var row = await sbPost('electric_bills', { house_id: data.houseId, house_number: data.houseNumber, period: data.period, year: data.year, month: data.month, prev_meter: data.prevMeter, curr_meter: data.currMeter, units_used: data.unitsUsed, rate_per_unit: data.ratePerUnit, bill_amount: data.billAmount, amount: data.amount, method: data.method || 'bill', recorded_by: data.recordedBy });
            _logActivity('submit_electric_bill', data.recordedBy, 'บันทึกค่าไฟ ' + (data.houseNumber || '') + ' งวด ' + (data.period || ''), { house_number: data.houseNumber, period: data.period });
            return { success: true, data: row };
        }
        case 'getOutstanding': {
            var q = { order: 'period.desc,house_number.asc' };
            if (data.houseNumber) q.house_number = 'eq.' + data.houseNumber;
            if (data.status)      q.status        = 'eq.' + data.status;
            var rows = await sbGet('outstanding', q);
            // ถ้าดึงข้อมูลของบ้านใดบ้านหนึ่ง → กรองเฉพาะ period ที่แอดมินแจ้งยอดแล้ว
            // ป้องกันแสดงยอดแก่ผู้พักอาศัยก่อนที่แอดมินจะกด "บันทึกข้อมูลแจ้งยอดลงระบบ"
            if (data.houseNumber && rows && rows.length > 0) {
                try {
                    var _goNotifs = await sbGet('notifications', { house_number: 'eq.' + data.houseNumber, select: 'period', limit: '100' }).catch(function() { return []; });
                    var _goPublished = {};
                    (_goNotifs || []).forEach(function(n) { if (n.period) _goPublished[n.period] = true; });
                    rows = rows.filter(function(r) { return _goPublished[r.period]; });
                } catch(e) {}
            }
            return { success: true, data: rows };
        }
        case 'getPaymentHistory': {
            var q = { order: 'recorded_at.desc', limit: String(data.limit || 100) };
            if (data.houseNumber) q.house_number = 'eq.' + data.houseNumber;
            var rows = await sbGet('payment_history', q);

            // Enrich: ดึง water_bills + electric_bills + settings + exemptions + housing เพื่อแยกยอดค่าน้ำ/ค่าไฟ/ค่าส่วนกลาง
            if (rows && rows.length > 0 && data.houseNumber) {
                var [_phW, _phE, _phS, _phExempt, _phHousing] = await Promise.all([
                    sbGet('water_bills',    { house_number: 'eq.' + data.houseNumber, order: 'period.asc' }).catch(function() { return []; }),
                    sbGet('electric_bills', { house_number: 'eq.' + data.houseNumber, order: 'period.asc' }).catch(function() { return []; }),
                    sbGet('settings',       { select: 'key,value' }).catch(function() { return []; }),
                    sbGet('exemptions',     { house_number: 'eq.' + data.houseNumber, type: 'eq.common_fee', select: 'id,house_id' }).catch(function() { return []; }),
                    sbGet('housing',        { select: 'id,house_number' }).catch(function() { return []; })
                ]);
                var _phWMap = {};
                (_phW || []).forEach(function(w) { _phWMap[w.period] = (_phWMap[w.period] || 0) + (parseFloat(w.amount) || 0); });
                var _phEMap = {};
                (_phE || []).forEach(function(e) { _phEMap[e.period] = (_phEMap[e.period] || 0) + (parseFloat(e.bill_amount) || parseFloat(e.amount) || 0); });
                var _phSMap = {};
                (_phS || []).forEach(function(s) { _phSMap[s.key] = s.value; });
                var _cfH = parseFloat(_phSMap['common_fee_house']) || parseFloat(_phSMap['commonFee']) || 0;
                var _cfF = parseFloat(_phSMap['common_fee_flat'])  || parseFloat(_phSMap['commonFee']) || 0;
                var _hn = (data.houseNumber || '').toLowerCase();
                // validate ว่า exemption มี house_id ที่ตรงกับ housing จริง
                var _phValidIds = {};
                (_phHousing || []).forEach(function(h) { if (h.id) _phValidIds[String(h.id)] = true; });
                var _isExempt = (_phExempt || []).some(function(ex) { return ex.house_id && _phValidIds[String(ex.house_id)]; });
                var _cf = _isExempt ? 0 : ((_hn.indexOf('แฟลต') >= 0 || _hn.indexOf('flat') >= 0) ? _cfF : _cfH);
                rows.forEach(function(r) {
                    r.water_amount    = _phWMap[r.period] || 0;
                    r.electric_amount = _phEMap[r.period] || 0;
                    r.common_fee      = _cf;
                    r.exempt_common   = _isExempt;
                });
            }
            return { success: true, data: rows };
        }
        case 'getSlipSubmissions': {
            var q = { order: 'submitted_at.desc' };
            if (data.status) q.status = 'eq.' + data.status;
            if (data.period) q.period = 'eq.' + data.period;
            if (data.houseNumber) q.house_number = 'eq.' + data.houseNumber;
            var [rows, resRows, proxyRows2, inactiveRes2] = await Promise.all([
                sbGet('slip_submissions', q).catch(function() { return []; }),
                sbGet('residents', { is_active: 'eq.true', select: 'id,house_number,prefix,firstname,lastname,email,resident_type,user_id,start_date,move_in_date' }).catch(function() { return []; }),
                sbGet('payment_proxies', { is_active: 'eq.true', select: 'house_number,proxy_user_id' }).catch(function() { return []; }),
                sbGet('residents', { is_active: 'eq.false', select: 'id,house_number,prefix,firstname,lastname,end_date,user_id', order: 'end_date.desc' }).catch(function() { return []; })
            ]);
            var resMap = {};
            var resEmailMap2 = {};
            var resUserEmail2 = {};
            var resStartMap2 = {};
            // resIdMap: lookup ชื่อจาก resident.id (ทั้ง active + inactive)
            var resIdMap = {};
            // userIdNameMap: lookup ชื่อจาก user_id ของผู้พัก (ทั้ง active + inactive)
            var userIdNameMap = {};
            // resHouseUserSet: set ของ user_id ที่เป็นผู้พักของแต่ละบ้าน (สำหรับตรวจ step 2)
            var resHouseUserSet = {}; // { house_number: Set<user_id> }
            (resRows || []).forEach(function(r) {
                var fullName = ((r.prefix || '') + (r.firstname || '') + ' ' + (r.lastname || '')).trim();
                resMap[r.house_number] = fullName;
                if (!resEmailMap2[r.house_number] && r.email && r.resident_type !== 'cohabitant') {
                    resEmailMap2[r.house_number] = r.email;
                }
                if (r.user_id && r.email) resUserEmail2[r.user_id] = r.email;
                if (r.house_number) resStartMap2[r.house_number] = r.start_date || r.move_in_date || '';
                if (r.id) resIdMap[r.id] = fullName;
                if (r.user_id) userIdNameMap[r.user_id] = fullName;
                // บันทึก user_id → บ้านที่เป็นผู้พักจริง
                if (r.house_number && r.user_id) {
                    if (!resHouseUserSet[r.house_number]) resHouseUserSet[r.house_number] = {};
                    resHouseUserSet[r.house_number][r.user_id] = true;
                }
            });
            // สร้าง map ผู้พักเก่า (inactive)
            var oldResMap2 = {};
            (inactiveRes2 || []).forEach(function(r) {
                if (!r.house_number) return;
                var oName = ((r.prefix || '') + (r.firstname || '') + ' ' + (r.lastname || '')).trim();
                if (!oldResMap2[r.house_number] || (r.end_date && (!oldResMap2[r.house_number].end_date || r.end_date > oldResMap2[r.house_number].end_date))) {
                    oldResMap2[r.house_number] = { name: oName, end_date: r.end_date || '' };
                }
                if (r.id) resIdMap[r.id] = oName;
                if (r.user_id && !userIdNameMap[r.user_id]) userIdNameMap[r.user_id] = oName;
                // บันทึก inactive user_id → บ้านที่เคยพักด้วย
                if (r.house_number && r.user_id) {
                    if (!resHouseUserSet[r.house_number]) resHouseUserSet[r.house_number] = {};
                    resHouseUserSet[r.house_number][r.user_id] = true;
                }
            });
            var proxyEmailMap2 = {};
            // ดึง email จาก users table สำหรับ proxy ที่ residents อาจไม่มี email
            var proxyUserIds2 = (proxyRows2 || []).map(function(p) { return p.proxy_user_id; }).filter(Boolean);
            if (proxyUserIds2.length > 0) {
                var usersForProxy2 = await sbGet('users', { id: 'in.(' + proxyUserIds2.join(',') + ')', select: 'id,email' }).catch(function() { return []; });
                (usersForProxy2 || []).forEach(function(u) {
                    if (u.id && u.email && !resUserEmail2[u.id]) resUserEmail2[u.id] = u.email;
                });
            }
            (proxyRows2 || []).forEach(function(p) {
                if (p.house_number && p.proxy_user_id && resUserEmail2[p.proxy_user_id]) {
                    proxyEmailMap2[p.house_number] = resUserEmail2[p.proxy_user_id];
                }
            });
            (rows || []).forEach(function(s) {
                var hn = s.house_number || '';
                // 1. ใช้ resident_id ที่บันทึกในสลิป (แม่นยำที่สุด — ไม่ขึ้นกับว่าใครกด submit)
                var slipName = (s.resident_id && resIdMap[s.resident_id])
                    ? resIdMap[s.resident_id] : '';
                // 2. fallback: ใช้ submitted_by_user_id เฉพาะกรณีที่ user นั้นเป็นผู้พักของบ้านนี้จริง
                // (ป้องกันกรณีแอดมินกด "ชำระแทน" แล้วชื่อแอดมินไปแสดงแทนชื่อผู้พักที่แท้จริง)
                if (!slipName && s.submitted_by_user_id && userIdNameMap[s.submitted_by_user_id]) {
                    if (resHouseUserSet[hn] && resHouseUserSet[hn][s.submitted_by_user_id]) {
                        slipName = userIdNameMap[s.submitted_by_user_id];
                    }
                }
                // 3. fallback สุดท้าย: ดูจาก house_number (สลิปเก่าที่ไม่มี user_id)
                if (!slipName) {
                    slipName = resMap[hn] || '';
                    // ถ้าผู้พักปัจจุบันเพิ่งเข้ามาหลังช่วงบิลนี้ → ใช้ชื่อผู้พักเก่า
                    if (slipName && s.period && resStartMap2[hn]) {
                        var _sParts = (s.period || '').split('-');
                        var _sAdY = parseInt(_sParts[0]) || 2026;
                        if (_sAdY > 2500) _sAdY -= 543;
                        var _sMo = parseInt(_sParts[1]) || 1;
                        var _slipPeriodYM = _sAdY + '-' + String(_sMo).padStart(2, '0');
                        var _sStartYM = (resStartMap2[hn] || '').substring(0, 7);
                        if (_sStartYM > _slipPeriodYM && oldResMap2[hn]) {
                            slipName = oldResMap2[hn].name;
                        }
                    }
                    if (!slipName && oldResMap2[hn]) slipName = oldResMap2[hn].name;
                }
                s.resident_name = slipName;
                s.email = resEmailMap2[hn] || '';
                s.proxy_email = proxyEmailMap2[hn] || '';
            });
            return { success: true, data: rows };
        }
        case 'getNotificationHistory': {
            var q = { order: 'sent_at.desc', limit: String(data.limit || 100) };
            if (data.houseNumber) q.house_number = 'eq.' + data.houseNumber;
            if (data.period) q.period = 'eq.' + data.period;
            var rows = await sbGet('notifications', q);
            return { success: true, data: rows };
        }
        case 'saveNotification': {
            // Pre-lookup housing + resident สำหรับ outstanding upsert
            var _snHouseId = data.houseId || null;
            var _snResUserId = null;
            try {
                if (data.houseNumber && !_snHouseId) {
                    var _snH = await sbGet('housing', { house_number: 'eq.' + data.houseNumber, select: 'id', limit: '1' });
                    if (_snH && _snH[0]) _snHouseId = _snH[0].id;
                }
                if (data.houseNumber) {
                    var _snR = await sbGet('residents', { house_number: 'eq.' + data.houseNumber, is_active: 'eq.true', select: 'user_id', limit: '1' });
                    if (_snR && _snR[0]) _snResUserId = _snR[0].user_id;
                }
            } catch(e) {}
            var _nBody = { house_id: _snHouseId, house_number: data.houseNumber, period: data.period, water_amount: data.waterAmount, electric_amount: data.electricAmount, common_fee: data.commonFee, garbage_fee: data.garbageFee, total_amount: data.totalAmount, due_date: data.dueDate, message: data.message, sent_by: data.sentBy };
            if (data.sentAt) _nBody.sent_at = data.sentAt;
            var row = await sbPost('notifications', _nBody);
            // Upsert outstanding — สร้าง/อัปเดตยอดค้างอัตโนมัติ
            try {
                if (_snHouseId && data.houseNumber && data.period) {
                    var _snParts = (data.period || '').split('-');
                    var _snYear = parseInt(_snParts[0]) || 0;
                    var _snMonth = parseInt(_snParts[1]) || 0;
                    if (_snYear > 0 && _snMonth > 0) {
                        var _snExist = await sbGet('outstanding', { house_number: 'eq.' + data.houseNumber, period: 'eq.' + data.period, limit: '1' });
                        var _snOutData = {
                            water_amount: data.waterAmount || 0, electric_amount: data.electricAmount || 0,
                            common_fee: data.commonFee || 0, garbage_fee: data.garbageFee || 0,
                            total_amount: data.totalAmount || 0,
                            due_date: data.dueDate || null, status: 'unpaid',
                            updated_at: new Date().toISOString()
                        };
                        if (_snResUserId) _snOutData.user_id = _snResUserId;
                        if (_snExist && _snExist.length > 0) {
                            if (_snExist[0].status !== 'paid') {
                                try { await sbPatch('outstanding', { id: 'eq.' + _snExist[0].id }, _snOutData); } catch(oe) {
                                    delete _snOutData.user_id;
                                    try { await sbPatch('outstanding', { id: 'eq.' + _snExist[0].id }, _snOutData); } catch(oe2) {}
                                }
                            }
                        } else {
                            var _snNewOut = Object.assign({ house_id: _snHouseId, house_number: data.houseNumber, period: data.period, year: _snYear, month: _snMonth }, _snOutData);
                            try { await sbPost('outstanding', _snNewOut); } catch(oe) {
                                delete _snNewOut.user_id;
                                try { await sbPost('outstanding', _snNewOut); } catch(oe2) { console.warn('[saveNotification] outstanding insert failed:', oe2); }
                            }
                        }
                    }
                }
            } catch(e) { console.warn('[saveNotification] outstanding upsert failed:', e); }
            return { success: true, data: row };
        }
        case 'deleteNotifications': {
            if (!data.period) return { success: false, error: 'ไม่ระบุ period' };
            try { await sbDelete('notifications', { period: 'eq.' + data.period }); } catch(e) {}
            // ลบ outstanding ที่ยังไม่ชำระของ period นี้ด้วย เพื่อไม่ให้แสดงยอดแก่ผู้พักอาศัยหลังจากล้างการแจ้งยอด
            try { await sbDelete('outstanding', { period: 'eq.' + data.period, status: 'in.(unpaid,partial)' }); } catch(e) {}
            return { success: true };
        }
        case 'getRequests': {
            var q = { order: 'submitted_at.desc' };
            if (data.type)    q.type    = 'eq.' + data.type;
            if (data.status)  q.status  = 'eq.' + data.status;
            else              q.status  = 'neq.cancelled'; // ซ่อนคำร้องที่ยกเลิกแล้ว (ยกเว้น caller ระบุ status เอง)
            if (data.user_id) q.user_id = 'eq.' + data.user_id;
            if (data.id)      q.id      = 'eq.' + data.id;
            if (data.year) {
                // แปลงปี พ.ศ. → ค.ศ. ก่อนกรอง submitted_at
                var adYear = parseInt(data.year);
                if (adYear > 2500) adYear = adYear - 543;
                q['submitted_at'] = 'gte.' + adYear + '-01-01T00:00:00Z';
            }
            var rows = await sbGet('requests', q);
            return { success: true, data: rows };
        }

        case 'getRequestById': {
            if (!data.id) return { success: false, error: 'ไม่ระบุ id' };
            var rows = await sbGet('requests', { id: 'eq.' + data.id, limit: '1' });
            return { success: true, data: rows && rows[0] ? rows[0] : null };
        }

        case 'headReviewRequest': {
            var hrSess = await _getSessionRole();
            if (!hrSess || (hrSess.role !== 'admin' && hrSess.role !== 'head')) {
                return { success: false, error: 'ไม่มีสิทธิ์ดำเนินการ' };
            }
            if (!data.requestId) return { success: false, error: 'ไม่ระบุ requestId' };
            var hrNow = new Date().toISOString();
            var hrUser = await sbGet('users', { id: 'eq.' + hrSess.userId, select: 'id,email', limit: '1' });
            var hrName = data.reviewer_name || (hrUser && hrUser[0] ? (hrUser[0].display_name || hrUser[0].email || '') : '');
            await sbPatch('requests', { id: 'eq.' + data.requestId }, {
                head_comment:       data.head_comment || '',
                head_signature:     data.head_signature || null,
                head_reviewed_at:   hrNow,
                head_reviewer_name: hrName,
                head_reviewer_position: data.head_reviewer_position || null,
                review_note:        data.head_comment || '',
                reviewed_by:        hrSess.userId,
                reviewed_at:        hrNow,
                status:             data.new_status || 'head_reviewed',
                updated_at:         hrNow
            });
            _logActivity('head_review_request', hrSess.userId, 'ลงความเห็นคำร้อง ' + data.requestId, { requestId: data.requestId });
            return { success: true };
        }
        case 'getQueue': {
            var rows = await sbGet('queue', { status: 'eq.waiting', order: 'position.asc' });
            return { success: true, data: rows };
        }
        case 'getIncome': {
            var q = { type: 'eq.income', order: 'recorded_at.desc' };
            if (data.period) q.period = 'eq.' + data.period;
            var rows = await sbGet('accounting_entries', q);
            return { success: true, data: rows };
        }
        case 'getExpense': {
            var q = { type: 'eq.expense', order: 'recorded_at.desc' };
            if (data.period) q.period = 'eq.' + data.period;
            var rows = await sbGet('accounting_entries', q);
            return { success: true, data: rows };
        }
        case 'saveAccountingEntry': {
            var row = await sbPost('accounting_entries', { period: data.period, year: data.year, month: data.month, type: data.type, category: data.category, description: data.description, amount: data.amount, receipt_url: data.receiptUrl, recorded_by: data.recordedBy });
            return { success: true, data: row };
        }
        case 'getMonthlyWithdraw': {
            var wdKey = 'monthly_withdraw_' + (data.period || '');
            var wdRows = await sbGet('settings', { key: 'eq.' + wdKey });
            var wdStored = null;
            if (wdRows && wdRows[0] && wdRows[0].value) {
                try { wdStored = JSON.parse(wdRows[0].value); } catch(e) {}
            }
            return { success: true, data: wdStored };
        }
        case 'saveWithdraw': {
            var swKey = 'monthly_withdraw_' + (data.period || '');
            var swVal = JSON.stringify({
                garbageFee: data.garbageFee || 0,
                additionalItems: data.additionalItems || [],
                operatingCosts: data.operatingCosts || {},
                totalWithdraw: data.totalWithdraw || 0,
                deferredItems: data.deferredItems || {},
                savedAt: new Date().toISOString()
            });
            try { await sbUpsert('settings', { key: swKey, value: swVal }, 'key'); } catch(e) { console.warn('settings upsert (monthly_withdraw):', e); }
            // sync ค่าใช้จ่ายไปยังบัญชีกองกลางอัตโนมัติ
            try { await _autoSyncAccounting(data.period); } catch(e) { console.warn('autoSync error', e); }
            return { success: true };
        }

        /* ── สำรองจ่าย / ทดรองจ่าย ─────────────────────── */
        case 'saveAdvancePayment': {
            var apStatus = (data.source_type === 'bank_transfer') ? 'reimbursed' : 'pending';
            var apReimbAmt = (data.source_type === 'bank_transfer') ? (parseFloat(data.amount) || 0) : 0;
            var row = await sbPost('advance_payments', {
                period: data.period,
                person_name: data.person_name,
                amount: parseFloat(data.amount) || 0,
                purpose: data.purpose || '',
                source_type: data.source_type || 'committee_advance',
                status: apStatus,
                reimbursed_amount: apReimbAmt,
                recorded_by: data.recorded_by || null
            });
            try { await _autoSyncAccounting(data.period); } catch(e) { console.warn('autoSync advance error', e); }
            return { success: true, data: row };
        }
        case 'getAdvancePayments': {
            var q = { order: 'created_at.desc' };
            if (data.period) q.period = 'eq.' + data.period;
            if (data.status) q.status = 'eq.' + data.status;
            var rows = await sbGet('advance_payments', q);
            return { success: true, data: rows || [] };
        }
        case 'reimburseAdvance': {
            // ดึงข้อมูลเดิมก่อน
            var existing = await sbGet('advance_payments', { id: 'eq.' + data.id });
            if (!existing || !existing[0]) return { success: false, error: 'ไม่พบรายการสำรองจ่าย' };
            var adv = existing[0];
            var addAmt = parseFloat(data.reimbursed_amount) || 0;
            var newReimbursed = (parseFloat(adv.reimbursed_amount) || 0) + addAmt;
            var advTotal = parseFloat(adv.amount) || 0;
            var newStatus = newReimbursed >= advTotal ? 'reimbursed' : (newReimbursed > 0 ? 'partial' : 'pending');
            await sbPatch('advance_payments', { id: 'eq.' + data.id }, {
                reimbursed_amount: Math.min(newReimbursed, advTotal),
                reimbursed_at: new Date().toISOString(),
                reimbursed_note: data.reimbursed_note || '',
                approved_by: data.approved_by || null,
                approved_at: data.approved_by ? new Date().toISOString() : null,
                status: newStatus,
                updated_at: new Date().toISOString()
            });
            try { await _autoSyncAccounting(adv.period); } catch(e) { console.warn('autoSync reimburse error', e); }
            return { success: true, status: newStatus };
        }
        case 'deleteAdvancePayment': {
            var existing2 = await sbGet('advance_payments', { id: 'eq.' + data.id });
            if (!existing2 || !existing2[0]) return { success: false, error: 'ไม่พบรายการ' };
            if (existing2[0].status !== 'pending') return { success: false, error: 'ลบได้เฉพาะรายการที่ยังไม่คืนเงิน' };
            var _advPeriod = existing2[0].period;
            await sbDelete('advance_payments', { id: 'eq.' + data.id });
            try { await _autoSyncAccounting(_advPeriod); } catch(e) {}
            return { success: true };
        }
        case 'getPendingCarryOver': {
            // ดึงยอดค้างจากเดือนก่อน: deferred items (พร้อมยอดเงิน) + สำรองจ่ายค้างคืน
            var curPeriod = data.period || '';
            var result = { deferredItems: [], pendingAdvances: [] };

            // 1. หา deferred items จาก settings (monthly_withdraw_YYYY-MM) ทุกเดือนก่อน period นี้
            var allSettings = await sbGet('settings', { key: 'like.monthly_withdraw_%' });
            var deferredPeriods = []; // เก็บ period+itemKey ที่ต้องดึงยอดเงิน
            (allSettings || []).forEach(function(row) {
                var p = row.key.replace('monthly_withdraw_', '');
                if (p >= curPeriod) return;
                try {
                    var val = JSON.parse(row.value || '{}');
                    var di = val.deferredItems || {};
                    var labels = { water: 'ค่าน้ำ', electric: 'ค่าไฟ' };
                    Object.keys(di).forEach(function(key) {
                        if (di[key] && di[key].reason) {
                            deferredPeriods.push({ period: p, itemKey: key });
                            result.deferredItems.push({
                                period: p,
                                itemKey: key,
                                label: labels[key] || key,
                                reason: di[key].reason,
                                until: di[key].until || null,
                                amount: 0 // จะเติมทีหลัง
                            });
                        }
                    });
                } catch(e) {}
            });

            // 1b. ดึงยอดเงินจริงของ deferred items
            for (var di = 0; di < result.deferredItems.length; di++) {
                var defItem = result.deferredItems[di];
                try {
                    if (defItem.itemKey === 'water') {
                        var wRows = await sbGet('water_bills', { period: 'eq.' + defItem.period });
                        defItem.amount = (wRows || []).reduce(function(s, r) { return s + (parseFloat(r.amount) || 0); }, 0);
                    } else if (defItem.itemKey === 'electric') {
                        var eTotal = 0;
                        var eRows = await sbGet('electric_bills', { period: 'eq.' + defItem.period });
                        eTotal = (eRows || []).reduce(function(s, r) { return s + (parseFloat(r.bill_amount) || parseFloat(r.amount) || 0); }, 0);
                        try {
                            var _peaRows = await sbGet('settings', { key: 'eq.electric_lost_' + defItem.period });
                            if (_peaRows && _peaRows[0] && _peaRows[0].value) {
                                var _peaData = JSON.parse(_peaRows[0].value);
                                if (_peaData && parseFloat(_peaData.pea_total) > 0) eTotal = parseFloat(_peaData.pea_total);
                            }
                        } catch(e2) {}
                        defItem.amount = eTotal;
                    }
                } catch(e) { defItem.amount = 0; }
            }

            // 2. สำรองจ่ายค้างคืน (status=pending หรือ partial) ทุกเดือนก่อน period นี้
            var pendAdv = await sbGet('advance_payments', {
                period: 'lt.' + curPeriod,
                status: 'neq.reimbursed',
                order: 'period.asc,created_at.asc'
            });
            (pendAdv || []).forEach(function(a) {
                if (a.source_type === 'bank_transfer') return;
                var remaining = (parseFloat(a.amount) || 0) - (parseFloat(a.reimbursed_amount) || 0);
                if (remaining > 0) {
                    result.pendingAdvances.push({
                        id: a.id,
                        period: a.period,
                        person_name: a.person_name,
                        amount: parseFloat(a.amount) || 0,
                        reimbursed_amount: parseFloat(a.reimbursed_amount) || 0,
                        remaining: remaining,
                        purpose: a.purpose || ''
                    });
                }
            });

            return { success: true, data: result };
        }
        case 'getCashOnHand': {
            var period = data.period || '';
            // รายรับทั้งหมด ถึงเดือนนี้
            var [incAll, expAll, advAll] = await Promise.all([
                sbGet('accounting_entries', { period: 'lte.' + period, type: 'eq.income', select: 'amount' }).catch(function() { return []; }),
                sbGet('accounting_entries', { period: 'lte.' + period, type: 'eq.expense', select: 'amount' }).catch(function() { return []; }),
                sbGet('advance_payments', { period: 'lte.' + period, select: 'amount,reimbursed_amount,status,source_type' }).catch(function() { return []; })
            ]);
            var totalIncome = (incAll || []).reduce(function(s,r) { return s + (parseFloat(r.amount) || 0); }, 0);
            var totalExpense = (expAll || []).reduce(function(s,r) { return s + (parseFloat(r.amount) || 0); }, 0);
            var totalAdvanced = 0, totalReimbursed = 0;
            (advAll || []).forEach(function(a) {
                if (a.source_type === 'bank_transfer') return; // ไม่นับเงินในระบบ
                totalAdvanced += parseFloat(a.amount) || 0;
                totalReimbursed += parseFloat(a.reimbursed_amount) || 0;
            });
            var pendingReimburse = totalAdvanced - totalReimbursed;
            var cashOnHand = totalIncome - totalExpense;
            return { success: true, data: { totalIncome: totalIncome, totalExpense: totalExpense, cashOnHand: cashOnHand, totalAdvanced: totalAdvanced, totalReimbursed: totalReimbursed, pendingReimburse: pendingReimburse } };
        }
        case 'setDeferredReason': {
            await sbPatch('outstanding', { id: 'eq.' + data.outstanding_id }, {
                deferred_reason: data.deferred_reason || null,
                deferred_until: data.deferred_until || null,
                updated_at: new Date().toISOString()
            });
            return { success: true };
        }

        case 'getSettings': {
            var rows = await sbGet('settings', {});
            var obj = {};
            (rows || []).forEach(function(r) { obj[r.key] = r.value; });
            return { success: true, data: obj };
        }
        case 'saveSettings': {
            var entries = Object.entries(data.settings || {});
            for (var i = 0; i < entries.length; i++) {
                await sbUpsert('settings', { key: entries[i][0], value: String(entries[i][1]) }, 'key');
            }
            return { success: true };
        }
        case 'getAnnouncements': {
            var rows = await sbGet('announcements', { is_active: 'eq.true', order: 'created_at.desc', limit: '20' });
            return { success: true, data: rows };
        }
        case 'checkAdminExists': {
            var rows = await sbGet('users', { role: 'eq.admin', select: 'id', limit: '1' });
            return { success: true, exists: rows && rows.length > 0 };
        }

        case 'setupAdmin': {
            var saEmail = (data.email || '').trim().toLowerCase();
            var hash = await sha256hexSalted(data.password || '', saEmail);
            var uid = 'USR' + Date.now().toString(36).toUpperCase();
            await sbPost('users', {
                id: uid,
                email: saEmail,
                firstname: data.firstname || 'Admin',
                lastname:  data.lastname  || '',
                role: 'admin',
                password_hash: hash,
                is_active: true,
                pdpa_consent: true
            });
            return { success: true };
        }

        case 'uploadRequestAttachment': {
            var b64a = data.base64 || '';
            if (!b64a.startsWith('data:')) return { success: false, error: 'ไม่ใช่ base64 file' };
            var mimeMatchA = b64a.match(/data:([^;]+);base64,(.+)/);
            if (!mimeMatchA) return { success: false, error: 'รูปแบบ base64 ไม่ถูกต้อง' };
            var mimeA = mimeMatchA[1];
            if (!_validateMime(mimeA, true)) return { success: false, error: 'รองรับเฉพาะ JPG, PNG, WEBP, GIF, PDF เท่านั้น' };
            var rawA  = mimeMatchA[2];
            var binaryA = atob(rawA);
            var bytesA  = new Uint8Array(binaryA.length);
            for (var ka = 0; ka < binaryA.length; ka++) { bytesA[ka] = binaryA.charCodeAt(ka); }
            // ── Bucket แยกตามประเภทคำร้อง ──
            var _bucketMap = { residence: 'attach-residence', repair: 'attach-repair', transfer: 'attach-transfer', 'return': 'attach-return' };
            var bucketA = _bucketMap[data.requestType] || 'attach-residence';
            // ── ตั้งชื่อไฟล์: {บ้านเลขที่}/{วันที่}/{requestId}_{ชื่อไฟล์เดิม} ──
            var houseNum = (data.houseNumber || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
            var dateStr = new Date().toISOString().slice(0, 10);
            var reqIdA = (data.requestId || '').replace(/[^a-zA-Z0-9_-]/g, '');
            var origName = (data.filename || 'file').replace(/[^a-zA-Z0-9._\-\u0E00-\u0E7F]/g, '_');
            var safeOrigName = origName.length > 80 ? origName.substring(0, 80) : origName;
            var tsA = Date.now();
            var pathA = houseNum + '/' + dateStr + '/' + (reqIdA ? reqIdA + '_' : '') + tsA + '_' + safeOrigName;
            var blobA = new Blob([bytesA], { type: mimeA });
            try { await _ensureBucket(bucketA); } catch(e) {}
            var upResA = await window._sb.storage.from(bucketA).upload(pathA, blobA, { contentType: mimeA, upsert: true });
            if (upResA.error) {
                return { success: false, error: 'อัปโหลดไม่สำเร็จ: ' + (upResA.error.message || 'ข้อผิดพลาดไม่ทราบสาเหตุ') };
            }
            var pubA = window._sb.storage.from(bucketA).getPublicUrl(pathA);
            return { success: true, url: pubA.data.publicUrl, bucket: bucketA, path: pathA };
        }

        case 'submitRequest': {
            var sess = await sbGet('sessions', { token: 'eq.' + getSessionToken(), select: 'user_id,house_number,resident_id' });
            var s = sess && sess[0];
            // ── Duplicate prevention: ป้องกัน user ส่งคำร้องประเภทเดียวซ้ำขณะยังรอดำเนินการ ──
            if (s && s.user_id && ['return', 'transfer', 'residence'].indexOf(data.type) !== -1) {
                var _typeLabel = { residence: 'สมัครอยู่อาศัย', transfer: 'ขอย้ายบ้านพัก', 'return': 'ขอคืนบ้านพัก' };
                var _dupReqs = [];
                try { _dupReqs = await sbGet('requests', { user_id: 'eq.' + s.user_id, type: 'eq.' + data.type, status: 'in.(pending,reviewing,waiting)', select: 'id', limit: '1' }) || []; } catch(e) {}
                if (_dupReqs.length > 0) {
                    return { success: false, error: 'คุณมีคำร้อง' + (_typeLabel[data.type] || data.type) + 'รอดำเนินการอยู่แล้ว (รหัส ' + _dupReqs[0].id + ') กรุณารอผลหรือติดต่อผู้ดูแลระบบ' };
                }
            }
            // สร้าง ID: PREFIX-YYYYMMDD-NNN (ประเภท-วันที่-ลำดับ)
            var prefixMap = { residence: 'REQ', transfer: 'TRF', return: 'RTN', repair: 'RPR' };
            var reqPrefix = prefixMap[data.type] || 'REQ';
            // ใช้วันที่จาก submitted_at (ถ้า admin ระบุย้อนหลัง) หรือวันนี้
            var _reqDate = data.submitted_at ? new Date(data.submitted_at) : new Date();
            var _reqY = _reqDate.getFullYear();
            var _reqM = String(_reqDate.getMonth() + 1).padStart(2, '0');
            var _reqD = String(_reqDate.getDate()).padStart(2, '0');
            var _reqDateStr = _reqY + _reqM + _reqD;
            // หาลำดับถัดไป: นับคำร้องประเภทเดียวกันที่ ID ขึ้นต้นด้วย PREFIX-YYYYMMDD-
            var _seqPrefix = reqPrefix + '-' + _reqDateStr + '-';
            var _existingReqs = await sbGet('requests', { id: 'like.' + _seqPrefix + '%', type: 'eq.' + (data.type || 'general'), select: 'id', order: 'id.desc', limit: '1' });
            var _nextSeq = 1;
            if (_existingReqs && _existingReqs.length > 0) {
                var _lastId = _existingReqs[0].id;
                var _lastSeqStr = _lastId.split('-').pop();
                var _lastSeq = parseInt(_lastSeqStr, 10);
                if (!isNaN(_lastSeq)) _nextSeq = _lastSeq + 1;
            }
            var reqId = _seqPrefix + String(_nextSeq).padStart(3, '0');
            // แยก type ออกจาก data แล้วเก็บที่เหลือใน details (jsonb)
            var detailsCopy = {};
            Object.keys(data).forEach(function(k) { if (k !== 'type') detailsCopy[k] = data[k]; });
            var row = await sbPost('requests', {
                id:           reqId,
                type:         data.type || 'general',
                status:       'pending',
                user_id:      s ? s.user_id : null,
                house_number: data.houseNumber || data.house_number || data.current_house || (s ? s.house_number : ''),
                details:      detailsCopy,
                // ถ้า admin ระบุ submitted_at (ย้อนหลัง) ให้ใช้ค่านั้น
                ...(data.submitted_at ? { submitted_at: data.submitted_at, updated_at: data.submitted_at } : {})
            });
            _logActivity('submit_request', s ? s.user_id : null, 'ส่งคำร้อง' + (data.type || ''), { requestId: reqId, type: data.type, house_number: data.houseNumber || data.house_number });
            return { success: true, data: row, requestId: reqId };
        }

        case 'submitSlip': {
            // Validate inputs
            if (!data.houseNumber) return { success: false, error: 'ไม่ระบุเลขที่บ้าน' };
            if (!data.period) return { success: false, error: 'ไม่ระบุงวด' };
            if (!data.amount || parseFloat(data.amount) <= 0) return { success: false, error: 'จำนวนเงินไม่ถูกต้อง' };
            var slipSess = await _getSessionRole();
            var _submittedByUserId = slipSess ? slipSess.userId : null;
            if (slipSess && slipSess.role !== 'admin' && slipSess.role !== 'head') {
                var myResUser = null;
                try { var muArr = await sbGet('users', { id: 'eq.' + slipSess.userId, select: 'email', limit: '1' }); myResUser = muArr && muArr[0]; } catch(e) {}
                var myResObj = await _findResidentForUser(slipSess.userId, myResUser ? myResUser.email : null);
                var myHouse = myResObj ? (myResObj.house_number || '') : '';
                if (myHouse && data.houseNumber !== myHouse) {
                    // ตรวจสอบว่ามี active proxy assignment ให้บ้านนี้
                    var proxyCheck = await sbGet('payment_proxies', {
                        house_number: 'eq.' + data.houseNumber,
                        proxy_user_id: 'eq.' + slipSess.userId,
                        is_active: 'eq.true',
                        limit: '1'
                    }).catch(function() { return []; });
                    if (!proxyCheck || proxyCheck.length === 0) {
                        return { success: false, error: 'คุณไม่มีสิทธิ์ส่งสลิปแทนบ้านนี้ กรุณาติดต่อผู้ดูแลระบบ' };
                    }
                }
            }
            // ตรวจสลิปซ้ำ (ส่งแล้ว pending หรือ approved ใน period เดียวกัน)
            var dupSlips = await sbGet('slip_submissions', { house_number: 'eq.' + data.houseNumber, period: 'eq.' + data.period, status: 'in.(pending,approved)', limit: '1' });
            if (dupSlips && dupSlips.length > 0) {
                return { success: false, error: 'บ้านนี้มีสลิปค้างอยู่แล้วสำหรับงวดนี้ กรุณารอผลตรวจสอบ' };
            }
            // ลบสลิปที่ถูกปฏิเสธเก่าออก เพื่อป้องกัน stale rejected record ปรากฏหลัง cancel
            try {
                var oldRejected = await sbGet('slip_submissions', { house_number: 'eq.' + data.houseNumber, period: 'eq.' + data.period, status: 'eq.rejected', limit: '10' });
                if (oldRejected && oldRejected.length > 0) {
                    for (var ri = 0; ri < oldRejected.length; ri++) {
                        await sbDelete('slip_submissions', { id: 'eq.' + oldRejected[ri].id });
                    }
                }
            } catch(e) { /* ไม่เป็นปัญหาสำคัญ */ }
            var proxyNote = null;
            if (data.submittedByName && data.submittedByHouse) {
                proxyNote = '\u0E2A\u0E48\u0E07\u0E41\u0E17\u0E19\u0E42\u0E14\u0E22: ' + data.submittedByName + ' (' + data.submittedByHouse + ')';
            }
            // ตรวจ resident_id ให้ valid ก่อน insert (ป้องกัน FK violation)
            var validResidentId = null;
            if (data.residentId) {
                try {
                    var resCheck = await sbGet('residents', { id: 'eq.' + data.residentId, select: 'id', limit: '1' });
                    if (resCheck && resCheck.length > 0) validResidentId = data.residentId;
                } catch(e) {}
            }
            var row = await sbPost('slip_submissions', {
                house_number:         data.houseNumber  || '',
                resident_id:          validResidentId,
                period:               data.period       || '',
                amount:               data.amount       || 0,
                slip_url:             data.slipUrl      || null,
                transfer_date:        data.transferDate || null,
                bank_name:            data.bankName     || null,
                account_name:         proxyNote || data.accountName || null,
                qr_amount:            data.qrAmount     || null,
                qr_ref:               data.qrRef        || null,
                qr_raw:               data.qrRaw        || null,
                submitted_by_user_id: _submittedByUserId || null,
                status:               'pending'
            });
            _logActivity('submit_slip', _submittedByUserId, 'ส่งสลิปชำระเงิน ' + (data.houseNumber || '') + ' งวด ' + (data.period || ''), { house_number: data.houseNumber, period: data.period, amount: data.amount });
            return { success: true, data: row };
        }

        case 'updateSlip': {
            if (!data.id) return { success: false, error: '\u0E44\u0E21\u0E48\u0E23\u0E30\u0E1A\u0E38 ID \u0E2A\u0E25\u0E34\u0E1B' };
            // Check permission: only admin/head or the owner of a pending slip
            var updSess = await _getSessionRole();
            if (updSess && updSess.role !== 'admin' && updSess.role !== 'head') {
                var existSlip = await sbGet('slip_submissions', { id: 'eq.' + data.id, select: 'house_number,status', limit: '1' });
                if (!existSlip || existSlip.length === 0) return { success: false, error: '\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E2A\u0E25\u0E34\u0E1B' };
                if (existSlip[0].status !== 'pending') return { success: false, error: '\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E41\u0E01\u0E49\u0E44\u0E02\u0E2A\u0E25\u0E34\u0E1B\u0E17\u0E35\u0E48\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E41\u0E25\u0E49\u0E27' };
                var muArr3 = []; try { muArr3 = await sbGet('users', { id: 'eq.' + updSess.userId, select: 'email', limit: '1' }); } catch(e) {}
                var myResObj3 = await _findResidentForUser(updSess.userId, muArr3[0] ? muArr3[0].email : null);
                var myHouse3 = myResObj3 ? (myResObj3.house_number || '') : '';
                if (myHouse3 && existSlip[0].house_number !== myHouse3) return { success: false, error: '\u0E04\u0E38\u0E13\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E41\u0E01\u0E49\u0E44\u0E02\u0E2A\u0E25\u0E34\u0E1B\u0E19\u0E35\u0E49' };
            }
            await sbPatch('slip_submissions', { id: 'eq.' + data.id }, {
                amount:     data.amount  || 0,
                slip_url:   data.slipUrl || null,
                qr_amount:  data.qrAmount || null,
                qr_ref:     data.qrRef   || null,
                qr_raw:     data.qrRaw   || null,
                status:     'pending',
                review_note: null,
                reviewed_by: null,
                reviewed_at: null
            });
            return { success: true };
        }

        case 'resetPassword':
        case 'requestPasswordReset': {
            var email = (data.email || '').trim().toLowerCase();
            if (!email) return { success: false, error: 'กรุณากรอกอีเมล' };
            var uRows = await sbGet('users', { email: 'eq.' + email, select: 'id,firstname,email', limit: '1' });
            // ส่ง success เสมอเพื่อไม่ให้คนภายนอกรู้ว่าอีเมลมีอยู่ในระบบไหม
            if (!uRows || uRows.length === 0) return { success: true, message: 'หากอีเมลนี้มีในระบบ คุณจะได้รับรหัส OTP ภายในไม่กี่นาที' };
            var u = uRows[0];
            // สร้าง OTP 6 หลัก (ใช้ crypto-secure random)
            var otp = '';
            var _otpArr = new Uint8Array(6);
            (typeof crypto !== 'undefined' && crypto.getRandomValues) ? crypto.getRandomValues(_otpArr) : _otpArr.forEach(function(v,i,a){ a[i] = Math.floor(Math.random()*256); });
            for (var oi = 0; oi < 6; oi++) otp += (_otpArr[oi] % 10);
            var otpHash = await sha256hex(otp + ':' + email);
            var expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 นาที
            // เก็บ OTP ใน settings table (key = pw_reset_{email})
            var otpKey = 'pw_reset_' + email;
            var otpVal = JSON.stringify({ code_hash: otpHash, expires_at: expiresAt, attempts: 0 });
            await sbUpsert('settings', { key: otpKey, value: otpVal }, 'key');
            // ส่งอีเมล OTP
            var emailSent = false;
            try {
                var htmlBody = '<div style="font-family:Kanit,sans-serif;max-width:480px;margin:0 auto;padding:2rem;">'
                    + '<h2 style="color:#2563eb;">HOME PPK 2026</h2>'
                    + '<p>สวัสดีคุณ ' + (u.firstname || '') + '</p>'
                    + '<p>คุณได้ร้องขอรีเซ็ตรหัสผ่าน กรุณาใช้รหัส OTP ด้านล่างนี้:</p>'
                    + '<div style="text-align:center;margin:1.5rem 0;">'
                    + '<span style="font-size:2rem;letter-spacing:8px;font-weight:700;color:#2563eb;background:#f0f5ff;padding:0.75rem 1.5rem;border-radius:12px;border:2px dashed #2563eb;">' + otp + '</span>'
                    + '</div>'
                    + '<p style="color:#666;font-size:0.9rem;">รหัสนี้จะหมดอายุภายใน 15 นาที</p>'
                    + '<p style="color:#999;font-size:0.85rem;">หากคุณไม่ได้ร้องขอ กรุณาเพิกเฉยอีเมลนี้</p>'
                    + '<hr style="border:none;border-top:1px solid #e5e7eb;margin:1.5rem 0;">'
                    + '<p style="color:#aaa;font-size:0.8rem;">ระบบบ้านพักครู โรงเรียนพะเยาพิทยาคม</p></div>';
                var emailResult = await _callEdge('send-email', {
                    to: email,
                    subject: '[HOME PPK] รหัส OTP สำหรับรีเซ็ตรหัสผ่าน',
                    html: htmlBody
                });
                emailSent = !!(emailResult && emailResult.success);
            } catch(e) { emailSent = false; }
            if (emailSent) {
                return { success: true, emailSent: true, message: 'ส่งรหัส OTP ไปยังอีเมล ' + email + ' แล้ว กรุณาตรวจสอบกล่องจดหมาย' };
            }
            // Fallback: ถ้าส่งอีเมลไม่ได้
            return { success: true, emailSent: false, message: 'ระบบอีเมลยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบเพื่อรีเซ็ตรหัสผ่าน' };
        }

        case 'verifyResetCode': {
            var email = (data.email || '').trim().toLowerCase();
            var code = (data.code || '').trim();
            var newPassword = data.newPassword || '';
            if (!email || !code) return { success: false, error: 'กรุณากรอกอีเมลและรหัส OTP' };
            if (!newPassword || newPassword.length < 8) return { success: false, error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร' };
            var otpKey = 'pw_reset_' + email;
            var resetRows = await sbGet('settings', { key: 'eq.' + otpKey, limit: '1' });
            if (!resetRows || !resetRows[0]) return { success: false, error: 'ไม่พบคำขอรีเซ็ต กรุณาขอรหัส OTP ใหม่' };
            var rr = {};
            try { rr = JSON.parse(resetRows[0].value); } catch(e) { return { success: false, error: 'ข้อมูล OTP ไม่สมบูรณ์ กรุณาขอใหม่' }; }
            if ((rr.attempts || 0) >= 5) return { success: false, error: 'ป้อนรหัสผิดเกินจำนวนครั้ง กรุณาขอรหัส OTP ใหม่' };
            if (new Date(rr.expires_at) < new Date()) return { success: false, error: 'รหัส OTP หมดอายุแล้ว กรุณาขอรหัสใหม่' };
            var codeHash = await sha256hex(code + ':' + email);
            if (codeHash !== rr.code_hash) {
                rr.attempts = (rr.attempts || 0) + 1;
                await sbUpsert('settings', { key: otpKey, value: JSON.stringify(rr) }, 'key');
                return { success: false, error: 'รหัส OTP ไม่ถูกต้อง (เหลือ ' + (5 - rr.attempts) + ' ครั้ง)' };
            }
            // OTP ถูกต้อง → เปลี่ยนรหัสผ่าน
            var pwHash = await sha256hexSalted(newPassword, email);
            await sbPatch('users', { email: 'eq.' + email }, { password_hash: pwHash, updated_at: new Date().toISOString() });
            // ลบ OTP record
            await sbDelete('settings', { key: 'eq.' + otpKey });
            return { success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ! กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่' };
        }

        case 'findEmail': {
            var phone = (data.phone || '').trim();
            var uRows = await sbGet('users', { phone: 'eq.' + phone, select: 'email,firstname', limit: '1' });
            if (!uRows || uRows.length === 0) return { success: false, error: 'ไม่พบบัญชีผู้ใช้ที่ใช้เบอร์นี้' };
            var em = uRows[0].email || '';
            var at = em.indexOf('@');
            var masked = at > 2
                ? em.substring(0, 2) + '***' + em.substring(at)
                : em.substring(0, 1) + '***' + em.substring(at > 0 ? at : 1);
            return { success: true, email: masked, firstname: uRows[0].firstname || '' };
        }

        /* ── Housing / Residents ──────────────────── */
        case 'getHousingList': {
            var rows = await sbGet('housing', { order: 'house_number.asc' });
            var mapped = (rows || []).map(function(h) {
                var _pfxH = h.type === 'flat' ? 'แฟลต' : 'บ้าน', _rawH = h.house_number || '', _numH = _rawH.startsWith(_pfxH) ? _rawH.substring(_pfxH.length) : _rawH;
                return { id: h.id, display_number: _pfxH + _numH, house_number: h.house_number, type: h.type, status: h.status };
            }).sort(_naturalCmp);
            return { success: true, data: mapped };
        }
        case 'getResidentsList': {
            var rows = await sbGet('residents', { is_active: 'eq.true', order: 'house_number.asc' });
            (rows || []).sort(_naturalCmp);
            return { success: true, data: rows };
        }

        /* ── Profile / Coresident ─────────────────── */
        case 'updateProfile': {
            var sessRows = await sbGet('sessions', { token: 'eq.' + getSessionToken(), select: 'user_id,resident_id' });
            var profileUserId = sessRows && sessRows[0] ? sessRows[0].user_id : null;
            var profileResId = sessRows && sessRows[0] ? sessRows[0].resident_id : null;
            if (!profileUserId) {
                var lsUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
                if (lsUser && lsUser.id) profileUserId = lsUser.id;
            }
            if (!profileUserId) return { success: false, error: 'SESSION_EXPIRED' };
            var _userPatch = {
                prefix: data.prefix || '', firstname: data.firstname || '',
                lastname: data.lastname || '', phone: data.phone || '',
                position: data.position || '', subject_group: data.subject_group || '',
                updated_at: new Date().toISOString()
            };
            if (data.email) _userPatch.email = data.email.trim().toLowerCase();
            await sbPatch('users', { id: 'eq.' + profileUserId }, _userPatch);
            // อัปเดต residents/coresidents ด้วย (ถ้ามี)
            if (!profileResId) {
                var _prUser = await sbGet('users', { id: 'eq.' + profileUserId, select: 'email', limit: '1' });
                var _prEmail = _prUser && _prUser[0] ? _prUser[0].email : null;
                var resFb = await _findResidentForUser(profileUserId, _prEmail);
                if (resFb) profileResId = resFb.id;
            }
            if (profileResId) {
                if (String(profileResId).startsWith('COR')) {
                    // coresident — sync ชื่อ/โทรศัพท์กลับ coresidents table
                    try {
                        await sbPatch('coresidents', { id: 'eq.' + profileResId }, {
                            prefix: data.prefix || '', firstname: data.firstname || '',
                            lastname: data.lastname || '', phone: data.phone || '',
                            ...(data.email ? { email: data.email.trim().toLowerCase() } : {})
                        });
                    } catch(e) {}
                } else {
                    var _resPatch = {
                        prefix: data.prefix || '', firstname: data.firstname || '',
                        lastname: data.lastname || '', phone: data.phone || '',
                        position: data.position || '', subject_group: data.subject_group || '',
                        address_no: data.address_no || '', address_village: data.address_village || '',
                        address_road: data.address_road || '', subdistrict: data.subdistrict || '',
                        district: data.district || '', province: data.province || '',
                        zipcode: data.zipcode || '', profile_photo: data.profilePhoto || data.profile_photo || '',
                        updated_at: new Date().toISOString()
                    };
                    if (data.email) _resPatch.email = data.email.trim().toLowerCase();
                    if (data.move_in_date) _resPatch.move_in_date = data.move_in_date;
                    await sbPatch('residents', { id: 'eq.' + profileResId }, _resPatch);
                }
            }
            return { success: true };
        }
        case 'addCoresident': {
            // ดึง residentId จาก session ถ้าไม่ได้ส่งมา
            var resId = data.residentId || data.resident_id || null;
            var houseId = data.houseId || data.house_id || null;
            if (!resId) {
                var sessRows = await sbGet('sessions', { token: 'eq.' + getSessionToken(), select: 'resident_id' });
                resId = sessRows && sessRows[0] ? sessRows[0].resident_id : null;
            }
            if (!resId) return { success: false, error: 'ไม่พบข้อมูลผู้พัก กรุณาติดต่อ Admin' };
            if (!houseId) {
                var resRows = await sbGet('residents', { id: 'eq.' + resId, select: 'house_id', limit: '1' });
                houseId = resRows && resRows[0] ? resRows[0].house_id : null;
            }
            var row = await sbPost('coresidents', {
                resident_id: resId,
                house_id:    houseId || '',
                prefix:      data.prefix || '',
                firstname:   data.firstname || '',
                lastname:    data.lastname || '',
                relation:    data.relation || data.status || ''
            });
            return { success: true, data: row, id: row ? row.id : null };
        }
        case 'updateCoresident': {
            var row = await sbPatch('coresidents', { id: 'eq.' + data.id }, {
                prefix: data.prefix || '', firstname: data.firstname || '',
                lastname: data.lastname || '', relation: data.relation || data.status || ''
            });
            return { success: true, data: row };
        }
        case 'removeCoresident': {
            await sbDelete('coresidents', { id: 'eq.' + data.id });
            return { success: true };
        }

        /* ── Settings aliases ─────────────────────── */
        case 'updateSettings': {
            var entries = Object.entries(data || {});
            for (var i = 0; i < entries.length; i++) {
                var sk = entries[i][0];
                var sv = String(entries[i][1]);
                // upsert: insert or update on conflict key
                await sbUpsert('settings', { key: sk, value: sv }, 'key');
            }
            return { success: true };
        }
        case 'getDueDate': {
            var rows = await sbGet('settings', { key: 'eq.due_date', select: 'value', limit: '1' });
            var dueDays = parseInt((rows && rows[0]) ? rows[0].value : '15') || 15;
            // คำนวณวันกำหนดชำระจริง (วันทำการ dueDays วัน นับจากวันนี้)
            var d2 = new Date();
            var count2 = 0;
            while (count2 < dueDays) {
                d2.setDate(d2.getDate() + 1);
                var day2 = d2.getDay();
                if (day2 !== 0 && day2 !== 6) count2++;
            }
            var thMonths2 = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
            var dueDateStr = d2.getDate() + ' ' + thMonths2[d2.getMonth()] + ' ' + (d2.getFullYear() + 543);
            return { success: true, dueDate: dueDateStr, data: { due_date: String(dueDays), computed: dueDateStr } };
        }

        /* ── Bill summaries ───────────────────────── */
        case 'getBillSummaryAll': {
            var period = data.period || '';
            // ดึงข้อมูลจาก water_bills, electric_bills, residents, settings, notifications, exemptions, housing, proxies
            var [wRows, eRows, resRows, settRows, notifRows, exemptRows, housingRows, proxyRows, inactiveResRows] = await Promise.all([
                sbGet('water_bills',    { period: 'eq.' + period, order: 'house_number.asc' }).catch(function() { return []; }),
                sbGet('electric_bills', { period: 'eq.' + period, order: 'house_number.asc' }).catch(function() { return []; }),
                sbGet('residents',      { is_active: 'eq.true', select: 'house_number,prefix,firstname,lastname,email,resident_type,user_id,start_date,move_in_date' }).catch(function() { return []; }),
                sbGet('settings',       { select: 'key,value' }).catch(function() { return []; }),
                sbGet('notifications',  { period: 'eq.' + period, select: 'house_number,common_fee,due_date,sent_at', limit: '200' }).catch(function() { return []; }),
                sbGet('exemptions',     { type: 'eq.common_fee', select: 'house_number,house_id' }).catch(function() { return []; }),
                sbGet('housing',        { select: 'id,house_number,type' }).catch(function() { return []; }),
                sbGet('payment_proxies', { is_active: 'eq.true', select: 'house_number,proxy_user_id' }).catch(function() { return []; }),
                sbGet('residents',      { is_active: 'eq.false', select: 'house_number,prefix,firstname,lastname,end_date', order: 'end_date.desc' }).catch(function() { return []; })
            ]);
            // แปลง period (พ.ศ.) → ปี-เดือน ค.ศ. สำหรับเปรียบเทียบ start_date
            var _pParts = period.split('-');
            var _pAdYear = parseInt(_pParts[0]) || 2026;
            if (_pAdYear > 2500) _pAdYear -= 543;
            var _pMonth = parseInt(_pParts[1]) || 1;
            var _periodYM = _pAdYear + '-' + String(_pMonth).padStart(2, '0');
            // สร้าง map ของ start_date ผู้พักปัจจุบัน (สำหรับตรวจว่าอยู่ในช่วงบิลหรือยัง)
            var resStartMap = {};
            (resRows || []).forEach(function(r) {
                if (r.house_number) resStartMap[r.house_number] = r.start_date || r.move_in_date || '';
            });
            // สร้าง map ผู้พักเก่า (inactive) — เก็บคนที่ end_date ล่าสุดต่อบ้าน
            var oldResMap = {};
            (inactiveResRows || []).forEach(function(r) {
                if (!r.house_number) return;
                var oName = ((r.prefix || '') + (r.firstname || '') + ' ' + (r.lastname || '')).trim();
                if (!oldResMap[r.house_number] || (r.end_date && (!oldResMap[r.house_number].end_date || r.end_date > oldResMap[r.house_number].end_date))) {
                    oldResMap[r.house_number] = { name: oName, end_date: r.end_date || '' };
                }
            });
            // ดึงค่าส่วนกลางจาก settings — แยกบ้าน/แฟลต
            var settMap = {};
            (settRows || []).forEach(function(s) { settMap[s.key] = s.value; });
            var commonFeeHouse = parseFloat(settMap['common_fee_house']) || 0;
            var commonFeeFlat  = parseFloat(settMap['common_fee_flat'])  || 0;
            if (!commonFeeHouse && settMap['commonFee']) commonFeeHouse = parseFloat(settMap['commonFee']) || 0;
            if (!commonFeeFlat  && settMap['commonFee']) commonFeeFlat  = parseFloat(settMap['commonFee']) || 0;

            function isFlat(hn) { var n = (hn || '').toLowerCase(); return n.indexOf('แฟลต') >= 0 || n.indexOf('flat') >= 0; }
            function getCommonFee(hn) { return isFlat(hn) ? commonFeeFlat : commonFeeHouse; }

            // สร้าง set ของบ้านที่ถูกยกเว้นค่าส่วนกลาง (จาก admin-settings)
            // validate ด้วย housing table: ป้องกัน orphaned records ที่ house_id ไม่ตรงกับ housing จริง
            var validHousingIds = {};
            (housingRows || []).forEach(function(h) { if (h.id) validHousingIds[String(h.id)] = true; });
            var exemptSet = {};
            var _orphanExemptions = [];
            (exemptRows || []).forEach(function(ex) {
                if (!ex.house_number) return;
                // ตรวจว่า record นี้มี house_id ที่ตรงกับ housing จริง
                if (ex.house_id && validHousingIds[String(ex.house_id)]) {
                    exemptSet[ex.house_number] = true;
                } else {
                    _orphanExemptions.push(ex);
                }
            });
            // ลบ orphaned exemptions เงียบๆ (house_id ไม่ตรง housing จริง)
            if (_orphanExemptions.length > 0) {
                console.warn('[getBillSummaryAll] พบ orphaned exemptions:', _orphanExemptions.length, '→ auto-delete');
                _orphanExemptions.forEach(function(o) {
                    sbDelete('exemptions', { house_number: 'eq.' + o.house_number, type: 'eq.common_fee' }).catch(function() {});
                });
            }

            // สร้าง map ของบ้านที่มี notification (= admin กดแจ้งยอดแล้ว)
            var notifMap = {};
            var notifDueDateMap = {};
            var notifSentAtMap = {};
            (notifRows || []).forEach(function(n) {
                if (n.house_number) {
                    notifMap[n.house_number] = parseFloat(n.common_fee) || 0;
                    if (n.due_date) notifDueDateMap[n.house_number] = n.due_date;
                    if (n.sent_at) notifSentAtMap[n.house_number] = n.sent_at;
                }
            });
            var hasNotifications = Object.keys(notifMap).length > 0;

            var resMap = {};
            var resEmailMap = {};
            (resRows || []).forEach(function(r) {
                if (r.house_number) {
                    var name = ((r.prefix || '') + (r.firstname || '') + ' ' + (r.lastname || '')).trim();
                    if (resMap[r.house_number]) {
                        resMap[r.house_number] += '\n' + name;
                    } else {
                        resMap[r.house_number] = name;
                    }
                    // เก็บ email ของผู้พักหลัก (ไม่ใช่ cohabitant)
                    if (!resEmailMap[r.house_number] && r.email && r.resident_type !== 'cohabitant') {
                        resEmailMap[r.house_number] = r.email;
                    }
                }
            });
            // สร้าง map อีเมลผู้ชำระแทน (proxy)
            var proxyEmailMap = {};
            var resUserEmailMap = {};
            (resRows || []).forEach(function(r) {
                if (r.user_id && r.email) resUserEmailMap[r.user_id] = r.email;
            });
            // ดึง email จาก users table (ครบทุกคน) สำหรับ proxy ที่ residents อาจไม่มี email
            var proxyUserIds = (proxyRows || []).map(function(p) { return p.proxy_user_id; }).filter(Boolean);
            if (proxyUserIds.length > 0) {
                var usersForProxy = await sbGet('users', { id: 'in.(' + proxyUserIds.join(',') + ')', select: 'id,email' }).catch(function() { return []; });
                (usersForProxy || []).forEach(function(u) {
                    if (u.id && u.email && !resUserEmailMap[u.id]) resUserEmailMap[u.id] = u.email;
                });
            }
            (proxyRows || []).forEach(function(p) {
                if (p.house_number && p.proxy_user_id && resUserEmailMap[p.proxy_user_id]) {
                    proxyEmailMap[p.house_number] = resUserEmailMap[p.proxy_user_id];
                }
            });
            // Override resEmailMap ด้วย users.email (กรณีแก้ email ผ่าน admin-settings → users.email เปลี่ยนแต่ residents.email ยังเก่า)
            var _resLinkedUserIds = (resRows || []).filter(function(r) { return r.user_id && r.resident_type !== 'cohabitant'; }).map(function(r) { return r.user_id; });
            if (_resLinkedUserIds.length > 0) {
                var _usersEmailRows = await sbGet('users', { id: 'in.(' + _resLinkedUserIds.join(',') + ')', select: 'id,email' }).catch(function() { return []; });
                var _userEmailById = {};
                (_usersEmailRows || []).forEach(function(u) { if (u.id && u.email) _userEmailById[u.id] = u.email; });
                (resRows || []).forEach(function(r) {
                    if (r.house_number && r.user_id && r.resident_type !== 'cohabitant' && _userEmailById[r.user_id]) {
                        resEmailMap[r.house_number] = _userEmailById[r.user_id];
                    }
                });
            }
            // รวมข้อมูลตาม house_number
            var summaryMap = {};
            // ค่าส่วนกลาง: ใช้ค่าจาก settings เป็น default, ยกเว้นตาม exemptions table
            // ถ้ามี notification อยู่แล้ว → ใช้ค่าจาก notification (admin แก้มือไว้แล้ว)
            function getCommonForHouse(hn) {
                // ตรวจยกเว้นก่อนเสมอ — exempt → 0 (override notification เก่าที่ค้างไว้)
                if (exemptSet[hn]) return 0;
                // notification มีค่า > 0 = admin เคยแจ้งยอดด้วยค่านั้นแล้ว → ใช้ค่านั้น
                if (notifMap.hasOwnProperty(hn) && notifMap[hn] > 0) return notifMap[hn];
                // notification เป็น 0 (stale จากตอนที่บ้านเคยถูก exempt) หรือไม่มี notification → ใช้ settings
                return getCommonFee(hn);
            }
            (wRows || []).forEach(function(w) {
                var hn = w.house_number || '';
                if (!summaryMap[hn]) summaryMap[hn] = { house_number: hn, water_amount: 0, electric_amount: 0, common_fee: getCommonForHouse(hn), prev_meter: null, curr_meter: null };
                summaryMap[hn].water_amount += parseFloat(w.amount) || 0;
                summaryMap[hn].prev_meter = w.prev_meter;
                summaryMap[hn].curr_meter = w.curr_meter;
            });
            (eRows || []).forEach(function(e) {
                var hn = e.house_number || '';
                if (!summaryMap[hn]) summaryMap[hn] = { house_number: hn, water_amount: 0, electric_amount: 0, common_fee: getCommonForHouse(hn), prev_meter: null, curr_meter: null };
                summaryMap[hn].electric_amount += parseFloat(e.bill_amount) || parseFloat(e.amount) || 0;
            });
            // เพิ่มบ้านที่มี notification แต่ยังไม่มีบิลน้ำ/ไฟ
            Object.keys(notifMap).forEach(function(hn) {
                if (!summaryMap[hn]) summaryMap[hn] = { house_number: hn, water_amount: 0, electric_amount: 0, common_fee: getCommonForHouse(hn), prev_meter: null, curr_meter: null };
            });
            // เพิ่มบ้านที่มี resident (สำหรับหน้าแจ้งยอดให้ admin เห็นรายชื่อ)
            if (data.includeAllResidents) {
                Object.keys(resMap).forEach(function(hn) {
                    if (!summaryMap[hn]) summaryMap[hn] = { house_number: hn, water_amount: 0, electric_amount: 0, common_fee: getCommonForHouse(hn), prev_meter: null, curr_meter: null };
                });
            }
            var result = Object.values(summaryMap).map(function(s) {
                var hn = s.house_number;
                var currentName = resMap[hn] || '';
                var startDate = resStartMap[hn] || '';
                // ถ้าผู้พักปัจจุบันเข้ามาหลังช่วงบิลนี้ → ใช้ชื่อผู้พักเก่า
                if (currentName && startDate) {
                    var _startYM = startDate.substring(0, 7); // "2026-04"
                    if (_startYM > _periodYM && oldResMap[hn]) {
                        currentName = oldResMap[hn].name;
                    }
                }
                // ถ้าไม่มีคนปัจจุบัน → ลองใช้ผู้พักเก่า
                if (!currentName && oldResMap[hn]) currentName = oldResMap[hn].name;
                s.resident_name = currentName;
                s.email         = resEmailMap[s.house_number] || '';
                s.proxy_email   = proxyEmailMap[s.house_number] || '';
                s.exempt_common = exemptSet[s.house_number] ? true : false;
                s.total_amount  = (s.water_amount || 0) + (s.electric_amount || 0) + (s.common_fee || 0);
                s.due_date      = notifDueDateMap[s.house_number] || null;
                s.notified_at   = notifSentAtMap[s.house_number] || null;
                return s;
            }).sort(_naturalCmp);
            return { success: true, data: result };
        }

        case 'getWaterBillTotal': {
            var rows = await sbGet('water_bills', { period: 'eq.' + (data.period || '') });
            var total = (rows || []).reduce(function(s, r) { return s + (parseFloat(r.amount) || 0); }, 0);
            return { success: true, data: { total: total, rows: rows } };
        }
        case 'getElectricBillPEA': {
            var rows = await sbGet('electric_bills', { period: 'eq.' + (data.period || '') });
            var total = (rows || []).reduce(function(s, r) { return s + (parseFloat(r.bill_amount) || parseFloat(r.amount) || 0); }, 0);
            // ดึง pea_total จริงจาก settings (บันทึกตอน submitElectricBill) — ถ้ามีให้ใช้แทน
            try {
                var _peaRows = await sbGet('settings', { key: 'eq.electric_lost_' + (data.period || '') });
                if (_peaRows && _peaRows[0] && _peaRows[0].value) {
                    var _peaData = JSON.parse(_peaRows[0].value);
                    if (_peaData && parseFloat(_peaData.pea_total) > 0) total = parseFloat(_peaData.pea_total);
                }
            } catch(e) {}
            return { success: true, data: { total: total, rows: rows } };
        }

        /* ── Dashboard ────────────────────────────── */
        case 'getDashboardData': {
            var token = getSessionToken();
            var sessRole = 'admin';
            var sessHouseNumber = '';
            var sessUserId = '';

            // ① ลองดึงจาก sessions table (สำหรับ user ที่ login จริง)
            try {
                var sessions = await sbGet('sessions', { token: 'eq.' + token, select: 'user_id,role,resident_id,house_number,expires_at' });
                var sess = sessions && sessions[0];
                if (sess) {
                    sessRole = sess.role || 'admin';
                    sessHouseNumber = sess.house_number || '';
                    sessUserId = sess.user_id || '';
                } else {
                    throw new Error('no-session'); // fallback ไป localStorage
                }
            } catch(e) {
                // ② no-auth mode — ดึงจาก localStorage currentUser
                try {
                    var stored = JSON.parse(localStorage.getItem('currentUser') || 'null');
                    if (stored && stored.id) {
                        sessRole = stored.role || 'admin';
                        sessHouseNumber = stored.houseNumber || stored.house_number || '';
                        sessUserId = stored.id || '';
                    }
                } catch(e2) {}
            }

            // ดึง announcements
            var annRows = await sbGet('announcements', {
                is_active: 'eq.true', order: 'created_at.desc', limit: '10'
            });
            var now2 = new Date();
            var announcements = (annRows || []).filter(function(a) {
                return !a.expires_at || new Date(a.expires_at) > now2;
            });

            // งวดก่อน 2569-03 = ข้อมูลเก่าที่ชำระนอกระบบแล้ว → auto-mark paid ทันที
            var _SYSTEM_LIVE_PERIOD = '2569-03';

            if (sessRole === 'admin' || sessRole === 'head') {
                var adminPeriod = (now2.getFullYear() + 543) + '-' + String(now2.getMonth() + 1).padStart(2, '0');
                // ── Global self-healing: แก้ outstanding ที่ค้างทั้งระบบ ──
                try {
                    var _ghUnpaid = await sbGet('outstanding', { status: 'neq.paid', moved_out_at: 'is.null', select: 'id,house_number,period', limit: '500' }).catch(function() { return []; });
                    if (_ghUnpaid && _ghUnpaid.length > 0) {
                        var _ghResults = await Promise.all([
                            sbGet('slip_submissions', { status: 'eq.approved', select: 'house_number,period', limit: '1000' }).catch(function() { return []; }),
                            sbGet('payment_history', { select: 'house_number,period', limit: '1000' }).catch(function() { return []; })
                        ]);
                        var _ghPaidMap = {};
                        (_ghResults[0] || []).forEach(function(s) { if (s.house_number && s.period) _ghPaidMap[s.house_number + '_' + s.period] = true; });
                        (_ghResults[1] || []).forEach(function(ph) { if (ph.house_number && ph.period) _ghPaidMap[ph.house_number + '_' + ph.period] = true; });
                        var _ghNow = new Date().toISOString();
                        for (var _ghi = 0; _ghi < _ghUnpaid.length; _ghi++) {
                            var _ghItem = _ghUnpaid[_ghi];
                            var _ghKey = _ghItem.house_number + '_' + _ghItem.period;
                            // mark paid ถ้า: (1) มีหลักฐาน slip/payment_history หรือ (2) เป็นงวดก่อนระบบ live
                            if (_ghPaidMap[_ghKey] || (_ghItem.period && _ghItem.period < _SYSTEM_LIVE_PERIOD)) {
                                sbPatch('outstanding', { id: 'eq.' + _ghItem.id }, { status: 'paid', updated_at: _ghNow }).catch(function() {});
                            }
                        }
                    }
                } catch(e) { console.warn('[getDashboardData] global heal error:', e); }

                var adminQueries = [
                    sbGet('pending_registrations', { status: 'eq.pending', select: 'id', limit: '100' }).catch(function() { return []; }),
                    sbGet('slip_submissions', { status: 'eq.pending', select: 'id', limit: '100' }).catch(function() { return []; }),
                    sbGet('requests', { status: 'in.(pending,reviewing,waiting)', select: 'id', limit: '100' }).catch(function() { return []; }),
                    sbGet('outstanding', { period: 'eq.' + adminPeriod, select: 'status', limit: '1000' }).catch(function() { return []; })
                ];
                if (sessHouseNumber) {
                    adminQueries.push(
                        sbGet('outstanding', { house_number: 'eq.' + sessHouseNumber, status: 'neq.paid', moved_out_at: 'is.null', order: 'period.desc', limit: '12' }).catch(function() { return []; }),
                        sbGet('slip_submissions', { house_number: 'eq.' + sessHouseNumber, period: 'eq.' + adminPeriod, order: 'submitted_at.desc', limit: '1' }).catch(function() { return []; })
                    );
                }
                var adminResults = await Promise.all(adminQueries);
                var pendingReg = adminResults[0], pendingSlips = adminResults[1], pendingReqs = adminResults[2];
                var periodStats = adminResults[3] || [];
                var totalRooms = periodStats.length;
                var paidRooms = periodStats.filter(function(r) { return r.status === 'paid'; }).length;
                var collectionRate = totalRooms > 0 ? Math.round(paidRooms / totalRooms * 100) : null;
                var outstandingRooms = totalRooms > 0 ? (totalRooms - paidRooms) : null;
                var residentData = null;
                if (sessHouseNumber) {
                    var adminOutRows = adminResults[4] || [];
                    var adminSlipRows = adminResults[5] || [];
                    var adminCurrentOut = adminOutRows.find(function(o) { return o.period === adminPeriod; });
                    // ดึง sent_at หรือ created_at จาก notifications มาใช้คำนวณ 10 วันนับจากวันแจ้ง
                    if (adminOutRows.length > 0) {
                        try {
                            var _aNotifs = await sbGet('notifications', { house_number: 'eq.' + sessHouseNumber, select: 'period,sent_at,created_at', limit: '100' }).catch(function() { return []; });
                            var _aNotifMap = {};
                            (_aNotifs || []).forEach(function(n) { if (n.period) _aNotifMap[n.period] = n.sent_at || n.created_at; });
                            adminOutRows.forEach(function(o) { o._sent_at = _aNotifMap[o.period]; });
                        } catch(e) {}
                    }
                    // Fix: คงยอดแจ้งไว้จนกว่าจะครบ 10 วันนับจากวันแจ้ง (sent_at)
                    if (adminCurrentOut) {
                        if (adminCurrentOut._sent_at) {
                            var _cDate = new Date(adminCurrentOut._sent_at);
                            if (!isNaN(_cDate.getTime()) && ((now2.getTime() - _cDate.getTime()) / (1000 * 60 * 60 * 24) > 10)) {
                                adminCurrentOut = null;
                            }
                        }
                    }
                    var _adminDisplayPeriod = adminPeriod;
                    if (!adminCurrentOut && adminOutRows.length > 0) {
                        for (var _ai = 0; _ai < adminOutRows.length; _ai++) {
                            var _aLast = adminOutRows[_ai];
                            if (_aLast && _aLast.period) {
                                var _isExpired = false;
                                if (_aLast._sent_at) {
                                    var _aDate = new Date(_aLast._sent_at);
                                    if (!isNaN(_aDate.getTime()) && ((now2.getTime() - _aDate.getTime()) / (1000 * 60 * 60 * 24) > 10)) {
                                        _isExpired = true;
                                    }
                                }
                                if (!_isExpired) {
                                    adminCurrentOut = _aLast; 
                                    _adminDisplayPeriod = _aLast.period;
                                    break;
                                }
                            }
                        }
                    }
                    var adminLatestSlip = adminSlipRows[0];
                    // Re-fetch slips ถ้า period เปลี่ยนไปจาก adminPeriod
                    if (_adminDisplayPeriod !== adminPeriod) {
                        try {
                            var _aNewSlips = await sbGet('slip_submissions', { house_number: 'eq.' + sessHouseNumber, period: 'eq.' + _adminDisplayPeriod, order: 'submitted_at.desc', limit: '1' }).catch(function() { return []; });
                            adminLatestSlip = _aNewSlips && _aNewSlips[0];
                        } catch(e) {}
                    }
                    var adminSlipStatus = 'none';
                    var adminReviewNote = '';
                    if (adminLatestSlip) {
                        if (adminLatestSlip.status === 'approved') adminSlipStatus = 'success';
                        else if (adminLatestSlip.status === 'rejected') { adminSlipStatus = 'rejected'; adminReviewNote = adminLatestSlip.review_note || ''; }
                        else adminSlipStatus = 'reviewing';
                    }
                    // ดึงวันที่จดมิเตอร์สำหรับ admin ที่มีบ้านพัก
                    var _awReadDate = null, _aeReadDate = null;
                    try {
                        var _aMeterRes = await Promise.all([
                            sbGet('water_bills', { house_number: 'eq.' + sessHouseNumber, period: 'eq.' + _adminDisplayPeriod, select: 'reading_date,recorded_at', order: 'recorded_at.desc', limit: '1' }).catch(function() { return []; }),
                            sbGet('electric_bills', { house_number: 'eq.' + sessHouseNumber, period: 'eq.' + _adminDisplayPeriod, select: 'reading_date,recorded_at', order: 'recorded_at.desc', limit: '1' }).catch(function() { return []; })
                        ]);
                        var _awRow = _aMeterRes[0] && _aMeterRes[0][0];
                        var _aeRow = _aMeterRes[1] && _aMeterRes[1][0];
                        _awReadDate = _awRow ? (_awRow.reading_date || (_awRow.recorded_at ? _awRow.recorded_at.slice(0, 10) : null)) : null;
                        _aeReadDate = _aeRow ? (_aeRow.reading_date || (_aeRow.recorded_at ? _aeRow.recorded_at.slice(0, 10) : null)) : null;
                    } catch(e) {}
                    residentData = {
                        houseNumber: sessHouseNumber,
                        period: _adminDisplayPeriod,
                        currentAmount: adminCurrentOut ? parseFloat(adminCurrentOut.total_amount) || 0 : 0,
                        waterAmount: adminCurrentOut ? parseFloat(adminCurrentOut.water_amount) || 0 : 0,
                        electricAmount: adminCurrentOut ? parseFloat(adminCurrentOut.electric_amount) || 0 : 0,
                        commonFee: adminCurrentOut ? parseFloat(adminCurrentOut.common_fee) || 0 : 0,
                        totalOutstanding: adminOutRows.reduce(function(s, r) { return s + (r.period !== _adminDisplayPeriod ? (parseFloat(r.total_amount) || 0) : 0); }, 0),
                        slipStatus: adminSlipStatus,
                        reviewNote: adminReviewNote,
                        slipId: adminLatestSlip ? adminLatestSlip.id : null,
                        dueDate: adminCurrentOut ? adminCurrentOut.due_date : null,
                        waterReadDate: _awReadDate,
                        electricReadDate: _aeReadDate
                    };
                }
                return { success: true, role: 'admin', announcements: announcements, data: {
                    pendingRegistrations: (pendingReg || []).length,
                    pendingSlips: (pendingSlips || []).length,
                    pendingRequests: (pendingReqs || []).length,
                    collectionRate: collectionRate,
                    outstandingRooms: outstandingRooms
                }, residentData: residentData };
            } else {
                var houseNumber = sessHouseNumber;
                var period = (now2.getFullYear() + 543) + '-' + String(now2.getMonth() + 1).padStart(2, '0');

                // Phase E: ตรวจสอบว่าผู้ใช้ย้ายออกแล้ว (ไม่มี houseNumber แต่มี inactive resident)
                if (!houseNumber && sessUserId) {
                    try {
                        var _moResRows = await sbGet('residents', { user_id: 'eq.' + sessUserId, is_active: 'eq.false', order: 'end_date.desc', limit: '1', select: 'id,prefix,firstname,lastname,house_number,end_date' }).catch(function() { return []; });
                        if (_moResRows && _moResRows[0] && _moResRows[0].house_number) {
                            var _moHouseNum = _moResRows[0].house_number;
                            var _moEndDate = _moResRows[0].end_date;
                            var _moName = ((_moResRows[0].prefix||'') + (_moResRows[0].firstname||'') + ' ' + (_moResRows[0].lastname||'')).trim();
                            var _moOutRows = await sbGet('outstanding', { house_number: 'eq.' + _moHouseNum, moved_out_at: 'not.is.null', status: 'neq.paid' }).catch(function() { return []; });
                            var _moTotal = (_moOutRows || []).reduce(function(s, r) { return s + (parseFloat(r.total_amount) || 0); }, 0);
                            return { success: true, role: 'moved_out', announcements: announcements, data: {
                                houseNumber: _moHouseNum,
                                endDate: _moEndDate,
                                fullName: _moName,
                                totalOutstanding: _moTotal,
                                outstandingRows: (_moOutRows || []).map(function(r) {
                                    return { id: r.id, period: r.period, amount: parseFloat(r.total_amount) || 0 };
                                })
                            }};
                        }
                    } catch(e) {}
                }

                var outRows = [], slipRows = [];
                if (houseNumber) {
                    [outRows, slipRows] = await Promise.all([
                        sbGet('outstanding', { house_number: 'eq.' + houseNumber, status: 'neq.paid', moved_out_at: 'is.null', order: 'period.desc', limit: '12' }).catch(function() { return []; }),
                        sbGet('slip_submissions', { house_number: 'eq.' + houseNumber, period: 'eq.' + period, order: 'submitted_at.desc', limit: '1' }).catch(function() { return []; })
                    ]);
                }
                // Self-healing: ตรวจ outstanding ที่ค้างอยู่ว่ามี payment_history หรือ slip approved แล้วหรือยัง → auto-mark paid
                if (outRows && outRows.length > 0 && houseNumber) {
                    try {
                        var shResults = await Promise.all([
                            sbGet('payment_history', { house_number: 'eq.' + houseNumber, order: 'period.desc', limit: '50' }).catch(function() { return []; }),
                            sbGet('slip_submissions', { house_number: 'eq.' + houseNumber, status: 'eq.approved', order: 'submitted_at.desc', limit: '50' }).catch(function() { return []; })
                        ]);
                        var phRows = shResults[0] || [];
                        var approvedSlips = shResults[1] || [];
                        var paidPeriods = {};
                        phRows.forEach(function(ph) { if (ph.period) paidPeriods[ph.period] = true; });
                        approvedSlips.forEach(function(sl) { if (sl.period) paidPeriods[sl.period] = true; });
                        var healedOutRows = [];
                        for (var hi = 0; hi < outRows.length; hi++) {
                            if (paidPeriods[outRows[hi].period] || (outRows[hi].period && outRows[hi].period < _SYSTEM_LIVE_PERIOD)) {
                                // ชำระแล้วหรืองวดก่อนระบบ live → แก้ไขเงียบๆ
                                sbPatch('outstanding', { id: 'eq.' + outRows[hi].id }, { status: 'paid', updated_at: new Date().toISOString() }).catch(function() {});
                            } else {
                                healedOutRows.push(outRows[hi]);
                            }
                        }
                        outRows = healedOutRows;
                    } catch(e) {}
                }
                // ── กรองเฉพาะ outstanding ที่แอดมินแจ้งยอดแล้ว (มี notifications ตรงกัน) ──
                // ป้องกันแสดงยอดแก่ผู้พักอาศัยก่อนที่แอดมินจะกด "บันทึกข้อมูลแจ้งยอดลงระบบ"
                if (outRows && outRows.length > 0 && houseNumber) {
                    try {
                        var _gddNotifs = await sbGet('notifications', { house_number: 'eq.' + houseNumber, select: 'period,sent_at,created_at', limit: '100' }).catch(function() { return []; });
                        var _gddPublished = {};
                        (_gddNotifs || []).forEach(function(n) { 
                            if (n.period) {
                                var _nDate = n.sent_at || n.created_at;
                                if (!_gddPublished[n.period] || (_nDate && new Date(_nDate) > new Date(_gddPublished[n.period]))) {
                                    _gddPublished[n.period] = _nDate || true;
                                }
                            } 
                        });
                        outRows = outRows.filter(function(o) { 
                            if (_gddPublished[o.period]) {
                                o._sent_at = _gddPublished[o.period] === true ? null : _gddPublished[o.period];
                                return true;
                            }
                            return false;
                        });
                    } catch(e) {}
                }
                var currentOut = (outRows || []).find(function(o) { return o.period === period; });
                // Fix: คงยอดแจ้งไว้ใน "ยอดชำระประจำเดือน" จนกว่าจะครบ 10 วันนับจากวันแจ้ง
                if (currentOut) {
                    if (currentOut._sent_at) {
                        var _cDate = new Date(currentOut._sent_at);
                        if (!isNaN(_cDate.getTime()) && ((now2.getTime() - _cDate.getTime()) / (1000 * 60 * 60 * 24) > 10)) {
                            currentOut = null;
                        }
                    }
                }
                
                if (!currentOut && outRows && outRows.length > 0) {
                    for (var _oi = 0; _oi < outRows.length; _oi++) {
                        var _latestOut = outRows[_oi];
                        if (_latestOut && _latestOut.period) {
                            var _isExpired = false;
                            if (_latestOut._sent_at) {
                                var _lDate = new Date(_latestOut._sent_at);
                                if (!isNaN(_lDate.getTime()) && ((now2.getTime() - _lDate.getTime()) / (1000 * 60 * 60 * 24) > 10)) {
                                    _isExpired = true;
                                }
                            }
                            if (!_isExpired) {
                                currentOut = _latestOut;
                                period = _latestOut.period;
                                // ดึง slips ใหม่สำหรับ period จริง (ไม่ใช่เดือนปัจจุบัน)
                                try {
                                    slipRows = await sbGet('slip_submissions', { house_number: 'eq.' + houseNumber, period: 'eq.' + period, order: 'submitted_at.desc', limit: '1' }).catch(function() { return []; });
                                } catch(e) { slipRows = []; }
                                break;
                            }
                        }
                    }
                }
                // Fallback: ถ้าไม่เจอใน outstanding ให้ดึงจาก notifications
                var notifRow = null;
                if (!currentOut && houseNumber) {
                    try {
                        var notifRows = await sbGet('notifications', { house_number: 'eq.' + houseNumber, period: 'eq.' + period, order: 'sent_at.desc', limit: '1' });
                        notifRow = notifRows && notifRows[0];
                    } catch(e) {}
                }
                var currentAmount = currentOut ? parseFloat(currentOut.total_amount) || 0 : (notifRow ? parseFloat(notifRow.total_amount) || 0 : 0);
                var dueDate = currentOut ? currentOut.due_date : (notifRow ? notifRow.due_date : null);
                var latestSlip = slipRows && slipRows[0];
                var slipStatus = 'none';
                var reviewNote = '';
                if (latestSlip) {
                    if (latestSlip.status === 'approved') slipStatus = 'success';
                    else if (latestSlip.status === 'rejected') { slipStatus = 'rejected'; reviewNote = latestSlip.review_note || ''; }
                    else slipStatus = 'reviewing';
                }
                // ยอดค้างสะสม = ยอดค้างทั้งหมด ยกเว้นงวดที่แสดงเป็น currentAmount แล้ว
                // (เพื่อป้องกันยอดเดียวขึ้นซ้ำทั้ง hero card และแบนเนอร์ค้างสะสม)
                var totalOutstanding = (outRows || []).reduce(function(s, r) {
                    return s + (r.period !== period ? (parseFloat(r.total_amount) || 0) : 0);
                }, 0);
                // ดึง proxy assignments ของ user นี้
                var userProxyAssignments = [];
                try {
                    var upaToken = getSessionToken();
                    var upaSessRows = await sbGet('sessions', { token: 'eq.' + upaToken, select: 'user_id', limit: '1' }).catch(function() { return []; });
                    var upaUserId = upaSessRows && upaSessRows[0] ? upaSessRows[0].user_id : null;
                    if (!upaUserId) {
                        try { var upaStored = JSON.parse(localStorage.getItem('currentUser') || 'null'); if (upaStored) upaUserId = upaStored.id; } catch(e) {}
                    }
                    if (upaUserId) {
                        upaRows = await sbGet('payment_proxies', { proxy_user_id: 'eq.' + upaUserId, is_active: 'eq.true', order: 'assigned_at.desc' }).catch(function() { return []; });
                        for (var upai = 0; upai < (upaRows || []).length; upai++) {
                            var upaP = upaRows[upai];
                            var upaResName = '';
                            try {
                                var upaRR = await sbGet('residents', { house_number: 'eq.' + upaP.house_number, is_active: 'eq.true', resident_type: 'neq.cohabitant', limit: '1', select: 'prefix,firstname,lastname' });
                                if (upaRR && upaRR[0]) { var ur = upaRR[0]; upaResName = ((ur.prefix||'') + (ur.firstname||'') + ' ' + (ur.lastname||'')).trim(); }
                            } catch(e) {}
                            var upaOut = null;
                            try { var upaOutR = await sbGet('outstanding', { house_number: 'eq.' + upaP.house_number, period: 'eq.' + period, moved_out_at: 'is.null', limit: '1' }); upaOut = upaOutR && upaOutR[0]; } catch(e) {}
                            // fallback: ถ้าไม่มี outstanding ให้ดึงจาก notifications (แหล่งจริงที่ admin แจ้งยอด)
                            var upaNotif = null;
                            if (!upaOut) {
                                try { var upaNotifR = await sbGet('notifications', { house_number: 'eq.' + upaP.house_number, period: 'eq.' + period, order: 'sent_at.desc', limit: '1' }); upaNotif = upaNotifR && upaNotifR[0]; } catch(e) {}
                            }
                            var upaSrc = upaOut || upaNotif;
                            var upaSlip = null;
                            try { var upaSlipR = await sbGet('slip_submissions', { house_number: 'eq.' + upaP.house_number, period: 'eq.' + period, order: 'submitted_at.desc', limit: '1' }); upaSlip = upaSlipR && upaSlipR[0]; } catch(e) {}
                            var upaSlipStatus = 'none', upaReviewNote = '', upaSlipId = null;
                            if (upaSlip) {
                                upaSlipId = upaSlip.id;
                                if (upaSlip.status === 'approved') upaSlipStatus = 'success';
                                else if (upaSlip.status === 'rejected') { upaSlipStatus = 'rejected'; upaReviewNote = upaSlip.review_note || ''; }
                                else upaSlipStatus = 'reviewing';
                            }
                            userProxyAssignments.push({
                                house_number: upaP.house_number, resident_name: upaResName, period: period,
                                amount: upaSrc ? parseFloat(upaSrc.total_amount) || 0 : 0,
                                water_amount: upaSrc ? parseFloat(upaSrc.water_amount) || 0 : 0,
                                electric_amount: upaSrc ? parseFloat(upaSrc.electric_amount) || 0 : 0,
                                common_fee: upaSrc ? parseFloat(upaSrc.common_fee) || 0 : 0,
                                due_date: upaSrc ? (upaSrc.due_date || null) : null,
                                slip_status: upaSlipStatus, review_note: upaReviewNote, slip_id: upaSlipId, notes: upaP.notes || ''
                            });
                        }
                    }
                } catch(e) { /* proxy assignments non-critical */ }
                // ดึงวันที่จดมิเตอร์ (non-critical)
                var _wReadDate = null, _eReadDate = null;
                if (houseNumber) {
                    try {
                        var _meterRes = await Promise.all([
                            sbGet('water_bills', { house_number: 'eq.' + houseNumber, period: 'eq.' + period, select: 'reading_date,recorded_at', order: 'recorded_at.desc', limit: '1' }).catch(function() { return []; }),
                            sbGet('electric_bills', { house_number: 'eq.' + houseNumber, period: 'eq.' + period, select: 'reading_date,recorded_at', order: 'recorded_at.desc', limit: '1' }).catch(function() { return []; })
                        ]);
                        var _wRow = _meterRes[0] && _meterRes[0][0];
                        var _eRow = _meterRes[1] && _meterRes[1][0];
                        _wReadDate = _wRow ? (_wRow.reading_date || (_wRow.recorded_at ? _wRow.recorded_at.slice(0, 10) : null)) : null;
                        _eReadDate = _eRow ? (_eRow.reading_date || (_eRow.recorded_at ? _eRow.recorded_at.slice(0, 10) : null)) : null;
                        // Fallback: ถ้าไม่มีข้อมูลจาก water/electric_bills ให้ใช้ notifications.sent_at
                        if (!_wReadDate && !_eReadDate) {
                            var _notifSrc = currentOut || notifRow;
                            if (!_notifSrc && houseNumber) {
                                try {
                                    var _nfRows = await sbGet('notifications', { house_number: 'eq.' + houseNumber, period: 'eq.' + period, order: 'sent_at.desc', limit: '1' }).catch(function() { return []; });
                                    _notifSrc = _nfRows && _nfRows[0];
                                } catch(e) {}
                            }
                            if (_notifSrc && _notifSrc.sent_at) {
                                _wReadDate = _notifSrc.sent_at.slice(0, 10);
                            }
                        }
                    } catch(e) {}
                }
                var billSrc = currentOut || notifRow;
                return { success: true, role: 'user', announcements: announcements, proxyAssignments: userProxyAssignments, data: {
                    houseNumber: houseNumber,
                    period: period,
                    currentAmount: currentAmount,
                    waterAmount: billSrc ? parseFloat(billSrc.water_amount) || 0 : 0,
                    electricAmount: billSrc ? parseFloat(billSrc.electric_amount) || 0 : 0,
                    commonFee: billSrc ? parseFloat(billSrc.common_fee) || 0 : 0,
                    totalOutstanding: totalOutstanding,
                    slipStatus: slipStatus,
                    reviewNote: reviewNote,
                    slipId: latestSlip ? latestSlip.id : null,
                    dueDate: dueDate,
                    waterReadDate: _wReadDate,
                    electricReadDate: _eReadDate
                }};
            }
        }

        /* ── Slip review ──────────────────────────── */
        case 'cancelSlip': {
            if (!data.id) return { success: false, error: 'ไม่ระบุ ID สลิป' };
            var canSess = await _getSessionRole();
            if (!canSess) return { success: false, error: 'กรุณาเข้าสู่ระบบก่อน' };
            var canSlip = await sbGet('slip_submissions', { id: 'eq.' + data.id, select: 'id,house_number,status', limit: '1' });
            if (!canSlip || canSlip.length === 0) return { success: false, error: 'ไม่พบสลิป' };
            var canRow = canSlip[0];
            if (canRow.status !== 'pending' && canRow.status !== 'rejected') return { success: false, error: 'ไม่สามารถยกเลิกสลิปที่ตรวจสอบแล้ว' };
            if (canSess.role !== 'admin' && canSess.role !== 'head') {
                var muArrC = []; try { muArrC = await sbGet('users', { id: 'eq.' + canSess.userId, select: 'email', limit: '1' }); } catch(e) {}
                var myResObjC = await _findResidentForUser(canSess.userId, muArrC[0] ? muArrC[0].email : null);
                var myHouseC = myResObjC ? (myResObjC.house_number || '') : '';
                if (myHouseC && canRow.house_number !== myHouseC) return { success: false, error: 'คุณไม่มีสิทธิ์ยกเลิกสลิปนี้' };
            }
            await sbDelete('slip_submissions', { id: 'eq.' + data.id });
            return { success: true };
        }

        case 'rejectSlip': {
            // ปฏิเสธสลิป + ส่ง notification ให้ผู้พักบนแดชบอร์ด + อีเมล
            if (!data.id || !data.houseNumber) return { success: false, error: 'ไม่ระบุ ID หรือเลขบ้าน' };
            var rejSess = await _getSessionRole();
            if (!rejSess || (rejSess.role !== 'admin' && rejSess.role !== 'head' && rejSess.role !== 'officer')) {
                return { success: false, error: 'ไม่มีสิทธิ์ปฏิเสธสลิป' };
            }
            var rejNote = (data.note || 'ยอดเงินไม่ตรงกับใบแจ้งหนี้');
            await sbPatch('slip_submissions', { id: 'eq.' + data.id }, {
                status: 'rejected',
                reviewed_by: rejSess.userId || '',
                reviewed_at: new Date().toISOString(),
                review_note: rejNote
            });
            // แจ้งผู้พักทางแดชบอร์ด (residents เห็นผ่าน getNotificationHistory)
            try {
                await sbPost('notifications', {
                    house_number: data.houseNumber,
                    period: data.period || '',
                    water_amount: 0, electric_amount: 0,
                    common_fee: 0, garbage_fee: 0,
                    total_amount: parseFloat(data.notifiedAmount) || 0,
                    message: 'SLIP_REJECTED:' + rejNote,
                    sent_by: rejSess.userId || ''
                });
            } catch(e) {}
            // ส่งอีเมลแจ้งผู้พัก
            if (data.email) {
                try {
                    var paidAmt = parseFloat(data.paidAmount) || 0;
                    var notifAmt = parseFloat(data.notifiedAmount) || 0;
                    var diffAmt = paidAmt - notifAmt;
                    var diffLine = data.paidAmount
                        ? '<p>ยอดที่ส่ง: <strong>' + paidAmt.toLocaleString('th-TH') + ' บาท</strong><br>ยอดที่ต้องชำระ: <strong>' + notifAmt.toLocaleString('th-TH') + ' บาท</strong><br>ส่วนต่าง: <strong style="color:#dc2626;">' + (diffAmt > 0 ? '+' : '') + diffAmt.toLocaleString('th-TH') + ' บาท</strong></p>'
                        : '';
                    var rjHtml = '<div style="font-family:Kanit,sans-serif;font-size:15px;line-height:1.7">'
                        + '<p>เรียน ' + (data.residentName || 'ผู้พักอาศัย') + '</p>'
                        + '<div style="background:#fef2f2;border:2px solid #dc2626;padding:16px;border-radius:10px;margin:12px 0">'
                        + '<p>⚠️ <strong>สลิปการชำระถูกปฏิเสธ</strong></p>'
                        + '<p>บ้านพัก: <strong>' + data.houseNumber + '</strong></p>'
                        + '<p>งวด: <strong>' + (data.period || '') + '</strong></p>'
                        + diffLine
                        + '<p>เหตุผล: <strong>' + rejNote + '</strong></p>'
                        + '</div>'
                        + '<p>กรุณาอัพโหลดสลิปใหม่ให้ถูกต้องผ่านระบบ HOME PPK 2026 หรือติดต่อเจ้าหน้าที่</p>'
                        + '<p>---<br>' + (data.signature || 'งานบ้านพักครู โรงเรียนพะเยาพิทยาคม') + '</p></div>';
                    await _callEdge('send-email', {
                        to: data.email,
                        subject: '⚠️ สลิปถูกปฏิเสธ: บ้าน ' + data.houseNumber + ' งวด ' + (data.period || ''),
                        html: rjHtml
                    });
                } catch(e) {}
            }
            return { success: true };
        }

        case 'reviewSlip': {
            var sess = await sbGet('sessions', { token: 'eq.' + getSessionToken(), select: 'user_id' });
            var reviewerId = sess && sess[0] ? sess[0].user_id : null;
            if (!reviewerId) {
                var lsUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
                if (lsUser && lsUser.id) reviewerId = lsUser.id;
            }
            var reviewedBy = data.reviewedBy || reviewerId || '';
            await sbPatch('slip_submissions', { id: 'eq.' + data.id }, {
                status: data.status, reviewed_by: reviewedBy,
                reviewed_at: new Date().toISOString(), review_note: data.note || ''
            });
            if (data.status === 'approved' && data.houseNumber && data.period && data.amount) {
                await sbPost('payment_history', {
                    house_number: data.houseNumber, period: data.period,
                    amount_paid: data.amount, payment_date: new Date().toISOString().split('T')[0],
                    payment_method: 'transfer', slip_id: data.id, recorded_by: reviewedBy
                });
                // mark outstanding เป็น paid — ใช้ outstandingId ถ้ามี, ไม่งั้น lookup ด้วย house_number + period
                if (data.outstandingId) {
                    await sbPatch('outstanding', { id: 'eq.' + data.outstandingId }, { status: 'paid', updated_at: new Date().toISOString() });
                } else {
                    try {
                        var outRows = await sbGet('outstanding', { house_number: 'eq.' + data.houseNumber, period: 'eq.' + data.period, status: 'neq.paid', limit: '10' });
                        if (outRows && outRows.length > 0) {
                            for (var oi = 0; oi < outRows.length; oi++) {
                                await sbPatch('outstanding', { id: 'eq.' + outRows[oi].id }, { status: 'paid', updated_at: new Date().toISOString() });
                            }
                        }
                    } catch(e) { console.warn('reviewSlip: auto-mark outstanding paid error', e); }
                }

                // ─── Auto-deactivate ผู้ย้ายออกแล้วหากยอดค้างครบทุกงวด ───
                try {
                    // โหลดยอดค้างที่ยังไม่จ่ายสำหรับบ้านนี้ทั้งหมด
                    var _rsAllOut = await sbGet('outstanding', { house_number: 'eq.' + data.houseNumber, status: 'neq.paid' }) || [];
                    // กรอง JS เอาเฉพาะที่มี moved_out_at (= ยอดเก่าของผู้ย้ายออก)
                    var _rsMovedOutRemaining = _rsAllOut.filter(function(o) { return !!o.moved_out_at; });
                    if (_rsMovedOutRemaining.length === 0) {
                        // หาผู้พักที่ is_active=false (ถูก deactivate ไปแล้วจาก executeReturn) สำหรับบ้านนี้
                        var _rsMORRows = await sbGet('residents', { house_number: 'eq.' + data.houseNumber, is_active: 'eq.false', select: 'user_id,end_date', order: 'end_date.desc', limit: '5' }) || [];
                        var _rsMOR = _rsMORRows.find(function(r) { return r.end_date && r.user_id; });
                        if (_rsMOR && _rsMOR.user_id) {
                            // deactivate user ถ้ายังอยู่ในระบบ (is_active=true)
                            var _rsMORUser = await sbGet('users', { id: 'eq.' + _rsMOR.user_id, is_active: 'eq.true', limit: '1' }) || [];
                            if (_rsMORUser && _rsMORUser[0]) {
                                await sbPatch('users', { id: 'eq.' + _rsMOR.user_id }, { is_active: false, updated_at: new Date().toISOString() });
                                try { await sbDelete('sessions', { user_id: 'eq.' + _rsMOR.user_id }); } catch(e2) {}
                                _logActivity('auto_deactivate_moved_out', reviewedBy, 'auto-deactivate ผู้ย้ายออก เพราะชำระครบแล้ว บ้าน=' + data.houseNumber, { userId: _rsMOR.user_id, houseNumber: data.houseNumber });
                            }
                        }
                    }
                } catch(e) { console.warn('reviewSlip: auto-deactivate moved-out user error', e); }
            }
            _logActivity('review_slip', reviewedBy, (data.status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ') + 'สลิป ' + (data.houseNumber || '') + ' งวด ' + (data.period || ''), { slipId: data.id, status: data.status, house_number: data.houseNumber, period: data.period });
            return { success: true };
        }

        case 'markReceiptSent': {
            if (!data.id) return { success: false, error: 'ไม่ระบุ ID' };
            await sbPatch('slip_submissions', { id: 'eq.' + data.id }, {
                receipt_sent_at: new Date().toISOString()
            });
            return { success: true };
        }

        /* ── Notification ─────────────────────────── */
        case 'sendNotification': {
            var row = await sbPost('notifications', {
                house_number: data.houseNumber || '', period: data.period || '',
                water_amount: data.waterAmount || 0, electric_amount: data.electricAmount || 0,
                common_fee: data.commonFee || 0, garbage_fee: data.garbageFee || 0,
                total_amount: data.totalAmount || 0, due_date: data.dueDate || null,
                message: data.message || '', sent_by: data.sentBy || ''
            });
            _logActivity('send_notification', data.sentBy || null, 'ส่งแจ้งเตือนบิล ' + (data.houseNumber || '') + ' งวด ' + (data.period || ''), { house_number: data.houseNumber, period: data.period, total: data.totalAmount });
            return { success: true, data: row };
        }

        /* ── Approve Return: อนุมัติคืนบ้านพัก (ย้ายออก) ── */
        case 'approveReturn': {
            if (!data.requestId) return { success: false, error: 'ไม่ระบุ ID คำร้อง' };
            var _arSess2 = await _getSessionRole();
            var _arReviewerId2 = _arSess2 ? _arSess2.userId : null;
            if (!_arReviewerId2) return { success: false, error: 'กรุณาเข้าสู่ระบบก่อน' };

            // 1. ดึง request + validate
            var _arReqRows2 = await sbGet('requests', { id: 'eq.' + data.requestId, select: 'user_id,status', limit: '1' });
            if (!_arReqRows2 || !_arReqRows2[0]) return { success: false, error: 'ไม่พบคำร้อง' };
            var _arReq2 = _arReqRows2[0];
            if (_arReq2.status === 'completed') return { success: false, error: 'ดำเนินการย้ายออกไปแล้ว (สถานะ: completed)' };

            var _arUserId2 = _arReq2.user_id;
            if (!_arUserId2) return { success: false, error: 'คำร้องไม่มี user_id' };

            // 2. ดึง resident ที่ active
            var _arResRows2 = await sbGet('residents', { user_id: 'eq.' + _arUserId2, is_active: 'eq.true', limit: '1' });
            if (!_arResRows2 || !_arResRows2[0]) return { success: false, error: 'ไม่พบผู้พักอาศัยที่ active' };
            var _arRes2 = _arResRows2[0];
            var _arHouseNumber2 = _arRes2.house_number;
            var _arHouseId2 = _arRes2.house_id;

            // ใช้ returnDate จาก param หรือ details ของคำร้อง (ไม่ใช่ today)
            var _arEndDate2 = null;
            if (data.returnDate) {
                _arEndDate2 = data.returnDate.split('T')[0];
            } else {
                // ดึงจาก details ของ request
                var _arFullReq2 = await sbGet('requests', { id: 'eq.' + data.requestId, select: 'details', limit: '1' }).catch(function() { return []; });
                if (_arFullReq2 && _arFullReq2[0] && _arFullReq2[0].details) {
                    var _arDet2 = typeof _arFullReq2[0].details === 'string' ? JSON.parse(_arFullReq2[0].details) : _arFullReq2[0].details;
                    _arEndDate2 = (_arDet2.returnDate || _arDet2.return_date || '').split('T')[0] || null;
                }
            }
            if (!_arEndDate2) _arEndDate2 = new Date().toISOString().split('T')[0]; // fallback

            // 3. ตรวจยอดค้าง
            var _arOutRows2 = [];
            try { _arOutRows2 = await sbGet('outstanding', { house_number: 'eq.' + _arHouseNumber2, status: 'neq.paid' }) || []; } catch(e) {}
            var _arHasOut2 = _arOutRows2.length > 0;

            // 4. mark outstanding ว่าย้ายออกแล้ว
            if (_arHouseNumber2) {
                try {
                    await sbPatch('outstanding', { house_number: 'eq.' + _arHouseNumber2, status: 'neq.paid' },
                        { moved_out_at: new Date().toISOString() });
                } catch(e) {}
            }

            // 5. deactivate resident + บันทึก end_date / departed_at / departure_reason
            await sbPatch('residents', { id: 'eq.' + _arRes2.id }, {
                is_active: false, end_date: _arEndDate2,
                departed_at: new Date().toISOString(),
                departure_reason: data.reason || 'return',
                updated_at: new Date().toISOString()
            });

            // 6. ตรวจสอบ coresidents — ถ้ามีที่มี user_id ให้ promote เป็น resident หลักคนแรก
            var _arCors = [];
            try { _arCors = await sbGet('coresidents', { resident_id: 'eq.' + _arRes2.id }) || []; } catch(e) {}
            var _arPromoteCor = (_arCors).find(function(c) { return c.user_id; }) || null;
            var _arPromotedResidentId = null;
            if (_arPromoteCor) {
                // ล้าง moved_out_at period ปัจจุบัน เพื่อให้ผู้พักร่วมที่ถูก promote เห็นยอดแจ้ง
                var _arProNow = new Date();
                var _arProPeriod = (_arProNow.getFullYear() + 543) + '-' + String(_arProNow.getMonth() + 1).padStart(2, '0');
                try { await sbPatch('outstanding', { house_number: 'eq.' + _arHouseNumber2, period: 'eq.' + _arProPeriod, moved_out_at: 'not.is.null' }, { moved_out_at: null, updated_at: new Date().toISOString() }); } catch(e) {}
                // สร้าง resident record ใหม่สำหรับผู้พักร่วมที่ถูก promote
                var _arNewFullName = ((_arPromoteCor.prefix||'') + (_arPromoteCor.firstname||'') + ' ' + (_arPromoteCor.lastname||'')).trim();
                var _arNewRes = await sbPost('residents', {
                    user_id:      _arPromoteCor.user_id,
                    house_id:     _arHouseId2,
                    house_number: _arHouseNumber2,
                    prefix:       _arPromoteCor.prefix    || '',
                    firstname:    _arPromoteCor.firstname  || '',
                    lastname:     _arPromoteCor.lastname   || '',
                    email:        _arPromoteCor.email      || '',
                    phone:        _arPromoteCor.phone      || '',
                    is_active:    true,
                    start_date:   new Date().toISOString().split('T')[0]
                }).catch(function() { return null; });
                _arPromotedResidentId = _arNewRes ? _arNewRes.id : null;
                // อัพเดท session ของผู้พักร่วมที่ถูก promote
                try { await sbPatch('sessions', { user_id: 'eq.' + _arPromoteCor.user_id }, { resident_id: _arPromotedResidentId || _arPromoteCor.id, house_number: _arHouseNumber2 }); } catch(e) {}
                // อัพเดทชื่อในบันทึกค่าน้ำ ค่าไฟ แจ้งยอด สลิป ประวัติ ที่ยังไม่ได้ปิด
                if (_arNewFullName) {
                    var _arNamePatch = { resident_name: _arNewFullName };
                    var _arUidPatch  = { resident_name: _arNewFullName, resident_user_id: _arPromoteCor.user_id };
                    await Promise.all([
                        sbPatch('water_bills',    { house_number: 'eq.' + _arHouseNumber2 }, _arNamePatch).catch(function(){}),
                        sbPatch('electric_bills', { house_number: 'eq.' + _arHouseNumber2 }, _arNamePatch).catch(function(){}),
                        sbPatch('outstanding',    { house_number: 'eq.' + _arHouseNumber2, moved_out_at: 'is.null' }, _arUidPatch).catch(function(){}),
                        sbPatch('notifications',  { house_number: 'eq.' + _arHouseNumber2 }, _arNamePatch).catch(function(){}),
                        sbPatch('payment_history',{ house_number: 'eq.' + _arHouseNumber2 }, _arNamePatch).catch(function(){}),
                        sbPatch('slip_submissions',{ house_number: 'eq.' + _arHouseNumber2, status: 'in.(pending,reviewing)' }, { resident_id: _arPromotedResidentId || _arPromoteCor.id }).catch(function(){})
                    ]);
                }
            }
            // ลบ coresidents ทั้งหมด (ทั้งที่ promote แล้วและที่เหลือ)
            try { await sbDelete('coresidents', { resident_id: 'eq.' + _arRes2.id }); } catch(e) {}
            // deactivate user account ของ coresidents ที่ไม่ได้ promote
            for (var _ci2 = 0; _ci2 < _arCors.length; _ci2++) {
                var _c2 = _arCors[_ci2];
                if (_c2.user_id && (!_arPromoteCor || _c2.user_id !== _arPromoteCor.user_id)) {
                    try { await sbPatch('users', { id: 'eq.' + _c2.user_id }, { is_active: false, updated_at: new Date().toISOString() }); } catch(e) {}
                    try { await sbDelete('sessions', { user_id: 'eq.' + _c2.user_id }); } catch(e) {}
                }
            }

            // 7. บ้าน → occupied ถ้ามีการ promote, available ถ้าไม่มี
            var _arHouseNewStatus = _arPromoteCor ? 'occupied' : 'available';
            if (_arHouseId2) {
                try { await sbPatch('housing', { id: 'eq.' + _arHouseId2 }, { status: _arHouseNewStatus, updated_at: new Date().toISOString() }); } catch(e) {}
            } else if (_arHouseNumber2) {
                // fallback: update โดย house_number กรณี house_id เป็น null
                try { await sbPatch('housing', { house_number: 'eq.' + _arHouseNumber2 }, { status: _arHouseNewStatus, updated_at: new Date().toISOString() }); } catch(e) {}
            }

            // Phase G: แจ้งเตือนอีเมลคนแรกในคิวเมื่อบ้านว่าง (เฉพาะกรณีไม่มีการ promote coresident)
            if (!_arPromoteCor) try {
                var _arQRows = await sbGet('queue', { status: 'eq.waiting', order: 'position.asc', limit: '1' }).catch(function() { return []; });
                if (_arQRows && _arQRows[0] && _arQRows[0].user_id) {
                    var _arQUserR = await sbGet('users', { id: 'eq.' + _arQRows[0].user_id, select: 'email,firstname,prefix', limit: '1' }).catch(function() { return []; });
                    if (_arQUserR && _arQUserR[0] && _arQUserR[0].email) {
                        var _arQU = _arQUserR[0];
                        var _arQName = ((_arQU.prefix||'') + (_arQU.firstname||'')).trim() || 'ท่าน';
                        await _callEdge('send-email', {
                            to: _arQU.email,
                            subject: 'บ้านพักว่างแล้ว — บ้านพักครู พะเยาพิทยาคม',
                            html: '<p>เรียน ' + _arQName + '</p><p>บ้านพัก <strong>เลขที่ ' + (_arHouseNumber2||'') + '</strong> ว่างแล้ว กรุณาติดต่อเจ้าหน้าที่เพื่อดำเนินการต่อไป</p><p>ขอบคุณ<br>ระบบบ้านพักครู พะเยาพิทยาคม</p>',
                            text: 'บ้านพัก ' + (_arHouseNumber2||'') + ' ว่างแล้ว กรุณาติดต่อเจ้าหน้าที่'
                        }).catch(function() {});
                    }
                }
            } catch(e) {}

            // 8. จัดการ user: ถ้ามียอดค้าง → mark status=departing (ยัง login ได้), ถ้าไม่มี → deactivate
            if (_arHasOut2) {
                try { await sbPatch('users', { id: 'eq.' + _arUserId2 }, { status: 'departing', updated_at: new Date().toISOString() }); } catch(e) {}
            } else {
                await sbPatch('users', { id: 'eq.' + _arUserId2 }, { is_active: false, updated_at: new Date().toISOString() });
                try { await sbDelete('sessions', { user_id: 'eq.' + _arUserId2 }); } catch(e) {}
            }

            // 9. mark request completed
            await sbPatch('requests', { id: 'eq.' + data.requestId }, {
                status: 'completed', reviewed_by: _arReviewerId2,
                reviewed_at: new Date().toISOString(),
                review_note: data.note || '', updated_at: new Date().toISOString()
            });

            invalidateResidentCache();
            var _arLogNote = _arPromoteCor ? ' (promote ' + ((_arPromoteCor.prefix||'')+(_arPromoteCor.firstname||'')+' '+(_arPromoteCor.lastname||'')).trim() + ' เป็นผู้พักหลัก)' : '';
            _logActivity('approve_return', _arReviewerId2, 'อนุมัติคืนบ้าน ' + _arHouseNumber2 + _arLogNote, { requestId: data.requestId, houseNumber: _arHouseNumber2, hasOutstanding: _arHasOut2, promoted: _arPromoteCor ? _arPromoteCor.user_id : null });
            return { success: true, hasOutstanding: _arHasOut2, promotedResident: _arPromoteCor ? { userId: _arPromoteCor.user_id, name: ((_arPromoteCor.prefix||'')+(_arPromoteCor.firstname||'')+' '+(_arPromoteCor.lastname||'')).trim() } : null };
        }

        /* ── ดำเนินการย้ายบ้าน (execute transfer หลังอนุมัติแล้ว) ── */
        case 'executeTransfer': {
            if (!data.requestId) return { success: false, error: 'ไม่ระบุ requestId' };
            var _etSess = await _getSessionRole();
            if (!_etSess || (_etSess.role !== 'admin' && _etSess.role !== 'head')) return { success: false, error: 'สิทธิ์ไม่เพียงพอ' };

            // 1. ดึง request
            var _etReqR = await sbGet('requests', { id: 'eq.' + data.requestId, select: 'user_id,status,details', limit: '1' }).catch(function() { return []; });
            var _etReq = _etReqR && _etReqR[0];
            if (!_etReq) return { success: false, error: 'ไม่พบคำร้อง' };
            if (_etReq.status !== 'approved') return { success: false, error: 'คำร้องยังไม่ได้รับการอนุมัติ (สถานะ: ' + _etReq.status + ')' };

            var _etDet = _etReq.details || {};
            var _etCurHouse = _etDet.current_house || '';
            var _etTgtHouse = data.targetHouse || _etDet.target_house || '';
            var _etUID = _etReq.user_id;

            if (!_etUID) return { success: false, error: 'คำร้องไม่มีข้อมูลผู้ใช้' };
            if (!_etTgtHouse) return { success: false, error: 'ไม่ระบุบ้านปลายทาง (target_house)' };

            // 2. ดึง resident ปัจจุบัน
            var _etResR = await sbGet('residents', { user_id: 'eq.' + _etUID, is_active: 'eq.true', limit: '1' }).catch(function() { return []; });
            var _etRes = _etResR && _etResR[0];
            if (!_etRes) return { success: false, error: 'ไม่พบผู้พักอาศัยที่ active สำหรับผู้ใช้นี้' };

            // 3. ตรวจว่า execute แล้วหรือยัง (ถ้าผู้พักย้ายไปบ้านใหม่แล้ว)
            if (_etRes.house_number === _etTgtHouse) {
                return { success: true, alreadyExecuted: true, message: 'ดำเนินการย้ายแล้ว — ผู้พักอาศัยอยู่ที่บ้าน ' + _etTgtHouse + ' แล้ว' };
            }

            // 4. ตรวจบ้านปลายทาง
            var _etTgtRows = await sbGet('housing', { house_number: 'eq.' + _etTgtHouse, limit: '1' }).catch(function() { return []; });
            var _etTgt = _etTgtRows && _etTgtRows[0];
            if (!_etTgt) return { success: false, error: 'ไม่พบบ้านพักเลขที่ ' + _etTgtHouse };
            if (_etTgt.status !== 'available') return { success: false, error: 'บ้านปลายทาง ' + _etTgtHouse + ' ยังไม่ว่าง (สถานะ: ' + _etTgt.status + ')' };

            var _etOldHId = _etRes.house_id;
            var _etActualCurHouse = _etRes.house_number;

            // 5. ย้าย resident → บ้านใหม่
            await sbPatch('residents', { id: 'eq.' + _etRes.id }, {
                house_id: _etTgt.id, house_number: _etTgtHouse,
                move_in_date: new Date().toISOString().split('T')[0],
                updated_at: new Date().toISOString()
            });
            // 6. sync coresidents
            try {
                var _etCorR = await sbGet('coresidents', { resident_id: 'eq.' + _etRes.id }).catch(function() { return []; });
                for (var _eci = 0; _etCorR && _eci < _etCorR.length; _eci++) {
                    await sbPatch('coresidents', { id: 'eq.' + _etCorR[_eci].id }, { house_id: _etTgt.id });
                }
            } catch(e) {}
            // 7. บ้านเก่า → available
            if (_etOldHId) {
                try { await sbPatch('housing', { id: 'eq.' + _etOldHId }, { status: 'available', updated_at: new Date().toISOString() }); } catch(e) {}
            }
            // 8. บ้านใหม่ → occupied
            await sbPatch('housing', { id: 'eq.' + _etTgt.id }, { status: 'occupied', updated_at: new Date().toISOString() });
            // 9. mark outstanding บ้านเก่าว่าย้ายออก
            if (_etActualCurHouse) {
                try { await sbPatch('outstanding', { house_number: 'eq.' + _etActualCurHouse, moved_out_at: 'is.null' }, { moved_out_at: new Date().toISOString() }); } catch(e) {}
            }
            // 9b. ล้าง moved_out_at period ปัจจุบันในบ้านปลายทาง (เผื่อแจ้งยอดไว้ก่อนผู้เดิมย้ายออก)
            var _etNow = new Date();
            var _etCurrPeriod = (_etNow.getFullYear() + 543) + '-' + String(_etNow.getMonth() + 1).padStart(2, '0');
            try { await sbPatch('outstanding', { house_number: 'eq.' + _etTgtHouse, period: 'eq.' + _etCurrPeriod, moved_out_at: 'not.is.null' }, { moved_out_at: null, updated_at: new Date().toISOString() }); } catch(e) {}
            // 10. notify email คนแรกในคิว
            try {
                var _etQRows = await sbGet('queue', { status: 'eq.waiting', order: 'position.asc', limit: '1' }).catch(function() { return []; });
                if (_etQRows && _etQRows[0] && _etQRows[0].user_id) {
                    var _etQUserR = await sbGet('users', { id: 'eq.' + _etQRows[0].user_id, select: 'email,firstname,prefix', limit: '1' }).catch(function() { return []; });
                    if (_etQUserR && _etQUserR[0] && _etQUserR[0].email) {
                        var _etQU = _etQUserR[0];
                        var _etQName = ((_etQU.prefix||'') + (_etQU.firstname||'')).trim() || 'ท่าน';
                        await _callEdge('send-email', {
                            to: _etQU.email,
                            subject: 'บ้านพักว่างแล้ว — บ้านพักครู พะเยาพิทยาคม',
                            html: '<p>เรียน ' + _etQName + '</p><p>บ้านพัก <strong>เลขที่ ' + (_etActualCurHouse||'') + '</strong> ว่างแล้ว กรุณาติดต่อเจ้าหน้าที่เพื่อดำเนินการต่อไป</p><p>ขอบคุณ<br>ระบบบ้านพักครู พะเยาพิทยาคม</p>',
                            text: 'บ้านพัก ' + (_etActualCurHouse||'') + ' ว่างแล้ว กรุณาติดต่อเจ้าหน้าที่'
                        }).catch(function() {});
                    }
                }
            } catch(e) {}

            invalidateResidentCache();
            _logActivity('execute_transfer', _etSess.userId, 'ย้ายบ้านพัก ' + _etActualCurHouse + ' → ' + _etTgtHouse, { requestId: data.requestId, from: _etActualCurHouse, to: _etTgtHouse });
            return { success: true, from: _etActualCurHouse, to: _etTgtHouse };
        }

        /* ── Request review ───────────────────────── */
        case 'reviewRequest': {
            var reqIdToReview = data.id || data.requestId;
            if (!reqIdToReview) return { success: false, error: 'ไม่ระบุ ID คำร้อง' };
            var sess = await sbGet('sessions', { token: 'eq.' + getSessionToken(), select: 'user_id' });
            var reqReviewerId = sess && sess[0] ? sess[0].user_id : null;
            if (!reqReviewerId) {
                var lsUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
                if (lsUser && lsUser.id) reqReviewerId = lsUser.id;
            }
            var _rrUpdateBody = {
                status: data.status, reviewed_by: data.reviewedBy || reqReviewerId || '',
                reviewed_at: new Date().toISOString(), review_note: data.note || '',
                updated_at: new Date().toISOString()
            };
            // เพิ่มลายเซ็น + ชื่อผู้อนุมัติ (ถ้ามี)
            if (data.signature) { _rrUpdateBody.head_signature = data.signature; _rrUpdateBody.head_reviewed_at = new Date().toISOString(); }
            if (data.reviewerName) _rrUpdateBody.head_reviewer_name = data.reviewerName;
            if (data.reviewerPosition) _rrUpdateBody.head_reviewer_position = data.reviewerPosition;
            if (data.note) _rrUpdateBody.head_comment = data.note;
            var _rrPatchResult = await sbPatch('requests', { id: 'eq.' + reqIdToReview }, _rrUpdateBody);
            if (!_rrPatchResult || (Array.isArray(_rrPatchResult) && _rrPatchResult.length === 0)) {
                console.warn('[reviewRequest] sbPatch returned empty — ID:', reqIdToReview, 'status:', data.status);
                return { success: false, error: 'ไม่พบคำร้อง ID: ' + reqIdToReview + ' ในฐานข้อมูล หรือไม่สามารถอัปเดตได้ (0 rows)' };
            }

            // ── Queue management: insert/remove from queue table ──
            if (data.status === 'waiting') {
                // เพิ่มลงคิว — หา user_id ของคำร้อง + position ถัดไป
                try {
                    var reqRow = await sbGet('requests', { id: 'eq.' + reqIdToReview, select: 'user_id' });
                    var reqUserId = reqRow && reqRow[0] ? reqRow[0].user_id : null;
                    // ดูว่ามี row ใน queue อยู่แล้วหรือไม่
                    var existQ = await sbGet('queue', { request_id: 'eq.' + reqIdToReview, status: 'eq.waiting', limit: '1' });
                    if (!existQ || existQ.length === 0) {
                        // หา position สูงสุดปัจจุบัน
                        var allQ = await sbGet('queue', { status: 'eq.waiting', order: 'position.desc', limit: '1' });
                        var nextPos = (allQ && allQ[0] && allQ[0].position) ? allQ[0].position + 1 : 1;
                        if (data.queuePosition) nextPos = data.queuePosition;
                        await sbPost('queue', {
                            user_id: reqUserId,
                            request_id: reqIdToReview,
                            position: nextPos,
                            status: 'waiting'
                        });
                    }
                } catch(qe) { console.warn('Queue insert failed:', qe); }
            } else if (data.removeFromQueue || ['approved','rejected','reviewing','pending','completed','expired','cancelled'].indexOf(data.status) !== -1) {
                // ลบออกจากคิว
                try {
                    var qRows = await sbGet('queue', { request_id: 'eq.' + reqIdToReview, status: 'eq.waiting' });
                    if (qRows && qRows.length > 0) {
                        for (var qi = 0; qi < qRows.length; qi++) {
                            await sbPatch('queue', { id: 'eq.' + qRows[qi].id }, { status: 'cancelled', updated_at: new Date().toISOString() });
                        }
                    }
                } catch(qe) { console.warn('Queue remove failed:', qe); }
            }

            // Auto-delete attachments when request reaches terminal status
            var terminalStatuses = ['approved', 'completed', 'rejected', 'cancelled'];
            if (terminalStatuses.indexOf(data.status) !== -1) {
                try {
                    var reqRows = await sbGet('requests', { id: 'eq.' + reqIdToReview, select: 'details' });
                    var reqDetails = reqRows && reqRows[0] ? reqRows[0].details : null;
                    var attUrls = reqDetails ? (reqDetails.attachment_urls || []) : [];
                    if (attUrls.length > 0) {
                        var filePaths = [];
                        for (var ai = 0; ai < attUrls.length; ai++) {
                            var attItem = attUrls[ai];
                            var attUrlStr = typeof attItem === 'string' ? attItem : (attItem.url || '');
                            var m = attUrlStr.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
                            if (m) filePaths.push({ bucket: m[1], path: m[2] });
                        }
                        for (var bi = 0; bi < filePaths.length; bi++) {
                            await window._sb.storage.from(filePaths[bi].bucket).remove([filePaths[bi].path]);
                        }
                        // Clear attachment_urls from details
                        var cleanDetails = Object.assign({}, reqDetails);
                        delete cleanDetails.attachment_urls;
                        await sbPatch('requests', { id: 'eq.' + reqIdToReview }, { details: cleanDetails });
                    }
                } catch (e) { console.warn('Auto-delete attachments failed:', e); }
            }
            // ── Phase C: auto-execute transfer เมื่ออนุมัติ ──
            var _rrWarning = null;
            if (data.type === 'transfer' && data.status === 'approved') {
                try {
                    var _trReqR = await sbGet('requests', { id: 'eq.' + reqIdToReview, select: 'user_id,details', limit: '1' });
                    var _trReqD = _trReqR && _trReqR[0];
                    if (_trReqD) {
                        var _trDet = _trReqD.details || {};
                        var _trCurHouse = _trDet.current_house || '';
                        var _trTgtHouse = _trDet.target_house || '';
                        var _trUID = _trReqD.user_id;
                        if (_trCurHouse && _trTgtHouse && _trUID) {
                            var _trTgtRows = await sbGet('housing', { house_number: 'eq.' + _trTgtHouse, limit: '1' });
                            var _trTgt = _trTgtRows && _trTgtRows[0];
                            if (!_trTgt || _trTgt.status !== 'available') {
                                _rrWarning = 'อนุมัติคำร้องแล้ว แต่บ้านปลายทาง (' + _trTgtHouse + ') ยังไม่ว่าง กรุณาย้ายบ้านด้วยตนเอง';
                            } else {
                                var _trResR = await sbGet('residents', { user_id: 'eq.' + _trUID, is_active: 'eq.true', limit: '1' });
                                var _trRes = _trResR && _trResR[0];
                                if (_trRes) {
                                    var _trOldHId = _trRes.house_id;
                                    // ย้าย resident → บ้านใหม่
                                    await sbPatch('residents', { id: 'eq.' + _trRes.id }, {
                                        house_id: _trTgt.id, house_number: _trTgtHouse,
                                        move_in_date: new Date().toISOString().split('T')[0],
                                        updated_at: new Date().toISOString()
                                    });
                                    // sync coresidents
                                    try {
                                        var _trCorR = await sbGet('coresidents', { resident_id: 'eq.' + _trRes.id });
                                        for (var _tci2 = 0; _trCorR && _tci2 < _trCorR.length; _tci2++) {
                                            await sbPatch('coresidents', { id: 'eq.' + _trCorR[_tci2].id }, { house_id: _trTgt.id });
                                        }
                                    } catch(e) {}
                                    // บ้านเก่า → available
                                    if (_trOldHId) {
                                        try { await sbPatch('housing', { id: 'eq.' + _trOldHId }, { status: 'available', updated_at: new Date().toISOString() }); } catch(e) {}
                                    }
                                    // บ้านใหม่ → occupied
                                    await sbPatch('housing', { id: 'eq.' + _trTgt.id }, { status: 'occupied', updated_at: new Date().toISOString() });
                                    // mark outstanding บ้านเก่าทั้งหมดว่าย้ายออก (ทั้ง paid + unpaid)
                                    try {
                                        await sbPatch('outstanding', { house_number: 'eq.' + _trCurHouse, moved_out_at: 'is.null' },
                                            { moved_out_at: new Date().toISOString() });
                                    } catch(e) {}
                                    // ล้าง moved_out_at period ปัจจุบันในบ้านปลายทาง (เผื่อแจ้งยอดไว้ก่อนผู้เดิมย้ายออก)
                                    var _trNow = new Date();
                                    var _trCurrPeriod = (_trNow.getFullYear() + 543) + '-' + String(_trNow.getMonth() + 1).padStart(2, '0');
                                    try { await sbPatch('outstanding', { house_number: 'eq.' + _trTgtHouse, period: 'eq.' + _trCurrPeriod, moved_out_at: 'not.is.null' }, { moved_out_at: null, updated_at: new Date().toISOString() }); } catch(e) {}
                                    invalidateResidentCache();
                                    // notify email คนแรกในคิวเมื่อบ้านเก่าว่าง
                                    try {
                                        var _trQRows = await sbGet('queue', { status: 'eq.waiting', order: 'position.asc', limit: '1' }).catch(function() { return []; });
                                        if (_trQRows && _trQRows[0] && _trQRows[0].user_id) {
                                            var _trQUserR = await sbGet('users', { id: 'eq.' + _trQRows[0].user_id, select: 'email,firstname,prefix', limit: '1' }).catch(function() { return []; });
                                            if (_trQUserR && _trQUserR[0] && _trQUserR[0].email) {
                                                var _trQU = _trQUserR[0];
                                                var _trQName = ((_trQU.prefix||'') + (_trQU.firstname||'')).trim() || 'ท่าน';
                                                await _callEdge('send-email', {
                                                    to: _trQU.email,
                                                    subject: 'บ้านพักว่างแล้ว — บ้านพักครู พะเยาพิทยาคม',
                                                    html: '<p>เรียน ' + _trQName + '</p><p>บ้านพัก <strong>เลขที่ ' + (_trCurHouse||'') + '</strong> ว่างแล้ว กรุณาติดต่อเจ้าหน้าที่เพื่อดำเนินการต่อไป</p><p>ขอบคุณ<br>ระบบบ้านพักครู พะเยาพิทยาคม</p>',
                                                    text: 'บ้านพัก ' + (_trCurHouse||'') + ' ว่างแล้ว กรุณาติดต่อเจ้าหน้าที่'
                                                }).catch(function() {});
                                            }
                                        }
                                    } catch(e) {}
                                }
                            }
                        }
                    }
                } catch(te) { console.warn('Transfer auto-execute error:', te); }
            }

            _logActivity('review_request', reqReviewerId, (data.status || '') + ' คำร้อง', { requestId: reqIdToReview, status: data.status });
            return { success: true, warning: _rrWarning };
        }
        case 'updateQueue': {
            var ids = data.orderedIds || [];
            for (var i = 0; i < ids.length; i++) {
                await sbPatch('queue', { id: 'eq.' + ids[i] }, { position: i + 1, updated_at: new Date().toISOString() });
            }
            return { success: true };
        }
        case 'deleteRequest': {
            var delReqId = data.id || data.requestId;
            if (!delReqId) return { success: false, error: 'ไม่ระบุ ID คำร้อง' };
            // ลบ queue ที่เชื่อมกับคำร้องนี้ก่อน
            try {
                var delQRows = await sbGet('queue', { request_id: 'eq.' + delReqId });
                for (var dqi = 0; delQRows && dqi < delQRows.length; dqi++) {
                    await sbDelete('queue', { id: 'eq.' + delQRows[dqi].id });
                }
            } catch(e) { console.warn('Delete queue rows failed:', e); }
            // ลบคำร้อง
            await sbDelete('requests', { id: 'eq.' + delReqId });
            return { success: true };
        }

        /* ── Approve Residence: เลือกบ้าน + สร้าง resident อัตโนมัติ ── */
        case 'approveResidence': {
            var arReqId = data.requestId;
            var arHouseNum = data.houseNumber;
            if (!arReqId || !arHouseNum) return { success: false, error: 'กรุณาระบุ requestId และ houseNumber' };

            // 1. ดึง request row
            var arReqRows = await sbGet('requests', { id: 'eq.' + arReqId });
            var arReq = arReqRows && arReqRows[0];
            if (!arReq) return { success: false, error: 'ไม่พบคำร้อง' };
            var arDetails = arReq.details || {};
            var arUserId = arReq.user_id;

            // 2. ดึง housing row + ตรวจว่ายังว่างอยู่
            var arHouseRows = await sbGet('housing', { house_number: 'eq.' + arHouseNum, limit: '1' });
            var arHouse = arHouseRows && arHouseRows[0];
            if (!arHouse) return { success: false, error: 'ไม่พบบ้านเลขที่ ' + arHouseNum };
            if (arHouse.status !== 'available') return { success: false, error: 'บ้านเลขที่ ' + arHouseNum + ' ไม่ว่างแล้ว (สถานะ: ' + arHouse.status + ')' };
            var arHouseId = arHouse.id;

            // 3. หา reviewer
            var arSess = await sbGet('sessions', { token: 'eq.' + getSessionToken(), select: 'user_id' });
            var arReviewerId = arSess && arSess[0] ? arSess[0].user_id : null;
            if (!arReviewerId) {
                var arLsUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
                if (arLsUser && arLsUser.id) arReviewerId = arLsUser.id;
            }

            var arToday = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

            // 4. ตรวจว่า user มี resident record อยู่แล้วหรือไม่
            var arExistRes = null;
            if (arUserId) {
                var arResRows = await sbGet('residents', { user_id: 'eq.' + arUserId, is_active: 'eq.true', limit: '1' });
                arExistRes = arResRows && arResRows[0] ? arResRows[0] : null;
            }

            // ตรวจชื่อ: ถ้า resident ที่พบไม่ตรงกับผู้ขอ (เช่น admin สร้างแทน) → ให้สร้าง record ใหม่
            var _arNameMismatch = false;
            if (arExistRes) {
                var _arExpFirst = (arDetails.firstname || '').trim().toLowerCase();
                var _arExpLast  = (arDetails.lastname  || '').trim().toLowerCase();
                var _arGotFirst = (arExistRes.firstname || '').trim().toLowerCase();
                var _arGotLast  = (arExistRes.lastname  || '').trim().toLowerCase();
                if (_arExpFirst && _arExpLast && (_arExpFirst !== _arGotFirst || _arExpLast !== _arGotLast)) {
                    arExistRes = null; // ชื่อไม่ตรง → ไม่ใช่ผู้ขอจริง → สร้างใหม่
                    _arNameMismatch = true;
                }
            }

            var arResidentId = null;
            if (arExistRes) {
                // กรณี B: มี resident อยู่แล้ว → cleanup บ้านเก่าก่อน แล้วอัปเดต house assignment
                var _arOldHId = arExistRes.house_id;
                var _arOldHNum = arExistRes.house_number;
                if (_arOldHId && _arOldHId !== arHouseId) {
                    // ลบ coresidents บ้านเก่า
                    try { await sbDelete('coresidents', { resident_id: 'eq.' + arExistRes.id }); } catch(e) {}
                    // บ้านเก่า → available
                    try { await sbPatch('housing', { id: 'eq.' + _arOldHId }, { status: 'available', updated_at: new Date().toISOString() }); } catch(e) {}
                    // mark outstanding บ้านเก่าทั้งหมดว่าย้ายออกแล้ว (ทั้ง paid + unpaid)
                    if (_arOldHNum) {
                        try {
                            await sbPatch('outstanding', { house_number: 'eq.' + _arOldHNum, moved_out_at: 'is.null' },
                                { moved_out_at: new Date().toISOString() });
                        } catch(e) {}
                    }
                }
                await sbPatch('residents', { id: 'eq.' + arExistRes.id }, {
                    house_id: arHouseId, house_number: arHouseNum,
                    move_in_date: arToday, start_date: arToday,
                    is_active: true, updated_at: new Date().toISOString()
                });
                arResidentId = arExistRes.id;
            } else {
                // กรณี A: สร้าง resident ใหม่จากข้อมูลในคำร้อง
                // ถ้า user_id เป็นของ admin (name mismatch) → ค้น user_id จริงจาก email ในคำร้อง
                var arNewResUserId = arUserId || null;
                if (_arNameMismatch) {
                    arNewResUserId = null;
                    if (arDetails.email) {
                        try {
                            var _arApplicantU = await sbGet('users', { email: 'eq.' + arDetails.email, select: 'id', limit: '1' });
                            if (_arApplicantU && _arApplicantU[0]) arNewResUserId = _arApplicantU[0].id;
                        } catch(e) {}
                    }
                }
                var arNewRes = await sbPost('residents', {
                    user_id:       arNewResUserId,
                    house_id:      arHouseId,
                    house_number:  arHouseNum,
                    prefix:        arDetails.prefix || '',
                    firstname:     arDetails.firstname || '',
                    lastname:      arDetails.lastname || '',
                    position:      arDetails.position || '',
                    subject_group: arDetails.subject_group || arDetails.subjectGroup || '',
                    phone:         arDetails.phone || '',
                    email:         arDetails.email || '',
                    resident_type: (arDetails.stay_type || arDetails.stayType) === 'family' ? 'family' : 'single',
                    address_no:    arDetails.address || '',
                    move_in_date:  arToday,
                    start_date:    arToday,
                    is_active:     true
                });
                arResidentId = arNewRes ? arNewRes.id : null;
            }

            // 5. สร้าง coresidents จาก details.residents[]
            var arCoresidents = arDetails.residents || [];
            if (arResidentId && arCoresidents.length > 0) {
                for (var ci = 0; ci < arCoresidents.length; ci++) {
                    var cr = arCoresidents[ci];
                    var crName = (cr.name || '').trim();
                    if (!crName) continue;
                    // แยก firstname / lastname จาก name
                    var crParts = crName.split(/\s+/);
                    var crFirst = crParts[0] || crName;
                    var crLast = crParts.slice(1).join(' ') || '';
                    try {
                        await sbPost('coresidents', {
                            resident_id: arResidentId,
                            house_id:    arHouseId,
                            prefix:      cr.prefix || '',
                            firstname:   crFirst,
                            lastname:    crLast,
                            relation:    cr.relation || ''
                        });
                    } catch(cre) { console.warn('สร้าง coresident ไม่สำเร็จ:', cre); }
                }
            }

            // 6. อัปเดต housing → occupied
            await sbPatch('housing', { id: 'eq.' + arHouseId }, { status: 'occupied', updated_at: new Date().toISOString() });

            // 7. อัปเดต request → approved + บันทึก house + ลายเซ็น
            await sbPatch('requests', { id: 'eq.' + arReqId }, {
                status: 'approved', house_id: arHouseId, house_number: arHouseNum,
                reviewed_by: arReviewerId || '', reviewed_at: new Date().toISOString(),
                review_note: data.note || '', updated_at: new Date().toISOString(),
                head_reviewer_name: data.reviewerName || '',
                head_reviewer_position: data.reviewerPosition || null,
                head_signature:     data.signature || null,
                head_reviewed_at:   new Date().toISOString()
            });

            // 8. ลบออกจาก queue
            try {
                var arQRows = await sbGet('queue', { request_id: 'eq.' + arReqId, status: 'eq.waiting' });
                if (arQRows && arQRows.length > 0) {
                    for (var aqi = 0; aqi < arQRows.length; aqi++) {
                        await sbPatch('queue', { id: 'eq.' + arQRows[aqi].id }, { status: 'cancelled', updated_at: new Date().toISOString() });
                    }
                }
            } catch(aqe) { console.warn('Queue remove failed:', aqe); }

            // 9. อัปเดต users.subject_group ถ้ามีข้อมูล
            if (arUserId && (arDetails.subject_group || arDetails.subjectGroup)) {
                try {
                    await sbPatch('users', { id: 'eq.' + arUserId }, {
                        subject_group: arDetails.subject_group || arDetails.subjectGroup,
                        updated_at: new Date().toISOString()
                    });
                } catch(ue) { console.warn('อัปเดต users.subject_group ไม่สำเร็จ:', ue); }
            }

            // 10. ล้าง moved_out_at สำหรับ period ปัจจุบัน เพื่อให้ผู้พักใหม่เห็นยอดแจ้ง
            //     (กรณีที่แจ้งยอดไว้แล้วก่อนผู้เดิมย้ายออก ทำให้ outstanding ถูก mark moved_out_at ไป)
            var _arNow = new Date();
            var _arCurrPeriod = (_arNow.getFullYear() + 543) + '-' + String(_arNow.getMonth() + 1).padStart(2, '0');
            try {
                await sbPatch('outstanding',
                    { house_number: 'eq.' + arHouseNum, period: 'eq.' + _arCurrPeriod, moved_out_at: 'not.is.null' },
                    { moved_out_at: null, updated_at: new Date().toISOString() }
                );
            } catch(e) {}

            invalidateResidentCache();
            return { success: true, residentId: arResidentId, houseNumber: arHouseNum };
        }

        /* ── Check Duplicate Resident (ตรวจชื่อซ้ำ) ── */
        case 'checkDuplicateResident': {
            var cdFirst = (data.firstname || '').trim();
            var cdLast = (data.lastname || '').trim();
            if (!cdFirst || !cdLast) return { success: true, duplicates: [] };
            var cdRows = await sbGet('residents', { firstname: 'eq.' + cdFirst, lastname: 'eq.' + cdLast, is_active: 'eq.true' });
            var cdResult = (cdRows || []).map(function(r) {
                return { id: r.id, house_number: r.house_number, prefix: r.prefix, firstname: r.firstname, lastname: r.lastname, email: r.email };
            });
            return { success: true, duplicates: cdResult };
        }

        /* ── batchGet: run multiple read actions in one call ── */
        case 'batchGet': {
            var keys = (data.keys || '').split(',').map(function(k) { return k.trim(); }).filter(Boolean);
            var batchResults = {};
            for (var bi = 0; bi < keys.length; bi++) {
                try {
                    batchResults[keys[bi]] = await _routeAction(keys[bi], {});
                } catch(e) {
                    batchResults[keys[bi]] = { success: false, error: e.message };
                }
            }
            return { success: true, results: batchResults };
        }

        /* ── Housing Format ─────────────────────── */
        case 'saveHousingFormat': {
            var fmtEntries = [
                ['house_number_format', data.houseFormat || 'default'],
                ['house_prefix',        data.housePrefix || 'บ้านพัก'],
                ['flat_number_format',  data.flatFormat  || 'default'],
                ['flat_prefix',         data.flatPrefix  || 'แฟลต']
            ];
            for (var i = 0; i < fmtEntries.length; i++) {
                await sbUpsert('settings', { key: fmtEntries[i][0], value: fmtEntries[i][1] }, 'key');
            }
            return { success: true };
        }

        /* ── Resident CRUD (admin) ───────────────── */
        case 'addResident': {
            var _residentType = (data.residentType || data.resident_type || 'staff');
            // ผู้ร่วมพักอาศัย (cohabitant) หรือผู้พักอาศัยที่ไม่มีบัญชีผู้ใช้ — ไม่ต้องสร้าง user
            var _noAccount = (_residentType === 'cohabitant' || _residentType === 'no_account');
            var email = (data.email || '').trim().toLowerCase();
            var uid = null;
            if (!_noAccount) {
                // สร้าง user account สำหรับ staff / ผู้พักอาศัยที่มีบัญชี
                uid = 'USR-' + Date.now().toString(36).toUpperCase();
                var pwRaw = '';
                if (data.password) {
                    try { pwRaw = atob(data.password); } catch(e4) { pwRaw = data.password; }
                }
                // สร้าง random password ถ้าไม่ได้ระบุ (บังคับเปลี่ยนตอนเข้าครั้งแรก)
                if (!pwRaw) {
                    var _rndArr = new Uint8Array(16);
                    (typeof crypto !== 'undefined' && crypto.getRandomValues) ? crypto.getRandomValues(_rndArr) : _rndArr.forEach(function(v,i,a){ a[i] = Math.floor(Math.random()*256); });
                    pwRaw = Array.from(_rndArr, function(b) { return b.toString(16).padStart(2, '0'); }).join('');
                }
                var pwHash = await sha256hexSalted(pwRaw, email || uid + '@local.ppk');
                // สร้าง user (เพื่อ login ได้) — users table มี phone, email, position
                await sbPost('users', {
                    id: uid, email: email || uid + '@local.ppk',
                    firstname: data.firstname || '', lastname: data.lastname || '',
                    prefix: data.prefix || '', phone: data.phone || '',
                    role: 'resident', position: data.position || '',
                    is_active: true, pdpa_consent: false,
                    password_hash: pwHash
                });
                // ตั้ง flag บังคับเปลี่ยนรหัสผ่านครั้งแรก (retry 1 ครั้งถ้า fail)
                var _flagKey = 'must_change_pw_' + uid;
                try { await sbUpsert('settings', { key: _flagKey, value: 'true' }, 'key'); } catch(e1) {
                    console.warn('set must_change_pw flag attempt 1 failed:', e1);
                    try { await sbPost('settings', { key: _flagKey, value: 'true' }); } catch(e2) { console.warn('set must_change_pw flag attempt 2 failed:', e2); }
                }
            }
            // หา house_id จาก house_number (ลองหลายวิธี)
            var houseId = null;
            var _hn = (data.house_number || '').trim();
            if (_hn) {
                var hRow = await sbGet('housing', { house_number: 'eq.' + _hn, select: 'id', limit: '1' });
                houseId = hRow && hRow[0] ? hRow[0].id : null;
                // Fallback: ลอง ilike ถ้า eq ไม่เจอ
                if (!houseId) {
                    var hRow2 = await sbGet('housing', { house_number: 'ilike.' + _hn, select: 'id', limit: '1' });
                    houseId = hRow2 && hRow2[0] ? hRow2[0].id : null;
                }
            }
            var _resWarning = '';
            if (!houseId && _hn) _resWarning = 'ไม่พบเลขที่บ้าน "' + _hn + '" ในระบบ — บันทึกผู้พักอาศัยแล้ว แต่ยังไม่ผูกบ้าน';
            // ตรวจสอบว่าบ้านนี้มีผู้พักอาศัย active อยู่แล้วหรือไม่ (ก่อน insert เพื่อให้ error message ชัดเจน)
            if (houseId) {
                var _existCheck = await sbGet('residents', { house_id: 'eq.' + houseId, is_active: 'eq.true', select: 'id,firstname,lastname', limit: '1' });
                if (_existCheck && _existCheck.length > 0) {
                    // cleanup user ที่สร้างไปแล้ว (ถ้ามี)
                    if (uid) {
                        try { await sbDelete('users', { id: uid }); } catch(eDel2) { console.warn('Cleanup user failed:', eDel2); }
                    }
                    var _existName = (_existCheck[0].firstname || '') + ' ' + (_existCheck[0].lastname || '');
                    return { success: false, error: 'บ้านพักหลังที่ ' + _hn + ' มีผู้พักอาศัยอยู่แล้ว (' + _existName.trim() + ') — กรุณาย้ายผู้พักอาศัยเดิมออกก่อน หรือเลือกบ้านหลังอื่น' };
                }
            }
            // สร้าง resident — ใช้เฉพาะ columns ที่มีใน schema
            var _resBody = {
                house_number: _hn,
                prefix:       data.prefix    || '',
                firstname:    data.firstname || '',
                lastname:     data.lastname  || '',
                position:     data.position  || '',
                email:        email || '',
                phone:        data.phone     || '',
                resident_type: _residentType,
                is_active:    true
            };
            if (uid) _resBody.user_id = uid;
            if (houseId) _resBody.house_id = houseId;
            var newRes = null;
            try {
                newRes = await sbPost('residents', _resBody);
            } catch(eRes) {
                // Cleanup: ลบ user ที่สร้างไปแล้ว เพื่อไม่ให้เป็น orphan
                if (uid) {
                    try { await sbDelete('users', { id: uid }); } catch(eDel) { console.warn('Cleanup created user failed:', eDel); }
                }
                var errMsg = eRes.message || 'ไม่ทราบสาเหตุ';
                if (errMsg.indexOf('idx_residents_one_active_per_house') !== -1) {
                    return { success: false, error: 'บ้านพักหลังที่ ' + (_hn || '?') + ' มีผู้พักอาศัย active อยู่แล้ว — กรุณาย้ายผู้พักอาศัยเดิมออกก่อน' };
                }
                if (errMsg.indexOf('not-null') !== -1 && errMsg.indexOf('house_id') !== -1) {
                    return { success: false, error: 'ไม่พบบ้านเลขที่ "' + _hn + '" ในระบบ กรุณาตรวจสอบเลขที่บ้าน' };
                }
                return { success: false, error: 'สร้างผู้พักอาศัยไม่สำเร็จ: ' + errMsg };
            }
            invalidateResidentCache();
            var _ret = { success: true, residentId: newRes ? newRes.id : null };
            if (uid) _ret.userId = uid;
            if (_resWarning) _ret.warning = _resWarning;
            return _ret;
        }
        case 'updateResident': {
            var rid = data.id;
            // สำรองข้อมูลเดิมก่อนแก้ไข (auto-backup)
            try { var _bakRes = await sbGet('residents', { id: 'eq.' + rid }); await _autoBackup('updateResident', 'แก้ไขผู้พักอาศัย ' + (data.firstname || rid), 'residents', 'id', rid, null, _bakRes); } catch(e) {}
            // อัปเดต residents table — ใช้เฉพาะ schema columns
            var resUp = { updated_at: new Date().toISOString() };
            if (data.prefix       !== undefined) resUp.prefix       = data.prefix;
            if (data.firstname    !== undefined) resUp.firstname    = data.firstname;
            if (data.lastname     !== undefined) resUp.lastname     = data.lastname;
            if (data.position     !== undefined) resUp.position     = data.position;
            if (data.house_number !== undefined) {
                resUp.house_number = data.house_number;
                // อัปเดต house_id ให้ตรงกับ house_number ใหม่
                if (data.house_number) {
                    var hLookup = await sbGet('housing', { house_number: 'eq.' + data.house_number, select: 'id', limit: '1' });
                    resUp.house_id = hLookup && hLookup[0] ? hLookup[0].id : null;
                } else {
                    resUp.house_id = null;
                }
            }
            if (data.is_active    !== undefined) resUp.is_active    = data.is_active;
            await sbPatch('residents', { id: 'eq.' + rid }, resUp);
            // sync coresidents ให้ตามไปด้วยเมื่อเปลี่ยนบ้าน
            if (data.house_number !== undefined && resUp.house_id) {
                try { await sbPatch('coresidents', { resident_id: 'eq.' + rid }, { house_id: resUp.house_id }); } catch(e) {}
            }
            var resRow = await sbGet('residents', { id: 'eq.' + rid, select: 'user_id', limit: '1' });
            if (resRow && resRow[0] && resRow[0].user_id) {
                var userUp = { updated_at: new Date().toISOString() };
                if (data.phone     !== undefined) userUp.phone     = data.phone;
                if (data.email     !== undefined) userUp.email     = (data.email || '').trim().toLowerCase();
                if (data.position  !== undefined) userUp.position  = data.position;
                if (data.prefix    !== undefined) userUp.prefix    = data.prefix;
                if (data.firstname !== undefined) userUp.firstname = data.firstname;
                if (data.lastname  !== undefined) userUp.lastname  = data.lastname;
                if (data.is_active !== undefined) userUp.is_active = data.is_active;
                if (data.password) {
                    var pw2 = '';
                    try { pw2 = atob(data.password); } catch(e3) { pw2 = data.password; }
                    var urEmail = (data.email || userUp.email || '').trim().toLowerCase();
                    if (!urEmail) {
                        var urU = await sbGet('users', { id: 'eq.' + resRow[0].user_id, select: 'email', limit: '1' });
                        urEmail = urU && urU[0] ? (urU[0].email || '').trim().toLowerCase() : '';
                    }
                    userUp.password_hash = await sha256hexSalted(pw2, urEmail);
                }
                await sbPatch('users', { id: 'eq.' + resRow[0].user_id }, userUp);
            }
            invalidateResidentCache();
            return { success: true };
        }
        /* ── Phase H: ยกเลิกการย้ายออก ──────────── */
        case 'reactivateResident': {
            if (!data.residentId) return { success: false, error: 'ไม่ระบุ residentId' };
            var _raSess = await _getSessionRole();
            if (!_raSess || (_raSess.role !== 'admin' && _raSess.role !== 'head')) return { success: false, error: 'สิทธิ์ไม่เพียงพอ' };

            // ดึง resident ที่ inactive
            var _raResRows = await sbGet('residents', { id: 'eq.' + data.residentId, is_active: 'eq.false', limit: '1' }).catch(function() { return []; });
            if (!_raResRows || !_raResRows[0]) return { success: false, error: 'ไม่พบผู้พักอาศัย หรือยังคง active อยู่' };
            var _raRes = _raResRows[0];
            var _raHouseNum = _raRes.house_number;
            var _raUserId = _raRes.user_id;

            // ตรวจว่าบ้านยัง available (ถ้าถูกจัดให้คนอื่นแล้ว ห้าม reactivate)
            var _raHousingRows = await sbGet('housing', { house_number: 'eq.' + _raHouseNum, select: 'id,status', limit: '1' }).catch(function() { return []; });
            var _raHousing = _raHousingRows && _raHousingRows[0];
            if (!_raHousing) return { success: false, error: 'ไม่พบข้อมูลบ้านพัก ' + _raHouseNum };
            if (_raHousing.status !== 'available') return { success: false, error: 'บ้านพัก ' + _raHouseNum + ' ถูกจัดให้ผู้อื่นแล้ว ไม่สามารถยกเลิกการย้ายออกได้' };

            // 1. reactivate resident
            await sbPatch('residents', { id: 'eq.' + data.residentId }, { is_active: true, end_date: null, updated_at: new Date().toISOString() });

            // 2. housing → occupied
            await sbPatch('housing', { id: 'eq.' + _raHousing.id }, { status: 'occupied', updated_at: new Date().toISOString() });

            // 3. ยกเลิก moved_out_at บน outstanding
            if (_raHouseNum) {
                try { await sbPatch('outstanding', { house_number: 'eq.' + _raHouseNum, moved_out_at: 'not.is.null', status: 'neq.paid' }, { moved_out_at: null }); } catch(e) {}
            }

            // 4. reactivate user account
            if (_raUserId) {
                await sbPatch('users', { id: 'eq.' + _raUserId }, { is_active: true, updated_at: new Date().toISOString() });
            }

            invalidateResidentCache();
            _logActivity('reactivate_resident', _raSess.userId, 'ยกเลิกการย้ายออก บ้าน ' + _raHouseNum, { residentId: data.residentId, houseNumber: _raHouseNum });
            return { success: true };
        }

        case 'removeResident': {
            var rid = data.id;
            var resRows = await sbGet('residents', { id: 'eq.' + rid, select: 'user_id,email,house_id,house_number', limit: '1' });
            var _rmRes = resRows && resRows[0] ? resRows[0] : null;
            var _rmHouseId     = _rmRes ? _rmRes.house_id     : null;
            var _rmHouseNumber = _rmRes ? _rmRes.house_number : null;

            // สำรองข้อมูล resident เดิมก่อน
            try {
                var _bakRm = await sbGet('residents', { id: 'eq.' + rid });
                // สำรอง coresidents ด้วยในชุดเดียวกัน
                var _bakCorRm = await sbGet('coresidents', { resident_id: 'eq.' + rid });
                await _autoBackup('removeResident', 'ลบ/ปิดใช้งานผู้พักอาศัย ' + rid, 'residents', 'id', rid, null,
                    { residents: _bakRm, coresidents: _bakCorRm });
            } catch(e) {}

            // 1. soft-delete resident + บันทึก end_date
            var _rmToday = new Date().toISOString().split('T')[0];
            await sbPatch('residents', { id: 'eq.' + rid }, { is_active: false, end_date: _rmToday, updated_at: new Date().toISOString() });

            // 2. ตรวจยอดค้างก่อน deactivate user
            //    ถ้ามียอดค้าง → user ยังล็อกอินได้ (เพื่อดูยอดและชำระเงิน)
            //    ถ้าไม่มียอดค้าง → deactivate + ลบ sessions ทันที
            var _rmUserId = _rmRes ? _rmRes.user_id : null;
            if (!_rmUserId && _rmRes && _rmRes.email) {
                var _rmByEmail = await sbGet('users', { email: 'eq.' + _rmRes.email.toLowerCase(), select: 'id', limit: '1' });
                if (_rmByEmail && _rmByEmail[0]) _rmUserId = _rmByEmail[0].id;
            }
            if (_rmUserId) {
                var _rmOutRows = [];
                try { _rmOutRows = await sbGet('outstanding', { house_number: 'eq.' + _rmHouseNumber, status: 'neq.paid' }) || []; } catch(e) {}
                if (_rmOutRows.length === 0) {
                    // ไม่มียอดค้าง → deactivate + ลบ sessions
                    await sbPatch('users', { id: 'eq.' + _rmUserId }, { is_active: false, updated_at: new Date().toISOString() });
                    try { await sbDelete('sessions', { user_id: 'eq.' + _rmUserId }); } catch(e) {}
                }
                // ถ้ามียอดค้าง → user ยังล็อกอินได้ ไม่ต้อง deactivate
            }

            // 3. ลบ coresidents ของผู้พักนี้ (backup เก็บไว้ข้างบนแล้ว)
            try { await sbDelete('coresidents', { resident_id: 'eq.' + rid }); } catch(e) {}

            // 4. reset housing status กลับเป็น available
            if (_rmHouseId) {
                try { await sbPatch('housing', { id: 'eq.' + _rmHouseId }, { status: 'available', updated_at: new Date().toISOString() }); } catch(e) {}
            }

            // Phase G: แจ้งเตือนอีเมลคนแรกในคิวเมื่อบ้านว่าง
            try {
                var _rmQRows = await sbGet('queue', { status: 'eq.waiting', order: 'position.asc', limit: '1' }).catch(function() { return []; });
                if (_rmQRows && _rmQRows[0] && _rmQRows[0].user_id) {
                    var _rmQUserR = await sbGet('users', { id: 'eq.' + _rmQRows[0].user_id, select: 'email,firstname,prefix', limit: '1' }).catch(function() { return []; });
                    if (_rmQUserR && _rmQUserR[0] && _rmQUserR[0].email) {
                        var _rmQU = _rmQUserR[0];
                        var _rmQName = ((_rmQU.prefix||'') + (_rmQU.firstname||'')).trim() || 'ท่าน';
                        await _callEdge('send-email', {
                            to: _rmQU.email,
                            subject: 'บ้านพักว่างแล้ว — บ้านพักครู พะเยาพิทยาคม',
                            html: '<p>เรียน ' + _rmQName + '</p><p>บ้านพัก <strong>เลขที่ ' + (_rmHouseNumber||'') + '</strong> ว่างแล้ว กรุณาติดต่อเจ้าหน้าที่เพื่อดำเนินการต่อไป</p><p>ขอบคุณ<br>ระบบบ้านพักครู พะเยาพิทยาคม</p>',
                            text: 'บ้านพัก ' + (_rmHouseNumber||'') + ' ว่างแล้ว กรุณาติดต่อเจ้าหน้าที่'
                        }).catch(function() {});
                    }
                }
            } catch(e) {}

            // 5. mark outstanding ทั้งหมดของบ้านนี้ว่าเป็นของคนที่ย้ายออกไปแล้ว
            //    คนใหม่จะไม่เห็น rows เหล่านี้ใน dashboard (ทั้ง paid + unpaid)
            if (_rmHouseNumber) {
                try {
                    await sbPatch('outstanding', { house_number: 'eq.' + _rmHouseNumber, moved_out_at: 'is.null' },
                        { moved_out_at: new Date().toISOString() });
                } catch(e) {}
            }

            invalidateResidentCache();
            return { success: true };
        }

        /* ── Announcements CRUD ──────────────────── */
        case 'addAnnouncement': {
            // ถ้า _toggle: true → เปลี่ยนสถานะ is_active ของประกาศที่มีอยู่
            if (data._toggle && data.id) {
                var newActive = data.active !== undefined ? Boolean(data.active) : true;
                await sbPatch('announcements', { id: 'eq.' + data.id }, { is_active: newActive });
                return { success: true };
            }
            var sess = await sbGet('sessions', { token: 'eq.' + getSessionToken(), select: 'user_id', limit: '1' });
            var createdBy = sess && sess[0] ? sess[0].user_id : '';
            // type ≤ priority ค่า: info=0, warning=1, urgent=2 → map priority→type
            var annType = data.type || 'info';
            if (!data.type && data.priority) {
                var p = parseInt(data.priority) || 0;
                annType = p >= 2 ? 'urgent' : p === 1 ? 'warning' : 'info';
            }
            var ann = await sbPost('announcements', {
                title:      data.text || data.title || 'ประกาศ',
                body:       data.body || data.text || '',
                type:       annType,
                is_active:  true,
                created_by: createdBy,
                expires_at: data.expiry || data.expires_at || null
            });
            return { success: true, data: ann };
        }
        case 'deleteAnnouncement': {
            await sbPatch('announcements', { id: 'eq.' + data.id }, { is_active: false });
            return { success: true };
        }

        /* ── Accounting ──────────────────────────── */
        case 'loadAccountingData': {
            var period = data.period || '';
            var [incRows, expRows] = await Promise.all([
                sbGet('accounting_entries', { period: 'eq.' + period, type: 'eq.income',  order: 'recorded_at.asc' }).catch(function() { return []; }),
                sbGet('accounting_entries', { period: 'eq.' + period, type: 'eq.expense', order: 'recorded_at.asc' }).catch(function() { return []; })
            ]);
            var mapRow = function(r) {
                return {
                    id: r.id, amount: parseFloat(r.amount) || 0,
                    name: r.description || '', description: r.description || '',
                    savedAt: r.recorded_at || r.updated_at || '',
                    source: r.category === 'auto' ? 'auto' : 'manual',
                    note: r.category === 'auto' ? '' : (r.category || ''),
                    receipt_url: r.receipt_url || null
                };
            };
            // คำนวณ carryForward = ผลสะสมสุทธิของทุก period ก่อนหน้า (ไม่ใช่แค่เดือนก่อน)
            var carryForward = 0;
            try {
                // period เป็น YYYY-MM สามารถเปรียบเทียบ string ได้โดยตรง
                var [allPrevInc, allPrevExp] = await Promise.all([
                    sbGet('accounting_entries', { period: 'lt.' + period, type: 'eq.income',  select: 'amount' }).catch(function() { return []; }),
                    sbGet('accounting_entries', { period: 'lt.' + period, type: 'eq.expense', select: 'amount' }).catch(function() { return []; })
                ]);
                var totalPrevInc = (allPrevInc || []).reduce(function(s, r) { return s + (parseFloat(r.amount) || 0); }, 0);
                var totalPrevExp = (allPrevExp || []).reduce(function(s, r) { return s + (parseFloat(r.amount) || 0); }, 0);
                carryForward = Math.round((totalPrevInc - totalPrevExp) * 100) / 100;
            } catch(e) { carryForward = 0; }
            return { success: true, incomeItems: (incRows || []).map(mapRow), expenseItems: (expRows || []).map(mapRow), carryForward: carryForward };
        }

        /* ── getAnnualReport — รายงานสรุปรายปี ─── */
        case 'getAnnualReport': {
            return await getAnnualReport(data.year);
        }

        /* ── Warnings — ระบบตักเตือน ────────────── */
        case 'createWarning':      return await createWarning(data);
        case 'getWarningsByUser':  return await getWarningsByUser(data.userId);
        case 'getWarningsByHouse': return await getWarningsByHouse(data.houseId);
        case 'getAllWarnings':      return await getAllWarnings();
        case 'acknowledgeWarning': return await acknowledgeWarning(data.warningId);

        /* ── Inspections — ระบบตรวจสภาพบ้าน ────── */
        case 'createInspection': return await createInspection(data);
        case 'getInspection':    return await getInspection(data.requestId);

        /* ── Meetings — ระบบบันทึกการประชุม ─────── */
        case 'createMeeting':  return await createMeeting(data);
        case 'updateMeeting':  return await updateMeeting(data);
        case 'getMeetings':    return await getMeetings(data);
        case 'getMeetingById': return await getMeetingById(data.id);
        case 'approveMeeting': return await approveMeeting(data.id, data.approvedBy);

        /* ── MOU — ระบบสัญญาเช่า ────────────────── */
        case 'createMouDraft':      return await createMouDraft(data);
        case 'getMouByRequest':     return await getMouByRequest(data.requestId);
        case 'getMousByResident':   return await getMousByResident(data.residentId);
        case 'getAllMous':           return await getAllMous(data);
        case 'uploadMouSignature':  return await uploadMouSignature(data);
        case 'uploadMouScan':       return await uploadMouScan(data);

        /* ── loadAndSyncAccounting — sync auto entries แล้ว load ข้อมูลบัญชี ─── */
        case 'loadAndSyncAccounting': {
            var period = data.period || '';
            // 1. Sync: ลบ auto entries เก่า แล้ว insert ใหม่ที่ถูกต้อง
            await _autoSyncAccounting(period);
            // 2. Load: ดึงข้อมูลทั้งหมด (manual + auto ใหม่)
            var [incRows, expRows] = await Promise.all([
                sbGet('accounting_entries', { period: 'eq.' + period, type: 'eq.income',  order: 'recorded_at.asc' }).catch(function() { return []; }),
                sbGet('accounting_entries', { period: 'eq.' + period, type: 'eq.expense', order: 'recorded_at.asc' }).catch(function() { return []; })
            ]);
            var mapRow2 = function(r) {
                return {
                    id: r.id, amount: parseFloat(r.amount) || 0,
                    name: r.description || '', description: r.description || '',
                    savedAt: r.recorded_at || r.updated_at || '',
                    source: r.category === 'auto' ? 'auto' : 'manual',
                    note: r.category === 'auto' ? '' : (r.category || ''),
                    receipt_url: r.receipt_url || null
                };
            };
            // คำนวณ carryForward จาก period ก่อนหน้า (หลัง sync แล้ว ตัวเลขถูกต้อง)
            var carryForward2 = 0;
            try {
                var [allPrevInc2, allPrevExp2] = await Promise.all([
                    sbGet('accounting_entries', { period: 'lt.' + period, type: 'eq.income',  select: 'amount' }).catch(function() { return []; }),
                    sbGet('accounting_entries', { period: 'lt.' + period, type: 'eq.expense', select: 'amount' }).catch(function() { return []; })
                ]);
                var totalPrevInc2 = (allPrevInc2 || []).reduce(function(s, r) { return s + (parseFloat(r.amount) || 0); }, 0);
                var totalPrevExp2 = (allPrevExp2 || []).reduce(function(s, r) { return s + (parseFloat(r.amount) || 0); }, 0);
                carryForward2 = Math.round((totalPrevInc2 - totalPrevExp2) * 100) / 100;
            } catch(e) { carryForward2 = 0; }
            // sort auto expense items ตามลำดับที่กำหนด
            var _expSortOrder = { 'ส่วนต่างค่าไฟ (ติดลบ)': 1, 'ค่า Lost ไฟฟ้า (บ้านพัก)': 2, 'ค่า Lost ไฟฟ้า (แฟลต)': 3, 'ค่าขยะ': 4 };
            var _expMapped = (expRows || []).map(mapRow2);
            _expMapped.sort(function(a, b) {
                var sa = a.source === 'auto' ? (_expSortOrder[a.name] || (a.name.indexOf('ค่าไฟขั้นต่ำ') >= 0 ? 4 : a.name.indexOf('ค่าดำเนิน') >= 0 ? 5 : a.name.indexOf('ค่าเดินทาง') >= 0 ? 6 : 4.5)) : 100;
                var sb = b.source === 'auto' ? (_expSortOrder[b.name] || (b.name.indexOf('ค่าไฟขั้นต่ำ') >= 0 ? 4 : b.name.indexOf('ค่าดำเนิน') >= 0 ? 5 : b.name.indexOf('ค่าเดินทาง') >= 0 ? 6 : 4.5)) : 100;
                return sa - sb;
            });
            // sort auto income items: ค่าส่วนกลาง ก่อน ส่วนต่างค่าไฟ
            var _incMapped = (incRows || []).map(mapRow2);
            _incMapped.sort(function(a, b) {
                var sa = a.source === 'auto' ? (a.name.indexOf('ค่าส่วนกลาง') >= 0 ? 1 : a.name.indexOf('ส่วนต่าง') >= 0 ? 2 : 3) : 100;
                var sb = b.source === 'auto' ? (b.name.indexOf('ค่าส่วนกลาง') >= 0 ? 1 : b.name.indexOf('ส่วนต่าง') >= 0 ? 2 : 3) : 100;
                return sa - sb;
            });
            return { success: true, incomeItems: _incMapped, expenseItems: _expMapped, carryForward: carryForward2 };
        }
        case 'calculateAutoEntries': {
            var period = data.period || '';
            // ดึงค่าส่วนกลางจาก notifications + ตรวจ exemptions เพื่อกรองบ้านที่ยกเว้น
            var [notifRes, _caeExemptRows] = await Promise.all([
                sbGet('notifications', { period: 'eq.' + period, select: 'common_fee,house_number' }).catch(function() { return []; }),
                sbGet('exemptions', { type: 'eq.common_fee', select: 'house_number' }).catch(function() { return []; })
            ]);
            var _caeExemptSet = {};
            (_caeExemptRows || []).forEach(function(ex) { if (ex.house_number) _caeExemptSet[ex.house_number] = true; });
            var commonTotal = (notifRes || []).reduce(function(s, r) {
                if (_caeExemptSet[r.house_number]) return s;
                return s + (parseFloat(r.common_fee) || 0);
            }, 0);
            // ดึง pea_total + lost_house + lost_flat จาก settings และคำนวณส่วนต่างจาก electric_bills จริง
            var electricDiff = 0, lostHouseAmt = 0, lostFlatAmt = 0;
            try {
                var lostRows = await sbGet('settings', { key: 'eq.electric_lost_' + period });
                if (lostRows && lostRows[0]) {
                    var ld = JSON.parse(lostRows[0].value);
                    lostHouseAmt = parseFloat(ld.lost_house) || 0;
                    lostFlatAmt = parseFloat(ld.lost_flat) || 0;
                    var peaTotal = parseFloat(ld.pea_total) || 0;
                    // คำนวณส่วนต่างจากยอดเก็บจริง (SUM amount) + lost - PEA
                    if (peaTotal > 0) {
                        var eBills = await sbGet('electric_bills', { period: 'eq.' + period, select: 'amount' }).catch(function() { return []; });
                        var eBillTotal = (eBills || []).reduce(function(s, r) { return s + (parseFloat(r.amount) || 0); }, 0);
                        electricDiff = Math.round((eBillTotal + lostHouseAmt + lostFlatAmt - peaTotal) * 100) / 100;
                    }
                }
            } catch(e) {}
            // ดึงค่าขยะ + ค่าใช้จ่ายอื่นๆ + ค่าดำเนินการ จาก monthly_withdraw
            var withdrawGarbage = 0;
            var withdrawAdditionalItems = [];
            var withdrawOperatingCosts = {};
            try {
                var wdRows = await sbGet('settings', { key: 'eq.monthly_withdraw_' + period });
                if (wdRows && wdRows[0]) {
                    var wd = JSON.parse(wdRows[0].value);
                    withdrawGarbage = parseFloat(wd.garbageFee) || 0;
                    if (wd.additionalItems && wd.additionalItems.length) {
                        for (var ai = 0; ai < wd.additionalItems.length; ai++) {
                            var itm = wd.additionalItems[ai];
                            if (itm.name && parseFloat(itm.amount) > 0) {
                                withdrawAdditionalItems.push({ name: itm.name, amount: parseFloat(itm.amount) });
                            }
                        }
                    }
                    withdrawOperatingCosts = wd.operatingCosts || {};
                }
            } catch(e) {}
            // fallback: ถ้า monthly_withdraw ไม่มีค่าขยะ ดึงจาก notifications
            if (withdrawGarbage <= 0) {
                try {
                    var gfSettRow2 = await sbGet('settings', { key: 'eq.garbage_fee' });
                    var gfRate2 = (gfSettRow2 && gfSettRow2[0]) ? parseFloat(gfSettRow2[0].value) || 0 : 0;
                    if (gfRate2 > 0) {
                        var gfNotifs2 = await sbGet('notifications', { period: 'eq.' + period, select: 'garbage_fee' }).catch(function(){ return []; });
                        var gfTotal2 = (gfNotifs2 || []).reduce(function(s,r){ return s + (parseFloat(r.garbage_fee) || 0); }, 0);
                        if (gfTotal2 > 0) withdrawGarbage = gfTotal2;
                    }
                } catch(e) {}
            }
            var incomeItems = [];
            var expenseItems = [];
            if (commonTotal > 0)    incomeItems.push({ name: 'ค่าส่วนกลาง', amount: commonTotal });
            if (electricDiff > 0) incomeItems.push({ name: 'ส่วนต่างค่าไฟ', amount: electricDiff });
            if (electricDiff < 0) expenseItems.push({ name: 'ส่วนต่างค่าไฟ (ติดลบ)', amount: Math.abs(electricDiff) });
            if (lostHouseAmt > 0)  expenseItems.push({ name: 'ค่า Lost ไฟฟ้า (บ้านพัก)', amount: lostHouseAmt });
            if (lostFlatAmt > 0)   expenseItems.push({ name: 'ค่า Lost ไฟฟ้า (แฟลต)', amount: lostFlatAmt });
            if (withdrawGarbage > 0) expenseItems.push({ name: 'ค่าขยะ', amount: withdrawGarbage });
            for (var wi = 0; wi < withdrawAdditionalItems.length; wi++) {
                expenseItems.push({ name: withdrawAdditionalItems[wi].name, amount: withdrawAdditionalItems[wi].amount });
            }
            // ค่าดำเนินการ
            var ocRounding2 = parseFloat(withdrawOperatingCosts.roundingFee) || 0;
            var ocTW2 = parseFloat(withdrawOperatingCosts.travelWithdraw) || 0;
            var ocTE2 = parseFloat(withdrawOperatingCosts.travelElectric) || 0;
            var ocTG2 = parseFloat(withdrawOperatingCosts.travelGarbage) || 0;
            if (ocRounding2 > 0) expenseItems.push({ name: 'ค่าดำเนินการ (ปัดเศษ)', amount: ocRounding2 });
            if (ocTW2 > 0) expenseItems.push({ name: 'ค่าเดินทางถอนเงิน', amount: ocTW2 });
            if (ocTE2 > 0) expenseItems.push({ name: 'ค่าเดินทางชำระค่าไฟ', amount: ocTE2 });
            if (ocTG2 > 0) expenseItems.push({ name: 'ค่าเดินทางชำระค่าขยะ', amount: ocTG2 });
            return { success: true, incomeItems: incomeItems, expenseItems: expenseItems };
        }
        case 'saveAccounting': {
            var period = data.period || '';
            var sess = await sbGet('sessions', { token: 'eq.' + getSessionToken(), select: 'user_id', limit: '1' });
            var recordedBy = sess && sess[0] ? sess[0].user_id : '';
            // สำรองข้อมูลเดิมก่อนลบ (auto-backup) และเก็บไว้เพื่อ rollback
            var _bakA = [];
            try { _bakA = await sbGet('accounting_entries', { period: 'eq.' + period }); await _autoBackup('saveAccounting', 'บันทึกบัญชีงวด ' + period, 'accounting_entries', 'period', period, recordedBy, _bakA); } catch(e) {}
            // ลบทุก entry ของ period นี้แล้ว insert ใหม่ทั้งหมด
            await sbDelete('accounting_entries', { period: 'eq.' + period });
            // หา year / month จาก period (YYYY-MM)
            var pParts = period.split('-');
            var pYear  = parseInt(pParts[0]) || new Date().getFullYear();
            var pMonth = parseInt(pParts[1]) || (new Date().getMonth() + 1);
            // รวม income + expense เป็น array เดียวเพื่อ batch insert ครั้งเดียว
            var _allEntries = [];
            for (var i = 0; i < (data.incomeItems || []).length; i++) {
                var it = data.incomeItems[i];
                _allEntries.push({ period: period, year: pYear, month: pMonth,
                    type: 'income',
                    category: it.source === 'auto' ? 'auto' : (it.note || 'manual'),
                    description: it.name || it.description || '',
                    amount: it.amount || 0,
                    receipt_url: it.receiptUrl || null,
                    recorded_by: recordedBy,
                    recorded_at: it.date || new Date().toISOString() });
            }
            for (var j = 0; j < (data.expenseItems || []).length; j++) {
                var et = data.expenseItems[j];
                _allEntries.push({ period: period, year: pYear, month: pMonth,
                    type: 'expense',
                    category: et.source === 'auto' ? 'auto' : (et.note || 'manual'),
                    description: et.name || et.description || '',
                    amount: et.amount || 0,
                    receipt_url: et.receiptUrl || null,
                    recorded_by: recordedBy,
                    recorded_at: et.date || new Date().toISOString() });
            }
            try {
                if (_allEntries.length > 0) await sbPost('accounting_entries', _allEntries);
            } catch(e) {
                // ── Rollback: คืนข้อมูลเดิม ──
                try {
                    if (_bakA && _bakA.length > 0) {
                        var _restoreEntries = _bakA.map(function(r) {
                            return { period: r.period, year: r.year, month: r.month,
                                type: r.type, category: r.category, description: r.description,
                                amount: r.amount, receipt_url: r.receipt_url,
                                recorded_by: r.recorded_by, recorded_at: r.recorded_at };
                        });
                        await sbPost('accounting_entries', _restoreEntries);
                    }
                } catch(re) { console.error('Rollback failed:', re); }
                return { success: false, error: 'บันทึกไม่สำเร็จ กรุณาลองใหม่: ' + (e.message || 'ข้อผิดพลาด') };
            }
            return { success: true };
        }
        case 'uploadReceiptImage': {
            // รับ base64 data URL → อัปโหลดไปยัง storage bucket 'receipts'
            var b64 = data.base64 || '';
            if (!b64.startsWith('data:')) return { success: false, error: 'ไม่ใช่ base64 image' };
            var mimeMatch = b64.match(/data:([^;]+);base64,(.+)/);
            if (!mimeMatch) return { success: false, error: 'รูปแบบ base64 ไม่ถูกต้อง' };
            var mime = mimeMatch[1];
            if (!_validateMime(mime, false)) return { success: false, error: 'รองรับเฉพาะรูปภาพ JPG, PNG, WEBP, GIF เท่านั้น' };
            var raw  = mimeMatch[2];
            // แปลง base64 → Uint8Array
            var binary = atob(raw);
            var bytes  = new Uint8Array(binary.length);
            for (var k = 0; k < binary.length; k++) { bytes[k] = binary.charCodeAt(k); }
            var ext  = mime.includes('png') ? 'png' : 'jpg';
            // ── เก็บใน bucket 'slips' โฟลเดอร์: {บ้านเลขที่}/{YYYY-MM}/{timestamp}.ext ──
            var slipHouse = (data.houseNumber || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
            var slipMonth = new Date().toISOString().slice(0, 7);
            var path = slipHouse + '/' + slipMonth + '/' + Date.now() + '.' + ext;
            var blob = new Blob([bytes], { type: mime });
            var upRes = await window._sb.storage.from('slips').upload(path, blob, { contentType: mime, upsert: false });
            if (upRes.error) {
                return { success: false, error: 'อัปโหลดไม่สำเร็จ: ' + (upRes.error.message || 'ข้อผิดพลาดไม่ทราบสาเหตุ') };
            }
            var pubData = window._sb.storage.from('slips').getPublicUrl(path);
            return { success: true, fileId: pubData.data.publicUrl };
        }

        /* ── Email (Resend via Edge Function) ───────── */
        case 'sendEmail': {
            var emailResult = await _callEdge('send-email', {
                to:      data.to,
                subject: data.subject,
                html:    data.html || null,
                text:    data.text || null,
                replyTo: data.replyTo || null
            });
            if (emailResult && emailResult.success) return { success: true, id: emailResult.id };
            return { success: false, error: emailResult ? (emailResult.error || 'ส่งอีเมลไม่สำเร็จ') : 'Edge Function ไม่ตอบสนอง' };
        }

        /* ── getEmailSettings ─────────────────────────── */
        case 'getEmailSettings': {
            var lsRows = await sbGet('settings', {});
            var lsMap = {};
            (lsRows || []).forEach(function(r) { lsMap[r.key] = r.value; });
            return { success: true, settings: {
                gmail_app_password: lsMap['gmail_app_password'] || '',
                email_from:      lsMap['email_from']      || '',
                email_from_name: lsMap['email_from_name'] || ''
            }};
        }

        /* ── saveEmailSettings ─────────────────────────── */
        case 'saveEmailSettings': {
            var esEntries = [
                ['gmail_app_password', data.gmail_app_password || ''],
                ['email_from',       data.email_from       || ''],
                ['email_from_name',  data.email_from_name  || '']
            ];
            for (var ei = 0; ei < esEntries.length; ei++) {
                await sbUpsert('settings', { key: esEntries[ei][0], value: esEntries[ei][1] }, 'key');
            }
            return { success: true };
        }

        /* ── cleanupOldSlips (trigger via Edge) ─────── */
        case 'cleanupOldSlips': {
            var cleanResult = await _callEdge('cleanup-old-slips', {});
            return cleanResult || { success: false, error: 'Edge Function ไม่ตอบสนอง' };
        }

        /* ── getStaffCoresidents — ดึงผู้ร่วมพักอาศัยที่เป็นบุคลากร ─── */
        case 'getStaffCoresidents': {
            var cRows = await sbGet('coresidents', { select: '*, residents!inner(id, prefix, firstname, lastname, house_id, housing!inner(house_number)), users!inner(position, phone)' });
            var mapped = (cRows || []).map(function (c) {
                var r = c.residents || {};
                var u = c.users || {};
                var h = r.housing || {};
                return {
                    id: c.id,
                    prefix: c.prefix || '',
                    firstname: c.firstname || '',
                    lastname: c.lastname || '',
                    relation: c.relation || '',
                    resident_name: (r.prefix || '') + (r.firstname || '') + ' ' + (r.lastname || ''),
                    house_number: h.house_number || '',
                    position: u.position || '',
                    phone: u.phone || ''
                };
            });
            return { success: true, data: mapped };
        }

        /* ── getUsersList — ดึง users ทั้งหมด (สำหรับจัดการสิทธิ์) ─── */
        case 'getUsersList': {
            var allUsers = await sbGet('users', { is_active: 'eq.true', select: 'id,email,prefix,firstname,lastname,role,position,phone,created_at' });
            allUsers = (allUsers || []).map(function(u) {
                return {
                    id: u.id, user_id: u.id,
                    email: u.email || '', prefix: u.prefix || '',
                    firstname: u.firstname || '', lastname: u.lastname || '',
                    role: u.role || 'user', position: u.position || '',
                    phone: u.phone || '', created_at: u.created_at || ''
                };
            });
            // เสริมข้อมูล house_number จาก residents table และ coresidents
            var userIds = allUsers.map(function(u) { return u.id; }).filter(Boolean);
            if (userIds.length > 0) {
                try {
                    var resRows = await sbGet('residents', { user_id: 'in.(' + userIds.join(',') + ')', is_active: 'eq.true', select: 'user_id,house_number' });
                    var houseMap = {};
                    (resRows || []).forEach(function(r) { if (r.user_id) houseMap[r.user_id] = r.house_number; });
                    var coRows = await sbGet('coresidents', { user_id: 'in.(' + userIds.join(',') + ')', select: 'user_id,resident_id' });
                    if (coRows && coRows.length > 0) {
                        var resIds = coRows.map(function(c) { return c.resident_id; }).filter(Boolean);
                        if (resIds.length > 0) {
                            var mainRes = await sbGet('residents', { id: 'in.(' + resIds.join(',') + ')', select: 'id,house_number' });
                            var mainMap = {};
                            (mainRes || []).forEach(function(m) { mainMap[m.id] = m.house_number; });
                            coRows.forEach(function(c) { if (c.user_id && c.resident_id && mainMap[c.resident_id]) houseMap[c.user_id] = mainMap[c.resident_id]; });
                        }
                    }
                    allUsers.forEach(function(u) { u.house_number = houseMap[u.id] || ''; });
                } catch(e) {}
            }
            return { success: true, data: allUsers };
        }

        /* ── getMemberStatus — สถานะสมาชิก + สิทธิ์ ─── */
        case 'getMemberStatus': {
            var residents = await sbGet('residents', { is_active: 'eq.true', order: 'house_number.asc' });
            residents = residents || [];
            // ดึง user accounts ที่ link กับ residents
            var uids = residents.map(function(r) { return r.user_id; }).filter(Boolean);
            var usersArr = [];
            if (uids.length > 0) {
                try { usersArr = await sbGet('users', { id: 'in.(' + uids.join(',') + ')', select: 'id,email,role,is_active,created_at' }); } catch(e) {}
            }
            var uMap = {};
            (usersArr || []).forEach(function(u) { uMap[u.id] = u; });
            // Auto-link: residents ที่ไม่มี user_id แต่มี email → ค้นหา user จาก email แล้วเชื่อมอัตโนมัติ
            var orphanEmails = residents.filter(function(r) { return !r.user_id && r.email; }).map(function(r) { return r.email.toLowerCase(); });
            if (orphanEmails.length > 0) {
                try {
                    var matchedUsers = await sbGet('users', { email: 'in.(' + orphanEmails.join(',') + ')', select: 'id,email,role,is_active,created_at' });
                    (matchedUsers || []).forEach(function(mu) {
                        uMap[mu.id] = mu;
                        for (var ri = 0; ri < residents.length; ri++) {
                            if (!residents[ri].user_id && residents[ri].email && residents[ri].email.toLowerCase() === mu.email.toLowerCase()) {
                                residents[ri].user_id = mu.id;
                                try { sbPatch('residents', { id: 'eq.' + residents[ri].id }, { user_id: mu.id }); } catch(e2) {}
                                break;
                            }
                        }
                    });
                    // อัปเดต uids สำหรับ permissions query
                    uids = residents.map(function(r) { return r.user_id; }).filter(Boolean);
                } catch(e) {}
            }
            // ดึง permissions ทั้งหมด
            var allPerms = [];
            if (uids.length > 0) {
                try { allPerms = await sbGet('permissions', { user_id: 'in.(' + uids.join(',') + ')', select: 'user_id,permission' }); } catch(e) {}
            }
            var permMap = {};
            (allPerms || []).forEach(function(p) {
                if (!permMap[p.user_id]) permMap[p.user_id] = [];
                permMap[p.user_id].push(p.permission);
            });
            // ดึง pending registrations
            var pendRegs = [];
            try { pendRegs = await sbGet('pending_registrations', { status: 'eq.pending', select: 'email,firstname,lastname,prefix' }); } catch(e) {}
            var pendEmailSet = {};
            (pendRegs || []).forEach(function(pr) { if (pr.email) pendEmailSet[pr.email.toLowerCase()] = pr; });
            // รวมข้อมูล
            var result = residents.map(function(r) {
                var u = r.user_id ? uMap[r.user_id] : null;
                var perms = (u && permMap[u.id]) ? permMap[u.id] : [];
                var regStatus = 'not_registered';
                if (u && u.is_active) regStatus = 'registered';
                else if (u && !u.is_active) regStatus = 'disabled';
                else if (r.email && pendEmailSet[r.email.toLowerCase()]) regStatus = 'pending';
                return {
                    house_number: r.house_number || '',
                    prefix: r.prefix || '',
                    firstname: r.firstname || '',
                    lastname: r.lastname || '',
                    position: r.position || '',
                    email: r.email || (u ? u.email : '') || '',
                    role: u ? u.role : '',
                    reg_status: regStatus,
                    permissions: perms,
                    registered_at: u ? u.created_at : '',
                    user_id: u ? u.id : (r.user_id || '')
                };
            });
            result.sort(_naturalCmp);
            return { success: true, data: result, pendingCount: (pendRegs || []).length };
        }

        /* ── getAllPermissions — ดึงสิทธิ์ทั้งหมดจาก DB ─── */
        case 'getAllPermissions': {
            var allPerms = await sbGet('permissions', { select: 'user_id,permission' });
            var permMap = {};
            (allPerms || []).forEach(function(p) {
                if (!permMap[p.user_id]) permMap[p.user_id] = {};
                permMap[p.user_id][p.permission] = true;
            });
            return { success: true, data: permMap };
        }

        /* ── updatePermissions — บันทึกสิทธิ์ผู้ใช้ ─── */
        case 'updatePermissions': {
            var perms = data.permissions || {};
            var userIds = Object.keys(perms);
            // สำรองสิทธิ์เดิมก่อนแก้ไข (auto-backup)
            try {
                var _bakPArr = [];
                for (var bpi = 0; bpi < userIds.length; bpi++) {
                    if (!userIds[bpi] || userIds[bpi].indexOf('coh_') === 0 || userIds[bpi].indexOf('RES') === 0) continue;
                    var _bpRows = await sbGet('permissions', { user_id: 'eq.' + userIds[bpi] });
                    _bakPArr = _bakPArr.concat(_bpRows || []);
                }
                await _autoBackup('updatePermissions', 'อัปเดตสิทธิ์ผู้ใช้ ' + userIds.length + ' คน', 'permissions', null, null, null, _bakPArr);
            } catch(e) {}
            for (var pi = 0; pi < userIds.length; pi++) {
                var uid = userIds[pi];
                // ข้าม virtual IDs ที่ไม่มีใน users table
                if (!uid || uid.indexOf('coh_') === 0) continue;
                // ข้าม resident IDs (RES...) — ต้องเป็น user IDs (USR...) เท่านั้น
                if (uid.indexOf('RES') === 0) continue;
                var userPerms = perms[uid];
                // ลบสิทธิ์เก่าของ user นี้
                await sbDelete('permissions', { user_id: 'eq.' + uid });
                // เพิ่มสิทธิ์ใหม่ที่ checked
                var permKeys = Object.keys(userPerms);
                for (var pk = 0; pk < permKeys.length; pk++) {
                    if (userPerms[permKeys[pk]]) {
                        await sbPost('permissions', { user_id: uid, permission: permKeys[pk] });
                    }
                }
                // อัปเดต role ตามสิทธิ์ head / admin
                if (userPerms['head']) {
                    try { await sbPatch('users', { id: 'eq.' + uid }, { role: 'head', updated_at: new Date().toISOString() }); } catch(e) {}
                } else if (userPerms['admin']) {
                    try { await sbPatch('users', { id: 'eq.' + uid }, { role: 'admin', updated_at: new Date().toISOString() }); } catch(e) {}
                } else {
                    // ไม่ได้เป็น head/admin → revert role เป็น resident
                    try { await sbPatch('users', { id: 'eq.' + uid }, { role: 'resident', updated_at: new Date().toISOString() }); } catch(e) {}
                }
            }
            _logActivity('update_permissions', null, 'อัปเดตสิทธิ์ผู้ใช้ ' + userIds.length + ' คน', { userIds: userIds });
            return { success: true, message: 'บันทึกสิทธิ์เรียบร้อย' };
        }

        /* ── getExemptions — ดึงการยกเว้นค่าส่วนกลางจาก DB ─── */
        case 'getExemptions': {
            var exQ = { type: 'eq.common_fee' };
            if (data.houseNumber) exQ.house_number = 'eq.' + data.houseNumber;
            var [exRows, exHousingRows] = await Promise.all([
                sbGet('exemptions', exQ).catch(function() { return []; }),
                sbGet('housing', { select: 'id' }).catch(function() { return []; })
            ]);
            // validate: เก็บเฉพาะ exemptions ที่ house_id ตรงกับ housing จริง
            var exValidIds = {};
            (exHousingRows || []).forEach(function(h) { if (h.id) exValidIds[String(h.id)] = true; });
            var exMap = {};
            (exRows || []).forEach(function(e) {
                if (e.house_id && exValidIds[String(e.house_id)]) {
                    exMap[e.house_id] = { exempt: true, note: e.reason || '', house_number: e.house_number || '' };
                }
            });
            return { success: true, data: exMap };
        }

        /* ── setHouseExemption — ยกเว้น/ยกเลิกยกเว้นค่าส่วนกลาง (per-house, ปลอดภัยไม่ลบบ้านอื่น) ─── */
        case 'setHouseExemption': {
            var _shHn = data.house_number || '';
            var _shExempt = !!data.exempt;
            if (!_shHn) return { success: false, message: 'missing house_number' };
            if (_shExempt) {
                // ตรวจว่ามี exemption อยู่แล้วไหม
                var _shExisting = await sbGet('exemptions', { house_number: 'eq.' + _shHn, type: 'eq.common_fee' }).catch(function() { return []; });
                if (_shExisting && _shExisting.length > 0) return { success: true };
                // ดึง house_id จาก housing table
                var _shHousing = await sbGet('housing', { house_number: 'eq.' + _shHn, select: 'id', limit: '1' }).catch(function() { return []; });
                var _shHouseId = (_shHousing && _shHousing[0]) ? _shHousing[0].id : null;
                await sbPost('exemptions', {
                    house_id: _shHouseId,
                    house_number: _shHn,
                    type: 'common_fee',
                    reason: data.reason || '',
                    start_date: new Date().toISOString().split('T')[0]
                });
            } else {
                // ลบ exemption ของบ้านนี้ (ถ้ามี)
                await sbDelete('exemptions', { house_number: 'eq.' + _shHn, type: 'eq.common_fee' }).catch(function() {});
            }
            return { success: true };
        }

        /* ── saveExemptions — บันทึกการยกเว้นค่าส่วนกลางลง DB ─── */
        case 'saveExemptions': {
            var exData = data.exemptions || {};
            var exHouseIds = Object.keys(exData);
            var exSess = await _getSessionRole();
            var exBy = exSess ? exSess.userId : null;
            var exToday = new Date().toISOString().split('T')[0];
            // สำรองการยกเว้นเดิมก่อนแก้ไข (auto-backup)
            try { var _bakEx = await sbGet('exemptions', { type: 'eq.common_fee' }); await _autoBackup('saveExemptions', 'บันทึกการยกเว้นค่าส่วนกลาง', 'exemptions', null, null, exBy, _bakEx || []); } catch(e) {}
            // ลบ exemptions ทั้งหมดของ type common_fee ก่อน (ป้องกัน orphaned records จาก house_id เก่า)
            try { await sbDelete('exemptions', { type: 'eq.common_fee' }); } catch(e) {}
            // insert เฉพาะบ้านที่ admin ติ๊กยกเว้น
            for (var exi = 0; exi < exHouseIds.length; exi++) {
                var exHid = exHouseIds[exi];
                var exItem = exData[exHid];
                if (exItem.exempt) {
                    try {
                        await sbPost('exemptions', {
                            house_id:     exHid,
                            house_number: exItem.house_number || '',
                            type:         'common_fee',
                            reason:       exItem.note || '',
                            start_date:   exToday,
                            created_by:   exBy
                        });
                    } catch(e) { console.warn('insert exemption:', e); }
                }
            }
            return { success: true };
        }

        /* ── getRegulationsPdf — ดึง URL ไฟล์ระเบียบ ─── */
        case 'getRegulationsPdf': {
            // ใช้ settings table (ไม่มี system_settings ใน schema)
            var regRows = await sbGet('settings', { key: 'eq.regulations_pdf', select: 'value', limit: '1' });
            if (regRows && regRows[0] && regRows[0].value) {
                return { success: true, downloadUrl: regRows[0].value };
            }
            return { success: false, message: 'ไม่พบไฟล์ระเบียบ' };
        }

        /* ── uploadRegulationPdf — อัปโหลด PDF ระเบียบไป Storage ─── */
        case 'uploadRegulationPdf': {
            var rpB64 = data.base64 || '';
            if (!rpB64.startsWith('data:')) return { success: false, error: 'ไม่ใช่ base64 file' };
            var rpMatch = rpB64.match(/data:([^;]+);base64,(.+)/);
            if (!rpMatch) return { success: false, error: 'รูปแบบ base64 ไม่ถูกต้อง' };
            var rpMime = rpMatch[1];
            if (!_validateMime(rpMime, true)) return { success: false, error: 'รองรับเฉพาะไฟล์ PDF หรือรูปภาพเท่านั้น' };
            var rpRaw = rpMatch[2];
            var rpBinary = atob(rpRaw);
            var rpBytes = new Uint8Array(rpBinary.length);
            for (var rpi = 0; rpi < rpBinary.length; rpi++) { rpBytes[rpi] = rpBinary.charCodeAt(rpi); }
            var rpPath = 'regulations/regulation_' + Date.now() + '.pdf';
            var rpBlob = new Blob([rpBytes], { type: rpMime });
            // ลบไฟล์เก่า (ถ้ามี)
            var rpOldRows = await sbGet('settings', { key: 'eq.regulations_pdf', select: 'value', limit: '1' });
            if (rpOldRows && rpOldRows[0] && rpOldRows[0].value) {
                var rpOldMatch = rpOldRows[0].value.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
                if (rpOldMatch) {
                    try { await window._sb.storage.from(rpOldMatch[1]).remove([rpOldMatch[2]]); } catch(e) {}
                }
            }
            var rpUpRes = await window._sb.storage.from('slips').upload(rpPath, rpBlob, { contentType: rpMime, upsert: true });
            if (rpUpRes.error) return { success: false, error: 'อัปโหลดไม่สำเร็จ: ' + (rpUpRes.error.message || '') };
            var rpPub = window._sb.storage.from('slips').getPublicUrl(rpPath);
            var rpUrl = rpPub.data.publicUrl;
            await sbUpsert('settings', { key: 'regulations_pdf', value: rpUrl }, 'key');
            return { success: true, downloadUrl: rpUrl };
        }

        /* ── deleteRegulationPdf — ลบ PDF ระเบียบจาก Storage ─── */
        case 'deleteRegulationPdf': {
            var drRows = await sbGet('settings', { key: 'eq.regulations_pdf', select: 'value', limit: '1' });
            if (drRows && drRows[0] && drRows[0].value) {
                var drMatch = drRows[0].value.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
                if (drMatch) {
                    try { await window._sb.storage.from(drMatch[1]).remove([drMatch[2]]); } catch(e) { console.warn('delete regulation file:', e); }
                }
            }
            await sbDelete('settings', { key: 'eq.regulations_pdf' });
            return { success: true };
        }

        /* ── getBankBalance — ดึงยอดเงินธนาคารที่บันทึกไว้ ─── */
        case 'getBankBalance': {
            var bbPeriod = data.period || '';
            if (!bbPeriod) return { success: false, error: 'ไม่ระบุ period' };
            var bbKey = 'bank_balance_' + bbPeriod;
            var bbRows = await sbGet('settings', { key: 'eq.' + bbKey, select: 'value', limit: '1' });
            if (bbRows && bbRows[0]) {
                return { success: true, value: parseFloat(bbRows[0].value) || 0 };
            }
            return { success: true, value: null };
        }

        /* ── saveBankBalance — บันทึกยอดเงินธนาคาร ─── */
        case 'saveBankBalance': {
            var sbPeriod = data.period || '';
            var sbValue = data.value;
            if (!sbPeriod) return { success: false, error: 'ไม่ระบุ period' };
            if (sbValue === undefined || sbValue === null) return { success: false, error: 'ไม่ระบุ value' };
            var sbKey = 'bank_balance_' + sbPeriod;
            await sbUpsert('settings', { key: sbKey, value: String(sbValue) }, 'key');
            return { success: true };
        }

        /* ── exportFullBackup — ดึงข้อมูลทั้งระบบเพื่อสำรอง ─── */
        case 'exportFullBackup': {
            // สิทธิ์ตรวจแล้วจาก _STRICT_ADMIN_ACTIONS (admin/head)
            var efbTables = [
                'users', 'housing', 'residents', 'coresidents',
                'water_bills', 'electric_bills', 'water_rates',
                'outstanding', 'slip_submissions', 'payment_history',
                'notifications', 'requests', 'queue',
                'accounting_entries', 'monthly_withdraw', 'exemptions',
                'settings', 'announcements', 'logs',
                'data_backups', 'pending_registrations', 'permissions'
            ];
            var efbResult = {};
            for (var ei = 0; ei < efbTables.length; ei++) {
                var efbT = efbTables[ei];
                try {
                    var efbRows = await sbGet(efbT, {});
                    efbResult[efbT] = efbRows || [];
                } catch(e) {
                    efbResult[efbT] = [];
                    console.warn('exportFullBackup skip:', efbT, e.message);
                }
            }
            return { success: true, data: efbResult, exportedAt: new Date().toISOString() };
        }

        /* ── getBackups — ดึงรายการสำรองข้อมูล ─── */
        case 'getBackups': {
            var bkQ = { order: 'created_at.desc', limit: '200' };
            if (data.action) bkQ.action = 'eq.' + data.action;
            var bkRows = await sbGet('data_backups', bkQ);
            return { success: true, data: bkRows || [] };
        }

        /* ── restoreBackup — กู้คืนข้อมูลจาก snapshot ─── */
        case 'restoreBackup': {
            if (!data.id) return { success: false, error: 'ไม่ระบุ backup ID' };
            var rbRows = await sbGet('data_backups', { id: 'eq.' + data.id, limit: '1' });
            if (!rbRows || !rbRows[0]) return { success: false, error: 'ไม่พบข้อมูลสำรอง' };
            var rbRow = rbRows[0];
            var rbPrev = rbRow.previous_data || [];
            var rbTbl = rbRow.affected_table;
            var rbAct = rbRow.action;
            try {
                if (rbAct === 'submitWaterBill' || rbAct === 'submitElectricBill' || rbAct === 'saveAccounting') {
                    var rbFk = rbRow.filter_key; var rbFv = rbRow.filter_value;
                    if (rbFk && rbFv) { var rbDQ = {}; rbDQ[rbFk] = 'eq.' + rbFv; await sbDelete(rbTbl, rbDQ); }
                    if (rbPrev.length > 0) {
                        var rbClean = rbPrev.map(function(r) { var o = Object.assign({}, r); delete o.recorded_at; return o; });
                        await sbPost(rbTbl, rbClean);
                    }
                } else if (rbAct === 'updateResident' || rbAct === 'removeResident') {
                    for (var rri = 0; rri < rbPrev.length; rri++) {
                        var rObj = Object.assign({}, rbPrev[rri]); var rId = rObj.id;
                        delete rObj.id; delete rObj.created_at;
                        rObj.updated_at = new Date().toISOString();
                        await sbPatch('residents', { id: 'eq.' + rId }, rObj);
                    }
                } else if (rbAct === 'updatePermissions') {
                    var rbUIDs = []; rbPrev.forEach(function(r) { if (r.user_id && rbUIDs.indexOf(r.user_id) < 0) rbUIDs.push(r.user_id); });
                    for (var rui = 0; rui < rbUIDs.length; rui++) { await sbDelete('permissions', { user_id: 'eq.' + rbUIDs[rui] }); }
                    if (rbPrev.length > 0) {
                        var rbCPerms = rbPrev.map(function(r) { var o = Object.assign({}, r); delete o.id; delete o.created_at; return o; });
                        await sbPost('permissions', rbCPerms);
                    }
                } else if (rbAct === 'saveExemptions') {
                    var rbHIDs = []; rbPrev.forEach(function(r) { if (r.house_id && rbHIDs.indexOf(r.house_id) < 0) rbHIDs.push(r.house_id); });
                    for (var rei = 0; rei < rbHIDs.length; rei++) { await sbDelete('exemptions', { house_id: 'eq.' + rbHIDs[rei], type: 'eq.common_fee' }); }
                    if (rbPrev.length > 0) {
                        var rbCEx = rbPrev.map(function(r) { var o = Object.assign({}, r); delete o.id; delete o.created_at; return o; });
                        await sbPost('exemptions', rbCEx);
                    }
                } else {
                    return { success: false, error: 'ไม่รองรับการกู้คืน action: ' + rbAct };
                }
            } catch(e) {
                return { success: false, error: 'กู้คืนไม่สำเร็จ: ' + (e.message || String(e)) };
            }
            return { success: true, message: 'กู้คืนสำเร็จ (' + rbPrev.length + ' รายการ)' };
        }

        /* ── deleteOldBackups — ลบ snapshot เก่า ─── */
        case 'deleteOldBackups': {
            var dkDays = parseInt(data.keepDays) || 30;
            var dkCut = new Date(Date.now() - dkDays * 86400000).toISOString();
            await sbDelete('data_backups', { created_at: 'lt.' + dkCut });
            return { success: true, message: 'ลบข้อมูลสำรองที่เก่ากว่า ' + dkDays + ' วันเรียบร้อยแล้ว' };
        }

        /* ── anonymizeUser — PDPA: แทนที่ข้อมูลส่วนบุคคลด้วยค่าว่าง ─── */
        case 'anonymizeUser': {
            if (sessRole !== 'admin') return { success: false, error: 'ไม่มีสิทธิ์' };
            var anonId = data.userId;
            if (!anonId || typeof anonId !== 'string' || !/^[0-9a-f-]{36}$/i.test(anonId))
                return { success: false, error: 'User ID ไม่ถูกต้อง' };
            var anonUpdate = {
                email: 'deleted-' + anonId.slice(0, 8) + '@ppk.local',
                firstname: 'ลบข้อมูลแล้ว',
                lastname: '',
                phone: ''
            };
            try {
                await sbPatch('users', { id: 'eq.' + anonId }, anonUpdate);
            } catch (anonErr) {
                return { success: false, error: anonErr.message || 'อัปเดตไม่สำเร็จ' };
            }
            await _logActivity('pdpa_anonymize', sessUserId, 'anonymized user ' + anonId, { targetUserId: anonId }).catch(function() {});
            return { success: true };
        }

        /* ── purgeStaleAutoEntries — ล้างข้อมูล auto เก่า (ค่าน้ำ/ค่าไฟ/ยอดรับชำระ) ทุก period ─── */
        case 'purgeStaleAutoEntries': {
            // รายการ description เก่าที่ไม่ควรอยู่ในบัญชีกองกลาง
            var staleDesc = [
                'ค่าน้ำประปา',
                'ค่าไฟ PEA',
                'ยอดรับชำระค่าเช่าและค่าสาธารณูปโภค',
                'ค่า Lost ไฟฟ้า',  // รายการเก่าที่รวม Lost เป็นรายการเดียว (รูปแบบเก่า)
                // รายการที่เคยสร้างผิด (ค่าน้ำ/ค่าไฟเป็น pass-through ไม่ใช่กองกลาง)
                'ค่าน้ำประปา (เก็บจากผู้พัก)',
                'ค่าน้ำประปา (จ่าย PPA)',
                'ค่าไฟฟ้า (เก็บจากผู้พัก)',
                'ค่าไฟฟ้า (จ่าย PEA)',
                'ค่าขยะ (เก็บจากผู้พัก)',
                'ค่าขยะ (จ่ายเทศบาล)',
                'ส่วนต่างค่าไฟจากการปัดเศษ'  // ชื่อเก่า เปลี่ยนเป็น "ส่วนต่างค่าไฟ"
            ];
            var deletedCount = 0;
            for (var sdi = 0; sdi < staleDesc.length; sdi++) {
                try {
                    await sbDelete('accounting_entries', { category: 'eq.auto', description: 'eq.' + staleDesc[sdi] });
                    deletedCount++;
                } catch(e) { console.warn('purge stale:', staleDesc[sdi], e); }
            }
            // Re-sync ทุก period ที่ยังมีใน accounting_entries
            var allPeriodRows = await sbGet('accounting_entries', { select: 'period' }).catch(function() { return []; });
            var uniquePeriods = {};
            (allPeriodRows || []).forEach(function(r) { if (r.period) uniquePeriods[r.period] = true; });
            // รวม periods จาก notifications และ settings (อาจยังไม่มีใน accounting_entries)
            try {
                var notifPRows = await sbGet('notifications', { select: 'period' });
                (notifPRows || []).forEach(function(r) { if (r.period) uniquePeriods[r.period] = true; });
            } catch(e) {}
            var periodsToSync = Object.keys(uniquePeriods).sort();
            for (var psi = 0; psi < periodsToSync.length; psi++) {
                try { await _autoSyncAccounting(periodsToSync[psi]); } catch(e) { console.warn('re-sync period:', periodsToSync[psi], e); }
            }
            return { success: true, message: 'ล้างข้อมูลเก่าและ sync ใหม่เรียบร้อย (' + periodsToSync.length + ' เดือน)' };
        }

        /* ── Proxy Assignment (admin) ────────────── */
        case 'setProxyAssignment': {
            // Admin/head เท่านั้น
            var paSess = await _getSessionRole();
            if (!paSess || (paSess.role !== 'admin' && paSess.role !== 'head')) {
                return { success: false, error: 'สิทธิ์ไม่เพียงพอ' };
            }
            if (!data.houseNumber) return { success: false, error: 'ไม่ระบุเลขที่บ้าน' };
            if (!data.proxyUserId) return { success: false, error: 'ไม่ระบุผู้ชำระแทน' };
            // ปิด assignment เก่าของบ้านนี้ก่อน
            var oldProxy = await sbGet('payment_proxies', { house_number: 'eq.' + data.houseNumber, is_active: 'eq.true', limit: '10' }).catch(function() { return []; });
            if (oldProxy && oldProxy.length > 0) {
                for (var opi = 0; opi < oldProxy.length; opi++) {
                    await sbPatch('payment_proxies', { id: 'eq.' + oldProxy[opi].id }, { is_active: false, updated_at: new Date().toISOString() });
                }
            }
            // หา house_id จาก housing table
            var paHouseRow = await sbGet('housing', { house_number: 'eq.' + data.houseNumber, limit: '1' }).catch(function() { return []; });
            var paHouseId = paHouseRow && paHouseRow[0] ? paHouseRow[0].id : null;
            // หา proxy_resident_id
            var paResRows = await sbGet('residents', { user_id: 'eq.' + data.proxyUserId, is_active: 'eq.true', limit: '1' }).catch(function() { return []; });
            var paResId = paResRows && paResRows[0] ? paResRows[0].id : null;
            var newProxy = await sbPost('payment_proxies', {
                house_id:         paHouseId,
                house_number:     data.houseNumber,
                proxy_user_id:    data.proxyUserId,
                proxy_resident_id: paResId,
                assigned_by:      paSess.userId,
                assigned_at:      new Date().toISOString(),
                is_active:        true,
                notes:            data.notes || null
            });
            return { success: true, data: newProxy };
        }

        case 'removeProxyAssignment': {
            var rpSess = await _getSessionRole();
            if (!rpSess || (rpSess.role !== 'admin' && rpSess.role !== 'head')) {
                return { success: false, error: 'สิทธิ์ไม่เพียงพอ' };
            }
            if (!data.houseNumber) return { success: false, error: 'ไม่ระบุเลขที่บ้าน' };
            var rpRows = await sbGet('payment_proxies', { house_number: 'eq.' + data.houseNumber, is_active: 'eq.true', limit: '10' }).catch(function() { return []; });
            if (rpRows && rpRows.length > 0) {
                for (var rpi = 0; rpi < rpRows.length; rpi++) {
                    await sbPatch('payment_proxies', { id: 'eq.' + rpRows[rpi].id }, { is_active: false, updated_at: new Date().toISOString() });
                }
            }
            return { success: true };
        }

        case 'getProxyForHouse': {
            // ดึง proxy assignment ปัจจุบันของบ้าน
            var gphSess = await _getSessionRole();
            if (!gphSess || (gphSess.role !== 'admin' && gphSess.role !== 'head')) {
                return { success: false, error: 'สิทธิ์ไม่เพียงพอ' };
            }
            if (!data.houseNumber) return { success: false, error: 'ไม่ระบุเลขที่บ้าน' };
            var gphRows = await sbGet('payment_proxies', { house_number: 'eq.' + data.houseNumber, is_active: 'eq.true', limit: '1' }).catch(function() { return []; });
            if (!gphRows || gphRows.length === 0) return { success: true, data: null };
            var gphProxy = gphRows[0];
            // ดึงชื่อผู้ชำระแทนจาก users
            var gphUser = null;
            try { var gphUserRows = await sbGet('users', { id: 'eq.' + gphProxy.proxy_user_id, select: 'id,firstname,lastname,prefix', limit: '1' }); gphUser = gphUserRows && gphUserRows[0]; } catch(e) {}
            // ดึงชื่อผู้ assign
            var gphAssigner = null;
            if (gphProxy.assigned_by) {
                try { var gphARows = await sbGet('users', { id: 'eq.' + gphProxy.assigned_by, select: 'firstname,lastname', limit: '1' }); gphAssigner = gphARows && gphARows[0]; } catch(e) {}
            }
            // ดึงบ้านของ proxy user
            var gphProxyRes = null;
            try { var gphPRRows = await sbGet('residents', { user_id: 'eq.' + gphProxy.proxy_user_id, is_active: 'eq.true', limit: '1', select: 'house_number' }); gphProxyRes = gphPRRows && gphPRRows[0]; } catch(e) {}
            return { success: true, data: {
                id: gphProxy.id,
                house_number: gphProxy.house_number,
                proxy_user_id: gphProxy.proxy_user_id,
                proxy_name: gphUser ? ((gphUser.prefix||'') + (gphUser.firstname||'') + ' ' + (gphUser.lastname||'')).trim() : gphProxy.proxy_user_id,
                proxy_house: gphProxyRes ? gphProxyRes.house_number : '',
                assigned_by_name: gphAssigner ? ((gphAssigner.firstname||'') + ' ' + (gphAssigner.lastname||'')).trim() : '',
                assigned_at: gphProxy.assigned_at,
                notes: gphProxy.notes || ''
            }};
        }

        case 'getMyProxyAssignments': {
            // ดึง assignments ทั้งหมดที่ current user ถูกมอบหมายให้ชำระแทน
            var gmaSess = await _getSessionRole();
            if (!gmaSess) return { success: true, data: [] };
            var gmaUserId = gmaSess.userId;
            // ดึง active proxy assignments
            var gmaProxies = await sbGet('payment_proxies', { proxy_user_id: 'eq.' + gmaUserId, is_active: 'eq.true', order: 'assigned_at.desc' }).catch(function() { return []; });
            if (!gmaProxies || gmaProxies.length === 0) return { success: true, data: [] };
            // สำหรับแต่ละบ้าน: ดึง outstanding + slip ปัจจุบัน + ชื่อผู้พัก
            var gmaNow = new Date();
            var gmaPeriod = (gmaNow.getFullYear() + 543) + '-' + String(gmaNow.getMonth() + 1).padStart(2, '0');
            var gmaResult = [];
            for (var gmai = 0; gmai < gmaProxies.length; gmai++) {
                var gmaP = gmaProxies[gmai];
                // ชื่อผู้พักหลัก (PDPA: ชื่อเท่านั้น)
                var gmaResName = '';
                try {
                    var gmaResRows = await sbGet('residents', { house_number: 'eq.' + gmaP.house_number, is_active: 'eq.true', resident_type: 'neq.cohabitant', limit: '1', select: 'prefix,firstname,lastname' });
                    if (gmaResRows && gmaResRows[0]) {
                        var gr = gmaResRows[0];
                        gmaResName = ((gr.prefix||'') + (gr.firstname||'') + ' ' + (gr.lastname||'')).trim();
                    }
                } catch(e) {}
                // outstanding งวดปัจจุบัน
                var gmaOut = null;
                try {
                    var gmaOutRows = await sbGet('outstanding', { house_number: 'eq.' + gmaP.house_number, period: 'eq.' + gmaPeriod, limit: '1' });
                    gmaOut = gmaOutRows && gmaOutRows[0];
                } catch(e) {}
                // slip งวดปัจจุบัน
                var gmaSlip = null;
                try {
                    var gmaSlipRows = await sbGet('slip_submissions', { house_number: 'eq.' + gmaP.house_number, period: 'eq.' + gmaPeriod, order: 'submitted_at.desc', limit: '1' });
                    gmaSlip = gmaSlipRows && gmaSlipRows[0];
                } catch(e) {}
                var gmaSlipStatus = 'none';
                var gmaReviewNote = '';
                var gmaSlipId = null;
                if (gmaSlip) {
                    gmaSlipId = gmaSlip.id;
                    if (gmaSlip.status === 'approved') gmaSlipStatus = 'success';
                    else if (gmaSlip.status === 'rejected') { gmaSlipStatus = 'rejected'; gmaReviewNote = gmaSlip.review_note || ''; }
                    else gmaSlipStatus = 'reviewing';
                }
                gmaResult.push({
                    house_number:   gmaP.house_number,
                    resident_name:  gmaResName,
                    period:         gmaPeriod,
                    amount:         gmaOut ? parseFloat(gmaOut.total_amount) || 0 : 0,
                    water_amount:   gmaOut ? parseFloat(gmaOut.water_amount) || 0 : 0,
                    electric_amount: gmaOut ? parseFloat(gmaOut.electric_amount) || 0 : 0,
                    common_fee:     gmaOut ? parseFloat(gmaOut.common_fee) || 0 : 0,
                    slip_status:    gmaSlipStatus,
                    review_note:    gmaReviewNote,
                    slip_id:        gmaSlipId,
                    assigned_at:    gmaP.assigned_at,
                    notes:          gmaP.notes || ''
                });
            }
            return { success: true, data: gmaResult };
        }

        case 'getProxySlips': {
            // ประวัติสลิปทั้งหมดที่ current user ส่งแทน
            var gpsSess = await _getSessionRole();
            if (!gpsSess) return { success: true, data: [] };
            var gpsUserId = gpsSess.userId;
            // ดึง user's house_number
            var gpsMyHouse = '';
            try {
                var gpsMuArr = await sbGet('users', { id: 'eq.' + gpsUserId, select: 'email', limit: '1' });
                var gpsMyRes = await _findResidentForUser(gpsUserId, gpsMuArr && gpsMuArr[0] ? gpsMuArr[0].email : null);
                gpsMyHouse = gpsMyRes ? (gpsMyRes.house_number || '') : '';
            } catch(e) {}
            // ดึงสลิปที่ submitted_by_user_id = gpsUserId และไม่ใช่บ้านตัวเอง
            var gpsSlips = await sbGet('slip_submissions', { submitted_by_user_id: 'eq.' + gpsUserId, order: 'submitted_at.desc', limit: '100' }).catch(function() { return []; });
            // กรองออกบ้านตัวเอง
            gpsSlips = (gpsSlips || []).filter(function(s) { return s.house_number !== gpsMyHouse; });
            if (gpsSlips.length === 0) return { success: true, data: [] };
            // รวม house_numbers ที่ไม่ซ้ำ → ดึงชื่อผู้พักทีเดียว
            var gpsHouseSet = {};
            gpsSlips.forEach(function(s) { gpsHouseSet[s.house_number] = true; });
            var gpsHouseNames = {};
            for (var gpsHk in gpsHouseSet) {
                try {
                    var gpsRRows = await sbGet('residents', { house_number: 'eq.' + gpsHk, is_active: 'eq.true', resident_type: 'neq.cohabitant', limit: '1', select: 'prefix,firstname,lastname' });
                    if (gpsRRows && gpsRRows[0]) {
                        var gpr = gpsRRows[0];
                        gpsHouseNames[gpsHk] = ((gpr.prefix||'') + (gpr.firstname||'') + ' ' + (gpr.lastname||'')).trim();
                    } else { gpsHouseNames[gpsHk] = ''; }
                } catch(e) { gpsHouseNames[gpsHk] = ''; }
            }
            var gpsResult = gpsSlips.map(function(s) {
                return {
                    id:            s.id,
                    house_number:  s.house_number,
                    resident_name: gpsHouseNames[s.house_number] || '',
                    period:        s.period,
                    amount:        parseFloat(s.amount) || 0,
                    status:        s.status,
                    review_note:   s.review_note || '',
                    submitted_at:  s.submitted_at
                };
            });
            return { success: true, data: gpsResult };
        }

        /* ── Admin: ดูมุมมองผู้ใช้ทุกบ้าน (read-only) ──── */
        case 'getAdminHouseView': {
            var ahvSess = await _getSessionRole();
            if (!ahvSess || (ahvSess.role !== 'admin' && ahvSess.role !== 'head')) {
                return { success: false, error: 'สิทธิ์ไม่เพียงพอ' };
            }
            var ahvHouse = data.houseNumber;
            var ahvUserId = data.userId;
            var targetRes = null;
            if (ahvUserId) {
                targetRes = await _findResidentForUser(ahvUserId, null);
                if (targetRes && targetRes.house_number) ahvHouse = targetRes.house_number;
            }
            if (!ahvHouse) return { success: false, error: 'ไม่ระบุเลขที่บ้าน (หรือผู้ใช้นี้ไม่มีบ้าน)' };
            
            var ahvNow = new Date();
            var ahvPeriod = (ahvNow.getFullYear() + 543) + '-' + String(ahvNow.getMonth() + 1).padStart(2, '0');
            // ดึงข้อมูลทั้งหมดพร้อมกัน
            var ahvResults = await Promise.all([
                sbGet('residents',        { house_number: 'eq.' + ahvHouse, is_active: 'eq.true', resident_type: 'neq.cohabitant', limit: '1' }).catch(function() { return []; }),
                sbGet('outstanding',      { house_number: 'eq.' + ahvHouse, order: 'period.desc', limit: '13' }).catch(function() { return []; }),
                sbGet('slip_submissions', { house_number: 'eq.' + ahvHouse, order: 'submitted_at.desc', limit: '20' }).catch(function() { return []; }),
                sbGet('payment_proxies',  { house_number: 'eq.' + ahvHouse, is_active: 'eq.true', limit: '1' }).catch(function() { return []; })
            ]);
            var ahvResRows = ahvResults[0], ahvOutRows = ahvResults[1], ahvSlipRows = ahvResults[2], ahvProxyRows = ahvResults[3];
            // Self-healing: ตรวจ outstanding ที่ค้างอยู่ว่ามี slip approved หรือ payment_history หรือเป็นงวดก่อนระบบ live → auto-mark paid
            var _ahvSysLive = '2569-03';
            if (ahvOutRows && ahvOutRows.length > 0) {
                try {
                    var ahvPhRows = await sbGet('payment_history', { house_number: 'eq.' + ahvHouse, order: 'period.desc', limit: '50' }).catch(function() { return []; });
                    var ahvPaidPeriods = {};
                    (ahvPhRows || []).forEach(function(ph) { if (ph.period) ahvPaidPeriods[ph.period] = true; });
                    (ahvSlipRows || []).forEach(function(sl) { if (sl.status === 'approved' && sl.period) ahvPaidPeriods[sl.period] = true; });
                    for (var ahvHi = 0; ahvHi < ahvOutRows.length; ahvHi++) {
                        if (ahvOutRows[ahvHi].status !== 'paid' && (ahvPaidPeriods[ahvOutRows[ahvHi].period] || (ahvOutRows[ahvHi].period && ahvOutRows[ahvHi].period < _ahvSysLive))) {
                            ahvOutRows[ahvHi].status = 'paid';
                            sbPatch('outstanding', { id: 'eq.' + ahvOutRows[ahvHi].id }, { status: 'paid', updated_at: new Date().toISOString() }).catch(function() {});
                        }
                    }
                } catch(e) {}
            }
            // ชื่อผู้พัก (ยึดตาม userId ถ้ามีการส่งมา หรือใช้ชื่อผู้พักหลักถ้าไม่ได้ระบุ)
            var ahvResName = '';
            var ahvResPosition = '';
            var ahvResPhone = '';
            if (ahvUserId) {
                try {
                    var suRows = await sbGet('users', { id: 'eq.' + ahvUserId, limit: '1' });
                    if (suRows && suRows[0]) {
                        ahvResName = ((suRows[0].prefix||'') + (suRows[0].firstname||'') + ' ' + (suRows[0].lastname||'')).trim() || suRows[0].email || '';
                        ahvResPosition = suRows[0].position || '';
                        ahvResPhone = suRows[0].phone || '';
                    }
                } catch(e) {}
            } else {
                var ahvRes = ahvResRows && ahvResRows[0];
                ahvResName = ahvRes ? ((ahvRes.prefix||'') + (ahvRes.firstname||'') + ' ' + (ahvRes.lastname||'')).trim() : '';
                ahvResPosition = ahvRes ? (ahvRes.position || '') : '';
                ahvResPhone = ahvRes ? (ahvRes.phone || '') : '';
            }
            // ข้อมูลงวดปัจจุบัน
            var ahvCurOut = (ahvOutRows || []).find(function(o) { return o.period === ahvPeriod; });
            // fallback: ถ้าไม่มีใน outstanding ให้ดึงจาก notifications
            var ahvCurNotif = null;
            if (!ahvCurOut) {
                try {
                    var ahvNotifR = await sbGet('notifications', { house_number: 'eq.' + ahvHouse, period: 'eq.' + ahvPeriod, order: 'sent_at.desc', limit: '1' });
                    ahvCurNotif = ahvNotifR && ahvNotifR[0];
                } catch(e) {}
            }
            var ahvCurSlip = (ahvSlipRows || []).find(function(s) { return s.period === ahvPeriod; });
            var ahvSlipStatus = 'none', ahvReviewNote = '', ahvSlipId = null;
            if (ahvCurSlip) {
                ahvSlipId = ahvCurSlip.id;
                if (ahvCurSlip.status === 'approved') ahvSlipStatus = 'success';
                else if (ahvCurSlip.status === 'rejected') { ahvSlipStatus = 'rejected'; ahvReviewNote = ahvCurSlip.review_note || ''; }
                else ahvSlipStatus = 'reviewing';
            }
            var ahvTotalOs = (ahvOutRows || []).filter(function(r) { return r.status !== 'paid'; }).reduce(function(s, r) { return s + (parseFloat(r.total_amount) || 0); }, 0);
            // ประวัติรายเดือน (join outstanding + slip ล่าสุดของแต่ละงวด)
            var ahvHistory = (ahvOutRows || []).map(function(o) {
                var s = (ahvSlipRows || []).find(function(sl) { return sl.period === o.period; });
                var ss = 'none';
                if (s) {
                    if (s.status === 'approved') ss = 'success';
                    else if (s.status === 'rejected') ss = 'rejected';
                    else ss = 'reviewing';
                }
                if (ss === 'none' && o.period && o.period < _ahvSysLive) ss = 'pre-system';
                else if (ss === 'none' && o.status === 'paid') ss = 'success';
                return {
                    period:           o.period,
                    amount:           parseFloat(o.total_amount) || 0,
                    water_amount:     parseFloat(o.water_amount) || 0,
                    electric_amount:  parseFloat(o.electric_amount) || 0,
                    common_fee:       parseFloat(o.common_fee) || 0,
                    slip_status:      ss,
                    submitted_at:     s ? s.submitted_at : null
                };
            });
            // Proxy info
            var ahvProxy = ahvProxyRows && ahvProxyRows[0];
            var ahvProxyName = '', ahvProxyHouse = '';
            if (ahvProxy) {
                try {
                    var ahvPU = await sbGet('users', { id: 'eq.' + ahvProxy.proxy_user_id, select: 'prefix,firstname,lastname', limit: '1' });
                    if (ahvPU && ahvPU[0]) ahvProxyName = ((ahvPU[0].prefix||'') + (ahvPU[0].firstname||'') + ' ' + (ahvPU[0].lastname||'')).trim();
                    var ahvPR = await sbGet('residents', { user_id: 'eq.' + ahvProxy.proxy_user_id, is_active: 'eq.true', limit: '1', select: 'house_number' });
                    if (ahvPR && ahvPR[0]) ahvProxyHouse = ahvPR[0].house_number || '';
                } catch(e) {}
            }
            // ── proxyAssignments: บ้านที่ผู้พักบ้านนี้ได้รับมอบหมายให้ชำระแทน ──
            var ahvProxyAssignments = [];
            try {
                // ดึง residents ทั้งหมดของบ้านนี้เพื่อรวบรวม user_ids และ resident_ids ให้ครบ
                var ahvAllResRows = await sbGet('residents', { house_number: 'eq.' + ahvHouse, is_active: 'eq.true', select: 'id,user_id,email' }).catch(function() { return []; });
                var ahvAllResIds = (ahvAllResRows || []).map(function(r) { return r.id; }).filter(Boolean);
                var ahvAllUids = (ahvAllResRows || []).map(function(r) { return r.user_id; }).filter(Boolean);
                // เพิ่ม user_id จาก email fallback สำหรับ residents ที่ไม่มี user_id
                var orphanEmails = (ahvAllResRows || []).filter(function(r) { return !r.user_id && r.email; }).map(function(r) { return r.email; });
                if (orphanEmails.length > 0) {
                    var ahvUByEmail = await sbGet('users', { email: 'in.(' + orphanEmails.join(',') + ')', select: 'id' }).catch(function() { return []; });
                    (ahvUByEmail || []).forEach(function(u) { if (u.id && ahvAllUids.indexOf(u.id) === -1) ahvAllUids.push(u.id); });
                }
                // fallback: sessions ด้วย house_number
                if (ahvAllUids.length === 0) {
                    var ahvSessUs = await sbGet('sessions', { house_number: 'eq.' + ahvHouse, select: 'user_id', limit: '5' }).catch(function() { return []; });
                    (ahvSessUs || []).forEach(function(s) { if (s.user_id && ahvAllUids.indexOf(s.user_id) === -1) ahvAllUids.push(s.user_id); });
                }
                // query payment_proxies: ลอง proxy_user_id ก่อน แล้ว fallback proxy_resident_id
                var ahvPARows = [];
                if (ahvAllUids.length > 0) {
                    ahvPARows = await sbGet('payment_proxies', { proxy_user_id: 'in.(' + ahvAllUids.join(',') + ')', is_active: 'eq.true', order: 'assigned_at.desc' }).catch(function() { return []; });
                }
                if (ahvPARows.length === 0 && ahvAllResIds.length > 0) {
                    ahvPARows = await sbGet('payment_proxies', { proxy_resident_id: 'in.(' + ahvAllResIds.join(',') + ')', is_active: 'eq.true', order: 'assigned_at.desc' }).catch(function() { return []; });
                }
                if (ahvPARows && ahvPARows.length > 0) {
                    for (var ahvPAi = 0; ahvPAi < ahvPARows.length; ahvPAi++) {
                        var ahvPA = ahvPARows[ahvPAi];
                        var ahvPAResName = '';
                        try {
                            var ahvPARR = await sbGet('residents', { house_number: 'eq.' + ahvPA.house_number, is_active: 'eq.true', resident_type: 'neq.cohabitant', limit: '1', select: 'prefix,firstname,lastname' });
                            if (ahvPARR && ahvPARR[0]) { var ahvPARRR = ahvPARR[0]; ahvPAResName = ((ahvPARRR.prefix||'') + (ahvPARRR.firstname||'') + ' ' + (ahvPARRR.lastname||'')).trim(); }
                        } catch(e) {}
                        var ahvPAOut = null;
                        try { var ahvPAOutR = await sbGet('outstanding', { house_number: 'eq.' + ahvPA.house_number, period: 'eq.' + ahvPeriod, limit: '1' }); ahvPAOut = ahvPAOutR && ahvPAOutR[0]; } catch(e) {}
                        if (!ahvPAOut) {
                            try { var ahvPANotifR = await sbGet('notifications', { house_number: 'eq.' + ahvPA.house_number, period: 'eq.' + ahvPeriod, order: 'sent_at.desc', limit: '1' }); if (ahvPANotifR && ahvPANotifR[0]) ahvPAOut = ahvPANotifR[0]; } catch(e) {}
                        }
                        var ahvPASlip = null;
                        try { var ahvPASlipR = await sbGet('slip_submissions', { house_number: 'eq.' + ahvPA.house_number, period: 'eq.' + ahvPeriod, order: 'submitted_at.desc', limit: '1' }); ahvPASlip = ahvPASlipR && ahvPASlipR[0]; } catch(e) {}
                        var ahvPASlipStatus = 'none', ahvPAReviewNote = '', ahvPASlipId = null;
                        if (ahvPASlip) {
                            ahvPASlipId = ahvPASlip.id;
                            if (ahvPASlip.status === 'approved') ahvPASlipStatus = 'success';
                            else if (ahvPASlip.status === 'rejected') { ahvPASlipStatus = 'rejected'; ahvPAReviewNote = ahvPASlip.review_note || ''; }
                            else ahvPASlipStatus = 'reviewing';
                        }
                        ahvProxyAssignments.push({
                            house_number: ahvPA.house_number, resident_name: ahvPAResName, period: ahvPeriod,
                            amount: ahvPAOut ? parseFloat(ahvPAOut.total_amount) || 0 : 0,
                            water_amount: ahvPAOut ? parseFloat(ahvPAOut.water_amount) || 0 : 0,
                            electric_amount: ahvPAOut ? parseFloat(ahvPAOut.electric_amount) || 0 : 0,
                            common_fee: ahvPAOut ? parseFloat(ahvPAOut.common_fee) || 0 : 0,
                            due_date: ahvPAOut ? (ahvPAOut.due_date || null) : null,
                            slip_status: ahvPASlipStatus, review_note: ahvPAReviewNote, slip_id: ahvPASlipId, notes: ahvPA.notes || ''
                        });
                    }
                }
            } catch(e) { /* non-critical */ }

            var ahvAllSlips = (ahvSlipRows || []).map(function(s) {
                var st = 'none';
                if (s.status === 'approved') st = 'success';
                else if (s.status === 'rejected') st = 'rejected';
                else if (s.status) st = 'reviewing';
                return { id: s.id, period: s.period, amount: parseFloat(s.amount)||0, receipt_number: s.receipt_number||'', status: st, review_note: s.review_note||'', submitted_at: s.submitted_at, image_url: s.image_url||null };
            });
            return { success: true, data: {
                houseNumber:     ahvHouse,
                residentName:    ahvResName,
                residentPosition: ahvResPosition,
                residentPhone:   ahvResPhone,
                period:          ahvPeriod,
                currentAmount:   ahvCurOut ? parseFloat(ahvCurOut.total_amount) || 0 : (ahvCurNotif ? parseFloat(ahvCurNotif.total_amount) || 0 : 0),
                water_amount:    ahvCurOut ? parseFloat(ahvCurOut.water_amount) || 0 : (ahvCurNotif ? parseFloat(ahvCurNotif.water_amount) || 0 : 0),
                electric_amount: ahvCurOut ? parseFloat(ahvCurOut.electric_amount) || 0 : (ahvCurNotif ? parseFloat(ahvCurNotif.electric_amount) || 0 : 0),
                common_fee:      ahvCurOut ? parseFloat(ahvCurOut.common_fee) || 0 : (ahvCurNotif ? parseFloat(ahvCurNotif.common_fee) || 0 : 0),
                totalOutstanding: ahvTotalOs,
                slipStatus:      ahvSlipStatus,
                reviewNote:      ahvReviewNote,
                slipId:          ahvSlipId,
                slipImageUrl:    ahvCurSlip ? (ahvCurSlip.image_url || null) : null,
                slipReceiptNumber: ahvCurSlip ? (ahvCurSlip.receipt_number || '') : '',
                slipSubmittedAt: ahvCurSlip ? (ahvCurSlip.submitted_at || null) : null,
                slipAmount:      ahvCurSlip ? (parseFloat(ahvCurSlip.amount) || 0) : 0,
                dueDate:         ahvCurOut ? ahvCurOut.due_date : (ahvCurNotif ? ahvCurNotif.due_date : null),
                history:         ahvHistory,
                allSlips:        ahvAllSlips,
                proxyName:       ahvProxyName,
                proxyHouse:      ahvProxyHouse,
                proxyNotes:      ahvProxy ? (ahvProxy.notes || '') : '',
                proxyAssignments: ahvProxyAssignments
            }};
        }

        case 'getAdminHouseRequests': {
            var ahrSess = await _getSessionRole();
            if (!ahrSess || (ahrSess.role !== 'admin' && ahrSess.role !== 'head')) return { success: false, error: 'สิทธิ์ไม่เพียงพอ' };
            var ahrHouse = data.houseNumber;
            if (!ahrHouse) return { success: false, error: 'ไม่ระบุเลขที่บ้าน' };
            var ahrRows = await sbGet('requests', { house_number: 'eq.' + ahrHouse, order: 'created_at.desc', limit: '50' }).catch(function() { return []; });
            return { success: true, data: ahrRows || [] };
        }

        case 'getAdminHouseProfile': {
            var ahpSess = await _getSessionRole();
            if (!ahpSess || (ahpSess.role !== 'admin' && ahpSess.role !== 'head')) return { success: false, error: 'สิทธิ์ไม่เพียงพอ' };
            var ahpHouse = data.houseNumber;
            var ahpUserId = data.userId;
            
            var targetRes = null;
            if (ahpUserId) {
                targetRes = await _findResidentForUser(ahpUserId, null);
                if (targetRes && targetRes.house_number) ahpHouse = targetRes.house_number;
            }
            if (!ahpHouse) return { success: false, error: 'ไม่ระบุเลขที่บ้าน' };
            var ahpResults = await Promise.all([
                sbGet('residents', { house_number: 'eq.' + ahpHouse, is_active: 'eq.true', resident_type: 'neq.cohabitant', limit: '1' }).catch(function() { return []; }),
                sbGet('residents', { house_number: 'eq.' + ahpHouse, is_active: 'eq.true', resident_type: 'eq.cohabitant' }).catch(function() { return []; }),
                sbGet('housing', { house_number: 'eq.' + ahpHouse, limit: '1' }).catch(function() { return []; })
            ]);
            var ahpRes = ahpResults[0] && ahpResults[0][0]; // primary resident
            var ahpCoRows = ahpResults[1] || [];
            var ahpHou = ahpResults[2] && ahpResults[2][0];
            
            // ถ้าระบุ userId มา ให้พยายามดึง Profile จาก userId นั้นโดยตรง
            var ahpProfileBase = ahpRes;
            if (ahpUserId) {
                // ถ้าเป็น coresident ก็ใช้ข้อมูลจาก coresident table แต่ตอนนี้เรารวมใน users
                // หา record resident จริงๆ ของ user นี้
                var userResRow = null;
                try {
                    var _ur = await sbGet('residents', { user_id: 'eq.' + ahpUserId, is_active: 'eq.true', limit: '1' });
                    if (_ur && _ur[0]) userResRow = _ur[0];
                } catch(e) {}
                if (!userResRow) {
                    try {
                        var _uc = await sbGet('coresidents', { user_id: 'eq.' + ahpUserId, limit: '1' });
                        if (_uc && _uc[0]) {
                            userResRow = _uc[0];
                            userResRow.resident_type = 'cohabitant';
                        }
                    } catch(e) {}
                }
                if (userResRow) ahpProfileBase = userResRow;
            }

            var ahpUserInfo = {};
            var uidToFetch = ahpUserId || (ahpProfileBase ? ahpProfileBase.user_id : null);
            if (uidToFetch) {
                var ahpURows = await sbGet('users', { id: 'eq.' + uidToFetch, select: 'email,phone', limit: '1' }).catch(function() { return []; });
                if (ahpURows && ahpURows[0]) ahpUserInfo = ahpURows[0];
            }
            return { success: true, data: {
                houseNumber:   ahpHouse,
                residentName:  ahpProfileBase ? ((ahpProfileBase.prefix||'') + (ahpProfileBase.firstname||'') + ' ' + (ahpProfileBase.lastname||'')).trim() : '',
                position:      ahpProfileBase ? (ahpProfileBase.position || '') : '',
                phone:         ahpUserInfo.phone || (ahpProfileBase ? (ahpProfileBase.phone || '') : ''),
                email:         ahpUserInfo.email || '',
                photo_url:     ahpProfileBase ? (ahpProfileBase.photo_url || '') : '',
                resident_type: ahpProfileBase ? (ahpProfileBase.resident_type || '') : '',
                move_in_date:  ahpProfileBase ? (ahpProfileBase.move_in_date || '') : '',
                coresidents:   ahpCoRows.map(function(r) {
                    return { name: ((r.prefix||'') + (r.firstname||'') + ' ' + (r.lastname||'')).trim(), relation: r.relation || '', phone: r.phone || '' };
                }),
                housing_floor: ahpHou ? (ahpHou.floor || '') : '',
                housing_type:  ahpHou ? (ahpHou.type || '') : '',
                housing_notes: ahpHou ? (ahpHou.notes || '') : ''
            }};
        }

        case 'getAdminHouseFullHistory': {
            var ahfhSess = await _getSessionRole();
            if (!ahfhSess || (ahfhSess.role !== 'admin' && ahfhSess.role !== 'head'))
                return { success: false, error: 'สิทธิ์ไม่เพียงพอ' };
            var ahfhHouse = data.houseNumber;
            if (!ahfhHouse) return { success: false, error: 'ไม่ระบุเลขที่บ้าน' };
            var ahfhParallel = await Promise.all([
                sbGet('water_bills',      { house_number: 'eq.' + ahfhHouse, order: 'period.desc', limit: '100' }).catch(function() { return []; }),
                sbGet('electric_bills',   { house_number: 'eq.' + ahfhHouse, order: 'period.desc', limit: '100' }).catch(function() { return []; }),
                sbGet('slip_submissions', { house_number: 'eq.' + ahfhHouse, order: 'submitted_at.desc', limit: '200' }).catch(function() { return []; }),
                sbGet('outstanding',      { house_number: 'eq.' + ahfhHouse, order: 'period.desc', limit: '100' }).catch(function() { return []; }),
                sbGet('settings',         {}).catch(function() { return []; }),
                sbGet('exemptions',       { house_number: 'eq.' + ahfhHouse }).catch(function() { return []; }),
                sbGet('notifications',    { house_number: 'eq.' + ahfhHouse, select: 'period,due_date', order: 'period.desc', limit: '100' }).catch(function() { return []; })
            ]);
            var ahfhW = ahfhParallel[0] || [], ahfhE = ahfhParallel[1] || [];
            var ahfhSlips = ahfhParallel[2] || [], ahfhOut = ahfhParallel[3] || [];
            var ahfhSetts = ahfhParallel[4] || [], ahfhExempt = ahfhParallel[5] || [];
            /* Build notifications due_date map: period → due_date */
            var ahfhNotifMap = {};
            (ahfhParallel[6] || []).forEach(function(n) { if (n.period && n.due_date && !ahfhNotifMap[n.period]) ahfhNotifMap[n.period] = n.due_date; });
            var ahfhSettMap = {};
            ahfhSetts.forEach(function(s) { ahfhSettMap[s.key] = s.value; });
            var ahfhIsFlat = ahfhHouse.startsWith('แฟลต');
            var ahfhCfRate = parseFloat(ahfhIsFlat ? ahfhSettMap.common_fee_flat : ahfhSettMap.common_fee_house) || 0;
            var ahfhGfRate = parseFloat(ahfhSettMap.garbage_fee) || 0;
            var ahfhHasExempt = ahfhExempt.some(function(ex) { return ex.type === 'common_fee'; });
            // รวบรวม period ทั้งหมดจากทุกตาราง
            var ahfhPeriods = {};
            ahfhW.forEach(function(r) { ahfhPeriods[r.period] = 1; });
            ahfhE.forEach(function(r) { ahfhPeriods[r.period] = 1; });
            ahfhOut.forEach(function(r) { ahfhPeriods[r.period] = 1; });
            var ahfhRecords = Object.keys(ahfhPeriods).map(function(period) {
                var wRow = ahfhW.find(function(r) { return r.period === period; });
                var eRow = ahfhE.find(function(r) { return r.period === period; });
                var oRow = ahfhOut.find(function(r) { return r.period === period; });
                var slipRows = ahfhSlips.filter(function(r) { return r.period === period; });
                var latestSlip = slipRows[0];
                var wAmt = wRow ? (parseFloat(wRow.amount) || 0) : (oRow ? (parseFloat(oRow.water_amount) || 0) : 0);
                var eAmt = eRow ? (parseFloat(eRow.bill_amount || eRow.amount) || 0) : (oRow ? (parseFloat(oRow.electric_amount) || 0) : 0);
                var cf = oRow ? (parseFloat(oRow.common_fee) || 0) : (ahfhHasExempt ? 0 : ahfhCfRate);
                var gf = oRow ? (parseFloat(oRow.garbage_fee) || 0) : ahfhGfRate;
                var total = oRow ? (parseFloat(oRow.total_amount) || 0) : (wAmt + eAmt + cf + gf);
                var slipStatus = 'none', slipReviewNote = '';
                if (latestSlip) {
                    if (latestSlip.status === 'approved') slipStatus = 'success';
                    else if (latestSlip.status === 'rejected') { slipStatus = 'rejected'; slipReviewNote = latestSlip.review_note || ''; }
                    else slipStatus = 'reviewing';
                }
                return {
                    period:             period,
                    amount:             total,
                    water_amount:       wAmt,
                    electric_amount:    eAmt,
                    common_fee:         cf,
                    garbage_fee:        gf,
                    outstanding_status: oRow ? (oRow.status || null) : null,
                    due_date:           (oRow && oRow.due_date) ? oRow.due_date : (ahfhNotifMap[period] || null),
                    slip_status:        slipStatus,
                    review_note:        slipReviewNote,
                    submitted_at:       latestSlip ? latestSlip.submitted_at : null,
                    slip_url:           latestSlip ? (latestSlip.slip_url || null) : null,
                    slip_amount:        latestSlip ? (parseFloat(latestSlip.amount) || 0) : 0
                };
            });
            ahfhRecords.sort(function(a, b) { return b.period.localeCompare(a.period); });
            return { success: true, data: ahfhRecords };
        }

        /* ── Activity Logging ─────────────────────── */
        case 'logPageView': {
            var pvSess = await _getSessionRole();
            var pvUserId = pvSess ? pvSess.userId : null;
            var pvPage = (data.page || '').replace(/^.*\//, '').replace('.html', '') || 'unknown';
            _logActivity('page_view', pvUserId, pvPage, { page: pvPage, role: pvSess ? pvSess.role : '' });
            return { success: true };
        }

        case 'getActivityLogs': {
            var alSess = await _getSessionRole();
            if (!alSess || (alSess.role !== 'admin' && alSess.role !== 'head')) {
                return { success: false, error: 'สิทธิ์ไม่เพียงพอ' };
            }
            var alLimit = parseInt(data.limit) || 50;
            var alOffset = parseInt(data.offset) || 0;
            var alExcludePageView = data.excludePageView === true || data.excludePageView === 'true';
            var alActionFilter = (data.action && data.action !== 'all') ? data.action : null;
            var alFrom = data.dateFrom ? new Date(data.dateFrom + 'T00:00:00') : null;
            var alTo = data.dateTo ? new Date(data.dateTo + 'T23:59:59') : null;

            // ── ดึงข้อมูลจากหลายตารางพร้อมกัน ──
            var [alLogRows, alSlipRows, alSessRows, alReqRows, alAllUsers] = await Promise.all([
                sbGet('logs', { order: 'created_at.desc', limit: '3000' }).catch(function() { return []; }),
                sbGet('slip_submissions', { order: 'submitted_at.desc', limit: '1000', select: 'id,house_number,period,amount,status,submitted_at,reviewed_at,reviewed_by,resident_id' }).catch(function() { return []; }),
                sbGet('sessions', { order: 'created_at.desc', limit: '1000', select: 'user_id,role,created_at' }).catch(function() { return []; }),
                sbGet('requests', { order: 'submitted_at.desc', limit: '500', select: 'id,type,user_id,house_number,status,submitted_at,reviewed_at,reviewed_by' }).catch(function() { return []; }),
                sbGet('users', { is_active: 'eq.true', select: 'id,firstname,lastname,prefix,role' }).catch(function() { return []; })
            ]);

            // สร้าง userMap
            var alUserMap = {};
            (alAllUsers || []).forEach(function(u) { alUserMap[u.id] = u; });

            // ── แปลงข้อมูลทุกแหล่งเป็น unified timeline entries ──
            var alCombined = [];

            // 1) logs table
            (alLogRows || []).forEach(function(r) {
                alCombined.push({ id: r.id, action: r.action, user_id: r.user_id, description: r.description, meta: r.meta, created_at: r.created_at, _src: 'log' });
            });

            // 2) sessions → login events (ถ้ายังไม่มีใน logs)
            var alLogLoginKeys = {};
            (alLogRows || []).filter(function(r) { return r.action === 'login'; }).forEach(function(r) {
                var key = (r.user_id || '') + '_' + (r.created_at || '').substring(0, 13);
                alLogLoginKeys[key] = true;
            });
            (alSessRows || []).forEach(function(r) {
                var key = (r.user_id || '') + '_' + (r.created_at || '').substring(0, 13);
                if (!alLogLoginKeys[key]) {
                    var u = alUserMap[r.user_id];
                    var uName = u ? ((u.prefix||'') + (u.firstname||'') + ' ' + (u.lastname||'')).trim() : '';
                    alCombined.push({ id: 'sess_' + r.user_id + '_' + r.created_at, action: 'login', user_id: r.user_id, description: uName + ' เข้าสู่ระบบ', meta: { role: r.role }, created_at: r.created_at, _src: 'session' });
                }
            });

            // 3) slip_submissions → submit_slip + review_slip
            var alLogSlipKeys = {};
            (alLogRows || []).filter(function(r) { return r.action === 'submit_slip' || r.action === 'review_slip'; }).forEach(function(r) {
                var key = r.action + '_' + (r.meta && r.meta.house_number ? r.meta.house_number : '') + '_' + (r.created_at || '').substring(0, 16);
                alLogSlipKeys[key] = true;
            });
            (alSlipRows || []).forEach(function(r) {
                var subKey = 'submit_slip_' + (r.house_number||'') + '_' + (r.submitted_at||'').substring(0, 16);
                if (!alLogSlipKeys[subKey]) {
                    alCombined.push({ id: 'slip_sub_' + r.id, action: 'submit_slip', user_id: null, description: 'ส่งสลิปชำระเงิน ' + (r.house_number||'') + ' งวด ' + (r.period||''), meta: { house_number: r.house_number, period: r.period, amount: r.amount }, created_at: r.submitted_at, _src: 'slip' });
                }
                if (r.reviewed_at && r.reviewed_by) {
                    var revKey = 'review_slip_' + (r.house_number||'') + '_' + (r.reviewed_at||'').substring(0, 16);
                    if (!alLogSlipKeys[revKey]) {
                        alCombined.push({ id: 'slip_rev_' + r.id, action: 'review_slip', user_id: r.reviewed_by, description: (r.status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ') + 'สลิป ' + (r.house_number||'') + ' งวด ' + (r.period||''), meta: { house_number: r.house_number, period: r.period, status: r.status }, created_at: r.reviewed_at, _src: 'slip' });
                    }
                }
            });

            // 4) requests → submit_request + review_request
            var alLogReqKeys = {};
            (alLogRows || []).filter(function(r) { return r.action === 'submit_request' || r.action === 'review_request'; }).forEach(function(r) {
                var key = r.action + '_' + (r.meta && r.meta.requestId ? r.meta.requestId : '') + '_' + (r.created_at || '').substring(0, 16);
                alLogReqKeys[key] = true;
            });
            (alReqRows || []).forEach(function(r) {
                var subKey = 'submit_request_' + r.id + '_' + (r.submitted_at||'').substring(0, 16);
                if (!alLogReqKeys[subKey]) {
                    alCombined.push({ id: 'req_sub_' + r.id, action: 'submit_request', user_id: r.user_id, description: 'ส่งคำร้อง ' + (r.type||'') + ' ' + (r.house_number||''), meta: { requestId: r.id, type: r.type, house_number: r.house_number }, created_at: r.submitted_at, _src: 'request' });
                }
                if (r.reviewed_at && r.reviewed_by) {
                    var revKey2 = 'review_request_' + r.id + '_' + (r.reviewed_at||'').substring(0, 16);
                    if (!alLogReqKeys[revKey2]) {
                        alCombined.push({ id: 'req_rev_' + r.id, action: 'review_request', user_id: r.reviewed_by, description: (r.status||'') + ' คำร้อง ' + (r.type||'') + ' ' + (r.house_number||''), meta: { requestId: r.id, status: r.status }, created_at: r.reviewed_at, _src: 'request' });
                    }
                }
            });

            // ── filter ──
            alCombined = alCombined.filter(function(r) {
                if (!r.created_at) return false;
                var t = new Date(r.created_at);
                if (alFrom && t < alFrom) return false;
                if (alTo && t > alTo) return false;
                if (alActionFilter && r.action !== alActionFilter) return false;
                if (alExcludePageView && r.action === 'page_view') return false;
                return true;
            });

            // เรียงตามเวลาล่าสุดก่อน
            alCombined.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });

            var alTotal = alCombined.length;
            var alPaged = alCombined.slice(alOffset, alOffset + alLimit);

            // Enrich user names
            alPaged.forEach(function(r) {
                var u = alUserMap[r.user_id];
                r._userName = u ? ((u.prefix||'') + (u.firstname||'') + ' ' + (u.lastname||'')).trim() : (r.user_id ? r.user_id : '-');
                r._userRole = u ? (u.role || '') : '';
            });

            return { success: true, data: alPaged, total: alTotal };
        }

        case 'getActivityStats': {
            var asSess = await _getSessionRole();
            if (!asSess || (asSess.role !== 'admin' && asSess.role !== 'head')) {
                return { success: false, error: 'สิทธิ์ไม่เพียงพอ' };
            }
            var asToday = new Date().toISOString().split('T')[0];
            var asTodayLogs = await sbGet('logs', { 'created_at': 'gte.' + asToday + 'T00:00:00', select: 'action,user_id', limit: '5000' });
            var asLoginCount = 0, asPageViewCount = 0, asActiveUsers = {};
            (asTodayLogs || []).forEach(function(r) {
                if (r.action === 'login') asLoginCount++;
                if (r.action === 'page_view') asPageViewCount++;
                if (r.user_id) asActiveUsers[r.user_id] = true;
            });
            return { success: true, data: {
                todayLogins: asLoginCount,
                todayPageViews: asPageViewCount,
                todayActiveUsers: Object.keys(asActiveUsers).length,
                todayTotalActions: (asTodayLogs || []).length
            }};
        }

        /* ── Admin Executive Report (Comprehensive) ─────────── */
        case 'adminReport': {
            var arSess = await _getSessionRole();
            if (!arSess || (arSess.role !== 'admin' && arSess.role !== 'head')) {
                return { success: false, error: '\u0e2a\u0e34\u0e17\u0e18\u0e34\u0e4c\u0e44\u0e21\u0e48\u0e40\u0e1e\u0e35\u0e22\u0e07\u0e1e\u0e2d' };
            }
            var arPeriods = data.periods || [];
            if (!arPeriods.length) return { success: false, error: '\u0e44\u0e21\u0e48\u0e44\u0e14\u0e49\u0e23\u0e30\u0e1a\u0e38\u0e07\u0e27\u0e14' };

            // ── Parallel fetch ALL data ──
            var [arHousing, arResidents, arOutstanding, arRequests, arSlips,
                 arAccounting, arPayHist, arWaterBills, arElecBills,
                 arNotifs, arExemptions, arQueue, arAllSettings] = await Promise.all([
                sbGet('housing', { select: 'id,house_number,status,type' }).catch(function() { return []; }),
                sbGet('residents', { select: 'id,house_number,move_in_date,departed_at,is_active' }).catch(function() { return []; }),
                sbGet('outstanding', { select: 'id,house_number,period,water_amount,electric_amount,common_fee,garbage_fee,total_amount,status,moved_out_at' }).catch(function() { return []; }),
                sbGet('requests', { select: 'id,type,status,submitted_at' }).catch(function() { return []; }),
                sbGet('slip_submissions', { select: 'id,house_number,period,amount,status,submitted_at' }).catch(function() { return []; }),
                sbGet('accounting_entries', { select: 'id,period,type,category,description,amount,recorded_at' }).catch(function() { return []; }),
                sbGet('payment_history', { select: 'id,house_number,period,amount_paid,payment_date,payment_method' }).catch(function() { return []; }),
                sbGet('water_bills', { select: 'id,house_number,period,prev_meter,curr_meter,units_used,rate_per_unit,amount,status' }).catch(function() { return []; }),
                sbGet('electric_bills', { select: 'id,house_number,period,prev_meter,curr_meter,units_used,rate_per_unit,bill_amount,amount,method,status' }).catch(function() { return []; }),
                sbGet('notifications', { select: 'id,house_number,period,total_amount,sent_at' }).catch(function() { return []; }),
                sbGet('exemptions', { select: 'id,house_number,type,reason,start_date,end_date' }).catch(function() { return []; }),
                sbGet('queue', { select: 'id,user_id,position,status,created_at' }).catch(function() { return []; }),
                sbGet('settings', { select: 'key,value' }).catch(function() { return []; })
            ]);

            // ── Period helpers ──
            var arPeriodSet = {};
            arPeriods.forEach(function(p) { arPeriodSet[p] = true; });
            function _arDateToPeriod(d) {
                if (!d) return '';
                var dt = new Date(d);
                return (dt.getFullYear() + 543) + '-' + String(dt.getMonth() + 1).padStart(2, '0');
            }

            // ── 1. Housing overview ──
            var arHTotal = (arHousing || []).length;
            var arHOccupied = (arHousing || []).filter(function(h) { return h.status === 'occupied'; }).length;
            var arHAvailable = (arHousing || []).filter(function(h) { return h.status === 'available'; }).length;
            var arHMaint = (arHousing || []).filter(function(h) { return h.status === 'maintenance'; }).length;
            var arHouseCount = (arHousing || []).filter(function(h) { return h.type === 'house'; }).length;
            var arFlatCount = (arHousing || []).filter(function(h) { return h.type === 'flat'; }).length;
            var arActiveResidents = (arResidents || []).filter(function(r) { return r.is_active; }).length;
            var arMovedIn = 0, arMovedOut = 0;
            (arResidents || []).forEach(function(r) {
                var mip = _arDateToPeriod(r.move_in_date);
                if (mip && arPeriodSet[mip]) arMovedIn++;
                var mop = _arDateToPeriod(r.departed_at);
                if (mop && arPeriodSet[mop]) arMovedOut++;
            });

            // ── 2. Finance by period ──
            var arFinMap = {};
            arPeriods.forEach(function(p) {
                arFinMap[p] = { period: p, billed: 0, paid: 0, unpaid: 0, waived: 0, water: 0, electric: 0, common: 0, garbage: 0 };
            });
            var arTotalBilled = 0, arTotalPaid = 0, arTotalUnpaid = 0, arTotalWaived = 0;
            var arTotalWater = 0, arTotalElectric = 0, arTotalCommon = 0, arTotalGarbage = 0;
            (arOutstanding || []).forEach(function(o) {
                if (!arPeriodSet[o.period]) return;
                var bucket = arFinMap[o.period];
                if (!bucket) return;
                var amt = parseFloat(o.total_amount) || 0;
                var w = parseFloat(o.water_amount) || 0;
                var e = parseFloat(o.electric_amount) || 0;
                var c = parseFloat(o.common_fee) || 0;
                var g = parseFloat(o.garbage_fee) || 0;
                bucket.billed += amt;
                bucket.water += w; bucket.electric += e; bucket.common += c; bucket.garbage += g;
                arTotalBilled += amt; arTotalWater += w; arTotalElectric += e; arTotalCommon += c; arTotalGarbage += g;
                if (o.status === 'paid') { bucket.paid += amt; arTotalPaid += amt; }
                else if (o.status === 'waived') { bucket.waived += amt; arTotalWaived += amt; }
                else { bucket.unpaid += amt; arTotalUnpaid += amt; }
            });
            var arFinByPeriod = arPeriods.map(function(p) { return arFinMap[p]; }).filter(function(r) { return r.billed > 0 || r.paid > 0; });

            // ── 3. Requests ──
            var arReqMap = { residence: {}, transfer: {}, return: {}, repair: {} };
            function _arInitReq() { return { pending: 0, approved: 0, rejected: 0, cancelled: 0, total: 0 }; }
            ['residence','transfer','return','repair'].forEach(function(t) { arReqMap[t] = _arInitReq(); });
            (arRequests || []).forEach(function(r) {
                var rp = _arDateToPeriod(r.submitted_at);
                if (arPeriods.length > 0 && !arPeriodSet[rp]) return;
                var bucket = arReqMap[r.type];
                if (!bucket) return;
                bucket.total++;
                if (r.status === 'pending' || r.status === 'reviewing' || r.status === 'waiting') bucket.pending++;
                else if (r.status === 'approved' || r.status === 'completed') bucket.approved++;
                else if (r.status === 'rejected') bucket.rejected++;
                else if (r.status === 'cancelled') bucket.cancelled++;
            });

            // ── 4. Slips ──
            var arSlipMap = {};
            arPeriods.forEach(function(p) {
                arSlipMap[p] = { period: p, total: 0, approved: 0, rejected: 0, pending: 0 };
            });
            var arSlipTotal = 0, arSlipApproved = 0, arSlipRejected = 0, arSlipPending = 0;
            (arSlips || []).forEach(function(s) {
                if (!arPeriodSet[s.period]) return;
                var bucket = arSlipMap[s.period];
                if (!bucket) return;
                bucket.total++; arSlipTotal++;
                if (s.status === 'approved') { bucket.approved++; arSlipApproved++; }
                else if (s.status === 'rejected') { bucket.rejected++; arSlipRejected++; }
                else { bucket.pending++; arSlipPending++; }
            });
            var arSlipByPeriod = arPeriods.map(function(p) { return arSlipMap[p]; }).filter(function(r) { return r.total > 0; });

            // ── 5. Accounting (income / expense) ──
            var arAcctMap = {};
            arPeriods.forEach(function(p) { arAcctMap[p] = { period: p, income: 0, expense: 0, incomeCount: 0, expenseCount: 0 }; });
            var arTotalIncome = 0, arTotalExpense = 0;
            (arAccounting || []).forEach(function(a) {
                if (!arPeriodSet[a.period]) return;
                var bucket = arAcctMap[a.period];
                if (!bucket) return;
                var amt = parseFloat(a.amount) || 0;
                if (a.type === 'income') { bucket.income += amt; bucket.incomeCount++; arTotalIncome += amt; }
                else if (a.type === 'expense') { bucket.expense += amt; bucket.expenseCount++; arTotalExpense += amt; }
            });
            var arAcctByPeriod = arPeriods.map(function(p) { return arAcctMap[p]; }).filter(function(r) { return r.income > 0 || r.expense > 0; });

            // ── 6. Monthly Withdraw (from settings) ──
            var arWithdrawals = [];
            var arTotalWithdraw = 0;
            (arAllSettings || []).forEach(function(s) {
                if (!s.key || !s.key.startsWith('monthly_withdraw_')) return;
                var period = s.key.replace('monthly_withdraw_', '');
                if (!arPeriodSet[period]) return;
                try {
                    var val = JSON.parse(s.value);
                    val.period = period;
                    arWithdrawals.push(val);
                    arTotalWithdraw += parseFloat(val.totalWithdraw) || 0;
                } catch(e) {}
            });
            arWithdrawals.sort(function(a, b) { return a.period.localeCompare(b.period); });

            // ── 7. Payment History ──
            var arPayMap = {};
            arPeriods.forEach(function(p) { arPayMap[p] = { period: p, count: 0, totalAmount: 0, transfer: 0, cash: 0 }; });
            var arPayTotal = 0, arPayAmount = 0, arPayTransfer = 0, arPayCash = 0;
            (arPayHist || []).forEach(function(ph) {
                if (!arPeriodSet[ph.period]) return;
                var bucket = arPayMap[ph.period];
                if (!bucket) return;
                var amt = parseFloat(ph.amount_paid) || 0;
                bucket.count++; bucket.totalAmount += amt; arPayTotal++; arPayAmount += amt;
                if (ph.payment_method === 'cash') { bucket.cash++; arPayCash++; }
                else { bucket.transfer++; arPayTransfer++; }
            });
            var arPayByPeriod = arPeriods.map(function(p) { return arPayMap[p]; }).filter(function(r) { return r.count > 0; });

            // ── 8. Water Bills ──
            var arWaterMap = {};
            arPeriods.forEach(function(p) { arWaterMap[p] = { period: p, count: 0, totalUnits: 0, totalAmount: 0 }; });
            var arWaterTotalBills = 0, arWaterTotalUnits = 0, arWaterTotalAmt = 0;
            (arWaterBills || []).forEach(function(wb) {
                if (!arPeriodSet[wb.period]) return;
                var bucket = arWaterMap[wb.period];
                if (!bucket) return;
                bucket.count++; arWaterTotalBills++;
                var u = parseFloat(wb.units_used) || 0;
                var a = parseFloat(wb.amount) || 0;
                bucket.totalUnits += u; bucket.totalAmount += a;
                arWaterTotalUnits += u; arWaterTotalAmt += a;
            });
            var arWaterByPeriod = arPeriods.map(function(p) { return arWaterMap[p]; }).filter(function(r) { return r.count > 0; });

            // ── 9. Electric Bills ──
            var arElecMap = {};
            arPeriods.forEach(function(p) { arElecMap[p] = { period: p, count: 0, totalUnits: 0, totalAmount: 0, totalPEA: 0 }; });
            var arElecTotalBills = 0, arElecTotalUnits = 0, arElecTotalAmt = 0, arElecTotalPEA = 0;
            (arElecBills || []).forEach(function(eb) {
                if (!arPeriodSet[eb.period]) return;
                var bucket = arElecMap[eb.period];
                if (!bucket) return;
                bucket.count++; arElecTotalBills++;
                var u = parseFloat(eb.units_used) || 0;
                var a = parseFloat(eb.amount) || 0;
                var pea = parseFloat(eb.bill_amount) || 0;
                bucket.totalUnits += u; bucket.totalAmount += a; bucket.totalPEA += pea;
                arElecTotalUnits += u; arElecTotalAmt += a; arElecTotalPEA += pea;
            });
            var arElecByPeriod = arPeriods.map(function(p) { return arElecMap[p]; }).filter(function(r) { return r.count > 0; });
            // Electric lost from settings
            var arElecLost = [];
            (arAllSettings || []).forEach(function(s) {
                if (!s.key || !s.key.startsWith('electric_lost_')) return;
                var period = s.key.replace('electric_lost_', '');
                if (!arPeriodSet[period]) return;
                try { var val = JSON.parse(s.value); val.period = period; arElecLost.push(val); } catch(e) {}
            });
            arElecLost.sort(function(a, b) { return a.period.localeCompare(b.period); });

            // ── 10. Notifications ──
            var arNotifMap = {};
            arPeriods.forEach(function(p) { arNotifMap[p] = { period: p, count: 0, totalAmount: 0 }; });
            var arNotifTotal = 0, arNotifTotalAmt = 0;
            (arNotifs || []).forEach(function(n) {
                if (!arPeriodSet[n.period]) return;
                var bucket = arNotifMap[n.period];
                if (!bucket) return;
                bucket.count++; arNotifTotal++;
                var amt = parseFloat(n.total_amount) || 0;
                bucket.totalAmount += amt; arNotifTotalAmt += amt;
            });
            var arNotifByPeriod = arPeriods.map(function(p) { return arNotifMap[p]; }).filter(function(r) { return r.count > 0; });

            // ── 11. Exemptions ──
            var arExemptByType = { water: 0, electric: 0, common_fee: 0, garbage: 0 };
            var arExemptTotal = (arExemptions || []).length;
            (arExemptions || []).forEach(function(ex) {
                if (arExemptByType.hasOwnProperty(ex.type)) arExemptByType[ex.type]++;
            });

            // ── 12. Queue ──
            var arQueueWaiting = (arQueue || []).filter(function(q) { return q.status === 'waiting'; }).length;
            var arQueueAssigned = (arQueue || []).filter(function(q) { return q.status === 'assigned'; }).length;
            var arQueueExpired = (arQueue || []).filter(function(q) { return q.status === 'expired'; }).length;
            var arQueueTotal = (arQueue || []).length;

            return {
                success: true,
                data: {
                    housing: { total: arHTotal, occupied: arHOccupied, available: arHAvailable, maintenance: arHMaint, houseCount: arHouseCount, flatCount: arFlatCount, activeResidents: arActiveResidents, movedIn: arMovedIn, movedOut: arMovedOut },
                    finance: {
                        summary: { totalBilled: arTotalBilled, totalPaid: arTotalPaid, totalUnpaid: arTotalUnpaid, totalWaived: arTotalWaived, totalWater: arTotalWater, totalElectric: arTotalElectric, totalCommon: arTotalCommon, totalGarbage: arTotalGarbage },
                        byPeriod: arFinByPeriod
                    },
                    requests: arReqMap,
                    slips: {
                        summary: { total: arSlipTotal, approved: arSlipApproved, rejected: arSlipRejected, pending: arSlipPending },
                        byPeriod: arSlipByPeriod
                    },
                    accounting: {
                        summary: { totalIncome: arTotalIncome, totalExpense: arTotalExpense, balance: arTotalIncome - arTotalExpense },
                        byPeriod: arAcctByPeriod
                    },
                    withdrawals: { total: arTotalWithdraw, byPeriod: arWithdrawals },
                    payments: {
                        summary: { total: arPayTotal, totalAmount: arPayAmount, transfer: arPayTransfer, cash: arPayCash },
                        byPeriod: arPayByPeriod
                    },
                    waterBills: {
                        summary: { totalBills: arWaterTotalBills, totalUnits: arWaterTotalUnits, totalAmount: arWaterTotalAmt },
                        byPeriod: arWaterByPeriod
                    },
                    electricBills: {
                        summary: { totalBills: arElecTotalBills, totalUnits: arElecTotalUnits, totalAmount: arElecTotalAmt, totalPEA: arElecTotalPEA },
                        byPeriod: arElecByPeriod,
                        lostData: arElecLost
                    },
                    notifications: {
                        summary: { total: arNotifTotal, totalAmount: arNotifTotalAmt },
                        byPeriod: arNotifByPeriod
                    },
                    exemptions: { total: arExemptTotal, byType: arExemptByType },
                    queue: { total: arQueueTotal, waiting: arQueueWaiting, assigned: arQueueAssigned, expired: arQueueExpired }
                }
            };
        }

        default:
            throw new Error('Unknown action: ' + action);
    }
}

/* ══════════════════════════════════════════
   Auto-Sync Accounting — อัปเดตรายการ auto ในบัญชี
   เมื่อบันทึกค่าน้ำ/ค่าไฟ จะอัปเดตเฉพาะรายการ auto
   โดยไม่กระทบรายการ manual ที่เพิ่มด้วยมือ
══════════════════════════════════════════ */
async function _autoSyncAccounting(period) {
    if (!period) return;
    // ── บัญชีกองกลาง: ค่าน้ำ/ค่าไฟ = เงินฝากจ่าย (pass-through) ไม่นับ ──
    // รายรับ: ค่าส่วนกลาง + ส่วนต่างค่าไฟปัดเศษ
    // รายจ่าย: Lost ไฟฟ้า (บ้านพัก + แฟลต) + ค่าขยะ

    // ── 1. ดึงค่าส่วนกลาง + ค่าไฟ + หมายเลขบ้าน จาก notifications (ใช้ค่าที่บันทึกไว้เฉพาะเดือน)
    var notifRes, _exemptRows, _mcRows, lostRows, wdRows;
    // ── Parallel fetch: notifications, exemptions, min_charge, electric_lost, monthly_withdraw ──
    var _fetchResults = await Promise.all([
        sbGet('notifications', { period: 'eq.' + period, select: 'common_fee,house_number,electric_amount,garbage_fee' }).catch(function() { return []; }),
        sbGet('exemptions', { type: 'eq.common_fee', select: 'house_number' }).catch(function() { return []; }),
        sbGet('settings', { key: 'eq.electric_min_charge' }).catch(function() { return []; }),
        sbGet('settings', { key: 'eq.electric_lost_' + period }).catch(function() { return []; }),
        sbGet('settings', { key: 'eq.monthly_withdraw_' + period }).catch(function() { return []; })
    ]);
    notifRes = _fetchResults[0] || [];
    _exemptRows = _fetchResults[1] || [];
    _mcRows = _fetchResults[2] || [];
    lostRows = _fetchResults[3] || [];
    wdRows = _fetchResults[4] || [];

    // build exemptSet ก่อนเสมอ เพื่อกรองออกจาก SUM ค่าส่วนกลาง
    var _exemptSet = {};
    (_exemptRows).forEach(function(ex) { if (ex.house_number) _exemptSet[ex.house_number] = true; });
    // SUM เฉพาะบ้านที่ไม่ถูกยกเว้น (กรอง exempt ออก ป้องกัน data เก่าที่บันทึกก่อนมีระบบ exempt)
    var commonTotal = (notifRes).reduce(function(s, r) {
        if (_exemptSet[r.house_number]) return s;
        return s + (parseFloat(r.common_fee) || 0);
    }, 0);
    var _minChargeVal = (_mcRows && _mcRows[0] && _mcRows[0].value) ? parseFloat(_mcRows[0].value) || 9 : 9;
    // คำนวณค่าไฟขั้นต่ำบ้านว่าง
    var _vacantCount = 0, _vacantMinTotal = 0;
    (notifRes).forEach(function(n) {
        var hn = n.house_number || '';
        var elAmt = parseFloat(n.electric_amount) || 0;
        if (_exemptSet[hn] && elAmt > 0 && Math.abs(elAmt - _minChargeVal) < 0.01) {
            _vacantCount++;
            _vacantMinTotal += elAmt;
        }
    });
    // ── 2. คำนวณส่วนต่างค่าไฟ
    var electricDiff = 0, lostHouseAmt = 0, lostFlatAmt = 0;
    if (lostRows && lostRows[0]) {
        try {
            var ld = JSON.parse(lostRows[0].value);
            lostHouseAmt = parseFloat(ld.lost_house) || 0;
            lostFlatAmt = parseFloat(ld.lost_flat) || 0;
            var peaTotal = parseFloat(ld.pea_total) || 0;
            if (peaTotal > 0) {
                var eBills = await sbGet('electric_bills', { period: 'eq.' + period, select: 'amount' }).catch(function() { return []; });
                var eBillTotal = (eBills || []).reduce(function(s, r) { return s + (parseFloat(r.amount) || 0); }, 0);
                electricDiff = Math.round((eBillTotal + lostHouseAmt + lostFlatAmt - peaTotal) * 100) / 100;
            }
        } catch(e) {}
    }
    // ── 3. ค่าขยะ + ค่าใช้จ่ายอื่นๆ + ค่าดำเนินการ
    var withdrawGarbage = 0, withdrawAdditionalItems = [], withdrawOperatingCosts = {};
    if (wdRows && wdRows[0] && wdRows[0].value) {
        try {
            var wd = JSON.parse(wdRows[0].value);
            withdrawGarbage = parseFloat(wd.garbageFee) || 0;
            if (wd.additionalItems && wd.additionalItems.length) {
                for (var ai = 0; ai < wd.additionalItems.length; ai++) {
                    var itm = wd.additionalItems[ai];
                    if (itm.name && parseFloat(itm.amount) > 0) {
                        withdrawAdditionalItems.push({ name: itm.name, amount: parseFloat(itm.amount) });
                    }
                }
            }
            withdrawOperatingCosts = wd.operatingCosts || {};
        } catch(e) {}
    }
    // fallback ค่าขยะจาก notifications
    if (withdrawGarbage <= 0) {
        try {
            var gfSettRow = await sbGet('settings', { key: 'eq.garbage_fee' });
            var gfRate = (gfSettRow && gfSettRow[0]) ? parseFloat(gfSettRow[0].value) || 0 : 0;
            if (gfRate > 0) {
                var gfTotal = (notifRes).reduce(function(s,r){ return s + (parseFloat(r.garbage_fee) || 0); }, 0);
                if (gfTotal > 0) withdrawGarbage = gfTotal;
            }
        } catch(e) {}
    }
    // ── 4. ลบ auto entries เก่า
    await sbDelete('accounting_entries', { period: 'eq.' + period, category: 'eq.auto' });
    var pParts = period.split('-');
    var pYear  = parseInt(pParts[0]) || new Date().getFullYear();
    var pMonth = parseInt(pParts[1]) || (new Date().getMonth() + 1);
    var ts = new Date().toISOString();
    // ── 5. Build all entries + batch insert ──
    var _autoEntries = [];
    if (commonTotal > 0) _autoEntries.push({ period: period, year: pYear, month: pMonth, type: 'income', category: 'auto', description: 'ค่าส่วนกลาง', amount: commonTotal, recorded_at: ts });
    if (electricDiff > 0) _autoEntries.push({ period: period, year: pYear, month: pMonth, type: 'income', category: 'auto', description: 'ส่วนต่างค่าไฟ', amount: electricDiff, recorded_at: ts });
    if (electricDiff < 0) _autoEntries.push({ period: period, year: pYear, month: pMonth, type: 'expense', category: 'auto', description: 'ส่วนต่างค่าไฟ (ติดลบ)', amount: Math.abs(electricDiff), recorded_at: ts });
    if (lostHouseAmt > 0) _autoEntries.push({ period: period, year: pYear, month: pMonth, type: 'expense', category: 'auto', description: 'ค่า Lost ไฟฟ้า (บ้านพัก)', amount: lostHouseAmt, recorded_at: ts });
    if (lostFlatAmt > 0) _autoEntries.push({ period: period, year: pYear, month: pMonth, type: 'expense', category: 'auto', description: 'ค่า Lost ไฟฟ้า (แฟลต)', amount: lostFlatAmt, recorded_at: ts });
    if (_vacantMinTotal > 0) _autoEntries.push({ period: period, year: pYear, month: pMonth, type: 'expense', category: 'auto', description: 'ค่าไฟขั้นต่ำบ้านว่าง (' + _vacantCount + ' หลัง \u00d7 ' + _minChargeVal + ' บ.)', amount: _vacantMinTotal, recorded_at: ts });
    if (withdrawGarbage > 0) _autoEntries.push({ period: period, year: pYear, month: pMonth, type: 'expense', category: 'auto', description: 'ค่าขยะ', amount: withdrawGarbage, recorded_at: ts });
    for (var wi = 0; wi < withdrawAdditionalItems.length; wi++) {
        _autoEntries.push({ period: period, year: pYear, month: pMonth, type: 'expense', category: 'auto', description: withdrawAdditionalItems[wi].name, amount: withdrawAdditionalItems[wi].amount, recorded_at: ts });
    }
    var ocRounding = parseFloat(withdrawOperatingCosts.roundingFee) || 0;
    var ocTravelWithdraw = parseFloat(withdrawOperatingCosts.travelWithdraw) || 0;
    var ocTravelElectric = parseFloat(withdrawOperatingCosts.travelElectric) || 0;
    var ocTravelGarbage = parseFloat(withdrawOperatingCosts.travelGarbage) || 0;
    if (ocRounding > 0) _autoEntries.push({ period: period, year: pYear, month: pMonth, type: 'expense', category: 'auto', description: 'ค่าดำเนินการ (ปัดเศษ)', amount: ocRounding, recorded_at: ts });
    if (ocTravelWithdraw > 0) _autoEntries.push({ period: period, year: pYear, month: pMonth, type: 'expense', category: 'auto', description: 'ค่าเดินทางถอนเงิน', amount: ocTravelWithdraw, recorded_at: ts });
    if (ocTravelElectric > 0) _autoEntries.push({ period: period, year: pYear, month: pMonth, type: 'expense', category: 'auto', description: 'ค่าเดินทางชำระค่าไฟ', amount: ocTravelElectric, recorded_at: ts });
    if (ocTravelGarbage > 0) _autoEntries.push({ period: period, year: pYear, month: pMonth, type: 'expense', category: 'auto', description: 'ค่าเดินทางชำระค่าขยะ', amount: ocTravelGarbage, recorded_at: ts });
    // ── 6. สำรองจ่าย / ทดรองจ่าย (advance_payments) ──
    try {
        var advRows = await sbGet('advance_payments', { period: 'eq.' + period });
        (advRows || []).forEach(function(adv) {
            var advAmt = parseFloat(adv.amount) || 0;
            var advReimb = parseFloat(adv.reimbursed_amount) || 0;
            var srcLabel = adv.source_type === 'bank_transfer' ? 'เงินในระบบ' : 'สำรองจ่าย';
            if (advAmt > 0) {
                _autoEntries.push({ period: period, year: pYear, month: pMonth, type: 'income', category: 'auto', description: srcLabel + (adv.source_type !== 'bank_transfer' ? 'จาก ' : '') + (adv.person_name || '-') + (adv.purpose ? ' (' + adv.purpose + ')' : ''), amount: advAmt, recorded_at: ts });
            }
            // เงินในระบบไม่ต้องคืน — สร้าง entry คืนเฉพาะกรรมการสำรอง
            if (advReimb > 0 && adv.source_type !== 'bank_transfer') {
                _autoEntries.push({ period: period, year: pYear, month: pMonth, type: 'expense', category: 'auto', description: 'คืนเงิน' + srcLabel + ' ' + (adv.person_name || '-'), amount: advReimb, recorded_at: ts });
            }
        });
    } catch(e) { console.warn('autoSync advance_payments error', e); }
    if (_autoEntries.length > 0) await sbPost('accounting_entries', _autoEntries);
}

/* ══════════════════════════════════════════
   Auto-Backup — บันทึก snapshot ก่อนการเขียนทุกครั้ง
   เรียกก่อน delete/patch ในทุก action ที่ทำลายข้อมูล
══════════════════════════════════════════ */
async function _autoBackup(action, description, table, filterKey, filterValue, userId, preRows) {
    try {
        var rows = preRows;
        if (!rows && filterKey && filterValue != null) {
            var q = {};
            q[filterKey] = 'eq.' + filterValue;
            rows = (await sbGet(table, q)) || [];
        }
        rows = rows || [];
        await sbPost('data_backups', {
            action:         action,
            description:    description,
            affected_table: table,
            filter_key:     filterKey  || null,
            filter_value:   filterValue != null ? String(filterValue) : null,
            record_count:   rows.length,
            previous_data:  rows,
            created_by:     userId || null
        });
    } catch(e) {
        console.warn('_autoBackup failed (non-critical):', e);
    }
}

/* ══════════════════════════════════════════
   Edge Function Caller
══════════════════════════════════════════ */
async function _callEdge(funcName, payload) {
    var cfg = window._PPK_CONFIG || {};
    if (!cfg.url) return { success: false, error: 'PPK Config ไม่พร้อม' };
    var edgeUrl = cfg.url.replace(/\/$/, '') + '/functions/v1/' + funcName;
    try {
        var res = await fetch(edgeUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': cfg.anon || '',
                'Authorization': 'Bearer ' + (cfg.anon || '')
            },
            body: JSON.stringify(payload || {})
        });
        if (!res.ok) {
            var errText = '';
            try { var ej = await res.json(); errText = ej.error || ej.message || ej.msg || ''; } catch(_e) { errText = await res.text().catch(function(){ return ''; }); }
            return { success: false, error: errText || ('HTTP ' + res.status) };
        }
        var json = await res.json();
        return json;
    } catch(e) {
        return { success: false, error: e.message };
    }
}



/* ══════════════════════════════════════════
   CACHE — Stale-while-revalidate (5 นาที)
══════════════════════════════════════════ */
async function cachedCall(action, params, ttlMs) {
    ttlMs = ttlMs || 300000;
    var ck = 'apicache_' + action + '_' + JSON.stringify(params || {});
    var fresh = null;
    try {
        var s = localStorage.getItem(ck);
        if (s) fresh = JSON.parse(s);
    } catch(e) {}

    // ถ้า cache ยังไม่หมดอายุ → คืนทันที
    if (fresh && fresh.d && (Date.now() - fresh.t <= ttlMs)) {
        return fresh.d;
    }

    // cache หมดอายุ หรือไม่มี → ดึงข้อมูลใหม่ (รอ)
    var r = await callBackend(action, params || {});
    if (r && r.success !== false) {
        try { localStorage.setItem(ck, JSON.stringify({ t: Date.now(), d: r })); } catch(e) {}
        return r;
    }
    // ถ้า fetch ล้มเหลวแต่มี stale data → ใช้ stale เป็น fallback
    if (fresh && fresh.d) { fresh.d._isStale = true; return fresh.d; }
    return r;
}

// ลบ cache ที่เกี่ยวข้องกับ residents/housing (เรียกหลัง admin แก้ไขข้อมูล)
function invalidateResidentCache() {
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('apicache_getResidents') === 0) keys.push(k);
        if (k && k.indexOf('apicache_getHousing') === 0) keys.push(k);
    }
    keys.forEach(function(k) { localStorage.removeItem(k); });
}

/* ══════════════════════════════════════════
   Inspections — ระบบตรวจสภาพบ้าน
══════════════════════════════════════════ */
async function createInspection(d) {
    if (!d.requestId || !d.inspectorId) return { success: false, error: 'ข้อมูลไม่ครบ' };
    try {
        var row = await sbPost('inspections', {
            request_id:      d.requestId,
            house_id:        d.houseId || null,
            inspector_id:    d.inspectorId,
            items:           d.items || {},
            photos:          d.photos || [],
            damage_estimate: parseFloat(d.damageEstimate) || 0,
            note:            d.note || null,
            status:          d.status || 'pending'
        });
        return { success: true, inspection: row };
    } catch(e) { return { success: false, error: e.message }; }
}

async function getInspection(requestId) {
    if (!requestId) return { success: false, error: 'ต้องระบุ requestId' };
    try {
        var rows = await sbGet('inspections', { request_id: 'eq.' + requestId, order: 'created_at.desc', limit: 1 });
        return { success: true, inspection: (rows && rows[0]) || null };
    } catch(e) { return { success: false, error: e.message }; }
}

/* ══════════════════════════════════════════
   MOU — ระบบสัญญาเช่าบ้านพักครู
══════════════════════════════════════════ */
async function createMouDraft(d) {
    if (!d.requestId || !d.residentId) return { success: false, error: 'ข้อมูลไม่ครบ' };
    try {
        // ดึง template จาก settings
        var settRows = await sbGet('settings', { key: 'eq.mou_template' }).catch(function() { return []; });
        var template = (settRows && settRows[0] && settRows[0].value) || '';
        var row = await sbPost('mou_documents', {
            request_id:       d.requestId,
            resident_id:      d.residentId,
            house_id:         d.houseId || null,
            template_version: d.templateVersion || '1.0',
            content:          d.content || { template: template },
            status:           'pending_sign'
        });
        return { success: true, mou: row };
    } catch(e) { return { success: false, error: e.message }; }
}

async function getMouByRequest(requestId) {
    if (!requestId) return { success: false, error: 'ต้องระบุ requestId' };
    try {
        var rows = await sbGet('mou_documents', { request_id: 'eq.' + requestId, order: 'created_at.desc', limit: 1 });
        return { success: true, mou: (rows && rows[0]) || null };
    } catch(e) { return { success: false, error: e.message }; }
}

async function getMousByResident(residentId) {
    if (!residentId) return { success: false, error: 'ต้องระบุ residentId' };
    try {
        var rows = await sbGet('mou_documents', { resident_id: 'eq.' + residentId, order: 'created_at.desc' });
        return { success: true, mous: rows || [] };
    } catch(e) { return { success: false, error: e.message }; }
}

async function getAllMous(opts) {
    try {
        var q = { order: 'created_at.desc' };
        if (opts && opts.status) q.status = 'eq.' + opts.status;
        var rows = await sbGet('mou_documents', q);
        return { success: true, mous: rows || [] };
    } catch(e) { return { success: false, error: e.message }; }
}

async function uploadMouSignature(d) {
    // d: { mouId, role (resident/admin/head), signatureDataUrl }
    if (!d.mouId || !d.role || !d.signatureDataUrl) return { success: false, error: 'ข้อมูลไม่ครบ' };
    try {
        // Convert data URL to blob and upload to storage
        var base64 = d.signatureDataUrl.split(',')[1];
        var mimeType = 'image/png';
        var binary = atob(base64);
        var bytes = new Uint8Array(binary.length);
        for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        var blob = new Blob([bytes], { type: mimeType });
        var path = 'signatures/' + d.mouId + '_' + d.role + '_' + Date.now() + '.png';
        var { data: storageData, error: storageError } = await window._supabase.storage
            .from('mou-documents').upload(path, blob, { contentType: mimeType, upsert: true });
        if (storageError) return { success: false, error: storageError.message };
        var { data: urlData } = window._supabase.storage.from('mou-documents').getPublicUrl(path);
        var signUrl = urlData && urlData.publicUrl;
        var patch = {};
        if (d.role === 'resident') patch.sign_resident_url = signUrl;
        else if (d.role === 'admin') patch.sign_admin_url = signUrl;
        else if (d.role === 'head')  patch.sign_head_url  = signUrl;
        patch.updated_at = new Date().toISOString();
        // ถ้าครบ 3 ลายเซ็น → signed
        var existing = await sbGet('mou_documents', { id: 'eq.' + d.mouId }).catch(function() { return []; });
        var mou = existing && existing[0];
        if (mou) {
            var resSign  = patch.sign_resident_url || mou.sign_resident_url;
            var admSign  = patch.sign_admin_url    || mou.sign_admin_url;
            var heaSign  = patch.sign_head_url     || mou.sign_head_url;
            if (resSign && admSign && heaSign) { patch.status = 'signed'; patch.signed_at = new Date().toISOString(); }
        }
        await sbPatch('mou_documents', { id: 'eq.' + d.mouId }, patch);
        return { success: true, signUrl: signUrl };
    } catch(e) { return { success: false, error: e.message }; }
}

async function uploadMouScan(d) {
    if (!d.mouId || !d.file) return { success: false, error: 'ข้อมูลไม่ครบ' };
    try {
        var path = 'scans/' + d.mouId + '_' + Date.now() + '.' + (d.file.name.split('.').pop() || 'pdf');
        var { error: uploadError } = await window._supabase.storage
            .from('mou-documents').upload(path, d.file, { contentType: d.file.type, upsert: true });
        if (uploadError) return { success: false, error: uploadError.message };
        var { data: urlData } = window._supabase.storage.from('mou-documents').getPublicUrl(path);
        var scanUrl = urlData && urlData.publicUrl;
        await sbPatch('mou_documents', { id: 'eq.' + d.mouId }, { scanned_url: scanUrl, status: 'signed', signed_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        return { success: true, scanUrl: scanUrl };
    } catch(e) { return { success: false, error: e.message }; }
}

/* ══════════════════════════════════════════
   Meetings — ระบบบันทึกการประชุม
══════════════════════════════════════════ */
async function createMeeting(d) {
    if (!d.title || !d.meetingDate || !d.createdBy) return { success: false, error: 'ข้อมูลไม่ครบ' };
    try {
        var row = await sbPost('meetings', {
            title:        d.title,
            agenda:       d.agenda || null,
            venue:        d.venue || null,
            meeting_date: d.meetingDate,
            attendees:    d.attendees || [],
            quorum_met:   d.quorumMet === true,
            resolutions:  d.resolutions || [],
            minutes:      d.minutes || null,
            status:       d.status || 'draft',
            created_by:   d.createdBy
        });
        return { success: true, meeting: row };
    } catch(e) { return { success: false, error: e.message }; }
}

async function updateMeeting(d) {
    if (!d.id) return { success: false, error: 'ต้องระบุ id' };
    try {
        var patch = {};
        if (d.title        !== undefined) patch.title        = d.title;
        if (d.agenda       !== undefined) patch.agenda       = d.agenda;
        if (d.venue        !== undefined) patch.venue        = d.venue;
        if (d.meetingDate  !== undefined) patch.meeting_date = d.meetingDate;
        if (d.attendees    !== undefined) patch.attendees    = d.attendees;
        if (d.quorumMet    !== undefined) patch.quorum_met   = d.quorumMet;
        if (d.resolutions  !== undefined) patch.resolutions  = d.resolutions;
        if (d.minutes      !== undefined) patch.minutes      = d.minutes;
        if (d.status       !== undefined) patch.status       = d.status;
        if (d.approvedBy   !== undefined) patch.approved_by  = d.approvedBy;
        patch.updated_at = new Date().toISOString();
        await sbPatch('meetings', { id: 'eq.' + d.id }, patch);
        return { success: true };
    } catch(e) { return { success: false, error: e.message }; }
}

async function getMeetings(opts) {
    try {
        var q = { order: 'meeting_date.desc' };
        if (opts && opts.status) q.status = 'eq.' + opts.status;
        var rows = await sbGet('meetings', q);
        return { success: true, meetings: rows || [] };
    } catch(e) { return { success: false, error: e.message }; }
}

async function getMeetingById(id) {
    if (!id) return { success: false, error: 'ต้องระบุ id' };
    try {
        var rows = await sbGet('meetings', { id: 'eq.' + id });
        return { success: true, meeting: (rows && rows[0]) || null };
    } catch(e) { return { success: false, error: e.message }; }
}

async function approveMeeting(id, approvedBy) {
    if (!id || !approvedBy) return { success: false, error: 'ข้อมูลไม่ครบ' };
    try {
        await sbPatch('meetings', { id: 'eq.' + id }, { status: 'approved', approved_by: approvedBy, updated_at: new Date().toISOString() });
        return { success: true };
    } catch(e) { return { success: false, error: e.message }; }
}

/* ══════════════════════════════════════════
   Warnings — ระบบหนังสือตักเตือน
══════════════════════════════════════════ */
async function createWarning(d) {
    if (!d.userId || !d.level || !d.reason || !d.issuedBy) return { success: false, error: 'ข้อมูลไม่ครบ' };
    try {
        var row = await sbPost('warnings', {
            user_id:   d.userId,
            house_id:  d.houseId || null,
            level:     parseInt(d.level),
            reason:    d.reason,
            note:      d.note || null,
            issued_by: d.issuedBy
        });
        return { success: true, warning: row };
    } catch(e) { return { success: false, error: e.message }; }
}

async function getWarningsByUser(userId) {
    if (!userId) return { success: false, error: 'ต้องระบุ userId' };
    try {
        var rows = await sbGet('warnings', { user_id: 'eq.' + userId, order: 'issued_at.desc' });
        return { success: true, warnings: rows || [] };
    } catch(e) { return { success: false, error: e.message }; }
}

async function getWarningsByHouse(houseId) {
    if (!houseId) return { success: false, error: 'ต้องระบุ houseId' };
    try {
        var rows = await sbGet('warnings', { house_id: 'eq.' + houseId, order: 'issued_at.desc' });
        return { success: true, warnings: rows || [] };
    } catch(e) { return { success: false, error: e.message }; }
}

async function getAllWarnings() {
    try {
        var rows = await sbGet('warnings', { order: 'issued_at.desc' });
        return { success: true, warnings: rows || [] };
    } catch(e) { return { success: false, error: e.message }; }
}

async function acknowledgeWarning(warningId) {
    if (!warningId) return { success: false, error: 'ต้องระบุ warningId' };
    try {
        var rows = await sbPatch('warnings', { id: 'eq.' + warningId }, { acknowledged_at: new Date().toISOString() });
        return { success: true };
    } catch(e) { return { success: false, error: e.message }; }
}

/* ══════════════════════════════════════════
   getAnnualReport — รายงานสรุปรายปี
══════════════════════════════════════════ */
async function getAnnualReport(year) {
    if (!year) return { success: false, error: 'ต้องระบุปี' };
    try {
        var incRows = await sbGet('accounting_entries', { year: 'eq.' + year, type: 'eq.income',  select: 'month,amount' });
        var expRows = await sbGet('accounting_entries', { year: 'eq.' + year, type: 'eq.expense', select: 'month,amount' });
        var byMonth = {};
        for (var m = 1; m <= 12; m++) byMonth[m] = { month: m, income: 0, expense: 0 };
        (incRows || []).forEach(function(r) { if (r.month) byMonth[r.month].income += (parseFloat(r.amount) || 0); });
        (expRows || []).forEach(function(r) { if (r.month) byMonth[r.month].expense += (parseFloat(r.amount) || 0); });
        return { success: true, months: Object.values(byMonth) };
    } catch(e) {
        return { success: false, error: e.message };
    }
}

/* ══════════════════════════════════════════
   Register real implementations for ppk-app.js stubs
══════════════════════════════════════════ */
window._callBackendReal = callBackend;
window._cachedCallReal  = cachedCall;
