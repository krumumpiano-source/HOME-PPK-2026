// ============================================================
//  Supabase Edge Function: cleanup-old-meter-photos (v2)
//  History:
//    v1: ใช้ created_at + limit 100
//    v2: แก้เป็น recorded_at, เพิ่ม batch 500, เพิ่ม auth check,
//        เคลียร์ meter_photo_url หลังลบรูป, รองรับ scheduled mode
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Auth check: ต้องมี Authorization header ──
    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sb = createClient(supabaseUrl, serviceKey);

    // cutoff: 1 ปีที่แล้ว
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);

    // ── ดึง records ที่มีรูปมิเตอร์ + ยังไม่ถูกลบ + เก่ากว่า 1 ปี ──
    // ใช้ recorded_at (ไม่ใช่ created_at ซึ่งไม่มีใน schema)
    const { data: bills, error } = await sb
      .from('water_bills')
      .select('id, meter_photo_url, house_number, period')
      .not('meter_photo_url', 'is', null)
      .is('photo_deleted_at', null)
      .lt('recorded_at', cutoffDate.toISOString())
      .limit(500);  // เพิ่มจาก 100 → 500 เพื่อรองรับข้อมูลมากขึ้น

    if (error) throw error;

    let deleted = 0;
    let failed  = 0;
    const results: { id: string; status: string; house_number?: string; period?: string; error?: string }[] = [];

    for (const bill of (bills || [])) {
      try {
        const url = bill.meter_photo_url;
        if (!url) { failed++; continue; }

        // แยก path จาก public URL → storage path
        const match = url.match(/\/storage\/v1\/object\/public\/meter-photos\/(.+)/);
        if (!match) {
          failed++;
          results.push({ id: bill.id, status: 'no-match' });
          continue;
        }

        const filePath = decodeURIComponent(match[1]);
        const { error: delErr } = await sb.storage
          .from('meter-photos')
          .remove([filePath]);

        if (!delErr) {
          // ลบรูปสำเร็จ → อัปเดต DB: mark ว่าลบแล้ว + เคลียร์ URL
          await sb
            .from('water_bills')
            .update({
              photo_deleted_at: new Date().toISOString(),
              meter_photo_url: null  // เคลียร์ URL เพื่อไม่อ้างอิงไฟล์ที่ไม่มี
            })
            .eq('id', bill.id);

          deleted++;
          results.push({
            id: bill.id,
            house_number: bill.house_number,
            period: bill.period,
            status: 'deleted'
          });
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
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
