import { NextRequest } from "next/server";
import { listPublishedContent, type PublicContentType } from "@/lib/public-content";
import { publicJson, publicOptions } from "@/lib/api-response";

const allowed = new Set<PublicContentType>(["home_highlight","event","video","post","campaign","gallery"]);

export async function GET(request:NextRequest){
  const {searchParams}=new URL(request.url);
  const type=searchParams.get("type") as PublicContentType|null;
  if(!type||!allowed.has(type)) return publicJson({ok:false,error:"Invalid or missing content type."},400);
  try{
    const items=await listPublishedContent(type,searchParams);
    return publicJson({ok:true,type,count:items.length,items});
  }catch{
    return publicJson({ok:false,error:"Unable to load published content."},503);
  }
}
export const OPTIONS=publicOptions;
