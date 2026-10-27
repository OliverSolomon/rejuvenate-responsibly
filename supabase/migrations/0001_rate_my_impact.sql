-- =============================================================================
-- Rate My Impact: the whole database, in one script.
--
-- Run this against a Supabase project and everything the app needs exists:
-- tables, indexes, row level security, the dashboard allow list with its two
-- roles, the report template, the uploads bucket and the triggers that keep
-- updated_at honest.
--
-- It is the only script to run. It replaces the five numbered migrations this
-- project used to carry, and it works in all three situations:
--
--   * a fresh project, where it creates everything
--   * a project running an older version, where it adds what is missing
--   * a project already up to date, where it changes nothing
--
-- Safe to run as many times as you like. Every object is created only when it
-- is missing, and every policy is dropped before being recreated.
--
-- No statement here deletes or truncates anybody's data. Two statements do
-- change existing rows, and both are named where they appear: the settings and
-- the report template used to be pinned to a single row, and are now keyed by
-- company, so the row that is already there is adopted by the default company.
-- That is a rename of its key, not a loss of its contents.
--
-- How to run it:
--   Supabase dashboard  SQL Editor, paste, Run
--   CLI                 supabase db push
--   psql                psql "$DATABASE_URL" -f 0001_rate_my_impact.sql
--
-- A note on how it is laid out. Each table is created with the shape it should
-- end up with, which is what you want when reading it. Underneath, the
-- "bringing an older project up to date" section adds those same columns with
-- `if not exists`, which is what an existing project needs. On a fresh project
-- that second section does nothing; on an older one the first section does
-- nothing. The two paths are checked against each other and end up identical.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

do $$ begin
  create type rmi_assessment_status as enum ('draft', 'submitted');
exception when duplicate_object then null; end $$;

-- `waived` is an assessment opened while the admin "require payment" switch was
-- off, kept separate so test runs never count as revenue.
do $$ begin
  create type rmi_payment_status as enum ('unpaid', 'pending', 'paid', 'failed', 'waived');
exception when duplicate_object then null; end $$;

-- For a project whose type was made before `waived` existed. Adding a value
-- does not touch any existing row.
alter type rmi_payment_status add value if not exists 'waived';

do $$ begin
  create type rmi_report_status as enum ('none', 'draft', 'issued');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- Companies
--
-- More than one firm uses this. Each has its own people, its own branding, its
-- own report template, its own currency and its own clients, and sees none of
-- anybody else's. A super admin sees across all of them.
--
-- The slug is what appears in an assessment link, so a submission attributes to
-- whoever sent the client there. The default company keeps the plain link with
-- no slug on it.
-- -----------------------------------------------------------------------------

create table if not exists public.rmi_companies (
  -- Stable and short, and the key everything else points at. Not the slug: a
  -- company can be renamed without orphaning its data.
  id          text primary key,
  -- What goes in the assessment link, e.g. /rmi/assessment?c=acme.
  slug        text not null unique,
  name        text not null,
  -- The firm that owns the installation. Exactly one, and it cannot be closed.
  is_default  boolean not null default false,
  -- A closed company keeps its data and stops accepting new assessments.
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  created_by  text,
  updated_at  timestamptz not null default now()
);

comment on table public.rmi_companies is
  'The firms using this installation. Everything else is scoped to one of these.';

-- The company that was always here, adopting everything that already exists.
insert into public.rmi_companies (id, slug, name, is_default)
values ('default', 'rejuvenate', 'Rejuvenate Responsibly', true)
on conflict (id) do nothing;

create index if not exists rmi_companies_active_idx on public.rmi_companies (active) where active;

-- -----------------------------------------------------------------------------
-- Who may read the dashboard.
--
-- Signing in is not the same as being allowed in. A row here is what grants
-- access. Without one a signed-in user sees nothing, which is what we want for
-- a dashboard holding every client's answers.
--
-- Two roles. An owner adds and removes people and changes roles; an admin does
-- everything else. The first row is inserted by hand (see the end of this
-- file); everyone after that is added from Settings > Team.
-- -----------------------------------------------------------------------------

create table if not exists public.rmi_admins (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  -- Which company they work for. A super admin still belongs to one, which is
  -- the organisation they manage when they switch out of the global view.
  -- The foreign key is added in the upgrade section below, which runs on every
  -- path, so it is declared exactly once and ends up named the same either way.
  company_id  text not null default 'default',
  role        text not null default 'admin',
  -- Email of the owner who added them, and when. Null for a row inserted by
  -- hand, and for anyone added before roles existed.
  invited_by  text,
  invited_at  timestamptz,
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
  payment_updated_at  timestamptz,

  -- Which company's link this came through, and therefore whose client it is.
  company_id          text not null default 'default',

  -- The organisation's own logo, uploaded while filling in the assessment.
  -- A path inside the rmi-assets bucket, e.g. client-logos/RMI-7F3K2Q.png.
  -- Null means they did not add one, which is the normal case.
  client_logo         text,

  -- Rows loaded from the dashboard's sample data panel. Lets that panel remove
  -- its own rows and nothing else.
  sample              boolean not null default false,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  submitted_at        timestamptz
);

