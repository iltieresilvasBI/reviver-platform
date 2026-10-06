import { AppShell } from "@/components/app-shell";
import { getAccessContext } from "@/lib/auth";
import { setGlobalRole } from "./actions";

export default async function AdminPage({searchParams}:{searchParams:Promise<{message?:string}>}){
  const qs=await searchParams; const ctx=await getAccessContext();
  if(!ctx.isAdmin)return <AppShell title="Admin" active="/admin" email={ctx.email}><section className="hero-card"><p className="eyebrow">ACESSO RESTRITO</p><h2>Administração global</h2><p>Esta área exige o papel Admin.</p></section></AppShell>;
  const {data:users}=await ctx.supabase.rpc("admin_user_directory");
  return <AppShell title="Admin" active="/admin" email={ctx.email}>
    {qs.message&&<div className="notice" style={{marginBottom:16}}>{qs.message}</div>}
    <div className="grid grid-2">
      <section className="card"><p className="eyebrow">UTILIZADORES</p><h2>{(users??[]).length} contas</h2><p className="muted">A primeira conta criada na plataforma torna-se Admin automaticamente. Admins adicionais podem ser atribuídos aqui.</p></section>
      <form action={setGlobalRole} className="card form-grid"><p className="eyebrow">PAPEL GLOBAL</p><div className="field"><label>Email</label><input name="email" type="email" required/></div><div className="field"><label>Papel</label><select name="role"><option value="user">Utilizador</option><option value="admin">Admin</option></select></div><button className="button primary">Atualizar</button></form>
    </div>
    <div className="section-title"><h2>Diretório</h2></div>
    <div className="list">{(users??[]).map((u:any)=><div className="list-row" key={u.user_id}><div><h3>{u.display_name||u.email}</h3><span className="muted small">{u.email} · {u.phone||"sem contacto"}</span></div><span className={u.global_role==="admin"?"pill gold":"pill"}>{u.global_role}</span></div>)}</div>
  </AppShell>
}
