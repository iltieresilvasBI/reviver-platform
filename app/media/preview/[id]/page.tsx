import { notFound } from "next/navigation";
import Link from "next/link";
import { PublicSiteShell } from "@/components/public-site-shell";
import { getAccessContext } from "@/lib/auth";

export default async function ContentPreview({params}:{params:Promise<{id:string}>}){
  const {id}=await params; const ctx=await getAccessContext();
  if(!(ctx.isAdmin||ctx.isMediaEditor||ctx.isMediaLeader)) notFound();
  const {data:item}=await ctx.supabase.from("content_items").select("*").eq("id",id).maybeSingle(); if(!item) notFound();
  const {data:media}=await ctx.supabase.from("content_media").select("*").eq("content_item_id",id).order("sort_order");
  const cover=media?.find((m:any)=>m.media_type==="cover")??media?.[0];
  return <PublicSiteShell>
    <div style={{background:"#2c2519",borderBottom:"1px solid #5f4a22",padding:"10px 22px",textAlign:"center",fontSize:13}}>
      PRÉ-VISUALIZAÇÃO INTERNA · {item.status} · <Link href="/media" style={{textDecoration:"underline"}}>voltar ao CMS</Link>
    </div>
    <main style={{maxWidth:900,margin:"0 auto",padding:"60px 22px"}}>
      {cover?.external_url&&<img src={cover.external_url} alt={cover.alt_text??item.title} style={{width:"100%",maxHeight:520,objectFit:"cover",borderRadius:20}}/>}
      <p className="eyebrow" style={{marginTop:28}}>{item.content_type}</p>
      <h1 style={{fontSize:"clamp(44px,7vw,78px)",letterSpacing:"-.055em",margin:"10px 0"}}>{item.title}</h1>
      <p className="muted" style={{fontSize:19,lineHeight:1.7}}>{item.summary}</p>
      {item.youtube_id&&<div className="video-wrap" style={{marginTop:24}}><iframe src={`https://www.youtube-nocookie.com/embed/${item.youtube_id}`} title={item.title} allowFullScreen/></div>}
      {item.event_start&&<div className="notice" style={{marginTop:22}}>{new Date(item.event_start).toLocaleString("pt-PT")}{item.event_location?` · ${item.event_location}`:""}</div>}
      {item.body&&<div style={{whiteSpace:"pre-wrap",lineHeight:1.8,marginTop:26}}>{item.body}</div>}
      {item.cta_label&&item.cta_url&&<a className="button primary" href={item.cta_url} style={{marginTop:24}}>{item.cta_label}</a>}
    </main>
  </PublicSiteShell>
}
