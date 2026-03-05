// ============================================================
//  Supabase Edge Function: line-webhook
//  รับ events จาก LINE Messaging API — Flex Messages + Chatbot
//
//  Deploy: supabase functions deploy line-webhook
//  Webhook URL: https://<project>.supabase.co/functions/v1/line-webhook
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const THAI_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const body = await req.text();
  const channelSecret = Deno.env.get('LINE_CHANNEL_SECRET') || '';
  const channelToken  = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN') || '';

  // Verify LINE signature
  if (channelSecret) {
    const sig = req.headers.get('x-line-signature') || '';
    const key  = await crypto.subtle.importKey('raw', new TextEncoder().encode(channelSecret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const mac  = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
    const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
    if (sig !== expected) return new Response('Unauthorized', { status: 401 });
  }

  const payload = JSON.parse(body);
  const events = payload.events || [];

  // ตอบ 200 ทันที — process events แบบ fire-and-forget
  const processEvents = async () => {
    if (events.length === 0) return;

    // ตรวจ LINE Verify test event (replyToken = 00000...)
    const isVerifyTest = events.every((e: any) =>
      e.replyToken === '00000000000000000000000000000000' || e.mode === 'standby'
    );
    if (isVerifyTest) return;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sb = createClient(supabaseUrl, serviceKey);

    const { data: settingsRows } = await sb.from('settings').select('key,value');
    const settings: Record<string, string> = {};
    (settingsRows || []).forEach((r: any) => { settings[r.key] = r.value; });

    const token  = channelToken || settings['line_channel_access_token'] || '';
    const liffId = settings['line_liff_id'] || '';

    for (const event of events) {
      try { await handleEvent(sb, event, token, liffId); } catch (e) { console.error(e); }
    }
  };

  // ใช้ waitUntil ถ้ามี ไม่งั้น fire-and-forget
  try {
    (globalThis as any).EdgeRuntime?.waitUntil(processEvents());
  } catch {
    processEvents().catch(console.error);
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
});

async function handleEvent(sb: any, event: any, token: string, liffId: string) {
  const lineUserId = event.source?.userId;
  if (!lineUserId) return;
  const liffBase = liffId ? `https://liff.line.me/${liffId}` : '';

  if (event.type === 'follow') {
    await replyMessages(token, event.replyToken, [buildWelcomeFlex(liffBase)]);
    return;
  }
  if (event.type === 'unfollow') {
    await sb.from('residents').update({ line_user_id: null, line_linked_at: null }).eq('line_user_id', lineUserId);
    return;
  }
  if (event.type === 'postback') {
    const data = event.postback?.data || '';
    if (data === 'action=balance') await replyBalance(sb, event, token, liffBase, lineUserId);
    else if (data === 'action=stats') await replyStats(sb, event, token, lineUserId);
    return;
  }
  if (event.type === 'message' && event.message?.type === 'text') {
    await handleText(sb, event, token, liffBase, lineUserId, event.message.text.trim());
  }
}

async function handleText(sb: any, event: any, token: string, liffBase: string, uid: string, text: string) {
  const t = text.toLowerCase();
  if (/^(ยอด|ยอดค้าง|balance|bill|ค่าน้ำ|ค่าไฟ)/.test(t)) { await replyBalance(sb, event, token, liffBase, uid); return; }
  if (/^(สถิติ|stat|รายงาน|summary)/.test(t))  { await replyStats(sb, event, token, uid); return; }
  if (/^(ประวัติ|history|hist)/.test(t))  { await replyLink(token, event, '📋 ประวัติการชำระ', 'ดูรายการชำระย้อนหลังของบ้านพักคุณ', liffBase ? liffBase+'?p=history' : '', liffBase); return; }
  if (/^(สลิป|ส่งสลิป|slip|จ่าย|ชำระ)/.test(t)) { await replyLink(token, event, '📤 ส่งสลิป', 'แนบรูปสลิปโอนเงินเพื่อยืนยันการชำระ', liffBase ? liffBase+'?p=slip' : '', liffBase); return; }
  if (/^(ซ่อม|แจ้งซ่อม|repair)/.test(t))  { await replyLink(token, event, '🔧 แจ้งซ่อม', 'กรอกแบบฟอร์มแจ้งปัญหาในบ้านพักของคุณ', liffBase ? liffBase+'?p=forms' : '', liffBase); return; }
  if (/^(ลงทะเบียน|register|เชื่อม)/.test(t)) { await replyLink(token, event, '🔗 เชื่อมบัญชี LINE', 'เชื่อม LINE กับห้องพักเพื่อรับการแจ้งเตือน', liffBase || '', liffBase); return; }
  if (/^(เมนู|ช่วย|help|\?|menu)/.test(t)) { await replyMessages(token, event.replyToken, [buildMenuFlex(liffBase)], qr(liffBase)); return; }
  if (/^(แดชบอร์ด|dashboard|หน้าหลัก)/.test(t)) { await replyLink(token, event, '📱 แดชบอร์ด', 'ดูข้อมูลสรุปบ้านพักของคุณ', liffBase ? liffBase+'?p=dashboard' : '', liffBase); return; }
  await replyMessages(token, event.replyToken,
    [{ type: 'text', text: 'คำสั่งที่ใช้ได้:\n💰 ยอดค้าง\n📤 ส่งสลิป\n📊 สถิติ\n📋 ประวัติ\n🔧 แจ้งซ่อม\nหรือพิมพ์ "เมนู"' }],
    qr(liffBase));
}

async function replyLink(token: string, event: any, title: string, desc: string, url: string, liffBase: string) {
  const msg = url
    ? { type: 'flex', altText: title, contents: { type: 'bubble',
        body: { type: 'box', layout: 'vertical', paddingAll: '16px', spacing: 'sm', contents: [
          { type: 'text', text: title, weight: 'bold', size: 'lg', color: '#1e293b', wrap: true },
          { type: 'text', text: desc, size: 'sm', color: '#64748b', wrap: true },
        ]},
        footer: { type: 'box', layout: 'vertical', paddingAll: '12px', contents: [
          { type: 'button', style: 'primary', color: '#065f46', action: { type: 'uri', label: title, uri: url } }
        ]}
      }}
    : { type: 'text', text: title + '\n' + desc + '\n\nกรุณาติดต่อผู้ดูแลระบบเพื่อตั้งค่า LIFF' };
  await replyMessages(token, event.replyToken, [msg], qr(liffBase));
}

async function replyBalance(sb: any, event: any, token: string, liffBase: string, uid: string) {
  const { data: res } = await sb.from('residents').select('id,firstname,lastname,house_number').eq('line_user_id', uid).single();
  if (!res) { await replyLink(token, event, '🔗 ยังไม่ได้เชื่อมบัญชี', 'กรุณาลงทะเบียนก่อนใช้งาน', liffBase || '', liffBase); return; }

  const now = new Date();
  const period = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
  const monthName = THAI_MONTHS[now.getMonth()] + ' ' + (now.getFullYear()+543);

  let water=0, elec=0, common=0, total=0, status='unpaid', paid=0;
  const { data: bill } = await sb.from('bill_summary').select('water_bill,electric_bill,common_fee,total_amount,payment_status,paid_amount').eq('house_number', res.house_number).eq('period', period).single();
  if (bill) { water=bill.water_bill||0; elec=bill.electric_bill||0; common=bill.common_fee||0; total=bill.total_amount||(water+elec+common); status=bill.payment_status||'unpaid'; paid=bill.paid_amount||0; }
  else {
    const { data: out } = await sb.from('outstanding').select('water_amount,electric_amount,common_fee,total_amount,status,paid_amount').eq('house_number', res.house_number).eq('period', period).single();
    if (out) { water=out.water_amount||0; elec=out.electric_amount||0; common=out.common_fee||0; total=out.total_amount||0; status=out.status||'unpaid'; paid=out.paid_amount||0; }
  }

  await replyMessages(token, event.replyToken,
    [buildBalanceFlex(`${res.firstname} ${res.lastname}`, res.house_number, monthName, water, elec, common, total, status, paid, liffBase ? liffBase+'?p=slip' : '')],
    qr(liffBase));
}

async function replyStats(sb: any, event: any, token: string, uid: string) {
  const { data: res } = await sb.from('residents').select('id,firstname,lastname,house_number').eq('line_user_id', uid).single();
  if (!res) { await replyMessages(token, event.replyToken, [{ type: 'text', text: 'ไม่พบข้อมูล กรุณาลงทะเบียนก่อน' }]); return; }
  const { data: slips } = await sb.from('slip_submissions').select('period,paid_amount,status,submitted_at').eq('house_number', res.house_number).order('submitted_at', { ascending: false }).limit(12);
  const rows = slips || [];
  const approved = rows.filter((r: any) => r.status === 'approved');
  const pending  = rows.filter((r: any) => r.status === 'pending');
  const totalPaid = approved.reduce((s: number, r: any) => s + (r.paid_amount||0), 0);
  await replyMessages(token, event.replyToken,
    [buildStatsFlex(`${res.firstname} ${res.lastname}`, res.house_number, rows.length, approved.length, pending.length, totalPaid)]);
}

/* ─── Flex Builders ─── */
function buildWelcomeFlex(liffBase: string): any {
  const regUrl = liffBase || '';
  return { type:'flex', altText:'🏠 ยินดีต้อนรับสู่ระบบบ้านพักครู',
    contents:{ type:'bubble', size:'giga',
      header:{ type:'box', layout:'vertical', backgroundColor:'#065f46', paddingAll:'20px', contents:[
        {type:'text',text:'🏠',size:'3xl',align:'center'},
        {type:'text',text:'ยินดีต้อนรับ',weight:'bold',size:'xxl',color:'#ffffff',align:'center'},
        {type:'text',text:'ระบบบ้านพักครู โรงเรียนพะเยาพิทยาคม',size:'sm',color:'#a7f3d0',align:'center',wrap:true},
      ]},
      body:{ type:'box', layout:'vertical', spacing:'md', paddingAll:'20px', contents:[
        {type:'text',text:'คุณสามารถใช้งานผ่าน LINE ได้เลย! 📱',wrap:true,color:'#374151'},
        {type:'separator'},
        fRow('💰','ดูยอดค้างชำระ','พิมพ์ "ยอดค้าง"'),
        fRow('📤','ส่งสลิปการชำระ','พิมพ์ "ส่งสลิป"'),
        fRow('📊','ดูสถิติการชำระ','พิมพ์ "สถิติ"'),
        fRow('🔧','แจ้งซ่อม','พิมพ์ "แจ้งซ่อม"'),
        {type:'separator'},
        {type:'text',text:'⚠ กรุณาลงทะเบียนเชื่อมบัญชีก่อนใช้งาน',size:'sm',color:'#dc2626',wrap:true},
      ]},
      footer: regUrl ? { type:'box',layout:'vertical',paddingAll:'16px',contents:[
        {type:'button',style:'primary',color:'#065f46',action:{type:'uri',label:'🔗 ลงทะเบียนเชื่อมบัญชีเลย',uri:regUrl}}
      ]} : undefined
    }
  };
}
function fRow(icon:string,title:string,desc:string):any { return {type:'box',layout:'horizontal',spacing:'md',paddingTop:'8px',contents:[{type:'text',text:icon,size:'lg',flex:0},{type:'box',layout:'vertical',flex:1,contents:[{type:'text',text:title,weight:'bold',size:'sm',color:'#1e293b'},{type:'text',text:desc,size:'xs',color:'#64748b'}]}]}; }

function buildBalanceFlex(name:string,house:string,month:string,water:number,elec:number,common:number,total:number,status:string,paid:number,slipUrl:string):any {
  const isPaid=status==='approved'||status==='paid', isPending=status==='pending';
  const hBg=isPaid?'#166534':isPending?'#854d0e':'#991b1b';
  const statusTxt=isPaid?'✅ ชำระเรียบร้อยแล้ว':isPending?'⏳ รอการตรวจสอบ':'⚠ ยังไม่ได้ชำระ';
  const statusClr=isPaid?'#4ade80':isPending?'#fde68a':'#fca5a5';
  const bRow=(lb:string,val:number):any=>({type:'box',layout:'horizontal',contents:[{type:'text',text:lb,size:'sm',color:'#475569',flex:1},{type:'text',text:val?val.toLocaleString('th-TH')+' บาท':'-',size:'sm',flex:1,align:'end',color:'#1e293b'}]});
  const footerBtns:any[]=[];
  if(!isPaid&&slipUrl) footerBtns.push({type:'button',style:'primary',color:'#059669',height:'sm',action:{type:'uri',label:'📤 ส่งสลิปการชำระ',uri:slipUrl}});
  return { type:'flex', altText:`💰 ยอดค้างชำระ ${month} - บ้านพัก ${house}`,
    contents:{ type:'bubble',size:'giga',
      header:{type:'box',layout:'vertical',backgroundColor:hBg,paddingAll:'16px',contents:[
        {type:'text',text:'💰 ยอดค้างชำระ',size:'lg',weight:'bold',color:'#ffffff'},
        {type:'text',text:month,size:'sm',color:'rgba(255,255,255,0.8)'},
        {type:'text',text:statusTxt,size:'sm',color:statusClr,margin:'sm'},
      ]},
      body:{type:'box',layout:'vertical',paddingAll:'16px',spacing:'sm',contents:[
        {type:'box',layout:'horizontal',contents:[{type:'text',text:'🏠 บ้านพัก',size:'sm',color:'#64748b',flex:1},{type:'text',text:house,size:'sm',weight:'bold',flex:2,align:'end'}]},
        {type:'box',layout:'horizontal',contents:[{type:'text',text:'👤 ชื่อ',size:'sm',color:'#64748b',flex:1},{type:'text',text:name,size:'sm',flex:2,align:'end',wrap:true}]},
        {type:'separator',margin:'md'},
        bRow('💧 ค่าน้ำ',water), bRow('⚡ ค่าไฟ',elec), bRow('🏢 ค่าส่วนกลาง',common),
        {type:'separator',margin:'md'},
        {type:'box',layout:'horizontal',margin:'sm',contents:[
          {type:'text',text:'รวมทั้งสิ้น',size:'md',weight:'bold',flex:1,color:'#0f172a'},
          {type:'text',text:total.toLocaleString('th-TH')+' บาท',size:'xl',weight:'bold',color:isPaid?'#16a34a':'#dc2626',flex:2,align:'end'},
        ]},
        isPaid&&paid?{type:'box',layout:'horizontal',contents:[{type:'text',text:'ชำระจริง',size:'sm',color:'#64748b',flex:1},{type:'text',text:paid.toLocaleString('th-TH')+' บาท',size:'sm',color:'#16a34a',flex:2,align:'end'}]}:null,
      ].filter(Boolean) as any[]},
      footer:footerBtns.length?{type:'box',layout:'vertical',paddingAll:'12px',spacing:'sm',contents:footerBtns}:undefined
    }
  };
}

function buildStatsFlex(name:string,house:string,total:number,approved:number,pending:number,totalPaid:number):any {
  const rate=total>0?Math.round((approved/total)*100):0;
  const sBlk=(lb:string,v:string,c:string):any=>({type:'box',layout:'vertical',flex:1,alignItems:'center',paddingAll:'8px',backgroundColor:'#f8fafc',cornerRadius:'8px',margin:'sm',contents:[{type:'text',text:v,size:'xxl',weight:'bold',color:c,align:'center'},{type:'text',text:lb,size:'xs',color:'#64748b',align:'center',wrap:true}]});
  return { type:'flex', altText:'📊 สถิติการชำระค่าสาธารณูปโภค',
    contents:{ type:'bubble',size:'giga',
      header:{type:'box',layout:'vertical',backgroundColor:'#4f46e5',paddingAll:'16px',contents:[
        {type:'text',text:'📊 สถิติการชำระ',size:'lg',weight:'bold',color:'#ffffff'},
        {type:'text',text:`บ้านพัก ${house} — ${name}`,size:'sm',color:'rgba(255,255,255,0.8)',wrap:true},
      ]},
      body:{type:'box',layout:'vertical',paddingAll:'16px',spacing:'md',contents:[
        {type:'box',layout:'horizontal',contents:[sBlk('ทั้งหมด',String(total),'#0f172a'),sBlk('ชำระแล้ว ✅',String(approved),'#16a34a'),sBlk('รอตรวจ ⏳',String(pending),'#d97706')]},
        {type:'separator'},
        {type:'box',layout:'horizontal',contents:[{type:'text',text:'ยอดรวมที่ชำระ (12 เดือน)',size:'sm',color:'#64748b',flex:1,wrap:true},{type:'text',text:totalPaid.toLocaleString('th-TH')+' บาท',size:'md',weight:'bold',color:'#0f172a',flex:1,align:'end'}]},
        {type:'box',layout:'horizontal',contents:[{type:'text',text:'อัตราชำระตรงเวลา',size:'sm',color:'#64748b',flex:1},{type:'text',text:rate+'%',size:'md',weight:'bold',color:rate>=80?'#16a34a':'#dc2626',flex:1,align:'end'}]},
      ]}
    }
  };
}

function buildMenuFlex(liffBase:string):any {
  const mk=(icon:string,title:string,desc:string,ad:string,at:'uri'|'postback'):any=>({type:'box',layout:'horizontal',paddingAll:'10px',backgroundColor:'#f8fafc',cornerRadius:'8px',action:at==='uri'?{type:'uri',label:title,uri:ad}:{type:'postback',label:title,data:ad,displayText:title},contents:[{type:'text',text:icon,size:'xl',flex:0,gravity:'center'},{type:'box',layout:'vertical',flex:1,paddingStart:'12px',contents:[{type:'text',text:title,size:'sm',weight:'bold',color:'#1e293b'},{type:'text',text:desc,size:'xs',color:'#64748b'}]},{type:'text',text:'›',size:'xl',color:'#94a3b8',gravity:'center'}]});
  const rows:any[]=[mk('💰','ยอดค้างชำระ','ดูยอดเดือนนี้','action=balance','postback'),mk('📊','สถิติการชำระ','สรุปย้อนหลัง','action=stats','postback')];
  if(liffBase){rows.push(mk('📤','ส่งสลิป','แนบสลิปโอนเงิน',liffBase+'?p=slip','uri'),mk('📋','ประวัติ','รายการย้อนหลัง',liffBase+'?p=history','uri'),mk('🔧','แจ้งซ่อม / แบบฟอร์ม','แจ้งปัญหาหรือขอบริการ',liffBase+'?p=forms','uri'),mk('🔗','ลงทะเบียน','เชื่อม LINE กับห้องพัก',liffBase,'uri'));}
  return { type:'flex', altText:'🏠 เมนูหลัก — บ้านพักครู', contents:{ type:'bubble',size:'giga',
    header:{type:'box',layout:'vertical',backgroundColor:'#1e3a5f',paddingAll:'14px',contents:[{type:'text',text:'🏠 เมนูหลัก — ระบบบ้านพักครู',size:'md',weight:'bold',color:'#ffffff'}]},
    body:{type:'box',layout:'vertical',paddingAll:'12px',spacing:'sm',contents:rows}
  }};
}

function qr(liffBase:string):any[] {
  const items:any[]=[
    {type:'action',action:{type:'postback',label:'💰 ยอดค้าง',data:'action=balance',displayText:'ยอดค้าง'}},
    {type:'action',action:{type:'postback',label:'📊 สถิติ',data:'action=stats',displayText:'สถิติ'}},
    {type:'action',action:{type:'message',label:'📋 ประวัติ',text:'ประวัติ'}},
    {type:'action',action:{type:'message',label:'🔧 แจ้งซ่อม',text:'แจ้งซ่อม'}},
    {type:'action',action:{type:'message',label:'📋 เมนู',text:'เมนู'}},
  ];
  if(liffBase) items.unshift({type:'action',action:{type:'uri',label:'📤 ส่งสลิป',uri:liffBase+'?p=slip'}});
  return items;
}

async function replyMessages(token:string, replyToken:string, messages:any[], qrItems?:any[]) {
  if(!token||!replyToken) return;
  const payload:any={replyToken,messages};
  if(qrItems?.length){ const last=messages[messages.length-1]; if(last) last.quickReply={items:qrItems.slice(0,13)}; }
  const res=await fetch('https://api.line.me/v2/bot/message/reply',{method:'POST',headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if(!res.ok) console.error('LINE reply error:',await res.text());
}
