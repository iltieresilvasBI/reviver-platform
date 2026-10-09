-- Public read RLS policies call these boolean helpers even for anonymous visitors.
-- Both helpers are self-scoped: with auth.uid() = null they return false and expose no data.
grant execute on function public.is_admin(uuid) to anon;
grant execute on function public.has_app_role(uuid,public.app_role) to anon;
