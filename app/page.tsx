import Link from "next/link";
import { PublicSiteShell } from "@/components/public-site-shell";
import { ContentCard } from "@/components/content-card";
import { listPublishedContent } from "@/lib/public-content";

export default async function HomePage(){
  const [highlights,events,videos,campaigns,posts]=await Promise.all([
    listPublishedContent("home_highlight",new URLSearchParams("featured=true&limit=3")),
    listPublishedContent("event",new URLSearchParams("limit=3")),
    listPublishedContent("video",new URLSearchParams("limit=3")),
    listPublishedContent("campaign",new URLSearchParams("limit=2")),
    listPublishedContent("post",new URLSearchParams("limit=3")),
  ]);
  return <PublicSiteShell><main>
    <section style={{maxWidth:1180,margin:"0 auto",padding:"92px 22px 50px"}}>
      <p className="eyebrow">IGREJA REVIVER</p>
      <h1 style={{fontSize:"clamp(64px,11vw,132px)",lineHeight:.86,letterSpacing:"-.07em",margin:"22px 0",maxWidth:1000}}>Viver.<br/>Crescer.<br/>Servir.</h1>
      <p className="muted" style={{fontSize:20,lineHeight:1.7,maxWidth:700}}>Um ecossistema digital para acompanhar o que acontece na Reviver, participar das redes e crescer através da Reviver Academy.</p>
      <div className="button-row" style={{marginTop:28}}><Link className="button primary" href="/eventos">Próximos eventos</Link><Link className="button" href="/login">Entrar na Academy</Link></div>
    </section>
    {highlights.length>0&&<section style={{maxWidth:1180,margin:"0 auto",padding:"30px 22px"}}><div className="section-title"><h2>Destaques do mês</h2></div><div className="grid grid-3">{highlights.map((x:any)=><ContentCard key={x.id} item={x}/>)}</div></section>}
    <section style={{maxWidth:1180,margin:"0 auto",padding:"30px 22px"}}><div className="section-title"><h2>Próximos eventos</h2><Link href="/eventos" className="muted small">Ver todos</Link></div>{events.length?<div className="grid grid-3">{events.map((x:any)=><ContentCard key={x.id} item={x} href={`/eventos/${x.slug}`}/>)}</div>:<div className="empty">Os próximos eventos serão publicados aqui.</div>}</section>
    <section style={{maxWidth:1180,margin:"0 auto",padding:"30px 22px"}}><div className="section-title"><h2>Acontece na Reviver</h2></div><div className="grid grid-3">{posts.length?posts.map((x:any)=><ContentCard key={x.id} item={x} href={`/noticias/${x.slug}`}/>):<div className="empty">Novidades em breve.</div>}</div></section>
    <section style={{maxWidth:1180,margin:"0 auto",padding:"30px 22px"}}><div className="section-title"><h2>Mídia</h2><Link href="/midia" className="muted small">Ver biblioteca</Link></div><div className="grid grid-3">{videos.length?videos.map((x:any)=><ContentCard key={x.id} item={x} href={`/midia/${x.slug}`}/>):<div className="empty">Vídeos em breve.</div>}</div></section>
    {campaigns.length>0&&<section style={{maxWidth:1180,margin:"0 auto",padding:"30px 22px"}}><div className="section-title"><h2>Campanhas</h2></div><div className="grid grid-2">{campaigns.map((x:any)=><ContentCard key={x.id} item={x} href={`/campanhas/${x.slug}`}/>)}</div></section>}
  </main></PublicSiteShell>
}
