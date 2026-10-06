
-- Full Reviver MVP features

do $$ begin
  create type public.worship_item_type as enum ('schedule','rehearsal','repertoire','notice','file');
exception when duplicate_object then null; end $$;

create table if not exists public.content_item_networks (
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  network_id uuid not null references public.networks(id) on delete cascade,
  primary key(content_item_id, network_id)
);

create table if not exists public.worship_items (
  id uuid primary key default gen_random_uuid(),
  item_type public.worship_item_type not null,
  title text not null,
  body text,
  starts_at timestamptz,
  ends_at timestamptz,
  external_url text,
  storage_path text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.content_item_networks enable row level security;
alter table public.worship_items enable row level security;

create policy "content networks public read" on public.content_item_networks for select
using (
  exists (
    select 1 from public.content_items ci
    where ci.id = content_item_id
      and ci.status='published'
      and ci.published_at is not null
      and ci.published_at <= now()
  )
  or public.is_admin()
  or public.has_app_role(auth.uid(),'media_editor')
  or public.has_app_role(auth.uid(),'media_leader')
);

create policy "content networks media write" on public.content_item_networks for all
using (public.is_admin() or public.has_app_role(auth.uid(),'media_editor') or public.has_app_role(auth.uid(),'media_leader'))
with check (public.is_admin() or public.has_app_role(auth.uid(),'media_editor') or public.has_app_role(auth.uid(),'media_leader'));

create policy "worship active members read" on public.worship_items for select
using (public.is_admin() or public.has_network_role(auth.uid(),'worship','member'));

create policy "worship leaders write" on public.worship_items for all
using (public.is_admin() or public.has_network_role(auth.uid(),'worship','leader'))
with check (public.is_admin() or public.has_network_role(auth.uid(),'worship','leader'));

create or replace function public.transition_content(
  p_content_id uuid,
  p_action text,
  p_scheduled_for timestamptz default null,
  p_note text default null
)
returns public.content_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_item public.content_items;
  v_from public.content_status;
  v_to public.content_status;
  v_is_admin boolean;
  v_is_editor boolean;
  v_is_leader boolean;
begin
  if v_user is null then
    raise exception 'authentication required';
  end if;

  select * into v_item from public.content_items where id=p_content_id for update;
  if not found then raise exception 'content not found'; end if;

  v_from := v_item.status;
  v_is_admin := public.is_admin(v_user);
  v_is_editor := public.has_app_role(v_user,'media_editor');
  v_is_leader := public.has_app_role(v_user,'media_leader');

  if p_action='submit' then
    if not (v_is_admin or v_is_leader or (v_is_editor and v_item.created_by=v_user)) then raise exception 'forbidden'; end if;
    if v_from not in ('draft','changes_requested') then raise exception 'invalid transition'; end if;
    v_to := 'in_review';
    update public.content_items
      set status=v_to, submitted_by=v_user, submitted_at=now(), updated_at=now()
      where id=p_content_id returning * into v_item;

  elsif p_action='approve' then
    if not (v_is_admin or v_is_leader) then raise exception 'forbidden'; end if;
    if v_from <> 'in_review' then raise exception 'invalid transition'; end if;
    v_to := 'approved';
    update public.content_items
      set status=v_to, approved_by=v_user, approved_at=now(), rejection_reason=null, rejected_by=null, rejected_at=null, updated_at=now()
      where id=p_content_id returning * into v_item;

  elsif p_action='request_changes' then
    if not (v_is_admin or v_is_leader) then raise exception 'forbidden'; end if;
    if v_from <> 'in_review' then raise exception 'invalid transition'; end if;
    v_to := 'changes_requested';
    update public.content_items
      set status=v_to, rejection_reason=p_note, updated_at=now()
      where id=p_content_id returning * into v_item;

  elsif p_action='reject' then
    if not (v_is_admin or v_is_leader) then raise exception 'forbidden'; end if;
    if v_from <> 'in_review' then raise exception 'invalid transition'; end if;
    v_to := 'rejected';
    update public.content_items
      set status=v_to, rejected_by=v_user, rejected_at=now(), rejection_reason=p_note, updated_at=now()
      where id=p_content_id returning * into v_item;

  elsif p_action='schedule' then
    if not (v_is_admin or v_is_leader) then raise exception 'forbidden'; end if;
    if v_from <> 'approved' then raise exception 'invalid transition'; end if;
    if p_scheduled_for is null or p_scheduled_for <= now() then raise exception 'scheduled time must be in the future'; end if;
    v_to := 'scheduled';
    update public.content_items
      set status=v_to, scheduled_by=v_user, scheduled_at=now(), scheduled_for=p_scheduled_for, updated_at=now()
      where id=p_content_id returning * into v_item;

  elsif p_action='publish' then
    if not (v_is_admin or v_is_leader) then raise exception 'forbidden'; end if;
    if v_from not in ('approved','scheduled') then raise exception 'invalid transition'; end if;
    v_to := 'published';
    update public.content_items
      set status=v_to, published_by=v_user, published_at=now(), updated_at=now()
      where id=p_content_id returning * into v_item;

  else
    raise exception 'unknown action';
  end if;

  insert into public.content_audit_log(content_item_id, actor_user_id, action, from_status, to_status, note)
  values (p_content_id, v_user, p_action, v_from, v_to, p_note);

  return v_item;
end;
$$;

revoke execute on function public.transition_content(uuid,text,timestamptz,text) from public, anon;
grant execute on function public.transition_content(uuid,text,timestamptz,text) to authenticated;

create or replace function public.publish_due_content()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with due as (
    update public.content_items
    set status='published', published_at=coalesce(published_at,now()), updated_at=now()
    where status='scheduled'
      and scheduled_for is not null
      and scheduled_for <= now()
    returning id
  )
  select count(*) into v_count from due;
  return v_count;
end;
$$;

revoke execute on function public.publish_due_content() from public, anon, authenticated;
grant execute on function public.publish_due_content() to service_role;

create or replace function public.submit_quiz_attempt(
  p_lesson_id uuid,
  p_answer_option_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_total integer;
  v_correct integer;
  v_score numeric(5,2);
  v_pass boolean;
  v_pass_mark integer;
  v_xp integer;
  v_already_complete boolean;
  v_awarded integer := 0;
begin
  if v_user is null then raise exception 'authentication required'; end if;

  select pass_percentage, xp_reward into v_pass_mark, v_xp
  from public.academy_lessons where id=p_lesson_id and active=true;
  if not found then raise exception 'lesson not found'; end if;

  select count(*) into v_total from public.quiz_questions where lesson_id=p_lesson_id;
  if v_total = 0 then raise exception 'lesson has no quiz'; end if;

  select count(distinct qo.question_id) into v_correct
  from public.quiz_options qo
  join public.quiz_questions qq on qq.id=qo.question_id
  where qq.lesson_id=p_lesson_id
    and qo.is_correct=true
    and qo.id = any(p_answer_option_ids);

  v_score := round((v_correct::numeric / v_total::numeric) * 100, 2);
  v_pass := v_score >= v_pass_mark;

  insert into public.quiz_attempts(user_id, lesson_id, score_percentage, passed, review_mode)
  values (v_user, p_lesson_id, v_score, v_pass, false);

  select first_completed_at is not null into v_already_complete
  from public.lesson_progress
  where user_id=v_user and lesson_id=p_lesson_id;

  if v_pass then
    insert into public.lesson_progress(user_id,lesson_id,status,best_score_percentage,first_completed_at,last_activity_at)
    values(v_user,p_lesson_id,'completed',v_score,now(),now())
    on conflict(user_id,lesson_id) do update set
      status='completed',
      best_score_percentage=greatest(coalesce(public.lesson_progress.best_score_percentage,0),excluded.best_score_percentage),
      first_completed_at=coalesce(public.lesson_progress.first_completed_at,excluded.first_completed_at),
      last_activity_at=now();

    if coalesce(v_already_complete,false)=false then
      insert into public.xp_events(user_id,lesson_id,event_key,xp)
      values(v_user,p_lesson_id,'lesson:'||p_lesson_id::text||':first-pass',v_xp)
      on conflict(user_id,event_key) do nothing;
      if found then v_awarded := v_xp; end if;
    end if;
  else
    insert into public.lesson_progress(user_id,lesson_id,status,best_score_percentage,last_activity_at)
    values(v_user,p_lesson_id,'available',v_score,now())
    on conflict(user_id,lesson_id) do update set
      best_score_percentage=greatest(coalesce(public.lesson_progress.best_score_percentage,0),excluded.best_score_percentage),
      last_activity_at=now();
  end if;

  return jsonb_build_object(
    'score',v_score,
    'passed',v_pass,
    'passMark',v_pass_mark,
    'xpAwarded',v_awarded
  );
end;
$$;

revoke execute on function public.submit_quiz_attempt(uuid,uuid[]) from public, anon;
grant execute on function public.submit_quiz_attempt(uuid,uuid[]) to authenticated;

-- Seed the public Academy skeleton and one fully sourced lesson.
insert into public.academy_courses(slug,title,description,active,sort_order)
values ('formacao-vocal','Formação Vocal','Percurso progressivo de técnica vocal aplicada ao serviço e ao contexto de louvor.',true,1)
on conflict(slug) do update set title=excluded.title, description=excluded.description, active=true;

with c as (select id from public.academy_courses where slug='formacao-vocal')
insert into public.academy_modules(course_id,slug,title,description,sort_order)
select c.id, x.slug, x.title, x.description, x.sort_order
from c cross join (values
  ('fundamentos','Fundamentos','Postura, respiração, apoio e emissão saudável.',1),
  ('controle','Controle','Afinação, percepção, registos e dinâmica.',2),
  ('desenvolvimento','Desenvolvimento','Ressonância, extensão, agilidade e transição.',3),
  ('aplicacao','Aplicação','Voz mista, projeção, resistência e interpretação.',4),
  ('worship','Worship Team','Uníssono, harmonia, backing vocal e dinâmica congregacional.',5)
) as x(slug,title,description,sort_order)
on conflict(course_id,slug) do update set title=excluded.title,description=excluded.description,sort_order=excluded.sort_order;

with m as (
  select id from public.academy_modules where slug='fundamentos'
)
insert into public.academy_lessons(module_id,slug,title,summary,objectives,exercise,youtube_id,duration_minutes,xp_reward,pass_percentage,sort_order,active)
select m.id,'respiracao-e-apoio','Respiração e apoio',
  'Introdução prática à respiração para canto e ao controlo do fluxo de ar.',
  'Perceber a mecânica básica da respiração; praticar expansão e controlo do ar.',
  'Faça 5 ciclos de inspiração silenciosa e expiração controlada; pare se houver desconforto.',
  'OH5sKfBDjW8',12,100,70,1,true
from m
on conflict(module_id,slug) do update set
  title=excluded.title,summary=excluded.summary,objectives=excluded.objectives,exercise=excluded.exercise,
  youtube_id=excluded.youtube_id,duration_minutes=excluded.duration_minutes,xp_reward=excluded.xp_reward,
  pass_percentage=excluded.pass_percentage,sort_order=excluded.sort_order,active=true;

with l as (select id from public.academy_lessons where slug='respiracao-e-apoio'),
q as (
  insert into public.quiz_questions(lesson_id,prompt,sort_order)
  select l.id,'Qual é o objetivo principal do controlo respiratório no canto?',1 from l
  returning id
)
insert into public.quiz_options(question_id,label,is_correct,sort_order)
select q.id,'Gerir o fluxo de ar de forma estável durante a emissão',true,1 from q
union all
select q.id,'Inspirar o máximo de ar possível em todas as frases',false,2 from q
union all
select q.id,'Eliminar completamente o movimento das costelas',false,3 from q;

create index if not exists idx_content_item_networks_network_id on public.content_item_networks(network_id);
create index if not exists idx_worship_items_starts_at on public.worship_items(starts_at);
