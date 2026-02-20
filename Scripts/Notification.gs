/**
 * ============================================================================
 * HOME PPK 2026 - Notification.gs — 📧 แจ้งเตือนทาง Email
 * ============================================================================
 * ส่ง Email แจ้งเตือน, ใบเสร็จ, เตือนชำระ ผ่าน MailApp
 * 
 * ฟีเจอร์:
 *   - Payment: sendPaymentNotification, sendBulkNotifications
 *   - Reminder: sendPaymentReminder, sendBulkReminders
 *   - Receipt: sendReceipt, sendBulkReceipts
 *   - Password: sendPasswordResetEmail
 *   - Request: sendRequestStatusEmail
 *   - Router: handleSendNotification
 *   - Template: buildEmailTemplate
 *   - Batch: sendEmailBatch, processPendingEmails
 * 
 * Version: 1.0
 * วันที่สร้าง: 17 กุมภาพันธ์ 2569
 * Step: 25 (ระยะที่ 2)
 * ============================================================================
 * 
 * Dependencies: Config.gs, Database.gs, Housing.gs, Billing.gs, Payment.gs
 * 
 * Limits:
 *   - MailApp free tier: 100 email/วัน
 *   - Batch size: ≤ 50 คน/execution
 *   - ใช้ MailApp (ไม่ใช่ GmailApp) เพื่อ quota แยก
 *   - Trigger ส่งต่อทุก 5 นาที ถ้า batch > 50
 * 
 * ============================================================================
 */

// ============================================================================
// CONSTANTS
// ============================================================================

var EMAIL_BATCH_SIZE = 50;  // ส่งสูงสุดต่อ execution
var EMAIL_APP_NAME = 'HOME PPK 2026 — ระบบบ้านพักครู';
var EMAIL_TRIGGER_DELAY_MS = 5 * 60 * 1000; // 5 นาที

// ============================================================================
// ROUTER — handleSendNotification
// ============================================================================

/**
 * Router สำหรับ notification types
 * เรียกจาก Main.gs POST route 'sendNotification'
 * @param {Object} data - { type, period, houseId, ... }
 * @returns {Object} { success, message }
 */
function handleSendNotification(data) {
  var type = data.type || '';

  switch (type) {
    case 'paymentNotification':
      return data.houseId
        ? sendPaymentNotification(data.houseId, data.period)
        : sendBulkNotifications(data.period);

    case 'paymentReminder':
      return data.houseId
        ? sendPaymentReminder(data.houseId, data.period)
        : sendBulkReminders(data.period);

    case 'receipt':
      return data.houseId
        ? sendReceipt(data.houseId, data.period, data)
        : sendBulkReceipts(data.period);

    case 'passwordReset':
      return sendPasswordResetEmail(data.email, data.resetLink);

    case 'requestStatus':
      return sendRequestStatusEmail(data.requestId, data.status, data);

    default:
      return { success: false, error: 'ประเภทการแจ้งเตือนไม่ถูกต้อง: ' + type };
  }
}

// ============================================================================
// PAYMENT NOTIFICATION — แจ้งยอดชำระ
// ============================================================================

/**
 * ส่งแจ้งยอดชำระรายบ้าน
 * @param {string} houseNumber - เลขบ้าน
 * @param {string} period - งวดเดือน
 * @returns {Object} { success, message }
 */
function sendPaymentNotification(houseNumber, period) {
  if (!houseNumber || !period) {
    return { success: false, error: 'กรุณาระบุเลขบ้านและงวดเดือน' };
  }

  // ดึงข้อมูลยอดชำระ
  var summary = getBillSummary(houseNumber, period);
  if (!summary.success) return summary;

  // ดึงข้อมูลผู้พัก
  var resident = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS, 'house_number', houseNumber);
  if (!resident) return { success: false, error: 'ไม่พบผู้พักอาศัยของบ้าน: ' + houseNumber };

  // ดึง email จาก Users
  var user = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.USERS, 'resident_id', resident.id);
  if (!user || !user.email) {
    return { success: false, error: 'ไม่พบอีเมลของผู้พัก: ' + houseNumber };
  }

  // ดึงวันกำหนดชำระ
  var dueDateResult = getDueDate();
  var dueDay = dueDateResult.dueDate || DEFAULTS.due_date;
  var parts = _parsePeriod(period);
  var monthName = THAI_MONTH_NAMES[parts.month] || parts.month;
  var dueDateStr = dueDay + ' ' + monthName + ' ' + parts.year;

  // สร้าง email
  var recipientName = (resident.prefix || '') + (resident.firstname || '') + ' ' + (resident.lastname || '');
  var html = buildEmailTemplate('reminder', {
    recipientName: recipientName.trim(),
    houseNumber: houseNumber,
    period: period,
    monthName: monthName,
    year: parts.year,
    waterBill: summary.summary.water,
    electricBill: summary.summary.electric,
    commonFee: summary.summary.commonFee,
    totalAmount: summary.summary.total,
    dueDate: dueDateStr,
    isExempt: summary.summary.isExempt
  });

  try {
    MailApp.sendEmail({
      to: user.email,
      subject: 'แจ้งยอดชำระค่าบ้านพัก ' + monthName + ' ' + parts.year,
      htmlBody: html,
      name: EMAIL_APP_NAME
    });

    writeLog('SEND_NOTIFICATION', 'SYSTEM',
      'แจ้งยอด: ' + houseNumber + ' → ' + user.email + ' (' + period + ')', 'Notification');

    return { success: true, message: 'ส่งแจ้งยอดสำเร็จ: ' + user.email };
  } catch (e) {
    writeLog('EMAIL_ERROR', 'SYSTEM',
      'ส่งแจ้งยอดไม่สำเร็จ: ' + user.email + ' — ' + e.message, 'Notification');
    return { success: false, error: 'ส่ง email ไม่สำเร็จ: ' + e.message };
  }
}

