import { login, signup } from "./actions";

export default function LoginPage() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <section style={{ width: "min(460px,100%)", background: "#121418", border: "1px solid #2a2f36", borderRadius: 20, padding: 28 }}>
        <p style={{ color: "#d8a84e", fontSize: 11, fontWeight: 800, letterSpacing: ".16em" }}>REVIVER DIGITAL</p>
        <h1 style={{ margin: "10px 0 8px", fontSize: 38 }}>Entrar na Reviver</h1>
        <p style={{ color: "#9ea4ad", marginBottom: 24 }}>Uma única conta para Academy, Louvor e ferramentas internas.</p>
        <form style={{ display: "grid", gap: 14 }}>
          <label>
            <span style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Email</span>
            <input name="email" type="email" required style={{ width: "100%", borderRadius: 10, border: "1px solid #2a2f36", background: "#0b0c0e", color: "#f5f1e8", padding: 12 }} />
          </label>
          <label>
            <span style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Password</span>
            <input name="password" type="password" minLength={8} required style={{ width: "100%", borderRadius: 10, border: "1px solid #2a2f36", background: "#0b0c0e", color: "#f5f1e8", padding: 12 }} />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
            <button formAction={login} style={{ border: 0, borderRadius: 10, padding: 12, background: "#d8a84e", color: "#17120a", fontWeight: 800 }}>Entrar</button>
            <button formAction={signup} style={{ border: "1px solid #2a2f36", borderRadius: 10, padding: 12, background: "transparent", color: "#f5f1e8" }}>Criar conta</button>
          </div>
        </form>
      </section>
    </main>
  );
}
