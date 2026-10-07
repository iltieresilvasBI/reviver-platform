import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getAccessContext } from "@/lib/auth";
import { grantMediaRoleAdmin, setEmailVerification, setGlobalRole } from "../actions";

export default async function UsersAdmin({searchParams}:{searchParams:Promise<{message?:string;q?:string}>}){
  const qs=await searchParams;
  const ctx=await getAccessContext();
  if(!ctx.isAdmin) return <AppShell title="Utilizadores" active="/admin" email={ctx.email}><div className="empty">Acesso reservado a Admin.</div></AppShell>;

  const [{data:users,error},{data:appRoles}]=await Promise.all([
    ctx.supabase.rpc("admin_user_directory"),
    ctx.supabase.from("user_app_roles").select("user_id,role")
  ]);

  const allUsers=users??[];
  const query=(qs.q??"").trim().toLowerCase();
  const filtered=allUsers.filter((u:any)=>{
    if(!query) return true;
    return [u.display_name,u.email,u.phone].some(v=>String(v??"").toLowerCase().includes(query));
  });

  const rolesByUser=new Map<string,string[]>();
  for(const row of appRoles??[]){
    const current=rolesByUser.get(row.user_id)??[];
    current.push(row.role);
    rolesByUser.set(row.user_id,current);
  }

  const adminCount=allUsers.filter((u:any)=>u.global_role==="admin").length;
  const verifiedCount=allUsers.filter((u:any)=>Boolean(u.email_verified_at)).length;
  const mediaCount=new Set((appRoles??[]).map((r:any)=>r.user_id)).size;

  return <AppShell title="Utilizadores e Acessos" active="/admin" email={ctx.email}>
    <div className="button-row" style={{marginBottom:18}}><Link className="button" href="/admin">← Centro de Administração</Link></div>
    {qs.message&&<div className="notice" style={{marginBottom:16}}>{qs.message}</div>}
    {error&&<div className="notice warn" style={{marginBottom:16}}>Não foi possível carregar o diretório: {error.message}</div>}

    <section className="hero-card">
      <p className="eyebrow">ACESSOS E PERMISSÕES</p>
      <h2>Gerir contas sem copiar emails entre ecrãs.</h2>
      <p>Promove ou rebaixa Admins, atribui papéis de mídia e controla a verificação interna diretamente no diretório.</p>
    </section>

    <div className="grid grid-4" style={{marginTop:18}}>
      <article className="card metric"><span>Contas</span><strong>{allUsers.length}</strong></article>
      <article className="card metric"><span>Admins</span><strong>{adminCount}</strong></article>
      <article className="card metric"><span>Verificados</span><strong>{verifiedCount}</strong></article>
      <article className="card metric"><span>Com papel de mídia</span><strong>{mediaCount}</strong></article>
    </div>

    <div className="section-title"><div><p className="eyebrow">DIRETÓRIO</p><h2>Utilizadores</h2></div><span className="muted small">{filtered.length} de {allUsers.length} contas</span></div>
    <form method="get" className="card" style={{marginBottom:16}}>
      <div className="button-row">
        <input name="q" defaultValue={qs.q??""} placeholder="Pesquisar por nome, email ou contacto" style={{flex:1,minWidth:240}}/>
        <button className="button primary" type="submit">Pesquisar</button>
        {query&&<Link className="button" href="/admin/utilizadores">Limpar</Link>}
      </div>
    </form>

    <div className="list">{filtered.length===0?<div className="empty">Nenhum utilizador encontrado.</div>:filtered.map((u:any)=>{
      const roles=rolesByUser.get(u.user_id)??[];
      const mediaRole=roles.includes("media_leader")?"media_leader":roles.includes("media_editor")?"media_editor":"";
      return <details className="card" key={u.user_id}>
        <summary style={{cursor:"pointer"}}>
          <div className="list-row" style={{padding:0,border:0}}>
            <div>
              <h3>{u.display_name||u.email}</h3>
              <span className="muted small">{u.email} · {u.phone||"sem contacto"}</span>
            </div>
            <div className="button-row">
              <span className={u.email_verified_at?"pill ok":"pill gold"}>{u.email_verified_at?"verificado":"pendente"}</span>
              <span className={u.global_role==="admin"?"pill gold":"pill"}>{u.global_role}</span>
              {mediaRole&&<span className="pill">{mediaRole==="media_leader"?"líder de mídia":"editor de mídia"}</span>}
            </div>
          </div>
        </summary>

        <div className="grid grid-3" style={{marginTop:18}}>
          <form action={setGlobalRole} className="form-grid">
            <input type="hidden" name="email" value={u.email}/>
            <p className="eyebrow">PAPEL GLOBAL</p>
            <div className="field"><label>Administração</label><select name="role" defaultValue={u.global_role}><option value="user">Utilizador</option><option value="admin">Admin</option></select></div>
            <button className="button primary">Guardar papel global</button>
          </form>

          <form action={grantMediaRoleAdmin} className="form-grid">
            <input type="hidden" name="email" value={u.email}/>
            <p className="eyebrow">EQUIPA DE MÍDIA</p>
            <div className="field"><label>Papel</label><select name="role" defaultValue={mediaRole||"media_editor"}><option value="media_editor">Editor</option><option value="media_leader">Líder de Mídia</option></select></div>
            <button className="button">Atribuir / atualizar</button>
            <span className="muted small">{mediaRole?"Papel atual: "+(mediaRole==="media_leader"?"Líder de Mídia":"Editor de Mídia"):"Sem papel de mídia atribuído."}</span>
          </form>

          <form action={setEmailVerification} className="form-grid">
            <input type="hidden" name="email" value={u.email}/>
            <p className="eyebrow">VERIFICAÇÃO INTERNA</p>
            <div className="field"><label>Estado</label><select name="verified" defaultValue={u.email_verified_at?"true":"false"}><option value="true">Verificado</option><option value="false">Pendente</option></select></div>
            <button className="button">Guardar verificação</button>
          </form>
        </div>

        <div className="muted small" style={{marginTop:14}}>Conta criada em {u.created_at?new Date(u.created_at).toLocaleDateString("pt-PT"):"data indisponível"}.</div>
      </details>
    })}</div>
  </AppShell>
}
