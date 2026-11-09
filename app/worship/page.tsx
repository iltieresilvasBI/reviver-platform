import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SubmitButton } from "@/components/submit-button";
import { SongAutoFillFields } from "./repertoire/song-autofill";
import { ScheduleSongPicker } from "./schedule-song-picker";
import { getAccessContext } from "@/lib/auth";
import {
  acceptWorshipInvite,assignWorshipMember,autoAssignWorshipGroup,createWorshipItem,
  createWorshipRehearsal,createWorshipSchedule,createWorshipSong,createWorshipUnavailability,decideWorship,
  deleteWorshipUnavailability,createWorshipMember,markWorshipAttendance,removeSongFromWorshipSchedule,removeWorshipAssignment,requestWorshipAccess,
  respondToWorshipAssignment,saveWorshipMemberProfile,updateWorshipScheduleStatus,updateWorshipScheduleTheme,
  updateWorshipPublication,setWorshipPublicRepertoire,finalizeWorshipService
} from "./actions";

const roleOptions=[
  ["cantor_principal","Cantor principal"],
  ["backing_vocal","Backing vocal"],
  ["violao","Violão"],
  ["guitarra","Guitarra"],
  ["baixo","Baixo"],
  ["bateria","Bateria"],
  ["teclado","Teclado/Piano"],
  ["tecnico_som","Técnico de som"],
  ["iluminacao","Iluminação"],
];

function roleLabel(value:string|null|undefined){
  return roleOptions.find(([v])=>v===value)?.[1]??value??"Função não definida";
}

