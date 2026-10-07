import { PublicSitePage } from "@/components/public-site-page";
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <PublicSitePage path={"repertorio-da-igreja/"+id} />;}
