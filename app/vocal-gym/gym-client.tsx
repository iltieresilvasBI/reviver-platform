"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const exercises=[
  {key:"warmup",title:"Aquecimento suave",seconds:90,desc:"Alongamento leve, postura e respiração silenciosa."},
  {key:"lip-trill",title:"Lip trill",seconds:120,desc:"Fluxo de ar estável sem pressionar a garganta."},
  {key:"humming",title:"Humming",seconds:120,desc:"Ressonância frontal com volume confortável."},
  {key:"scales",title:"Escalas",seconds:180,desc:"Subidas e descidas curtas, sem forçar extensão."},
  {key:"agility",title:"Agilidade",seconds:120,desc:"Padrões curtos e claros em andamento confortável."},
  {key:"mixed",title:"Voz mista",seconds:150,desc:"Transição progressiva, sem empurrar o registo de peito."},
  {key:"cooldown",title:"Cooldown",seconds:90,desc:"Desacelerar e voltar a uma emissão leve."},
];

export function GymClient(){
  const [idx,setIdx]=useState(0); const [left,setLeft]=useState(exercises[0].seconds); const [running,setRunning]=useState(false); const [saved,setSaved]=useState(false); const [saveError,setSaveError]=useState<string|null>(null);
  const current=exercises[idx]; const total=useMemo(()=>exercises.reduce((s,e)=>s+e.seconds,0),[]);
  useEffect(()=>{if(!running)return; const id=setInterval(()=>setLeft(v=>Math.max(0,v-1)),1000);return()=>clearInterval(id)},[running]);
  useEffect(()=>{if(left===0&&running){setRunning(false);void saveSession();}},[left,running]);
  async function saveSession(){
    const supabase=createClient();
    const {data}=await supabase.auth.getClaims();
    const userId=data?.claims?.sub;
    if(!userId){setSaved(false);setSaveError("Sessão expirada. Entra novamente para registar a prática.");return;}
    const {error}=await supabase.from("practice_sessions").insert({user_id:String(userId),exercise_key:current.key,duration_seconds:current.seconds});
    if(error){setSaved(false);setSaveError("Não foi possível registar esta sessão. Tenta novamente.");return;}
    setSaveError(null);setSaved(true);
  }
  function next(){const ni=Math.min(idx+1,exercises.length-1);setIdx(ni);setLeft(exercises[ni].seconds);setRunning(false);setSaved(false);setSaveError(null)}
  function prev(){const ni=Math.max(idx-1,0);setIdx(ni);setLeft(exercises[ni].seconds);setRunning(false);setSaved(false);setSaveError(null)}
  const pct=Math.round(((current.seconds-left)/current.seconds)*100);
  return <div className="grid grid-2">
    <section className="hero-card">
      <p className="eyebrow">EXERCÍCIO {idx+1}/{exercises.length}</p><h2>{current.title}</h2><p>{current.desc}</p>
      <div style={{fontSize:72,fontWeight:800,letterSpacing:"-.05em",margin:"24px 0"}}>{Math.floor(left/60)}:{String(left%60).padStart(2,"0")}</div>
      <div className="progress"><span style={{width:`${pct}%`}} /></div>
      <div className="button-row" style={{marginTop:20}}><button className="button" onClick={prev}>Anterior</button><button className="button primary" onClick={()=>setRunning(v=>!v)}>{running?"Pausar":"Iniciar"}</button><button className="button" onClick={next}>Seguinte</button></div>
      {saved&&<p className="notice ok" style={{marginTop:16}}>Sessão registada.</p>}
      {saveError&&<p className="notice warn" style={{marginTop:16}}>{saveError}</p>}
    </section>
    <section className="card">
      <p className="eyebrow">ROTINA COMPLETA</p><h3>{Math.round(total/60)} minutos</h3>
      <div className="list">{exercises.map((e,i)=><button key={e.key} className="list-row" style={{color:"inherit",textAlign:"left",width:"100%"}} onClick={()=>{setIdx(i);setLeft(e.seconds);setRunning(false);setSaved(false);setSaveError(null)}}><div><h3>{e.title}</h3><span className="muted small">{e.desc}</span></div><span className={i===idx?"pill gold":"pill"}>{Math.round(e.seconds/60)}m</span></button>)}</div>
      <p className="notice warn" style={{marginTop:16}}>Segurança: interrompe imediatamente se houver dor, tontura ou desconforto persistente. O afinador por microfone fica para uma fase posterior.</p>
    </section>
  </div>
}
