import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ItunesTrack={
  trackName?:string;artistName?:string;collectionName?:string;trackViewUrl?:string;
  artworkUrl100?:string;previewUrl?:string;releaseDate?:string;primaryGenreName?:string;
};

function searchLink(query:string,suffix:string){
  return "https://www.google.com/search?q="+encodeURIComponent(query+" "+suffix);
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
    const endpoint="https://itunes.apple.com/search?entity=song&limit=5&country=PT&term="+encodeURIComponent(q);
    const response=await fetch(endpoint,{cache:"no-store",headers:{"User-Agent":"ReviverPlatform/1.0"}});
    if(!response.ok)throw new Error("catalog");
    const body=await response.json() as {results?:ItunesTrack[]};
    const tracks=(body.results??[]).slice(0,5);

    const results=await Promise.all(tracks.map(async(track,index)=>{
      const baseQuery=[track.trackName,track.artistName].filter(Boolean).join(" ");
      let links:any={appleMusic:track.trackViewUrl??""};
      if(index<3&&track.trackViewUrl){
        try{
          const linked=await fetch(
            "https://api.song.link/v1-alpha.1/links?userCountry=PT&url="+encodeURIComponent(track.trackViewUrl),
            {cache:"no-store",signal:AbortSignal.timeout(5500),headers:{"User-Agent":"ReviverPlatform/1.0"}}
          );
          if(linked.ok){
            const data=await linked.json() as any;
            links={
              youtube:data.linksByPlatform?.youtube?.url??data.linksByPlatform?.youtubeMusic?.url??"",
              spotify:data.linksByPlatform?.spotify?.url??"",
              appleMusic:data.linksByPlatform?.appleMusic?.url??track.trackViewUrl??"",
              deezer:data.linksByPlatform?.deezer?.url??"",
            };
          }
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
