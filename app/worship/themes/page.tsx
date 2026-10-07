import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getAccessContext } from "@/lib/auth";
import { createWorshipTheme,setWorshipThemeActive } from "../actions";

export default async function WorshipThemesPage({searchParams}:{searchParams:Promise<{message?:string}>}){
  const qs=await searchParams;
  const ctx=await getAccessContext();
  const {data:network}=await ctx.supabase.from("networks").select("id").eq("slug","worship").maybeSingle();
  const {data:membership}=network?await ctx.supabase.from("network_memberships").select("role,status").eq("network_id",network.id).eq("user_id",ctx.userId).maybeSingle():{data:null as any};
  const canLead=ctx.isAdmin||(membership?.status==="active"&&membership?.role==="leader");
  if(!canLead){
    return <AppShell title="Temas de Louvor" active="/worship" email={ctx.email}><section className="hero-card"><p className="eyebrow">ACESSO RESTRITO</p><h2>Gestão de temas disponível apenas para líderes e administradores.</h2><Link className="button" href="/worship">Voltar</Link></section></AppShell>;
  }
  const {data:themes,error}=await ctx.supabase.from("worship_themes").select("id,name,slug,active,created_at").order("name");
  return <AppShell title="Temas de Louvor" active="/worship" email={ctx.email}>
    {qs.message&&<div className="notice" style={{marginBottom:16}}>{qs.message}</div>}
    <div className="button-row" style={{marginBottom:18}}><Link className="button" href="/worship/repertoire">← Repertório</Link></div>
    <section className="hero-card"><p className="eyebrow">PASTAS POR TEMA</p><h2>Organização sem duplicar músicas.</h2><p>Uma música pode pertencer a vários temas. Arquivar um tema não remove nenhuma música do catálogo.</p></section>
    {error&&<div className="notice warn" style={{marginTop:16}}>Não foi possível carregar os temas.</div>}
    <div className="grid grid-2" style={{marginTop:18}}>
      <form action={createWorshipTheme} className="card form-grid"><p className="eyebrow">NOVO TEMA</p><div className="field"><label>Nome</label><input name="name" required placeholder="Ex.: Santidade"/></div><button className="button primary">Criar tema</button></form>
      <article className="card"><p className="eyebrow">REGRA</p><h3>Classificação validada pelo líder</h3><p className="muted">O portal não classifica automaticamente uma música sem validação. Associe os temas no cadastro ou edição da música.</p></article>
    </div>
    <div className="section-title"><div><p className="eyebrow">TEMAS CONFIGURADOS</p><h2>Pastas disponíveis</h2></div></div>
    <div className="list">{(themes??[]).map((theme:any)=><div className="list-row" key={theme.id}><div><strong>{theme.name}</strong><div className="muted small">{theme.slug} · {theme.active?"ativo":"arquivado"}</div></div><form action={setWorshipThemeActive}><input type="hidden" name="themeId" value={theme.id}/><input type="hidden" name="active" value={theme.active?"false":"true"}/><button className="button">{theme.active?"Arquivar":"Reativar"}</button></form></div>)}</div>
  </AppShell>;
}