/**
 * ส่งแจ้งยอดทุกบ้าน (batch)
 * @param {string} period - งวดเดือน
 * @returns {Object} { success, message, sent, failed }
 */
function sendBulkNotifications(period) {
  if (!period) return { success: false, error: 'กรุณาระบุงวดเดือน' };

  var recipients = _getAllRecipients(period);
  if (recipients.length === 0) {
    return { success: false, error: 'ไม่พบผู้รับแจ้งเตือน' };
  }

  // แบ่ง batch
  var batches = [];
  for (var i = 0; i < recipients.length; i += EMAIL_BATCH_SIZE) {
    batches.push(recipients.slice(i, i + EMAIL_BATCH_SIZE));
  }

  // ส่ง batch แรกทันที
  var firstResult = _sendNotificationBatch(batches[0], period, 'reminder');

  // ถ้ามี batch ถัดไป → ตั้ง Trigger
  if (batches.length > 1) {
    _schedulePendingEmails({
      type: 'reminder',
      batches: batches.slice(1),
      period: period
    });
  }

  return {
    success: true,
    message: 'ส่งแจ้งยอดสำเร็จ (batch 1/' + batches.length + ')',
    sent: firstResult.sent,
    failed: firstResult.failed,
    remaining: recipients.length - batches[0].length
  };
}

// ============================================================================
// PAYMENT REMINDER — เตือนค้างชำระ
// ============================================================================

/**
 * ส่งเตือนค้างชำระรายบ้าน
 * @param {string} houseNumber - เลขบ้าน
 * @param {string} period - งวดเดือน
 * @returns {Object} { success, message }
 */
function sendPaymentReminder(houseNumber, period) {
  if (!houseNumber || !period) {
    return { success: false, error: 'กรุณาระบุเลขบ้านและงวดเดือน' };
  }

  // ดึงข้อมูลยอดชำระ
  var summary = getBillSummary(houseNumber, period);
  if (!summary.success) return summary;

  // ดึงผู้พัก + email
  var resident = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS, 'house_number', houseNumber);
  if (!resident) return { success: false, error: 'ไม่พบผู้พัก: ' + houseNumber };

  var user = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.USERS, 'resident_id', resident.id);
  if (!user || !user.email) return { success: false, error: 'ไม่พบอีเมล: ' + houseNumber };

  var parts = _parsePeriod(period);
  var monthName = THAI_MONTH_NAMES[parts.month] || parts.month;
  var recipientName = ((resident.prefix || '') + (resident.firstname || '') + ' ' + (resident.lastname || '')).trim();

  var html = buildEmailTemplate('overdue', {
    recipientName: recipientName,
    houseNumber: houseNumber,
    period: period,
    monthName: monthName,
    year: parts.year,
    totalAmount: summary.summary.total,
    waterBill: summary.summary.water,
    electricBill: summary.summary.electric,
    commonFee: summary.summary.commonFee
  });

  try {
    MailApp.sendEmail({
      to: user.email,
      subject: '⚠️ เตือนค้างชำระค่าบ้านพัก ' + monthName + ' ' + parts.year,
      htmlBody: html,
      name: EMAIL_APP_NAME
    });

    writeLog('SEND_REMINDER', 'SYSTEM',
      'เตือนค้างชำระ: ' + houseNumber + ' → ' + user.email, 'Notification');

    return { success: true, message: 'ส่งเตือนค้างชำระสำเร็จ: ' + user.email };
  } catch (e) {
    writeLog('EMAIL_ERROR', 'SYSTEM', 'เตือนค้างชำระไม่สำเร็จ: ' + e.message, 'Notification');
    return { success: false, error: 'ส่ง email ไม่สำเร็จ: ' + e.message };
  }
}

