"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData:FormData){
  const supabase=await createClient(); const {data}=await supabase.auth.getClaims(); const uid=data?.claims?.sub;
  if(!uid)return;
  const display_name=String(formData.get("display_name")??"").trim()||null;
  const phone=String(formData.get("phone")??"").trim()||null;
  await supabase.from("profiles").update({display_name,phone,updated_at:new Date().toISOString()}).eq("id",String(uid));
  revalidatePath("/profile");
}
