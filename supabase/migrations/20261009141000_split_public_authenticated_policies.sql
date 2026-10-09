-- Split anonymous/public access from authenticated management policies.
-- Goal: public visitors never need EXECUTE on SECURITY DEFINER role helpers.

-- CONTENT ITEMS
drop policy if exists "published content public read" on public.content_items;
create policy "published content public read"
on public.content_items
for select
to anon, authenticated
using (
  status='published'::public.content_status
  and published_at is not null
  and published_at<=now()
);

drop policy if exists "media managers read content" on public.content_items;
create policy "media managers read content"
on public.content_items
for select
to authenticated
using (
  is_admin()
  or has_app_role((select auth.uid()),'media_editor'::public.app_role)
  or has_app_role((select auth.uid()),'media_leader'::public.app_role)
);

alter policy "media create content"
on public.content_items
to authenticated;

alter policy "media update content"
on public.content_items
to authenticated;

-- CONTENT MEDIA
drop policy if exists "media rows public read" on public.content_media;
create policy "media rows public read"
on public.content_media
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.content_items ci
    where ci.id=content_media.content_item_id
      and ci.status='published'::public.content_status
      and ci.published_at is not null
      and ci.published_at<=now()
  )
);

drop policy if exists "media managers read media rows" on public.content_media;
create policy "media managers read media rows"
on public.content_media
for select
to authenticated
using (
  is_admin()
  or has_app_role((select auth.uid()),'media_editor'::public.app_role)
  or has_app_role((select auth.uid()),'media_leader'::public.app_role)
);

alter policy "media manage media rows"
on public.content_media
to authenticated;

-- CONTENT ↔ NETWORK
drop policy if exists "content networks public read" on public.content_item_networks;
create policy "content networks public read"
on public.content_item_networks
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.content_items ci
    where ci.id=content_item_networks.content_item_id
      and ci.status='published'::public.content_status
      and ci.published_at is not null
      and ci.published_at<=now()
  )
);

drop policy if exists "content networks managers read" on public.content_item_networks;
create policy "content networks managers read"
on public.content_item_networks
for select
to authenticated
using (
  is_admin()
  or has_app_role((select auth.uid()),'media_editor'::public.app_role)
  or has_app_role((select auth.uid()),'media_leader'::public.app_role)
);

alter policy "content networks media write"
on public.content_item_networks
to authenticated;

-- CATEGORIES
drop policy if exists "categories public read" on public.content_categories;
create policy "categories public read"
on public.content_categories
for select
to anon, authenticated
using (active=true);

drop policy if exists "categories managers read" on public.content_categories;
create policy "categories managers read"
on public.content_categories
for select
to authenticated
using (
  is_admin()
  or has_app_role((select auth.uid()),'media_editor'::public.app_role)
  or has_app_role((select auth.uid()),'media_leader'::public.app_role)
);

alter policy "categories managers write"
on public.content_categories
to authenticated;

-- CONTENT ↔ CATEGORIES
drop policy if exists "item categories public read" on public.content_item_categories;
create policy "item categories public read"
on public.content_item_categories
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.content_items ci
    where ci.id=content_item_categories.content_item_id
      and ci.status='published'::public.content_status
      and ci.published_at is not null
      and ci.published_at<=now()
  )
);

drop policy if exists "item categories managers read" on public.content_item_categories;
create policy "item categories managers read"
on public.content_item_categories
for select
to authenticated
using (
  is_admin()
  or has_app_role((select auth.uid()),'media_editor'::public.app_role)
  or has_app_role((select auth.uid()),'media_leader'::public.app_role)
);

alter policy "item categories media write"
on public.content_item_categories
to authenticated;

-- NETWORKS: public sees only active; Admin gets all through a separate policy.
drop policy if exists "networks public read active" on public.networks;
create policy "networks public read active"
on public.networks
for select
to anon, authenticated
using (active=true);

drop policy if exists "networks admin read all" on public.networks;
create policy "networks admin read all"
on public.networks
for select
to authenticated
using (is_admin());

-- Policies that are never meant for anonymous users.
alter policy "audit media insert" on public.content_audit_log to authenticated;
alter policy "audit media read" on public.content_audit_log to authenticated;
alter policy "academy courses admin write" on public.academy_courses to authenticated;
alter policy "academy lessons admin write" on public.academy_lessons to authenticated;
alter policy "academy modules admin write" on public.academy_modules to authenticated;
alter policy "progress own read" on public.lesson_progress to authenticated;
alter policy "membership managers update" on public.network_memberships to authenticated;
alter policy "memberships read relevant" on public.network_memberships to authenticated;
alter policy "membership self request" on public.network_memberships to authenticated;
alter policy "profiles read own or admin" on public.profiles to authenticated;
alter policy "profiles update own or admin" on public.profiles to authenticated;
alter policy "profiles worship leaders read members" on public.profiles to authenticated;
alter policy "attempts own read" on public.quiz_attempts to authenticated;
alter policy "quiz options admin read" on public.quiz_options to authenticated;
alter policy "quiz options admin write" on public.quiz_options to authenticated;
alter policy "quiz questions admin write" on public.quiz_questions to authenticated;
alter policy "user achievements own read" on public.user_achievements to authenticated;
alter policy "roles insert by allowed managers" on public.user_app_roles to authenticated;
alter policy "roles read own or managers" on public.user_app_roles to authenticated;
alter policy "roles update by allowed managers" on public.user_app_roles to authenticated;
alter policy "worship active members read" on public.worship_items to authenticated;
alter policy "worship leaders write" on public.worship_items to authenticated;
alter policy "xp own read" on public.xp_events to authenticated;

-- Anonymous visitors no longer need the target-based role helpers.
revoke execute on function public.is_admin(uuid) from anon;
revoke execute on function public.has_app_role(uuid,public.app_role) from anon;
