do $$
declare
  v_course uuid;
  v_module uuid;
  v_lesson uuid;
  v_q uuid;
begin
  select id into v_course from public.academy_courses where slug='formacao-vocal' limit 1;
  if v_course is null then raise exception 'academy course formacao-vocal not found'; end if;

  select id into v_module from public.academy_modules where course_id=v_course and slug='iluminacao-igreja' limit 1;
  if v_module is null then
    insert into public.academy_modules(course_id,slug,title,description,sort_order)
    values(v_course,'iluminacao-igreja','Iluminação de Igreja','Fundamentos de iluminação, cenas, operação segura, organização de palco e introdução ao DMX.',12)
    returning id into v_module;
  end if;

  select id into v_lesson from public.academy_lessons where module_id=v_module and slug='fundamentos-de-iluminacao-de-igreja' limit 1;
  if v_lesson is null then
    insert into public.academy_lessons(
      module_id,slug,title,summary,objectives,exercise,youtube_id,duration_minutes,xp_reward,pass_percentage,sort_order,active
    ) values(
      v_module,
      'fundamentos-de-iluminacao-de-igreja',
      'Fundamentos de iluminação de igreja',
      'Introdução ao papel da iluminação no culto, organização de zonas, cenas, intensidade e operação segura.',
      'Distinguir iluminação funcional de iluminação cénica, compreender o uso de cenas e reconhecer princípios básicos de segurança e DMX.',
      'Mapeia o palco em zonas: púlpito, vocal principal, backing vocals, banda e fundo. Define para cada zona a função da luz, intensidade desejada e o que deve permanecer legível para a congregação e para as câmaras.',
      null,20,100,70,1,true
    ) returning id into v_lesson;
  end if;

  if not exists(select 1 from public.quiz_questions where lesson_id=v_lesson) then
    insert into public.quiz_questions(lesson_id,prompt,sort_order)
    values(v_lesson,'Qual deve ser a primeira preocupação ao planear a iluminação de um culto?',1)
    returning id into v_q;
    insert into public.quiz_options(question_id,label,is_correct,sort_order) values
      (v_q,'Segurança, visibilidade e função de cada zona',true,1),
      (v_q,'Usar o máximo de efeitos possível',false,2),
      (v_q,'Manter todas as luzes com a mesma intensidade',false,3);

    insert into public.quiz_questions(lesson_id,prompt,sort_order)
    values(v_lesson,'Para que serve uma cena de iluminação?',2)
    returning id into v_q;
    insert into public.quiz_options(question_id,label,is_correct,sort_order) values
      (v_q,'Guardar uma configuração de luz para reutilização rápida',true,1),
      (v_q,'Aumentar automaticamente o volume do som',false,2),
      (v_q,'Substituir o operador de iluminação',false,3);
  end if;
end $$;
