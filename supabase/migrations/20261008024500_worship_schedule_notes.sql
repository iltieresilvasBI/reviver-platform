create table if not exists public.worship_schedule_notes (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.worship_schedules(id) on delete cascade,
  note_type text not null default 'comment' check (note_type in ('comment','reminder','notice')),
  visibility text not null default 'team' check (visibility in ('team','leader')),
  body text not null,
  due_at timestamptz,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists worship_schedule_notes_schedule_idx on public.worship_schedule_notes(schedule_id,created_at desc);
alter table public.worship_schedule_notes enable row level security;
grant select,insert,update,delete on public.worship_schedule_notes to authenticated;

create policy "worship notes read" on public.worship_schedule_notes for select to authenticated
using (
  (select public.is_admin())
  or (select public.has_network_role(auth.uid(),'worship','leader'))
  or (visibility='team' and (select public.has_network_role(auth.uid(),'worship','member')))
);
create policy "worship notes insert" on public.worship_schedule_notes for insert to authenticated
with check (
  created_by=auth.uid() and (
    (select public.is_admin())
    or (select public.has_network_role(auth.uid(),'worship','leader'))
    or (note_type='comment' and visibility='team' and (select public.has_network_role(auth.uid(),'worship','member')))
  )
);
create policy "worship notes update" on public.worship_schedule_notes for update to authenticated
using (
  (select public.is_admin())
  or (select public.has_network_role(auth.uid(),'worship','leader'))
  or (created_by=auth.uid() and note_type='comment' and visibility='team')
)
with check (
  (select public.is_admin())
  or (select public.has_network_role(auth.uid(),'worship','leader'))
  or (created_by=auth.uid() and note_type='comment' and visibility='team')
);
create policy "worship notes delete" on public.worship_schedule_notes for delete to authenticated
using (
  (select public.is_admin())
  or (select public.has_network_role(auth.uid(),'worship','leader'))
  or (created_by=auth.uid() and note_type='comment' and visibility='team')
);