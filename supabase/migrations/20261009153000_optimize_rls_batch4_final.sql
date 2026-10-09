-- Final RLS optimization batch for Worship operational modules.

alter policy "band templates members read"
on public.worship_band_templates
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'member'::public.network_role))
);

alter policy "band templates leaders write"
on public.worship_band_templates
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
)
with check (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
);

alter policy "band slots members read"
on public.worship_band_template_slots
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'member'::public.network_role))
);

alter policy "band slots leaders write"
on public.worship_band_template_slots
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
)
with check (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
);

alter policy "backup pool members read"
on public.worship_member_backup_pool
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'member'::public.network_role))
);

alter policy "backup pool leaders write"
on public.worship_member_backup_pool
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
)
with check (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
);

alter policy "worship run sheet members read"
on public.worship_run_sheet_items
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'member'::public.network_role))
);

alter policy "worship run sheet leaders write"
on public.worship_run_sheet_items
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
)
with check (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
);

alter policy "worship notes read"
on public.worship_schedule_notes
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
  or (
    visibility='team'
    and (select has_network_role((select auth.uid()),'worship'::text,'member'::public.network_role))
  )
);

alter policy "worship notes insert"
on public.worship_schedule_notes
to authenticated
with check (
  created_by=(select auth.uid())
  and (
    (select is_admin())
    or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
    or (
      note_type='comment'
      and visibility='team'
      and (select has_network_role((select auth.uid()),'worship'::text,'member'::public.network_role))
    )
  )
);

alter policy "worship notes update"
on public.worship_schedule_notes
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
  or (
    created_by=(select auth.uid())
    and note_type='comment'
    and visibility='team'
  )
)
with check (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
  or (
    created_by=(select auth.uid())
    and note_type='comment'
    and visibility='team'
  )
);

alter policy "worship notes delete"
on public.worship_schedule_notes
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
  or (
    created_by=(select auth.uid())
    and note_type='comment'
    and visibility='team'
  )
);

alter policy "worship substitutions participants read"
on public.worship_substitution_requests
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
  or requested_by_membership_id in (
    select id from public.network_memberships
    where user_id=(select auth.uid())
  )
  or proposed_membership_id in (
    select id from public.network_memberships
    where user_id=(select auth.uid())
  )
);

alter policy "worship substitutions requester insert"
on public.worship_substitution_requests
to authenticated
with check (
  requested_by_membership_id in (
    select id from public.network_memberships
    where user_id=(select auth.uid())
      and status='active'::public.membership_status
  )
  or (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
);

alter policy "worship substitutions participants update"
on public.worship_substitution_requests
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
  or proposed_membership_id in (
    select id from public.network_memberships
    where user_id=(select auth.uid())
      and status='active'::public.membership_status
  )
  or requested_by_membership_id in (
    select id from public.network_memberships
    where user_id=(select auth.uid())
      and status='active'::public.membership_status
  )
)
with check (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
  or proposed_membership_id in (
    select id from public.network_memberships
    where user_id=(select auth.uid())
      and status='active'::public.membership_status
  )
  or requested_by_membership_id in (
    select id from public.network_memberships
    where user_id=(select auth.uid())
      and status='active'::public.membership_status
  )
);

alter policy "substitution offers participants read"
on public.worship_substitution_offers
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
  or proposed_membership_id in (
    select id from public.network_memberships
    where user_id=(select auth.uid())
      and status='active'::public.membership_status
  )
);

alter policy "substitution offers proposed update"
on public.worship_substitution_offers
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
  or proposed_membership_id in (
    select id from public.network_memberships
    where user_id=(select auth.uid())
      and status='active'::public.membership_status
  )
)
with check (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
  or proposed_membership_id in (
    select id from public.network_memberships
    where user_id=(select auth.uid())
      and status='active'::public.membership_status
  )
);

alter policy "substitution offers system insert"
on public.worship_substitution_offers
to authenticated
with check (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
  or exists (
    select 1
    from public.worship_substitution_requests r
    where r.id=worship_substitution_offers.request_id
      and r.requested_by_membership_id in (
        select id from public.network_memberships
        where user_id=(select auth.uid())
          and status='active'::public.membership_status
      )
  )
);

alter policy "substitution events participants read"
on public.worship_substitution_events
to authenticated
using (
  (select is_admin())
  or (select has_network_role((select auth.uid()),'worship'::text,'leader'::public.network_role))
  or actor_membership_id in (
    select id from public.network_memberships where user_id=(select auth.uid())
  )
  or from_membership_id in (
    select id from public.network_memberships where user_id=(select auth.uid())
  )
  or to_membership_id in (
    select id from public.network_memberships where user_id=(select auth.uid())
  )
);
