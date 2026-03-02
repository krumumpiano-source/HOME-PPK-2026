/**
 * HOME PPK 2026 — Core App Bootstrap
 * ดัดแปลงจากรูปแบบ Band Management By SoulCiety
 *
 * โหลดไฟล์นี้เป็นสคริปต์แรกในทุกหน้า (แทน ppk-api.js โดยตรง)
 *
 * ลำดับการโหลดอัตโนมัติ:
 *   1. supabase/config.js  — Supabase URL + anon key
 *   2. Supabase JS SDK     — จาก CDN
 *   3. ppk-api.js          — ฟังก์ชัน callBackend, ppkLogin ฯลฯ
 *   4. ppk-utils.js        — Modal dialogs (ppkAlert, ppkConfirm)
 *   5. ppk-nav.js          — Sidebar renderer (renderPPKNav)
 */

// ── Auto-inject: config → SDK → ppk-api → ppk-utils → ppk-nav ─────────────
(function () {
  'use strict';
  if (document.getElementById('_ppk_sdk')) return; // โหลดแล้ว

  // คำนวณ base path จาก script src
  var basePath = (function () {
    var tags = document.getElementsByTagName('script');
    for (var i = 0; i < tags.length; i++) {
      if (tags[i].src && tags[i].src.indexOf('ppk-app.js') !== -1) {
        return tags[i].src.replace('ppk-app.js', '');
      }
    }
    return '';
  })();

  function loadScript(src, id, onload) {
    var s = document.createElement('script');
    if (id) s.id = id;
    s.src = src;
    if (onload) s.onload = onload;
    document.head.appendChild(s);
  }

  // 1) Load config.js ก่อน (ตั้งค่า window._PPK_CONFIG)
  loadScript(basePath + 'supabase/config.js', '_ppk_cfg', function () {
    // 2) Load Supabase JS SDK
    loadScript(
      'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js',
      '_ppk_sdk',
      function () {
        // 3) Load ppk-api.js (ใช้ SDK ที่โหลดแล้ว)
        loadScript(basePath + 'ppk-api.js', '_ppk_api', function () {
          // แจ้งว่า API พร้อมใช้งาน
          document.dispatchEvent(new Event('ppkReady'));
        });
      }
    );
  });
  // หมายเหตุ: ppk-nav.js และ ppk-utils.js ควรโหลดเป็น <script> tags แยกต่างหาก
  // เพื่อให้ renderPPKNav() และ ppkAlert/ppkConfirm พร้อมใช้งานทันทีเมื่อ DOM โหลด
})();

// ════════════════════════════════════════════════════════════
//  Global Utilities — พร้อมใช้ทันทีไม่ต้องรอ SDK
// ════════════════════════════════════════════════════════════

/**
 * navigate(page)
 * รองรับทั้ง ?page=xxx และ ชื่อไฟล์ html โดยตรง
 */
function navigate(page) {
  var m = (page || '').match(/[?&]page=([^&]+)/);
  window.location.href = m ? m[1] + '.html' : page;
}

/**
 * requireAuth()
 * ตรวจสอบ session — redirect ไป login.html ถ้ายังไม่ล็อกอิน
 */
function requireAuth() {
  if (!localStorage.getItem('sessionToken')) {
    window.location.replace('login.html');
  }
}

/**
 * getCurrentUser() → Object
 * คืนข้อมูล user จาก localStorage
 */
function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('currentUser') || '{}');
  } catch (e) {
    return {};
  }
}

/**
 * isAdmin() → boolean
 */
function isAdmin() {
  var u = getCurrentUser();
  return u.role === 'admin';
}

/**
 * getSessionToken() → string
 */
function getSessionToken() {
  return localStorage.getItem('sessionToken') || '';
}

/**
 * apiCall(action, data, callback)
 * Placeholder รอให้ ppk-api.js โหลดเสร็จ — fallback ไป callBackend
 */
function apiCall(action, data, callback) {
  var tries = 0;
  var wait = setInterval(function () {
    tries++;
    if (typeof window._callBackendReal === 'function') {
      clearInterval(wait);
      window._callBackendReal(action, data || {}).then(function (r) {
        if (callback) callback(r);
      }).catch(function (err) {
        if (callback) callback({ success: false, message: err.message || String(err) });
      });
    } else if (tries > 150) {
      clearInterval(wait);
      if (callback) callback({ success: false, message: 'ไม่สามารถโหลด PPK API ได้ กรุณารีเฟรชหน้า' });
    }
  }, 100);
}

/**
 * callBackend(action, data) / callBackendGet(action, data)
 * Stub ที่พร้อมใช้ทันที — รอ ppk-api.js โหลดเสร็จโดยอัตโนมัติ (max 15s)
 */
function callBackend(action, data) {
  return new Promise(function (resolve, reject) {
    var tries = 0;
    var wait = setInterval(function () {
      tries++;
      if (typeof window._callBackendReal === 'function') {
        clearInterval(wait);
        window._callBackendReal(action, data || {}).then(resolve).catch(reject);
      } else if (tries > 150) {
        clearInterval(wait);
        reject(new Error('PPK API โหลดไม่สำเร็จ กรุณารีเฟรชหน้า'));
      }
    }, 100);
  });
}

function callBackendGet(action, data) {
  return callBackend(action, data);
}

function cachedCall(action, data, ttl) {
  return new Promise(function (resolve, reject) {
    var tries = 0;
    var wait = setInterval(function () {
      tries++;
      if (typeof window._cachedCallReal === 'function') {
        clearInterval(wait);
        window._cachedCallReal(action, data || {}, ttl).then(resolve).catch(reject);
      } else if (tries > 150) {
        clearInterval(wait);
        reject(new Error('PPK API โหลดไม่สำเร็จ กรุณารีเฟรชหน้า'));
      }
    }, 100);
  });
}
