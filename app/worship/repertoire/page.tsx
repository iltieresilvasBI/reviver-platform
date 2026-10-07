import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getAccessContext } from "@/lib/auth";
import { createWorshipSong, updateWorshipSong } from "../actions";

function normalise(value:string){
  return value.trim().toLocaleLowerCase("pt-PT");
}

export default async function WorshipRepertoirePage({
  searchParams,
}:{searchParams:Promise<{theme?:string;q?:string;message?:string}>}){
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
    {data:recentSchedules,error:schedulesError},
    {data:scheduleSongs,error:usageError},
  ]=await Promise.all([
    ctx.supabase.from("worship_songs").select("*").eq("active",true).order("title"),
    ctx.supabase.from("worship_schedules")
      .select("id,title,theme,starts_at,status")
      .gte("starts_at",fourMonthsAgo.toISOString())
      .lte("starts_at",now.toISOString())
      .neq("status","cancelled")
      .order("starts_at",{ascending:false}),
    ctx.supabase.from("worship_schedule_songs").select("id,schedule_id,song_id"),
  ]);

  const recentScheduleById=new Map((recentSchedules??[]).map((s:any)=>[s.id,s]));
  const usageBySong=new Map<string,{count:number;lastUsedAt:string|null;lastService:string|null}>();

  for(const row of scheduleSongs??[]){
    const schedule=recentScheduleById.get(row.schedule_id) as any;
    if(!schedule) continue;
    const current=usageBySong.get(row.song_id)??{count:0,lastUsedAt:null,lastService:null};
    current.count+=1;
    if(!current.lastUsedAt || new Date(schedule.starts_at).getTime()>new Date(current.lastUsedAt).getTime()){
      current.lastUsedAt=schedule.starts_at;
      current.lastService=schedule.title;
    }
    usageBySong.set(row.song_id,current);
  }

  const allThemes=Array.from(new Set(
    (songs??[]).flatMap((song:any)=>Array.isArray(song.themes)?song.themes:[])
      .map((theme:string)=>theme.trim())
      .filter(Boolean)
  )).sort((a,b)=>a.localeCompare(b,"pt-PT"));

  const selectedTheme=(qs.theme??"").trim();
  const query=normalise(qs.q??"");

  const filtered=(songs??[]).filter((song:any)=>{
    const themes=Array.isArray(song.themes)?song.themes:[];
    const themeMatch=!selectedTheme||themes.some((theme:string)=>normalise(theme)===normalise(selectedTheme));
    const queryMatch=!query||[song.title,song.artist,...themes].some((value:any)=>normalise(String(value??"")).includes(query));
    return themeMatch&&queryMatch;
  });

  const suggested=[...filtered].sort((a:any,b:any)=>{
    const ua=usageBySong.get(a.id)?.count??0;
    const ub=usageBySong.get(b.id)?.count??0;
    if(ua!==ub) return ua-ub;
    const la=usageBySong.get(a.id)?.lastUsedAt;
    const lb=usageBySong.get(b.id)?.lastUsedAt;
    if(!la&&lb) return -1;
    if(la&&!lb) return 1;
    if(la&&lb) return new Date(la).getTime()-new Date(lb).getTime();
    return String(a.title).localeCompare(String(b.title),"pt-PT");
  }).slice(0,5);

  const usedInPeriod=(songs??[]).filter((song:any)=>(usageBySong.get(song.id)?.count??0)>0).length;
  const neverUsed=(songs??[]).length-usedInPeriod;
  const totalExecutions=Array.from(usageBySong.values()).reduce((sum,item)=>sum+item.count,0);

  return <AppShell title="Repertório Inteligente" active="/worship" email={ctx.email}>
    {qs.message&&<div className="notice" style={{marginBottom:16}}>{qs.message}</div>}
    {(songsError||schedulesError||usageError)&&<div className="notice warn" style={{marginBottom:16}}>Alguns dados do repertório não puderam ser carregados.</div>}

    <div className="button-row" style={{marginBottom:18}}>
      <Link className="button" href="/worship">← Ministério de Louvor</Link>
      <Link className="button" href="/worship/rotacao">Rotação A/B/C/D</Link>
    </div>

    <section className="hero-card">
      <p className="eyebrow">REPERTÓRIO INTELIGENTE</p>
      <h2>Escolhe o tema do culto e vê apenas músicas adequadas.</h2>
      <p>O portal cruza temas com o histórico real dos últimos quatro meses para mostrar frequência, última utilização e sugestões com menor repetição.</p>
    </section>

    <div className="grid grid-4" style={{marginTop:18}}>
      <article className="card metric"><span>Músicas ativas</span><strong>{(songs??[]).length}</strong></article>
      <article className="card metric"><span>Temas cadastrados</span><strong>{allThemes.length}</strong></article>
      <article className="card metric"><span>Execuções em 4 meses</span><strong>{totalExecutions}</strong></article>
      <article className="card metric"><span>Sem uso em 4 meses</span><strong>{neverUsed}</strong></article>
    </div>

    <div className="section-title"><div><p className="eyebrow">FILTRO DO CULTO</p><h2>Selecionar tema</h2></div><span className="muted small">Período analisado: últimos 4 meses</span></div>
    <form method="get" className="card form-grid">
      <div className="grid grid-3">
        <div className="field">
          <label>Tema</label>
          <select name="theme" defaultValue={selectedTheme}>
            <option value="">Todos os temas</option>
            {allThemes.map(theme=><option value={theme} key={theme}>{theme}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Pesquisar música / artista</label>
          <input name="q" defaultValue={qs.q??""} placeholder="Ex.: graça, adoração, Gabriela Rocha"/>
        </div>
        <div className="field" style={{alignSelf:"end"}}>
          <div className="button-row">
            <button className="button primary" type="submit">Aplicar filtro</button>
            {(selectedTheme||query)&&<Link className="button" href="/worship/repertoire">Limpar</Link>}
          </div>
        </div>
      </div>
    </form>

    {selectedTheme&&<>
      <div className="section-title"><div><p className="eyebrow">SUGESTÃO</p><h2>Boas opções para “{selectedTheme}”</h2></div><span className="muted small">Prioriza músicas menos repetidas recentemente</span></div>
      <div className="grid grid-3">{suggested.length===0?<div className="empty">Ainda não há músicas associadas a este tema.</div>:suggested.map((song:any)=>{
        const usage=usageBySong.get(song.id);
        return <article className="card" key={song.id}>
          <span className="pill gold">sugestão</span>
          <h3>{song.title}</h3>
          <p className="muted">{song.artist||"Artista não informado"}</p>
          <div className="metric"><span>Uso nos últimos 4 meses</span><strong>{usage?.count??0}×</strong></div>
          <span className="muted small">{usage?.lastUsedAt?"Última vez: "+new Date(usage.lastUsedAt).toLocaleDateString("pt-PT"):"Sem utilização recente"}</span>
        </article>;
      })}</div>
    </>}

    <div className="section-title"><div><p className="eyebrow">BIBLIOTECA</p><h2>{selectedTheme?"Músicas: "+selectedTheme:"Todas as músicas"}</h2></div><span className="muted small">{filtered.length} resultado{filtered.length===1?"":"s"}</span></div>
    <div className="list">{filtered.length===0?<div className="empty">Nenhuma música encontrada.</div>:filtered.map((song:any)=>{
      const usage=usageBySong.get(song.id);
      const themes=Array.isArray(song.themes)?song.themes:[];
      return <details className="card" key={song.id}>
        <summary style={{cursor:"pointer"}}>
          <div className="list-row" style={{padding:0,border:0,background:"transparent"}}>
            <div>
              <div className="button-row">{themes.map((theme:string)=><span className="pill gold" key={theme}>{theme}</span>)}</div>
              <h3 style={{margin:"10px 0 4px"}}>{song.title}</h3>
              <span className="muted small">{song.artist||"Artista não informado"}{song.default_key?" · tom "+song.default_key:""}{song.bpm?" · "+song.bpm+" BPM":""}</span>
            </div>
            <div style={{textAlign:"right"}}>
              <strong style={{fontSize:24}}>{usage?.count??0}×</strong>
              <div className="muted small">em 4 meses</div>
            </div>
          </div>
        </summary>

        <div className="grid grid-2" style={{marginTop:18}}>
          <div className="card">
            <p className="eyebrow">HISTÓRICO</p>
            <h3>{usage?.count??0} utilização{(usage?.count??0)===1?"":"ões"} no período</h3>
            <p className="muted">{usage?.lastUsedAt
              ?"Última utilização: "+new Date(usage.lastUsedAt).toLocaleString("pt-PT")+(usage.lastService?" · "+usage.lastService:"")
              :"Esta música não foi usada nos últimos quatro meses."}</p>
          </div>
          <div className="card">
            <p className="eyebrow">RECURSOS</p>
            <div className="button-row">
              {song.youtube_url&&<a className="button" href={song.youtube_url} target="_blank" rel="noreferrer">YouTube</a>}
              {song.spotify_url&&<a className="button" href={song.spotify_url} target="_blank" rel="noreferrer">Spotify</a>}
              {song.apple_music_url&&<a className="button" href={song.apple_music_url} target="_blank" rel="noreferrer">Apple Music</a>}
              {song.deezer_url&&<a className="button" href={song.deezer_url} target="_blank" rel="noreferrer">Deezer</a>}
              {song.chord_url&&<a className="button" href={song.chord_url} target="_blank" rel="noreferrer">Cifra</a>}
              {song.lyrics_url&&<a className="button" href={song.lyrics_url} target="_blank" rel="noreferrer">Letra</a>}
            </div>
          </div>
        </div>

        {canLead&&<form action={updateWorshipSong} className="card form-grid" style={{marginTop:16}}>
          <input type="hidden" name="songId" value={song.id}/>
          <p className="eyebrow">EDITAR MÚSICA</p>
          <div className="grid grid-2">
            <div className="field"><label>Música</label><input name="title" defaultValue={song.title} required/></div>
            <div className="field"><label>Artista</label><input name="artist" defaultValue={song.artist??""}/></div>
          </div>
          <div className="grid grid-3">
            <div className="field"><label>Temas, separados por vírgula</label><input name="themes" defaultValue={themes.join(", ")} placeholder="Adoração, Graça, Santa Ceia"/></div>
            <div className="field"><label>Tom padrão</label><input name="defaultKey" defaultValue={song.default_key??""}/></div>
            <div className="field"><label>BPM</label><input name="bpm" type="number" min="30" max="300" defaultValue={song.bpm??""}/></div>
          </div>
          <div className="grid grid-3">
            <div className="field"><label>YouTube</label><input name="youtubeUrl" type="url" defaultValue={song.youtube_url??""}/></div>
            <div className="field"><label>Spotify</label><input name="spotifyUrl" type="url" defaultValue={song.spotify_url??""}/></div>
            <div className="field"><label>Apple Music</label><input name="appleMusicUrl" type="url" defaultValue={song.apple_music_url??""}/></div>
            <div className="field"><label>Deezer</label><input name="deezerUrl" type="url" defaultValue={song.deezer_url??""}/></div>
            <div className="field"><label>Cifra</label><input name="chordUrl" type="url" defaultValue={song.chord_url??""}/></div>
            <div className="field"><label>Letra</label><input name="lyricsUrl" type="url" defaultValue={song.lyrics_url??""}/></div>
          </div>
          <div className="field"><label>Notas</label><textarea name="notes" defaultValue={song.notes??""}/></div>
          <button className="button primary">Guardar alterações</button>
        </form>}
      </details>;
    })}</div>

    {canLead&&<>
      <div className="section-title"><div><p className="eyebrow">CATÁLOGO</p><h2>Adicionar música</h2></div></div>
      <form action={createWorshipSong} className="card form-grid">
        <div className="grid grid-2">
          <div className="field"><label>Música</label><input name="title" required/></div>
          <div className="field"><label>Artista</label><input name="artist"/></div>
        </div>
        <div className="grid grid-3">
          <div className="field"><label>Temas, separados por vírgula</label><input name="themes" placeholder="Adoração, Gratidão, Missões"/></div>
          <div className="field"><label>Tom padrão</label><input name="defaultKey" placeholder="G"/></div>
          <div className="field"><label>BPM</label><input name="bpm" type="number" min="30" max="300"/></div>
        </div>
        <div className="grid grid-3">
          <div className="field"><label>YouTube</label><input name="youtubeUrl" type="url"/></div>
          <div className="field"><label>Spotify</label><input name="spotifyUrl" type="url"/></div>
          <div className="field"><label>Apple Music</label><input name="appleMusicUrl" type="url"/></div>
          <div className="field"><label>Deezer</label><input name="deezerUrl" type="url"/></div>
          <div className="field"><label>Cifra</label><input name="chordUrl" type="url"/></div>
          <div className="field"><label>Letra</label><input name="lyricsUrl" type="url"/></div>
        </div>
        <div className="field"><label>Notas</label><textarea name="notes"/></div>
        <button className="button primary">Adicionar ao repertório</button>
      </form>
    </>}
  </AppShell>;
}
