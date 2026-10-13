import Link from "next/link";
import {AppShell} from "@/components/app-shell";
import {getAccessContext} from "@/lib/auth";
import {getWhatsAppConfigStatus} from "@/lib/whatsapp";

const webhookUrl="https://reviver-platform.iltieresilvas.workers.dev/api/integrations/whatsapp/webhook";

export default async function WhatsAppAdminPage(){
  const ctx=await getAccessContext();
  if(!ctx.isAdmin){
    return <AppShell title="WhatsApp Business" active="/admin" email={ctx.email}>
      <section className="hero-card"><p className="eyebrow">ACESSO RESTRITO</p><h2>Administração global</h2><p>Esta área exige o papel Admin.</p></section>
    </AppShell>;
  }

  const config=getWhatsAppConfigStatus();
  const rows=[
    ["Cloud API para envios",config.configured],
    ["Webhook Meta",config.webhookConfigured],
    ["Templates de escala e substituição",!config.missing.includes("WHATSAPP_TEMPLATE_SCHEDULE_PUBLISHED")&&!config.missing.includes("WHATSAPP_TEMPLATE_SUBSTITUTION_REQUEST")],
    ["Phone Number ID",!config.missing.includes("WHATSAPP_PHONE_NUMBER_ID")],
    ["Access Token",!config.missing.includes("WHATSAPP_ACCESS_TOKEN")],
    ["App Secret",!config.missing.includes("WHATSAPP_APP_SECRET")],
  ] as const;

  return <AppShell title="WhatsApp Business" active="/admin" email={ctx.email}>
    <div className="button-row" style={{marginBottom:18}}>
      <Link className="button" href="/admin">← Administração</Link>
      <Link className="button" href="/worship/share">Comunicação do Louvor</Link>
    </div>

    <section className="hero-card">
      <p className="eyebrow">META · WHATSAPP BUSINESS PLATFORM</p>
      <h2>{config.configured&&config.webhookConfigured?"Integração pronta para uso.":"Infraestrutura pronta; faltam dados da Meta."}</h2>
      <p>O portal já contém fila, logs, webhook, estados de entrega, confirmações e substituições. Esta página mostra apenas a prontidão da configuração, nunca os valores dos secrets.</p>
    </section>

    <div className="grid grid-3" style={{marginTop:18}}>
      <article className="card metric"><span>Envio</span><strong>{config.configured?"Pronto":"Pendente"}</strong></article>
      <article className="card metric"><span>Webhook</span><strong>{config.webhookConfigured?"Pronto":"Pendente"}</strong></article>
      <article className="card metric"><span>Pendências</span><strong>{config.missing.length}</strong></article>
    </div>

    <div className="section-title"><div><p className="eyebrow">CHECKLIST</p><h2>Configuração técnica</h2></div></div>
    <div className="list">
      {rows.map(([label,ok])=><div className="list-row" key={label}><div><strong>{label}</strong></div><span className={ok?"pill ok":"pill gold"}>{ok?"OK":"PENDENTE"}</span></div>)}
    </div>

    {config.missing.length>0&&<article className="card" style={{marginTop:18}}>
      <p className="eyebrow">SECRETS EM FALTA</p>
      <p className="muted small">Configure estes nomes no ambiente do Cloudflare. Os valores reais não devem ser guardados no GitHub.</p>
      <div className="button-row">{config.missing.map(name=><code className="pill" key={name}>{name}</code>)}</div>
    </article>}

    <div className="grid grid-2" style={{marginTop:18}}>
      <article className="card">
        <p className="eyebrow">WEBHOOK</p>
        <h3>URL de callback</h3>
        <code style={{wordBreak:"break-all"}}>{webhookUrl}</code>
        <p className="muted small" style={{marginTop:12}}>Na Meta, use exatamente esta URL e o mesmo valor configurado em <code>WHATSAPP_WEBHOOK_VERIFY_TOKEN</code>.</p>
      </article>

      <article className="card">
        <p className="eyebrow">TEMPLATES</p>
        <h3>Dois templates necessários</h3>
        <p className="muted small">Escala publicada: nome, culto, data/hora, função e link; botões Confirmar / Não posso.</p>
        <p className="muted small">Substituição: nome do backup, culto, data/hora, função e link; botões Posso substituir / Não posso.</p>
      </article>
    </div>

    <article className="card" style={{marginTop:18}}>
      <p className="eyebrow">GRUPO DO LOUVOR</p>
      <h3>O grupo normal continua com partilha manual.</h3>
      <p className="muted">A Meta tem uma Groups API separada para contas elegíveis e grupos próprios com limites específicos. Ela não transforma automaticamente o grupo normal atual do ministério num destino programático. Para o grupo existente, o portal mantém o botão de partilha manual.</p>
    </article>
  </AppShell>;
}
