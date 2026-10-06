
insert into public.achievements(slug,title,description,icon)
values
('primeiros-passos','Primeiros passos','Concluir oficialmente a primeira aula da Academy.','◇'),
('xp-500','500 XP','Acumular 500 XP oficial na formação.','✦')
on conflict(slug) do update set title=excluded.title,description=excluded.description,icon=excluded.icon;

create or replace function public.award_xp_achievements()
returns trigger
language plpgsql security definer set search_path=public
as $$
declare
  v_first uuid; v_500 uuid; v_total integer;
begin
  select id into v_first from public.achievements where slug='primeiros-passos';
  insert into public.user_achievements(user_id,achievement_id)
  values(new.user_id,v_first) on conflict do nothing;

  select coalesce(sum(xp),0) into v_total from public.xp_events where user_id=new.user_id;
  if v_total >= 500 then
    select id into v_500 from public.achievements where slug='xp-500';
    insert into public.user_achievements(user_id,achievement_id)
    values(new.user_id,v_500) on conflict do nothing;
  end if;
  return new;
end;
$$;
revoke execute on function public.award_xp_achievements() from public,anon,authenticated;

drop trigger if exists on_xp_award_achievement on public.xp_events;
create trigger on_xp_award_achievement
after insert on public.xp_events
for each row execute function public.award_xp_achievements();

drop policy if exists "item categories public read" on public.content_item_categories;
create policy "item categories public read" on public.content_item_categories for select
using (
  exists (
    select 1 from public.content_items ci
    where ci.id=content_item_id
      and ci.status='published'
      and ci.published_at is not null
      and ci.published_at<=now()
  )
  or public.is_admin()
  or public.has_app_role(auth.uid(),'media_editor')
  or public.has_app_role(auth.uid(),'media_leader')
);