create index if not exists rmi_assessments_email_idx   on public.rmi_assessments (lower(email));
create index if not exists rmi_assessments_org_idx     on public.rmi_assessments (lower(organisation));
create index if not exists rmi_assessments_status_idx  on public.rmi_assessments (status);
create index if not exists rmi_assessments_created_idx on public.rmi_assessments (created_at desc);
create index if not exists rmi_assessments_payment_idx on public.rmi_assessments (payment_status);

-- -----------------------------------------------------------------------------
-- The people the assessment was shared with
-- -----------------------------------------------------------------------------

create table if not exists public.rmi_shares (
  id              uuid primary key default gen_random_uuid(),
  assessment_id   text not null references public.rmi_assessments (id) on delete cascade,
  name            text not null default '',
  email           text not null,
  relationship    text not null default '',
  -- Their own survey link. Unguessable, and scoped to this one assessment.
  token           text not null unique,
  invited_at      timestamptz not null default now(),
  responded_at    timestamptz,

  -- Whether the invitation email arrived. Null on invitations sent before this
  -- was recorded, which the dashboard treats as unknown rather than failed.
  delivery_status text check (delivery_status in ('sent', 'failed', 'not_sent')),
  delivery_error  text,
  delivery_at     timestamptz,
  -- When an admin told the submitter that this address never received it.
  notified_at     timestamptz,
  notified_by     text,

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
  sample         boolean not null default false,
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
  edited_by_email     text,
  issued_at           timestamptz,
  issued_by           uuid references auth.users (id) on delete set null,

  -- Whether the draft went through the humaniser pass, and with which model.
  humanized           boolean not null default false,
  humanizer_model     text,

  -- When an admin sent the final report, by whom, and how many invited
  -- stakeholders had not answered at that moment.
  sent_at             timestamptz,
  sent_by             text,
  sent_outstanding    integer,

  -- The PDF as it was issued, in the rmi-assets bucket.
  pdf_path            text,
  pdf_size            integer,
  pdf_at              timestamptz,
  -- Which published template version built it.
  template_version    integer
);

create index if not exists rmi_reports_status_idx on public.rmi_reports (status);

-- -----------------------------------------------------------------------------
-- Dashboard settings
--
-- One row. `data` holds the settings an admin saved; secrets inside it are
-- already encrypted by the application (AES-256-GCM, key kept in the server
-- environment), so a database dump does not expose them.
-- -----------------------------------------------------------------------------

