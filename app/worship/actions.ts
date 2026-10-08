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

function csvThemes(value:string){
  return Array.from(new Set(value.split(",").map(v=>v.trim()).filter(Boolean))).slice(0,20);
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
  const composition_title=String(formData.get("compositionTitle")??"").trim()||title;
  const version_name=String(formData.get("versionName")??"").trim()||null;
  const original_key=String(formData.get("originalKey")??"").trim()||null;
  const recommended_key=String(formData.get("recommendedKey")??"").trim()||default_key;
  const bpmRaw=String(formData.get("bpm")??"").trim();
  const bpm=bpmRaw?Number(bpmRaw):null;
  const youtube_url=String(formData.get("youtubeUrl")??"").trim()||null;
  const spotify_url=String(formData.get("spotifyUrl")??"").trim()||null;
  const apple_music_url=String(formData.get("appleMusicUrl")??"").trim()||null;
  const deezer_url=String(formData.get("deezerUrl")??"").trim()||null;
  const chord_url=String(formData.get("chordUrl")??"").trim()||null;
  const lyrics_url=String(formData.get("lyricsUrl")??"").trim()||null;
  const themes=csvThemes(String(formData.get("themes")??""));
  const notes=String(formData.get("notes")??"").trim()||null;
  const {error}=await supabase.from("worship_songs").insert({
    title,artist,composition_title,version_name,original_key,recommended_key,default_key,bpm,youtube_url,spotify_url,apple_music_url,deezer_url,chord_url,lyrics_url,themes,notes,created_by:String(uid)
  });
  if(error) redirect("/worship?message="+encodeURIComponent(error.message));
  revalidatePath("/worship");
}

export async function updateWorshipSong(formData:FormData){
  const supabase=await createClient();
  const id=String(formData.get("songId")??"");
  const title=String(formData.get("title")??"").trim();
  const artist=String(formData.get("artist")??"").trim()||null;
  const default_key=String(formData.get("defaultKey")??"").trim()||null;
  const composition_title=String(formData.get("compositionTitle")??"").trim()||title;
  const version_name=String(formData.get("versionName")??"").trim()||null;
  const original_key=String(formData.get("originalKey")??"").trim()||null;
  const recommended_key=String(formData.get("recommendedKey")??"").trim()||default_key;
  const bpmRaw=String(formData.get("bpm")??"").trim();
  const bpm=bpmRaw?Number(bpmRaw):null;
  const youtube_url=String(formData.get("youtubeUrl")??"").trim()||null;
  const spotify_url=String(formData.get("spotifyUrl")??"").trim()||null;
  const apple_music_url=String(formData.get("appleMusicUrl")??"").trim()||null;
  const deezer_url=String(formData.get("deezerUrl")??"").trim()||null;
  const chord_url=String(formData.get("chordUrl")??"").trim()||null;
  const lyrics_url=String(formData.get("lyricsUrl")??"").trim()||null;
  const themes=csvThemes(String(formData.get("themes")??""));
  const notes=String(formData.get("notes")??"").trim()||null;
  const {error}=await supabase.from("worship_songs").update({
    title,artist,composition_title,version_name,original_key,recommended_key,default_key,bpm,youtube_url,spotify_url,apple_music_url,deezer_url,chord_url,lyrics_url,themes,notes,updated_at:new Date().toISOString()
  }).eq("id",id);
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
  const themes=csvThemes(String(formData.get("themes")??formData.get("theme")??""));
  const theme=themes[0]??null;
  const location=String(formData.get("location")??"").trim()||null;
  const ends_at=String(formData.get("endsAt")??"").trim()||null;
  const notes=String(formData.get("notes")??"").trim()||null;
  const {error}=await supabase.from("worship_schedules").insert({title,service_type,starts_at,ends_at,call_time,group_code,theme,themes,location,notes,created_by:String(uid)});
  if(error) redirect("/worship?message="+encodeURIComponent(error.message));
  revalidatePath("/worship");
}

export async function updateWorshipScheduleTheme(formData:FormData){
  const supabase=await createClient();
  const id=String(formData.get("scheduleId")??"");
  const themes=csvThemes(String(formData.get("themes")??formData.get("theme")??""));
  const theme=themes[0]??null;
  const {error}=await supabase.from("worship_schedules").update({theme,themes,updated_at:new Date().toISOString()}).eq("id",id);
  if(error) redirect("/worship?message="+encodeURIComponent(error.message));
  revalidatePath("/worship");
  revalidatePath("/worship/repertoire");
}

