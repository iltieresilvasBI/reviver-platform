alter table public.academy_lessons
  add column if not exists video_review_status text not null default 'pending',
  add column if not exists video_review_note text,
  add column if not exists video_reviewed_at timestamptz,
  add column if not exists video_reviewed_by uuid references public.profiles(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='academy_lessons_video_review_status_check'
      and conrelid='public.academy_lessons'::regclass
  ) then
    alter table public.academy_lessons
      add constraint academy_lessons_video_review_status_check
      check (video_review_status in ('pending','verified','blocked'));
  end if;
end $$;

update public.academy_lessons set youtube_id='t2DPS6cIYjI' where slug='respiracao-e-apoio';
update public.academy_lessons set youtube_id='eoU0rHG_7kc' where slug='aquecimento-vocal-5-minutos';
update public.academy_lessons set youtube_id='J2ZnTPMyp5k' where slug='respiracao-afinacao-agilidade';
update public.academy_lessons set youtube_id='a_1J5n6lXNc' where slug='vogais-e-ressonancia';
update public.academy_lessons set youtube_id='FgEtdj4Hu-k' where slug='ressonancia-na-pratica';
update public.academy_lessons set youtube_id='5lSkQhdN7ZA' where slug='treino-vocal-avancado-10-minutos';
update public.academy_lessons set youtube_id='fAYqdbrWwGw' where slug='dez-principios-para-cantar-melhor';
update public.academy_lessons set youtube_id='Y8gBxH6hWMM' where slug='segunda-e-terceira-voz';
update public.academy_lessons set youtube_id='13H8dstgI-o' where slug='fundamentos-de-harmonia-para-louvor';
update public.academy_lessons set youtube_id='2Rsz3JEbw0Y' where slug='primeiros-acordes-no-violao';
update public.academy_lessons set youtube_id='dbnHejO00QI' where slug='fundamentos-de-guitarra';
update public.academy_lessons set youtube_id='6xIgTuBqpIM' where slug='fundamentos-do-baixo';
update public.academy_lessons set youtube_id='WOBNFI_uxjM' where slug='primeiros-ritmos-na-bateria';
update public.academy_lessons set youtube_id='N7AcgZDDeZ0' where slug='fundamentos-de-teclado';
update public.academy_lessons set youtube_id='DUW9eiutCLY' where slug='introducao-a-behringer-x32';

update public.academy_lessons
set video_review_status=case when youtube_id is null then 'pending' else 'verified' end,
    video_review_note=case
      when youtube_id is null then null
      else 'Conteúdo em português verificado na curadoria.'
    end,
    video_reviewed_at=case when youtube_id is null then null else now() end,
    video_reviewed_by=null;

create or replace function public.reset_academy_video_review_on_change()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op='INSERT' then
    if new.youtube_id is not null then
      new.video_review_status:='pending';
      new.video_review_note:='Aguardando validação de idioma/origem.';
      new.video_reviewed_at:=null;
      new.video_reviewed_by:=null;
    end if;
    return new;
  end if;

  if new.youtube_id is distinct from old.youtube_id then
    new.video_review_status:='pending';
    new.video_review_note:=case when new.youtube_id is null then null else 'Aguardando validação de idioma/origem.' end;
    new.video_reviewed_at:=null;
    new.video_reviewed_by:=null;
  end if;
  return new;
end;
$$;

drop trigger if exists academy_lessons_reset_video_review on public.academy_lessons;
create trigger academy_lessons_reset_video_review
before insert or update of youtube_id on public.academy_lessons
for each row execute function public.reset_academy_video_review_on_change();

revoke execute on function public.reset_academy_video_review_on_change() from public, anon, authenticated;

create or replace function public.review_academy_video(
  p_lesson_id uuid,
  p_status text,
  p_note text default null
)
returns table(
  lesson_id uuid,
  youtube_id text,
  review_status text,
  review_note text,
  reviewed_at timestamptz,
  reviewed_by uuid
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  if not public.is_admin(v_uid) then raise exception 'admin required'; end if;
  if p_status not in ('pending','verified','blocked') then raise exception 'invalid review status'; end if;

  if p_status='verified' and not exists(
    select 1 from public.academy_lessons al
    where al.id=p_lesson_id and al.youtube_id is not null
  ) then
    raise exception 'cannot verify a lesson without a video';
  end if;

  update public.academy_lessons al
  set video_review_status=p_status,
      video_review_note=nullif(btrim(coalesce(p_note,'')),''),
      video_reviewed_at=case when p_status='pending' then null else now() end,
      video_reviewed_by=case when p_status='pending' then null else v_uid end
  where al.id=p_lesson_id;

  if not found then raise exception 'lesson not found or not permitted'; end if;

  return query
  select al.id,al.youtube_id,al.video_review_status,al.video_review_note,al.video_reviewed_at,al.video_reviewed_by
  from public.academy_lessons al
  where al.id=p_lesson_id;
end;
$$;

revoke execute on function public.review_academy_video(uuid,text,text) from public, anon;
grant execute on function public.review_academy_video(uuid,text,text) to authenticated;
