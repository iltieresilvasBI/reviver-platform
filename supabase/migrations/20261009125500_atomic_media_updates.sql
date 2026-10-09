create or replace function public.set_content_cover_atomic(
  p_content_id uuid,
  p_media_id uuid
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user uuid:=auth.uid();
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if not (
    public.is_admin(v_user)
    or public.has_app_role(v_user,'media_editor')
    or public.has_app_role(v_user,'media_leader')
  ) then raise exception 'forbidden'; end if;

  if not exists(
    select 1 from public.content_media
    where id=p_media_id and content_item_id=p_content_id
  ) then raise exception 'media not found'; end if;

  update public.content_media
  set media_type='image'
  where content_item_id=p_content_id and media_type='cover' and id<>p_media_id;

  update public.content_media
  set media_type='cover'
  where id=p_media_id and content_item_id=p_content_id;
end;
$$;

create or replace function public.set_content_network_atomic(
  p_content_id uuid,
  p_network_slug text
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user uuid:=auth.uid();
  v_network_id uuid;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if not (
    public.is_admin(v_user)
    or public.has_app_role(v_user,'media_editor')
    or public.has_app_role(v_user,'media_leader')
  ) then raise exception 'forbidden'; end if;

  if not exists(select 1 from public.content_items where id=p_content_id) then
    raise exception 'content not found';
  end if;

  if nullif(btrim(coalesce(p_network_slug,'')),'') is not null then
    select id into v_network_id
    from public.networks
    where slug=btrim(p_network_slug) and active=true
    limit 1;
    if v_network_id is null then raise exception 'network not found'; end if;
  end if;

  delete from public.content_item_networks where content_item_id=p_content_id;

  if v_network_id is not null then
    insert into public.content_item_networks(content_item_id,network_id)
    values(p_content_id,v_network_id);
  end if;
end;
$$;

revoke execute on function public.set_content_cover_atomic(uuid,uuid) from public,anon;
grant execute on function public.set_content_cover_atomic(uuid,uuid) to authenticated;

revoke execute on function public.set_content_network_atomic(uuid,text) from public,anon;
grant execute on function public.set_content_network_atomic(uuid,text) to authenticated;
