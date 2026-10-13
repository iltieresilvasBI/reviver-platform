import {createAdminClient} from "@/lib/supabase/admin";
import {
  getWhatsAppConfigStatus,
  getWhatsAppWebhookVerifyToken,
  verifyWhatsAppWebhookSignature,
  whatsappWebhookEventHash
} from "@/lib/whatsapp";

const rank:Record<string,number>={queued:0,sending:1,sent:2,delivered:3,read:4,failed:5};

function normalizeAction(message:any){
  return String(
    message?.button?.payload
    ??message?.interactive?.button_reply?.id
    ??""
  ).trim();
}

async function recordEvent(input:{
  eventHash:string;
  eventType:"status"|"message"|"verification"|"unknown";
  metaMessageId?:string|null;
  contextMessageId?:string|null;
  senderPhone?:string|null;
  action?:string|null;
  processingStatus:"received"|"processed"|"ignored"|"failed";
  errorMessage?:string|null;
}){
  const admin=createAdminClient();
  await admin.from("worship_whatsapp_events").upsert({
    event_hash:input.eventHash,
    event_type:input.eventType,
    meta_message_id:input.metaMessageId??null,
    context_message_id:input.contextMessageId??null,
    sender_phone:input.senderPhone??null,
    action:input.action??null,
    processing_status:input.processingStatus,
    error_message:input.errorMessage??null,
    processed_at:input.processingStatus==="received"?null:new Date().toISOString()
  },{onConflict:"event_hash",ignoreDuplicates:true});
}

async function applyStatus(status:any,rawHash:string,index:number){
  const admin=createAdminClient();
  const messageId=String(status?.id??"").trim();
  const incoming=String(status?.status??"").trim();
  if(!messageId||!["sent","delivered","read","failed"].includes(incoming)) return;

  const eventHash=whatsappWebhookEventHash(rawHash+":status:"+index+":"+messageId+":"+incoming);
  const {data:row}=await admin.from("worship_whatsapp_messages")
    .select("id,status")
    .eq("meta_message_id",messageId)
    .maybeSingle();

  if(!row){
    await recordEvent({
      eventHash,eventType:"status",metaMessageId:messageId,
      processingStatus:"ignored",errorMessage:"Unknown Meta message id."
    });
    return;
  }

  const current=String(row.status??"queued");
  if(incoming!=="failed"&&(rank[incoming]??0)<(rank[current]??0)){
    await recordEvent({
      eventHash,eventType:"status",metaMessageId:messageId,
      processingStatus:"ignored",errorMessage:"Out-of-order status ignored."
    });
    return;
  }

  const now=new Date().toISOString();
  const patch:any={status:incoming,updated_at:now};
  if(incoming==="sent") patch.sent_at=now;
  if(incoming==="delivered") patch.delivered_at=now;
  if(incoming==="read") patch.read_at=now;
  if(incoming==="failed"){
    patch.failed_at=now;
    patch.error_code=String(status?.errors?.[0]?.code??"meta_failed");
    patch.error_message=String(status?.errors?.[0]?.title??status?.errors?.[0]?.message??"WhatsApp delivery failed.").slice(0,1000);
  }
  await admin.from("worship_whatsapp_messages").update(patch).eq("id",row.id);
  await recordEvent({
    eventHash,eventType:"status",metaMessageId:messageId,processingStatus:"processed"
  });
}

async function applyInbound(message:any,rawHash:string,index:number){
  const admin=createAdminClient();
  const metaMessageId=String(message?.id??"").trim();
  const contextMessageId=String(message?.context?.id??"").trim()||null;
  const senderPhone=String(message?.from??"").replace(/\D/g,"");
  const action=normalizeAction(message);
  const eventHash=whatsappWebhookEventHash(rawHash+":message:"+index+":"+metaMessageId+":"+action);

  if(!action){
    await recordEvent({
      eventHash,eventType:"message",metaMessageId,contextMessageId,senderPhone,
      processingStatus:"ignored",errorMessage:"Message has no supported action payload."
    });
    return;
  }

  try{
    if(action.startsWith("schedule_confirm:")||action.startsWith("schedule_decline:")){
      const assignmentId=action.split(":")[1];
      const response=action.startsWith("schedule_confirm:")?"confirmed":"declined";
      const {error}=await admin.rpc("respond_worship_assignment_system",{
        p_assignment_id:assignmentId,
        p_response:response,
        p_sender_phone:senderPhone
      });
      if(error) throw new Error(error.message);
      await recordEvent({
        eventHash,eventType:"message",metaMessageId,contextMessageId,senderPhone,action,
        processingStatus:"processed"
      });
      return;
    }

    if(action.startsWith("sub_accept:")||action.startsWith("sub_decline:")){
      const offerId=action.split(":")[1];
      const decision=action.startsWith("sub_accept:")?"accept":"decline";
      const {error}=await admin.rpc("resolve_worship_substitution_offer_system",{
        p_offer_id:offerId,
        p_decision:decision,
        p_sender_phone:senderPhone
      });
      if(error) throw new Error(error.message);
      await recordEvent({
        eventHash,eventType:"message",metaMessageId,contextMessageId,senderPhone,action,
        processingStatus:"processed"
      });
      return;
    }

    await recordEvent({
      eventHash,eventType:"message",metaMessageId,contextMessageId,senderPhone,action,
      processingStatus:"ignored",errorMessage:"Unsupported action payload."
    });
  }catch(error){
    await recordEvent({
      eventHash,eventType:"message",metaMessageId,contextMessageId,senderPhone,action,
      processingStatus:"failed",
      errorMessage:String(error instanceof Error?error.message:error).slice(0,1000)
    });
  }
}

export async function GET(request:Request){
  const url=new URL(request.url);
  const mode=url.searchParams.get("hub.mode");
  const token=url.searchParams.get("hub.verify_token");
  const challenge=url.searchParams.get("hub.challenge");
  const expected=getWhatsAppWebhookVerifyToken();
  if(mode==="subscribe"&&expected&&token===expected&&challenge){
    return new Response(challenge,{status:200,headers:{"content-type":"text/plain","cache-control":"no-store"}});
  }
  return Response.json({ok:false,error:"Webhook verification failed."},{status:403});
}

export async function POST(request:Request){
  const config=getWhatsAppConfigStatus();
  if(!config.webhookConfigured){
    return Response.json({ok:false,error:"WhatsApp webhook is not configured."},{status:503});
  }

  const raw=await request.text();
  if(!verifyWhatsAppWebhookSignature(raw,request.headers.get("x-hub-signature-256"))){
    return Response.json({ok:false,error:"Invalid webhook signature."},{status:401});
  }

  let payload:any;
  try{payload=JSON.parse(raw)}catch{
    return Response.json({ok:false,error:"Invalid JSON."},{status:400});
  }

  const rawHash=whatsappWebhookEventHash(raw);
  let statusIndex=0;
  let messageIndex=0;

  for(const entry of payload?.entry??[]){
    for(const change of entry?.changes??[]){
      const value=change?.value??{};
      for(const status of value?.statuses??[]){
        await applyStatus(status,rawHash,statusIndex++);
      }
      for(const message of value?.messages??[]){
        await applyInbound(message,rawHash,messageIndex++);
      }
    }
  }

  return Response.json({ok:true},{status:200,headers:{"cache-control":"no-store"}});
}
