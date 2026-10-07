import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getAccessContext } from "@/lib/auth";
import { ResourceUpload } from "./resource-upload";
import { addExternalResource, deleteResource } from "./actions";

export default async function AdminLibrary({searchParams}:{searchParams:Promise<{message?:string}>}){
  const qs=await searchParams; const ctx=await getAccessContext();
  if(!ctx.isAdmin)return <AppShell title="Biblioteca" active="/admin" email={ctx.email}><div className="empty">Acesso reservado a Admin.</div></AppShell>;
  const {data:resources}=await ctx.supabase.from("academy_resources").select("*").order("category").order("sort_order").order("created_at",{ascending:false});
  return <AppShell title="Biblioteca de Documentos" active="/admin" email={ctx.email}>
    <div className="button-row" style={{marginBottom:18}}><Link className="button" href="/admin">← Centro de Administração</Link><Link className="button" href="/library">Ver biblioteca</Link></div>
    {qs.message&&<div className="notice" style={{marginBottom:16}}>{qs.message}</div>}
    <div className="grid grid-2">
      <ResourceUpload/>
      <form action={addExternalResource} className="card form-grid">
        <p className="eyebrow">LINK EXTERNO</p>
        <div className="field"><label>Título</label><input name="title" required/></div>
        <div className="field"><label>Descrição</label><textarea name="description" rows={3}/></div>
        <div className="field"><label>Categoria</label><select name="category" defaultValue="Geral"><option>Formação Vocal</option><option>Louvor</option><option>Repertório</option><option>Técnica Vocal</option><option>Governança</option><option>Geral</option></select></div>
        <div className="field"><label>URL</label><input name="external_url" type="url" required placeholder="https://..."/></div>
        <button className="button primary">Adicionar link</button>
      </form>
    </div>

    <div className="section-title"><h2>Materiais</h2><span className="muted small">{(resources??[]).length} itens</span></div>
    <div className="list">{(resources??[]).length===0?<div className="empty">Nenhum material cadastrado.</div>:(resources??[]).map((r:any)=><div className="list-row" key={r.id}>
      <div><span className="pill gold">{r.resource_type}</span><h3 style={{marginTop:8}}>{r.title}</h3><span className="muted small">{r.category} · {r.active?"ativo":"inativo"}</span></div>
      <form action={deleteResource}><input type="hidden" name="id" value={r.id}/><button className="button danger">Remover</button></form>
    </div>)}</div>
  </AppShell>
}
