# Backend Readiness Analysis — HOME PPK 2026
## วิเคราะห์ความพร้อมของ Frontend HTML ทั้ง 22 ไฟล์ สำหรับเชื่อมต่อ Google Sheets Backend

> **วันที่วิเคราะห์:** $(date)  
> **ระบบ:** HOME PPK 2026 — ระบบบริหารจัดการบ้านพักครู โรงเรียนพะเยาพิทยาคม  
> **Backend เป้าหมาย:** Google Sheets API + Google Drive (via Google Apps Script)  
> **สถานะปัจจุบัน:** ทุกไฟล์ใช้ localStorage เท่านั้น — ยังไม่มี Backend จริง

---

## สรุปภาพรวม

| สถานะ | จำนวน | ไฟล์ |
|--------|--------|------|
| ✅ READY | 1 | form.html |
| ⚠️ NEEDS_FIX | 13 | dashboard, settings, record-water, record-electric, payment-notification, upload-slip, check-slip, payment-history, monthly-withdraw, accounting, admin-settings, check-request, regulations |
| ❌ MISSING_HANDLER | 8 | login, register, forgot-password, forgot-email, request-form, transfer-form, return-form, repair-form |

### Critical Issues Summary

| ปัญหา | ระดับ | ไฟล์ที่เกี่ยวข้อง |
|--------|--------|-------------------|
| **localStorage key ไม่ตรงกัน** | 🔴 Critical | dashboard, upload-slip, check-slip, admin-settings |
| **ข้อมูล Hardcoded/Mock** | 🔴 Critical | payment-notification, payment-history, record-water, record-electric, check-request |
| **ไม่มี submit handler** | 🔴 Critical | login, register, forgot-password, forgot-email, request-form, transfer-form, return-form, repair-form |
| **Base64 ใน localStorage** | 🟡 Major | settings (photo), upload-slip (slips), accounting (evidence), regulations (PDF), admin-settings (PDF) |
| **Email ยังไม่ทำงาน** | 🟡 Major | check-slip |
| **ไม่มี Authentication** | 🔴 Critical | login ไม่ได้ set session; currentUser ไม่เคยถูกเซ็ต |

---

## รายละเอียดแต่ละไฟล์

---

### 1. `login.html` (~149 lines) — ❌ MISSING_HANDLER

**Purpose:** หน้า Login เข้าสู่ระบบ

**Data Fields:**
- `email` (input)
- `password` (input)

**localStorage:** ไม่มี READ/WRITE ใดๆ

**Submit Action:**
- `validateForm()` — ตรวจ format อีเมลและความยาว password เท่านั้น
- ไม่มีการ authenticate จริง, ไม่มี redirect, ไม่มี session storage

**Google Sheets Needed:**
| Sheet | Columns | Operation |
|-------|---------|-----------|
| `[MAIN] Users` | email, password_hash, is_active | READ (authenticate) |
| `[MAIN] Residents` | id, prefix, firstname, lastname | READ (get user info) |

**Issues:**
1. ❌ `validateForm()` always returns after showing alert — never actually logs in
2. ❌ ไม่มี `currentUser` / `userData` session storage
3. ❌ ต้อง set `currentUser`, `userData`, `currentUserUnit` ใน localStorage/session เมื่อ login สำเร็จ
4. ❌ ต้องเพิ่ม API call สำหรับ authentication

---

### 2. `register.html` (~230 lines) — ❌ MISSING_HANDLER

**Purpose:** หน้าสมัครสมาชิก

**Data Fields:**
- `email`, `phone`, `prefix`, `firstname`, `lastname`, `position`
- `province`, `district`, `subdistrict`, `zipcode`
- `password`, `confirmPassword`, `pdpaConsent` (checkbox)

**localStorage:** ไม่มี READ/WRITE ใดๆ

**Submit Action:**
- `validateRegister()` — always `return false` (never submits)

**Google Sheets Needed:**
| Sheet | Columns | Operation |
|-------|---------|-----------|
| `[MAIN] Users` | email, password_hash, resident_id, role, is_active | WRITE (new user) |
| `[MAIN] Residents` | all personal fields | WRITE (new resident) |

**Issues:**
1. ❌ `validateRegister()` always returns false — form never submits
2. ❌ ต้องเพิ่ม API call สำหรับ registration
3. ❌ ต้องตรวจ email ซ้ำจาก Backend

---

### 3. `forgot-password.html` (~120 lines) — ❌ MISSING_HANDLER

**Purpose:** รีเซ็ตรหัสผ่านผ่านอีเมล

**Data Fields:** `email`

**Submit Action:** แสดง alert เท่านั้น — ไม่ส่งอีเมลจริง

