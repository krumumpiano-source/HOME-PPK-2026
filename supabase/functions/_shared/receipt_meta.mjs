/** Parse utility-receipt emails. Shared by the send-email archive and tests. */

export const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function clip(value, max) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function isReceiptRequest(body) {
  if (!body || typeof body !== 'object') return false;
  if (body.action === 'password_reset_otp') return false;
  if (body.receipt && typeof body.receipt === 'object') return true;
  return String(body.subject || '').includes('ใบเสร็จ');
}

function money(raw) {
  if (raw == null || raw === '') return null;
  const n = Number(String(raw).replace(/,/g, ''));
  if (!Number.isFinite(n) || n < 0 || n > 10000000) return null;
  return Math.round(n * 100) / 100;
}

function periodFromSubject(subject) {
  for (let i = 0; i < THAI_MONTHS.length; i++) {
    const idx = subject.indexOf(THAI_MONTHS[i]);
    if (idx < 0) continue;
    const year = subject.slice(idx + THAI_MONTHS[i].length).match(/(\d{4})/);
    if (!year) return '';
    return year[1] + '-' + String(i + 1).padStart(2, '0');
  }
  return '';
}

function houseFromSubject(subject) {
  const match = subject.match(/-\s*(?:บ้านพัก\s*)?([^\s].{0,80})$/);
  return match ? match[1].trim() : '';
}

function nameFromHtml(html) {
  const match = String(html || '').match(/เรียน\s*([^<]{1,200})/i);
  return match ? match[1].trim() : '';
}

function amountFromHtml(html) {
  const source = String(html || '');
  const paid = source.match(/ยอดที่ชำระ[\s\S]{0,240}?([0-9][0-9,]*(?:\.[0-9]+)?)\s*บาท/);
  if (paid) return money(paid[1]);
  const short = source.match(/ยอด:\s*([0-9][0-9,]*(?:\.[0-9]+)?)/);
  if (short) return money(short[1]);
  const total = source.match(/รวมทั้งสิ้น[\s\S]{0,240}?([0-9][0-9,]*(?:\.[0-9]+)?)\s*บาท/);
  return total ? money(total[1]) : null;
}

export function parseReceiptMeta(input) {
  const body = input || {};
  const explicit = body.receipt && typeof body.receipt === 'object' ? body.receipt : {};
  const subject = String(body.subject || '');
  const html = String(body.html || '');
  const to = Array.isArray(body.to) ? body.to[0] : body.to;
  const periodRaw = clip(explicit.period || periodFromSubject(subject), 7);
  const period = /^\d{4}-\d{2}$/.test(periodRaw) ? periodRaw : '';
  const parentRaw = String(explicit.parentId || '');
  return {
    houseNumber: clip(explicit.houseNumber || houseFromSubject(subject), 80),
    residentName: clip(explicit.residentName || nameFromHtml(html), 200),
    email: clip(explicit.email || to || '', 320),
    amount: explicit.amount != null && explicit.amount !== '' ? money(explicit.amount) : amountFromHtml(html),
    period,
    slipId: explicit.slipId ? clip(explicit.slipId, 80) : null,
    parentId: UUID_RE.test(parentRaw) ? parentRaw : null,
    simulateFail: explicit.simulate === 'fail',
  };
}

export function thaiBounceReason(diagnostic) {
  const text = clip(diagnostic || '', 180);
  if (/4\.2\.2|mailbox|quota|over quota|inbox is out of storage|full/i.test(text)) {
    return 'กล่องจดหมายของผู้รับเต็ม' + (text ? ' (' + text + ')' : '');
  }
  if (/nxdomain|5\.1\.2|domain name not found|badrcptdomain/i.test(text)) {
    return 'ไม่พบโดเมนหรือที่อยู่ผู้รับ' + (text ? ' (' + text + ')' : '');
  }
  if (/5\.1\.1|user unknown|does not exist|no such user/i.test(text)) {
    return 'ไม่พบบัญชีอีเมลนี้' + (text ? ' (' + text + ')' : '');
  }
  return text ? 'ส่งอีเมลไม่ถึงผู้รับ (' + text + ')' : 'ส่งอีเมลไม่ถึงผู้รับ';
}

/** Pull a delivery-failure notice out of a Gmail DSN. Delay notices are ignored. */
export function parseBounce(raw) {
  const text = String(raw || '');
  const failed = /Action:\s*failed/i.test(text) || /Delivery Status Notification \(Failure\)/i.test(text);
  if (!failed) return null;
  const recip = text.match(/Final-Recipient:\s*rfc822;\s*<?([^\s<>;,]+)/i);
  if (!recip) return null;
  const diag = text.match(/Diagnostic-Code:\s*([^\r\n]+)/i);
  const attempt = text.match(/Last-Attempt-Date:\s*([^\r\n]+)/i);
  let when = attempt ? new Date(attempt[1]) : new Date();
  if (Number.isNaN(when.getTime())) when = new Date();
  const ids = [];
  const idRe = /[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;
  let found;
  while ((found = idRe.exec(text))) ids.push(found[0].toLowerCase());
  return {
    email: recip[1].replace(/[<>]/g, '').trim().toLowerCase(),
    reason: thaiBounceReason(diag ? diag[1] : ''),
    when: when.toISOString(),
    ids,
  };
}
