import { login, signup, signInWithGoogle } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const { message } = await searchParams;
  return (
    <main style={{ minHeight:"100vh", display:"grid", placeItems:"center", padding:24, background:"radial-gradient(circle at 15% 10%, rgba(216,168,78,.12), transparent 34%), #0b0c0e" }}>
      <section className="card" style={{ width:"min(480px,100%)", padding:30 }}>
        <p className="eyebrow">REVIVER DIGITAL</p>
        <h1 style={{ margin:"8px 0", fontSize:42, letterSpacing:"-.04em" }}>Uma conta. Toda a Reviver.</h1>
        <p className="muted" style={{ lineHeight:1.6 }}>Academy, Ministério de Louvor e Central de Conteúdo num único acesso.</p>
        {message && <p className="notice" style={{ marginTop:16 }}>{message}</p>}
        <form className="form-grid" style={{ marginTop:22 }}>
          <div className="field"><label>Email</label><input name="email" type="email" required autoComplete="email" /></div>
          <div className="field"><label>Password</label><input name="password" type="password" minLength={8} required autoComplete="current-password" /></div>
          <div className="button-row">
            <button className="button primary" formAction={login}>Entrar</button>
            <button className="button" formAction={signup}>Criar conta</button>
          </div>
        </form>
        <div style={{ borderTop:"1px solid var(--border)", margin:"22px 0", paddingTop:22 }}>
          <form action={signInWithGoogle}><button className="button" style={{ width:"100%" }}>Continuar com Google</button></form>
        </div>
        <p className="muted small">A verificação do email é exigida para pedidos de acesso a ministérios. A Academy pública continua separada das permissões internas.</p>
      </section>
    </main>
  );
}
