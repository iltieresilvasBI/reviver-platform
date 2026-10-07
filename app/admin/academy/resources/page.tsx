import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getAccessContext } from "@/lib/auth";
import { AcademyResourceUpload } from "./resource-upload";

export default async function AcademyResourcesAdmin(){
  const ctx=await getAccessContext();
  if(!ctx.isAdmin) return <AppShell title="Recursos Academy" active="/admin" email={ctx.email}><div className="empty">Acesso reservado a Admin.</div></AppShell>;
  const {data:resources,error}=await ctx.supabase.from("academy_resources").select("id,title,description,category,resource_type,storage_path,mime_type,file_size_bytes,active,created_at").order("created_at",{ascending:false});
  return <AppShell title="Repositório Academy" active="/admin" email={ctx.email}>
    <div className="button-row" style={{marginBottom:18}}><Link className="button" href="/admin/academy">← Gestão da Academy</Link><Link className="button" href="/academy/resources">Ver como aluno</Link></div>
    <section className="hero-card"><p className="eyebrow">BIBLIOTECA DIGITAL</p><h2>Apostilas, guias, partituras e documentos.</h2><p>Os ficheiros ficam num bucket privado. Apenas utilizadores autenticados da Academy podem aceder.</p></section>
    <div className="section-title"><h2>Adicionar recurso</h2></div>
    <AcademyResourceUpload/>
    <div className="section-title"><h2>Recursos existentes</h2><span className="muted small">{resources?.length??0} itens</span></div>
    {error?<div className="notice warn">{error.message}</div>:<div className="list">{(resources??[]).length===0?<div className="empty">Ainda não existem recursos.</div>:(resources??[]).map((r:any)=><div className="list-row" key={r.id}><div><span className="pill">{r.category}</span> <span className="pill gold">{r.resource_type}</span><h3 style={{marginTop:8}}>{r.title}</h3><span className="muted small">{r.description||"Sem descrição"} · {r.file_size_bytes?Math.round(Number(r.file_size_bytes)/1024)+" KB":"tamanho indisponível"}</span></div><span className={r.active?"pill ok":"pill"}>{r.active?"Ativo":"Inativo"}</span></div>)}</div>}
  </AppShell>
}