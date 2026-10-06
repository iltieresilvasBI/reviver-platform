import { AppShell } from "@/components/app-shell";
import { getAccessContext } from "@/lib/auth";
import { acceptWorshipInvite, createWorshipItem, decideWorship, inviteWorship, requestWorshipAccess } from "./actions";

export default async function WorshipPage({searchParams}:{searchParams:Promise<{message?:string}>}){
  const qs=await searchParams; const ctx=await getAccessContext();
  const {data:user}=await ctx.supabase.auth.getUser();
  const {data:network}=await ctx.supabase.from("networks").select("id").eq("slug","worship").single();
  const {data:membership}=network?await ctx.supabase.from("network_memberships").select("id,role,status,requested_at,approved_at").eq("user_id",ctx.userId).eq("network_id",network.id).maybeSingle():{data:null as any};
  const canRead=ctx.isAdmin||membership?.status==="active";
  const {data:items}=canRead?await ctx.supabase.from("worship_items").select("id,item_type,title,body,starts_at,external_url,created_at").order("starts_at",{ascending:true}).order("created_at",{ascending:false}):{data:[] as any[]};
  const canLead=ctx.isAdmin||(membership?.status==="active"&&membership?.role==="leader");
  const {data:directory}=canLead?await ctx.supabase.rpc("worship_member_directory"):{data:[] as any[]};
  const {count:lessonCount}=canLead?await ctx.supabase.from("academy_lessons").select("*",{count:"exact",head:true}).eq("active",true):{count:0 as number|null};

  const memberMetrics=canLead?await Promise.all((directory??[]).map(async(m:any)=>{
    const [{data:progress},{data:attempts},{data:practice}]=await Promise.all([
      ctx.supabase.from("lesson_progress").select("status,last_activity_at").eq("user_id",m.user_id),
      ctx.supabase.from("quiz_attempts").select("score_percentage,attempted_at").eq("user_id",m.user_id),
      ctx.supabase.from("practice_sessions").select("duration_seconds,practiced_at").eq("user_id",m.user_id).order("practiced_at",{ascending:false}).limit(20)
    ]);
    const completed=(progress??[]).filter(p=>p.status==="completed").length;
    const avg=(attempts??[]).length?Math.round((attempts??[]).reduce((s,a)=>s+Number(a.score_percentage??0),0)/(attempts??[]).length):0;
    const last=[...(progress??[]).map(p=>p.last_activity_at),...(attempts??[]).map(a=>a.attempted_at),...(practice??[]).map(p=>p.practiced_at)].filter(Boolean).sort().at(-1)??null;
    const practiceMinutes=Math.round((practice??[]).reduce((s,p)=>s+(p.duration_seconds??0),0)/60);
    return {...m,completion:Math.round((completed/Math.max(lessonCount??0,1))*100),completed,avg,last,practiceMinutes};
  })):[];

  return <AppShell title="Ministério de Louvor" active="/worship" email={ctx.email}>
    {qs.message&&<div className="notice" style={{marginBottom:16}}>{qs.message}</div>}
    {!canRead?<section className="hero-card">
      <p className="eyebrow">ACESSO INTERNO</p><h2>Recursos do Ministério de Louvor</h2>
      <p>Escalas, ensaios, repertório, ficheiros e avisos são reservados a membros aprovados.</p>
      {!user.user?.email_confirmed_at&&<p className="notice warn">Confirma primeiro o teu email para pedir ou ativar acesso ao ministério.</p>}
      {membership?.status==="pending"?<span className="pill gold">Pedido em análise</span>:membership?.status==="invited"?<form action={acceptWorshipInvite}><button className="button primary">Aceitar convite</button></form>:<form action={requestWorshipAccess}><button className="button primary">Pedir acesso</button></form>}
    </section>:<>
      <div className="grid grid-3">
        {["schedule","rehearsal","repertoire"].map(type=><div className="card metric" key={type}><span>{type==="schedule"?"Escalas":type==="rehearsal"?"Ensaios":"Repertório"}</span><strong>{(items??[]).filter(i=>i.item_type===type).length}</strong></div>)}
      </div>
      <div className="section-title"><h2>Área interna</h2></div>
      <div className="list">{(items??[]).length===0?<div className="empty">Ainda não há recursos publicados para o Louvor.</div>:(items??[]).map(i=><div className="list-row" key={i.id}><div><span className="pill gold">{i.item_type}</span><h3 style={{marginTop:8}}>{i.title}</h3><span className="muted small">{i.body}</span>{i.starts_at&&<div className="muted small" style={{marginTop:6}}>{new Date(i.starts_at).toLocaleString("pt-PT")}</div>}</div>{i.external_url&&<a className="button" href={i.external_url} target="_blank">Abrir</a>}</div>)}</div>
    </>}
    {canLead&&<><div className="section-title"><h2>Gestão do Louvor</h2></div>
      <div className="grid grid-2">
        <form action={createWorshipItem} className="card form-grid">
          <p className="eyebrow">NOVO RECURSO</p>
          <div className="field"><label>Tipo</label><select name="item_type"><option value="notice">Aviso</option><option value="schedule">Escala</option><option value="rehearsal">Ensaio</option><option value="repertoire">Repertório</option><option value="file">Ficheiro</option></select></div>
          <div className="field"><label>Título</label><input name="title" required/></div>
          <div className="field"><label>Descrição</label><textarea name="body"/></div>
          <div className="field"><label>Data/hora</label><input name="starts_at" type="datetime-local"/></div>
          <div className="field"><label>Link externo</label><input name="external_url" type="url"/></div>
          <button className="button primary">Guardar</button>
        </form>
        <div className="card">
          <p className="eyebrow">CONVIDAR MEMBRO</p>
          <form action={inviteWorship} className="form-grid">
            <div className="field"><label>Email de uma conta já criada</label><input name="email" type="email" required/></div>
            <div className="field"><label>Papel</label><select name="role"><option value="member">Membro</option>{ctx.isAdmin&&<option value="leader">Líder</option>}</select></div>
            <button className="button">Convidar</button>
          </form>
        </div>
      </div>
      <div className="section-title"><h2>Membros, pedidos e progresso</h2></div>
      <div className="list">{memberMetrics.map((m:any)=><div className="card" key={m.membership_id}>
        <div className="list-row" style={{padding:0,border:0,background:"transparent"}}><div><h3>{m.display_name||m.email}</h3><span className="muted small">{m.email} · {m.phone||"sem contacto"} · {m.role} · {m.status}</span></div><div className="button-row">{m.status==="pending"&&<><form action={decideWorship}><input type="hidden" name="membershipId" value={m.membership_id}/><input type="hidden" name="decision" value="approve"/><button className="button primary">Aprovar</button></form><form action={decideWorship}><input type="hidden" name="membershipId" value={m.membership_id}/><input type="hidden" name="decision" value="reject"/><button className="button">Rejeitar</button></form></>}{m.status==="active"&&<form action={decideWorship}><input type="hidden" name="membershipId" value={m.membership_id}/><input type="hidden" name="decision" value="revoke"/><button className="button danger">Revogar</button></form>}</div></div>
        {m.status==="active"&&<div className="grid grid-4" style={{marginTop:14}}><div className="metric"><span>Academy</span><strong>{m.completion}%</strong></div><div className="metric"><span>Aulas concluídas</span><strong>{m.completed}</strong></div><div className="metric"><span>Média quizzes</span><strong>{m.avg}%</strong></div><div className="metric"><span>Prática recente</span><strong>{m.practiceMinutes}m</strong></div></div>}
        {m.last&&<div className="muted small" style={{marginTop:12}}>Última atividade: {new Date(m.last).toLocaleString("pt-PT")}</div>}
      </div>)}</div>
    </>}
  </AppShell>
}
