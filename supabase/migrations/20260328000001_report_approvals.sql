-- Report approval workflow: user submits → admin signs → user prints
create table if not exists public.report_approvals (
  id            text primary key default ('RAP' || upper(substr(gen_random_uuid()::text, 1, 8))),
  report_type   text not null,             -- 'water_monthly' | 'water_yearly' | 'electric_monthly' | 'electric_yearly'
  period        text not null,             -- YYYY-MM (monthly) or YYYY (yearly)
  year          text,                      -- ปี พ.ศ.
  submitted_by  text references public.users(id) on delete set null,
  report_html   text not null,             -- Full HTML snapshot of the report
  status        text default 'pending',    -- pending | approved | rejected
  reviewer_note text,
  -- Digital signatures (base64 PNG from signature canvas)
  sig_recorder  text,                      -- ลายเซ็นผู้บันทึก
  sig_checker   text,                      -- ลายเซ็นผู้ตรวจสอบ
  sig_head      text,                      -- ลายเซ็นหัวหน้างาน
  reviewed_by   text references public.users(id) on delete set null,
  reviewed_at   timestamptz,
  submitted_at  timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists idx_report_approvals_status on public.report_approvals(status, report_type);
create index if not exists idx_report_approvals_period on public.report_approvals(period, report_type);
