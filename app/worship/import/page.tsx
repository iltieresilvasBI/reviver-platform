import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getAccessContext } from "@/lib/auth";
import { MinistryImportClient } from "./import-client";

export default async function MinistryImportPage(){
  const ctx=await getAccessContext();
  const {data:allNetworks}=await ctx.supabase.from("networks").select("id,slug,name,active").eq("active",true).order("name");
  const ministries:any[]=[];
  for(const network of allNetworks??[]){
    if(ctx.isAdmin){ministries.push(network);continue}
    const {data:membership}=await ctx.supabase.from("network_memberships").select("role,status").eq("network_id",network.id).eq("user_id",ctx.userId).maybeSingle();
    if(membership?.status==="active"&&membership?.role==="leader")ministries.push(network);
  }
  if(!ministries.length){
    return <AppShell title="Importar membros" active="/worship" email={ctx.email}><section className="hero-card"><p className="eyebrow">ACESSO RESTRITO</p><h2>Importação disponível apenas para líderes e administradores.</h2><Link className="button" href="/worship">Voltar</Link></section></AppShell>;
  }
  return <AppShell title="Importar membros" active="/worship" email={ctx.email}>
    <div className="button-row" style={{marginBottom:18}}><Link className="button" href="/worship">← Voltar</Link><a className="button" href="/api/ministry/import-template">Descarregar modelo CSV</a></div>
    <section className="hero-card"><p className="eyebrow">IMPORTAÇÃO EXCEL / CSV</p><h2>Diretório ministerial sem criar contas.</h2><p>Carregar uma pessoa aqui não cria palavra-passe, não envia convite e não concede acesso ao Portal Reviver.</p></section>
    <div className="card" style={{marginTop:18}}><MinistryImportClient ministries={ministries.map((m:any)=>({slug:m.slug,name:m.name}))}/></div>
  </AppShell>;
}
