"use client";

import {useEffect,useRef,useState} from "react";

type Candidate={
  title:string;artist:string;compositionTitle:string;versionName:string;album:string;releaseYear:number|null;
  genre:string;artwork:string;previewUrl:string;duration?:number|null;source?:"deezer"|"itunes";sourceUrl?:string;
  links:{youtube?:string;youtubeSearch?:string;spotify?:string;appleMusic?:string;deezer?:string;chord?:string;lyrics?:string};
};

const empty={
  title:"",artist:"",compositionTitle:"",versionName:"",themes:"",serviceTypes:"",originalKey:"",recommendedKey:"",bpm:"",
  youtubeUrl:"",spotifyUrl:"",appleMusicUrl:"",deezerUrl:"",chordUrl:"",lyricsUrl:"",notes:""
};

export function SongAutoFillFields(){
  const [fields,setFields]=useState(empty);
  const [results,setResults]=useState<Candidate[]>([]);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [sources,setSources]=useState<{deezer:number;itunes:number}>({deezer:0,itunes:0});
  const selectedTitle=useRef("");

  function change(key:keyof typeof empty,value:string){
    setFields(current=>({...current,[key]:value}));
  }

  function apply(item:Candidate){
    selectedTitle.current=item.title;
    const sourceDetails=[
      item.album?"Álbum: "+item.album:"",
      item.releaseYear?"Ano: "+item.releaseYear:"",
      item.genre?"Género: "+item.genre:"",
    ].filter(Boolean).join(" · ");
    setFields(current=>({
      ...current,
      title:item.title||current.title,
      artist:item.artist||current.artist,
      compositionTitle:item.compositionTitle||current.compositionTitle||item.title,
      versionName:item.versionName||current.versionName,
      youtubeUrl:item.links.youtube||item.links.youtubeSearch||current.youtubeUrl,
      spotifyUrl:item.links.spotify||current.spotifyUrl,
      appleMusicUrl:item.links.appleMusic||current.appleMusicUrl,
      deezerUrl:item.links.deezer||current.deezerUrl,
      chordUrl:item.links.chord||current.chordUrl,
      lyricsUrl:item.links.lyrics||current.lyricsUrl,
      notes:current.notes||sourceDetails,
    }));
    setResults([]);
    setSources({deezer:0,itunes:0});
    setMessage("Música selecionada. Os dados disponíveis foram preenchidos; complete apenas o que faltar.");
  }

  useEffect(()=>{
    const title=fields.title.trim();
    const artist=fields.artist.trim();
    const q=[title,artist].filter(Boolean).join(" ");
    if(title.length<3){setResults([]);setSources({deezer:0,itunes:0});setMessage("");return}
    if(selectedTitle.current===title)return;
    const timer=window.setTimeout(async()=>{
      setBusy(true);setMessage("");
      try{
        const r=await fetch("/api/worship/search-song?q="+encodeURIComponent(q),{cache:"no-store"});
        const body=await r.json();
        if(!r.ok){setMessage(body.error||"Não foi possível pesquisar.");return}
        const list=(body.results??[]) as Candidate[];
        setResults(list);
        setSources(body.sources??{deezer:0,itunes:0});
        if(!list.length)setMessage("Nenhuma correspondência encontrada. Pode preencher manualmente.");
      }catch{setMessage("Não foi possível pesquisar agora. Pode preencher manualmente.");}
      finally{setBusy(false)}
    },700);
    return ()=>window.clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[fields.title,fields.artist]);

  return <>
    <div className="grid grid-2">
      <div className="field"><label>Música</label><input name="title" required value={fields.title} onChange={e=>change("title",e.target.value)} autoComplete="off"/></div>
      <div className="field"><label>Artista</label><input name="artist" value={fields.artist} onChange={e=>change("artist",e.target.value)}/></div>
    </div>

    {(busy||message||results.length>0)&&<div className="song-search-box">
      <div className="button-row" style={{justifyContent:"space-between"}}>
        <div>
          <strong>{busy?"A pesquisar Deezer e outros catálogos…":"Correspondências encontradas"}</strong>
          {!busy&&<div className="muted small" style={{marginTop:4}}>Deezer é a fonte principal · {sources.deezer} Deezer · {sources.itunes} Apple/iTunes</div>}
        </div>
        <span className="muted small">Selecione outra versão se necessário.</span>
      </div>
      {message&&<div className="notice" style={{marginTop:10}}>{message}</div>}
      {results.length>0&&<div className="song-candidates">{results.map((item,index)=><div className="song-candidate" key={item.title+"|"+item.artist+"|"+index}>
        <button type="button" className="song-candidate-main" onClick={()=>apply(item)}>
          {item.artwork?<img src={item.artwork} alt="" loading="lazy"/>:<span className="song-art-placeholder">♪</span>}
          <span><strong>{item.title}</strong><small>{item.artist}{item.album?" · "+item.album:""}{item.releaseYear?" · "+item.releaseYear:""}</small><small className="muted">{item.source==="deezer"?"Deezer":"Apple/iTunes"}{item.duration?" · "+Math.floor(item.duration/60)+":"+String(item.duration%60).padStart(2,"0"):""}</small></span>
          <span className="pill gold">Selecionar</span>
        </button>
        <div className="button-row song-candidate-links">
          {item.links.deezer&&<a className="button small" href={item.links.deezer} target="_blank" rel="noreferrer">Deezer</a>}
          {item.links.youtube&&<a className="button small" href={item.links.youtube} target="_blank" rel="noreferrer">YouTube</a>}
          {!item.links.youtube&&item.links.youtubeSearch&&<a className="button small" href={item.links.youtubeSearch} target="_blank" rel="noreferrer">Procurar no YouTube</a>}
          {item.links.spotify&&<a className="button small" href={item.links.spotify} target="_blank" rel="noreferrer">Spotify</a>}
          {item.previewUrl&&<audio controls preload="none" src={item.previewUrl} style={{height:32,maxWidth:220}} aria-label={"Prévia de "+item.title}/>} 
        </div>
      </div>)}</div>}
    </div>}

    <div className="grid grid-3">
      <div className="field"><label>Composição</label><input name="compositionTitle" value={fields.compositionTitle} onChange={e=>change("compositionTitle",e.target.value)} placeholder="Nome da composição"/></div>
      <div className="field"><label>Versão / arranjo</label><input name="versionName" value={fields.versionName} onChange={e=>change("versionName",e.target.value)} placeholder="Original / Ao vivo / Reviver"/></div>
      <div className="field"><label>Temas</label><input name="themes" value={fields.themes} onChange={e=>change("themes",e.target.value)} placeholder="Adoração, Gratidão, Missões"/></div>
    </div>

    <div className="field">
      <label>Tipo de culto / pasta</label>
      <input name="serviceTypes" list="worship-service-type-suggestions" value={fields.serviceTypes} onChange={e=>change("serviceTypes",e.target.value)} placeholder="Domingo, Ceia, Jovens, Vigília"/>
      <datalist id="worship-service-type-suggestions">
        <option value="Culto de domingo"/>
        <option value="Ceia"/>
        <option value="Jovens"/>
        <option value="Mulheres"/>
        <option value="Homens"/>
        <option value="Kids"/>
        <option value="Vigília"/>
        <option value="Oração"/>
        <option value="Evangelístico"/>
        <option value="Conferência"/>
        <option value="Especial"/>
      </datalist>
      <span className="muted small">Pode indicar mais de uma pasta separando por vírgulas.</span>
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
