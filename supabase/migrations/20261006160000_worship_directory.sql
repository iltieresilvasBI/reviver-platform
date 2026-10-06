
create policy "profiles worship leaders read members" on public.profiles for select
using (
  public.has_network_role(auth.uid(),'worship','leader')
  and exists (
    select 1 from public.network_memberships nm
    join public.networks n on n.id=nm.network_id
    where nm.user_id=profiles.id and n.slug='worship'
  )
);

create or replace function public.worship_member_directory()
returns table(
  user_id uuid,
  email text,
  display_name text,
  phone text,
  membership_id uuid,
  role public.network_role,
  status public.membership_status,
  requested_at timestamptz,
  approved_at timestamptz
)
language sql stable security definer set search_path=public
as $$
  select u.id,u.email,p.display_name,p.phone,nm.id,nm.role,nm.status,nm.requested_at,nm.approved_at
  from public.network_memberships nm
  join public.networks n on n.id=nm.network_id and n.slug='worship'
  join auth.users u on u.id=nm.user_id
  left join public.profiles p on p.id=u.id
  where public.is_admin(auth.uid()) or public.has_network_role(auth.uid(),'worship','leader')
  order by nm.created_at desc;
$$;
revoke execute on function public.worship_member_directory() from public,anon;
grant execute on function public.worship_member_directory() to authenticated;
