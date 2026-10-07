create table if not exists public.worship_assignment_responses (
  assignment_id uuid primary key references public.worship_schedule_members(id) on delete cascade,
  response_status text not null check (response_status in ('confirmed','declined')),
  note text,
  responded_at timestamptz not null default now()
);

alter table public.worship_assignment_responses enable row level security;

grant select,insert,update,delete on public.worship_assignment_responses to authenticated;

drop policy if exists "worship response read relevant" on public.worship_assignment_responses;
create policy "worship response read relevant"
on public.worship_assignment_responses
for select to authenticated
using (
  (select public.is_admin())
  or (select public.has_network_role(auth.uid(),'worship','leader'))
  or exists (
    select 1
    from public.worship_schedule_members wsm
    join public.network_memberships nm on nm.id=wsm.membership_id
    where wsm.id=worship_assignment_responses.assignment_id
      and nm.user_id=auth.uid()
      and nm.status='active'
  )
);

drop policy if exists "worship response own insert" on public.worship_assignment_responses;
create policy "worship response own insert"
on public.worship_assignment_responses
for insert to authenticated
with check (
  exists (
    select 1
    from public.worship_schedule_members wsm
    join public.network_memberships nm on nm.id=wsm.membership_id
    where wsm.id=worship_assignment_responses.assignment_id
      and nm.user_id=auth.uid()
      and nm.status='active'
  )
);

drop policy if exists "worship response own update" on public.worship_assignment_responses;
create policy "worship response own update"
on public.worship_assignment_responses
for update to authenticated
using (
  exists (
    select 1
    from public.worship_schedule_members wsm
    join public.network_memberships nm on nm.id=wsm.membership_id
    where wsm.id=worship_assignment_responses.assignment_id
      and nm.user_id=auth.uid()
      and nm.status='active'
  )
)
with check (
  exists (
    select 1
    from public.worship_schedule_members wsm
    join public.network_memberships nm on nm.id=wsm.membership_id
    where wsm.id=worship_assignment_responses.assignment_id
      and nm.user_id=auth.uid()
      and nm.status='active'
  )
);

create index if not exists worship_assignment_responses_status_idx
on public.worship_assignment_responses(response_status);
