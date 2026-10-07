"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const allowedTypes=[
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "text/plain",
];

export function AcademyResourceUpload(){
  const [status,setStatus]=useState("");
  const [busy,setBusy]=useState(false);

  async function upload(form:HTMLFormElement){
    const fd=new FormData(form);
    const file=fd.get("file");
    if(!(file instanceof File)||!file.size){setStatus("Seleciona um ficheiro.");return}
    if(file.size>25*1024*1024){setStatus("Limite: 25 MB.");return}
    if(file.type&&!allowedTypes.includes(file.type)){setStatus("Formato não permitido.");return}

    setBusy(true); setStatus("A enviar…");
    const supabase=createClient();
    const safe=file.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9._-]+/g,"-");
    const path=`${new Date().getFullYear()}/${crypto.randomUUID()}-${safe}`;
    const {error:uploadError}=await supabase.storage.from("academy-documents").upload(path,file,{upsert:false,contentType:file.type||undefined});
    if(uploadError){setStatus(uploadError.message);setBusy(false);return}

    const payload={
      title:String(fd.get("title")||file.name).trim(),
      description:String(fd.get("description")||"").trim()||null,
      category:String(fd.get("category")||"Geral").trim()||"Geral",
      resource_type:String(fd.get("resourceType")||"document"),
      storage_path:path,
      external_url:null,
      mime_type:file.type||null,
      file_size_bytes:file.size,
      active:true,
    };
    const {error:rowError}=await supabase.from("academy_resources").insert(payload);
    if(rowError){
      await supabase.storage.from("academy-documents").remove([path]);
      setStatus(rowError.message);setBusy(false);return
    }
    form.reset();
    setStatus("Recurso adicionado.");
    setBusy(false);
    window.location.reload();
  }

  return <form className="card form-grid" onSubmit={e=>{e.preventDefault();void upload(e.currentTarget)}}>
    <p className="eyebrow">NOVO RECURSO</p>
    <div className="grid grid-2">
      <div className="field"><label>Título</label><input name="title" required/></div>
      <div className="field"><label>Categoria</label><select name="category" defaultValue="Geral"><option>Geral</option><option>Voz</option><option>Backing Vocals</option><option>Violão</option><option>Guitarra</option><option>Baixo</option><option>Bateria</option><option>Teclado / Piano</option><option>Iluminação</option><option>Behringer X32</option></select></div>
    </div>
    <div className="field"><label>Descrição</label><textarea name="description"/></div>
    <div className="grid grid-2">
      <div className="field"><label>Tipo</label><select name="resourceType" defaultValue="document"><option value="document">Documento</option><option value="apostila">Apostila</option><option value="guia">Guia</option><option value="partitura">Partitura</option><option value="letra">Letra</option></select></div>
      <div className="field"><label>Ficheiro</label><input name="file" type="file" required accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"/></div>
    </div>
    <div className="button-row"><button disabled={busy} className="button primary">{busy?"A enviar…":"Adicionar ao repositório"}</button>{status&&<span className="muted small">{status}</span>}</div>
  </form>
}
