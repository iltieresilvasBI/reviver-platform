"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function slugify(v:string){
  return v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
    .replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,120);
}
const blockedVideoIds=new Set(["YCLyAmXtpfY","nBQH1c20xbs","N50kF0FE3hM"]);

function youtubeId(value:string){
  const v=value.trim();
  if(!v) return null;
  if(/^[A-Za-z0-9_-]{11}$/.test(v)) return v;
  try{
    const u=new URL(v);
    if(u.hostname.includes("youtu.be")) return u.pathname.split("/").filter(Boolean)[0]||null;
    if(u.searchParams.get("v")) return u.searchParams.get("v");
    const parts=u.pathname.split("/").filter(Boolean);
    const i=parts.findIndex(p=>["embed","shorts","live"].includes(p));
    return i>=0?parts[i+1]??null:null;
  }catch{return null}
}
async function requireAdmin(){
  const supabase=await createClient();
  const {data}=await supabase.auth.getClaims();
  const uid=data?.claims?.sub;
  if(!uid) redirect("/login");
  const {data:profile}=await supabase.from("profiles").select("global_role").eq("id",String(uid)).single();
  if(profile?.global_role!=="admin") redirect("/dashboard");
  return supabase;
}
export async function createModule(formData:FormData){
  const s=await requireAdmin();
  const courseId=String(formData.get("courseId")??"");
  const title=String(formData.get("title")??"").trim();
  const description=String(formData.get("description")??"").trim()||null;
  const sort_order=Number(formData.get("sortOrder")??0);
  const {error}=await s.from("academy_modules").insert({course_id:courseId,title,slug:slugify(title),description,sort_order});
  if(error) redirect("/admin/academy?message="+encodeURIComponent(error.message));
  revalidatePath("/admin/academy"); redirect("/admin/academy?message=Módulo criado.");
}
export async function createLesson(formData:FormData){
  const s=await requireAdmin();
  const module_id=String(formData.get("moduleId")??"");
  const title=String(formData.get("title")??"").trim();
  const youtubeRaw=String(formData.get("youtube")??"").trim();
  const youtube_id=youtubeId(youtubeRaw);
  if(youtubeRaw&&!youtube_id) redirect("/admin/academy?message="+encodeURIComponent("Link ou ID do YouTube inválido."));
  if(youtube_id&&blockedVideoIds.has(youtube_id)) redirect("/admin/academy?message="+encodeURIComponent("Este vídeo foi bloqueado pela curadoria por não cumprir a política de idioma."));
  const payload={
    module_id,title,slug:slugify(String(formData.get("slug")??"")||title),
    summary:String(formData.get("summary")??"").trim()||null,
    objectives:String(formData.get("objectives")??"").trim()||null,
    exercise:String(formData.get("exercise")??"").trim()||null,
    youtube_id,
    duration_minutes:Number(formData.get("duration")??0)||null,
    xp_reward:Number(formData.get("xp")??100)||100,
    pass_percentage:Number(formData.get("pass")??70)||70,
    sort_order:Number(formData.get("sortOrder")??0),
    active:true
  };
  const {error}=await s.from("academy_lessons").insert(payload);
  if(error) redirect("/admin/academy?message="+encodeURIComponent(error.message));
  revalidatePath("/admin/academy"); redirect("/admin/academy?message=Aula criada.");
}
export async function updateLesson(formData:FormData){
  const s=await requireAdmin(); const id=String(formData.get("lessonId")??"");
  const title=String(formData.get("title")??"").trim();
  const youtubeRaw=String(formData.get("youtube")??"").trim();
  const parsedYoutubeId=youtubeId(youtubeRaw);
  if(youtubeRaw&&!parsedYoutubeId) redirect("/admin/academy?message="+encodeURIComponent("Link ou ID do YouTube inválido."));
  if(parsedYoutubeId&&blockedVideoIds.has(parsedYoutubeId)) redirect("/admin/academy?message="+encodeURIComponent("Este vídeo foi bloqueado pela curadoria por não cumprir a política de idioma."));
  const payload={
    title,slug:slugify(String(formData.get("slug")??"")||title),
    summary:String(formData.get("summary")??"").trim()||null,
    objectives:String(formData.get("objectives")??"").trim()||null,
    exercise:String(formData.get("exercise")??"").trim()||null,
    youtube_id:parsedYoutubeId,
    duration_minutes:Number(formData.get("duration")??0)||null,
    xp_reward:Number(formData.get("xp")??100)||100,
    pass_percentage:Number(formData.get("pass")??70)||70,
    sort_order:Number(formData.get("sortOrder")??0),
  };
  const {error}=await s.from("academy_lessons").update(payload).eq("id",id);
  if(error) redirect("/admin/academy?message="+encodeURIComponent(error.message));
  revalidatePath("/admin/academy"); revalidatePath("/academy"); redirect("/admin/academy?message=Aula atualizada.");
}
export async function deactivateLesson(formData:FormData){
  const s=await requireAdmin(); const id=String(formData.get("lessonId")??"");
  const {error}=await s.rpc("admin_delete_lesson",{p_lesson_id:id});
  if(error) redirect("/admin/academy?message="+encodeURIComponent(error.message));
  revalidatePath("/admin/academy"); revalidatePath("/academy");
}
export async function createQuestion(formData:FormData){
  const s=await requireAdmin(); const lesson_id=String(formData.get("lessonId")??"");
  const prompt=String(formData.get("prompt")??"").trim(); const sort_order=Number(formData.get("sortOrder")??0);
  const {data:q,error}=await s.from("quiz_questions").insert({lesson_id,prompt,sort_order}).select("id").single();
  if(error||!q) redirect("/admin/academy?message="+encodeURIComponent(error?.message??"Erro ao criar pergunta"));
  const labels=[0,1,2,3].map(i=>String(formData.get("option"+i)??"").trim()).filter(Boolean);
  const correct=Number(formData.get("correct")??0);
  if(labels.length<2){await s.rpc("admin_delete_question",{p_question_id:q.id});redirect("/admin/academy?message=Use pelo menos duas opções.");}
  const rows=labels.map((label,i)=>({question_id:q.id,label,is_correct:i===correct,sort_order:i+1}));
  if(!rows.some(r=>r.is_correct)) rows[0].is_correct=true;
  const {error:oe}=await s.from("quiz_options").insert(rows);
  if(oe) redirect("/admin/academy?message="+encodeURIComponent(oe.message));
  revalidatePath("/admin/academy"); redirect("/admin/academy?message=Pergunta criada.");
}
export async function updateQuestion(formData:FormData){
  const s=await requireAdmin(); const qid=String(formData.get("questionId")??"");
  const prompt=String(formData.get("prompt")??"").trim(); const sort_order=Number(formData.get("sortOrder")??0);
  const {error}=await s.from("quiz_questions").update({prompt,sort_order}).eq("id",qid);
  if(error) redirect("/admin/academy?message="+encodeURIComponent(error.message));
  await s.from("quiz_options").delete().eq("question_id",qid);
  const labels=[0,1,2,3].map(i=>String(formData.get("option"+i)??"").trim()).filter(Boolean);
  const correct=Number(formData.get("correct")??0);
  const rows=labels.map((label,i)=>({question_id:qid,label,is_correct:i===correct,sort_order:i+1}));
  if(!rows.some(r=>r.is_correct)&&rows[0]) rows[0].is_correct=true;
  if(rows.length>=2) await s.from("quiz_options").insert(rows);
  revalidatePath("/admin/academy"); redirect("/admin/academy?message=Pergunta atualizada.");
}
export async function deleteQuestion(formData:FormData){
  const s=await requireAdmin(); const id=String(formData.get("questionId")??"");
  const {error}=await s.rpc("admin_delete_question",{p_question_id:id});
  if(error) redirect("/admin/academy?message="+encodeURIComponent(error.message));
  revalidatePath("/admin/academy");
}


export async function reviewVideo(formData:FormData){
  const s=await requireAdmin();
  const lessonId=String(formData.get("lessonId")??"");
  const status=String(formData.get("reviewStatus")??"pending");
  const note=String(formData.get("reviewNote")??"").trim()||null;
  const {error}=await s.rpc("review_academy_video",{
    p_lesson_id:lessonId,
    p_status:status,
    p_note:note
  });
  if(error) redirect("/admin/academy?message="+encodeURIComponent(error.message));
  revalidatePath("/admin/academy");
  revalidatePath("/academy");
  redirect("/admin/academy?message="+encodeURIComponent("Curadoria do vídeo atualizada."));
}
