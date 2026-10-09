import { AppShell } from "@/components/app-shell";
import { getAccessContext } from "@/lib/auth";
import { updateProfile } from "./actions";

export default async function ProfilePage({searchParams}:{searchParams:Promise<{message?:string}>}){
  const qs=await searchParams;
  const ctx=await getAccessContext();
  const {data:xp}=await ctx.supabase.from("xp_events").select("xp").eq("user_id",ctx.userId);
  const totalXp=(xp??[]).reduce((s,r)=>s+(r.xp??0),0);
  return <AppShell title="Perfil" active="/profile" email={ctx.email}>
    {qs.message&&<div className="notice" style={{marginBottom:16}}>{qs.message}</div>}
    <div className="grid grid-2">
      <form action={updateProfile} className="card form-grid">
        <p className="eyebrow">DADOS PESSOAIS</p>
        <div className="field"><label>Nome</label><input name="display_name" defaultValue={ctx.profile?.display_name??""}/></div>
        <div className="field"><label>Contacto</label><input name="phone" defaultValue={ctx.profile?.phone??""}/></div>
        <div className="field"><label>Email</label><input value={ctx.email} disabled/></div>
        <button className="button primary">Guardar</button>
      </form>
      <div className="card">
        <p className="eyebrow">CONTA</p><h2>{ctx.profile?.display_name||ctx.email}</h2>
        <div className="list">
          <div className="list-row"><span>Verificação para ministérios</span><span className={ctx.profile?.email_verified_at?"pill ok":"pill gold"}>{ctx.profile?.email_verified_at?"Verificado":"Pendente"}</span></div>
          <div className="list-row"><span>XP</span><strong>{totalXp}</strong></div>
          <div className="list-row"><span>Papel global</span><span className="pill">{ctx.profile?.global_role??"user"}</span></div>
          <div className="list-row"><span>Louvor</span><span className="pill">{ctx.isWorshipLeader?"Líder":ctx.isWorshipMember?"Membro":"Sem acesso"}</span></div>
        </div>
      </div>
    </div>
  </AppShell>
}
