# 📋 สถานะโครงการ HOME PPK 2026

**บันทึก:** 2 มีนาคม 2569 (2026)  
**เวอร์ชัน:** หลัง Migration จาก Google Apps Script → Supabase  

---

## 📑 สารบัญ

1. [สถาปัตยกรรมระบบปัจจุบัน](#1-สถาปัตยกรรมระบบปัจจุบัน)
2. [สิ่งที่ทำเสร็จแล้ว](#2-สิ่งที่ทำเสร็จแล้ว)
3. [**Master Priority List — ลำดับงานทั้งหมด**](#3-master-priority-list)
4. [Bug ที่พบและยังไม่ได้แก้](#4-bug-ที่พบและยังไม่ได้แก้)
6. [แผน Auto-Delete Slip Images](#6-แผน-auto-delete-slip-images)
7. [SQL สำหรับ Reset Admin](#7-sql-สำหรับ-reset-admin)
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
│  │ ทีมงาน (Web)                               │
│  └──────┬───────┘                                 │
└─────────┼─────────────────────────────────────────┘
          │ HTTPS
          ▼
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

```

### เทคโนโลยี
| Component | Technology | Cost |
||-|------|
| Frontend (ทีมงาน) | HTML/CSS/JS บน GitHub Pages | ฟรี |
| Database | Supabase PostgreSQL | ฟรี (500MB) |
| Edge Functions | Supabase Deno Functions | ฟรี (500K req/เดือน) |
| File Storage | Supabase Storage | ฟรี (1GB) |
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
- แผน auto-delete slip images อายุ >2 ปี (แต่เก็บ DB records ตลอดกาล)

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
|---|-----|------||
| 7 | แก้ `imageUrl: null` bug | upload-slip.html | 🔴 Critical |
| 8 | เพิ่ม missing ppk-api.js actions | ppk-api.js | 🟡 High |
| 9 | Push GitHub → เปิด GitHub Pages | GitHub | 🟡 High |

### Phase 3: UX Improvements + Admin (AI เขียนให้ได้)

| # | งาน | ไฟล์ |
|---|------|------|
| 10 | Dashboard KPI Real-time | team-management.html |
| 11 | Badge จำนวนงานค้างบน Sidebar | ppk-nav.js |
| 12 | Toast Notification แทน alert() | ppk-utils.js |
| 13 | Loading & Error States | ทุกหน้า |
| 14 | Export Excel (SheetJS) | accounting, payment-notification |
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
|--------|-------|---|
| `loadAccountingData` | accounting.html | query `outstanding` + `payment_history` |
| `calculateAutoEntries` | accounting.html | คำนวณยอดสรุปบัญชี |
| `saveAccounting` | accounting.html | insert `accounting_entries` |
| `resetPassword` | forgot-password.html | update `users.password_hash` |
| `findEmail` | forgot-email.html | query `users` by `id_card` |

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
   └─ Admin SQL (ข้อ 7)   (สร้าง admin accounts)

4. Storage → New Bucket
   └─ ชื่อ: slips
   └─ Public: ✅ เปิด
   └─ File size limit: 5MB

5. GitHub:
   └─ push code ทั้งหมด (config.js จะ ignored)
   └─ Settings → Pages → Deploy from main branch



8. Deploy Edge Functions:
   └─ supabase functions deploy cleanup-old-slips



11. ทดสอบ:
    └─ scan QR → เพิ่มเพื่อน
    └─ ส่งสลิปทดสอบ
```

---

## 10. ประมาณการโควต้าและค่าใช้จ่าย

### Supabase Free Tier
| Resource | Free Limit | การใช้จริง | สถานะ |
|----------|||-------|
| Database | 500MB | ~50MB (60 ห้อง 3 ปี) | ✅ OK |
| Storage | 1GB | ~27MB/เดือน | ✅ ~3 ปี |
| Edge Functions | 500K req/เดือน | ~200 req/เดือน | ✅ OK |
| Bandwidth | 5GB/เดือน | ~2GB/เดือน | ✅ OK |

||
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
| `residents` | ผู้พักอาศัย |
| `outstanding` | ยอดค้างชำระรายเดือน |
| `slip_submissions` | สลิปที่ส่งมา + image_url |
| `payment_history` | ประวัติการชำระ |
| `repair_requests` | คำร้องแจ้งซ่อม |
| `housing_requests` | คำร้องขอเข้าพัก |
| `settings` | ตั้งค่าระบบ |

---

## 12. ไฟล์ที่ยังต้องสร้าง

| ไฟล์ | สถานะ | วิธีสร้าง |
|------|-------|----------|
| `supabase/functions/cleanup-old-slips/index.ts` | ❌ ยังไม่มี | AI เขียนให้ |

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
|------|-----|
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

