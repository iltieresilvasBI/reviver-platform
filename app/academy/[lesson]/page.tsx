import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { submitQuiz } from "../actions";

const blockedEnglishVideoIds=new Set([
  "YCLyAmXtpfY",
  "nBQH1c20xbs",
]);

export default async function LessonPage({params,searchParams}:{params:Promise<{lesson:string}>,searchParams:Promise<{score?:string;passed?:string;xp?:string;quiz?:string}>}) {
  const {lesson:slug}=await params; const qs=await searchParams;
  const {supabase,userId,email}=await requireUser();
  const {data:lesson}=await supabase.from("academy_lessons").select("id,title,slug,summary,objectives,exercise,youtube_id,duration_minutes,xp_reward,pass_percentage,module_id").eq("slug",slug).eq("active",true).maybeSingle();
  if(!lesson) notFound();
  const [{data:questions},{data:progress}]=await Promise.all([
    supabase.from("quiz_questions").select("id,prompt,sort_order").eq("lesson_id",lesson.id).order("sort_order"),
    supabase.from("lesson_progress").select("status,best_score_percentage,first_completed_at").eq("user_id",userId).eq("lesson_id",lesson.id).maybeSingle()
  ]);
  const {data:options}=await supabase.rpc("get_quiz_options",{p_lesson_id:lesson.id});
  const videoApproved=Boolean(lesson.youtube_id&&!blockedEnglishVideoIds.has(lesson.youtube_id));

  return <AppShell title={lesson.title} active="/academy" email={email}>
    {progress?.status==="completed"&&<div className="notice ok">Aula concluída oficialmente. Novas tentativas servem para revisão e não acrescentam XP.</div>}
    {qs.score&&<div className={qs.passed==="1"?"notice ok":"notice warn"} style={{marginTop:12}}>Resultado: {qs.score}% · {qs.passed==="1"?"Aprovado":"Ainda não atingiu a nota de aprovação"}{Number(qs.xp)>0?` · +${qs.xp} XP`:""}</div>}
    <div className="grid grid-2" style={{marginTop:18}}>
      <div>
        {videoApproved?<div className="video-wrap"><iframe src={`https://www.youtube-nocookie.com/embed/${lesson.youtube_id}`} title={lesson.title} allowFullScreen /></div>:<div className="empty">{lesson.youtube_id?"Vídeo removido temporariamente: conteúdo em inglês. A substituição em português ou dublada está em curadoria.":"Vídeo em curadoria."}</div>}
        <div className="card" style={{marginTop:16}}><p className="eyebrow">RESUMO</p><p>{lesson.summary}</p><p className="muted">{lesson.objectives}</p></div>
      </div>
      <div className="card">
        <p className="eyebrow">EXERCÍCIO</p><p style={{lineHeight:1.65}}>{lesson.exercise}</p>
        <p className="muted small">Interrompe se sentires dor ou desconforto persistente.</p>
        <hr style={{border:0,borderTop:"1px solid var(--border)",margin:"22px 0"}} />
        <p className="eyebrow">QUIZ · APROVAÇÃO {lesson.pass_percentage}%</p>
        {(questions??[]).length===0?<div className="empty">Quiz em preparação.</div>:<form action={submitQuiz} className="form-grid">
          <input type="hidden" name="lessonId" value={lesson.id}/><input type="hidden" name="lessonSlug" value={lesson.slug}/>
          {(questions??[]).map((q,i)=><div key={q.id}><strong>{i+1}. {q.prompt}</strong><div className="form-grid" style={{marginTop:10}}>
            {(options??[]).filter((o:any)=>o.question_id===q.id).map((o:any)=><label className="quiz-option" key={o.id}><input required type="radio" name={`q_${q.id}`} value={o.id}/><span>{o.label}</span></label>)}
          </div></div>)}
          <button className="button primary" type="submit">Enviar respostas</button>
        </form>}
      </div>
    </div>
  </AppShell>
}
