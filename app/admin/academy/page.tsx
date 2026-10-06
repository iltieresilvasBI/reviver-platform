import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getAccessContext } from "@/lib/auth";
import { createLesson,createModule,createQuestion,deactivateLesson,deleteQuestion,updateLesson,updateQuestion } from "./actions";

export default async function AcademyAdmin({searchParams}:{searchParams:Promise<{message?:string}>}){
  const qs=await searchParams; const ctx=await getAccessContext();
  if(!ctx.isAdmin) return <AppShell title="Academy Admin" active="/admin" email={ctx.email}><div className="empty">Acesso reservado a Admin.</div></AppShell>;
  const [{data:courses},{data:modules},{data:lessons},{data:questions}]=await Promise.all([
    ctx.supabase.from("academy_courses").select("*").order("sort_order"),
    ctx.supabase.from("academy_modules").select("*").order("sort_order"),
    ctx.supabase.from("academy_lessons").select("*").order("sort_order"),
    ctx.supabase.from("quiz_questions").select("*").order("sort_order")
  ]);
  const qids=(questions??[]).map(q=>q.id);
  const {data:options}=qids.length?await ctx.supabase.from("quiz_options").select("*").in("question_id",qids).order("sort_order"):{data:[] as any[]};
  const course=courses?.[0];
  return <AppShell title="Gestão da Academy" active="/admin" email={ctx.email}>
    {qs.message&&<div className="notice" style={{marginBottom:16}}>{qs.message}</div>}
    <div className="button-row" style={{marginBottom:18}}><Link className="button" href="/admin">Admin</Link><Link className="button primary" href="/academy">Ver Academy como aluno</Link></div>
    <section className="hero-card"><p className="eyebrow">EDITOR DA FORMAÇÃO</p><h2>Vídeos, aulas e quizzes sem mexer em código.</h2><p>Podes trocar o link do YouTube, criar/desativar aulas e editar perguntas e respostas diretamente aqui.</p></section>

    <div className="section-title"><h2>Novo módulo</h2></div>
    {course&&<form action={createModule} className="card form-grid">
      <input type="hidden" name="courseId" value={course.id}/>
      <div className="grid grid-3"><div className="field"><label>Título</label><input name="title" required/></div><div className="field"><label>Ordem</label><input name="sortOrder" type="number" defaultValue={(modules?.length??0)+1}/></div><div className="field"><label>Descrição</label><input name="description"/></div></div>
      <button className="button">Criar módulo</button>
    </form>}

    <div className="section-title"><h2>Nova aula</h2></div>
    <form action={createLesson} className="card form-grid">
      <div className="grid grid-3"><div className="field"><label>Módulo</label><select name="moduleId" required>{(modules??[]).map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></div><div className="field"><label>Título</label><input name="title" required/></div><div className="field"><label>Link YouTube ou ID</label><input name="youtube" placeholder="https://youtube.com/watch?v=..."/></div></div>
      <div className="field"><label>Resumo</label><textarea name="summary"/></div>
      <div className="field"><label>Objetivos</label><textarea name="objectives"/></div>
      <div className="field"><label>Exercício</label><textarea name="exercise"/></div>
      <div className="grid grid-4"><div className="field"><label>Duração min.</label><input name="duration" type="number" min="1"/></div><div className="field"><label>XP</label><input name="xp" type="number" defaultValue="100"/></div><div className="field"><label>Nota mínima %</label><input name="pass" type="number" min="0" max="100" defaultValue="70"/></div><div className="field"><label>Ordem</label><input name="sortOrder" type="number" defaultValue="1"/></div></div>
      <button className="button primary">Criar aula</button>
    </form>

    <div className="section-title"><h2>Aulas e perguntas</h2></div>
    <div className="list">{(modules??[]).map(m=><section className="card" key={m.id}>
      <p className="eyebrow">MÓDULO {m.sort_order}</p><h2>{m.title}</h2>
      <div className="list">{(lessons??[]).filter(l=>l.module_id===m.id).map(l=>{
        const qsFor=(questions??[]).filter(q=>q.lesson_id===l.id);
        return <details key={l.id} style={{borderTop:"1px solid var(--border)",paddingTop:14}}>
          <summary style={{cursor:"pointer",fontWeight:800}}>{l.title} {!l.active&&<span className="pill">inativa</span>}</summary>
          <form action={updateLesson} className="form-grid" style={{marginTop:16}}>
            <input type="hidden" name="lessonId" value={l.id}/>
            <div className="grid grid-3"><div className="field"><label>Título</label><input name="title" defaultValue={l.title}/></div><div className="field"><label>Slug</label><input name="slug" defaultValue={l.slug}/></div><div className="field"><label>Link YouTube ou ID</label><input name="youtube" defaultValue={l.youtube_id??""}/></div></div>
            <div className="field"><label>Resumo</label><textarea name="summary" defaultValue={l.summary??""}/></div>
            <div className="field"><label>Objetivos</label><textarea name="objectives" defaultValue={l.objectives??""}/></div>
            <div className="field"><label>Exercício</label><textarea name="exercise" defaultValue={l.exercise??""}/></div>
            <div className="grid grid-4"><div className="field"><label>Duração</label><input name="duration" type="number" defaultValue={l.duration_minutes??""}/></div><div className="field"><label>XP</label><input name="xp" type="number" defaultValue={l.xp_reward}/></div><div className="field"><label>Aprovação %</label><input name="pass" type="number" defaultValue={l.pass_percentage}/></div><div className="field"><label>Ordem</label><input name="sortOrder" type="number" defaultValue={l.sort_order}/></div></div>
            <div className="button-row"><button className="button primary">Guardar aula</button><Link className="button" href={`/admin/academy/preview/${l.id}`}>Pré-visualizar</Link></div>
          </form>
          {l.active&&<form action={deactivateLesson} style={{marginTop:10}}><input type="hidden" name="lessonId" value={l.id}/><button className="button danger">Desativar aula</button></form>}
          <div className="section-title"><h3>Quiz</h3></div>
          <div className="list">{qsFor.map((q:any)=>{
            const opts=(options??[]).filter((o:any)=>o.question_id===q.id);
            const correct=Math.max(0,opts.findIndex((o:any)=>o.is_correct));
            return <form action={updateQuestion} className="card form-grid" key={q.id}>
              <input type="hidden" name="questionId" value={q.id}/>
              <div className="field"><label>Pergunta</label><input name="prompt" defaultValue={q.prompt} required/></div>
              <div className="grid grid-2">{[0,1,2,3].map(i=><div className="field" key={i}><label>Opção {i+1}</label><input name={`option${i}`} defaultValue={opts[i]?.label??""}/></div>)}</div>
              <div className="field"><label>Resposta correta</label><select name="correct" defaultValue={String(correct)}><option value="0">Opção 1</option><option value="1">Opção 2</option><option value="2">Opção 3</option><option value="3">Opção 4</option></select></div>
              <div className="field"><label>Ordem</label><input name="sortOrder" type="number" defaultValue={q.sort_order}/></div>
              <div className="button-row"><button className="button">Guardar pergunta</button><button className="button danger" formAction={deleteQuestion}>Excluir pergunta</button></div>
            </form>
          })}</div>
          <form action={createQuestion} className="card form-grid" style={{marginTop:12}}>
            <input type="hidden" name="lessonId" value={l.id}/>
            <p className="eyebrow">NOVA PERGUNTA</p>
            <div className="field"><label>Pergunta</label><input name="prompt" required/></div>
            <div className="grid grid-2">{[0,1,2,3].map(i=><div className="field" key={i}><label>Opção {i+1}{i>1?" (opcional)":""}</label><input name={`option${i}`} required={i<2}/></div>)}</div>
            <div className="grid grid-2"><div className="field"><label>Resposta correta</label><select name="correct"><option value="0">Opção 1</option><option value="1">Opção 2</option><option value="2">Opção 3</option><option value="3">Opção 4</option></select></div><div className="field"><label>Ordem</label><input name="sortOrder" type="number" defaultValue={qsFor.length+1}/></div></div>
            <button className="button primary">Adicionar pergunta</button>
          </form>
        </details>
      })}</div>
    </section>)}</div>
  </AppShell>
}
