
create or replace function public.set_global_role_by_email(p_email text,p_role public.global_role)
returns public.profiles
language plpgsql security definer set search_path=public
as $$
declare
  v_actor uuid:=auth.uid(); v_target uuid; v_row public.profiles;
begin
  if not public.is_admin(v_actor) then raise exception 'forbidden'; end if;
  select id into v_target from auth.users where lower(email)=lower(trim(p_email));
  if v_target is null then raise exception 'user not found'; end if;
  if v_target=v_actor and p_role='user' and (select count(*) from public.profiles where global_role='admin')=1 then
    raise exception 'cannot remove the last admin';
  end if;
  update public.profiles set global_role=p_role,updated_at=now() where id=v_target returning * into v_row;
  return v_row;
end;
$$;
revoke execute on function public.set_global_role_by_email(text,public.global_role) from public,anon;
grant execute on function public.set_global_role_by_email(text,public.global_role) to authenticated;