export async function setWorshipSongVisibility(formData:FormData){
  const supabase=await createClient();
  const id=String(formData.get("songId")??"");
  const public_visible=String(formData.get("publicVisible")??"false")==="true";
  const {error}=await supabase.from("worship_songs").update({public_visible,updated_at:new Date().toISOString()}).eq("id",id);
  if(error) redirect("/worship/repertoire?message="+encodeURIComponent(error.message));
  revalidatePath("/worship/repertoire");
  revalidatePath("/repertorio-da-igreja");
}

export async function archiveWorshipSong(formData:FormData){
  const supabase=await createClient();
  const id=String(formData.get("songId")??"");
  const archived=String(formData.get("archived")??"true")==="true";
  const {error}=await supabase.from("worship_songs").update({
    active:!archived,archived_at:archived?new Date().toISOString():null,updated_at:new Date().toISOString()
  }).eq("id",id);
  if(error) redirect("/worship/repertoire?message="+encodeURIComponent(error.message));
  revalidatePath("/worship/repertoire");
  revalidatePath("/repertorio-da-igreja");
}

export async function updateWorshipPublication(formData:FormData){
  const supabase=await createClient();
  const scheduleId=String(formData.get("scheduleId")??"");
  const action=String(formData.get("publicationAction")??"");
  if(!["draft","approve","publish"].includes(action)) redirect("/worship?message="+encodeURIComponent("Ação de publicação inválida."));
  const now=new Date().toISOString();
  const patch=action==="draft"
    ?{publication_state:"draft",approved_at:null,published_at:null}
    :action==="approve"
      ?{publication_state:"approved",approved_at:now,published_at:null}
      :{publication_state:"published",approved_at:now,published_at:now};
  const {error}=await supabase.from("worship_schedules").update({...patch,updated_at:now}).eq("id",scheduleId);
  if(error) redirect("/worship?message="+encodeURIComponent(error.message));
  revalidatePath("/worship");
}

export async function setWorshipPublicRepertoire(formData:FormData){
  const supabase=await createClient();
  const scheduleId=String(formData.get("scheduleId")??"");
  const public_repertoire=String(formData.get("publicRepertoire")??"false")==="true";
  if(public_repertoire){
    const {data:privateRows,error:privateError}=await supabase
      .from("worship_schedule_songs")
      .select("song_id,worship_songs!inner(public_visible)")
      .eq("schedule_id",scheduleId)
      .eq("worship_songs.public_visible",false);
    if(privateError) redirect("/worship?message="+encodeURIComponent(privateError.message));
    if((privateRows??[]).length) redirect("/worship?message="+encodeURIComponent("Existem músicas privadas neste repertório. Torne-as públicas antes de divulgar o culto."));
  }
  const {error}=await supabase.from("worship_schedules").update({public_repertoire,updated_at:new Date().toISOString()}).eq("id",scheduleId);
  if(error) redirect("/worship?message="+encodeURIComponent(error.message));
  revalidatePath("/worship");
  revalidatePath("/repertorio-da-igreja");
}

