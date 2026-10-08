import { getAccessContext } from "@/lib/auth";

function esc(value:unknown){
  return String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
}
function line(text:string,x:number,y:number,size=30,weight=400){
  return `<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}" fill="#f4efe6">${esc(text)}</text>`;
}
function roleLabel(value:string|null|undefined){
  const map:Record<string,string>={cantor_principal:"Cantor principal",backing_vocal:"Backing vocal",violao:"Violão",guitarra:"Guitarra",baixo:"Baixo",bateria:"Bateria",teclado:"Teclado/Piano",tecnico_som:"Técnico de som",iluminacao:"Iluminação"};
  return map[value??""]??value??"Função";
}

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const ctx=await getAccessContext();
  const {data:network}=await ctx.supabase.from("networks").select("id").eq("slug","worship").maybeSingle();
  const {data:membership}=network?await ctx.supabase.from("network_memberships").select("role,status").eq("network_id",network.id).eq("user_id",ctx.userId).maybeSingle():{data:null as any};
  const canLead=ctx.isAdmin||(membership?.status==="active"&&membership?.role==="leader");
  if(!canLead)return new Response("Forbidden",{status:403});

  const [{data:schedule},{data:setlist},{data:assignments},{data:rehearsal},{data:directory}]=await Promise.all([
    ctx.supabase.from("worship_schedules").select("id,title,starts_at,call_time,group_code,themes,location").eq("id",id).maybeSingle(),
    ctx.supabase.from("worship_schedule_songs").select("position,key_override,worship_songs(title,default_key,recommended_key)").eq("schedule_id",id).order("position"),
    ctx.supabase.from("worship_schedule_members").select("membership_id,role").eq("schedule_id",id),
    ctx.supabase.from("worship_rehearsals").select("starts_at,location").eq("schedule_id",id).maybeSingle(),
    ctx.supabase.rpc("worship_member_directory"),
  ]);
  if(!schedule)return new Response("Not found",{status:404});
  const people=new Map((directory??[]).map((p:any)=>[p.membership_id,p]));

  const height=Math.max(1100,560+(setlist??[]).length*58+(assignments??[]).length*54);
  let y=105;
  const parts=[
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${height}" viewBox="0 0 1200 ${height}">`,
    `<rect width="1200" height="${height}" fill="#0b0c0e"/><rect x="55" y="55" width="1090" height="${height-110}" rx="28" fill="#15181d" stroke="#d8a84e" stroke-width="2"/>`,
    `<circle cx="1025" cy="125" r="54" fill="#d8a84e" opacity="0.12"/>`,
    `<path d="M1025 91 L1025 159 M991 125 L1059 125" stroke="#d8a84e" stroke-width="7" stroke-linecap="round"/>`,
    line("IGREJA REVIVER",90,y,24,700),
    line("MINISTÉRIO DE LOUVOR",90,y+34,18,400)
  ];
  y+=34;
  y+=68; parts.push(line(schedule.title,90,y,50,700));
  y+=50; parts.push(line(new Date(schedule.starts_at).toLocaleString("pt-PT",{dateStyle:"full",timeStyle:"short",timeZone:"Europe/Lisbon"}),90,y,26));
  y+=42; parts.push(line("Grupo "+(schedule.group_code??"—")+" · "+((schedule.themes??[]).join(" / ")||"Tema por definir"),90,y,25));
  if(schedule.location){y+=38;parts.push(line("Local: "+schedule.location,90,y,24))}
  if(schedule.call_time){y+=38;parts.push(line("Chegada: "+new Date(schedule.call_time).toLocaleString("pt-PT",{timeZone:"Europe/Lisbon"}),90,y,24))}
  if(rehearsal?.starts_at){y+=38;parts.push(line("Ensaio: "+new Date(rehearsal.starts_at).toLocaleString("pt-PT",{timeZone:"Europe/Lisbon"})+(rehearsal.location?" · "+rehearsal.location:""),90,y,24))}

  y+=72; parts.push(`<line x1="90" y1="${y-22}" x2="1110" y2="${y-22}" stroke="#343840" stroke-width="2"/>`); parts.push(line("REPERTÓRIO",90,y,26,700)); y+=42;
  if(!(setlist??[]).length){parts.push(line("Ainda não definido",100,y,24));y+=42}
  for(const row of setlist??[]){
    const song=(row as any).worship_songs;
    const key=(row as any).key_override||song?.recommended_key||song?.default_key||"—";
    parts.push(line(String((row as any).position)+". "+(song?.title??"Música")+" · tom "+key,100,y,25));y+=48;
  }

  y+=28; parts.push(`<line x1="90" y1="${y-22}" x2="1110" y2="${y-22}" stroke="#343840" stroke-width="2"/>`); parts.push(line("EQUIPA",90,y,26,700)); y+=42;
  if(!(assignments??[]).length){parts.push(line("Ainda não definida",100,y,24));y+=42}
  for(const row of assignments??[]){
    const person=people.get((row as any).membership_id) as any;
    const name=person?.display_name||person?.email||"Membro";
    parts.push(line(name+" · "+roleLabel((row as any).role),100,y,25));y+=46;
  }
  y+=35;parts.push(`<line x1="90" y1="${y-18}" x2="1110" y2="${y-18}" stroke="#343840" stroke-width="2"/>`);parts.push(line("Confirmações e alterações: Portal Reviver",90,y,20,400));
  parts.push("</svg>");
  const download=new URL(request.url).searchParams.get("download")==="1";
  const disposition=(download?"attachment":"inline")+'; filename="escala-reviver.svg"';
  return new Response(parts.join(""),{headers:{"Content-Type":"image/svg+xml; charset=utf-8","Content-Disposition":disposition,"Cache-Control":"no-store"}});
}
