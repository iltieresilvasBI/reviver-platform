"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requestWorshipAccess(){
  const supabase=await createClient();
  const {error}=await supabase.rpc("request_worship_access");
  if(error) redirect("/worship?message="+encodeURIComponent(error.message));
  revalidatePath("/worship"); redirect("/worship?message=Pedido enviado.");
}
export async function acceptWorshipInvite(){
  const supabase=await createClient();
  const {error}=await supabase.rpc("accept_worship_invite");
  if(error) redirect("/worship?message="+encodeURIComponent(error.message));
  revalidatePath("/worship"); redirect("/worship?message=Convite aceite.");
}
export async function inviteWorship(formData:FormData){
  const supabase=await createClient();
  const email=String(formData.get("email")??"");
  const role=String(formData.get("role")??"member");
  const {error}=await supabase.rpc("invite_worship_by_email",{p_email:email,p_role:role});
  if(error) redirect("/worship?message="+encodeURIComponent(error.message));
  revalidatePath("/worship"); redirect("/worship?message=Convite criado.");
}
export async function decideWorship(formData:FormData){
  const supabase=await createClient();
  const id=String(formData.get("membershipId")??""); const decision=String(formData.get("decision")??"");
  const {error}=await supabase.rpc("decide_worship_membership",{p_membership_id:id,p_decision:decision});
  if(error) redirect("/worship?message="+encodeURIComponent(error.message));
  revalidatePath("/worship");
}
export async function createWorshipItem(formData:FormData){
  const supabase=await createClient(); const {data}=await supabase.auth.getClaims(); const uid=data?.claims?.sub;
  if(!uid) redirect("/login");
  const item_type=String(formData.get("item_type")??"notice");
  const title=String(formData.get("title")??"").trim();
  const body=String(formData.get("body")??"").trim()||null;
  const starts_at=String(formData.get("starts_at")??"").trim()||null;
  const external_url=String(formData.get("external_url")??"").trim()||null;
  const {error}=await supabase.from("worship_items").insert({item_type,title,body,starts_at,external_url,created_by:String(uid)});
  if(error) redirect("/worship?message="+encodeURIComponent(error.message));
  revalidatePath("/worship");
}


function csvRoles(value:string){
  return value.split(",").map(v=>v.trim()).filter(Boolean).slice(0,12);
}

export async function saveWorshipMemberProfile(formData:FormData){
  const supabase=await createClient();
  const membershipId=String(formData.get("membershipId")??"");
  const groupCode=String(formData.get("groupCode")??"").trim()||null;
  const roles=csvRoles(String(formData.get("roles")??""));
  const notes=String(formData.get("notes")??"").trim()||null;
  const {error}=await supabase.from("worship_member_profiles").upsert({
    membership_id:membershipId,group_code:groupCode,roles,notes,active:true,updated_at:new Date().toISOString()
  },{onConflict:"membership_id"});
  if(error) redirect("/worship?message="+encodeURIComponent(error.message));
  revalidatePath("/worship");
}

export async function createWorshipSong(formData:FormData){
  const supabase=await createClient();
  const {data}=await supabase.auth.getClaims(); const uid=data?.claims?.sub;
  if(!uid) redirect("/login");
  const title=String(formData.get("title")??"").trim();
  const artist=String(formData.get("artist")??"").trim()||null;
  const default_key=String(formData.get("defaultKey")??"").trim()||null;
  const bpmRaw=String(formData.get("bpm")??"").trim();
  const bpm=bpmRaw?Number(bpmRaw):null;
  const youtube_url=String(formData.get("youtubeUrl")??"").trim()||null;
  const chord_url=String(formData.get("chordUrl")??"").trim()||null;
  const notes=String(formData.get("notes")??"").trim()||null;
  const {error}=await supabase.from("worship_songs").insert({title,artist,default_key,bpm,youtube_url,chord_url,notes,created_by:String(uid)});
  if(error) redirect("/worship?message="+encodeURIComponent(error.message));
  revalidatePath("/worship");
}

export async function createWorshipSchedule(formData:FormData){
  const supabase=await createClient();
  const {data}=await supabase.auth.getClaims(); const uid=data?.claims?.sub;
  if(!uid) redirect("/login");
  const title=String(formData.get("title")??"").trim();
  const starts_at=String(formData.get("startsAt")??"").trim();
  const call_time=String(formData.get("callTime")??"").trim()||null;
  const service_type=String(formData.get("serviceType")??"").trim()||null;
  const group_code=String(formData.get("groupCode")??"").trim()||null;
  const notes=String(formData.get("notes")??"").trim()||null;
  const {error}=await supabase.from("worship_schedules").insert({title,service_type,starts_at,call_time,group_code,notes,created_by:String(uid)});
  if(error) redirect("/worship?message="+encodeURIComponent(error.message));
  revalidatePath("/worship");
}

