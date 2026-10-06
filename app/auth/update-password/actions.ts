"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updatePassword(formData:FormData){
  const password=String(formData.get("password")??"");
  const confirm=String(formData.get("confirm_password")??"");
  if(password.length<8) redirect("/auth/update-password?message="+encodeURIComponent("A password deve ter pelo menos 8 caracteres."));
  if(password!==confirm) redirect("/auth/update-password?message="+encodeURIComponent("As passwords não coincidem."));
  const supabase=await createClient();
  const {data}=await supabase.auth.getClaims();
  if(!data?.claims?.sub) redirect("/login?message="+encodeURIComponent("A ligação de recuperação expirou. Solicita uma nova."));
  const {error}=await supabase.auth.updateUser({password});
  if(error) redirect("/auth/update-password?message="+encodeURIComponent("Não foi possível atualizar a password."));
  await supabase.auth.signOut();
  redirect("/login?message="+encodeURIComponent("Password atualizada. Inicia sessão com a nova password."));
}
