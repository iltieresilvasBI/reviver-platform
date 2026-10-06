"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function submitQuiz(formData: FormData) {
  const supabase=await createClient();
  const lessonId=String(formData.get("lessonId")??"");
  const lessonSlug=String(formData.get("lessonSlug")??"");
  const optionIds=[...formData.entries()].filter(([k])=>k.startsWith("q_")).map(([,v])=>String(v));
  if(!lessonId||!lessonSlug||!optionIds.length) redirect(`/academy/${lessonSlug}?quiz=missing`);
  const {data,error}=await supabase.rpc("submit_quiz_attempt",{p_lesson_id:lessonId,p_answer_option_ids:optionIds});
  if(error) redirect(`/academy/${lessonSlug}?quiz=error`);
  const result=data as any;
  redirect(`/academy/${lessonSlug}?score=${encodeURIComponent(String(result.score))}&passed=${result.passed?"1":"0"}&xp=${result.xpAwarded??0}`);
}
