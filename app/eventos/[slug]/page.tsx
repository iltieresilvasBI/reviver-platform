import { PublicSitePage } from "@/components/public-site-page";
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;return <PublicSitePage path={"eventos/"+slug} />;}
