import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getAccessContext } from "@/lib/auth";
import {
  archiveWorshipSong,createWorshipSong,setWorshipSongVisibility,updateWorshipSong
} from "../actions";
import { SongLinkResolver } from "./song-link-resolver";
import { SongAutoFillFields } from "./song-autofill";

function normalise(value:string){
  return value.trim().toLocaleLowerCase("pt-PT");
}

export default async function WorshipRepertoirePage({
  searchParams,
}:{searchParams:Promise<{theme?:string;q?:string;sort?:string;message?:string}>}){
  const qs=await searchParams;
  const ctx=await getAccessContext();

  const {data:network}=await ctx.supabase.from("networks").select("id").eq("slug","worship").maybeSingle();
  const {data:membership}=network
    ?await ctx.supabase.from("network_memberships").select("id,role,status").eq("user_id",ctx.userId).eq("network_id",network.id).maybeSingle()
    :{data:null as any};

  const canRead=ctx.isAdmin||membership?.status==="active";
  const canLead=ctx.isAdmin||(membership?.status==="active"&&membership?.role==="leader");

  if(!canRead){
    return <AppShell title="Repertório" active="/worship" email={ctx.email}>
      <section className="hero-card">
        <p className="eyebrow">REVIVER WORSHIP</p>
        <h2>Repertório reservado ao Ministério de Louvor</h2>
        <p>É necessário ter acesso ativo ao ministério para consultar músicas, temas e histórico de utilização.</p>
        <Link className="button" href="/worship">Voltar ao Louvor</Link>
      </section>
    </AppShell>;
  }

  const now=new Date();
  const fourMonthsAgo=new Date(now);
  fourMonthsAgo.setMonth(fourMonthsAgo.getMonth()-4);

  const [
    {data:songs,error:songsError},
    {data:executions,error:usageError},
    {data:themeRows,error:themesError},
  ]=await Promise.all([
    ctx.supabase.from("worship_songs").select("*").eq("active",true).is("archived_at",null).order("title"),
    ctx.supabase.from("worship_song_executions")
      .select("id,song_id,key_used,version_used,confirmed_at,worship_schedules!inner(id,title,starts_at,status)")
      .eq("worship_schedules.status","completed")
      .gte("worship_schedules.starts_at",fourMonthsAgo.toISOString())
      .lt("worship_schedules.starts_at",now.toISOString()),
    ctx.supabase.from("worship_themes").select("id,name,slug,active").eq("active",true).order("name"),
  ]);

  const usageBySong=new Map<string,{count:number;lastUsedAt:string|null;lastService:string|null;history:any[]}>();
  for(const row of executions??[]){
    const schedule=(row as any).worship_schedules;
    if(!schedule) continue;
    const current=usageBySong.get(row.song_id)??{count:0,lastUsedAt:null,lastService:null,history:[]};
    current.count+=1;
    current.history.push({scheduleId:schedule.id,title:schedule.title,startsAt:schedule.starts_at,keyUsed:row.key_used,versionUsed:row.version_used});
    if(!current.lastUsedAt||new Date(schedule.starts_at).getTime()>new Date(current.lastUsedAt).getTime()){
      current.lastUsedAt=schedule.starts_at;
      current.lastService=schedule.title;
    }
    usageBySong.set(row.song_id,current);
  }

  const configuredThemes=(themeRows??[]).map((t:any)=>t.name);
  const songThemes=(songs??[]).flatMap((song:any)=>Array.isArray(song.themes)?song.themes:[]);
  const allThemes=Array.from(new Set([...configuredThemes,...songThemes].map((x:string)=>x.trim()).filter(Boolean)))
    .sort((a,b)=>a.localeCompare(b,"pt-PT"));

  const selectedTheme=(qs.theme??"").trim();
  const query=normalise(qs.q??"");
  const sort=qs.sort??"least";

  let filtered=(songs??[]).filter((song:any)=>{
    const themes=Array.isArray(song.themes)?song.themes:[];
    const themeMatch=!selectedTheme||themes.some((theme:string)=>normalise(theme)===normalise(selectedTheme));
    const queryMatch=!query||[song.title,song.artist,song.composition_title,song.version_name,...themes]
      .some((value:any)=>normalise(String(value??"")).includes(query));
    return themeMatch&&queryMatch;
  });

  filtered=[...filtered].sort((a:any,b:any)=>{
    const ua=usageBySong.get(a.id);
    const ub=usageBySong.get(b.id);
    if(sort==="title") return String(a.title).localeCompare(String(b.title),"pt-PT");
    if(sort==="most") return (ub?.count??0)-(ua?.count??0)||String(a.title).localeCompare(String(b.title),"pt-PT");
    if(sort==="unused") return Number((ua?.count??0)>0)-Number((ub?.count??0)>0)||String(a.title).localeCompare(String(b.title),"pt-PT");
    if(sort==="oldest"){
      const da=ua?.lastUsedAt?new Date(ua.lastUsedAt).getTime():0;
      const db=ub?.lastUsedAt?new Date(ub.lastUsedAt).getTime():0;
      return da-db||String(a.title).localeCompare(String(b.title),"pt-PT");
    }
    return (ua?.count??0)-(ub?.count??0)||String(a.title).localeCompare(String(b.title),"pt-PT");
  });

  const suggested=filtered.slice(0,5);
  const usedInPeriod=(songs??[]).filter((song:any)=>(usageBySong.get(song.id)?.count??0)>0).length;
  const neverUsed=(songs??[]).length-usedInPeriod;
  const totalExecutions=Array.from(usageBySong.values()).reduce((sum,item)=>sum+item.count,0);

  return <AppShell title="Repertório Inteligente" active="/worship" email={ctx.email}>
    {qs.message&&<div className="notice" style={{marginBottom:16}}>{qs.message}</div>}
    {(songsError||usageError||themesError)&&<div className="notice warn" style={{marginBottom:16}}>Alguns dados do repertório não puderam ser carregados.</div>}

    <div className="button-row" style={{marginBottom:18}}>
      <Link className="button" href="/worship">← Ministério de Louvor</Link>
      {canLead&&<Link className="button" href="/worship/reports">Relatórios</Link>}
      {canLead&&<Link className="button" href="/worship/themes">Gerir temas</Link>}
      <Link className="button" href="/worship/rotacao">Rotação A/B/C/D</Link>
    </div>

    <section className="hero-card">
      <p className="eyebrow">REPERTÓRIO INTELIGENTE</p>
      <h2>Temas, versões e utilização real num único catálogo.</h2>
      <p>As estatísticas contam apenas execuções confirmadas em cultos concluídos. Repertório apenas planeado não entra nos totais.</p>
    </section>

    <div className="grid grid-4" style={{marginTop:18}}>
      <article className="card metric"><span>Músicas ativas</span><strong>{(songs??[]).length}</strong></article>
      <article className="card metric"><span>Temas cadastrados</span><strong>{allThemes.length}</strong></article>
      <article className="card metric"><span>Execuções em 4 meses</span><strong>{totalExecutions}</strong></article>
      <article className="card metric"><span>Sem uso em 4 meses</span><strong>{neverUsed}</strong></article>
    </div>

    <div className="section-title"><div><p className="eyebrow">FILTRO E SUGESTÃO</p><h2>Encontrar repertório</h2></div><span className="muted small">Últimos 4 meses · Europe/Lisbon</span></div>
    <form method="get" className="card form-grid">
      <div className="grid grid-3">
        <div className="field"><label>Tema</label><select name="theme" defaultValue={selectedTheme}><option value="">Todos os temas</option>{allThemes.map(theme=><option value={theme} key={theme}>{theme}</option>)}</select></div>
        <div className="field"><label>Pesquisar</label><input name="q" defaultValue={qs.q??""} placeholder="Título, artista, composição ou versão"/></div>
        <div className="field"><label>Ordenar</label><select name="sort" defaultValue={sort}><option value="least">Menos cantadas</option><option value="unused">Não cantadas</option><option value="oldest">Mais tempo sem utilização</option><option value="most">Mais cantadas</option><option value="title">Título</option></select></div>
      </div>
      <div className="button-row"><button className="button primary" type="submit">Aplicar</button>{(selectedTheme||query||sort!=="least")&&<Link className="button" href="/worship/repertoire">Limpar</Link>}</div>
    </form>

    {selectedTheme&&<>
      <div className="section-title"><div><p className="eyebrow">SUGERIR REPERTÓRIO</p><h2>Opções para “{selectedTheme}”</h2></div><span className="muted small">A sugestão nunca é publicada automaticamente.</span></div>
      <div className="grid grid-3">{suggested.length===0?<div className="empty">Não há músicas associadas a este tema. Associe uma música existente ou cadastre uma nova.</div>:suggested.map((song:any)=>{
        const usage=usageBySong.get(song.id);
        return <article className="card" key={song.id}><span className="pill gold">sugestão</span><h3>{song.title}</h3><p className="muted">{song.artist||"Artista não informado"}</p><p>{usage?.count??0}× nos últimos quatro meses.</p><span className="muted small">{usage?.lastUsedAt?"Última vez: "+new Date(usage.lastUsedAt).toLocaleDateString("pt-PT"):"Não cantada no período"}</span></article>;
      })}</div>
    </>}

    <div className="section-title"><div><p className="eyebrow">BIBLIOTECA</p><h2>{selectedTheme?"Músicas: "+selectedTheme:"Todas as músicas"}</h2></div><span className="muted small">{filtered.length} resultado{filtered.length===1?"":"s"}</span></div>
    <div className="list">{filtered.length===0?<div className="empty">Nenhuma música encontrada.</div>:filtered.map((song:any)=>{
      const usage=usageBySong.get(song.id);
      const themes=Array.isArray(song.themes)?song.themes:[];
      return <details className="card" key={song.id}>
        <summary style={{cursor:"pointer"}}>
          <div className="list-row" style={{padding:0,border:0,background:"transparent"}}>
            <div><div className="button-row">{themes.map((theme:string)=><span className="pill gold" key={theme}>{theme}</span>)}{song.public_visible&&<span className="pill ok">pública</span>}</div><h3 style={{margin:"10px 0 4px"}}>{song.title}</h3><span className="muted small">{song.artist||"Artista não informado"}{song.version_name?" · "+song.version_name:""}{song.recommended_key?" · tom "+song.recommended_key:song.default_key?" · tom "+song.default_key:""}{song.bpm?" · "+song.bpm+" BPM":""}</span></div>
            <div style={{textAlign:"right"}}><strong style={{fontSize:24}}>{usage?.count??0}×</strong><div className="muted small">em 4 meses</div></div>
          </div>
        </summary>

        <div className="grid grid-2" style={{marginTop:18}}>
          <div className="card"><p className="eyebrow">HISTÓRICO</p><h3>{usage?.count??0} culto{(usage?.count??0)===1?"":"s"} no período</h3><p className="muted">{usage?.lastUsedAt?"Última utilização: "+new Date(usage.lastUsedAt).toLocaleString("pt-PT")+(usage.lastService?" · "+usage.lastService:""):"Esta música não foi executada nos últimos quatro meses."}</p>{(usage?.history??[]).map((h:any)=><div className="muted small" key={h.scheduleId}>{new Date(h.startsAt).toLocaleDateString("pt-PT")} · {h.title}{h.versionUsed?" · "+h.versionUsed:""}{h.keyUsed?" · tom "+h.keyUsed:""}</div>)}</div>
          <div className="card"><p className="eyebrow">RECURSOS</p><div className="button-row">{song.youtube_url&&<a className="button" href={song.youtube_url} target="_blank" rel="noreferrer">YouTube</a>}{song.spotify_url&&<a className="button" href={song.spotify_url} target="_blank" rel="noreferrer">Spotify</a>}{song.apple_music_url&&<a className="button" href={song.apple_music_url} target="_blank" rel="noreferrer">Apple Music</a>}{song.deezer_url&&<a className="button" href={song.deezer_url} target="_blank" rel="noreferrer">Deezer</a>}{song.chord_url&&<a className="button" href={song.chord_url} target="_blank" rel="noreferrer">Cifra</a>}{song.lyrics_url&&<a className="button" href={song.lyrics_url} target="_blank" rel="noreferrer">Letra</a>}</div></div>
        </div>

        {canLead&&<>
          <div className="button-row" style={{marginTop:14}}>
            <form action={setWorshipSongVisibility}><input type="hidden" name="songId" value={song.id}/><input type="hidden" name="publicVisible" value={song.public_visible?"false":"true"}/><button className="button">{song.public_visible?"Retirar da área pública":"Tornar pública"}</button></form>
            <form action={archiveWorshipSong}><input type="hidden" name="songId" value={song.id}/><input type="hidden" name="archived" value="true"/><button className="button danger">Arquivar</button></form>
          </div>
          <SongLinkResolver songId={song.id} title={song.title} artist={song.artist} current={{youtube:song.youtube_url,spotify:song.spotify_url,appleMusic:song.apple_music_url,deezer:song.deezer_url}}/>
          <form action={updateWorshipSong} className="card form-grid" style={{marginTop:16}}>
            <input type="hidden" name="songId" value={song.id}/>
            <p className="eyebrow">EDITAR MÚSICA / VERSÃO</p>
            <div className="grid grid-2"><div className="field"><label>Título</label><input name="title" defaultValue={song.title} required/></div><div className="field"><label>Artista</label><input name="artist" defaultValue={song.artist??""}/></div></div>
            <div className="grid grid-3"><div className="field"><label>Composição</label><input name="compositionTitle" defaultValue={song.composition_title??song.title}/></div><div className="field"><label>Versão / arranjo</label><input name="versionName" defaultValue={song.version_name??""}/></div><div className="field"><label>Temas</label><input name="themes" defaultValue={themes.join(", ")}/></div></div>
            <div className="grid grid-3"><div className="field"><label>Tom original</label><input name="originalKey" defaultValue={song.original_key??""}/></div><div className="field"><label>Tom recomendado</label><input name="recommendedKey" defaultValue={song.recommended_key??song.default_key??""}/></div><div className="field"><label>BPM</label><input name="bpm" type="number" min="30" max="300" defaultValue={song.bpm??""}/></div></div>
            <input type="hidden" name="defaultKey" value={song.default_key??""}/>
            <div className="grid grid-3"><div className="field"><label>YouTube</label><input name="youtubeUrl" type="url" defaultValue={song.youtube_url??""}/></div><div className="field"><label>Spotify</label><input name="spotifyUrl" type="url" defaultValue={song.spotify_url??""}/></div><div className="field"><label>Apple Music</label><input name="appleMusicUrl" type="url" defaultValue={song.apple_music_url??""}/></div><div className="field"><label>Deezer</label><input name="deezerUrl" type="url" defaultValue={song.deezer_url??""}/></div><div className="field"><label>Cifra</label><input name="chordUrl" type="url" defaultValue={song.chord_url??""}/></div><div className="field"><label>Letra</label><input name="lyricsUrl" type="url" defaultValue={song.lyrics_url??""}/></div></div>
            <div className="field"><label>Notas e preparação</label><textarea name="notes" defaultValue={song.notes??""}/></div>
            <button className="button primary">Guardar alterações</button>
          </form>
        </>}
      </details>;
    })}</div>

    {canLead&&<>
      <div className="section-title"><div><p className="eyebrow">CATÁLOGO</p><h2>Adicionar música</h2></div></div>
      <form action={createWorshipSong} className="card form-grid">
        <SongAutoFillFields/>
        <button className="button primary">Adicionar ao repertório</button>
      </form>
    </>}
  </AppShell>;
}
