// Bundled mailer. This file is what production runs: SMTP send plus a
// durable copy of every utility receipt (success and failure).
const ALLOWED_ORIGINS = ['https://home-ppk-2026.pages.dev','https://krumumpiano-source.github.io','http://localhost:3000','http://localhost:5500','http://127.0.0.1:5500','http://localhost:8080'];
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  return /^https:\/\/[a-z0-9-]+\.home-ppk-2026\.pages\.dev$/.test(origin);
}
function buildCors(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin! : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token, x-server-secret',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Vary': 'Origin',
  };
}
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encode as b64encode } from 'https://deno.land/std@0.168.0/encoding/base64.ts';
let headers: Record<string, string> = {};
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
}
function serviceKey(): string {
  return Deno.env.get('SB_SECRET_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
}
async function isAuthorizedCaller(req: Request, sb: any): Promise<boolean> {
  const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const serverSecret = (req.headers.get('x-server-secret') || '').trim();
  const secrets = [Deno.env.get('SEND_EMAIL_SECRET'), Deno.env.get('SB_SECRET_KEY'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')].filter((s): s is string => !!s && s.length >= 16);
  if (secrets.some((s) => s === serverSecret || s === bearer)) return true;
  const token = (req.headers.get('x-session-token') || '').trim();
  if (!token || token.length < 16 || token.length > 200) return false;
  const { data } = await sb.from('sessions').select('user_id').eq('token', token).gt('expires_at', new Date().toISOString()).limit(1);
  return !!(data && data.length);
}
async function sessionUserId(req: Request, sb: any): Promise<string | null> {
  const token = (req.headers.get('x-session-token') || '').trim();
  if (!token) return null;
  const { data } = await sb.from('sessions').select('user_id').eq('token', token).gt('expires_at', new Date().toISOString()).limit(1);
  return data && data[0] ? String(data[0].user_id) : null;
}
function b64(str: string): string { return b64encode(new TextEncoder().encode(str)); }
function mimeWord(str: string): string { return '=?UTF-8?B?' + b64(str) + '?='; }
function buildMime(opts: { from: string; to: string[]; subject: string; textBody: string; htmlBody: string; replyTo?: string; messageId?: string }): string {
  const boundary = '----=_Part_' + Date.now();
  const lines = ['From: ' + opts.from, 'To: ' + opts.to.join(', '), 'Subject: ' + mimeWord(opts.subject)];
  if (opts.messageId) lines.push('Message-ID: ' + opts.messageId);
  if (opts.replyTo) lines.push('Reply-To: ' + opts.replyTo);
  lines.push('MIME-Version: 1.0', 'Content-Type: multipart/alternative; boundary="' + boundary + '"', '');
  lines.push('--' + boundary, 'Content-Type: text/plain; charset="UTF-8"', 'Content-Transfer-Encoding: base64', '', b64(opts.textBody), '');
  lines.push('--' + boundary, 'Content-Type: text/html; charset="UTF-8"', 'Content-Transfer-Encoding: base64', '', b64(opts.htmlBody), '', '--' + boundary + '--');
  return lines.join('\r\n');
}
function smtpCode(resp: string): number {
  const all = resp.match(/(?:^|\r?\n)(\d{3}) /g);
  if (!all || !all.length) return 0;
  const last = all[all.length - 1].match(/(\d{3})/);
  return last ? Number(last[1]) : 0;
}
async function smtpSend(host: string, port: number, user: string, pass: string, rawMime: string, from: string, rcptTo: string[]) {
  const conn = await Deno.connectTls({ hostname: host, port });
  const dec = new TextDecoder(); const enc = new TextEncoder();
  async function readReply(): Promise<string> {
    const buf = new Uint8Array(4096); let result = '';
    while (true) {
      const n = await conn.read(buf);
      if (n === null) break;
      result += dec.decode(buf.subarray(0, n));
      if (/^\d{3} /m.test(result)) break;
    }
    return result.trim();
  }
  async function send(cmd: string): Promise<string> {
    await conn.write(enc.encode(cmd + '\r\n'));
    return readReply();
  }
  try {
    await readReply(); await send('EHLO localhost'); await send('AUTH LOGIN'); await send(btoa(user));
    const authResp = await send(btoa(pass));
    if (!authResp.startsWith('235')) throw new Error('SMTP auth failed: ' + authResp.slice(0, 180));
    await send('MAIL FROM:<' + from + '>');
    const rejected: string[] = [];
    for (const r of rcptTo) {
      const rcptResp = await send('RCPT TO:<' + r.trim() + '>');
      if (smtpCode(rcptResp) >= 400) rejected.push(rcptResp.slice(0, 300));
    }
    if (rejected.length) throw new Error('ปลายทางปฏิเสธจดหมาย: ' + rejected[0]);
    await send('DATA');
    await conn.write(enc.encode(rawMime.replace(/^\./gm, '..') + '\r\n.\r\n'));
    const dataResp = await readReply();
    if (!dataResp.startsWith('250')) throw new Error('SMTP DATA rejected: ' + dataResp.slice(0, 300));
    await send('QUIT');
  } finally { try { conn.close(); } catch (_e) { /* closed */ } }
}
function safeReason(err: unknown, secret: string): string {
  let msg = err instanceof Error ? err.message : String(err || 'fail');
  if (secret && secret.length > 4) msg = msg.split(secret).join('[redacted]');
  return msg.slice(0, 500);
}
async function loadGmail(sb: any) {
  let user = Deno.env.get('GMAIL_USER') || '';
  let pass = Deno.env.get('GMAIL_APP_PASSWORD') || '';
  let fromName = Deno.env.get('EMAIL_FROM_NAME') || 'HOME PPK';
  if (!user || !pass) {
    const { data: rows } = await sb.from('settings').select('key,value').in('key', ['gmail_app_password','email_from','email_from_name']);
    const m: Record<string, string> = {};
    (rows || []).forEach((r: any) => { m[r.key] = r.value; });
    if (!user) user = m['email_from'] || '';
    if (!pass) pass = m['gmail_app_password'] || '';
    fromName = m['email_from_name'] || fromName;
  }
  if (!user || !pass) return { error: 'ยังไม่ได้ตั้งค่าอีเมลและ Gmail App Password ในหน้าแอดมิน' };
  if (fromName.length > 78) fromName = fromName.substring(0, 78);
  return { user, pass, fromName };
}
const MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function clip(value: any, max: number) { return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max); }
function isReceipt(body: any) {
  if (!body || typeof body !== 'object' || body.action === 'password_reset_otp') return false;
  if (body.receipt && typeof body.receipt === 'object') return true;
  return String(body.subject || '').includes('ใบเสร็จ');
}
function money(raw: any) {
  if (raw == null || raw === '') return null;
  const n = Number(String(raw).replace(/,/g, ''));
  if (!Number.isFinite(n) || n < 0 || n > 10000000) return null;
  return Math.round(n * 100) / 100;
}
function metaOf(input: any) {
  const body = input || {};
  const explicit = body.receipt && typeof body.receipt === 'object' ? body.receipt : {};
  const subject = String(body.subject || '');
  const html = String(body.html || '');
  const to = Array.isArray(body.to) ? body.to[0] : body.to;
  let period = '';
  for (let i = 0; i < MONTHS.length; i++) {
    const idx = subject.indexOf(MONTHS[i]);
    if (idx < 0) continue;
    const year = subject.slice(idx + MONTHS[i].length).match(/(\d{4})/);
    if (year) period = year[1] + '-' + String(i + 1).padStart(2, '0');
    break;
  }
  if (explicit.period && /^\d{4}-\d{2}$/.test(String(explicit.period))) period = String(explicit.period);
  const houseMatch = subject.match(/-\s*(?:บ้านพัก\s*)?([^\s].{0,80})$/);
  const nameMatch = html.match(/เรียน\s*([^<]{1,200})/i);
  let amount = explicit.amount != null && explicit.amount !== '' ? money(explicit.amount) : null;
  if (amount == null) {
    const paid = html.match(/ยอดที่ชำระ[\s\S]{0,240}?([0-9][0-9,]*(?:\.[0-9]+)?)\s*บาท/);
    const short = html.match(/ยอด:\s*([0-9][0-9,]*(?:\.[0-9]+)?)/);
    amount = paid ? money(paid[1]) : short ? money(short[1]) : null;
  }
  const parentRaw = String(explicit.parentId || '');
  return {
    houseNumber: clip(explicit.houseNumber || (houseMatch ? houseMatch[1].trim() : ''), 80),
    residentName: clip(explicit.residentName || (nameMatch ? nameMatch[1].trim() : ''), 200),
    email: clip(explicit.email || to || '', 320),
    amount, period,
    slipId: explicit.slipId ? clip(explicit.slipId, 80) : null,
    parentId: UUID_RE.test(parentRaw) ? parentRaw : null,
    simulateFail: explicit.simulate === 'fail',
  };
}
function escHtml(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c] as string));
}
async function sha256hex(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
serve(async (req: Request) => {
  headers = buildCors(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey());
    const body = await req.json();
    let { to, subject, html, text, replyTo } = body || {};
    if (body && body.action === 'password_reset_otp') {
      const origin = req.headers.get('origin');
      if (origin && !isAllowedOrigin(origin)) return json({ error: 'Origin not allowed' }, 403);
      const email = String(body.email || '').trim().toLowerCase();
      const generic = { success: true, emailSent: true };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) return json({ error: 'อีเมลไม่ถูกต้อง' }, 400);
      const { data: urows } = await sb.from('users').select('id,firstname').eq('email', email).limit(1);
      if (!urows || !urows.length) return json(generic);
      const { data: prev } = await sb.from('settings').select('value').eq('key', 'pw_reset_' + email).limit(1);
      if (prev && prev.length) {
        try { const pv = JSON.parse(prev[0].value || '{}'); if (pv.expires_at && new Date(pv.expires_at).getTime() - Date.now() > 14 * 60 * 1000) return json(generic); } catch (_e) { /* ignore */ }
      }
      const rnd = new Uint32Array(1); crypto.getRandomValues(rnd);
      const otp = String(rnd[0] % 1000000).padStart(6, '0');
      const otpHash = await sha256hex(otp + ':' + email);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const { data: rr, error: rerr } = await sb.rpc('rpc_request_password_reset', { p_email: email, p_otp_hash: otpHash, p_expires_at: expiresAt });
      if (rerr || !rr || !rr.success) return json({ error: 'เกิดข้อผิดพลาดในการขอรหัส OTP' }, 500);
      to = email; subject = '[HOME PPK] รหัส OTP สำหรับรีเซ็ตรหัสผ่าน'; replyTo = undefined;
      text = 'รหัส OTP: ' + otp;
      html = '<div style="font-family:Kanit,sans-serif"><h2>HOME PPK 2026</h2><p>สวัสดีคุณ ' + escHtml(urows[0].firstname || '') + '</p><p style="font-size:2rem;letter-spacing:8px">' + otp + '</p><p>หมดอายุภายใน 15 นาที</p></div>';
    } else if (!(await isAuthorizedCaller(req, sb))) {
      return json({ error: 'Unauthorized' }, 401);
    }
    if (!to || !subject) return json({ error: 'ต้องระบุ to และ subject' }, 400);
    const toList: string[] = Array.isArray(to) ? to : [to];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const addr of toList) {
      const trimmed = String(addr || '').trim();
      if (!trimmed || trimmed.length > 320 || !emailRegex.test(trimmed)) return json({ error: 'อีเมลไม่ถูกต้อง' }, 400);
    }
    const receipt = isReceipt({ ...body, to, subject, html });
    const meta = receipt ? metaOf({ ...body, to, subject, html }) : null;
    const textBody = text || subject;
    const htmlBody = html || '<div>' + (text || subject) + '</div>';
    const messageId = receipt ? '<' + crypto.randomUUID() + '@receipt.home-ppk>' : '';
    let archiveId: string | null = null;
    async function mark(status: string, reason?: string) {
      if (!archiveId) return;
      const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      if (status === 'sent') patch.sent_at = new Date().toISOString();
      if (reason) patch.failure_reason = reason.slice(0, 500);
      await sb.from('receipt_archives').update(patch).eq('id', archiveId);
    }
    if (receipt && meta) {
      try {
        const { data: row, error } = await sb.from('receipt_archives').insert({
          house_number: meta.houseNumber, resident_name: meta.residentName, email: String(meta.email || toList[0]).trim().toLowerCase(),
          amount: meta.amount, period: meta.period, subject: String(subject).slice(0, 500), html: String(htmlBody).slice(0, 200000),
          text_body: String(textBody).slice(0, 20000), status: 'pending', slip_id: meta.slipId, message_id: messageId,
          parent_id: meta.parentId, created_by: await sessionUserId(req, sb),
        }).select('id').single();
        if (!error && row) archiveId = row.id;
      } catch (_e) { /* still try to send */ }
    }
    if (meta && meta.simulateFail) {
      await mark('failed', 'จำลองการส่งไม่สำเร็จ (ไม่ได้ส่งอีเมลจริง)');
      return json({ success: false, error: 'จำลองการส่งไม่สำเร็จ', archiveId }, archiveId ? 422 : 500);
    }
    const creds = await loadGmail(sb);
    if ('error' in creds) { await mark('failed', creds.error); return json({ error: creds.error, archiveId }, 503); }
    const raw = buildMime({ from: mimeWord(creds.fromName) + ' <' + creds.user + '>', to: toList, subject, textBody, htmlBody, replyTo, messageId: messageId || undefined });
    try { await smtpSend('smtp.gmail.com', 465, creds.user, creds.pass, raw, creds.user, toList); }
    catch (err) { const reason = safeReason(err, creds.pass); await mark('failed', reason); return json({ error: 'ส่งอีเมลไม่สำเร็จ', archiveId }, 500); }
    await mark('sent');
    return json({ success: true, archiveId });
  } catch (_err) { return json({ error: 'ส่งอีเมลไม่สำเร็จ' }, 500); }
});
