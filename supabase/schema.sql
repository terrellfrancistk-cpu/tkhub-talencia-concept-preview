-- Talencia concept: Supabase schema (Postgres 15+). Run once in the SQL editor of a NEW project.
-- Two roles share one login system: 'practice' (client accounts, scoped to an organization) and 'professional' (talent).
-- Every table has Row Level Security; the browser only ever uses the anon key. Writes that need rules go through functions.
-- Covers the official site's lines of business: dental/medical staffing, all-industries hiring, Employer of Record, Talencia Rewards.

create extension if not exists pgcrypto;

-- ---------- types ----------
create type public.user_role  as enum ('practice','professional');
create type public.org_kind   as enum ('dental','medical','other');
create type public.engagement as enum ('temp','temp_to_hire','permanent','eor');

-- ---------- tables ----------
create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  kind        public.org_kind not null default 'dental',
  industry    text,                         -- for all-industries clients (sales, HR, finance, IT, trades…)
  eor_client  boolean not null default false, -- Employer of Record engagement
  city        text,
  state       text,
  legacy_id   text unique,
  created_at  timestamptz not null default now()
);

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        public.user_role,             -- null until chosen (first OAuth sign-in claims it via claim_role)
  full_name   text,
  phone       text,
  org_id      uuid references public.organizations(id) on delete set null,
  org_role    text check (org_role in ('owner','approver','viewer')),
  legacy_id   text unique,
  created_at  timestamptz not null default now()
);

create table public.shift_requests (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  role_title  text not null,
  engagement  public.engagement not null default 'temp',
  starts_at   timestamptz,
  ends_at     timestamptz,
  notes       text,
  status      text not null default 'open' check (status in ('open','matching','interviewing','filled','cancelled')),
  created_by  uuid references public.profiles(id) default auth.uid(),
  legacy_id   text unique,
  created_at  timestamptz not null default now()
);

create table public.shifts (
  id              uuid primary key default gen_random_uuid(),
  request_id      uuid references public.shift_requests(id) on delete set null,
  org_id          uuid not null references public.organizations(id) on delete cascade,
  professional_id uuid references public.profiles(id) on delete set null,
  role_title      text,
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  rate_cents      integer check (rate_cents >= 0),
  status          text not null default 'open' check (status in ('open','claimed','confirmed','filled','completed','cancelled')),
  legacy_id       text unique,
  created_at      timestamptz not null default now(),
  constraint shifts_time_order check (ends_at > starts_at)
);

create table public.timesheets (
  id              uuid primary key default gen_random_uuid(),
  shift_id        uuid references public.shifts(id) on delete set null,
  professional_id uuid not null references public.profiles(id) on delete cascade,
  org_id          uuid not null references public.organizations(id) on delete cascade,
  clock_in        timestamptz not null,
  clock_out       timestamptz,
  break_minutes   integer not null default 0 check (break_minutes >= 0),
  status          text not null default 'submitted' check (status in ('open','submitted','approved','disputed')),
  legacy_id       text unique,
  created_at      timestamptz not null default now()
);

create table public.invoices (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  number       text not null unique,
  period_start date,
  period_end   date,
  total_cents  integer not null default 0 check (total_cents >= 0),
  status       text not null default 'open' check (status in ('open','paid','void')),
  due_on       date,
  paid_at      timestamptz,
  legacy_id    text unique,
  created_at   timestamptz not null default now()
);

create table public.credentials (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.profiles(id) on delete cascade,
  kind            text not null,            -- license, cpr_bls, anesthesia_permit, malpractice…
  number          text,
  state           text,
  expires_on      date,
  status          text not null default 'pending' check (status in ('pending','verified','expired','missing')),
  legacy_id       text unique,
  created_at      timestamptz not null default now()
);

create table public.applications (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.profiles(id) on delete cascade,
  org_id          uuid references public.organizations(id) on delete set null,
  title           text not null,
  applied_at      timestamptz not null default now(),
  status          text not null default 'applied' check (status in ('applied','in_review','interviewing','offer','hired','declined')),
  legacy_id       text unique
);

-- Talencia Rewards: 1 point = $1. Professionals earn per hour worked; organizations per hour booked; plus bonuses.
create table public.rewards_ledger (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade,
  org_id      uuid references public.organizations(id) on delete cascade,
  points      integer not null,
  reason      text not null,
  source      text not null default 'hours' check (source in ('hours','booking','referral','milestone','ce','community','autopay','birthday','redemption','legacy')),
  legacy_id   text unique,
  created_at  timestamptz not null default now(),
  constraint rewards_owner check (user_id is not null or org_id is not null)
);

