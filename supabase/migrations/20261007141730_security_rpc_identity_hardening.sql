create or replace function public.is_admin(target uuid default auth.uid())
returns boolean
language sql stable security definer set search_path=public
as $$
  select target is not null
     and target = auth.uid()
     and exists(
       select 1 from public.profiles
       where id=target and global_role='admin'
     );
$$;

create or replace function public.has_app_role(target uuid, wanted public.app_role)
returns boolean
language sql stable security definer set search_path=public
as $$
  select target is not null
     and target = auth.uid()
     and exists(
       select 1 from public.user_app_roles
       where user_id=target and role=wanted and revoked_at is null
     );
$$;

create or replace function public.has_network_role(target uuid, network_slug text, wanted public.network_role)
returns boolean
language sql stable security definer set search_path=public
as $$
  select target is not null
     and target = auth.uid()
     and exists(
       select 1
       from public.network_memberships nm
       join public.networks n on n.id=nm.network_id
       where nm.user_id=target
         and n.slug=network_slug
         and nm.status='active'
         and (nm.role=wanted or (wanted='member' and nm.role='leader'))
     );
$$;

revoke execute on function public.get_quiz_options(uuid) from anon;
grant execute on function public.get_quiz_options(uuid) to authenticated;
