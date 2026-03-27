// ============================================================
//  Supabase Edge Function: send-email
//  ส่งอีเมลผ่าน Gmail SMTP (App Password)
//
//  Deploy: npx supabase functions deploy send-email --project-ref xxx --no-verify-jwt
//  ตั้งค่า: ใส่อีเมลและ Gmail App Password ในหน้า admin-settings
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Validate email addresses
    const toList: string[] = Array.isArray(to) ? to : [to];
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

    // --- Get Gmail credentials: env vars (priority) → DB settings ---
    let gmailUser        = Deno.env.get('GMAIL_USER') || '';
    let gmailAppPassword = Deno.env.get('GMAIL_APP_PASSWORD') || '';
    let fromName         = Deno.env.get('EMAIL_FROM_NAME') || 'HOME PPK';

    if (!gmailUser || !gmailAppPassword) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const sb = createClient(supabaseUrl, serviceKey);
      const { data: rows } = await sb
        .from('settings')
        .select('key,value')
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

    console.log('send-email via Gmail SMTP:', JSON.stringify({
      from: gmailUser,
      to: toList,
      subject: subject?.substring(0, 50),
    }));

    // --- Connect to Gmail SMTP & send ---
    const client = new SMTPClient({
      connection: {
        hostname: 'smtp.gmail.com',
        port: 465,
        tls: true,
        auth: {
          username: gmailUser,
          password: gmailAppPassword,
        },
      },
    });

    const htmlContent = html
      || `<html><body><pre style="font-family:Kanit,sans-serif">${text || ''}</pre></body></html>`;

    const sendOpts: any = {
      from: `${fromName} <${gmailUser}>`,
      to: toList.map((a: string) => a.trim()),
      subject,
      content: text || subject,
      html: htmlContent,
    };
    if (replyTo) sendOpts.replyTo = replyTo;

    await client.send(sendOpts);
    await client.close();

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
