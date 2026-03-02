# 📋 สถานะโครงการ HOME PPK 2026

**บันทึก:** 2 มีนาคม 2569 (2026)  
**เวอร์ชัน:** หลัง Migration จาก Google Apps Script → Supabase  

---

## 📑 สารบัญ

1. [สถาปัตยกรรมระบบปัจจุบัน](#1-สถาปัตยกรรมระบบปัจจุบัน)
2. [สิ่งที่ทำเสร็จแล้ว](#2-สิ่งที่ทำเสร็จแล้ว)
3. [**Master Priority List — ลำดับงานทั้งหมด**](#3-master-priority-list)
4. [Bug ที่พบและยังไม่ได้แก้](#4-bug-ที่พบและยังไม่ได้แก้)
5. [แผน LINE LIFF (อนุมัติแล้ว)](#5-แผน-line-liff)
6. [แผน Auto-Delete Slip Images](#6-แผน-auto-delete-slip-images)
7. [SQL สำหรับ Reset Admin](#7-sql-สำหรับ-reset-admin)
8. [LINE Migration SQL](#8-line-migration-sql)
9. [ขั้นตอน Deploy ระบบ](#9-ขั้นตอน-deploy-ระบบ)
10. [ประมาณการโควต้าและค่าใช้จ่าย](#10-ประมาณการโควต้าและค่าใช้จ่าย)
11. [โครงสร้าง DB Tables](#11-โครงสร้าง-db-tables-สรุป)
12. [ไฟล์ที่ยังต้องสร้าง](#12-ไฟล์ที่ยังต้องสร้าง)
13. [**ข้อเสนอแนะปรับปรุง UX**](#13-ข้อเสนอแนะปรับปรุง-ux)

---

## 1. สถาปัตยกรรมระบบปัจจุบัน

```
┌─────────────────────────────────────────────────────┐
│                   FRONTEND                          │
│  ┌──────────────┐        ┌─────────────────────┐   │
│  │ ทีมงาน (Web) │        │ ผู้พักอาศัย (LINE)  │   │
│  │ GitHub Pages │        │  LIFF 2.x (ฟรี)    │   │
│  └──────┬───────┘        └──────────┬──────────┘   │
└─────────┼──────────────────────────┼───────────────┘
          │ HTTPS                    │ LIFF SDK
          ▼                          ▼
┌─────────────────────────────────────────────────────┐
│                  SUPABASE (FREE TIER)               │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │  PostgreSQL  │  │Edge Functions│  │ Storage   │ │
│  │  (Database) │  │  (Deno/TS)   │  │ 1GB ฟรี   │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────┐
│               LINE Messaging API                    │
│  Push Notify (200/เดือน ฟรี) + Reply (ไม่จำกัด)   │
└─────────────────────────────────────────────────────┘
```

### เทคโนโลยี
| Component | Technology | Cost |
|-----------|------------|------|
| Frontend (ทีมงาน) | HTML/CSS/JS บน GitHub Pages | ฟรี |
| Frontend (ผู้พัก) | LINE LIFF 2.x | ฟรี |
| Database | Supabase PostgreSQL | ฟรี (500MB) |
| Edge Functions | Supabase Deno Functions | ฟรี (500K req/เดือน) |
| File Storage | Supabase Storage | ฟรี (1GB) |
| LINE Push | Messaging API Free Plan | ฟรี (200 push/เดือน) |
| Auth | SHA-256 + session tokens ใน DB | — |

### ไฟล์หลัก
| ไฟล์ | บทบาท |
|------|-------|
| `ppk-api.js` | Action router หลัก — `callBackend(action, data)` → Supabase REST |
| `ppk-app.js` | Bootstrap, session check, helper functions |
| `ppk-nav.js` | Navigation bar, breadcrumb |
| `ppk-utils.js` | Utility functions (format, validate, etc.) |
| `supabase/config.js` | Supabase URL + Anon Key **(อยู่ใน .gitignore)** |
| `supabase/schema.sql` | Full DB schema |
| `supabase/rls.sql` | Row Level Security policies |

---

## 2. สิ่งที่ทำเสร็จแล้ว

### ✅ Code Cleanup
- ลบ `WEB_APP_URL` guards ทั้งหมด (37+ occurrences ใน admin-settings.html และอีกหลายไฟล์)
- ลบ Google Apps Script / Google Drive references จากโค้ด HTML/JS ทั้งหมด
- แก้ `slip_file_ids` (GAS field) → `slip.image_url` ใน check-slip.html
- แก้ `uploadReceiptIfNeeded()` ให้ใช้ `receipt_url` แทน Google Drive URL

### ✅ Security
- เพิ่ม `supabase/config.js` ใน `.gitignore`
- สร้าง `supabase/config.example.js` เป็น template สำหรับ dev ใหม่

### ✅ Architecture Planning (อนุมัติแล้ว)
- แผน LINE LIFF สำหรับผู้พักอาศัย (เหมือนหมอพร้อม)
- แผน auto-delete slip images อายุ >2 ปี (แต่เก็บ DB records ตลอดกาล)
- ประมาณการโควต้า LINE 200 push/เดือน ≈ 95 push จริง (60 ห้อง) — อยู่ใน free

### ✅ Documentation
- อัปเดต README.md (ลบ GAS references)
- อัปเดต DOCUMENTATION-HOME-PPK-2026.md

---

## 3. สิ่งที่ยังต้องทำ

### Phase 1: ตั้งค่า Supabase (ทำก่อน — manual)

| # | งาน | วิธี | หมายเหตุ |
|---|-----|------|----------|
| 1 | สร้าง Supabase project | supabase.com → New Project | ชื่อ: home-ppk-2026 |
| 2 | ใส่ key จริงใน config.js | copy จาก Project Settings | URL + anon key |
| 3 | รัน `supabase/schema.sql` | SQL Editor ใน Supabase | สร้าง tables ทั้งหมด |
| 4 | รัน `supabase/rls.sql` | SQL Editor ใน Supabase | เปิด RLS policies |
| 5 | สร้าง Storage bucket `slips` | Storage → New Bucket | public bucket |
| 6 | รัน Admin SQL (ข้อ 7 ด้านล่าง) | SQL Editor | ล้าง users + สร้าง 2 admins |

### Phase 2: Bug Fixes (AI เขียนให้ได้)

| # | งาน | ไฟล์ | ความสำคัญ |
|---|-----|------|-----------|
| 7 | แก้ `imageUrl: null` bug | upload-slip.html | 🔴 Critical |
| 8 | เพิ่ม missing ppk-api.js actions | ppk-api.js | 🟡 High |
| 9 | Push GitHub → เปิด GitHub Pages | GitHub | 🟡 High |

### Phase 3: LINE Integration (AI เขียนให้ได้)

| # | งาน | รายละเอียด |
|---|-----|-----------|
| 10 | รัน `supabase/line-migration.sql` | เพิ่ม columns: `line_user_id`, `image_deleted_at`, table `line_push_log` |
| 11 | สร้าง LINE OA + LIFF App | manual ที่ LINE Developers Console |
| 12 | ออกแบบ Rich Menu (รูปภาพ) | 2500×1686px, 6 ปุ่ม |
| 13 | Edge Function: `line-webhook` | รับ events จาก LINE → ประมวลผล |
| 14 | Edge Function: `line-push` | ส่ง push message ไปหาผู้พัก |
| 15 | Edge Function: `cleanup-old-slips` | ลบรูปสลิปอายุ >2 ปีทุกเดือน |
| 16 | LIFF Page: `liff-register.html` | ผู้พักลงทะเบียนผ่าน LINE + QR |
| 17 | LIFF Page: `liff-dashboard.html` | ผู้พักดูยอดค้างชำระ/สถานะ |
| 18 | LIFF Page: `liff-slip.html` | ผู้พักส่งสลิปผ่าน LINE |
| 19 | LIFF Page: `liff-history.html` | ผู้พักดูประวัติการชำระ |
| 20 | LIFF Page: `liff-forms.html` | ผู้พักยื่นคำร้องต่างๆ |

### Phase 4: Admin Page Modifications (AI เขียนให้ได้)

| # | งาน | ไฟล์ |
|---|-----|------|
| 21 | เพิ่ม LINE tab + quota meter | admin-settings.html |
| 22 | เพิ่มปุ่ม "ส่ง LINE" + quota counter | payment-notification.html |
| 23 | เพิ่ม LINE push หลัง approve/reject + UI รูปถูกลบ | check-slip.html |
| 24 | เปลี่ยนเป็น Landing Page (QR LINE OA) | index.html |

---

## 4. Bug ที่พบและยังไม่ได้แก้

### 🔴 Critical: upload-slip.html — imageUrl = null

**ตำแหน่ง:** upload-slip.html บรรทัด 344-358  
**ผลกระทบ:** สลิปที่ผู้พักส่งมาไม่มีรูปภาพเลย — DB record สร้างแต่ `image_url = null`

**โค้ดที่ผิดอยู่ตอนนี้:**
```javascript
const submitResult = await callBackend('submitSlip', {
    house_number: houseNum,
    period: period,
    amount: amount,
    note: note,
    imageUrl: null   // ← รูปหาย!
});
```

**วิธีแก้ (ต้องทำ):**
```javascript
// 1. Upload ไป Storage ก่อน
const fileName = `slips/${houseNum}/${Date.now()}_${file.name}`;
const { data: uploadData, error: uploadError } = await _sb.storage
    .from('slips')
    .upload(fileName, file, { contentType: file.type });

if (uploadError) throw uploadError;

const { data: urlData } = _sb.storage.from('slips').getPublicUrl(fileName);
const imageUrl = urlData.publicUrl;

// 2. แล้วค่อย submit พร้อม URL จริง
const submitResult = await callBackend('submitSlip', {
    house_number: houseNum,
    period: period,
    amount: amount,
    note: note,
    imageUrl: imageUrl   // ← URL จริงจาก Storage
});
```

### 🟡 High: ppk-api.js — Missing Actions

Actions ต่อไปนี้ยังไม่มีใน `ppk-api.js` → ถ้ากดหน้านั้นจะ throw "Unknown action":

| Action | ใช้ใน | สิ่งที่ต้องทำ |
|--------|-------|--------------|
| `loadAccountingData` | accounting.html | query `outstanding` + `payment_history` |
| `calculateAutoEntries` | accounting.html | คำนวณยอดสรุปบัญชี |
| `saveAccounting` | accounting.html | insert `accounting_entries` |
| `resetPassword` | forgot-password.html | update `users.password_hash` |
| `findEmail` | forgot-email.html | query `users` by `id_card` |

---

## 5. แผน LINE LIFF

### User Journey (ผู้พักอาศัย)
```
QR Code ที่ index.html / บอร์ดประกาศจริง
    ↓
เพิ่มเพื่อน LINE OA
    ↓
Rich Menu: [ลงทะเบียน] [ยอดค้าง] [ส่งสลิป] [ประวัติ] [คำร้อง] [ติดต่อ]
    ↓
กดปุ่มใดก็ตาม → เปิด LIFF Page
    ↓
LIFF ดึง LINE User ID → ยืนยันตัวตน → แสดงข้อมูล
```

### Rich Menu (6 ปุ่ม)
| ปุ่ม | Action | LIFF URL |
|-----|--------|---------|
| 🏠 ลงทะเบียน | เปิด LIFF | liff-register.html |
| 💰 ยอดค้าง | เปิด LIFF | liff-dashboard.html |
| 📎 ส่งสลิป | เปิด LIFF | liff-slip.html |
| 📋 ประวัติ | เปิด LIFF | liff-history.html |
| 📝 คำร้อง | เปิด LIFF | liff-forms.html |
| 📞 ติดต่อ | ส่ง message | reply ฟรี |

### Edge Functions ที่ต้องสร้าง

**1. `line-webhook` (supabase/functions/line-webhook/index.ts)**
- รับ POST จาก LINE Platform
- verify signature ด้วย `X-Line-Signature`
- event `follow` → บันทึก `line_user_id` ใน DB
- event `message` → reply อัตโนมัติ

**2. `line-push` (supabase/functions/line-push/index.ts)**
- รับ call จาก admin pages
- ส่ง push message ไปหา `line_user_id` ที่ระบุ
- บันทึกลง `line_push_log` table
- ใช้ Channel Access Token จาก `settings` table

**3. `cleanup-old-slips` (supabase/functions/cleanup-old-slips/index.ts)**
- trigger ด้วย pg_cron ทุกวันที่ 1 ของเดือน
- หา records ที่ `created_at < NOW() - INTERVAL '2 years'` และ `image_url IS NOT NULL`
- ลบไฟล์ออกจาก Supabase Storage
- set `image_url = null`, `image_deleted_at = NOW()`
- **ไม่ลบ DB record** — เก็บข้อมูล: house_number, period, amount, status

### Push Notifications (3 events เท่านั้น)
| Event | ผู้รับ | ข้อความ |
|-------|-------|---------|
| แจ้งบิล | ผู้พักทุกห้อง | "💰 บิลค่าน้ำ-ไฟเดือน {เดือน}: {ยอด} บาท กรุณาชำระภายใน {วันสุดท้าย}" |
| อนุมัติสลิป | ผู้พักที่ส่ง | "✅ สลิปการชำระเงินเดือน {เดือน} ได้รับการยืนยันแล้ว" |
| ปฏิเสธสลิป | ผู้พักที่ส่ง | "❌ สลิปเดือน {เดือน} ไม่ผ่าน เหตุผล: {reason} กรุณาส่งใหม่" |

---

## 6. แผน Auto-Delete Slip Images

### หลักการ
- **ลบรูปภาพ** ออกจาก Supabase Storage หลังจาก 2 ปี (ประหยัด space)
- **ไม่ลบ DB record** — เก็บข้อมูลสำคัญตลอดกาล: ห้อง, เดือน, ยอด, สถานะ, วันที่
- เมื่อรูปถูกลบ → `image_url = null`, `image_deleted_at = วันที่ลบ`
- UI ใน check-slip.html จะแสดง `🗑️ รูปถูกลบแล้ว (เก็บเกิน 2 ปี)` แทน

### SQL columns ที่ต้องเพิ่ม
```sql
ALTER TABLE slip_submissions 
ADD COLUMN IF NOT EXISTS image_deleted_at TIMESTAMPTZ DEFAULT NULL;
```

### Logic ของ cleanup-old-slips
```typescript
// หา slip ที่เกิน 2 ปีและยังมีรูป
const { data: oldSlips } = await supabase
    .from('slip_submissions')
    .select('id, image_url')
    .lt('created_at', new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString())
    .not('image_url', 'is', null);

for (const slip of oldSlips) {
    // ลบไฟล์จาก Storage
    const filePath = slip.image_url.split('/slips/')[1];
    await supabase.storage.from('slips').remove([filePath]);
    
    // อัปเดต DB
    await supabase
        .from('slip_submissions')
        .update({ image_url: null, image_deleted_at: new Date().toISOString() })
        .eq('id', slip.id);
}
```

---

## 7. SQL สำหรับ Reset Admin

> ⚠️ **คำเตือน:** SQL นี้จะลบ users ทั้งหมดในระบบ รันเฉพาะตอน setup ครั้งแรกเท่านั้น  
> ⛔ **ห้าม commit ลง Git** (มีรหัสผ่าน)

```sql
-- ล้างข้อมูลทั้งหมด
DELETE FROM public.sessions;
DELETE FROM public.permissions;
DELETE FROM public.pending_registrations;
DELETE FROM public.users;

-- สร้าง Admin 2 accounts
-- (ต้องเปิดใช้ pgcrypto extension ก่อน)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO public.users (
    id, email, first_name, last_name, role,
    password_hash, is_active, is_approved,
    created_at, updated_at
) VALUES
(
    'USR-ADMIN-001',
    'pongsatorn.b@ppk.ac.th',
    'พงษ์สถาพร',
    'บ.',
    'admin',
    encode(digest('2[yP=u8nv]', 'sha256'), 'hex'),
    true,
    true,
    NOW(),
    NOW()
),
(
    'USR-ADMIN-002',
    'krumum.piano@gmail.com',
    'ครูมั้ม',
    'เปียโน',
    'admin',
    encode(digest('2[yP=u8nv]', 'sha256'), 'hex'),
    true,
    true,
    NOW(),
    NOW()
);

-- ตรวจสอบ
SELECT id, email, first_name, role, is_active FROM public.users;
```

**admin accounts:**
| # | Email | Password |
|---|-------|----------|
| 1 | pongsatorn.b@ppk.ac.th | `2[yP=u8nv]` |
| 2 | krumum.piano@gmail.com | `2[yP=u8nv]` |

---

## 8. LINE Migration SQL

> บันทึกเป็น `supabase/line-migration.sql` แล้วรันใน SQL Editor

```sql
-- เพิ่ม LINE columns ใน residents
ALTER TABLE public.residents 
ADD COLUMN IF NOT EXISTS line_user_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS line_display_name TEXT,
ADD COLUMN IF NOT EXISTS line_picture_url TEXT,
ADD COLUMN IF NOT EXISTS line_linked_at TIMESTAMPTZ;

-- เพิ่ม image_deleted_at ใน slip_submissions
ALTER TABLE public.slip_submissions
ADD COLUMN IF NOT EXISTS image_deleted_at TIMESTAMPTZ DEFAULT NULL;

-- สร้าง line_push_log table
CREATE TABLE IF NOT EXISTS public.line_push_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    line_user_id TEXT NOT NULL,
    message_type TEXT NOT NULL,        -- 'bill_notify' | 'slip_approved' | 'slip_rejected'
    message_text TEXT,
    related_id TEXT,                   -- slip_id หรือ outstanding_id
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    success BOOLEAN DEFAULT true,
    error_message TEXT
);

-- เพิ่ม LINE settings
INSERT INTO public.settings (key, value, description) VALUES
('line_channel_access_token', '', 'LINE Channel Access Token'),
('line_channel_secret', '', 'LINE Channel Secret'),
('line_liff_id', '', 'LINE LIFF App ID'),
('line_push_quota_used', '0', 'จำนวน push ที่ใช้ไปเดือนนี้'),
('line_push_quota_reset_date', '', 'วันที่ reset โควต้า')
ON CONFLICT (key) DO NOTHING;

-- Index
CREATE INDEX IF NOT EXISTS idx_residents_line_user_id ON public.residents(line_user_id);
CREATE INDEX IF NOT EXISTS idx_line_push_log_sent_at ON public.line_push_log(sent_at);
```

---

## 9. ขั้นตอน Deploy ระบบ

### Step-by-Step (เรียงตามลำดับ)

```
1. สร้าง Supabase project ที่ supabase.com
   └─ ชื่อ: home-ppk-2026
   └─ Region: Singapore (ap-southeast-1)
   └─ Password: ตั้งแข็งแกร่ง

2. Copy Project URL + anon key → ใส่ใน supabase/config.js

3. SQL Editor รัน:
   └─ schema.sql  (สร้าง tables)
   └─ rls.sql     (เปิด security)
   └─ line-migration.sql  (LINE columns)
   └─ Admin SQL (ข้อ 7)   (สร้าง admin accounts)

4. Storage → New Bucket
   └─ ชื่อ: slips
   └─ Public: ✅ เปิด
   └─ File size limit: 5MB

5. GitHub:
   └─ push code ทั้งหมด (config.js จะ ignored)
   └─ Settings → Pages → Deploy from main branch

6. LINE Developers Console:
   └─ สร้าง Provider
   └─ สร้าง Messaging API Channel
   └─ สร้าง LIFF App (domain = GitHub Pages URL)
   └─ copy Channel Access Token + Secret

7. Supabase → Settings → ใส่ LINE tokens

8. Deploy Edge Functions:
   └─ supabase functions deploy line-webhook
   └─ supabase functions deploy line-push
   └─ supabase functions deploy cleanup-old-slips

9. LINE → Webhook URL = Edge Function URL

10. Rich Menu:
    └─ ออกแบบรูป 2500×1686px
    └─ upload + กำหนด actions
    └─ set as default

11. ทดสอบ:
    └─ scan QR → เพิ่มเพื่อน
    └─ ลงทะเบียนผ่าน LIFF
    └─ ส่งสลิปทดสอบ
    └─ admin approve → ตรวจสอบ LINE push
```

---

## 10. ประมาณการโควต้าและค่าใช้จ่าย

### Supabase Free Tier
| Resource | Free Limit | การใช้จริง | สถานะ |
|----------|-----------|-----------|-------|
| Database | 500MB | ~50MB (60 ห้อง 3 ปี) | ✅ OK |
| Storage | 1GB | ~27MB/เดือน | ✅ ~3 ปี |
| Edge Functions | 500K req/เดือน | ~200 req/เดือน | ✅ OK |
| Bandwidth | 5GB/เดือน | ~2GB/เดือน | ✅ OK |

### LINE Free Plan
| Resource | Free Limit | การใช้จริง | สถานะ |
|----------|-----------|-----------|-------|
| Push Messages | 200/เดือน | ~95/เดือน (60 ห้อง) | ✅ OK |
| Reply Messages | ไม่จำกัด | ตามที่ผู้พักถาม | ✅ OK |
| LIFF | ฟรี | — | ✅ OK |
| Rich Menu | ฟรี | — | ✅ OK |

### คำนวณ Push Messages
```
60 ห้อง × 1 แจ้งบิล/เดือน = 60 push
+ approve ~25 ห้อง/เดือน = 25 push
+ reject ~10 ห้อง/เดือน = 10 push
                       = 95 push/เดือน (ใช้ 47.5% ของโควต้า 200)
```

### ขนาด Storage Slips
```
60 ห้อง × 1.5 สลิป/เดือน × 300KB = 27MB/เดือน
1GB ÷ 27MB = ~37 เดือน ≈ 3 ปี (ก่อน cleanup เริ่ม cycle)
```

---

## 11. โครงสร้าง DB Tables (สรุป)

| Table | บทบาท |
|-------|-------|
| `users` | ผู้ใช้งานทีมงาน (admin, team) |
| `sessions` | session tokens |
| `residents` | ผู้พักอาศัย + LINE user ID |
| `outstanding` | ยอดค้างชำระรายเดือน |
| `slip_submissions` | สลิปที่ส่งมา + image_url |
| `payment_history` | ประวัติการชำระ |
| `repair_requests` | คำร้องแจ้งซ่อม |
| `housing_requests` | คำร้องขอเข้าพัก |
| `settings` | ตั้งค่าระบบ (LINE tokens, etc.) |
| `line_push_log` | บันทึกการส่ง LINE push |

---

## 12. ไฟล์ที่ยังต้องสร้าง

| ไฟล์ | สถานะ | วิธีสร้าง |
|------|-------|----------|
| `supabase/line-migration.sql` | ❌ ยังไม่มี | ดู Section 8 |
| `supabase/functions/line-webhook/index.ts` | ❌ ยังไม่มี | AI เขียนให้ |
| `supabase/functions/line-push/index.ts` | ❌ ยังไม่มี | AI เขียนให้ |
| `supabase/functions/cleanup-old-slips/index.ts` | ❌ ยังไม่มี | AI เขียนให้ |
| `liff-register.html` | ❌ ยังไม่มี | AI เขียนให้ |
| `liff-dashboard.html` | ❌ ยังไม่มี | AI เขียนให้ |
| `liff-slip.html` | ❌ ยังไม่มี | AI เขียนให้ |
| `liff-history.html` | ❌ ยังไม่มี | AI เขียนให้ |
| `liff-forms.html` | ❌ ยังไม่มี | AI เขียนให้ |

---

## 13. ข้อเสนอแนะปรับปรุง UX

> วิเคราะห์จากโค้ดจริง — เรียงตามความสำคัญและผลกระทบต่อผู้ใช้งาน

---

### 👥 ฝั่งคณะทำงาน

#### 13.1 Dashboard KPI แบบ Real-time (สำคัญสุด)

`team-management.html` ปัจจุบันเป็นแค่ปุ่มเมนู ไม่มีข้อมูลเลย ควรเพิ่ม:

```
┌──────────────────────────────────────────────┐
│  📊 ภาพรวมประจำเดือน มีนาคม 2569             │
│                                              │
│  ✅ ชำระแล้ว    32/60 ห้อง                   │
│  ⏳ รอตรวจสลิป   8 รายการ  [ตรวจเลย →]      │
│  ❌ ยังไม่ชำระ   20 ห้อง                      │
│  📋 คำร้องรอพิจารณา  3 รายการ [ดู →]        │
└──────────────────────────────────────────────┘
```

**ผลลัพธ์:** เปิดหน้าเดียวรู้ทุกอย่าง ไม่ต้องเปิดทีละหน้า  
**วิธีทำ:** query `slip_submissions` + `outstanding` + `requests` ตอน load หน้า

---

#### 13.2 Badge จำนวนงานค้างบน Sidebar

ปุ่มเมนูใน `ppk-nav.js` ควรแสดงจำนวน:
- `🧾 ตรวจสลิป (8)` — นับจาก `slip_submissions` where status='pending'
- `📋 ตรวจคำร้อง (3)` — นับจาก `requests` where status='pending'

**ผลลัพธ์:** เห็นงานค้างทุกครั้งที่ใช้งาน โดยไม่ต้องคลิกเข้าไปดู

---

#### 13.3 Workflow Checklist ประจำเดือน

ระบบไม่ได้ guide ขั้นตอน ทีมงานอาจลืมหรือทำผิดลำดับ ควรแสดง:

| ขั้น | งาน | สถานะ | วันที่ทำ |
|-----|-----|--------|--------|
| 1 | บันทึกมิเตอร์น้ำ | ✅ เสร็จ | 10 มี.ค. |
| 2 | บันทึกมิเตอร์ไฟ | ✅ เสร็จ | 10 มี.ค. |
| 3 | แจ้งยอดชำระ | ⏳ รอดำเนินการ | — |
| 4 | ตรวจสลิป | — | — |
| 5 | เบิกยอดประจำเดือน | — | — |

**กันลืม กันข้ามขั้นตอน** — บันทึกสถานะลงใน `settings` table

---

#### 13.4 ปรับปรุง check-slip.html

ปัจจุบัน: โหลดสลิปทุกรายการมาพร้อมกัน ไม่มี filter  
ควรเพิ่ม:
- **จำนวนรอตรวจ** แสดงตัวใหญ่ด้านบนสุด
- **Filter tab:** รอตรวจ | อนุมัติแล้ว | ปฏิเสธ
- **Filter เดือน:** เลือกดูย้อนหลังได้
- แสดง `🗑️ รูปถูกลบแล้ว (เก็บเกิน 2 ปี)` เมื่อ `image_deleted_at IS NOT NULL`

---

#### 13.5 Export ข้อมูลเป็น Excel/CSV

ปัจจุบันบันทึกได้แค่รูปภาพ ควรเพิ่มปุ่ม **📥 ดาวน์โหลด Excel** ใน:

| หน้า | ข้อมูลที่ export |
|------|----------------|
| payment-notification.html | ตารางยอดชำระทุกห้อง |
| accounting.html | บัญชีรายรับรายจ่าย |
| monthly-withdraw.html | ยอดเบิกประจำเดือน |
| check-slip.html | รายงานสถานะการชำระ |

ใช้ library **SheetJS (xlsx.js)** ฟรี ไม่ต้อง backend ไม่ต้อง server

---

#### 13.6 Global Search

ค้นหาข้ามหน้าได้ทันทีจาก nav bar — รองรับ:
- เลขห้อง / ชื่อผู้พัก
- รหัสคำร้อง
- ประวัติการชำระ

**วิธีทำ:** Supabase Full-text search หรือ ilike query

---

### 🏠 ฝั่งผู้พักอาศัย

#### 13.7 Redesign dashboard.html

ปัจจุบัน: ผู้พักต้องกดเข้าหลายหน้าเพื่อดูข้อมูลสำคัญ  
ควรแสดงในหน้าแรกทันที:

```
┌────────────────────────────────┐
│  🏠 ห้อง 101 | นายสมชาย       │
├────────────────────────────────┤
│  💰 ยอดค้างชำระเดือนนี้         │
│     1,250 บาท (ครบ 25 มี.ค.)  │
│                                │
│  [📎 ส่งสลิปเดี๋ยวนี้]          │
├────────────────────────────────┤
│  📤 สลิปล่าสุด: รอตรวจ ⏳      │
│  ส่งเมื่อ: 20 มี.ค. 13:45     │
├────────────────────────────────┤
│  📋 ประกาศ (2 ใหม่)            │
└────────────────────────────────┘
```

---

#### 13.8 Timeline ติดตามสถานะสลิป

ใน `payment-history.html` แสดงแบบ Timeline แทนตาราง status:

```
📎 ส่งสลิปแล้ว    ✅  20 มี.ค. 13:45
👁️ กำลังตรวจสอบ  ⏳  รอดำเนินการ
✅ อนุมัติแล้ว   —
```

**ผู้พักไม่ต้องถามทีมงานว่า "สลิปตรวจแล้วยัง"**

---

#### 13.9 ปรับปรุง upload-slip.html

- **Drag & Drop** ลากรูปมาวางได้เลย
- **Preview รูป** ก่อนกดส่ง
- **Auto-compress** รูปใหญ่กว่า 1MB อัตโนมัติ (ใช้ Canvas)
- **ตรวจซ้ำ** ถ้าส่งสลิปเดือนนี้ไปแล้ว → แสดง warning ชัดเจน
- **Progress bar** ระหว่าง upload แทน spinner ธรรมดา

---

#### 13.10 กราฟยอดรายเดือน

ใน `payment-history.html` เพิ่ม:
- **Bar chart** ยอดค่าน้ำ-ค่าไฟ 12 เดือนย้อนหลัง (Chart.js ฟรี)
- **สรุปยอดรวมปีนี้** + เปรียบกับปีที่แล้ว
- ปุ่ม **พิมพ์/ดาวน์โหลด PDF** ประวัติส่วนตัว

---

### 🔧 UX ทั่วไป

#### 13.11 Toast Notification แทน alert()

ทุกหน้าตอนนี้ใช้ `alert()` → blocking, ต้องกด OK  
ควรเปลี่ยนเป็น Toast ที่หายเองใน 3 วินาที:

```javascript
// เพิ่มใน ppk-utils.js
function showToast(message, type = 'success') {
    // type: 'success' | 'error' | 'warning' | 'info'
    // แสดงมุมล่างขวา หายเองใน 3 วินาที
}
```

---

#### 13.12 Loading & Error States

ทุกหน้าควรมี:
- **Skeleton screen** ระหว่างโหลดข้อมูล (แทน spinner เปล่าๆ)
- **Error message ชัดเจน** เช่น "ไม่สามารถโหลดข้อมูลได้" + ปุ่ม 🔄 ลองใหม่
- ไม่ให้หน้าว่างเปล่าโดยไม่มีคำอธิบาย

---

#### 13.13 Session Warning ก่อนหมด

ปัจจุบัน: session หมด → redirect login โดยไม่บอก → ข้อมูลที่กรอกหาย  
ควรเพิ่มใน `ppk-app.js`:
- ตรวจสอบเวลาหมด session ทุก 1 นาที
- แจ้งเตือน 5 นาทีล่วงหน้า: "⚠️ Session จะหมดใน 5 นาที"
- ปุ่ม **"ต่อเวลา"** (call backend renew session)

---

#### 13.14 Mobile-First Responsive

ผู้พักอาศัยใช้มือถือเป็นหลัก — ตรวจสอบให้รองรับหน้าจอ 375px:
- ตารางใน `payment-notification.html` → scroll แนวนอนได้
- form ใน `upload-slip.html` → ปุ่มใหญ่ พิมพ์ง่าย
- ปุ่มทุกปุ่ม → สูงอย่างน้อย 48px (touch target)

---

### 📊 สรุปลำดับข้อเสนอแนะ UX ตามความสำคัญ

| ลำดับ | ข้อ | งาน | ผลกระทบ | ความยาก |
|-------|-----|-----|---------|--------|
| 1 | 13.1 | Dashboard KPI ทีมงาน | สูงมาก | ปานกลาง |
| 2 | 13.7 | Dashboard ผู้พักอาศัย ใหม่ | สูงมาก | ปานกลาง |
| 3 | 13.2 | Badge งานค้างบน Nav | สูง | ง่าย |
| 4 | 13.9 | Upload Slip — preview + drag&drop + ตรวจซ้ำ | สูง | ง่าย |
| 5 | 13.3 | Workflow checklist ประจำเดือน | สูง | ปานกลาง |
| 6 | 13.11 | Toast แทน alert() | กลาง | ง่ายมาก |
| 7 | 13.12 | Loading & Error states | กลาง | ง่าย |
| 8 | 13.4 | Filter + ปรับ check-slip.html | กลาง | ปานกลาง |
| 9 | 13.8 | Timeline ติดตามสลิป | กลาง | ปานกลาง |
| 10 | 13.5 | Export Excel (SheetJS) | กลาง | ง่าย |
| 11 | 13.13 | Session warning ก่อนหมด | กลาง | ปานกลาง |
| 12 | 13.14 | Mobile responsive | กลาง | ปานกลาง |
| 13 | 13.10 | กราฟยอดรายเดือน | ต่ำ | ง่าย |
| 14 | 13.6 | Global search | ต่ำ | ยาก |

> งาน UX ส่วนใหญ่ (ข้อ 1-10) สามารถให้ AI เขียนโค้ดให้ได้ทั้งหมด

---

## 14. ระบบแจ้งเตือน LINE (เพิ่มเติม — อนุมัติแล้ว)

> ผู้พักอาศัยที่แอดเพื่อน LINE OA แล้วจะได้รับข้อความอัตโนมัติตาม events ต่อไปนี้  
> ทั้งหมดใช้ **Push Message** (หักโควต้า 200/เดือน) ยกเว้น reply ที่ฟรีไม่จำกัด

---

### 14.1 แจ้งยอดชำระประจำเดือน (Bill Notification)

**ทริกเกอร์:** ทีมงานกด "ส่ง LINE แจ้งบิล" บนหน้า `payment-notification.html`  
**ผู้รับ:** ผู้พักทุกห้องที่มี `line_user_id` บันทึกในระบบ  
**รูปแบบข้อความ:**

```
📋 แจ้งยอดค่าน้ำ-ไฟ เดือน {เดือน/ปี}
ห้อง {เลขห้อง} — {ชื่อผู้พัก}

💧 ค่าน้ำ       {หน่วย} หน่วย = {ยอด} บาท
⚡ ค่าไฟ        {หน่วย} หน่วย = {ยอด} บาท
🏢 ค่าส่วนกลาง                = {ยอด} บาท
─────────────────────────
💰 รวมทั้งสิ้น               = {ยอดรวม} บาท

📅 กรุณาชำระภายในวันที่ {วันสุดท้าย}
📎 ส่งสลิปผ่าน LINE ได้เลย → [ส่งสลิป]
```

**ปุ่ม Quick Reply:** `[📎 ส่งสลิปเดี๋ยวนี้]` → เปิด `liff-slip.html`

---

### 14.2 ทวงชำระ — แอดมินกดเองรายห้อง (Manual Reminder)

**ทริกเกอร์:** แอดมินกดปุ่ม **📲 ทวง LINE** เฉพาะห้องที่ต้องการใน `check-slip.html`  
**เหตุผล:** ส่วนใหญ่ค้างจ่ายจริงแค่ 5-10 ห้อง แอดมินรู้บริบทแต่ละห้องดีกว่าระบบ ประหยัดโควต้าได้มาก

**เงื่อนไข:** กดได้เฉพาะห้องที่ `outstanding` = `unpaid` และยังไม่มีสลิป หรือสลิปถูกปฏิเสธ

**UI ใน check-slip.html (แต่ละแถวห้อง):**

```
┌────────────────────────────────────────────────────────┐
│  ห้อง 205 — นายสมชาย ใจดี                              │
│  ยอดค้าง: 1,250 บาท | สถานะ: ยังไม่มีสลิป             │
│  📲 ทวงล่าสุด: 18 มี.ค. 10:30 (ทวงไปแล้ว 1 ครั้ง)   │
│                                                        │
│  [✅ อนุมัติ]  [❌ ปฏิเสธ]  [📲 ทวง LINE]              │
│                                                        │
│  💬 โควต้าคงเหลือ: 145/200 ข้อความ (เหลือ 55)         │
└────────────────────────────────────────────────────────┘
```

**หลักการแสดงโควต้า:**
- แสดง **โควต้าคงเหลือสด** ทุกแถวที่มีปุ่ม "📲 ทวง LINE"
- สีเปลี่ยนตามระดับ: 🟢 >100 | 🟡 30-100 | 🔴 <30
- เมื่อโควต้าหมด → ปุ่มกลายเป็น disabled + tooltip "โควต้าหมดแล้ว"
- **หลัง push สำเร็จ → อัปเดตตัวเลขทันทีโดยไม่ต้อง reload หน้า**

**รูปแบบข้อความทวง:**
```
⏰ แจ้งเตือนการชำระเงิน
ห้อง {เลขห้อง} — {ชื่อผู้พัก}

ยังไม่พบสลิปการชำระค่าน้ำ-ไฟ เดือน {เดือน/ปี}
💰 ยอดที่ต้องชำระ: {ยอดรวม} บาท
📅 ครบกำหนด: {วันสุดท้าย}

กรุณาชำระและส่งสลิปหลักฐาน
📎 [ส่งสลิปเดี๋ยวนี้]
```

**รูปแบบข้อความ (กรณีสลิปถูกปฏิเสธ — ต้องส่งใหม่):**
```
❌ สลิปการชำระเงินไม่ผ่านการตรวจสอบ
ห้อง {เลขห้อง} — เดือน {เดือน/ปี}

เหตุผล: {reason}

กรุณาส่งสลิปใหม่ที่ถูกต้อง
📎 [ส่งสลิปใหม่]
```

**บันทึก log:** ทุกครั้งที่กดทวง → บันทึกใน `line_push_log` พร้อม timestamp  
แอดมินเห็นว่า "ทวงไปแล้ว X ครั้ง ล่าสุดวันที่..." ป้องกันทวงซ้ำถี่เกินไป

---

### 14.3 ประกาศจากแอดมิน (Admin Broadcast)

**ทริกเกอร์:** แอดมินพิมพ์ข้อความในหน้า `admin-settings.html` → Tab LINE → กด "ส่งประกาศ"  
**ผู้รับ:** เลือกได้:
- ✅ ส่งทุกห้อง (ทุก `line_user_id` ที่ active)
- ✅ ส่งเฉพาะห้องที่ยังไม่ชำระ
- ✅ ส่งเฉพาะผู้พักในอาคารที่เลือก (บ้านพัก / แฟลต)
- ✅ ส่งเฉพาะห้องที่ระบุ (พิมพ์เลขห้อง)

**UI ที่ต้องเพิ่มใน admin-settings.html (Tab LINE):**

```
┌────────────────────────────────────────────┐
│  📢 ส่งประกาศ / ข้อความ ผ่าน LINE         │
├────────────────────────────────────────────┤
│  ผู้รับ: ○ ทุกห้อง  ○ ยังไม่ชำระ         │
│           ○ บ้านพัก  ○ แฟลต  ○ ระบุห้อง   │
│  ห้อง: [________________] (ถ้าเลือกระบุ)   │
│                                            │
│  ข้อความ:                                  │
│  ┌──────────────────────────────────────┐  │
│  │                                      │  │
│  │  พิมพ์ข้อความประกาศที่นี่...         │  │
│  │                                      │  │
│  └──────────────────────────────────────┘  │
│  (รองรับ emoji ✅❌⚠️📢)                  │
│                                            │
│  โควต้าที่ใช้ไปเดือนนี้: 47/200 ข้อความ   │
│  คาดว่าจะใช้ครั้งนี้: ~60 ข้อความ         │
│  จะเหลือ: ~93 ข้อความ                     │
│                                            │
│  [ดูตัวอย่าง]  [📤 ส่งประกาศ]             │
└────────────────────────────────────────────┘
```

**รูปแบบข้อความ broadcast:**
```
📢 ประกาศจากงานบ้านพักครู
โรงเรียนพะเยาพิทยาคม

{ข้อความที่แอดมินพิมพ์}

— งานส่งเสริม กำกับ ดูแล และพัฒนาบ้านพักครู
```

---

### 14.4 แจ้งผลอนุมัติสลิป (Slip Result Notification)

**ทริกเกอร์:** ทีมงานกด Approve หรือ Reject ใน `check-slip.html`  
**ผู้รับ:** ผู้พักเฉพาะห้องนั้น

**อนุมัติ:**
```
✅ ยืนยันการชำระเงิน
ห้อง {เลขห้อง} — เดือน {เดือน/ปี}

รับสลิปการชำระเงิน {ยอด} บาท เรียบร้อยแล้ว
ขอบคุณที่ชำระตรงเวลา 🙏
```

**ปฏิเสธ:**
```
❌ ไม่สามารถยืนยันสลิปได้
ห้อง {เลขห้อง} — เดือน {เดือน/ปี}

เหตุผล: {reason ที่ทีมงานระบุ}

กรุณาตรวจสอบและส่งสลิปใหม่
📎 [ส่งสลิปใหม่]
```

---

### 14.5 สรุปโควต้า Push Message (อัปเดตตามการออกแบบจริง)

| Event | วิธีส่ง | ครั้งต่อเดือน | จำนวน push |
|-------|--------|-------------|-----------|
| แจ้งบิลประจำเดือน | Push (ทีมงานกด) | 1 ครั้ง × 60 ห้อง | **60 push** |
| ทวงชำระ | Push (แอดมินกดเองรายห้อง) | ~5-10 ห้อง × ไม่จำกัดครั้ง | **~20 push** |
| รับสลิป (ยืนยัน) | Reply ฟรี (ผู้พักส่งมาก่อน) | ไม่จำกัด | **0 push** |
| อนุมัติสลิป | Reply ฟรี | ~50 ห้อง | **0 push** |
| ปฏิเสธสลิป | Push (หลัง reject) | ~5 ห้อง | **5 push** |
| ประกาศแอดมิน | LINE OA Post (ฟรี) | ไม่จำกัด | **0 push** |
| **รวมทั้งเดือน** | | | **~85/200 push** ✅ |

> ✅ **อยู่ใน Free Plan อย่างสบาย** — เหลือสำรองอีก 115 push/เดือน  
> 💡 **กุญแจสำคัญ:** อนุมัติสลิปใช้ Reply (ฟรี) ไม่ใช่ Push, ประกาศใช้ LINE OA Post (ฟรี)

---

### 14.6 ระบบแสดงโควต้า LINE — มองเห็นได้จากทุกจุด

โควต้าต้องแสดงให้เห็น **ทุกที่ที่มีปุ่มส่ง LINE** ไม่ใช่แค่หน้า settings:

**📍 จุดที่แสดงโควต้า:**

| หน้า | ตำแหน่ง | รายละเอียด |
|------|---------|----------|
| `check-slip.html` | ทุกแถวห้องที่มีปุ่ม ทวง | `💬 เหลือ 145/200` |
| `payment-notification.html` | บนปุ่ม "ส่ง LINE แจ้งบิล" | `📲 ส่ง LINE แจ้งบิล (60 ห้อง) — จะใช้ 60/145 ที่เหลือ` |
| `admin-settings.html` Tab LINE | Widget โควต้า | Progress bar + ประวัติ |

**Widget ใน admin-settings.html Tab LINE:**

```
📊 โควต้า LINE Push เดือนนี้
████████░░░░░░░░░░░░  85/200 ข้อความ (42.5%)

✅ เหลือ 115 ข้อความ — ปกติ
รีเซ็ตวันที่: 1 เมษายน 2569

[📋 ดูประวัติการส่ง LINE]
```

**Widget บนปุ่มแจ้งบิลใน payment-notification.html:**

```
┌──────────────────────────────────────────┐
│  📲 ส่ง LINE แจ้งบิลทุกห้อง             │
│  จะใช้โควต้า: ~60 ข้อความ               │
│  โควต้าคงเหลือ: 115/200 ✅              │
│  หลังส่ง: จะเหลือ ~55 ข้อความ           │
│                  [📤 ส่งเลย]             │
└──────────────────────────────────────────┘
```

**สีโควต้าตามระดับ:**
- 🟢 เขียว: เหลือ >100 — ปกติ
- 🟡 เหลือง: เหลือ 30–100 — ระวัง
- 🔴 แดง: เหลือ <30 — ใช้อย่างประหยัด
- ⛔ เทา: โควต้าหมด — ปุ่ม disabled ทั้งหมด

**DB Fields ที่ใช้ (settings table):**
```sql
line_push_quota_used       -- จำนวนที่ใช้ไปเดือนนี้ (update ทุกครั้งที่ส่งสำเร็จ)
line_push_quota_limit      -- ค่า default = 200
line_push_quota_reset_date -- วันที่ 1 ของเดือนถัดไป
```

**Logic reset โควต้า:** Edge Function `line-push` ตรวจทุกครั้ง — ถ้าเดือนเปลี่ยน reset `line_push_quota_used = 0` อัตโนมัติ

---

### 14.7 งานที่ต้องเพิ่มใน Master Priority List

งานต่อไปนี้ให้เพิ่มใน **Phase G (LINE Integration)**:

| งาน | ไฟล์ | หมายเหตุ |
|-----|------|----------|
| G15 | Edge Function `line-bill-notify` | ส่งยอดบิลพร้อมปุ่ม Quick Reply |
| G16 | Edge Function `line-reminder` | ทวงอัตโนมัติ + บันทึกครั้งที่ส่ง |
| G17 | Edge Function `line-broadcast` | ส่งประกาศแอดมิน (เลือกกลุ่มได้) |
| G18 | เพิ่ม "ส่ง LINE แจ้งบิล" บน payment-notification.html | พร้อม quota counter |
| G19 | เพิ่ม "ทวงรายห้อง" และ "ทวงทั้งหมด" บน check-slip.html | ตรวจสอบซ้ำก่อนส่ง |
| G20 | เพิ่ม Tab LINE Broadcast ใน admin-settings.html | เลือกกลุ่ม + quota meter |
| G21 | เพิ่ม Cron schedule ตั้งเวลาทวงอัตโนมัติ | ตั้งค่าวันที่ใน settings |
| G22 | Line push หลัง approve/reject สลิป | ใน check-slip.html |

---

*บันทึกโดย AI Copilot | 2 มีนาคม 2569 | อัปเดต: เพิ่ม Master Priority List 45 งาน + ข้อเสนอแนะ UX 14 ข้อ + ระบบแจ้งเตือน LINE Section 14*
