import assert from 'node:assert/strict';
import { isReceiptRequest, parseReceiptMeta, parseBounce, thaiBounceReason } from './receipt_meta.mjs';

const flatHtml = `<p>เรียน นางสาวจงจิตร อินสุยะ</p><p>ยอดที่ชำระ</p><td>257 บาท</td>`;
const flat = parseReceiptMeta({
  subject: 'ใบเสร็จค่าสาธารณูปโภค ตุลาคม 2569 - แฟลต5',
  html: flatHtml,
  to: 'jongjit14mail@gmail.com',
});
assert.equal(flat.period, '2569-10');
assert.equal(flat.houseNumber, 'แฟลต5');
assert.equal(flat.residentName, 'นางสาวจงจิตร อินสุยะ');
assert.equal(flat.amount, 257);
assert.equal(flat.email, 'jongjit14mail@gmail.com');

const house = parseReceiptMeta({
  subject: '✅ ใบเสร็จค่าสาธารณูปโภค ตุลาคม 2569 - บ้านพัก บ้าน6',
  html: '<p>เรียน นางสาวครูภาษาจีน -</p><p>ยอด: 1,234 บาท</p>',
  to: 'usr-mqrj49dg@local.ppk',
});
assert.equal(house.houseNumber, 'บ้าน6');
assert.equal(house.amount, 1234);
assert.equal(house.period, '2569-10');

assert.equal(isReceiptRequest({ subject: 'แจ้งเตือนค่าสาธารณูปโภค' }), false);
assert.equal(isReceiptRequest({ action: 'password_reset_otp', subject: 'ใบเสร็จ' }), false);
assert.equal(isReceiptRequest({ subject: 'ใบเสร็จค่าสาธารณูปโภค ตุลาคม 2569 - แฟลต5' }), true);

const explicit = parseReceiptMeta({
  subject: 'ใบเสร็จ',
  to: 'old@example.com',
  receipt: {
    houseNumber: 'แฟลต1',
    residentName: 'ทดสอบ',
    email: 'new@example.com',
    amount: '80.5',
    period: '2569-11',
    slipId: 'slip-1',
    parentId: '11111111-1111-4111-8111-111111111111',
    simulate: 'fail',
  },
});
assert.equal(explicit.houseNumber, 'แฟลต1');
assert.equal(explicit.email, 'new@example.com');
assert.equal(explicit.amount, 80.5);
assert.equal(explicit.period, '2569-11');
assert.equal(explicit.parentId, '11111111-1111-4111-8111-111111111111');
assert.equal(explicit.simulateFail, true);
assert.equal(parseReceiptMeta({ subject: 'ใบเสร็จ', receipt: { parentId: 'not-a-uuid' } }).parentId, null);

assert.match(thaiBounceReason('452 4.2.2 The recipient inbox is out of storage'), /กล่องจดหมาย/);
assert.match(thaiBounceReason("DNS Error: DNS type 'mx' lookup of local.ppk responded with code NXDOMAIN"), /ไม่พบโดเมน/);

const bounce = parseBounce(`Delivery Status Notification (Failure)
Final-Recipient: rfc822; usr-mqrj49dg@local.ppk
Action: failed
Diagnostic-Code: smtp; DNS Error: NXDOMAIN
Last-Attempt-Date: Mon, 02 Nov 2026 00:47:45 -0800 (PST)
Message-ID: <11111111-1111-4111-8111-111111111111@receipt.home-ppk>`);
assert.equal(bounce.email, 'usr-mqrj49dg@local.ppk');
assert.equal(bounce.ids[0], '11111111-1111-4111-8111-111111111111');
assert.equal(parseBounce('Action: delayed\nFinal-Recipient: rfc822; a@b.com'), null);

console.log('receipt_meta tests passed');
