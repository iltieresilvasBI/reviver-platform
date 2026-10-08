import { createClient } from '@/lib/supabase/server';
import type { SiteDynamicData } from '@/components/site-exact';
import { site } from '@/lib/site-static';

function localDate(iso:string|null){return iso?new Date(iso).toISOString().slice(0,10):null}
function localTime(iso:string|null){return iso?new Date(iso).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Lisbon'}):'A confirmar'}
function categoryFor(slug?:string|null){return slug==='kids'?'Kids':slug==='youth'?'Jovens':slug==='women'?'Mulheres':slug==='men'?'Homens':slug==='worship'?'Louvor':'Geral'}
function videoCategory(slug?:string|null){return slug==='worship'?'Louvor':'Especiais'}
function period(start:string|null,end:string|null){
  if(!start&&!end)return 'Período a confirmar';
  const f=(v:string)=>new Date(v).toLocaleDateString('pt-PT',{timeZone:'Europe/Lisbon'});
  return start&&end?`${f(start)} — ${f(end)}`:f((start||end)!);
}
export async function getSiteDynamicData():Promise<SiteDynamicData>{
 try{
  const s=await createClient();
  const [{data:items,error},{data:settings,error:settingsError}]=await Promise.all([
    s.from('content_items').select('id,content_type,title,slug,summary,body,event_start,event_end,event_location,campaign_start,campaign_end,cta_label,cta_url,youtube_id,featured,priority,published_at').eq('status','published').lte('published_at',new Date().toISOString()).order('priority',{ascending:false}).order('published_at',{ascending:false}),
    s.from('site_settings').select('hero_image_url,worship_image_url,kids_image_url,youth_image_url,women_image_url,men_image_url,campaign_image_url,header_logo_url,footer_logo_url').eq('id',1).maybeSingle(),
  ]);
  if(error) throw error;
  if(settingsError) throw settingsError;
  const ids=(items??[]).map(x=>x.id);
  const [{data:media,error:mediaError},{data:links,error:linksError}]=ids.length?await Promise.all([
    s.from('content_media').select('content_item_id,media_type,external_url,alt_text,sort_order').in('content_item_id',ids).order('sort_order'),
    s.from('content_item_networks').select('content_item_id,network_id,networks(slug)').in('content_item_id',ids)
  ]):[{data:[] as any[],error:null},{data:[] as any[],error:null}];
  if(mediaError) throw mediaError;
  if(linksError) throw linksError;
  const networkByItem=new Map<string,string>();
  for(const l of links??[]){const slug=(l as any).networks?.slug;if(slug)networkByItem.set(l.content_item_id,slug)}
  const itemMedia=(id:string)=>(media??[]).filter((m:any)=>m.content_item_id===id);
  const image=(id:string)=>itemMedia(id).find((m:any)=>m.media_type==='cover'||m.media_type==='image')?.external_url??'';
  const highlights=(items??[]).filter(x=>x.content_type==='home_highlight').map(x=>({
    id:x.id,slug:x.slug,title:x.title,summary:x.summary||x.body||'',image:image(x.id),
    ctaLabel:x.cta_label||'Saber mais',ctaUrl:x.cta_url||'/contactos',featured:Boolean(x.featured),priority:Number(x.priority||0)
  }));
  const galleries=(items??[]).filter(x=>x.content_type==='gallery').map(x=>({
    id:x.id,slug:x.slug,title:x.title,summary:x.summary||x.body||'',network:networkByItem.get(x.id)||null,
    images:itemMedia(x.id).filter((m:any)=>m.external_url).map((m:any)=>({url:m.external_url,alt:m.alt_text||x.title}))
  }));
  const events=(items??[]).filter(x=>x.content_type==='event').map(x=>({slug:x.slug,name:x.title,date:localDate(x.event_start),time:localTime(x.event_start),location:x.event_location||'Local a confirmar',description:x.summary||x.body||'',category:categoryFor(networkByItem.get(x.id)),image:image(x.id),demo:false}));
  const campaigns=(items??[]).filter(x=>x.content_type==='campaign').map(x=>({slug:x.slug,name:x.title,description:x.summary||x.body||'',period:period(x.campaign_start,x.campaign_end),status:(x.campaign_end&&new Date(x.campaign_end)<new Date()?'encerrada':'ativa') as 'ativa'|'encerrada',image:image(x.id),cta:x.cta_label||'Conhecer a campanha',demo:false,featured:Boolean(x.featured)}));
  const news=(items??[]).filter(x=>x.content_type==='post').map(x=>({slug:x.slug,title:x.title,category:categoryFor(networkByItem.get(x.id)),text:x.summary||x.body||''}));
  const videos=(items??[]).filter(x=>x.content_type==='video'&&x.youtube_id).map(x=>({id:x.youtube_id!,title:x.title,category:videoCategory(networkByItem.get(x.id)),description:x.summary||x.body||''}));
  const visuals={
    hero:settings?.hero_image_url||site.heroImage,
    worship:settings?.worship_image_url||site.worshipImage,
    campaign:settings?.campaign_image_url||site.campaignImage,
    networks:{
      kids:settings?.kids_image_url||site.communityImage,
      jovens:settings?.youth_image_url||site.worshipImage,
      mulheres:settings?.women_image_url||site.campaignImage,
      homens:settings?.men_image_url||site.communityImage,
    },
    headerLogo:settings?.header_logo_url||'/images/reviver-gold.svg',
    footerLogo:settings?.footer_logo_url||'/images/reviver-official.svg',
  };
  return {events,campaigns,news,videos,highlights,galleries,visuals};
 }catch(error){
  console.error("public-site dynamic data unavailable",error);
  return {events:[],campaigns:[],news:[],videos:[],highlights:[],galleries:[],visuals:{
    hero:site.heroImage,worship:site.worshipImage,campaign:site.campaignImage,
    networks:{kids:site.communityImage,jovens:site.worshipImage,mulheres:site.campaignImage,homens:site.communityImage},
    headerLogo:'/images/reviver-gold.svg',footerLogo:'/images/reviver-official.svg'
  }};
 }
}

export async function dynamicPageMetadata(path:string){
 const data=await getSiteDynamicData();
 if(path.startsWith('eventos/')){const x=data.events.find(v=>path==='eventos/'+v.slug);return x?{title:x.name,description:x.description}:null}
 if(path.startsWith('campanhas/')){const x=data.campaigns.find(v=>path==='campanhas/'+v.slug);return x?{title:x.name,description:x.description}:null}
 if(path.startsWith('acontece/')){const x=data.news.find(v=>path==='acontece/'+v.slug);return x?{title:x.title,description:x.text}:null}
 return null;
}

export function pathExists(path:string,data:SiteDynamicData){
 if(!path||['eventos','redes','ministerio-de-louvor','repertorio-da-igreja','midia','campanhas','sobre','contactos'].includes(path))return true;
 if(path.startsWith('repertorio-da-igreja/'))return true;
 if(['redes/kids','redes/jovens','redes/mulheres','redes/homens'].includes(path))return true;
 if(path.startsWith('eventos/'))return data.events.some(x=>path==='eventos/'+x.slug);
 if(path.startsWith('campanhas/'))return data.campaigns.some(x=>path==='campanhas/'+x.slug);
 if(path.startsWith('acontece/'))return data.news.some(x=>path==='acontece/'+x.slug);
 return false;
}