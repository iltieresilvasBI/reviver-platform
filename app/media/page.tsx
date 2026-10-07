import { AppShell } from "@/components/app-shell";
import { getAccessContext } from "@/lib/auth";
import { createContent, grantMediaRole, transitionContent } from "./actions";
import { ScheduleForm } from "./schedule-form";
import { MediaUpload } from "./media-upload";

const statusLabel:Record<string,string>={
  draft:"Rascunho",
  in_review:"Em revisão",
  changes_requested:"Alterações pedidas",
  rejected:"Rejeitado",
  approved:"Aprovado",
  scheduled:"Agendado",
  published:"Publicado",
};

export default async function MediaPage({searchParams}:{searchParams:Promise<{message?:string;q?:string;status?:string;type?:string}>}){
  const qs=await searchParams;
  const ctx=await getAccessContext();
  const canCreate=ctx.isAdmin||ctx.isMediaEditor||ctx.isMediaLeader;
  const canReview=ctx.isAdmin||ctx.isMediaLeader;
  if(!canCreate)return <AppShell title="Central de Conteúdo" active="/media" email={ctx.email}><section className="hero-card"><p className="eyebrow">ACESSO RESTRITO</p><h2>Central editorial</h2><p>Esta área é reservada a Editores, Líder de Mídia e Admin.</p></section></AppShell>;

  const {data:items}=await ctx.supabase
    .from("content_items")
    .select("id,content_type,title,slug,summary,status,created_by,featured,scheduled_for,published_at,created_at,updated_at")
    .order("updated_at",{ascending:false})
    .limit(200);

  const all=items??[];
  const ids=all.map(i=>i.id);
  const {data:mediaRows}=ids.length
    ?await ctx.supabase.from("content_media").select("content_item_id,media_type").in("content_item_id",ids)
    :{data:[] as any[]};

  const mediaCount=new Map<string,number>();
  for(const m of mediaRows??[]) mediaCount.set(m.content_item_id,(mediaCount.get(m.content_item_id)??0)+1);

  const q=(qs.q??"").trim().toLowerCase();
  const status=(qs.status??"").trim();
  const type=(qs.type??"").trim();
  const filtered=all.filter(i=>{
    if(q&&!\`\${i.title} \${i.slug} \${i.summary??""}\`.toLowerCase().includes(q)) return false;
    if(status&&i.status!==status) return false;
    if(type&&i.content_type!==type) return false;
    return true;
  });

  const counts={
    draft:all.filter(i=>i.status==="draft"||i.status==="changes_requested").length,
    review:all.filter(i=>i.status==="in_review").length,
    approved:all.filter(i=>i.status==="approved"||i.status==="scheduled").length,
    published:all.filter(i=>i.status==="published").length,
  };

  return <AppShell title="Central de Conteúdo" active="/media" email={ctx.email}>
    {qs.message&&<div className="notice" style={{marginBottom:16}}>{qs.message}</div>}

    <section className="hero-card">
      <p className="eyebrow">REVIVER CMS</p>
      <h2>Conteúdo público com fluxo editorial claro.</h2>
      <p>Cria, pré-visualiza, submete, aprova e publica sem misturar aprovação com publicação.</p>
    </section>

    <div className="grid grid-4" style={{marginTop:18}}>
      <article className="card metric"><span>Em produção</span><strong>{counts.published}</strong></article>
      <article className="card metric"><span>À espera de revisão</span><strong>{counts.review}</strong></article>
      <article className="card metric"><span>Aprovados / agendados</span><strong>{counts.approved}</strong></article>
      <article className="card metric"><span>Em preparação</span><strong>{counts.draft}</strong></article>
    </div>

    <details className="card" style={{marginTop:22}}>
      <summary style={{cursor:"pointer",fontWeight:800,fontSize:18}}>+ Criar novo conteúdo</summary>
      <form action={createContent} className="form-grid" style={{marginTop:18}}>
        <div className="grid grid-3">
          <div className="field"><label>Tipo</label><select name="content_type"><option value="post">Post/notícia</option><option value="event">Evento</option><option value="video">Vídeo</option><option value="campaign">Campanha</option><option value="gallery">Galeria</option><option value="home_highlight">Destaque da Home</option></select></div>
          <div className="field"><label>Título</label><input name="title" required/></div>
          <div className="field"><label>Slug opcional</label><input name="slug" placeholder="gerado automaticamente"/></div>
        </div>
        <div className="field"><label>Rede</label><select name="network"><option value="">Geral</option><option value="kids">Kids</option><option value="youth">Youth</option><option value="women">Mulheres</option><option value="men">Homens</option><option value="worship">Ministério de Louvor</option></select></div>
        <div className="field"><label>Resumo</label><textarea name="summary"/></div>
        <div className="field"><label>Conteúdo</label><textarea name="body"/></div>
        <div className="grid grid-2"><div className="field"><label>YouTube: link ou ID</label><input name="youtube_id" placeholder="https://youtube.com/watch?v=..."/></div><div className="field"><label>Local do evento</label><input name="event_location"/></div></div>
        <div className="grid grid-2"><div className="field"><label>Início do evento</label><input name="event_start" type="datetime-local"/></div><div className="field"><label>Fim do evento</label><input name="event_end" type="datetime-local"/></div></div>
        <div className="grid grid-2"><div className="field"><label>Início da campanha</label><input name="campaign_start" type="datetime-local"/></div><div className="field"><label>Fim da campanha</label><input name="campaign_end" type="datetime-local"/></div></div>
        <div className="grid grid-2"><div className="field"><label>CTA</label><input name="cta_label"/></div><div className="field"><label>URL do CTA</label><input name="cta_url" type="url"/></div></div>
        <label className="quiz-option"><input type="checkbox" name="featured"/> Destaque</label>
        <button className="button primary">Criar rascunho</button>
      </form>
    </details>

    <div className="section-title">
      <div><p className="eyebrow">BIBLIOTECA EDITORIAL</p><h2>Conteúdos</h2></div>
      <div className="button-row"><a className="button" href="/admin/aprovacoes">Fila de aprovações</a><span className="muted small">{filtered.length} de {all.length} registos</span></div>
    </div>

    <form method="get" className="card" style={{marginBottom:18}}>
      <div className="grid grid-4">
        <div className="field"><label>Pesquisar</label><input name="q" defaultValue={qs.q??""} placeholder="Título, slug ou resumo"/></div>
        <div className="field"><label>Estado</label><select name="status" defaultValue={status}><option value="">Todos</option>{Object.entries(statusLabel).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></div>
        <div className="field"><label>Tipo</label><select name="type" defaultValue={type}><option value="">Todos</option><option value="post">Post/notícia</option><option value="event">Evento</option><option value="video">Vídeo</option><option value="campaign">Campanha</option><option value="gallery">Galeria</option><option value="home_highlight">Destaque da Home</option></select></div>
        <div className="button-row" style={{alignItems:"end"}}><button className="button primary" type="submit">Filtrar</button>{(q||status||type)&&<a className="button" href="/media">Limpar</a>}</div>
      </div>
    </form>

    <div className="list">{filtered.length===0?<div className="empty">Nenhum conteúdo corresponde aos filtros.</div>:filtered.map(i=><div className="card" key={i.id}>
      <div className="list-row" style={{padding:0,border:0,background:"transparent"}}>
        <div>
          <div className="button-row"><span className="pill">{i.content_type}</span><span className={i.status==="published"?"pill ok":i.status==="in_review"?"pill gold":"pill"}>{statusLabel[i.status]??i.status}</span>{i.featured&&<span className="pill gold">destaque</span>}</div>
          <h3 style={{fontSize:22,margin:"10px 0 4px"}}>{i.title}</h3>
          <span className="muted small">/{i.slug} · {mediaCount.get(i.id)??0} media{i.scheduled_for?\` · agendado \${new Date(i.scheduled_for).toLocaleString("pt-PT")}\`:""}</span>
          {i.summary&&<p className="muted" style={{marginTop:10,maxWidth:720}}>{i.summary}</p>}
        </div>
        <MediaUpload contentId={i.id}/>
      </div>
      <div className="button-row" style={{marginTop:16}}>
        <a className="button primary" href={\`/media/preview/\${i.id}\`}>Pré-visualizar</a>
        <a className="button" href={\`/media/edit/\${i.id}\`}>Editar</a>
        {(i.status==="draft"||i.status==="changes_requested")&&<form action={transitionContent}><input type="hidden" name="contentId" value={i.id}/><input type="hidden" name="action" value="submit"/><button className="button">Enviar para revisão</button></form>}
        {canReview&&i.status==="in_review"&&<><form action={transitionContent}><input type="hidden" name="contentId" value={i.id}/><input type="hidden" name="action" value="approve"/><button className="button primary">Aprovar</button></form><form action={transitionContent}><input type="hidden" name="contentId" value={i.id}/><input type="hidden" name="action" value="request_changes"/><input type="hidden" name="note" value="Requer alterações"/><button className="button">Pedir alterações</button></form><form action={transitionContent}><input type="hidden" name="contentId" value={i.id}/><input type="hidden" name="action" value="reject"/><input type="hidden" name="note" value="Rejeitado"/><button className="button danger">Rejeitar</button></form></>}
        {canReview&&i.status==="approved"&&<><form action={transitionContent}><input type="hidden" name="contentId" value={i.id}/><input type="hidden" name="action" value="publish"/><button className="button primary">Publicar agora</button></form><ScheduleForm contentId={i.id}/></>}
      </div>
    </div>)}</div>

    {(ctx.isAdmin||ctx.isMediaLeader)&&<details className="card" style={{marginTop:24}}>
      <summary style={{cursor:"pointer",fontWeight:800}}>Gestão da equipa de mídia</summary>
      <form action={grantMediaRole} className="form-grid" style={{marginTop:18}}>
        <div className="grid grid-3"><div className="field"><label>Email</label><input name="email" type="email" required/></div><div className="field"><label>Papel</label><select name="role"><option value="media_editor">Editor</option>{ctx.isAdmin&&<option value="media_leader">Líder de Mídia</option>}</select></div><div className="button-row" style={{alignItems:"end"}}><button className="button">Atribuir papel</button></div></div>
      </form>
    </details>}
  </AppShell>
}