export async function updateWorshipScheduleStatus(formData:FormData){
  const supabase=await createClient();
  const id=String(formData.get("scheduleId")??"");
  const status=String(formData.get("status")??"planned");
  if(!["planned","confirmed","completed","cancelled"].includes(status)) redirect("/worship?message="+encodeURIComponent("Estado de escala inválido."));
  const {error}=await supabase.from("worship_schedules").update({status,updated_at:new Date().toISOString()}).eq("id",id);
  if(error) redirect("/worship?message="+encodeURIComponent(error.message));
  revalidatePath("/worship");
}

export async function assignWorshipMember(formData:FormData){
  const supabase=await createClient();
  const schedule_id=String(formData.get("scheduleId")??"");
  const membership_id=String(formData.get("membershipId")??"");
  const role=String(formData.get("role")??"").trim()||null;
  const notes=String(formData.get("notes")??"").trim()||null;
  const {error}=await supabase.from("worship_schedule_members").insert({schedule_id,membership_id,role,notes});
  if(error) redirect("/worship?message="+encodeURIComponent(error.message));
  revalidatePath("/worship");
}

export async function removeWorshipAssignment(formData:FormData){
  const supabase=await createClient();
  const id=String(formData.get("assignmentId")??"");
  const {error}=await supabase.from("worship_schedule_members").delete().eq("id",id);
  if(error) redirect("/worship?message="+encodeURIComponent(error.message));
  revalidatePath("/worship");
}

export async function addSongToWorshipSchedule(formData:FormData){
  const supabase=await createClient();
  const schedule_id=String(formData.get("scheduleId")??"");
  const song_id=String(formData.get("songId")??"");
  const position=Math.max(1,Number(formData.get("position")??1)||1);
  const key_override=String(formData.get("keyOverride")??"").trim()||null;
  const notes=String(formData.get("notes")??"").trim()||null;
  const {error}=await supabase.from("worship_schedule_songs").insert({schedule_id,song_id,position,key_override,notes});
  if(error) redirect("/worship?message="+encodeURIComponent(error.message));
  revalidatePath("/worship");
}

export async function removeSongFromWorshipSchedule(formData:FormData){
  const supabase=await createClient();
  const id=String(formData.get("scheduleSongId")??"");
  const {error}=await supabase.from("worship_schedule_songs").delete().eq("id",id);
  if(error) redirect("/worship?message="+encodeURIComponent(error.message));
  revalidatePath("/worship");
}

export async function createWorshipRehearsal(formData:FormData){
  const supabase=await createClient();
  const {data}=await supabase.auth.getClaims(); const uid=data?.claims?.sub;
  if(!uid) redirect("/login");
  const title=String(formData.get("title")??"").trim();
  const starts_at=String(formData.get("startsAt")??"").trim();
  const ends_at=String(formData.get("endsAt")??"").trim()||null;
  const location=String(formData.get("location")??"").trim()||null;
  const notes=String(formData.get("notes")??"").trim()||null;
  const schedule_id=String(formData.get("scheduleId")??"").trim()||null;
  const {error}=await supabase.from("worship_rehearsals").insert({title,starts_at,ends_at,location,notes,schedule_id,created_by:String(uid)});
  if(error) redirect("/worship?message="+encodeURIComponent(error.message));
  revalidatePath("/worship");
}


export async function respondToWorshipAssignment(formData:FormData){
  const supabase=await createClient();
  const assignment_id=String(formData.get("assignmentId")??"");
  const response_status=String(formData.get("responseStatus")??"");
  const note=String(formData.get("note")??"").trim()||null;
  if(!["confirmed","declined"].includes(response_status)){
    redirect("/worship?message="+encodeURIComponent("Resposta inválida."));
  }
  const {error}=await supabase.from("worship_assignment_responses").upsert({
    assignment_id,response_status,note,responded_at:new Date().toISOString()
  },{onConflict:"assignment_id"});
  if(error) redirect("/worship?message="+encodeURIComponent(error.message));
  revalidatePath("/worship");
  redirect("/worship?message="+encodeURIComponent(response_status==="confirmed"?"Presença confirmada.":"Indisponibilidade registada."));
}
