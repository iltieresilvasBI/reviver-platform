create or replace function public.create_worship_member_by_email(
  p_email text,
  p_role public.network_role default 'member'
)
returns public.network_memberships
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid:=auth.uid();
  v_target uuid;
  v_network uuid;
  v_row public.network_memberships;
begin
  if not (public.is_admin(v_actor) or public.has_network_role(v_actor,'worship','leader')) then
    raise exception 'forbidden';
  end if;
  if p_role='leader' and not public.is_admin(v_actor) then
    raise exception 'only admin can create leaders';
  end if;

  select id into v_target from auth.users where lower(email)=lower(trim(p_email)) limit 1;
  if v_target is null then raise exception 'account not found'; end if;

  select id into v_network from public.networks where slug='worship' and active=true limit 1;
  if v_network is null then raise exception 'worship ministry not found'; end if;

  insert into public.network_memberships(
    user_id,network_id,role,status,approved_at,approved_by,revoked_at,updated_at
  )
  values(v_target,v_network,p_role,'active',now(),v_actor,null,now())
  on conflict(user_id,network_id) do update set
    role=excluded.role,
    status='active'::public.membership_status,
    approved_at=coalesce(public.network_memberships.approved_at,now()),
    approved_by=v_actor,
    revoked_at=null,
    updated_at=now()
  returning * into v_row;

  insert into public.worship_member_profiles(membership_id,active,updated_at)
  values(v_row.id,true,now())
  on conflict(membership_id) do update set active=true,updated_at=now();

  return v_row;
end;
$$;

revoke execute on function public.create_worship_member_by_email(text,public.network_role) from public,anon;
grant execute on function public.create_worship_member_by_email(text,public.network_role) to authenticated;
