import { notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getAccessContext } from "@/lib/auth";
import { deleteContentMedia, setCoverMedia, updateContent } from "../../actions";
import { MediaUpload } from "../../media-upload";

export default async function EditContent({params,searchParams}:{params:Promise<{id:string}>,searchParams:Promise<{message?:string}>}){
  const {id}=await params;
  const qs=await searchParams;
  const ctx=await getAccessContext();
  if(!(ctx.isAdmin||ctx.isMediaEditor||ctx.isMediaLeader)) notFound();

  const [{data:item},{data:links},{data:media}]=await Promise.all([
    ctx.supabase.from("content_items").select("*").eq("id",id).maybeSingle(),
    ctx.supabase.from("content_item_networks").select("network_id,networks(slug,name)").eq("content_item_id",id),
    ctx.supabase.from("content_media").select("id,media_type,storage_path,external_url,alt_text,sort_order").eq("content_item_id",id).order("sort_order")
  ]);
  if(!item) notFound();

  const networkSlug=(links?.[0] as any)?.networks?.slug??"";
  const readonly=item.status==="published";

  return <AppShell title="Editar conteúdo" active="/media" email={ctx.email}>
    <div className="button-row" style={{marginBottom:18}}><Link className="button" href="/media">Voltar</Link><Link className="button primary" href={`/media/preview/${id}`}>Pré-visualizar</Link></div>
    {qs.message&&<div className="notice" style={{marginBottom:16}}>{qs.message}</div>}
    {readonly&&<div className="notice warn" style={{marginBottom:16}}>Conteúdo publicado está bloqueado para edição direta nesta versão. Cria uma nova versão para alterações editoriais.</div>}

    <div className="grid grid-2">
      <form action={updateContent} className="card form-grid">
        <input type="hidden" name="contentId" value={id}/>
        <div className="grid grid-3"><div className="field"><label>Título</label><input name="title" defaultValue={item.title} disabled={readonly}/></div><div className="field"><label>Slug</label><input name="slug" defaultValue={item.slug} disabled={readonly}/></div><div className="field"><label>Rede</label><select name="network" defaultValue={networkSlug} disabled={readonly}><option value="">Geral</option><option value="kids">Kids</option><option value="youth">Youth</option><option value="women">Mulheres</option><option value="men">Homens</option><option value="worship">Louvor</option></select></div></div>
        <div className="field"><label>Resumo</label><textarea name="summary" defaultValue={item.summary??""} disabled={readonly}/></div>
        <div className="field"><label>Conteúdo</label><textarea name="body" defaultValue={item.body??""} disabled={readonly}/></div>
        <div className="grid grid-2"><div className="field"><label>YouTube ID ou link</label><input name="youtube_id" defaultValue={item.youtube_id??""} disabled={readonly}/></div><div className="field"><label>Local do evento</label><input name="event_location" defaultValue={item.event_location??""} disabled={readonly}/></div></div>
        <div className="grid grid-2"><div className="field"><label>Início evento</label><input name="event_start" type="datetime-local" defaultValue={item.event_start?new Date(item.event_start).toISOString().slice(0,16):""} disabled={readonly}/></div><div className="field"><label>Fim evento</label><input name="event_end" type="datetime-local" defaultValue={item.event_end?new Date(item.event_end).toISOString().slice(0,16):""} disabled={readonly}/></div></div>
        <div className="grid grid-2"><div className="field"><label>Início campanha</label><input name="campaign_start" type="datetime-local" defaultValue={item.campaign_start?new Date(item.campaign_start).toISOString().slice(0,16):""} disabled={readonly}/></div><div className="field"><label>Fim campanha</label><input name="campaign_end" type="datetime-local" defaultValue={item.campaign_end?new Date(item.campaign_end).toISOString().slice(0,16):""} disabled={readonly}/></div></div>
        <div className="grid grid-3"><div className="field"><label>CTA</label><input name="cta_label" defaultValue={item.cta_label??""} disabled={readonly}/></div><div className="field"><label>URL CTA</label><input name="cta_url" type="url" defaultValue={item.cta_url??""} disabled={readonly}/></div><div className="field"><label>Prioridade</label><input name="priority" type="number" defaultValue={item.priority} disabled={readonly}/></div></div>
        <label className="quiz-option"><input type="checkbox" name="featured" defaultChecked={item.featured} disabled={readonly}/> Destaque</label>
        {!readonly&&<button className="button primary">Guardar alterações</button>}
      </form>

      <div>
        <section className="card">
          <p className="eyebrow">IMAGENS E CAPA</p>
          <h2 style={{marginTop:4}}>Media do conteúdo</h2>
          <p className="muted">A capa é a imagem principal usada nos cartões e páginas públicas. Se não houver capa explícita, o site usa a primeira imagem disponível.</p>
          {!readonly&&<div style={{marginTop:16}}><MediaUpload contentId={id}/></div>}
        </section>

        <div className="list" style={{marginTop:14}}>{(media??[]).length===0?<div className="empty">Nenhuma imagem adicionada.</div>:(media??[]).map((m:any)=><article className="card" key={m.id}>
          {m.external_url&&<img src={m.external_url} alt={m.alt_text??item.title} style={{width:"100%",aspectRatio:"16/9",objectFit:"cover",borderRadius:14}}/>}
          <div className="button-row" style={{marginTop:12}}><span className={m.media_type==="cover"?"pill gold":"pill"}>{m.media_type==="cover"?"capa":"imagem"}</span><span className="muted small">{m.alt_text||"Sem texto alternativo"}</span></div>
          {!readonly&&<div className="button-row" style={{marginTop:12}}>
            {m.media_type!=="cover"&&<form action={setCoverMedia}><input type="hidden" name="mediaId" value={m.id}/><input type="hidden" name="contentId" value={id}/><button className="button">Definir como capa</button></form>}
            <form action={deleteContentMedia}><input type="hidden" name="mediaId" value={m.id}/><input type="hidden" name="contentId" value={id}/><button className="button danger">Remover</button></form>
          </div>}
        </article>)}</div>
      </div>
    </div>
  </AppShell>
}
