"use server";

import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";

const allowedBandRoles=["violao","guitarra","baixo","bateria","teclado"] as const;

function csv(value:string){
  return Array.from(new Set(value.split(",").map(v=>v.trim()).filter(Boolean))).slice(0,20);
}

function lisbonDate(value:string){
  return new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Lisbon",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(value));
}

export async function createBandTemplate(formData:FormData){
  const supabase=await createClient();
  const {data}=await supabase.auth.getClaims();
  const uid=data?.claims?.sub;
  if(!uid) redirect("/login");
  const name=String(formData.get("name")??"").trim();
  const serviceTypes=csv(String(formData.get("serviceTypes")??""));
  if(!name) redirect("/worship/band-rotation?message="+encodeURIComponent("Indica o nome da combinação."));
  const {error}=await supabase.from("worship_band_templates").insert({
    name,service_types:serviceTypes,created_by:String(uid)
  });
  if(error) redirect("/worship/band-rotation?message="+encodeURIComponent(error.message));
  revalidatePath("/worship/band-rotation");
}

export async function addBandTemplateSlot(formData:FormData){
  const supabase=await createClient();
  const templateId=String(formData.get("templateId")??"");
  const role=String(formData.get("role")??"");
  const requiredCount=Math.max(1,Math.min(4,Number(formData.get("requiredCount")??1)||1));
  if(!allowedBandRoles.includes(role as any)) redirect("/worship/band-rotation?message="+encodeURIComponent("Instrumento inválido."));
  const {error}=await supabase.from("worship_band_template_slots").upsert({
    template_id:templateId,role,required_count:requiredCount
  },{onConflict:"template_id,role"});
  if(error) redirect("/worship/band-rotation?message="+encodeURIComponent(error.message));
  revalidatePath("/worship/band-rotation");
}

export async function deleteBandTemplateSlot(formData:FormData){
  const supabase=await createClient();
  const slotId=String(formData.get("slotId")??"");
  const {error}=await supabase.from("worship_band_template_slots").delete().eq("id",slotId);
  if(error) redirect("/worship/band-rotation?message="+encodeURIComponent(error.message));
  revalidatePath("/worship/band-rotation");
}

export async function autoFillBand(formData:FormData){
  const supabase=await createClient();
  const scheduleId=String(formData.get("scheduleId")??"");
  const templateId=String(formData.get("templateId")??"");
  const [{data:schedule,error:scheduleError},{data:slots,error:slotError},{data:profiles,error:profileError},{data:existing}]=await Promise.all([
    supabase.from("worship_schedules").select("id,starts_at").eq("id",scheduleId).maybeSingle(),
    supabase.from("worship_band_template_slots").select("role,required_count,sort_order").eq("template_id",templateId).order("sort_order"),
    supabase.from("worship_member_profiles").select("membership_id,roles,active").eq("active",true),
    supabase.from("worship_schedule_members").select("membership_id,role").eq("schedule_id",scheduleId),
  ]);
  if(scheduleError||slotError||profileError||!schedule){
    redirect("/worship/band-rotation?message="+encodeURIComponent(scheduleError?.message??slotError?.message??profileError?.message??"Dados da escala indisponíveis."));
  }
  if(!(slots??[]).length) redirect("/worship/band-rotation?message="+encodeURIComponent("Esta combinação ainda não tem instrumentos."));

  const day=lisbonDate(schedule.starts_at);
  const cutoff=new Date(schedule.starts_at); cutoff.setDate(cutoff.getDate()-120);
  const [{data:unavailability},{data:history}]=await Promise.all([
    supabase.from("worship_member_unavailability").select("membership_id").lte("starts_on",day).gte("ends_on",day),
    supabase.from("worship_schedule_members")
      .select("membership_id,role,worship_schedules!inner(starts_at,status)")
      .gte("worship_schedules.starts_at",cutoff.toISOString())
      .lt("worship_schedules.starts_at",schedule.starts_at)
      .neq("worship_schedules.status","cancelled"),
  ]);

  const unavailable=new Set((unavailability??[]).map((x:any)=>x.membership_id));
  const used=new Set((existing??[]).map((x:any)=>x.membership_id));
  const existingKeys=new Set((existing??[]).map((x:any)=>x.membership_id+"|"+(x.role??"")));
  const load=new Map<string,number>();
  const roleLoad=new Map<string,number>();
  for(const row of history??[]){
    load.set(row.membership_id,(load.get(row.membership_id)??0)+1);
    roleLoad.set(row.membership_id+"|"+(row.role??""),(roleLoad.get(row.membership_id+"|"+(row.role??""))??0)+1);
  }

  const expanded=(slots??[]).flatMap((slot:any)=>Array.from({length:slot.required_count},()=>slot.role));
  expanded.sort((a:string,b:string)=>{
    const ca=(profiles??[]).filter((p:any)=>Array.isArray(p.roles)&&p.roles.includes(a)).length;
    const cb=(profiles??[]).filter((p:any)=>Array.isArray(p.roles)&&p.roles.includes(b)).length;
    return ca-cb;
  });

  const rows:any[]=[];
  const missing:string[]=[];
  for(const role of expanded){
    const candidates=(profiles??[])
      .filter((p:any)=>Array.isArray(p.roles)&&p.roles.includes(role)&&!unavailable.has(p.membership_id)&&!used.has(p.membership_id))
      .sort((a:any,b:any)=>{
        const sa=(load.get(a.membership_id)??0)*10+(roleLoad.get(a.membership_id+"|"+role)??0)*4;
        const sb=(load.get(b.membership_id)??0)*10+(roleLoad.get(b.membership_id+"|"+role)??0)*4;
        return sa-sb;
      });
    const picked=candidates[0];
    if(!picked){missing.push(role);continue;}
    const key=picked.membership_id+"|"+role;
    if(existingKeys.has(key)){used.add(picked.membership_id);continue;}
    rows.push({schedule_id:scheduleId,membership_id:picked.membership_id,role});
    used.add(picked.membership_id);
  }

  if(rows.length){
    const {error}=await supabase.from("worship_schedule_members").insert(rows);
    if(error) redirect("/worship/band-rotation?message="+encodeURIComponent(error.message));
  }
  revalidatePath("/worship");
  revalidatePath("/worship/schedules/new");
  redirect("/worship/band-rotation?message="+encodeURIComponent(
    rows.length+" instrumentista"+(rows.length===1?"":"s")+" adicionado"+(rows.length===1?"":"s")+
    (missing.length?" · faltou cobrir: "+missing.join(", "):" · banda coberta")
  ));
}

