alter table public.worship_songs
  add column if not exists themes text[] not null default '{}',
  add column if not exists spotify_url text,
  add column if not exists apple_music_url text,
  add column if not exists deezer_url text,
  add column if not exists lyrics_url text;

alter table public.worship_schedules
  add column if not exists theme text;

create index if not exists worship_songs_themes_gin_idx
  on public.worship_songs using gin (themes);

create index if not exists worship_schedules_theme_idx
  on public.worship_schedules(theme)
  where theme is not null;
