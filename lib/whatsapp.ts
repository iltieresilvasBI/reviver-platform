import {createHash,createHmac,timingSafeEqual} from "node:crypto";
import {createAdminClient} from "@/lib/supabase/admin";

export type WhatsAppConfigStatus={
  configured:boolean;
  webhookConfigured:boolean;
  missing:string[];
};

const PROD_URL="https://reviver-platform.iltieresilvas.workers.dev";

function env(name:string){
  return String(process.env[name]??"").trim();
}

export function getWhatsAppConfigStatus():WhatsAppConfigStatus{
  const sendRequired=[
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "WHATSAPP_GRAPH_VERSION",
    "WHATSAPP_PHONE_NUMBER_ID",
    "WHATSAPP_ACCESS_TOKEN",
    "WHATSAPP_TEMPLATE_SCHEDULE_PUBLISHED",
    "WHATSAPP_TEMPLATE_SUBSTITUTION_REQUEST"
  ];
  const webhookRequired=[
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
    "WHATSAPP_APP_SECRET"
  ];
  const missing=Array.from(new Set([...sendRequired,...webhookRequired].filter(name=>!env(name))));
  return {
    configured:sendRequired.every(name=>Boolean(env(name))),
    webhookConfigured:webhookRequired.every(name=>Boolean(env(name))),
    missing
  };
}

export function normalizeWhatsAppPhone(value:string|null|undefined){
  const digits=String(value??"").replace(/\D/g,"");
  return /^[0-9]{8,15}$/.test(digits)?digits:"";
}

function portalBaseUrl(){
  return env("NEXT_PUBLIC_SITE_URL")||PROD_URL;
}

function templateLanguage(){
  return env("WHATSAPP_TEMPLATE_LANGUAGE")||"pt_PT";
}

function textParam(text:string){
  return {type:"text",text:String(text).slice(0,1024)};
}

function quickReply(index:number,payload:string){
  return {
    type:"button",
    sub_type:"quick_reply",
    index:String(index),
    parameters:[{type:"payload",payload}]
  };
}

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
  return map[value??""]??value??"Função";
}

function formatDate(value:string){
  return new Intl.DateTimeFormat("pt-PT",{
    dateStyle:"full",
    timeStyle:"short",
    timeZone:"Europe/Lisbon"
  }).format(new Date(value));
}

export async function queueScheduleWhatsApp(scheduleId:string,createdBy:string){
  const status=getWhatsAppConfigStatus();
  if(!status.configured) return {queued:0,skipped:0,configured:false};

  const admin=createAdminClient();
  const {data:schedule,error:scheduleError}=await admin
    .from("worship_schedules")
    .select("id,title,starts_at,publication_state,status")
    .eq("id",scheduleId)
    .maybeSingle();
  if(scheduleError||!schedule) throw new Error(scheduleError?.message??"Escala não encontrada.");
  if(schedule.publication_state!=="published") throw new Error("A escala precisa estar publicada antes do envio.");

  const {data:assignments,error:assignmentError}=await admin
    .from("worship_schedule_members")
    .select("id,membership_id,role")
    .eq("schedule_id",scheduleId);
  if(assignmentError) throw new Error(assignmentError.message);

  const membershipIds=(assignments??[]).map((x:any)=>x.membership_id);
  if(!membershipIds.length) return {queued:0,skipped:0,configured:true};

  const [{data:memberships,error:membershipError},{data:preferences,error:prefError}]=await Promise.all([
    admin.from("network_memberships").select("id,user_id,status").in("id",membershipIds),
    admin.from("worship_member_profiles").select("membership_id,communication_opt_in,communication_preference").in("membership_id",membershipIds),
  ]);
  if(membershipError||prefError) throw new Error(membershipError?.message??prefError?.message??"Não foi possível carregar os membros.");

  const userIds=(memberships??[]).map((x:any)=>x.user_id);
  const {data:profiles,error:profileError}=await admin
    .from("profiles")
    .select("id,display_name,phone")
    .in("id",userIds);
  if(profileError) throw new Error(profileError.message);

  const membershipById=new Map((memberships??[]).map((x:any)=>[x.id,x]));
  const prefByMembership=new Map((preferences??[]).map((x:any)=>[x.membership_id,x]));
  const profileByUser=new Map((profiles??[]).map((x:any)=>[x.id,x]));
  const rows:any[]=[];
  let skipped=0;
  const templateName=env("WHATSAPP_TEMPLATE_SCHEDULE_PUBLISHED");
  const language=templateLanguage();
  const link=portalBaseUrl()+"/worship";

  for(const assignment of assignments??[]){
    const membership=membershipById.get(assignment.membership_id) as any;
    const pref=prefByMembership.get(assignment.membership_id) as any;
    const profile=membership?profileByUser.get(membership.user_id) as any:null;
    const phone=normalizeWhatsAppPhone(profile?.phone);
    const allowed=membership?.status==="active"
      && Boolean(pref?.communication_opt_in)
      && pref?.communication_preference==="WhatsApp"
      && Boolean(phone);
    if(!allowed){skipped++;continue;}

    rows.push({
      kind:"schedule_published",
      status:"queued",
      recipient_membership_id:assignment.membership_id,
      schedule_id:schedule.id,
      assignment_id:assignment.id,
      phone_e164:phone,
      recipient_name:profile?.display_name??null,
      template_name:templateName,
      template_language:language,
      template_components:[
        {
          type:"body",
          parameters:[
            textParam(profile?.display_name||""),
            textParam(schedule.title),
            textParam(formatDate(schedule.starts_at)),
            textParam(roleLabel(assignment.role)),
            textParam(link)
          ]
        },
        quickReply(0,"schedule_confirm:"+assignment.id),
        quickReply(1,"schedule_decline:"+assignment.id)
      ],
      dedupe_key:"schedule_published:"+schedule.id+":"+assignment.membership_id,
      created_by:createdBy
    });
  }

  if(rows.length){
    const {error}=await admin
      .from("worship_whatsapp_messages")
      .upsert(rows,{onConflict:"dedupe_key",ignoreDuplicates:true});
    if(error) throw new Error(error.message);
  }
  return {queued:rows.length,skipped,configured:true};
}

