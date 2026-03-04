-- ============================================================
-- HOME PPK 2026 — Row Level Security (RLS)
-- รัน script นี้หลัง schema.sql ใน Supabase SQL Editor
--
-- โหมด: no-auth (anon key มีสิทธิ์เต็มทุก table)
-- เหตุผล: ระบบทำงานบน GitHub Pages โดยไม่มีระบบ login
--         ความปลอดภัยจาก network + Supabase project isolation
-- ============================================================

-- ── Enable RLS บน tables ทั้งหมด ──────────────────────────
alter table public.users                 enable row level security;
alter table public.sessions              enable row level security;
alter table public.permissions           enable row level security;
alter table public.pending_registrations enable row level security;
alter table public.housing               enable row level security;
alter table public.residents             enable row level security;
alter table public.coresidents           enable row level security;
alter table public.water_bills           enable row level security;
alter table public.electric_bills        enable row level security;
alter table public.water_rates           enable row level security;
alter table public.outstanding           enable row level security;
alter table public.slip_submissions      enable row level security;
alter table public.payment_history       enable row level security;
alter table public.notifications         enable row level security;
alter table public.requests              enable row level security;
alter table public.queue                 enable row level security;
alter table public.accounting_entries    enable row level security;
alter table public.monthly_withdraw      enable row level security;
alter table public.exemptions            enable row level security;
alter table public.settings              enable row level security;
alter table public.announcements         enable row level security;
alter table public.logs                  enable row level security;

-- ============================================================
-- ลบ policies เดิมก่อน (safe to re-run)
-- ============================================================
drop policy if exists "anon_read_settings"       on public.settings;
drop policy if exists "anon_read_announcements"  on public.announcements;
drop policy if exists "anon_insert_pending_reg"  on public.pending_registrations;

-- ============================================================
-- POLICIES — anon role เข้าถึงได้ทั้งหมด (no-auth mode)
-- ใช้ anon key จาก config.js — ไม่มี service_role key ใน frontend
-- ============================================================

create policy "anon_all_users"               on public.users               for all to anon using (true) with check (true);
create policy "anon_all_sessions"            on public.sessions             for all to anon using (true) with check (true);
create policy "anon_all_permissions"         on public.permissions          for all to anon using (true) with check (true);
create policy "anon_all_pending_reg"         on public.pending_registrations for all to anon using (true) with check (true);
create policy "anon_all_housing"             on public.housing              for all to anon using (true) with check (true);
create policy "anon_all_residents"           on public.residents            for all to anon using (true) with check (true);
create policy "anon_all_coresidents"         on public.coresidents          for all to anon using (true) with check (true);
create policy "anon_all_water_bills"         on public.water_bills          for all to anon using (true) with check (true);
create policy "anon_all_electric_bills"      on public.electric_bills       for all to anon using (true) with check (true);
create policy "anon_all_water_rates"         on public.water_rates          for all to anon using (true) with check (true);
create policy "anon_all_outstanding"         on public.outstanding          for all to anon using (true) with check (true);
create policy "anon_all_slip_submissions"    on public.slip_submissions     for all to anon using (true) with check (true);
create policy "anon_all_payment_history"     on public.payment_history      for all to anon using (true) with check (true);
create policy "anon_all_notifications"       on public.notifications        for all to anon using (true) with check (true);
create policy "anon_all_requests"            on public.requests             for all to anon using (true) with check (true);
create policy "anon_all_queue"               on public.queue                for all to anon using (true) with check (true);
create policy "anon_all_accounting_entries"  on public.accounting_entries   for all to anon using (true) with check (true);
create policy "anon_all_monthly_withdraw"    on public.monthly_withdraw     for all to anon using (true) with check (true);
create policy "anon_all_exemptions"          on public.exemptions           for all to anon using (true) with check (true);
create policy "anon_all_settings"            on public.settings             for all to anon using (true) with check (true);
create policy "anon_all_announcements"       on public.announcements        for all to anon using (true) with check (true);
create policy "anon_all_logs"                on public.logs                 for all to anon using (true) with check (true);

-- ============================================================
-- ⚠️  วิธีใช้:
-- 1. เปิด Supabase Dashboard → SQL Editor
-- 2. Copy ทั้งหมดนี้แล้ว Run
-- 3. หากมี policy เดิมอยู่ — script drop ให้อัตโนมัติก่อน
-- ============================================================
