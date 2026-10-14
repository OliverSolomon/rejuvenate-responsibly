-- =============================================================================
-- Rate My Impact: complete schema.
--
-- Run this once against a fresh Supabase project and everything the assessment
-- needs exists: tables, indexes, row level security, the admin allow list and
-- the trigger that keeps updated_at honest.
--
-- It is written to be safe to run twice. Every object is created only if it is
-- missing and every policy is dropped before it is recreated, so re-running
-- after an edit does not error and does not duplicate anything.
--
-- How to run it:
--   Supabase dashboard  SQL Editor, paste, Run
--   CLI                 supabase db push
--   psql                psql "$DATABASE_URL" -f 0001_rate_my_impact.sql
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

do $$ begin
  create type rmi_assessment_status as enum ('draft', 'submitted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type rmi_payment_status as enum ('unpaid', 'pending', 'paid', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type rmi_report_status as enum ('none', 'draft', 'issued');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- Who may read the dashboard.
--
-- Signing in is not the same as being allowed in. A row here, added by hand or
-- by another admin, is what grants access. Without one a signed-in user sees
-- nothing, which is what we want for a dashboard holding every client's
-- answers.
-- -----------------------------------------------------------------------------

create table if not exists public.rmi_admins (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  created_at  timestamptz not null default now()
);

comment on table public.rmi_admins is
  'Allow list for the Rate My Impact dashboard. Membership here, not merely having an account, is what grants access.';

create or replace function public.rmi_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.rmi_admins where id = auth.uid());
$$;

-- -----------------------------------------------------------------------------
-- Assessments
-- -----------------------------------------------------------------------------

create table if not exists public.rmi_assessments (
  -- The short reference the client quotes, e.g. RMI-7F3K2Q.
  id                  text primary key,
  -- The other half of the resume link. The reference alone opens nothing.
  token               text not null unique,
  status              rmi_assessment_status not null default 'draft',

  organisation        text not null,
  contact_name        text not null default '',
  email               text not null,
  role                text not null default '',
  sector              text not null default '',

  -- Answers keyed by question id: { "c-governance-board-oversight": { base, followUp } }
  answers             jsonb not null default '{}'::jsonb,
  -- Scored result at submission, kept so the dashboard need not rescore to list.
  score               jsonb,

  payment_status      rmi_payment_status not null default 'unpaid',
  payment_tier        text,
  payment_amount      numeric(12,2),
  payment_currency    text not null default 'KES',
  merchant_reference  text unique,
  order_tracking_id   text,
  payment_method      text,
  paid_at             timestamptz,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  submitted_at        timestamptz
);

create index if not exists rmi_assessments_email_idx       on public.rmi_assessments (lower(email));
create index if not exists rmi_assessments_org_idx         on public.rmi_assessments (lower(organisation));
create index if not exists rmi_assessments_status_idx      on public.rmi_assessments (status);
create index if not exists rmi_assessments_created_idx     on public.rmi_assessments (created_at desc);
create index if not exists rmi_assessments_payment_idx     on public.rmi_assessments (payment_status);

-- -----------------------------------------------------------------------------
-- The people the assessment was shared with
-- -----------------------------------------------------------------------------

create table if not exists public.rmi_shares (
  id             uuid primary key default gen_random_uuid(),
  assessment_id  text not null references public.rmi_assessments (id) on delete cascade,
  name           text not null default '',
  email          text not null,
  relationship   text not null default '',
  -- Their own survey link. Unguessable, and scoped to this one assessment.
  token          text not null unique,
  invited_at     timestamptz not null default now(),
  responded_at   timestamptz,

  -- One invitation per address per assessment.
  unique (assessment_id, email)
);

create index if not exists rmi_shares_assessment_idx on public.rmi_shares (assessment_id);
create index if not exists rmi_shares_pending_idx    on public.rmi_shares (assessment_id) where responded_at is null;

-- -----------------------------------------------------------------------------
-- What the stakeholders answered
-- -----------------------------------------------------------------------------

