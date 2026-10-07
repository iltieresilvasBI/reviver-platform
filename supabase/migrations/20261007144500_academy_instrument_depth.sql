do $$
declare
  v_module uuid;
  v_lesson uuid;
  v_q uuid;
begin
  select id into v_module from public.academy_modules where slug='violao' limit 1;
  select id into v_lesson from public.academy_lessons where module_id=v_module and slug='ritmo-e-troca-de-acordes' limit 1;
  if v_lesson is null then
    insert into public.academy_lessons(module_id,slug,title,summary,objectives,exercise,youtube_id,duration_minutes,xp_reward,pass_percentage,sort_order,active)
    values(v_module,'ritmo-e-troca-de-acordes','Ritmo e troca de acordes','Aplicação prática de pulsação, batida e mudanças de acorde em andamento constante.','Trocar acordes sem interromper o pulso e manter uma levada simples de acompanhamento.','Escolhe quatro acordes simples e toca 4 compassos em cada um com metrónomo. Depois reduz para 2 e finalmente 1 compasso por acorde.',null,20,110,70,2,true)
    returning id into v_lesson;
  end if;
  if not exists(select 1 from public.quiz_questions where lesson_id=v_lesson) then
    insert into public.quiz_questions(lesson_id,prompt,sort_order) values(v_lesson,'O que deve permanecer constante durante a troca de acordes?',1) returning id into v_q;
    insert into public.quiz_options(question_id,label,is_correct,sort_order) values
      (v_q,'A pulsação',true,1),(v_q,'A posição da mão esquerda',false,2),(v_q,'O mesmo acorde',false,3);
  end if;

  select id into v_module from public.academy_modules where slug='guitarra' limit 1;
  select id into v_lesson from public.academy_lessons where module_id=v_module and slug='dinamica-e-timbre-na-guitarra' limit 1;
  if v_lesson is null then
    insert into public.academy_lessons(module_id,slug,title,summary,objectives,exercise,youtube_id,duration_minutes,xp_reward,pass_percentage,sort_order,active)
    values(v_module,'dinamica-e-timbre-na-guitarra','Dinâmica e timbre na guitarra','Como ajustar intensidade, espaço e timbre para servir a música sem ocupar frequências em excesso.','Perceber quando tocar menos, controlar ganho e escolher um timbre compatível com a função da música.','Toca a mesma progressão em três níveis de intensidade: base limpa, preenchimento leve e clímax. Grava e compara o espaço deixado para voz e teclado.',null,20,120,70,2,true)
    returning id into v_lesson;
  end if;
  if not exists(select 1 from public.quiz_questions where lesson_id=v_lesson) then
    insert into public.quiz_questions(lesson_id,prompt,sort_order) values(v_lesson,'Num arranjo de louvor, tocar menos pode ser melhor quando?',1) returning id into v_q;
    insert into public.quiz_options(question_id,label,is_correct,sort_order) values
      (v_q,'Ajuda a deixar espaço para voz e outros instrumentos',true,1),(v_q,'O amplificador está desligado',false,2),(v_q,'Nunca; deve-se tocar o máximo possível',false,3);
  end if;

  select id into v_module from public.academy_modules where slug='baixo' limit 1;
  select id into v_lesson from public.academy_lessons where module_id=v_module and slug='baixo-e-bateria-groove' limit 1;
  if v_lesson is null then
    insert into public.academy_lessons(module_id,slug,title,summary,objectives,exercise,youtube_id,duration_minutes,xp_reward,pass_percentage,sort_order,active)
    values(v_module,'baixo-e-bateria-groove','Baixo e bateria: construção do groove','Relação entre baixo, bumbo e pulsação para criar uma base estável.','Ouvir o bumbo, alinhar ataques principais e evitar excesso de notas.','Toca uma linha simples acompanhando o padrão de bumbo de uma música. Depois remove metade das notas e verifica se o groove fica mais claro.',null,20,120,70,2,true)
    returning id into v_lesson;
  end if;
  if not exists(select 1 from public.quiz_questions where lesson_id=v_lesson) then
    insert into public.quiz_questions(lesson_id,prompt,sort_order) values(v_lesson,'Qual relação é central para construir groove no baixo?',1) returning id into v_q;
    insert into public.quiz_options(question_id,label,is_correct,sort_order) values
      (v_q,'A relação com o bumbo e a pulsação',true,1),(v_q,'A quantidade de efeitos',false,2),(v_q,'A altura do palco',false,3);
  end if;

  select id into v_module from public.academy_modules where slug='bateria' limit 1;
  select id into v_lesson from public.academy_lessons where module_id=v_module and slug='dinamica-e-viradas-na-bateria' limit 1;
  if v_lesson is null then
    insert into public.academy_lessons(module_id,slug,title,summary,objectives,exercise,youtube_id,duration_minutes,xp_reward,pass_percentage,sort_order,active)
    values(v_module,'dinamica-e-viradas-na-bateria','Dinâmica e viradas na bateria','Como controlar intensidade e usar viradas para conduzir transições sem quebrar o tempo.','Variar dinâmica mantendo o andamento e usar viradas curtas com função musical.','Toca 8 compassos suaves, 8 médios e 8 fortes no mesmo andamento. Acrescenta apenas uma virada curta no final de cada bloco.',null,20,120,70,2,true)
    returning id into v_lesson;
  end if;
  if not exists(select 1 from public.quiz_questions where lesson_id=v_lesson) then
    insert into public.quiz_questions(lesson_id,prompt,sort_order) values(v_lesson,'Qual é a função principal de uma virada bem aplicada?',1) returning id into v_q;
    insert into public.quiz_options(question_id,label,is_correct,sort_order) values
      (v_q,'Apoiar uma transição sem perder o tempo',true,1),(v_q,'Mostrar velocidade independentemente da música',false,2),(v_q,'Substituir a pulsação',false,3);
  end if;

  select id into v_module from public.academy_modules where slug='teclado-piano' limit 1;
  select id into v_lesson from public.academy_lessons where module_id=v_module and slug='inversoes-e-voz-conduzida-no-teclado' limit 1;
  if v_lesson is null then
    insert into public.academy_lessons(module_id,slug,title,summary,objectives,exercise,youtube_id,duration_minutes,xp_reward,pass_percentage,sort_order,active)
    values(v_module,'inversoes-e-voz-conduzida-no-teclado','Inversões e condução de vozes no teclado','Uso de inversões para reduzir saltos entre acordes e criar acompanhamento mais fluido.','Escolher inversões próximas e evitar movimentos desnecessários entre acordes.','Pega numa progressão de quatro acordes e procura a inversão de cada acorde que exija o menor movimento possível da mão direita.',null,20,120,70,2,true)
    returning id into v_lesson;
  end if;
  if not exists(select 1 from public.quiz_questions where lesson_id=v_lesson) then
    insert into public.quiz_questions(lesson_id,prompt,sort_order) values(v_lesson,'Por que usar inversões próximas num acompanhamento?',1) returning id into v_q;
    insert into public.quiz_options(question_id,label,is_correct,sort_order) values
      (v_q,'Para tornar as transições mais suaves e reduzir saltos',true,1),(v_q,'Para tocar sempre mais forte',false,2),(v_q,'Para eliminar a necessidade de ritmo',false,3);
  end if;
end $$;