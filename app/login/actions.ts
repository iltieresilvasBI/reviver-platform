"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const PROD_URL = "https://reviver-platform-gamma.vercel.app";

function safeNext(value:FormDataEntryValue|null){
  const next=String(value??"");
  return next.startsWith("/")&&!next.startsWith("//")?next:"/dashboard";
}
function safeMessage(message:string,next="/dashboard"){return `/login?message=${encodeURIComponent(message)}&next=${encodeURIComponent(next)}`}

async function getAppOrigin(){
  const h=await headers();
  const forwardedHost=h.get("x-forwarded-host");
  const host=forwardedHost??h.get("host");
  const forwardedProto=h.get("x-forwarded-proto");
  if(host){
    const proto=forwardedProto??(host.includes("localhost")?"http":"https");
    return `${proto}://${host}`;
  }
  const vercelUrl=process.env.VERCEL_PROJECT_PRODUCTION_URL??process.env.VERCEL_URL;
  if(vercelUrl) return vercelUrl.startsWith("http")?vercelUrl:`https://${vercelUrl}`;
  return PROD_URL;
}

function friendlyAuthError(error:{code?:string;message?:string}){
  if(error.code==="email_not_confirmed") return "A conta existe, mas o email ainda não foi confirmado. Usa «Reenviar confirmação».";
  if(error.code==="invalid_credentials") return "Email ou password incorretos.";
  if(error.code==="over_email_send_rate_limit") return "O envio de emails foi temporariamente limitado. Tenta novamente dentro de alguns instantes.";
  if(error.code==="user_already_exists") return "Já existe uma conta com este email.";
  return "Não foi possível concluir a autenticação.";
}

export async function login(formData:FormData){
  const supabase=await createClient();
  const email=String(formData.get("email")??"").trim();
  const password=String(formData.get("password")??"");
  const next=safeNext(formData.get("next"));
  const next=safeNext(formData.get("next"));
  const {error}=await supabase.auth.signInWithPassword({email,password});
  if(error) redirect(safeMessage(friendlyAuthError(error),next));
  redirect(next);
}

export async function signup(formData:FormData){
  const supabase=await createClient();
  const email=String(formData.get("email")??"").trim();
  const password=String(formData.get("password")??"");
  const confirmPassword=String(formData.get("confirm_password")??"");
  if(password.length<8) redirect(safeMessage("A password deve ter pelo menos 8 caracteres.",next));
  if(password!==confirmPassword) redirect(safeMessage("As passwords não coincidem.",next));
  const origin=await getAppOrigin();
  const {data,error}=await supabase.auth.signUp({
    email,password,
    options:{emailRedirectTo:`${origin}/auth/callback?next=${encodeURIComponent(next)}`}
  });
  if(error) redirect(safeMessage(friendlyAuthError(error)));
  if(data.session) redirect(next);
  redirect(safeMessage("Conta criada. Confirma o email recebido e depois inicia sessão.",next));
}

export async function resendConfirmation(formData:FormData){
  const supabase=await createClient();
  const email=String(formData.get("email")??"").trim();
  if(!email) redirect(safeMessage("Indica o email da conta."));
  const origin=await getAppOrigin();
  const {error}=await supabase.auth.resend({
    type:"signup",
    email,
    options:{emailRedirectTo:`${origin}/auth/callback?next=/dashboard`}
  });
  if(error) redirect(safeMessage(friendlyAuthError(error)));
  redirect(safeMessage("Se a conta existir e estiver pendente, foi enviado um novo email de confirmação."));
}

export async function requestPasswordReset(formData:FormData){
  const supabase=await createClient();
  const email=String(formData.get("email")??"").trim();
  if(!email) redirect(safeMessage("Indica o email da conta."));
  const origin=await getAppOrigin();
  const {error}=await supabase.auth.resetPasswordForEmail(email,{
    redirectTo:`${origin}/auth/callback?next=/auth/update-password`
  });
  if(error) redirect(safeMessage(friendlyAuthError(error)));
  redirect(safeMessage("Se a conta existir, receberás um email para definir uma nova password."));
}
