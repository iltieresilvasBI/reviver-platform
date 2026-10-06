"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const PROD_URL = "https://reviver-platform-gamma.vercel.app";

function safeMessage(message: string) {
  return `/login?message=${encodeURIComponent(message)}`;
}

async function getAppOrigin() {
  const h = await headers();
  const forwardedHost = h.get("x-forwarded-host");
  const host = forwardedHost ?? h.get("host");
  const forwardedProto = h.get("x-forwarded-proto");

  if (host) {
    const proto = forwardedProto ?? (host.includes("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }

  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercelUrl) return vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;

  return PROD_URL;
}

function friendlyAuthError(error: { code?: string; message?: string }) {
  if (error.code === "email_not_confirmed") {
    return "A conta existe, mas o email ainda não foi confirmado. Usa «Reenviar confirmação» abaixo.";
  }
  if (error.code === "invalid_credentials") {
    return "Email ou password incorretos.";
  }
  if (error.code === "over_email_send_rate_limit") {
    return "O Supabase limitou temporariamente o envio de emails. Aguarda cerca de 60 segundos e tenta novamente.";
  }
  return "Não foi possível concluir a autenticação.";
}

export async function login(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(safeMessage(friendlyAuthError(error)));

  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (password.length < 8) {
    redirect(safeMessage("A password deve ter pelo menos 8 caracteres."));
  }

  const origin = await getAppOrigin();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
    },
  });

  if (error) redirect(safeMessage(friendlyAuthError(error)));
  if (data.session) redirect("/dashboard");

  // Public Reviver accounts are allowed before ministry email verification.
  // Hosted Supabase may still return no session from signUp when confirmation is enabled,
  // so sign in immediately after the database activation trigger has run.
  const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
  if (!loginError) redirect("/dashboard");

  redirect(safeMessage("Conta criada. Agora podes iniciar sessão com o email e a password escolhidos."));
}
