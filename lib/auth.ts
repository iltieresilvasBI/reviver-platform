import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/login");
  return { supabase, userId: String(claims.sub), email: String(claims.email ?? "") };
}

export async function getAccessContext() {
  const { supabase, userId, email } = await requireUser();

  const [{ data: profile }, { data: appRoles }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("id,display_name,avatar_url,phone,global_role").eq("id", userId).maybeSingle(),
    supabase.from("user_app_roles").select("role,revoked_at").eq("user_id", userId).is("revoked_at", null),
    supabase.from("network_memberships").select("role,status,network_id,networks(slug,name)").eq("user_id", userId),
  ]);

  const roles = new Set((appRoles ?? []).map((r) => r.role));
  const activeMemberships = (memberships ?? []).filter((m) => m.status === "active");

  return {
    supabase,
    userId,
    email,
    profile,
    isAdmin: profile?.global_role === "admin",
    isMediaEditor: roles.has("media_editor"),
    isMediaLeader: roles.has("media_leader"),
    memberships: activeMemberships,
    isWorshipMember: activeMemberships.some((m: any) => m.networks?.slug === "worship"),
    isWorshipLeader: activeMemberships.some((m: any) => m.networks?.slug === "worship" && m.role === "leader"),
  };
}