/**
 * ส่งเตือนค้างชำระทุกบ้าน (batch)
 * @param {string} period - งวดเดือน
 * @returns {Object} { success, message }
 */
function sendBulkReminders(period) {
  if (!period) return { success: false, error: 'กรุณาระบุงวดเดือน' };

  // ดึงรายการค้างชำระ
  var outstanding = getOutstanding(period);
  if (!outstanding.success || !outstanding.data || outstanding.data.length === 0) {
    return { success: true, message: 'ไม่มีรายการค้างชำระ', sent: 0 };
  }

  var recipients = [];
  outstanding.data.forEach(function(item) {
    if (Number(item.balance) > 0) {
      var resident = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS, 'house_number', item.house_number);
      if (resident) {
        var user = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.USERS, 'resident_id', resident.id);
        if (user && user.email) {
          recipients.push({
            email: user.email,
            houseNumber: item.house_number,
            residentName: ((resident.prefix || '') + (resident.firstname || '') + ' ' + (resident.lastname || '')).trim(),
            totalAmount: Number(item.balance) || 0
          });
        }
      }
    }
  });

  if (recipients.length === 0) {
    return { success: true, message: 'ไม่มีผู้รับเตือน', sent: 0 };
  }

  var result = _sendNotificationBatch(recipients, period, 'overdue');

  return {
    success: true,
    message: 'ส่งเตือนค้างชำระสำเร็จ',
    sent: result.sent,
    failed: result.failed
  };
}

// ============================================================================
// RECEIPT — ใบเสร็จ
// ============================================================================

/**
 * ส่งใบเสร็จหลังอนุมัติ
 * @param {string} houseNumber - เลขบ้าน
 * @param {string} period - งวดเดือน
 * @param {Object} data - { amount, paymentDate, paymentMethod, approvedBy }
 * @returns {Object} { success, message }
 */
function sendReceipt(houseNumber, period, data) {
  if (!houseNumber || !period) {
    return { success: false, error: 'กรุณาระบุเลขบ้านและงวดเดือน' };
  }

  var resident = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS, 'house_number', houseNumber);
  if (!resident) return { success: false, error: 'ไม่พบผู้พัก: ' + houseNumber };

  var user = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.USERS, 'resident_id', resident.id);
  if (!user || !user.email) return { success: false, error: 'ไม่พบอีเมล: ' + houseNumber };

  var parts = _parsePeriod(period);
  var monthName = THAI_MONTH_NAMES[parts.month] || parts.month;
  var recipientName = ((resident.prefix || '') + (resident.firstname || '') + ' ' + (resident.lastname || '')).trim();

  var html = buildEmailTemplate('receipt', {
    recipientName: recipientName,
    houseNumber: houseNumber,
    period: period,
    monthName: monthName,
    year: parts.year,
    amount: data.amount || 0,
    paymentDate: data.paymentDate || data.payment_date || '',
    paymentMethod: data.paymentMethod || data.payment_method || 'transfer',
    approvedBy: data.approvedBy || data.approved_by || 'ผู้ดูแลระบบ'
  });

  try {
    MailApp.sendEmail({
      to: user.email,
      subject: '✅ ใบเสร็จรับเงินค่าบ้านพัก ' + monthName + ' ' + parts.year,
      htmlBody: html,
      name: EMAIL_APP_NAME
    });

    writeLog('SEND_RECEIPT', 'SYSTEM',
      'ใบเสร็จ: ' + houseNumber + ' → ' + user.email, 'Notification');

    return { success: true, message: 'ส่งใบเสร็จสำเร็จ: ' + user.email };
  } catch (e) {
    writeLog('EMAIL_ERROR', 'SYSTEM', 'ส่งใบเสร็จไม่สำเร็จ: ' + e.message, 'Notification');
    return { success: false, error: 'ส่ง email ไม่สำเร็จ: ' + e.message };
  }
}

/**
 * ส่งใบเสร็จหลายบ้าน (batch)
 * @param {string} period - งวดเดือน
 * @returns {Object} { success, message, sent }
 */