create table if not exists public.rmi_settings (
  -- One row per company, keyed by its id.
  id          text primary key default 'default',
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

comment on table public.rmi_settings is
  'One row of dashboard settings per company. Secrets inside data are encrypted by the application.';

-- -----------------------------------------------------------------------------
-- The house report template
--
-- The letterhead and footer every report is wrapped in, as a draft and as the
-- published version, so changes can be worked on without touching what clients
-- receive.
-- -----------------------------------------------------------------------------

create table if not exists public.rmi_report_templates (
  -- One template per company, keyed by its id.
  id                 text primary key default 'default',

  -- What an admin is working on. Never used for a real report.
  draft_html         text,
  -- The editor's own document, so reopening a draft is lossless rather than a
  -- round trip through HTML. A path inside the rmi-assets bucket.
  draft_doc          text,
  draft_updated_at   timestamptz,
  draft_updated_by   text,

  -- What live reports are built from. Null until an admin publishes once, and
  -- the application falls back to its built-in template until then.
  published_html     text,
  published_doc      text,
  published_at       timestamptz,
  published_by       text,
  -- Rises on every publish, so a report can record which one built it.
  version            integer not null default 0,

  updated_at         timestamptz not null default now()
);

comment on table public.rmi_report_templates is
  'One row per company holding the letterhead and footer its reports are wrapped in, as a draft and as the published version.';

-- -----------------------------------------------------------------------------
-- Bringing an older project up to date
--
-- Everything above creates tables in their finished shape, which is right for a
-- fresh project and does nothing on one that already has them. These statements
-- are the other half: they add the columns and constraints that arrived after
-- the first version, for a project that has been running a while. On a fresh
-- project every one of them is a no-op.
-- -----------------------------------------------------------------------------

-- A project from before companies existed. The default company was seeded
-- above, so these columns land already pointing at it.
alter table public.rmi_admins
  add column if not exists company_id text not null default 'default',
  add column if not exists invited_by text,
  add column if not exists invited_at timestamptz;

alter table public.rmi_assessments
  add column if not exists company_id text not null default 'default';

-- The foreign keys come after the columns, and only once, so a second run does
-- not trip over them.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'rmi_admins_company_fk') then
    alter table public.rmi_admins
      add constraint rmi_admins_company_fk foreign key (company_id)
      references public.rmi_companies (id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rmi_assessments_company_fk') then
    alter table public.rmi_assessments
      add constraint rmi_assessments_company_fk foreign key (company_id)
      references public.rmi_companies (id);
  end if;
end $$;

-- Settings and the report template were pinned to one row by a check
-- constraint. They are now keyed by company, so the constraint goes and the row
-- that is already there belongs to the default company, which is what its key
-- already says. Nothing is written; only the rule about what may be written.
alter table public.rmi_settings drop constraint if exists rmi_settings_id_check;
alter table public.rmi_report_templates drop constraint if exists rmi_report_templates_id_check;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'rmi_settings_company_fk') then
    alter table public.rmi_settings
      add constraint rmi_settings_company_fk foreign key (id)
      references public.rmi_companies (id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rmi_report_templates_company_fk') then
    alter table public.rmi_report_templates
      add constraint rmi_report_templates_company_fk foreign key (id)
      references public.rmi_companies (id) on delete cascade;
  end if;
end $$;

-- The role column needs care. Adding a NOT NULL column with a default gives
-- every existing row that default, and the people already in this table are the
-- ones who set the dashboard up, so they should be owners. So it arrives with
-- 'owner' as its default, which backfills them, and the default is then set to
-- 'admin' for everything inserted afterwards. No row is ever updated, and the
-- application states the role explicitly in any case.
alter table public.rmi_admins
  add column if not exists role text not null default 'owner';

alter table public.rmi_admins alter column role set default 'admin';

-- Three roles now, so a check written when there were two has to be replaced.
-- Dropping and adding a check touches no row; it only changes what may be
-- written from here on.
do $$
declare
  current_def text;
begin
  select pg_get_constraintdef(oid) into current_def
  from pg_constraint where conname = 'rmi_admins_role_check';

  if current_def is null then
    alter table public.rmi_admins
      add constraint rmi_admins_role_check check (role in ('super', 'owner', 'admin'));
  elsif current_def not like '%super%' then
    alter table public.rmi_admins drop constraint rmi_admins_role_check;
    alter table public.rmi_admins
      add constraint rmi_admins_role_check check (role in ('super', 'owner', 'admin'));
  end if;
end $$;

alter table public.rmi_assessments
  add column if not exists payment_updated_at timestamptz,
  add column if not exists client_logo text,
  add column if not exists sample boolean not null default false;

alter table public.rmi_shares
  add column if not exists delivery_status text,
  add column if not exists delivery_error text,
  add column if not exists delivery_at timestamptz,
  add column if not exists notified_at timestamptz,
  add column if not exists notified_by text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'rmi_shares_delivery_status_check') then
    alter table public.rmi_shares
      add constraint rmi_shares_delivery_status_check
      check (delivery_status in ('sent', 'failed', 'not_sent'));
  end if;
end $$;

alter table public.rmi_stakeholder_responses
  add column if not exists sample boolean not null default false;

alter table public.rmi_reports
  add column if not exists edited_by_email text,
  add column if not exists humanized boolean not null default false,
  add column if not exists humanizer_model text,
  add column if not exists sent_at timestamptz,
  add column if not exists sent_by text,
  add column if not exists sent_outstanding integer,
  add column if not exists pdf_path text,
  add column if not exists pdf_size integer,
  add column if not exists pdf_at timestamptz,
  add column if not exists template_version integer;

-- -----------------------------------------------------------------------------
-- Indexes and comments on the columns above
--
-- These come after both halves, not beside the tables, because a column added
-- by the upgrade section does not exist until that section has run. Indexing or
-- commenting on one earlier would fail on a project part way through.
-- -----------------------------------------------------------------------------

create index if not exists rmi_assessments_sample_idx on public.rmi_assessments (sample) where sample;

create index if not exists rmi_admins_role_idx on public.rmi_admins (role);
create index if not exists rmi_admins_company_idx on public.rmi_admins (company_id);
create index if not exists rmi_assessments_company_idx on public.rmi_assessments (company_id);

comment on column public.rmi_admins.role is
  'super sees every company and configures the installation; owner manages one company''s team; admin does everything else. The last owner of a company cannot be removed.';

