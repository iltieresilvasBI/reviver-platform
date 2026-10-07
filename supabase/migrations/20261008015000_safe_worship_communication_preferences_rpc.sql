create or replace function public.set_my_worship_communication_preferences(
  p_opt_in boolean,
  p_preference text
) returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_membership_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select nm.id into v_membership_id
  from public.network_memberships nm
  join public.networks n on n.id=nm.network_id
  where n.slug='worship' and nm.user_id=auth.uid() and nm.status='active'
  limit 1;
  if v_membership_id is null then raise exception 'active worship membership required'; end if;

  insert into public.worship_member_profiles(membership_id,communication_opt_in,communication_preference,updated_at)
  values(v_membership_id,coalesce(p_opt_in,false),nullif(trim(p_preference),''),now())
  on conflict (membership_id) do update set
    communication_opt_in=excluded.communication_opt_in,
    communication_preference=excluded.communication_preference,
    updated_at=now();
end;
$$;

revoke all on function public.set_my_worship_communication_preferences(boolean,text) from public;
grant execute on function public.set_my_worship_communication_preferences(boolean,text) to authenticated;