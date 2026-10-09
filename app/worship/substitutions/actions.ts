"use server";

import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";

function lisbonDate(value:string){
  return new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Lisbon",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(value));
}

export async function requestAutomaticSubstitution(formData:FormData){
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  const uid=claims?.claims?.sub;
  if(!uid) redirect("/login");

  const assignmentId=String(formData.get("assignmentId")??"");
  const note=String(formData.get("requesterNote")??"").trim()||null;

  const {data:assignment,error:assignmentError}=await supabase
    .from("worship_schedule_members")
    .select("id,schedule_id,membership_id,role,worship_schedules!inner(starts_at,status)")
    .eq("id",assignmentId)
    .maybeSingle();
  if(assignmentError||!assignment) redirect("/worship/substitutions?message="+encodeURIComponent(assignmentError?.message??"Escala não encontrada."));

  const {data:mine}=await supabase.from("network_memberships")
    .select("id").eq("id",assignment.membership_id).eq("user_id",String(uid)).eq("status","active").maybeSingle();
  if(!mine) redirect("/worship/substitutions?message="+encodeURIComponent("Só podes pedir substituição para a tua própria escala."));

  const {data:open}=await supabase.from("worship_substitution_requests")
    .select("id,status").eq("assignment_id",assignmentId).in("status",["requested","accepted"]).maybeSingle();
  if(open) redirect("/worship/substitutions?message="+encodeURIComponent("Já existe um pedido de substituição aberto para esta escala."));

  const {data:req,error:reqError}=await supabase.from("worship_substitution_requests").insert({
    assignment_id:assignmentId,
    requested_by_membership_id:mine.id,
    requester_note:note,
    status:"requested"
  }).select("id").single();
  if(reqError||!req) redirect("/worship/substitutions?message="+encodeURIComponent(reqError?.message??"Não foi possível criar o pedido."));

  const schedule=(assignment as any).worship_schedules;
  const day=lisbonDate(schedule.starts_at);
  const [{data:pool},{data:profiles},{data:unavailability},{data:alreadyAssigned}]=await Promise.all([
    supabase.from("worship_member_backup_pool")
      .select("backup_membership_id,priority")
      .eq("primary_membership_id",mine.id)
      .eq("role",assignment.role??"")
      .eq("active",true)
      .order("priority"),
    supabase.from("worship_member_profiles").select("membership_id,roles,active").eq("active",true),
    supabase.from("worship_member_unavailability").select("membership_id").lte("starts_on",day).gte("ends_on",day),
    supabase.from("worship_schedule_members").select("membership_id").eq("schedule_id",assignment.schedule_id),
  ]);

  const unavailable=new Set((unavailability??[]).map((x:any)=>x.membership_id));
  const busy=new Set((alreadyAssigned??[]).map((x:any)=>x.membership_id));
  const role=String(assignment.role??"");

  let candidates=(pool??[])
    .filter((x:any)=>!unavailable.has(x.backup_membership_id)&&!busy.has(x.backup_membership_id))
    .map((x:any)=>({membership_id:x.backup_membership_id,priority:x.priority}));

  if(!candidates.length){
    candidates=(profiles??[])
      .filter((p:any)=>p.membership_id!==mine.id&&Array.isArray(p.roles)&&p.roles.includes(role)&&!unavailable.has(p.membership_id)&&!busy.has(p.membership_id))
      .slice(0,5)
      .map((p:any,index:number)=>({membership_id:p.membership_id,priority:index+1}));
  }

  if(candidates.length){
    const {error:offerError}=await supabase.from("worship_substitution_offers").insert(
      candidates.slice(0,5).map((c:any)=>({
        request_id:req.id,
        proposed_membership_id:c.membership_id,
        priority:c.priority,
        status:"pending"
      }))
    );
    if(offerError) redirect("/worship/substitutions?message="+encodeURIComponent(offerError.message));
  }

  await supabase.from("worship_substitution_events").insert({
    request_id:req.id,
    event_type:"requested_auto",
    actor_membership_id:mine.id,
    from_membership_id:mine.id,
    details:{role,offers:candidates.length}
  });

  revalidatePath("/worship/substitutions");
  redirect("/worship/substitutions?message="+encodeURIComponent(
    candidates.length
      ?"Pedido enviado automaticamente a "+Math.min(candidates.length,5)+" backup"+(candidates.length===1?"":"s")+"."
      :"Pedido registado, mas não existe backup elegível disponível nesta data."
  ));
}

export async function respondAutomaticSubstitution(formData:FormData){
  const supabase=await createClient();
  const offerId=String(formData.get("offerId")??"");
  const decision=String(formData.get("decision")??"");
  if(!["accept","decline"].includes(decision)) redirect("/worship/substitutions?message="+encodeURIComponent("Resposta inválida."));

  if(decision==="accept"){
    const {error}=await supabase.rpc("accept_worship_substitution_offer",{p_offer_id:offerId});
    if(error) redirect("/worship/substitutions?message="+encodeURIComponent(error.message));
    revalidatePath("/worship");
    revalidatePath("/worship/substitutions");
    redirect("/worship/substitutions?message="+encodeURIComponent("Substituição confirmada. A escala foi atualizada automaticamente."));
  }

  const {data:claims}=await supabase.auth.getClaims();
  const uid=claims?.claims?.sub;
  if(!uid) redirect("/login");
  const {data:offer,error:offerError}=await supabase.from("worship_substitution_offers")
    .select("id,request_id,proposed_membership_id,status").eq("id",offerId).maybeSingle();
  if(offerError||!offer) redirect("/worship/substitutions?message="+encodeURIComponent(offerError?.message??"Oferta não encontrada."));
  const {data:mine}=await supabase.from("network_memberships")
    .select("id").eq("id",offer.proposed_membership_id).eq("user_id",String(uid)).eq("status","active").maybeSingle();
  if(!mine) redirect("/worship/substitutions?message="+encodeURIComponent("Esta oferta não pertence à tua conta."));
  const {error}=await supabase.from("worship_substitution_offers")
    .update({status:"declined",responded_at:new Date().toISOString()})
    .eq("id",offerId).eq("status","pending");
  if(error) redirect("/worship/substitutions?message="+encodeURIComponent(error.message));
  await supabase.from("worship_substitution_events").insert({
    request_id:offer.request_id,event_type:"backup_declined",actor_membership_id:mine.id,to_membership_id:mine.id
  });
  revalidatePath("/worship/substitutions");
  redirect("/worship/substitutions?message="+encodeURIComponent("Indisponibilidade registada. O pedido continua aberto para os outros backups."));
}