function lisbonDateKey(value:string|Date){
  const parts=new Intl.DateTimeFormat("en-GB",{
    timeZone:"Europe/Lisbon",year:"numeric",month:"2-digit",day:"2-digit"
  }).formatToParts(new Date(value));
  const get=(type:string)=>parts.find(p=>p.type===type)?.value??"";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export default async function WorshipPage({searchParams}:{searchParams:Promise<{message?:string;memberGroup?:string;memberRole?:string}>}){
  const qs=await searchParams;
  const ctx=await getAccessContext();
  const {data:network}=await ctx.supabase.from("networks").select("id").eq("slug","worship").single();
  const {data:membership}=network
    ?await ctx.supabase.from("network_memberships").select("id,role,status,requested_at,approved_at").eq("user_id",ctx.userId).eq("network_id",network.id).maybeSingle()
    :{data:null as any};

  const canRead=ctx.isAdmin||membership?.status==="active";
  const canLead=ctx.isAdmin||(membership?.status==="active"&&membership?.role==="leader");

  if(!canRead){
    return <AppShell title="Gestão do Louvor" active="/worship" email={ctx.email} variant="worship-leader">
      {qs.message&&<div className="notice" style={{marginBottom:16}}>{qs.message}</div>}
      <section className="hero-card">
        <p className="eyebrow">ACESSO INTERNO</p><h2>Recursos do Ministério de Louvor</h2>
        <p>Escalas, ensaios, repertório, formação e documentos são reservados a membros aprovados.</p>
        {!ctx.profile?.email_verified_at&&<p className="notice warn">O email precisa de verificação administrativa para ativar o acesso ao ministério.</p>}
        {membership?.status==="pending"
          ?<span className="pill gold">Pedido em análise</span>
          :membership?.status==="invited"
            ?<form action={acceptWorshipInvite}><button className="button primary">Aceitar convite</button></form>
            :<form action={requestWorshipAccess}><button className="button primary">Pedir acesso</button></form>}
      </section>
    </AppShell>;
  }

  const [
    {data:items},{data:memberProfiles},{data:schedules},{data:songs},
    {data:assignments},{data:scheduleSongs},{data:rehearsals},{data:responses},{data:unavailability},{data:executions}
  ]=await Promise.all([
    ctx.supabase.from("worship_items").select("id,item_type,title,body,starts_at,external_url,created_at").order("starts_at",{ascending:true}).order("created_at",{ascending:false}),
    ctx.supabase.from("worship_member_profiles").select("id,membership_id,group_code,roles,notes,active"),
    ctx.supabase.from("worship_schedules").select("*").order("starts_at",{ascending:true}).limit(50),
    ctx.supabase.from("worship_songs").select("*").eq("active",true).order("title"),
    ctx.supabase.from("worship_schedule_members").select("*").order("created_at"),
    ctx.supabase.from("worship_schedule_songs").select("*").order("position"),
    ctx.supabase.from("worship_rehearsals").select("*").order("starts_at",{ascending:true}).limit(50),
    ctx.supabase.from("worship_assignment_responses").select("assignment_id,response_status,note,responded_at"),
    ctx.supabase.from("worship_member_unavailability").select("id,membership_id,starts_on,ends_on,reason,created_at").order("starts_on"),
    ctx.supabase.from("worship_song_executions").select("id,schedule_id,song_id,key_used,version_used,confirmed_at,worship_schedules!inner(title,starts_at,status)"),
  ]);

  const now=Date.now();
  const upcomingSchedules=(schedules??[]).filter((s:any)=>new Date(s.starts_at).getTime()>=now&&s.status!=="cancelled");
  const recentPastSchedules=(schedules??[]).filter((s:any)=>new Date(s.starts_at).getTime()<now&&s.status!=="cancelled").slice(-8).reverse();
  const upcomingRehearsals=(rehearsals??[]).filter((r:any)=>new Date(r.starts_at).getTime()>=now);
  const myAssignments=(assignments??[]).filter((a:any)=>a.membership_id===membership?.id);
  const myProfile=(memberProfiles??[]).find((p:any)=>p.membership_id===membership?.id);
  const todayKey=lisbonDateKey(new Date());
  const myUnavailability=(unavailability??[]).filter((u:any)=>u.membership_id===membership?.id&&u.ends_on>=todayKey);
  const conflictsFor=(membershipId:string,scheduleStart:string)=>{
    const date=lisbonDateKey(scheduleStart);
    return (unavailability??[]).filter((u:any)=>u.membership_id===membershipId&&u.starts_on<=date&&u.ends_on>=date);
  };

  if(!canLead){
    const memberScheduleIds=new Set(myAssignments.map((a:any)=>a.schedule_id));
    const memberSchedules=upcomingSchedules.filter((schedule:any)=>memberScheduleIds.has(schedule.id));
    const memberSongsById=new Map((songs??[]).map((song:any)=>[song.id,song]));
    const memberResponseByAssignment=new Map((responses??[]).map((row:any)=>[row.assignment_id,row]));
    const relevantRehearsals=upcomingRehearsals.filter((r:any)=>!r.schedule_id||memberScheduleIds.has(r.schedule_id));
    const memberReminders:any[]=[];
    for(const schedule of memberSchedules){
      const assignment=myAssignments.find((a:any)=>a.schedule_id===schedule.id);
      const response=assignment?memberResponseByAssignment.get(assignment.id) as any:null;
      const hoursUntil=(new Date(schedule.starts_at).getTime()-Date.now())/3600000;
      const setlist=(scheduleSongs??[]).filter((x:any)=>x.schedule_id===schedule.id);
      if(assignment&&!response) memberReminders.push({kind:"action",title:"Confirmação pendente",body:schedule.title+" · responde se podes servir.",href:"#schedule-"+schedule.id});
      if(hoursUntil>=0&&hoursUntil<=48) memberReminders.push({kind:"soon",title:"Culto nas próximas 48h",body:schedule.title+" · "+new Date(schedule.starts_at).toLocaleString("pt-PT"),href:"#schedule-"+schedule.id});
      if(setlist.length===0) memberReminders.push({kind:"info",title:"Repertório ainda não publicado",body:schedule.title+" ainda não tem músicas definidas.",href:"#schedule-"+schedule.id});
    }
    for(const rehearsal of relevantRehearsals){
      const hoursUntil=(new Date(rehearsal.starts_at).getTime()-Date.now())/3600000;
      if(hoursUntil>=0&&hoursUntil<=48) memberReminders.push({kind:"soon",title:"Ensaio nas próximas 48h",body:rehearsal.title+" · "+new Date(rehearsal.starts_at).toLocaleString("pt-PT"),href:"#rehearsals"});
    }

    return <AppShell title="Meu Louvor" active="/worship" email={ctx.email} variant="worship-member">
      {qs.message&&<div className="notice" style={{marginBottom:16}}>{qs.message}</div>}
      <div className="member-readonly">
        <section className="hero-card">
          <p className="eyebrow">ÁREA DO INTEGRANTE</p>
          <h2>As tuas próximas participações.</h2>
          <p className="readonly-note">Consulta a tua escala, confirma a presença ou pede uma troca. A liderança organiza os cultos.</p>
          <div className="button-row" style={{marginTop:18}}>
            <a className="button primary" href="#my-schedules">Ver minhas escalas</a>
            <a className="button" href="/worship/substitutions">Pedir ou aceitar troca</a>
            <a className="button" href="#my-availability">Indicar indisponibilidade</a>
          </div>
        </section>

        <div id="my-schedules" className="section-title"><div><p className="eyebrow">ESCALAS</p><h2>Minhas próximas participações</h2></div><span className="muted small">Definidas pela gestão do Louvor</span></div>
        <div className="list">{memberSchedules.length===0?<div className="empty">Não tens nenhuma escala futura atribuída.</div>:memberSchedules.map((schedule:any)=>{
          const assignment=myAssignments.find((a:any)=>a.schedule_id===schedule.id);
          const response=assignment?memberResponseByAssignment.get(assignment.id) as any:null;
          const setlist=(scheduleSongs??[]).filter((x:any)=>x.schedule_id===schedule.id).sort((a:any,b:any)=>a.position-b.position);
          const rehearsal=(rehearsals??[]).find((r:any)=>r.schedule_id===schedule.id);
          return <article className="card" id={"schedule-"+schedule.id} key={schedule.id}>
            <div className="list-row" style={{padding:0,border:0,background:"transparent"}}>
              <div>
                <div className="button-row"><span className="pill gold">Grupo {schedule.group_code??myProfile?.group_code??"—"}</span><span className="pill ok">{roleLabel(assignment?.role)}</span></div>
                <h3 style={{fontSize:22,margin:"10px 0 5px"}}>{schedule.title}</h3>
                <div className="muted small">{new Date(schedule.starts_at).toLocaleString("pt-PT")}{schedule.call_time?" · chegada "+new Date(schedule.call_time).toLocaleString("pt-PT"):""}{schedule.location?" · "+schedule.location:""}</div>
              </div>
              <div>{response&&<span className={response.response_status==="confirmed"?"pill ok":"pill gold"}>{response.response_status==="confirmed"?"confirmado":"indisponível"}</span>}</div>
            </div>
            {schedule.notes&&<p className="muted" style={{marginTop:14}}>{schedule.notes}</p>}
            {rehearsal&&<div className="notice" style={{marginTop:14}}>Ensaio: {new Date(rehearsal.starts_at).toLocaleString("pt-PT")}{rehearsal.location?" · "+rehearsal.location:""}</div>}
            {assignment&&<div className="card" style={{marginTop:14}}>
              <p className="eyebrow">MINHA RESPOSTA</p>
              <div className="button-row">
                <form action={respondToWorshipAssignment}>
                  <input type="hidden" name="assignmentId" value={assignment.id}/>
                  <input type="hidden" name="responseStatus" value="confirmed"/>
                  <SubmitButton className="button primary" pendingText="A confirmar…">Confirmar presença</SubmitButton>
                </form>
                <form action={respondToWorshipAssignment} className="button-row">
                  <input type="hidden" name="assignmentId" value={assignment.id}/>
                  <input type="hidden" name="responseStatus" value="declined"/>
                  <input name="note" className="inline-input" placeholder="Motivo opcional"/>
                  <SubmitButton className="button danger" pendingText="A registar…">Não posso servir</SubmitButton>
                </form>
                <a className="button" href={"/worship/substitutions?schedule="+schedule.id+"#request-change"}>Procurar substituto</a>
              </div>
              {response&&<div className="muted small" style={{marginTop:10}}>Resposta atual: {response.response_status==="confirmed"?"Confirmado":"Não disponível"}{response.note?" · "+response.note:""}</div>}
            </div>}
            <div className="card" style={{marginTop:14}}>
              <p className="eyebrow">REPERTÓRIO DESTA ESCALA</p>
              <ol>{setlist.length===0?<li className="muted">A gestão ainda não publicou músicas para esta escala.</li>:setlist.map((item:any)=>{
                const song=memberSongsById.get(item.song_id) as any;
                const key=item.key_override||song?.recommended_key||song?.default_key;
                return <li key={item.id} style={{marginBottom:9}}><strong>{song?.title??"Música"}</strong>{song?.artist?" — "+song.artist:""} <span className="muted small">{key?"· tom "+key:""}</span></li>;
              })}</ol>
            </div>
          </article>;
        })}</div>

        <div id="my-availability" className="section-title"><div><p className="eyebrow">DISPONIBILIDADE</p><h2>Quando não posso servir</h2></div><span className="muted small">A liderança verá conflito ao montar a escala.</span></div>
        <div className="grid grid-2">
          <form action={createWorshipUnavailability} className="card form-grid">
            <div className="grid grid-2">
              <div className="field"><label>Primeiro dia</label><input name="startsOn" type="date" required/></div>
              <div className="field"><label>Último dia</label><input name="endsOn" type="date" required/></div>
            </div>
            <div className="field"><label>Motivo opcional</label><input name="reason" placeholder="Viagem, trabalho, compromisso..."/></div>
            <button className="button">Registar indisponibilidade</button>
          </form>
          <div className="card">
            <p className="eyebrow">PRÓXIMOS PERÍODOS</p>
            <div className="list">{myUnavailability.length===0?<div className="empty">Nenhuma indisponibilidade futura registada.</div>:myUnavailability.map((u:any)=><div className="list-row" key={u.id}>
              <div><strong>{new Date(u.starts_on+"T00:00:00").toLocaleDateString("pt-PT")} → {new Date(u.ends_on+"T00:00:00").toLocaleDateString("pt-PT")}</strong>{u.reason&&<div className="muted small">{u.reason}</div>}</div>
              <form action={deleteWorshipUnavailability}><input type="hidden" name="unavailabilityId" value={u.id}/><button className="button danger">Remover</button></form>
            </div>)}</div>
          </div>
        </div>

        <div id="rehearsals" className="section-title"><div><p className="eyebrow">ENSAIOS</p><h2>Próximos encontros</h2></div></div>
        <div className="grid grid-3">{relevantRehearsals.length===0?<div className="empty">Nenhum ensaio futuro publicado.</div>:relevantRehearsals.map((r:any)=><article className="card" key={r.id}><span className="pill gold">ensaio</span><h3>{r.title}</h3><p className="muted">{new Date(r.starts_at).toLocaleString("pt-PT")}{r.location?" · "+r.location:""}</p>{r.notes&&<p>{r.notes}</p>}</article>)}</div>

        <div className="section-title"><div><p className="eyebrow">AVISOS</p><h2>Informações da liderança</h2></div></div>
        <div className="list">{(items??[]).length===0?<div className="empty">Nenhum aviso publicado.</div>:(items??[]).map((item:any)=><article className="list-row" key={item.id}><div><span className="pill">{item.item_type}</span><h3 style={{marginTop:8}}>{item.title}</h3><span className="muted small">{item.body}</span></div>{item.external_url&&<a className="button" href={item.external_url} target="_blank" rel="noreferrer">Abrir</a>}</article>)}</div>
      </div>
    </AppShell>;
  }

  const directory=canLead?(await ctx.supabase.rpc("worship_member_directory")).data??[]:[];
  const directoryByMembership=new Map((directory??[]).map((m:any)=>[m.membership_id,m]));
  const profilesByMembership=new Map((memberProfiles??[]).map((p:any)=>[p.membership_id,p]));
  const songsById=new Map((songs??[]).map((s:any)=>[s.id,s]));
  const responseByAssignment=new Map((responses??[]).map((r:any)=>[r.assignment_id,r]));
  const executionKeys=new Set((executions??[]).map((e:any)=>e.schedule_id+"|"+e.song_id));
  const usageBefore=(songId:string,reference:string)=>{
    const end=new Date(reference);
    const start=new Date(end);
    start.setMonth(start.getMonth()-4);
    const rows=(executions??[]).filter((e:any)=>{
      const schedule=(e as any).worship_schedules;
      if(e.song_id!==songId||!schedule||schedule.status!=="completed") return false;
      const when=new Date(schedule.starts_at);
      return when>=start&&when<end;
    });
    rows.sort((a:any,b:any)=>new Date((b as any).worship_schedules.starts_at).getTime()-new Date((a as any).worship_schedules.starts_at).getTime());
    return {count:rows.length,last:rows[0]??null};
  };

  const recommendedSongsForSchedule=(schedule:any)=>{
    const serviceType=String(schedule.service_type??"").trim().toLocaleLowerCase("pt-PT");
    const serviceThemes=((schedule.themes??[]) as string[]).length?(schedule.themes??[]):schedule.theme?[schedule.theme]:[];
    return [...(songs??[])].map((song:any)=>{
      const folders=(Array.isArray(song.service_types)?song.service_types:[]).map((x:string)=>x.toLocaleLowerCase("pt-PT"));
      const themes=(Array.isArray(song.themes)?song.themes:[]).map((x:string)=>x.toLocaleLowerCase("pt-PT"));
      const folderMatch=Boolean(serviceType)&&folders.some((x:string)=>x===serviceType||x.includes(serviceType)||serviceType.includes(x));
      const themeMatches=serviceThemes.filter((t:string)=>themes.includes(t.toLocaleLowerCase("pt-PT"))).length;
      const usage=usageBefore(song.id,schedule.starts_at);
      const score=(folderMatch?100:0)+(themeMatches*25)-Math.min(usage.count,20);
      return {song,usage,folderMatch,themeMatches,score};
    }).sort((a:any,b:any)=>b.score-a.score||a.usage.count-b.usage.count||String(a.song.title).localeCompare(String(b.song.title),"pt-PT"));
  };

  // O diretório é suficiente para a gestão diária. Dados da Academy são consultados na respetiva área.
  const memberMetrics=(directory??[]).map((m:any)=>({...m,profile:profilesByMembership.get(m.membership_id)}));

  const selectedMemberGroup=(qs.memberGroup??"").trim();
  const selectedMemberRole=(qs.memberRole??"").trim();
  const filteredMemberMetrics=memberMetrics.filter((m:any)=>{
    const group=String(m.profile?.group_code??"");
    const roles=Array.isArray(m.profile?.roles)?m.profile.roles:[];
    return (!selectedMemberGroup||group===selectedMemberGroup)&&(!selectedMemberRole||roles.includes(selectedMemberRole));
  });
  const activeMemberMetrics=memberMetrics.filter((m:any)=>m.status==="active");
  const groupCounts=Object.fromEntries(["A","B","C","D"].map(group=>[group,activeMemberMetrics.filter((m:any)=>m.profile?.group_code===group).length]));
  const leaderReminders:any[]=[];
  for(const schedule of upcomingSchedules){
    const people=(assignments??[]).filter((a:any)=>a.schedule_id===schedule.id);
    const setlist=(scheduleSongs??[]).filter((x:any)=>x.schedule_id===schedule.id);
    const pendingResponses=people.filter((a:any)=>!responseByAssignment.get(a.id)).length;
    const rehearsal=(rehearsals??[]).find((r:any)=>r.schedule_id===schedule.id);
    if(people.length===0) leaderReminders.push({title:"Equipa por definir",body:schedule.title+" ainda não tem ninguém escalado."});
    if(setlist.length===0) leaderReminders.push({title:"Repertório por definir",body:schedule.title+" ainda não tem músicas."});
    if(pendingResponses>0) leaderReminders.push({title:"Respostas pendentes",body:schedule.title+" · "+pendingResponses+" pessoa"+(pendingResponses===1?"":"s")+" sem resposta."});
    if(!rehearsal) leaderReminders.push({title:"Ensaio não associado",body:schedule.title+" ainda não tem ensaio vinculado."});
  }
  for(const schedule of recentPastSchedules){
    if(schedule.status!=="completed"){
      leaderReminders.push({
        title:"Fecho pós-culto pendente",
        body:schedule.title+" · "+new Date(schedule.starts_at).toLocaleString("pt-PT")+" ainda não tem repertório e presenças fechados.",
        href:"#post-service"
      });
    }
  }

  return <AppShell title="Gestão do Louvor" active="/worship" email={ctx.email} variant="worship-leader">
    {qs.message&&<div className="notice" role="status" style={{marginBottom:16}}>{qs.message}</div>}
    <section className="hero-card">
      <p className="eyebrow">MINISTÉRIO DE LOUVOR · GESTÃO</p>
      <h2>O que precisa de fazer?</h2>
      <p>Crie uma escala, escolha a equipa e as músicas, publique e acompanhe as respostas.</p>
      <div className="button-row" style={{marginTop:18}}>
        <a className="button primary" href="/worship/schedules/new">+ Nova escala</a>
        <a className="button" href="/worship/repertoire">Gerir músicas</a>
        <a className="button" href="/worship/substitutions">Trocas</a>
      </div>
    </section>
    <section aria-labelledby="leader-schedules-heading" style={{marginTop:26}}>
      <div className="section-title"><div><p className="eyebrow">ESCALAS</p><h2 id="leader-schedules-heading">Próximos cultos</h2></div><span className="muted small">{upcomingSchedules.length} agendado{upcomingSchedules.length===1?"":"s"}</span></div>
      <div className="list">
        {upcomingSchedules.length===0?<div className="card"><p>Ainda não existem escalas futuras.</p><Link className="button primary" href="/worship/schedules/new">Criar a primeira escala</Link></div>
          :upcomingSchedules.map((schedule:any)=>{
          const team=(assignments??[]).filter((a:any)=>a.schedule_id===schedule.id);
          const confirmed=team.filter((a:any)=>(responses??[]).some((r:any)=>r.assignment_id===a.id&&r.response_status==="confirmed")).length;
          const musicCount=(scheduleSongs??[]).filter((s:any)=>s.schedule_id===schedule.id).length;
          return <article className="card worship-service-card" key={schedule.id}>
            <div className="list-row" style={{padding:0,border:0,background:"transparent"}}>
              <div>
                <div className="button-row"><span className="pill gold">Grupo {schedule.group_code??"—"}</span><span className={schedule.publication_state==="published"?"pill ok":"pill"}>{schedule.publication_state==="published"?"Publicada":"Por publicar"}</span></div>
                <h3>{schedule.title}</h3>
                <p className="muted small">{new Date(schedule.starts_at).toLocaleString("pt-PT")} · {team.length} pessoas · {confirmed} confirmadas · {musicCount} músicas</p>
              </div>
              <div className="button-row">
                <a className="button primary" href={"/worship/schedules/new?schedule="+schedule.id+"&step=participants"}>Gerir escala</a>
                {schedule.publication_state==="published"&&<a className="button" href={"/worship/share?schedule="+schedule.id}>Comunicar</a>}
              </div>
            </div>
          </article>;
        })}
      </div>
    </section>
    <details className="card worship-advanced" style={{marginTop:26}}>
      <summary><strong>Gerir equipa e configurações</strong><span className="muted small">Integrantes, grupos, formação e opções menos frequentes</span></summary>
      <div className="button-row" style={{margin:"18px 0"}}>
        <Link className="button" href="/worship/band-rotation">Banda e backups</Link>
        <Link className="button" href="/worship/rotacao">Grupos vocais</Link>
        <Link className="button" href="/worship/import">Importar membros</Link>
        <Link className="button" href="/worship/reports">Relatórios</Link>
        <Link className="button" href="/worship/themes">Temas</Link>
        <Link className="button" href="/academy">Academy</Link>
      </div>
      <div className="section-title"><div><p className="eyebrow">EQUIPA</p><h2>Gerir integrantes</h2></div><span className="muted small">{activeMemberMetrics.length} membros ativos</span></div>
      <div className="grid grid-4" style={{marginBottom:16}}>
        {["A","B","C","D"].map(group=><article className="card metric" key={group}><span>Grupo {group}</span><strong>{groupCounts[group]??0}</strong></article>)}
      </div>
      <form method="get" className="card form-grid" style={{marginBottom:16}}>
        <div className="grid grid-3">
          <div className="field"><label>Grupo</label><select name="memberGroup" defaultValue={selectedMemberGroup}><option value="">Todos</option>{["A","B","C","D"].map(group=><option key={group} value={group}>Grupo {group}</option>)}</select></div>
          <div className="field"><label>Função</label><select name="memberRole" defaultValue={selectedMemberRole}><option value="">Todas</option>{roleOptions.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div>
          <div className="button-row" style={{alignItems:"end"}}><button className="button primary">Filtrar equipa</button>{(selectedMemberGroup||selectedMemberRole)&&<Link className="button" href="/worship">Limpar</Link>}</div>
        </div>
      </form>
      <div className="list">{filteredMemberMetrics.map((m:any)=><details className="card" key={m.membership_id}>
        <summary style={{cursor:"pointer"}}>
          <div className="list-row" style={{padding:0,border:0,background:"transparent"}}>
            <div><div className="button-row">{m.profile?.group_code&&<span className="pill gold">Grupo {m.profile.group_code}</span>}{(m.profile?.roles??[]).map((role:string)=><span className="pill" key={role}>{roleLabel(role)}</span>)}</div><h3 style={{margin:"8px 0 4px"}}>{m.display_name||m.email}</h3><span className="muted small">{m.email} · {m.role} · {m.status}</span></div>
          </div>
        </summary>
        <div className="button-row" style={{marginTop:12}}>
          {m.status==="pending"&&<><form action={decideWorship}><input type="hidden" name="membershipId" value={m.membership_id}/><input type="hidden" name="decision" value="approve"/><SubmitButton className="button primary" pendingText="A aprovar…">Aprovar</SubmitButton></form><form action={decideWorship}><input type="hidden" name="membershipId" value={m.membership_id}/><input type="hidden" name="decision" value="reject"/><SubmitButton className="button" pendingText="A rejeitar…">Rejeitar</SubmitButton></form></>}
          {m.status==="active"&&<form action={decideWorship}><input type="hidden" name="membershipId" value={m.membership_id}/><input type="hidden" name="decision" value="revoke"/><SubmitButton className="button danger" pendingText="A revogar…">Revogar acesso</SubmitButton></form>}
        </div>

        {m.status==="active"&&<>
          <form action={saveWorshipMemberProfile} className="form-grid" style={{marginTop:16}}>
            <input type="hidden" name="membershipId" value={m.membership_id}/>
            <div className="grid grid-3">
              <div className="field"><label>Grupo</label><select name="groupCode" defaultValue={m.profile?.group_code??""}><option value="">Sem grupo</option>{["A","B","C","D"].map(g=><option key={g}>{g}</option>)}</select></div>
              <div className="field"><label>Funções</label><input name="roles" defaultValue={(m.profile?.roles??[]).join(", ")} placeholder="cantor_principal, backing_vocal"/></div>
              <div className="field"><label>Notas</label><input name="notes" defaultValue={m.profile?.notes??""}/></div>
            </div>
            <SubmitButton className="button" pendingText="A guardar…">Guardar perfil do ministério</SubmitButton>
          </form>
        </>}
      </details>)}</div>

      <div className="grid grid-2" style={{marginTop:18}}>
        <div className="card">
          <p className="eyebrow">CRIAR MEMBRO</p>
          <h3>Adicionar diretamente ao Ministério de Louvor</h3>
          <p className="muted small">O membro fica ativo imediatamente. Para participar das escalas e aceder ao portal, selecione uma conta já existente.</p>
          <form action={createWorshipMember} className="form-grid">
            <div className="field"><label>Conta do portal</label><input name="email" type="email" required placeholder="email@exemplo.com"/><span className="muted small">Use o email da conta já criada no Portal Reviver.</span></div>
            <div className="grid grid-2">
              <div className="field"><label>Papel</label><select name="role"><option value="member">Membro</option>{ctx.isAdmin&&<option value="leader">Líder</option>}</select></div>
              <div className="field"><label>Grupo</label><select name="groupCode"><option value="">Sem grupo</option>{["A","B","C","D"].map(g=><option key={g}>{g}</option>)}</select></div>
            </div>
            <div className="field"><label>Funções</label><input name="roles" placeholder="Ex.: cantor_principal, backing_vocal, teclado"/></div>
            <div className="field"><label>Notas</label><input name="notes" placeholder="Observações internas opcionais"/></div>
            <SubmitButton className="button primary" pendingText="A criar membro…">Criar membro</SubmitButton>
          </form>
        </div>
        <div className="card">
          <p className="eyebrow">FORMAÇÃO POR FUNÇÃO</p>
          <h3>Academy integrada à operação</h3>
          <p className="muted">Use o progresso acima para identificar lacunas. Voz principal, backing vocals, instrumentos, X32 e iluminação já têm trilhas próprias na Academy.</p>
          <Link className="button primary" href="/academy">Abrir formação</Link>
        </div>
      </div>


    </details>
  </AppShell>;
}
