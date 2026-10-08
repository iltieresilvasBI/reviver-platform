"use client";

import {useMemo,useState} from "react";
import {addSongToWorshipSchedule} from "./actions";

export type ScheduleSongCandidate={
  id:string;
  title:string;
  artist:string|null;
  defaultKey:string|null;
  recommendedKey:string|null;
  serviceTypes:string[];
  themes:string[];
  usageCount:number;
  lastUsedAt:string|null;
  folderMatch:boolean;
  themeMatches:number;
  score:number;
};

export function ScheduleSongPicker({
  scheduleId,
  serviceType,
  scheduleThemes,
  songs,
}:{
  scheduleId:string;
  serviceType:string|null;
  scheduleThemes:string[];
  songs:ScheduleSongCandidate[];
}){
  const [query,setQuery]=useState("");
  const [showAll,setShowAll]=useState(false);

  const filtered=useMemo(()=>{
    const normalized=query.trim().toLocaleLowerCase("pt-PT");
    const source=showAll?songs:songs.filter(song=>song.folderMatch||song.themeMatches>0);
    const searched=!normalized?source:source.filter(song=>{
      const haystack=[song.title,song.artist??"",...song.serviceTypes,...song.themes].join(" ").toLocaleLowerCase("pt-PT");
      return haystack.includes(normalized);
    });
    return searched.slice(0,showAll?40:16);
  },[query,showAll,songs]);

  const matchedCount=songs.filter(song=>song.folderMatch||song.themeMatches>0).length;

  return <div className="form-grid">
    <div className="list-row" style={{padding:0,border:0,background:"transparent",alignItems:"end"}}>
      <div className="field" style={{flex:1}}>
        <label>Pesquisar música</label>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Título, artista, tema ou pasta"/>
      </div>
      <button type="button" className="button" onClick={()=>setShowAll(v=>!v)}>
        {showAll?"Mostrar recomendadas":"Ver todo o repertório"}
      </button>
    </div>

    <div className="button-row">
      {serviceType&&<span className="pill gold">Culto: {serviceType}</span>}
      {scheduleThemes.map(theme=><span className="pill" key={theme}>{theme}</span>)}
      <span className="muted small">{matchedCount} música{matchedCount===1?"":"s"} com correspondência direta.</span>
    </div>

    <div className="list">
      {filtered.length===0?<div className="empty">Nenhuma música corresponde aos filtros atuais.</div>:filtered.map(song=><article className="card" key={song.id}>
        <div className="list-row" style={{padding:0,border:0,background:"transparent",alignItems:"flex-start"}}>
          <div style={{minWidth:0}}>
            <div className="button-row">
              {song.folderMatch&&<span className="pill gold">pasta ✓</span>}
              {song.themeMatches>0&&<span className="pill">{song.themeMatches} tema{song.themeMatches===1?"":"s"} ✓</span>}
              <span className="pill">{song.usageCount}× / 4 meses</span>
            </div>
            <h3 style={{margin:"10px 0 4px"}}>{song.title}</h3>
            <div className="muted small">
              {song.artist||"Artista não informado"}
              {(song.recommendedKey||song.defaultKey)?" · tom "+(song.recommendedKey||song.defaultKey):""}
              {song.lastUsedAt?" · última vez "+new Date(song.lastUsedAt).toLocaleDateString("pt-PT"):" · ainda não usada"}
            </div>
            {(song.serviceTypes.length>0||song.themes.length>0)&&<div className="muted small" style={{marginTop:6}}>
              {song.serviceTypes.length>0?"Pastas: "+song.serviceTypes.join(", "):""}
              {song.serviceTypes.length>0&&song.themes.length>0?" · ":""}
              {song.themes.length>0?"Temas: "+song.themes.join(", "):""}
            </div>}
          </div>
          <form action={addSongToWorshipSchedule} className="form-grid" style={{minWidth:220}}>
            <input type="hidden" name="scheduleId" value={scheduleId}/>
            <input type="hidden" name="songId" value={song.id}/>
            <div className="grid grid-2">
              <div className="field"><label>Posição</label><input name="position" type="number" min="1" defaultValue="1"/></div>
              <div className="field"><label>Tom</label><input name="keyOverride" defaultValue={song.recommendedKey||song.defaultKey||""}/></div>
            </div>
            <button className="button primary">Adicionar</button>
          </form>
        </div>
      </article>)}
    </div>
  </div>;
}
