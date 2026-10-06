"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function setGlobalRole(formData:FormData){
  const supabase=await createClient();
  const email=String(formData.get("email")??"");
  const role=String(formData.get("role")??"user");
  const {error}=await supabase.rpc("set_global_role_by_email",{p_email:email,p_role:role});
  if(error) redirect("/admin?message="+encodeURIComponent(error.message));
  revalidatePath("/admin"); redirect("/admin?message=Papel global atualizado.");
}
