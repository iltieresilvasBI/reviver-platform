alter table public.profiles
  add column if not exists email_verified_at timestamptz;

create or replace function public.auto_activate_public_account()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.email is not null and new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;
  return new;
end;
$$;

revoke execute on function public.auto_activate_public_account() from public, anon, authenticated;

drop trigger if exists reviver_auto_activate_public_account on auth.users;
create trigger reviver_auto_activate_public_account
before insert on auth.users
for each row execute function public.auto_activate_public_account();

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

  select email_verified_at into v_verified
  from public.profiles
  where id=v_user;

  if v_verified is null then raise exception 'verified email required'; end if;

  select id into v_network from public.networks where slug='worship' and active=true;
  if v_network is null then raise exception 'network unavailable'; end if;

  select * into v_row
  from public.network_memberships
  where user_id=v_user and network_id=v_network
  for update;

  if found then
    if v_row.status in ('active','pending','invited') then return v_row; end if;

    update public.network_memberships
      set status='pending',role='member',requested_at=now(),revoked_at=null,
          approved_at=null,approved_by=null,updated_at=now()
      where id=v_row.id
      returning * into v_row;

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

create or replace function public.accept_worship_invite()
returns public.network_memberships
language plpgsql security definer set search_path=public
as $$
declare
  v_user uuid:=auth.uid();
  v_verified timestamptz;
  v_network uuid;
  v_row public.network_memberships;
begin
  if v_user is null then raise exception 'authentication required'; end if;

  select email_verified_at into v_verified
  from public.profiles
  where id=v_user;

  if v_verified is null then raise exception 'verified email required'; end if;

  select id into v_network from public.networks where slug='worship';

  update public.network_memberships
    set status='active',approved_at=now(),approved_by=null,updated_at=now()
    where user_id=v_user and network_id=v_network and status='invited'
    returning * into v_row;

  if not found then raise exception 'no invitation found'; end if;

  return v_row;
end;
$$;

revoke execute on function public.accept_worship_invite() from public,anon;
grant execute on function public.accept_worship_invite() to authenticated;
