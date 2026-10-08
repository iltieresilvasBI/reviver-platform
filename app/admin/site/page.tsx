import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getAccessContext } from "@/lib/auth";
import { site } from "@/lib/site-static";
import { saveSiteVisual } from "./actions";

type Row={
  hero_image_url:string|null;
  worship_image_url:string|null;
  kids_image_url:string|null;
  youth_image_url:string|null;
  women_image_url:string|null;
  men_image_url:string|null;
  campaign_image_url:string|null;
  header_logo_url:string|null;
  footer_logo_url:string|null;
};

const cards=[
  {key:"hero",title:"Imagem principal",text:"Hero da página inicial.",field:"hero_image_url",fallback:site.heroImage,ratio:"16 / 7"},
  {key:"kids",title:"Reviver Kids",text:"Imagem da rede infantil.",field:"kids_image_url",fallback:site.communityImage,ratio:"4 / 3"},
  {key:"youth",title:"Jovens",text:"Imagem da rede de jovens.",field:"youth_image_url",fallback:site.worshipImage,ratio:"4 / 3"},
  {key:"women",title:"Mulheres",text:"Imagem da rede de mulheres.",field:"women_image_url",fallback:site.campaignImage,ratio:"4 / 3"},
  {key:"men",title:"Homens",text:"Imagem da rede de homens.",field:"men_image_url",fallback:site.communityImage,ratio:"4 / 3"},
  {key:"worship",title:"Ministério de Louvor",text:"Hero e cartão do Louvor.",field:"worship_image_url",fallback:site.worshipImage,ratio:"16 / 9"},
  {key:"campaign",title:"Campanhas",text:"Fallback visual para campanhas.",field:"campaign_image_url",fallback:site.campaignImage,ratio:"16 / 9"},
  {key:"headerLogo",title:"Logo do cabeçalho",text:"Usada no topo do site.",field:"header_logo_url",fallback:"/images/reviver-gold.svg",ratio:"3 / 2"},
  {key:"footerLogo",title:"Logo do rodapé",text:"Usada no rodapé do site.",field:"footer_logo_url",fallback:"/images/reviver-official.svg",ratio:"3 / 2"},
] as const;

export default async function SiteVisualEditor({searchParams}:{searchParams:Promise<{message?:string}>}){
  const {message}=await searchParams;
  const ctx=await getAccessContext();
  if(!ctx.isAdmin)return <AppShell title="Visual do site" active="/admin" email={ctx.email}><section className="hero-card"><p className="eyebrow">ACESSO RESTRITO</p><h2>Editor visual</h2><p>Esta área exige o papel Admin.</p></section></AppShell>;

  const {data}=await ctx.supabase.from("site_settings")
    .select("hero_image_url,worship_image_url,kids_image_url,youth_image_url,women_image_url,men_image_url,campaign_image_url,header_logo_url,footer_logo_url")
    .eq("id",1).maybeSingle();
  const row=(data??{}) as Partial<Row>;

  return <AppShell title="Visual do site" active="/admin" email={ctx.email}>
    <section className="hero-card">
      <p className="eyebrow">SITE PÚBLICO</p>
      <h2>Troque as imagens sem editar código.</h2>
      <p>Envie uma imagem ou cole uma URL. A alteração passa a ser lida diretamente pelo site público.</p>
      <div className="button-row" style={{marginTop:16}}><Link className="button" href="/">Ver site</Link><Link className="button" href="/media">Conteúdo e Mídia</Link></div>
    </section>
    {message&&<div className="notice" style={{marginTop:16}}>{message}</div>}
    <div className="site-visual-grid" style={{marginTop:18}}>
      {cards.map(card=>{
        const current=(row[card.field as keyof Row] as string|null)||card.fallback;
        return <article className="card site-visual-card" key={card.key}>
          <div className="site-visual-preview" style={{aspectRatio:card.ratio}}><img src={current} alt=""/></div>
          <div><p className="eyebrow">{card.title}</p><p className="muted small">{card.text}</p></div>
          <form action={saveSiteVisual} className="form-grid">
            <input type="hidden" name="key" value={card.key}/>
            <div className="field"><label>Enviar imagem</label><input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml"/></div>
            <div className="field"><label>Ou usar URL</label><input name="url" type="url" placeholder="https://..." defaultValue={(row[card.field as keyof Row] as string|null)??""}/></div>
            <div className="button-row"><button className="button primary">Guardar</button><button className="button" name="url" value="">Usar padrão</button></div>
          </form>
        </article>;
      })}
    </div>
  </AppShell>;
}