function sendBulkReceipts(period) {
  if (!period) return { success: false, error: 'กรุณาระบุงวดเดือน' };

  var parts = _parsePeriod(period);
  if (!parts) return { success: false, error: 'รูปแบบงวดไม่ถูกต้อง' };

  // ดึงรายการ approved ของเดือนนี้
  var slipSheetName = getYearSheetName('SlipSubmissions', parts.year);
  var recipients = [];

  try {
    var slips = readSheetData(SPREADSHEET_IDS.PAYMENTS, slipSheetName);
    var approved = slips.filter(function(s) {
      return String(s.month) === parts.month && s.status === 'approved';
    });

    approved.forEach(function(slip) {
      var resident = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS,
        'house_number', slip.house_number);
      if (resident) {
        var user = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.USERS, 'resident_id', resident.id);
        if (user && user.email) {
          recipients.push({
            email: user.email,
            houseNumber: slip.house_number,
            residentName: ((resident.prefix || '') + (resident.firstname || '') + ' ' + (resident.lastname || '')).trim(),
            amount: Number(slip.paid_amount) || 0,
            paymentDate: slip.reviewed_at || '',
            paymentMethod: slip.payment_method || 'transfer',
            approvedBy: slip.reviewed_by || 'ผู้ดูแลระบบ'
          });
        }
      }
    });
  } catch (e) {
    return { success: true, message: 'ไม่มีใบเสร็จที่ต้องส่ง', sent: 0 };
  }

  if (recipients.length === 0) {
    return { success: true, message: 'ไม่มีใบเสร็จที่ต้องส่ง', sent: 0 };
  }

  var result = _sendNotificationBatch(recipients, period, 'receipt');

  return {
    success: true,
    message: 'ส่งใบเสร็จสำเร็จ',
    sent: result.sent,
    failed: result.failed
  };
}

// ============================================================================
// PASSWORD RESET — ส่ง email รีเซ็ตรหัสผ่าน
// ============================================================================

/**
 * ส่ง email รีเซ็ตรหัสผ่าน
 * @param {string} email - อีเมลผู้รับ
 * @param {string} resetLink - ลิงก์รีเซ็ต
 * @returns {Object} { success, message }
 */
function sendPasswordResetEmail(email, resetLink) {
  if (!email) return { success: false, error: 'กรุณาระบุอีเมล' };
  if (!resetLink) return { success: false, error: 'กรุณาระบุลิงก์รีเซ็ต' };

  // ดึงชื่อผู้ใช้
  var user = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.USERS, 'email', email);
  var recipientName = 'ผู้ใช้งาน';
  if (user && user.resident_id) {
    var resident = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS, 'id', user.resident_id);
    if (resident) {
      recipientName = ((resident.prefix || '') + (resident.firstname || '') + ' ' + (resident.lastname || '')).trim();
    }
  }

  var html = buildEmailTemplate('password_reset', {
    recipientName: recipientName,
    resetLink: resetLink
  });

  try {
    MailApp.sendEmail({
      to: email,
      subject: '🔑 รีเซ็ตรหัสผ่าน — ' + EMAIL_APP_NAME,
      htmlBody: html,
      name: EMAIL_APP_NAME
    });

    writeLog('SEND_RESET', 'SYSTEM', 'รีเซ็ตรหัส → ' + email, 'Notification');
    return { success: true, message: 'ส่ง email รีเซ็ตรหัสผ่านสำเร็จ' };
  } catch (e) {
    writeLog('EMAIL_ERROR', 'SYSTEM', 'รีเซ็ตรหัส → ' + email + ': ' + e.message, 'Notification');
    return { success: false, error: 'ส่ง email ไม่สำเร็จ: ' + e.message };
  }
}

// ============================================================================
// REQUEST STATUS — แจ้งผลคำร้อง
// ============================================================================

/**
 * ส่ง email แจ้งผลคำร้อง
 * @param {string} requestId - Request ID
 * @param {string} status - สถานะ (approved/rejected/waiting)
 * @param {Object} data - { type, year, note }
 * @returns {Object} { success, message }
 */
function sendRequestStatusEmail(requestId, status, data) {
  if (!requestId) return { success: false, error: 'กรุณาระบุ request ID' };

  var type = data.type || 'residence';
  var year = data.year || String(CURRENT_YEAR);

  // ดึงข้อมูลคำร้อง
  var detailResult = getRequestDetail(type, year, requestId);
  if (!detailResult.success || !detailResult.data) {
    return { success: false, error: 'ไม่พบคำร้อง: ' + requestId };
  }

  var request = detailResult.data;
  var email = request.email;
  if (!email) {
    // ค้น email จาก user_id
    if (request.user_id) {
      var user = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.USERS, 'id', request.user_id);
      if (user) email = user.email;
    }
  }

  if (!email) return { success: false, error: 'ไม่พบอีเมลของผู้ส่งคำร้อง' };

  var recipientName = ((request.prefix || '') + (request.firstname || '') + ' ' + (request.lastname || '')).trim();
  var requestTypeName = {
    'residence': 'ขอเข้าพักอาศัย',
    'transfer': 'ขอย้ายบ้านพัก',
    'return': 'ขอคืนบ้านพัก',
    'repair': 'แจ้งซ่อมแซม'
  }[type] || type;

  var statusName = {
    'approved': 'อนุมัติ',
    'rejected': 'ไม่อนุมัติ',
    'waiting': 'รอคิว',
    'completed': 'ดำเนินการเสร็จสิ้น'
  }[status] || status;

  var html = buildEmailTemplate('request_status', {
    recipientName: recipientName,
    requestType: requestTypeName,
    requestId: requestId,
    status: statusName,
    statusCode: status,
    note: data.note || request.review_note || '',
    assignedHouse: data.assigned_house || request.assigned_house || ''
  });

  try {
    MailApp.sendEmail({
      to: email,
      subject: 'ผลคำร้อง' + requestTypeName + ' — ' + statusName,
      htmlBody: html,
      name: EMAIL_APP_NAME
    });

    writeLog('SEND_REQUEST_STATUS', 'SYSTEM',
      'แจ้งผลคำร้อง: ' + requestId + ' → ' + email + ' (' + status + ')', 'Notification');

    return { success: true, message: 'แจ้งผลคำร้องสำเร็จ: ' + email };
  } catch (e) {
    writeLog('EMAIL_ERROR', 'SYSTEM', 'แจ้งผลคำร้อง: ' + e.message, 'Notification');
    return { success: false, error: 'ส่ง email ไม่สำเร็จ: ' + e.message };
  }
}

