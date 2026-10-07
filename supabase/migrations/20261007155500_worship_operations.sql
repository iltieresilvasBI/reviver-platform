create table if not exists public.worship_member_profiles (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null unique references public.network_memberships(id) on delete cascade,
  group_code text check (group_code in ('A','B','C','D')),
  roles text[] not null default '{}',
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.worship_songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text,
  default_key text,
  bpm integer check (bpm is null or bpm between 30 and 300),
  youtube_url text,
  chord_url text,
  notes text,
  active boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.worship_schedules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  service_type text,
  starts_at timestamptz not null,
  call_time timestamptz,
  group_code text check (group_code in ('A','B','C','D')),
  status text not null default 'planned' check (status in ('planned','confirmed','completed','cancelled')),
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.worship_schedule_members (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.worship_schedules(id) on delete cascade,
  membership_id uuid not null references public.network_memberships(id) on delete cascade,
  role text,
  attendance_status text not null default 'assigned' check (attendance_status in ('assigned','confirmed','declined','completed')),
  notes text,
  created_at timestamptz not null default now(),
  unique(schedule_id,membership_id,role)
);

create table if not exists public.worship_schedule_songs (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.worship_schedules(id) on delete cascade,
  song_id uuid not null references public.worship_songs(id) on delete restrict,
  position integer not null default 1 check (position > 0),
  key_override text,
  notes text,
  unique(schedule_id,song_id)
);

create table if not exists public.worship_rehearsals (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid references public.worship_schedules(id) on delete set null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists worship_member_profiles_membership_idx on public.worship_member_profiles(membership_id);
create index if not exists worship_member_profiles_group_idx on public.worship_member_profiles(group_code) where active=true;
create index if not exists worship_schedules_starts_idx on public.worship_schedules(starts_at);
create index if not exists worship_schedule_members_schedule_idx on public.worship_schedule_members(schedule_id);
create index if not exists worship_schedule_members_membership_idx on public.worship_schedule_members(membership_id);
create index if not exists worship_schedule_songs_schedule_idx on public.worship_schedule_songs(schedule_id);
create index if not exists worship_rehearsals_starts_idx on public.worship_rehearsals(starts_at);

alter table public.worship_member_profiles enable row level security;
alter table public.worship_songs enable row level security;
alter table public.worship_schedules enable row level security;
alter table public.worship_schedule_members enable row level security;
alter table public.worship_schedule_songs enable row level security;
alter table public.worship_rehearsals enable row level security;

grant select,insert,update,delete on public.worship_member_profiles to authenticated;
grant select,insert,update,delete on public.worship_songs to authenticated;
grant select,insert,update,delete on public.worship_schedules to authenticated;
grant select,insert,update,delete on public.worship_schedule_members to authenticated;
grant select,insert,update,delete on public.worship_schedule_songs to authenticated;
grant select,insert,update,delete on public.worship_rehearsals to authenticated;

create policy "worship profiles members read" on public.worship_member_profiles for select to authenticated
using ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','member')));
create policy "worship profiles leaders write" on public.worship_member_profiles for all to authenticated
using ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','leader')))
with check ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','leader')));

create policy "worship songs members read" on public.worship_songs for select to authenticated
using ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','member')));
create policy "worship songs leaders write" on public.worship_songs for all to authenticated
using ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','leader')))
with check ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','leader')));

create policy "worship schedules members read" on public.worship_schedules for select to authenticated
using ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','member')));
create policy "worship schedules leaders write" on public.worship_schedules for all to authenticated
using ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','leader')))
with check ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','leader')));

create policy "worship schedule members read" on public.worship_schedule_members for select to authenticated
using ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','member')));
create policy "worship schedule members leaders write" on public.worship_schedule_members for all to authenticated
using ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','leader')))
with check ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','leader')));

create policy "worship schedule songs read" on public.worship_schedule_songs for select to authenticated
using ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','member')));
create policy "worship schedule songs leaders write" on public.worship_schedule_songs for all to authenticated
using ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','leader')))
with check ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','leader')));

create policy "worship rehearsals members read" on public.worship_rehearsals for select to authenticated
using ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','member')));
create policy "worship rehearsals leaders write" on public.worship_rehearsals for all to authenticated
using ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','leader')))
with check ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','leader')));
