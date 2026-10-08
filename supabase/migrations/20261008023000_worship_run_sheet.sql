create table if not exists public.worship_run_sheet_items (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.worship_schedules(id) on delete cascade,
  position integer not null default 1 check (position>0),
  item_type text not null default 'other' check (item_type in ('song','prayer','welcome','offering','announcement','message','transition','other')),
  title text not null,
  song_id uuid references public.worship_songs(id) on delete set null,
  owner_label text,
  planned_minutes integer check (planned_minutes is null or planned_minutes between 0 and 240),
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists worship_run_sheet_schedule_idx on public.worship_run_sheet_items(schedule_id,position);

alter table public.worship_run_sheet_items enable row level security;
grant select,insert,update,delete on public.worship_run_sheet_items to authenticated;

create policy "worship run sheet members read" on public.worship_run_sheet_items for select to authenticated
using ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','member')));

create policy "worship run sheet leaders write" on public.worship_run_sheet_items for all to authenticated
using ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','leader')))
with check ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','leader')));