create index on public.profiles (org_id);
create index on public.shift_requests (org_id, status);
create index on public.shifts (org_id, status);
create index on public.shifts (professional_id, starts_at);
create index on public.shifts (status, starts_at);
create index on public.timesheets (org_id, status);
create index on public.timesheets (professional_id, clock_in);
create index on public.invoices (org_id, period_end);
create index on public.credentials (professional_id);
create index on public.rewards_ledger (user_id);
create index on public.rewards_ledger (org_id);

-- ---------- helpers (security definer so policies can read the caller's profile without recursion) ----------
create or replace function public.current_org() returns uuid
  language sql stable security definer set search_path = public
  as $$ select org_id from public.profiles where id = auth.uid() $$;

create or replace function public.current_user_role() returns public.user_role
  language sql stable security definer set search_path = public
  as $$ select role from public.profiles where id = auth.uid() $$;

-- New auth user → profile. Role and names come from sign-up metadata; practices get an organization they own.
create or replace function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
declare
  r public.user_role;
  o uuid;
begin
  r := case new.raw_user_meta_data->>'role' when 'practice' then 'practice'::public.user_role
                                          when 'professional' then 'professional'::public.user_role end;
  -- imported legacy users are linked to their existing organization by the importer, so don't create one
  if r = 'practice' and coalesce((new.raw_user_meta_data->>'legacy_import')::boolean, false) = false then
    insert into public.organizations (name) values (coalesce(nullif(new.raw_user_meta_data->>'org_name',''), 'My practice')) returning id into o;
  end if;
  insert into public.profiles (id, role, full_name, org_id, org_role)
  values (new.id, r, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), o, case when o is not null then 'owner' end)
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- First OAuth sign-in: the browser remembers which tab the person chose and claims that role once.
create or replace function public.claim_role(p_role public.user_role) returns void
  language plpgsql security definer set search_path = public as $$
declare o uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  update public.profiles set role = p_role where id = auth.uid() and role is null;
  if not found then return; end if;
  if p_role = 'practice' and (select org_id from public.profiles where id = auth.uid()) is null then
    insert into public.organizations (name) values ('My practice') returning id into o;
    update public.profiles set org_id = o, org_role = 'owner' where id = auth.uid();
  end if;
end $$;

-- Professionals claim open shifts; first claim wins.
create or replace function public.claim_shift(p_shift_id uuid) returns void
  language plpgsql security definer set search_path = public as $$
begin
  if public.current_user_role() is distinct from 'professional' then raise exception 'only professionals can claim shifts'; end if;
  update public.shifts set professional_id = auth.uid(), status = 'claimed'
   where id = p_shift_id and status = 'open' and professional_id is null;
  if not found then raise exception 'this shift is no longer available'; end if;
end $$;

-- Clock in creates an open timesheet for the caller's shift (or the next one today); clock out closes and submits it.
create or replace function public.clock_in(p_shift_id uuid default null) returns uuid
  language plpgsql security definer set search_path = public as $$
declare s public.shifts; t uuid;
begin
  select * into s from public.shifts
   where professional_id = auth.uid() and (p_shift_id is null or id = p_shift_id)
     and starts_at::date = now()::date and status in ('claimed','confirmed','filled')
   order by starts_at limit 1;
  if s.id is null then raise exception 'no shift to clock in to today'; end if;
  insert into public.timesheets (shift_id, professional_id, org_id, clock_in, status)
  values (s.id, auth.uid(), s.org_id, now(), 'open') returning id into t;
  return t;
end $$;

create or replace function public.clock_out(p_shift_id uuid default null) returns void
  language plpgsql security definer set search_path = public as $$
begin
  update public.timesheets set clock_out = now(), status = 'submitted'
   where id = (select id from public.timesheets where professional_id = auth.uid() and status = 'open'
                 and (p_shift_id is null or shift_id = p_shift_id) order by clock_in desc limit 1);
  if not found then raise exception 'you are not clocked in'; end if;
end $$;