**Google Sheets Needed:**
| Sheet | Columns | Operation |
|-------|---------|-----------|
| `[MAIN] Users` | email, password_hash | READ (verify email), WRITE (reset password) |

**Issues:**
1. ❌ ไม่มี backend API call
2. ❌ ต้องสร้าง reset token + ส่ง email ผ่าน Google Apps Script MailApp

---

### 4. `forgot-email.html` (~120 lines) — ❌ MISSING_HANDLER

**Purpose:** กู้อีเมลจากเบอร์โทร

**Data Fields:** `phone`

**Submit Action:** แสดง alert เท่านั้น

**Google Sheets Needed:**
| Sheet | Columns | Operation |
|-------|---------|-----------|
| `[MAIN] Residents` | phone, email | READ (lookup by phone) |

**Issues:**
1. ❌ ไม่มี backend API call

---

### 5. `dashboard.html` (~230 lines) — ⚠️ NEEDS_FIX

**Purpose:** หน้าหลัก Dashboard แสดงข้อมูลสรุป

**localStorage READS:**
| Key | Data |
|-----|------|
| `announcements` | ข้อความประกาศ |
| `currentUser` | ข้อมูลผู้ใช้ปัจจุบัน |
| `waterBill_{yearmonth}` | ข้อมูลค่าน้ำ |
| `electricBill_{yearmonth}` | ข้อมูลค่าไฟ |
| `commonFee` | ค่าส่วนกลาง |
| `paymentHistory_{houseNumber}` | ประวัติการชำระ |

**Google Sheets Needed:**
| Sheet | Columns | Operation |
|-------|---------|-----------|
| `[MAIN] Announcements` | text, priority, expiry_date, is_active | READ |
| `[BILLS] WaterBills` | house_number, amount (current month) | READ |
| `[BILLS] ElectricBills` | house_number, amount (current month) | READ |
| `[BILLS] CommonFee` | type, amount | READ |
| `[PAYMENTS] PaymentHistory` | house_number, all fields | READ |

**Issues:**
1. 🔴 `commonFee` อ่านเป็น key เดี่ยว แต่ admin-settings เขียนเป็น `adminSettings_commonFee` (object with house/flat)
2. 🔴 `currentUser` ไม่เคยถูก set เพราะ login ไม่ทำงาน
3. ⚠️ `paymentHistory_{houseNumber}` — payment-history.html ไม่มีการเขียน key นี้ (hardcoded HTML)

---

### 6. `settings.html` (1377 lines) — ⚠️ NEEDS_FIX

**Purpose:** ตั้งค่าโปรไฟล์ผู้ใช้

**Data Fields:**
- Profile photo (base64), prefix, firstname, lastname, position
- Full address (province, district, subdistrict, zipcode)
- Housing info (house_number, move_in_date, co-residents list)
- Password change (current, new, confirm)

**localStorage:**
| Key | Operation | Data |
|-----|-----------|------|
| `userData` | READ/WRITE | All profile data + profilePhoto (base64) |
| `allUsers` | READ | For checking co-resident validation |
| `pendingStaffList` | WRITE | New staff member requests |

**Google Sheets Needed:**
| Sheet | Columns | Operation |
|-------|---------|-----------|
| `[MAIN] Residents` | all personal fields | READ/WRITE |
| `[MAIN] Users` | password_hash | WRITE (password change) |

**Google Drive Needed:**
| Folder | File Type | Purpose |
|--------|-----------|---------|
| `Profile Photos/` | JPEG/PNG (<500KB) | Profile photo upload |

**Issues:**
1. 🟡 Profile photo stored as base64 in localStorage — needs Google Drive upload
2. ⚠️ `allUsers` never populated by any page
3. ⚠️ `pendingStaffList` not consumed by any admin page
4. ⚠️ Password stored by btoa() in admin-settings (not secure)

---

### 7. `team-management.html` (~280 lines) — ⚠️ NEEDS_FIX

**Purpose:** หน้าหลักจัดการทีม (hub linking to sub-pages)

**localStorage READS:** `noTeamAccess`

**Submit Action:** None — navigation hub only

**Issues:**
1. ⚠️ `noTeamAccess` is a basic boolean check — needs proper permission system from `[MAIN] Permissions`

---

### 8. `record-water.html` (846 lines) — ⚠️ NEEDS_FIX

**Purpose:** บันทึกค่ามิเตอร์น้ำรายเดือน (Admin)

**Data Fields:**
- `bill_month`, `bill_year`, `water_rate`
- Per-house: `prev_meter`, `curr_meter` → auto-calculate `units`, `amount`

