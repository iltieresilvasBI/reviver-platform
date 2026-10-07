import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

type AcademyModule={
  id:string;
  slug:string;
  title:string;
  description:string|null;
  sort_order:number;
};

const tracks=[
  {
    key:"lead",
    eyebrow:"TRILHA 1",
    title:"Cantor Principal (Lead)",
    description:"Fundamentos, controlo e aplicação para quem conduz a melodia principal.",
  },
  {
    key:"backing",
    eyebrow:"TRILHA 2",
    title:"Backing Vocals",
    description:"Harmonia, segunda e terceira voz e integração vocal com a equipa de louvor.",
  },
] as const;

function trackForModule(module:AcademyModule){
  return module.slug==="worship"?"backing":"lead";
}

export default async function AcademyPage() {
  const {supabase,userId,email}=await requireUser();
  const [{data:modules},{data:lessons},{data:progress}]=await Promise.all([
    supabase.from("academy_modules").select("id,slug,title,description,sort_order").order("sort_order"),
    supabase.from("academy_lessons").select("id,module_id,slug,title,summary,duration_minutes,xp_reward,sort_order").eq("active",true).order("sort_order"),
    supabase.from("lesson_progress").select("lesson_id,status,best_score_percentage").eq("user_id",userId)
  ]);

  return <AppShell title="Formação" active="/academy" email={email}>
    <section className="hero-card">
      <p className="eyebrow">REVIVER ACADEMY</p>
      <h2>Formação vocal por função no louvor</h2>
      <p>Escolhe a trilha de Cantor Principal (Lead) ou Backing Vocals. Para avançar oficialmente, o quiz de cada aula exige pelo menos 70%.</p>
    </section>

    {tracks.map(track=>{
      const trackModules=(modules??[]).filter(m=>trackForModule(m as AcademyModule)===track.key);
      return <section key={track.key} style={{marginTop:30}}>
        <div className="section-title">
          <div><p className="eyebrow">{track.eyebrow}</p><h2>{track.title}</h2></div>
          <span className="muted small">{track.description}</span>
        </div>

        {trackModules.length===0?<div className="empty">Conteúdo desta trilha está em curadoria.</div>:trackModules.map(m=>{
          const ml=(lessons??[]).filter(l=>l.module_id===m.id);
          const displayTitle=m.slug==="worship"?"Harmonia e Backing Vocals":m.title;
          return <section key={m.id} className="card" style={{marginBottom:18}}>
            <div className="section-title" style={{marginTop:0}}>
              <div><p className="eyebrow">ETAPA {m.sort_order}</p><h2>{displayTitle}</h2></div>
              <span className="muted small">{m.description}</span>
            </div>
            {ml.length===0?<div className="empty">Conteúdo deste módulo está em curadoria.</div>:<div className="list">{ml.map(l=>{
              const p=(progress??[]).find(x=>x.lesson_id===l.id);
              return <Link className="list-row" href={`/academy/${l.slug}`} key={l.id}>
                <div><h3>{l.title}</h3><span className="muted small">{l.summary}</span></div>
                <div style={{textAlign:"right"}}>
                  <span className={p?.status==="completed"?"pill ok":"pill gold"}>{p?.status==="completed"?"Concluída":"Disponível"}</span>
                  <div className="muted small" style={{marginTop:6}}>{l.duration_minutes??"—"} min · {l.xp_reward} XP</div>
                </div>
              </Link>
            })}</div>}
          </section>
        })}
      </section>
    })}
  </AppShell>
}
