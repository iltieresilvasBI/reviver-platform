"use client";

import { useEffect, useState } from "react";

type WorshipTheme="dark"|"light";

export function WorshipThemeToggle(){
  const [theme,setTheme]=useState<WorshipTheme>("dark");

  useEffect(()=>{
    const saved=(window.localStorage.getItem("reviver-worship-theme")==="light"?"light":"dark") as WorshipTheme;
    setTheme(saved);
    document.body.dataset.worshipTheme=saved;
    return ()=>{ delete document.body.dataset.worshipTheme; };
  },[]);

  function choose(next:WorshipTheme){
    setTheme(next);
    window.localStorage.setItem("reviver-worship-theme",next);
    document.body.dataset.worshipTheme=next;
  }

  return <div className="theme-switch" role="group" aria-label="Tema visual do Louvor">
    <button type="button" className={theme==="dark"?"active":""} onClick={()=>choose("dark")} aria-pressed={theme==="dark"}>◐ Escuro</button>
    <button type="button" className={theme==="light"?"active":""} onClick={()=>choose("light")} aria-pressed={theme==="light"}>☀ Claro</button>
  </div>;
}
