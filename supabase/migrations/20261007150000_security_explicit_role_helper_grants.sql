revoke execute on function public.is_admin(uuid) from public;
revoke execute on function public.has_app_role(uuid, public.app_role) from public;
revoke execute on function public.has_network_role(uuid, text, public.network_role) from public;

grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.has_app_role(uuid, public.app_role) to authenticated;
grant execute on function public.has_network_role(uuid, text, public.network_role) to authenticated;