export async function queueSubstitutionWhatsApp(requestId:string){
  const status=getWhatsAppConfigStatus();
  if(!status.configured) return {queued:0,skipped:0,configured:false};

  const admin=createAdminClient();
  const {data:request,error:reqError}=await admin
    .from("worship_substitution_requests")
    .select("id,assignment_id,status")
    .eq("id",requestId)
    .maybeSingle();
  if(reqError||!request) throw new Error(reqError?.message??"Pedido não encontrado.");

  const {data:assignment,error:assignmentError}=await admin
    .from("worship_schedule_members")
    .select("id,schedule_id,role")
    .eq("id",request.assignment_id)
    .maybeSingle();
  if(assignmentError||!assignment) throw new Error(assignmentError?.message??"Escala não encontrada.");

  const [{data:schedule,error:scheduleError},{data:offers,error:offerError}]=await Promise.all([
    admin.from("worship_schedules").select("id,title,starts_at,status").eq("id",assignment.schedule_id).maybeSingle(),
    admin.from("worship_substitution_offers").select("id,proposed_membership_id,priority,status").eq("request_id",requestId).eq("status","pending").order("priority"),
  ]);
  if(scheduleError||offerError||!schedule) throw new Error(scheduleError?.message??offerError?.message??"Dados da substituição indisponíveis.");

  const membershipIds=(offers??[]).map((x:any)=>x.proposed_membership_id);
  if(!membershipIds.length) return {queued:0,skipped:0,configured:true};

  const [{data:memberships,error:membershipError},{data:preferences,error:prefError}]=await Promise.all([
    admin.from("network_memberships").select("id,user_id,status").in("id",membershipIds),
    admin.from("worship_member_profiles").select("membership_id,communication_opt_in,communication_preference").in("membership_id",membershipIds),
  ]);
  if(membershipError||prefError) throw new Error(membershipError?.message??prefError?.message??"Não foi possível carregar os backups.");

  const userIds=(memberships??[]).map((x:any)=>x.user_id);
  const {data:profiles,error:profileError}=await admin.from("profiles").select("id,display_name,phone").in("id",userIds);
  if(profileError) throw new Error(profileError.message);

  const membershipById=new Map((memberships??[]).map((x:any)=>[x.id,x]));
  const prefByMembership=new Map((preferences??[]).map((x:any)=>[x.membership_id,x]));
  const profileByUser=new Map((profiles??[]).map((x:any)=>[x.id,x]));
  const rows:any[]=[];
  let skipped=0;
  const templateName=env("WHATSAPP_TEMPLATE_SUBSTITUTION_REQUEST");
  const language=templateLanguage();
  const link=portalBaseUrl()+"/worship/substitutions";

  for(const offer of offers??[]){
    const membership=membershipById.get(offer.proposed_membership_id) as any;
    const pref=prefByMembership.get(offer.proposed_membership_id) as any;
    const profile=membership?profileByUser.get(membership.user_id) as any:null;
    const phone=normalizeWhatsAppPhone(profile?.phone);
    const allowed=membership?.status==="active"
      && Boolean(pref?.communication_opt_in)
      && pref?.communication_preference==="WhatsApp"
      && Boolean(phone);
    if(!allowed){skipped++;continue;}

    rows.push({
      kind:"substitution_request",
      status:"queued",
      recipient_membership_id:offer.proposed_membership_id,
      schedule_id:schedule.id,
      assignment_id:assignment.id,
      substitution_request_id:requestId,
      substitution_offer_id:offer.id,
      phone_e164:phone,
      recipient_name:profile?.display_name??null,
      template_name:templateName,
      template_language:language,
      template_components:[
        {
          type:"body",
          parameters:[
            textParam(profile?.display_name||""),
            textParam(schedule.title),
            textParam(formatDate(schedule.starts_at)),
            textParam(roleLabel(assignment.role)),
            textParam(link)
          ]
        },
        quickReply(0,"sub_accept:"+offer.id),
        quickReply(1,"sub_decline:"+offer.id)
      ],
      dedupe_key:"substitution_request:"+requestId+":"+offer.id,
      created_by:null
    });
  }

  if(rows.length){
    const {error}=await admin
      .from("worship_whatsapp_messages")
      .upsert(rows,{onConflict:"dedupe_key",ignoreDuplicates:true});
    if(error) throw new Error(error.message);
  }
  return {queued:rows.length,skipped,configured:true};
}