**localStorage:**
| Key | Operation | Data |
|-----|-----------|------|
| `residentsData` | READ | รายชื่อผู้พักอาศัย |
| `waterBill_{prevKey}` | READ | ค่ามิเตอร์เดือนก่อน (auto-fill prev_meter) |
| `waterRate` | READ | อัตราค่าน้ำ |
| `adminSettings_system` | READ | ชื่อผู้บันทึก/ผู้ตรวจสอบ |
| `waterBill_{year}{month}` | WRITE | บันทึกค่าน้ำ |
| `residentsData` | WRITE | อัปเดตข้อมูลผู้อยู่ |

**Google Sheets Needed:**
| Sheet | Columns | Operation |
|-------|---------|-----------|
| `[MAIN] Residents` | house_number, prefix, firstname, lastname | READ |
| `[BILLS] WaterBills` | all columns | READ (prev month) / WRITE (current) |
| `[MAIN] Settings` | water_rate | READ |

**Issues:**
1. 🔴 **5 hardcoded fallback residents** ถ้า `residentsData` ว่าง (สมชาย ใจดี, สมหญิง รักเรียน, etc.)
2. ⚠️ `waterRate` read from standalone key, should come from `adminSettings_water.rate`
3. ⚠️ Writes residentsData directly (should be separate update)

---

### 9. `record-electric.html` (878 lines) — ⚠️ NEEDS_FIX

**Purpose:** บันทึกค่าไฟรายเดือน (Admin)

**Data Fields:**
- `bill_month`, `bill_year`, `pea_total` (ยอดรวม กฟภ.)
- `lost_house`, `lost_flat` (ค่าสูญเสีย)
- Per-house: `electric_amount` (ยอดค่าไฟ)

**localStorage:**
| Key | Operation | Data |
|-----|-----------|------|
| `residentsData` | READ | รายชื่อผู้พักอาศัย |
| `electricBill_{year}{month}` | READ/WRITE | ข้อมูลค่าไฟ |

**Google Sheets Needed:**
| Sheet | Columns | Operation |
|-------|---------|-----------|
| `[MAIN] Residents` | house_number, prefix, firstname, lastname | READ |
| `[BILLS] ElectricBills` | all columns | READ/WRITE |

**Issues:**
1. 🔴 **Same 5 hardcoded fallback residents** as record-water
2. ⚠️ Electric calculation method not configurable from this page (hardcoded "bill" method)

---

### 10. `payment-notification.html` — ⚠️ NEEDS_FIX

**Purpose:** สร้างตารางแจ้งยอดค่าใช้จ่าย (export PNG via html2canvas)

**localStorage READS:**
| Key | Data |
|-----|------|
| `due_date_working_days` | วัน due date |
| `commonFee` | ค่าส่วนกลาง |

**External Library:** html2canvas v1.4.1 (captures table as PNG)

**Google Sheets Needed:**
| Sheet | Columns | Operation |
|-------|---------|-----------|
| `[BILLS] WaterBills` | house_number, amount | READ (current month) |
| `[BILLS] ElectricBills` | house_number, amount | READ (current month) |
| `[BILLS] CommonFee` | amount | READ |
| `[MAIN] Residents` | house_number, resident_name | READ |

**Issues:**
1. 🔴 **CRITICAL: `getSampleData()` returns entirely hardcoded mock data** — does NOT read actual billing data from localStorage or anywhere
2. ⚠️ Must replace with actual data fetching from Google Sheets
3. ⚠️ `commonFee` key mismatch with admin-settings

---

### 11. `upload-slip.html` (~250 lines) — ⚠️ NEEDS_FIX

**Purpose:** อัพโหลดสลิปการชำระเงิน (User)

**Data Fields:**
- `paid-amount`, slip images (up to 5 files)

**localStorage:**
| Key | Operation | Data |
|-----|-----------|------|
| `currentUserUnit` | READ | หมายเลขบ้าน |
| `residentsData` | READ | ข้อมูลผู้อยู่ |
| `waterBill_{key}` | READ | ค่าน้ำ |
| `electricBill_{key}` | READ | ค่าไฟ |
| `commonFeeRate` | READ | ค่าส่วนกลาง |
| `slipSubmissions_{periodKey}` | WRITE | สลิป + base64 images |

**Google Sheets Needed:**
| Sheet | Columns | Operation |
|-------|---------|-----------|
| `[PAYMENTS] SlipSubmissions` | all columns | WRITE |
| `[BILLS] WaterBills` | house_number, amount | READ |
| `[BILLS] ElectricBills` | house_number, amount | READ |

**Google Drive Needed:**
| Folder | File Type | Purpose |
|--------|-----------|---------|
| `Slips/{year-month}/` | JPEG/PNG | Slip image uploads |

