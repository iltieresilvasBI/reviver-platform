import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

export default async function AcademyResourcesPage(){
  const {supabase,email}=await requireUser();
  const {data:resources,error}=await supabase.from("academy_resources").select("id,title,description,category,resource_type,storage_path,external_url,mime_type,file_size_bytes,sort_order").eq("active",true).order("category").order("sort_order");
  const items=await Promise.all((resources??[]).map(async (r:any)=>{
    let href=r.external_url as string|null;
    if(!href&&r.storage_path){
      const {data}=await supabase.storage.from("academy-documents").createSignedUrl(r.storage_path,60*10);
      href=data?.signedUrl??null;
    }
    return {...r,href};
  }));
  const categories=[...new Set(items.map((x:any)=>x.category||"Geral"))];
  return <AppShell title="Recursos" active="/academy" email={email}>
    <div className="button-row" style={{marginBottom:18}}><Link className="button" href="/academy">← Voltar à Academy</Link></div>
    <section className="hero-card"><p className="eyebrow">REVIVER ACADEMY</p><h2>Biblioteca de apoio</h2><p>Apostilas, guias, partituras, letras e documentos de suporte às formações.</p></section>
    {error&&<div className="notice warn" style={{marginTop:18}}>{error.message}</div>}
    {categories.length===0?<div className="empty" style={{marginTop:20}}>A biblioteca está em preparação.</div>:categories.map(category=><section key={String(category)}>
      <div className="section-title"><h2>{String(category)}</h2></div>
      <div className="list">{items.filter((x:any)=>(x.category||"Geral")===category).map((r:any)=><div className="list-row" key={r.id}><div><span className="pill gold">{r.resource_type}</span><h3 style={{marginTop:8}}>{r.title}</h3><span className="muted small">{r.description||"Material de apoio"}{r.file_size_bytes?" · "+Math.round(Number(r.file_size_bytes)/1024)+" KB":""}</span></div>{r.href?<a className="button primary" href={r.href} target="_blank" rel="noopener noreferrer">Abrir</a>:<span className="pill">Indisponível</span>}</div>)}</div>
    </section>)}
  </AppShell>
}