export async function generateAutomaticBackups(){
  const supabase=await createClient();
  const cutoff=new Date(); cutoff.setDate(cutoff.getDate()-120);
  const [{data:profiles,error:profileError},{data:history,error:historyError}]=await Promise.all([
    supabase.from("worship_member_profiles").select("membership_id,roles,group_code,active").eq("active",true),
    supabase.from("worship_schedule_members")
      .select("membership_id,role,worship_schedules!inner(starts_at,status)")
      .gte("worship_schedules.starts_at",cutoff.toISOString())
      .neq("worship_schedules.status","cancelled"),
  ]);
  if(profileError||historyError) redirect("/worship/band-rotation?message="+encodeURIComponent(profileError?.message??historyError?.message??"Não foi possível gerar backups."));

  const load=new Map<string,number>();
  const roleLoad=new Map<string,number>();
  for(const row of history??[]){
    load.set(row.membership_id,(load.get(row.membership_id)??0)+1);
    roleLoad.set(row.membership_id+"|"+(row.role??""),(roleLoad.get(row.membership_id+"|"+(row.role??""))??0)+1);
  }

  const rows:any[]=[];
  for(const primary of profiles??[]){
    for(const role of (Array.isArray(primary.roles)?primary.roles:[])){
      const candidates=(profiles??[])
        .filter((p:any)=>p.membership_id!==primary.membership_id&&Array.isArray(p.roles)&&p.roles.includes(role))
        .sort((a:any,b:any)=>{
          const sameGroupA=a.group_code&&a.group_code===primary.group_code?1:0;
          const sameGroupB=b.group_code&&b.group_code===primary.group_code?1:0;
          const sa=(load.get(a.membership_id)??0)*10+(roleLoad.get(a.membership_id+"|"+role)??0)*4+sameGroupA;
          const sb=(load.get(b.membership_id)??0)*10+(roleLoad.get(b.membership_id+"|"+role)??0)*4+sameGroupB;
          return sa-sb;
        })
        .slice(0,5);
      candidates.forEach((backup:any,index:number)=>rows.push({
        primary_membership_id:primary.membership_id,
        role,
        backup_membership_id:backup.membership_id,
        priority:index+1,
        generated_at:new Date().toISOString(),
        active:true
      }));
    }
  }

  const {error:deleteError}=await supabase.from("worship_member_backup_pool").delete().gte("priority",1);
  if(deleteError) redirect("/worship/band-rotation?message="+encodeURIComponent(deleteError.message));
  if(rows.length){
    const {error}=await supabase.from("worship_member_backup_pool").insert(rows);
    if(error) redirect("/worship/band-rotation?message="+encodeURIComponent(error.message));
  }
  revalidatePath("/worship/band-rotation");
  revalidatePath("/worship/substitutions");
  redirect("/worship/band-rotation?message="+encodeURIComponent(rows.length+" relações de backup geradas automaticamente."));
}
