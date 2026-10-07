do $$
declare
  v_module uuid;
  v_lesson uuid;
  v_q uuid;
begin
  select id into v_module from public.academy_modules where slug='behringer-x32' limit 1;
  if v_module is not null then
    select id into v_lesson from public.academy_lessons where module_id=v_module and slug='ganho-e-nivel-de-sinal-na-x32' limit 1;
    if v_lesson is null then
      insert into public.academy_lessons(module_id,slug,title,summary,objectives,exercise,youtube_id,duration_minutes,xp_reward,pass_percentage,sort_order,active)
      values(v_module,'ganho-e-nivel-de-sinal-na-x32','Ganho e nível de sinal na X32','Aula prática sobre pré-amplificador, medição de nível, headroom e diferença entre ganho e fader.','Ajustar ganho sem confundir pré-amplificação com volume de mistura e reconhecer sinais de nível insuficiente ou excessivo.','Com um canal de teste, baixa o fader, ajusta o pré-amplificador observando o medidor e depois usa o fader apenas para posicionar esse canal na mistura.',null,20,120,70,2,true)
      returning id into v_lesson;
    end if;
    if not exists(select 1 from public.quiz_questions where lesson_id=v_lesson) then
      insert into public.quiz_questions(lesson_id,prompt,sort_order) values(v_lesson,'Qual controlo ajusta o nível que entra no pré-amplificador do canal?',1) returning id into v_q;
      insert into public.quiz_options(question_id,label,is_correct,sort_order) values
        (v_q,'Gain / Preamp',true,1),(v_q,'Fader principal',false,2),(v_q,'Pan',false,3);
      insert into public.quiz_questions(lesson_id,prompt,sort_order) values(v_lesson,'Qual é a função principal do fader do canal?',2) returning id into v_q;
      insert into public.quiz_options(question_id,label,is_correct,sort_order) values
        (v_q,'Posicionar o canal na mistura depois do ganho estar ajustado',true,1),(v_q,'Substituir o ajuste do pré-amplificador',false,2),(v_q,'Alterar o endereço DMX',false,3);
    end if;

    select id into v_lesson from public.academy_lessons where module_id=v_module and slug='monitores-e-buses-na-x32' limit 1;
    if v_lesson is null then
      insert into public.academy_lessons(module_id,slug,title,summary,objectives,exercise,youtube_id,duration_minutes,xp_reward,pass_percentage,sort_order,active)
      values(v_module,'monitores-e-buses-na-x32','Monitores e buses na X32','Introdução ao uso de buses para misturas de retorno e in-ear.','Compreender a lógica Sends on Fader e criar uma mistura de monitor independente da frente de sala.','Escolhe um bus de monitor, ativa Sends on Fader e faz uma mistura de três canais. Depois volta ao LR e confirma que a mistura principal não foi alterada.',null,25,140,70,3,true)
      returning id into v_lesson;
    end if;
    if not exists(select 1 from public.quiz_questions where lesson_id=v_lesson) then
      insert into public.quiz_questions(lesson_id,prompt,sort_order) values(v_lesson,'Para que serve um bus usado como monitor?',1) returning id into v_q;
      insert into public.quiz_options(question_id,label,is_correct,sort_order) values
        (v_q,'Criar uma mistura independente para retorno ou in-ear',true,1),(v_q,'Alterar o nome da consola',false,2),(v_q,'Controlar a iluminação',false,3);
      insert into public.quiz_questions(lesson_id,prompt,sort_order) values(v_lesson,'O que facilita ajustar rapidamente os envios de vários canais para um bus?',2) returning id into v_q;
      insert into public.quiz_options(question_id,label,is_correct,sort_order) values
        (v_q,'Sends on Fader',true,1),(v_q,'Mute Groups',false,2),(v_q,'Talkback apenas',false,3);
    end if;
  end if;

  select id into v_module from public.academy_modules where slug='iluminacao-igreja' limit 1;
  if v_module is not null then
    select id into v_lesson from public.academy_lessons where module_id=v_module and slug='cenas-e-dmx-na-iluminacao' limit 1;
    if v_lesson is null then
      insert into public.academy_lessons(module_id,slug,title,summary,objectives,exercise,youtube_id,duration_minutes,xp_reward,pass_percentage,sort_order,active)
      values(v_module,'cenas-e-dmx-na-iluminacao','Cenas e DMX na iluminação','Introdução à organização de cenas e à lógica de endereçamento DMX sem depender de uma consola específica.','Entender universo, endereço inicial, canais DMX e por que documentar o mapa de equipamentos evita conflitos.','Cria num papel uma tabela com equipamento, endereço inicial, quantidade de canais e zona do palco. Confirma que os intervalos não se sobrepõem.',null,20,110,70,2,true)
      returning id into v_lesson;
    end if;
    if not exists(select 1 from public.quiz_questions where lesson_id=v_lesson) then
      insert into public.quiz_questions(lesson_id,prompt,sort_order) values(v_lesson,'Por que dois equipamentos não devem ocupar canais DMX sobrepostos sem intenção?',1) returning id into v_q;
      insert into public.quiz_options(question_id,label,is_correct,sort_order) values
        (v_q,'Porque podem responder de forma inesperada aos mesmos dados',true,1),(v_q,'Porque reduz o volume do som',false,2),(v_q,'Porque apaga as cenas da mesa de som',false,3);
      insert into public.quiz_questions(lesson_id,prompt,sort_order) values(v_lesson,'O que uma boa documentação DMX deve registar?',2) returning id into v_q;
      insert into public.quiz_options(question_id,label,is_correct,sort_order) values
        (v_q,'Equipamento, endereço inicial, canais usados e localização',true,1),(v_q,'Apenas a cor favorita do operador',false,2),(v_q,'Somente o nome do culto',false,3);
    end if;
  end if;
end $$;
