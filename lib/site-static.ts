export type SiteSettings = {
  name:string;
  academyUrl:string;
  email:string;
  whatsapp:string;
  address:string;
  mapEmbedUrl:string;
  social:{instagram:string;facebook:string;youtube:string;other:string};
  hours:string;
  aboutIntro:string;
  history:string;
  mission:string;
  vision:string;
  values:string;
  leadership:string;
};
export const site:SiteSettings = {
  name:'Igreja Reviver',
  academyUrl:'/login',
  email:'',
  whatsapp:'',
  address:'',
  mapEmbedUrl:'',
  social:{instagram:'',facebook:'',youtube:'',other:''},
  hours:'',
  aboutIntro:'',
  history:'',
  mission:'',
  vision:'',
  values:'',
  leadership:'',
};
export const categories = ['Geral', 'Kids', 'Jovens', 'Mulheres', 'Homens', 'Louvor'];
export type EventItem = { slug:string; name:string; date:string|null; time:string; location:string; description:string; category:string; image:string; demo:boolean };
export const demoEvents:EventItem[] = [
  {slug:'encontro-em-comunidade',name:'Encontro em comunidade',date:null,time:'A confirmar',location:'Local a confirmar',description:'Exemplo de apresentação de um encontro da igreja. O programa, a data e as condições de participação serão substituídos pela informação oficial.',category:'Geral',image:'',demo:true},
  {slug:'uma-nova-geracao',name:'Uma nova geração',date:null,time:'A confirmar',location:'Local a confirmar',description:'Exemplo de evento da rede de jovens. Este conteúdo demonstra a organização da agenda e não anuncia um encontro real.',category:'Jovens',image:'',demo:true},
  {slug:'noite-de-louvor',name:'Noite de louvor',date:null,time:'A confirmar',location:'Local a confirmar',description:'Exemplo de evento do Ministério de Louvor. Repertório, equipa, horário e local aguardam confirmação da igreja.',category:'Louvor',image:'/images/sanctuary.webp',demo:true},
];
export const networks = [
 {slug:'kids',name:'Reviver Kids',label:'INFÂNCIA',phrase:'Pequenos passos. Grandes descobertas.',description:'Um espaço dedicado às crianças e às famílias.',number:'01'},
 {slug:'jovens',name:'Jovens',label:'NOVA GERAÇÃO',phrase:'Uma fé que caminha contigo.',description:'Um espaço para conhecer a rede de jovens e acompanhar os seus encontros.',number:'02'},
 {slug:'mulheres',name:'Mulheres',label:'CAMINHAR JUNTAS',phrase:'Conexões que fazem crescer.',description:'Um espaço para acompanhar os encontros e conteúdos da rede de mulheres.',number:'03'},
 {slug:'homens',name:'Homens',label:'VIDA EM COMUNHÃO',phrase:'Crescer. Partilhar. Servir.',description:'Um espaço para conhecer a rede de homens e as suas atividades.',number:'04'},
];
export type Video = {id:string; title:string; category:string; description:string};
export const videoCategories=['Cultos','Mensagens','Louvor','Testemunhos','Especiais'];
export const demoVideos:Video[]=[];
export type CampaignItem={slug:string;name:string;description:string;period:string;status:'ativa'|'encerrada';image:string;cta:string;demo:boolean;featured:boolean};
export const demoCampaigns:CampaignItem[]=[
 {slug:'juntos-para-servir',name:'Juntos para servir',description:'Modelo de campanha para apresentar um propósito, um período e uma forma de participação. Conteúdo demonstrativo; não é uma campanha oficial.',period:'Período a confirmar',status:'ativa',image:'',cta:'Conhecer a campanha',demo:true,featured:true},
 {slug:'caminhos-de-partilha',name:'Caminhos de partilha',description:'Modelo de arquivo de uma campanha encerrada. Os resultados e imagens poderão ser apresentados nesta página.',period:'Período a confirmar',status:'encerrada',image:'',cta:'Ver campanha',demo:true,featured:false},
];
export type NewsItem={slug:string;title:string;category:string;text:string};
export const demoNews:NewsItem[]=[
 {slug:'vida-em-comunidade',title:'Vida em comunidade',category:'Atividades',text:'Espaço demonstrativo para partilhar atividades da igreja. Texto e fotografias oficiais por fornecer.'},
 {slug:'projetos-que-aproximam',title:'Projetos que aproximam',category:'Projetos',text:'Espaço demonstrativo para apresentar projetos e novidades. Informação oficial por fornecer.'},
];
export const pageInfo:Record<string,{title:string;description:string}>={
 '':{title:'Igreja Reviver — Viver. Crescer. Servir.',description:'Conheça a Igreja Reviver, explore as redes, acompanhe eventos e descubra conteúdos de fé, música e formação.'},
 eventos:{title:'Eventos',description:'Agenda da Igreja Reviver: encontros e atividades das redes e do Ministério de Louvor.'},
 redes:{title:'Nossas Redes',description:'Conheça Reviver Kids, Jovens, Mulheres e Homens.'},
 'ministerio-de-louvor':{title:'Ministério de Louvor',description:'Louvor, equipa, ensaios, repertório e formação na Reviver Academy.'},
 midia:{title:'Mídia',description:'Cultos, mensagens, louvor e testemunhos da Igreja Reviver.'},
 campanhas:{title:'Campanhas',description:'Acompanhe as campanhas e iniciativas da Igreja Reviver.'},
 sobre:{title:'Sobre a Reviver',description:'Quem somos, a nossa história, missão, visão e valores.'},
 contactos:{title:'Contactos',description:'Fale com a Igreja Reviver e saiba como participar.'},
};
export function staticPageMetadata(path:string){
 if(pageInfo[path]) return pageInfo[path];
 const net=networks.find(n=>path==='redes/'+n.slug); if(net) return {title:net.name,description:net.description};
 const event=demoEvents.find(e=>path==='eventos/'+e.slug); if(event) return {title:event.name,description:event.description};
 const campaign=demoCampaigns.find(c=>path==='campanhas/'+c.slug); if(campaign) return {title:campaign.name,description:campaign.description};
 const item=demoNews.find(n=>path==='acontece/'+n.slug); if(item) return {title:item.title,description:item.text};
 return null;
}