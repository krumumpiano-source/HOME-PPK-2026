-- ============================================================
-- HOME PPK 2026 — Supabase Schema
-- แทนที่ Google Sheets ด้วย PostgreSQL บน Supabase
-- รัน script นี้ใน Supabase SQL Editor ครั้งเดียว
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- USERS & AUTH
-- ============================================================

create table if not exists public.users (
  id          text primary key default ('USR' || upper(substr(gen_random_uuid()::text, 1, 8))),
  email       text unique not null,
  phone       text,
  prefix      text,
  firstname   text not null,
  lastname    text not null,
  position    text,
  role        text not null default 'user',  -- 'admin' | 'user'
  password_hash text not null,
  pdpa_consent  boolean default false,
  is_active   boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table if not exists public.sessions (
  token       text primary key default gen_random_uuid()::text,
  user_id     text not null references public.users(id) on delete cascade,
  role        text not null default 'user',
  resident_id text,
  house_number text,
  created_at  timestamptz default now(),
  expires_at  timestamptz default (now() + interval '24 hours')
);

create table if not exists public.permissions (
  id          text primary key default ('PRM' || upper(substr(gen_random_uuid()::text, 1, 8))),
  user_id     text not null references public.users(id) on delete cascade,
  permission  text not null,
  granted_by  text,
  granted_at  timestamptz default now()
);

create table if not exists public.pending_registrations (
  id              text primary key default ('REG' || upper(substr(gen_random_uuid()::text, 1, 8))),
  email           text not null,
  phone           text,
  prefix          text,
  firstname       text not null,
  lastname        text not null,
  position        text,
  address_no      text,
  address_road    text,
  address_village text,
  subdistrict     text,
  district        text,
  province        text,
  zipcode         text,
  password_hash   text not null,
  pdpa_consent    boolean default false,
  status          text default 'pending',  -- pending | approved | rejected
  reviewed_by     text,
  reviewed_at     timestamptz,
  review_note     text,
  submitted_at    timestamptz default now()
);

-- ============================================================
-- HOUSING & RESIDENTS
-- ============================================================

create table if not exists public.housing (
  id            text primary key default ('HOU' || upper(substr(gen_random_uuid()::text, 1, 8))),
  house_number  text unique not null,
  type          text not null default 'house',  -- 'house' | 'flat'
  building      text,
  floor         int,
  status        text default 'available',  -- available | occupied | maintenance
  notes         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists public.residents (
  id            text primary key default ('RES' || upper(substr(gen_random_uuid()::text, 1, 8))),
  user_id       text references public.users(id) on delete set null,
  house_id      text not null references public.housing(id) on delete restrict,
  house_number  text not null,
  prefix        text,
  firstname     text not null,
  lastname      text not null,
  position      text,
  start_date    date,
  end_date      date,
  is_active     boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists public.coresidents (
  id            text primary key default ('COR' || upper(substr(gen_random_uuid()::text, 1, 8))),
  resident_id   text not null references public.residents(id) on delete cascade,
  house_id      text not null references public.housing(id) on delete cascade,
  prefix        text,
  firstname     text not null,
  lastname      text not null,
  relation      text,
  created_at    timestamptz default now()
);

-- ============================================================
-- BILLING — WATER & ELECTRIC
-- ============================================================

create table if not exists public.water_bills (
  id            text primary key default ('WTR' || upper(substr(gen_random_uuid()::text, 1, 8))),
  house_id      text not null references public.housing(id) on delete restrict,
  house_number  text not null,
  period        text not null,  -- 'YYYY-MM'
  year          int not null,
  month         int not null,
  prev_meter    numeric(10,2) default 0,
  curr_meter    numeric(10,2) default 0,
  units_used    numeric(10,2) default 0,
  rate_per_unit numeric(10,4) default 0,
  amount        numeric(10,2) default 0,
  status        text default 'pending',  -- pending | paid | exempt
  recorded_by   text,
  recorded_at   timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists public.electric_bills (
  id            text primary key default ('ELC' || upper(substr(gen_random_uuid()::text, 1, 8))),
  house_id      text not null references public.housing(id) on delete restrict,
  house_number  text not null,
  period        text not null,  -- 'YYYY-MM'
  year          int not null,
  month         int not null,
  prev_meter    numeric(10,2) default 0,
  curr_meter    numeric(10,2) default 0,
  units_used    numeric(10,2) default 0,
  rate_per_unit numeric(10,4) default 0,
  bill_amount   numeric(10,2) default 0,
  amount        numeric(10,2) default 0,
  method        text default 'bill',  -- bill | unit
  status        text default 'pending',
  recorded_by   text,
  recorded_at   timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists public.water_rates (
  id            text primary key default ('RAT' || upper(substr(gen_random_uuid()::text, 1, 8))),
  min_unit      numeric(10,2) not null,
  max_unit      numeric(10,2),  -- null = ไม่มีขีดบน
  rate          numeric(10,4) not null,
  effective_at  date default current_date,
  created_at    timestamptz default now()
);

-- ============================================================
-- PAYMENTS
-- ============================================================

create table if not exists public.outstanding (
  id            text primary key default ('OUT' || upper(substr(gen_random_uuid()::text, 1, 8))),
  house_id      text not null references public.housing(id) on delete restrict,
  house_number  text not null,
  resident_id   text references public.residents(id) on delete set null,
  period        text not null,
  year          int not null,
  month         int not null,
  water_amount  numeric(10,2) default 0,
  electric_amount numeric(10,2) default 0,
  common_fee    numeric(10,2) default 0,
  garbage_fee   numeric(10,2) default 0,
  total_amount  numeric(10,2) default 0,
  due_date      date,
  status        text default 'unpaid',  -- unpaid | paid | partial | waived
  updated_at    timestamptz default now()
);

create table if not exists public.slip_submissions (
  id            text primary key default ('SLP' || upper(substr(gen_random_uuid()::text, 1, 8))),
  resident_id   text references public.residents(id) on delete set null,
  house_id      text references public.housing(id) on delete set null,
  house_number  text not null,
  period        text not null,
  amount        numeric(10,2) not null,
  transfer_date date,
  bank_name     text,
  account_name  text,
  slip_url      text,  -- Supabase Storage URL
  status        text default 'pending',  -- pending | approved | rejected
  reviewed_by   text,
  reviewed_at   timestamptz,
  review_note   text,
  submitted_at  timestamptz default now()
);

create table if not exists public.payment_history (
  id            text primary key default ('PAY' || upper(substr(gen_random_uuid()::text, 1, 8))),
  outstanding_id text references public.outstanding(id) on delete set null,
  house_id      text references public.housing(id) on delete set null,
  house_number  text not null,
  period        text not null,
  amount_paid   numeric(10,2) not null,
  payment_date  date not null,
  payment_method text default 'transfer',  -- transfer | cash
  slip_id       text references public.slip_submissions(id) on delete set null,
  recorded_by   text,
  recorded_at   timestamptz default now()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

create table if not exists public.notifications (
  id            text primary key default ('NTF' || upper(substr(gen_random_uuid()::text, 1, 8))),
  house_id      text references public.housing(id) on delete set null,
  house_number  text not null,
  period        text not null,
  water_amount  numeric(10,2) default 0,
  electric_amount numeric(10,2) default 0,
  common_fee    numeric(10,2) default 0,
  garbage_fee   numeric(10,2) default 0,
  total_amount  numeric(10,2) default 0,
  due_date      date,
  message       text,
  sent_by       text,
  sent_at       timestamptz default now()
);

-- ============================================================
-- REQUESTS
-- ============================================================

create table if not exists public.requests (
  id            text primary key,  -- REQ / TRF / RTN / RPR prefix
  type          text not null,  -- 'residence' | 'transfer' | 'return' | 'repair'
  user_id       text references public.users(id) on delete set null,
  house_id      text references public.housing(id) on delete set null,
  house_number  text,
  status        text default 'pending',  -- pending | approved | rejected | cancelled
  details       jsonb default '{}',
  attachment_url text,
  reviewed_by   text,
  reviewed_at   timestamptz,
  review_note   text,
  submitted_at  timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists public.queue (
  id            text primary key default ('QUE' || upper(substr(gen_random_uuid()::text, 1, 8))),
  user_id       text references public.users(id) on delete set null,
  request_id    text references public.requests(id) on delete set null,
  position      int,
  status        text default 'waiting',  -- waiting | assigned | expired | cancelled
  expires_at    timestamptz,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ============================================================
-- ACCOUNTING
-- ============================================================

create table if not exists public.accounting_entries (
  id            text primary key default ('ACT' || upper(substr(gen_random_uuid()::text, 1, 8))),
  period        text not null,
  year          int not null,
  month         int not null,
  type          text not null,  -- 'income' | 'expense'
  category      text,
  description   text not null,
  amount        numeric(10,2) not null,
  receipt_url   text,
  recorded_by   text,
  recorded_at   timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists public.monthly_withdraw (
  id            text primary key default ('WTD' || upper(substr(gen_random_uuid()::text, 1, 8))),
  period        text not null,
  year          int not null,
  month         int not null,
  description   text not null,
  amount        numeric(10,2) not null,
  recipient     text,
  approved_by   text,
  approved_at   timestamptz,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists public.exemptions (
  id            text primary key default ('EXM' || upper(substr(gen_random_uuid()::text, 1, 8))),
  house_id      text not null references public.housing(id) on delete cascade,
  house_number  text not null,
  type          text not null,  -- 'water' | 'electric' | 'common_fee' | 'garbage'
  reason        text,
  start_date    date,
  end_date      date,
  created_by    text,
  created_at    timestamptz default now()
);

-- ============================================================
-- SETTINGS & MISC
-- ============================================================

create table if not exists public.settings (
  key           text primary key,
  value         text,
  updated_by    text,
  updated_at    timestamptz default now()
);

create table if not exists public.announcements (
  id            text primary key default ('ANN' || upper(substr(gen_random_uuid()::text, 1, 8))),
  title         text not null,
  body          text,
  type          text default 'info',  -- info | warning | urgent
  is_active     boolean default true,
  created_by    text,
  created_at    timestamptz default now(),
  expires_at    timestamptz
);

create table if not exists public.logs (
  id            text primary key default ('LOG' || upper(substr(gen_random_uuid()::text, 1, 8))),
  action        text not null,
  user_id       text,
  description   text,
  meta          jsonb default '{}',
  created_at    timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_sessions_user_id on public.sessions(user_id);
create index if not exists idx_sessions_expires_at on public.sessions(expires_at);
create index if not exists idx_residents_house_id on public.residents(house_id);
create index if not exists idx_water_bills_period on public.water_bills(period, house_number);
create index if not exists idx_electric_bills_period on public.electric_bills(period, house_number);
create index if not exists idx_outstanding_period on public.outstanding(period, house_number);
create index if not exists idx_slip_submissions_status on public.slip_submissions(status);
create index if not exists idx_requests_type_status on public.requests(type, status);
create index if not exists idx_logs_created_at on public.logs(created_at desc);
create index if not exists idx_accounting_period on public.accounting_entries(period, type);

-- ============================================================
-- DEFAULT SETTINGS
-- ============================================================

insert into public.settings (key, value) values
  ('org_name',            'งานส่งเสริม กำกับ ดูแล และพัฒนาบ้านพักครู'),
  ('school_name',         'โรงเรียนพะเยาพิทยาคม'),
  ('water_rate',          ''),
  ('common_fee_house',    '110'),
  ('common_fee_flat',     '110'),
  ('garbage_fee',         '310'),
  ('due_date',            '15'),
  ('reminder_days',       '5'),
  ('house_prefix',        'บ้าน'),
  ('flat_prefix',         'แฟลต'),
  ('electric_method',     'bill'),
  ('electric_rate',       ''),
  ('electric_min_charge', '0'),
  ('electric_rounding',   'ceil'),
  ('water_min_charge',    '0'),
  ('water_rounding',      'none'),
  ('require_login',       'true'),
  ('allow_reset_password','true'),
  ('allow_registration',  'true'),
  ('queue_expiry_days',   '180')
on conflict (key) do nothing;

-- ============================================================
-- AUTO-CLEANUP expired sessions (via pg_cron — optional)
-- เปิดใช้ใน Supabase Dashboard → Extensions → pg_cron
-- ============================================================
-- select cron.schedule('cleanup-sessions', '0 * * * *',
--   $$delete from public.sessions where expires_at < now()$$);

-- ============================================================
-- MIGRATIONS — เพิ่ม columns ที่ต้องการเพิ่มเติม
-- รัน section นี้หลังจาก schema เดิม (safe to re-run)
-- ============================================================

alter table if exists public.residents
  add column if not exists phone          text,
  add column if not exists email          text,
  add column if not exists subject_group  text,
  add column if not exists resident_type  text default 'teacher',
  add column if not exists status         text default 'active',
  add column if not exists birthdate      date,
  add column if not exists cohabitants    int default 0,
  add column if not exists cohabitant_names text;

alter table if exists public.users
  add column if not exists subject_group  text;
