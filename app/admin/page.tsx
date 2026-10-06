import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getAccessContext } from "@/lib/auth";
import { setEmailVerification, setGlobalRole } from "./actions";

export default async function AdminPage({searchParams}:{searchParams:Promise<{message?:string}>}){
  const qs=await searchParams; const ctx=await getAccessContext();
  if(!ctx.isAdmin)return <AppShell title="Admin" active="/admin" email={ctx.email}><section className="hero-card"><p className="eyebrow">ACESSO RESTRITO</p><h2>Administração global</h2><p>Esta área exige o papel Admin.</p></section></AppShell>;
  const {data:users}=await ctx.supabase.rpc("admin_user_directory");
  return <AppShell title="Admin" active="/admin" email={ctx.email}>
    {qs.message&&<div className="notice" style={{marginBottom:16}}>{qs.message}</div>}
    <div className="button-row" style={{marginBottom:18}}><Link className="button primary" href="/admin/academy">Gerir Academy</Link><Link className="button" href="/media">Gerir site e conteúdo</Link><Link className="button" href="/">Ver site público</Link></div>
    <div className="grid grid-2">
      <section className="card"><p className="eyebrow">UTILIZADORES</p><h2>{(users??[]).length} contas</h2><p className="muted">As contas públicas ficam ativas imediatamente. A verificação de email é um controlo separado para acessos internos.</p></section>
      <form action={setGlobalRole} className="card form-grid"><p className="eyebrow">PAPEL GLOBAL</p><div className="field"><label>Email</label><input name="email" type="email" required/></div><div className="field"><label>Papel</label><select name="role"><option value="user">Utilizador</option><option value="admin">Admin</option></select></div><button className="button primary">Atualizar</button></form>
    </div>
    <div className="section-title"><h2>Verificação para ministérios</h2></div>
    <form action={setEmailVerification} className="card form-grid" style={{maxWidth:760}}>
      <div className="field"><label>Email</label><input name="email" type="email" required/></div>
      <div className="field"><label>Estado</label><select name="verified"><option value="true">Verificado</option><option value="false">Pendente</option></select></div>
      <button className="button primary">Atualizar verificação</button>
    </form>
    <div className="section-title"><h2>Diretório</h2></div>
    <div className="list">{(users??[]).map((u:any)=><div className="list-row" key={u.user_id}><div><h3>{u.display_name||u.email}</h3><span className="muted small">{u.email} · {u.phone||"sem contacto"}</span></div><div className="button-row"><span className={u.email_verified_at?"pill ok":"pill"}>{u.email_verified_at?"email verificado":"email pendente"}</span><span className={u.global_role==="admin"?"pill gold":"pill"}>{u.global_role}</span></div></div>)}</div>
  </AppShell>
}
