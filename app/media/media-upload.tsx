"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function MediaUpload({contentId}:{contentId:string}){
  const [status,setStatus]=useState("");
  async function upload(file:File){
    setStatus("A enviar…");
    const supabase=createClient();
    const safe=file.name.toLowerCase().replace(/[^a-z0-9._-]+/g,"-");
    const path=`${contentId}/${crypto.randomUUID()}-${safe}`;
    const {error}=await supabase.storage.from("reviver-public").upload(path,file,{upsert:false,contentType:file.type});
    if(error){setStatus(error.message);return}
    const {data:url}=supabase.storage.from("reviver-public").getPublicUrl(path);
    const {error:rowError}=await supabase.from("content_media").insert({content_item_id:contentId,media_type:"image",storage_path:path,external_url:url.publicUrl,alt_text:file.name});
    setStatus(rowError?rowError.message:"Imagem adicionada.");
  }
  return <div><label className="button"><input type="file" accept="image/*" hidden onChange={e=>e.target.files?.[0]&&void upload(e.target.files[0])}/>Adicionar imagem</label>{status&&<span className="muted small" style={{marginLeft:8}}>{status}</span>}</div>
}