**Issues:**
1. 🔴 Slip images stored as **base64 in localStorage** — needs Google Drive
2. 🔴 `commonFeeRate` key inconsistent — admin-settings writes `commonFee` and `adminSettings_commonFee`
3. ⚠️ UI says "อัพโหลดได้สูงสุด 5 ไฟล์" but code limits to 3
4. ⚠️ `currentUserUnit` never set by login

---

### 12. `check-slip.html` (1056 lines) — ⚠️ NEEDS_FIX

**Purpose:** ตรวจสอบสลิปและอนุมัติการชำระ (Admin)

**localStorage:**
| Key | Operation | Data |
|-----|-----------|------|
| `residentsData` | READ | รายชื่อผู้อยู่ |
| `waterBill_{key}` | READ | ค่าน้ำ |
| `electricBill_{key}` | READ | ค่าไฟ |
| `slipSubmissions_{key}` | READ/WRITE | ข้อมูลสลิป |
| `slipApprovals_{key}` | READ/WRITE | ผลอนุมัติ |
| `commonFee` | READ | ค่าส่วนกลาง |
| `adminSettings_system` | READ | email templates |
| `currentUser` | READ | ผู้ใช้ปัจจุบัน |
| `due_date_working_days` | READ | กำหนดชำระ |

**Features:**
- View/approve/reject slips
- Manual payment recording
- Send reminder emails (console.log only — **NOT IMPLEMENTED**)
- Send receipt emails (console.log only — **NOT IMPLEMENTED**)

**Google Sheets Needed:**
| Sheet | Columns | Operation |
|-------|---------|-----------|
| `[PAYMENTS] SlipSubmissions` | all columns | READ/WRITE |
| `[PAYMENTS] PaymentHistory` | all columns | WRITE (on approve) |
| `[BILLS] WaterBills` | house_number, amount | READ |
| `[BILLS] ElectricBills` | house_number, amount | READ |
| `[MAIN] Residents` | house_number, email, resident_name | READ |
| `[MAIN] Settings` | email templates | READ |

**Issues:**
1. 🟡 **Email sending not implemented** — uses console.log/alert instead of actual email API
2. 🔴 `commonFee` key mismatch
3. ⚠️ `currentUser` never set by login
4. ⚠️ Must use MailApp.sendEmail() in Google Apps Script

---

### 13. `payment-history.html` (~300 lines) — ⚠️ NEEDS_FIX

**Purpose:** ประวัติการชำระเงิน (User)

**localStorage:** ไม่มี READ/WRITE จริง

**Google Sheets Needed:**
| Sheet | Columns | Operation |
|-------|---------|-----------|
| `[PAYMENTS] PaymentHistory` | all columns | READ |

**Issues:**
1. 🔴 **CRITICAL: Contains entirely hardcoded HTML table data** — not dynamic
2. 🔴 Filter function broken — compares "01" to Thai month text (will never match)
3. ❌ Must rewrite to fetch real data from Google Sheets

---

### 14. `monthly-withdraw.html` (711 lines) — ⚠️ NEEDS_FIX

**Purpose:** สรุปยอดเบิกเงินประจำเดือน (Admin)

**Data Fields:**
- `bill_month`, `bill_year`
- `garbageFee` (default 310)
- Dynamic additional items (name + amount)

**localStorage:**
| Key | Operation | Data |
|-----|-----------|------|
| `waterBill_{key}` | READ | ยอดรวมค่าน้ำ |
| `electricBill_{key}` | READ | ยอดรวมค่าไฟ (pea_total) |
| `monthlyWithdraw_{key}` | READ/WRITE | ข้อมูลเบิก |

**Google Sheets Needed:**
| Sheet | Columns | Operation |
|-------|---------|-----------|
| `[ACCOUNTING] MonthlyWithdraw` | all columns | READ/WRITE |
| `[BILLS] WaterBills` | sum(amount) for month | READ |
| `[BILLS] ElectricBills` | pea_total for month | READ |

**Issues:**
1. ⚠️ Reads `pea_total` from electricBill for electric total (correct behavior based on PEA bill)
2. ⚠️ Needs backend save API

---

### 15. `accounting.html` (1336 lines) — ⚠️ NEEDS_FIX

**Purpose:** บัญชีเงินกองทุนบ้านพักครู รายเดือน (Admin)

**Data Fields:**
- Period selector (month/year)
- Income items (date, description, amount, image evidence)
- Expense items (date, description, amount, image evidence)
- Carry forward balance (auto from previous month)

**localStorage:**
| Key | Operation | Data |
|-----|-----------|------|
| `accounting_{key}` | READ/WRITE | incomeItems, expenseItems, carryForward, savedAt |
| `residentsData` | READ | นับจำนวนผู้อยู่ |
| `commonFeeRate` | READ | ค่าส่วนกลาง |
| `waterBill_{key}` | READ | ใช้คำนวณรายรับ |
| `electricBill_{key}` | READ | ใช้คำนวณรายจ่าย |
| `monthlyWithdraw_{key}` | READ | ใช้คำนวณรายจ่าย |

