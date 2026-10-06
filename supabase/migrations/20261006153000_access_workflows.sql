
create or replace function public.request_worship_access()
returns public.network_memberships
language plpgsql security definer set search_path=public
as $$
declare
  v_user uuid:=auth.uid();
  v_network uuid;
  v_verified timestamptz;
  v_row public.network_memberships;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  select email_confirmed_at into v_verified from auth.users where id=v_user;
  if v_verified is null then raise exception 'verified email required'; end if;
  select id into v_network from public.networks where slug='worship' and active=true;
  if v_network is null then raise exception 'network unavailable'; end if;

  select * into v_row from public.network_memberships where user_id=v_user and network_id=v_network for update;
  if found then
    if v_row.status in ('active','pending','invited') then return v_row; end if;
    update public.network_memberships
      set status='pending',role='member',requested_at=now(),revoked_at=null,approved_at=null,approved_by=null,updated_at=now()
      where id=v_row.id returning * into v_row;
    return v_row;
  end if;

  insert into public.network_memberships(user_id,network_id,role,status,requested_at)
  values(v_user,v_network,'member','pending',now())
  returning * into v_row;
  return v_row;
end;
$$;
revoke execute on function public.request_worship_access() from public,anon;
grant execute on function public.request_worship_access() to authenticated;

create or replace function public.decide_worship_membership(p_membership_id uuid,p_decision text)
returns public.network_memberships
language plpgsql security definer set search_path=public
as $$
declare
  v_user uuid:=auth.uid();
  v_row public.network_memberships;
begin
  if not (public.is_admin(v_user) or public.has_network_role(v_user,'worship','leader')) then raise exception 'forbidden'; end if;
  select * into v_row from public.network_memberships where id=p_membership_id for update;
  if not found then raise exception 'membership not found'; end if;
  if p_decision='approve' then
    update public.network_memberships set status='active',approved_at=now(),approved_by=v_user,revoked_at=null,updated_at=now()
    where id=p_membership_id returning * into v_row;
  elsif p_decision='reject' then
    update public.network_memberships set status='rejected',updated_at=now() where id=p_membership_id returning * into v_row;
  elsif p_decision='revoke' then
    update public.network_memberships set status='revoked',revoked_at=now(),updated_at=now() where id=p_membership_id returning * into v_row;
  else raise exception 'invalid decision'; end if;
  return v_row;
end;
$$;
revoke execute on function public.decide_worship_membership(uuid,text) from public,anon;
grant execute on function public.decide_worship_membership(uuid,text) to authenticated;

create or replace function public.invite_worship_by_email(p_email text,p_role public.network_role default 'member')
returns public.network_memberships
language plpgsql security definer set search_path=public
as $$
declare
  v_actor uuid:=auth.uid(); v_target uuid; v_network uuid; v_row public.network_memberships;
begin
  if not (public.is_admin(v_actor) or public.has_network_role(v_actor,'worship','leader')) then raise exception 'forbidden'; end if;
  if p_role='leader' and not public.is_admin(v_actor) then raise exception 'only admin can invite leaders'; end if;
  select id into v_target from auth.users where lower(email)=lower(trim(p_email));
  if v_target is null then raise exception 'user not found'; end if;
  select id into v_network from public.networks where slug='worship';
  insert into public.network_memberships(user_id,network_id,role,status,invited_at)
  values(v_target,v_network,p_role,'invited',now())
  on conflict(user_id,network_id) do update set
    role=case when public.network_memberships.status='active' then public.network_memberships.role else excluded.role end,
    status=case when public.network_memberships.status='active' then public.network_memberships.status else 'invited'::public.membership_status end,
    invited_at=case when public.network_memberships.status='active' then public.network_memberships.invited_at else now() end,
    updated_at=now()
  returning * into v_row;
  return v_row;
end;
$$;
revoke execute on function public.invite_worship_by_email(text,public.network_role) from public,anon;
grant execute on function public.invite_worship_by_email(text,public.network_role) to authenticated;

create or replace function public.grant_app_role_by_email(p_email text,p_role public.app_role)
returns public.user_app_roles
language plpgsql security definer set search_path=public
as $$
declare
  v_actor uuid:=auth.uid(); v_target uuid; v_row public.user_app_roles;
begin
  if p_role='media_leader' and not public.is_admin(v_actor) then raise exception 'only admin can grant media leader'; end if;
  if p_role='media_editor' and not (public.is_admin(v_actor) or public.has_app_role(v_actor,'media_leader')) then raise exception 'forbidden'; end if;
  select id into v_target from auth.users where lower(email)=lower(trim(p_email));
  if v_target is null then raise exception 'user not found'; end if;
  insert into public.user_app_roles(user_id,role,granted_by,granted_at,revoked_at)
  values(v_target,p_role,v_actor,now(),null)
  on conflict(user_id,role) do update set granted_by=v_actor,granted_at=now(),revoked_at=null
  returning * into v_row;
  return v_row;
end;
$$;
revoke execute on function public.grant_app_role_by_email(text,public.app_role) from public,anon;
grant execute on function public.grant_app_role_by_email(text,public.app_role) to authenticated;
