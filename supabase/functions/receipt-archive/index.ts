// Staff archive for utility receipts. verify_jwt is off because HOME PPK
// uses its own session token; this function checks that token itself.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function clipText(value: any, max: number) { return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max); }
function thaiBounceReason(diagnostic: string) {
  const text = clipText(diagnostic || '', 180);
  if (/4\.2\.2|mailbox|quota|over quota|full/i.test(text)) return 'กล่องจดหมายของผู้รับเต็ม' + (text ? ' (' + text + ')' : '');
  if (/nxdomain|5\.1\.2|domain name not found/i.test(text)) return 'ไม่พบโดเมนหรือที่อยู่ผู้รับ' + (text ? ' (' + text + ')' : '');
  if (/5\.1\.1|user unknown|does not exist/i.test(text)) return 'ไม่พบบัญชีอีเมลนี้' + (text ? ' (' + text + ')' : '');
  return text ? 'ส่งอีเมลไม่ถึงผู้รับ (' + text + ')' : 'ส่งอีเมลไม่ถึงผู้รับ';
}
function parseBounce(raw: string) {
  const text = String(raw || '');
  if (!/Action:\s*failed/i.test(text) && !/Delivery Status Notification \(Failure\)/i.test(text)) return null;
  const recip = text.match(/Final-Recipient:\s*rfc822;\s*<?([^\s<>;,]+)/i);
  if (!recip) return null;
  const diag = text.match(/Diagnostic-Code:\s*([^\r\n]+)/i);
  const attempt = text.match(/Last-Attempt-Date:\s*([^\r\n]+)/i);
  let when = attempt ? new Date(attempt[1]) : new Date();
  if (Number.isNaN(when.getTime())) when = new Date();
  const ids: string[] = [];
  const idRe = /[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;
  let found: RegExpExecArray | null;
  while ((found = idRe.exec(text))) ids.push(found[0].toLowerCase());
  return { email: recip[1].replace(/[<>]/g, '').trim().toLowerCase(), reason: thaiBounceReason(diag ? diag[1] : ''), when: when.toISOString(), ids };
}

const ALLOWED = ['https://home-ppk-2026.pages.dev','https://krumumpiano-source.github.io','http://localhost:3000','http://localhost:5500','http://127.0.0.1:5500','http://localhost:8080'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function cors(req: Request) {
  const origin = req.headers.get('origin');
  const ok = !!origin && (ALLOWED.includes(origin) || /^https:\/\/[a-z0-9-]+\.home-ppk-2026\.pages\.dev$/.test(origin));
  return {
    'Access-Control-Allow-Origin': ok ? origin! : ALLOWED[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token, x-server-secret',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Vary': 'Origin',
  };
}
function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
function serviceKey() { return Deno.env.get('SB_SECRET_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''; }
async function staffUser(sb: any, userId: string) {
  const { data: users } = await sb.from('users').select('id,role,prefix,firstname,lastname,is_active').eq('id', userId).limit(1);
  const user = users && users[0];
  if (!user || user.is_active === false) return null;
  if (user.role === 'admin' || user.role === 'head') return user;
  const { data: perms } = await sb.from('permissions').select('permission').eq('user_id', userId).eq('permission', 'slip').limit(1);
  return perms && perms.length ? user : null;
}
async function requireStaff(req: Request, sb: any) {
  const token = (req.headers.get('x-session-token') || '').trim();
  if (!token || token.length < 16 || token.length > 200) return null;
  const { data } = await sb.from('sessions').select('user_id').eq('token', token).gt('expires_at', new Date().toISOString()).limit(1);
  if (!data || !data[0]) return null;
  const user = await staffUser(sb, String(data[0].user_id));
  return user ? { token, user } : null;
}
function imapQuote(value: string) { return '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'; }
function sinceDate(days: number) {
  const d = new Date(Date.now() - days * 86400000);
  const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return String(d.getUTCDate()).padStart(2,'0') + '-' + mon[d.getUTCMonth()] + '-' + d.getUTCFullYear();
}
class ByteImap {
  private buf = new Uint8Array(0);
  private dec = new TextDecoder();
  private enc = new TextEncoder();
  constructor(private conn: Deno.TlsConn, private deadline: number) {}
  private async pull() {
    if (Date.now() > this.deadline) throw new Error('timeout');
    const chunk = new Uint8Array(65536);
    const n = await this.conn.read(chunk);
    if (n === null) throw new Error('closed');
    const next = new Uint8Array(this.buf.length + n);
    next.set(this.buf); next.set(chunk.subarray(0, n), this.buf.length); this.buf = next;
  }
  private crlf() { for (let i = 0; i + 1 < this.buf.length; i++) if (this.buf[i] === 13 && this.buf[i+1] === 10) return i; return -1; }
  async readLine() { let at = this.crlf(); while (at < 0) { await this.pull(); at = this.crlf(); } const line = this.dec.decode(this.buf.subarray(0, at)); this.buf = this.buf.subarray(at + 2); return line; }
  async readN(n: number) { while (this.buf.length < n) await this.pull(); const out = this.dec.decode(this.buf.subarray(0, n)); this.buf = this.buf.subarray(n); return out; }
  async command(tag: string, cmd: string) {
    await this.conn.write(this.enc.encode(tag + ' ' + cmd + '\r\n'));
    let out = '';
    while (true) {
      const line = await this.readLine();
      out += line + '\n';
      const lit = line.match(/\{(\d+)\}\s*$/);
      if (lit) out += await this.readN(Number(lit[1]));
      if (line.startsWith(tag + ' ')) { if (!line.startsWith(tag + ' OK')) throw new Error('imap'); return out; }
    }
  }
}
async function syncBounces(sb: any) {
  let user = Deno.env.get('GMAIL_USER') || '';
  let pass = Deno.env.get('GMAIL_APP_PASSWORD') || '';
  if (!user || !pass) {
    const { data: rows } = await sb.from('settings').select('key,value').in('key', ['gmail_app_password','email_from']);
    const m: Record<string, string> = {};
    (rows || []).forEach((r: any) => { m[r.key] = r.value; });
    if (!user) user = m['email_from'] || '';
    if (!pass) pass = m['gmail_app_password'] || '';
  }
  if (!user || !pass) return { synced: 0, seen: 0, message: 'ยังไม่ได้ตั้งค่าอีเมล จึงตรวจจดหมายตีกลับไม่ได้' };
  let texts: string[] = [];
  const conn = await Deno.connectTls({ hostname: 'imap.gmail.com', port: 993 });
  try {
    const imap = new ByteImap(conn, Date.now() + 18000);
    await imap.readLine();
    await imap.command('A1', 'LOGIN ' + imapQuote(user) + ' ' + imapQuote(pass));
    await imap.command('A2', 'SELECT INBOX');
    const searched = await imap.command('A3', 'UID SEARCH SINCE ' + sinceDate(45) + ' FROM "mailer-daemon"');
    const ids = (searched.match(/\* SEARCH([^\n]*)/) || ['',''])[1].trim().split(/\s+/).filter(Boolean).slice(-15);
    if (ids.length) {
      const fetched = await imap.command('A4', 'UID FETCH ' + ids.join(',') + ' (BODY.PEEK[])');
      texts = fetched.split(/\* \d+ FETCH/).slice(1);
    }
  } catch (_e) {
    return { synced: 0, seen: 0, message: 'ยังตรวจจดหมายตีกลับจาก Gmail ไม่ได้ สำเนาที่เก็บไว้ยังเปิดดูได้' };
  } finally { try { conn.close(); } catch (_e) { /* closed */ } }
  let synced = 0, seen = 0;
  for (const text of texts) {
    const bounce = parseBounce(text);
    if (!bounce) continue;
    seen++;
    const patch = { status: 'failed', failure_reason: bounce.reason.slice(0, 500), updated_at: new Date().toISOString() };
    let updated = 0;
    if (bounce.ids.length) {
      const { data } = await sb.from('receipt_archives').select('id,status').in('message_id', bounce.ids.map((id: string) => '<' + id + '@receipt.home-ppk>'));
      for (const row of data || []) {
        if (row.status === 'failed') continue;
        const { error } = await sb.from('receipt_archives').update(patch).eq('id', row.id);
        if (!error) updated++;
      }
    }
    if (!updated) {
      const when = new Date(bounce.when);
      const from = new Date(when.getTime() - 5 * 86400000).toISOString();
      const to = new Date(when.getTime() + 3600000).toISOString();
      const { data: rows } = await sb.from('receipt_archives').select('id').eq('status','sent').eq('email', bounce.email).gte('created_at', from).lte('created_at', to);
      for (const row of rows || []) {
        const { error } = await sb.from('receipt_archives').update(patch).eq('id', row.id);
        if (!error) updated++;
      }
    }
    synced += updated;
  }
  return { synced, seen, message: seen ? `ตรวจจดหมายตีกลับ ${seen} ฉบับ อัปเดตสถานะส่งไม่ถึง ${synced} รายการ` : 'ไม่พบจดหมายตีกลับใหม่ในช่วง 45 วันที่ผ่านมา' };
}
const PAGE = `<!DOCTYPE html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>สำเนาใบเสร็จ | HOME PPK</title>
<link href="https://fonts.googleapis.com/css2?family=Kanit:wght@400;600&display=swap" rel="stylesheet">
<style>body{font-family:Kanit,sans-serif;background:#f8fafc;color:#0f172a;margin:0}header{background:#312e81;color:#fff;padding:1rem}main{max-width:880px;margin:0 auto;padding:1rem}.card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:1rem;margin-bottom:.7rem}input,select,button{font:inherit}input,select{padding:.45rem;border:1px solid #cbd5e1;border-radius:8px}button{background:#4f46e5;color:#fff;border:0;border-radius:8px;padding:.45rem .8rem;cursor:pointer}.row{display:flex;flex-wrap:wrap;gap:.5rem;align-items:end}.err{color:#b91c1c}.badge{border-radius:99px;padding:0 .5rem;font-size:.8rem}.failed{background:#fee2e2;color:#b91c1c}.sent{background:#dcfce7;color:#166534}</style></head>
<body><header><h1 style="margin:0;font-size:1.2rem">สำเนาใบเสร็จ</h1><p style="margin:.2rem 0 0">สำหรับเจ้าหน้าที่ตรวจสลิปและผู้ดูแล เปิดดูหรือส่งซ้ำเมื่ออีเมลส่งไม่ถึง</p></header>
<main><section id="login" class="card"><div class="row"><input id="email" type="email" placeholder="อีเมล"><input id="password" type="password" placeholder="รหัสผ่าน"><button id="loginBtn" type="button">เข้าสู่ระบบ</button></div><p id="loginErr" class="err"></p></section>
<section id="app" style="display:none"><div class="card"><div class="row"><select id="month"></select><select id="year"></select><input id="unit" placeholder="บ้าน/ห้อง เช่น แฟลต5"><label><input id="failedOnly" type="checkbox"> เฉพาะที่ส่งไม่ถึง</label><button id="searchBtn" type="button">ค้นหา</button><button id="syncBtn" type="button">ตรวจจดหมายตีกลับ</button><button id="logoutBtn" type="button">ออกจากระบบ</button></div><p class="err" id="listErr"></p></div><div id="list"></div>
<div id="detail" class="card" style="display:none"><h2 id="detailTitle"></h2><iframe id="frame" sandbox title="สำเนา" style="width:100%;min-height:360px;border:1px solid #e2e8f0"></iframe><div class="row"><input id="resendEmail" type="email" placeholder="อีเมลที่จะส่งซ้ำ"><button id="resendBtn" type="button">ส่งซ้ำจากสำเนานี้</button><button id="downloadBtn" type="button">ดาวน์โหลด</button></div><p id="detailErr" class="err"></p></div></section></main>
<script>
var FN=location.hostname.indexOf('supabase.co')>=0?location.pathname:'https://mwigdgxrfpcmfjuztmip.supabase.co/functions/v1/receipt-archive';
var KEY='sb_publishable_DInAJWyKXTwcxC79jNiS9A_PDxjKWHL';
var TK='ppkReceiptArchiveToken';
var current=null;
var months=['ทั้งปี','มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
var monthSel=document.getElementById('month'), yearSel=document.getElementById('year');
months.forEach(function(n,i){var o=document.createElement('option');o.value=i?String(i).padStart(2,'0'):'';o.textContent=n;monthSel.appendChild(o);});
var y0=new Date().getFullYear()+543; for(var y=y0+1;y>=y0-2;y--){var o=document.createElement('option');o.value=o.textContent=String(y);yearSel.appendChild(o);} yearSel.value=String(y0);
function token(){try{return sessionStorage.getItem(TK)||''}catch(e){return ''}}
function setToken(v){try{v?sessionStorage.setItem(TK,v):sessionStorage.removeItem(TK)}catch(e){}}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
async function api(body){var h={'Content-Type':'application/json',apikey:KEY,Authorization:'Bearer '+KEY}; if(token()) h['x-session-token']=token();
 var res=await fetch(FN,{method:'POST',headers:h,body:JSON.stringify(body)}); var j={}; try{j=await res.json()}catch(e){j={error:'ระบบไม่ตอบกลับ'}}
 if(res.status===401){setToken(''); show(false,j.error||'กรุณาเข้าสู่ระบบใหม่'); throw new Error(j.error||'หมดเวลา')}
 if(!res.ok||j.success===false) throw new Error(j.error||'ทำรายการไม่สำเร็จ'); return j}
function show(on,msg){document.getElementById('login').style.display=on?'none':''; document.getElementById('app').style.display=on?'':'none'; document.getElementById('loginErr').textContent=msg||''}
async function load(){document.getElementById('listErr').textContent=''; var period=monthSel.value?yearSel.value+'-'+monthSel.value:'';
 var data=await api({action:'list',period:period,house:document.getElementById('unit').value.trim(),failedOnly:document.getElementById('failedOnly').checked});
 var rows=data.rows||[]; var box=document.getElementById('list');
 if(!rows.length){box.innerHTML='<div class="card">ไม่พบสำเนาใบเสร็จตามเงื่อนไขนี้</div>'; return}
 box.innerHTML=rows.map(function(r){var st=r.status==='failed'?'<span class="badge failed">ส่งไม่ถึง</span>':'<span class="badge sent">ส่งแล้ว</span>';
  return '<article class="card"><strong>'+esc(r.house_number||'-')+' · '+esc(r.resident_name||'-')+'</strong><div>'+st+' งวด '+esc(r.period||'-')+' · '+(r.amount==null?'-':Number(r.amount).toLocaleString('th-TH')+' บาท')+'<br>อีเมล '+esc(r.email||'-')+(r.failure_reason?'<br>สาเหตุ: '+esc(r.failure_reason):'')+'</div><button type="button" data-open="'+esc(r.id)+'">เปิดสำเนา</button></article>'}).join('');
 box.querySelectorAll('[data-open]').forEach(function(b){b.onclick=function(){openOne(b.getAttribute('data-open'))}})}
async function openOne(id){var data=await api({action:'get',id:id}); current=data.row; document.getElementById('detail').style.display='';
 document.getElementById('detailTitle').textContent=(current.house_number||'')+' · '+(current.subject||''); document.getElementById('resendEmail').value=current.email||'';
 document.getElementById('frame').srcdoc=current.html||'<p>ไม่มีเนื้อหา</p>'}
document.getElementById('loginBtn').onclick=async function(){document.getElementById('loginErr').textContent=''; try{var d=await api({action:'login',email:document.getElementById('email').value.trim(),password:document.getElementById('password').value}); setToken(d.token); document.getElementById('password').value=''; show(true); await load()}catch(e){document.getElementById('loginErr').textContent=e.message}};
document.getElementById('searchBtn').onclick=function(){load().catch(function(e){document.getElementById('listErr').textContent=e.message})};
document.getElementById('syncBtn').onclick=async function(){document.getElementById('listErr').textContent='กำลังตรวจ...'; try{var d=await api({action:'sync'}); document.getElementById('listErr').textContent=d.message||''; await load()}catch(e){document.getElementById('listErr').textContent=e.message}};
document.getElementById('logoutBtn').onclick=async function(){try{await api({action:'logout'})}catch(e){} setToken(''); show(false)};
document.getElementById('downloadBtn').onclick=function(){if(!current)return; var a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([current.html||''],{type:'text/html'})); a.download='ใบเสร็จ-'+(current.house_number||'ppk')+'.html'; a.click()};
document.getElementById('resendBtn').onclick=async function(){if(!current)return; document.getElementById('detailErr').textContent=''; try{await api({action:'resend',id:current.id,email:document.getElementById('resendEmail').value.trim()}); document.getElementById('detailErr').textContent='ส่งซ้ำแล้ว และเก็บสำเนาใหม่ไว้ในรายการ'; await load()}catch(e){document.getElementById('detailErr').textContent=e.message}};
if(token()){show(true); load().catch(function(){setToken(''); show(false,'กรุณาเข้าสู่ระบบใหม่')})}
</script></body></html>`;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method === 'GET') {
    return new Response(PAGE, { headers: { ...cors(req), 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Frame-Options': 'DENY' } });
  }
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405);
  let body: any = {};
  try { body = await req.json(); } catch (_e) { return json(req, { error: 'ข้อมูลไม่ถูกต้อง' }, 400); }
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey());
  const action = String(body.action || '');
  if (action === 'login') {
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!EMAIL_RE.test(email) || !password || password.length > 200) return json(req, { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }, 400);
    const { data, error } = await sb.rpc('rpc_login', { p_email: email, p_password: password });
    if (error || !data || !data.success || !data.token) return json(req, { error: (data && data.error) || 'เข้าสู่ระบบไม่สำเร็จ' }, 400);
    if (data.must_set_password) return json(req, { error: 'บัญชีนี้ต้องตั้งรหัสผ่านจากหน้าระบบหลักก่อน' }, 400);
    const { data: sess } = await sb.from('sessions').select('user_id').eq('token', data.token).limit(1);
    const user = sess && sess[0] ? await staffUser(sb, String(sess[0].user_id)) : null;
    if (!user) { await sb.from('sessions').delete().eq('token', data.token); return json(req, { error: 'หน้านี้สำหรับเจ้าหน้าที่ตรวจสลิปหรือผู้ดูแลระบบเท่านั้น' }, 403); }
    return json(req, { success: true, token: data.token, name: ((user.prefix || '') + (user.firstname || '') + ' ' + (user.lastname || '')).trim() });
  }
  const staff = await requireStaff(req, sb);
  if (!staff) return json(req, { error: 'กรุณาเข้าสู่ระบบใหม่' }, 401);
  if (action === 'logout') { await sb.from('sessions').delete().eq('token', staff.token); return json(req, { success: true }); }
  if (action === 'list') {
    const period = String(body.period || '');
    const house = String(body.house || '').replace(/[%_\\]/g, '').trim().slice(0, 80);
    let q = sb.from('receipt_archives').select('id,house_number,resident_name,email,amount,period,subject,status,failure_reason,created_at,sent_at').order('created_at', { ascending: false }).limit(200);
    if (/^\d{4}-\d{2}$/.test(period)) q = q.eq('period', period);
    if (house) q = q.ilike('house_number', '%' + house + '%');
    if (body.failedOnly) q = q.eq('status', 'failed');
    const { data, error } = await q;
    if (error) return json(req, { error: 'โหลดรายการไม่สำเร็จ' }, 500);
    return json(req, { success: true, rows: data || [] });
  }
  if (action === 'get') {
    const id = String(body.id || '');
    if (!UUID_RE.test(id)) return json(req, { error: 'ไม่พบสำเนานี้' }, 404);
    const { data } = await sb.from('receipt_archives').select('id,house_number,resident_name,email,amount,period,subject,html,status,failure_reason,created_at').eq('id', id).limit(1);
    if (!data || !data[0]) return json(req, { error: 'ไม่พบสำเนานี้' }, 404);
    return json(req, { success: true, row: data[0] });
  }
  if (action === 'resend') {
    const id = String(body.id || '');
    const email = String(body.email || '').trim().toLowerCase();
    if (!UUID_RE.test(id)) return json(req, { error: 'ไม่พบสำเนานี้' }, 404);
    if (!EMAIL_RE.test(email)) return json(req, { error: 'อีเมลไม่ถูกต้อง' }, 400);
    const { data } = await sb.from('receipt_archives').select('id,house_number,resident_name,amount,period,subject,html,text_body,slip_id').eq('id', id).limit(1);
    const row = data && data[0];
    if (!row) return json(req, { error: 'ไม่พบสำเนานี้' }, 404);
    const resp = await fetch(Deno.env.get('SUPABASE_URL') + '/functions/v1/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: serviceKey(), Authorization: 'Bearer ' + serviceKey(), 'x-session-token': staff.token },
      body: JSON.stringify({ to: email, subject: row.subject, html: row.html, text: row.text_body || undefined, receipt: { houseNumber: row.house_number, residentName: row.resident_name, amount: row.amount, period: row.period, slipId: row.slip_id, parentId: row.id, email } }),
    });
    let payload: any = {}; try { payload = await resp.json(); } catch (_e) { payload = {}; }
    if (!resp.ok || payload.success === false) return json(req, { success: false, error: payload.error || 'ส่งซ้ำไม่สำเร็จ' }, resp.ok ? 502 : resp.status);
    return json(req, { success: true, archiveId: payload.archiveId || null });
  }
  if (action === 'sync') return json(req, { success: true, ...(await syncBounces(sb)) });
  return json(req, { error: 'ไม่รู้จักคำสั่ง' }, 400);
});
