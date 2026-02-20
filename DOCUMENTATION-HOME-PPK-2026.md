# 📚 เอกสารระบบ HOME PPK 2026 - ฉบับสมบูรณ์

**Last Updated:** 13 กุมภาพันธ์ 2569 (2026)  
**Version:** 1.0

---

## 📑 สารบัญ

1. [ภาพรวมระบบ](#1-ภาพรวมระบบ)
2. [รายการไฟล์ HTML ทั้งหมด](#2-รายการไฟล์-html-ทั้งหมด)
3. [โครงสร้างข้อมูล (localStorage Keys)](#3-โครงสร้างข้อมูล-localstorage-keys)
4. [แผนผังโฟลเดอร์และ Google Sheets ที่จำเป็น](#4-แผนผังโฟลเดอร์และ-google-sheets-ที่จำเป็น)
5. [โครงสร้างไฟล์ Google Apps Script (.gs)](#5-โครงสร้างไฟล์-google-apps-script-gs)
6. [รายละเอียดคอลัมน์ในแต่ละ Sheet](#6-รายละเอียดคอลัมน์ในแต่ละ-sheet)
7. [Flow การทำงานของระบบ](#7-flow-การทำงานของระบบ)
8. [แผนการพัฒนาต่อไป](#8-แผนการพัฒนาต่อไป)

---

## 1. ภาพรวมระบบ

### 1.1 ชื่อระบบ
**HOME PPK 2026** - ระบบบริหารจัดการบ้านพักครูโรงเรียนพะเยาพิทยาคม

### 1.2 วัตถุประสงค์
- บริหารจัดการบ้านพักครูและแฟลตภายในโรงเรียน
- บันทึกและคำนวณค่าน้ำ/ค่าไฟประจำเดือน
- แจ้งยอดชำระและตรวจสอบหลักฐานการชำระเงิน (สลิป)
- จัดการคำร้องขอเข้าพักอาศัย/ย้าย/คืนบ้านพัก/แจ้งซ่อม
- จัดการลำดับคิวรอเข้าพักอาศัย
- บัญชีรายรับรายจ่ายและยอดเบิกประจำเดือน
- ตั้งค่าระบบและจัดการสิทธิ์ผู้ใช้งาน

### 1.3 เทคโนโลยีที่ใช้
| Component | Technology |
|-----------|------------|
| Frontend | HTML5, CSS3, JavaScript (ES6+) |
| Font | Google Fonts - Kanit |
| PDF Viewer | PDF.js |
| Image Capture | html2canvas |
| Data Storage (Current) | localStorage |
| Data Storage (Planned) | Google Sheets + Google Apps Script |

### 1.4 รูปแบบสีตามฟังก์ชัน
| หน้า/ฟังก์ชัน | สี | Hex Code |
|--------------|-----|----------|
| หน้าหลัก/ทั่วไป | น้ำเงิน | #2563eb |
| บันทึกค่าน้ำ | ฟ้าน้ำทะเล | #4dd0e1 |
| บันทึกค่าไฟ | เหลืองอ่อน | #e0b97a |
| ตรวจสลิป | ม่วง | #a855f7 |
| ตั้งค่าแอดมิน | แดง | #ef4444 |
| สำเร็จ/ผ่าน | เขียว | #10b981 |
| คำเตือน | เหลือง | #f59e0b |

---

## 2. รายการไฟล์ HTML ทั้งหมด

### 2.1 กลุ่มระบบ Authentication (การยืนยันตัวตน)
| ไฟล์ | คำอธิบาย | หมายเหตุ |
|------|---------|---------|
| `login.html` | หน้าเข้าสู่ระบบ | รองรับล็อกอินด้วย Email/Password |
| `register.html` | หน้าลงทะเบียนสมาชิกใหม่ | เชื่อมกับข้อมูลผู้พักอาศัย |
| `forgot-password.html` | หน้ารีเซ็ตรหัสผ่าน | ส่งลิงก์รีเซ็ตทาง Email |
| `forgot-email.html` | หน้าค้นหา Email ที่ลงทะเบียนไว้ | จากเลขที่บ้าน/ห้อง |

### 2.2 กลุ่มหน้าหลักผู้ใช้
| ไฟล์ | คำอธิบาย | หมายเหตุ |
|------|---------|---------|
| `dashboard.html` | แดชบอร์ดหลักผู้ใช้ทั่วไป | แสดงประกาศ, ยอดค้างชำระ, ประวัติการชำระ |
| `settings.html` | ตั้งค่าส่วนตัวผู้ใช้ | เปลี่ยนรหัสผ่าน, ข้อมูลส่วนตัว |
| `payment-history.html` | ประวัติการชำระเงิน | ดูย้อนหลังตามเดือน/ปี |
| `regulations.html` | ดูระเบียบการพักอาศัย (PDF) | รองรับอัปโหลด/เปลี่ยน/ลบ (Admin only) |
| `upload-slip.html` | อัปโหลดสลิปการชำระเงิน | ผู้ใช้ทั่วไปใช้ส่งสลิป |

### 2.3 กลุ่มแบบฟอร์มคำร้อง
| ไฟล์ | คำอธิบาย | หมายเหตุ |
|------|---------|---------|
| `form.html` | หน้ารวมลิงก์ไปแบบฟอร์มทั้งหมด | เมนูเลือกประเภทคำร้อง |
| `request-form.html` | แบบฟอร์มขอเข้าพักอาศัย | สำหรับครูใหม่ |
| `transfer-form.html` | แบบฟอร์มขอย้ายบ้านพัก | ย้ายจากบ้านหนึ่งไปอีกบ้าน |
| `return-form.html` | แบบฟอร์มแจ้งคืนบ้านพัก | ลาออก/เกษียณ |
| `repair-form.html` | แบบฟอร์มแจ้งซ่อม | แจ้งปัญหาบ้านพัก |

### 2.4 กลุ่มโปรแกรมบริหารจัดการ (คณะทำงาน)
| ไฟล์ | คำอธิบาย | สิทธิ์ที่ต้องการ |
|------|---------|---------------|
| `team-management.html` | หน้ารวมเมนูคณะทำงาน | ผู้ที่ได้รับสิทธิ์เท่านั้น |
| `record-water.html` | บันทึกค่าน้ำ | 💧 ผู้บันทึกค่าน้ำ |
| `record-electric.html` | บันทึกค่าไฟ | ⚡ ผู้บันทึกค่าไฟ |
| `payment-notification.html` | แจ้งยอดชำระ | 📢 ผู้แจ้งยอดชำระ |
| `check-slip.html` | ตรวจสลิปการชำระ | 🧾 ผู้ตรวจสลิป |
| `check-request.html` | ตรวจคำร้อง/ลำดับคิว | 📋 ผู้ตรวจคำร้อง |
| `monthly-withdraw.html` | ยอดเบิกประจำเดือน | 💰 ผู้เบิกยอดประจำเดือน |
| `accounting.html` | บัญชีรายรับรายจ่าย | 📑 ผู้ทำบัญชี |

### 2.5 กลุ่มตั้งค่าระบบ (Admin)
| ไฟล์ | คำอธิบาย | สิทธิ์ที่ต้องการ |
|------|---------|---------------|
| `admin-settings.html` | ตั้งค่าระบบทั้งหมด | 🔧 แอดมินเท่านั้น |

### 2.6 ไฟล์เอกสาร
| ไฟล์ | คำอธิบาย |
|------|---------|
| `README.md` | เอกสาร README หลัก |
| `README-ระบบบ้านพักครู-สำรอง.md` | เอกสารสำรองโครงสร้างระบบ |
| `ข้อกำหนดมาตรฐานระบบ HOME PPK 2026.md` | ข้อกำหนดมาตรฐานระบบ |
| `DOCUMENTATION-HOME-PPK-2026.md` | **เอกสารฉบับสมบูรณ์นี้** |

---

## 3. โครงสร้างข้อมูล (localStorage Keys)

### 3.1 ข้อมูลการตั้งค่าระบบ (Admin Settings)

```javascript
const STORAGE_KEYS = {
    // บ้านพักและแฟลต
    housing: 'adminSettings_housing',           // Array of housing objects
    housingFormat: 'adminSettings_housingFormat', // Housing number format settings
    
    // ผู้พักอาศัย
    residents: 'residentsData',                 // Array of resident objects
    
    // การตั้งค่าค่าใช้จ่าย
    waterSettings: 'adminSettings_water',       // Water rate settings
    electricSettings: 'adminSettings_electric', // Electric rate settings
    commonFeeSettings: 'adminSettings_commonFee', // Common fee settings
    
    // ระบบ
    systemSettings: 'adminSettings_system',     // System-wide settings
    permissions: 'adminSettings_permissions',   // User permissions
    exemptions: 'adminSettings_exemptions'      // Common fee exemptions
};
```

### 3.2 ข้อมูลค่าน้ำ/ค่าไฟ

```javascript
// รูปแบบ Key: waterBill_{ปี พ.ศ.}{เดือน 2 หลัก}
// ตัวอย่าง: waterBill_256902

waterBill_YYYYMM = {
    records: [
        {
            house: 'บ้าน A-01',
            resident: 'นายสมชาย ใจดี',
            prevMeter: 1234,      // เลขมิเตอร์ก่อน
            currMeter: 1250,      // เลขมิเตอร์หลัง
            units: 16,            // หน่วยที่ใช้
            amount: 80            // จำนวนเงิน (บาท)
        },
        // ... more records
    ],
    savedAt: '2026-02-13T10:30:00.000Z',
    savedBy: 'admin@school.ac.th'
}

// รูปแบบ Key: electricBill_{ปี พ.ศ.}{เดือน 2 หลัก}  
electricBill_YYYYMM = {
    records: [
        {
            house: 'บ้าน A-01',
            resident: 'นายสมชาย ใจดี',
            amount: 500           // จำนวนเงิน (บาท) - ตามบิลจริง
        },
        // ... more records
    ],
    savedAt: '2026-02-13T10:30:00.000Z',
    savedBy: 'admin@school.ac.th'
}
```

### 3.3 ข้อมูลการชำระเงินและสลิป

```javascript
// สลิปที่ส่งมา
slipSubmissions_YYYYMM = [
    {
        id: 1707802200000,        // timestamp as ID
        unitNumber: 'บ้าน A-01',
        residentName: 'นายสมชาย ใจดี',
        email: 'somchai@school.ac.th',
        slipImage: 'data:image/jpeg;base64,...', // base64 image
        amount: 690,              // จำนวนเงินที่แจ้ง
        note: 'ชำระค่าน้ำ/ไฟ ก.พ. 69',
        submittedAt: '2026-02-13T10:30:00.000Z'
    },
    // ... more submissions
]

// สถานะการอนุมัติสลิป
slipApprovals_YYYYMM = {
    'บ้าน A-01': {
        status: 'approved',       // approved / rejected / pending
        approvedBy: 'admin@school.ac.th',
        approvedAt: '2026-02-13T11:00:00.000Z',
        note: 'ตรวจสอบแล้ว ถูกต้อง'
    },
    // ... more approvals
}

// ประวัติการชำระเงินรายบ้าน
paymentHistory_{house_number} = [
    {
        month: '02',
        year: '2569',
        water: 80,
        electric: 500,
        common: 110,
        total: 690,
        paidAt: '2026-02-13T10:30:00.000Z',
        status: 'paid'
    },
    // ... more history
]
```

### 3.4 ข้อมูลคำร้อง

```javascript
const REQUEST_STORAGE_KEYS = {
    residence: 'requests_residence',   // คำร้องขอเข้าพักอาศัย
    repair: 'requests_repair',         // คำร้องแจ้งซ่อม
    transfer: 'requests_transfer',     // คำร้องขอย้าย
    return: 'requests_return',         // คำร้องแจ้งคืน
    queue: 'residence_queue'           // ลำดับคิวรอเข้าพัก
};

// ตัวอย่างโครงสร้างคำร้องขอเข้าพัก
requests_residence = [
    {
        id: 1707802200000,
        fullName: 'นายสมชาย ใจดี',
        position: 'ครู คศ.1',
        department: 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์',
        phone: '081-234-5678',
        email: 'somchai@school.ac.th',
        requestType: 'house',         // house / flat
        preferredBuilding: 'อาคาร A',
        reason: 'บ้านอยู่ไกลจากโรงเรียน',
        status: 'pending',            // pending / approved / rejected
        submittedAt: '2026-02-13T10:30:00.000Z',
        reviewedAt: null,
        reviewedBy: null,
        reviewNote: null
    },
    // ... more requests
]
```

### 3.5 ข้อมูลบัญชีและยอดเบิก

```javascript
// ยอดเบิกประจำเดือน
monthlyWithdraw_YYYYMM = {
    waterTotal: 5000,         // ยอดรวมค่าน้ำที่เก็บได้
    electricTotal: 25000,     // ยอดรวมค่าไฟที่เก็บได้
    commonTotal: 8800,        // ยอดรวมค่าส่วนกลาง
    withdrawAmount: 10000,    // ยอดที่เบิก
    withdrawDate: '2026-02-15',
    withdrawBy: 'admin@school.ac.th',
    note: 'เบิกค่าน้ำประปา',
    savedAt: '2026-02-15T14:00:00.000Z'
}

// บัญชีรายรับรายจ่าย
accounting_YYYYMM = {
    income: [
        {
            id: 1,
            date: '2026-02-01',
            description: 'ค่าน้ำประจำเดือน ม.ค. 69',
            amount: 5000,
            category: 'water'
        },
        // ... more income items
    ],
    expense: [
        {
            id: 1,
            date: '2026-02-05',
            description: 'จ่ายค่าน้ำประปาให้ รร.',
            amount: 4500,
            category: 'water_payment'
        },
        // ... more expense items
    ],
    balance: 500,
    carryOver: 1000,          // ยอดยกมาจากเดือนก่อน
    savedAt: '2026-02-28T23:59:00.000Z'
}
```

### 3.6 ข้อมูลผู้ใช้และการตั้งค่า

```javascript
// ผู้ใช้ปัจจุบัน
currentUser = {
    id: 'user_123',
    email: 'somchai@school.ac.th',
    name: 'นายสมชาย ใจดี',
    house_number: 'บ้าน A-01',
    role: 'user'              // user / team / admin
}

// ข้อมูลผู้ใช้
userData = {
    email: 'somchai@school.ac.th',
    password: 'hashed_password',
    profile: {
        prefix: 'นาย',
        firstname: 'สมชาย',
        lastname: 'ใจดี',
        phone: '081-234-5678',
        house_number: 'บ้าน A-01'
    }
}

// ประกาศ
announcements = [
    {
        id: 1707802200000,
        text: 'กรุณาชำระค่าน้ำ/ค่าไฟ ภายในวันที่ 15 ของทุกเดือน',
        expiry: '2026-02-28',
        priority: 'important',    // normal / important / urgent
        createdAt: '2026-02-01T10:00:00.000Z',
        active: true
    },
    // ... more announcements
]

// ไฟล์ระเบียบ PDF
regulations_pdf = 'data:application/pdf;base64,...'
```

---

## 4. แผนผังโฟลเดอร์และ Google Sheets ที่จำเป็น

### 4.1 โครงสร้างโฟลเดอร์ใน Google Drive

```
📁 HOME PPK 2026
├── 📁 Data
│   ├── 📊 [MAIN] ฐานข้อมูลหลัก.gsheet
│   ├── 📊 [BILLS] ค่าน้ำค่าไฟ.gsheet
│   ├── 📊 [PAYMENTS] การชำระเงิน.gsheet
│   ├── 📊 [REQUESTS] คำร้อง.gsheet
│   └── 📊 [ACCOUNTING] บัญชี.gsheet
│
├── 📁 Slips
│   ├── 📁 2569
│   │   ├── 📁 01-มกราคม
│   │   ├── 📁 02-กุมภาพันธ์
│   │   └── ... (แต่ละเดือน)
│   └── 📁 2568
│       └── ...
│
├── 📁 Documents
│   ├── 📄 ระเบียบการพักอาศัย.pdf
│   ├── 📄 แบบฟอร์มขอเข้าพักอาศัย.pdf
│   └── 📄 ...
│
├── 📁 Backups
│   └── 📊 Backup_YYYYMMDD.gsheet
│
└── 📁 Scripts
    └── 📝 Code.gs (Google Apps Script)
```

### 4.2 รายละเอียด Google Sheets ที่ต้องสร้าง

#### 📊 ไฟล์ 1: [MAIN] ฐานข้อมูลหลัก.gsheet

| Sheet Name | คำอธิบาย |
|------------|---------|
| `Housing` | ข้อมูลบ้านพัก/แฟลตทั้งหมด |
| `Residents` | ข้อมูลผู้พักอาศัย |
| `Users` | ข้อมูลผู้ใช้งานระบบ (login) |
| `Permissions` | สิทธิ์การใช้งาน |
| `Settings` | การตั้งค่าระบบ |
| `Announcements` | ประกาศ |
| `Logs` | Log การใช้งาน |

#### 📊 ไฟล์ 2: [BILLS] ค่าน้ำค่าไฟ.gsheet

| Sheet Name | คำอธิบาย |
|------------|---------|
| `WaterBills` | บันทึกค่าน้ำทุกเดือน |
| `ElectricBills` | บันทึกค่าไฟทุกเดือน |
| `WaterRates` | อัตราค่าน้ำ |
| `ElectricRates` | อัตราค่าไฟ |
| `CommonFee` | ค่าส่วนกลาง |
| `Exemptions` | การยกเว้นค่าส่วนกลาง |

#### 📊 ไฟล์ 3: [PAYMENTS] การชำระเงิน.gsheet

| Sheet Name | คำอธิบาย |
|------------|---------|
| `SlipSubmissions` | สลิปที่ส่งเข้ามา |
| `SlipApprovals` | สถานะการอนุมัติ |
| `PaymentHistory` | ประวัติการชำระเงิน |
| `Outstanding` | ยอดค้างชำระ |

#### 📊 ไฟล์ 4: [REQUESTS] คำร้อง.gsheet

| Sheet Name | คำอธิบาย |
|------------|---------|
| `ResidenceRequests` | คำร้องขอเข้าพัก |
| `TransferRequests` | คำร้องขอย้าย |
| `ReturnRequests` | คำร้องคืนบ้านพัก |
| `RepairRequests` | คำร้องแจ้งซ่อม |
| `Queue` | ลำดับคิวรอเข้าพัก |

#### 📊 ไฟล์ 5: [ACCOUNTING] บัญชี.gsheet

| Sheet Name | คำอธิบาย |
|------------|---------|
| `Income` | รายรับ |
| `Expense` | รายจ่าย |
| `MonthlyWithdraw` | ยอดเบิกประจำเดือน |
| `Summary` | สรุปรายเดือน |
| `Annual` | สรุปรายปี |

---

## 5. โครงสร้างไฟล์ Google Apps Script (.gs)

### 5.1 รายการไฟล์ .gs ที่ต้องสร้าง

```
📁 Apps Script Project
├── Code.gs              # Main entry point
├── Config.gs            # Configuration & constants
├── Auth.gs              # Authentication functions
├── Housing.gs           # Housing management
├── Residents.gs         # Resident management
├── WaterBills.gs        # Water bill functions
├── ElectricBills.gs     # Electric bill functions
├── Payments.gs          # Payment processing
├── Slips.gs             # Slip upload & approval
├── Requests.gs          # Request handling
├── Queue.gs             # Queue management
├── Accounting.gs        # Accounting functions
├── Notifications.gs     # Email notifications
├── Reports.gs           # Report generation
├── Utils.gs             # Utility functions
└── API.gs               # Web App API endpoints
```

### 5.2 รายละเอียดแต่ละไฟล์

#### 📝 Code.gs - Main Entry Point
```javascript
// Main entry point for web app
function doGet(e) { ... }
function doPost(e) { ... }

// Include HTML files
function include(filename) { ... }
```

#### 📝 Config.gs - Configuration
```javascript
// Spreadsheet IDs
const SPREADSHEET_IDS = {
  MAIN: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  BILLS: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  PAYMENTS: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  REQUESTS: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  ACCOUNTING: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
};

// Folder IDs
const FOLDER_IDS = {
  SLIPS: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  DOCUMENTS: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  BACKUPS: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
};

// Settings
const SETTINGS = {
  WATER_RATE: 5,
  ELECTRIC_UNIT_COST: 4,
  COMMON_FEE_HOUSE: 110,
  COMMON_FEE_FLAT: 110,
  DUE_DATE: 15,
  ADMIN_EMAIL: 'admin@school.ac.th'
};
```

#### 📝 Auth.gs - Authentication
```javascript
function login(email, password) { ... }
function register(userData) { ... }
function logout() { ... }
function resetPassword(email) { ... }
function getCurrentUser() { ... }
function checkPermission(userId, permType) { ... }
```

#### 📝 Housing.gs - Housing Management
```javascript
function getHousingList() { ... }
function addHousing(data) { ... }
function updateHousing(id, data) { ... }
function deleteHousing(id) { ... }
function getHousingByNumber(number) { ... }
function getAvailableHousing() { ... }
function getOccupiedHousing() { ... }
```

#### 📝 Residents.gs - Resident Management
```javascript
function getResidentsList() { ... }
function addResident(data) { ... }
function updateResident(id, data) { ... }
function deleteResident(id) { ... }
function getResidentByHouse(houseNumber) { ... }
function moveResident(residentId, newHouse) { ... }
```

#### 📝 WaterBills.gs - Water Bills
```javascript
function getWaterBill(year, month) { ... }
function saveWaterBill(year, month, records) { ... }
function calculateWaterAmount(units) { ... }
function getWaterHistory(houseNumber) { ... }
function getPreviousMeter(houseNumber, year, month) { ... }
```

#### 📝 ElectricBills.gs - Electric Bills
```javascript
function getElectricBill(year, month) { ... }
function saveElectricBill(year, month, records) { ... }
function getElectricHistory(houseNumber) { ... }
```

#### 📝 Payments.gs - Payments
```javascript
function getPaymentSummary(year, month) { ... }
function getBillingDetails(houseNumber, year, month) { ... }
function getPaymentHistory(houseNumber) { ... }
function getOutstandingPayments() { ... }
function markAsPaid(houseNumber, year, month) { ... }
```

#### 📝 Slips.gs - Slip Management
```javascript
function submitSlip(data, imageBlob) { ... }
function getSlipSubmissions(year, month) { ... }
function approveSlip(submissionId, note) { ... }
function rejectSlip(submissionId, reason) { ... }
function getSlipsByHouse(houseNumber) { ... }
function saveSlipImage(imageBlob, houseNumber, year, month) { ... }
```

#### 📝 Requests.gs - Request Handling
```javascript
function submitResidenceRequest(data) { ... }
function submitTransferRequest(data) { ... }
function submitReturnRequest(data) { ... }
function submitRepairRequest(data) { ... }
function getRequestsByType(type) { ... }
function approveRequest(requestId, type, note) { ... }
function rejectRequest(requestId, type, reason) { ... }
function getRequestStatus(requestId, type) { ... }
```

#### 📝 Queue.gs - Queue Management
```javascript
function getResidenceQueue() { ... }
function addToQueue(requestId) { ... }
function updateQueuePosition(queueId, newPosition) { ... }
function removeFromQueue(queueId) { ... }
function getQueueByPerson(email) { ... }
function setQueueExpiryDate(date) { ... }
```

#### 📝 Accounting.gs - Accounting
```javascript
function getAccounting(year, month) { ... }
function addIncome(year, month, data) { ... }
function addExpense(year, month, data) { ... }
function getMonthlyWithdraw(year, month) { ... }
function saveMonthlyWithdraw(year, month, data) { ... }
function getMonthySummary(year, month) { ... }
function getAnnualSummary(year) { ... }
function calculateBalance(year, month) { ... }
```

#### 📝 Notifications.gs - Email Notifications
```javascript
function sendPaymentNotification(houseNumber, details) { ... }
function sendPaymentReminder(houseNumber) { ... }
function sendSlipApprovalNotification(houseNumber, status) { ... }
function sendRequestStatusNotification(requestId, status) { ... }
function sendBulkNotifications(type, recipients, details) { ... }
function sendPasswordResetEmail(email, resetLink) { ... }
```

#### 📝 Reports.gs - Report Generation
```javascript
function generateMonthlyReport(year, month) { ... }
function generateAnnualReport(year) { ... }
function generatePaymentReport(year, month) { ... }
function generateOutstandingReport() { ... }
function exportToExcel(reportType, params) { ... }
function exportToPDF(reportType, params) { ... }
```

#### 📝 Utils.gs - Utilities
```javascript
function toBuddhistYear(adYear) { ... }
function toADYear(beYear) { ... }
function formatDate(date, format) { ... }
function formatCurrency(amount) { ... }
function generateId() { ... }
function validateEmail(email) { ... }
function sanitizeInput(input) { ... }
function logAction(action, userId, details) { ... }
```

#### 📝 API.gs - Web App API
```javascript
// API Router
function handleGet(e) { ... }
function handlePost(e) { ... }

// Response helpers
function jsonResponse(data) { ... }
function errorResponse(message, code) { ... }

// API Endpoints
const API_ENDPOINTS = {
  // Auth
  'POST /auth/login': login,
  'POST /auth/register': register,
  'POST /auth/logout': logout,
  
  // Housing
  'GET /housing': getHousingList,
  'POST /housing': addHousing,
  'PUT /housing/:id': updateHousing,
  'DELETE /housing/:id': deleteHousing,
  
  // Residents
  'GET /residents': getResidentsList,
  'POST /residents': addResident,
  
  // Bills
  'GET /bills/water/:year/:month': getWaterBill,
  'POST /bills/water/:year/:month': saveWaterBill,
  'GET /bills/electric/:year/:month': getElectricBill,
  'POST /bills/electric/:year/:month': saveElectricBill,
  
  // Payments
  'GET /payments/summary/:year/:month': getPaymentSummary,
  'POST /slips/submit': submitSlip,
  'POST /slips/approve/:id': approveSlip,
  
  // Requests
  'POST /requests/:type': submitRequest,
  'GET /requests/:type': getRequests,
  'POST /requests/:type/:id/approve': approveRequest,
  
  // Accounting
  'GET /accounting/:year/:month': getAccounting,
  'POST /accounting/income': addIncome,
  'POST /accounting/expense': addExpense
};
```

---

## 6. รายละเอียดคอลัมน์ในแต่ละ Sheet

### 6.1 Sheet: Housing (บ้านพัก/แฟลต)

| Column | Name | Type | Description |
|--------|------|------|-------------|
| A | id | String | รหัสบ้านพัก (auto-generated) |
| B | type | String | ประเภท: house / flat |
| C | building | String | อาคาร: A, B, C... |
| D | number | String | เลขที่ห้อง/บ้าน |
| E | display_number | String | เลขที่แสดง เช่น "บ้าน A-01" |
| F | status | String | สถานะ: occupied / vacant / reserved / maintenance |
| G | floor | Number | ชั้น (สำหรับแฟลต) |
| H | created_at | DateTime | วันที่สร้างข้อมูล |
| I | updated_at | DateTime | วันที่อัพเดทล่าสุด |

### 6.2 Sheet: Residents (ผู้พักอาศัย)

| Column | Name | Type | Description |
|--------|------|------|-------------|
| A | id | String | รหัสผู้พักอาศัย |
| B | prefix | String | คำนำหน้า: นาย / นาง / นางสาว |
| C | firstname | String | ชื่อ |
| D | lastname | String | นามสกุล |
| E | position | String | ตำแหน่ง |
| F | department | String | กลุ่มสาระ/ฝ่าย |
| G | phone | String | เบอร์โทรศัพท์ |
| H | email | String | อีเมล |
| I | house_number | String | บ้านเลขที่ที่พัก |
| J | resident_type | String | ประเภท: owner / cohabitant |
| K | move_in_date | Date | วันที่เข้าพัก |
| L | contract_end_date | Date | วันที่สิ้นสุดสัญญา |
| M | no_resident | Boolean | ไม่มีผู้พักอาศัย |
| N | created_at | DateTime | วันที่สร้างข้อมูล |
| O | updated_at | DateTime | วันที่อัพเดทล่าสุด |

### 6.3 Sheet: Users (ผู้ใช้งานระบบ)

| Column | Name | Type | Description |
|--------|------|------|-------------|
| A | id | String | รหัสผู้ใช้ |
| B | email | String | อีเมล (unique) |
| C | password_hash | String | รหัสผ่านเข้ารหัส |
| D | resident_id | String | เชื่อมกับ Residents |
| E | role | String | บทบาท: user / team / admin |
| F | is_active | Boolean | สถานะบัญชี |
| G | last_login | DateTime | เข้าสู่ระบบครั้งล่าสุด |
| H | created_at | DateTime | วันที่สร้างบัญชี |

### 6.4 Sheet: Permissions (สิทธิ์การใช้งาน)

| Column | Name | Type | Description |
|--------|------|------|-------------|
| A | user_id | String | รหัสผู้ใช้ |
| B | water | Boolean | บันทึกค่าน้ำ |
| C | electric | Boolean | บันทึกค่าไฟ |
| D | notify | Boolean | แจ้งยอดชำระ |
| E | slip | Boolean | ตรวจสลิป |
| F | withdraw | Boolean | เบิกยอดประจำเดือน |
| G | accounting | Boolean | ทำบัญชี |
| H | request | Boolean | ตรวจคำร้อง |
| I | admin | Boolean | แอดมิน |
| J | updated_at | DateTime | วันที่อัพเดทล่าสุด |
| K | updated_by | String | ผู้อัพเดท |

### 6.5 Sheet: WaterBills (ค่าน้ำ)

| Column | Name | Type | Description |
|--------|------|------|-------------|
| A | id | String | รหัสรายการ |
| B | year | String | ปี พ.ศ. |
| C | month | String | เดือน (01-12) |
| D | house_number | String | บ้านเลขที่ |
| E | resident_name | String | ชื่อผู้พักอาศัย |
| F | prev_meter | Number | เลขมิเตอร์ก่อน |
| G | curr_meter | Number | เลขมิเตอร์หลัง |
| H | units | Number | หน่วยที่ใช้ |
| I | rate | Number | อัตราต่อหน่วย |
| J | amount | Number | จำนวนเงิน |
| K | saved_at | DateTime | วันที่บันทึก |
| L | saved_by | String | ผู้บันทึก |

### 6.6 Sheet: ElectricBills (ค่าไฟ)

| Column | Name | Type | Description |
|--------|------|------|-------------|
| A | id | String | รหัสรายการ |
| B | year | String | ปี พ.ศ. |
| C | month | String | เดือน (01-12) |
| D | house_number | String | บ้านเลขที่ |
| E | resident_name | String | ชื่อผู้พักอาศัย |
| F | amount | Number | จำนวนเงิน (ตามบิลจริง) |
| G | saved_at | DateTime | วันที่บันทึก |
| H | saved_by | String | ผู้บันทึก |

### 6.7 Sheet: SlipSubmissions (สลิปที่ส่ง)

| Column | Name | Type | Description |
|--------|------|------|-------------|
| A | id | String | รหัสสลิป |
| B | year | String | ปี พ.ศ. |
| C | month | String | เดือน |
| D | house_number | String | บ้านเลขที่ |
| E | resident_name | String | ชื่อผู้ส่ง |
| F | email | String | อีเมลผู้ส่ง |
| G | amount_claimed | Number | จำนวนเงินที่แจ้ง |
| H | slip_file_id | String | รหัสไฟล์ใน Drive |
| I | slip_url | String | ลิงก์ไฟล์สลิป |
| J | note | String | หมายเหตุ |
| K | status | String | สถานะ: pending / approved / rejected |
| L | reviewed_by | String | ผู้ตรวจ |
| M | reviewed_at | DateTime | วันที่ตรวจ |
| N | review_note | String | หมายเหตุการตรวจ |
| O | submitted_at | DateTime | วันที่ส่ง |

### 6.8 Sheet: ResidenceRequests (คำร้องขอเข้าพัก)

| Column | Name | Type | Description |
|--------|------|------|-------------|
| A | id | String | รหัสคำร้อง |
| B | fullname | String | ชื่อ-นามสกุล |
| C | position | String | ตำแหน่ง |
| D | department | String | กลุ่มสาระ/ฝ่าย |
| E | phone | String | เบอร์โทร |
| F | email | String | อีเมล |
| G | request_type | String | ประเภท: house / flat |
| H | preferred_building | String | อาคารที่ต้องการ |
| I | reason | String | เหตุผล |
| J | attachments | String | ไฟล์แนบ (Drive file IDs) |
| K | status | String | สถานะ: pending / approved / rejected / in_queue |
| L | queue_position | Number | ลำดับคิว |
| M | reviewed_by | String | ผู้ตรวจ |
| N | reviewed_at | DateTime | วันที่ตรวจ |
| O | review_note | String | หมายเหตุ |
| P | submitted_at | DateTime | วันที่ยื่นคำร้อง |

### 6.9 Sheet: Income (รายรับ)

| Column | Name | Type | Description |
|--------|------|------|-------------|
| A | id | String | รหัสรายการ |
| B | year | String | ปี พ.ศ. |
| C | month | String | เดือน |
| D | date | Date | วันที่ |
| E | description | String | รายละเอียด |
| F | category | String | หมวด: water / electric / common / other |
| G | amount | Number | จำนวนเงิน |
| H | receipt_no | String | เลขที่ใบเสร็จ |
| I | added_by | String | ผู้บันทึก |
| J | added_at | DateTime | วันที่บันทึก |

### 6.10 Sheet: Expense (รายจ่าย)

| Column | Name | Type | Description |
|--------|------|------|-------------|
| A | id | String | รหัสรายการ |
| B | year | String | ปี พ.ศ. |
| C | month | String | เดือน |
| D | date | Date | วันที่ |
| E | description | String | รายละเอียด |
| F | category | String | หมวด: water_payment / electric_payment / maintenance / other |
| G | amount | Number | จำนวนเงิน |
| H | voucher_no | String | เลขที่ใบเบิก |
| I | added_by | String | ผู้บันทึก |
| J | added_at | DateTime | วันที่บันทึก |

### 6.11 Sheet: Settings (การตั้งค่า)

| Column | Name | Type | Description |
|--------|------|------|-------------|
| A | key | String | ชื่อการตั้งค่า |
| B | value | String | ค่า |
| C | description | String | คำอธิบาย |
| D | updated_at | DateTime | วันที่อัพเดท |
| E | updated_by | String | ผู้อัพเดท |

**ตัวอย่างค่าที่ต้องมี:**
- `org_name`: ชื่อหน่วยงาน
- `school_name`: ชื่อโรงเรียน
- `admin_email`: อีเมลผู้ดูแล
- `admin_phone`: เบอร์โทรผู้ดูแล
- `water_rate`: อัตราค่าน้ำ
- `electric_unit_cost`: อัตราค่าไฟ
- `common_fee_house`: ค่าส่วนกลางบ้านพัก
- `common_fee_flat`: ค่าส่วนกลางแฟลต
- `due_date`: วันกำหนดชำระ
- `house_prefix`: คำนำหน้าบ้าน
- `flat_prefix`: คำนำหน้าแฟลต

---

## 7. Flow การทำงานของระบบ

### 7.1 Flow การบันทึกและแจ้งยอดค่าน้ำ/ค่าไฟ

```
┌──────────────────────────────────────────────────────────────────┐
│  ผู้บันทึกค่าน้ำ/ค่าไฟ                                              │
│  ┌────────────────┐      ┌────────────────┐                     │
│  │ 1. เลือกเดือน/ปี  │ ──▶ │ 2. โหลดข้อมูล     │                     │
│  └────────────────┘      │    ผู้พักอาศัย    │                     │
│                          └───────┬────────┘                     │
│                                  ▼                              │
│                 ┌──────────────────────────────┐                │
│                 │ 3. กรอกเลขมิเตอร์/ยอดค่าไฟ      │                │
│                 │    (ระบบคำนวณยอดอัตโนมัติ)      │                │
│                 └───────────┬──────────────────┘                │
│                             ▼                                   │
│               ┌───────────────────────────┐                     │
│               │ 4. บันทึกข้อมูล (Save)      │                     │
│               └────────────┬──────────────┘                     │
│                            ▼                                    │
└────────────────────────────┼────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│  ผู้แจ้งยอดชำระ                                                    │
│  ┌────────────────┐      ┌────────────────┐                     │
│  │ 5. เลือกเดือน/ปี  │ ──▶ │ 6. โหลดข้อมูล     │                     │
│  └────────────────┘      │    ค่าน้ำ/ไฟ/ส่วนกลาง│                  │
│                          └───────┬────────┘                     │
│                                  ▼                              │
│              ┌─────────────────────────────────┐                │
│              │ 7. ตรวจสอบยอดรวม/กำหนดการยกเว้น    │                │
│              └───────────┬─────────────────────┘                │
│                          ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 8. ส่ง Email/Export รูปภาพแจ้งยอด                          │  │
│  └────────────────────────────┬─────────────────────────────┘  │
│                               │                                 │
└───────────────────────────────┼─────────────────────────────────┘
                                ▼
                   ┌──────────────────────┐
                   │    ผู้พักอาศัย        │
                   │  ได้รับแจ้งยอดชำระ    │
                   └──────────────────────┘
```

### 7.2 Flow การชำระเงินและตรวจสลิป

```
┌──────────────────────────────────────────────────────────────────┐
│  ผู้พักอาศัย                                                       │
│  ┌────────────────┐      ┌────────────────┐                     │
│  │ 1. รับแจ้งยอด    │ ──▶ │ 2. โอนเงินชำระ   │                     │
│  └────────────────┘      └───────┬────────┘                     │
│                                  ▼                              │
│                 ┌──────────────────────────────┐                │
│                 │ 3. อัปโหลดสลิปในระบบ           │                │
│                 │    (upload-slip.html)         │                │
│                 └───────────┬──────────────────┘                │
│                             │                                   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  ผู้ตรวจสลิป                                                       │
│  ┌────────────────┐      ┌────────────────┐                     │
│  │ 4. เปิดหน้า      │ ──▶ │ 5. โหลดรายการ    │                     │
│  │    ตรวจสลิป     │      │    สลิปที่ส่งมา   │                     │
│  └────────────────┘      └───────┬────────┘                     │
│                                  ▼                              │
│              ┌───────────────────────────────────────┐          │
│              │ 6. ตรวจสอบสลิป เปรียบเทียบกับยอดค้างชำระ  │          │
│              └───────────┬───────────────────────────┘          │
│                          │                                      │
│         ┌────────────────┼────────────────┐                     │
│         ▼                                 ▼                     │
│  ┌──────────────┐                ┌──────────────┐               │
│  │ 7a. อนุมัติ   │                │ 7b. ปฏิเสธ   │               │
│  │    ✓ Approve │                │    ✗ Reject  │               │
│  └──────┬───────┘                └──────┬───────┘               │
│         │                               │                       │
│         ▼                               ▼                       │
│  ┌──────────────┐                ┌──────────────┐               │
│  │ 8a. แจ้งผู้พัก │                │ 8b. แจ้งผู้พัก │               │
│  │    อนุมัติแล้ว │                │    พร้อมเหตุผล│               │
│  └──────────────┘                └──────────────┘               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 7.3 Flow การยื่นคำร้องและลำดับคิว

```
┌──────────────────────────────────────────────────────────────────┐
│  ผู้ยื่นคำร้อง (ครูใหม่/ผู้ต้องการบ้านพัก)                            │
│  ┌────────────────┐      ┌────────────────┐                     │
│  │ 1. กรอกแบบฟอร์ม │ ──▶ │ 2. แนบเอกสาร    │                     │
│  │    คำร้อง       │      │    ประกอบ       │                     │
│  └────────────────┘      └───────┬────────┘                     │
│                                  ▼                              │
│                 ┌──────────────────────────────┐                │
│                 │ 3. ส่งคำร้อง                  │                │
│                 └───────────┬──────────────────┘                │
│                             │                                   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  ผู้ตรวจคำร้อง/ลำดับคิว                                             │
│  ┌────────────────┐      ┌────────────────┐                     │
│  │ 4. รับคำร้อง    │ ──▶ │ 5. ตรวจสอบ      │                     │
│  │    เข้ามา      │      │    เอกสาร       │                     │
│  └────────────────┘      └───────┬────────┘                     │
│                                  │                              │
│         ┌────────────────────────┼────────────────┐             │
│         ▼                        ▼                ▼             │
│  ┌──────────────┐        ┌──────────────┐  ┌──────────────┐     │
│  │ 6a. อนุมัติ   │        │ 6b. เข้าคิว   │  │ 6c. ปฏิเสธ   │     │
│  │  (มีบ้านว่าง) │        │  (ไม่มีบ้านว่าง)│  │  (ไม่ผ่านเงื่อนไข)│     │
│  └──────┬───────┘        └──────┬───────┘  └──────┬───────┘     │
│         │                       │                  │             │
│         ▼                       ▼                  ▼             │
│  ┌──────────────┐        ┌──────────────┐  ┌──────────────┐     │
│  │ 7a. แจ้งผู้พัก │        │ 7b. แจ้งลำดับ  │  │ 7c. แจ้งผู้พัก │     │
│  │    + กำหนด   │        │    คิวรอ      │  │    พร้อมเหตุผล│     │
│  │    บ้านพัก    │        └──────────────┘  └──────────────┘     │
│  └──────────────┘                                                │
│                                                                  │
│                          【เมื่อมีบ้านว่าง】                          │
│                                  │                              │
│                                  ▼                              │
│                 ┌──────────────────────────────┐                │
│                 │ 8. เรียกลำดับคิวถัดไป          │                │
│                 │    แจ้งให้เข้ารับบ้านพัก        │                │
│                 └──────────────────────────────┘                │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 8. แผนการพัฒนาต่อไป

### 8.1 สิ่งที่ต้องทำพรุ่งนี้ (14 ก.พ. 2569)

#### 📁 สร้างโฟลเดอร์ใน Google Drive
- [ ] สร้างโฟลเดอร์หลัก "HOME PPK 2026"
- [ ] สร้างโฟลเดอร์ย่อย: Data, Slips, Documents, Backups, Scripts
- [ ] สร้างโฟลเดอร์ย่อยใน Slips ตามปี/เดือน

#### 📊 สร้าง Google Sheets
- [ ] [MAIN] ฐานข้อมูลหลัก.gsheet - พร้อม Sheets: Housing, Residents, Users, Permissions, Settings, Announcements, Logs
- [ ] [BILLS] ค่าน้ำค่าไฟ.gsheet - พร้อม Sheets: WaterBills, ElectricBills, WaterRates, ElectricRates, CommonFee, Exemptions
- [ ] [PAYMENTS] การชำระเงิน.gsheet - พร้อม Sheets: SlipSubmissions, SlipApprovals, PaymentHistory, Outstanding
- [ ] [REQUESTS] คำร้อง.gsheet - พร้อม Sheets: ResidenceRequests, TransferRequests, ReturnRequests, RepairRequests, Queue
- [ ] [ACCOUNTING] บัญชี.gsheet - พร้อม Sheets: Income, Expense, MonthlyWithdraw, Summary, Annual

#### 📝 สร้าง Header Row สำหรับแต่ละ Sheet
- [ ] ใส่ชื่อคอลัมน์ตามที่กำหนดในเอกสารนี้
- [ ] จัดรูปแบบ Header (สี, Font, Freeze)
- [ ] ใส่ Data Validation ที่จำเป็น

#### 📝 สร้าง Google Apps Script Project
- [ ] สร้าง Project ใหม่ผูกกับ [MAIN] Spreadsheet
- [ ] สร้างไฟล์ .gs ทั้งหมดตามโครงสร้าง
- [ ] ใส่ Spreadsheet IDs และ Folder IDs ใน Config.gs

### 8.2 สิ่งที่ต้องทำต่อไป (ภายหลัง)

- [ ] เขียนฟังก์ชันใน Apps Script ทีละไฟล์
- [ ] ทดสอบ API แต่ละ endpoint
- [ ] เชื่อม Frontend HTML กับ Backend Apps Script
- [ ] ทดสอบระบบทั้งหมด
- [ ] Deploy Web App
- [ ] ทำ User Acceptance Test (UAT)
- [ ] Go-live

### 8.3 ลำดับความสำคัญในการพัฒนา

| ลำดับ | Module | ความสำคัญ | หมายเหตุ |
|-------|--------|----------|---------|
| 1 | Config + Auth | สูงมาก | พื้นฐานที่ต้องมีก่อน |
| 2 | Housing + Residents | สูงมาก | ข้อมูลหลักของระบบ |
| 3 | WaterBills + ElectricBills | สูง | ฟังก์ชันหลักที่ใช้ทุกเดือน |
| 4 | Payments + Slips | สูง | การชำระเงิน |
| 5 | Notifications | ปานกลาง | แจ้งเตือนทาง Email |
| 6 | Requests + Queue | ปานกลาง | คำร้องต่างๆ |
| 7 | Accounting | ปานกลาง | บัญชี/การเงิน |
| 8 | Reports | ต่ำ | รายงาน (ทำทีหลังได้) |

---

## 📝 หมายเหตุ

- เอกสารนี้จะถูกอัพเดทเมื่อมีการเปลี่ยนแปลงโครงสร้างหรือเพิ่มฟีเจอร์ใหม่
- สำรองเอกสารนี้ไว้ในที่ปลอดภัย
- ถ้ามีข้อสงสัย ดูโครงสร้างข้อมูลจากไฟล์ HTML ที่มีอยู่

---

**จัดทำโดย:** GitHub Copilot  
**วันที่:** 13 กุมภาพันธ์ 2569
