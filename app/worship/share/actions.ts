"use server";

import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {getAccessContext} from "@/lib/auth";
import {
  getWhatsAppConfigStatus,
  processWhatsAppOutbox,
  queueScheduleWhatsApp,
  retryWhatsAppMessage
} from "@/lib/whatsapp";

async function requireWorshipLeader(){
  const ctx=await getAccessContext();
  const canLead=ctx.isAdmin||ctx.isWorshipLeader;
  if(!canLead) redirect("/worship?message="+encodeURIComponent("Acesso de liderança necessário."));
  return ctx;
}

export async function sendScheduleWhatsApp(formData:FormData){
  const ctx=await requireWorshipLeader();
  const scheduleId=String(formData.get("scheduleId")??"").trim();
  if(!scheduleId) redirect("/worship/share?message="+encodeURIComponent("Escala inválida."));

  const config=getWhatsAppConfigStatus();
  if(!config.configured){
    redirect("/worship/share?schedule="+encodeURIComponent(scheduleId)+"&message="+encodeURIComponent(
      "A integração oficial ainda aguarda as credenciais da Meta."
    ));
  }

  try{
    const queued=await queueScheduleWhatsApp(scheduleId,ctx.userId);
    const sent=await processWhatsAppOutbox(50);
    revalidatePath("/worship/share");
    redirect("/worship/share?schedule="+encodeURIComponent(scheduleId)+"&message="+encodeURIComponent(
      "WhatsApp processado: "+sent.sent+" enviada"+(sent.sent===1?"":"s")+
      (sent.failed?" · "+sent.failed+" falhou/falharam":"")+
      (queued.skipped?" · "+queued.skipped+" sem autorização/telefone":"")
    ));
  }catch(error){
    redirect("/worship/share?schedule="+encodeURIComponent(scheduleId)+"&message="+encodeURIComponent(
      "Falha no WhatsApp: "+String(error instanceof Error?error.message:error)
    ));
  }
}

export async function retryFailedWhatsApp(formData:FormData){
  await requireWorshipLeader();
  const messageId=String(formData.get("messageId")??"").trim();
  const scheduleId=String(formData.get("scheduleId")??"").trim();
  if(!messageId) redirect("/worship/share?message="+encodeURIComponent("Mensagem inválida."));

  try{
    const result=await retryWhatsAppMessage(messageId);
    revalidatePath("/worship/share");
    redirect("/worship/share"+(scheduleId?"?schedule="+encodeURIComponent(scheduleId)+"&":"?")+"message="+encodeURIComponent(
      result.sent?"Mensagem reenviada para a API.":"A mensagem continua pendente ou falhou novamente."
    ));
  }catch(error){
    redirect("/worship/share"+(scheduleId?"?schedule="+encodeURIComponent(scheduleId)+"&":"?")+"message="+encodeURIComponent(
      "Não foi possível reenviar: "+String(error instanceof Error?error.message:error)
    ));
  }
}

export async function processPendingWhatsApp(formData:FormData){
  await requireWorshipLeader();
  const scheduleId=String(formData.get("scheduleId")??"").trim();
  try{
    const result=await processWhatsAppOutbox(50);
    revalidatePath("/worship/share");
    redirect("/worship/share"+(scheduleId?"?schedule="+encodeURIComponent(scheduleId)+"&":"?")+"message="+encodeURIComponent(
      "Fila processada: "+result.sent+" enviada"+(result.sent===1?"":"s")+
      (result.failed?" · "+result.failed+" falhou/falharam":"")
    ));
  }catch(error){
    redirect("/worship/share"+(scheduleId?"?schedule="+encodeURIComponent(scheduleId)+"&":"?")+"message="+encodeURIComponent(
      "Não foi possível processar a fila: "+String(error instanceof Error?error.message:error)
    ));
  }
}
