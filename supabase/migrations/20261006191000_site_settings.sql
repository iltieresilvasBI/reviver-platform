create table if not exists public.site_settings (
  id smallint primary key default 1 check (id=1),
  church_name text not null default 'Igreja Reviver',
  email text,
  whatsapp text,
  address text,
  hours text,
  map_embed_url text,
  instagram_url text,
  facebook_url text,
  youtube_url text,
  other_social_url text,
  about_intro text,
  history text,
  mission text,
  vision text,
  values_text text,
  leadership text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
insert into public.site_settings(id,church_name) values(1,'Igreja Reviver') on conflict(id) do nothing;
alter table public.site_settings enable row level security;
grant select on public.site_settings to anon, authenticated;
grant update on public.site_settings to authenticated;
drop policy if exists "site settings public read" on public.site_settings;
create policy "site settings public read" on public.site_settings for select to anon, authenticated using (id=1);
drop policy if exists "site settings admin update" on public.site_settings;
create policy "site settings admin update" on public.site_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());
