import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type DeezerTrack={
  title?:string;title_short?:string;link?:string;preview?:string;duration?:number;
  artist?:{name?:string};album?:{title?:string;cover_medium?:string;cover_big?:string};
};

type ItunesTrack={
  trackName?:string;artistName?:string;collectionName?:string;trackViewUrl?:string;
  artworkUrl100?:string;previewUrl?:string;releaseDate?:string;primaryGenreName?:string;
};

function searchLink(query:string,suffix:string){
  return "https://www.google.com/search?q="+encodeURIComponent(query+" "+suffix);
}

function youtubeSearch(query:string){
  return "https://www.youtube.com/results?search_query="+encodeURIComponent(query);
}

function normalise(value:string){
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
}

export async function GET(request:Request){
  const url=new URL(request.url);
  const q=(url.searchParams.get("q")??"").trim();
  if(q.length<3)return NextResponse.json({error:"Indique pelo menos 3 caracteres."},{status:400});

  const supabase=await createClient();
  const {data:claimsData}=await supabase.auth.getClaims();
  const userId=claimsData?.claims?.sub?String(claimsData.claims.sub):"";
  if(!userId)return NextResponse.json({error:"Sessão necessária."},{status:401});

  const [{data:profile},{data:network}]=await Promise.all([
    supabase.from("profiles").select("global_role").eq("id",userId).maybeSingle(),
    supabase.from("networks").select("id").eq("slug","worship").maybeSingle(),
  ]);
  const {data:membership}=network
    ?await supabase.from("network_memberships").select("role,status").eq("user_id",userId).eq("network_id",network.id).maybeSingle()
    :{data:null as any};
  const canLead=profile?.global_role==="admin"||(membership?.status==="active"&&membership?.role==="leader");
  if(!canLead)return NextResponse.json({error:"Apenas gestão do Louvor pode pesquisar e cadastrar músicas."},{status:403});

  try{
    const [deezerResponse,itunesResponse]=await Promise.all([
      fetch("https://api.deezer.com/search?q="+encodeURIComponent(q)+"&limit=8",{cache:"no-store",signal:AbortSignal.timeout(6500),headers:{"User-Agent":"ReviverPlatform/1.0"}}),
      fetch("https://itunes.apple.com/search?entity=song&limit=6&country=PT&term="+encodeURIComponent(q),{cache:"no-store",signal:AbortSignal.timeout(6500),headers:{"User-Agent":"ReviverPlatform/1.0"}})
    ]);

    const deezerBody=deezerResponse.ok?await deezerResponse.json() as {data?:DeezerTrack[]}:{data:[]};
    const itunesBody=itunesResponse.ok?await itunesResponse.json() as {results?:ItunesTrack[]}:{results:[]};

    const deezerTracks=(deezerBody.data??[]).slice(0,8);
    const itunesTracks=(itunesBody.results??[]).slice(0,6);

    const deezerResults=await Promise.all(deezerTracks.map(async(track,index)=>{
      const title=track.title_short??track.title??q;
      const artist=track.artist?.name??"";
      const baseQuery=[title,artist].filter(Boolean).join(" ");
      let links:any={deezer:track.link??"",youtubeSearch:youtubeSearch(baseQuery)};
      if(index<5&&track.link){
        try{
          const linked=await fetch("https://api.song.link/v1-alpha.1/links?userCountry=PT&url="+encodeURIComponent(track.link),{cache:"no-store",signal:AbortSignal.timeout(5500),headers:{"User-Agent":"ReviverPlatform/1.0"}});
          if(linked.ok){
            const data=await linked.json() as any;
            links={
              youtube:data.linksByPlatform?.youtube?.url??data.linksByPlatform?.youtubeMusic?.url??"",
              youtubeSearch:youtubeSearch(baseQuery),
              spotify:data.linksByPlatform?.spotify?.url??"",
              appleMusic:data.linksByPlatform?.appleMusic?.url??"",
              deezer:data.linksByPlatform?.deezer?.url??track.link??"",
            };
          }
        }catch{}
      }
      return {
        title,artist,compositionTitle:title,versionName:"",
        album:track.album?.title??"",releaseYear:null,genre:"",
        artwork:track.album?.cover_big??track.album?.cover_medium??"",
        previewUrl:track.preview??"",duration:track.duration??null,
        source:"deezer",sourceUrl:track.link??"",
        links:{...links,chord:searchLink(baseQuery,"site:cifraclub.com.br cifra"),lyrics:searchLink(baseQuery,"letra")}
      };
    }));

    const itunesResults=await Promise.all(itunesTracks.map(async(track,index)=>{
      const title=track.trackName??q;
      const artist=track.artistName??"";
      const baseQuery=[title,artist].filter(Boolean).join(" ");
      let links:any={appleMusic:track.trackViewUrl??"",youtubeSearch:youtubeSearch(baseQuery)};
      if(index<3&&track.trackViewUrl){
        try{
          const linked=await fetch("https://api.song.link/v1-alpha.1/links?userCountry=PT&url="+encodeURIComponent(track.trackViewUrl),{cache:"no-store",signal:AbortSignal.timeout(5500),headers:{"User-Agent":"ReviverPlatform/1.0"}});
          if(linked.ok){
            const data=await linked.json() as any;
            links={
              youtube:data.linksByPlatform?.youtube?.url??data.linksByPlatform?.youtubeMusic?.url??"",
              youtubeSearch:youtubeSearch(baseQuery),
              spotify:data.linksByPlatform?.spotify?.url??"",
              appleMusic:data.linksByPlatform?.appleMusic?.url??track.trackViewUrl??"",
              deezer:data.linksByPlatform?.deezer?.url??"",
            };
          }
        }catch{}
      }
      return {
        title,artist,compositionTitle:title,versionName:"",
        album:track.collectionName??"",
        releaseYear:track.releaseDate?new Date(track.releaseDate).getUTCFullYear():null,
        genre:track.primaryGenreName??"",
        artwork:track.artworkUrl100?.replace("100x100bb","300x300bb")??"",
        previewUrl:track.previewUrl??"",duration:null,source:"itunes",sourceUrl:track.trackViewUrl??"",
        links:{...links,chord:searchLink(baseQuery,"site:cifraclub.com.br cifra"),lyrics:searchLink(baseQuery,"letra")}
      };
    }));

    const seen=new Set<string>();
    const results=[...deezerResults,...itunesResults].filter((item:any)=>{
      const key=normalise(item.title)+"|"+normalise(item.artist);
      if(!key||seen.has(key))return false;
      seen.add(key);
      return true;
    }).slice(0,10);

    if(!results.length)return NextResponse.json({error:"Nenhuma correspondência encontrada nos catálogos musicais."},{status:404});
    return NextResponse.json({ok:true,query:q,sources:{deezer:deezerResults.length,itunes:itunesResults.length},results});
  }catch{}
      }
      return {
        title:track.trackName??q,
        artist:track.artistName??"",
        compositionTitle:track.trackName??q,
        versionName:"",
        album:track.collectionName??"",
        releaseYear:track.releaseDate?new Date(track.releaseDate).getUTCFullYear():null,
        genre:track.primaryGenreName??"",
        artwork:track.artworkUrl100?.replace("100x100bb","300x300bb")??"",
        previewUrl:track.previewUrl??"",
        links:{
          ...links,
          chord:searchLink(baseQuery,"site:cifraclub.com.br cifra"),
          lyrics:searchLink(baseQuery,"letra"),
        }
      };
    }));

    return NextResponse.json({ok:true,query:q,results});
  }catch{
    return NextResponse.json({error:"Não foi possível consultar o catálogo musical agora."},{status:502});
  }
}
