import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getAccessContext } from "@/lib/auth";
import { createRotationServiceSlot,deleteRotationServiceSlot,generateWorshipRotationMonth,materializeWorshipRotationMonth,updateWorshipRotationAssignment } from "../actions";

const weekdayLabel=["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];

export default async function WorshipRotationPage({searchParams}:{searchParams:Promise<{message?:string;month?:string}>}){
  const qs=await searchParams;
  const ctx=await getAccessContext();

  const {data:network}=await ctx.supabase.from("networks").select("id").eq("slug","worship").single();
  const {data:membership}=network
    ?await ctx.supabase.from("network_memberships").select("role,status").eq("user_id",ctx.userId).eq("network_id",network.id).maybeSingle()
    :{data:null as any};

  const canRead=ctx.isAdmin||membership?.status==="active";
  const canLead=ctx.isAdmin||(membership?.status==="active"&&membership?.role==="leader");
  if(!canRead) return <AppShell title="Rotação do Louvor" active="/worship" email={ctx.email}><div className="empty">Acesso reservado ao Ministério de Louvor.</div></AppShell>;

  const [{data:slots},{data:months}]=await Promise.all([
    ctx.supabase.from("worship_rotation_service_slots").select("*").order("weekday").order("service_time").order("sort_order"),
    ctx.supabase.from("worship_rotation_months").select("*").order("month_start",{ascending:false}).limit(12)
  ]);

  const selectedMonthId=(qs.month??months?.[0]?.id??"").trim();
  const {data:assignments}=selectedMonthId
    ?await ctx.supabase.from("worship_rotation_assignments").select("id,service_date,service_slot_id,group_code,notes").eq("rotation_month_id",selectedMonthId).order("service_date")
    :{data:[] as any[]};

  const slotById=new Map((slots??[]).map((s:any)=>[s.id,s]));
  const selectedMonth=(months??[]).find((m:any)=>m.id===selectedMonthId);
  const load={A:0,B:0,C:0,D:0} as Record<string,number>;
  for(const a of assignments??[]) load[a.group_code]=(load[a.group_code]??0)+1;
  const max=Math.max(...Object.values(load),0);
  const min=Math.min(...Object.values(load),0);
  const balanced=(assignments??[]).length===0?true:max-min<=1;

  return <AppShell title="Rotação A/B/C/D" active="/worship" email={ctx.email}>
    <div className="button-row" style={{marginBottom:18}}>
      <Link className="button" href="/worship">← Ministério de Louvor</Link>
    </div>
    {qs.message&&<div className="notice" style={{marginBottom:16}}>{qs.message}</div>}

    <section className="hero-card">
      <p className="eyebrow">ROTAÇÃO MENSAL</p>
      <h2>Planeia os cultos antes de criar as escalas.</h2>
      <p>Define os horários semanais reais, escolhe o mês e o grupo inicial. O sistema distribui A→B→C→D em ordem cronológica e mostra a carga de cada grupo antes de publicar o plano como escalas.</p>
    </section>

    <div className="grid grid-4" style={{marginTop:18}}>
      {["A","B","C","D"].map(g=><article className="card metric" key={g}><span>Grupo {g}</span><strong>{load[g]??0}</strong><small>cultos no plano</small></article>)}
    </div>
    <div className={balanced?"notice":"notice warn"} style={{marginTop:14}}>
      {balanced?"Distribuição equilibrada: diferença máxima de 1 culto entre grupos.":"A distribuição deste plano está desequilibrada. Revê o grupo inicial ou os cultos configurados."}
    </div>

    {canLead&&<>
      <div className="section-title"><div><p className="eyebrow">CONFIGURAÇÃO</p><h2>Cultos semanais</h2></div><span className="muted small">Configura uma vez e reutiliza todos os meses.</span></div>
      <div className="grid grid-2">
        <form action={createRotationServiceSlot} className="card form-grid">
          <div className="grid grid-2">
            <div className="field"><label>Dia</label><select name="weekday">{weekdayLabel.map((d,i)=><option value={i} key={d}>{d}</option>)}</select></div>
            <div className="field"><label>Hora do culto</label><input name="serviceTime" type="time" required/></div>
          </div>
          <div className="field"><label>Tipo / nome</label><input name="serviceType" required placeholder="Culto da noite"/></div>
          <div className="grid grid-2">
            <div className="field"><label>Chegada antes do culto</label><input name="callOffsetMinutes" type="number" min="0" max="360" defaultValue="60"/></div>
            <div className="field"><label>Ordem</label><input name="sortOrder" type="number" defaultValue="0"/></div>
          </div>
          <button className="button primary">Adicionar culto semanal</button>
        </form>

        <div className="card">
          <p className="eyebrow">HORÁRIOS ATUAIS</p>
          <div className="list">{(slots??[]).length===0?<div className="empty">Nenhum culto configurado.</div>:(slots??[]).map((s:any)=><div className="list-row" key={s.id}>
            <div><strong>{weekdayLabel[s.weekday]} · {String(s.service_time).slice(0,5)}</strong><div className="muted small">{s.service_type} · chegada {s.call_offset_minutes} min antes</div></div>
            <form action={deleteRotationServiceSlot}><input type="hidden" name="slotId" value={s.id}/><button className="button danger">Remover</button></form>
          </div>)}</div>
        </div>
      </div>

      <div className="section-title"><div><p className="eyebrow">GERAÇÃO ASSISTIDA</p><h2>Novo plano mensal</h2></div></div>
      <form action={generateWorshipRotationMonth} className="card form-grid">
        <div className="grid grid-3">
          <div className="field"><label>Primeiro dia do mês</label><input name="monthStart" type="date" required/></div>
          <div className="field"><label>Grupo inicial</label><select name="startingGroup">{["A","B","C","D"].map(g=><option key={g}>{g}</option>)}</select></div>
          <div className="field"><label>Notas</label><input name="notes" placeholder="Observações do mês"/></div>
        </div>
        <button className="button primary">Gerar plano em rascunho</button>
      </form>
    </>}

    <div className="section-title"><div><p className="eyebrow">PLANO</p><h2>Calendário mensal</h2></div></div>
    <form method="get" className="card" style={{marginBottom:18}}>
      <div className="button-row">
        <select name="month" defaultValue={selectedMonthId} className="inline-input" style={{minWidth:260}}>
          {(months??[]).map((m:any)=><option value={m.id} key={m.id}>{new Date(m.month_start+"T00:00:00").toLocaleDateString("pt-PT",{month:"long",year:"numeric"})} · {m.status}</option>)}
        </select>
        <button className="button">Abrir mês</button>
      </div>
    </form>

    {(assignments??[]).length===0?<div className="empty">Ainda não há plano mensal gerado.</div>:<>
      <div className="list">{(assignments??[]).map((a:any)=>{
        const slot=slotById.get(a.service_slot_id) as any;
        return <div className="list-row" key={a.id}>
          <div>
            <div className="button-row"><span className="pill gold">Grupo {a.group_code}</span><span className="pill">{slot?.service_type??"Culto"}</span>{a.notes&&<span className="pill">ajuste manual</span>}</div>
            <h3 style={{margin:"8px 0 4px"}}>{new Date(a.service_date+"T00:00:00").toLocaleDateString("pt-PT",{weekday:"long",day:"2-digit",month:"2-digit"})}</h3>
            <span className="muted small">{slot?String(slot.service_time).slice(0,5):"hora não disponível"}</span>
            {a.notes&&<div className="muted small" style={{marginTop:6}}>{a.notes}</div>}
          </div>
          {canLead&&<form action={updateWorshipRotationAssignment} className="button-row">
            <input type="hidden" name="assignmentId" value={a.id}/>
            <select name="groupCode" defaultValue={a.group_code} className="inline-input">{["A","B","C","D"].map(g=><option key={g}>{g}</option>)}</select>
            <input name="notes" defaultValue={a.notes??""} className="inline-input" placeholder="Motivo opcional"/>
            <button className="button">Ajustar</button>
          </form>}
        </div>
      })}</div>

      {canLead&&selectedMonth&&<div className="card" style={{marginTop:18}}>
        <p className="eyebrow">PUBLICAR COMO ESCALAS</p>
        <h3>{new Date(selectedMonth.month_start+"T00:00:00").toLocaleDateString("pt-PT",{month:"long",year:"numeric"})}</h3>
        <p className="muted">Este passo cria escalas reais no módulo de Louvor. A operação evita duplicar um culto que já exista com a mesma data/hora e tipo.</p>
        <form action={materializeWorshipRotationMonth}>
          <input type="hidden" name="rotationId" value={selectedMonth.id}/>
          <button className="button primary">Criar escalas deste plano</button>
        </form>
      </div>}
    </>}
  </AppShell>
}
