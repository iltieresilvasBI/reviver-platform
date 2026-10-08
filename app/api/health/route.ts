import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const timestamp=new Date().toISOString();

  try{
    const supabase=await createClient();
    const {error}=await supabase.from("site_settings").select("id").eq("id",1).maybeSingle();

    if(error){
      return Response.json({
        ok:false,
        service:"reviver-platform",
        dependencies:{supabase:"unavailable"},
        timestamp,
      },{status:503,headers:{"Cache-Control":"no-store"}});
    }

    return Response.json({
      ok:true,
      service:"reviver-platform",
      dependencies:{supabase:"ok"},
      timestamp,
    },{headers:{"Cache-Control":"no-store"}});
  }catch{
    return Response.json({
      ok:false,
      service:"reviver-platform",
      dependencies:{supabase:"unavailable"},
      timestamp,
    },{status:503,headers:{"Cache-Control":"no-store"}});
  }
}
