import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

export default async function AcademyPage() {
  const {supabase,userId,email}=await requireUser();
  const [{data:modules},{data:lessons},{data:progress}]=await Promise.all([
    supabase.from("academy_modules").select("id,slug,title,description,sort_order").order("sort_order"),
    supabase.from("academy_lessons").select("id,module_id,slug,title,summary,duration_minutes,xp_reward,sort_order").eq("active",true).order("sort_order"),
    supabase.from("lesson_progress").select("lesson_id,status,best_score_percentage").eq("user_id",userId)
  ]);
  return <AppShell title="Formação" active="/academy" email={email}>
    <section className="hero-card"><p className="eyebrow">REVIVER ACADEMY</p><h2>Formação vocal progressiva</h2><p>Da respiração à aplicação em equipa. Para avançar oficialmente, o quiz de cada aula exige pelo menos 70%.</p></section>
    {(modules??[]).map(m=>{
      const ml=(lessons??[]).filter(l=>l.module_id===m.id);
      return <section key={m.id}>
        <div className="section-title"><div><p className="eyebrow">MÓDULO {m.sort_order}</p><h2>{m.title}</h2></div><span className="muted small">{m.description}</span></div>
        {ml.length===0?<div className="empty">Conteúdo deste módulo está em curadoria.</div>:<div className="list">{ml.map(l=>{
          const p=(progress??[]).find(x=>x.lesson_id===l.id);
          return <Link className="list-row" href={`/academy/${l.slug}`} key={l.id}>
            <div><h3>{l.title}</h3><span className="muted small">{l.summary}</span></div>
            <div style={{textAlign:"right"}}><span className={p?.status==="completed"?"pill ok":"pill gold"}>{p?.status==="completed"?"Concluída":"Disponível"}</span><div className="muted small" style={{marginTop:6}}>{l.duration_minutes??"—"} min · {l.xp_reward} XP</div></div>
          </Link>
        })}</div>}
      </section>
    })}
  </AppShell>
}
