"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/auth";

async function requireAdmin(){
  const ctx=await getAccessContext();
  if(!ctx.isAdmin) redirect("/dashboard");
  return ctx;
}

export async function toggleResource(formData:FormData){
  const ctx=await requireAdmin();
  const id=String(formData.get("id")??"");
  const active=String(formData.get("active")??"false")==="true";
  const {error}=await ctx.supabase.from("academy_resources").update({active}).eq("id",id);
  if(error) redirect("/admin/academy/resources?message="+encodeURIComponent(error.message));
  revalidatePath("/admin/academy/resources");
  revalidatePath("/academy/resources");
}

export async function deleteResource(formData:FormData){
  const ctx=await requireAdmin();
  const id=String(formData.get("id")??"");
  const {data:row,error:readError}=await ctx.supabase.from("academy_resources").select("storage_path").eq("id",id).maybeSingle();
  if(readError) redirect("/admin/academy/resources?message="+encodeURIComponent(readError.message));
  if(row?.storage_path){
    const {error:storageError}=await ctx.supabase.storage.from("academy-documents").remove([row.storage_path]);
    if(storageError) redirect("/admin/academy/resources?message="+encodeURIComponent(storageError.message));
  }
  const {error}=await ctx.supabase.from("academy_resources").delete().eq("id",id);
  if(error) redirect("/admin/academy/resources?message="+encodeURIComponent(error.message));
  revalidatePath("/admin/academy/resources");
  revalidatePath("/academy/resources");
}