export async function confirmWorshipExecutions(formData:FormData){
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  const uid=claims?.claims?.sub;
  if(!uid) redirect("/login");
  const scheduleId=String(formData.get("scheduleId")??"");
  const selected=Array.from(new Set(formData.getAll("songIds").map(v=>String(v)).filter(Boolean)));
  const {data:planned,error:plannedError}=await supabase
    .from("worship_schedule_songs")
    .select("song_id,key_override,worship_songs!inner(version_name,default_key)")
    .eq("schedule_id",scheduleId);
  if(plannedError) redirect("/worship?message="+encodeURIComponent(plannedError.message));

  const allowed=new Set((planned??[]).map((r:any)=>r.song_id));
  const safeSelected=selected.filter(id=>allowed.has(id));
  const {error:deleteError}=await supabase.from("worship_song_executions").delete().eq("schedule_id",scheduleId);
  if(deleteError) redirect("/worship?message="+encodeURIComponent(deleteError.message));

  const rows=(planned??[]).filter((r:any)=>safeSelected.includes(r.song_id)).map((r:any)=>({
    schedule_id:scheduleId,
    song_id:r.song_id,
    key_used:r.key_override||(r.worship_songs as any)?.default_key||null,
    version_used:(r.worship_songs as any)?.version_name||null,
    confirmed_by:String(uid),
    confirmed_at:new Date().toISOString()
  }));
  if(rows.length){
    const {error}=await supabase.from("worship_song_executions").insert(rows);
    if(error) redirect("/worship?message="+encodeURIComponent(error.message));
  }
  const {error:scheduleError}=await supabase.from("worship_schedules").update({status:"completed",updated_at:new Date().toISOString()}).eq("id",scheduleId);
  if(scheduleError) redirect("/worship?message="+encodeURIComponent(scheduleError.message));
  revalidatePath("/worship");
  revalidatePath("/worship/repertoire");
  revalidatePath("/worship/reports");
  revalidatePath("/repertorio-da-igreja");
  redirect("/worship?message="+encodeURIComponent("Repertório executado confirmado. Os relatórios foram atualizados."));
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


export async function createRotationServiceSlot(formData:FormData){
  const supabase=await createClient();
  const weekday=Number(formData.get("weekday")??0);
  const service_type=String(formData.get("serviceType")??"").trim();
  const service_time=String(formData.get("serviceTime")??"").trim();
  const call_offset_minutes=Math.max(0,Math.min(360,Number(formData.get("callOffsetMinutes")??60)||60));
  const sort_order=Number(formData.get("sortOrder")??0)||0;
  const {error}=await supabase.from("worship_rotation_service_slots").insert({weekday,service_type,service_time,call_offset_minutes,sort_order,active:true});
  if(error) redirect("/worship/rotacao?message="+encodeURIComponent(error.message));
  revalidatePath("/worship/rotacao");
}

export async function deleteRotationServiceSlot(formData:FormData){
  const supabase=await createClient();
  const id=String(formData.get("slotId")??"");
  const {error}=await supabase.from("worship_rotation_service_slots").delete().eq("id",id);
  if(error) redirect("/worship/rotacao?message="+encodeURIComponent(error.message));
  revalidatePath("/worship/rotacao");
}

function monthDateList(monthStart:string){
  const [year,month]=monthStart.split("-").map(Number);
  const days=new Date(Date.UTC(year,month,0)).getUTCDate();
  return Array.from({length:days},(_,i)=>{
    const d=new Date(Date.UTC(year,month-1,i+1));
    return {
      date:d.toISOString().slice(0,10),
      weekday:d.getUTCDay()
    };
  });
}

export async function generateWorshipRotationMonth(formData:FormData){
  const supabase=await createClient();
  const {data}=await supabase.auth.getClaims(); const uid=data?.claims?.sub;
  if(!uid) redirect("/login");
  const monthStart=String(formData.get("monthStart")??"").trim();
  const startingGroup=String(formData.get("startingGroup")??"A");
  const notes=String(formData.get("notes")??"").trim()||null;
  if(!/^\d{4}-\d{2}-01$/.test(monthStart)) redirect("/worship/rotacao?message="+encodeURIComponent("Escolhe o primeiro dia do mês."));
  if(!["A","B","C","D"].includes(startingGroup)) redirect("/worship/rotacao?message="+encodeURIComponent("Grupo inicial inválido."));

  const {data:slots,error:slotError}=await supabase
    .from("worship_rotation_service_slots")
    .select("id,weekday,service_time,sort_order")
    .eq("active",true)
    .order("weekday")
    .order("service_time")
    .order("sort_order");
  if(slotError) redirect("/worship/rotacao?message="+encodeURIComponent(slotError.message));
  if(!(slots??[]).length) redirect("/worship/rotacao?message="+encodeURIComponent("Configura pelo menos um culto semanal antes de gerar a rotação."));

  const {data:month,error:monthError}=await supabase
    .from("worship_rotation_months")
    .upsert({month_start:monthStart,status:"draft",notes,created_by:String(uid),updated_at:new Date().toISOString()},{onConflict:"month_start"})
    .select("id")
    .single();
  if(monthError||!month) redirect("/worship/rotacao?message="+encodeURIComponent(monthError?.message??"Não foi possível criar o mês."));

  const {error:deleteError}=await supabase.from("worship_rotation_assignments").delete().eq("rotation_month_id",month.id);
  if(deleteError) redirect("/worship/rotacao?message="+encodeURIComponent(deleteError.message));

  const groups=["A","B","C","D"];
  let groupIndex=groups.indexOf(startingGroup);
  const rows:any[]=[];
  for(const day of monthDateList(monthStart)){
    const daySlots=(slots??[]).filter((s:any)=>s.weekday===day.weekday);
    for(const slot of daySlots){
      rows.push({
        rotation_month_id:month.id,
        service_date:day.date,
        service_slot_id:slot.id,
        group_code:groups[groupIndex%groups.length],
      });
      groupIndex++;
    }
  }
  if(rows.length){
    const {error}=await supabase.from("worship_rotation_assignments").insert(rows);
    if(error) redirect("/worship/rotacao?message="+encodeURIComponent(error.message));
  }
  revalidatePath("/worship/rotacao");
  redirect("/worship/rotacao?message="+encodeURIComponent("Plano mensal gerado em rascunho."));
}

export async function materializeWorshipRotationMonth(formData:FormData){
  const supabase=await createClient();
  const rotationId=String(formData.get("rotationId")??"");
  const {data,error}=await supabase.rpc("materialize_worship_rotation_month",{p_rotation_month_id:rotationId});
  if(error) redirect("/worship/rotacao?message="+encodeURIComponent(error.message));
  revalidatePath("/worship");
  revalidatePath("/worship/rotacao");
  redirect("/worship/rotacao?message="+encodeURIComponent((data??0)+" escalas criadas."));
}


export async function updateWorshipRotationAssignment(formData:FormData){
  const supabase=await createClient();
  const assignmentId=String(formData.get("assignmentId")??"");
  const groupCode=String(formData.get("groupCode")??"");
  const notes=String(formData.get("notes")??"").trim()||null;
  if(!["A","B","C","D"].includes(groupCode)){
    redirect("/worship/rotacao?message="+encodeURIComponent("Grupo inválido."));
  }
  const {error}=await supabase
    .from("worship_rotation_assignments")
    .update({group_code:groupCode,notes})
    .eq("id",assignmentId);
  if(error) redirect("/worship/rotacao?message="+encodeURIComponent(error.message));
  revalidatePath("/worship/rotacao");
}


export async function createWorshipUnavailability(formData:FormData){
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  const uid=claims?.claims?.sub;
  if(!uid) redirect("/login");

  const {data:network}=await supabase.from("networks").select("id").eq("slug","worship").maybeSingle();
  if(!network) redirect("/worship?message="+encodeURIComponent("Ministério de Louvor não configurado."));

  const {data:membership}=await supabase
    .from("network_memberships")
    .select("id,status")
    .eq("network_id",network.id)
    .eq("user_id",String(uid))
    .maybeSingle();
  if(!membership||membership.status!=="active") redirect("/worship?message="+encodeURIComponent("Acesso ao Louvor inativo."));

  const starts_on=String(formData.get("startsOn")??"").trim();
  const ends_on=String(formData.get("endsOn")??"").trim();
  const reason=String(formData.get("reason")??"").trim()||null;
  if(!starts_on||!ends_on) redirect("/worship?message="+encodeURIComponent("Indica o primeiro e o último dia da indisponibilidade."));
  if(ends_on<starts_on) redirect("/worship?message="+encodeURIComponent("O último dia não pode ser anterior ao primeiro."));

  const {error}=await supabase.from("worship_member_unavailability").insert({
    membership_id:membership.id,starts_on,ends_on,reason
  });
  if(error) redirect("/worship?message="+encodeURIComponent(error.message));
  revalidatePath("/worship");
  redirect("/worship?message="+encodeURIComponent("Indisponibilidade registada."));
}

export async function deleteWorshipUnavailability(formData:FormData){
  const supabase=await createClient();
  const id=String(formData.get("unavailabilityId")??"");
  const {error}=await supabase.from("worship_member_unavailability").delete().eq("id",id);
  if(error) redirect("/worship?message="+encodeURIComponent(error.message));
  revalidatePath("/worship");
}


export async function autoAssignWorshipGroup(formData:FormData){
  const supabase=await createClient();
  const scheduleId=String(formData.get("scheduleId")??"");
  if(!scheduleId) redirect("/worship?message="+encodeURIComponent("Escala inválida."));

  const {data:schedule,error:scheduleError}=await supabase
    .from("worship_schedules")
    .select("id,group_code,starts_at")
    .eq("id",scheduleId)
    .maybeSingle();
  if(scheduleError||!schedule) redirect("/worship?message="+encodeURIComponent(scheduleError?.message??"Escala não encontrada."));
  if(!schedule.group_code) redirect("/worship?message="+encodeURIComponent("Define o grupo da escala antes de preencher a equipa."));

  const dateParts=new Intl.DateTimeFormat("en-GB",{
    timeZone:"Europe/Lisbon",year:"numeric",month:"2-digit",day:"2-digit"
  }).formatToParts(new Date(schedule.starts_at));
  const datePart=(type:string)=>dateParts.find(p=>p.type===type)?.value??"";
  const serviceDate=`${datePart("year")}-${datePart("month")}-${datePart("day")}`;

  const {data:profiles,error:profileError}=await supabase
    .from("worship_member_profiles")
    .select("membership_id,roles")
    .eq("group_code",schedule.group_code)
    .eq("active",true);
  if(profileError) redirect("/worship?message="+encodeURIComponent(profileError.message));

  const membershipIds=(profiles??[]).map((p:any)=>p.membership_id);
  if(!membershipIds.length){
    redirect("/worship?message="+encodeURIComponent("Nenhum membro ativo configurado no Grupo "+schedule.group_code+"."));
  }

  const [{data:memberships,error:membershipError},{data:unavailable,error:unavailableError},{data:existing,error:existingError}]=await Promise.all([
    supabase.from("network_memberships").select("id,status").in("id",membershipIds),
    supabase.from("worship_member_unavailability").select("membership_id,starts_on,ends_on").in("membership_id",membershipIds).lte("starts_on",serviceDate).gte("ends_on",serviceDate),
    supabase.from("worship_schedule_members").select("membership_id,role").eq("schedule_id",scheduleId)
  ]);
  if(membershipError||unavailableError||existingError){
    redirect("/worship?message="+encodeURIComponent(membershipError?.message??unavailableError?.message??existingError?.message??"Erro ao validar equipa."));
  }

  const activeIds=new Set((memberships??[]).filter((m:any)=>m.status==="active").map((m:any)=>m.id));
  const unavailableIds=new Set((unavailable??[]).map((u:any)=>u.membership_id));
  const existingKeys=new Set((existing??[]).map((e:any)=>e.membership_id+"|"+(e.role??"")));

  const rows=(profiles??[]).flatMap((p:any)=>{
    if(!activeIds.has(p.membership_id)||unavailableIds.has(p.membership_id)) return [];
    const primaryRole=(p.roles??[])[0]??null;
    const key=p.membership_id+"|"+(primaryRole??"");
    if(existingKeys.has(key)) return [];
    return [{schedule_id:scheduleId,membership_id:p.membership_id,role:primaryRole}];
  });

  if(rows.length){
    const {error}=await supabase.from("worship_schedule_members").insert(rows);
    if(error) redirect("/worship?message="+encodeURIComponent(error.message));
  }

  const skippedUnavailable=unavailableIds.size;
  revalidatePath("/worship");
  redirect("/worship?message="+encodeURIComponent(
    rows.length+" membro"+(rows.length===1?"":"s")+" adicionado"+(rows.length===1?"":"s")+
    (skippedUnavailable?" · "+skippedUnavailable+" membro"+(skippedUnavailable===1?"":"s")+" "+(skippedUnavailable===1?"indisponível":"indisponíveis")+" ignorado"+(skippedUnavailable===1?"":"s"):"")
  ));
}


export async function markWorshipAttendance(formData:FormData){
  const supabase=await createClient();
  const assignmentId=String(formData.get("assignmentId")??"");
  const attendance=String(formData.get("attendance")??"completed");
  if(!["assigned","completed"].includes(attendance)){
    redirect("/worship?message="+encodeURIComponent("Estado de presença inválido."));
  }
  const {error}=await supabase
    .from("worship_schedule_members")
    .update({attendance_status:attendance})
    .eq("id",assignmentId);
  if(error) redirect("/worship?message="+encodeURIComponent(error.message));
  revalidatePath("/worship");
}


function worshipThemeSlug(value:string){
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,80);
}

