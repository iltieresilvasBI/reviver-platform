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
