"use client";
import {useMemo,useState} from "react";
import * as XLSX from "xlsx";

const fields=[
  ["","Ignorar"],
  ["fullName","Nome completo"],
  ["preferredName","Nome preferido"],
  ["email","Email"],
  ["phone","Telefone / WhatsApp"],
  ["birthDate","Data de nascimento"],
  ["groupCode","Grupo A/B/C/D"],
  ["roles","Funções"],
  ["instruments","Instrumentos"],
  ["vocalClassification","Classificação vocal"],
  ["active","Estado ativo/inativo"],
  ["joinedOn","Data de entrada"],
  ["adminNotes","Observações administrativas"],
  ["communicationOptIn","Autoriza notificações"],
  ["communicationPreference","Preferência de comunicação"],
] as const;

const aliases:Record<string,string[]>={
  fullName:["nome completo","nome","full name","full_name"],
  preferredName:["nome preferido","preferred name","preferred_name"],
  email:["email","e-mail"],
  phone:["telefone","telemóvel","telemovel","whatsapp","telefone/whatsapp","phone"],
  birthDate:["data nascimento","data de nascimento","nascimento","birth date","birth_date"],
  groupCode:["grupo","grupo a/b/c/d","group"],
  roles:["funções","funcoes","função","funcao","roles","role"],
  instruments:["instrumentos","instruments"],
  vocalClassification:["classificação vocal","classificacao vocal","voz","vocal classification"],
  active:["estado","ativo","active","status"],
  joinedOn:["data entrada","data de entrada","entrada","joined on","joined_on"],
  adminNotes:["observações administrativas","observacoes administrativas","observações","observacoes","admin notes"],
  communicationOptIn:["autoriza notificações","autoriza notificacoes","notificações","notificacoes","communication opt in"],
  communicationPreference:["preferência comunicação","preferencia comunicacao","preferência de comunicação","preferencia de comunicacao","communication preference"],
};

