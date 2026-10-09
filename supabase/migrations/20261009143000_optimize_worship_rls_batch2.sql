-- Optimize high-traffic Worship RLS policies without changing access semantics.

alter policy "worship profiles members read"
on public.worship_member_profiles
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'member'::public.network_role))
);

alter policy "worship profiles leaders write"
on public.worship_member_profiles
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
)
with check (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
);

alter policy "worship rehearsals members read"
on public.worship_rehearsals
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'member'::public.network_role))
);

alter policy "worship rehearsals leaders write"
on public.worship_rehearsals
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
)
with check (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
);

alter policy "worship rotation assignments members read"
on public.worship_rotation_assignments
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'member'::public.network_role))
);

alter policy "worship rotation assignments leaders write"
on public.worship_rotation_assignments
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
)
with check (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
);

alter policy "worship rotation months members read"
on public.worship_rotation_months
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'member'::public.network_role))
);

alter policy "worship rotation months leaders write"
on public.worship_rotation_months
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
)
with check (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
);

alter policy "worship rotation slots members read"
on public.worship_rotation_service_slots
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'member'::public.network_role))
);

alter policy "worship rotation slots leaders write"
on public.worship_rotation_service_slots
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
)
with check (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
);

alter policy "worship schedule members read"
on public.worship_schedule_members
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'member'::public.network_role))
);

alter policy "worship schedule members leaders write"
on public.worship_schedule_members
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
)
with check (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
);

alter policy "worship schedule songs read"
on public.worship_schedule_songs
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'member'::public.network_role))
);

alter policy "worship schedule songs leaders write"
on public.worship_schedule_songs
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
)
with check (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
);

alter policy "worship schedules members read"
on public.worship_schedules
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'member'::public.network_role))
);

alter policy "worship schedules leaders write"
on public.worship_schedules
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
)
with check (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
);

alter policy "worship executions members read"
on public.worship_song_executions
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'member'::public.network_role))
);

alter policy "worship executions leaders write"
on public.worship_song_executions
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
)
with check (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
);

alter policy "worship songs members read"
on public.worship_songs
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'member'::public.network_role))
);

alter policy "worship songs leaders write"
on public.worship_songs
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
)
with check (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
);

alter policy "worship themes members read"
on public.worship_themes
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'member'::public.network_role))
);

alter policy "worship themes leaders write"
on public.worship_themes
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
)
with check (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
);

alter policy "worship unavailability own insert"
on public.worship_member_unavailability
to authenticated
with check (
  exists (
    select 1 from public.network_memberships nm
    where nm.id=worship_member_unavailability.membership_id
      and nm.user_id=(select auth.uid())
      and nm.status='active'::public.membership_status
  )
);

alter policy "worship unavailability own update"
on public.worship_member_unavailability
to authenticated
using (
  exists (
    select 1 from public.network_memberships nm
    where nm.id=worship_member_unavailability.membership_id
      and nm.user_id=(select auth.uid())
      and nm.status='active'::public.membership_status
  )
)
with check (
  exists (
    select 1 from public.network_memberships nm
    where nm.id=worship_member_unavailability.membership_id
      and nm.user_id=(select auth.uid())
      and nm.status='active'::public.membership_status
  )
);

alter policy "worship unavailability own delete"
on public.worship_member_unavailability
to authenticated
using (
  exists (
    select 1 from public.network_memberships nm
    where nm.id=worship_member_unavailability.membership_id
      and nm.user_id=(select auth.uid())
      and nm.status='active'::public.membership_status
  )
);

alter policy "worship unavailability read relevant"
on public.worship_member_unavailability
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
  or exists (
    select 1 from public.network_memberships nm
    where nm.id=worship_member_unavailability.membership_id
      and nm.user_id=(select auth.uid())
      and nm.status='active'::public.membership_status
  )
);
