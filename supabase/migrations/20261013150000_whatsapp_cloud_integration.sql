create table if not exists public.worship_whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  kind text not null check(kind in ('schedule_published','schedule_reminder','substitution_request')),
  status text not null default 'queued' check(status in ('queued','sending','sent','delivered','read','failed','skipped')),
  recipient_membership_id uuid references public.network_memberships(id) on delete set null,
  schedule_id uuid references public.worship_schedules(id) on delete cascade,
  assignment_id uuid references public.worship_schedule_members(id) on delete cascade,
  substitution_request_id uuid references public.worship_substitution_requests(id) on delete cascade,
  substitution_offer_id uuid references public.worship_substitution_offers(id) on delete cascade,
  phone_e164 text not null,
  recipient_name text,
  template_name text not null,
  template_language text not null default 'pt_PT',
  template_components jsonb not null default '[]'::jsonb,
  dedupe_key text not null unique,
  meta_message_id text unique,
  attempts integer not null default 0 check(attempts between 0 and 20),
  error_code text,
  error_message text,
  queued_at timestamptz not null default now(),
  last_attempt_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(phone_e164 ~ '^[0-9]{8,15}$')
);

create table if not exists public.worship_whatsapp_events (
  id uuid primary key default gen_random_uuid(),
  event_hash text not null unique,
  event_type text not null check(event_type in ('status','message','verification','unknown')),
  meta_message_id text,
  context_message_id text,
  sender_phone text,
  action text,
  processing_status text not null default 'received' check(processing_status in ('received','processed','ignored','failed')),
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists worship_whatsapp_messages_status_idx
  on public.worship_whatsapp_messages(status,queued_at);
create index if not exists worship_whatsapp_messages_schedule_idx
  on public.worship_whatsapp_messages(schedule_id,created_at desc);
create index if not exists worship_whatsapp_messages_recipient_idx
  on public.worship_whatsapp_messages(recipient_membership_id,created_at desc);
create index if not exists worship_whatsapp_messages_offer_idx
  on public.worship_whatsapp_messages(substitution_offer_id);
create index if not exists worship_whatsapp_events_context_idx
  on public.worship_whatsapp_events(context_message_id,received_at desc);

alter table public.worship_whatsapp_messages enable row level security;
alter table public.worship_whatsapp_events enable row level security;

revoke all on public.worship_whatsapp_messages from anon,authenticated;
revoke all on public.worship_whatsapp_events from anon,authenticated;
grant select on public.worship_whatsapp_messages to authenticated;
grant select on public.worship_whatsapp_events to authenticated;
grant all on public.worship_whatsapp_messages to service_role;
grant all on public.worship_whatsapp_events to service_role;

create policy "whatsapp leaders read messages"
on public.worship_whatsapp_messages
for select
to authenticated
using (
  (select public.is_admin())
  or (select public.has_network_role((select auth.uid()),'worship','leader'))
);

create policy "whatsapp leaders read events"
on public.worship_whatsapp_events
for select
to authenticated
using (
  (select public.is_admin())
  or (select public.has_network_role((select auth.uid()),'worship','leader'))
);

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
  v_member_phone text;
begin
  if p_response not in ('confirmed','declined') then
    raise exception 'invalid response';
  end if;

  select regexp_replace(coalesce(p.phone,''),'\D','','g')
    into v_member_phone
  from public.worship_schedule_members wsm
  join public.network_memberships nm on nm.id=wsm.membership_id
  join public.profiles p on p.id=nm.user_id
  where wsm.id=p_assignment_id
    and nm.status='active'
  limit 1;

  if v_member_phone is null or v_member_phone='' then
    raise exception 'member phone unavailable';
  end if;

  if v_member_phone<>regexp_replace(coalesce(p_sender_phone,''),'\D','','g') then
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
  v_member_phone text;
begin
  if p_decision not in ('accept','decline') then
    raise exception 'invalid decision';
  end if;

  select o.*,nm.user_id,regexp_replace(coalesce(p.phone,''),'\D','','g')
    into v_offer,v_user_id,v_member_phone
  from public.worship_substitution_offers o
  join public.network_memberships nm on nm.id=o.proposed_membership_id
  join public.profiles p on p.id=nm.user_id
  where o.id=p_offer_id
  for update of o;

  if v_offer.id is null then raise exception 'offer not found'; end if;
  if v_offer.status<>'pending' then raise exception 'offer is no longer pending'; end if;
  if v_member_phone is null or v_member_phone='' then raise exception 'member phone unavailable'; end if;
  if v_member_phone<>regexp_replace(coalesce(p_sender_phone,''),'\D','','g') then
    raise exception 'sender phone mismatch';
  end if;

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
