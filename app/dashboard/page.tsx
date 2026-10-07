import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getAccessContext } from "@/lib/auth";

function roleLabel(value:string|null|undefined){
  const labels:Record<string,string>={
    cantor_principal:"Cantor principal",
    backing_vocal:"Backing vocal",
    violao:"Violão",
    guitarra:"Guitarra",
    baixo:"Baixo",
    bateria:"Bateria",
    teclado:"Teclado/Piano",
    tecnico_som:"Técnico de som",
    iluminacao:"Iluminação",
  };
  return value ? labels[value] ?? value : "Função não definida";
}

export default async function DashboardPage() {
  const ctx = await getAccessContext();

  const [
    { data: lessons },
    { data: progress },
    { data: xp },
    { data: attempts },
    { data: practice },
    { data: worshipNetwork },
  ] = await Promise.all([
    ctx.supabase.from("academy_lessons").select("id,title,slug,xp_reward").eq("active", true).order("sort_order"),
    ctx.supabase.from("lesson_progress").select("lesson_id,status,best_score_percentage,first_completed_at").eq("user_id",ctx.userId),
    ctx.supabase.from("xp_events").select("xp").eq("user_id",ctx.userId),
    ctx.supabase.from("quiz_attempts").select("score_percentage").eq("user_id",ctx.userId),
    ctx.supabase.from("practice_sessions").select("duration_seconds,practiced_at").eq("user_id",ctx.userId).order("practiced_at",{ascending:false}).limit(20),
    ctx.supabase.from("networks").select("id").eq("slug","worship").maybeSingle(),
  ]);

  const completed=(progress??[]).filter(p=>p.status==="completed").length;
  const total=Math.max((lessons??[]).length,1);
  const completion=Math.round((completed/total)*100);
  const totalXp=(xp??[]).reduce((s,r)=>s+(r.xp??0),0);
  const quizAverage=(attempts??[]).length ? Math.round((attempts??[]).reduce((s,r)=>s+Number(r.score_percentage??0),0)/(attempts??[]).length) : 0;
  const practiceMinutes=Math.round((practice??[]).reduce((s,r)=>s+(r.duration_seconds??0),0)/60);
  const nextLesson=(lessons??[]).find(l=>!(progress??[]).some(p=>p.lesson_id===l.id&&p.status==="completed"));

  const membership = worshipNetwork
    ? (await ctx.supabase
        .from("network_memberships")
        .select("id,role,status")
        .eq("user_id",ctx.userId)
        .eq("network_id",worshipNetwork.id)
        .maybeSingle()).data
    : null;

  let worshipSummary:null|{
    groupCode:string|null;
    nextService:any|null;
    assignment:any|null;
    response:any|null;
    rehearsal:any|null;
  }=null;

  if(membership?.status==="active" || ctx.isAdmin){
    const {data:memberProfile}=membership?.id
      ? await ctx.supabase.from("worship_member_profiles").select("group_code").eq("membership_id",membership.id).maybeSingle()
      : {data:null as any};

    const {data:schedules}=await ctx.supabase
      .from("worship_schedules")
      .select("id,title,starts_at,call_time,service_type,group_code,status")
      .gte("starts_at",new Date().toISOString())
      .neq("status","cancelled")
      .order("starts_at",{ascending:true})
      .limit(20);

    const scheduleIds=(schedules??[]).map((s:any)=>s.id);
    const {data:myAssignments}=membership?.id && scheduleIds.length
      ? await ctx.supabase
          .from("worship_schedule_members")
          .select("id,schedule_id,role,attendance_status")
          .eq("membership_id",membership.id)
          .in("schedule_id",scheduleIds)
      : {data:[] as any[]};

    const nextAssignment=(myAssignments??[])
      .map((a:any)=>({assignment:a,schedule:(schedules??[]).find((s:any)=>s.id===a.schedule_id)}))
      .filter((x:any)=>x.schedule)
      .sort((a:any,b:any)=>new Date(a.schedule.starts_at).getTime()-new Date(b.schedule.starts_at).getTime())[0]??null;

    const nextService=nextAssignment?.schedule ?? (ctx.isAdmin ? (schedules??[])[0] ?? null : null);
    const assignment=nextAssignment?.assignment ?? null;

    const {data:response}=assignment
      ? await ctx.supabase
          .from("worship_assignment_responses")
          .select("response_status,note,responded_at")
          .eq("assignment_id",assignment.id)
          .maybeSingle()
      : {data:null as any};

    const {data:rehearsal}=nextService
      ? await ctx.supabase
          .from("worship_rehearsals")
          .select("id,title,starts_at,location")
          .eq("schedule_id",nextService.id)
          .order("starts_at",{ascending:true})
          .limit(1)
          .maybeSingle()
      : {data:null as any};

    worshipSummary={
      groupCode:memberProfile?.group_code??nextService?.group_code??null,
      nextService,
      assignment,
      response,
      rehearsal,
    };
  }

  const responseLabel=worshipSummary?.response?.response_status==="confirmed"
    ?"Confirmado"
    :worshipSummary?.response?.response_status==="declined"
      ?"Não disponível"
      :"Aguardando resposta";

  return (
    <AppShell title="Dashboard" active="/dashboard" email={ctx.email}>
      <section className="hero-card">
        <p className="eyebrow">VISÃO GERAL</p>
        <h2>O que precisa da tua atenção agora.</h2>
        <p>Formação, prática e próximos compromissos do Ministério de Louvor reunidos num único ponto.</p>
      </section>

      <div className="grid grid-4" style={{marginTop:18}}>
        <div className="card metric"><span>Formação concluída</span><strong>{completion}%</strong><div className="progress"><span style={{width:`${completion}%`}} /></div></div>
        <div className="card metric"><span>XP oficial</span><strong>{totalXp}</strong></div>
        <div className="card metric"><span>Média dos quizzes</span><strong>{quizAverage}%</strong></div>
        <div className="card metric"><span>Prática recente</span><strong>{practiceMinutes}m</strong></div>
      </div>

      <div className="grid grid-2" style={{marginTop:18}}>
        <section className="hero-card">
          <p className="eyebrow">CONTINUAR FORMAÇÃO</p>
          <h2>{nextLesson?.title ?? "Percurso concluído"}</h2>
          <p>{nextLesson ? "Retoma o percurso de formação. A conclusão oficial e o XP são registados apenas na primeira aprovação." : "As aulas atualmente disponíveis já foram concluídas."}</p>
          {nextLesson
            ? <Link className="button primary" href={`/academy/${nextLesson.slug}`}>Abrir aula</Link>
            : <Link className="button" href="/academy">Rever Academy</Link>}
        </section>

        <section className="card">
          <p className="eyebrow">PRÓXIMO SERVIÇO</p>
          {worshipSummary?.nextService ? <>
            <div className="button-row">
              {worshipSummary.groupCode&&<span className="pill gold">Grupo {worshipSummary.groupCode}</span>}
              {worshipSummary.assignment&&<span className={worshipSummary.response?.response_status==="confirmed"?"pill ok":"pill gold"}>{responseLabel}</span>}
            </div>
            <h2 style={{marginTop:12}}>{worshipSummary.nextService.title}</h2>
            <p className="muted">
              {new Date(worshipSummary.nextService.starts_at).toLocaleString("pt-PT")}
              {worshipSummary.nextService.call_time ? ` · chegada ${new Date(worshipSummary.nextService.call_time).toLocaleString("pt-PT")}` : ""}
            </p>
            {worshipSummary.assignment&&<p><strong>{roleLabel(worshipSummary.assignment.role)}</strong></p>}
            {worshipSummary.rehearsal&&<div className="notice" style={{marginTop:12}}>
              Ensaio: <strong>{new Date(worshipSummary.rehearsal.starts_at).toLocaleString("pt-PT")}</strong>
              {worshipSummary.rehearsal.location ? ` · ${worshipSummary.rehearsal.location}` : ""}
            </div>}
            <div className="button-row" style={{marginTop:14}}>
              <Link className="button primary" href="/worship">Abrir escala</Link>
              <a className="button" href="/worship/calendar">Meu calendário</a>
            </div>
          </> : membership?.status==="active" || ctx.isAdmin ? <>
            <h2>Sem escala futura</h2>
            <p className="muted">Não há um compromisso futuro atribuído neste momento.</p>
            <Link className="button" href="/worship">Abrir área do Louvor</Link>
          </> : <>
            <h2>Ministério de Louvor</h2>
            <p className="muted">{membership?.status==="pending" ? "O teu pedido de acesso está em análise." : "Escalas, ensaios, repertório e disponibilidade ficam disponíveis após a ativação do acesso."}</p>
            <Link className="button" href="/worship">Ver área do Louvor</Link>
          </>}
        </section>
      </div>

      <div className="section-title"><h2>Acessos rápidos</h2></div>
      <div className="grid grid-4">
        <Link className="card" href="/academy"><p className="eyebrow">ACADEMY</p><h3>Formação</h3><p className="muted">Voz, instrumentos, técnica e quizzes.</p></Link>
        <Link className="card" href="/academy/resources"><p className="eyebrow">BIBLIOTECA</p><h3>Documentos</h3><p className="muted">Apostilas, PDFs e materiais de apoio.</p></Link>
        <Link className="card" href="/vocal-gym"><p className="eyebrow">PRÁTICA</p><h3>Vocal Gym</h3><p className="muted">Rotina guiada de aquecimento e técnica.</p></Link>
        <Link className="card" href="/worship"><p className="eyebrow">MINISTÉRIO</p><h3>Área do Louvor</h3><p className="muted">{ctx.isWorshipMember||ctx.isAdmin ? "Escalas, ensaios, repertório e avisos." : "Pedidos de acesso e recursos internos."}</p></Link>
      </div>
    </AppShell>
  );
}
