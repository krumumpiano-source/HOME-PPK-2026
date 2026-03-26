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
(function initSbClient() {
  function tryInit(tries) {
    tries = tries || 0;
    if (
      typeof window.supabase !== 'undefined' &&
      typeof window.supabase.createClient === 'function' &&
      window._PPK_CONFIG
    ) {
      var cfg = window._PPK_CONFIG;
      // ใช้ anon key — RLS policies เปิดให้ anon เข้าถึงได้ (no-auth mode)
      window._sb = window.supabase.createClient(cfg.url, cfg.anon, {
        auth: { persistSession: false }
      });
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
                    var m = val.match(/^(eq|neq|lt|lte|gt|gte|like|ilike|is|in)\.(.+)$/);
                    if (!m) return;
                    var op = m[1], v = m[2];
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
                Object.keys(filter || {}).forEach(function (k) {
                    var m = String(filter[k]).match(/^eq\.(.+)$/);
                    if (m) q = q.eq(k, m[1]);
                });
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

async function ppkLogout() {
    // ลบ session จาก DB ถ้ามี
    try {
        var tk = getSessionToken();
        if (tk) await sbDelete('sessions', { token: 'eq.' + tk });
    } catch(e) {}
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('_sessionCheckTs');
    window.location.href = 'login.html';
}

async function ppkRegister(data) {
    var email = (data.email || '').trim().toLowerCase();
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
// ตรวจสอบ role จาก session ใน DB (ไม่พึ่ง localStorage)
async function _getSessionRole() {
    var tk = getSessionToken();
    if (!tk || tk === 'guest-admin-session') return null;
    try {
        var s = await sbGet('sessions', { token: 'eq.' + tk, select: 'user_id,role,expires_at', limit: '1' });
        var sess = s && s[0];
        if (sess && new Date(sess.expires_at) > new Date()) return { userId: sess.user_id, role: sess.role };
    } catch(e) {}
    // Fallback: ใช้ currentUser จาก localStorage (กรณี session ใน DB หมดอายุหรือ query ล้มเหลว)
    try {
        var stored = JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (stored && stored.id && stored.role) return { userId: stored.id, role: stored.role };
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
        window.location.replace('login.html');
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
    'approveRegistration','rejectRegistration','approveResidence','updatePermissions','deleteAnnouncement',
    'saveHousingFormat','setupAdmin',
    'getAdminTeam','getUsersList','getAllPermissions','uploadRegulationPdf','deleteRegulationPdf',
    'getBackups','restoreBackup','deleteOldBackups','purgeStaleAutoEntries'];

// ── Storage bucket helper: auto-create if not exists ──
var _bucketReady = {};
async function _ensureBucket(name) {
    if (_bucketReady[name]) return name;
    // ลองอัปโหลด test เพื่อดูว่า bucket มีอยู่หรือไม่
    var testRes = await window._sb.storage.from(name).upload('_ping.txt', new Blob(['ok']), { contentType: 'text/plain', upsert: true });
    if (testRes.error && /bucket/i.test(testRes.error.message || '')) {
        // bucket ไม่มี → สร้างใหม่
        var createRes = await window._sb.storage.createBucket(name, { public: true, fileSizeLimit: 10485760 });
        if (createRes.error) {
            console.error('Cannot create bucket ' + name + ':', createRes.error.message);
            return null;
        }
    } else if (!testRes.error) {
        // ลบ _ping.txt ที่ทดสอบ
        await window._sb.storage.from(name).remove(['_ping.txt']);
    }
    _bucketReady[name] = true;
    return name;
}

// Actions ที่สามารถมอบหมายให้ผู้ใช้ที่มี permission ได้
var _PERM_ACTION_MAP = {
    submitWaterBill: 'water,water_reader', submitElectricBill: 'electric',
    reviewSlip: 'slip', reviewRequest: 'request', checkDuplicateResident: 'request',
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
            var uRows = await sbGet('users', { email: 'eq.' + email, is_active: 'eq.true', limit: '1' });
            if (!uRows || uRows.length === 0) return { success: false, error: 'ไม่พบบัญชีผู้ใช้ หรืออีเมลไม่ถูกต้อง' };
            var u = uRows[0];
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
            if (!matched) return { success: false, error: 'รหัสผ่านไม่ถูกต้อง' };
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
            var token = 'session-' + u.id + '-' + Date.now();
            try {
                await sbPost('sessions', {
                    token: token,
                    user_id: u.id,
                    role: u.role || 'resident',
                    resident_id: resident ? resident.id : null,
                    house_number: resident ? (resident.house_number || '') : '',
                    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                });
            } catch(e) { console.warn('สร้าง session ไม่สำเร็จ:', e); }
            return { success: true, user: userObj, token: token };
        }
        case 'logout':   return ppkLogout();
        case 'register': return ppkRegister(data);

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
            var token2 = 'session-' + u2.id + '-' + Date.now();
            try {
                await sbPost('sessions', { token: token2, user_id: u2.id, role: u2.role || 'resident', resident_id: resident2 ? resident2.id : null, house_number: resident2 ? (resident2.house_number || '') : '', expires_at: new Date(Date.now() + 30*24*60*60*1000).toISOString() });
            } catch(e) {}
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
        case 'approveRegistration': {
            var regId = data.regId || data.id;
            if (!regId) return { success: false, error: 'ไม่ระบุ regId' };
            var reg = (await sbGet('pending_registrations', { id: 'eq.' + regId }))[0];
            if (!reg) return { success: false, error: 'ไม่พบคำขอ' };
            // สร้าง user
            var uid = 'USR' + Date.now().toString(36).toUpperCase();
            await sbPost('users', {
                id: uid, email: reg.email, phone: reg.phone, prefix: reg.prefix,
                firstname: reg.firstname, lastname: reg.lastname, position: reg.position,
                role: 'resident', password_hash: reg.password_hash, pdpa_consent: reg.pdpa_consent,
                is_active: true
            });
            // สร้าง resident ถ้ามี house_number
            var residentId = null;
            if (data.house_number) {
                var hRows = await sbGet('housing', { house_number: 'eq.' + data.house_number, select: 'id', limit: '1' });
                var houseId = hRows && hRows[0] ? hRows[0].id : null;
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
                    // อัปเดต session house_number ถ้ามี
                    await sbPatch('housing', { id: 'eq.' + houseId }, { status: 'occupied', updated_at: new Date().toISOString() });
                }
            }
            // อัปเดต session ของ user ถ้า login อยู่แล้ว
            await sbPatch('pending_registrations', { id: 'eq.' + regId }, {
                status: 'approved', reviewed_by: data.reviewedBy || null,
                reviewed_at: new Date().toISOString(), review_note: data.note || ''
            });
            invalidateResidentCache();
            return { success: true, userId: uid, residentId: residentId };
        }
        case 'rejectRegistration': {
            var regId = data.regId || data.id;
            if (!regId) return { success: false, error: 'ไม่ระบุ regId' };
            await sbPatch('pending_registrations', { id: 'eq.' + regId }, {
                status: 'rejected', reviewed_by: data.reviewedBy || null,
                reviewed_at: new Date().toISOString(), review_note: data.note || ''
            });
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
                return { success: true, data: inserted };
            }
            var row = await sbPost('water_bills', { house_id: data.houseId, house_number: data.houseNumber, period: data.period, year: data.year, month: data.month, prev_meter: data.prevMeter, curr_meter: data.currMeter, units_used: data.unitsUsed, rate_per_unit: data.ratePerUnit, amount: data.amount, recorded_by: data.recordedBy });
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
                    await sbUpsert('settings', { key: 'electric_lost_' + data.period, value: lostData }, 'key');
                }
                // Auto-sync บัญชี
                try { await _autoSyncAccounting(data.period); } catch(e) { console.warn('autoSync error', e); }
                return { success: true, data: inserted };
            }
            var row = await sbPost('electric_bills', { house_id: data.houseId, house_number: data.houseNumber, period: data.period, year: data.year, month: data.month, prev_meter: data.prevMeter, curr_meter: data.currMeter, units_used: data.unitsUsed, rate_per_unit: data.ratePerUnit, bill_amount: data.billAmount, amount: data.amount, method: data.method || 'bill', recorded_by: data.recordedBy });
            return { success: true, data: row };
        }
        case 'getOutstanding': {
            var q = { order: 'period.desc,house_number.asc' };
            if (data.houseNumber) q.house_number = 'eq.' + data.houseNumber;
            if (data.status)      q.status        = 'eq.' + data.status;
            var rows = await sbGet('outstanding', q);
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
            var [rows, resRows] = await Promise.all([
                sbGet('slip_submissions', q).catch(function() { return []; }),
                sbGet('residents', { is_active: 'eq.true', select: 'house_number,prefix,firstname,lastname' }).catch(function() { return []; })
            ]);
            var resMap = {};
            (resRows || []).forEach(function(r) { resMap[r.house_number] = ((r.prefix || '') + (r.firstname || '') + ' ' + (r.lastname || '')).trim(); });
            (rows || []).forEach(function(s) { s.resident_name = resMap[s.house_number] || ''; });
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
            var _nBody = { house_id: data.houseId, house_number: data.houseNumber, period: data.period, water_amount: data.waterAmount, electric_amount: data.electricAmount, common_fee: data.commonFee, garbage_fee: data.garbageFee, total_amount: data.totalAmount, due_date: data.dueDate, message: data.message, sent_by: data.sentBy };
            if (data.sentAt) _nBody.sent_at = data.sentAt;
            var row = await sbPost('notifications', _nBody);
            return { success: true, data: row };
        }
        case 'deleteNotifications': {
            if (!data.period) return { success: false, error: 'ไม่ระบุ period' };
            try { await sbDelete('notifications', { period: 'eq.' + data.period }); } catch(e) {}
            return { success: true };
        }
        case 'getRequests': {
            var q = { order: 'submitted_at.desc' };
            if (data.type)    q.type    = 'eq.' + data.type;
            if (data.status)  q.status  = 'eq.' + data.status;
            if (data.user_id) q.user_id = 'eq.' + data.user_id;
            if (data.year) {
                // แปลงปี พ.ศ. → ค.ศ. ก่อนกรอง submitted_at
                var adYear = parseInt(data.year);
                if (adYear > 2500) adYear = adYear - 543;
                q['submitted_at'] = 'gte.' + adYear + '-01-01T00:00:00Z';
            }
            var rows = await sbGet('requests', q);
            return { success: true, data: rows };
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
                savedAt: new Date().toISOString()
            });
            await sbUpsert('settings', { key: swKey, value: swVal }, 'key');
            // sync ค่าใช้จ่ายไปยังบัญชีกองกลางอัตโนมัติ
            try { await _autoSyncAccounting(data.period); } catch(e) { console.warn('autoSync error', e); }
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
            var upResA = await window._sb.storage.from(bucketA).upload(pathA, blobA, { contentType: mimeA, upsert: false });
            if (upResA.error) {
                return { success: false, error: 'อัปโหลดไม่สำเร็จ: ' + (upResA.error.message || 'ข้อผิดพลาดไม่ทราบสาเหตุ') };
            }
            var pubA = window._sb.storage.from(bucketA).getPublicUrl(pathA);
            return { success: true, url: pubA.data.publicUrl, bucket: bucketA, path: pathA };
        }

        case 'submitRequest': {
            var sess = await sbGet('sessions', { token: 'eq.' + getSessionToken(), select: 'user_id,house_number' });
            var s = sess && sess[0];
            // สร้าง ID ตาม prefix ของ type
            var prefixMap = { residence: 'REQ', transfer: 'TRF', return: 'RTN', repair: 'RPR' };
            var reqPrefix = prefixMap[data.type] || 'REQ';
            var _uid = 'xxxxxxxxxxxx'.replace(/x/g, function() { return Math.floor(Math.random() * 16).toString(16); }).toUpperCase();
            var reqId = reqPrefix + '-' + _uid + '-' + Date.now().toString(36).toUpperCase();
            // แยก type ออกจาก data แล้วเก็บที่เหลือใน details (jsonb)
            var detailsCopy = {};
            Object.keys(data).forEach(function(k) { if (k !== 'type') detailsCopy[k] = data[k]; });
            var row = await sbPost('requests', {
                id:           reqId,
                type:         data.type || 'general',
                status:       'pending',
                user_id:      s ? s.user_id : null,
                house_number: data.houseNumber || data.house_number || data.current_house || (s ? s.house_number : ''),
                details:      detailsCopy
            });
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
            // อัปเดต residents ด้วย (ถ้ามี)
            if (!profileResId) {
                var _prUser = await sbGet('users', { id: 'eq.' + profileUserId, select: 'email', limit: '1' });
                var _prEmail = _prUser && _prUser[0] ? _prUser[0].email : null;
                var resFb = await _findResidentForUser(profileUserId, _prEmail);
                if (resFb) profileResId = resFb.id;
            }
            if (profileResId) {
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
            // ดึงข้อมูลจาก water_bills, electric_bills, residents, settings, notifications, exemptions, housing
            var [wRows, eRows, resRows, settRows, notifRows, exemptRows, housingRows] = await Promise.all([
                sbGet('water_bills',    { period: 'eq.' + period, order: 'house_number.asc' }).catch(function() { return []; }),
                sbGet('electric_bills', { period: 'eq.' + period, order: 'house_number.asc' }).catch(function() { return []; }),
                sbGet('residents',      { is_active: 'eq.true', select: 'house_number,prefix,firstname,lastname' }).catch(function() { return []; }),
                sbGet('settings',       { select: 'key,value' }).catch(function() { return []; }),
                sbGet('notifications',  { period: 'eq.' + period, select: 'house_number,common_fee', limit: '200' }).catch(function() { return []; }),
                sbGet('exemptions',     { type: 'eq.common_fee', select: 'house_number,house_id' }).catch(function() { return []; }),
                sbGet('housing',        { select: 'id,house_number,type' }).catch(function() { return []; })
            ]);
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
            (notifRows || []).forEach(function(n) {
                if (n.house_number) notifMap[n.house_number] = parseFloat(n.common_fee) || 0;
            });
            var hasNotifications = Object.keys(notifMap).length > 0;

            var resMap = {};
            (resRows || []).forEach(function(r) {
                if (r.house_number) {
                    var name = ((r.prefix || '') + (r.firstname || '') + ' ' + (r.lastname || '')).trim();
                    if (resMap[r.house_number]) {
                        resMap[r.house_number] += '\n' + name;
                    } else {
                        resMap[r.house_number] = name;
                    }
                }
            });
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
                s.resident_name = resMap[s.house_number] || '';
                s.exempt_common = exemptSet[s.house_number] ? true : false;
                s.total_amount  = (s.water_amount || 0) + (s.electric_amount || 0) + (s.common_fee || 0);
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

            // ① ลองดึงจาก sessions table (สำหรับ user ที่ login จริง)
            try {
                var sessions = await sbGet('sessions', { token: 'eq.' + token, select: 'user_id,role,resident_id,house_number,expires_at' });
                var sess = sessions && sessions[0];
                if (sess) {
                    sessRole = sess.role || 'admin';
                    sessHouseNumber = sess.house_number || '';
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

            if (sessRole === 'admin' || sessRole === 'head') {
                var adminPeriod = (now2.getFullYear() + 543) + '-' + String(now2.getMonth() + 1).padStart(2, '0');
                var adminQueries = [
                    sbGet('pending_registrations', { status: 'eq.pending', select: 'id', limit: '100' }).catch(function() { return []; }),
                    sbGet('slip_submissions', { status: 'eq.pending', select: 'id', limit: '100' }).catch(function() { return []; }),
                    sbGet('requests', { status: 'eq.pending', select: 'id', limit: '100' }).catch(function() { return []; })
                ];
                if (sessHouseNumber) {
                    adminQueries.push(
                        sbGet('outstanding', { house_number: 'eq.' + sessHouseNumber, status: 'neq.paid', order: 'period.desc', limit: '12' }).catch(function() { return []; }),
                        sbGet('slip_submissions', { house_number: 'eq.' + sessHouseNumber, period: 'eq.' + adminPeriod, order: 'submitted_at.desc', limit: '1' }).catch(function() { return []; })
                    );
                }
                var adminResults = await Promise.all(adminQueries);
                var pendingReg = adminResults[0], pendingSlips = adminResults[1], pendingReqs = adminResults[2];
                var residentData = null;
                if (sessHouseNumber) {
                    var adminOutRows = adminResults[3] || [];
                    var adminSlipRows = adminResults[4] || [];
                    var adminCurrentOut = adminOutRows.find(function(o) { return o.period === adminPeriod; });
                    var adminLatestSlip = adminSlipRows[0];
                    var adminSlipStatus = 'none';
                    var adminReviewNote = '';
                    if (adminLatestSlip) {
                        if (adminLatestSlip.status === 'approved') adminSlipStatus = 'success';
                        else if (adminLatestSlip.status === 'rejected') { adminSlipStatus = 'rejected'; adminReviewNote = adminLatestSlip.review_note || ''; }
                        else adminSlipStatus = 'reviewing';
                    }
                    residentData = {
                        houseNumber: sessHouseNumber,
                        period: adminPeriod,
                        currentAmount: adminCurrentOut ? parseFloat(adminCurrentOut.total_amount) || 0 : 0,
                        totalOutstanding: adminOutRows.reduce(function(s, r) { return s + (parseFloat(r.total_amount) || 0); }, 0),
                        slipStatus: adminSlipStatus,
                        reviewNote: adminReviewNote,
                        slipId: adminLatestSlip ? adminLatestSlip.id : null,
                        dueDate: adminCurrentOut ? adminCurrentOut.due_date : null
                    };
                }
                return { success: true, role: 'admin', announcements: announcements, data: {
                    pendingRegistrations: (pendingReg || []).length,
                    pendingSlips: (pendingSlips || []).length,
                    pendingRequests: (pendingReqs || []).length
                }, residentData: residentData };
            } else {
                var houseNumber = sessHouseNumber;
                var period = (now2.getFullYear() + 543) + '-' + String(now2.getMonth() + 1).padStart(2, '0');
                var outRows = [], slipRows = [];
                if (houseNumber) {
                    [outRows, slipRows] = await Promise.all([
                        sbGet('outstanding', { house_number: 'eq.' + houseNumber, status: 'neq.paid', order: 'period.desc', limit: '12' }).catch(function() { return []; }),
                        sbGet('slip_submissions', { house_number: 'eq.' + houseNumber, period: 'eq.' + period, order: 'submitted_at.desc', limit: '1' }).catch(function() { return []; })
                    ]);
                }
                var currentOut = (outRows || []).find(function(o) { return o.period === period; });
                var latestSlip = slipRows && slipRows[0];
                var slipStatus = 'none';
                var reviewNote = '';
                if (latestSlip) {
                    if (latestSlip.status === 'approved') slipStatus = 'success';
                    else if (latestSlip.status === 'rejected') { slipStatus = 'rejected'; reviewNote = latestSlip.review_note || ''; }
                    else slipStatus = 'reviewing';
                }
                var totalOutstanding = (outRows || []).reduce(function(s, r) {
                    return s + (parseFloat(r.total_amount) || 0);
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
                            try { var upaOutR = await sbGet('outstanding', { house_number: 'eq.' + upaP.house_number, period: 'eq.' + period, limit: '1' }); upaOut = upaOutR && upaOutR[0]; } catch(e) {}
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
                return { success: true, role: 'user', announcements: announcements, proxyAssignments: userProxyAssignments, data: {
                    houseNumber: houseNumber,
                    period: period,
                    currentAmount: currentOut ? parseFloat(currentOut.total_amount) || 0 : 0,
                    totalOutstanding: totalOutstanding,
                    slipStatus: slipStatus,
                    reviewNote: reviewNote,
                    slipId: latestSlip ? latestSlip.id : null,
                    dueDate: currentOut ? currentOut.due_date : null
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
                        + '<p>เรียน คุณ' + (data.residentName || 'ผู้พักอาศัย') + '</p>'
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
                if (data.outstandingId) {
                    await sbPatch('outstanding', { id: 'eq.' + data.outstandingId }, { status: 'paid', updated_at: new Date().toISOString() });
                }
            }
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
            return { success: true, data: row };
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
            await sbPatch('requests', { id: 'eq.' + reqIdToReview }, {
                status: data.status, reviewed_by: data.reviewedBy || reqReviewerId || '',
                reviewed_at: new Date().toISOString(), review_note: data.note || '',
                updated_at: new Date().toISOString()
            });

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
            return { success: true };
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

            var arResidentId = null;
            if (arExistRes) {
                // กรณี B: มี resident อยู่แล้ว → อัปเดต house assignment
                await sbPatch('residents', { id: 'eq.' + arExistRes.id }, {
                    house_id: arHouseId, house_number: arHouseNum,
                    move_in_date: arToday, start_date: arToday,
                    is_active: true, updated_at: new Date().toISOString()
                });
                arResidentId = arExistRes.id;
            } else {
                // กรณี A: สร้าง resident ใหม่จากข้อมูลในคำร้อง
                var arNewRes = await sbPost('residents', {
                    user_id:       arUserId || null,
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

            // 7. อัปเดต request → approved + บันทึก house
            await sbPatch('requests', { id: 'eq.' + arReqId }, {
                status: 'approved', house_id: arHouseId, house_number: arHouseNum,
                reviewed_by: arReviewerId || '', reviewed_at: new Date().toISOString(),
                review_note: data.note || '', updated_at: new Date().toISOString()
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
            var email = (data.email || '').trim().toLowerCase();
            var uid = 'USR-' + Date.now().toString(36).toUpperCase();
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
            // สร้าง resident — ใช้เฉพาะ columns ที่มีใน schema
            var _resBody = {
                user_id:      uid,
                house_number: _hn,
                prefix:       data.prefix    || '',
                firstname:    data.firstname || '',
                lastname:     data.lastname  || '',
                position:     data.position  || '',
                email:        email || '',
                phone:        data.phone     || '',
                is_active:    true
            };
            if (houseId) _resBody.house_id = houseId;
            var newRes = null;
            try {
                newRes = await sbPost('residents', _resBody);
            } catch(eRes) {
                // ถ้า house_id NOT NULL constraint fail ให้ลองโดยไม่มี house_id
                console.warn('addResident insert failed (house_id):', eRes.message, '— retrying without house_id');
                delete _resBody.house_id;
                try { newRes = await sbPost('residents', _resBody); } catch(eRes2) {
                    console.error('addResident insert retry failed:', eRes2.message);
                    _resWarning = 'สร้าง user สำเร็จ แต่สร้าง resident ไม่ได้: ' + eRes2.message;
                }
            }
            invalidateResidentCache();
            var _result = { success: true, userId: uid, residentId: newRes ? newRes.id : null };
            if (_resWarning) _result.warning = _resWarning;
            return _result;
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
            // อัปเดต users table ด้วย (phone, email, password)
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
        case 'removeResident': {
            var rid = data.id;
            var resRows = await sbGet('residents', { id: 'eq.' + rid, select: 'user_id,email', limit: '1' });
            // สำรองข้อมูลเดิมก่อนลบ (auto-backup)
            try { var _bakRm = await sbGet('residents', { id: 'eq.' + rid }); await _autoBackup('removeResident', 'ลบ/ปิดใช้งานผู้พักอาศัย ' + rid, 'residents', 'id', rid, null, _bakRm); } catch(e) {}
            await sbPatch('residents', { id: 'eq.' + rid }, { is_active: false, updated_at: new Date().toISOString() });
            var _rmUserId = resRows && resRows[0] ? resRows[0].user_id : null;
            // Fallback: ถ้าไม่มี user_id ให้ค้นจาก email
            if (!_rmUserId && resRows && resRows[0] && resRows[0].email) {
                var _rmByEmail = await sbGet('users', { email: 'eq.' + resRows[0].email.toLowerCase(), select: 'id', limit: '1' });
                if (_rmByEmail && _rmByEmail[0]) _rmUserId = _rmByEmail[0].id;
            }
            if (_rmUserId) {
                await sbPatch('users', { id: 'eq.' + _rmUserId }, { is_active: false, updated_at: new Date().toISOString() });
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
                carryForward = totalPrevInc - totalPrevExp;
            } catch(e) { carryForward = 0; }
            return { success: true, incomeItems: (incRows || []).map(mapRow), expenseItems: (expRows || []).map(mapRow), carryForward: carryForward };
        }

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
                carryForward2 = totalPrevInc2 - totalPrevExp2;
            } catch(e) { carryForward2 = 0; }
            // sort auto expense items ตามลำดับที่กำหนด
            var _expSortOrder = { 'ค่า Lost ไฟฟ้า (บ้านพัก)': 1, 'ค่า Lost ไฟฟ้า (แฟลต)': 2, 'ค่าขยะ': 3 };
            var _expMapped = (expRows || []).map(mapRow2);
            _expMapped.sort(function(a, b) {
                var sa = a.source === 'auto' ? (_expSortOrder[a.name] || (a.name.indexOf('ค่าไฟขั้นต่ำ') >= 0 ? 4 : a.name.indexOf('ค่าดำเนิน') >= 0 ? 5 : a.name.indexOf('ค่าเดินทาง') >= 0 ? 6 : 4.5)) : 100;
                var sb = b.source === 'auto' ? (_expSortOrder[b.name] || (b.name.indexOf('ค่าไฟขั้นต่ำ') >= 0 ? 4 : b.name.indexOf('ค่าดำเนิน') >= 0 ? 5 : b.name.indexOf('ค่าเดินทาง') >= 0 ? 6 : 4.5)) : 100;
                return sa - sb;
            });
            return { success: true, incomeItems: (incRows || []).map(mapRow2), expenseItems: _expMapped, carryForward: carryForward2 };
        }
        case 'calculateAutoEntries': {
            var period = data.period || '';
            // ดึงค่าส่วนกลางจาก notifications (ยอดที่แจ้งไปจริง รวมการยกเว้น + admin override)
            var notifRes = await sbGet('notifications', { period: 'eq.' + period, select: 'common_fee' }).catch(function() { return []; });
            var commonTotal = (notifRes || []).reduce(function(s, r) { return s + (parseFloat(r.common_fee) || 0); }, 0);
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
            // สำรองข้อมูลเดิมก่อนลบ (auto-backup)
            try { var _bakA = await sbGet('accounting_entries', { period: 'eq.' + period }); await _autoBackup('saveAccounting', 'บันทึกบัญชีงวด ' + period, 'accounting_entries', 'period', period, recordedBy, _bakA); } catch(e) {}
            // ลบทุก entry ของ period นี้แล้ว insert ใหม่ทั้งหมด
            await sbDelete('accounting_entries', { period: 'eq.' + period });
            // หา year / month จาก period (YYYY-MM)
            var pParts = period.split('-');
            var pYear  = parseInt(pParts[0]) || new Date().getFullYear();
            var pMonth = parseInt(pParts[1]) || (new Date().getMonth() + 1);
            // บันทึกรายรับ — category = 'auto' หรือ note text
            for (var i = 0; i < (data.incomeItems || []).length; i++) {
                var it = data.incomeItems[i];
                await sbPost('accounting_entries', {
                    period: period, year: pYear, month: pMonth,
                    type: 'income',
                    category: it.source === 'auto' ? 'auto' : (it.note || 'manual'),
                    description: it.name || it.description || '',
                    amount: it.amount || 0,
                    receipt_url: it.receiptUrl || null,
                    recorded_by: recordedBy,
                    recorded_at: it.date || new Date().toISOString()
                });
            }
            // บันทึกรายจ่าย — category = 'auto' หรือ note text
            for (var j = 0; j < (data.expenseItems || []).length; j++) {
                var et = data.expenseItems[j];
                await sbPost('accounting_entries', {
                    period: period, year: pYear, month: pMonth,
                    type: 'expense',
                    category: et.source === 'auto' ? 'auto' : (et.note || 'manual'),
                    description: et.name || et.description || '',
                    amount: et.amount || 0,
                    receipt_url: et.receiptUrl || null,
                    recorded_by: recordedBy,
                    recorded_at: et.date || new Date().toISOString()
                });
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
                resend_api_key:  lsMap['resend_api_key']  || '',
                email_from:      lsMap['email_from']      || '',
                email_from_name: lsMap['email_from_name'] || ''
            }};
        }

        /* ── saveEmailSettings ─────────────────────────── */
        case 'saveEmailSettings': {
            var esEntries = [
                ['resend_api_key',   data.resend_api_key   || ''],
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
            // เสริมข้อมูล house_number จาก residents table
            var userIds = allUsers.map(function(u) { return u.id; }).filter(Boolean);
            if (userIds.length > 0) {
                try {
                    var resRows = await sbGet('residents', { user_id: 'in.(' + userIds.join(',') + ')', is_active: 'eq.true', select: 'user_id,house_number' });
                    var houseMap = {};
                    (resRows || []).forEach(function(r) { if (r.user_id) houseMap[r.user_id] = r.house_number; });
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
                    registered_at: u ? u.created_at : ''
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
                    // ไม่ได้เป็น head/admin → revert role เป็น user
                    try { await sbPatch('users', { id: 'eq.' + uid }, { role: 'user', updated_at: new Date().toISOString() }); } catch(e) {}
                }
            }
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
            if (!ahvHouse) return { success: false, error: 'ไม่ระบุเลขที่บ้าน' };
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
            // ชื่อผู้พัก
            var ahvRes = ahvResRows && ahvResRows[0];
            var ahvResName = ahvRes ? ((ahvRes.prefix||'') + (ahvRes.firstname||'') + ' ' + (ahvRes.lastname||'')).trim() : '';
            // ข้อมูลงวดปัจจุบัน
            var ahvCurOut = (ahvOutRows || []).find(function(o) { return o.period === ahvPeriod; });
            var ahvCurSlip = (ahvSlipRows || []).find(function(s) { return s.period === ahvPeriod; });
            var ahvSlipStatus = 'none', ahvReviewNote = '', ahvSlipId = null;
            if (ahvCurSlip) {
                ahvSlipId = ahvCurSlip.id;
                if (ahvCurSlip.status === 'approved') ahvSlipStatus = 'success';
                else if (ahvCurSlip.status === 'rejected') { ahvSlipStatus = 'rejected'; ahvReviewNote = ahvCurSlip.review_note || ''; }
                else ahvSlipStatus = 'reviewing';
            }
            var ahvTotalOs = (ahvOutRows || []).reduce(function(s, r) { return s + (parseFloat(r.total_amount) || 0); }, 0);
            // ประวัติรายเดือน (join outstanding + slip ล่าสุดของแต่ละงวด)
            var ahvHistory = (ahvOutRows || []).map(function(o) {
                var s = (ahvSlipRows || []).find(function(sl) { return sl.period === o.period; });
                var ss = 'none';
                if (s) {
                    if (s.status === 'approved') ss = 'success';
                    else if (s.status === 'rejected') ss = 'rejected';
                    else ss = 'reviewing';
                }
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
                residentPosition: ahvRes ? (ahvRes.position || '') : '',
                residentPhone:   ahvRes ? (ahvRes.phone || '') : '',
                period:          ahvPeriod,
                currentAmount:   ahvCurOut ? parseFloat(ahvCurOut.total_amount) || 0 : 0,
                water_amount:    ahvCurOut ? parseFloat(ahvCurOut.water_amount) || 0 : 0,
                electric_amount: ahvCurOut ? parseFloat(ahvCurOut.electric_amount) || 0 : 0,
                common_fee:      ahvCurOut ? parseFloat(ahvCurOut.common_fee) || 0 : 0,
                totalOutstanding: ahvTotalOs,
                slipStatus:      ahvSlipStatus,
                reviewNote:      ahvReviewNote,
                slipId:          ahvSlipId,
                slipImageUrl:    ahvCurSlip ? (ahvCurSlip.image_url || null) : null,
                slipReceiptNumber: ahvCurSlip ? (ahvCurSlip.receipt_number || '') : '',
                slipSubmittedAt: ahvCurSlip ? (ahvCurSlip.submitted_at || null) : null,
                slipAmount:      ahvCurSlip ? (parseFloat(ahvCurSlip.amount) || 0) : 0,
                dueDate:         ahvCurOut ? ahvCurOut.due_date : null,
                history:         ahvHistory,
                allSlips:        ahvAllSlips,
                proxyName:       ahvProxyName,
                proxyHouse:      ahvProxyHouse,
                proxyNotes:      ahvProxy ? (ahvProxy.notes || '') : ''
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
            if (!ahpHouse) return { success: false, error: 'ไม่ระบุเลขที่บ้าน' };
            var ahpResults = await Promise.all([
                sbGet('residents', { house_number: 'eq.' + ahpHouse, is_active: 'eq.true', resident_type: 'neq.cohabitant', limit: '1' }).catch(function() { return []; }),
                sbGet('residents', { house_number: 'eq.' + ahpHouse, is_active: 'eq.true', resident_type: 'eq.cohabitant' }).catch(function() { return []; }),
                sbGet('housing', { house_number: 'eq.' + ahpHouse, limit: '1' }).catch(function() { return []; })
            ]);
            var ahpRes = ahpResults[0] && ahpResults[0][0];
            var ahpCoRows = ahpResults[1] || [];
            var ahpHou = ahpResults[2] && ahpResults[2][0];
            var ahpUserInfo = {};
            if (ahpRes && ahpRes.user_id) {
                var ahpURows = await sbGet('users', { id: 'eq.' + ahpRes.user_id, select: 'email,phone', limit: '1' }).catch(function() { return []; });
                if (ahpURows && ahpURows[0]) ahpUserInfo = ahpURows[0];
            }
            return { success: true, data: {
                houseNumber:   ahpHouse,
                residentName:  ahpRes ? ((ahpRes.prefix||'') + (ahpRes.firstname||'') + ' ' + (ahpRes.lastname||'')).trim() : '',
                position:      ahpRes ? (ahpRes.position || '') : '',
                phone:         ahpUserInfo.phone || (ahpRes ? (ahpRes.phone || '') : ''),
                email:         ahpUserInfo.email || '',
                photo_url:     ahpRes ? (ahpRes.photo_url || '') : '',
                resident_type: ahpRes ? (ahpRes.resident_type || '') : '',
                move_in_date:  ahpRes ? (ahpRes.move_in_date || '') : '',
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

    // ── 1. ดึงค่าส่วนกลาง + ค่าไฟ + หมายเลขบ้าน จาก notifications
    var notifRes = await sbGet('notifications', { period: 'eq.' + period, select: 'common_fee,house_number,electric_amount' }).catch(function() { return []; });
    var commonTotal = (notifRes || []).reduce(function(s, r) { return s + (parseFloat(r.common_fee) || 0); }, 0);
    // ── 1.1 ดึงบ้านที่ยกเว้นค่าส่วนกลาง + ค่าไฟขั้นต่ำ จาก settings
    var _exemptRows = await sbGet('exemptions', { type: 'eq.common_fee', select: 'house_number' }).catch(function() { return []; });
    var _exemptSet = {};
    (_exemptRows || []).forEach(function(ex) { if (ex.house_number) _exemptSet[ex.house_number] = true; });
    var _minChargeVal = 9;
    try {
        var _mcRows = await sbGet('settings', { key: 'eq.electric_min_charge' });
        if (_mcRows && _mcRows[0] && _mcRows[0].value) _minChargeVal = parseFloat(_mcRows[0].value) || 9;
    } catch(e) {}
    // คำนวณค่าไฟขั้นต่ำบ้านว่าง: ยกเว้นค่าส่วนกลาง + ค่าไฟ = ค่าขั้นต่ำ
    var _vacantCount = 0, _vacantMinTotal = 0;
    (notifRes || []).forEach(function(n) {
        var hn = n.house_number || '';
        var elAmt = parseFloat(n.electric_amount) || 0;
        if (_exemptSet[hn] && elAmt > 0 && Math.abs(elAmt - _minChargeVal) < 0.01) {
            _vacantCount++;
            _vacantMinTotal += elAmt;
        }
    });
    // ── 2. ดึง pea_total + lost จาก settings และคำนวณส่วนต่างจาก electric_bills จริง
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
    // ── 3. ดึงค่าขยะ + ค่าใช้จ่ายอื่นๆ + ค่าดำเนินการ จาก monthly_withdraw
    var withdrawGarbage = 0;
    var withdrawAdditionalItems = [];
    var withdrawOperatingCosts = {};
    try {
        var wdRows = await sbGet('settings', { key: 'eq.monthly_withdraw_' + period });
        if (wdRows && wdRows[0] && wdRows[0].value) {
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
    // fallback: ถ้า monthly_withdraw ไม่มีค่าขยะ ดึงจาก settings garbage_fee (rate) + notifications (count)
    if (withdrawGarbage <= 0) {
        try {
            var gfSettRow = await sbGet('settings', { key: 'eq.garbage_fee' });
            var gfRate = (gfSettRow && gfSettRow[0]) ? parseFloat(gfSettRow[0].value) || 0 : 0;
            if (gfRate > 0) {
                var gfNotifs = await sbGet('notifications', { period: 'eq.' + period, select: 'garbage_fee' }).catch(function(){ return []; });
                var gfTotal = (gfNotifs || []).reduce(function(s,r){ return s + (parseFloat(r.garbage_fee) || 0); }, 0);
                if (gfTotal > 0) withdrawGarbage = gfTotal;
            }
        } catch(e) {}
    }
    // ── 4. ลบเฉพาะรายการ auto ของ period นี้
    await sbDelete('accounting_entries', { period: 'eq.' + period, category: 'eq.auto' });
    var pParts = period.split('-');
    var pYear  = parseInt(pParts[0]) || new Date().getFullYear();
    var pMonth = parseInt(pParts[1]) || (new Date().getMonth() + 1);
    var ts = new Date().toISOString();
    // ── 5. Insert รายรับ auto ──
    if (commonTotal > 0) {
        await sbPost('accounting_entries', {
            period: period, year: pYear, month: pMonth,
            type: 'income', category: 'auto',
            description: 'ค่าส่วนกลาง',
            amount: commonTotal, recorded_at: ts
        });
    }
    if (electricDiff > 0) {
        await sbPost('accounting_entries', {
            period: period, year: pYear, month: pMonth,
            type: 'income', category: 'auto',
            description: 'ส่วนต่างค่าไฟ',
            amount: electricDiff, recorded_at: ts
        });
    }
    // ── 6. Insert รายจ่าย auto ──
    if (lostHouseAmt > 0) {
        await sbPost('accounting_entries', {
            period: period, year: pYear, month: pMonth,
            type: 'expense', category: 'auto',
            description: 'ค่า Lost ไฟฟ้า (บ้านพัก)', amount: lostHouseAmt,
            recorded_at: ts
        });
    }
    if (lostFlatAmt > 0) {
        await sbPost('accounting_entries', {
            period: period, year: pYear, month: pMonth,
            type: 'expense', category: 'auto',
            description: 'ค่า Lost ไฟฟ้า (แฟลต)', amount: lostFlatAmt,
            recorded_at: ts
        });
    }
    // ── 6.1 ค่าไฟขั้นต่ำบ้านว่าง (ยกเว้นค่าส่วนกลาง + ค่าไฟ = ค่าขั้นต่ำ) ──
    if (_vacantMinTotal > 0) {
        await sbPost('accounting_entries', {
            period: period, year: pYear, month: pMonth,
            type: 'expense', category: 'auto',
            description: 'ค่าไฟขั้นต่ำบ้านว่าง (' + _vacantCount + ' หลัง \u00d7 ' + _minChargeVal + ' บ.)',
            amount: _vacantMinTotal,
            recorded_at: ts
        });
    }
    if (withdrawGarbage > 0) {
        await sbPost('accounting_entries', {
            period: period, year: pYear, month: pMonth,
            type: 'expense', category: 'auto',
            description: 'ค่าขยะ', amount: withdrawGarbage,
            recorded_at: ts
        });
    }
    // ── 7. Insert ค่าใช้จ่ายอื่นๆ จากยอดเบิก ──
    for (var wi = 0; wi < withdrawAdditionalItems.length; wi++) {
        await sbPost('accounting_entries', {
            period: period, year: pYear, month: pMonth,
            type: 'expense', category: 'auto',
            description: withdrawAdditionalItems[wi].name,
            amount: withdrawAdditionalItems[wi].amount,
            recorded_at: ts
        });
    }
    // ── 8. Insert ค่าดำเนินการ (ปัดเศษ + ค่าเดินทาง) ──
    var ocRounding = parseFloat(withdrawOperatingCosts.roundingFee) || 0;
    var ocTravelWithdraw = parseFloat(withdrawOperatingCosts.travelWithdraw) || 0;
    var ocTravelElectric = parseFloat(withdrawOperatingCosts.travelElectric) || 0;
    var ocTravelGarbage = parseFloat(withdrawOperatingCosts.travelGarbage) || 0;
    if (ocRounding > 0) {
        await sbPost('accounting_entries', {
            period: period, year: pYear, month: pMonth,
            type: 'expense', category: 'auto',
            description: 'ค่าดำเนินการ (ปัดเศษ)', amount: ocRounding,
            recorded_at: ts
        });
    }
    if (ocTravelWithdraw > 0) {
        await sbPost('accounting_entries', {
            period: period, year: pYear, month: pMonth,
            type: 'expense', category: 'auto',
            description: 'ค่าเดินทางถอนเงิน', amount: ocTravelWithdraw,
            recorded_at: ts
        });
    }
    if (ocTravelElectric > 0) {
        await sbPost('accounting_entries', {
            period: period, year: pYear, month: pMonth,
            type: 'expense', category: 'auto',
            description: 'ค่าเดินทางชำระค่าไฟ', amount: ocTravelElectric,
            recorded_at: ts
        });
    }
    if (ocTravelGarbage > 0) {
        await sbPost('accounting_entries', {
            period: period, year: pYear, month: pMonth,
            type: 'expense', category: 'auto',
            description: 'ค่าเดินทางชำระค่าขยะ', amount: ocTravelGarbage,
            recorded_at: ts
        });
    }
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
                'Authorization': 'Bearer ' + (cfg.anon || '')
            },
            body: JSON.stringify(payload || {})
        });
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
   Register real implementations for ppk-app.js stubs
══════════════════════════════════════════ */
window._callBackendReal = callBackend;
window._cachedCallReal  = cachedCall;
