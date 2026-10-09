import { getAccessContext } from "@/lib/auth";

function csvCell(value:unknown){
  const text=String(value??"");
  const safe=/^[=+\-@\t\r]/.test(text)?"'"+text:text;
  return '"'+safe.replace(/"/g,'""')+'"';
}

export async function GET(request:Request){
  const ctx=await getAccessContext();
  const {data:network}=await ctx.supabase.from("networks").select("id").eq("slug","worship").maybeSingle();
  const {data:membership}=network?await ctx.supabase.from("network_memberships").select("role,status").eq("user_id",ctx.userId).eq("network_id",network.id).maybeSingle():{data:null as any};
  const canLead=ctx.isAdmin||(membership?.status==="active"&&membership?.role==="leader");
  if(!canLead) return new Response("Forbidden",{status:403});

  const url=new URL(request.url);
  const from=url.searchParams.get("from");
  const to=url.searchParams.get("to");
  let query=ctx.supabase.from("worship_song_executions")
    .select("key_used,version_used,worship_songs!inner(title,artist,themes),worship_schedules!inner(title,service_type,starts_at,status)")
    .eq("worship_schedules.status","completed");
  if(from) query=query.gte("worship_schedules.starts_at",new Date(from+"T00:00:00").toISOString());
  if(to) query=query.lte("worship_schedules.starts_at",new Date(to+"T23:59:59").toISOString());
  const {data,error}=await query;
  if(error) return new Response("Unable to export",{status:503});

  const theme=(url.searchParams.get("theme")??"").toLocaleLowerCase("pt-PT");
  const serviceType=(url.searchParams.get("serviceType")??"").toLocaleLowerCase("pt-PT");
  const q=(url.searchParams.get("q")??"").toLocaleLowerCase("pt-PT");
  const rows=(data??[]).filter((row:any)=>{
    const song=row.worship_songs;
    return (!theme||(song?.themes??[]).some((t:string)=>t.toLocaleLowerCase("pt-PT")===theme))
      &&(!serviceType||String(row.worship_schedules?.service_type??"").toLocaleLowerCase("pt-PT").includes(serviceType))
      &&(!q||[song?.title,song?.artist].some((x:any)=>String(x??"").toLocaleLowerCase("pt-PT").includes(q)));
  });
  const lines=[["Data","Culto","Tipo","Música","Artista","Versão","Tom","Temas"].map(csvCell).join(",")];
  for(const row of rows as any[]){
    lines.push([
      row.worship_schedules?.starts_at?new Date(row.worship_schedules.starts_at).toLocaleString("pt-PT",{timeZone:"Europe/Lisbon"}):"",
      row.worship_schedules?.title,row.worship_schedules?.service_type,row.worship_songs?.title,row.worship_songs?.artist,row.version_used,row.key_used,(row.worship_songs?.themes??[]).join(" | ")
    ].map(csvCell).join(","));
  }
  return new Response("\uFEFF"+lines.join("\n"),{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="reviver-repertorio.csv"',"Cache-Control":"no-store"}});
}