export async function createWorshipTheme(formData:FormData){
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  const uid=claims?.claims?.sub;
  if(!uid) redirect("/login");
  const name=String(formData.get("name")??"").trim();
  if(!name) redirect("/worship/themes?message="+encodeURIComponent("Indica o nome do tema."));
  const slug=worshipThemeSlug(name);
  const {error}=await supabase.from("worship_themes").upsert({name,slug,active:true,created_by:String(uid),updated_at:new Date().toISOString()},{onConflict:"slug"});
  if(error) redirect("/worship/themes?message="+encodeURIComponent(error.message));
  revalidatePath("/worship/themes");
  revalidatePath("/worship/repertoire");
}

export async function setWorshipThemeActive(formData:FormData){
  const supabase=await createClient();
  const id=String(formData.get("themeId")??"");
  const active=String(formData.get("active")??"false")==="true";
  const {error}=await supabase.from("worship_themes").update({active,updated_at:new Date().toISOString()}).eq("id",id);
  if(error) redirect("/worship/themes?message="+encodeURIComponent(error.message));
  revalidatePath("/worship/themes");
  revalidatePath("/worship/repertoire");
}

export async function requestWorshipSubstitution(formData:FormData){
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  const uid=claims?.claims?.sub;
  if(!uid) redirect("/login");
  const assignmentId=String(formData.get("assignmentId")??"");
  const proposedMembershipId=String(formData.get("proposedMembershipId")??"").trim()||null;
  const requesterNote=String(formData.get("requesterNote")??"").trim()||null;
  const {data:assignment,error:assignmentError}=await supabase.from("worship_schedule_members").select("id,membership_id").eq("id",assignmentId).maybeSingle();
  if(assignmentError||!assignment) redirect("/worship?message="+encodeURIComponent(assignmentError?.message??"Escala não encontrada."));
  const {data:ownMembership}=await supabase.from("network_memberships").select("id").eq("id",assignment.membership_id).eq("user_id",String(uid)).eq("status","active").maybeSingle();
  if(!ownMembership) redirect("/worship?message="+encodeURIComponent("Só podes pedir substituição para a tua própria escala."));
  const {error}=await supabase.from("worship_substitution_requests").insert({
    assignment_id:assignmentId,
    requested_by_membership_id:ownMembership.id,
    proposed_membership_id:proposedMembershipId,
    requester_note:requesterNote,
    status:"requested"
  });
  if(error) redirect("/worship?message="+encodeURIComponent(error.message));
  revalidatePath("/worship");
  redirect("/worship?message="+encodeURIComponent("Pedido de substituição registado."));
}

