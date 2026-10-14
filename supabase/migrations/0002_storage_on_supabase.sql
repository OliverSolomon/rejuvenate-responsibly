-- =============================================================================
-- Rate My Impact: move application storage onto Supabase.
--
-- ADDITIVE ONLY. This script never changes data that already exists:
--
--   * no DROP of any table, column, type, policy or function
--   * no DELETE, TRUNCATE or UPDATE of any row
--   * no change to the type, default or constraints of an existing column
--   * existing rows are left exactly as they are; new columns read as their
--     default (false or null) for them
--
-- It only adds: one enum value, a handful of nullable or defaulted columns, one
-- new table and one index. Every statement is guarded (IF NOT EXISTS), so it is
-- safe to run more than once and safe to run against a project that already
-- holds data.
--
-- Run it after 0001_rate_my_impact.sql:
--   Supabase dashboard  SQL Editor, paste, Run
--   CLI                 supabase db push
--
-- The app talks to these tables with the service role key, which bypasses row
-- level security, so no new policy is needed for it. The one new table holds
-- encrypted secrets and is closed to every other role.
-- =============================================================================

-- A payment waived while the admin "require payment" switch is off. Adding an
-- enum value does not touch any existing row.
alter type rmi_payment_status add value if not exists 'waived';

-- -----------------------------------------------------------------------------
-- Assessments
-- -----------------------------------------------------------------------------

alter table public.rmi_assessments
  add column if not exists payment_updated_at timestamptz,
  -- Rows loaded from the dashboard's sample data panel. Lets that panel remove
  -- its own rows and nothing else.
  add column if not exists sample boolean not null default false;

create index if not exists rmi_assessments_sample_idx
  on public.rmi_assessments (sample)
  where sample;

-- -----------------------------------------------------------------------------
-- Shares: whether each invitation email arrived, and whether the submitter has
-- been told when it did not.
-- -----------------------------------------------------------------------------

alter table public.rmi_shares
  add column if not exists delivery_status text
    check (delivery_status in ('sent', 'failed', 'not_sent')),
  add column if not exists delivery_error text,
  add column if not exists delivery_at timestamptz,
  add column if not exists notified_at timestamptz,
  add column if not exists notified_by text;

-- -----------------------------------------------------------------------------
-- Stakeholder responses
-- -----------------------------------------------------------------------------

alter table public.rmi_stakeholder_responses
  add column if not exists sample boolean not null default false;

-- -----------------------------------------------------------------------------
-- Reports. edited_by (uuid) stays as it is; the dashboard also shows who edited
-- by email, and records whether the humaniser pass ran.
-- -----------------------------------------------------------------------------

alter table public.rmi_reports
  add column if not exists edited_by_email text,
  add column if not exists humanized boolean not null default false,
  add column if not exists humanizer_model text;

-- -----------------------------------------------------------------------------
-- Dashboard settings
--
-- One row. `data` holds the settings the admin saved; secrets inside it are
-- already encrypted by the application (AES-256-GCM, key kept in the server
-- environment), so a database dump does not expose them.
-- -----------------------------------------------------------------------------

create table if not exists public.rmi_settings (
  id          text primary key default 'default' check (id = 'default'),
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

comment on table public.rmi_settings is
  'Single row of dashboard settings. Secrets inside data are encrypted by the application.';

alter table public.rmi_settings enable row level security;

-- No policies on purpose: with RLS on and none defined, only the service role
-- (which bypasses RLS) can read or write. The grants are closed as well, so a
-- later careless policy cannot expose it by accident.
revoke all on public.rmi_settings from anon, authenticated;
