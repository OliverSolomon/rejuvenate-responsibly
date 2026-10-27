-- =============================================================================
-- Rate My Impact: two levels of dashboard access, and who invited whom.
--
-- ADDITIVE ONLY, like 0002 to 0004. No DROP of any table, column, type, policy
-- or function; no DELETE, TRUNCATE or UPDATE of any row; no change to the type
-- or constraints of a column that existed before this script. Three new
-- columns, each guarded, so it is safe to run more than once.
--
-- Run it after 0001 to 0004.
--
-- One thing here deserves explaining. Adding a NOT NULL column with a default
-- gives every existing row that default, and the people already in rmi_admins
-- are the ones who set this up, so they should be owners. New people added from
-- the dashboard should not be. So the column arrives with 'owner' as its
-- default, which backfills them, and the default is then changed to 'admin' for
-- everything inserted afterwards. No row is ever updated, and the application
-- always states the role explicitly in any case.
-- =============================================================================

alter table public.rmi_admins
  -- owner: can add, remove and change people. admin: everything else.
  add column if not exists role text not null default 'owner',
  -- Email of the owner who added them, and when. Null for the first row, which
  -- was inserted by hand, and for anyone added before this script ran.
  add column if not exists invited_by text,
  add column if not exists invited_at timestamptz;

-- Only ever two levels. Guarded so a second run does not fail on it.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'rmi_admins_role_check'
  ) then
    alter table public.rmi_admins
      add constraint rmi_admins_role_check check (role in ('owner', 'admin'));
  end if;
end $$;

-- From here on, someone added from the dashboard is an admin unless an owner
-- says otherwise. This changes nothing about the rows already in the table.
alter table public.rmi_admins alter column role set default 'admin';

comment on column public.rmi_admins.role is
  'owner manages the team; admin does everything else. The last owner cannot be removed.';

create index if not exists rmi_admins_role_idx on public.rmi_admins (role);
