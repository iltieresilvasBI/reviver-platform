import Link from "next/link";
import {AppShell} from "@/components/app-shell";
import {getAccessContext} from "@/lib/auth";
import {createScheduleAndContinue} from "./actions";
import {
  assignWorshipMember,
  autoAssignWorshipGroup,
  removeWorshipAssignment,
  removeSongFromWorshipSchedule,
  updateWorshipPublication
} from "../../actions";
import {ScheduleSongPicker} from "../../schedule-song-picker";
import {autoFillBand} from "../../band-rotation/actions";

const roles=[
  ["cantor_principal","Cantor principal"],
  ["backing_vocal","Backing vocal"],
  ["violao","Violão"],
  ["guitarra","Guitarra"],
  ["baixo","Baixo"],
  ["bateria","Bateria"],
  ["teclado","Teclado/Piano"],
  ["tecnico_som","Técnico de som"],
  ["iluminacao","Iluminação"],
] as const;

function roleLabel(value:string|null|undefined){
  return roles.find(([id])=>id===value)?.[1]??value??"Função";
}

function tabHref(schedule:string|undefined,step:string){
  return schedule?"/worship/schedules/new?schedule="+schedule+"&step="+step:"/worship/schedules/new?step="+step;
}

export default async function NewWorshipSchedulePage({
  searchParams
}:{
  searchParams:Promise<{schedule?:string;step?:string;message?:string}>
}){
  const qs=await searchParams;
  const ctx=await getAccessContext();
  const {data:network}=await ctx.supabase.from("networks").select("id").eq("slug","worship").maybeSingle();
  const {data:membership}=network
    ?await ctx.supabase.from("network_memberships").select("id,role,status").eq("network_id",network.id).eq("user_id",ctx.userId).maybeSingle()
    :{data:null as any};
  const canLead=ctx.isAdmin||(membership?.status==="active"&&membership?.role==="leader");

  if(!canLead){
    return <AppShell title="Nova escala" active="/worship" email={ctx.email}>
      <section className="hero-card"><h2>Acesso de liderança necessário.</h2><Link className="button" href="/worship">Voltar</Link></section>
    </AppShell>;
  }

  const scheduleId=qs.schedule??"";
  const step=["details","participants","songs","run-sheet"].includes(qs.step??"")?(qs.step as string):"details";

  const {data:schedule}=scheduleId
    ?await ctx.supabase.from("worship_schedules").select("*").eq("id",scheduleId).maybeSingle()
    :{data:null as any};

  const [{data:directory},{data:profiles},{data:assignments},{data:songs},{data:scheduleSongs},{data:executions},{data:bandTemplates}]=schedule?await Promise.all([
    ctx.supabase.rpc("worship_member_directory"),
    ctx.supabase.from("worship_member_profiles").select("membership_id,group_code,roles,active").eq("active",true),
    ctx.supabase.from("worship_schedule_members").select("*").eq("schedule_id",schedule.id).order("created_at"),
    ctx.supabase.from("worship_songs").select("*").eq("active",true).is("archived_at",null).order("title"),
    ctx.supabase.from("worship_schedule_songs").select("*").eq("schedule_id",schedule.id).order("position"),
    ctx.supabase.from("worship_song_executions").select("song_id,worship_schedules!inner(starts_at,status)"),
    ctx.supabase.from("worship_band_templates").select("id,name,service_types").eq("active",true).order("name")
  ]):[{data:[]},{data:[]},{data:[]},{data:[]},{data:[]},{data:[]},{data:[]}];

  const profileByMembership=new Map((profiles??[]).map((p:any)=>[p.membership_id,p]));
  const personByMembership=new Map((directory??[]).map((p:any)=>[p.membership_id,p]));
  const songById=new Map((songs??[]).map((s:any)=>[s.id,s]));

  const relationOne=(value:any)=>Array.isArray(value)?value[0]:value;

  const candidates=(songs??[]).map((song:any)=>{
    const serviceType=String(schedule?.service_type??"").trim().toLocaleLowerCase("pt-PT");
    const songTypes=(Array.isArray(song.service_types)?song.service_types:[]).map((x:string)=>x.toLocaleLowerCase("pt-PT"));
    const folderMatch=Boolean(serviceType)&&songTypes.some((x:string)=>x===serviceType||x.includes(serviceType)||serviceType.includes(x));
    const scheduleThemes=((schedule?.themes??[]) as string[]).map(x=>x.toLocaleLowerCase("pt-PT"));
    const songThemes=(Array.isArray(song.themes)?song.themes:[]).map((x:string)=>x.toLocaleLowerCase("pt-PT"));
    const themeMatches=scheduleThemes.filter(t=>songThemes.includes(t)).length;
    const cutoff=new Date(schedule?.starts_at??Date.now()); cutoff.setMonth(cutoff.getMonth()-4);
    const history=(executions??[]).filter((e:any)=>{
      const s=relationOne(e.worship_schedules);
      return e.song_id===song.id&&s?.status==="completed"&&new Date(s.starts_at)>=cutoff&&new Date(s.starts_at)<new Date(schedule?.starts_at??Date.now());
    }).sort((a:any,b:any)=>new Date(relationOne(b.worship_schedules)?.starts_at??0).getTime()-new Date(relationOne(a.worship_schedules)?.starts_at??0).getTime());
    return {
      id:song.id,title:song.title,artist:song.artist??null,
      defaultKey:song.default_key??null,recommendedKey:song.recommended_key??null,
      serviceTypes:Array.isArray(song.service_types)?song.service_types:[],
      themes:Array.isArray(song.themes)?song.themes:[],
      usageCount:history.length,lastUsedAt:relationOne(history[0]?.worship_schedules)?.starts_at??null,
      folderMatch,themeMatches,score:(folderMatch?100:0)+themeMatches*25-history.length
    };
  }).sort((a:any,b:any)=>b.score-a.score||a.usageCount-b.usageCount||a.title.localeCompare(b.title,"pt-PT"));

  const participantCount=(assignments??[]).length;
  const songCount=(scheduleSongs??[]).length;

  const shareText=schedule?[
    "Escala Reviver — "+schedule.title,
    new Date(schedule.starts_at).toLocaleString("pt-PT"),
    schedule.service_type?"Tipo: "+schedule.service_type:"",
    schedule.group_code?"Grupo vocal: "+schedule.group_code:"",
    "Participantes: "+participantCount,
    "Músicas: "+songCount
  ].filter(Boolean).join("\n"):"";

  return <AppShell title="Nova escala" active="/worship" email={ctx.email}>
    {qs.message&&<div className="notice" style={{marginBottom:16}}>{qs.message}</div>}
    <div className="button-row" style={{marginBottom:18}}>
      <Link className="button" href="/worship">← Louvor</Link>
      {schedule&&<span className="pill gold">{schedule.publication_state==="published"?"Publicada":schedule.publication_state==="approved"?"Aprovada":"Rascunho"}</span>}
    </div>

    <div className="card" style={{maxWidth:920,margin:"0 auto"}}>
      <div className="grid grid-4" style={{marginBottom:24}}>
        {[
          ["details","Detalhes","ⓘ"],
          ["participants","Participantes","♟"],
          ["songs","Músicas","♫"],
          ["run-sheet","Roteiro","◷"],
        ].map(([id,label,icon])=><Link
          href={tabHref(schedule?.id,id)}
          key={id}
          className={step===id?"card":"card muted"}
          style={{textAlign:"center",padding:14,textDecoration:"none"}}
        >
          <div style={{fontSize:22}}>{icon}</div>
          <strong>{label}</strong>
          <div className="muted small">{id==="participants"?participantCount:id==="songs"?songCount:""}</div>
        </Link>)}
      </div>

      {step==="details"&&(!schedule?<form action={createScheduleAndContinue} className="form-grid">
        <div className="field"><label>Título da escala</label><input name="title" required placeholder="Culto de domingo"/></div>
        <div className="grid grid-2">
          <div className="field"><label>Tipo de culto</label><select name="serviceType" required defaultValue=""><option value="" disabled>Selecionar</option>{["Culto de domingo","Ceia","Jovens","Mulheres","Homens","Kids","Vigília","Oração","Evangelístico","Conferência","Especial"].map(x=><option key={x}>{x}</option>)}</select></div>
          <div className="field"><label>Grupo vocal</label><select name="groupCode"><option value="">Sem grupo</option>{["A","B","C","D"].map(g=><option key={g}>{g}</option>)}</select></div>
        </div>
        <div className="grid grid-2">
          <div className="field"><label>Data e hora</label><input name="startsAt" type="datetime-local" required/></div>
          <div className="field"><label>Hora de chegada</label><input name="callTime" type="datetime-local"/></div>
        </div>
        <div className="field"><label>Temas</label><input name="themes" placeholder="Graça, Família, Missões"/></div>
        <div className="field"><label>Observações</label><textarea name="notes" maxLength={500}/></div>
        <SubmitButton className="button primary" pendingText="A criar escala…">Criar e continuar</SubmitButton>
      </form>:<div className="form-grid">
        <p className="eyebrow">DETALHES</p>
        <h2>{schedule.title}</h2>
        <div className="grid grid-3">
          <div className="metric"><span>Tipo de culto</span><strong>{schedule.service_type??"—"}</strong></div>
          <div className="metric"><span>Grupo vocal</span><strong>{schedule.group_code??"—"}</strong></div>
          <div className="metric"><span>Data</span><strong>{new Date(schedule.starts_at).toLocaleDateString("pt-PT")}</strong></div>
        </div>
        <div className="button-row"><Link className="button primary" href={tabHref(schedule.id,"participants")}>Continuar para participantes →</Link></div>
      </div>)}

      {step==="participants"&&schedule&&<div className="form-grid">
        <div className="list-row" style={{padding:0,border:0,background:"transparent"}}>
          <div><p className="eyebrow">PARTICIPANTES</p><h2>{participantCount} pessoa{participantCount===1?"":"s"} na escala</h2></div>
          <div className="button-row">
            <form action={autoAssignWorshipGroup}><input type="hidden" name="scheduleId" value={schedule.id}/><SubmitButton className="button primary" disabled={!schedule.group_code} pendingText="A preencher vocais…">Preencher vocais · Grupo {schedule.group_code??"—"}</SubmitButton></form>
          </div>
        </div>

        <form action={autoFillBand} className="card form-grid">
          <input type="hidden" name="scheduleId" value={schedule.id}/>
          <p className="eyebrow">BANDA</p>
          <div className="grid grid-2">
            <div className="field"><label>Combinação de instrumentistas</label><select name="templateId" required defaultValue=""><option value="" disabled>Selecionar combinação</option>{(bandTemplates??[]).filter((t:any)=>!t.service_types?.length||t.service_types.includes(schedule.service_type)).map((t:any)=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
            <div className="field"><label>Rotatividade</label><div className="notice">Escolhe automaticamente instrumentistas disponíveis com menor carga recente.</div></div>
          </div>
          <div className="button-row"><SubmitButton className="button primary" pendingText="A preencher banda…">Preencher banda automaticamente</SubmitButton><Link className="button" href={"/worship/band-rotation?schedule="+schedule.id}>Gerir combinações</Link></div>
        </form>

        <form action={assignWorshipMember} className="card form-grid">
          <input type="hidden" name="scheduleId" value={schedule.id}/>
          <div className="grid grid-2">
            <div className="field"><label>Adicionar participante</label><select name="membershipId" required><option value="">Selecionar</option>{(directory??[]).filter((m:any)=>m.status==="active").map((m:any)=><option value={m.membership_id} key={m.membership_id}>{m.display_name||m.email} · G{(profileByMembership.get(m.membership_id) as any)?.group_code??"—"}</option>)}</select></div>
            <div className="field"><label>Função</label><select name="role"><option value="">Selecionar</option>{roles.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></div>
          </div>
          <SubmitButton className="button" pendingText="A adicionar…">+ Adicionar</SubmitButton>
        </form>
        <div className="list">{participantCount===0?<div className="empty">Ainda não existem participantes nesta escala.</div>:(assignments??[]).map((a:any)=>{const p=personByMembership.get(a.membership_id) as any;return <div className="list-row" key={a.id}><div><strong>{p?.display_name||p?.email||"Membro"}</strong><div className="muted small">{roleLabel(a.role)}</div></div><form action={removeWorshipAssignment}><input type="hidden" name="assignmentId" value={a.id}/><button className="button">Remover</button></form></div>})}</div>
        <div className="button-row"><Link className="button primary" href={tabHref(schedule.id,"songs")}>Continuar para músicas →</Link></div>
      </div>}

      {step==="songs"&&schedule&&<div className="form-grid">
        <div><p className="eyebrow">MÚSICAS</p><h2>Repertório para {schedule.service_type}</h2><p className="muted">Aqui aparecem apenas músicas classificadas para este tipo de culto.</p></div>
        <ScheduleSongPicker
          scheduleId={schedule.id}
          serviceType={schedule.service_type??null}
          scheduleThemes={(((schedule.themes??[]) as string[]).length?(schedule.themes??[]):schedule.theme?[schedule.theme]:[]) as string[]}
          songs={candidates}
        />
        <div className="card">
          <p className="eyebrow">SELECIONADAS</p>
          <div className="list">{songCount===0?<div className="empty">Nenhuma música adicionada.</div>:(scheduleSongs??[]).map((x:any)=>{const song=songById.get(x.song_id) as any;return <div className="list-row" key={x.id}><div><strong>{song?.title??"Música"}</strong><div className="muted small">Tom {x.key_override||song?.recommended_key||song?.default_key||"—"}</div></div><form action={removeSongFromWorshipSchedule}><input type="hidden" name="scheduleSongId" value={x.id}/><button className="button">Remover</button></form></div>})}</div>
        </div>
        <div className="button-row"><Link className="button primary" href={tabHref(schedule.id,"run-sheet")}>Continuar para roteiro →</Link></div>
      </div>}

      {step==="run-sheet"&&schedule&&<div className="form-grid">
        <p className="eyebrow">ROTEIRO E PUBLICAÇÃO</p>
        <h2>Rever antes de comunicar</h2>
        <div className="grid grid-3">
          <div className="metric"><span>Participantes</span><strong>{participantCount}</strong></div>
          <div className="metric"><span>Músicas</span><strong>{songCount}</strong></div>
          <div className="metric"><span>Tipo</span><strong>{schedule.service_type??"—"}</strong></div>
        </div>
        <Link className="button" href={"/worship/run-sheet/"+schedule.id}>Editar roteiro do culto</Link>
        <div className="card">
          <p className="eyebrow">FINALIZAR</p>
          <div className="button-row">
            {schedule.publication_state==="draft"&&<form action={updateWorshipPublication}><input type="hidden" name="scheduleId" value={schedule.id}/><input type="hidden" name="publicationAction" value="approve"/><SubmitButton className="button" pendingText="A aprovar…">Aprovar escala</SubmitButton></form>}
            {schedule.publication_state!=="published"&&<form action={updateWorshipPublication}><input type="hidden" name="scheduleId" value={schedule.id}/><input type="hidden" name="publicationAction" value="publish"/><SubmitButton className="button primary" pendingText="A publicar…">Publicar escala</SubmitButton></form>}
            <Link className="button primary" href={"/worship/share?schedule="+schedule.id}>Comunicar participantes</Link>
            <a className="button" href={"https://wa.me/?text="+encodeURIComponent(shareText)} target="_blank" rel="noreferrer">Partilhar no WhatsApp</a>
          </div>
          <p className="muted small">“Comunicar participantes” prepara as mensagens individuais. “Partilhar no WhatsApp” abre o WhatsApp para escolher manualmente o grupo do Louvor.</p>
        </div>
      </div>}
    </div>
  </AppShell>;
}
