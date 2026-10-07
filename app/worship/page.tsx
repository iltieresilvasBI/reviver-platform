import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getAccessContext } from "@/lib/auth";
import {
  acceptWorshipInvite,addSongToWorshipSchedule,assignWorshipMember,autoAssignWorshipGroup,createWorshipItem,
  createWorshipRehearsal,createWorshipSchedule,createWorshipSong,createWorshipUnavailability,decideWorship,
  deleteWorshipUnavailability,inviteWorship,markWorshipAttendance,removeSongFromWorshipSchedule,removeWorshipAssignment,requestWorshipAccess,
  respondToWorshipAssignment,saveWorshipMemberProfile,updateWorshipScheduleStatus
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

export default async function WorshipPage({searchParams}:{searchParams:Promise<{message?:string}>}){
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
    {data:assignments},{data:scheduleSongs},{data:rehearsals},{data:responses},{data:unavailability}
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
  ]);

  const now=Date.now();
  const upcomingSchedules=(schedules??[]).filter((s:any)=>new Date(s.starts_at).getTime()>=now&&s.status!=="cancelled");
  const upcomingRehearsals=(rehearsals??[]).filter((r:any)=>new Date(r.starts_at).getTime()>=now);
  const myAssignments=(assignments??[]).filter((a:any)=>a.membership_id===membership?.id);
  const myProfile=(memberProfiles??[]).find((p:any)=>p.membership_id===membership?.id);
  const todayKey=lisbonDateKey(new Date());
  const myUnavailability=(unavailability??[]).filter((u:any)=>u.membership_id===membership?.id&&u.ends_on>=todayKey);
  const conflictsFor=(membershipId:string,scheduleStart:string)=>{
    const date=lisbonDateKey(scheduleStart);
    return (unavailability??[]).filter((u:any)=>u.membership_id===membershipId&&u.starts_on<=date&&u.ends_on>=date);
  };

  const directory=canLead?(await ctx.supabase.rpc("worship_member_directory")).data??[]:[];
  const directoryByMembership=new Map((directory??[]).map((m:any)=>[m.membership_id,m]));
  const profilesByMembership=new Map((memberProfiles??[]).map((p:any)=>[p.membership_id,p]));
  const songsById=new Map((songs??[]).map((s:any)=>[s.id,s]));
  const responseByAssignment=new Map((responses??[]).map((r:any)=>[r.assignment_id,r]));

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

  return <AppShell title="Ministério de Louvor" active="/worship" email={ctx.email}>
    {qs.message&&<div className="notice" style={{marginBottom:16}}>{qs.message}</div>}

    <section className="hero-card">
      <p className="eyebrow">REVIVER WORSHIP</p>
      <h2>Escala, repertório e formação no mesmo lugar.</h2>
      <p>Organiza os grupos A/B/C/D, prepara cultos e ensaios, mantém o repertório centralizado e acompanha a evolução da equipa na Academy.</p>
      <div className="button-row" style={{marginTop:18}}><Link className="button primary" href="/academy">Abrir Academy</Link><Link className="button" href="/academy/resources">Biblioteca de recursos</Link><Link className="button" href="/worship/rotacao">Rotação A/B/C/D</Link><a className="button" href="/worship/calendar">Exportar meu calendário</a></div>
    </section>

    <div className="grid grid-4" style={{marginTop:18}}>
      <article className="card metric"><span>Próximas escalas</span><strong>{upcomingSchedules.length}</strong></article>
      <article className="card metric"><span>Ensaios futuros</span><strong>{upcomingRehearsals.length}</strong></article>
      <article className="card metric"><span>Repertório ativo</span><strong>{(songs??[]).length}</strong></article>
      <article className="card metric"><span>Meu grupo</span><strong>{myProfile?.group_code??"—"}</strong></article>
    </div>

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
      <div className="section-title"><div><p className="eyebrow">OPERAÇÃO</p><h2>Gestão do Louvor</h2></div><span className="muted small">Admin/Líder</span></div>

      <div className="grid grid-2">
        <form action={createWorshipSchedule} className="card form-grid">
          <p className="eyebrow">NOVA ESCALA</p>
          <div className="field"><label>Título</label><input name="title" required placeholder="Culto de domingo"/></div>
          <div className="grid grid-2"><div className="field"><label>Tipo</label><input name="serviceType" placeholder="Celebração / manhã / noite"/></div><div className="field"><label>Grupo</label><select name="groupCode"><option value="">Sem grupo</option>{["A","B","C","D"].map(g=><option key={g}>{g}</option>)}</select></div></div>
          <div className="grid grid-2"><div className="field"><label>Início</label><input name="startsAt" type="datetime-local" required/></div><div className="field"><label>Chegada</label><input name="callTime" type="datetime-local"/></div></div>
          <div className="field"><label>Notas</label><textarea name="notes"/></div>
          <button className="button primary">Criar escala</button>
        </form>

        <form action={createWorshipRehearsal} className="card form-grid">
          <p className="eyebrow">NOVO ENSAIO</p>
          <div className="field"><label>Título</label><input name="title" required placeholder="Ensaio geral"/></div>
          <div className="grid grid-2"><div className="field"><label>Início</label><input name="startsAt" type="datetime-local" required/></div><div className="field"><label>Fim</label><input name="endsAt" type="datetime-local"/></div></div>
          <div className="field"><label>Local</label><input name="location"/></div>
          <div className="field"><label>Vincular a escala</label><select name="scheduleId"><option value="">Sem vínculo</option>{upcomingSchedules.map((s:any)=><option value={s.id} key={s.id}>{s.title}</option>)}</select></div>
          <div className="field"><label>Notas</label><textarea name="notes"/></div>
          <button className="button primary">Criar ensaio</button>
        </form>
      </div>

      <div className="grid grid-2" style={{marginTop:18}}>
        <form action={createWorshipSong} className="card form-grid">
          <p className="eyebrow">ADICIONAR AO REPERTÓRIO</p>
          <div className="field"><label>Música</label><input name="title" required/></div>
          <div className="field"><label>Artista</label><input name="artist"/></div>
          <div className="grid grid-2"><div className="field"><label>Tom padrão</label><input name="defaultKey" placeholder="G"/></div><div className="field"><label>BPM</label><input name="bpm" type="number" min="30" max="300"/></div></div>
          <div className="field"><label>YouTube</label><input name="youtubeUrl" type="url"/></div>
          <div className="field"><label>Cifra</label><input name="chordUrl" type="url"/></div>
          <div className="field"><label>Notas</label><textarea name="notes"/></div>
          <button className="button">Adicionar música</button>
        </form>

        <form action={createWorshipItem} className="card form-grid">
          <p className="eyebrow">AVISO / FICHEIRO</p>
          <div className="field"><label>Tipo</label><select name="item_type"><option value="notice">Aviso</option><option value="file">Ficheiro</option></select></div>
          <div className="field"><label>Título</label><input name="title" required/></div>
          <div className="field"><label>Descrição</label><textarea name="body"/></div>
          <div className="field"><label>Link externo</label><input name="external_url" type="url"/></div>
          <button className="button">Guardar recurso</button>
        </form>
      </div>

      <div className="section-title"><h2>Configurar escalas</h2></div>
      <div className="list">{upcomingSchedules.length===0?<div className="empty">Cria a primeira escala para configurar equipa e repertório.</div>:upcomingSchedules.map((s:any)=><details className="card" key={s.id}>
        <summary style={{cursor:"pointer",fontWeight:800}}>{s.title} · Grupo {s.group_code??"—"} · {new Date(s.starts_at).toLocaleString("pt-PT")}</summary>
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

          <form action={addSongToWorshipSchedule} className="form-grid">
            <input type="hidden" name="scheduleId" value={s.id}/>
            <p className="eyebrow">ADICIONAR MÚSICA</p>
            <div className="field"><label>Música</label><select name="songId" required><option value="">Selecionar</option>{(songs??[]).map((song:any)=><option value={song.id} key={song.id}>{song.title}</option>)}</select></div>
            <div className="grid grid-2"><div className="field"><label>Posição</label><input name="position" type="number" min="1" defaultValue="1"/></div><div className="field"><label>Tom</label><input name="keyOverride"/></div></div>
            <button className="button">Adicionar ao culto</button>
          </form>

          <form action={updateWorshipScheduleStatus} className="form-grid">
            <input type="hidden" name="scheduleId" value={s.id}/>
            <p className="eyebrow">ESTADO</p>
            <div className="field"><label>Estado da escala</label><select name="status" defaultValue={s.status}><option value="planned">Planeada</option><option value="confirmed">Confirmada</option><option value="completed">Concluída</option><option value="cancelled">Cancelada</option></select></div>
            <button className="button">Guardar estado</button>
          </form>
        </div>
      </details>)}</div>

      <div className="section-title"><h2>Membros, grupos e Academy</h2></div>
      <div className="list">{memberMetrics.map((m:any)=><details className="card" key={m.membership_id}>
        <summary style={{cursor:"pointer"}}>
          <div className="list-row" style={{padding:0,border:0,background:"transparent"}}>
            <div><h3>{m.display_name||m.email}</h3><span className="muted small">{m.email} · {m.role} · {m.status} · Grupo {m.profile?.group_code??"—"}</span></div>
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
    </>}
  </AppShell>
}