export async function acceptWorshipSubstitution(formData:FormData){
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  const uid=claims?.claims?.sub;
  if(!uid) redirect("/login");
  const requestId=String(formData.get("requestId")??"");
  const note=String(formData.get("note")??"").trim()||null;
  const {data:req,error:reqError}=await supabase.from("worship_substitution_requests").select("id,proposed_membership_id,status").eq("id",requestId).maybeSingle();
  if(reqError||!req) redirect("/worship?message="+encodeURIComponent(reqError?.message??"Pedido não encontrado."));
  const {data:mine}=req.proposed_membership_id
    ?await supabase.from("network_memberships").select("id").eq("id",req.proposed_membership_id).eq("user_id",String(uid)).eq("status","active").maybeSingle()
    :{data:null as any};
  if(!mine) redirect("/worship?message="+encodeURIComponent("Este pedido não está dirigido à tua conta."));
  const {error}=await supabase.from("worship_substitution_requests").update({
    status:"accepted",substitute_note:note,accepted_at:new Date().toISOString(),updated_at:new Date().toISOString()
  }).eq("id",requestId);
  if(error) redirect("/worship?message="+encodeURIComponent(error.message));
  revalidatePath("/worship");
}

export async function decideWorshipSubstitution(formData:FormData){
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  const uid=claims?.claims?.sub;
  if(!uid) redirect("/login");
  const requestId=String(formData.get("requestId")??"");
  const decision=String(formData.get("decision")??"");
  const leaderNote=String(formData.get("leaderNote")??"").trim()||null;
  if(!["approved","rejected"].includes(decision)) redirect("/worship?message="+encodeURIComponent("Decisão inválida."));
  const {data:req,error:reqError}=await supabase.from("worship_substitution_requests")
    .select("id,assignment_id,proposed_membership_id,status")
    .eq("id",requestId).maybeSingle();
  if(reqError||!req) redirect("/worship?message="+encodeURIComponent(reqError?.message??"Pedido não encontrado."));
  if(decision==="approved"){
    if(req.status!=="accepted"||!req.proposed_membership_id) redirect("/worship?message="+encodeURIComponent("O substituto precisa aceitar antes da validação do líder."));
    const {data:assignment,error:assignmentError}=await supabase.from("worship_schedule_members").select("id,schedule_id,role").eq("id",req.assignment_id).maybeSingle();
    if(assignmentError||!assignment) redirect("/worship?message="+encodeURIComponent(assignmentError?.message??"Atribuição não encontrada."));
    const {data:conflict}=await supabase.from("worship_schedule_members")
      .select("id").eq("schedule_id",assignment.schedule_id).eq("membership_id",req.proposed_membership_id).eq("role",assignment.role??"").maybeSingle();
    if(conflict) redirect("/worship?message="+encodeURIComponent("O substituto já está escalado nesta função."));
    const {error:updateAssignmentError}=await supabase.from("worship_schedule_members")
      .update({membership_id:req.proposed_membership_id,attendance_status:"assigned"})
      .eq("id",req.assignment_id);
    if(updateAssignmentError) redirect("/worship?message="+encodeURIComponent(updateAssignmentError.message));
    await supabase.from("worship_assignment_responses").delete().eq("assignment_id",req.assignment_id);
  }
  const {error}=await supabase.from("worship_substitution_requests").update({
    status:decision,leader_note:leaderNote,decided_at:new Date().toISOString(),decided_by:String(uid),updated_at:new Date().toISOString()
  }).eq("id",requestId);
  if(error) redirect("/worship?message="+encodeURIComponent(error.message));
  revalidatePath("/worship");
}


