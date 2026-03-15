/**
 * HOME PPK 2026 — Supabase Config
 * แก้ค่าในไฟล์นี้ไฟล์เดียวเพื่อเชื่อมต่อ Supabase project ของคุณ
 *
 * วิธีดูค่า:
 *   Supabase Dashboard → Project Settings → API
 *   - Project URL  = url
 *   - anon public  = anon
 *
 * ⚠️ ห้าม commit service_role key ลง git
 */

// ──────────────────────────────────────────
//  แก้ค่าด้านล่างนี้ที่เดียวเท่านั้น
// ──────────────────────────────────────────
window._PPK_CONFIG = {
  url:  'https://mwigdgxrfpcmfjuztmip.supabase.co',
  anon: 'sb_publishable_DInAJWyKXTwcxC79jNiS9A_PDxjKWHL'
};

// ──────────────────────────────────────────
//  Backward compat — ไม่ต้องแก้
// ──────────────────────────────────────────
var SUPABASE_URL      = window._PPK_CONFIG.url;
var SUPABASE_ANON_KEY = window._PPK_CONFIG.anon;
var SUPABASE_REST_URL     = SUPABASE_URL + '/rest/v1';
var SUPABASE_AUTH_URL     = SUPABASE_URL + '/auth/v1';
var SUPABASE_STORAGE_URL  = SUPABASE_URL + '/storage/v1';
