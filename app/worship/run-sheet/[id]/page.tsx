import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getAccessContext } from "@/lib/auth";
import { createWorshipRunSheetItem,deleteWorshipRunSheetItem,updateWorshipRunSheetItem } from "../../actions";

const labels:Record<string,string>={song:"Música",prayer:"Oração",welcome:"Acolhimento",offering:"Oferta",announcement:"Aviso",message:"Mensagem",transition:"Transição",other:"Outro"};

export default async function WorshipRunSheetPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{message?:string}>}){
  const {id}=await params; const qs=await searchParams;
  const ctx=await getAccessContext();
  const {data:network}=await ctx.supabase.from("networks").select("id").eq("slug","worship").maybeSingle();
  const {data:membership}=network?await ctx.supabase.from("network_memberships").select("role,status").eq("network_id",network.id).eq("user_id",ctx.userId).maybeSingle():{data:null as any};
  const canRead=ctx.isAdmin||membership?.status==="active";
  const canLead=ctx.isAdmin||(membership?.status==="active"&&membership?.role==="leader");
  if(!canRead)return <AppShell title="Roteiro do culto" active="/worship" email={ctx.email}><section className="hero-card"><h2>Acesso ao Louvor necessário.</h2><Link className="button" href="/worship">Voltar</Link></section></AppShell>;

  const [{data:schedule},{data:items},{data:songs}]=await Promise.all([
    ctx.supabase.from("worship_schedules").select("id,title,service_type,starts_at,call_time,group_code,themes,location,status,publication_state").eq("id",id).maybeSingle(),
    ctx.supabase.from("worship_run_sheet_items").select("*").eq("schedule_id",id).order("position").order("created_at"),
    ctx.supabase.from("worship_songs").select("id,title,artist,default_key,recommended_key").eq("active",true).is("archived_at",null).order("title"),
  ]);
  if(!schedule)return <AppShell title="Roteiro do culto" active="/worship" email={ctx.email}><section className="hero-card"><h2>Culto não encontrado.</h2><Link className="button" href="/worship">Voltar</Link></section></AppShell>;

  const total=(items??[]).reduce((n:number,x:any)=>n+(x.planned_minutes??0),0);
  const songById=new Map((songs??[]).map((s:any)=>[s.id,s]));

  return <AppShell title="Roteiro do culto" active="/worship" email={ctx.email}>
    {qs.message&&<div className="notice" style={{marginBottom:16}}>{qs.message}</div>}
    <div className="button-row" style={{marginBottom:18}}><Link className="button" href="/worship">← Louvor</Link><a className="button" href={"/api/worship/schedule-card/"+schedule.id} target="_blank" rel="noreferrer">Abrir imagem da escala</a></div>
    <section className="hero-card"><p className="eyebrow">ROTEIRO DO CULTO</p><h2>{schedule.title}</h2><p>{new Date(schedule.starts_at).toLocaleString("pt-PT")} · Grupo {schedule.group_code??"—"} · {(schedule.themes??[]).join(" / ")||"sem tema"}{schedule.location?" · "+schedule.location:""}</p></section>
    <div className="grid grid-4" style={{marginTop:18}}><article className="card metric"><span>Itens</span><strong>{(items??[]).length}</strong></article><article className="card metric"><span>Duração planeada</span><strong>{total} min</strong></article><article className="card metric"><span>Estado</span><strong style={{fontSize:20}}>{schedule.status}</strong></article><article className="card metric"><span>Editorial</span><strong style={{fontSize:20}}>{schedule.publication_state}</strong></article></div>

    <div className="section-title"><div><p className="eyebrow">ORDEM</p><h2>Sequência do culto</h2></div></div>
    <div className="list">{(items??[]).length===0?<div className="empty">Roteiro ainda não definido.</div>:(items??[]).map((item:any)=>{
      const song=songById.get(item.song_id) as any;
      return <details className="card" key={item.id}><summary style={{cursor:"pointer"}}><div className="list-row" style={{padding:0,border:0,background:"transparent"}}><div><span className="pill">{item.position}</span> <span className="pill gold">{labels[item.item_type]??item.item_type}</span><h3 style={{margin:"10px 0 4px"}}>{item.title}</h3><span className="muted small">{item.owner_label||"Responsável por definir"}{song?" · "+song.title:""}</span></div><strong>{item.planned_minutes??0} min</strong></div></summary>{canLead&&<form action={updateWorshipRunSheetItem} className="form-grid" style={{marginTop:16}}><input type="hidden" name="itemId" value={item.id}/><input type="hidden" name="scheduleId" value={schedule.id}/><div className="grid grid-4"><div className="field"><label>Posição</label><input name="position" type="number" min="1" defaultValue={item.position}/></div><div className="field"><label>Tipo</label><select name="itemType" defaultValue={item.item_type}>{Object.entries(labels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div><div className="field"><label>Título</label><input name="title" defaultValue={item.title} required/></div><div className="field"><label>Minutos</label><input name="plannedMinutes" type="number" min="0" max="240" defaultValue={item.planned_minutes??""}/></div></div><div className="grid grid-3"><div className="field"><label>Música</label><select name="songId" defaultValue={item.song_id??""}><option value="">Sem música</option>{(songs??[]).map((s:any)=><option value={s.id} key={s.id}>{s.title}</option>)}</select></div><div className="field"><label>Responsável</label><input name="ownerLabel" defaultValue={item.owner_label??""}/></div><div className="field"><label>Notas</label><input name="notes" defaultValue={item.notes??""}/></div></div><div className="button-row"><button className="button primary">Guardar item</button></div></form>}{canLead&&<form action={deleteWorshipRunSheetItem} style={{marginTop:10}}><input type="hidden" name="itemId" value={item.id}/><input type="hidden" name="scheduleId" value={schedule.id}/><button className="button danger">Remover</button></form>}</details>
    })}</div>

    {canLead&&<><div className="section-title"><div><p className="eyebrow">ADICIONAR</p><h2>Novo item no roteiro</h2></div></div><form action={createWorshipRunSheetItem} className="card form-grid"><input type="hidden" name="scheduleId" value={schedule.id}/><div className="grid grid-4"><div className="field"><label>Posição</label><input name="position" type="number" min="1" defaultValue={(items??[]).length+1}/></div><div className="field"><label>Tipo</label><select name="itemType">{Object.entries(labels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div><div className="field"><label>Título</label><input name="title" required placeholder="Ex.: Boas-vindas"/></div><div className="field"><label>Minutos</label><input name="plannedMinutes" type="number" min="0" max="240"/></div></div><div className="grid grid-3"><div className="field"><label>Música</label><select name="songId"><option value="">Sem música</option>{(songs??[]).map((s:any)=><option value={s.id} key={s.id}>{s.title}</option>)}</select></div><div className="field"><label>Responsável</label><input name="ownerLabel"/></div><div className="field"><label>Notas</label><input name="notes"/></div></div><button className="button primary">Adicionar ao roteiro</button></form></>}
  </AppShell>;
}
