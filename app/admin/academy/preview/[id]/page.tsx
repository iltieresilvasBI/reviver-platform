import { notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getAccessContext } from "@/lib/auth";

export default async function Preview({params}:{params:Promise<{id:string}>}){
  const {id}=await params; const ctx=await getAccessContext(); if(!ctx.isAdmin) notFound();
  const {data:l}=await ctx.supabase.from("academy_lessons").select("*").eq("id",id).maybeSingle(); if(!l) notFound();
  const {data:questions}=await ctx.supabase.from("quiz_questions").select("*").eq("lesson_id",id).order("sort_order");
  const qids=(questions??[]).map(q=>q.id);
  const {data:options}=qids.length?await ctx.supabase.from("quiz_options").select("*").in("question_id",qids).order("sort_order"):{data:[] as any[]};
  return <AppShell title="Pré-visualização da aula" active="/admin" email={ctx.email}>
    <div className="button-row" style={{marginBottom:18}}><Link className="button" href="/admin/academy">Voltar ao editor</Link><span className="pill gold">NÃO PUBLICA ALTERAÇÕES</span></div>
    <div className="grid grid-2"><div>{l.youtube_id?<div className="video-wrap"><iframe src={`https://www.youtube-nocookie.com/embed/${l.youtube_id}`} title={l.title} allowFullScreen/></div>:<div className="empty">Sem vídeo</div>}<div className="card" style={{marginTop:16}}><p className="eyebrow">RESUMO</p><h2>{l.title}</h2><p>{l.summary}</p><p className="muted">{l.objectives}</p></div></div>
    <div className="card"><p className="eyebrow">EXERCÍCIO</p><p>{l.exercise}</p><div className="section-title"><h2>Quiz</h2></div>{(questions??[]).map((q:any,i)=><div key={q.id} style={{marginBottom:18}}><strong>{i+1}. {q.prompt}</strong><div className="form-grid" style={{marginTop:8}}>{(options??[]).filter((o:any)=>o.question_id===q.id).map((o:any)=><div className={o.is_correct?"quiz-option notice ok":"quiz-option"} key={o.id}>{o.label}{o.is_correct?" · correta":""}</div>)}</div></div>)}</div></div>
  </AppShell>
}
