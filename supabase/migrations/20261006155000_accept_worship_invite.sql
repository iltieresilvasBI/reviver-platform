
create or replace function public.accept_worship_invite()
returns public.network_memberships
language plpgsql security definer set search_path=public
as $$
declare
  v_user uuid:=auth.uid(); v_verified timestamptz; v_network uuid; v_row public.network_memberships;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  select email_confirmed_at into v_verified from auth.users where id=v_user;
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