export async function proposeWorshipSubstitute(formData:FormData){
  const supabase=await createClient();
  const requestId=String(formData.get("requestId")??"");
  const proposedMembershipId=String(formData.get("proposedMembershipId")??"");
  if(!requestId||!proposedMembershipId) redirect("/worship/substitutions?message="+encodeURIComponent("Seleciona um substituto."));
  const {error}=await supabase.from("worship_substitution_requests").update({
    proposed_membership_id:proposedMembershipId,status:"requested",accepted_at:null,substitute_note:null,updated_at:new Date().toISOString()
  }).eq("id",requestId);
  if(error) redirect("/worship/substitutions?message="+encodeURIComponent(error.message));
  revalidatePath("/worship/substitutions");
}


export async function saveMyWorshipCommunicationPreference(formData:FormData){
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  const uid=claims?.claims?.sub;
  if(!uid) redirect("/login");
  const optIn=String(formData.get("communicationOptIn")??"false")==="true";
  const preference=String(formData.get("communicationPreference")??"").trim()||null;
  const {error}=await supabase.rpc("set_my_worship_communication_preferences",{p_opt_in:optIn,p_preference:preference});
  if(error) redirect("/worship/share?message="+encodeURIComponent(error.message));
  revalidatePath("/worship/share");
  redirect("/worship/share?message="+encodeURIComponent("Preferências de comunicação atualizadas."));
}


export async function saveResolvedWorshipSongLinks(formData:FormData){
  const supabase=await createClient();
  const songId=String(formData.get("songId")??"");
  const patch={
    youtube_url:String(formData.get("youtubeUrl")??"").trim()||null,
    spotify_url:String(formData.get("spotifyUrl")??"").trim()||null,
    apple_music_url:String(formData.get("appleMusicUrl")??"").trim()||null,
    deezer_url:String(formData.get("deezerUrl")??"").trim()||null,
    updated_at:new Date().toISOString()
  };
  const {error}=await supabase.from("worship_songs").update(patch).eq("id",songId);
  if(error) redirect("/worship/repertoire?message="+encodeURIComponent(error.message));
  revalidatePath("/worship/repertoire");
  redirect("/worship/repertoire?message="+encodeURIComponent("Links de streaming atualizados."));
}
