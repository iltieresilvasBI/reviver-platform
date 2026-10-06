
-- Admin authoring for Academy and complete public networks/categories seed.

create policy "academy courses admin write" on public.academy_courses
for all using (public.is_admin()) with check (public.is_admin());

create policy "academy modules admin write" on public.academy_modules
for all using (public.is_admin()) with check (public.is_admin());

create policy "academy lessons admin write" on public.academy_lessons
for all using (public.is_admin()) with check (public.is_admin());

create policy "quiz questions admin write" on public.quiz_questions
for all using (public.is_admin()) with check (public.is_admin());

create policy "quiz options admin read" on public.quiz_options
for select using (public.is_admin());

create policy "quiz options admin write" on public.quiz_options
for all using (public.is_admin()) with check (public.is_admin());

insert into public.networks(slug,name,active)
values
('kids','Reviver Kids',true),
('youth','Reviver Youth',true),
('women','Mulheres',true),
('men','Homens',true)
on conflict(slug) do update set name=excluded.name,active=true,updated_at=now();

insert into public.content_categories(slug,name,active)
values
('general','Geral',true),
('kids','Kids',true),
('youth','Youth',true),
('women','Mulheres',true),
('men','Homens',true),
('worship','Louvor',true)
on conflict(slug) do update set name=excluded.name,active=true;

create or replace function public.admin_delete_lesson(p_lesson_id uuid)
returns void
language plpgsql security definer set search_path=public
as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'forbidden'; end if;
  update public.academy_lessons set active=false where id=p_lesson_id;
end;
$$;
revoke execute on function public.admin_delete_lesson(uuid) from public,anon;
grant execute on function public.admin_delete_lesson(uuid) to authenticated;

create or replace function public.admin_delete_question(p_question_id uuid)
returns void
language plpgsql security definer set search_path=public
as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'forbidden'; end if;
  delete from public.quiz_options where question_id=p_question_id;
  delete from public.quiz_questions where id=p_question_id;
end;
$$;
revoke execute on function public.admin_delete_question(uuid) from public,anon;
grant execute on function public.admin_delete_question(uuid) to authenticated;
