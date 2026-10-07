create or replace function public.admin_set_network_membership_by_email(
  p_email text,
  p_network_slug text,
  p_role public.network_role,
  p_status public.membership_status
) returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_network_id uuid;
begin
  if auth.uid() is null or not public.is_admin(auth.uid()) then raise exception 'admin required'; end if;
  select id into v_user_id from auth.users where lower(email)=lower(trim(p_email)) limit 1;
  if v_user_id is null then raise exception 'account not found'; end if;
  select id into v_network_id from public.networks where slug=p_network_slug limit 1;
  if v_network_id is null then raise exception 'ministry not found'; end if;

  insert into public.network_memberships(user_id,network_id,role,status,approved_at,approved_by,revoked_at,updated_at)
  values(
    v_user_id,v_network_id,p_role,p_status,
    case when p_status='active' then now() else null end,
    case when p_status='active' then auth.uid() else null end,
    case when p_status='revoked' then now() else null end,
    now()
  )
  on conflict (user_id,network_id) do update set
    role=excluded.role,status=excluded.status,
    approved_at=case when excluded.status='active' then now() else network_memberships.approved_at end,
    approved_by=case when excluded.status='active' then auth.uid() else network_memberships.approved_by end,
    revoked_at=case when excluded.status='revoked' then now() else null end,
    updated_at=now();
end;
$$;
revoke all on function public.admin_set_network_membership_by_email(text,text,public.network_role,public.membership_status) from public;
grant execute on function public.admin_set_network_membership_by_email(text,text,public.network_role,public.membership_status) to authenticated;