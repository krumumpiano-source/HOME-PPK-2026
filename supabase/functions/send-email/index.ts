// ============================================================
//  Supabase Edge Function: send-email
//  ส่งอีเมลผ่าน Resend.com API
//
//  Deploy: supabase functions deploy send-email
//  Env vars ที่ต้องตั้ง:
//    RESEND_API_KEY  — จาก resend.com
//    EMAIL_FROM      — เช่น noreply@ppk.ac.th (ต้อง verify domain ใน Resend)
//    EMAIL_FROM_NAME — เช่น บ้านพักครู PPK
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    // ดึง API key จาก env vars (ตั้งใน Supabase Dashboard → Edge Functions → Secrets)
    let resendApiKey = Deno.env.get('RESEND_API_KEY') || '';
    let fromEmail    = Deno.env.get('EMAIL_FROM')     || '';
    let fromName     = Deno.env.get('EMAIL_FROM_NAME') || 'บ้านพักครู PPK';

    // Fallback: ดึงจาก DB settings (ถ้า secrets ยังไม่ได้ตั้ง)
    if (!resendApiKey) {
      const supabaseUrl  = Deno.env.get('SUPABASE_URL')!;
      const serviceKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const sb = createClient(supabaseUrl, serviceKey);
      const { data: rows } = await sb
        .from('settings')
        .select('key,value')
        .in('key', ['resend_api_key', 'email_from', 'email_from_name']);
      const settingsMap: Record<string, string> = {};
      (rows || []).forEach((r: any) => { settingsMap[r.key] = r.value; });
      resendApiKey = settingsMap['resend_api_key'] || '';
      fromEmail    = settingsMap['email_from']     || '';
      fromName     = settingsMap['email_from_name'] || fromName;
    }

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'ยังไม่ได้ตั้งค่า Resend API Key ในระบบ' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const from = fromEmail ? `${fromName} <${fromEmail}>` : `${fromName} <onboarding@resend.dev>`;

    const body: any = {
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html: html || `<html><body><pre style="font-family:Kanit,sans-serif">${text || ''}</pre></body></html>`,
    };
    if (text)    body.text    = text;
    if (replyTo) body.reply_to = replyTo;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Resend error:', data);
      return new Response(JSON.stringify({ error: data.message || 'Resend API error' }), {
        status: res.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
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