**Features:**
- `calculateFromSystem()` — auto-populate income/expense from billing data
- Image attachments for evidence (base64)
- Print report

**Google Sheets Needed:**
| Sheet | Columns | Operation |
|-------|---------|-----------|
| `[ACCOUNTING] Income` | all columns | READ/WRITE |
| `[ACCOUNTING] Expense` | all columns | READ/WRITE |
| `[ACCOUNTING] Summary` | all columns | READ/WRITE |
| `[BILLS] WaterBills` | amounts | READ |
| `[BILLS] ElectricBills` | amounts | READ |
| `[ACCOUNTING] MonthlyWithdraw` | amounts | READ |

**Google Drive Needed:**
| Folder | File Type | Purpose |
|--------|-----------|---------|
| `Accounting/{year-month}/` | JPEG/PNG | Evidence image uploads |

**Issues:**
1. 🟡 Evidence images stored as base64 — needs Google Drive
2. ⚠️ `commonFeeRate` key inconsistent with admin-settings

---

### 16. `form.html` (~370 lines) — ✅ READY

**Purpose:** เมนูเลือกแบบฟอร์ม (Hub/Navigation page)

**Tabs link to:** request-form, repair-form, transfer-form, return-form

**localStorage:** ไม่มี READ/WRITE

**Issues:** None — pure navigation page, no backend needed

---

### 17. `request-form.html` (630 lines) — ❌ MISSING_HANDLER

**Purpose:** แบบฟอร์มขอเข้าพักอาศัย

**Data Fields:**
- Personal: prefix, fullname, address, phone, email, line_id, subject_group
- Stay type: alone/family
- Residents: dynamic list
- Reasons: checkboxes (far_from_home, family_responsibility, new_position, health, other)
- Documents: checkboxes
- File attachments (images/PDF)
- Agreement checkbox

**localStorage READS:**
| Key | Data |
|-----|------|
| `adminSettings_system` | headOfPromotion, viceDirector, director (for printForm) |

**Submit Action:**
- Form `action="#"` — **NO JavaScript submit handler**
- `printForm()` — generates A4 print document with 3 approval boxes

**Google Sheets Needed:**
| Sheet | Columns | Operation |
|-------|---------|-----------|
| `[REQUESTS] ResidenceRequests` | all columns | WRITE |

**Google Drive Needed:**
| Folder | File Type | Purpose |
|--------|-----------|---------|
| `Requests/Residence/` | PDF/JPEG | Attachment uploads |

**Issues:**
1. ❌ **NO submit handler** — form action="#" does nothing
2. ❌ Must add JavaScript submit handler + API call
3. 🟡 Attachments need Google Drive upload
4. ⚠️ Only has `printForm()` function

---

### 18. `transfer-form.html` (533 lines) — ❌ MISSING_HANDLER

**Purpose:** แบบฟอร์มขอย้ายหน่วยพัก

**Data Fields:**
- Personal info (auto-fill note)
- current_house, transfer_type (flat_to_house/house_to_flat/change_unit)
- target_house, reasons (checkboxes), additional_info
- File attachments, agreement

**localStorage READS:** `adminSettings_system` (for printForm)

**Submit Action:** Form `action="#"` — **NO handler**

**Google Sheets Needed:**
| Sheet | Columns | Operation |
|-------|---------|-----------|
| `[REQUESTS] TransferRequests` | all columns | WRITE |

**Google Drive Needed:**
| Folder | File Type | Purpose |
|--------|-----------|---------|
| `Requests/Transfer/` | PDF/JPEG | Attachment uploads |

**Issues:** Same as request-form — no submit handler, print only

---

### 19. `return-form.html` (539 lines) — ❌ MISSING_HANDLER

**Purpose:** แบบฟอร์มขอคืนบ้านพัก

**Data Fields:**
- Personal info, current_house, move_in_date
- Reasons: checkboxes (transfer, resign, disqualified, mou_violation, revoked, other)
- return_date, additional_info
- File attachments, agreement

**localStorage READS:** `adminSettings_system` (for printForm)

**Submit Action:** Form `action="#"` — **NO handler**

**Google Sheets Needed:**
| Sheet | Columns | Operation |
|-------|---------|-----------|
| `[REQUESTS] ReturnRequests` | all columns | WRITE |

**Google Drive Needed:**
| Folder | File Type | Purpose |
|--------|-----------|---------|
| `Requests/Return/` | PDF/JPEG | Attachment uploads |

**Issues:** Same pattern — no submit handler

