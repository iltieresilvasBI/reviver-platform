"use client";
import { useState } from "react";
import { transitionContent } from "./actions";

export function ScheduleForm({contentId}:{contentId:string}){
  const [iso,setIso]=useState("");
  return <form action={transitionContent} className="button-row">
    <input type="hidden" name="contentId" value={contentId}/><input type="hidden" name="action" value="schedule"/><input type="hidden" name="scheduledForIso" value={iso}/>
    <input aria-label="Data de publicação" type="datetime-local" required onChange={e=>setIso(e.target.value?new Date(e.target.value).toISOString():"")} style={{background:"#0b0c0e",color:"var(--text)",border:"1px solid var(--border)",borderRadius:10,padding:"9px"}}/>
    <button className="button">Agendar</button>
  </form>
}
