-- Reviver Platform initial schema
-- Supabase / PostgreSQL
-- 2026-10-06

create extension if not exists pgcrypto;

do $$ begin
  create type public.global_role as enum ('user','admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.app_role as enum ('media_editor','media_leader');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.network_role as enum ('member','leader');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.membership_status as enum ('pending','invited','active','rejected','revoked');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.content_type as enum ('video','post','event','campaign','gallery','home_highlight');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.content_status as enum ('draft','in_review','changes_requested','rejected','approved','scheduled','published');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  phone text,
  global_role public.global_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_app_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique(user_id, role)
);

create table if not exists public.networks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.network_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  network_id uuid not null references public.networks(id) on delete cascade,
  role public.network_role not null default 'member',
  status public.membership_status not null default 'pending',
  requested_at timestamptz,
  invited_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, network_id)
);

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  content_type public.content_type not null,
  title text not null,
  slug text not null unique,
  summary text,
  body text,
  status public.content_status not null default 'draft',
  created_by uuid not null references auth.users(id) on delete restrict,
  submitted_by uuid references auth.users(id) on delete set null,
  submitted_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  scheduled_by uuid references auth.users(id) on delete set null,
  scheduled_at timestamptz,
  scheduled_for timestamptz,
  published_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  rejected_by uuid references auth.users(id) on delete set null,
  rejected_at timestamptz,
  rejection_reason text,
  event_start timestamptz,
  event_end timestamptz,
  event_location text,
  campaign_start timestamptz,
  campaign_end timestamptz,
  cta_label text,
  cta_url text,
  youtube_id text,
  featured boolean not null default false,
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_content_items_status_type on public.content_items(status, content_type);
create index if not exists idx_content_items_published_at on public.content_items(published_at);
create index if not exists idx_content_items_scheduled_for on public.content_items(scheduled_for);
create index if not exists idx_content_items_event_start on public.content_items(event_start);

create table if not exists public.content_media (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  media_type text not null check (media_type in ('image','gallery_image','cover')),
  storage_path text,
  external_url text,
  alt_text text,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.content_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  active boolean not null default true
);

create table if not exists public.content_item_categories (
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  category_id uuid not null references public.content_categories(id) on delete cascade,
  primary key(content_item_id, category_id)
);

create table if not exists public.content_audit_log (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  from_status public.content_status,
  to_status public.content_status,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.academy_courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.academy_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.academy_courses(id) on delete cascade,
  slug text not null,
  title text not null,
  description text,
  sort_order integer not null default 0,
  unlock_after_module_id uuid references public.academy_modules(id) on delete set null,
  unique(course_id, slug)
);

create table if not exists public.academy_lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.academy_modules(id) on delete cascade,
  slug text not null,
  title text not null,
  summary text,
  objectives text,
  exercise text,
  youtube_id text,
  duration_minutes integer,
  xp_reward integer not null default 100,
  pass_percentage integer not null default 70 check (pass_percentage between 0 and 100),
  sort_order integer not null default 0,
  active boolean not null default true,
  unique(module_id, slug)
);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.academy_lessons(id) on delete cascade,
  prompt text not null,
  sort_order integer not null default 0
);

create table if not exists public.quiz_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  label text not null,
  is_correct boolean not null default false,
  sort_order integer not null default 0
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.academy_lessons(id) on delete cascade,
  score_percentage numeric(5,2) not null,
  passed boolean not null,
  review_mode boolean not null default false,
  attempted_at timestamptz not null default now()
);

create table if not exists public.lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.academy_lessons(id) on delete cascade,
  status text not null default 'available' check (status in ('locked','available','completed')),
  best_score_percentage numeric(5,2),
  first_completed_at timestamptz,
  last_activity_at timestamptz not null default now(),
  primary key(user_id, lesson_id)
);

create table if not exists public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid references public.academy_lessons(id) on delete cascade,
  event_key text not null,
  xp integer not null check (xp >= 0),
  created_at timestamptz not null default now(),
  unique(user_id, event_key)
);

create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_key text not null,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  practiced_at timestamptz not null default now()
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  icon text
);

create table if not exists public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  primary key(user_id, achievement_id)
);

insert into public.networks(slug,name,active)
values ('worship','Ministério de Louvor',true)
on conflict (slug) do update set name=excluded.name, active=true, updated_at=now();

