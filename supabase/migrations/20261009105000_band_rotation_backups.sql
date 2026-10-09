create table if not exists public.worship_band_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  service_types text[] not null default '{}',
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.worship_band_template_slots (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.worship_band_templates(id) on delete cascade,
  role text not null,
  required_count integer not null default 1 check(required_count between 1 and 4),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique(template_id,role)
);

create table if not exists public.worship_member_backup_pool (
  primary_membership_id uuid not null references public.network_memberships(id) on delete cascade,
  role text not null,
  backup_membership_id uuid not null references public.network_memberships(id) on delete cascade,
  priority integer not null default 1 check(priority between 1 and 20),
  generated_at timestamptz not null default now(),
  active boolean not null default true,
  primary key(primary_membership_id,role,backup_membership_id),
  check(primary_membership_id<>backup_membership_id)
);

create table if not exists public.worship_substitution_offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.worship_substitution_requests(id) on delete cascade,
  proposed_membership_id uuid not null references public.network_memberships(id) on delete cascade,
  priority integer not null default 1,
  status text not null default 'pending' check(status in ('pending','accepted','declined','expired')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique(request_id,proposed_membership_id)
);

create table if not exists public.worship_substitution_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.worship_substitution_requests(id) on delete cascade,
  event_type text not null,
  actor_membership_id uuid references public.network_memberships(id) on delete set null,
  from_membership_id uuid references public.network_memberships(id) on delete set null,
  to_membership_id uuid references public.network_memberships(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists worship_band_slots_template_idx on public.worship_band_template_slots(template_id);
create index if not exists worship_backup_primary_role_idx on public.worship_member_backup_pool(primary_membership_id,role,priority);
create index if not exists worship_substitution_offers_request_idx on public.worship_substitution_offers(request_id,status,priority);

alter table public.worship_band_templates enable row level security;
alter table public.worship_band_template_slots enable row level security;
alter table public.worship_member_backup_pool enable row level security;
alter table public.worship_substitution_offers enable row level security;
alter table public.worship_substitution_events enable row level security;

grant select,insert,update,delete on public.worship_band_templates to authenticated;
grant select,insert,update,delete on public.worship_band_template_slots to authenticated;
grant select,insert,update,delete on public.worship_member_backup_pool to authenticated;
grant select,insert,update,delete on public.worship_substitution_offers to authenticated;
grant select,insert on public.worship_substitution_events to authenticated;

create policy "band templates members read" on public.worship_band_templates for select to authenticated
using ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','member')));
create policy "band templates leaders write" on public.worship_band_templates for all to authenticated
using ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','leader')))
with check ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','leader')));

create policy "band slots members read" on public.worship_band_template_slots for select to authenticated
using ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','member')));
create policy "band slots leaders write" on public.worship_band_template_slots for all to authenticated
using ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','leader')))
with check ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','leader')));

create policy "backup pool members read" on public.worship_member_backup_pool for select to authenticated
using ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','member')));
create policy "backup pool leaders write" on public.worship_member_backup_pool for all to authenticated
using ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','leader')))
with check ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','leader')));

create policy "substitution offers participants read" on public.worship_substitution_offers for select to authenticated
using (
  (select public.is_admin())
  or (select public.has_network_role(auth.uid(),'worship','leader'))
  or proposed_membership_id in (select id from public.network_memberships where user_id=auth.uid() and status='active')
);
create policy "substitution offers system insert" on public.worship_substitution_offers for insert to authenticated
with check (
  (select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','leader'))
  or exists (
    select 1 from public.worship_substitution_requests r
    where r.id=request_id and r.requested_by_membership_id in
      (select id from public.network_memberships where user_id=auth.uid() and status='active')
  )
);
create policy "substitution offers proposed update" on public.worship_substitution_offers for update to authenticated
using (
  (select public.is_admin())
  or (select public.has_network_role(auth.uid(),'worship','leader'))
  or proposed_membership_id in (select id from public.network_memberships where user_id=auth.uid() and status='active')
)
with check (
  (select public.is_admin())
  or (select public.has_network_role(auth.uid(),'worship','leader'))
  or proposed_membership_id in (select id from public.network_memberships where user_id=auth.uid() and status='active')
);

create policy "substitution events participants read" on public.worship_substitution_events for select to authenticated
using (
  (select public.is_admin())
  or (select public.has_network_role(auth.uid(),'worship','leader'))
  or actor_membership_id in (select id from public.network_memberships where user_id=auth.uid())
  or from_membership_id in (select id from public.network_memberships where user_id=auth.uid())
  or to_membership_id in (select id from public.network_memberships where user_id=auth.uid())
);
create policy "substitution events authenticated insert" on public.worship_substitution_events for insert to authenticated
with check ((select auth.uid()) is not null);