function norm(v:string){return v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase().replace(/\s+/g," ")}
function levenshtein(a:string,b:string){
  const m=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));
  for(let i=0;i<=a.length;i++)m[i][0]=i;
  for(let j=0;j<=b.length;j++)m[0][j]=j;
  for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)m[i][j]=Math.min(m[i-1][j]+1,m[i][j-1]+1,m[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  return m[a.length][b.length];
}
function escapeCsv(value:unknown){return '"'+String(value??"").replace(/"/g,'""')+'"'}

export function MinistryImportClient({ministries}:{ministries:{slug:string;name:string}[]}){
  const [fileName,setFileName]=useState("");
  const [headers,setHeaders]=useState<string[]>([]);
  const [rawRows,setRawRows]=useState<any[][]>([]);
  const [mapping,setMapping]=useState<Record<number,string>>({});
  const [networkSlug,setNetworkSlug]=useState("worship");
  const [mode,setMode]=useState("upsert");
  const [overwriteEmpty,setOverwriteEmpty]=useState(false);
  const [result,setResult]=useState<any>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  async function loadFile(file:File){
    setError(""); setResult(null); setFileName(file.name);
    if(!/\.(xlsx|csv)$/i.test(file.name)){setError("Use um ficheiro .xlsx ou .csv.");return}
    const buffer=await file.arrayBuffer();
    const workbook=XLSX.read(buffer,{type:"array",cellDates:false});
    const sheet=workbook.Sheets[workbook.SheetNames[0]];
    const matrix=XLSX.utils.sheet_to_json<any[]>(sheet,{header:1,defval:"",raw:false});
    if(matrix.length<2){setError("O ficheiro precisa de cabeçalho e pelo menos uma linha.");return}
    const h=(matrix[0]??[]).map((v:any)=>String(v??"").trim());
    const rows=matrix.slice(1).filter((row:any[])=>row.some(v=>String(v??"").trim()!==""));
    setHeaders(h); setRawRows(rows.slice(0,1000));
    const auto:Record<number,string>={};
    h.forEach((header,i)=>{
      const n=norm(header);
      for(const [field,names] of Object.entries(aliases)){
        if(names.some(x=>norm(x)===n)){auto[i]=field;break}
      }
    });
    setMapping(auto);
  }

  const preview=useMemo(()=>rawRows.map((row,index)=>{
    const out:any={rowNumber:index+2};
    Object.entries(mapping).forEach(([i,field])=>{if(field)out[field]=row[Number(i)]??""});
    return out;
  }),[rawRows,mapping]);

  const warnings=useMemo(()=>{
    const list:string[]=[];
    const names=preview.map(r=>String(r.fullName??"").trim()).filter(Boolean);
    for(let i=0;i<names.length;i++)for(let j=i+1;j<names.length;j++){
      const a=norm(names[i]),b=norm(names[j]);
      if(a===b) list.push('Nome repetido no ficheiro: "'+names[i]+'".');
      else if(Math.max(a.length,b.length)>=5&&levenshtein(a,b)<=2) list.push('Nomes semelhantes: "'+names[i]+'" e "'+names[j]+'". Reveja antes de importar.');
      if(list.length>=8)return list;
    }
    return list;
  },[preview]);

  async function submit(){
    setError("");setResult(null);
    if(!preview.length){setError("Carregue um ficheiro primeiro.");return}
    if(!preview.every(r=>String(r.fullName??"").trim())){setError("Associe a coluna de Nome completo e confirme que todas as linhas têm nome.");return}
    setBusy(true);
    try{
      const response=await fetch("/api/ministry/import",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({networkSlug,mode,overwriteEmpty,sourceName:fileName,rows:preview})});
      const body=await response.json();
      setResult(body);
      if(!response.ok)setError(body.error||"A importação falhou.");
    }catch{setError("Não foi possível processar a importação.");}
    finally{setBusy(false)}
  }

  function downloadRejected(){
    const rejected=result?.rejected??[];
    if(!rejected.length)return;
    const csv="Linha,Nome,Motivo\n"+rejected.map((r:any)=>[r.rowNumber,r.name,r.reason].map(escapeCsv).join(",")).join("\n");
    const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="registos-rejeitados.csv";a.click();URL.revokeObjectURL(url);
  }

  return <div className="form-grid">
    <div className="grid grid-3">
      <div className="field"><label>Ministério</label><select value={networkSlug} onChange={e=>setNetworkSlug(e.target.value)}>{ministries.map(m=><option value={m.slug} key={m.slug}>{m.name}</option>)}</select></div>
      <div className="field"><label>Modo</label><select value={mode} onChange={e=>setMode(e.target.value)}><option value="upsert">Criar e atualizar</option><option value="create">Apenas criar novos</option><option value="update">Apenas atualizar existentes</option></select></div>
      <div className="field"><label>Ficheiro</label><input type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={e=>{const file=e.target.files?.[0];if(file)void loadFile(file)}}/></div>
    </div>
    <label className="button-row"><input type="checkbox" checked={overwriteEmpty} onChange={e=>setOverwriteEmpty(e.target.checked)}/> Permitir que células vazias apaguem dados existentes</label>
    {error&&<div className="notice warn">{error}</div>}
    {headers.length>0&&<>
      <div className="section-title"><div><p className="eyebrow">ASSOCIAR COLUNAS</p><h2>Mapeamento</h2></div></div>
      <div className="grid grid-3">{headers.map((header,i)=><div className="field" key={i}><label>{header||"Coluna "+(i+1)}</label><select value={mapping[i]??""} onChange={e=>setMapping({...mapping,[i]:e.target.value})}>{fields.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></div>)}</div>
      {warnings.length>0&&<div className="notice warn"><strong>Revisão recomendada:</strong><ul>{warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></div>}
      <div className="section-title"><div><p className="eyebrow">PRÉ-VISUALIZAÇÃO</p><h2>{preview.length} registo{preview.length===1?"":"s"}</h2></div><span className="muted small">Mostrando até 10 linhas</span></div>
      <div className="list">{preview.slice(0,10).map((row:any)=><div className="list-row" key={row.rowNumber}><div><strong>{row.fullName||"Sem nome"}</strong><div className="muted small">{[row.email,row.phone,row.groupCode,row.roles].filter(Boolean).join(" · ")}</div></div><span className="pill">linha {row.rowNumber}</span></div>)}</div>
      <button className="button primary" onClick={submit} disabled={busy}>{busy?"A importar…":"Confirmar importação"}</button>
    </>}
    {result?.ok&&<div className="notice ok"><strong>Importação concluída:</strong> {result.acceptedCount} aceite{result.acceptedCount===1?"":"s"} · {result.rejectedCount} rejeitado{result.rejectedCount===1?"":"s"}.{result.rejectedCount>0&&<button className="button" onClick={downloadRejected} style={{marginLeft:12}}>Descarregar rejeitados</button>}</div>}
  </div>;
}
