"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/auth";

export async function deleteResource(formData:FormData){
  const ctx=await getAccessContext();
  if(!ctx.isAdmin)redirect("/dashboard");
  const id=String(formData.get("id")||"");
  const {data:item}=await ctx.supabase.from("academy_resources").select("storage_path").eq("id",id).maybeSingle();
  if(item?.storage_path) await ctx.supabase.storage.from("academy-documents").remove([item.storage_path]);
  const {error}=await ctx.supabase.from("academy_resources").delete().eq("id",id);
  if(error)redirect("/admin/biblioteca?message="+encodeURIComponent(error.message));
  revalidatePath("/admin/biblioteca"); revalidatePath("/library");
}

export async function addExternalResource(formData:FormData){
  const ctx=await getAccessContext();
  if(!ctx.isAdmin)redirect("/dashboard");
  const title=String(formData.get("title")||"").trim();
  const external_url=String(formData.get("external_url")||"").trim();
  const description=String(formData.get("description")||"").trim()||null;
  const category=String(formData.get("category")||"Geral").trim()||"Geral";
  if(!title||!external_url)redirect("/admin/biblioteca?message="+encodeURIComponent("Título e link são obrigatórios."));
  let parsed:URL; try{parsed=new URL(external_url)}catch{redirect("/admin/biblioteca?message="+encodeURIComponent("Link inválido."))}
  if(!["http:","https:"].includes(parsed.protocol))redirect("/admin/biblioteca?message="+encodeURIComponent("O link deve usar http ou https."));
  const {error}=await ctx.supabase.from("academy_resources").insert({
    title,description,category,resource_type:"link",external_url,created_by:ctx.userId
  });
  if(error)redirect("/admin/biblioteca?message="+encodeURIComponent(error.message));
  revalidatePath("/admin/biblioteca"); revalidatePath("/library");
}
