create table if not exists public.worship_rotation_service_slots (
  id uuid primary key default gen_random_uuid(),
  weekday smallint not null check (weekday between 0 and 6),
  service_type text not null,
  service_time time not null,
  call_offset_minutes integer not null default 60 check (call_offset_minutes between 0 and 360),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(weekday,service_type,service_time)
);

create table if not exists public.worship_rotation_months (
  id uuid primary key default gen_random_uuid(),
  month_start date not null unique,
  status text not null default 'draft' check (status in ('draft','active','archived')),
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.worship_rotation_assignments (
  id uuid primary key default gen_random_uuid(),
  rotation_month_id uuid not null references public.worship_rotation_months(id) on delete cascade,
  service_date date not null,
  service_slot_id uuid not null references public.worship_rotation_service_slots(id) on delete restrict,
  group_code text not null check (group_code in ('A','B','C','D')),
  notes text,
  created_at timestamptz not null default now(),
  unique(rotation_month_id,service_date,service_slot_id)
);

create index if not exists worship_rotation_months_month_idx on public.worship_rotation_months(month_start);
create index if not exists worship_rotation_assignments_date_idx on public.worship_rotation_assignments(service_date);

alter table public.worship_rotation_service_slots enable row level security;
alter table public.worship_rotation_months enable row level security;
alter table public.worship_rotation_assignments enable row level security;

grant select,insert,update,delete on public.worship_rotation_service_slots to authenticated;
grant select,insert,update,delete on public.worship_rotation_months to authenticated;
grant select,insert,update,delete on public.worship_rotation_assignments to authenticated;

create policy "worship rotation slots members read" on public.worship_rotation_service_slots for select to authenticated
using ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','member')));
create policy "worship rotation slots leaders write" on public.worship_rotation_service_slots for all to authenticated
using ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','leader')))
with check ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','leader')));

create policy "worship rotation months members read" on public.worship_rotation_months for select to authenticated
using ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','member')));
create policy "worship rotation months leaders write" on public.worship_rotation_months for all to authenticated
using ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','leader')))
with check ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','leader')));

create policy "worship rotation assignments members read" on public.worship_rotation_assignments for select to authenticated
using ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','member')));
create policy "worship rotation assignments leaders write" on public.worship_rotation_assignments for all to authenticated
using ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','leader')))
with check ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','leader')));

create or replace function public.materialize_worship_rotation_month(p_rotation_month_id uuid)
returns integer
language plpgsql
security invoker
set search_path=public
as $$
declare
  v_uid uuid:=auth.uid();
  v_count integer:=0;
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  if not (public.is_admin(v_uid) or public.has_network_role(v_uid,'worship','leader')) then
    raise exception 'leader required';
  end if;

  insert into public.worship_schedules(
    title,service_type,starts_at,call_time,group_code,status,notes,created_by
  )
  select
    coalesce(nullif(trim(s.service_type),''),'Culto') || ' · Grupo ' || a.group_code,
    s.service_type,
    ((a.service_date::text || ' ' || s.service_time::text)::timestamp at time zone 'Europe/Lisbon'),
    (((a.service_date::text || ' ' || s.service_time::text)::timestamp - make_interval(mins=>s.call_offset_minutes)) at time zone 'Europe/Lisbon'),
    a.group_code,
    'planned',
    a.notes,
    v_uid
  from public.worship_rotation_assignments a
  join public.worship_rotation_service_slots s on s.id=a.service_slot_id
  where a.rotation_month_id=p_rotation_month_id
    and not exists(
      select 1 from public.worship_schedules ws
      where ws.starts_at=((a.service_date::text || ' ' || s.service_time::text)::timestamp at time zone 'Europe/Lisbon')
        and coalesce(ws.service_type,'')=coalesce(s.service_type,'')
    );

  get diagnostics v_count=row_count;
  update public.worship_rotation_months set status='active',updated_at=now() where id=p_rotation_month_id;
  return v_count;
end;
$$;

revoke execute on function public.materialize_worship_rotation_month(uuid) from public, anon;
grant execute on function public.materialize_worship_rotation_month(uuid) to authenticated;
