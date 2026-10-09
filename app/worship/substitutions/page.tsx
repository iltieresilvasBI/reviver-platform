import Link from "next/link";
import {AppShell} from "@/components/app-shell";
import {getAccessContext} from "@/lib/auth";
import {requestAutomaticSubstitution,respondAutomaticSubstitution} from "./actions";

function roleLabel(value:string|null|undefined){
  const map:Record<string,string>={
    cantor_principal:"Cantor principal",
    backing_vocal:"Backing vocal",
    violao:"Violão",
    guitarra:"Guitarra",
    baixo:"Baixo",
    bateria:"Bateria",
    teclado:"Teclado/Piano",
    tecnico_som:"Técnico de som",
    iluminacao:"Iluminação"
  };
  return map[value??""]??value??"Função por definir";
}

export default async function WorshipSubstitutionsPage({
  searchParams
}:{searchParams:Promise<{message?:string}>}){
  const qs=await searchParams;
  const ctx=await getAccessContext();
  const {data:network}=await ctx.supabase.from("networks").select("id").eq("slug","worship").maybeSingle();
  const {data:membership}=network
    ?await ctx.supabase.from("network_memberships").select("id,role,status").eq("network_id",network.id).eq("user_id",ctx.userId).maybeSingle()
    :{data:null as any};

  const canRead=ctx.isAdmin||membership?.status==="active";
  const canLead=ctx.isAdmin||(membership?.status==="active"&&membership?.role==="leader");
  if(!canRead){
    return <AppShell title="Substituições" active="/worship" email={ctx.email}>
      <section className="hero-card"><h2>Acesso ativo ao Louvor necessário.</h2><Link className="button" href="/worship">Voltar</Link></section>
    </AppShell>;
  }

  const now=new Date().toISOString();
  const [{data:schedules},{data:assignments},{data:requests},{data:offers},{data:events}]=await Promise.all([
    ctx.supabase.from("worship_schedules").select("id,title,starts_at,group_code,status").gte("starts_at",now).neq("status","cancelled").order("starts_at"),
    ctx.supabase.from("worship_schedule_members").select("id,schedule_id,membership_id,role,attendance_status"),
    ctx.supabase.from("worship_substitution_requests").select("*").order("created_at",{ascending:false}),
    ctx.supabase.from("worship_substitution_offers").select("*").order("priority"),
    ctx.supabase.from("worship_substitution_events").select("*").order("created_at",{ascending:false}).limit(100),
  ]);

  const scheduleById=new Map((schedules??[]).map((s:any)=>[s.id,s]));
  const assignmentById=new Map((assignments??[]).map((a:any)=>[a.id,a]));
  const myAssignments=(assignments??[]).filter((a:any)=>a.membership_id===membership?.id&&scheduleById.has(a.schedule_id));
  const myOffers=(offers??[]).filter((o:any)=>o.proposed_membership_id===membership?.id&&o.status==="pending");

  const directory=canLead?(await ctx.supabase.rpc("worship_member_directory")).data??[]:[];
  const personByMembership=new Map((directory??[]).map((p:any)=>[p.membership_id,p]));

  return <AppShell title="Substituições" active="/worship" email={ctx.email}>
    {qs.message&&<div className="notice" style={{marginBottom:16}}>{qs.message}</div>}
    <div className="button-row" style={{marginBottom:18}}>
      <Link className="button" href="/worship">← Louvor</Link>
      {canLead&&<Link className="button" href="/worship/band-rotation">Combinações e backups</Link>}
    </div>

    <section className="hero-card">
      <p className="eyebrow">SUBSTITUIÇÃO AUTOMÁTICA</p>
      <h2>Sem validação manual da liderança.</h2>
      <p>Ao pedir substituição, a plataforma procura backups compatíveis com a mesma função, ignora quem está indisponível ou já escalado e envia o pedido aos candidatos. O primeiro que aceitar assume automaticamente a posição.</p>
    </section>

    <div className="section-title"><div><p className="eyebrow">MINHAS ESCALAS</p><h2>Preciso de substituição</h2></div></div>
    <div className="list">{myAssignments.length===0?<div className="empty">Não tens escalas futuras atribuídas.</div>:myAssignments.map((a:any)=>{
      const schedule=scheduleById.get(a.schedule_id) as any;
      const existing=(requests??[]).find((r:any)=>r.assignment_id===a.id&&!["rejected","cancelled","approved"].includes(r.status));
      const completed=(requests??[]).find((r:any)=>r.assignment_id===a.id&&r.status==="approved");
      return <article className="card" key={a.id}>
        <div className="list-row" style={{padding:0,border:0,background:"transparent"}}>
          <div>
            <h3>{schedule?.title??"Culto"}</h3>
            <p className="muted">{schedule?new Date(schedule.starts_at).toLocaleString("pt-PT"):""} · {roleLabel(a.role)}</p>
          </div>
          {completed&&<span className="pill ok">substituído</span>}
        </div>
        {existing
          ?<div className="notice">Pedido em aberto. A aguardar resposta dos backups.</div>
          :completed
            ?<div className="notice">Esta posição já foi substituída automaticamente.</div>
            :<form action={requestAutomaticSubstitution} className="form-grid" style={{marginTop:12}}>
              <input type="hidden" name="assignmentId" value={a.id}/>
              <div className="field"><label>Observação opcional</label><input name="requesterNote" placeholder="Ex.: viagem, trabalho, compromisso"/></div>
              <button className="button">Pedir substituição automática</button>
            </form>}
      </article>;
    })}</div>

    <div className="section-title"><div><p className="eyebrow">PEDIDOS PARA MIM</p><h2>Posso substituir?</h2></div></div>
    <div className="list">{myOffers.length===0?<div className="empty">Nenhum pedido de backup pendente.</div>:myOffers.map((offer:any)=>{
      const req=(requests??[]).find((r:any)=>r.id===offer.request_id);
      const assignment=req?assignmentById.get(req.assignment_id) as any:null;
      const schedule=assignment?scheduleById.get(assignment.schedule_id) as any:null;
      return <article className="card" key={offer.id}>
        <div className="list-row" style={{padding:0,border:0,background:"transparent"}}>
          <div>
            <span className="pill gold">backup prioridade {offer.priority}</span>
            <h3 style={{marginTop:10}}>{schedule?.title??"Culto"}</h3>
            <p className="muted">{schedule?new Date(schedule.starts_at).toLocaleString("pt-PT"):""} · {roleLabel(assignment?.role)}</p>
          </div>
        </div>
        <div className="button-row" style={{marginTop:12}}>
          <form action={respondAutomaticSubstitution}>
            <input type="hidden" name="offerId" value={offer.id}/>
            <input type="hidden" name="decision" value="accept"/>
            <button className="button primary">Posso substituir</button>
          </form>
          <form action={respondAutomaticSubstitution}>
            <input type="hidden" name="offerId" value={offer.id}/>
            <input type="hidden" name="decision" value="decline"/>
            <button className="button">Não posso</button>
          </form>
        </div>
      </article>;
    })}</div>

    {canLead&&<>
      <div className="section-title"><div><p className="eyebrow">REGISTO</p><h2>Histórico automático</h2></div><span className="muted small">A liderança acompanha; não precisa aprovar.</span></div>
      <div className="list">{(events??[]).length===0?<div className="empty">Ainda não há eventos de substituição.</div>:(events??[]).map((event:any)=>{
        const from=personByMembership.get(event.from_membership_id) as any;
        const to=personByMembership.get(event.to_membership_id) as any;
        return <div className="list-row" key={event.id}>
          <div>
            <strong>{event.event_type==="auto_replaced"?"Substituição concluída":event.event_type==="backup_declined"?"Backup recusou":"Pedido criado"}</strong>
            <div className="muted small">
              {from&&(from.display_name||from.email)}
              {to?" → "+(to.display_name||to.email):""}
              {event.details?.role?" · "+roleLabel(event.details.role):""}
            </div>
          </div>
          <span className="muted small">{new Date(event.created_at).toLocaleString("pt-PT")}</span>
        </div>;
      })}</div>
    </>}
  </AppShell>;
}
