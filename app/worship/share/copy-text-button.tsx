"use client";

import {useState} from "react";

export function CopyTextButton({text,label}:{text:string;label:string}){
  const [copied,setCopied]=useState(false);
  return <button
    type="button"
    className="button"
    onClick={async()=>{
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(()=>setCopied(false),1800);
    }}
  >{copied?"Copiado":label}</button>;
}
