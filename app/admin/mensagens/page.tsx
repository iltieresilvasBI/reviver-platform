import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getAccessContext } from "@/lib/auth";
import { updateMessageStatus } from "./actions";

export default async function MessagesAdmin({searchParams}:{searchParams:Promise<{message?:string}>}){
  const qs=await searchParams; const ctx=await getAccessContext();
  if(!ctx.isAdmin)return <AppShell title="Mensagens" active="/admin" email={ctx.email}><div className="empty">Acesso reservado a Admin.</div></AppShell>;
  const {data:messages,error}=await ctx.supabase.from("contact_messages").select("id,name,email,subject,message,status,created_at,handled_at").order("created_at",{ascending:false}).limit(200);
  return <AppShell title="Mensagens de Contacto" active="/admin" email={ctx.email}>
    <div className="button-row" style={{marginBottom:18}}><Link className="button" href="/admin">← Centro de Administração</Link></div>
    {qs.message&&<div className="notice" style={{marginBottom:16}}>{qs.message}</div>}
    {error&&<div className="notice warn">Não foi possível carregar as mensagens: {error.message}</div>}
    <div className="list">{(messages??[]).length===0?<div className="empty">Ainda não existem mensagens recebidas.</div>:(messages??[]).map((m:any)=><article className="card" key={m.id}>
      <div className="list-row" style={{padding:0,border:0,background:"transparent"}}>
        <div><span className={m.status==="new"?"pill gold":"pill"}>{m.status}</span><h3 style={{marginTop:10}}>{m.subject}</h3><span className="muted small">{m.name} · <a href={"mailto:"+m.email}>{m.email}</a> · {new Date(m.created_at).toLocaleString("pt-PT")}</span></div>
        <a className="button" href={"mailto:"+m.email+"?subject="+encodeURIComponent("Re: "+m.subject)}>Responder por email</a>
      </div>
      <p style={{whiteSpace:"pre-wrap",lineHeight:1.7,marginTop:18}}>{m.message}</p>
      <form action={updateMessageStatus} className="button-row" style={{marginTop:14}}>
        <input type="hidden" name="id" value={m.id}/>
        <select name="status" defaultValue={m.status} className="inline-input"><option value="new">Nova</option><option value="read">Lida</option><option value="replied">Respondida</option><option value="archived">Arquivada</option></select>
        <button className="button">Guardar estado</button>
      </form>
    </article>)}</div>
  </AppShell>
}
