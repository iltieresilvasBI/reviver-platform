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

const vocalTracks=[
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

const instrumentTracks=[
  {
    title:"Violão",
    description:"Acordes, ritmo, transposição, levadas e acompanhamento de louvor.",
    status:"Curadoria em andamento",
  },
  {
    title:"Guitarra",
    description:"Base, timbres, dinâmica, riffs, ambientação e linguagem para ministério de louvor.",
    status:"Curadoria em andamento",
  },
  {
    title:"Baixo",
    description:"Fundamentos, postura, afinação, digitação, groove e construção de linhas para louvor.",
    status:"Conteúdo em português selecionado",
    videoId:"6xIgTuBqpIM",
  },
  {
    title:"Bateria",
    description:"Primeiros ritmos, condução, viradas, dinâmica e aplicação em contexto de igreja.",
    status:"Conteúdo em português selecionado",
    videoId:"UqdUcZ1AK_k",
  },
  {
    title:"Teclado / Piano",
    description:"Acordes, inversões, cifras, ambiência, pads e acompanhamento de louvores.",
    status:"Conteúdo em português selecionado",
    videoId:"Kmtff3WkU38",
  },
] as const;

const technicalTracks=[
  {
    title:"Iluminação de Igreja",
    description:"Fundamentos de iluminação, cenas, operação segura, organização de palco e introdução ao DMX.",
    status:"Curadoria em andamento",
  },
  {
    title:"Behringer X32",
    description:"Fluxo de sinal, canais, buses, monitores, efeitos, cenas e operação prática da X32.",
    status:"Conteúdo em português selecionado",
    videoId:"DUW9eiutCLY",
  },
] as const;

function trackForModule(module:AcademyModule){
  return module.slug==="worship"?"backing":"lead";
}

function CuratedTrackCard({title,description,status,videoId}:{title:string;description:string;status:string;videoId?:string}){
  return <article className="card">
    <p className="eyebrow">{status}</p>
    <h3 style={{fontSize:22,marginBottom:8}}>{title}</h3>
    <p className="muted" style={{lineHeight:1.65}}>{description}</p>
    {videoId?<div className="video-wrap" style={{marginTop:16}}><iframe src={`https://www.youtube-nocookie.com/embed/${videoId}`} title={title} allowFullScreen /></div>:<div className="empty" style={{marginTop:16}}>Aulas em curadoria. Só serão publicados vídeos em português ou oficialmente dublados.</div>}
  </article>
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
      <h2>Formação para voz, instrumentos e equipa técnica</h2>
      <p>Trilhas progressivas para Cantor Principal, Backing Vocals, músicos e equipa técnica. Os vídeos publicados na Academy devem estar em português ou oficialmente dublados.</p>
    </section>

    <div className="section-title"><div><p className="eyebrow">FORMAÇÃO VOCAL</p><h2>Voz no ministério de louvor</h2></div><span className="muted small">Progresso e quizzes continuam ativos nas aulas vocais.</span></div>
    {vocalTracks.map(track=>{
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

    <section style={{marginTop:34}}>
      <div className="section-title"><div><p className="eyebrow">INSTRUMENTOS</p><h2>Formação para músicos</h2></div><span className="muted small">Base técnica aplicada ao contexto de louvor.</span></div>
      <div className="grid grid-2">{instrumentTracks.map(track=><CuratedTrackCard key={track.title} {...track}/>)}</div>
    </section>

    <section style={{marginTop:34}}>
      <div className="section-title"><div><p className="eyebrow">EQUIPA TÉCNICA</p><h2>Som e iluminação</h2></div><span className="muted small">Operação prática para cultos, ensaios e eventos.</span></div>
      <div className="grid grid-2">{technicalTracks.map(track=><CuratedTrackCard key={track.title} {...track}/>)}</div>
    </section>
  </AppShell>
}
