import { PublicSiteShell } from "@/components/public-site-shell";
import { ContentCard } from "@/components/content-card";
import { listPublishedContent } from "@/lib/public-content";

export default async function Page(){
  let items:any[]=[];
  let unavailable=false;
  try{
    items=await listPublishedContent("post" as const,new URLSearchParams("limit=100"));
  }catch(error){
    console.error("public news unavailable",error);
    unavailable=true;
  }
  return <PublicSiteShell><main style={{maxWidth:1180,margin:"0 auto",padding:"70px 22px"}}>
    <p className="eyebrow">IGREJA REVIVER</p>
    <h1 style={{fontSize:"clamp(48px,8vw,92px)",letterSpacing:"-.06em",margin:"12px 0 34px"}}>Notícias</h1>
    {unavailable&&<div className="notice warn" style={{marginBottom:18}}>As notícias estão temporariamente indisponíveis. Tenta novamente dentro de alguns instantes.</div>}
    {items.length?<div className="grid grid-3">{items.map((x:any)=><ContentCard key={x.id} item={x} href={`/noticias/${x.slug}`}/>)}</div>:!unavailable?<div className="empty">Ainda não há conteúdos publicados nesta área.</div>:null}
  </main></PublicSiteShell>
}
