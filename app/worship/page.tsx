import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SongAutoFillFields } from "./repertoire/song-autofill";
import { getAccessContext } from "@/lib/auth";
import {
  acceptWorshipInvite,addSongToWorshipSchedule,assignWorshipMember,autoAssignWorshipGroup,createWorshipItem,
  createWorshipRehearsal,createWorshipSchedule,createWorshipSong,createWorshipUnavailability,decideWorship,
  deleteWorshipUnavailability,inviteWorship,markWorshipAttendance,removeSongFromWorshipSchedule,removeWorshipAssignment,requestWorshipAccess,
  respondToWorshipAssignment,saveWorshipMemberProfile,updateWorshipScheduleStatus,updateWorshipScheduleTheme,
  updateWorshipPublication,setWorshipPublicRepertoire,confirmWorshipExecutions
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
    return <AppShell title="Ministério de Louvor" active="/worship" email={ctx.email}>
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
          <h2>As tuas escalas, repertórios e avisos.</h2>
          <p className="readonly-note">Esta visão é apenas de consulta. Planeamento, edição de repertório, gestão de pessoas e publicação ficam reservados à liderança.</p>
          <div className="button-row" style={{marginTop:18}}>
            <Link className="button primary" href="/academy">Abrir Academy</Link>
            <Link className="button" href="/worship/repertoire">Consultar repertório</Link>
            <a className="button" href="/worship/calendar">Meu calendário</a>
            <Link className="button" href="/worship/substitutions">Substituições</Link>
            <Link className="button" href="/worship/share">Comunicação</Link>
          </div>
        </section>

        <div className="grid grid-4" style={{marginTop:18}}>
          <article className="card metric"><span>Minhas próximas escalas</span><strong>{memberSchedules.length}</strong></article>
          <article className="card metric"><span>Ensaios futuros</span><strong>{relevantRehearsals.length}</strong></article>
          <article className="card metric"><span>Meu grupo</span><strong>{myProfile?.group_code??"—"}</strong></article>
          <article className="card metric"><span>Lembretes</span><strong>{memberReminders.length}</strong></article>
        </div>

        {memberReminders.length>0&&<>
          <div className="section-title"><div><p className="eyebrow">LEMBRETES</p><h2>Precisa da tua atenção</h2></div><span className="muted small">Atualizado automaticamente ao abrir o portal.</span></div>
          <div className="grid grid-3">{memberReminders.slice(0,6).map((reminder:any,index:number)=><a className="card" href={reminder.href} key={reminder.title+"-"+index}><span className={reminder.kind==="action"?"pill gold":"pill"}>{reminder.kind==="action"?"ação":reminder.kind==="soon"?"próximo":"info"}</span><h3>{reminder.title}</h3><p className="muted small">{reminder.body}</p></a>)}</div>
        </>}

        <div className="section-title"><div><p className="eyebrow">ESCALAS</p><h2>Minhas próximas participações</h2></div><span className="muted small">Definidas pela gestão do Louvor</span></div>
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
                  <button className="button primary">Confirmar presença</button>
                </form>
                <form action={respondToWorshipAssignment} className="button-row">
                  <input type="hidden" name="assignmentId" value={assignment.id}/>
                  <input type="hidden" name="responseStatus" value="declined"/>
                  <input name="note" className="inline-input" placeholder="Motivo opcional"/>
                  <button className="button danger">Não posso</button>
                </form>
                <Link className="button" href={"/worship/substitutions?schedule="+schedule.id}>Pedir substituição</Link>
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

        <div className="section-title"><div><p className="eyebrow">DISPONIBILIDADE</p><h2>Quando não posso servir</h2></div><span className="muted small">A liderança verá conflito ao montar a escala.</span></div>
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

  const {count:lessonCount}=canLead
    ?await ctx.supabase.from("academy_lessons").select("*",{count:"exact",head:true}).eq("active",true)
    :{count:0 as number|null};

  const memberMetrics=canLead?await Promise.all((directory??[]).map(async(m:any)=>{
    const [{data:progress},{data:attempts},{data:practice}]=await Promise.all([
      ctx.supabase.from("lesson_progress").select("status,last_activity_at").eq("user_id",m.user_id),
      ctx.supabase.from("quiz_attempts").select("score_percentage,attempted_at").eq("user_id",m.user_id),
      ctx.supabase.from("practice_sessions").select("duration_seconds,practiced_at").eq("user_id",m.user_id).order("practiced_at",{ascending:false}).limit(20)
    ]);
    const completed=(progress??[]).filter(p=>p.status==="completed").length;
    const avg=(attempts??[]).length?Math.round((attempts??[]).reduce((sum,a)=>sum+Number(a.score_percentage??0),0)/(attempts??[]).length):0;
    const last=[...(progress??[]).map(p=>p.last_activity_at),...(attempts??[]).map(a=>a.attempted_at),...(practice??[]).map(p=>p.practiced_at)].filter(Boolean).sort().at(-1)??null;
    const practiceMinutes=Math.round((practice??[]).reduce((sum,p)=>sum+(p.duration_seconds??0),0)/60);
    const profile=profilesByMembership.get(m.membership_id) as any;
    const serviceParticipations=(assignments??[]).filter((a:any)=>a.membership_id===m.membership_id&&a.attendance_status==="completed").length;
    return {...m,profile,completion:Math.round((completed/Math.max(lessonCount??0,1))*100),completed,avg,last,practiceMinutes,serviceParticipations};
  })):[];

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

  return <AppShell title="Ministério de Louvor" active="/worship" email={ctx.email}>
    {qs.message&&<div className="notice" style={{marginBottom:16}}>{qs.message}</div>}

    <section className="hero-card">
      <p className="eyebrow">REVIVER WORSHIP</p>
      <h2>Escala, repertório e formação no mesmo lugar.</h2>
      <p>Organiza os grupos A/B/C/D, prepara cultos e ensaios, mantém o repertório centralizado e acompanha a evolução da equipa na Academy.</p>
      <div className="button-row" style={{marginTop:18}}><Link className="button primary" href="/academy">Abrir Academy</Link><Link className="button" href="/worship/repertoire">Repertório inteligente</Link><Link className="button" href="/worship/substitutions">Substituições</Link><Link className="button" href="/worship/share">Comunicação</Link>{canLead&&<Link className="button" href="/worship/import">Importar membros</Link>}<Link className="button" href="/academy/resources">Biblioteca de recursos</Link><Link className="button" href="/worship/rotacao">Rotação A/B/C/D</Link><a className="button" href="/worship/calendar">Exportar meu calendário</a></div>
    </section>

    <div className="grid grid-4" style={{marginTop:18}}>
      <article className="card metric"><span>Próximas escalas</span><strong>{upcomingSchedules.length}</strong></article>
      <article className="card metric"><span>Ensaios futuros</span><strong>{upcomingRehearsals.length}</strong></article>
      <article className="card metric"><span>Repertório ativo</span><strong>{(songs??[]).length}</strong></article>
      <article className="card metric"><span>Pendências</span><strong>{leaderReminders.length}</strong></article>
    </div>
    {leaderReminders.length>0&&<>
      <div className="section-title"><div><p className="eyebrow">PENDÊNCIAS AUTOMÁTICAS</p><h2>O que falta fechar</h2></div><span className="muted small">Gerado a partir das próximas escalas.</span></div>
      <div className="grid grid-3">{leaderReminders.slice(0,9).map((reminder:any,index:number)=><article className="card" key={reminder.title+"-"+index}><span className="pill gold">atenção</span><h3>{reminder.title}</h3><p className="muted small">{reminder.body}</p></article>)}</div>
    </>}

    {membership?.id&&<>
      <div className="section-title"><div><p className="eyebrow">DISPONIBILIDADE</p><h2>Quando não posso servir</h2></div><span className="muted small">O líder verá conflito ao montar a escala.</span></div>
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
    </>}

    <div className="section-title"><div><p className="eyebrow">AGENDA</p><h2>Próximas escalas</h2></div><span className="muted small">Grupo, equipa e repertório por culto</span></div>
    <div className="list">{upcomingSchedules.length===0?<div className="empty">Nenhuma escala futura criada.</div>:upcomingSchedules.map((s:any)=>{
      const people=(assignments??[]).filter((a:any)=>a.schedule_id===s.id);
      const setlist=(scheduleSongs??[]).filter((x:any)=>x.schedule_id===s.id).sort((a:any,b:any)=>a.position-b.position);
      const mine=people.find((a:any)=>a.membership_id===membership?.id);
      const confirmed=people.filter((a:any)=>(responseByAssignment.get(a.id) as any)?.response_status==="confirmed").length;
      const declined=people.filter((a:any)=>(responseByAssignment.get(a.id) as any)?.response_status==="declined").length;
      const pending=people.length-confirmed-declined;
      const linkedRehearsal=(rehearsals??[]).find((r:any)=>r.schedule_id===s.id);
      const readinessChecks=[
        {label:"Equipa definida",ok:people.length>0},
        {label:"Equipa confirmada",ok:people.length>0&&pending===0&&declined===0},
        {label:"Repertório definido",ok:setlist.length>0},
        {label:"Ensaio associado",ok:Boolean(linkedRehearsal)},
      ];
      const readiness=Math.round(readinessChecks.filter(x=>x.ok).length/readinessChecks.length*100);
      const readinessMissing=readinessChecks.filter(x=>!x.ok).map(x=>x.label);
      return <details className="card" key={s.id} open={Boolean(mine)}>
        <summary style={{cursor:"pointer"}}>
          <div className="list-row" style={{padding:0,border:0,background:"transparent"}}>
            <div><div className="button-row"><span className="pill gold">Grupo {s.group_code??"—"}</span><span className={s.status==="confirmed"?"pill ok":"pill"}>{s.status}</span><span className={readiness===100?"pill ok":readiness>=50?"pill gold":"pill"}>prontidão {readiness}%</span>{mine&&<span className="pill ok">estou escalado</span>}</div><h3 style={{margin:"10px 0 4px"}}>{s.title}</h3><span className="muted small">{new Date(s.starts_at).toLocaleString("pt-PT")}{s.call_time?` · chegada ${new Date(s.call_time).toLocaleString("pt-PT")}`:""}{s.service_type?` · ${s.service_type}`:""}</span></div>
            {mine&&<div><strong>{roleLabel(mine.role)}</strong>{responseByAssignment.get(mine.id)&&<div className="muted small" style={{marginTop:4}}>{(responseByAssignment.get(mine.id) as any).response_status==="confirmed"?"Presença confirmada":"Indisponibilidade registada"}</div>}</div>}
          </div>
        </summary>

        {s.notes&&<p className="muted" style={{marginTop:14}}>{s.notes}</p>}

        <div className="card" style={{marginTop:16}}>
          <p className="eyebrow">PRONTIDÃO DO CULTO</p>
          <div className="grid grid-4">{readinessChecks.map(check=><div className="metric" key={check.label}><span>{check.label}</span><strong>{check.ok?"✓":"—"}</strong></div>)}</div>
          <div className="muted small" style={{marginTop:10}}>{confirmed} confirmado{confirmed===1?"":"s"} · {pending} sem resposta · {declined} {declined===1?"indisponível":"indisponíveis"}{linkedRehearsal?` · ensaio ${new Date(linkedRehearsal.starts_at).toLocaleString("pt-PT")}`:""}</div>
          {readinessMissing.length>0&&<div className="notice warn" style={{marginTop:12}}>Falta: {readinessMissing.join(" · ")}</div>}
        </div>

        <div className="grid grid-2" style={{marginTop:16}}>
          <div className="card">
            <p className="eyebrow">EQUIPA</p>
            {canLead
              ?<div className="list">{people.length===0?<div className="empty">Sem pessoas atribuídas.</div>:people.map((a:any)=>{
                const person=directoryByMembership.get(a.membership_id) as any;
                const response=responseByAssignment.get(a.id) as any;
                return <div className="list-row" key={a.id}>
                  <div><strong>{person?.display_name||person?.email||"Membro"}</strong><div className="muted small">{roleLabel(a.role)} · {response?response.response_status==="confirmed"?"confirmado":"não disponível":"sem resposta"} · {a.attendance_status==="completed"?"presença concluída":"presença pendente"}</div>{response?.note&&<div className="muted small">{response.note}</div>}</div>
                  <div className="button-row">
                    <form action={markWorshipAttendance}><input type="hidden" name="assignmentId" value={a.id}/><input type="hidden" name="attendance" value={a.attendance_status==="completed"?"assigned":"completed"}/><button className="button">{a.attendance_status==="completed"?"Reabrir presença":"Marcar presença"}</button></form>
                    <form action={removeWorshipAssignment}><input type="hidden" name="assignmentId" value={a.id}/><button className="button danger">Remover</button></form>
                  </div>
                </div>
              })}</div>
              :mine?<div>
                <div className="notice">A tua função: <strong>{roleLabel(mine.role)}</strong></div>
                <div className="button-row" style={{marginTop:12}}>
                  <form action={respondToWorshipAssignment}>
                    <input type="hidden" name="assignmentId" value={mine.id}/>
                    <input type="hidden" name="responseStatus" value="confirmed"/>
                    <button className="button primary">Confirmar presença</button>
                  </form>
                  <form action={respondToWorshipAssignment} className="button-row">
                    <input type="hidden" name="assignmentId" value={mine.id}/>
                    <input type="hidden" name="responseStatus" value="declined"/>
                    <input name="note" className="inline-input" placeholder="Motivo opcional"/>
                    <button className="button danger">Não posso</button>
                  </form>
                </div>
                {responseByAssignment.get(mine.id)&&<div className="muted small" style={{marginTop:10}}>Resposta atual: {(responseByAssignment.get(mine.id) as any).response_status==="confirmed"?"Confirmado":"Não disponível"}{(responseByAssignment.get(mine.id) as any).note?` · ${(responseByAssignment.get(mine.id) as any).note}`:""}</div>}
              </div>:<div className="muted">Esta escala pertence ao grupo {s.group_code??"—"}.</div>}
          </div>

          <div className="card">
            <p className="eyebrow">REPERTÓRIO DO CULTO</p>
            <ol>{setlist.length===0?<li className="muted">Ainda sem músicas.</li>:setlist.map((x:any)=>{
              const song=songsById.get(x.song_id) as any;
              return <li key={x.id} style={{marginBottom:10}}><strong>{song?.title??"Música"}</strong>{song?.artist?` — ${song.artist}`:""} <span className="muted small">{x.key_override||song?.default_key?`· tom ${x.key_override||song?.default_key}`:""}</span>{canLead&&<form action={removeSongFromWorshipSchedule} style={{display:"inline",marginLeft:8}}><input type="hidden" name="scheduleSongId" value={x.id}/><button className="button">×</button></form>}</li>
            })}</ol>
          </div>
        </div>
      </details>
    })}</div>

    <div className="section-title"><div><p className="eyebrow">ENSAIOS</p><h2>Próximos encontros</h2></div></div>
    <div className="grid grid-3">{upcomingRehearsals.length===0?<div className="empty">Nenhum ensaio futuro.</div>:upcomingRehearsals.map((r:any)=><article className="card" key={r.id}><span className="pill gold">ensaio</span><h3>{r.title}</h3><p className="muted">{new Date(r.starts_at).toLocaleString("pt-PT")}{r.location?` · ${r.location}`:""}</p>{r.notes&&<p>{r.notes}</p>}</article>)}</div>

    <div className="section-title"><div><p className="eyebrow">REPERTÓRIO</p><h2>Biblioteca musical</h2></div></div>
    <div className="grid grid-3">{(songs??[]).length===0?<div className="empty">Repertório ainda vazio.</div>:(songs??[]).map((song:any)=><article className="card" key={song.id}><h3>{song.title}</h3><p className="muted">{song.artist||"Artista não informado"}{song.default_key?` · tom ${song.default_key}`:""}{song.bpm?` · ${song.bpm} BPM`:""}</p><div className="button-row">{song.youtube_url&&<a className="button" href={song.youtube_url} target="_blank">Ouvir</a>}{song.chord_url&&<a className="button" href={song.chord_url} target="_blank">Cifra</a>}</div></article>)}</div>

    {(items??[]).length>0&&<>
      <div className="section-title"><div><p className="eyebrow">RECURSOS</p><h2>Avisos e ficheiros</h2></div></div>
      <div className="list">{(items??[]).map((i:any)=><div className="list-row" key={i.id}><div><span className="pill">{i.item_type}</span><h3 style={{marginTop:8}}>{i.title}</h3><span className="muted small">{i.body}</span></div>{i.external_url&&<a className="button" href={i.external_url} target="_blank">Abrir</a>}</div>)}</div>
    </>}

    {canLead&&<>
      <div className="section-title"><div><p className="eyebrow">OPERAÇÃO</p><h2>Configurar escala</h2></div><span className="muted small">Fluxo guiado · Admin/Líder</span></div>

      <div className="grid grid-4" style={{marginBottom:18}}>
        <article className="card"><span className="pill gold">1</span><h3>Culto</h3><p className="muted small">Data, tipo, grupo e tema.</p></article>
        <article className="card"><span className="pill gold">2</span><h3>Equipa</h3><p className="muted small">Preencher grupo e ajustar funções.</p></article>
        <article className="card"><span className="pill gold">3</span><h3>Repertório e ensaio</h3><p className="muted small">Músicas adequadas ao culto e ensaio associado.</p></article>
        <article className="card"><span className="pill gold">4</span><h3>Rever e partilhar</h3><p className="muted small">Aprovar, publicar e enviar a escala.</p></article>
      </div>

      <div className="grid grid-3" style={{marginBottom:18}}>
        <details className="card">
          <summary style={{cursor:"pointer",fontWeight:800}}>+ Criar nova escala</summary>
          <form action={createWorshipSchedule} className="form-grid" style={{marginTop:16}}>
            <p className="eyebrow">NOVA ESCALA</p>
            <div className="field"><label>Título</label><input name="title" required placeholder="Culto de domingo"/></div>
            <div className="grid grid-3"><div className="field"><label>Tipo de culto</label><input name="serviceType" list="worship-service-types" placeholder="Culto de domingo"/><datalist id="worship-service-types"><option value="Culto de domingo"/><option value="Ceia"/><option value="Jovens"/><option value="Mulheres"/><option value="Homens"/><option value="Kids"/><option value="Vigília"/><option value="Oração"/><option value="Evangelístico"/><option value="Conferência"/><option value="Especial"/></datalist></div><div className="field"><label>Grupo</label><select name="groupCode"><option value="">Sem grupo</option>{["A","B","C","D"].map(g=><option key={g}>{g}</option>)}</select></div><div className="field"><label>Temas do culto</label><input name="themes" placeholder="Graça, Família, Missões"/></div></div>
            <div className="grid grid-2"><div className="field"><label>Início</label><input name="startsAt" type="datetime-local" required/></div><div className="field"><label>Chegada</label><input name="callTime" type="datetime-local"/></div></div>
            <div className="field"><label>Notas</label><textarea name="notes"/></div>
            <button className="button primary">Criar escala</button>
          </form>
        </details>

        <details className="card">
          <summary style={{cursor:"pointer",fontWeight:800}}>+ Adicionar música ao repertório</summary>
          <form action={createWorshipSong} className="form-grid" style={{marginTop:16}}>
            <p className="eyebrow">REPERTÓRIO</p>
            <SongAutoFillFields/>
            <button className="button primary">Adicionar música</button>
          </form>
        </details>

        <details className="card">
          <summary style={{cursor:"pointer",fontWeight:800}}>+ Criar ensaio</summary>
          <form action={createWorshipRehearsal} className="form-grid" style={{marginTop:16}}>
            <p className="eyebrow">NOVO ENSAIO</p>
            <div className="field"><label>Título</label><input name="title" required placeholder="Ensaio geral"/></div>
            <div className="grid grid-2"><div className="field"><label>Início</label><input name="startsAt" type="datetime-local" required/></div><div className="field"><label>Fim</label><input name="endsAt" type="datetime-local"/></div></div>
            <div className="field"><label>Local</label><input name="location"/></div>
            <div className="field"><label>Vincular a escala</label><select name="scheduleId"><option value="">Sem vínculo</option>{upcomingSchedules.map((s:any)=><option value={s.id} key={s.id}>{s.title}</option>)}</select></div>
            <div className="field"><label>Notas</label><textarea name="notes"/></div>
            <button className="button primary">Criar ensaio</button>
          </form>
        </details>
      </div>

      <div className="notice" style={{marginBottom:18}}>Crie a escala, associe ou encontre músicas do repertório e marque o ensaio dentro do mesmo fluxo de configuração.</div>

      <div className="list">{upcomingSchedules.length===0?<div className="empty">Cria a primeira escala para configurar equipa e repertório.</div>:upcomingSchedules.map((s:any)=><details className="card" key={s.id}>
        <summary style={{cursor:"pointer",fontWeight:800}}>{s.title} · Grupo {s.group_code??"—"}{(s.themes??[]).length?" · "+(s.themes??[]).join(" / "):s.theme?" · "+s.theme:""} · {new Date(s.starts_at).toLocaleString("pt-PT")}</summary>
        <div className="button-row" style={{marginTop:14}}>
          <form action={autoAssignWorshipGroup}>
            <input type="hidden" name="scheduleId" value={s.id}/>
            <button className="button primary" disabled={!s.group_code}>Preencher Grupo {s.group_code??"—"}</button>
          </form>
          <span className="muted small">Adiciona membros ativos do grupo, ignora indisponíveis e usa a primeira função configurada como principal.</span>
        </div>
        <div className="grid grid-3" style={{marginTop:16}}>
          <div className="card">
            <p className="eyebrow">RESPOSTAS DA EQUIPA</p>
            {(()=>{
              const people=(assignments??[]).filter((a:any)=>a.schedule_id===s.id);
              const confirmed=people.filter((a:any)=>(responseByAssignment.get(a.id) as any)?.response_status==="confirmed").length;
              const declined=people.filter((a:any)=>(responseByAssignment.get(a.id) as any)?.response_status==="declined").length;
              const pending=people.length-confirmed-declined;
              return <div className="grid grid-3"><div className="metric"><span>Confirmados</span><strong>{confirmed}</strong></div><div className="metric"><span>Não podem</span><strong>{declined}</strong></div><div className="metric"><span>Sem resposta</span><strong>{pending}</strong></div></div>;
            })()}
          </div>
          <form action={assignWorshipMember} className="form-grid">
            <input type="hidden" name="scheduleId" value={s.id}/>
            <p className="eyebrow">ESCALAR PESSOA</p>
            <div className="field"><label>Membro</label><select name="membershipId" required><option value="">Selecionar</option>{(directory??[]).filter((m:any)=>m.status==="active").map((m:any)=>{
              const conflicts=conflictsFor(m.membership_id,s.starts_at);
              return <option value={m.membership_id} key={m.membership_id}>{m.display_name||m.email} · G{(profilesByMembership.get(m.membership_id) as any)?.group_code??"—"}{conflicts.length?" · ⚠ indisponível":""}</option>;
            })}</select></div>
            {(()=>{const count=(directory??[]).filter((m:any)=>m.status==="active"&&conflictsFor(m.membership_id,s.starts_at).length>0).length; return count>0?<div className="notice warn">{count} membro{count===1?"":"s"} com indisponibilidade nesta data.</div>:null;})()}
            <div className="field"><label>Função</label><select name="role"><option value="">Sem função</option>{roleOptions.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></div>
            <button className="button">Adicionar à escala</button>
          </form>

          <div className="form-grid">
            <p className="eyebrow">ADICIONAR MÚSICA</p>
            <form action={addSongToWorshipSchedule} className="form-grid">
              <input type="hidden" name="scheduleId" value={s.id}/>
              <div className="field"><label>Música recomendada</label><select name="songId" required><option value="">Selecionar</option>{recommendedSongsForSchedule(s).slice(0,12).map(({song,usage,folderMatch,themeMatches}:any)=><option value={song.id} key={song.id}>{song.title+" · "+usage.count+"×/4m"+(folderMatch?" · pasta ✓":"")+(themeMatches?" · "+themeMatches+" tema"+(themeMatches===1?"":"s")+" ✓":"")}</option>)}</select><span className="muted small">Prioriza a pasta do tipo de culto, os temas e músicas menos usadas nos últimos quatro meses.</span></div>
              <div className="grid grid-2"><div className="field"><label>Posição</label><input name="position" type="number" min="1" defaultValue="1"/></div><div className="field"><label>Tom</label><input name="keyOverride"/></div></div>
              <button className="button">Adicionar ao culto</button>
            </form>
            {(((s.themes??[]) as string[]).length>0||s.theme)&&<details><summary className="text-button" style={{cursor:"pointer"}}>Ver todo o repertório</summary><form action={addSongToWorshipSchedule} className="form-grid" style={{marginTop:10}}><input type="hidden" name="scheduleId" value={s.id}/><div className="field"><select name="songId" required><option value="">Selecionar qualquer música</option>{(songs??[]).map((song:any)=>{const usage=usageBefore(song.id,s.starts_at);return <option value={song.id} key={song.id}>{song.title} · {usage.count}× em 4 meses</option>})}</select></div><input type="hidden" name="position" value="1"/><button className="button">Adicionar fora do tema</button></form></details>}
          </div>

          <div className="form-grid">
            <form action={updateWorshipScheduleTheme} className="form-grid">
              <input type="hidden" name="scheduleId" value={s.id}/>
              <p className="eyebrow">TEMAS</p>
              <div className="field"><label>Temas, separados por vírgula</label><input name="themes" defaultValue={((s.themes??[]) as string[]).join(", ")||s.theme||""}/></div>
              <button className="button">Guardar temas</button>
            </form>
            <form action={updateWorshipScheduleStatus} className="form-grid">
              <input type="hidden" name="scheduleId" value={s.id}/>
              <p className="eyebrow">ESTADO</p>
              <div className="field"><label>Estado da escala</label><select name="status" defaultValue={s.status}><option value="planned">Planeada</option><option value="confirmed">Confirmada</option><option value="completed">Concluída</option><option value="cancelled">Cancelada</option></select></div>
              <button className="button">Guardar estado</button>
            </form>
            <div className="card">
              <p className="eyebrow">APROVAÇÃO E PUBLICAÇÃO</p>
              <div className="button-row">
                <form action={updateWorshipPublication}><input type="hidden" name="scheduleId" value={s.id}/><input type="hidden" name="publicationAction" value="draft"/><button className="button">Rascunho</button></form>
                <form action={updateWorshipPublication}><input type="hidden" name="scheduleId" value={s.id}/><input type="hidden" name="publicationAction" value="approve"/><button className="button">Aprovar</button></form>
                <form action={updateWorshipPublication}><input type="hidden" name="scheduleId" value={s.id}/><input type="hidden" name="publicationAction" value="publish"/><button className="button primary">Publicar equipa</button></form>
              </div>
              <div className="muted small" style={{marginTop:8}}>Estado editorial: {s.publication_state??"draft"}. Aprovar não publica nem envia mensagens.</div>
              <form action={setWorshipPublicRepertoire} className="button-row" style={{marginTop:10}}>
                <input type="hidden" name="scheduleId" value={s.id}/>
                <input type="hidden" name="publicRepertoire" value={s.public_repertoire?"false":"true"}/>
                <button className="button">{s.public_repertoire?"Retirar repertório público":"Autorizar repertório público"}</button>
              </form>
              <div className="button-row" style={{marginTop:10}}>
                <Link className="button primary" href={"/worship/share?schedule="+s.id}>Partilhar escala / WhatsApp</Link>
                <a className="button" href={"/api/worship/schedule-card/"+s.id} target="_blank" rel="noreferrer">Abrir card da escala</a>
                <Link className="button" href={"/worship/run-sheet/"+s.id}>Roteiro do culto</Link>
              </div>
            </div>
          </div>
        </div>
      </details>)}</div>

      <div className="section-title"><div><p className="eyebrow">PÓS-CULTO</p><h2>Confirmar repertório executado</h2></div><span className="muted small">Só estas confirmações entram nos relatórios.</span></div>
      <div className="list">{recentPastSchedules.length===0?<div className="empty">Nenhum culto anterior para confirmar.</div>:recentPastSchedules.map((s:any)=>{
        const setlist=(scheduleSongs??[]).filter((x:any)=>x.schedule_id===s.id).sort((a:any,b:any)=>a.position-b.position);
        return <details className="card" key={"executed-"+s.id}>
          <summary style={{cursor:"pointer",fontWeight:800}}>{s.title} · {new Date(s.starts_at).toLocaleString("pt-PT")} · {s.status}</summary>
          <form action={confirmWorshipExecutions} className="form-grid" style={{marginTop:14}}>
            <input type="hidden" name="scheduleId" value={s.id}/>
            <p className="muted small">Marque apenas as músicas efetivamente cantadas. Guardar novamente substitui a confirmação anterior deste culto.</p>
            {setlist.length===0?<div className="empty">Este culto não tem repertório planeado. Adicione primeiro as músicas realizadas.</div>:setlist.map((x:any)=>{const song=songsById.get(x.song_id) as any;return <label className="list-row" key={x.id} style={{cursor:"pointer"}}><span><strong>{song?.title??"Música"}</strong><span className="muted small"> · tom {x.key_override||song?.default_key||"—"}{song?.version_name?" · "+song.version_name:""}</span></span><input type="checkbox" name="songIds" value={x.song_id} defaultChecked={executionKeys.has(s.id+"|"+x.song_id)}/></label>})}
            {setlist.length>0&&<button className="button primary">Confirmar execução e concluir culto</button>}
          </form>
        </details>
      })}</div>

      <div className="section-title"><div><p className="eyebrow">EQUIPA</p><h2>Membros, grupos e Academy</h2></div><span className="muted small">{activeMemberMetrics.length} membros ativos</span></div>
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
            <div className="button-row">
              {m.status==="pending"&&<><form action={decideWorship}><input type="hidden" name="membershipId" value={m.membership_id}/><input type="hidden" name="decision" value="approve"/><button className="button primary">Aprovar</button></form><form action={decideWorship}><input type="hidden" name="membershipId" value={m.membership_id}/><input type="hidden" name="decision" value="reject"/><button className="button">Rejeitar</button></form></>}
              {m.status==="active"&&<form action={decideWorship}><input type="hidden" name="membershipId" value={m.membership_id}/><input type="hidden" name="decision" value="revoke"/><button className="button danger">Revogar</button></form>}
            </div>
          </div>
        </summary>

        {m.status==="active"&&<>
          <form action={saveWorshipMemberProfile} className="form-grid" style={{marginTop:16}}>
            <input type="hidden" name="membershipId" value={m.membership_id}/>
            <div className="grid grid-3">
              <div className="field"><label>Grupo</label><select name="groupCode" defaultValue={m.profile?.group_code??""}><option value="">Sem grupo</option>{["A","B","C","D"].map(g=><option key={g}>{g}</option>)}</select></div>
              <div className="field"><label>Funções</label><input name="roles" defaultValue={(m.profile?.roles??[]).join(", ")} placeholder="cantor_principal, backing_vocal"/></div>
              <div className="field"><label>Notas</label><input name="notes" defaultValue={m.profile?.notes??""}/></div>
            </div>
            <button className="button">Guardar perfil do ministério</button>
          </form>
          <div className="grid grid-4" style={{marginTop:14}}><div className="metric"><span>Academy</span><strong>{m.completion}%</strong></div><div className="metric"><span>Aulas concluídas</span><strong>{m.completed}</strong></div><div className="metric"><span>Média quizzes</span><strong>{m.avg}%</strong></div><div className="metric"><span>Participações</span><strong>{m.serviceParticipations}</strong></div></div>
          <div className="muted small" style={{marginTop:10}}>Prática recente: {m.practiceMinutes}m</div>
          {m.last&&<div className="muted small" style={{marginTop:12}}>Última atividade: {new Date(m.last).toLocaleString("pt-PT")}</div>}
        </>}
      </details>)}</div>

      <div className="grid grid-2" style={{marginTop:18}}>
        <div className="card">
          <p className="eyebrow">CONVIDAR MEMBRO</p>
          <form action={inviteWorship} className="form-grid">
            <div className="field"><label>Email de uma conta já criada</label><input name="email" type="email" required/></div>
            <div className="field"><label>Papel</label><select name="role"><option value="member">Membro</option>{ctx.isAdmin&&<option value="leader">Líder</option>}</select></div>
            <button className="button">Convidar</button>
          </form>
        </div>
        <div className="card">
          <p className="eyebrow">FORMAÇÃO POR FUNÇÃO</p>
          <h3>Academy integrada à operação</h3>
          <p className="muted">Use o progresso acima para identificar lacunas. Voz principal, backing vocals, instrumentos, X32 e iluminação já têm trilhas próprias na Academy.</p>
          <Link className="button primary" href="/academy">Abrir formação</Link>
        </div>
      </div>

      <div className="section-title"><div><p className="eyebrow">RECURSOS</p><h2>Avisos e ficheiros</h2></div></div>
      <form action={createWorshipItem} className="card form-grid">
        <p className="eyebrow">AVISO / FICHEIRO</p>
        <div className="field"><label>Tipo</label><select name="item_type"><option value="notice">Aviso</option><option value="file">Ficheiro</option></select></div>
        <div className="field"><label>Título</label><input name="title" required/></div>
        <div className="field"><label>Descrição</label><textarea name="body"/></div>
        <div className="field"><label>Link externo</label><input name="external_url" type="url"/></div>
        <button className="button">Guardar recurso</button>
      </form>
    </>}
  </AppShell>
}