revoke all on function public.claim_role(public.user_role), public.claim_shift(uuid), public.clock_in(uuid), public.clock_out(uuid) from public, anon;
grant execute on function public.claim_role(public.user_role), public.claim_shift(uuid), public.clock_in(uuid), public.clock_out(uuid) to authenticated;

-- ---------- Row Level Security ----------
alter table public.organizations  enable row level security;
alter table public.profiles       enable row level security;
alter table public.shift_requests enable row level security;
alter table public.shifts         enable row level security;
alter table public.timesheets     enable row level security;
alter table public.invoices       enable row level security;
alter table public.credentials    enable row level security;
alter table public.applications   enable row level security;
alter table public.rewards_ledger enable row level security;

-- organizations: members see their own; professionals see orgs behind open shifts or shifts they work
create policy org_member_read on public.organizations for select to authenticated using (id = public.current_org());
create policy org_shift_read  on public.organizations for select to authenticated using (
  exists (select 1 from public.shifts s where s.org_id = organizations.id and (s.status = 'open' or s.professional_id = auth.uid())));
create policy org_owner_update on public.organizations for update to authenticated
  using (id = public.current_org() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.org_role = 'owner'))
  with check (id = public.current_org());

-- profiles: yourself, your org's team, and professionals who work your org's shifts
create policy profile_self_read on public.profiles for select to authenticated using (id = auth.uid());
create policy profile_team_read on public.profiles for select to authenticated using (org_id is not null and org_id = public.current_org());
create policy profile_worker_read on public.profiles for select to authenticated using (
  exists (select 1 from public.shifts s where s.professional_id = profiles.id and s.org_id = public.current_org()));
create policy profile_self_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated;
grant update (full_name, phone) on public.profiles to authenticated;   -- role and org changes only via functions

-- shift requests: practices manage their own org's
create policy req_org_read   on public.shift_requests for select to authenticated using (org_id = public.current_org());
create policy req_org_insert on public.shift_requests for insert to authenticated
  with check (public.current_user_role() = 'practice' and org_id = public.current_org());
create policy req_org_update on public.shift_requests for update to authenticated using (org_id = public.current_org()) with check (org_id = public.current_org());
alter table public.shift_requests alter column org_id set default public.current_org();

-- shifts: practices see their org's; professionals see open shifts and their own (claiming is via claim_shift)
create policy shift_org_read on public.shifts for select to authenticated using (org_id = public.current_org());
create policy shift_pro_read on public.shifts for select to authenticated using (
  public.current_user_role() = 'professional' and (status = 'open' or professional_id = auth.uid()));

-- timesheets: professionals read their own; practices read and approve/dispute their org's
create policy ts_pro_read on public.timesheets for select to authenticated using (professional_id = auth.uid());
create policy ts_org_read on public.timesheets for select to authenticated using (org_id = public.current_org());
create policy ts_org_review on public.timesheets for update to authenticated
  using (org_id = public.current_org() and public.current_user_role() = 'practice') with check (org_id = public.current_org());
revoke update on public.timesheets from authenticated;
grant update (status) on public.timesheets to authenticated;

-- invoices: practices read their org's
create policy inv_org_read on public.invoices for select to authenticated using (org_id = public.current_org());

-- credentials: professionals read and add their own; verification is done by Talencia staff (service role)
create policy cred_self_read   on public.credentials for select to authenticated using (professional_id = auth.uid());
create policy cred_self_insert on public.credentials for insert to authenticated with check (professional_id = auth.uid() and status = 'pending');

-- applications: professionals read their own
create policy app_self_read on public.applications for select to authenticated using (professional_id = auth.uid());

-- rewards: your own points, or your organization's
create policy rw_self_read on public.rewards_ledger for select to authenticated using (user_id = auth.uid() or (org_id is not null and org_id = public.current_org()));

-- ---------- API access (explicit, so this works with "Automatically expose new tables" turned off) ----------
-- Signed-in users can read through RLS above; writes are limited to the columns and tables listed. Anonymous visitors get nothing.
grant usage on schema public to anon, authenticated;
revoke all on all tables in schema public from anon;
grant select on public.organizations, public.profiles, public.shift_requests, public.shifts, public.timesheets,
                public.invoices, public.credentials, public.applications, public.rewards_ledger to authenticated;
grant insert, update on public.shift_requests to authenticated;
grant insert on public.credentials to authenticated;
grant update (name, city, state) on public.organizations to authenticated;
grant execute on function public.current_org(), public.current_user_role() to authenticated;
