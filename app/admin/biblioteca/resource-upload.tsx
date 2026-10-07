"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const allowed=[
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "text/plain"
];

function slugPart(v:string){return v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9._-]+/g,"-").replace(/^-|-$/g,"").slice(0,90)}

export function ResourceUpload(){
  const [status,setStatus]=useState("");
  const [busy,setBusy]=useState(false);

  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault(); setBusy(true); setStatus("");
    const form=e.currentTarget; const fd=new FormData(form);
    const file=fd.get("file") as File|null;
    const title=String(fd.get("title")||"").trim();
    const description=String(fd.get("description")||"").trim()||null;
    const category=String(fd.get("category")||"Geral").trim()||"Geral";
    const resource_type=String(fd.get("resource_type")||"document");
    if(!file||!file.size||!title){setStatus("Indica o título e seleciona um ficheiro.");setBusy(false);return}
    if(file.size>25*1024*1024){setStatus("O ficheiro ultrapassa o limite de 25 MB.");setBusy(false);return}
    if(!allowed.includes(file.type)){setStatus("Formato não permitido. Usa PDF, DOC/DOCX, PPT/PPTX ou TXT.");setBusy(false);return}

    const supabase=createClient();
    const path=`${new Date().getFullYear()}/${Date.now()}-${slugPart(file.name)}`;
    const {error:uploadError}=await supabase.storage.from("academy-documents").upload(path,file,{contentType:file.type,upsert:false});
    if(uploadError){setStatus(uploadError.message);setBusy(false);return}

    const {data:user}=await supabase.auth.getUser();
    const {error:rowError}=await supabase.from("academy_resources").insert({
      title,description,category,resource_type,storage_path:path,mime_type:file.type,file_size_bytes:file.size,
      created_by:user.user?.id??null
    });
    if(rowError){
      await supabase.storage.from("academy-documents").remove([path]);
      setStatus(rowError.message); setBusy(false); return;
    }
    form.reset(); setStatus("Material adicionado à biblioteca."); setBusy(false);
    window.location.reload();
  }

  return <form onSubmit={submit} className="card form-grid">
    <p className="eyebrow">NOVO MATERIAL</p>
    <div className="field"><label>Título</label><input name="title" required maxLength={180}/></div>
    <div className="field"><label>Descrição</label><textarea name="description" rows={3} maxLength={1000}/></div>
    <div className="grid grid-2">
      <div className="field"><label>Categoria</label><select name="category" defaultValue="Formação Vocal"><option>Formação Vocal</option><option>Louvor</option><option>Repertório</option><option>Técnica Vocal</option><option>Governança</option><option>Geral</option></select></div>
      <div className="field"><label>Tipo</label><select name="resource_type" defaultValue="apostila"><option value="apostila">Apostila</option><option value="guia">Guia</option><option value="document">Documento</option><option value="partitura">Partitura</option><option value="letra">Letra</option></select></div>
    </div>
    <div className="field"><label>Ficheiro</label><input name="file" type="file" required accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"/></div>
    <button className="button primary" disabled={busy}>{busy?"A enviar…":"Adicionar à biblioteca"}</button>
    {status&&<div className="notice">{status}</div>}
  </form>
}