---

### 20. `repair-form.html` (645 lines) — ❌ MISSING_HANDLER

**Purpose:** แบบฟอร์มแจ้งซ่อมบำรุง

**Data Fields:**
- Personal info, house_number
- work_type: checkboxes (electrical, plumbing, structure, fixtures, utilities, other)
- problem_detail, urgency (urgent_high/urgent/normal)
- cost_responsibility (self/school)
- Cost items: dynamic list (name + price) — only when "school" selected
- File attachments, agreement

**localStorage READS:** `adminSettings_system` (for printForm)

**Submit Action:** Form `action="#"` — **NO handler**

**Google Sheets Needed:**
| Sheet | Columns | Operation |
|-------|---------|-----------|
| `[REQUESTS] RepairRequests` | all columns | WRITE |

**Google Drive Needed:**
| Folder | File Type | Purpose |
|--------|-----------|---------|
| `Requests/Repair/` | PDF/JPEG | Attachment uploads |

**Issues:** Same pattern — no submit handler, print only

---

### 21. `check-request.html` (1938 lines) — ⚠️ NEEDS_FIX

**Purpose:** หน้าตรวจสอบคำร้องและจัดการคิวรอเข้าพัก (Admin)

**localStorage:**
| Key | Operation | Data |
|-----|-----------|------|
| `requests_residence` | READ/WRITE | คำร้องขอเข้าพัก |
| `requests_repair` | READ/WRITE | คำร้องแจ้งซ่อม |
| `requests_transfer` | READ/WRITE | คำร้องขอย้าย |
| `requests_return` | READ/WRITE | คำร้องขอคืน |
| `residence_queue` | READ | คิวรอเข้าพัก (inferred) |
| `queueExpiryDate` | READ/WRITE | วันหมดอายุคิว |

**Features:**
- 4 tabs: Residence, Repair, Transfer, Return requests
- Stats cards (pending, reviewing, approved, queue count)
- Table with filter/search/pagination
- Queue management with drag-and-drop reordering
- Status change modal (pending → reviewing → waiting → approved → rejected → completed → expired)
- Detail view modal
- Queue expiry date management + auto-expire check
- `initSampleData()` — populates sample requests on first load

**Google Sheets Needed:**
| Sheet | Columns | Operation |
|-------|---------|-----------|
| `[REQUESTS] ResidenceRequests` | all columns | READ/WRITE |
| `[REQUESTS] RepairRequests` | all columns | READ/WRITE |
| `[REQUESTS] TransferRequests` | all columns | READ/WRITE |
| `[REQUESTS] ReturnRequests` | all columns | READ/WRITE |
| `[REQUESTS] Queue` | all columns | READ/WRITE |

**Issues:**
1. 🔴 **`initSampleData()` populates hardcoded sample data** on first load — must be removed for production
2. ⚠️ Attachments are filename-only strings — actual files not stored (viewAttachment shows placeholder alert)
3. ⚠️ `queueExpiryDate` stored as standalone key AND in adminSettings_system
4. ⚠️ Queue ordering needs atomic update in Google Sheets

---

### 22. `regulations.html` (650 lines) — ⚠️ NEEDS_FIX

**Purpose:** แสดงระเบียบงานบ้านพักครู (PDF Viewer)

**External Library:** pdf.js v3.11.174

**localStorage READS:**
| Key | Data |
|-----|------|
| `regulations_pdf` | PDF file as base64 string |

**Google Drive Needed:**
| Folder | File Type | Purpose |
|--------|-----------|---------|
| Root or `Documents/` | PDF | Regulation document |

**Issues:**
1. 🔴 **Regulation PDF stored as base64 in localStorage** — extremely large, exceeds localStorage quota easily
2. ⚠️ Must store PDF in Google Drive and load via URL or file ID
3. ⚠️ Admin uploads PDF through admin-settings.html → regulations_pdf

---

### 23. `admin-settings.html` (3250 lines) — ⚠️ NEEDS_FIX

**Purpose:** หน้าตั้งค่าระบบสำหรับ Admin (Central Configuration Hub)

**This is the most critical file** — settings from here are consumed by nearly all other pages.

**8 Tabs:**

| Tab | localStorage Key(s) | Data |
|-----|---------------------|------|
| บ้านพัก/แฟลต | `adminSettings_housing`, `adminSettings_housingFormat` | Housing CRUD, format settings |
| ผู้พักอาศัย | `residentsData` | Residents CRUD, import/export, by-house/individual views |
| ค่าน้ำ | `adminSettings_water`, `waterRate` | rate, minCharge, rounding |
| ค่าไฟ | `adminSettings_electric` | method, rate, rounding, minCharge |
| ส่วนกลาง | `adminSettings_commonFee`, `commonFee` | house/flat rates, exemptions |
| สิทธิ์ | `adminSettings_permissions` | 8 permission types × user matrix |
| ระบบ | `adminSettings_system`, `due_date_working_days`, `adminEmail`, `queueExpiryDate`, `regulations_pdf` | org info, due dates, security, approval personnel, email templates, backup/restore, PDF upload |
| ประกาศ | `announcements` | CRUD announcements |

