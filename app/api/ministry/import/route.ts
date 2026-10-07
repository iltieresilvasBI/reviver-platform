import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ImportRow={
  rowNumber:number;
  fullName:string;
  preferredName?:string;
  email?:string;
  phone?:string;
  birthDate?:string;
  groupCode?:string;
  roles?:string;
  instruments?:string;
  vocalClassification?:string;
  active?:string|boolean;
  joinedOn?:string;
  adminNotes?:string;
  communicationOptIn?:string|boolean;
  communicationPreference?:string;
};

function csvList(value:unknown){
  return String(value??"").split(/[,;|]/).map(v=>v.trim()).filter(Boolean).slice(0,20);
}
function boolValue(value:unknown):boolean|null{
  const v=String(value??"").trim().toLowerCase();
  if(!v) return null;
  if(["1","true","sim","yes","ativo","ativa"].includes(v)) return true;
  if(["0","false","não","nao","no","inativo","inativa"].includes(v)) return false;
  return null;
}
function dateValue(value:unknown){
  const v=String(value??"").trim();
  if(!v) return null;
  const iso=/^\d{4}-\d{2}-\d{2}$/.test(v)?v:null;
  if(iso) return iso;
  const m=v.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if(m) return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
  return "INVALID";
}

export async function POST(request:NextRequest){
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  const uid=claims?.claims?.sub;
  if(!uid) return Response.json({ok:false,error:"Authentication required."},{status:401});

  let payload:any;
  try{payload=await request.json();}catch{return Response.json({ok:false,error:"Invalid payload."},{status:400});}
  const networkSlug=String(payload.networkSlug??"").trim();
  const mode=String(payload.mode??"upsert");
  const overwriteEmpty=Boolean(payload.overwriteEmpty);
  const rows=(Array.isArray(payload.rows)?payload.rows:[]) as ImportRow[];
  if(!networkSlug||!["create","update","upsert"].includes(mode)||!rows.length||rows.length>1000){
    return Response.json({ok:false,error:"Invalid import parameters."},{status:400});
  }

  const {data:network}=await supabase.from("networks").select("id,slug,name").eq("slug",networkSlug).eq("active",true).maybeSingle();
  if(!network) return Response.json({ok:false,error:"Ministry not found."},{status:404});

  const accepted:any[]=[];
  const rejected:any[]=[];
  for(const row of rows){
    const birthDate=dateValue(row.birthDate);
    const joinedOn=dateValue(row.joinedOn);
    if(birthDate==="INVALID"||joinedOn==="INVALID"){
      rejected.push({rowNumber:row.rowNumber,name:row.fullName||"",reason:"Data inválida. Use AAAA-MM-DD ou DD/MM/AAAA."});
      continue;
    }
    const {data,error}=await supabase.rpc("upsert_ministry_person",{
      p_network_slug:networkSlug,
      p_mode:mode,
      p_overwrite_empty:overwriteEmpty,
      p_full_name:String(row.fullName??""),
      p_preferred_name:String(row.preferredName??"")||null,
      p_email:String(row.email??"")||null,
      p_phone:String(row.phone??"")||null,
      p_birth_date:birthDate,
      p_group_code:String(row.groupCode??"").trim().toUpperCase()||null,
      p_roles:csvList(row.roles),
      p_instruments:csvList(row.instruments),
      p_vocal_classification:String(row.vocalClassification??"")||null,
      p_active:boolValue(row.active),
      p_joined_on:joinedOn,
      p_admin_notes:String(row.adminNotes??"")||null,
      p_communication_opt_in:boolValue(row.communicationOptIn),
      p_communication_preference:String(row.communicationPreference??"")||null,
    });
    if(error) rejected.push({rowNumber:row.rowNumber,name:row.fullName||"",reason:error.message});
    else accepted.push({rowNumber:row.rowNumber,name:row.fullName||"",result:data});
  }

  const {error:batchError}=await supabase.from("ministry_import_batches").insert({
    network_id:network.id,
    imported_by:String(uid),
    source_name:String(payload.sourceName??"").slice(0,255)||null,
    mode,
    total_rows:rows.length,
    accepted_rows:accepted.length,
    rejected_rows:rejected.length
  });
  if(batchError) return Response.json({ok:false,error:batchError.message,accepted,rejected},{status:403});

  return Response.json({ok:true,acceptedCount:accepted.length,rejectedCount:rejected.length,accepted,rejected});
}
