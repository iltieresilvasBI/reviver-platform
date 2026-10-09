import Link from "next/link";
import { headers } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { SubmitButton } from "@/components/submit-button";
import { getAccessContext } from "@/lib/auth";
import { saveMyWorshipCommunicationPreference } from "../actions";
import { CopyTextButton } from "./copy-text-button";

function waPhone(value:string|null|undefined){
  const digits=String(value??"").replace(/\D/g,"");
  return digits.length>=8?digits:"";
}
function roleLabel(value:string|null|undefined){
  const map:Record<string,string>={cantor_principal:"Cantor principal",backing_vocal:"Backing vocal",violao:"Violão",guitarra:"Guitarra",baixo:"Baixo",bateria:"Bateria",teclado:"Teclado/Piano",tecnico_som:"Técnico de som",iluminacao:"Iluminação"};
  return map[value??""]??value??"Função por definir";
}

export default async function WorshipSharePage({searchParams}:{searchParams:Promise<{message?:string;schedule?:string}>}){
  const qs=await searchParams;
  const ctx=await getAccessContext();
  const {data:network}=await ctx.supabase.from("networks").select("id").eq("slug","worship").maybeSingle();
  const {data:membership}=network?await ctx.supabase.from("network_memberships").select("id,role,status").eq("network_id",network.id).eq("user_id",ctx.userId).maybeSingle():{data:null as any};
  const canRead=ctx.isAdmin||membership?.status==="active";
  const canLead=ctx.isAdmin||(membership?.status==="active"&&membership?.role==="leader");
  if(!canRead)return <AppShell title="Comunicação" active="/worship" email={ctx.email}><section className="hero-card"><h2>Acesso ao Louvor necessário.</h2><Link className="button" href="/worship">Voltar</Link></section></AppShell>;

  const {data:myProfile}=membership?.id?await ctx.supabase.from("worship_member_profiles").select("communication_opt_in,communication_preference").eq("membership_id",membership.id).maybeSingle():{data:null as any};
  const {data:schedules}=await ctx.supabase.from("worship_schedules").select("id,title,starts_at,call_time,group_code,location,status,publication_state").gte("starts_at",new Date().toISOString()).neq("status","cancelled").order("starts_at").limit(20);
  const selectedId=qs.schedule||(schedules??[])[0]?.id;
  const selected=(schedules??[]).find((s:any)=>s.id===selectedId);
  let assignments:any[]=[];let setlist:any[]=[];let rehearsal:any=null;let directory:any[]=[];let profiles:any[]=[];
  if(canLead&&selected){
    const [a,b,c,d,e]=await Promise.all([
      ctx.supabase.from("worship_schedule_members").select("id,membership_id,role").eq("schedule_id",selected.id),
      ctx.supabase.from("worship_schedule_songs").select("song_id,position,key_override,worship_songs(title,default_key,recommended_key)").eq("schedule_id",selected.id).order("position"),
      ctx.supabase.from("worship_rehearsals").select("starts_at,location").eq("schedule_id",selected.id).maybeSingle(),
      ctx.supabase.rpc("worship_member_directory"),
      ctx.supabase.from("worship_member_profiles").select("membership_id,communication_opt_in,communication_preference"),
    ]);
    assignments=a.data??[];setlist=b.data??[];rehearsal=c.data;directory=d.data??[];profiles=e.data??[];
  }
  const personByMembership=new Map(directory.map((p:any)=>[p.membership_id,p]));
  const profileByMembership=new Map(profiles.map((p:any)=>[p.membership_id,p]));
  const h=await headers();
  const protocol=h.get("x-forwarded-proto")||"https";
  const host=h.get("x-forwarded-host")||h.get("host")||"reviver-platform.iltieresilvas.workers.dev";
  const portalUrl=protocol+"://"+host+"/worship"+(selected?"#schedule-"+selected.id:"");
  const officialPublished=selected?.publication_state==="published";
  const communicationRows=assignments.map((a:any)=>{
    const person=personByMembership.get(a.membership_id) as any;
    const pref=profileByMembership.get(a.membership_id) as any;
    const phone=waPhone(person?.phone);
    const whatsappAllowed=Boolean(pref?.communication_opt_in)&&pref?.communication_preference==="WhatsApp"&&Boolean(phone);
    const emailAllowed=Boolean(pref?.communication_opt_in)&&pref?.communication_preference==="Email"&&Boolean(person?.email);
    const eligible=whatsappAllowed||emailAllowed;
    const channelStatus=whatsappAllowed
      ?"WhatsApp autorizado"
      :emailAllowed
        ?"Email autorizado"
        :!pref?.communication_opt_in
          ?"sem autorização de notificações"
          :pref?.communication_preference==="WhatsApp"&&!phone
            ?"telefone indisponível"
            :pref?.communication_preference==="Email"&&!person?.email
              ?"email indisponível"
              :"canal não configurado";
    return {assignment:a,person,pref,phone,whatsappAllowed,emailAllowed,eligible,channelStatus};
  });
  const eligibleCount=communicationRows.filter((row:any)=>row.eligible).length;
  const blockedCount=communicationRows.length-eligibleCount;
  const whatsappCount=communicationRows.filter((row:any)=>row.whatsappAllowed).length;
  const emailCount=communicationRows.filter((row:any)=>row.emailAllowed).length;

  return <AppShell title="Comunicação do Louvor" active="/worship" email={ctx.email}>
    {qs.message&&<div className="notice" style={{marginBottom:16}}>{qs.message}</div>}
    <div className="button-row" style={{marginBottom:18}}><Link className="button" href="/worship">← Louvor</Link></div>
    <section className="hero-card"><p className="eyebrow">COMUNICAÇÃO</p><h2>WhatsApp com consentimento explícito.</h2><p>A integração oficial ainda não está configurada. Esta área prepara a mensagem e abre a conversa; isso não significa que a mensagem foi enviada.</p></section>

    <div className="grid grid-2" style={{marginTop:18}}>
      <form action={saveMyWorshipCommunicationPreference} className="card form-grid">
        <p className="eyebrow">MINHAS PREFERÊNCIAS</p>
        <label className="button-row"><input type="checkbox" name="communicationOptIn" value="true" defaultChecked={Boolean(myProfile?.communication_opt_in)}/> Autorizo notificações do Ministério de Louvor</label>
        <div className="field"><label>Canal preferido</label><select name="communicationPreference" defaultValue={myProfile?.communication_preference??""}><option value="">Sem preferência</option><option value="WhatsApp">WhatsApp</option><option value="Email">Email</option></select></div>
        <SubmitButton className="button" pendingText="A guardar…">Guardar preferências</SubmitButton>
      </form>
      <article className="card"><p className="eyebrow">ESTADO DA INTEGRAÇÃO</p><h3>Modo manual ativo</h3><p className="muted">API oficial do WhatsApp Business: pendente de credenciais e modelos aprovados. Nenhum estado “enviado”, “entregue” ou “lido” é inventado neste modo.</p></article>
    </div>

    {canLead&&<>
      <div className="section-title"><div><p className="eyebrow">PARTILHAR ESCALA</p><h2>Mensagens individuais</h2></div></div>
      <form method="get" className="card form-grid"><div className="field"><label>Culto</label><select name="schedule" defaultValue={selectedId}>{(schedules??[]).map((s:any)=><option key={s.id} value={s.id}>{s.title} · {new Date(s.starts_at).toLocaleString("pt-PT")}</option>)}</select></div><div className="button-row"><button className="button">Carregar escala</button>{selected&&<a className="button" href={"/api/worship/schedule-card/"+selected.id} target="_blank" rel="noreferrer">Abrir imagem da escala</a>}{selected&&<a className="button" href={"/api/worship/schedule-card/"+selected.id+"?download=1"}>Baixar card</a>}{selected&&<Link className="button" href={"/worship/run-sheet/"+selected.id}>Abrir roteiro</Link>}</div></form>
      {selected&&<>
        <div className="grid grid-4" style={{marginTop:16}}>
          <article className="card metric"><span>Escalados</span><strong>{communicationRows.length}</strong></article>
          <article className="card metric"><span>Elegíveis</span><strong>{eligibleCount}</strong></article>
          <article className="card metric"><span>WhatsApp</span><strong>{whatsappCount}</strong></article>
          <article className="card metric"><span>Bloqueados</span><strong>{blockedCount}</strong></article>
        </div>
        <div className={officialPublished?"notice":"notice warn"} style={{marginTop:16}}>
          {officialPublished
            ?"Escala publicada. Os botões de envio manual estão liberados para os membros elegíveis."
            :"Esta escala ainda não foi publicada. Pode rever e copiar as mensagens, mas o envio fica bloqueado até à publicação oficial."}
          {!officialPublished&&<span> <Link href="/worship">Voltar a Configurar escala →</Link></span>}
        </div>
        <div className="muted small" style={{marginTop:8}}>{emailCount} membro{emailCount===1?"":"s"} com email autorizado.</div>
        <div className="list" style={{marginTop:16}}>{communicationRows.length===0?<div className="empty">Nenhum participante escalado.</div>:communicationRows.map((row:any)=>{ const a=row.assignment;
        const {person,phone,whatsappAllowed,emailAllowed,eligible,channelStatus}=row;
        const songs=setlist.map((x:any)=>{const song=x.worship_songs as any;return (song?.title??"Música")+" ("+(x.key_override||song?.recommended_key||song?.default_key||"tom a definir")+")"}).join("; ");
        const message=[
          "Olá, "+(person?.display_name||"")+"!",
          "Escala Reviver — "+selected.title,
          "Data: "+new Date(selected.starts_at).toLocaleString("pt-PT"),
          selected.group_code?"Grupo: "+selected.group_code:"",
          "Função: "+roleLabel(a.role),
          selected.call_time?"Chegada: "+new Date(selected.call_time).toLocaleString("pt-PT"):"",
          rehearsal?.starts_at?"Ensaio: "+new Date(rehearsal.starts_at).toLocaleString("pt-PT")+(rehearsal.location?" · "+rehearsal.location:""):"",
          songs?"Repertório: "+songs:"",
          "Consultar e confirmar: "+portalUrl
        ].filter(Boolean).join("\n");
        const whatsappHref=phone?"https://wa.me/"+phone+"?text="+encodeURIComponent(message):"";
        const emailHref=emailAllowed?"mailto:"+encodeURIComponent(person.email)+"?subject="+encodeURIComponent("Escala Reviver — "+selected.title)+"&body="+encodeURIComponent(message):"";
        return <article className="card" key={a.id}><div className="list-row" style={{padding:0,border:0,background:"transparent"}}><div><h3>{person?.display_name||person?.email||"Membro"}</h3><p className="muted">{roleLabel(a.role)} · {channelStatus}</p></div>{eligible?<div className="button-row"><CopyTextButton text={message} label="Copiar mensagem"/><CopyTextButton text={portalUrl} label="Copiar link"/>{officialPublished&&whatsappAllowed&&<a className="button primary" href={whatsappHref} target="_blank" rel="noreferrer">Abrir WhatsApp</a>}{officialPublished&&emailAllowed&&<a className="button primary" href={emailHref}>Abrir email</a>}{!officialPublished&&<span className="pill gold">aguarda publicação</span>}</div>:<span className="pill">não elegível</span>}</div>{eligible&&<details style={{marginTop:10}}><summary style={{cursor:"pointer"}}>Pré-visualizar mensagem</summary><pre style={{whiteSpace:"pre-wrap",fontFamily:"inherit"}}>{message}</pre><p className="muted small">Abrir o canal não confirma envio.</p></details>}</article>
      })}</div>
      </>}
    </>}
  </AppShell>;
}