**Google Sheets Needed:**
| Sheet | Columns | Operation |
|-------|---------|-----------|
| `[MAIN] Housing` | all columns | FULL CRUD |
| `[MAIN] Residents` | all columns | FULL CRUD + import/export |
| `[MAIN] Users` | password_hash | WRITE (reset password) |
| `[MAIN] Permissions` | all columns | FULL CRUD |
| `[MAIN] Settings` | key, value | FULL CRUD |
| `[MAIN] Announcements` | all columns | FULL CRUD |
| `[BILLS] WaterRates` | rate history | WRITE |
| `[BILLS] CommonFee` | amounts | WRITE |
| `[BILLS] Exemptions` | all columns | WRITE |

**Google Drive Needed:**
| Folder | File Type | Purpose |
|--------|-----------|---------|
| `Documents/` | PDF | Regulations PDF |
| `Backups/` | JSON | System backups |

**Issues:**
1. 🔴 **Dual-key problem**: Writes to BOTH `adminSettings_water` AND `waterRate`; `adminSettings_commonFee` AND `commonFee` — consumers read different keys
2. 🔴 Password stored via `btoa()` — not secure, must use proper hashing on backend
3. 🟡 Regulation PDF as base64 in localStorage — quota risk
4. 🟡 Backup/restore is JSON download — should backup to Google Drive
5. ⚠️ `adminSettings_system` stores dozens of settings in one key — should map to individual rows in Settings sheet
6. ⚠️ Permission types list is hardcoded in JS — PERMISSION_TYPES object

---

## localStorage Key Master Map

### Key Mismatches (Critical)

| Consumer Page | Key Read | Producer Page | Key Written | Fix Needed |
|---------------|----------|---------------|-------------|------------|
| dashboard | `commonFee` | admin-settings | `adminSettings_commonFee` + `commonFee` | Standardize |
| upload-slip | `commonFeeRate` | admin-settings | `commonFee` | Rename to match |
| upload-slip | `currentUserUnit` | login | *(never written)* | Login must set |
| dashboard | `currentUser` | login | *(never written)* | Login must set |
| check-slip | `currentUser` | login | *(never written)* | Login must set |
| accounting | `commonFeeRate` | admin-settings | `commonFee` | Rename to match |

### All localStorage Keys Used

| Key Pattern | Read By | Written By |
|-------------|---------|------------|
| `adminSettings_housing` | admin-settings | admin-settings |
| `adminSettings_housingFormat` | admin-settings | admin-settings |
| `adminSettings_water` | admin-settings | admin-settings |
| `adminSettings_electric` | admin-settings | admin-settings |
| `adminSettings_commonFee` | admin-settings | admin-settings |
| `adminSettings_permissions` | admin-settings | admin-settings |
| `adminSettings_exemptions` | admin-settings | admin-settings |
| `adminSettings_system` | record-water, check-slip, request-form, transfer-form, return-form, repair-form, admin-settings | admin-settings |
| `residentsData` | record-water, record-electric, upload-slip, check-slip, accounting, admin-settings | admin-settings, record-water, settings |
| `waterRate` | record-water | admin-settings |
| `waterBill_{YYYYMM}` | dashboard, upload-slip, check-slip, monthly-withdraw, accounting, record-water | record-water |
| `electricBill_{YYYYMM}` | dashboard, upload-slip, check-slip, monthly-withdraw, accounting | record-electric |
| `commonFee` | dashboard, payment-notification, check-slip | admin-settings |
| `commonFeeRate` | upload-slip, accounting | *(nobody — mismatch!)* |
| `currentUser` | dashboard, check-slip | *(nobody — login broken)* |
| `currentUserUnit` | upload-slip | *(nobody — login broken)* |
| `userData` | settings | settings |
| `allUsers` | settings | *(nobody)* |
| `slipSubmissions_{key}` | check-slip | upload-slip, check-slip (manual) |
| `slipApprovals_{key}` | check-slip | check-slip |
| `paymentHistory_{house}` | dashboard | *(nobody — hardcoded HTML)* |
| `monthlyWithdraw_{key}` | accounting | monthly-withdraw |
| `accounting_{key}` | accounting | accounting |
| `announcements` | dashboard | admin-settings |
| `regulations_pdf` | regulations | admin-settings |
| `due_date_working_days` | payment-notification, check-slip | admin-settings |
| `queueExpiryDate` | check-request, admin-settings | check-request, admin-settings |
| `pendingStaffList` | *(nobody)* | settings |
| `noTeamAccess` | team-management | *(nobody)* |
| `requests_residence` | check-request | check-request (initSampleData) |
| `requests_repair` | check-request | check-request (initSampleData) |
| `requests_transfer` | check-request | check-request (initSampleData) |
| `requests_return` | check-request | check-request (initSampleData) |

