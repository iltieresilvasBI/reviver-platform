"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function setGlobalRole(formData:FormData){
  const supabase=await createClient();
  const email=String(formData.get("email")??"");
  const role=String(formData.get("role")??"user");
  const {error}=await supabase.rpc("set_global_role_by_email",{p_email:email,p_role:role});
  if(error) redirect("/admin/utilizadores?message="+encodeURIComponent(error.message));
  revalidatePath("/admin"); revalidatePath("/admin/utilizadores"); redirect("/admin/utilizadores?message="+encodeURIComponent("Papel global atualizado."));
}


export async function setEmailVerification(formData:FormData){
  const supabase=await createClient();
  const email=String(formData.get("email")??"");
  const verified=String(formData.get("verified")??"true")==="true";
  const {error}=await supabase.rpc("set_email_verification_by_email",{p_email:email,p_verified:verified});
  if(error) redirect("/admin/utilizadores?message="+encodeURIComponent(error.message));
  revalidatePath("/admin"); revalidatePath("/admin/utilizadores");
  redirect("/admin/utilizadores?message="+encodeURIComponent(verified?"Email marcado como verificado.":"Verificação de email removida."));
}

export async function grantMediaRoleAdmin(formData:FormData){
  const supabase=await createClient();
  const email=String(formData.get("email")??"").trim();
  const role=String(formData.get("role")??"media_editor");
  const {error}=await supabase.rpc("grant_app_role_by_email",{p_email:email,p_role:role});
  if(error) redirect("/admin/utilizadores?message="+encodeURIComponent(error.message));
  revalidatePath("/media"); revalidatePath("/admin"); revalidatePath("/admin/utilizadores");
  redirect("/admin/utilizadores?message="+encodeURIComponent("Papel de mídia atribuído."));
}
