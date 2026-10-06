import { notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getAccessContext } from "@/lib/auth";

export default async function ContentPreview({params}:{params:Promise<{id:string}>}){
  const {id}=await params; const ctx=await getAccessContext();
  if(!(ctx.isAdmin||ctx.isMediaEditor||ctx.isMediaLeader)) notFound();
  const {data:item}=await ctx.supabase.from("content_items").select("*").eq("id",id).maybeSingle(); if(!item) notFound();
  const {data:media}=await ctx.supabase.from("content_media").select("*").eq("content_item_id",id).order("sort_order");
  const cover=media?.find((m:any)=>m.media_type==="cover")??media?.[0];
  return <AppShell title="Pré-visualização" active="/media" email={ctx.email}>
    <div className="button-row" style={{marginBottom:18}}><Link className="button" href="/media">Voltar</Link><Link className="button" href={`/media/edit/${id}`}>Editar</Link><span className="pill gold">PREVIEW · {item.status}</span></div>
    <article className="hero-card">
      {cover?.external_url&&<img src={cover.external_url} alt={cover.alt_text??item.title} style={{width:"100%",maxHeight:420,objectFit:"cover",borderRadius:16,marginBottom:22}}/>}
      <p className="eyebrow">{item.content_type}</p><h2>{item.title}</h2><p>{item.summary}</p>
      {item.youtube_id&&<div className="video-wrap" style={{marginTop:18}}><iframe src={`https://www.youtube-nocookie.com/embed/${item.youtube_id}`} title={item.title} allowFullScreen/></div>}
      {item.body&&<div style={{whiteSpace:"pre-wrap",lineHeight:1.7,marginTop:18}}>{item.body}</div>}
      {item.event_start&&<p className="notice" style={{marginTop:18}}>{new Date(item.event_start).toLocaleString("pt-PT")} {item.event_location?`· ${item.event_location}`:""}</p>}
      {item.cta_label&&item.cta_url&&<a className="button primary" href={item.cta_url} style={{marginTop:18}}>{item.cta_label}</a>}
    </article>
  </AppShell>
}
