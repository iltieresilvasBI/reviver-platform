create or replace function public.respond_worship_assignment_system(
  p_assignment_id uuid,
  p_response text,
  p_sender_phone text
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_target_membership uuid;
  v_sender_membership uuid;
  v_sender_count integer;
  v_normalized_phone text:=regexp_replace(coalesce(p_sender_phone,''),'\D','','g');
begin
  if p_response not in ('confirmed','declined') then
    raise exception 'invalid response';
  end if;
  if v_normalized_phone='' then
    raise exception 'sender phone unavailable';
  end if;

  select wsm.membership_id
    into v_target_membership
  from public.worship_schedule_members wsm
  join public.network_memberships nm on nm.id=wsm.membership_id
  where wsm.id=p_assignment_id and nm.status='active'
  limit 1;

  if v_target_membership is null then raise exception 'assignment member unavailable'; end if;

  select count(*),min(nm.id::text)::uuid
    into v_sender_count,v_sender_membership
  from public.network_memberships nm
  join public.networks n on n.id=nm.network_id and n.slug='worship'
  join public.profiles p on p.id=nm.user_id
  where nm.status='active'
    and regexp_replace(coalesce(p.phone,''),'\D','','g')=v_normalized_phone;

  if v_sender_count<>1 then
    raise exception 'sender phone must identify exactly one active worship member';
  end if;
  if v_sender_membership<>v_target_membership then
    raise exception 'sender phone mismatch';
  end if;

  insert into public.worship_assignment_responses(
    assignment_id,response_status,note,responded_at
  )
  values(
    p_assignment_id,p_response,'Resposta recebida pelo WhatsApp Business',now()
  )
  on conflict(assignment_id) do update set
    response_status=excluded.response_status,
    note=excluded.note,
    responded_at=excluded.responded_at;
end;
$$;

create or replace function public.resolve_worship_substitution_offer_system(
  p_offer_id uuid,
  p_decision text,
  p_sender_phone text
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_offer public.worship_substitution_offers;
  v_request public.worship_substitution_requests;
  v_assignment public.worship_schedule_members;
  v_schedule public.worship_schedules;
  v_old_membership uuid;
  v_user_id uuid;
  v_sender_membership uuid;
  v_sender_count integer;
  v_normalized_phone text:=regexp_replace(coalesce(p_sender_phone,''),'\D','','g');
begin
  if p_decision not in ('accept','decline') then
    raise exception 'invalid decision';
  end if;
  if v_normalized_phone='' then
    raise exception 'sender phone unavailable';
  end if;

  select * into v_offer
  from public.worship_substitution_offers
  where id=p_offer_id
  for update;

  if v_offer.id is null then raise exception 'offer not found'; end if;
  if v_offer.status<>'pending' then raise exception 'offer is no longer pending'; end if;

  select count(*),min(nm.id::text)::uuid
    into v_sender_count,v_sender_membership
  from public.network_memberships nm
  join public.networks n on n.id=nm.network_id and n.slug='worship'
  join public.profiles p on p.id=nm.user_id
  where nm.status='active'
    and regexp_replace(coalesce(p.phone,''),'\D','','g')=v_normalized_phone;

  if v_sender_count<>1 then
    raise exception 'sender phone must identify exactly one active worship member';
  end if;
  if v_sender_membership<>v_offer.proposed_membership_id then
    raise exception 'sender phone mismatch';
  end if;

  select nm.user_id into v_user_id
  from public.network_memberships nm
  where nm.id=v_offer.proposed_membership_id;

  if p_decision='decline' then
    update public.worship_substitution_offers
      set status='declined',responded_at=now()
    where id=p_offer_id and status='pending';

    insert into public.worship_substitution_events(
      request_id,event_type,actor_membership_id,to_membership_id,details
    )
    values(
      v_offer.request_id,'backup_declined',v_offer.proposed_membership_id,
      v_offer.proposed_membership_id,jsonb_build_object('channel','whatsapp')
    );
    return null;
  end if;

  select * into v_request
  from public.worship_substitution_requests
  where id=v_offer.request_id
  for update;
  if v_request.id is null or v_request.status<>'requested' then
    raise exception 'substitution request is no longer open';
  end if;

  select * into v_assignment
  from public.worship_schedule_members
  where id=v_request.assignment_id
  for update;
  if v_assignment.id is null then raise exception 'assignment not found'; end if;

  select * into v_schedule
  from public.worship_schedules
  where id=v_assignment.schedule_id;
  if v_schedule.id is null or v_schedule.status='cancelled' then
    raise exception 'schedule unavailable';
  end if;

  if exists(
    select 1 from public.worship_schedule_members
    where schedule_id=v_assignment.schedule_id
      and membership_id=v_offer.proposed_membership_id
      and id<>v_assignment.id
  ) then raise exception 'member already assigned to this schedule'; end if;

  if exists(
    select 1 from public.worship_member_unavailability u
    where u.membership_id=v_offer.proposed_membership_id
      and u.starts_on<=((v_schedule.starts_at at time zone 'Europe/Lisbon')::date)
      and u.ends_on>=((v_schedule.starts_at at time zone 'Europe/Lisbon')::date)
  ) then raise exception 'member unavailable on schedule date'; end if;

  v_old_membership:=v_assignment.membership_id;

  update public.worship_schedule_members
    set membership_id=v_offer.proposed_membership_id,
        attendance_status='assigned'
  where id=v_assignment.id;

  delete from public.worship_assignment_responses
  where assignment_id=v_assignment.id;

  update public.worship_substitution_offers
    set status=case when id=p_offer_id then 'accepted' else 'expired' end,
        responded_at=case when id=p_offer_id then now() else responded_at end
  where request_id=v_request.id and status='pending';

  update public.worship_substitution_requests
    set status='approved',
        proposed_membership_id=v_offer.proposed_membership_id,
        accepted_at=now(),
        decided_at=now(),
        decided_by=v_user_id,
        leader_note='Substituição automática confirmada pelo WhatsApp Business',
        updated_at=now()
  where id=v_request.id;

  insert into public.worship_substitution_events(
    request_id,event_type,actor_membership_id,from_membership_id,to_membership_id,details
  )
  values(
    v_request.id,'auto_replaced',v_offer.proposed_membership_id,
    v_old_membership,v_offer.proposed_membership_id,
    jsonb_build_object('role',v_assignment.role,'schedule_id',v_assignment.schedule_id,'channel','whatsapp')
  );

  return v_assignment.id;
end;
$$;

revoke execute on function public.respond_worship_assignment_system(uuid,text,text) from public,anon,authenticated;
grant execute on function public.respond_worship_assignment_system(uuid,text,text) to service_role;
revoke execute on function public.resolve_worship_substitution_offer_system(uuid,text,text) from public,anon,authenticated;
grant execute on function public.resolve_worship_substitution_offer_system(uuid,text,text) to service_role;
