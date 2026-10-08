"use client";

import {useEffect,useRef,useState} from "react";

type Candidate={
  title:string;artist:string;compositionTitle:string;versionName:string;album:string;releaseYear:number|null;
  genre:string;artwork:string;previewUrl:string;
  links:{youtube?:string;spotify?:string;appleMusic?:string;deezer?:string;chord?:string;lyrics?:string};
};

const empty={
  title:"",artist:"",compositionTitle:"",versionName:"",themes:"",originalKey:"",recommendedKey:"",bpm:"",
  youtubeUrl:"",spotifyUrl:"",appleMusicUrl:"",deezerUrl:"",chordUrl:"",lyricsUrl:"",notes:""
};

export function SongAutoFillFields(){
  const [fields,setFields]=useState(empty);
  const [results,setResults]=useState<Candidate[]>([]);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const lastAuto=useRef("");

  function change(key:keyof typeof empty,value:string){
    setFields(current=>({...current,[key]:value}));
  }

  function apply(item:Candidate,auto=false){
    setFields(current=>({
      ...current,
      title:item.title||current.title,
      artist:item.artist||current.artist,
      compositionTitle:item.compositionTitle||current.compositionTitle||item.title,
      versionName:current.versionName,
      youtubeUrl:item.links.youtube||current.youtubeUrl,
      spotifyUrl:item.links.spotify||current.spotifyUrl,
      appleMusicUrl:item.links.appleMusic||current.appleMusicUrl,
      deezerUrl:item.links.deezer||current.deezerUrl,
      chordUrl:item.links.chord||current.chordUrl,
      lyricsUrl:item.links.lyrics||current.lyricsUrl,
    }));
    setMessage(auto
      ?"Dados encontrados e preenchidos automaticamente. Confirme se é a versão correta."
      :"Versão selecionada. Confirme os dados antes de adicionar.");
  }

  useEffect(()=>{
    const q=fields.title.trim();
    if(q.length<3){setResults([]);setMessage("");return}
    const timer=window.setTimeout(async()=>{
      setBusy(true);setMessage("");
      try{
        const r=await fetch("/api/worship/search-song?q="+encodeURIComponent(q),{cache:"no-store"});
        const body=await r.json();
        if(!r.ok){setMessage(body.error||"Não foi possível pesquisar.");return}
        const list=(body.results??[]) as Candidate[];
        setResults(list);
        if(list[0]&&lastAuto.current!==q){
          lastAuto.current=q;
          apply(list[0],true);
        }else if(!list.length){
          setMessage("Nenhuma correspondência encontrada. Pode preencher manualmente.");
        }
      }catch{setMessage("Não foi possível pesquisar agora. Pode preencher manualmente.");}
      finally{setBusy(false)}
    },700);
    return ()=>window.clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[fields.title]);

  return <>
    <div className="grid grid-2">
      <div className="field"><label>Música</label><input name="title" required value={fields.title} onChange={e=>change("title",e.target.value)} autoComplete="off"/></div>
      <div className="field"><label>Artista</label><input name="artist" value={fields.artist} onChange={e=>change("artist",e.target.value)}/></div>
    </div>

    {(busy||message||results.length>0)&&<div className="song-search-box">
      <div className="button-row" style={{justifyContent:"space-between"}}>
        <strong>{busy?"A pesquisar na internet…":"Correspondências encontradas"}</strong>
        <span className="muted small">Selecione outra versão se necessário.</span>
      </div>
      {message&&<div className="notice" style={{marginTop:10}}>{message}</div>}
      {results.length>0&&<div className="song-candidates">{results.map((item,index)=><button type="button" className="song-candidate" onClick={()=>apply(item)} key={item.title+"|"+item.artist+"|"+index}>
        {item.artwork?<img src={item.artwork} alt="" loading="lazy"/>:<span className="song-art-placeholder">♪</span>}
        <span><strong>{item.title}</strong><small>{item.artist}{item.album?" · "+item.album:""}{item.releaseYear?" · "+item.releaseYear:""}</small></span>
        <span className="pill gold">usar</span>
      </button>)}</div>}
    </div>}

    <div className="grid grid-3">
      <div className="field"><label>Composição</label><input name="compositionTitle" value={fields.compositionTitle} onChange={e=>change("compositionTitle",e.target.value)} placeholder="Nome da composição"/></div>
      <div className="field"><label>Versão / arranjo</label><input name="versionName" value={fields.versionName} onChange={e=>change("versionName",e.target.value)} placeholder="Original / Ao vivo / Reviver"/></div>
      <div className="field"><label>Temas</label><input name="themes" value={fields.themes} onChange={e=>change("themes",e.target.value)} placeholder="Adoração, Gratidão, Missões"/></div>
    </div>

    <div className="grid grid-3">
      <div className="field"><label>Tom original</label><input name="originalKey" value={fields.originalKey} onChange={e=>change("originalKey",e.target.value)}/></div>
      <div className="field"><label>Tom recomendado</label><input name="recommendedKey" value={fields.recommendedKey} onChange={e=>change("recommendedKey",e.target.value)}/></div>
      <div className="field"><label>BPM</label><input name="bpm" type="number" min="30" max="300" value={fields.bpm} onChange={e=>change("bpm",e.target.value)}/></div>
    </div>
    <p className="muted small">Tom, BPM e temas são campos ministeriais: o sistema só os preenche quando houver fonte verificável; nunca inventa valores.</p>

    <input type="hidden" name="defaultKey" value=""/>
    <div className="grid grid-3">
      <div className="field"><label>YouTube</label><input name="youtubeUrl" type="url" value={fields.youtubeUrl} onChange={e=>change("youtubeUrl",e.target.value)}/></div>
      <div className="field"><label>Spotify</label><input name="spotifyUrl" type="url" value={fields.spotifyUrl} onChange={e=>change("spotifyUrl",e.target.value)}/></div>
      <div className="field"><label>Apple Music</label><input name="appleMusicUrl" type="url" value={fields.appleMusicUrl} onChange={e=>change("appleMusicUrl",e.target.value)}/></div>
      <div className="field"><label>Deezer</label><input name="deezerUrl" type="url" value={fields.deezerUrl} onChange={e=>change("deezerUrl",e.target.value)}/></div>
      <div className="field"><label>Cifra</label><input name="chordUrl" type="url" value={fields.chordUrl} onChange={e=>change("chordUrl",e.target.value)}/></div>
      <div className="field"><label>Letra</label><input name="lyricsUrl" type="url" value={fields.lyricsUrl} onChange={e=>change("lyricsUrl",e.target.value)}/></div>
    </div>
    <div className="field"><label>Notas</label><textarea name="notes" value={fields.notes} onChange={e=>change("notes",e.target.value)}/></div>
  </>;
}
