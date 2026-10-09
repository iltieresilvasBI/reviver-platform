create or replace function public.admin_create_quiz_question(
  p_lesson_id uuid,
  p_prompt text,
  p_sort_order integer,
  p_options text[],
  p_correct_index integer
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user uuid:=auth.uid();
  v_question_id uuid;
  v_count integer:=coalesce(cardinality(p_options),0);
  i integer;
begin
  if not public.is_admin(v_user) then raise exception 'admin required'; end if;
  if coalesce(nullif(btrim(p_prompt),''),'')='' then raise exception 'prompt required'; end if;
  if v_count<2 or v_count>4 then raise exception 'use between 2 and 4 options'; end if;
  if p_correct_index<0 or p_correct_index>=v_count then raise exception 'invalid correct option'; end if;
  for i in 1..v_count loop
    if coalesce(nullif(btrim(p_options[i]),''),'')='' then raise exception 'option cannot be blank'; end if;
  end loop;

  insert into public.quiz_questions(lesson_id,prompt,sort_order)
  values(p_lesson_id,btrim(p_prompt),coalesce(p_sort_order,0))
  returning id into v_question_id;

  insert into public.quiz_options(question_id,label,is_correct,sort_order)
  select v_question_id,btrim(p_options[i]),(i-1)=p_correct_index,i
  from generate_subscripts(p_options,1) as g(i);

  return v_question_id;
end;
$$;

create or replace function public.admin_update_quiz_question(
  p_question_id uuid,
  p_prompt text,
  p_sort_order integer,
  p_options text[],
  p_correct_index integer
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user uuid:=auth.uid();
  v_count integer:=coalesce(cardinality(p_options),0);
  i integer;
begin
  if not public.is_admin(v_user) then raise exception 'admin required'; end if;
  if coalesce(nullif(btrim(p_prompt),''),'')='' then raise exception 'prompt required'; end if;
  if v_count<2 or v_count>4 then raise exception 'use between 2 and 4 options'; end if;
  if p_correct_index<0 or p_correct_index>=v_count then raise exception 'invalid correct option'; end if;
  for i in 1..v_count loop
    if coalesce(nullif(btrim(p_options[i]),''),'')='' then raise exception 'option cannot be blank'; end if;
  end loop;

  update public.quiz_questions
  set prompt=btrim(p_prompt),sort_order=coalesce(p_sort_order,0)
  where id=p_question_id;
  if not found then raise exception 'question not found'; end if;

  delete from public.quiz_options where question_id=p_question_id;

  insert into public.quiz_options(question_id,label,is_correct,sort_order)
  select p_question_id,btrim(p_options[i]),(i-1)=p_correct_index,i
  from generate_subscripts(p_options,1) as g(i);
end;
$$;

revoke execute on function public.admin_create_quiz_question(uuid,text,integer,text[],integer) from public,anon;
grant execute on function public.admin_create_quiz_question(uuid,text,integer,text[],integer) to authenticated;
revoke execute on function public.admin_update_quiz_question(uuid,text,integer,text[],integer) from public,anon;
grant execute on function public.admin_update_quiz_question(uuid,text,integer,text[],integer) to authenticated;
