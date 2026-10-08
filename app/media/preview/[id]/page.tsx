import { notFound } from "next/navigation";
import Link from "next/link";
import { getAccessContext } from "@/lib/auth";
import { getSiteDynamicData } from "@/lib/site-data";
import { SitePage, type SiteDynamicData } from "@/components/site-exact";
import { PublicSiteShell } from "@/components/public-site-shell";

function categoryFor(slug?:string|null){
  return slug==="kids"?"Kids":slug==="youth"?"Jovens":slug==="women"?"Mulheres":slug==="men"?"Homens":slug==="worship"?"Louvor":"Geral";
}
function publicNetworkSlug(slug?:string|null){
  return slug==="youth"?"jovens":slug==="women"?"mulheres":slug==="men"?"homens":slug??null;
}
function localDate(iso:string|null){return iso?new Date(iso).toISOString().slice(0,10):null}
function localTime(iso:string|null){return iso?new Date(iso).toLocaleTimeString("pt-PT",{hour:"2-digit",minute:"2-digit",timeZone:"Europe/Lisbon"}):"A confirmar"}
function period(start:string|null,end:string|null){
  if(!start&&!end)return "Período a confirmar";
  const f=(v:string)=>new Date(v).toLocaleDateString("pt-PT",{timeZone:"Europe/Lisbon"});
  return start&&end?`${f(start)} — ${f(end)}`:f((start||end)!);
}

export default async function ContentPreview({params}:{params:Promise<{id:string}>}){
  const {id}=await params; const ctx=await getAccessContext();
  if(!(ctx.isAdmin||ctx.isMediaEditor||ctx.isMediaLeader)) notFound();

  const [{data:item},{data:media},{data:links},base]=await Promise.all([
    ctx.supabase.from("content_items").select("*").eq("id",id).maybeSingle(),
    ctx.supabase.from("content_media").select("*").eq("content_item_id",id).order("sort_order"),
    ctx.supabase.from("content_item_networks").select("network_id,networks(slug)").eq("content_item_id",id),
    getSiteDynamicData(),
  ]);
  if(!item)notFound();

  const networkSlug=(links?.[0] as any)?.networks?.slug??null;
  const cover=(media??[]).find((m:any)=>m.media_type==="cover")??media?.[0];
  const image=cover?.external_url??"";
  const data:SiteDynamicData={events:[...base.events],campaigns:[...base.campaigns],news:[...base.news],videos:[...base.videos],highlights:[...base.highlights],galleries:[...base.galleries],visuals:base.visuals};
  let previewPath="";

  if(item.content_type==="event"){
    data.events=[{
      slug:item.slug,name:item.title,date:localDate(item.event_start),time:localTime(item.event_start),
      location:item.event_location||"Local a confirmar",description:item.summary||item.body||"",
      category:categoryFor(networkSlug),image,demo:false
    },...data.events.filter(x=>x.slug!==item.slug)];
    previewPath=`eventos/${item.slug}`;
  }else if(item.content_type==="campaign"){
    data.campaigns=[{
      slug:item.slug,name:item.title,description:item.summary||item.body||"",
      period:period(item.campaign_start,item.campaign_end),
      status:(item.campaign_end&&new Date(item.campaign_end)<new Date()?"encerrada":"ativa") as "ativa"|"encerrada",
      image,cta:item.cta_label||"Conhecer a campanha",demo:false,featured:Boolean(item.featured)
    },...data.campaigns.filter(x=>x.slug!==item.slug)];
    previewPath=`campanhas/${item.slug}`;
  }else if(item.content_type==="post"){
    data.news=[{slug:item.slug,title:item.title,category:categoryFor(networkSlug),text:item.summary||item.body||""},...data.news.filter(x=>x.slug!==item.slug)];
    previewPath=`acontece/${item.slug}`;
  }else if(item.content_type==="video"&&item.youtube_id){
    data.videos=[{id:item.youtube_id,title:item.title,category:networkSlug==="worship"?"Louvor":"Especiais",description:item.summary||item.body||""},...data.videos.filter(x=>x.id!==item.youtube_id)];
    previewPath="midia";
  }else if(item.content_type==="home_highlight"){
    data.highlights=[{
      id:item.id,slug:item.slug,title:item.title,summary:item.summary||item.body||"",image,
      ctaLabel:item.cta_label||"Saber mais",ctaUrl:item.cta_url||"/contactos",featured:Boolean(item.featured),priority:Number(item.priority||0)
    },...data.highlights.filter(x=>x.id!==item.id)];
    previewPath="";
  }else if(item.content_type==="gallery"){
    data.galleries=[{
      id:item.id,slug:item.slug,title:item.title,summary:item.summary||item.body||"",network:publicNetworkSlug(networkSlug),
      images:(media??[]).filter((m:any)=>m.external_url).map((m:any)=>({url:m.external_url,alt:m.alt_text||item.title}))
    },...data.galleries.filter(x=>x.id!==item.id)];
    previewPath=publicNetworkSlug(networkSlug)&&["kids","jovens","mulheres","homens"].includes(publicNetworkSlug(networkSlug)!)
      ?"redes/"+publicNetworkSlug(networkSlug)
      :"midia";
  }else{
    return <PublicSiteShell>
      <div className="cms-preview-bar">PRÉ-VISUALIZAÇÃO INTERNA · {item.status} · <Link href="/media">voltar ao CMS</Link></div>
      <main style={{maxWidth:900,margin:"0 auto",padding:"60px 22px"}}>
        {image&&<img src={image} alt={cover?.alt_text??item.title} style={{width:"100%",maxHeight:520,objectFit:"cover",borderRadius:20}}/>}
        <p className="eyebrow" style={{marginTop:28}}>{item.content_type}</p>
        <h1 style={{fontSize:"clamp(44px,7vw,78px)",letterSpacing:"-.055em",margin:"10px 0"}}>{item.title}</h1>
        <p className="muted" style={{fontSize:19,lineHeight:1.7}}>{item.summary}</p>
        {item.body&&<div style={{whiteSpace:"pre-wrap",lineHeight:1.8,marginTop:26}}>{item.body}</div>}
      </main>
    </PublicSiteShell>;
  }

  return <div>
    <div className="cms-preview-bar">PRÉ-VISUALIZAÇÃO INTERNA · {item.status} · <Link href="/media">voltar ao CMS</Link></div>
    <SitePage path={previewPath} data={data}/>
  </div>;
}
