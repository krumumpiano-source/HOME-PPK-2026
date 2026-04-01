// ============================================================
//  Supabase Edge Function: send-email
//  ส่งอีเมลผ่าน Gmail SMTP (App Password)
//  ใช้ base64 encoding เพื่อรองรับภาษาไทย
//
//  Deploy: npx supabase functions deploy send-email --project-ref xxx --no-verify-jwt
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encode as b64encode } from 'https://deno.land/std@0.168.0/encoding/base64.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/* ── helpers ── */
function utf8ToBase64(str: string): string {
  return b64encode(new TextEncoder().encode(str));
}

function mimeEncodeWord(str: string): string {
  return `=?UTF-8?B?${utf8ToBase64(str)}?=`;
}

function buildMimeMessage(opts: {
  from: string; to: string[]; subject: string;
  textBody: string; htmlBody: string; replyTo?: string;
}): string {
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const lines: string[] = [];

  lines.push(`From: ${opts.from}`);
  lines.push(`To: ${opts.to.join(', ')}`);
  lines.push(`Subject: ${mimeEncodeWord(opts.subject)}`);
  if (opts.replyTo) lines.push(`Reply-To: ${opts.replyTo}`);
  lines.push(`MIME-Version: 1.0`);
  lines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
  lines.push('');

  // plain text part
  lines.push(`--${boundary}`);
  lines.push(`Content-Type: text/plain; charset="UTF-8"`);
  lines.push(`Content-Transfer-Encoding: base64`);
  lines.push('');
  lines.push(utf8ToBase64(opts.textBody));
  lines.push('');

  // HTML part
  lines.push(`--${boundary}`);
  lines.push(`Content-Type: text/html; charset="UTF-8"`);
  lines.push(`Content-Transfer-Encoding: base64`);
  lines.push('');
  lines.push(utf8ToBase64(opts.htmlBody));
  lines.push('');

  lines.push(`--${boundary}--`);
  return lines.join('\r\n');
}

/* ── raw SMTP over TLS ── */
async function smtpSend(
  host: string, port: number,
  user: string, pass: string,
  rawMime: string, from: string, rcptTo: string[]
) {
  const conn = await Deno.connectTls({ hostname: host, port });
  const dec = new TextDecoder();
  const enc = new TextEncoder();

  async function readReply(): Promise<string> {
    const buf = new Uint8Array(4096);
    let result = '';
    // read until we get a complete reply
    while (true) {
      const n = await conn.read(buf);
      if (n === null) break;
      result += dec.decode(buf.subarray(0, n));
      // SMTP reply ends with \r\n and status code followed by space (not -)
      if (/^\d{3} /m.test(result)) break;
    }
    return result.trim();
  }

  async function send(cmd: string): Promise<string> {
    await conn.write(enc.encode(cmd + '\r\n'));
    return readReply();
  }

  // greeting
  await readReply();
  await send(`EHLO localhost`);

  // AUTH LOGIN
  await send('AUTH LOGIN');
  await send(btoa(user));
  const authResp = await send(btoa(pass));
  if (!authResp.startsWith('235')) {
    conn.close();
    throw new Error('SMTP auth failed: ' + authResp);
  }

  await send(`MAIL FROM:<${from}>`);
  for (const r of rcptTo) {
    await send(`RCPT TO:<${r.trim()}>`);
  }
  await send('DATA');
  // send raw MIME (dot-stuff)
  const stuffed = rawMime.replace(/^\./gm, '..');
  await conn.write(enc.encode(stuffed + '\r\n.\r\n'));
  const dataResp = await readReply();
  if (!dataResp.startsWith('250')) {
    conn.close();
    throw new Error('SMTP DATA rejected: ' + dataResp);
  }

  await send('QUIT');
  conn.close();
}

/* ── main handler ── */
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, subject, html, text, replyTo } = await req.json();

    if (!to || !subject) {
      return new Response(JSON.stringify({ error: 'ต้องระบุ to และ subject' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const toList: string[] = Array.isArray(to) ? to : [to];

    // ✅ Rate limit guard: จำกัดจำนวนผู้รับและความยาว content
    if (toList.length > 10) {
      return new Response(JSON.stringify({ error: 'จำนวนผู้รับเกินกำหนด (สูงสุด 10 คนต่อครั้ง)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (subject && subject.length > 200) {
      return new Response(JSON.stringify({ error: 'หัวข้ออีเมลยาวเกินไป (สูงสุด 200 ตัวอักษร)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (html && html.length > 50000) {
      return new Response(JSON.stringify({ error: 'เนื้อหา HTML ยาวเกินไป (สูงสุด 50,000 ตัวอักษร)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const addr of toList) {
      const trimmed = (addr || '').trim();
      if (!trimmed || trimmed.length > 320 || !emailRegex.test(trimmed)) {
        return new Response(JSON.stringify({ error: `อีเมลไม่ถูกต้อง: ${trimmed.substring(0, 50)}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // --- credentials: env vars → DB fallback ---
    let gmailUser        = Deno.env.get('GMAIL_USER') || '';
    let gmailAppPassword = Deno.env.get('GMAIL_APP_PASSWORD') || '';
    let fromName         = Deno.env.get('EMAIL_FROM_NAME') || 'HOME PPK';

    if (!gmailUser || !gmailAppPassword) {
      const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const { data: rows } = await sb
        .from('settings').select('key,value')
        .in('key', ['gmail_app_password', 'email_from', 'email_from_name']);
      const m: Record<string, string> = {};
      (rows || []).forEach((r: any) => { m[r.key] = r.value; });
      if (!gmailUser)        gmailUser        = m['email_from']         || '';
      if (!gmailAppPassword) gmailAppPassword = m['gmail_app_password'] || '';
      fromName = m['email_from_name'] || fromName;
    }

    if (!gmailUser || !gmailAppPassword) {
      return new Response(JSON.stringify({ error: 'ยังไม่ได้ตั้งค่าอีเมลและ Gmail App Password ในหน้าแอดมิน' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (fromName.length > 78) fromName = fromName.substring(0, 78);

    const fromHeader = `${mimeEncodeWord(fromName)} <${gmailUser}>`;
    const textBody = text || subject;
    const htmlBody = html || `<div style="font-family:Kanit,sans-serif">${text || subject}</div>`;

    console.log('send-email:', JSON.stringify({ from: gmailUser, to: toList, subject: subject?.substring(0, 50) }));

    const rawMime = buildMimeMessage({
      from: fromHeader, to: toList, subject,
      textBody, htmlBody, replyTo,
    });

    await smtpSend('smtp.gmail.com', 465, gmailUser, gmailAppPassword, rawMime, gmailUser, toList);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('send-email error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
