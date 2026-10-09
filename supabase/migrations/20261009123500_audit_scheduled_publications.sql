create or replace function public.publish_due_content()
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  v_count integer;
begin
  with due as (
    update public.content_items
    set status='published',
        published_by=coalesce(published_by,scheduled_by),
        published_at=coalesce(published_at,now()),
        updated_at=now()
    where status='scheduled'
      and scheduled_for is not null
      and scheduled_for <= now()
    returning id,scheduled_by
  ),
  audit as (
    insert into public.content_audit_log(
      content_item_id,actor_user_id,action,from_status,to_status,note
    )
    select
      id,
      scheduled_by,
      'auto_publish',
      'scheduled'::public.content_status,
      'published'::public.content_status,
      'Publicação automática no horário agendado'
    from due
    returning content_item_id
  )
  select count(*) into v_count from audit;

  return v_count;
end;
$$;
