
create or replace function public.get_quiz_options(p_lesson_id uuid)
returns table(id uuid,question_id uuid,label text,sort_order integer)
language sql stable security definer set search_path=public
as $$
  select qo.id,qo.question_id,qo.label,qo.sort_order
  from public.quiz_options qo
  join public.quiz_questions qq on qq.id=qo.question_id
  join public.academy_lessons al on al.id=qq.lesson_id
  where qq.lesson_id=p_lesson_id and al.active=true
  order by qq.sort_order,qo.sort_order;
$$;
revoke execute on function public.get_quiz_options(uuid) from public;
grant execute on function public.get_quiz_options(uuid) to anon,authenticated;
