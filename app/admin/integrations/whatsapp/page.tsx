import Link from "next/link";
import {AppShell} from "@/components/app-shell";
import {getAccessContext} from "@/lib/auth";
import {getWhatsAppConfigStatus} from "@/lib/whatsapp";

export default async function WhatsAppIntegrationAdminPage(){
  const ctx=await getAccessContext();
  if(!ctx.isAdmin){
    return <AppShell title="WhatsApp" active="/admin" email={ctx.email}>
      <section className="hero-card"><p className="eyebrow">ACESSO RESTRITO</p><h2>Administração global</h2><p>Esta área exige o papel Admin.</p></section>
    </AppShell>;
  }

  const config=getWhatsAppConfigStatus();
  const webhookUrl="https://reviver-platform.iltieresilvas.workers.dev/api/integrations/whatsapp/webhook";

  const [
    {count:queued},
    {count:sent},
    {count:delivered},
    {count:read},
    {count:failed},
    {count:events},
    {data:recent}
  ]=await Promise.all([
    ctx.supabase.from("worship_whatsapp_messages").select("id",{count:"exact",head:true}).eq("status","queued"),
    ctx.supabase.from("worship_whatsapp_messages").select("id",{count:"exact",head:true}).eq("status","sent"),
    ctx.supabase.from("worship_whatsapp_messages").select("id",{count:"exact",head:true}).eq("status","delivered"),
    ctx.supabase.from("worship_whatsapp_messages").select("id",{count:"exact",head:true}).eq("status","read"),
    ctx.supabase.from("worship_whatsapp_messages").select("id",{count:"exact",head:true}).eq("status","failed"),
    ctx.supabase.from("worship_whatsapp_events").select("id",{count:"exact",head:true}),
    ctx.supabase.from("worship_whatsapp_messages")
      .select("id,recipient_name,kind,status,error_message,created_at")
      .order("created_at",{ascending:false})
      .limit(20)
  ]);

  const ready=config.configured&&config.webhookConfigured;

  return <AppShell title="Integração WhatsApp" active="/admin" email={ctx.email}>
    <div className="button-row" style={{marginBottom:18}}>
      <Link className="button" href="/admin">← Administração</Link>
      <Link className="button" href="/worship/share">Comunicação do Louvor</Link>
    </div>

    <section className="hero-card">
      <p className="eyebrow">META · WHATSAPP BUSINESS CLOUD API</p>
      <h2>{ready?"Integração pronta para uso.":"Infraestrutura pronta; ativação Meta pendente."}</h2>
      <p>O portal já possui fila, webhook, estados de entrega, confirmações e substituições automáticas. Esta página não mostra tokens nem secrets.</p>
    </section>

    <div className="grid grid-3" style={{marginTop:18}}>
      <article className="card metric"><span>Envio</span><strong>{config.configured?"pronto":"pendente"}</strong></article>
      <article className="card metric"><span>Webhook</span><strong>{config.webhookConfigured?"pronto":"pendente"}</strong></article>
      <article className="card metric"><span>Eventos recebidos</span><strong>{events??0}</strong></article>
    </div>

    <div className="grid grid-2" style={{marginTop:18}}>
      <article className="card">
        <p className="eyebrow">CONFIGURAÇÃO</p>
        <h3>Estado seguro</h3>
        <p className="muted small">Webhook de produção:</p>
        <code style={{wordBreak:"break-all"}}>{webhookUrl}</code>
        <div style={{marginTop:16}}>
          {config.missing.length===0
            ?<div className="notice">Todos os parâmetros necessários foram encontrados.</div>
            :<div className="notice warn">
              <strong>{config.missing.length} configuração{config.missing.length===1?"":"ões"} pendente{config.missing.length===1?"":"s"}.</strong>
              <div className="muted small" style={{marginTop:8}}>Apenas os nomes são mostrados; valores secretos nunca aparecem nesta página.</div>
              <ul>{config.missing.map(name=><li key={name}><code>{name}</code></li>)}</ul>
            </div>}
        </div>
      </article>

      <article className="card">
        <p className="eyebrow">FLUXOS ATIVOS</p>
        <h3>O que a integração faz</h3>
        <ul>
          <li>Enviar escala publicada individualmente aos participantes autorizados.</li>
          <li>Receber Confirmar / Não posso pelo WhatsApp.</li>
          <li>Acionar backups automaticamente em pedidos de substituição.</li>
          <li>Trocar o membro da escala quando o primeiro backup aceita.</li>
          <li>Registar enviado, entregue, lido e falhou.</li>
          <li>Permitir retry de mensagens falhadas.</li>
        </ul>
        <p className="muted small">Grupos normais do WhatsApp permanecem em partilha manual; a Cloud API é usada para mensagens 1:1.</p>
      </article>
    </div>

    <div className="section-title"><div><p className="eyebrow">MENSAGENS</p><h2>Estado operacional</h2></div></div>
    <div className="grid grid-5">
      <article className="card metric"><span>Na fila</span><strong>{queued??0}</strong></article>
      <article className="card metric"><span>Enviadas</span><strong>{sent??0}</strong></article>
      <article className="card metric"><span>Entregues</span><strong>{delivered??0}</strong></article>
      <article className="card metric"><span>Lidas</span><strong>{read??0}</strong></article>
      <article className="card metric"><span>Falharam</span><strong>{failed??0}</strong></article>
    </div>

    <div className="section-title"><div><p className="eyebrow">HISTÓRICO</p><h2>Últimas mensagens</h2></div></div>
    <div className="list">
      {(recent??[]).length===0
        ?<div className="empty">Ainda não existem mensagens oficiais processadas.</div>
        :(recent??[]).map((item:any)=><div className="list-row" key={item.id}>
          <div>
            <strong>{item.recipient_name||"Destinatário"}</strong>
            <div className="muted small">{item.kind} · {new Date(item.created_at).toLocaleString("pt-PT")}</div>
            {item.error_message&&<div className="muted small">{item.error_message}</div>}
          </div>
          <span className={item.status==="read"||item.status==="delivered"?"pill ok":item.status==="failed"?"pill":"pill gold"}>{item.status}</span>
        </div>)}
    </div>
  </AppShell>;
}
