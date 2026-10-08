"use client";
import {useState} from "react";
import { saveResolvedWorshipSongLinks } from "../actions";

export function SongLinkResolver({
  songId,title,artist,current,
}:{
  songId:string;
  title:string;
  artist?:string|null;
  current:{youtube?:string|null;spotify?:string|null;appleMusic?:string|null;deezer?:string|null};
}){
  const [reference,setReference]=useState(current.spotify||current.youtube||current.appleMusic||current.deezer||"");
  const [resolved,setResolved]=useState<any>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function resolve(){
    setBusy(true);setError("");setResolved(null);
    try{
      const r=await fetch("/api/worship/resolve-song-links?url="+encodeURIComponent(reference),{cache:"no-store"});
      const body=await r.json();
      if(!r.ok){setError(body.error||"Não foi possível resolver os links.");return}
      setResolved(body);
    }catch{setError("Não foi possível consultar os links.");}
    finally{setBusy(false)}
  }
  const q=encodeURIComponent([title,artist].filter(Boolean).join(" "));
  return <div className="card form-grid" style={{marginTop:16}}>
    <p className="eyebrow">DESCOBRIR LINKS</p>
    <p className="muted small">Cole um link conhecido de Spotify, YouTube, Apple Music ou outra plataforma suportada. O portal procura equivalentes; reveja antes de gravar.</p>
    <div className="field"><label>Link de referência</label><input type="url" value={reference} onChange={e=>setReference(e.target.value)} placeholder="https://..."/></div>
    <div className="button-row"><button type="button" className="button" onClick={resolve} disabled={busy||!reference}>{busy?"A procurar…":"Procurar equivalentes"}</button><a className="button" href={"https://www.google.com/search?q="+q+"+site%3Acifraclub.com.br"} target="_blank" rel="noreferrer">Pesquisar cifra</a><a className="button" href={"https://www.google.com/search?q="+q+"+letra"} target="_blank" rel="noreferrer">Pesquisar letra</a></div>
    {error&&<div className="notice warn">{error}</div>}
    {resolved?.ok&&<form action={saveResolvedWorshipSongLinks} className="form-grid">
      <input type="hidden" name="songId" value={songId}/>
      <div className="grid grid-2">
        <div className="field"><label>YouTube</label><input name="youtubeUrl" defaultValue={resolved.links?.youtube||current.youtube||""}/></div>
        <div className="field"><label>Spotify</label><input name="spotifyUrl" defaultValue={resolved.links?.spotify||current.spotify||""}/></div>
        <div className="field"><label>Apple Music</label><input name="appleMusicUrl" defaultValue={resolved.links?.appleMusic||current.appleMusic||""}/></div>
        <div className="field"><label>Deezer</label><input name="deezerUrl" defaultValue={resolved.links?.deezer||current.deezer||""}/></div>
      </div>
      <div className="muted small">Correspondência: {resolved.title||title}{resolved.artist?" · "+resolved.artist:""}. Os links não são gravados automaticamente.</div>
      <button className="button primary">Validar e guardar estes links</button>
    </form>}
  </div>;
}
