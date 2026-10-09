-- Optimize remaining frequently used RLS policies without changing access rules.

alter policy "audit media insert"
on public.content_audit_log
to authenticated
with check (
  (select is_admin())
  or (select has_app_role((select auth.uid()),'media_editor'::public.app_role))
  or (select has_app_role((select auth.uid()),'media_leader'::public.app_role))
);

alter policy "audit media read"
on public.content_audit_log
to authenticated
using (
  (select is_admin())
  or (select has_app_role((select auth.uid()),'media_editor'::public.app_role))
  or (select has_app_role((select auth.uid()),'media_leader'::public.app_role))
);

alter policy "categories managers write"
on public.content_categories
to authenticated
using (
  (select is_admin())
  or (select has_app_role((select auth.uid()),'media_leader'::public.app_role))
)
with check (
  (select is_admin())
  or (select has_app_role((select auth.uid()),'media_leader'::public.app_role))
);

alter policy "item categories media write"
on public.content_item_categories
to authenticated
using (
  (select is_admin())
  or (select has_app_role((select auth.uid()),'media_editor'::public.app_role))
  or (select has_app_role((select auth.uid()),'media_leader'::public.app_role))
)
with check (
  (select is_admin())
  or (select has_app_role((select auth.uid()),'media_editor'::public.app_role))
  or (select has_app_role((select auth.uid()),'media_leader'::public.app_role))
);

alter policy "progress own read"
on public.lesson_progress
to authenticated
using (
  user_id=(select auth.uid())
  or (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
);

alter policy "attempts own read"
on public.quiz_attempts
to authenticated
using (
  user_id=(select auth.uid())
  or (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
);

alter policy "xp own read"
on public.xp_events
to authenticated
using (
  user_id=(select auth.uid())
  or (select is_admin())
);

alter policy "practice own"
on public.practice_sessions
to authenticated
using (user_id=(select auth.uid()))
with check (user_id=(select auth.uid()));

alter policy "user achievements own read"
on public.user_achievements
to authenticated
using (
  user_id=(select auth.uid())
  or (select is_admin())
);

alter policy "membership managers update"
on public.network_memberships
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
)
with check (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
);

alter policy "membership self request"
on public.network_memberships
to authenticated
with check (
  user_id=(select auth.uid())
  and role='member'::public.network_role
  and status='pending'::public.membership_status
);

alter policy "memberships read relevant"
on public.network_memberships
to authenticated
using (
  user_id=(select auth.uid())
  or (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
);

alter policy "roles insert by allowed managers"
on public.user_app_roles
to authenticated
with check (
  (select is_admin())
  or (
    (select has_app_role((select auth.uid()),'media_leader'::public.app_role))
    and role='media_editor'::public.app_role
  )
);

alter policy "roles read own or managers"
on public.user_app_roles
to authenticated
using (
  user_id=(select auth.uid())
  or (select is_admin())
  or (select has_app_role((select auth.uid()),'media_leader'::public.app_role))
);

alter policy "roles update by allowed managers"
on public.user_app_roles
to authenticated
using (
  (select is_admin())
  or (
    (select has_app_role((select auth.uid()),'media_leader'::public.app_role))
    and role='media_editor'::public.app_role
  )
)
with check (
  (select is_admin())
  or (
    (select has_app_role((select auth.uid()),'media_leader'::public.app_role))
    and role='media_editor'::public.app_role
  )
);

alter policy "worship active members read"
on public.worship_items
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'member'::public.network_role))
);

alter policy "worship leaders write"
on public.worship_items
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
)
with check (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
);

alter policy "ministry imports responsible insert"
on public.ministry_import_batches
to authenticated
with check (
  imported_by=(select auth.uid())
  and (
    (select is_admin())
    or exists (
      select 1
      from public.networks n
      where n.id=ministry_import_batches.network_id
        and (select has_network_role((select auth.uid()),n.slug,'leader'::public.network_role))
    )
  )
);

alter policy "ministry imports responsible read"
on public.ministry_import_batches
to authenticated
using (
  (select is_admin())
  or exists (
    select 1
    from public.networks n
    where n.id=ministry_import_batches.network_id
      and (select has_network_role((select auth.uid()),n.slug,'leader'::public.network_role))
  )
);

alter policy "ministry people leaders insert"
on public.ministry_people
to authenticated
with check (
  (select is_admin())
  or exists (
    select 1
    from public.network_memberships nm
    where nm.user_id=(select auth.uid())
      and nm.role='leader'::public.network_role
      and nm.status='active'::public.membership_status
  )
);

alter policy "ministry people responsible read"
on public.ministry_people
to authenticated
using (
  (select is_admin())
  or exists (
    select 1
    from public.ministry_person_assignments a
    join public.networks n on n.id=a.network_id
    where a.person_id=ministry_people.id
      and (select has_network_role((select auth.uid()),n.slug,'leader'::public.network_role))
  )
);

alter policy "ministry people responsible update"
on public.ministry_people
to authenticated
using (
  (select is_admin())
  or exists (
    select 1
    from public.ministry_person_assignments a
    join public.networks n on n.id=a.network_id
    where a.person_id=ministry_people.id
      and (select has_network_role((select auth.uid()),n.slug,'leader'::public.network_role))
  )
)
with check (
  (select is_admin())
  or exists (
    select 1
    from public.ministry_person_assignments a
    join public.networks n on n.id=a.network_id
    where a.person_id=ministry_people.id
      and (select has_network_role((select auth.uid()),n.slug,'leader'::public.network_role))
  )
);

alter policy "ministry assignments responsible read"
on public.ministry_person_assignments
to authenticated
using (
  (select is_admin())
  or exists (
    select 1
    from public.networks n
    where n.id=ministry_person_assignments.network_id
      and (select has_network_role((select auth.uid()),n.slug,'leader'::public.network_role))
  )
);

alter policy "ministry assignments responsible write"
on public.ministry_person_assignments
to authenticated
using (
  (select is_admin())
  or exists (
    select 1
    from public.networks n
    where n.id=ministry_person_assignments.network_id
      and (select has_network_role((select auth.uid()),n.slug,'leader'::public.network_role))
  )
)
with check (
  (select is_admin())
  or exists (
    select 1
    from public.networks n
    where n.id=ministry_person_assignments.network_id
      and (select has_network_role((select auth.uid()),n.slug,'leader'::public.network_role))
  )
);
