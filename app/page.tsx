import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage(){
  const supabase=await createClient(); const {data}=await supabase.auth.getClaims();
  const signedIn=Boolean(data?.claims?.sub);
  return <main style={{minHeight:"100vh",padding:"48px 24px",background:"radial-gradient(circle at 20% 20%, rgba(216,168,78,.12), transparent 34%), #0b0c0e"}}>
    <div style={{maxWidth:980,margin:"0 auto",paddingTop:"8vh"}}>
      <p className="eyebrow">REVIVER PLATFORM</p>
      <h1 style={{fontSize:"clamp(54px,9vw,112px)",lineHeight:.9,letterSpacing:"-.06em",margin:"20px 0"}}>Viver. Crescer. Servir.</h1>
      <p className="muted" style={{maxWidth:700,fontSize:18,lineHeight:1.7}}>Reviver Academy, Vocal Gym, Ministério de Louvor e Central de Conteúdo numa única plataforma.</p>
      <div className="button-row" style={{marginTop:30}}>
        <Link className="button primary" href={signedIn?"/dashboard":"/login"}>{signedIn?"Abrir dashboard":"Entrar"}</Link>
        <Link className="button" href="/api/health">Estado da plataforma</Link>
      </div>
      <div className="grid grid-3" style={{marginTop:70}}>
        <div className="card"><p className="eyebrow">ACADEMY</p><h3>Formação vocal</h3><p className="muted">Aulas, quizzes, progresso, XP e conquistas.</p></div>
        <div className="card"><p className="eyebrow">MINISTÉRIO</p><h3>Área interna do Louvor</h3><p className="muted">Escalas, ensaios, repertório, avisos e recursos.</p></div>
        <div className="card"><p className="eyebrow">MÍDIA</p><h3>Central de Conteúdo</h3><p className="muted">Fluxo editorial com aprovação, agenda e API pública.</p></div>
      </div>
    </div>
  </main>
}
