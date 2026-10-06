
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path=public
as $$
declare
  v_role public.global_role := 'user';
begin
  if not exists(select 1 from public.profiles where global_role='admin') then
    v_role := 'admin';
  end if;
  insert into public.profiles(id,display_name,avatar_url,global_role)
  values(
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name',split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url',
    v_role
  )
  on conflict(id) do nothing;
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public,anon,authenticated;

create or replace function public.admin_user_directory()
returns table(
  user_id uuid,
  email text,
  display_name text,
  phone text,
  global_role public.global_role,
  created_at timestamptz
)
language sql stable security definer set search_path=public
as $$
  select u.id,u.email,p.display_name,p.phone,p.global_role,u.created_at
  from auth.users u join public.profiles p on p.id=u.id
  where public.is_admin(auth.uid())
  order by u.created_at desc;
$$;
revoke execute on function public.admin_user_directory() from public,anon;
grant execute on function public.admin_user_directory() to authenticated;
