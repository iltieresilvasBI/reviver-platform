import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

export default async function AchievementsPage(){
  const {supabase,userId,email}=await requireUser();
  const [{data:all},{data:mine}]=await Promise.all([
    supabase.from("achievements").select("id,slug,title,description,icon"),
    supabase.from("user_achievements").select("achievement_id,awarded_at").eq("user_id",userId)
  ]);
  return <AppShell title="Conquistas" active="/achievements" email={email}>
    <section className="hero-card"><p className="eyebrow">PROGRESSO PESSOAL</p><h2>Marcos, não competição.</h2><p>As conquistas reconhecem consistência e evolução. A Reviver Academy não usa ranking entre alunos.</p></section>
    <div className="section-title"><h2>Conquistas</h2></div>
    <div className="grid grid-3">{(all??[]).length===0?<div className="empty">As primeiras conquistas serão libertadas com o avanço do currículo.</div>:(all??[]).map(a=>{const got=(mine??[]).find(m=>m.achievement_id===a.id);return <div className="card" key={a.id} style={{opacity:got?1:.55}}><div style={{fontSize:28}}>{a.icon||"◇"}</div><h3>{a.title}</h3><p className="muted">{a.description}</p><span className={got?"pill ok":"pill"}>{got?"Conquistada":"Por desbloquear"}</span></div>})}</div>
  </AppShell>
}
