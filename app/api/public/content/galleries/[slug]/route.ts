import { getPublishedContentBySlug } from "@/lib/public-content";
import { publicJson, publicOptions } from "@/lib/api-response";

export async function GET(_:Request,{params}:{params:Promise<{slug:string}>}){
  try{
    const {slug}=await params;
    const data=await getPublishedContentBySlug("gallery" as const,slug);
    if(!data)return publicJson({error:"Not found"},404);
    return publicJson({data});
  }catch{return publicJson({error:"Content temporarily unavailable"},503)}
}
export const OPTIONS=publicOptions;
