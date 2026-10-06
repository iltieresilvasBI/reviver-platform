import { notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getAccessContext } from "@/lib/auth";
import { updateContent } from "../../actions";

export default async function EditContent({params}:{params:Promise<{id:string}>}){
  const {id}=await params; const ctx=await getAccessContext();
  if(!(ctx.isAdmin||ctx.isMediaEditor||ctx.isMediaLeader)) notFound();
  const {data:item}=await ctx.supabase.from("content_items").select("*").eq("id",id).maybeSingle();
  if(!item) notFound();
  const {data:links}=await ctx.supabase.from("content_item_networks").select("network_id,networks(slug,name)").eq("content_item_id",id);
  const networkSlug=(links?.[0] as any)?.networks?.slug??"";
  const readonly=item.status==="published";
  return <AppShell title="Editar conteúdo" active="/media" email={ctx.email}>
    <div className="button-row" style={{marginBottom:18}}><Link className="button" href="/media">Voltar</Link><Link className="button primary" href={`/media/preview/${id}`}>Pré-visualizar</Link></div>
    {readonly&&<div className="notice warn" style={{marginBottom:16}}>Conteúdo publicado está bloqueado para edição direta nesta versão. Cria uma nova versão para alterações editoriais.</div>}
    <form action={updateContent} className="card form-grid">
      <input type="hidden" name="contentId" value={id}/>
      <div className="grid grid-3"><div className="field"><label>Título</label><input name="title" defaultValue={item.title} disabled={readonly}/></div><div className="field"><label>Slug</label><input name="slug" defaultValue={item.slug} disabled={readonly}/></div><div className="field"><label>Rede</label><select name="network" defaultValue={networkSlug} disabled={readonly}><option value="">Geral</option><option value="kids">Kids</option><option value="youth">Youth</option><option value="women">Mulheres</option><option value="men">Homens</option><option value="worship">Louvor</option></select></div></div>
      <div className="field"><label>Resumo</label><textarea name="summary" defaultValue={item.summary??""} disabled={readonly}/></div>
      <div className="field"><label>Conteúdo</label><textarea name="body" defaultValue={item.body??""} disabled={readonly}/></div>
      <div className="grid grid-2"><div className="field"><label>YouTube ID</label><input name="youtube_id" defaultValue={item.youtube_id??""} disabled={readonly}/></div><div className="field"><label>Local do evento</label><input name="event_location" defaultValue={item.event_location??""} disabled={readonly}/></div></div>
      <div className="grid grid-2"><div className="field"><label>Início evento</label><input name="event_start" type="datetime-local" defaultValue={item.event_start?new Date(item.event_start).toISOString().slice(0,16):""} disabled={readonly}/></div><div className="field"><label>Fim evento</label><input name="event_end" type="datetime-local" defaultValue={item.event_end?new Date(item.event_end).toISOString().slice(0,16):""} disabled={readonly}/></div></div>
      <div className="grid grid-2"><div className="field"><label>Início campanha</label><input name="campaign_start" type="datetime-local" defaultValue={item.campaign_start?new Date(item.campaign_start).toISOString().slice(0,16):""} disabled={readonly}/></div><div className="field"><label>Fim campanha</label><input name="campaign_end" type="datetime-local" defaultValue={item.campaign_end?new Date(item.campaign_end).toISOString().slice(0,16):""} disabled={readonly}/></div></div>
      <div className="grid grid-3"><div className="field"><label>CTA</label><input name="cta_label" defaultValue={item.cta_label??""} disabled={readonly}/></div><div className="field"><label>URL CTA</label><input name="cta_url" type="url" defaultValue={item.cta_url??""} disabled={readonly}/></div><div className="field"><label>Prioridade</label><input name="priority" type="number" defaultValue={item.priority} disabled={readonly}/></div></div>
      <label className="quiz-option"><input type="checkbox" name="featured" defaultChecked={item.featured} disabled={readonly}/> Destaque</label>
      {!readonly&&<button className="button primary">Guardar alterações</button>}
    </form>
  </AppShell>
}
