import { login, requestPasswordReset, resendConfirmation, signup } from "./actions";

export default async function LoginPage({searchParams}:{searchParams:Promise<{message?:string;next?:string}>}){
  const {message,next}=await searchParams;
  const safeNext=next?.startsWith("/")&&!next.startsWith("//")?next:"/dashboard";
  return <main className="auth-page">
    <section className="auth-card">
      <div className="auth-brand"><img src="/images/reviver-logo.png" alt="Igreja Reviver"/><div><p className="eyebrow">REVIVER DIGITAL</p><h1>Uma conta. Toda a Reviver.</h1></div></div>
      <p className="muted">Academy, Ministério de Louvor e áreas internas num único acesso.</p>
      {message&&<p className="notice" style={{marginTop:16}}>{message}</p>}
      <form className="form-grid" style={{marginTop:22}}>
        <input type="hidden" name="next" value={safeNext}/>
        <div className="field"><label>Email</label><input name="email" type="email" required autoComplete="email"/></div>
        <div className="field"><label>Password</label><input name="password" type="password" minLength={8} required autoComplete="current-password"/></div>
        <div className="field"><label>Confirmar password <span className="muted small">(apenas ao criar conta)</span></label><input name="confirm_password" type="password" minLength={8} autoComplete="new-password"/></div>
        <div className="button-row"><button className="button primary" formAction={login}>Entrar</button><button className="button" formAction={signup}>Criar conta</button></div>
        <div className="auth-secondary">
          <button className="text-button" formAction={resendConfirmation} formNoValidate>Reenviar confirmação</button>
          <button className="text-button" formAction={requestPasswordReset} formNoValidate>Esqueci a password</button>
        </div>
      </form>
      <p className="muted small" style={{marginTop:20}}>O acesso público é separado das permissões internas dos ministérios. Papéis de Admin, Mídia e Louvor são atribuídos por responsáveis autorizados.</p>
    </section>
  </main>
}
