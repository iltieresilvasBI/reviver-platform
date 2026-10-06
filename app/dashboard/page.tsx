import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getAccessContext } from "@/lib/auth";

export default async function DashboardPage() {
  const ctx = await getAccessContext();
  const [{ data: lessons }, { data: progress }, { data: xp }, { data: attempts }, { data: practice }] = await Promise.all([
    ctx.supabase.from("academy_lessons").select("id,title,slug,xp_reward").eq("active", true),
    ctx.supabase.from("lesson_progress").select("lesson_id,status,best_score_percentage,first_completed_at").eq("user_id",ctx.userId),
    ctx.supabase.from("xp_events").select("xp").eq("user_id",ctx.userId),
    ctx.supabase.from("quiz_attempts").select("score_percentage").eq("user_id",ctx.userId),
    ctx.supabase.from("practice_sessions").select("duration_seconds,practiced_at").eq("user_id",ctx.userId).order("practiced_at",{ascending:false}).limit(20),
  ]);

  const completed=(progress??[]).filter(p=>p.status==="completed").length;
  const total=Math.max((lessons??[]).length,1);
  const completion=Math.round((completed/total)*100);
  const totalXp=(xp??[]).reduce((s,r)=>s+(r.xp??0),0);
  const quizAverage=(attempts??[]).length ? Math.round((attempts??[]).reduce((s,r)=>s+Number(r.score_percentage??0),0)/(attempts??[]).length) : 0;
  const practiceMinutes=Math.round((practice??[]).reduce((s,r)=>s+(r.duration_seconds??0),0)/60);
  const nextLesson=(lessons??[]).find(l=>!(progress??[]).some(p=>p.lesson_id===l.id&&p.status==="completed"));

  return (
    <AppShell title="Dashboard" active="/dashboard" email={ctx.email}>
      <div className="grid grid-4">
        <div className="card metric"><span>Formação concluída</span><strong>{completion}%</strong><div className="progress"><span style={{width:`${completion}%`}} /></div></div>
        <div className="card metric"><span>XP oficial</span><strong>{totalXp}</strong></div>
        <div className="card metric"><span>Média dos quizzes</span><strong>{quizAverage}%</strong></div>
        <div className="card metric"><span>Prática recente</span><strong>{practiceMinutes}m</strong></div>
      </div>

      <section className="hero-card" style={{marginTop:18}}>
        <p className="eyebrow">CONTINUAR FORMAÇÃO</p>
        <h2>{nextLesson?.title ?? "Percurso concluído"}</h2>
        <p>{nextLesson ? "Retoma o percurso de formação. A conclusão oficial e o XP são registados apenas na primeira aprovação." : "As aulas atualmente disponíveis já foram concluídas."}</p>
        {nextLesson && <Link className="button primary" href={`/academy/${nextLesson.slug}`}>Abrir aula</Link>}
      </section>

      <div className="section-title"><h2>Acessos</h2></div>
      <div className="grid grid-3">
        <Link className="card" href="/academy"><p className="eyebrow">ACADEMY</p><h3>Formação vocal</h3><p className="muted">Aulas, exercícios e quizzes.</p></Link>
        <Link className="card" href="/vocal-gym"><p className="eyebrow">PRÁTICA</p><h3>Vocal Gym</h3><p className="muted">Rotina guiada de aquecimento e técnica.</p></Link>
        <Link className="card" href="/worship"><p className="eyebrow">MINISTÉRIO</p><h3>Área do Louvor</h3><p className="muted">{ctx.isWorshipMember||ctx.isAdmin ? "Escalas, ensaios, repertório e avisos." : "Solicita acesso quando o teu email estiver verificado."}</p></Link>
      </div>
    </AppShell>
  );
}
