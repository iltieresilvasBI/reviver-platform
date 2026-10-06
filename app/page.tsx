import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = typeof data?.claims?.email === "string" ? data.claims.email : null;

  return (
    <main style={{ minHeight: "100vh", padding: "48px", background: "radial-gradient(circle at 20% 20%, rgba(216,168,78,.12), transparent 34%), #0b0c0e" }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <p style={{ color: "#d8a84e", letterSpacing: ".16em", fontSize: 12, fontWeight: 800 }}>REVIVER PLATFORM</p>
        <h1 style={{ fontSize: "clamp(44px,7vw,84px)", lineHeight: .95, margin: "18px 0" }}>
          Viver. Crescer. Servir.
        </h1>
        <p style={{ color: "#9ea4ad", maxWidth: 660, lineHeight: 1.7 }}>
          Nova base técnica da Reviver Academy, Central de Conteúdo e áreas internas.
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
          {email ? (
            <span style={{ border: "1px solid #2a2f36", borderRadius: 12, padding: "12px 16px" }}>
              Sessão ativa: {email}
            </span>
          ) : (
            <Link href="/login" style={{ background: "#d8a84e", color: "#17120a", borderRadius: 12, padding: "12px 18px", fontWeight: 800 }}>
              Entrar
            </Link>
          )}
          <Link href="/api/health" style={{ border: "1px solid #2a2f36", borderRadius: 12, padding: "12px 18px" }}>
            Health API
          </Link>
        </div>
      </div>
    </main>
  );
}
