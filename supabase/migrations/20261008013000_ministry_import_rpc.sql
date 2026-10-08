create or replace function public.upsert_ministry_person(
  p_network_slug text,
  p_mode text,
  p_overwrite_empty boolean,
  p_full_name text,
  p_preferred_name text default null,
  p_email text default null,
  p_phone text default null,
  p_birth_date date default null,
  p_group_code text default null,
  p_roles text[] default '{}',
  p_instruments text[] default '{}',
  p_vocal_classification text default null,
  p_active boolean default null,
  p_joined_on date default null,
  p_admin_notes text default null,
  p_communication_opt_in boolean default null,
  p_communication_preference text default null
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_network_id uuid;
  v_person_id uuid;
  v_email text;
  v_phone text;
  v_action text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_mode not in ('create','update','upsert') then raise exception 'invalid import mode'; end if;
  if nullif(trim(p_full_name),'') is null then raise exception 'full name is required'; end if;
  if p_group_code is not null and p_group_code not in ('A','B','C','D') then raise exception 'invalid group'; end if;

  select id into v_network_id from public.networks where slug=p_network_slug and active=true;
  if v_network_id is null then raise exception 'ministry not found'; end if;
  if not public.is_admin(auth.uid()) and not public.has_network_role(auth.uid(),p_network_slug,'leader') then
    raise exception 'leader access required';
  end if;

  v_email=nullif(lower(trim(p_email)),'');
  v_phone=nullif(regexp_replace(trim(coalesce(p_phone,'')),'[^0-9+]','','g'),'');
  if v_phone like '00%' then v_phone='+'||substr(v_phone,3); end if;
  if v_email is not null and v_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then raise exception 'invalid email'; end if;
  if v_phone is not null and v_phone !~ '^\+[1-9][0-9]{7,14}$' then raise exception 'phone must use international format'; end if;

  select mp.id into v_person_id
  from public.ministry_people mp
  join public.ministry_person_assignments ma on ma.person_id=mp.id and ma.network_id=v_network_id
  where (v_email is not null and mp.email_normalized=v_email)
     or (v_phone is not null and mp.phone_normalized=v_phone)
  limit 1;

  if p_mode='create' and v_person_id is not null then raise exception 'duplicate member'; end if;
  if p_mode='update' and v_person_id is null then raise exception 'member not found for update'; end if;

  if v_person_id is null then
    insert into public.ministry_people(
      full_name,preferred_name,email,email_normalized,phone,phone_normalized,birth_date,active,joined_on,
      communication_opt_in,communication_preference,created_by
    ) values (
      trim(p_full_name),nullif(trim(p_preferred_name),''),nullif(trim(p_email),''),v_email,nullif(trim(p_phone),''),v_phone,p_birth_date,
      coalesce(p_active,true),p_joined_on,coalesce(p_communication_opt_in,false),nullif(trim(p_communication_preference),''),auth.uid()
    ) returning id into v_person_id;
    v_action='created';
  else
    update public.ministry_people set
      full_name=trim(p_full_name),
      preferred_name=case when p_overwrite_empty or nullif(trim(p_preferred_name),'') is not null then nullif(trim(p_preferred_name),'') else preferred_name end,
      email=case when p_overwrite_empty or v_email is not null then nullif(trim(p_email),'') else email end,
      email_normalized=case when p_overwrite_empty or v_email is not null then v_email else email_normalized end,
      phone=case when p_overwrite_empty or v_phone is not null then nullif(trim(p_phone),'') else phone end,
      phone_normalized=case when p_overwrite_empty or v_phone is not null then v_phone else phone_normalized end,
      birth_date=case when p_overwrite_empty or p_birth_date is not null then p_birth_date else birth_date end,
      active=coalesce(p_active,active),
      joined_on=case when p_overwrite_empty or p_joined_on is not null then p_joined_on else joined_on end,
      communication_opt_in=coalesce(p_communication_opt_in,communication_opt_in),
      communication_preference=case when p_overwrite_empty or nullif(trim(p_communication_preference),'') is not null then nullif(trim(p_communication_preference),'') else communication_preference end,
      updated_at=now()
    where id=v_person_id;
    v_action='updated';
  end if;

  insert into public.ministry_person_assignments(person_id,network_id,group_code,roles,instruments,vocal_classification,active,joined_on,admin_notes)
  values (
    v_person_id,v_network_id,nullif(trim(p_group_code),''),coalesce(p_roles,'{}'),coalesce(p_instruments,'{}'),
    nullif(trim(p_vocal_classification),''),coalesce(p_active,true),p_joined_on,nullif(trim(p_admin_notes),'')
  )
  on conflict (person_id,network_id) do update set
    group_code=case when p_overwrite_empty or excluded.group_code is not null then excluded.group_code else ministry_person_assignments.group_code end,
    roles=case when p_overwrite_empty or cardinality(excluded.roles)>0 then excluded.roles else ministry_person_assignments.roles end,
    instruments=case when p_overwrite_empty or cardinality(excluded.instruments)>0 then excluded.instruments else ministry_person_assignments.instruments end,
    vocal_classification=case when p_overwrite_empty or excluded.vocal_classification is not null then excluded.vocal_classification else ministry_person_assignments.vocal_classification end,
    active=coalesce(p_active,ministry_person_assignments.active),
    joined_on=case when p_overwrite_empty or excluded.joined_on is not null then excluded.joined_on else ministry_person_assignments.joined_on end,
    admin_notes=case when p_overwrite_empty or excluded.admin_notes is not null then excluded.admin_notes else ministry_person_assignments.admin_notes end,
    updated_at=now();

  return jsonb_build_object('person_id',v_person_id,'action',v_action);
end;
$$;

revoke all on function public.upsert_ministry_person(text,text,boolean,text,text,text,text,date,text,text[],text[],text,boolean,date,text,boolean,text) from public;
grant execute on function public.upsert_ministry_person(text,text,boolean,text,text,text,text,date,text,text[],text[],text,boolean,date,text,boolean,text) to authenticated;