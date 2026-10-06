import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getAccessContext } from "@/lib/auth";
import { setEmailVerification, setGlobalRole } from "../actions";
import { grantMediaRole } from "@/app/media/actions";

export default async function UsersAdmin({searchParams}:{searchParams:Promise<{message?:string}>}){
  const qs=await searchParams; const ctx=await getAccessContext();
  if(!ctx.isAdmin) return <AppShell title="Utilizadores" active="/admin" email={ctx.email}><div className="empty">Acesso reservado a Admin.</div></AppShell>;
  const {data:users,error}=await ctx.supabase.rpc("admin_user_directory");
  return <AppShell title="Utilizadores e Acessos" active="/admin" email={ctx.email}>
    <div className="button-row" style={{marginBottom:18}}><Link className="button" href="/admin">← Centro de Administração</Link></div>
    {qs.message&&<div className="notice" style={{marginBottom:16}}>{qs.message}</div>}
    {error&&<div className="notice warn" style={{marginBottom:16}}>Não foi possível carregar o diretório: {error.message}</div>}
    <div className="grid grid-3">
      <form action={setGlobalRole} className="card form-grid"><p className="eyebrow">ADMIN GLOBAL</p><div className="field"><label>Email</label><input name="email" type="email" required/></div><div className="field"><label>Papel</label><select name="role"><option value="user">Utilizador</option><option value="admin">Admin</option></select></div><button className="button primary">Atualizar papel</button></form>
      <form action={grantMediaRole} className="card form-grid"><p className="eyebrow">EQUIPA DE MÍDIA</p><div className="field"><label>Email</label><input name="email" type="email" required/></div><div className="field"><label>Papel</label><select name="role"><option value="media_editor">Editor</option><option value="media_leader">Líder de Mídia</option></select></div><button className="button primary">Atribuir papel</button></form>
      <form action={setEmailVerification} className="card form-grid"><p className="eyebrow">ACESSO A MINISTÉRIOS</p><div className="field"><label>Email</label><input name="email" type="email" required/></div><div className="field"><label>Verificação interna</label><select name="verified"><option value="true">Verificado</option><option value="false">Pendente</option></select></div><button className="button primary">Atualizar verificação</button></form>
    </div>
    <div className="section-title"><h2>Diretório</h2><span className="muted small">{(users??[]).length} contas</span></div>
    <div className="list">{(users??[]).map((u:any)=><div className="list-row" key={u.user_id}><div><h3>{u.display_name||u.email}</h3><span className="muted small">{u.email} · {u.phone||"sem contacto"}</span></div><div className="button-row"><span className={u.email_verified_at?"pill ok":"pill gold"}>{u.email_verified_at?"verificado":"pendente"}</span><span className={u.global_role==="admin"?"pill gold":"pill"}>{u.global_role}</span></div></div>)}</div>
  </AppShell>
}