insert into storage.buckets(id,name,public)
values ('reviver-public','reviver-public',true)
on conflict (id) do update set public=true;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles(id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_admin(target uuid default auth.uid())
returns boolean
language sql stable security definer set search_path=public
as $$
  select exists(
    select 1 from public.profiles
    where id=target and global_role='admin'
  );
$$;

create or replace function public.has_app_role(target uuid, wanted public.app_role)
returns boolean
language sql stable security definer set search_path=public
as $$
  select exists(
    select 1 from public.user_app_roles
    where user_id=target and role=wanted and revoked_at is null
  );
$$;

create or replace function public.has_network_role(target uuid, network_slug text, wanted public.network_role)
returns boolean
language sql stable security definer set search_path=public
as $$
  select exists(
    select 1
    from public.network_memberships nm
    join public.networks n on n.id=nm.network_id
    where nm.user_id=target
      and n.slug=network_slug
      and nm.status='active'
      and (nm.role=wanted or (wanted='member' and nm.role='leader'))
  );
$$;

alter table public.profiles enable row level security;
alter table public.user_app_roles enable row level security;
alter table public.networks enable row level security;
alter table public.network_memberships enable row level security;
alter table public.content_items enable row level security;
alter table public.content_media enable row level security;
alter table public.content_categories enable row level security;
alter table public.content_item_categories enable row level security;
alter table public.content_audit_log enable row level security;
alter table public.academy_courses enable row level security;
alter table public.academy_modules enable row level security;
alter table public.academy_lessons enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_options enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.xp_events enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;

create policy "profiles read own or admin" on public.profiles for select
using (id=auth.uid() or public.is_admin());

create policy "profiles update own or admin" on public.profiles for update
using (id=auth.uid() or public.is_admin())
with check (id=auth.uid() or public.is_admin());

create policy "roles read own or managers" on public.user_app_roles for select
using (
  user_id=auth.uid()
  or public.is_admin()
  or public.has_app_role(auth.uid(),'media_leader')
);

create policy "roles insert by allowed managers" on public.user_app_roles for insert
with check (
  public.is_admin()
  or (
    public.has_app_role(auth.uid(),'media_leader')
    and role='media_editor'
  )
);

create policy "roles update by allowed managers" on public.user_app_roles for update
using (
  public.is_admin()
  or (
    public.has_app_role(auth.uid(),'media_leader')
    and role='media_editor'
  )
)
with check (
  public.is_admin()
  or (
    public.has_app_role(auth.uid(),'media_leader')
    and role='media_editor'
  )
);

create policy "networks public read active" on public.networks for select
using (active=true or public.is_admin());

create policy "memberships read relevant" on public.network_memberships for select
using (
  user_id=auth.uid()
  or public.is_admin()
  or public.has_network_role(auth.uid(),'worship','leader')
);

create policy "membership self request" on public.network_memberships for insert
with check (
  user_id=auth.uid()
  and role='member'
  and status='pending'
);

create policy "membership managers update" on public.network_memberships for update
using (
  public.is_admin()
  or public.has_network_role(auth.uid(),'worship','leader')
)
with check (
  public.is_admin()
  or public.has_network_role(auth.uid(),'worship','leader')
);

create policy "published content public read" on public.content_items for select
using (
  (status='published' and published_at is not null and published_at<=now())
  or public.is_admin()
  or public.has_app_role(auth.uid(),'media_editor')
  or public.has_app_role(auth.uid(),'media_leader')
);

create policy "media create content" on public.content_items for insert
with check (
  public.is_admin()
  or public.has_app_role(auth.uid(),'media_editor')
  or public.has_app_role(auth.uid(),'media_leader')
);

create policy "media update content" on public.content_items for update
using (
  public.is_admin()
  or public.has_app_role(auth.uid(),'media_leader')
  or (
    created_by=auth.uid()
    and public.has_app_role(auth.uid(),'media_editor')
    and status in ('draft','changes_requested')
  )
)
with check (
  public.is_admin()
  or public.has_app_role(auth.uid(),'media_leader')
  or created_by=auth.uid()
);

create policy "media rows public read" on public.content_media for select
using (
  exists (
    select 1 from public.content_items ci
    where ci.id=content_item_id
      and ci.status='published'
      and ci.published_at is not null
      and ci.published_at<=now()
  )
  or public.is_admin()
  or public.has_app_role(auth.uid(),'media_editor')
  or public.has_app_role(auth.uid(),'media_leader')
);

create policy "media manage media rows" on public.content_media for all
using (
  public.is_admin()
  or public.has_app_role(auth.uid(),'media_editor')
  or public.has_app_role(auth.uid(),'media_leader')
)
with check (
  public.is_admin()
  or public.has_app_role(auth.uid(),'media_editor')
  or public.has_app_role(auth.uid(),'media_leader')
);

create policy "categories public read" on public.content_categories for select
using (active=true or public.is_admin() or public.has_app_role(auth.uid(),'media_editor') or public.has_app_role(auth.uid(),'media_leader'));

create policy "categories managers write" on public.content_categories for all
using (public.is_admin() or public.has_app_role(auth.uid(),'media_leader'))
with check (public.is_admin() or public.has_app_role(auth.uid(),'media_leader'));

create policy "item categories public read" on public.content_item_categories for select
using (true);

create policy "item categories media write" on public.content_item_categories for all
using (public.is_admin() or public.has_app_role(auth.uid(),'media_editor') or public.has_app_role(auth.uid(),'media_leader'))
with check (public.is_admin() or public.has_app_role(auth.uid(),'media_editor') or public.has_app_role(auth.uid(),'media_leader'));

create policy "audit media read" on public.content_audit_log for select
using (public.is_admin() or public.has_app_role(auth.uid(),'media_editor') or public.has_app_role(auth.uid(),'media_leader'));

create policy "audit media insert" on public.content_audit_log for insert
with check (public.is_admin() or public.has_app_role(auth.uid(),'media_editor') or public.has_app_role(auth.uid(),'media_leader'));

create policy "academy catalog read" on public.academy_courses for select using (active=true);
create policy "academy modules read" on public.academy_modules for select using (true);
create policy "academy lessons read" on public.academy_lessons for select using (active=true);
create policy "quiz questions read" on public.quiz_questions for select using (true);
create policy "quiz options read" on public.quiz_options for select using (true);

create policy "attempts own read" on public.quiz_attempts for select
using (user_id=auth.uid() or public.is_admin() or public.has_network_role(auth.uid(),'worship','leader'));

create policy "attempts own insert" on public.quiz_attempts for insert
with check (user_id=auth.uid());

create policy "progress own read" on public.lesson_progress for select
using (user_id=auth.uid() or public.is_admin() or public.has_network_role(auth.uid(),'worship','leader'));

create policy "progress own write" on public.lesson_progress for all
using (user_id=auth.uid())
with check (user_id=auth.uid());

create policy "xp own read" on public.xp_events for select
using (user_id=auth.uid() or public.is_admin());

create policy "xp own insert" on public.xp_events for insert
with check (user_id=auth.uid());

create policy "practice own" on public.practice_sessions for all
using (user_id=auth.uid())
with check (user_id=auth.uid());

create policy "achievements read" on public.achievements for select using (true);
create policy "user achievements own read" on public.user_achievements for select
using (user_id=auth.uid() or public.is_admin());

create policy "storage public read reviver" on storage.objects for select
using (bucket_id='reviver-public');

create policy "storage media upload reviver" on storage.objects for insert
with check (
  bucket_id='reviver-public'
  and (
    public.is_admin()
    or public.has_app_role(auth.uid(),'media_editor')
    or public.has_app_role(auth.uid(),'media_leader')
  )
);

create policy "storage media update reviver" on storage.objects for update
using (
  bucket_id='reviver-public'
  and (
    public.is_admin()
    or public.has_app_role(auth.uid(),'media_editor')
    or public.has_app_role(auth.uid(),'media_leader')
  )
)
with check (
  bucket_id='reviver-public'
  and (
    public.is_admin()
    or public.has_app_role(auth.uid(),'media_editor')
    or public.has_app_role(auth.uid(),'media_leader')
  )
);

create policy "storage media delete reviver" on storage.objects for delete
using (
  bucket_id='reviver-public'
  and (
    public.is_admin()
    or public.has_app_role(auth.uid(),'media_leader')
  )
);
