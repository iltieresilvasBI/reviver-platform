import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getAccessContext } from "@/lib/auth";
import { transitionContent } from "@/app/media/actions";
import { ScheduleForm } from "@/app/media/schedule-form";

export default async function ApprovalsPage(){
  const ctx=await getAccessContext();
  if(!(ctx.isAdmin||ctx.isMediaLeader)) return <AppShell title="Aprovações" active="/admin" email={ctx.email}><div className="empty">Acesso reservado a Admin ou Líder de Mídia.</div></AppShell>;
  const {data:items}=await ctx.supabase.from("content_items").select("id,title,content_type,status,summary,submitted_at,approved_at,scheduled_for").in("status",["in_review","approved","scheduled"]).order("updated_at",{ascending:true});
  return <AppShell title="Fila de Aprovações" active="/admin" email={ctx.email}>
    <div className="button-row" style={{marginBottom:18}}><Link className="button" href="/admin">← Centro de Administração</Link><Link className="button" href="/media">Abrir CMS completo</Link></div>
    <section className="hero-card"><p className="eyebrow">GOVERNANÇA EDITORIAL</p><h2>Aprovar não é publicar.</h2><p>O conteúdo é revisto primeiro. Só depois de aprovado pode ser publicado imediatamente ou agendado.</p></section>
    <div className="section-title"><h2>Conteúdos pendentes</h2></div>
    <div className="list">{(items??[]).length===0?<div className="empty">Fila editorial vazia.</div>:(items??[]).map((i:any)=><div className="card" key={i.id}>
      <div className="list-row" style={{padding:0,border:0,background:"transparent"}}>
        <div><span className="pill">{i.content_type}</span> <span className={i.status==="approved"?"pill ok":"pill gold"}>{i.status}</span><h3 style={{fontSize:20,margin:"10px 0 4px"}}>{i.title}</h3><span className="muted small">{i.summary||"Sem resumo"}</span></div>
        <Link className="button" href={`/media/preview/${i.id}`}>Pré-visualizar</Link>
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
    </div>)}</div>
  </AppShell>
}
