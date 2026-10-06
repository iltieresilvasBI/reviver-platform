import { updatePassword } from "./actions";
export default async function UpdatePasswordPage({searchParams}:{searchParams:Promise<{message?:string}>}){
 const {message}=await searchParams;
 return <main className="auth-page"><section className="auth-card"><p className="eyebrow">SEGURANÇA DA CONTA</p><h1>Definir nova password</h1><p className="muted">Escolhe uma password com pelo menos 8 caracteres.</p>{message&&<p className="notice" style={{marginTop:16}}>{message}</p>}<form action={updatePassword} className="form-grid" style={{marginTop:22}}><div className="field"><label>Nova password</label><input name="password" type="password" minLength={8} required autoComplete="new-password"/></div><div className="field"><label>Confirmar nova password</label><input name="confirm_password" type="password" minLength={8} required autoComplete="new-password"/></div><button className="button primary">Guardar nova password</button></form></section></main>
}
