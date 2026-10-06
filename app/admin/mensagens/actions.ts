"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/auth";

export async function updateMessageStatus(formData:FormData){
  const ctx=await getAccessContext();
  if(!ctx.isAdmin)redirect("/dashboard");
  const id=String(formData.get("id")??"");
  const status=String(formData.get("status")??"read");
  if(!["new","read","replied","archived"].includes(status))redirect("/admin/mensagens?message="+encodeURIComponent("Estado inválido."));
  const {error}=await ctx.supabase.from("contact_messages").update({
    status,
    handled_by:ctx.userId,
    handled_at:new Date().toISOString(),
  }).eq("id",id);
  if(error)redirect("/admin/mensagens?message="+encodeURIComponent(error.message));
  revalidatePath("/admin/mensagens");
  revalidatePath("/admin");
}
