-- ============================================================
-- HOME PPK 2026 — Row Level Security (RLS)
-- รัน script นี้หลัง schema.sql ใน Supabase SQL Editor
-- ============================================================

-- ── Enable RLS บน tables ทั้งหมด ──────────────────────────
alter table public.users                enable row level security;
alter table public.sessions             enable row level security;
alter table public.permissions          enable row level security;
alter table public.pending_registrations enable row level security;
alter table public.housing              enable row level security;
alter table public.residents            enable row level security;
alter table public.coresidents          enable row level security;
alter table public.water_bills          enable row level security;
alter table public.electric_bills       enable row level security;
alter table public.water_rates          enable row level security;
alter table public.outstanding          enable row level security;
alter table public.slip_submissions     enable row level security;
alter table public.payment_history      enable row level security;
alter table public.notifications        enable row level security;
alter table public.requests             enable row level security;
alter table public.queue                enable row level security;
alter table public.accounting_entries   enable row level security;
alter table public.monthly_withdraw     enable row level security;
alter table public.exemptions           enable row level security;
alter table public.settings             enable row level security;
alter table public.announcements        enable row level security;
alter table public.logs                 enable row level security;

-- ============================================================
-- HELPER FUNCTION — ดึง role จาก session token
-- ============================================================

create or replace function public.get_session_role(p_token text)
returns text language sql security definer stable as $$
  select role from public.sessions
  where token = p_token and expires_at > now()
  limit 1;
$$;

create or replace function public.get_session_user_id(p_token text)
returns text language sql security definer stable as $$
  select user_id from public.sessions
  where token = p_token and expires_at > now()
  limit 1;
$$;

-- ============================================================
-- POLICIES — ใช้ service_role สำหรับ backend ทั้งหมด
-- Frontend ใช้ anon key + token validation ที่ backend
-- ============================================================

-- ── anon: อ่าน settings และ announcements ได้ ──
create policy "anon_read_settings" on public.settings
  for select using (true);

create policy "anon_read_announcements" on public.announcements
  for select using (is_active = true);

-- ── anon: สมัครสมาชิกได้ ──
create policy "anon_insert_pending_reg" on public.pending_registrations
  for insert with check (true);

-- ── service_role bypass RLS — backend ใช้ service key ──
-- (service_role มีสิทธิ์เต็มโดยอัตโนมัติ)