// ============================================================================
// EMAIL TEMPLATE — สร้าง HTML template สำหรับ Email
// ============================================================================

/**
 * สร้าง HTML template สำหรับ Email
 * @param {string} type - 'reminder' | 'overdue' | 'receipt' | 'password_reset' | 'request_status'
 * @param {Object} data - ข้อมูลสำหรับ template
 * @returns {string} HTML string
 */
function buildEmailTemplate(type, data) {
  var body = '';

  switch (type) {
    case 'reminder':
      body = _templateReminder(data);
      break;
    case 'overdue':
      body = _templateOverdue(data);
      break;
    case 'receipt':
      body = _templateReceipt(data);
      break;
    case 'password_reset':
      body = _templatePasswordReset(data);
      break;
    case 'request_status':
      body = _templateRequestStatus(data);
      break;
    default:
      body = '<p>ไม่มี template สำหรับ: ' + type + '</p>';
  }

  return _wrapEmailLayout(body);
}

// ── Template: แจ้งยอดชำระ ──
function _templateReminder(data) {
  var exemptNote = data.isExempt ? '<p style="color:#e67e22;font-weight:bold;">* ได้รับการยกเว้นค่าส่วนกลาง</p>' : '';

  return '<h2 style="color:#2c3e50;">แจ้งยอดชำระค่าบ้านพัก</h2>' +
    '<p>เรียน คุณ' + (data.recipientName || '') + '</p>' +
    '<p>เดือน <strong>' + (data.monthName || data.period || '') + ' ' + (data.year || '') + '</strong></p>' +
    '<table style="width:100%;border-collapse:collapse;margin:15px 0;">' +
    '<tr style="background:#f8f9fa;"><td style="padding:10px;border:1px solid #dee2e6;">บ้านเลขที่</td>' +
    '<td style="padding:10px;border:1px solid #dee2e6;font-weight:bold;">' + (data.houseNumber || '') + '</td></tr>' +
    '<tr><td style="padding:10px;border:1px solid #dee2e6;">ค่าน้ำ</td>' +
    '<td style="padding:10px;border:1px solid #dee2e6;text-align:right;">' + _formatCurrency(data.waterBill) + ' บาท</td></tr>' +
    '<tr><td style="padding:10px;border:1px solid #dee2e6;">ค่าไฟ</td>' +
    '<td style="padding:10px;border:1px solid #dee2e6;text-align:right;">' + _formatCurrency(data.electricBill) + ' บาท</td></tr>' +
    '<tr><td style="padding:10px;border:1px solid #dee2e6;">ค่าส่วนกลาง</td>' +
    '<td style="padding:10px;border:1px solid #dee2e6;text-align:right;">' + _formatCurrency(data.commonFee) + ' บาท</td></tr>' +
    '<tr style="background:#d4edda;font-weight:bold;"><td style="padding:10px;border:1px solid #dee2e6;">รวมทั้งสิ้น</td>' +
    '<td style="padding:10px;border:1px solid #dee2e6;text-align:right;">' + _formatCurrency(data.totalAmount) + ' บาท</td></tr>' +
    '</table>' +
    exemptNote +
    '<p>กำหนดชำระ: <strong>' + (data.dueDate || '') + '</strong></p>' +
    '<p style="color:#7f8c8d;font-size:12px;">กรุณาชำระตามยอดและอัปโหลดสลิปผ่านระบบ HOME PPK 2026</p>';
}

