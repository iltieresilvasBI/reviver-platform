alter table public.worship_songs
  add column if not exists service_types text[] not null default '{}'::text[];
