import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema=z.object({
  name:z.string().trim().min(1).max(120),
  email:z.string().trim().email().max(254),
  subject:z.string().trim().min(1).max(160),
  message:z.string().trim().min(10).max(3000),
  company:z.string().max(200).optional().default(""),
});

export async function POST(request:Request){
  let raw:unknown;
  try{raw=await request.json()}catch{return Response.json({ok:false,error:"Invalid request."},{status:400})}
  const parsed=schema.safeParse(raw);
  if(!parsed.success)return Response.json({ok:false,error:"Please review the form fields."},{status:400});
  if(parsed.data.company)return Response.json({ok:true});
  const supabase=await createClient();
  const {error}=await supabase.from("contact_messages").insert({
    name:parsed.data.name,
    email:parsed.data.email,
    subject:parsed.data.subject,
    message:parsed.data.message,
  });
  if(error)return Response.json({ok:false,error:"Unable to send the message."},{status:503});
  return Response.json({ok:true},{status:201,headers:{"Cache-Control":"no-store"}});
}
