import Link from "next/link";
import {AppShell} from "@/components/app-shell";
import {getAccessContext} from "@/lib/auth";

export default async function SystemHealthPage(){
  const ctx=await getAccessContext();
  if(!ctx.isAdmin) return <AppShell title="Saúde do sistema" active="/admin" email={ctx.email}><section className="hero-card"><p className="eyebrow">ACESSO RESTRITO</p><h2>Administração global</h2><p>Esta área exige o papel Admin.</p></section></AppShell>;
  const now=new Date().toISOString();
  const [songs,lessons,resources,members,backups,schedules,scheduleMembers,scheduleSongs,subs,offers,overdue,newMessages]=await Promise.all([
    ctx.supabase.from("worship_songs").select("id,title,service_types").eq("active",true).is("archived_at",null),
    ctx.supabase.from("academy_lessons").select("id,title,youtube_id").eq("active",true),
    ctx.supabase.from("academy_resources").select("id",{count:"exact",head:true}).eq("active",true),
    ctx.supabase.from("worship_member_profiles").select("membership_id,roles").eq("active",true),
    ctx.supabase.from("worship_member_backup_pool").select("primary_membership_id,role").eq("active",true),
    ctx.supabase.from("worship_schedules").select("id,title").eq("publication_state","published").gte("starts_at",now).neq("status","cancelled"),
    ctx.supabase.from("worship_schedule_members").select("schedule_id"),
    ctx.supabase.from("worship_schedule_songs").select("schedule_id"),
    ctx.supabase.from("worship_substitution_requests").select("id").eq("status","requested"),
    ctx.supabase.from("worship_substitution_offers").select("request_id").eq("status","pending"),
    ctx.supabase.from("content_items").select("id,title").eq("status","scheduled").lte("scheduled_for",now),
    ctx.supabase.from("contact_messages").select("id",{count:"exact",head:true}).eq("status","new"),
  ]);
  const errors=[songs.error,lessons.error,resources.error,members.error,backups.error,schedules.error,scheduleMembers.error,scheduleSongs.error,subs.error,offers.error,overdue.error,newMessages.error].filter(Boolean);
  const unclassified=(songs.data??[]).filter((x:any)=>!Array.isArray(x.service_types)||x.service_types.length===0);
  const lessonsNoVideo=(lessons.data??[]).filter((x:any)=>!String(x.youtube_id??"").trim());
  const membersNoRoles=(members.data??[]).filter((x:any)=>!Array.isArray(x.roles)||x.roles.length===0);
  const vocals=(members.data??[]).filter((x:any)=>Array.isArray(x.roles)&&x.roles.some((r:string)=>["cantor_principal","backing_vocal"].includes(r)));
  const covered=new Set((backups.data??[]).filter((x:any)=>["cantor_principal","backing_vocal"].includes(x.role)).map((x:any)=>x.primary_membership_id));
  const vocalsNoBackup=vocals.filter((x:any)=>!covered.has(x.membership_id));
  const withPeople=new Set((scheduleMembers.data??[]).map((x:any)=>x.schedule_id));
  const withSongs=new Set((scheduleSongs.data??[]).map((x:any)=>x.schedule_id));
  const published=schedules.data??[];
  const noPeople=published.filter((x:any)=>!withPeople.has(x.id));
  const noSongs=published.filter((x:any)=>!withSongs.has(x.id));
  const offerIds=new Set((offers.data??[]).map((x:any)=>x.request_id));
  const noOffers=(subs.data??[]).filter((x:any)=>!offerIds.has(x.id));
  const checks=[
    {label:"Banco de dados",value:errors.length?String(errors.length)+" erro(s)":"Operacional",ok:errors.length===0,href:"/api/health"},
    {label:"Músicas sem tipo de culto",value:String(unclassified.length),ok:unclassified.length===0,href:"/worship/repertoire"},
    {label:"Aulas ativas sem vídeo",value:String(lessonsNoVideo.length),ok:lessonsNoVideo.length===0,href:"/admin/academy"},
    {label:"Recursos ativos da Academy",value:String(resources.count??0),ok:(resources.count??0)>0,href:"/admin/academy/resources"},
    {label:"Membros sem função",value:String(membersNoRoles.length),ok:membersNoRoles.length===0,href:"/worship"},
    {label:"Cantores sem backup",value:String(vocalsNoBackup.length),ok:vocalsNoBackup.length===0,href:"/worship/band-rotation"},
    {label:"Escalas publicadas sem participantes",value:String(noPeople.length),ok:noPeople.length===0,href:"/worship"},
    {label:"Escalas publicadas sem repertório",value:String(noSongs.length),ok:noSongs.length===0,href:"/worship"},
    {label:"Substituições abertas sem oferta",value:String(noOffers.length),ok:noOffers.length===0,href:"/worship/substitutions"},
    {label:"Publicações agendadas atrasadas",value:String((overdue.data??[]).length),ok:(overdue.data??[]).length===0,href:"/admin/aprovacoes"},
    {label:"Mensagens novas",value:String(newMessages.count??0),ok:(newMessages.count??0)===0,href:"/admin/mensagens"},
  ];
  const issues=checks.filter(x=>!x.ok).length;
  return <AppShell title="Saúde do sistema" active="/admin" email={ctx.email}>
    <div className="button-row" style={{marginBottom:18}}><Link className="button" href="/admin">← Administração</Link><a className="button" href="/api/health" target="_blank" rel="noreferrer">Endpoint de saúde</a></div>
    <section className="hero-card"><p className="eyebrow">REVIVER SYSTEM HEALTH</p><h2>{issues===0?"Tudo operacional.":String(issues)+" ponto(s) requerem atenção."}</h2><p>Diagnóstico em tempo real das áreas críticas do portal.</p></section>
    <div className="grid grid-3" style={{marginTop:18}}><div className="card metric"><span>Verificações</span><strong>{checks.length}</strong></div><div className="card metric"><span>Sem pendências</span><strong>{checks.filter(x=>x.ok).length}</strong></div><div className="card metric"><span>Requer atenção</span><strong>{issues}</strong></div></div>
    <div className="section-title"><div><p className="eyebrow">DIAGNÓSTICO</p><h2>Estado atual</h2></div><span className="muted small">Atualizado ao abrir a página</span></div>
    <div className="list">{checks.map(check=><Link href={check.href} className="list-row" key={check.label}><div><span className={check.ok?"pill ok":"pill gold"}>{check.ok?"OK":"ATENÇÃO"}</span><h3 style={{marginTop:8}}>{check.label}</h3></div><div style={{textAlign:"right"}}><strong>{check.value}</strong><div className="muted small">Abrir →</div></div></Link>)}</div>
  </AppShell>;
}