---

## Google Sheets ↔ Page Mapping

### setup.gs Spreadsheet Files vs Frontend Requirements

| Spreadsheet File | Sheets | Frontend Pages |
|-----------------|--------|----------------|
| `[MAIN] ฐานข้อมูลหลัก` | Housing, Residents, Users, Permissions, Settings, Announcements, Logs | admin-settings, login, register, dashboard, settings, team-management |
| `[BILLS] ค่าน้ำค่าไฟ` | WaterBills, ElectricBills, WaterRates, CommonFee, Exemptions | record-water, record-electric, dashboard, upload-slip, check-slip, payment-notification, monthly-withdraw, accounting |
| `[PAYMENTS] การชำระเงิน` | SlipSubmissions, PaymentHistory, Outstanding | upload-slip, check-slip, payment-history |
| `[REQUESTS] คำร้อง` | ResidenceRequests, TransferRequests, ReturnRequests, RepairRequests, Queue | request-form, transfer-form, return-form, repair-form, check-request |
| `[ACCOUNTING] บัญชี` | Income, Expense, MonthlyWithdraw, Summary | accounting, monthly-withdraw |

### Google Drive Folders Needed

| Folder Path | Used By | File Types |
|-------------|---------|------------|
| `Profile Photos/` | settings.html | JPEG/PNG |
| `Slips/{YYYY-MM}/` | upload-slip.html | JPEG/PNG |
| `Accounting/{YYYY-MM}/` | accounting.html | JPEG/PNG |
| `Requests/Residence/` | request-form.html | PDF/JPEG |
| `Requests/Transfer/` | transfer-form.html | PDF/JPEG |
| `Requests/Return/` | return-form.html | PDF/JPEG |
| `Requests/Repair/` | repair-form.html | PDF/JPEG |
| `Documents/` | regulations.html, admin-settings.html | PDF |
| `Backups/` | admin-settings.html | JSON |

---

## Recommended Fix Priority

### Phase 1: Critical Foundation (ต้องทำก่อน)
1. **Fix login.html** — implement actual authentication + set session keys (`currentUser`, `currentUserUnit`, `userData`)
2. **Standardize localStorage keys** — resolve all mismatches in table above
3. **Remove hardcoded data** — payment-notification (`getSampleData`), payment-history (HTML table), check-request (`initSampleData`), record-water/electric (fallback residents)

### Phase 2: Form Handlers (ส่วน Submit)
4. **Add submit handlers** for all 4 request forms (request, transfer, return, repair)
5. **Fix register.html** — make `validateRegister()` actually submit
6. **Implement forgot-password/forgot-email** API calls

### Phase 3: Backend API Layer
7. **Create Google Apps Script API endpoints** matching every localStorage operation
8. **Replace all `localStorage.getItem/setItem`** with `fetch()` to GAS web app URL
9. **Implement file upload to Google Drive** replacing base64 storage

### Phase 4: Email & Polish
10. **Implement email sending** in check-slip.html via MailApp
11. **Fix payment-history.html** — rewrite as dynamic data table
12. **Add proper authentication middleware** to GAS endpoints

---

## Schema Alignment Check: setup.gs vs Frontend

The `setup.gs` SCHEMAS object is **well-aligned** with frontend needs. Key observations:

| Aspect | Status | Notes |
|--------|--------|-------|
| Housing schema | ✅ Match | Columns match admin-settings fields |
| Residents schema | ✅ Match | Has all fields from settings/admin-settings |
| Users schema | ✅ Match | Separate from Residents (good) |
| Permissions schema | ✅ Match | 8 permission types match admin-settings PERMISSION_TYPES |
| WaterBills schema | ✅ Match | Fields match record-water output |
| ElectricBills schema | ⚠️ Partial | Missing `pea_total`, `lost_house`, `lost_flat` from record-electric |
| SlipSubmissions schema | ✅ Match | Has slip_file_ids for Google Drive references |
| Request schemas (4) | ✅ Match | All request form fields covered |
| Accounting schemas | ⚠️ Partial | Missing `image` field for evidence attachments |
| Queue schema | ✅ Match | Has position, expiry_date |

---

*สร้างโดย Backend Readiness Analysis Tool — HOME PPK 2026*
