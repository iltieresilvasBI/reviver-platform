"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/auth";

const fields={
  hero:"hero_image_url",
  worship:"worship_image_url",
  kids:"kids_image_url",
  youth:"youth_image_url",
  women:"women_image_url",
  men:"men_image_url",
  campaign:"campaign_image_url",
  headerLogo:"header_logo_url",
  footerLogo:"footer_logo_url",
} as const;

type VisualKey=keyof typeof fields;

function safeKey(value:FormDataEntryValue|null):VisualKey|null{
  const key=String(value??"") as VisualKey;
  return Object.prototype.hasOwnProperty.call(fields,key)?key:null;
}
function safeName(name:string){
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,90)||"image";
}

export async function saveSiteVisual(formData:FormData){
  const ctx=await getAccessContext();
  if(!ctx.isAdmin) redirect("/admin/site?message="+encodeURIComponent("Apenas Admin pode alterar o visual do site."));

  const key=safeKey(formData.get("key"));
  if(!key) redirect("/admin/site?message="+encodeURIComponent("Campo visual inválido."));

  const file=formData.get("image");
  const reset=String(formData.get("reset")??"")==="1";
  const typedUrl=String(formData.get("url")??"").trim();
  let finalUrl=reset?"":typedUrl;

  if(!reset && file instanceof File && file.size>0){
    const allowed=new Set(["image/jpeg","image/png","image/webp","image/avif","image/svg+xml"]);
    if(!allowed.has(file.type)) redirect("/admin/site?message="+encodeURIComponent("Formato de imagem não permitido."));
    if(file.size>8*1024*1024) redirect("/admin/site?message="+encodeURIComponent("A imagem deve ter no máximo 8 MB."));

    const ext=safeName(file.name);
    const path=`site-visuals/${key}/${Date.now()}-${ext}`;
    const bytes=new Uint8Array(await file.arrayBuffer());
    const {error}=await ctx.supabase.storage.from("reviver-public").upload(path,bytes,{contentType:file.type,upsert:false});
    if(error) redirect("/admin/site?message="+encodeURIComponent("Falha no upload: "+error.message));
    finalUrl=ctx.supabase.storage.from("reviver-public").getPublicUrl(path).data.publicUrl;
  }

  if(finalUrl && !/^https?:\/\//i.test(finalUrl) && !finalUrl.startsWith("/")){
    redirect("/admin/site?message="+encodeURIComponent("Use uma URL http(s) válida ou envie um ficheiro."));
  }

  const column=fields[key];
  const {error}=await ctx.supabase.from("site_settings").update({
    [column]:finalUrl||null,
    updated_at:new Date().toISOString(),
    updated_by:ctx.userId,
  }).eq("id",1);
  if(error) redirect("/admin/site?message="+encodeURIComponent("Não foi possível guardar: "+error.message));

  revalidatePath("/");
  revalidatePath("/redes");
  revalidatePath("/ministerio-de-louvor");
  revalidatePath("/admin/site");
  redirect("/admin/site?message="+encodeURIComponent(finalUrl?"Imagem atualizada.":"Imagem reposta para o padrão."));
}
