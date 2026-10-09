-- Optimize hot RLS policies by evaluating auth.uid() once per statement.

alter policy "profiles read own or admin"
on public.profiles
using ((id = (select auth.uid())) or is_admin());

alter policy "profiles update own or admin"
on public.profiles
using ((id = (select auth.uid())) or is_admin())
with check ((id = (select auth.uid())) or is_admin());

alter policy "profiles worship leaders read members"
on public.profiles
using (
  has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role)
  and exists (
    select 1
    from public.network_memberships nm
    join public.networks n on n.id=nm.network_id
    where nm.user_id=profiles.id and n.slug='worship'
  )
);

alter policy "media create content"
on public.content_items
with check (
  is_admin()
  or has_app_role((select auth.uid()),'media_editor'::public.app_role)
  or has_app_role((select auth.uid()),'media_leader'::public.app_role)
);

alter policy "media update content"
on public.content_items
using (
  is_admin()
  or has_app_role((select auth.uid()),'media_leader'::public.app_role)
  or (
    created_by=(select auth.uid())
    and has_app_role((select auth.uid()),'media_editor'::public.app_role)
    and status=any(array['draft'::public.content_status,'changes_requested'::public.content_status])
  )
)
with check (
  is_admin()
  or has_app_role((select auth.uid()),'media_leader'::public.app_role)
  or (
    created_by=(select auth.uid())
    and has_app_role((select auth.uid()),'media_editor'::public.app_role)
    and status=any(array['draft'::public.content_status,'changes_requested'::public.content_status])
  )
);

alter policy "published content public read"
on public.content_items
using (
  (
    status='published'::public.content_status
    and published_at is not null
    and published_at<=now()
  )
  or is_admin()
  or has_app_role((select auth.uid()),'media_editor'::public.app_role)
  or has_app_role((select auth.uid()),'media_leader'::public.app_role)
);

alter policy "media manage media rows"
on public.content_media
using (
  is_admin()
  or has_app_role((select auth.uid()),'media_editor'::public.app_role)
  or has_app_role((select auth.uid()),'media_leader'::public.app_role)
)
with check (
  is_admin()
  or has_app_role((select auth.uid()),'media_editor'::public.app_role)
  or has_app_role((select auth.uid()),'media_leader'::public.app_role)
);

alter policy "media rows public read"
on public.content_media
using (
  exists (
    select 1 from public.content_items ci
    where ci.id=content_media.content_item_id
      and ci.status='published'::public.content_status
      and ci.published_at is not null
      and ci.published_at<=now()
  )
  or is_admin()
  or has_app_role((select auth.uid()),'media_editor'::public.app_role)
  or has_app_role((select auth.uid()),'media_leader'::public.app_role)
);

alter policy "content networks media write"
on public.content_item_networks
using (
  is_admin()
  or has_app_role((select auth.uid()),'media_editor'::public.app_role)
  or has_app_role((select auth.uid()),'media_leader'::public.app_role)
)
with check (
  is_admin()
  or has_app_role((select auth.uid()),'media_editor'::public.app_role)
  or has_app_role((select auth.uid()),'media_leader'::public.app_role)
);

alter policy "content networks public read"
on public.content_item_networks
using (
  exists (
    select 1 from public.content_items ci
    where ci.id=content_item_networks.content_item_id
      and ci.status='published'::public.content_status
      and ci.published_at is not null
      and ci.published_at<=now()
  )
  or is_admin()
  or has_app_role((select auth.uid()),'media_editor'::public.app_role)
  or has_app_role((select auth.uid()),'media_leader'::public.app_role)
);

alter policy "worship response own insert"
on public.worship_assignment_responses
with check (
  exists (
    select 1
    from public.worship_schedule_members wsm
    join public.network_memberships nm on nm.id=wsm.membership_id
    where wsm.id=worship_assignment_responses.assignment_id
      and nm.user_id=(select auth.uid())
      and nm.status='active'::public.membership_status
  )
);

alter policy "worship response own update"
on public.worship_assignment_responses
using (
  exists (
    select 1
    from public.worship_schedule_members wsm
    join public.network_memberships nm on nm.id=wsm.membership_id
    where wsm.id=worship_assignment_responses.assignment_id
      and nm.user_id=(select auth.uid())
      and nm.status='active'::public.membership_status
  )
)
with check (
  exists (
    select 1
    from public.worship_schedule_members wsm
    join public.network_memberships nm on nm.id=wsm.membership_id
    where wsm.id=worship_assignment_responses.assignment_id
      and nm.user_id=(select auth.uid())
      and nm.status='active'::public.membership_status
  )
);

alter policy "worship response read relevant"
on public.worship_assignment_responses
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
  or exists (
    select 1
    from public.worship_schedule_members wsm
    join public.network_memberships nm on nm.id=wsm.membership_id
    where wsm.id=worship_assignment_responses.assignment_id
      and nm.user_id=(select auth.uid())
      and nm.status='active'::public.membership_status
  )
);
