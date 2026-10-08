import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getAccessContext } from "@/lib/auth";
import {
  acceptWorshipSubstitution,decideWorshipSubstitution,proposeWorshipSubstitute,requestWorshipSubstitution
} from "../actions";

export default async function WorshipSubstitutionsPage({searchParams}:{searchParams:Promise<{message?:string}>}){
  const qs=await searchParams;
  const ctx=await getAccessContext();
  const {data:network}=await ctx.supabase.from("networks").select("id").eq("slug","worship").maybeSingle();
  const {data:membership}=network?await ctx.supabase.from("network_memberships").select("id,role,status").eq("network_id",network.id).eq("user_id",ctx.userId).maybeSingle():{data:null as any};
  const canRead=ctx.isAdmin||membership?.status==="active";
  const canLead=ctx.isAdmin||(membership?.status==="active"&&membership?.role==="leader");
  if(!canRead){
    return <AppShell title="Substituições" active="/worship" email={ctx.email}><section className="hero-card"><p className="eyebrow">ACESSO RESTRITO</p><h2>É necessário acesso ativo ao Ministério de Louvor.</h2><Link className="button" href="/worship">Voltar</Link></section></AppShell>;
  }

  const now=new Date().toISOString();
  const [{data:schedules},{data:assignments},{data:requests}]=await Promise.all([
    ctx.supabase.from("worship_schedules").select("id,title,starts_at,group_code,status").gte("starts_at",now).neq("status","cancelled").order("starts_at"),
    ctx.supabase.from("worship_schedule_members").select("id,schedule_id,membership_id,role,attendance_status"),
    ctx.supabase.from("worship_substitution_requests").select("*").order("created_at",{ascending:false}),
  ]);
  const scheduleById=new Map((schedules??[]).map((s:any)=>[s.id,s]));
  const assignmentById=new Map((assignments??[]).map((a:any)=>[a.id,a]));
  const myAssignments=(assignments??[]).filter((a:any)=>a.membership_id===membership?.id&&scheduleById.has(a.schedule_id));
  const directory=canLead?(await ctx.supabase.rpc("worship_member_directory")).data??[]:[];
  const personByMembership=new Map((directory??[]).map((p:any)=>[p.membership_id,p]));
  const myIncoming=(requests??[]).filter((r:any)=>r.proposed_membership_id===membership?.id&&r.status==="requested");
  const leaderQueue=(requests??[]).filter((r:any)=>["requested","accepted"].includes(r.status));

  return <AppShell title="Substituições" active="/worship" email={ctx.email}>
    {qs.message&&<div className="notice" style={{marginBottom:16}}>{qs.message}</div>}
    <div className="button-row" style={{marginBottom:18}}><Link className="button" href="/worship">← Louvor</Link></div>
    <section className="hero-card"><p className="eyebrow">SUBSTITUIÇÕES</p><h2>Pedido, aceite e validação do líder.</h2><p>A escala só é alterada depois de o substituto aceitar e o líder aprovar.</p></section>

    <div className="section-title"><div><p className="eyebrow">MINHAS ESCALAS</p><h2>Pedir substituição</h2></div></div>
    <div className="list">{myAssignments.length===0?<div className="empty">Não tens escalas futuras atribuídas.</div>:myAssignments.map((a:any)=>{
      const schedule=scheduleById.get(a.schedule_id) as any;
      const existing=(requests??[]).find((r:any)=>r.assignment_id===a.id&&!["rejected","cancelled"].includes(r.status));
      return <article className="card" key={a.id}><h3>{schedule?.title??"Culto"}</h3><p className="muted">{schedule?new Date(schedule.starts_at).toLocaleString("pt-PT"):""} · {a.role||"função por definir"}</p>{existing?<div className="notice">Pedido atual: <strong>{existing.status}</strong></div>:<form action={requestWorshipSubstitution} className="form-grid"><input type="hidden" name="assignmentId" value={a.id}/><div className="field"><label>Motivo / observação opcional</label><input name="requesterNote" placeholder="Sem dados pessoais desnecessários"/></div><button className="button">Pedir substituição</button></form>}</article>;
    })}</div>

    {myIncoming.length>0&&<>
      <div className="section-title"><div><p className="eyebrow">CONVITES PARA SUBSTITUIR</p><h2>Pedidos dirigidos a mim</h2></div></div>
      <div className="list">{myIncoming.map((r:any)=>{const assignment=assignmentById.get(r.assignment_id) as any;const schedule=assignment?scheduleById.get(assignment.schedule_id) as any:null;return <article className="card" key={r.id}><h3>{schedule?.title??"Culto"}</h3><p className="muted">{schedule?new Date(schedule.starts_at).toLocaleString("pt-PT"):""} · {assignment?.role||"função por definir"}</p><form action={acceptWorshipSubstitution} className="form-grid"><input type="hidden" name="requestId" value={r.id}/><div className="field"><label>Observação opcional</label><input name="note"/></div><button className="button primary">Aceitar substituição</button></form></article>})}</div>
    </>}

    {canLead&&<>
      <div className="section-title"><div><p className="eyebrow">LIDERANÇA</p><h2>Validar substituições</h2></div></div>
      <div className="list">{leaderQueue.length===0?<div className="empty">Nenhum pedido pendente.</div>:leaderQueue.map((r:any)=>{
        const assignment=assignmentById.get(r.assignment_id) as any;
        const schedule=assignment?scheduleById.get(assignment.schedule_id) as any:null;
        const requester=personByMembership.get(r.requested_by_membership_id) as any;
        const proposed=personByMembership.get(r.proposed_membership_id) as any;
        return <article className="card" key={r.id}><div className="list-row" style={{padding:0,border:0,background:"transparent"}}><div><h3>{schedule?.title??"Culto"}</h3><p className="muted">{requester?.display_name||requester?.email||"Membro"} · {assignment?.role||"função"} · {r.status}</p>{r.requester_note&&<p className="muted small">{r.requester_note}</p>}</div>{proposed&&<span className="pill gold">Substituto: {proposed.display_name||proposed.email}</span>}</div>
          {r.status==="requested"&&<form action={proposeWorshipSubstitute} className="form-grid" style={{marginTop:12}}><input type="hidden" name="requestId" value={r.id}/><div className="field"><label>Selecionar substituto elegível</label><select name="proposedMembershipId" required defaultValue={r.proposed_membership_id??""}><option value="">Selecionar</option>{(directory??[]).filter((p:any)=>p.status==="active"&&p.membership_id!==r.requested_by_membership_id).map((p:any)=><option key={p.membership_id} value={p.membership_id}>{p.display_name||p.email}</option>)}</select></div><button className="button">Enviar proposta ao substituto</button></form>}
          {r.status==="accepted"&&<div className="grid grid-2" style={{marginTop:12}}><form action={decideWorshipSubstitution} className="form-grid"><input type="hidden" name="requestId" value={r.id}/><input type="hidden" name="decision" value="approved"/><div className="field"><label>Nota do líder</label><input name="leaderNote"/></div><button className="button primary">Aprovar e substituir</button></form><form action={decideWorshipSubstitution} className="form-grid"><input type="hidden" name="requestId" value={r.id}/><input type="hidden" name="decision" value="rejected"/><div className="field"><label>Justificação opcional</label><input name="leaderNote"/></div><button className="button danger">Rejeitar</button></form></div>}
        </article>;
      })}</div>
    </>}
  </AppShell>;
}