// ── Template: เตือนค้างชำระ ──
function _templateOverdue(data) {
  return '<h2 style="color:#e74c3c;">⚠️ เตือนค้างชำระค่าบ้านพัก</h2>' +
    '<p>เรียน คุณ' + (data.recipientName || '') + '</p>' +
    '<p>ท่านมียอดค้างชำระเดือน <strong>' + (data.monthName || '') + ' ' + (data.year || '') + '</strong></p>' +
    '<table style="width:100%;border-collapse:collapse;margin:15px 0;">' +
    '<tr style="background:#f8f9fa;"><td style="padding:10px;border:1px solid #dee2e6;">บ้านเลขที่</td>' +
    '<td style="padding:10px;border:1px solid #dee2e6;font-weight:bold;">' + (data.houseNumber || '') + '</td></tr>' +
    '<tr><td style="padding:10px;border:1px solid #dee2e6;">ค่าน้ำ</td>' +
    '<td style="padding:10px;border:1px solid #dee2e6;text-align:right;">' + _formatCurrency(data.waterBill) + ' บาท</td></tr>' +
    '<tr><td style="padding:10px;border:1px solid #dee2e6;">ค่าไฟ</td>' +
    '<td style="padding:10px;border:1px solid #dee2e6;text-align:right;">' + _formatCurrency(data.electricBill) + ' บาท</td></tr>' +
    '<tr><td style="padding:10px;border:1px solid #dee2e6;">ค่าส่วนกลาง</td>' +
    '<td style="padding:10px;border:1px solid #dee2e6;text-align:right;">' + _formatCurrency(data.commonFee) + ' บาท</td></tr>' +
    '<tr style="background:#f8d7da;font-weight:bold;"><td style="padding:10px;border:1px solid #dee2e6;">ยอดค้างชำระ</td>' +
    '<td style="padding:10px;border:1px solid #dee2e6;text-align:right;color:#e74c3c;">' + _formatCurrency(data.totalAmount) + ' บาท</td></tr>' +
    '</table>' +
    '<p style="color:#e74c3c;font-weight:bold;">กรุณาชำระโดยเร็ว</p>' +
    '<p style="color:#7f8c8d;font-size:12px;">หากชำระแล้ว กรุณาอัปโหลดสลิปผ่านระบบ HOME PPK 2026</p>';
}

// ── Template: ใบเสร็จ ──
function _templateReceipt(data) {
  var methodText = {
    'transfer': 'โอนเงิน',
    'cash': 'เงินสด',
    'other': 'อื่นๆ'
  }[data.paymentMethod] || data.paymentMethod || 'โอนเงิน';

  return '<h2 style="color:#27ae60;">✅ ใบเสร็จรับเงินค่าบ้านพัก</h2>' +
    '<p>เรียน คุณ' + (data.recipientName || '') + '</p>' +
    '<p>เดือน <strong>' + (data.monthName || '') + ' ' + (data.year || '') + '</strong></p>' +
    '<table style="width:100%;border-collapse:collapse;margin:15px 0;">' +
    '<tr style="background:#f8f9fa;"><td style="padding:10px;border:1px solid #dee2e6;">บ้านเลขที่</td>' +
    '<td style="padding:10px;border:1px solid #dee2e6;font-weight:bold;">' + (data.houseNumber || '') + '</td></tr>' +
    '<tr><td style="padding:10px;border:1px solid #dee2e6;">จำนวนเงิน</td>' +
    '<td style="padding:10px;border:1px solid #dee2e6;text-align:right;font-weight:bold;">' + _formatCurrency(data.amount) + ' บาท</td></tr>' +
    '<tr><td style="padding:10px;border:1px solid #dee2e6;">วิธีชำระ</td>' +
    '<td style="padding:10px;border:1px solid #dee2e6;">' + methodText + '</td></tr>' +
    '<tr><td style="padding:10px;border:1px solid #dee2e6;">วันที่ชำระ</td>' +
    '<td style="padding:10px;border:1px solid #dee2e6;">' + (data.paymentDate || '') + '</td></tr>' +
    '<tr><td style="padding:10px;border:1px solid #dee2e6;">ตรวจสอบโดย</td>' +
    '<td style="padding:10px;border:1px solid #dee2e6;">' + (data.approvedBy || '') + '</td></tr>' +
    '</table>' +
    '<p style="color:#27ae60;font-weight:bold;">ขอบคุณที่ชำระตรงเวลา</p>';
}

// ── Template: รีเซ็ตรหัสผ่าน ──
function _templatePasswordReset(data) {
  return '<h2 style="color:#2c3e50;">🔑 รีเซ็ตรหัสผ่าน</h2>' +
    '<p>เรียน คุณ' + (data.recipientName || '') + '</p>' +
    '<p>เราได้รับคำขอรีเซ็ตรหัสผ่านของคุณ</p>' +
    '<p>กรุณาคลิกลิงก์ด้านล่างเพื่อตั้งรหัสผ่านใหม่:</p>' +
    '<p style="margin:20px 0;"><a href="' + (data.resetLink || '#') + '" ' +
    'style="background:#3498db;color:#fff;padding:12px 30px;text-decoration:none;border-radius:5px;font-weight:bold;">' +
    'ตั้งรหัสผ่านใหม่</a></p>' +
    '<p style="color:#7f8c8d;font-size:12px;">ลิงก์นี้จะหมดอายุใน 24 ชั่วโมง</p>' +
    '<p style="color:#7f8c8d;font-size:12px;">หากไม่ได้ร้องขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยอีเมลนี้</p>';
}

