import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getAccessContext } from "@/lib/auth";

export default async function WorshipReportsPage({
  searchParams,
}:{searchParams:Promise<{from?:string;to?:string;theme?:string;q?:string;serviceType?:string}>}){
  const qs=await searchParams;
  const ctx=await getAccessContext();
  const {data:network}=await ctx.supabase.from("networks").select("id").eq("slug","worship").maybeSingle();
  const {data:membership}=network
    ?await ctx.supabase.from("network_memberships").select("role,status").eq("user_id",ctx.userId).eq("network_id",network.id).maybeSingle()
    :{data:null as any};
  const canLead=ctx.isAdmin||(membership?.status==="active"&&membership?.role==="leader");
  if(!canLead){
    return <AppShell title="Relatórios do Louvor" active="/worship" email={ctx.email}>
      <section className="hero-card"><p className="eyebrow">ACESSO RESTRITO</p><h2>Relatórios disponíveis apenas para líderes e administradores.</h2><Link className="button" href="/worship">Voltar</Link></section>
    </AppShell>;
  }

  const now=new Date();
  const defaultFrom=new Date(now);
  defaultFrom.setMonth(defaultFrom.getMonth()-4);
  const from=qs.from?new Date(qs.from+"T00:00:00"):defaultFrom;
  const to=qs.to?new Date(qs.to+"T23:59:59"):now;

  const [{data:executions,error},{data:songs},{data:themes},{data:teamAssignments},{data:directory},{data:memberProfiles}]=await Promise.all([
    ctx.supabase.from("worship_song_executions")
      .select("id,song_id,key_used,version_used,confirmed_at,worship_songs!inner(title,artist,composition_title,themes),worship_schedules!inner(id,title,service_type,starts_at,status)")
      .eq("worship_schedules.status","completed")
      .gte("worship_schedules.starts_at",from.toISOString())
      .lte("worship_schedules.starts_at",to.toISOString()),
    ctx.supabase.from("worship_songs").select("id,title,artist,composition_title,themes").eq("active",true).is("archived_at",null).order("title"),
    ctx.supabase.from("worship_themes").select("name").eq("active",true).order("name"),
    ctx.supabase.from("worship_schedule_members")
      .select("id,membership_id,attendance_status,worship_schedules!inner(id,title,starts_at,status)")
      .neq("worship_schedules.status","cancelled")
      .gte("worship_schedules.starts_at",from.toISOString())
      .lte("worship_schedules.starts_at",to.toISOString()),
    ctx.supabase.rpc("worship_member_directory"),
    ctx.supabase.from("worship_member_profiles").select("membership_id,group_code,roles,active").eq("active",true),
  ]);

  const theme=(qs.theme??"").trim().toLocaleLowerCase("pt-PT");
  const serviceType=(qs.serviceType??"").trim().toLocaleLowerCase("pt-PT");
  const q=(qs.q??"").trim().toLocaleLowerCase("pt-PT");
  const rows=(executions??[]).filter((row:any)=>{
    const song=row.worship_songs;
    const themeMatch=!theme||(song?.themes??[]).some((t:string)=>t.toLocaleLowerCase("pt-PT")===theme);
    const serviceMatch=!serviceType||String(row.worship_schedules?.service_type??"").toLocaleLowerCase("pt-PT").includes(serviceType);
    const qMatch=!q||[song?.title,song?.artist,song?.composition_title].some((x:any)=>String(x??"").toLocaleLowerCase("pt-PT").includes(q));
    return themeMatch&&serviceMatch&&qMatch;
  });

  const countBySong=new Map<string,{title:string;artist:string;count:number;last:string|null;themes:string[];recent30:number}>();
  const monthCounts=new Map<string,number>();
  const themeCounts=new Map<string,number>();
  const serviceTypeCounts=new Map<string,number>();
  const recentCutoff=new Date(to);
  recentCutoff.setDate(recentCutoff.getDate()-30);
  for(const row of rows as any[]){
    const song=row.worship_songs;
    const schedule=row.worship_schedules;
    const key=row.song_id;
    const current=countBySong.get(key)??{title:song?.title??"Música",artist:song?.artist??"",count:0,last:null,themes:song?.themes??[],recent30:0};
    current.count++;
    if(new Date(schedule.starts_at)>=recentCutoff) current.recent30++;
    if(!current.last||new Date(schedule.starts_at)>new Date(current.last)) current.last=schedule.starts_at;
    countBySong.set(key,current);
    const month=new Intl.DateTimeFormat("pt-PT",{timeZone:"Europe/Lisbon",year:"numeric",month:"2-digit"}).format(new Date(schedule.starts_at));
    monthCounts.set(month,(monthCounts.get(month)??0)+1);
    for(const themeName of song?.themes??[]) themeCounts.set(themeName,(themeCounts.get(themeName)??0)+1);
    const serviceType=String(schedule?.service_type??"").trim();
    if(serviceType) serviceTypeCounts.set(serviceType,(serviceTypeCounts.get(serviceType)??0)+1);
  }

  const ranking=[...countBySong.values()].sort((a,b)=>b.count-a.count||a.title.localeCompare(b.title,"pt-PT"));
  const highRotation=ranking.filter(item=>item.recent30>=2).sort((a,b)=>b.recent30-a.recent30||b.count-a.count);
  const topThemes=[...themeCounts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],"pt-PT"));
  const topServiceTypes=[...serviceTypeCounts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],"pt-PT"));
  const unused=(songs??[]).filter((song:any)=>!countBySong.has(song.id));
  const personByMembership=new Map((directory??[]).map((person:any)=>[person.membership_id,person]));
  const profileByMembership=new Map((memberProfiles??[]).map((profile:any)=>[profile.membership_id,profile]));
  const loadByMember=new Map<string,{membershipId:string;name:string;group:string;scheduled:number;completed:number}>();
  for(const person of directory??[]){
    if(person.status!=="active") continue;
    const profile=profileByMembership.get(person.membership_id) as any;
    loadByMember.set(person.membership_id,{
      membershipId:person.membership_id,
      name:person.display_name||person.email||"Membro",
      group:profile?.group_code||"—",
      scheduled:0,
      completed:0,
    });
  }
  for(const assignment of teamAssignments??[]){
    const person=personByMembership.get(assignment.membership_id) as any;
    const profile=profileByMembership.get(assignment.membership_id) as any;
    const current=loadByMember.get(assignment.membership_id)??{
      membershipId:assignment.membership_id,
      name:person?.display_name||person?.email||"Membro",
      group:profile?.group_code||"—",
      scheduled:0,
      completed:0,
    };
    current.scheduled++;
    if(assignment.attendance_status==="completed") current.completed++;
    loadByMember.set(assignment.membership_id,current);
  }
  const memberLoad=[...loadByMember.values()].sort((a,b)=>b.scheduled-a.scheduled||a.name.localeCompare(b.name,"pt-PT"));
  const activeLoads=memberLoad.filter(member=>member.group!=="—");
  const avgLoad=activeLoads.length?activeLoads.reduce((sum,member)=>sum+member.scheduled,0)/activeLoads.length:0;
  const overloaded=memberLoad.filter(member=>member.scheduled>=Math.max(3,Math.ceil(avgLoad+1)));
  const underloaded=memberLoad.filter(member=>member.scheduled===0);
  const groupLoad=new Map<string,{scheduled:number;completed:number;members:Set<string>}>();
  for(const member of memberLoad){
    if(member.group==="—") continue;
    const current=groupLoad.get(member.group)??{scheduled:0,completed:0,members:new Set<string>()};
    current.scheduled+=member.scheduled;
    current.completed+=member.completed;
    current.members.add(member.membershipId);
    groupLoad.set(member.group,current);
  }
  const groupLoadRows=[...groupLoad.entries()].sort((a,b)=>a[0].localeCompare(b[0],"pt-PT"));

  const query=new URLSearchParams();
  query.set("from",from.toISOString().slice(0,10));
  query.set("to",to.toISOString().slice(0,10));
  if(qs.theme) query.set("theme",qs.theme);
  if(qs.q) query.set("q",qs.q);
  if(qs.serviceType) query.set("serviceType",qs.serviceType);

  return <AppShell title="Relatórios do Louvor" active="/worship" email={ctx.email}>
    <div className="button-row" style={{marginBottom:18}}><Link className="button" href="/worship/repertoire">← Repertório</Link><a className="button primary" href={"/api/worship/reports.csv?"+query.toString()}>Exportar CSV</a></div>
    <section className="hero-card"><p className="eyebrow">RELATÓRIOS</p><h2>Utilização real do repertório.</h2><p>Somente execuções confirmadas em cultos concluídos entram nestes números.</p></section>
    {error&&<div className="notice warn" style={{marginTop:16}}>Não foi possível carregar todas as execuções.</div>}
    <form method="get" className="card form-grid" style={{marginTop:18}}>
      <div className="grid grid-4">
        <div className="field"><label>De</label><input type="date" name="from" defaultValue={from.toISOString().slice(0,10)}/></div>
        <div className="field"><label>Até</label><input type="date" name="to" defaultValue={to.toISOString().slice(0,10)}/></div>
        <div className="field"><label>Tema</label><select name="theme" defaultValue={qs.theme??""}><option value="">Todos</option>{(themes??[]).map((t:any)=><option key={t.name}>{t.name}</option>)}</select></div>
        <div className="field"><label>Tipo de culto</label><input name="serviceType" defaultValue={qs.serviceType??""} placeholder="Ex.: Celebração"/></div>
        <div className="field"><label>Música / artista</label><input name="q" defaultValue={qs.q??""}/></div>
      </div>
      <button className="button primary">Aplicar filtros</button>
    </form>

    <div className="grid grid-4" style={{marginTop:18}}>
      <article className="card metric"><span>Execuções</span><strong>{rows.length}</strong></article>
      <article className="card metric"><span>Músicas usadas</span><strong>{ranking.length}</strong></article>
      <article className="card metric"><span>Sem utilização</span><strong>{unused.length}</strong></article>
      <article className="card metric"><span>Meses no período</span><strong>{monthCounts.size}</strong></article>
    </div>

    <div className="section-title"><div><p className="eyebrow">EQUIPA</p><h2>Equilíbrio de escalas</h2></div><span className="muted small">Período filtrado · cultos cancelados excluídos.</span></div>
    <div className="grid grid-4">
      <article className="card metric"><span>Membros ativos</span><strong>{memberLoad.length}</strong></article>
      <article className="card metric"><span>Média de escalas</span><strong>{avgLoad.toFixed(1)}</strong></article>
      <article className="card metric"><span>Acima da média</span><strong>{overloaded.length}</strong></article>
      <article className="card metric"><span>Sem escala</span><strong>{underloaded.length}</strong></article>
    </div>
    <div className="grid grid-2" style={{marginTop:16}}>
      <div className="card">
        <p className="eyebrow">CARGA POR MEMBRO</p>
        <div className="list">{memberLoad.length===0?<div className="empty">Sem membros ativos para analisar.</div>:memberLoad.map(member=><div className="list-row" key={member.membershipId}><div><strong>{member.name}</strong><div className="muted small">Grupo {member.group} · {member.completed} presença{member.completed===1?"":"s"} concluída{member.completed===1?"":"s"}</div></div><span className={member.scheduled>=Math.max(3,Math.ceil(avgLoad+1))?"pill gold":"pill"}>{member.scheduled} escala{member.scheduled===1?"":"s"}</span></div>)}</div>
      </div>
      <div className="card">
        <p className="eyebrow">CARGA POR GRUPO</p>
        <div className="list">{groupLoadRows.length===0?<div className="empty">Nenhum grupo com dados no período.</div>:groupLoadRows.map(([group,load])=><div className="list-row" key={group}><div><strong>Grupo {group}</strong><div className="muted small">{load.members.size} membro{load.members.size===1?"":"s"} · {load.completed} presença{load.completed===1?"":"s"} concluída{load.completed===1?"":"s"}</div></div><span className="pill">{load.scheduled} escalas</span></div>)}</div>
      </div>
    </div>
    {(overloaded.length>0||underloaded.length>0)&&<div className="notice warn" style={{marginTop:14}}>
      {overloaded.length>0&&<span>{overloaded.length} membro{overloaded.length===1?"":"s"} com carga acima da média. </span>}
      {underloaded.length>0&&<span>{underloaded.length} membro{underloaded.length===1?"":"s"} ativo{underloaded.length===1?"":"s"} sem escala no período.</span>}
    </div>}

    <div className="section-title"><div><p className="eyebrow">ALTA ROTAÇÃO</p><h2>Repetição nos últimos 30 dias</h2></div><span className="muted small">Sinaliza músicas executadas 2× ou mais no recorte recente.</span></div>
    <div className="grid grid-3">{highRotation.length===0?<div className="empty">Nenhuma música com repetição elevada nos últimos 30 dias.</div>:highRotation.map((r:any)=><article className="card" key={r.title+"-"+r.artist}><span className="pill gold">{r.recent30}× / 30 dias</span><h3>{r.title}</h3><p className="muted">{r.artist||"Artista não informado"}</p><p className="small muted">{r.count}× no período filtrado{r.last?" · última "+new Date(r.last).toLocaleDateString("pt-PT"):""}</p></article>)}</div>

    <div className="section-title"><div><p className="eyebrow">DISTRIBUIÇÃO</p><h2>Temas e tipos de culto</h2></div><span className="muted small">Baseado apenas nas execuções confirmadas.</span></div>
    <div className="grid grid-2">
      <div className="card">
        <p className="eyebrow">TEMAS MAIS PRESENTES</p>
        <div className="list">{topThemes.length===0?<div className="empty">Nenhum tema associado às execuções filtradas.</div>:topThemes.slice(0,12).map(([name,count])=><div className="list-row" key={name}><strong>{name}</strong><span className="pill">{count}×</span></div>)}</div>
      </div>
      <div className="card">
        <p className="eyebrow">TIPOS DE CULTO</p>
        <div className="list">{topServiceTypes.length===0?<div className="empty">Nenhum tipo de culto disponível no período.</div>:topServiceTypes.slice(0,12).map(([name,count])=><div className="list-row" key={name}><strong>{name}</strong><span className="pill">{count}×</span></div>)}</div>
      </div>
    </div>

    <div className="section-title"><div><p className="eyebrow">RANKING</p><h2>Mais e menos cantadas</h2></div></div>
    <div className="list">{ranking.length===0?<div className="empty">Sem execuções confirmadas neste período.</div>:ranking.map((r:any,i:number)=><div className="list-row" key={r.title+"-"+i}><div><strong>{r.title}</strong><div className="muted small">{r.artist||"Artista não informado"}{r.themes.length?" · "+r.themes.join(", "):""}</div></div><div style={{textAlign:"right"}}><strong>{r.count}×</strong><div className="muted small">{r.last?new Date(r.last).toLocaleDateString("pt-PT"):"—"}</div></div></div>)}</div>

    <div className="section-title"><div><p className="eyebrow">SEM UTILIZAÇÃO</p><h2>Músicas não cantadas no período</h2></div></div>
    <div className="grid grid-3">{unused.length===0?<div className="empty">Todas as músicas ativas foram utilizadas.</div>:unused.map((song:any)=><article className="card" key={song.id}><h3>{song.title}</h3><p className="muted">{song.artist||"Artista não informado"}</p></article>)}</div>

    <div className="section-title"><div><p className="eyebrow">POR MÊS</p><h2>Execuções confirmadas</h2></div></div>
    <div className="grid grid-4">{[...monthCounts.entries()].sort().map(([month,count])=><article className="card metric" key={month}><span>{month}</span><strong>{count}</strong></article>)}</div>
  </AppShell>;
}
