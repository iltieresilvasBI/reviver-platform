import { NextRequest } from "next/server";
import { getAccessContext } from "@/lib/auth";

export async function GET(request:NextRequest){
  const ctx=await getAccessContext();
  const {data:network}=await ctx.supabase.from("networks").select("id").eq("slug","worship").maybeSingle();
  const {data:membership}=network?await ctx.supabase.from("network_memberships").select("role,status").eq("network_id",network.id).eq("user_id",ctx.userId).maybeSingle():{data:null as any};
  const canLead=ctx.isAdmin||(membership?.status==="active"&&membership?.role==="leader");
  if(!canLead)return Response.json({ok:false,error:"Leader access required."},{status:403});

  const input=request.nextUrl.searchParams.get("url")?.trim();
  if(!input||!/^https?:\/\//i.test(input))return Response.json({ok:false,error:"Insira um link válido de streaming."},{status:400});
  try{
    const endpoint="https://api.song.link/v1-alpha.1/links?userCountry=PT&url="+encodeURIComponent(input);
    const response=await fetch(endpoint,{headers:{"User-Agent":"ReviverPlatform/1.0"},cache:"no-store"});
    if(!response.ok)return Response.json({ok:false,error:"O serviço de links não respondeu."},{status:502});
    const data=await response.json();
    if(!data?.pageUrl||!data?.linksByPlatform)return Response.json({ok:false,error:"Não foi encontrada correspondência para este link."},{status:404});
    const p=data.linksByPlatform;
    const entity=(Object.values(data.entitiesByUniqueId??{}) as any[]).find((x:any)=>x?.title||x?.artistName) as any;
    return Response.json({
      ok:true,
      pageUrl:data.pageUrl,
      title:entity?.title??null,
      artist:entity?.artistName??null,
      links:{
        spotify:p.spotify?.url??null,
        youtube:p.youtube?.url??p.youtubeMusic?.url??null,
        appleMusic:p.appleMusic?.url??p.itunes?.url??null,
        deezer:p.deezer?.url??null
      }
    });
  }catch{
    return Response.json({ok:false,error:"Não foi possível consultar os links agora."},{status:502});
  }
}
