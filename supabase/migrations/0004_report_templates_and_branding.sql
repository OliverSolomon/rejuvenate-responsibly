-- =============================================================================
-- Rate My Impact: report templates, brand assets and issued PDFs.
--
-- ADDITIVE ONLY, like 0002 and 0003:
--
--   * no DROP of any table, column, type, policy or function
--   * no DELETE, TRUNCATE or UPDATE of any row
--   * no change to the type, default or constraints of an existing column
--   * existing rows keep the values they have; new columns read as null
--
-- It adds five nullable columns, one new table and one private storage bucket.
-- Every statement is guarded, so it is safe to run more than once and safe to
-- run against a project that already holds data.
--
-- Run it after 0001, 0002 and 0003.
--
-- The app talks to these tables with the service role key, which bypasses row
-- level security, so no policy is needed for it. Uploaded files are served to
-- the browser through the application's own routes, never straight from the
-- bucket, which is why the bucket is private.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- The organisation's own logo, uploaded while filling in the assessment
-- -----------------------------------------------------------------------------

alter table public.rmi_assessments
  -- Path inside the rmi-assets bucket, e.g. client-logos/RMI-7F3K2Q.png.
  -- Null means the organisation did not add one, which is the normal case.
  add column if not exists client_logo text;

-- -----------------------------------------------------------------------------
-- The PDF an admin issued, kept so the client can download the same file later
-- -----------------------------------------------------------------------------

alter table public.rmi_reports
  -- Path inside the rmi-assets bucket, e.g. issued/RMI-7F3K2Q.pdf.
  add column if not exists pdf_path text,
  add column if not exists pdf_size integer,
  add column if not exists pdf_at timestamptz,
  -- Which published template version the report was built from.
  add column if not exists template_version integer;

comment on column public.rmi_reports.pdf_path is
  'The PDF as it was issued. Reports are valid for one year from sent_at; after that this file still downloads but is stamped as expired on the way out.';

-- -----------------------------------------------------------------------------
-- The house report template
-- -----------------------------------------------------------------------------

create table if not exists public.rmi_report_templates (
  -- One template for the firm. The check keeps it that way.
  id                 text primary key default 'default' check (id = 'default'),

  -- What an admin is working on. Never used for a real report.
  draft_html         text,
  -- The editor's own document, so reopening the draft is lossless rather than
  -- a round trip through HTML. Path inside the rmi-assets bucket.
  draft_doc          text,
  draft_updated_at   timestamptz,
  draft_updated_by   text,

  -- What live reports are built from. Null until an admin publishes once, and
  -- the application falls back to its built-in template until then.
  published_html     text,
  published_doc      text,
  published_at       timestamptz,
  published_by       text,
  -- Rises on every publish, so a report can record which one it was built from.
  version            integer not null default 0,

  updated_at         timestamptz not null default now()
);

comment on table public.rmi_report_templates is
  'Single row holding the letterhead and footer a report is wrapped in, as a draft and as the published version.';

alter table public.rmi_report_templates enable row level security;

-- No policies on purpose: with row level security on and none defined, only the
-- service role can read or write. The grants are closed as well, so a careless
-- policy added later cannot expose it by accident.
revoke all on public.rmi_report_templates from anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'rmi_report_templates_touch'
  ) then
    create trigger rmi_report_templates_touch
      before update on public.rmi_report_templates
      for each row execute function public.rmi_touch_updated_at();
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Where uploads live
-- -----------------------------------------------------------------------------

-- Private: nothing in here is reachable by URL. The application reads it with
-- the service role and serves the bytes through its own routes, which is what
-- lets an expired report be stamped on the way out.
insert into storage.buckets (id, name, public)
values ('rmi-assets', 'rmi-assets', false)
on conflict (id) do nothing;
