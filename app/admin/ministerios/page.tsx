import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getAccessContext } from "@/lib/auth";
import { setNetworkMembershipAdmin } from "../actions";

export default async function AdminMinistriesPage({searchParams}:{searchParams:Promise<{message?:string}>}){
  const qs=await searchParams;
  const ctx=await getAccessContext();
  if(!ctx.isAdmin){
    return <AppShell title="Ministérios" active="/admin" email={ctx.email}><section className="hero-card"><h2>Acesso de administrador necessário.</h2><Link className="button" href="/dashboard">Voltar</Link></section></AppShell>;
  }
  const [{data:networks},{data:memberships},{data:peopleAssignments},{data:users}]=await Promise.all([
    ctx.supabase.from("networks").select("id,slug,name,active").order("name"),
    ctx.supabase.from("network_memberships").select("id,user_id,network_id,role,status"),
    ctx.supabase.from("ministry_person_assignments").select("id,network_id,active"),
    ctx.supabase.rpc("admin_user_directory"),
  ]);
  const counts=new Map<string,{accounts:number;leaders:number;directory:number}>();
  for(const network of networks??[])counts.set(network.id,{accounts:0,leaders:0,directory:0});
  for(const m of memberships??[]){const c=counts.get(m.network_id);if(c&&m.status==="active"){c.accounts++;if(m.role==="leader")c.leaders++}}
  for(const m of peopleAssignments??[]){const c=counts.get(m.network_id);if(c&&m.active)c.directory++}

  return <AppShell title="Gestão dos Ministérios" active="/admin" email={ctx.email}>
    {qs.message&&<div className="notice" style={{marginBottom:16}}>{qs.message}</div>}
    <div className="button-row" style={{marginBottom:18}}><Link className="button" href="/admin">← Administração</Link><Link className="button" href="/worship/import">Importar diretório</Link></div>
    <section className="hero-card"><p className="eyebrow">MINISTÉRIOS</p><h2>Uma conta, vários ministérios e funções.</h2><p>Louvor, Mídia, Som, Iluminação, Receção e Infantil podem ter membros e líderes independentes sem duplicar a conta do utilizador.</p></section>

    <div className="grid grid-3" style={{marginTop:18}}>{(networks??[]).map((n:any)=>{const c=counts.get(n.id)!;return <article className="card" key={n.id}><span className={n.active?"pill ok":"pill"}>{n.active?"ativo":"inativo"}</span><h3>{n.name}</h3><div className="grid grid-3"><div className="metric"><span>Contas</span><strong>{c.accounts}</strong></div><div className="metric"><span>Líderes</span><strong>{c.leaders}</strong></div><div className="metric"><span>Diretório</span><strong>{c.directory}</strong></div></div></article>})}</div>

    <div className="section-title"><div><p className="eyebrow">ACESSO AO PORTAL</p><h2>Atribuir membro ou líder</h2></div></div>
    <form action={setNetworkMembershipAdmin} className="card form-grid">
      <div className="grid grid-4">
        <div className="field"><label>Conta existente</label><select name="email" required><option value="">Selecionar</option>{(users??[]).map((u:any)=><option key={u.user_id} value={u.email}>{u.display_name||u.email} · {u.email}</option>)}</select></div>
        <div className="field"><label>Ministério</label><select name="networkSlug" required>{(networks??[]).filter((n:any)=>n.active).map((n:any)=><option value={n.slug} key={n.id}>{n.name}</option>)}</select></div>
        <div className="field"><label>Papel</label><select name="role"><option value="member">Membro</option><option value="leader">Líder</option></select></div>
        <div className="field"><label>Estado</label><select name="status"><option value="active">Ativo</option><option value="revoked">Revogado</option><option value="invited">Convidado</option></select></div>
      </div>
      <button className="button primary">Guardar acesso</button>
    </form>

    <div className="section-title"><div><p className="eyebrow">CONTAS</p><h2>Participações atuais</h2></div></div>
    <div className="list">{(users??[]).map((u:any)=>{
      const mine=(memberships??[]).filter((m:any)=>m.user_id===u.user_id);
      return <div className="list-row" key={u.user_id}><div><strong>{u.display_name||u.email}</strong><div className="muted small">{u.email}</div></div><div className="button-row">{mine.map((m:any)=>{const n=(networks??[]).find((x:any)=>x.id===m.network_id);return <span className={m.status==="active"?"pill ok":"pill"} key={m.id}>{n?.name||"Ministério"} · {m.role} · {m.status}</span>})}</div></div>
    })}</div>
  </AppShell>;
}
