"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function safeMessage(code: string) {
  return `/login?message=${encodeURIComponent(code)}`;
}

export async function login(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(safeMessage("Não foi possível iniciar sessão. Verifique o email e a password."));
  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const headerStore = await headers();
  const origin = headerStore.get("origin") ?? "";
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: origin ? `${origin}/auth/callback?next=/dashboard` : undefined },
  });
  if (error) redirect(safeMessage("Não foi possível criar a conta."));
  if (data.session) redirect("/dashboard");
  redirect(safeMessage("Conta criada. Confirme o email se o projeto exigir confirmação."));
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const headerStore = await headers();
  const origin = headerStore.get("origin") ?? "";
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback?next=/dashboard` },
  });
  if (error || !data.url) redirect(safeMessage("Google Login ainda não está configurado."));
  redirect(data.url);
}