create table if not exists public.rmi_stakeholder_responses (
  id             uuid primary key default gen_random_uuid(),
  assessment_id  text not null references public.rmi_assessments (id) on delete cascade,
  share_id       uuid references public.rmi_shares (id) on delete set null,
  name           text not null default '',
  email          text not null,
  relationship   text not null default '',
  answers        jsonb not null default '{}'::jsonb,
  score          jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists rmi_responses_assessment_idx on public.rmi_stakeholder_responses (assessment_id);

-- -----------------------------------------------------------------------------
-- Reports
--
-- Kept as its own table rather than a column so an edit never destroys what the
-- model wrote. `markdown` is what an admin has saved; `generated_markdown`
-- stays as the original, so "revert to the generated version" is always
-- possible and the two can be compared.
-- -----------------------------------------------------------------------------

create table if not exists public.rmi_reports (
  assessment_id       text primary key references public.rmi_assessments (id) on delete cascade,
  status              rmi_report_status not null default 'draft',
  markdown            text not null,
  generated_markdown  text,
  model               text,
  generated_at        timestamptz not null default now(),
  edited_at           timestamptz,
  edited_by           uuid references auth.users (id) on delete set null,
  issued_at           timestamptz,
  issued_by           uuid references auth.users (id) on delete set null
);

create index if not exists rmi_reports_status_idx on public.rmi_reports (status);

-- -----------------------------------------------------------------------------
-- updated_at
-- -----------------------------------------------------------------------------

create or replace function public.rmi_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rmi_assessments_touch on public.rmi_assessments;
create trigger rmi_assessments_touch
  before update on public.rmi_assessments
  for each row execute function public.rmi_touch_updated_at();

-- -----------------------------------------------------------------------------
-- Row level security
--
-- Everything is closed. The app writes with the service role key, which bypasses
-- RLS entirely, so the policies below exist for one purpose: letting a
-- signed-in admin read through the dashboard. No anon role can read any of it,
-- which matters because these tables hold named contacts and their answers.
-- -----------------------------------------------------------------------------

alter table public.rmi_admins                enable row level security;
alter table public.rmi_assessments           enable row level security;
alter table public.rmi_shares                enable row level security;
alter table public.rmi_stakeholder_responses enable row level security;
alter table public.rmi_reports               enable row level security;

drop policy if exists rmi_admins_self_read on public.rmi_admins;
create policy rmi_admins_self_read on public.rmi_admins
  for select to authenticated
  using (id = auth.uid() or public.rmi_is_admin());

drop policy if exists rmi_assessments_admin_read on public.rmi_assessments;
create policy rmi_assessments_admin_read on public.rmi_assessments
  for select to authenticated using (public.rmi_is_admin());

drop policy if exists rmi_shares_admin_read on public.rmi_shares;
create policy rmi_shares_admin_read on public.rmi_shares
  for select to authenticated using (public.rmi_is_admin());

drop policy if exists rmi_responses_admin_read on public.rmi_stakeholder_responses;
create policy rmi_responses_admin_read on public.rmi_stakeholder_responses
  for select to authenticated using (public.rmi_is_admin());

drop policy if exists rmi_reports_admin_read on public.rmi_reports;
create policy rmi_reports_admin_read on public.rmi_reports
  for select to authenticated using (public.rmi_is_admin());

-- Admins edit and issue reports from the dashboard, so this one is writable.
drop policy if exists rmi_reports_admin_write on public.rmi_reports;
create policy rmi_reports_admin_write on public.rmi_reports
  for update to authenticated
  using (public.rmi_is_admin())
  with check (public.rmi_is_admin());

-- -----------------------------------------------------------------------------
-- Grants
--
-- Supabase grants on the public schema by default, which would leave these
-- tables reachable by the anon role and relying on RLS alone to say no. Belt
-- and braces: anon is revoked outright, and authenticated gets only select,
-- plus update on reports because that is what editing needs. The app itself
-- writes with the service role, which is exempt from all of this.
-- -----------------------------------------------------------------------------

revoke all on public.rmi_admins, public.rmi_assessments, public.rmi_shares,
               public.rmi_stakeholder_responses, public.rmi_reports
  from anon;

grant select on public.rmi_admins, public.rmi_assessments, public.rmi_shares,
                public.rmi_stakeholder_responses, public.rmi_reports
  to authenticated;

grant update (status, markdown, edited_at, edited_by, issued_at, issued_by)
  on public.rmi_reports to authenticated;

-- -----------------------------------------------------------------------------
-- Dashboard read model
--
-- One row per assessment with the counts the list needs, so the dashboard does
-- not fan out a query per row. Security invoker means the caller's RLS applies:
-- a non-admin selecting from it still sees nothing.
-- -----------------------------------------------------------------------------

create or replace view public.rmi_assessment_overview
with (security_invoker = true)
as
select
  a.id,
  a.organisation,
  a.contact_name,
  a.email,
  a.sector,
  a.status,
  a.payment_status,
  a.created_at,
  a.submitted_at,
  a.updated_at,
  (a.score ->> 'overall')::numeric                      as overall_score,
  a.score ->> 'tier'                                    as tier,
  (select count(*) from public.rmi_shares s
     where s.assessment_id = a.id)                      as invited_count,
  (select count(*) from public.rmi_shares s
     where s.assessment_id = a.id
       and s.responded_at is not null)                  as responded_count,
  coalesce(r.status, 'none')::rmi_report_status         as report_status,
  r.generated_at                                        as report_generated_at,
  r.edited_at                                           as report_edited_at
from public.rmi_assessments a
left join public.rmi_reports r on r.assessment_id = a.id;

comment on view public.rmi_assessment_overview is
  'One row per assessment with stakeholder and report counts, for the dashboard list.';

revoke all on public.rmi_assessment_overview from anon;
grant select on public.rmi_assessment_overview to authenticated;

-- -----------------------------------------------------------------------------
-- Granting yourself access
--
-- Create the account first (sign in once through the app, or add the user in
-- Authentication > Users), then run:
--
--   insert into public.rmi_admins (id, email, full_name)
--   select id, email, 'Your Name' from auth.users where email = 'you@example.com'
--   on conflict (id) do nothing;
-- -----------------------------------------------------------------------------
