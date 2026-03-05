// ============================================================
//  Supabase Edge Function: cleanup-old-slips
//  ลบรูปสลิปที่อายุเกิน 2 ปีออกจาก Storage
//  (แต่คงไว้ DB record ตลอดกาล)
//
//  Deploy: supabase functions deploy cleanup-old-slips
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

    // หา record ที่ slip_url ไม่ว่าง และ submitted_at > 2 ปีที่แล้ว และยังไม่ได้ลบรูป
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 2);

    const { data: slips, error } = await sb
      .from('slip_submissions')
      .select('id, slip_url, house_number, period')
      .not('slip_url', 'is', null)
      .is('image_deleted_at', null)
      .lt('submitted_at', cutoffDate.toISOString())
      .limit(100); // ประมวลผลทีละ 100

    if (error) throw error;

    let deleted = 0;
    let failed  = 0;
    const results: any[] = [];

    for (const slip of (slips || [])) {
      try {
        // slip_url อาจเป็น JSON array หรือ string เดียว
        let urls: string[] = [];
        try {
          const parsed = JSON.parse(slip.slip_url);
          urls = Array.isArray(parsed) ? parsed : [slip.slip_url];
        } catch {
          urls = [slip.slip_url];
        }

        let allDeleted = true;
        for (const url of urls) {
          // Extract path จาก URL
          // URL format: https://xxx.supabase.co/storage/v1/object/public/slips/path/to/file.jpg
          const match = url.match(/\/storage\/v1\/object\/public\/slips\/(.+)/);
          if (!match) { allDeleted = false; continue; }

          const filePath = decodeURIComponent(match[1]);
          const { error: delErr } = await sb.storage.from('slips').remove([filePath]);
          if (delErr) {
            console.error(`Failed to delete ${filePath}:`, delErr.message);
            allDeleted = false;
          }
        }

        if (allDeleted) {
          // อัปเดต DB ว่าลบแล้ว
          await sb.from('slip_submissions')
            .update({ image_deleted_at: new Date().toISOString() })
            .eq('id', slip.id);
          deleted++;
          results.push({ id: slip.id, house_number: slip.house_number, period: slip.period, status: 'deleted' });
        } else {
          failed++;
          results.push({ id: slip.id, house_number: slip.house_number, period: slip.period, status: 'failed' });
        }
      } catch (e) {
        failed++;
        console.error('Error processing slip', slip.id, e);
        results.push({ id: slip.id, status: 'error', error: String(e) });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed: (slips || []).length,
      deleted,
      failed,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('cleanup-old-slips error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