comment on column public.rmi_reports.pdf_path is
  'The PDF as it was issued. Reports are valid for one year from sent_at; after that this file still downloads but is stamped as expired on the way out.';

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

drop trigger if exists rmi_companies_touch on public.rmi_companies;
create trigger rmi_companies_touch
  before update on public.rmi_companies
  for each row execute function public.rmi_touch_updated_at();

drop trigger if exists rmi_report_templates_touch on public.rmi_report_templates;
create trigger rmi_report_templates_touch
  before update on public.rmi_report_templates
  for each row execute function public.rmi_touch_updated_at();

-- -----------------------------------------------------------------------------
-- Row level security
--
-- Everything is closed. The app writes with the service role key, which bypasses
-- RLS entirely, so the policies below exist for one purpose: letting a
-- signed-in admin read through the dashboard. No anon role can read any of it,
-- which matters because these tables hold named contacts and their answers.
--
-- Settings and the report template have row level security on and no policies
-- at all, so only the service role reaches them.
-- -----------------------------------------------------------------------------

alter table public.rmi_companies             enable row level security;
alter table public.rmi_admins                enable row level security;
alter table public.rmi_assessments           enable row level security;
alter table public.rmi_shares                enable row level security;
alter table public.rmi_stakeholder_responses enable row level security;
alter table public.rmi_reports               enable row level security;
alter table public.rmi_settings              enable row level security;
alter table public.rmi_report_templates      enable row level security;

-- A signed-in admin may read the companies, which is how the dashboard knows
-- its own name. Writing is the service role's job, behind the super admin check
-- in the application.
drop policy if exists rmi_companies_admin_read on public.rmi_companies;
create policy rmi_companies_admin_read on public.rmi_companies
  for select to authenticated using (public.rmi_is_admin());

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

revoke all on public.rmi_companies, public.rmi_admins, public.rmi_assessments,
               public.rmi_shares, public.rmi_stakeholder_responses, public.rmi_reports
  from anon;

grant select on public.rmi_companies, public.rmi_admins, public.rmi_assessments,
                public.rmi_shares, public.rmi_stakeholder_responses, public.rmi_reports
  to authenticated;

grant update (status, markdown, edited_at, edited_by, issued_at, issued_by)
  on public.rmi_reports to authenticated;

-- Closed to everyone but the service role, and the grants are revoked as well
-- so a careless policy added later cannot expose them by accident.
revoke all on public.rmi_settings from anon, authenticated;
revoke all on public.rmi_report_templates from anon, authenticated;

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
  r.edited_at                                           as report_edited_at,
  r.sent_at                                             as report_sent_at,
  -- Appended rather than placed beside the id: `create or replace view` can add
  -- a column at the end but cannot insert one in the middle, so putting it
  -- anywhere else would fail on a project that already has this view.
  a.company_id
from public.rmi_assessments a
left join public.rmi_reports r on r.assessment_id = a.id;

comment on view public.rmi_assessment_overview is
  'One row per assessment with stakeholder and report counts, for the dashboard list.';

revoke all on public.rmi_assessment_overview from anon;
grant select on public.rmi_assessment_overview to authenticated;

-- -----------------------------------------------------------------------------
-- Where uploads live
--
-- Logos, stamps, the template document and issued PDFs. Private: nothing in
-- here is reachable by URL. The application reads it with the service role and
-- serves the bytes through its own routes, which is what keeps an issued report
-- behind its token and lets an expired one be stamped on the way out.
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('rmi-assets', 'rmi-assets', false)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- The first super admin
--
-- Runs only when nobody is a super admin yet, so it sets the installation up
-- and never overrides a decision made later from the dashboard. If her account
-- does not exist yet, this does nothing and can be re-run once it does.
-- -----------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from public.rmi_admins where role = 'super') then
    update public.rmi_admins
      set role = 'super'
      where lower(email) = 'caroline.muito@test.com';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Granting yourself access
--
-- Create the account first (Authentication > Users > Add user), then run this
-- once. The first person has to be an owner, because an owner is the only one
-- who can add anybody else.
--
--   insert into public.rmi_admins (id, email, full_name, role, company_id)
--   select id, email, 'Your Name', 'owner', 'default'
--   from auth.users where email = 'you@example.com'
--   on conflict (id) do update set role = 'owner';
--
-- After that, everyone else is added from Settings > Team in the dashboard.
--
-- The super admin sees every company and holds the keys the installation
-- shares. The first one is promoted below, if her account exists and nobody is
-- a super admin yet; after that, a super admin can make others from the
-- dashboard. To promote someone by hand:
--
--   update public.rmi_admins set role = 'super'
--   where email = 'their.address@example.com';
-- -----------------------------------------------------------------------------
