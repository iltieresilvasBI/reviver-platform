create table if not exists public.worship_member_unavailability (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.network_memberships(id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  reason text,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create index if not exists worship_member_unavailability_membership_idx
on public.worship_member_unavailability(membership_id,starts_on);

alter table public.worship_member_unavailability enable row level security;

grant select,insert,update,delete on public.worship_member_unavailability to authenticated;

create policy "worship unavailability read relevant"
on public.worship_member_unavailability
for select to authenticated
using (
  (select public.is_admin())
  or (select public.has_network_role(auth.uid(),'worship','leader'))
  or exists (
    select 1 from public.network_memberships nm
    where nm.id=worship_member_unavailability.membership_id
      and nm.user_id=auth.uid()
      and nm.status='active'
  )
);

create policy "worship unavailability own insert"
on public.worship_member_unavailability
for insert to authenticated
with check (
  exists (
    select 1 from public.network_memberships nm
    where nm.id=worship_member_unavailability.membership_id
      and nm.user_id=auth.uid()
      and nm.status='active'
  )
);

create policy "worship unavailability own update"
on public.worship_member_unavailability
for update to authenticated
using (
  exists (
    select 1 from public.network_memberships nm
    where nm.id=worship_member_unavailability.membership_id
      and nm.user_id=auth.uid()
      and nm.status='active'
  )
)
with check (
  exists (
    select 1 from public.network_memberships nm
    where nm.id=worship_member_unavailability.membership_id
      and nm.user_id=auth.uid()
      and nm.status='active'
  )
);

create policy "worship unavailability own delete"
on public.worship_member_unavailability
for delete to authenticated
using (
  exists (
    select 1 from public.network_memberships nm
    where nm.id=worship_member_unavailability.membership_id
      and nm.user_id=auth.uid()
      and nm.status='active'
  )
);
