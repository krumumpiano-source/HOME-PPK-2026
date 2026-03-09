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
                    else if (op === 'in')    q = q.in(k, v.split(','));
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
                Object.keys(filter || {}).forEach(function (k) {
                    var m = String(filter[k]).match(/^eq\.(.+)$/);
                    if (m) q = q.eq(k, m[1]);
                });
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

/* ══════════════════════════════════════════
   AUTH — Register / Logout / Session
   (ppkLogin ถูกลบออกแล้ว — ระบบไม่ใช้การ Login)
══════════════════════════════════════════ */

async function ppkLogout() {
    // ไม่ logout — redirect กลับ dashboard
    window.location.href = 'dashboard.html';
}

async function ppkRegister(data) {
    var hash = await sha256hex(data.password || '');
    var row = await sbPost('pending_registrations', {
        email:           (data.email || '').trim().toLowerCase(),
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
   SESSION CHECK — ไม่ใช้ระบบ login, คืน admin เสมอ
══════════════════════════════════════════ */
async function checkSession() {
    try {
        var stored = JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (stored && stored.id) return stored;
    } catch(e) {}
    var defaultUser = {
        id: 'USR-GUEST', email: 'admin@ppk.local',
        firstname: 'ผู้ดูแล', lastname: 'ระบบ',
        role: 'admin', is_active: true
    };
    localStorage.setItem('currentUser', JSON.stringify(defaultUser));
    if (!localStorage.getItem('sessionToken')) {
        localStorage.setItem('sessionToken', 'guest-admin-session');
    }
    return defaultUser;
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
async function _routeAction(action, data) {
    switch (action) {
        case 'login': {
            var email = (data.email || '').trim().toLowerCase();
            if (!email || !data.password) return { success: false, error: 'กรุณากรอกอีเมลและรหัสผ่าน' };
            var pwHash = await sha256hex(data.password);
            var uRows = await sbGet('users', { email: 'eq.' + email, is_active: 'eq.true', limit: '1' });
            if (!uRows || uRows.length === 0) return { success: false, error: 'ไม่พบบัญชีผู้ใช้ หรืออีเมลไม่ถูกต้อง' };
            var u = uRows[0];
            if (u.password_hash !== pwHash) return { success: false, error: 'รหัสผ่านไม่ถูกต้อง' };
            // ดึงข้อมูล resident ที่ active
            var resident = null;
            try {
                var resRows = await sbGet('residents', { user_id: 'eq.' + u.id, is_active: 'eq.true', limit: '1' });
                if (resRows && resRows[0]) resident = resRows[0];
            } catch(e) { resident = null; }
            var userObj = {
                id: u.id, email: u.email,
                prefix: u.prefix || '', firstname: u.firstname || '', lastname: u.lastname || '',
                role: u.role || 'resident', is_active: true,
                position: u.position || '',
                houseNumber: resident ? (resident.house_number || '') : '',
                residentId: resident ? resident.id : null,
                must_change_password: !!(u.must_change_password)
            };
            var token = 'session-' + u.id + '-' + Date.now();
            return { success: true, user: userObj, token: token };
        }
        case 'logout':   return ppkLogout();
        case 'register': return ppkRegister(data);

        case 'getCurrentUser': {
            // คืน user จาก localStorage (no-auth mode)
            var u = JSON.parse(localStorage.getItem('currentUser') || 'null');
            if (!u) u = await checkSession();
            return { success: true, user: u };
        }

        case 'changePassword': {
            // ไม่มีระบบรหัสผ่านในโหมดนี้
            return { success: false, error: 'ระบบไม่ใช้รหัสผ่าน' };
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
                    display_number: h.display_number || h.house_number || '',
                    displayNumber: h.display_number || h.house_number || '',
                    zone: h.building || h.zone || '',
                    building: h.building || '',
                    floor: h.floor || '',
                    status: h.status || 'available',
                    note: h.notes || h.note || ''
                };
            });
            return { success: true, data: mapped };
        }
        case 'addHousing': {
            var row = await sbPost('housing', {
                house_number: data.house_number || data.number || '',
                type: data.type || 'house',
                building: data.building || data.zone || '',
                floor: data.floor || '',
                status: data.status || 'available',
                notes: data.notes || data.note || ''
            });
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
            return { success: true, data: row };
        }
        case 'deleteHousing': {
            await sbDelete('housing', { id: 'eq.' + data.id });
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
            return { success: true, data: merged };
        }
        case 'getUserProfile': {
            var sess = await sbGet('sessions', { token: 'eq.' + getSessionToken(), select: 'user_id,resident_id' });
            var sessObj = sess && sess[0] ? sess[0] : null;
            if (!sessObj) {
                var lsUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
                if (lsUser && lsUser.id) sessObj = { user_id: lsUser.id, resident_id: lsUser.resident_id || null };
            }
            if (!sessObj) return { success: false, error: 'SESSION_EXPIRED' };
            var u = await sbGet('users', { id: 'eq.' + sessObj.user_id });
            var res = sessObj.resident_id ? await sbGet('residents', { id: 'eq.' + sessObj.resident_id }) : [];
            return { success: true, user: u[0], resident: res[0] || null };
        }
        case 'getCoresidents': {
            if (!data.residentId) return { success: true, data: [] };
            var rows = await sbGet('coresidents', { resident_id: 'eq.' + data.residentId });
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
            if (data.houseNumber) q.house_number = 'eq.' + data.houseNumber;
            var rows = await sbGet('water_bills', q);
            return { success: true, data: rows };
        }
        case 'submitWaterBill': {
            var row = await sbPost('water_bills', { house_id: data.houseId, house_number: data.houseNumber, period: data.period, year: data.year, month: data.month, prev_meter: data.prevMeter, curr_meter: data.currMeter, units_used: data.unitsUsed, rate_per_unit: data.ratePerUnit, amount: data.amount, recorded_by: data.recordedBy });
            return { success: true, data: row };
        }
        case 'getElectricBills': {
            var q = { order: 'recorded_at.desc' };
            if (data.period) q.period = 'eq.' + data.period;
            if (data.houseNumber) q.house_number = 'eq.' + data.houseNumber;
            var rows = await sbGet('electric_bills', q);
            return { success: true, data: rows };
        }
        case 'submitElectricBill': {
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
            return { success: true, data: rows };
        }
        case 'getSlipSubmissions': {
            var q = { order: 'submitted_at.desc' };
            if (data.status) q.status = 'eq.' + data.status;
            if (data.period) q.period = 'eq.' + data.period;
            var [rows, resRows] = await Promise.all([
                sbGet('slip_submissions', q),
                sbGet('residents', { is_active: 'eq.true', select: 'house_number,prefix,firstname,lastname' })
            ]);
            var resMap = {};
            (resRows || []).forEach(function(r) { resMap[r.house_number] = ((r.prefix || '') + (r.firstname || '') + ' ' + (r.lastname || '')).trim(); });
            (rows || []).forEach(function(s) { s.resident_name = resMap[s.house_number] || ''; });
            return { success: true, data: rows };
        }
        case 'getNotificationHistory': {
            var rows = await sbGet('notifications', { order: 'sent_at.desc', limit: String(data.limit || 100) });
            return { success: true, data: rows };
        }
        case 'saveNotification': {
            var row = await sbPost('notifications', { house_id: data.houseId, house_number: data.houseNumber, period: data.period, water_amount: data.waterAmount, electric_amount: data.electricAmount, common_fee: data.commonFee, garbage_fee: data.garbageFee, total_amount: data.totalAmount, due_date: data.dueDate, message: data.message, sent_by: data.sentBy });
            return { success: true, data: row };
        }
        case 'getRequests': {
            var q = { order: 'submitted_at.desc' };
            if (data.type)    q.type    = 'eq.' + data.type;
            if (data.status)  q.status  = 'eq.' + data.status;
            if (data.user_id) q.user_id = 'eq.' + data.user_id;
            if (data.year)    q['submitted_at'] = 'gte.' + data.year + '-01-01T00:00:00Z';
            var rows = await sbGet('requests', q);
            return { success: true, data: rows };
        }
        case 'getQueue': {
            var rows = await sbGet('queue', { status: 'eq.waiting', order: 'created_at.asc' });
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
            var q = { order: 'created_at.desc' };
            if (data.period) q.period = 'eq.' + data.period;
            var rows = await sbGet('monthly_withdraw', q);
            return { success: true, data: rows };
        }
        case 'saveWithdraw': {
            var row = await sbPost('monthly_withdraw', { period: data.period, year: data.year, month: data.month, description: data.description, amount: data.amount, recipient: data.recipient, approved_by: data.approvedBy });
            return { success: true, data: row };
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
            var hash = await sha256hex(data.password || '');
            var uid = 'USR' + Date.now().toString(36).toUpperCase();
            await sbPost('users', {
                id: uid,
                email: (data.email || '').trim().toLowerCase(),
                firstname: data.firstname || 'Admin',
                lastname:  data.lastname  || '',
                role: 'admin',
                password_hash: hash,
                is_active: true,
                pdpa_consent: true
            });
            return { success: true };
        }

        case 'submitRequest': {
            var sess = await sbGet('sessions', { token: 'eq.' + getSessionToken(), select: 'user_id,resident_id,house_number' });
            var s = sess && sess[0];
            var row = await sbPost('requests', {
                type:         data.type || 'general',
                status:       'pending',
                user_id:      s ? s.user_id : '',
                resident_id:  s ? s.resident_id : '',
                house_number: data.houseNumber || (s ? s.house_number : ''),
                description:  data.description || '',
                details:      data.details ? JSON.stringify(data.details) : null
            });
            return { success: true, data: row };
        }

        case 'submitSlip': {
            var row = await sbPost('slip_submissions', {
                house_number:  data.houseNumber  || '',
                resident_id:   data.residentId   || null,
                period:        data.period       || '',
                amount:        data.amount       || 0,
                slip_url:      data.slipUrl      || null,
                transfer_date: data.transferDate || null,
                bank_name:     data.bankName     || null,
                account_name:  data.accountName  || null,
                status:        'pending'
            });
            return { success: true, data: row };
        }

        case 'resetPassword': {
            var email = (data.email || '').trim().toLowerCase();
            var uRows = await sbGet('users', { email: 'eq.' + email, select: 'id,firstname', limit: '1' });
            if (!uRows || uRows.length === 0) return { success: false, error: 'ไม่พบบัญชีผู้ใช้ที่ใช้อีเมลนี้' };
            // สร้างรหัสผ่านชั่วคราว 8 ตัว
            var chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
            var tempPw = Array.from({length: 8}, function() { return chars[Math.floor(Math.random() * chars.length)]; }).join('');
            var newHash = await sha256hex(tempPw);
            await sbPatch('users', { id: 'eq.' + uRows[0].id }, { password_hash: newHash, updated_at: new Date().toISOString() });
            return { success: true, tempPassword: tempPw,
                message: 'รหัสผ่านชั่วคราวของคุณคือ: <strong style="font-size:1.3rem;letter-spacing:2px;color:#2563eb">' + tempPw + '</strong><br><br>กรุณาเข้าสู่ระบบด้วยรหัสนี้ แล้วเปลี่ยนรหัสผ่านทันที' };
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
                return { id: h.id, display_number: (h.type === 'flat' ? 'แฟลต' : 'บ้าน') + h.house_number, house_number: h.house_number, type: h.type, status: h.status };
            });
            return { success: true, data: mapped };
        }
        case 'getResidentsList': {
            var rows = await sbGet('residents', { is_active: 'eq.true', order: 'house_number.asc' });
            return { success: true, data: rows };
        }

        /* ── Profile / Coresident ─────────────────── */
        case 'updateProfile': {
            var sessRows = await sbGet('sessions', { token: 'eq.' + getSessionToken(), select: 'user_id' });
            var profileUserId = sessRows && sessRows[0] ? sessRows[0].user_id : null;
            if (!profileUserId) {
                var lsUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
                if (lsUser && lsUser.id) profileUserId = lsUser.id;
            }
            if (!profileUserId) return { success: false, error: 'SESSION_EXPIRED' };
            await sbPatch('users', { id: 'eq.' + profileUserId }, {
                prefix: data.prefix || '', firstname: data.firstname || '',
                lastname: data.lastname || '', phone: data.phone || '',
                position: data.position || '', updated_at: new Date().toISOString()
            });
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

        /* ── Rates ────────────────────────────────── */
        case 'getWaterRate': {
            var rows = await sbGet('water_rates', { order: 'effective_at.desc', limit: '10' });
            return { success: true, data: rows };
        }

        /* ── Bill summaries ───────────────────────── */
        case 'getBillSummaryAll': {
            var period = data.period || '';
            var [outRows, resRows] = await Promise.all([
                sbGet('outstanding', { period: 'eq.' + period, order: 'house_number.asc' }),
                sbGet('residents',   { is_active: 'eq.true', select: 'house_number,prefix,firstname,lastname,user_id' })
            ]);
            var resMap = {};
            (resRows || []).forEach(function(r) { resMap[r.house_number] = ((r.prefix || '') + (r.firstname || '') + ' ' + (r.lastname || '')).trim(); });
            var result = (outRows || []).map(function(o) {
                return Object.assign({}, o, { resident_name: resMap[o.house_number] || '' });
            });
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

            if (sessRole === 'admin') {
                var [pendingReg, pendingSlips, pendingReqs] = await Promise.all([
                    sbGet('pending_registrations', { status: 'eq.pending', select: 'id', limit: '100' }),
                    sbGet('slip_submissions', { status: 'eq.pending', select: 'id', limit: '100' }),
                    sbGet('requests', { status: 'eq.pending', select: 'id', limit: '100' })
                ]);
                return { success: true, role: 'admin', announcements: announcements, data: {
                    pendingRegistrations: (pendingReg || []).length,
                    pendingSlips: (pendingSlips || []).length,
                    pendingRequests: (pendingReqs || []).length
                }};
            } else {
                var houseNumber = sessHouseNumber;
                var period = now2.getFullYear() + '-' + String(now2.getMonth() + 1).padStart(2, '0');
                var outRows = [], slipRows = [];
                if (houseNumber) {
                    [outRows, slipRows] = await Promise.all([
                        sbGet('outstanding', { house_number: 'eq.' + houseNumber, status: 'neq.paid', order: 'period.desc', limit: '12' }),
                        sbGet('slip_submissions', { house_number: 'eq.' + houseNumber, period: 'eq.' + period, order: 'submitted_at.desc', limit: '1' })
                    ]);
                }
                var currentOut = (outRows || []).find(function(o) { return o.period === period; });
                var latestSlip = slipRows && slipRows[0];
                var slipStatus = 'none';
                if (latestSlip) {
                    if (latestSlip.status === 'approved') slipStatus = 'success';
                    else if (latestSlip.status === 'rejected') slipStatus = 'rejected';
                    else slipStatus = 'reviewing';
                }
                var totalOutstanding = (outRows || []).reduce(function(s, r) {
                    return s + (parseFloat(r.total_amount) || 0);
                }, 0);
                return { success: true, role: 'user', announcements: announcements, data: {
                    houseNumber: houseNumber,
                    period: period,
                    currentAmount: currentOut ? parseFloat(currentOut.total_amount) || 0 : 0,
                    totalOutstanding: totalOutstanding,
                    slipStatus: slipStatus,
                    dueDate: currentOut ? currentOut.due_date : null
                }};
            }
        }

        /* ── Slip review ──────────────────────────── */
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
            var sess = await sbGet('sessions', { token: 'eq.' + getSessionToken(), select: 'user_id' });
            var reqReviewerId = sess && sess[0] ? sess[0].user_id : null;
            if (!reqReviewerId) {
                var lsUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
                if (lsUser && lsUser.id) reqReviewerId = lsUser.id;
            }
            await sbPatch('requests', { id: 'eq.' + data.id }, {
                status: data.status, reviewed_by: data.reviewedBy || reqReviewerId || '',
                reviewed_at: new Date().toISOString(), review_note: data.note || '',
                updated_at: new Date().toISOString()
            });
            return { success: true };
        }
        case 'updateQueue': {
            var ids = data.orderedIds || [];
            for (var i = 0; i < ids.length; i++) {
                await sbPatch('queue', { id: 'eq.' + ids[i] }, { position: i + 1, updated_at: new Date().toISOString() });
            }
            return { success: true };
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
            var pwHash = pwRaw ? await sha256hex(pwRaw) : await sha256hex('changeme123');
            // สร้าง user (เพื่อ login ได้) — users table มี phone, email, position
            await sbPost('users', {
                id: uid, email: email || uid + '@local.ppk',
                firstname: data.firstname || '', lastname: data.lastname || '',
                prefix: data.prefix || '', phone: data.phone || '',
                role: 'resident', position: data.position || '',
                is_active: true, pdpa_consent: false,
                password_hash: pwHash
            });
            // หา house_id จาก house_number
            var houseId = null;
            if (data.house_number) {
                var hRow = await sbGet('housing', { house_number: 'eq.' + data.house_number, select: 'id', limit: '1' });
                houseId = hRow && hRow[0] ? hRow[0].id : null;
            }
            if (!houseId) {
                return { success: true, userId: uid, residentId: null, warning: 'ไม่พบเลขที่บ้าน บันทึก user สำเร็จแต่ไม่ผูกแพรมบ้าน' };
            }
            // สร้าง resident — ใช้เฉพาะ columns ที่มีใน schema
            var newRes = await sbPost('residents', {
                user_id:      uid,
                house_id:     houseId,
                house_number: data.house_number || '',
                prefix:       data.prefix    || '',
                firstname:    data.firstname || '',
                lastname:     data.lastname  || '',
                position:     data.position  || '',
                is_active:    true
            });
            return { success: true, userId: uid, residentId: newRes ? newRes.id : null };
        }
        case 'updateResident': {
            var rid = data.id;
            // อัปเดต residents table — ใช้เฉพาะ schema columns
            var resUp = { updated_at: new Date().toISOString() };
            if (data.prefix       !== undefined) resUp.prefix       = data.prefix;
            if (data.firstname    !== undefined) resUp.firstname    = data.firstname;
            if (data.lastname     !== undefined) resUp.lastname     = data.lastname;
            if (data.position     !== undefined) resUp.position     = data.position;
            if (data.house_number !== undefined) resUp.house_number = data.house_number;
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
                    userUp.password_hash = await sha256hex(pw2);
                }
                await sbPatch('users', { id: 'eq.' + resRow[0].user_id }, userUp);
            }
            return { success: true };
        }
        case 'removeResident': {
            var rid = data.id;
            var resRows = await sbGet('residents', { id: 'eq.' + rid, select: 'user_id', limit: '1' });
            await sbPatch('residents', { id: 'eq.' + rid }, { is_active: false, updated_at: new Date().toISOString() });
            if (resRows && resRows[0] && resRows[0].user_id) {
                await sbPatch('users', { id: 'eq.' + resRows[0].user_id }, { is_active: false, updated_at: new Date().toISOString() });
            }
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
                sbGet('accounting_entries', { period: 'eq.' + period, type: 'eq.income',  order: 'recorded_at.asc' }),
                sbGet('accounting_entries', { period: 'eq.' + period, type: 'eq.expense', order: 'recorded_at.asc' })
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
            // คำนวณ carryForward = ยอดสะสมของเดือนก่อน
            var carryForward = 0;
            try {
                var parts = period.split('-');
                var prevDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 2, 1);
                var prevPeriod = prevDate.getFullYear() + '-' + String(prevDate.getMonth() + 1).padStart(2, '0');
                var [prevInc, prevExp] = await Promise.all([
                    sbGet('accounting_entries', { period: 'eq.' + prevPeriod, type: 'eq.income',  select: 'amount' }),
                    sbGet('accounting_entries', { period: 'eq.' + prevPeriod, type: 'eq.expense', select: 'amount' })
                ]);
                var pInc = (prevInc || []).reduce(function(s, r) { return s + (parseFloat(r.amount) || 0); }, 0);
                var pExp = (prevExp || []).reduce(function(s, r) { return s + (parseFloat(r.amount) || 0); }, 0);
                carryForward = pInc - pExp;
            } catch(e) { carryForward = 0; }
            return { success: true, incomeItems: (incRows || []).map(mapRow), expenseItems: (expRows || []).map(mapRow), carryForward: carryForward };
        }
        case 'calculateAutoEntries': {
            var period = data.period || '';
            var [waterRes, elecRes, payRes] = await Promise.all([
                sbGet('water_bills',     { period: 'eq.' + period, select: 'amount' }),
                sbGet('electric_bills',  { period: 'eq.' + period, select: 'bill_amount,amount' }),
                sbGet('payment_history', { period: 'eq.' + period, select: 'amount_paid' })
            ]);
            var waterTotal = (waterRes  || []).reduce(function(s, r) { return s + (parseFloat(r.amount) || 0); }, 0);
            var elecTotal  = (elecRes   || []).reduce(function(s, r) { return s + (parseFloat(r.bill_amount) || parseFloat(r.amount) || 0); }, 0);
            var payTotal   = (payRes    || []).reduce(function(s, r) { return s + (parseFloat(r.amount_paid) || 0); }, 0);
            var incomeItems  = payTotal  > 0 ? [{ name: 'ยอดรับชำระค่าเช่าและค่าสาธารณูปโภค', amount: payTotal }] : [];
            var expenseItems = [];
            if (waterTotal > 0) expenseItems.push({ name: 'ค่าน้ำประปา', amount: waterTotal });
            if (elecTotal  > 0) expenseItems.push({ name: 'ค่าไฟ PEA',   amount: elecTotal  });
            return { success: true, incomeItems: incomeItems, expenseItems: expenseItems };
        }
        case 'saveAccounting': {
            var period = data.period || '';
            var sess = await sbGet('sessions', { token: 'eq.' + getSessionToken(), select: 'user_id', limit: '1' });
            var recordedBy = sess && sess[0] ? sess[0].user_id : '';
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
                    recorded_at: new Date().toISOString()
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
                    recorded_at: new Date().toISOString()
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
            var path = 'receipts/' + Date.now() + '.' + ext;
            var blob = new Blob([bytes], { type: mime });
            var upRes = await window._sb.storage.from('receipts').upload(path, blob, { contentType: mime, upsert: false });
            if (upRes.error) {
                // ถ้า bucket ไม่มี ลองใช้ slips bucket แทน
                path = 'receipts/' + Date.now() + '.' + ext;
                upRes = await window._sb.storage.from('slips').upload(path, blob, { contentType: mime, upsert: false });
                if (upRes.error) return { success: false, error: upRes.error.message };
                var pubData2 = window._sb.storage.from('slips').getPublicUrl(path);
                return { success: true, fileId: pubData2.data.publicUrl };
            }
            var pubData = window._sb.storage.from('receipts').getPublicUrl(path);
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

        /* ── LINE Push (via Edge Function) ──────────── */
        case 'linePush': {
            if (!data.lineUserId && data.houseNumber) {
                var resRows = await sbGet('residents', { house_number: 'eq.' + data.houseNumber, is_active: 'eq.true', select: 'line_user_id,id', limit: '1' });
                data.lineUserId = resRows && resRows[0] ? resRows[0].line_user_id : null;
                data.residentId = resRows && resRows[0] ? resRows[0].id : null;
            }
            if (!data.lineUserId) return { success: false, error: 'ผู้พักยังไม่ได้เชื่อม LINE' };
            var lineResult = await _callEdge('line-push', {
                lineUserId:  data.lineUserId,
                message:     data.message,
                houseNumber: data.houseNumber || '',
                residentId:  data.residentId  || null
            });
            return lineResult && lineResult.success ? { success: true, quotaUsed: lineResult.quotaUsed } : { success: false, error: (lineResult && lineResult.error) || 'ส่ง LINE ไม่สำเร็จ' };
        }

        /* ── flexPush — ส่ง Flex Message ────────────── */
        case 'flexPush': {
            if (!data.lineUserId && data.houseNumber) {
                var fpRows = await sbGet('residents', { house_number: 'eq.' + data.houseNumber, is_active: 'eq.true', select: 'line_user_id,id', limit: '1' });
                data.lineUserId  = fpRows && fpRows[0] ? fpRows[0].line_user_id : null;
                data.residentId  = fpRows && fpRows[0] ? fpRows[0].id : null;
            }
            if (!data.lineUserId) return { success: false, error: 'ผู้พักยังไม่ได้เชื่อม LINE' };
            if (!data.flexMessage) return { success: false, error: 'ต้องระบุ flexMessage' };
            var fpResult = await _callEdge('line-push', {
                lineUserId:   data.lineUserId,
                flexMessage:  data.flexMessage,   // { altText, contents }
                message:      data.altText || 'แจ้งเตือนจากระบบบ้านพักครู',
                houseNumber:  data.houseNumber || '',
                residentId:   data.residentId  || null,
                messageType: 'flex'
            });
            return fpResult && fpResult.success ? { success: true, quotaUsed: fpResult.quotaUsed } : { success: false, error: (fpResult && fpResult.error) || 'ส่ง Flex Message ไม่สำเร็จ' };
        }

        /* ── getLineQuota ──────────────────────────── */
        case 'getLineQuota': {
            var qRows = await sbGet('settings', {});
            var qMap = {};
            (qRows || []).forEach(function(r) { qMap[r.key] = r.value; });
            return { success: true, data: {
                used:  parseInt(qMap['line_push_quota_used']  || '0'),
                limit: parseInt(qMap['line_push_quota_limit'] || '200'),
                resetDate: qMap['line_push_quota_reset_date'] || ''
            }};
        }

        /* ── getLineSettings ───────────────────────── */
        case 'getLineSettings': {
            var lsRows = await sbGet('settings', {});
            var lsMap = {};
            (lsRows || []).forEach(function(r) { lsMap[r.key] = r.value; });
            return { success: true, data: {
                lineChannelToken: lsMap['line_channel_access_token'] || '',
                lineChannelSecret: lsMap['line_channel_secret']      || '',
                lineLiffId:        lsMap['line_liff_id']             || '',
                lineOaName:        lsMap['line_oa_name']             || '',
                resendApiKey:      lsMap['resend_api_key']           || '',
                emailFrom:         lsMap['email_from']               || '',
                emailFromName:     lsMap['email_from_name']          || ''
            }};
        }

        /* ── saveLineSettings ──────────────────────── */
        case 'saveLineSettings': {
            var lsEntries = [
                ['line_channel_access_token', data.lineChannelToken || ''],
                ['line_channel_secret',       data.lineChannelSecret || ''],
                ['line_liff_id',              data.lineLiffId       || ''],
                ['line_oa_name',              data.lineOaName       || ''],
                ['resend_api_key',            data.resendApiKey     || ''],
                ['email_from',                data.emailFrom        || ''],
                ['email_from_name',           data.emailFromName    || '']
            ];
            for (var li = 0; li < lsEntries.length; li++) {
                await sbUpsert('settings', { key: lsEntries[li][0], value: lsEntries[li][1] }, 'key');
            }
            return { success: true };
        }

        /* ── getResidentByLine (LIFF ใช้ — ค้นหาผู้พักจาก LINE User ID) ── */
        case 'getResidentByLine': {
            var grlLineUid = data.lineUserId;
            if (!grlLineUid) return { success: false, error: 'ต้องระบุ lineUserId' };
            var grlRows = await sbGet('residents', { line_user_id: 'eq.' + grlLineUid, is_active: 'eq.true', limit: '1' });
            if (!grlRows || !grlRows[0]) return { success: true, resident: null };
            return { success: true, resident: grlRows[0] };
        }

        /* ── getBillForHouse (LIFF dashboard ใช้) ──── */
        case 'getBillForHouse': {
            var bfhHouse = data.houseNumber || '';
            var bfhPeriod = data.period || '';
            if (!bfhHouse) return { success: false, error: 'ต้องระบุ houseNumber' };
            var bfhQ = { house_number: 'eq.' + bfhHouse };
            if (bfhPeriod) bfhQ.period = 'eq.' + bfhPeriod;
            bfhQ.order = 'period.desc';
            bfhQ.limit = '1';
            var bfhRows = await sbGet('outstanding', bfhQ);
            if (!bfhRows || !bfhRows[0]) return { success: true, data: null };
            var bfhRow = bfhRows[0];
            return { success: true, data: {
                waterBill: parseFloat(bfhRow.water_bill || bfhRow.water_amount || 0),
                electricBill: parseFloat(bfhRow.electric_bill || bfhRow.electric_amount || 0),
                commonFee: parseFloat(bfhRow.common_fee || bfhRow.common_amount || 0),
                paymentStatus: bfhRow.status || 'unpaid',
                period: bfhRow.period
            }};
        }

        /* ── submitHouseForm (LIFF forms ใช้) ──────── */
        case 'submitHouseForm': {
            // หา resident จาก LINE user ID เพื่อเอา user_id
            var shfResident = null;
            if (data.lineUserId) {
                var shfResRows = await sbGet('residents', { line_user_id: 'eq.' + data.lineUserId, is_active: 'eq.true', limit: '1' });
                shfResident = shfResRows && shfResRows[0] ? shfResRows[0] : null;
            }
            var shfPayload = {
                house_number: data.houseNumber || '',
                user_id: shfResident ? shfResident.user_id : null,  // แก้: line_user_id → user_id
                type: data.formType || 'general',                   // แก้: form_type → type
                details: { ...data, lineUserId: data.lineUserId },  // แก้: detail → details, เก็บ LINE ID ใน jsonb
                status: 'pending',
                submitted_at: new Date().toISOString()
            };
            try {
                await sbPost('requests', shfPayload);
                return { success: true };
            } catch(shfErr) {
                return { success: false, error: shfErr.message || 'บันทึกไม่สำเร็จ' };
            }
        }

        /* ── linkLineAccount (LIFF ใช้) ─────────────── */
        case 'linkLineAccount': {
            var houseNo = data.houseNumber || data.house_number || '';
            var lineUid  = data.lineUserId;
            var pwd      = data.password || '';
            if (!houseNo || !lineUid) return { success: false, error: 'ต้องระบุ houseNumber และ lineUserId' };
            if (!pwd) return { success: false, error: 'ต้องระบุรหัสผ่าน' };
            
            // ค้นหา resident
            var linkRows = await sbGet('residents', { house_number: 'eq.' + houseNo, is_active: 'eq.true', limit: '1' });
            if (!linkRows || !linkRows[0]) return { success: false, error: 'ไม่พบข้อมูลผู้พักบ้านหมายเลขนี้' };
            var resident = linkRows[0];
            
            // ตรวจสอบรหัสผ่าน: ถ้ามี user_id ให้ตรวจกับ users.password_hash
            if (resident.user_id) {
                var userRows = await sbGet('users', { id: 'eq.' + resident.user_id, limit: '1' });
                if (!userRows || !userRows[0]) return { success: false, error: 'ไม่พบข้อมูลผู้ใช้' };
                var user = userRows[0];
                // เข้ารหัส password ด้วย SHA-256 เทียบกับ hash ใน DB
                var pwdHash = await sha256hex(pwd);
                if (pwdHash !== user.password_hash) {
                    return { success: false, error: 'รหัสผ่านไม่ถูกต้อง' };
                }
            } else {
                // ถ้าไม่มี user_id ให้ใช้รหัสผ่านเริ่มต้นจาก settings
                var settingsRows = await sbGet('settings', { key: 'eq.default_resident_pin' });
                var defaultPin = settingsRows && settingsRows[0] ? settingsRows[0].value : null;
                if (!defaultPin) {
                    return { success: false, error: 'ยังไม่ได้ตั้งรหัส PIN เริ่มต้นในระบบ — กรุณาติดต่อผู้ดูแลระบบ' };
                }
                if (pwd !== defaultPin) {
                    return { success: false, error: 'รหัสผ่านไม่ถูกต้อง' };
                }
            }
            
            // ตรวจสอบว่า LINE ID นี้ยังไม่ได้ผูกกับบ้านอื่นอยู่
            var existingLink = await sbGet('residents', { line_user_id: 'eq.' + lineUid, limit: '1' });
            if (existingLink && existingLink[0] && existingLink[0].id !== resident.id) {
                return { success: false, error: 'LINE ID นี้เชื่อมกับบ้านพักอื่นอยู่แล้ว' };
            }
            
            // ยืนยันการเชื่อมบัญชี
            await sbPatch('residents', { id: 'eq.' + resident.id }, { line_user_id: lineUid, line_linked_at: new Date().toISOString() });
            return { success: true, resident: resident };
        }

        /* ── cleanupOldSlips (trigger via Edge) ─────── */
        case 'cleanupOldSlips': {
            var cleanResult = await _callEdge('cleanup-old-slips', {});
            return cleanResult || { success: false, error: 'Edge Function ไม่ตอบสนอง' };
        }

        default:
            throw new Error('Unknown action: ' + action);
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

    if (fresh && fresh.d) {
        if (Date.now() - fresh.t > ttlMs) {
            callBackend(action, params || {}).then(function(r) {
                if (r && r.success !== false) {
                    try { localStorage.setItem(ck, JSON.stringify({ t: Date.now(), d: r })); } catch(e) {}
                }
            }).catch(function() {});
        }
        return fresh.d;
    }

    var r = await callBackend(action, params || {});
    if (r && r.success !== false) {
        try { localStorage.setItem(ck, JSON.stringify({ t: Date.now(), d: r })); } catch(e) {}
    }
    return r;
}

/* ══════════════════════════════════════════
   Register real implementations for ppk-app.js stubs
══════════════════════════════════════════ */
window._callBackendReal = callBackend;
window._cachedCallReal  = cachedCall;
