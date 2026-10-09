import Link from "next/link";
import {AppShell} from "@/components/app-shell";
import {getAccessContext} from "@/lib/auth";
import {
  addBandTemplateSlot,
  autoFillBand,
  createBandTemplate,
  deleteBandTemplateSlot,
  generateAutomaticBackups
} from "./actions";

const bandRoles=[
  ["violao","Violão"],
  ["guitarra","Guitarra"],
  ["baixo","Baixo"],
  ["bateria","Bateria"],
  ["teclado","Teclado/Piano"],
] as const;

function labelRole(role:string){
  return bandRoles.find(([id])=>id===role)?.[1]??role;
}

export default async function BandRotationPage({
  searchParams
}:{searchParams:Promise<{message?:string;schedule?:string}>}){
  const qs=await searchParams;
  const ctx=await getAccessContext();
  const {data:network}=await ctx.supabase.from("networks").select("id").eq("slug","worship").maybeSingle();
  const {data:membership}=network
    ?await ctx.supabase.from("network_memberships").select("id,role,status").eq("network_id",network.id).eq("user_id",ctx.userId).maybeSingle()
    :{data:null as any};
  const canLead=ctx.isAdmin||(membership?.status==="active"&&membership?.role==="leader");
  if(!canLead){
    return <AppShell title="Combinações da Banda" active="/worship" email={ctx.email}><section className="hero-card"><h2>Acesso de liderança necessário.</h2><Link className="button" href="/worship">Voltar</Link></section></AppShell>;
  }

  const now=new Date().toISOString();
  const [{data:templates},{data:slots},{data:schedules},{data:profiles},{data:backups},{data:directory}]=await Promise.all([
    ctx.supabase.from("worship_band_templates").select("*").eq("active",true).order("name"),
    ctx.supabase.from("worship_band_template_slots").select("*").order("sort_order").order("role"),
    ctx.supabase.from("worship_schedules").select("id,title,starts_at,service_type,group_code").gte("starts_at",now).neq("status","cancelled").order("starts_at"),
    ctx.supabase.from("worship_member_profiles").select("membership_id,roles,group_code,active").eq("active",true),
    ctx.supabase.from("worship_member_backup_pool").select("primary_membership_id,role,backup_membership_id,priority").eq("active",true).order("priority"),
    ctx.supabase.rpc("worship_member_directory"),
  ]);

  const personByMembership=new Map((directory??[]).map((p:any)=>[p.membership_id,p]));
  const selectedSchedule=qs.schedule||((schedules??[])[0]?.id??"");
  const backupPrimaryCount=new Set((backups??[]).map((b:any)=>b.primary_membership_id+"|"+b.role)).size;

  return <AppShell title="Combinações da Banda" active="/worship" email={ctx.email}>
    {qs.message&&<div className="notice" style={{marginBottom:16}}>{qs.message}</div>}
    <div className="button-row" style={{marginBottom:18}}>
      <Link className="button" href="/worship">← Louvor</Link>
      <Link className="button" href="/worship/substitutions">Substituições</Link>
    </div>

    <section className="hero-card">
      <p className="eyebrow">ROTAÇÃO DOS INSTRUMENTISTAS</p>
      <h2>Combinações flexíveis, não grupos fixos.</h2>
      <p>Defina quais instrumentos a banda precisa. O sistema escolhe pessoas capazes de cobrir cada posição, respeita indisponibilidades e prioriza quem tocou menos nos últimos 120 dias.</p>
    </section>

    <div className="grid grid-3" style={{marginTop:18}}>
      <article className="card metric"><span>Combinações</span><strong>{(templates??[]).length}</strong></article>
      <article className="card metric"><span>Instrumentistas configurados</span><strong>{(profiles??[]).filter((p:any)=>(p.roles??[]).some((r:string)=>bandRoles.some(([id])=>id===r))).length}</strong></article>
      <article className="card metric"><span>Funções com backup</span><strong>{backupPrimaryCount}</strong></article>
    </div>

    <div className="section-title"><div><p className="eyebrow">COMBINAÇÕES</p><h2>Modelos de banda</h2></div></div>
    <div className="grid grid-2">
      <form action={createBandTemplate} className="card form-grid">
        <p className="eyebrow">NOVA COMBINAÇÃO</p>
        <div className="field"><label>Nome</label><input name="name" required placeholder="Banda completa"/></div>
        <div className="field"><label>Tipos de culto opcionais</label><input name="serviceTypes" placeholder="Culto de domingo, Ceia"/></div>
        <button className="button primary">Criar combinação</button>
      </form>

      <form action={generateAutomaticBackups} className="card form-grid">
        <p className="eyebrow">BACKUPS AUTOMÁTICOS</p>
        <h3>Gerar por função</h3>
        <p className="muted">Para cada membro e cada função configurada, o sistema ordena até 5 backups compatíveis pela carga recente.</p>
        <button className="button primary">Recalcular todos os backups</button>
      </form>
    </div>

    <div className="list" style={{marginTop:18}}>{(templates??[]).length===0?<div className="empty">Crie a primeira combinação de banda.</div>:(templates??[]).map((template:any)=>{
      const templateSlots=(slots??[]).filter((s:any)=>s.template_id===template.id);
      return <article className="card" key={template.id}>
        <div className="list-row" style={{padding:0,border:0,background:"transparent"}}>
          <div><h3>{template.name}</h3><p className="muted small">{template.service_types?.length?"Cultos: "+template.service_types.join(", "):"Pode ser usada em qualquer culto"}</p></div>
          <span className="pill">{templateSlots.reduce((sum:number,s:any)=>sum+s.required_count,0)} posições</span>
        </div>
        <div className="button-row" style={{marginTop:12}}>{templateSlots.map((slot:any)=><form action={deleteBandTemplateSlot} key={slot.id}><input type="hidden" name="slotId" value={slot.id}/><button className="pill" title="Remover">{labelRole(slot.role)} × {slot.required_count} · ×</button></form>)}</div>
        <form action={addBandTemplateSlot} className="form-grid" style={{marginTop:14}}>
          <input type="hidden" name="templateId" value={template.id}/>
          <div className="grid grid-2">
            <div className="field"><label>Instrumento</label><select name="role">{bandRoles.map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></div>
            <div className="field"><label>Quantidade</label><input name="requiredCount" type="number" min="1" max="4" defaultValue="1"/></div>
          </div>
          <button className="button">Adicionar / atualizar posição</button>
        </form>
      </article>;
    })}</div>

    <div className="section-title"><div><p className="eyebrow">PREENCHER ESCALA</p><h2>Aplicar combinação</h2></div></div>
    <form action={autoFillBand} className="card form-grid">
      <div className="grid grid-2">
        <div className="field"><label>Escala</label><select name="scheduleId" defaultValue={selectedSchedule} required>{(schedules??[]).map((s:any)=><option value={s.id} key={s.id}>{s.title} · {new Date(s.starts_at).toLocaleString("pt-PT")}</option>)}</select></div>
        <div className="field"><label>Combinação</label><select name="templateId" required><option value="">Selecionar</option>{(templates??[]).map((t:any)=><option value={t.id} key={t.id}>{t.name}</option>)}</select></div>
      </div>
      <button className="button primary">Preencher banda automaticamente</button>
    </form>

    <div className="section-title"><div><p className="eyebrow">BACKUPS</p><h2>Exemplos das prioridades atuais</h2></div></div>
    <div className="list">{(backups??[]).slice(0,40).map((b:any)=>{
      const primary=personByMembership.get(b.primary_membership_id) as any;
      const backup=personByMembership.get(b.backup_membership_id) as any;
      return <div className="list-row" key={b.primary_membership_id+"-"+b.role+"-"+b.backup_membership_id}>
        <div><strong>{primary?.display_name||primary?.email||"Membro"}</strong><div className="muted small">{labelRole(b.role)} → {backup?.display_name||backup?.email||"Backup"}</div></div>
        <span className="pill">prioridade {b.priority}</span>
      </div>;
    })}</div>
  </AppShell>;
}
