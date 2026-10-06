import { getSiteDynamicData } from "@/lib/site-data";
import { publicJson, publicOptions } from "@/lib/api-response";

export async function GET(){
  try{
    const data=await getSiteDynamicData();
    return publicJson({ok:true,data});
  }catch{
    return publicJson({ok:false,error:"Unable to load site data."},503);
  }
}
export const OPTIONS=publicOptions;