export async function processWhatsAppOutbox(limit=20){
  const config=getWhatsAppConfigStatus();
  if(!config.configured) return {processed:0,sent:0,failed:0,configured:false};

  const admin=createAdminClient();
  const {data:messages,error}=await admin
    .from("worship_whatsapp_messages")
    .select("*")
    .eq("status","queued")
    .lt("attempts",5)
    .order("queued_at")
    .limit(Math.max(1,Math.min(50,limit)));
  if(error) throw new Error(error.message);

  let sent=0;
  let failed=0;
  const graphVersion=env("WHATSAPP_GRAPH_VERSION");
  const phoneNumberId=env("WHATSAPP_PHONE_NUMBER_ID");
  const token=env("WHATSAPP_ACCESS_TOKEN");

  for(const message of messages??[]){
    const now=new Date().toISOString();
    await admin.from("worship_whatsapp_messages").update({
      status:"sending",
      attempts:Number(message.attempts??0)+1,
      last_attempt_at:now,
      error_code:null,
      error_message:null,
      updated_at:now
    }).eq("id",message.id);

    try{
      const response=await fetch(
        "https://graph.facebook.com/"+encodeURIComponent(graphVersion)+"/"+encodeURIComponent(phoneNumberId)+"/messages",
        {
          method:"POST",
          headers:{
            "authorization":"Bearer "+token,
            "content-type":"application/json"
          },
          body:JSON.stringify({
            messaging_product:"whatsapp",
            recipient_type:"individual",
            to:message.phone_e164,
            type:"template",
            template:{
              name:message.template_name,
              language:{code:message.template_language},
              components:message.template_components
            }
          })
        }
      );
      const body=await response.json().catch(()=>({})) as any;
      if(!response.ok){
        const code=String(body?.error?.code??response.status);
        const detail=String(body?.error?.message??"WhatsApp API request failed.").slice(0,1000);
        await admin.from("worship_whatsapp_messages").update({
          status:"failed",
          error_code:code,
          error_message:detail,
          failed_at:new Date().toISOString(),
          updated_at:new Date().toISOString()
        }).eq("id",message.id);
        failed++;
        continue;
      }

      const messageId=String(body?.messages?.[0]?.id??"").trim();
      await admin.from("worship_whatsapp_messages").update({
        status:"sent",
        meta_message_id:messageId||null,
        sent_at:new Date().toISOString(),
        failed_at:null,
        updated_at:new Date().toISOString()
      }).eq("id",message.id);
      sent++;
    }catch(error){
      await admin.from("worship_whatsapp_messages").update({
        status:"failed",
        error_code:"transport_error",
        error_message:String(error instanceof Error?error.message:error).slice(0,1000),
        failed_at:new Date().toISOString(),
        updated_at:new Date().toISOString()
      }).eq("id",message.id);
      failed++;
    }
  }
  return {processed:(messages??[]).length,sent,failed,configured:true};
}

export function verifyWhatsAppWebhookSignature(rawBody:string,signature:string|null){
  const secret=env("WHATSAPP_APP_SECRET");
  if(!secret||!signature?.startsWith("sha256=")) return false;
  const expected="sha256="+createHmac("sha256",secret).update(rawBody).digest("hex");
  const a=Buffer.from(expected);
  const b=Buffer.from(signature);
  return a.length===b.length&&timingSafeEqual(a,b);
}

export function whatsappWebhookEventHash(value:string){
  return createHash("sha256").update(value).digest("hex");
}

export function getWhatsAppWebhookVerifyToken(){
  return env("WHATSAPP_WEBHOOK_VERIFY_TOKEN");
}

export async function retryWhatsAppMessage(messageId:string){
  const admin=createAdminClient();
  const {error}=await admin.from("worship_whatsapp_messages").update({
    status:"queued",
    error_code:null,
    error_message:null,
    failed_at:null,
    queued_at:new Date().toISOString(),
    updated_at:new Date().toISOString()
  }).eq("id",messageId).eq("status","failed");
  if(error) throw new Error(error.message);
  return processWhatsAppOutbox(1);
}
