do $$
declare
  v_course uuid;
  v_module uuid;
  v_lesson uuid;
  v_q uuid;
begin
  select id into v_course from public.academy_courses where slug='formacao-vocal' limit 1;
  if v_course is null then raise exception 'academy course formacao-vocal not found'; end if;

  select id into v_module from public.academy_modules where course_id=v_course and slug='violao' limit 1;
  if v_module is null then
    insert into public.academy_modules(course_id,slug,title,description,sort_order)
    values(v_course,'violao','Violão','Acordes, ritmo, transposição, levadas e acompanhamento de louvor.',6)
    returning id into v_module;
  end if;
  select id into v_lesson from public.academy_lessons where module_id=v_module and slug='primeiros-acordes-no-violao' limit 1;
  if v_lesson is null then
    insert into public.academy_lessons(module_id,slug,title,summary,objectives,exercise,youtube_id,duration_minutes,xp_reward,pass_percentage,sort_order,active)
    values(v_module,'primeiros-acordes-no-violao','Primeiros acordes no violão','Introdução aos acordes básicos e à troca entre posições.','Reconhecer acordes básicos e iniciar mudanças com fluidez.','Pratica mudanças lentas entre dois acordes mantendo pulsação constante.','2Rsz3JEbw0Y',15,100,70,1,true)
    returning id into v_lesson;
  end if;
  if not exists(select 1 from public.quiz_questions where lesson_id=v_lesson) then
    insert into public.quiz_questions(lesson_id,prompt,sort_order) values(v_lesson,'Qual é o objetivo principal desta primeira etapa?',1) returning id into v_q;
    insert into public.quiz_options(question_id,label,is_correct,sort_order) values
      (v_q,'Memorizar solos complexos',false,1),(v_q,'Aprender acordes básicos e trocar entre eles com estabilidade',true,2),(v_q,'Tocar apenas escalas',false,3);
  end if;

  select id into v_module from public.academy_modules where course_id=v_course and slug='guitarra' limit 1;
  if v_module is null then
    insert into public.academy_modules(course_id,slug,title,description,sort_order)
    values(v_course,'guitarra','Guitarra','Base, timbres, dinâmica, riffs, ambientação e linguagem para ministério de louvor.',7)
    returning id into v_module;
  end if;
  select id into v_lesson from public.academy_lessons where module_id=v_module and slug='fundamentos-de-guitarra' limit 1;
  if v_lesson is null then
    insert into public.academy_lessons(module_id,slug,title,summary,objectives,exercise,youtube_id,duration_minutes,xp_reward,pass_percentage,sort_order,active)
    values(v_module,'fundamentos-de-guitarra','Fundamentos de guitarra','Introdução à guitarra com foco em postura, coordenação e base técnica.','Construir uma base limpa antes de aplicar timbres e efeitos.','Treina movimentos simples com metrónomo e observa ruídos indesejados.','dbnHejO00QI',20,100,70,1,true)
    returning id into v_lesson;
  end if;
  if not exists(select 1 from public.quiz_questions where lesson_id=v_lesson) then
    insert into public.quiz_questions(lesson_id,prompt,sort_order) values(v_lesson,'O que deve vir antes do uso avançado de efeitos?',1) returning id into v_q;
    insert into public.quiz_options(question_id,label,is_correct,sort_order) values
      (v_q,'Uma base técnica limpa e controlada',true,1),(v_q,'Aumentar sempre o ganho',false,2),(v_q,'Evitar metrónomo',false,3);
  end if;

  select id into v_module from public.academy_modules where course_id=v_course and slug='baixo' limit 1;
  if v_module is null then
    insert into public.academy_modules(course_id,slug,title,description,sort_order)
    values(v_course,'baixo','Baixo','Fundamentos, postura, afinação, digitação, groove e construção de linhas para louvor.',8)
    returning id into v_module;
  end if;
  select id into v_lesson from public.academy_lessons where module_id=v_module and slug='fundamentos-do-baixo' limit 1;
  if v_lesson is null then
    insert into public.academy_lessons(module_id,slug,title,summary,objectives,exercise,youtube_id,duration_minutes,xp_reward,pass_percentage,sort_order,active)
    values(v_module,'fundamentos-do-baixo','Fundamentos do baixo','Primeiros conceitos de postura, digitação e pulsação.','Tocar notas com consistência rítmica e som limpo.','Mantém uma nota por pulso com metrónomo, alternando os dedos da mão direita.','6xIgTuBqpIM',20,100,70,1,true)
    returning id into v_lesson;
  end if;
  if not exists(select 1 from public.quiz_questions where lesson_id=v_lesson) then
    insert into public.quiz_questions(lesson_id,prompt,sort_order) values(v_lesson,'No baixo, o que é essencial para sustentar a banda?',1) returning id into v_q;
    insert into public.quiz_options(question_id,label,is_correct,sort_order) values
      (v_q,'Pulsação consistente',true,1),(v_q,'Tocar sempre muitas notas',false,2),(v_q,'Ignorar a bateria',false,3);
  end if;

  select id into v_module from public.academy_modules where course_id=v_course and slug='bateria' limit 1;
  if v_module is null then
    insert into public.academy_modules(course_id,slug,title,description,sort_order)
    values(v_course,'bateria','Bateria','Primeiros ritmos, condução, viradas, dinâmica e aplicação em contexto de igreja.',9)
    returning id into v_module;
  end if;
  select id into v_lesson from public.academy_lessons where module_id=v_module and slug='primeiros-ritmos-na-bateria' limit 1;
  if v_lesson is null then
    insert into public.academy_lessons(module_id,slug,title,summary,objectives,exercise,youtube_id,duration_minutes,xp_reward,pass_percentage,sort_order,active)
    values(v_module,'primeiros-ritmos-na-bateria','Primeiros ritmos na bateria','Introdução à coordenação entre condução, caixa e bumbo.','Executar um ritmo básico com tempo estável.','Pratica lentamente com metrónomo e aumenta a velocidade apenas mantendo estabilidade.','UqdUcZ1AK_k',20,100,70,1,true)
    returning id into v_lesson;
  end if;
  if not exists(select 1 from public.quiz_questions where lesson_id=v_lesson) then
    insert into public.quiz_questions(lesson_id,prompt,sort_order) values(v_lesson,'O que deve determinar o aumento de velocidade no estudo?',1) returning id into v_q;
    insert into public.quiz_options(question_id,label,is_correct,sort_order) values
      (v_q,'A capacidade de manter o ritmo estável',true,1),(v_q,'A vontade de tocar mais alto',false,2),(v_q,'A quantidade de viradas',false,3);
  end if;

  select id into v_module from public.academy_modules where course_id=v_course and slug='teclado-piano' limit 1;
  if v_module is null then
    insert into public.academy_modules(course_id,slug,title,description,sort_order)
    values(v_course,'teclado-piano','Teclado / Piano','Acordes, inversões, cifras, ambiência, pads e acompanhamento de louvores.',10)
    returning id into v_module;
  end if;
  select id into v_lesson from public.academy_lessons where module_id=v_module and slug='fundamentos-de-teclado' limit 1;
  if v_lesson is null then
    insert into public.academy_lessons(module_id,slug,title,summary,objectives,exercise,youtube_id,duration_minutes,xp_reward,pass_percentage,sort_order,active)
    values(v_module,'fundamentos-de-teclado','Fundamentos de teclado','Introdução a acordes e organização das notas no teclado.','Localizar notas e formar acordes básicos.','Toca acordes simples em diferentes regiões mantendo transições suaves.','Kmtff3WkU38',20,100,70,1,true)
    returning id into v_lesson;
  end if;
  if not exists(select 1 from public.quiz_questions where lesson_id=v_lesson) then
    insert into public.quiz_questions(lesson_id,prompt,sort_order) values(v_lesson,'Qual habilidade ajuda a acompanhar louvores com mais fluidez?',1) returning id into v_q;
    insert into public.quiz_options(question_id,label,is_correct,sort_order) values
      (v_q,'Conhecer acordes e suas posições',true,1),(v_q,'Usar apenas uma nota',false,2),(v_q,'Evitar transições',false,3);
  end if;

  select id into v_module from public.academy_modules where course_id=v_course and slug='behringer-x32' limit 1;
  if v_module is null then
    insert into public.academy_modules(course_id,slug,title,description,sort_order)
    values(v_course,'behringer-x32','Behringer X32','Fluxo de sinal, canais, buses, monitores, efeitos, cenas e operação prática da X32.',11)
    returning id into v_module;
  end if;
  select id into v_lesson from public.academy_lessons where module_id=v_module and slug='introducao-a-behringer-x32' limit 1;
  if v_lesson is null then
    insert into public.academy_lessons(module_id,slug,title,summary,objectives,exercise,youtube_id,duration_minutes,xp_reward,pass_percentage,sort_order,active)
    values(v_module,'introducao-a-behringer-x32','Introdução à Behringer X32','Visão inicial da mesa e do fluxo básico de operação.','Reconhecer canais, buses e a lógica geral de navegação.','Identifica num ensaio um canal de entrada, o seu ganho, fader e envio para monitor sem alterar outras rotas.','DUW9eiutCLY',25,120,70,1,true)
    returning id into v_lesson;
  end if;
  if not exists(select 1 from public.quiz_questions where lesson_id=v_lesson) then
    insert into public.quiz_questions(lesson_id,prompt,sort_order) values(v_lesson,'Na X32, o que deve ser compreendido antes de alterar várias rotas?',1) returning id into v_q;
    insert into public.quiz_options(question_id,label,is_correct,sort_order) values
      (v_q,'O fluxo de sinal',true,1),(v_q,'A cor do canal',false,2),(v_q,'O brilho do ecrã',false,3);
  end if;
end $$;
