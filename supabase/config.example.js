/**
 * HOME PPK 2026 — Supabase Config (TEMPLATE)
 *
 * วิธีใช้:
 *   1. คัดลอกไฟล์นี้ → supabase/config.js
 *   2. ใส่ค่า URL และ anon key ของ Supabase project คุณ
 *   3. ห้าม commit supabase/config.js ลง Git (อยู่ใน .gitignore แล้ว)
 *
 * วิธีดูค่า:
 *   Supabase Dashboard → Project Settings → API
 *   - Project URL  → url
 *   - anon public  → anon
 *
 * ⚠️ ห้ามใช้ service_role key ในฝั่ง browser เด็ดขาด
 */

window._PPK_CONFIG = {
  url:  'https://YOUR_PROJECT_ID.supabase.co',
  anon: 'YOUR_ANON_KEY_HERE'
};

// Backward compat
var SUPABASE_URL          = window._PPK_CONFIG.url;
var SUPABASE_ANON_KEY     = window._PPK_CONFIG.anon;
var SUPABASE_REST_URL     = SUPABASE_URL + '/rest/v1';
var SUPABASE_AUTH_URL     = SUPABASE_URL + '/auth/v1';
var SUPABASE_STORAGE_URL  = SUPABASE_URL + '/storage/v1';
