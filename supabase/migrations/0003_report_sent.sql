-- =============================================================================
-- Rate My Impact: record when an admin sends the final report.
--
-- ADDITIVE ONLY, like 0002. Three nullable columns; no drops, deletes, updates
-- or type changes, and existing rows keep exactly the values they have (the new
-- columns read as null for them, meaning "not sent"). Every statement is
-- guarded, so it is safe to run more than once.
--
-- Run it after 0001 and 0002.
-- =============================================================================

alter table public.rmi_reports
  add column if not exists sent_at timestamptz,
  -- Email of the admin who sent it.
  add column if not exists sent_by text,
  -- How many invited stakeholders had not answered at the moment it was sent.
  add column if not exists sent_outstanding integer;