// ── Template: แจ้งผลคำร้อง ──
function _templateRequestStatus(data) {
  var statusColor = {
    'อนุมัติ': '#27ae60',
    'ไม่อนุมัติ': '#e74c3c',
    'รอคิว': '#f39c12',
    'ดำเนินการเสร็จสิ้น': '#27ae60'
  }[data.status] || '#2c3e50';

  var houseInfo = data.assignedHouse
    ? '<tr><td style="padding:10px;border:1px solid #dee2e6;">บ้านพักที่จัดให้</td>' +
      '<td style="padding:10px;border:1px solid #dee2e6;font-weight:bold;">' + data.assignedHouse + '</td></tr>'
    : '';

  var noteInfo = data.note
    ? '<tr><td style="padding:10px;border:1px solid #dee2e6;">หมายเหตุ</td>' +
      '<td style="padding:10px;border:1px solid #dee2e6;">' + data.note + '</td></tr>'
    : '';

  return '<h2 style="color:' + statusColor + ';">ผลคำร้อง' + (data.requestType || '') + '</h2>' +
    '<p>เรียน คุณ' + (data.recipientName || '') + '</p>' +
    '<table style="width:100%;border-collapse:collapse;margin:15px 0;">' +
    '<tr style="background:#f8f9fa;"><td style="padding:10px;border:1px solid #dee2e6;">เลขที่คำร้อง</td>' +
    '<td style="padding:10px;border:1px solid #dee2e6;">' + (data.requestId || '') + '</td></tr>' +
    '<tr><td style="padding:10px;border:1px solid #dee2e6;">ประเภท</td>' +
    '<td style="padding:10px;border:1px solid #dee2e6;">' + (data.requestType || '') + '</td></tr>' +
    '<tr><td style="padding:10px;border:1px solid #dee2e6;">สถานะ</td>' +
    '<td style="padding:10px;border:1px solid #dee2e6;font-weight:bold;color:' + statusColor + ';">' + (data.status || '') + '</td></tr>' +
    houseInfo + noteInfo +
    '</table>' +
    '<p style="color:#7f8c8d;font-size:12px;">ดูรายละเอียดเพิ่มเติมได้ที่ระบบ HOME PPK 2026</p>';
}

// ── Email Layout Wrapper ──
function _wrapEmailLayout(bodyHtml) {
  return '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1.0"></head>' +
    '<body style="font-family:\'Sarabun\',\'Noto Sans Thai\',sans-serif;margin:0;padding:0;background:#f5f5f5;">' +
    '<div style="max-width:600px;margin:20px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.1);">' +
    '<div style="background:#1a5276;color:#ffffff;padding:20px;text-align:center;">' +
    '<h1 style="margin:0;font-size:18px;">🏠 HOME PPK 2026</h1>' +
    '<p style="margin:5px 0 0;font-size:12px;opacity:0.8;">ระบบบริหารจัดการบ้านพักครู โรงเรียนพะเยาพิทยาคม</p>' +
    '</div>' +
    '<div style="padding:25px;">' + bodyHtml + '</div>' +
    '<div style="background:#f8f9fa;padding:15px;text-align:center;font-size:11px;color:#999;">' +
    '<p style="margin:0;">อีเมลนี้ส่งอัตโนมัติจากระบบ HOME PPK 2026 — กรุณาอย่าตอบกลับ</p>' +
    '<p style="margin:5px 0 0;">' + DEFAULTS.org_name + ' ' + DEFAULTS.school_name + '</p>' +
    '</div></div></body></html>';
}

// ============================================================================
// BATCH EMAIL — ส่ง email เป็น batch
// ============================================================================

/**
 * ส่ง email batch
 * @param {Array} recipients - [{ email, houseNumber, residentName, ... }]
 * @param {string} period - งวดเดือน
 * @param {string} templateType - ประเภท template
 * @returns {Object} { sent, failed }
 * @private
 */
