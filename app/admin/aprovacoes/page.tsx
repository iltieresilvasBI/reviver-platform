import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getAccessContext } from "@/lib/auth";
import { transitionContent } from "@/app/media/actions";
import { ScheduleForm } from "@/app/media/schedule-form";

const statusLabel:Record<string,string>={
  in_review:"Em revisão",
  approved:"Aprovado",
  scheduled:"Agendado",
};

export default async function ApprovalsPage({searchParams}:{searchParams:Promise<{status?:string;type?:string}>}){
  const qs=await searchParams;
  const ctx=await getAccessContext();
  if(!(ctx.isAdmin||ctx.isMediaLeader)) return <AppShell title="Aprovações" active="/admin" email={ctx.email}><div className="empty">Acesso reservado a Admin ou Líder de Mídia.</div></AppShell>;

  const {data:items}=await ctx.supabase
    .from("content_items")
    .select("id,title,content_type,status,summary,submitted_at,approved_at,scheduled_for,updated_at")
    .in("status",["in_review","approved","scheduled"])
    .order("updated_at",{ascending:true});

  const all=items??[];
  const itemIds=all.map((item:any)=>item.id);
  const {data:auditRows}=itemIds.length
    ?await ctx.supabase.from("content_audit_log")
      .select("id,content_item_id,actor_user_id,action,from_status,to_status,note,created_at")
      .in("content_item_id",itemIds)
      .order("created_at",{ascending:false})
    :{data:[] as any[]};
  const actorIds=Array.from(new Set((auditRows??[]).map((row:any)=>row.actor_user_id).filter(Boolean)));
  const {data:actors}=actorIds.length
    ?await ctx.supabase.from("profiles").select("id,display_name").in("id",actorIds)
    :{data:[] as any[]};
  const actorById=new Map((actors??[]).map((actor:any)=>[actor.id,actor.display_name||"Utilizador"]));
  const auditByItem=new Map<string,any[]>();
  for(const row of auditRows??[]){
    const rows=auditByItem.get(row.content_item_id)??[];
    rows.push(row);
    auditByItem.set(row.content_item_id,rows);
  }

  const status=(qs.status??"").trim();
  const type=(qs.type??"").trim();
  const filtered=all.filter((i:any)=>(!status||i.status===status)&&(!type||i.content_type===type));

  const counts={
    review:all.filter((i:any)=>i.status==="in_review").length,
    approved:all.filter((i:any)=>i.status==="approved").length,
    scheduled:all.filter((i:any)=>i.status==="scheduled").length,
  };

  return <AppShell title="Fila de Aprovações" active="/admin" email={ctx.email}>
    <div className="button-row" style={{marginBottom:18}}><Link className="button" href="/admin">← Centro de Administração</Link><Link className="button" href="/media">Abrir CMS completo</Link></div>

    <section className="hero-card">
      <p className="eyebrow">GOVERNANÇA EDITORIAL</p>
      <h2>Aprovar não é publicar.</h2>
      <p>Revê primeiro o conteúdo no layout real do site. Só depois da aprovação escolhes publicar agora ou agendar.</p>
    </section>

    <div className="grid grid-3" style={{marginTop:18}}>
      <article className="card metric"><span>Em revisão</span><strong>{counts.review}</strong></article>
      <article className="card metric"><span>Aprovados</span><strong>{counts.approved}</strong></article>
      <article className="card metric"><span>Agendados</span><strong>{counts.scheduled}</strong></article>
    </div>

    <div className="section-title"><div><p className="eyebrow">FILA</p><h2>Conteúdos pendentes</h2></div><span className="muted small">{filtered.length} de {all.length}</span></div>

    <form method="get" className="card" style={{marginBottom:18}}>
      <div className="grid grid-3">
        <div className="field"><label>Estado</label><select name="status" defaultValue={status}><option value="">Todos</option><option value="in_review">Em revisão</option><option value="approved">Aprovados</option><option value="scheduled">Agendados</option></select></div>
        <div className="field"><label>Tipo</label><select name="type" defaultValue={type}><option value="">Todos</option><option value="post">Post/notícia</option><option value="event">Evento</option><option value="video">Vídeo</option><option value="campaign">Campanha</option><option value="gallery">Galeria</option><option value="home_highlight">Destaque da Home</option></select></div>
        <div className="button-row" style={{alignItems:"end"}}><button className="button primary">Filtrar</button>{(status||type)&&<Link className="button" href="/admin/aprovacoes">Limpar</Link>}</div>
      </div>
    </form>

    <div className="list">{filtered.length===0?<div className="empty">Não há conteúdos neste filtro.</div>:filtered.map((i:any)=><div className="card" key={i.id}>
      <div className="list-row" style={{padding:0,border:0,background:"transparent"}}>
        <div>
          <div className="button-row"><span className="pill">{i.content_type}</span><span className={i.status==="approved"?"pill ok":"pill gold"}>{statusLabel[i.status]??i.status}</span></div>
          <h3 style={{fontSize:22,margin:"10px 0 4px"}}>{i.title}</h3>
          <span className="muted small">{i.summary||"Sem resumo"}</span>
          {i.status==="in_review"&&i.submitted_at&&<div className="muted small" style={{marginTop:7}}>Submetido em {new Date(i.submitted_at).toLocaleString("pt-PT")}</div>}
          {i.status==="approved"&&i.approved_at&&<div className="muted small" style={{marginTop:7}}>Aprovado em {new Date(i.approved_at).toLocaleString("pt-PT")}</div>}
        </div>
        <Link className="button primary" href={`/media/preview/${i.id}`}>Pré-visualizar no site</Link>
      </div>

      <div className="button-row" style={{marginTop:16}}>
        {i.status==="in_review"&&<>
          <form action={transitionContent}><input type="hidden" name="contentId" value={i.id}/><input type="hidden" name="action" value="approve"/><button className="button primary">Aprovar</button></form>
          <form action={transitionContent} className="button-row"><input type="hidden" name="contentId" value={i.id}/><input type="hidden" name="action" value="request_changes"/><input name="note" required placeholder="Alterações necessárias" className="inline-input"/><button className="button">Pedir alterações</button></form>
          <form action={transitionContent} className="button-row"><input type="hidden" name="contentId" value={i.id}/><input type="hidden" name="action" value="reject"/><input name="note" required placeholder="Motivo da rejeição" className="inline-input"/><button className="button danger">Rejeitar</button></form>
        </>}
        {i.status==="approved"&&<>
          <form action={transitionContent}><input type="hidden" name="contentId" value={i.id}/><input type="hidden" name="action" value="publish"/><button className="button primary">Publicar agora</button></form>
          <ScheduleForm contentId={i.id}/>
        </>}
        {i.status==="scheduled"&&<span className="notice">Publicação agendada: {i.scheduled_for?new Date(i.scheduled_for).toLocaleString("pt-PT"):"data indisponível"}</span>}
      </div>
      <details style={{marginTop:14}}>
        <summary className="text-button" style={{cursor:"pointer"}}>Histórico editorial ({(auditByItem.get(i.id)??[]).length})</summary>
        <div className="list" style={{marginTop:10}}>
          {(auditByItem.get(i.id)??[]).length===0
            ?<div className="empty">Ainda não há transições registadas para este conteúdo.</div>
            :(auditByItem.get(i.id)??[]).map((row:any)=><div className="list-row" key={row.id}>
              <div>
                <div className="button-row"><span className="pill">{row.action}</span><span className="muted small">{row.from_status??"—"} → {row.to_status??"—"}</span></div>
                <strong>{actorById.get(row.actor_user_id)??(row.actor_user_id?"Utilizador "+String(row.actor_user_id).slice(0,8):"Sistema")}</strong>
                {row.note&&<div className="muted small" style={{marginTop:4}}>{row.note}</div>}
              </div>
              <span className="muted small">{new Date(row.created_at).toLocaleString("pt-PT")}</span>
            </div>)}
        </div>
      </details>
    </div>)}</div>
  </AppShell>
}
