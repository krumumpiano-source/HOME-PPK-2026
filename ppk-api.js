/**
 * PPK API — Shared API & Navigation Utilities
 * โหลดในทุกหน้า ก่อน ppk-utils.js
 * แก้ GAS URL ในไฟล์นี้ไฟล์เดียว → ใช้ได้ทุกหน้าทันที
 */

/* ──────────────────────────────────────────
   GAS Deployment URL — แก้ตรงนี้ที่เดียวเท่านั้น
────────────────────────────────────────── */
var WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyA9KchBb2jhanAjz7VrMesRSINa35wkdH7VXY8dTig3lSFPY0M4bBbaIjgbuMRUX-0mQ/exec';

/* ──────────────────────────────────────────
   Navigation
────────────────────────────────────────── */
function navigate(page) {
    var m = page.match(/[?&]page=([^&]+)/);
    window.location.href = m ? m[1] + '.html' : page;
}

/* ──────────────────────────────────────────
   Session Token
────────────────────────────────────────── */
function getSessionToken() {
    return localStorage.getItem('sessionToken') || '';
}

/* ──────────────────────────────────────────
   POST — callBackend
────────────────────────────────────────── */
async function callBackend(action, data) {
    data = data || {};
    if (!WEB_APP_URL) return null;
    const payload = { action, token: getSessionToken(), ...data };
    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload),
            redirect: 'follow'
        });
        const text = await response.text();
        const result = JSON.parse(text);
        if (result && result.error === 'SESSION_EXPIRED') {
            localStorage.clear();
            navigate('?page=login');
            return null;
        }
        return result;
    } catch (err) {
        console.error('Backend POST error:', err);
        throw new Error('ไม่สามารถเชื่อมต่อระบบได้ — กรุณาลองใหม่');
    }
}

/* ──────────────────────────────────────────
   GET — callBackendGet
────────────────────────────────────────── */
async function callBackendGet(action, params) {
    params = params || {};
    if (!WEB_APP_URL) return null;
    const token = getSessionToken();
    const q = new URLSearchParams({ action, token, ...params }).toString();
    try {
        const response = await fetch(WEB_APP_URL + '?' + q, { redirect: 'follow' });
        const text = await response.text();
        const result = JSON.parse(text);
        if (result && result.error === 'SESSION_EXPIRED') {
            localStorage.clear();
            navigate('?page=login');
            return null;
        }
        return result;
    } catch (err) {
        console.error('Backend GET error:', err);
        throw new Error('ไม่สามารถเชื่อมต่อระบบได้');
    }
}

/* ──────────────────────────────────────────
   Stale-while-revalidate Cache — cachedCall
   TTL default 5 นาที
────────────────────────────────────────── */
async function cachedCall(action, params, ttlMs) {
    ttlMs = ttlMs || 300000;
    var ck = 'apicache_' + action + '_' + JSON.stringify(params || {});
    var fresh = null;
    try {
        var s = localStorage.getItem(ck);
        if (s) fresh = JSON.parse(s);
    } catch (e) {}

    if (fresh && fresh.d) {
        if (Date.now() - fresh.t > ttlMs) {
            // หมดอายุ — refresh ใน background โดยไม่รอ
            callBackendGet(action, params || {}).then(function (r) {
                if (r && r.success !== false) {
                    try { localStorage.setItem(ck, JSON.stringify({ t: Date.now(), d: r })); } catch (e) {}
                }
            }).catch(function () {});
        }
        return fresh.d; // return ทันทีจาก cache
    }

    // ไม่มี cache — ต้องรอ fetch จริง
    var r = await callBackendGet(action, params || {});
    if (r && r.success !== false) {
        try { localStorage.setItem(ck, JSON.stringify({ t: Date.now(), d: r })); } catch (e) {}
    }
    return r;
}

/* ──────────────────────────────────────────
   Session Check — checkSession
────────────────────────────────────────── */
async function checkSession() {
    const token = localStorage.getItem('sessionToken');
    if (!token) { navigate('?page=login'); return null; }
    if (!WEB_APP_URL) return JSON.parse(localStorage.getItem('currentUser') || 'null');
    try {
        const result = await callBackendGet('getCurrentUser');
        if (!result || !result.success) {
            localStorage.clear();
            navigate('?page=login');
            return null;
        }
        const user = result.user || result.data;
        if (user) localStorage.setItem('currentUser', JSON.stringify(user));
        return user;
    } catch {
        return JSON.parse(localStorage.getItem('currentUser') || 'null');
    }
}
