
drop function if exists public.admin_user_directory();

create function public.admin_user_directory()
returns table(
  user_id uuid,
  email text,
  display_name text,
  phone text,
  global_role public.global_role,
  email_verified_at timestamptz,
  created_at timestamptz
)
language sql stable security definer set search_path=public
as $$
  select u.id,u.email,p.display_name,p.phone,p.global_role,p.email_verified_at,u.created_at
  from auth.users u
  join public.profiles p on p.id=u.id
  where public.is_admin(auth.uid())
  order by u.created_at desc;
$$;

revoke execute on function public.admin_user_directory() from public,anon;
grant execute on function public.admin_user_directory() to authenticated;

create or replace function public.set_email_verification_by_email(
  p_email text,
  p_verified boolean
)
returns public.profiles
language plpgsql security definer set search_path=public
as $$
declare
  v_actor uuid:=auth.uid();
  v_target uuid;
  v_row public.profiles;
begin
  if not public.is_admin(v_actor) then
    raise exception 'forbidden';
  end if;

  select id into v_target
  from auth.users
  where lower(email)=lower(trim(p_email));

  if v_target is null then
    raise exception 'user not found';
  end if;

  update public.profiles
  set email_verified_at=case when p_verified then now() else null end,
      updated_at=now()
  where id=v_target
  returning * into v_row;

  return v_row;
end;
$$;

revoke execute on function public.set_email_verification_by_email(text,boolean) from public,anon;
grant execute on function public.set_email_verification_by_email(text,boolean) to authenticated;
