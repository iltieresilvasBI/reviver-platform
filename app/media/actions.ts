"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function slugify(v:string){return v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,120)}
function youtubeId(value:string){
  const v=value.trim(); if(!v)return null;
  if(/^[A-Za-z0-9_-]{11}$/.test(v))return v;
  try{
    const u=new URL(v);
    if(u.hostname.includes("youtu.be"))return u.pathname.split("/").filter(Boolean)[0]||null;
    if(u.searchParams.get("v"))return u.searchParams.get("v");
    const parts=u.pathname.split("/").filter(Boolean);
    const i=parts.findIndex(p=>["embed","shorts","live"].includes(p));
    return i>=0?parts[i+1]??null:null;
  }catch{return null}
}
function refreshPublic(){
  ["/","/eventos","/midia","/campanhas","/acontece","/redes","/ministerio-de-louvor"].forEach(p=>revalidatePath(p));
}

export async function createContent(formData:FormData){
  const supabase=await createClient(); const {data}=await supabase.auth.getClaims(); const uid=data?.claims?.sub;
  if(!uid)redirect("/login");
  const content_type=String(formData.get("content_type")??"post");
  const title=String(formData.get("title")??"").trim();
  if(!title)redirect("/media?message="+encodeURIComponent("O título é obrigatório."));
  const slug=slugify(String(formData.get("slug")??"")||title);
  const payload={
    content_type,title,slug,
    summary:String(formData.get("summary")??"").trim()||null,
    body:String(formData.get("body")??"").trim()||null,
    youtube_id:youtubeId(String(formData.get("youtube_id")??"")),
    event_start:String(formData.get("event_start")??"").trim()||null,
    event_end:String(formData.get("event_end")??"").trim()||null,
    event_location:String(formData.get("event_location")??"").trim()||null,
    campaign_start:String(formData.get("campaign_start")??"").trim()||null,
    campaign_end:String(formData.get("campaign_end")??"").trim()||null,
    cta_label:String(formData.get("cta_label")??"").trim()||null,
    cta_url:String(formData.get("cta_url")??"").trim()||null,
    featured:formData.get("featured")==="on",
    created_by:String(uid),status:"draft" as const
  };
  const {data:item,error}=await supabase.from("content_items").insert(payload).select("id").single();
  if(error||!item)redirect("/media?message="+encodeURIComponent(error?.message??"Falha ao criar conteúdo"));
  const networkSlug=String(formData.get("network")??"").trim();
  if(networkSlug){
    const {data:network}=await supabase.from("networks").select("id").eq("slug",networkSlug).eq("active",true).maybeSingle();
    if(network)await supabase.from("content_item_networks").insert({content_item_id:item.id,network_id:network.id});
  }
  revalidatePath("/media"); redirect("/media?message="+encodeURIComponent("Conteúdo criado como rascunho."));
}

export async function transitionContent(formData:FormData){
  const supabase=await createClient(); const id=String(formData.get("contentId")??""); const action=String(formData.get("action")??"");
  const note=String(formData.get("note")??"").trim()||null; const scheduled=String(formData.get("scheduledForIso")??"").trim()||null;
  const {error}=await supabase.rpc("transition_content",{p_content_id:id,p_action:action,p_scheduled_for:scheduled,p_note:note});
  if(error)redirect("/media?message="+encodeURIComponent(error.message));
  revalidatePath("/media"); revalidatePath("/admin"); revalidatePath("/admin/aprovacoes"); refreshPublic();
}

export async function grantMediaRole(formData:FormData){
  const supabase=await createClient(); const email=String(formData.get("email")??"").trim(); const role=String(formData.get("role")??"media_editor");
  const {error}=await supabase.rpc("grant_app_role_by_email",{p_email:email,p_role:role});
  if(error)redirect("/admin/utilizadores?message="+encodeURIComponent(error.message));
  revalidatePath("/media"); revalidatePath("/admin/utilizadores"); redirect("/admin/utilizadores?message="+encodeURIComponent("Papel de mídia atribuído."));
}

export async function updateContent(formData:FormData){
  const supabase=await createClient();
  const id=String(formData.get("contentId")??"");
  const title=String(formData.get("title")??"").trim();
  const slug=slugify(String(formData.get("slug")??"")||title);
  const payload={
    title,slug,
    summary:String(formData.get("summary")??"").trim()||null,
    body:String(formData.get("body")??"").trim()||null,
    youtube_id:youtubeId(String(formData.get("youtube_id")??"")),
    event_start:String(formData.get("event_start")??"").trim()||null,
    event_end:String(formData.get("event_end")??"").trim()||null,
    event_location:String(formData.get("event_location")??"").trim()||null,
    campaign_start:String(formData.get("campaign_start")??"").trim()||null,
    campaign_end:String(formData.get("campaign_end")??"").trim()||null,
    cta_label:String(formData.get("cta_label")??"").trim()||null,
    cta_url:String(formData.get("cta_url")??"").trim()||null,
    featured:formData.get("featured")==="on",
    priority:Number(formData.get("priority")??0)||0,
    updated_at:new Date().toISOString()
  };
  const {error}=await supabase.from("content_items").update(payload).eq("id",id);
  if(error)redirect("/media?message="+encodeURIComponent(error.message));
  const networkSlug=String(formData.get("network")??"").trim();
  await supabase.from("content_item_networks").delete().eq("content_item_id",id);
  if(networkSlug){
    const {data:network}=await supabase.from("networks").select("id").eq("slug",networkSlug).maybeSingle();
    if(network)await supabase.from("content_item_networks").insert({content_item_id:id,network_id:network.id});
  }
  revalidatePath("/media"); refreshPublic();
  redirect("/media?message="+encodeURIComponent("Conteúdo atualizado."));
}
