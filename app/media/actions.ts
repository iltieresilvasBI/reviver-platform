"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function slugify(v:string){return v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,120)}

export async function createContent(formData:FormData){
  const supabase=await createClient(); const {data}=await supabase.auth.getClaims(); const uid=data?.claims?.sub;
  if(!uid) redirect("/login");
  const content_type=String(formData.get("content_type")??"post");
  const title=String(formData.get("title")??"").trim(); const slug=slugify(String(formData.get("slug")??"")||title);
  const summary=String(formData.get("summary")??"").trim()||null; const body=String(formData.get("body")??"").trim()||null;
  const youtube_id=String(formData.get("youtube_id")??"").trim()||null; const event_start=String(formData.get("event_start")??"").trim()||null;
  const event_location=String(formData.get("event_location")??"").trim()||null; const campaign_start=String(formData.get("campaign_start")??"").trim()||null;
  const campaign_end=String(formData.get("campaign_end")??"").trim()||null; const cta_label=String(formData.get("cta_label")??"").trim()||null;
  const cta_url=String(formData.get("cta_url")??"").trim()||null; const featured=formData.get("featured")==="on";
  const {error}=await supabase.from("content_items").insert({content_type,title,slug,summary,body,youtube_id,event_start,event_location,campaign_start,campaign_end,cta_label,cta_url,featured,created_by:String(uid),status:"draft"});
  if(error) redirect("/media?message="+encodeURIComponent(error.message));
  revalidatePath("/media"); redirect("/media?message=Conteúdo criado como rascunho.");
}

export async function transitionContent(formData:FormData){
  const supabase=await createClient(); const id=String(formData.get("contentId")??""); const action=String(formData.get("action")??"");
  const note=String(formData.get("note")??"").trim()||null; const scheduled=String(formData.get("scheduledForIso")??"").trim()||null;
  const {error}=await supabase.rpc("transition_content",{p_content_id:id,p_action:action,p_scheduled_for:scheduled,p_note:note});
  if(error) redirect("/media?message="+encodeURIComponent(error.message));
  revalidatePath("/media");
}

export async function grantMediaRole(formData:FormData){
  const supabase=await createClient(); const email=String(formData.get("email")??""); const role=String(formData.get("role")??"media_editor");
  const {error}=await supabase.rpc("grant_app_role_by_email",{p_email:email,p_role:role});
  if(error) redirect("/media?message="+encodeURIComponent(error.message));
  revalidatePath("/media"); redirect("/media?message=Papel atribuído.");
}
