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


create or replace function public.accept_worship_substitution_offer(p_offer_id uuid)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid:=auth.uid();
  v_membership_id uuid;
  v_offer public.worship_substitution_offers;
  v_request public.worship_substitution_requests;
  v_assignment public.worship_schedule_members;
  v_schedule public.worship_schedules;
  v_old_membership uuid;
begin
  if v_uid is null then raise exception 'authentication required'; end if;

  select id into v_membership_id
  from public.network_memberships
  where user_id=v_uid and status='active'
    and network_id=(select id from public.networks where slug='worship')
  limit 1;
  if v_membership_id is null then raise exception 'active worship membership required'; end if;

  select * into v_offer
  from public.worship_substitution_offers
  where id=p_offer_id
  for update;
  if v_offer.id is null then raise exception 'offer not found'; end if;
  if v_offer.proposed_membership_id<>v_membership_id then raise exception 'offer not assigned to current member'; end if;
  if v_offer.status<>'pending' then raise exception 'offer is no longer pending'; end if;

  select * into v_request
  from public.worship_substitution_requests
  where id=v_offer.request_id
  for update;
  if v_request.id is null or v_request.status<>'requested' then raise exception 'substitution request is no longer open'; end if;

  select * into v_assignment
  from public.worship_schedule_members
  where id=v_request.assignment_id
  for update;
  if v_assignment.id is null then raise exception 'assignment not found'; end if;

  select * into v_schedule from public.worship_schedules where id=v_assignment.schedule_id;
  if v_schedule.id is null or v_schedule.status='cancelled' then raise exception 'schedule unavailable'; end if;

  if exists(
    select 1 from public.worship_schedule_members
    where schedule_id=v_assignment.schedule_id and membership_id=v_membership_id and id<>v_assignment.id
  ) then raise exception 'member already assigned to this schedule'; end if;

  if exists(
    select 1 from public.worship_member_unavailability u
    where u.membership_id=v_membership_id
      and u.starts_on<=((v_schedule.starts_at at time zone 'Europe/Lisbon')::date)
      and u.ends_on>=((v_schedule.starts_at at time zone 'Europe/Lisbon')::date)
  ) then raise exception 'member unavailable on schedule date'; end if;

  v_old_membership:=v_assignment.membership_id;

  update public.worship_schedule_members
  set membership_id=v_membership_id,attendance_status='assigned'
  where id=v_assignment.id;

  delete from public.worship_assignment_responses where assignment_id=v_assignment.id;

  update public.worship_substitution_offers
  set status=case when id=p_offer_id then 'accepted' else 'expired' end,
      responded_at=case when id=p_offer_id then now() else responded_at end
  where request_id=v_request.id and status='pending';

  update public.worship_substitution_requests
  set status='approved',
      proposed_membership_id=v_membership_id,
      accepted_at=now(),
      decided_at=now(),
      decided_by=v_uid,
      leader_note='Substituição automática por backup',
      updated_at=now()
  where id=v_request.id;

  insert into public.worship_substitution_events(
    request_id,event_type,actor_membership_id,from_membership_id,to_membership_id,details
  ) values(
    v_request.id,'auto_replaced',v_membership_id,v_old_membership,v_membership_id,
    jsonb_build_object('role',v_assignment.role,'schedule_id',v_assignment.schedule_id)
  );

  return v_assignment.id;
end;
$$;

revoke execute on function public.accept_worship_substitution_offer(uuid) from public,anon;
grant execute on function public.accept_worship_substitution_offer(uuid) to authenticated;
