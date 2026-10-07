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

const vocalLeadSlugs=new Set(["fundamentos","controle","desenvolvimento","aplicacao"]);
const backingSlugs=new Set(["worship"]);
const instrumentSlugs=new Set(["violao","guitarra","baixo","bateria","teclado-piano"]);
const technicalSlugs=new Set(["behringer-x32"]);

function ModuleBlock({module,lessons,progress}:{module:AcademyModule;lessons:any[];progress:any[]}){
  const ml=lessons.filter(l=>l.module_id===module.id);
  const displayTitle=module.slug==="worship"?"Harmonia e Backing Vocals":module.title;
  return <section className="card" style={{marginBottom:18}}>
    <div className="section-title" style={{marginTop:0}}>
      <div><p className="eyebrow">ETAPA {module.sort_order}</p><h2>{displayTitle}</h2></div>
      <span className="muted small">{module.description}</span>
    </div>
    {ml.length===0?<div className="empty">Conteúdo deste módulo está em curadoria.</div>:<div className="list">{ml.map(l=>{
      const p=progress.find(x=>x.lesson_id===l.id);
      return <Link className="list-row" href={`/academy/${l.slug}`} key={l.id}>
        <div><h3>{l.title}</h3><span className="muted small">{l.summary}</span></div>
        <div style={{textAlign:"right"}}>
          <span className={p?.status==="completed"?"pill ok":"pill gold"}>{p?.status==="completed"?"Concluída":"Disponível"}</span>
          <div className="muted small" style={{marginTop:6}}>{l.duration_minutes??"—"} min · {l.xp_reward} XP</div>
        </div>
      </Link>
    })}</div>}
  </section>
}

export default async function AcademyPage() {
  const {supabase,userId,email}=await requireUser();
  const [{data:modules},{data:lessons},{data:progress}]=await Promise.all([
    supabase.from("academy_modules").select("id,slug,title,description,sort_order").order("sort_order"),
    supabase.from("academy_lessons").select("id,module_id,slug,title,summary,duration_minutes,xp_reward,sort_order").eq("active",true).order("sort_order"),
    supabase.from("lesson_progress").select("lesson_id,status,best_score_percentage").eq("user_id",userId)
  ]);
  const ms=(modules??[]) as AcademyModule[];
  const ls=lessons??[];
  const ps=progress??[];

  return <AppShell title="Formação" active="/academy" email={email}>
    <div className="button-row" style={{marginBottom:18}}><Link className="button" href="/academy/resources">Biblioteca de recursos</Link></div>
    <section className="hero-card">
      <p className="eyebrow">REVIVER ACADEMY</p>
      <h2>Formação para voz, instrumentos e equipa técnica</h2>
      <p>Trilhas com aulas, exercícios, quizzes e progresso. Os vídeos publicados devem estar em português ou oficialmente dublados.</p>
    </section>

    <section style={{marginTop:30}}>
      <div className="section-title"><div><p className="eyebrow">TRILHA VOCAL 1</p><h2>Cantor Principal (Lead)</h2></div><span className="muted small">Respiração, controlo, desenvolvimento e aplicação da voz principal.</span></div>
      {ms.filter(m=>vocalLeadSlugs.has(m.slug)).map(m=><ModuleBlock key={m.id} module={m} lessons={ls} progress={ps}/>)}
    </section>

    <section style={{marginTop:30}}>
      <div className="section-title"><div><p className="eyebrow">TRILHA VOCAL 2</p><h2>Backing Vocals</h2></div><span className="muted small">Harmonia, segunda e terceira voz e integração com o cantor principal.</span></div>
      {ms.filter(m=>backingSlugs.has(m.slug)).map(m=><ModuleBlock key={m.id} module={m} lessons={ls} progress={ps}/>)}
    </section>

    <section style={{marginTop:34}}>
      <div className="section-title"><div><p className="eyebrow">INSTRUMENTOS</p><h2>Formação para músicos</h2></div><span className="muted small">Cada percurso já participa no sistema de XP, progresso e quiz.</span></div>
      {ms.filter(m=>instrumentSlugs.has(m.slug)).map(m=><ModuleBlock key={m.id} module={m} lessons={ls} progress={ps}/>)}
    </section>

    <section style={{marginTop:34}}>
      <div className="section-title"><div><p className="eyebrow">EQUIPA TÉCNICA</p><h2>Som e operação</h2></div><span className="muted small">Treino técnico aplicado a cultos, ensaios e eventos.</span></div>
      {ms.filter(m=>technicalSlugs.has(m.slug)).map(m=><ModuleBlock key={m.id} module={m} lessons={ls} progress={ps}/>)}
      <article className="card">
        <p className="eyebrow">EM CURADORIA</p>
        <h3 style={{fontSize:22,marginBottom:8}}>Iluminação de Igreja</h3>
        <p className="muted">Fundamentos de iluminação, cenas, operação segura, organização de palco e introdução ao DMX.</p>
        <div className="empty" style={{marginTop:16}}>A trilha será publicada quando a aula-base em português estiver validada.</div>
      </article>
    </section>
  </AppShell>
}
