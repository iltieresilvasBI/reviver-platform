alter table public.worship_songs
  add column if not exists themes text[] not null default '{}',
  add column if not exists spotify_url text,
  add column if not exists apple_music_url text,
  add column if not exists deezer_url text,
  add column if not exists lyrics_url text,
  add column if not exists composition_title text,
  add column if not exists version_name text,
  add column if not exists original_key text,
  add column if not exists recommended_key text,
  add column if not exists public_visible boolean not null default false,
  add column if not exists archived_at timestamptz;

alter table public.worship_schedules
  add column if not exists theme text,
  add column if not exists themes text[] not null default '{}',
  add column if not exists location text,
  add column if not exists ends_at timestamptz,
  add column if not exists publication_state text not null default 'draft',
  add column if not exists approved_at timestamptz,
  add column if not exists published_at timestamptz,
  add column if not exists public_repertoire boolean not null default false;

update public.worship_schedules
set themes=array[theme]
where coalesce(theme,'')<>'' and coalesce(array_length(themes,1),0)=0;

alter table public.worship_schedules
  drop constraint if exists worship_schedules_publication_state_check;
alter table public.worship_schedules
  add constraint worship_schedules_publication_state_check
  check (publication_state in ('draft','approved','published'));

alter table public.worship_schedule_songs
  add column if not exists lead_membership_id uuid references public.network_memberships(id) on delete set null,
  add column if not exists performed_notes text;

create table if not exists public.worship_themes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.worship_themes(name,slug)
values
 ('Adoração','adoracao'),('Gratidão','gratidao'),('Fé','fe'),('Esperança','esperanca'),
 ('Arrependimento','arrependimento'),('Consagração','consagracao'),('Ceia','ceia'),
 ('Cruz','cruz'),('Ressurreição','ressurreicao'),('Espírito Santo','espirito-santo'),
 ('Missões','missoes'),('Família','familia'),('Natal','natal')
on conflict (slug) do nothing;

create table if not exists public.worship_song_executions (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.worship_schedules(id) on delete cascade,
  song_id uuid not null references public.worship_songs(id) on delete restrict,
  key_used text,
  version_used text,
  notes text,
  confirmed_by uuid not null references public.profiles(id) on delete restrict,
  confirmed_at timestamptz not null default now(),
  unique(schedule_id,song_id)
);

create index if not exists worship_songs_themes_gin_idx on public.worship_songs using gin(themes);
create index if not exists worship_schedules_theme_idx on public.worship_schedules(theme) where theme is not null;
create index if not exists worship_schedules_themes_gin_idx on public.worship_schedules using gin(themes);
create index if not exists worship_song_executions_schedule_idx on public.worship_song_executions(schedule_id);
create index if not exists worship_song_executions_song_idx on public.worship_song_executions(song_id);

alter table public.worship_themes enable row level security;
alter table public.worship_song_executions enable row level security;

grant select,insert,update,delete on public.worship_themes to authenticated;
grant select,insert,update,delete on public.worship_song_executions to authenticated;

drop policy if exists "worship themes members read" on public.worship_themes;
create policy "worship themes members read" on public.worship_themes for select to authenticated
using ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','member')));

drop policy if exists "worship themes leaders write" on public.worship_themes;
create policy "worship themes leaders write" on public.worship_themes for all to authenticated
using ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','leader')))
with check ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','leader')));

drop policy if exists "worship executions members read" on public.worship_song_executions;
create policy "worship executions members read" on public.worship_song_executions for select to authenticated
using ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','member')));

drop policy if exists "worship executions leaders write" on public.worship_song_executions;
create policy "worship executions leaders write" on public.worship_song_executions for all to authenticated
using ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','leader')))
with check ((select public.is_admin()) or (select public.has_network_role(auth.uid(),'worship','leader')));

grant select (id,title,artist,composition_title,version_name,original_key,recommended_key,youtube_url,spotify_url,apple_music_url,deezer_url,chord_url,lyrics_url,themes,public_visible,active,archived_at) on public.worship_songs to anon;
grant select (id,title,service_type,starts_at,themes,public_repertoire,publication_state,status) on public.worship_schedules to anon;
grant select (id,schedule_id,song_id,position,key_override) on public.worship_schedule_songs to anon;

drop policy if exists "worship songs public read" on public.worship_songs;
create policy "worship songs public read" on public.worship_songs for select to anon
using (public_visible=true and active=true and archived_at is null);

drop policy if exists "worship schedules public repertoire read" on public.worship_schedules;
create policy "worship schedules public repertoire read" on public.worship_schedules for select to anon
using (public_repertoire=true and publication_state='published' and status<>'cancelled');

drop policy if exists "worship schedule songs public read" on public.worship_schedule_songs;
create policy "worship schedule songs public read" on public.worship_schedule_songs for select to anon
using (
  exists (
    select 1 from public.worship_schedules s
    where s.id=schedule_id and s.public_repertoire=true and s.publication_state='published' and s.status<>'cancelled'
  )
  and exists (
    select 1 from public.worship_songs ws
    where ws.id=song_id and ws.public_visible=true and ws.active=true and ws.archived_at is null
  )
);
