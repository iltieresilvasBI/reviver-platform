import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getAccessContext } from "@/lib/auth";

export default async function AdminPage(){
  const ctx=await getAccessContext();
  if(!ctx.isAdmin) return <AppShell title="Admin" active="/admin" email={ctx.email}><section className="hero-card"><p className="eyebrow">ACESSO RESTRITO</p><h2>Administração global</h2><p>Esta área exige o papel Admin.</p></section></AppShell>;

  const [
    {count:usersCount},
    {count:contentCount},
    {count:reviewCount},
    {count:publishedCount},
    {count:lessonsCount},
    {count:pendingWorshipCount},
    {count:newMessagesCount},
    {data:reviewItems},
  ]=await Promise.all([
    ctx.supabase.from("profiles").select("*",{count:"exact",head:true}),
    ctx.supabase.from("content_items").select("*",{count:"exact",head:true}),
    ctx.supabase.from("content_items").select("*",{count:"exact",head:true}).eq("status","in_review"),
    ctx.supabase.from("content_items").select("*",{count:"exact",head:true}).eq("status","published"),
    ctx.supabase.from("academy_lessons").select("*",{count:"exact",head:true}).eq("active",true),
    ctx.supabase.from("network_memberships").select("id,networks!inner(slug)",{count:"exact",head:true}).eq("status","pending").eq("networks.slug","worship"),
    ctx.supabase.from("contact_messages").select("*",{count:"exact",head:true}).eq("status","new"),
    ctx.supabase.from("content_items").select("id,title,content_type,status,submitted_at").eq("status","in_review").order("submitted_at",{ascending:true}).limit(6),
  ]);

  const areas=[
    {title:"Conteúdo e site",text:"Eventos, campanhas, notícias, vídeos, imagens, revisão e publicação.",href:"/media",cta:"Abrir CMS"},
    {title:"Aprovações",text:"Fila editorial com aprovação separada da publicação.",href:"/admin/aprovacoes",cta:"Rever fila"},
    {title:"Reviver Academy",text:"Cursos, módulos, aulas, vídeos e quizzes.",href:"/admin/academy",cta:"Gerir Academy"},
    {title:"Utilizadores",text:"Contas, verificação, admins e papéis de mídia.",href:"/admin/utilizadores",cta:"Gerir acessos"},
    {title:"Mensagens",text:"Contactos recebidos pelo site público e respetivo estado.",href:"/admin/mensagens",cta:`${newMessagesCount??0} novas`},
    {title:"Ministério de Louvor",text:"Membros, convites, pedidos, escalas, ensaios e repertório.",href:"/worship",cta:"Gerir Louvor"},
    {title:"Site público",text:"Ver exatamente o que a comunidade está a receber.",href:"/",cta:"Abrir site"},
  ];

  return <AppShell title="Centro de Administração" active="/admin" email={ctx.email}>
    <section className="hero-card">
      <p className="eyebrow">REVIVER CONTROL CENTER</p>
      <h2>Um único ponto para operar todo o ecossistema.</h2>
      <p>Conteúdo público, Academy, utilizadores, aprovações e Ministério de Louvor são administrados sem edição de código.</p>
    </section>

    <div className="grid grid-4" style={{marginTop:18}}>
      <div className="card metric"><span>Utilizadores</span><strong>{usersCount??0}</strong></div>
      <div className="card metric"><span>Conteúdos</span><strong>{contentCount??0}</strong></div>
      <div className="card metric"><span>Aguardam revisão</span><strong>{reviewCount??0}</strong></div>
      <div className="card metric"><span>Aulas ativas</span><strong>{lessonsCount??0}</strong></div>
    </div>

    <div className="section-title"><h2>Áreas de gestão</h2><span className="muted small">{publishedCount??0} conteúdos publicados · {pendingWorshipCount??0} pedidos do Louvor · {newMessagesCount??0} mensagens novas</span></div>
    <div className="grid grid-3">{areas.map(a=><Link className="card admin-area-card" href={a.href} key={a.href}><p className="eyebrow">{a.cta}</p><h3>{a.title}</h3><p className="muted">{a.text}</p><span className="text-link">Abrir →</span></Link>)}</div>

    <div className="section-title"><h2>Fila editorial</h2><Link href="/admin/aprovacoes" className="muted small">Ver fila completa</Link></div>
    <div className="list">{(reviewItems??[]).length===0?<div className="empty">Não há conteúdos à espera de aprovação.</div>:(reviewItems??[]).map((item:any)=><Link href={`/media/preview/${item.id}`} className="list-row" key={item.id}><div><span className="pill gold">{item.content_type}</span><h3 style={{marginTop:8}}>{item.title}</h3><span className="muted small">{item.submitted_at?new Date(item.submitted_at).toLocaleString("pt-PT"):"Data de submissão indisponível"}</span></div><span className="pill">em revisão</span></Link>)}</div>
  </AppShell>
}
