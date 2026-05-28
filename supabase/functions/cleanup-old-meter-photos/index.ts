// ============================================================
//  Supabase Edge Function: cleanup-old-meter-photos
//  ลบรูปมิเตอร์น้ำที่อายุเกิน 5 ปีออกจาก Storage
//  (แต่คงไว้ DB record + ค่า OCR ตลอดกาล)
//
//  Deploy: supabase functions deploy cleanup-old-meter-photos
//  Run manually หรือตั้ง pg_cron ให้รันทุกเดือน
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sb = createClient(supabaseUrl, serviceKey);

    // หา record ที่ meter_photo_url ไม่ว่าง และ created_at > 5 ปีที่แล้ว และยังไม่ได้ลบรูป
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 5);

    const { data: bills, error } = await sb
      .from('water_bills')
      .select('id, meter_photo_url, house_number, period')
      .not('meter_photo_url', 'is', null)
      .is('photo_deleted_at', null)
      .lt('created_at', cutoffDate.toISOString())
      .limit(100);

    if (error) throw error;

    let deleted = 0;
    let failed  = 0;
    const results: any[] = [];

    for (const bill of (bills || [])) {
      try {
        const url = bill.meter_photo_url;
        const match = url.match(/\/storage\/v1\/object\/public\/meter-photos\/(.+)/);
        if (!match) {
          failed++;
          results.push({ id: bill.id, status: 'no-match' });
          continue;
        }

        const filePath = decodeURIComponent(match[1]);
        const { error: delErr } = await sb.storage.from('meter-photos').remove([filePath]);

        if (!delErr) {
          await sb.from('water_bills')
            .update({ photo_deleted_at: new Date().toISOString() })
            .eq('id', bill.id);
          deleted++;
          results.push({ id: bill.id, house_number: bill.house_number, period: bill.period, status: 'deleted' });
        } else {
          failed++;
          console.error(`Failed to delete ${filePath}:`, delErr.message);
          results.push({ id: bill.id, status: 'failed', error: delErr.message });
        }
      } catch (e) {
        failed++;
        console.error('Error processing bill', bill.id, e);
        results.push({ id: bill.id, status: 'error', error: String(e) });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed: (bills || []).length,
      deleted,
      failed,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('cleanup-old-meter-photos error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
