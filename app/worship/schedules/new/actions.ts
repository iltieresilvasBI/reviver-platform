"use server";

import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";

function csv(value:string){
  return Array.from(new Set(value.split(",").map(v=>v.trim()).filter(Boolean))).slice(0,20);
}

export async function createScheduleAndContinue(formData:FormData){
  const supabase=await createClient();
  const {data}=await supabase.auth.getClaims();
  const uid=data?.claims?.sub;
  if(!uid) redirect("/login");

  const title=String(formData.get("title")??"").trim();
  const startsAt=String(formData.get("startsAt")??"").trim();
  const callTime=String(formData.get("callTime")??"").trim()||null;
  const serviceType=String(formData.get("serviceType")??"").trim();
  const groupCode=String(formData.get("groupCode")??"").trim()||null;
  const themes=csv(String(formData.get("themes")??""));
  const notes=String(formData.get("notes")??"").trim()||null;

  if(!title||!startsAt||!serviceType){
    redirect("/worship/schedules/new?message="+encodeURIComponent("Título, tipo de culto e data/hora são obrigatórios."));
  }

  const {data:schedule,error}=await supabase.from("worship_schedules")
    .insert({
      title,
      service_type:serviceType,
      starts_at:startsAt,
      call_time:callTime,
      group_code:groupCode,
      theme:themes[0]??null,
      themes,
      notes,
      status:"planned",
      publication_state:"draft",
      created_by:String(uid)
    })
    .select("id")
    .single();

  if(error||!schedule){
    redirect("/worship/schedules/new?message="+encodeURIComponent(error?.message??"Não foi possível criar a escala."));
  }

  revalidatePath("/worship");
  redirect("/worship/schedules/new?schedule="+schedule.id+"&step=participants");
}
