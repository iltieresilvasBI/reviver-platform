import { PublicSiteShell } from "@/components/public-site-shell";
import { ContentCard } from "@/components/content-card";
import { listPublishedContent } from "@/lib/public-content";
export default async function Page(){
  const items=await listPublishedContent("campaign" as const,new URLSearchParams("limit=100"));
  return <PublicSiteShell><main style={{maxWidth:1180,margin:"0 auto",padding:"70px 22px"}}><p className="eyebrow">IGREJA REVIVER</p><h1 style={{fontSize:"clamp(48px,8vw,92px)",letterSpacing:"-.06em",margin:"12px 0 34px"}}>Campanhas</h1>{items.length?<div className="grid grid-3">{items.map((x:any)=><ContentCard key={x.id} item={x} href={`/campanhas/${x.slug}`}/>)}</div>:<div className="empty">Ainda não há conteúdos publicados nesta área.</div>}</main></PublicSiteShell>
}