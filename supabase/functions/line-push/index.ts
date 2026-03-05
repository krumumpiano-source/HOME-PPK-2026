// ============================================================
//  Supabase Edge Function: line-push
//  ส่ง LINE Push Message ไปหาผู้ใช้
//
//  Deploy: supabase functions deploy line-push
//  Env vars ที่ต้องตั้ง:
//    LINE_CHANNEL_ACCESS_TOKEN — จาก LINE Developers Console
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
    const { lineUserId, message, flexMessage, houseNumber, residentId, messageType } = await req.json();

    if (!lineUserId || (!message && !flexMessage)) {
      return new Response(JSON.stringify({ error: 'ต้องระบุ lineUserId และ message หรือ flexMessage' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl  = Deno.env.get('SUPABASE_URL')!;
    const serviceKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sb = createClient(supabaseUrl, serviceKey);

    // ดึง token จาก env → fallback ไป DB settings
    let channelToken = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN') || '';
    if (!channelToken) {
      const { data: rows } = await sb
        .from('settings')
        .select('value')
        .eq('key', 'line_channel_access_token')
        .single();
      channelToken = (rows as any)?.value || '';
    }

    if (!channelToken) {
      return new Response(JSON.stringify({ error: 'ยังไม่ได้ตั้งค่า LINE Channel Access Token' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ตรวจโควต้า
    const { data: quotaRows } = await sb.from('settings').select('key,value')
      .in('key', ['line_push_quota_used', 'line_push_quota_limit', 'line_push_quota_reset_date']);
    const quotaMap: Record<string, string> = {};
    (quotaRows || []).forEach((r: any) => { quotaMap[r.key] = r.value; });

    const today = new Date().toISOString().split('T')[0];
    const thisMonth = today.substring(0, 7); // YYYY-MM
    let quotaUsed = parseInt(quotaMap['line_push_quota_used'] || '0');
    const quotaLimit = parseInt(quotaMap['line_push_quota_limit'] || '200');
    const resetDate = quotaMap['line_push_quota_reset_date'] || '';

    // Reset โควต้าถ้าเป็นเดือนใหม่
    if (!resetDate || resetDate.substring(0, 7) !== thisMonth) {
      quotaUsed = 0;
      await sb.from('settings').update({ value: '0' }).eq('key', 'line_push_quota_used');
      await sb.from('settings').update({ value: today }).eq('key', 'line_push_quota_reset_date');
    }

    if (quotaUsed >= quotaLimit) {
      await sb.from('line_push_log').insert({
        line_user_id: lineUserId, house_number: houseNumber, resident_id: residentId || null,
        message_type: messageType || 'text', message_text: message,
        status: 'failed', error_msg: `โควต้าหมด (${quotaUsed}/${quotaLimit})`
      });
      return new Response(JSON.stringify({ error: `โควต้า LINE Push หมดแล้ว (${quotaUsed}/${quotaLimit})` }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ส่งจริง
    const lineMessage = flexMessage
      ? { type: 'flex', altText: (flexMessage.altText || message || 'แจ้งเตือนจากระบบ'), contents: flexMessage.contents ?? flexMessage }
      : { type: 'text', text: message };
    const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${channelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [lineMessage],
      }),
    });

    const lineData = await lineRes.json().catch(() => ({}));
    const success = lineRes.ok;

    // บันทึก log
    await sb.from('line_push_log').insert({
      line_user_id: lineUserId, house_number: houseNumber, resident_id: residentId || null,
      message_type: flexMessage ? 'flex' : (messageType || 'text'),
      message_text: message || (flexMessage ? '[Flex Message]' : ''),
      status: success ? 'sent' : 'failed',
      error_msg: success ? null : JSON.stringify(lineData)
    });

    if (success) {
      // อัปเดตโควต้า
      await sb.from('settings').update({ value: String(quotaUsed + 1) }).eq('key', 'line_push_quota_used');
    }

    return new Response(JSON.stringify({
      success,
      quotaUsed: success ? quotaUsed + 1 : quotaUsed,
      quotaLimit,
    }), {
      status: success ? 200 : 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('line-push error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
