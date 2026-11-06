-- สำเนาใบเสร็จที่ส่งทางอีเมล (สำเร็จและส่งไม่ถึง)
-- เขียนได้เฉพาะ service role ผ่าน edge function
-- อ่านได้เฉพาะแอดมิน/หัวหน้า หรือผู้มีสิทธิ์ตรวจสลิป

create table public.receipt_archives (
  id uuid primary key default gen_random_uuid(),
  house_number text not null default '',
  resident_name text not null default '',
  email text not null default '',
  amount numeric(12,2),
  period text not null default '',
  subject text not null default '',
  html text not null default '',
  text_body text,
  status text not null default 'pending',
  failure_reason text,
  slip_id text,
  message_id text,
  parent_id uuid references public.receipt_archives (id) on delete set null,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  constraint receipt_archives_status_check check (status in ('pending', 'sent', 'failed')),
  constraint receipt_archives_html_len check (char_length(html) <= 200000),
  constraint receipt_archives_subject_len check (char_length(subject) <= 500)
);

comment on table public.receipt_archives is
  'สำเนาใบเสร็จค่าสาธารณูปโภคที่ระบบส่งทางอีเมล ทั้งฉบับที่ส่งถึงและฉบับที่ส่งไม่ถึง';

create index receipt_archives_created_at_idx on public.receipt_archives (created_at desc);
create index receipt_archives_period_idx on public.receipt_archives (period);
create index receipt_archives_house_idx on public.receipt_archives (house_number);
create index receipt_archives_status_idx on public.receipt_archives (status);
create index receipt_archives_email_idx on public.receipt_archives (email);
create index receipt_archives_message_id_idx on public.receipt_archives (message_id) where message_id is not null;

alter table public.receipt_archives enable row level security;

create policy receipt_archives_select
  on public.receipt_archives
  for select
  to anon, authenticated
  using (public.is_admin_session() or public.has_permission(array['slip']));

revoke all on table public.receipt_archives from public, anon, authenticated;
grant select on table public.receipt_archives to anon, authenticated;
grant select, insert, update, delete on table public.receipt_archives to service_role;
