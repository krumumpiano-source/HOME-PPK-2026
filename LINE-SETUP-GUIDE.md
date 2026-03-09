# 🚀 คู่มือตั้งค่า LINE สำหรับระบบ HOME PPK 2026

**📅 อัปเดตล่าสุด:** 7 มีนาคม 2569 (2026)  
**⏱️ เวลาที่ใช้:** ประมาณ 30-45 นาที

---

## 📋 สารบัญ

1. [สิ่งที่ต้องเตรียม](#สิ่งที่ต้องเตรียม)
2. [PART 1: สร้าง LINE Official Account](#part-1-สร้าง-line-official-account)
3. [PART 2: สร้าง LINE Messaging API Channel](#part-2-สร้าง-line-messaging-api-channel)
4. [PART 3: สร้าง LIFF App](#part-3-สร้าง-liff-app)
5. [PART 4: Deploy Edge Functions](#part-4-deploy-edge-functions)
6. [PART 5: ตั้งค่า Webhook](#part-5-ตั้งค่า-webhook)
7. [PART 6: สร้าง Rich Menu](#part-6-สร้าง-rich-menu)
8. [PART 7: บันทึกค่า Config ลง Database](#part-7-บันทึกค่า-config-ลง-database)
9. [PART 8: ทดสอบระบบ](#part-8-ทดสอบระบบ)
10. [แก้ปัญหาที่พบบ่อย](#แก้ปัญหาที่พบบ่อย)

---

## สิ่งที่ต้องเตรียม

### ✅ บัญชีและเครื่องมือ

- [ ] **LINE Account** — บัญชี LINE ส่วนตัว (ใช้งานได้ปกติ)
- [ ] **LINE Developers Account** — สมัครที่ [https://developers.line.biz/](https://developers.line.biz/)
- [ ] **Supabase Project** — มี Project Ref พร้อมใช้งาน (เช่น `mwigdgxrfpcmfjuztmip`)
- [ ] **Supabase CLI** — ติดตั้งแล้ว ([วิธีติดตั้ง](https://supabase.com/docs/guides/cli))
- [ ] **GitHub Pages URL** — URL ที่ใช้ host ระบบ (เช่น `https://yourname.github.io/HOME-PPK-2026/`)

### 📂 ไฟล์ที่ต้องใช้

- [ ] Rich Menu Image (2500×1686px) — ดูตัวอย่างใน `supabase/line-richmenu.json`
- [ ] Logo ของโรงเรียน (สำหรับ LINE OA Profile Picture)

---

## PART 1: สร้าง LINE Official Account

### ขั้นตอน

1. **เปิด LINE Official Account Manager**
   - ไปที่ [https://manager.line.biz/](https://manager.line.biz/)
   - เข้าสู่ระบบด้วย LINE Account

2. **สร้าง Official Account ใหม่**
   - คลิก **"สร้างบัญชีอย่างเป็นทางการ"**
   - กรอกข้อมูล:
     - **ชื่อบัญชี:** บ้านพักครู PPK (หรือชื่อที่ต้องการ)
     - **ประเภท:** หน่วยงานราชการ / สถาบันการศึกษา
     - **คำอธิบาย:** ระบบบริหารจัดการบ้านพักครูโรงเรียนพะเยาพิทยาคม
   - คลิก **"สร้าง"**

3. **ตั้งค่าโปรไฟล์**
   - อัปโหลดรูปโปรไฟล์ (Logo โรงเรียน)
   - เพิ่มปกพื้นหลัง (ถ้ามี)
   - ตั้งค่าข้อความทักทาย: "สวัสดีค่ะ ยินดีต้อนรับสู่ระบบบ้านพักครู PPK 🏠"

4. **บันทึก Basic ID**
   - ไปที่ **"ตั้งค่า" → "ข้อมูลบัญชี"**
   - จดบันทึก **Basic ID** (เช่น `@123abcde`)

✅ **Checkpoint:** มี LINE Official Account พร้อมใช้งานแล้ว

---

## PART 2: สร้าง LINE Messaging API Channel

### ขั้นตอน

1. **เปิด LINE Developers Console**
   - ไปที่ [https://developers.line.biz/console/](https://developers.line.biz/console/)
   - คลิก **"Create a new provider"** (ถ้ายังไม่มี Provider)
     - **Provider name:** โรงเรียนพะเยาพิทยาคม (หรือชื่อหน่วยงาน)

2. **สร้าง Messaging API Channel**
   - เลือก Provider ที่สร้างไว้
   - คลิก **"Create a new channel"**
   - เลือก **"Messaging API"**
   - กรอกข้อมูล:
     - **Channel name:** HOME PPK 2026 API
     - **Channel description:** API สำหรับระบบบ้านพักครู
     - **Category:** Education
     - **Subcategory:** School
   - ยอมรับข้อกำหนด → คลิก **"Create"**

3. **เชื่อมกับ LINE Official Account**
   - ในหน้า Channel → แท็บ **"LINE Official Account features"**
   - คลิก **"Link"** เพื่อเชื่อมกับ OA ที่สร้างไว้ใน PART 1

4. **ดึงค่า Channel Access Token**
   - ไปที่แท็บ **"Messaging API"**
   - ในส่วน **"Channel access token (long-lived)"**
   - คลิก **"Issue"**
   - **คัดลอกและเก็บไว้** (ต้องใช้ใน PART 7)
   - ⚠️ **อย่าแชร์ token นี้กับใคร!**

   ```
   ตัวอย่าง Channel Access Token:
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

5. **ดึงค่า Channel Secret**
   - ในแท็บ **"Basic settings"**
   - คัดลอก **Channel secret** (ต้องใช้ใน PART 7)

   ```
   ตัวอย่าง Channel Secret:
   abcd1234efgh5678ijkl9012mnop3456
   ```

6. **ตั้งค่า Webhook (ยังไม่เปิดใช้งาน)**
   - ในแท็บ **"Messaging API"**
   - ในส่วน **"Webhook settings"**
   - **อย่าเปิดใช้งานก่อน** — จะเปิดใน PART 5

✅ **Checkpoint:** มี Channel Access Token และ Channel Secret แล้ว

---

## PART 3: สร้าง LIFF App

### ขั้นตอน

1. **เปิด LINE Developers Console**
   - กลับไปที่ Channel ที่สร้างไว้ใน PART 2

2. **สร้าง LIFF App**
   - ไปที่แท็บ **"LIFF"**
   - คลิก **"Add"**
   - กรอกข้อมูล:
     - **LIFF app name:** HOME PPK Dashboard
     - **Size:** Full
     - **Endpoint URL:** `https://yourname.github.io/HOME-PPK-2026/liff-dashboard.html`
       - ⚠️ **เปลี่ยน `yourname`** เป็น GitHub username ของคุณ
     - **Scope:**
       - ✅ `profile` (อ่านข้อมูลโปรไฟล์)
       - ✅ `openid` (ยืนยันตัวตน)
     - **Bot link feature:** On (เปิดใช้งาน)
   - คลิก **"Add"**

3. **บันทึก LIFF ID**
   - หลังจากสร้างแล้วจะได้ **LIFF ID** (เช่น `2009333832-4En2TkWD`)
   - **คัดลอกและเก็บไว้** (ต้องใช้แก้ไฟล์ LIFF)

4. **สร้าง LIFF App เพิ่มเติม** (ทั้งหมด 5 หน้า)

   | LIFF App Name | Endpoint URL | Size |
   |--------------|--------------|------|
   | HOME PPK Dashboard | `https://yourname.github.io/HOME-PPK-2026/liff-dashboard.html` | Full |
   | HOME PPK Register | `https://yourname.github.io/HOME-PPK-2026/liff-register.html` | Full |
   | HOME PPK Slip Upload | `https://yourname.github.io/HOME-PPK-2026/liff-slip.html` | Tall |
   | HOME PPK History | `https://yourname.github.io/HOME-PPK-2026/liff-history.html` | Full |
   | HOME PPK Forms | `https://yourname.github.io/HOME-PPK-2026/liff-forms.html` | Full |

   ⚠️ **โปรดทราบ:** ปกติจะใช้ **LIFF ID เดียว** สำหรับทุกหน้า แล้วเปลี่ยน path ด้วย query string (เช่น `?page=slip`) แต่ในระบบนี้เราแยกเป็นคนละหน้า

5. **แก้ไข LIFF ID ในโค้ด**
   
   ⚠️ **สำคัญมาก!** ต้องแก้ LIFF ID ใน 5 ไฟล์นี้:

   - `liff-register.html` (บรรทัด 115)
   - `liff-dashboard.html` (บรรทัด 87)
   - `liff-slip.html` (บรรทัด 77)
   - `liff-history.html` (บรรทัด 69)
   - `liff-forms.html` (บรรทัด 188)

   **วิธีแก้:**
   - เปิดไฟล์ทีละไฟล์
   - หา function `getLiffId()`
   - เปลี่ยน `'2009333832-4En2TkWD'` เป็น LIFF ID ที่ได้จากขั้นตอน 3

   ```javascript
   // เปลี่ยนจาก
   async function getLiffId() {
     return '2009333832-4En2TkWD';  // ❌ เปลี่ยนตรงนี้
   }

   // เป็น
   async function getLiffId() {
     return 'YOUR_LIFF_ID_HERE';     // ✅ LIFF ID จริงของคุณ
   }
   ```

✅ **Checkpoint:** มี LIFF App และแก้ LIFF ID ในโค้ดแล้ว

---

## PART 4: Deploy Edge Functions

### ขั้นตอน

1. **ติดตั้ง Supabase CLI** (ถ้ายังไม่มี)

   **Windows (PowerShell):**
   ```powershell
   scoop install supabase
   ```

   **หรือใช้ npm:**
   ```powershell
   npm install -g supabase
   ```

2. **Login เข้า Supabase**

   ```powershell
   supabase login
   ```

   - จะเปิดเบราว์เซอร์ให้ยืนยันตัวตน
   - กลับมาที่ Terminal แล้วกด Enter

3. **Deploy Edge Functions**

   เปิด PowerShell ที่โฟลเดอร์โปรเจค แล้วรัน:

   ```powershell
   .\deploy-edge-functions.ps1
   ```

   หรือ deploy ทีละตัว:

   ```powershell
   .\deploy-edge-functions.ps1 -Function line-webhook
   .\deploy-edge-functions.ps1 -Function line-push
   .\deploy-edge-functions.ps1 -Function cleanup-old-slips
   ```

4. **บันทึก Function URLs**

   หลัง deploy สำเร็จ จะได้ URL แบบนี้:

   ```
   https://mwigdgxrfpcmfjuztmip.supabase.co/functions/v1/line-webhook
   https://mwigdgxrfpcmfjuztmip.supabase.co/functions/v1/line-push
   https://mwigdgxrfpcmfjuztmip.supabase.co/functions/v1/cleanup-old-slips
   ```

   (⚠️ เปลี่ยน `mwigdgxrfpcmfjuztmip` เป็น Project Ref ของคุณ)

5. **ตรวจสอบ Deploy สำเร็จ**

   ```powershell
   supabase functions list
   ```

✅ **Checkpoint:** Edge Functions deploy แล้ว

---

## PART 5: ตั้งค่า Webhook

### ขั้นตอน

1. **กลับไปที่ LINE Developers Console**
   - เปิด Channel ที่สร้างไว้
   - ไปที่แท็บ **"Messaging API"**

2. **ตั้งค่า Webhook URL**
   - ในส่วน **"Webhook settings"**
   - คลิก **"Edit"**
   - กรอก Webhook URL:
     ```
     https://[YOUR_PROJECT_REF].supabase.co/functions/v1/line-webhook
     ```
   - คลิก **"Update"**

3. **เปิดใช้งาน Webhook**
   - เปิดสวิตช์ **"Use webhook"** เป็น **ON**
   - เปิดสวิตช์ **"Verify webhook"** แล้วคลิก **"Verify"**
   - ถ้าขึ้น ✅ **"Success"** แสดงว่าตั้งค่าถูกต้อง
   - ถ้าขึ้น ❌ กลับไปตรวจสอบ:
     - Edge Function deploy สำเร็จหรือยัง
     - URL ถูกต้องหรือเปล่า
     - Channel secret ตรงกันหรือไม่

4. **ปิด Auto-reply และ Greeting message**
   - ในแท็บ **"Messaging API"**
   - ในส่วน **"LINE Official Account features"**
   - คลิก **"Edit"** ที่ **"Auto-reply messages"** → ตั้งเป็น **"Disabled"**
   - คลิก **"Edit"** ที่ **"Greeting messages"** → ตั้งเป็น **"Disabled"**
   - (เราจะใช้ webhook ควบคุมข้อความแทน)

✅ **Checkpoint:** Webhook ทำงานแล้ว

---

## PART 6: สร้าง Rich Menu

### ขั้นตอน

1. **เตรียมรูป Rich Menu**

   - ขนาด: **2500×1686 พิกเซล**
   - รูปแบบ: PNG หรือ JPEG
   - เลเอาต์: 2×3 ปุ่ม (ตามที่กำหนดใน `supabase/line-richmenu.json`)

   | ปุ่ม | ข้อความ | ตำแหน่ง |
   |------|---------|---------|
   | 📤 ส่งสลิป | "ส่งสลิป" | แถวบน ซ้าย |
   | 💰 ยอดค้าง | "ยอดค้าง" | แถวบน กลาง |
   | 📊 สถิติ | "สถิติ" | แถวบน ขวา |
   | 📋 ประวัติ | "ประวัติ" | แถวล่าง ซ้าย |
   | 🔧 แจ้งซ่อม | "แจ้งซ่อม" | แถวล่าง กลาง |
   | ❓ ช่วยเหลือ | "ช่วยเหลือ" | แถวล่าง ขวา |

2. **รัน PowerShell Script**

   เปิด PowerShell ที่โฟลเดอร์โปรเจค แล้วรัน:

   ```powershell
   .\supabase\line-richmenu-setup.ps1 `
     -ChannelToken "YOUR_CHANNEL_ACCESS_TOKEN" `
     -LiffId "YOUR_LIFF_ID" `
     -ImagePath "path\to\richmenu.png"
   ```

   ⚠️ เปลี่ยนค่าเหล่านี้:
   - `YOUR_CHANNEL_ACCESS_TOKEN` — จาก PART 2 ขั้นตอน 4
   - `YOUR_LIFF_ID` — จาก PART 3 ขั้นตอน 3 (ไม่ต้องใส่ `liff.line.me/`)
   - `path\to\richmenu.png` — path ไฟล์รูป Rich Menu

3. **ตรวจสอบ Rich Menu**
   - เปิดแชท LINE OA ในมือถือ
   - ดูด้านล่างหน้าแชท ควรเห็น Rich Menu แบบ 6 ปุ่ม
   - ลองกดทดสอบแต่ละปุ่ม

✅ **Checkpoint:** Rich Menu แสดงใน LINE OA แล้ว

---

## PART 7: บันทึกค่า Config ลง Database

### ขั้นตอน

1. **เปิด Supabase SQL Editor**
   - ไปที่ [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - เลือก Project
   - ไปที่เมนู **"SQL Editor"**

2. **รัน Migration SQL**

   คัดลอก SQL นี้แล้ว Run:

   ```sql
   -- บันทึก LINE Config ลง settings table
   INSERT INTO public.settings (key, value) VALUES
     ('line_channel_access_token', 'YOUR_CHANNEL_ACCESS_TOKEN'),
     ('line_channel_secret', 'YOUR_CHANNEL_SECRET'),
     ('line_liff_id', 'YOUR_LIFF_ID'),
     ('line_oa_name', 'บ้านพักครู PPK'),
     ('line_push_quota_used', '0'),
     ('line_push_quota_limit', '200'),
     ('line_push_quota_reset_date', ''),
     ('default_resident_pin', '1234')
   ON CONFLICT (key) DO UPDATE
     SET value = EXCLUDED.value;
   ```

   ⚠️ **แทนค่าตัวแปรเหล่านี้:**
   - `YOUR_CHANNEL_ACCESS_TOKEN` — จาก PART 2
   - `YOUR_CHANNEL_SECRET` — จาก PART 2
   - `YOUR_LIFF_ID` — จาก PART 3 (ใส่แบบเต็ม เช่น `2009333832-4En2TkWD`)

3. **ยืนยันว่าบันทึกสำเร็จ**

   รัน SQL เพื่อตรวจสอบ:

   ```sql
   SELECT * FROM public.settings
   WHERE key LIKE 'line_%' OR key = 'default_resident_pin';
   ```

   ควรเห็น 8 แถว:
   - `line_channel_access_token`
   - `line_channel_secret`
   - `line_liff_id`
   - `line_oa_name`
   - `line_push_quota_used`
   - `line_push_quota_limit`
   - `line_push_quota_reset_date`
   - `default_resident_pin`

4. **อัปเดต default_resident_pin** (ถ้าต้องการ)

   รหัส PIN เริ่มต้นคือ `1234` — ควรเปลี่ยนเป็นรหัสที่ปลอดภัยกว่า:

   ```sql
   UPDATE public.settings
   SET value = 'YOUR_SECURE_PIN'
   WHERE key = 'default_resident_pin';
   ```

   ⚠️ **PIN นี้ใช้สำหรับ:**
   - ผู้พักอาศัยที่ยังไม่มีบัญชีในระบบ (ไม่มี user_id)
   - ใช้ตอนลิงก์ LINE Account ครั้งแรก
   - แจ้งรหัสนี้ให้ผู้พักอาศัยทราบ

✅ **Checkpoint:** Config ถูกบันทึกใน Database แล้ว

---

## PART 8: ทดสอบระบบ

### ขั้นตอนทดสอบ

### 1. ทดสอบ Rich Menu

- [ ] เปิดแชท LINE OA ด้วยมือถือ
- [ ] กดปุ่ม **"💰 ยอดค้าง"** → ต้อง้ได้ Flex Message แสดงยอดชำระ (หรือข้อความว่ายังไม่ได้เชื่อมบัญชี)
- [ ] กดปุ่ม **"❓ ช่วยเหลือ"** → ต้องได้ Flex Menu พร้อมลิสต์คำสั่ง
- [ ] ส่งข้อความ **"เมนู"** → ต้องได้ Flex Menu

### 2. ทดสอบการลงทะเบียน (LIFF)

- [ ] กดปุ่ม Rich Menu ใดก็ได้ หรือส่งข้อความ **"ลงทะเบียน"**
- [ ] หน้า LIFF เปิดขึ้นมา (liff-register.html)
- [ ] กรอกหมายเลขบ้านพัก (เช่น `A-01`)
- [ ] กรอกรหัส PIN (`1234` หรือรหัสที่ตั้งไว้)
- [ ] คลิก **"ยืนยันการเชื่อมบัญชี"**
- [ ] ต้องได้ข้อความว่า **"✅ เชื่อมบัญชีสำเร็จ"**

### 3. ทดสอบดูยอดค้าง (LIFF Dashboard)

- [ ] หลังลงทะเบียนแล้ว กดปุ่ม **"💰 ยอดค้าง"** อีกครั้ง
- [ ] ต้องเปิดหน้า liff-dashboard.html
- [ ] แสดงยอดค่าน้ำ + ค่าไฟ + กองกลาง
- [ ] แสดงสถานะการชำระ (ยังไม่ชำระ / รอตรวจสอบ / ชำระแล้ว)

### 4. ทดสอบส่งสลิป (LIFF Slip Upload)

- [ ] กดปุ่ม **"📤 ส่งสลิป"**
- [ ] เปิดหน้า liff-slip.html
- [ ] เลือกรูปสลิปจากแกลเลอรี่
- [ ] กรอกจำนวนเงินที่โอน
- [ ] คลิก **"ส่งสลิป"**
- [ ] ต้องได้ LINE message ยืนยัน: **"✅ ส่งสลิปการชำระค่าสาธารณูปโภค YYYY-MM เรียบร้อยแล้ว"**

### 5. ทดสอบดูประวัติ (LIFF History)

- [ ] กดปุ่ม **"📋 ประวัติ"**
- [ ] เปิดหน้า liff-history.html
- [ ] แสดงรายการชำระเงินที่ผ่านมา
- [ ] แสดงสถิติ: จำนวนครั้งที่ชำระ, ยอดรวม

### 6. ทดสอบส่งคำร้อง (LIFF Forms)

- [ ] กดปุ่ม **"🔧 แจ้งซ่อม"**
- [ ] เปิดหน้า liff-forms.html
- [ ] เลือกประเภทคำร้อง (แจ้งซ่อม)
- [ ] กรอกรายละเอียด
- [ ] คลิก **"ส่งคำร้อง"**
- [ ] ต้องได้ LINE message ยืนยัน: **"✅ ส่งคำร้องแจ้งซ่อมเรียบร้อยแล้ว"**

### 7. ทดสอบฝั่งคณะทำงาน (Browser)

- [ ] เปิดเบราว์เซอร์ไปที่ `check-slip.html`
- [ ] เห็นสลิปที่ผู้พักส่งมา
- [ ] กด **"อนุมัติ"** → ระบบส่ง LINE push แจ้งผู้พัก
- [ ] เปิด `check-request.html`
- [ ] เห็นคำร้องที่ส่งมา
- [ ] กด **"อนุมัติ/ปฏิเสธ"** → ระบบส่ง LINE push

✅ **Checkpoint:** ระบบทำงานสมบูรณ์!

---

## แก้ปัญหาที่พบบ่อย

### ❌ LIFF ไม่เปิด (Error: Invalid LIFF ID)

**สาเหตุ:**
- LIFF ID ผิด หรือไม่ได้แก้ในโค้ด

**วิธีแก้:**
1. ตรวจสอบ LIFF ID ใน LINE Developers Console
2. แก้ไข LIFF ID ใน 5 ไฟล์ (PART 3 ข้อ 5)
3. Deploy ไฟล์ใหม่ขึ้น GitHub Pages
4. ลองอีกครั้ง

---

### ❌ Webhook ไม่ทำงาน (ส่งข้อความแล้วไม่มีการตอบกลับ)

**สาเหตุ:**
- Webhook URL ผิด
- Edge Function ยังไม่ deploy
- Channel Secret ไม่ตรงกัน

**วิธีแก้:**
1. ตรวจสอบ Webhook URL ใน LINE Developers Console
   ```
   https://[PROJECT_REF].supabase.co/functions/v1/line-webhook
   ```
2. ทดสอบ Edge Function ด้วย curl:
   ```powershell
   curl -X POST https://[PROJECT_REF].supabase.co/functions/v1/line-webhook
   ```
   ต้องได้ Response (ไม่ว่าจะ error หรือ success)
3. ตรวจสอบ Log ใน Supabase Dashboard:
   - ไปที่ **"Edge Functions" → "line-webhook" → "Logs"**
   - ดู error message
4. ตรวจสอบ Channel Secret ใน Database:
   ```sql
   SELECT value FROM settings WHERE key = 'line_channel_secret';
   ```
   ต้องตรงกับใน LINE Developers Console

---

### ❌ LINE Push ไม่ส่ง (อนุมัติสลิปแล้วไม่มีการแจ้งเตือน)

**สาเหตุ:**
- Channel Access Token หมดอายุ
- LINE user ID ไม่ได้ link
- เกิน quota (200 ข้อความ/เดือน)

**วิธีแก้:**
1. ตรวจสอบ Token:
   ```sql
   SELECT value FROM settings WHERE key = 'line_channel_access_token';
   ```
2. ตรวจสอบว่า resident มี `line_user_id` หรือยัง:
   ```sql
   SELECT house_number, line_user_id, line_linked_at
   FROM residents
   WHERE house_number = 'A-01';  -- เปลี่ยนเป็นบ้านที่ทดสอบ
   ```
   ถ้า `line_user_id` เป็น `null` แสดงว่ายังไม่ได้ลงทะเบียน
3. ตรวจสอบ quota:
   ```sql
   SELECT * FROM settings
   WHERE key LIKE 'line_push_quota%';
   ```
   ถ้า `used >= limit` ต้องเพิ่ม quota หรือรอเดือนถัดไป

---

### ❌ Rich Menu ไม่แสดง

**สาเหตุ:**
- รูปภาพขนาดไม่ถูกต้อง
- ยังไม่ได้ตั้งเป็น default
- User เก่าที่ follow ไปก่อนหน้า

**วิธีแก้:**
1. ตรวจสอบขนาดรูป: ต้องเป็น 2500×1686px พอดี
2. รัน script อีกครั้งพร้อมพารามิเตอร์ `-SetDefault`:
   ```powershell
   .\supabase\line-richmenu-setup.ps1 ... -SetDefault
   ```
3. ถ้ายังไม่แสดง ลอง unfollow แล้ว follow ใหม่:
   - เปิดแชท LINE OA
   - กด **"..."** → **"Block"**
   - กด **"Unblock"** → **"Add friend"**

---

### ❌ Password ผิด (ตอนลงทะเบียน LINE)

**สาเหตุ:**
- PIN ไม่ตรงกับที่ตั้งใน Database
- Resident มี user_id แต่ password_hash ไม่ตรงกัน

**วิธีแก้:**
1. ถ้า resident **ไม่มี** user_id → ใช้ `default_resident_pin`:
   ```sql
   UPDATE settings
   SET value = 'YOUR_NEW_PIN'
   WHERE key = 'default_resident_pin';
   ```
2. ถ้า resident **มี** user_id → ต้อง reset password ใน `users` table:
   ```sql
   -- Hash password ใหม่ด้วย SHA-256 ก่อน
   UPDATE users
   SET password_hash = 'SHA256_HASH_OF_NEW_PASSWORD'
   WHERE email = 'user@example.com';
   ```

---

## 📞 ติดต่อสอบถาม

หากมีปัญหาหรือข้อสงสัย:
- ตรวจสอบ Log ใน Supabase Dashboard (Edge Functions → Logs)
- ดู Documentation: [DOCUMENTATION-HOME-PPK-2026.md](../DOCUMENTATION-HOME-PPK-2026.md)
- ตรวจสอบสถานะโปรเจค: [สถานะโครงการ-HOME-PPK-2026.md](../สถานะโครงการ-HOME-PPK-2026.md)

---

**🎉 ยินดีด้วย! ระบบ LINE พร้อมใช้งานแล้ว**