function _sendNotificationBatch(recipients, period, templateType) {
  var parts = _parsePeriod(period);
  var monthName = parts ? (THAI_MONTH_NAMES[parts.month] || parts.month) : '';
  var year = parts ? parts.year : '';

  var sent = 0;
  var failed = 0;

  for (var i = 0; i < recipients.length; i++) {
    var r = recipients[i];
    try {
      var templateData = {
        recipientName: r.residentName || '',
        houseNumber: r.houseNumber || '',
        period: period,
        monthName: monthName,
        year: year,
        totalAmount: r.totalAmount || 0,
        waterBill: r.waterBill || 0,
        electricBill: r.electricBill || 0,
        commonFee: r.commonFee || 0,
        amount: r.amount || r.totalAmount || 0,
        paymentDate: r.paymentDate || '',
        paymentMethod: r.paymentMethod || 'transfer',
        approvedBy: r.approvedBy || 'ผู้ดูแลระบบ',
        isExempt: r.isExempt || false
      };

      // ดึง dueDate สำหรับ reminder
      if (templateType === 'reminder') {
        var dueDateResult = getDueDate();
        var dueDay = dueDateResult.dueDate || DEFAULTS.due_date;
        templateData.dueDate = dueDay + ' ' + monthName + ' ' + year;
      }

      var html = buildEmailTemplate(templateType, templateData);
      var subject = '';
      switch (templateType) {
        case 'reminder': subject = 'แจ้งยอดชำระค่าบ้านพัก ' + monthName + ' ' + year; break;
        case 'overdue': subject = '⚠️ เตือนค้างชำระค่าบ้านพัก ' + monthName + ' ' + year; break;
        case 'receipt': subject = '✅ ใบเสร็จรับเงินค่าบ้านพัก ' + monthName + ' ' + year; break;
        default: subject = EMAIL_APP_NAME;
      }

      MailApp.sendEmail({
        to: r.email,
        subject: subject,
        htmlBody: html,
        name: EMAIL_APP_NAME
      });

      sent++;
    } catch (e) {
      writeLog('EMAIL_ERROR', 'SYSTEM',
        'ส่ง email ไม่สำเร็จ: ' + (r.email || 'unknown') + ' — ' + e.message, 'Notification');
      failed++;
    }
  }

  return { sent: sent, failed: failed };
}

/**
 * ตั้ง Trigger ส่ง email pending
 * @param {Object} pendingData - { type, batches, period }
 * @private
 */
function _schedulePendingEmails(pendingData) {
  PropertiesService.getScriptProperties().setProperty(
    'pendingEmails',
    JSON.stringify(pendingData)
  );

  // ลบ Trigger เก่า
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'processPendingEmails') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger('processPendingEmails')
    .timeBased()
    .after(EMAIL_TRIGGER_DELAY_MS)
    .create();
}

/**
 * ส่ง email pending (เรียกจาก Trigger)
 */
function processPendingEmails() {
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty('pendingEmails');
  if (!raw) return;

  try {
    var pendingData = JSON.parse(raw);
    if (!pendingData.batches || pendingData.batches.length === 0) {
      props.deleteProperty('pendingEmails');
      return;
    }

    // ส่ง batch ถัดไป
    _sendNotificationBatch(pendingData.batches[0], pendingData.period, pendingData.type);

    // อัปเดต remaining
    if (pendingData.batches.length > 1) {
      pendingData.batches = pendingData.batches.slice(1);
      props.setProperty('pendingEmails', JSON.stringify(pendingData));

      // ตั้ง Trigger ถัดไป
      ScriptApp.newTrigger('processPendingEmails')
        .timeBased()
        .after(EMAIL_TRIGGER_DELAY_MS)
        .create();
    } else {
      props.deleteProperty('pendingEmails');
    }
  } catch (e) {
    props.deleteProperty('pendingEmails');
    writeLog('EMAIL_BATCH_ERROR', 'SYSTEM', 'processPendingEmails: ' + e.message, 'Notification');
  }

  // ลบ Trigger ตัวเอง
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'processPendingEmails') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

/**
 * ดึง recipients ทั้งหมด (ผู้พักทุกบ้านที่มี email)
 * @param {string} period - งวดเดือน
 * @returns {Array} [{ email, houseNumber, residentName, waterBill, electricBill, commonFee, totalAmount, isExempt }]
 * @private
 */
function _getAllRecipients(period) {
  var recipients = [];

  // ดึงสรุปยอดทุกบ้าน
  var summaryResult = getBillSummaryAll(period);
  if (!summaryResult.success || !summaryResult.data) return recipients;

  summaryResult.data.forEach(function(house) {
    // ค้น email ของผู้พัก
    var resident = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.RESIDENTS,
      'house_number', house.house_number);
    if (!resident) return;

    var user = findRowByValue(SPREADSHEET_IDS.MAIN, SHEET_NAMES.USERS, 'resident_id', resident.id);
    if (!user || !user.email) return;

    recipients.push({
      email: user.email,
      houseNumber: house.house_number,
      residentName: house.resident_name || '',
      waterBill: house.water_amount || 0,
      electricBill: house.electric_amount || 0,
      commonFee: house.common_fee || 0,
      totalAmount: house.total || 0,
      isExempt: house.is_exempt || false
    });
  });

  return recipients;
}

/**
 * จัดรูปแบบเงิน (เพิ่มจุลภาค)
 * @param {number} amount - จำนวนเงิน
 * @returns {string} เช่น '1,500.00'
 * @private
 */
function _formatCurrency(amount) {
  var num = Number(amount) || 0;
  return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ============================================================================
// END OF Notification.gs
// ============================================================================
