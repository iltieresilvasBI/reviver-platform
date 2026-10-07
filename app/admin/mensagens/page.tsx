import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getAccessContext } from "@/lib/auth";
import { updateMessageStatus } from "./actions";

const statusLabel:Record<string,string>={
  new:"Nova",
  read:"Lida",
  replied:"Respondida",
  archived:"Arquivada",
};

export default async function MessagesAdmin({searchParams}:{searchParams:Promise<{message?:string;q?:string;status?:string}>}){
  const qs=await searchParams;
  const ctx=await getAccessContext();
  if(!ctx.isAdmin)return <AppShell title="Mensagens" active="/admin" email={ctx.email}><div className="empty">Acesso reservado a Admin.</div></AppShell>;

  const {data:messages,error}=await ctx.supabase
    .from("contact_messages")
    .select("id,name,email,subject,message,status,created_at,handled_at")
    .order("created_at",{ascending:false})
    .limit(300);

  const all=messages??[];
  const q=(qs.q??"").trim().toLowerCase();
  const status=(qs.status??"").trim();
  const filtered=all.filter((m:any)=>{
    if(status&&m.status!==status) return false;
    if(q&&!\`\${m.name} \${m.email} \${m.subject} \${m.message}\`.toLowerCase().includes(q)) return false;
    return true;
  });

  const counts={
    new:all.filter((m:any)=>m.status==="new").length,
    read:all.filter((m:any)=>m.status==="read").length,
    replied:all.filter((m:any)=>m.status==="replied").length,
    archived:all.filter((m:any)=>m.status==="archived").length,
  };

  return <AppShell title="Mensagens de Contacto" active="/admin" email={ctx.email}>
    <div className="button-row" style={{marginBottom:18}}><Link className="button" href="/admin">← Centro de Administração</Link></div>
    {qs.message&&<div className="notice" style={{marginBottom:16}}>{qs.message}</div>}
    {error&&<div className="notice warn">Não foi possível carregar as mensagens: {error.message}</div>}

    <section className="hero-card">
      <p className="eyebrow">INBOX DO SITE</p>
      <h2>Contactos organizados por estado.</h2>
      <p>Pesquisa, responde por email e acompanha o que ainda precisa de tratamento sem perder mensagens novas no meio do histórico.</p>
    </section>

    <div className="grid grid-4" style={{marginTop:18}}>
      <article className="card metric"><span>Novas</span><strong>{counts.new}</strong></article>
      <article className="card metric"><span>Lidas</span><strong>{counts.read}</strong></article>
      <article className="card metric"><span>Respondidas</span><strong>{counts.replied}</strong></article>
      <article className="card metric"><span>Arquivadas</span><strong>{counts.archived}</strong></article>
    </div>

    <div className="section-title"><div><p className="eyebrow">MENSAGENS</p><h2>Caixa de entrada</h2></div><span className="muted small">{filtered.length} de {all.length}</span></div>

    <form method="get" className="card" style={{marginBottom:18}}>
      <div className="grid grid-3">
        <div className="field"><label>Pesquisar</label><input name="q" defaultValue={qs.q??""} placeholder="Nome, email, assunto ou mensagem"/></div>
        <div className="field"><label>Estado</label><select name="status" defaultValue={status}><option value="">Todos</option><option value="new">Novas</option><option value="read">Lidas</option><option value="replied">Respondidas</option><option value="archived">Arquivadas</option></select></div>
        <div className="button-row" style={{alignItems:"end"}}><button className="button primary">Filtrar</button>{(q||status)&&<Link className="button" href="/admin/mensagens">Limpar</Link>}</div>
      </div>
    </form>

    <div className="list">{filtered.length===0?<div className="empty">Nenhuma mensagem corresponde aos filtros.</div>:filtered.map((m:any)=><details className="card" key={m.id} open={m.status==="new"}>
      <summary style={{cursor:"pointer"}}>
        <div className="list-row" style={{padding:0,border:0,background:"transparent"}}>
          <div>
            <div className="button-row"><span className={m.status==="new"?"pill gold":m.status==="replied"?"pill ok":"pill"}>{statusLabel[m.status]??m.status}</span></div>
            <h3 style={{margin:"10px 0 4px"}}>{m.subject}</h3>
            <span className="muted small">{m.name} · {m.email} · {new Date(m.created_at).toLocaleString("pt-PT")}</span>
          </div>
          {m.status==="new"&&<span className="pill gold">precisa de atenção</span>}
        </div>
      </summary>

      <p style={{whiteSpace:"pre-wrap",lineHeight:1.7,marginTop:18}}>{m.message}</p>

      <div className="button-row" style={{marginTop:14}}>
        <a className="button primary" href={"mailto:"+m.email+"?subject="+encodeURIComponent("Re: "+m.subject)}>Responder por email</a>
        <a className="button" href={"mailto:"+m.email}>{m.email}</a>
      </div>

      <form action={updateMessageStatus} className="button-row" style={{marginTop:14}}>
        <input type="hidden" name="id" value={m.id}/>
        <select name="status" defaultValue={m.status} className="inline-input"><option value="new">Nova</option><option value="read">Lida</option><option value="replied">Respondida</option><option value="archived">Arquivada</option></select>
        <button className="button">Guardar estado</button>
        {m.handled_at&&<span className="muted small">Última atualização: {new Date(m.handled_at).toLocaleString("pt-PT")}</span>}
      </form>
    </details>)}</div>
  </AppShell>
}
