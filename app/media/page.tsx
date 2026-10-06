import { AppShell } from "@/components/app-shell";
import { getAccessContext } from "@/lib/auth";
import { createContent, grantMediaRole, transitionContent } from "./actions";
import { ScheduleForm } from "./schedule-form";
import { MediaUpload } from "./media-upload";

export default async function MediaPage({searchParams}:{searchParams:Promise<{message?:string}>}){
  const qs=await searchParams; const ctx=await getAccessContext();
  const canCreate=ctx.isAdmin||ctx.isMediaEditor||ctx.isMediaLeader; const canReview=ctx.isAdmin||ctx.isMediaLeader;
  if(!canCreate)return <AppShell title="Central de Conteúdo" active="/media" email={ctx.email}><section className="hero-card"><p className="eyebrow">ACESSO RESTRITO</p><h2>Central editorial</h2><p>Esta área é reservada a Editores, Líder de Mídia e Admin.</p></section></AppShell>;
  const {data:items}=await ctx.supabase.from("content_items").select("id,content_type,title,slug,summary,status,created_by,featured,scheduled_for,published_at,created_at").order("created_at",{ascending:false}).limit(100);
  return <AppShell title="Central de Conteúdo" active="/media" email={ctx.email}>
    {qs.message&&<div className="notice" style={{marginBottom:16}}>{qs.message}</div>}
    <div className="grid grid-2">
      <form action={createContent} className="card form-grid">
        <div><p className="eyebrow">NOVO CONTEÚDO</p><h2 style={{marginTop:4}}>Criar rascunho</h2></div>
        <div className="field"><label>Tipo</label><select name="content_type"><option value="post">Post/notícia</option><option value="event">Evento</option><option value="video">Vídeo</option><option value="campaign">Campanha</option><option value="gallery">Galeria</option><option value="home_highlight">Destaque da Home</option></select></div>
        <div className="field"><label>Título</label><input name="title" required/></div>
        <div className="field"><label>Slug opcional</label><input name="slug" placeholder="gerado automaticamente"/></div>
        <div className="field"><label>Resumo</label><textarea name="summary"/></div>
        <div className="field"><label>Conteúdo</label><textarea name="body"/></div>
        <div className="grid grid-2"><div className="field"><label>YouTube ID</label><input name="youtube_id"/></div><div className="field"><label>Local do evento</label><input name="event_location"/></div></div>
        <div className="grid grid-2"><div className="field"><label>Início do evento</label><input name="event_start" type="datetime-local"/></div><div className="field"><label>Início da campanha</label><input name="campaign_start" type="datetime-local"/></div></div>
        <div className="field"><label>Fim da campanha</label><input name="campaign_end" type="datetime-local"/></div>
        <div className="grid grid-2"><div className="field"><label>CTA</label><input name="cta_label"/></div><div className="field"><label>URL do CTA</label><input name="cta_url" type="url"/></div></div>
        <label className="quiz-option"><input type="checkbox" name="featured"/> Destaque</label>
        <button className="button primary">Criar rascunho</button>
      </form>
      <div className="card">
        <p className="eyebrow">FLUXO EDITORIAL</p><h2>Rascunho → revisão → aprovação → publicação</h2>
        <p className="muted">Editor cria e submete. Líder de Mídia/Admin aprova, pede alterações, rejeita, agenda ou publica. A aprovação é separada da publicação.</p>
        {(ctx.isAdmin||ctx.isMediaLeader)&&<form action={grantMediaRole} className="form-grid" style={{marginTop:24}}>
          <p className="eyebrow">ATRIBUIR PAPEL</p><div className="field"><label>Email</label><input name="email" type="email" required/></div><div className="field"><label>Papel</label><select name="role"><option value="media_editor">Editor</option>{ctx.isAdmin&&<option value="media_leader">Líder de Mídia</option>}</select></div><button className="button">Atribuir</button>
        </form>}
      </div>
    </div>
    <div className="section-title"><h2>Conteúdos</h2><span className="muted small">{(items??[]).length} registos</span></div>
    <div className="list">{(items??[]).length===0?<div className="empty">Nenhum conteúdo criado.</div>:(items??[]).map(i=><div className="card" key={i.id}>
      <div className="list-row" style={{padding:0,border:0,background:"transparent"}}>
        <div><span className="pill">{i.content_type}</span> <span className={i.status==="published"?"pill ok":"pill gold"}>{i.status}</span><h3 style={{fontSize:20,margin:"10px 0 4px"}}>{i.title}</h3><span className="muted small">/{i.slug}{i.scheduled_for?` · agendado ${new Date(i.scheduled_for).toLocaleString("pt-PT")}`:""}</span></div>
        <MediaUpload contentId={i.id}/>
      </div>
      <div className="button-row" style={{marginTop:16}}>
        {(i.status==="draft"||i.status==="changes_requested")&&<form action={transitionContent}><input type="hidden" name="contentId" value={i.id}/><input type="hidden" name="action" value="submit"/><button className="button">Enviar para revisão</button></form>}
        {canReview&&i.status==="in_review"&&<><form action={transitionContent}><input type="hidden" name="contentId" value={i.id}/><input type="hidden" name="action" value="approve"/><button className="button primary">Aprovar</button></form><form action={transitionContent}><input type="hidden" name="contentId" value={i.id}/><input type="hidden" name="action" value="request_changes"/><input type="hidden" name="note" value="Requer alterações"/><button className="button">Pedir alterações</button></form><form action={transitionContent}><input type="hidden" name="contentId" value={i.id}/><input type="hidden" name="action" value="reject"/><input type="hidden" name="note" value="Rejeitado"/><button className="button danger">Rejeitar</button></form></>}
        {canReview&&i.status==="approved"&&<><form action={transitionContent}><input type="hidden" name="contentId" value={i.id}/><input type="hidden" name="action" value="publish"/><button className="button primary">Publicar agora</button></form><ScheduleForm contentId={i.id}/></>}
      </div>
    </div>)}</div>
  </AppShell>
}
