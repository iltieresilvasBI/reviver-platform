import Link from "next/link";
import type { ReactNode } from "react";

export function PublicSiteShell({children}:{children:ReactNode}){
  return <div style={{minHeight:"100vh",background:"#0b0c0e",color:"#f5f1e8"}}>
    <header style={{position:"sticky",top:0,zIndex:20,backdropFilter:"blur(18px)",background:"rgba(11,12,14,.86)",borderBottom:"1px solid #2a2f36"}}>
      <div style={{maxWidth:1180,margin:"0 auto",padding:"16px 22px",display:"flex",gap:22,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"}}>
        <Link href="/" style={{fontWeight:900,letterSpacing:"-.03em",fontSize:22}}>REVIVER</Link>
        <nav style={{display:"flex",gap:16,flexWrap:"wrap",fontSize:13,color:"#c9c5bb"}}>
          <Link href="/eventos">Eventos</Link><Link href="/redes">Redes</Link><Link href="/louvor">Louvor</Link><Link href="/midia">Mídia</Link><Link href="/noticias">Notícias</Link><Link href="/campanhas">Campanhas</Link><Link href="/sobre">Sobre</Link><Link href="/contactos">Contactos</Link>
        </nav>
        <Link className="button primary" href="/login">Academy</Link>
      </div>
    </header>
    {children}
    <footer style={{borderTop:"1px solid #2a2f36",marginTop:70}}>
      <div style={{maxWidth:1180,margin:"0 auto",padding:"34px 22px",display:"flex",justifyContent:"space-between",gap:20,flexWrap:"wrap"}}>
        <div><strong>Igreja Reviver</strong><p className="muted small">Viver. Crescer. Servir.</p></div>
        <Link href="/login" className="muted small">Reviver Academy</Link>
      </div>
    </footer>
  </div>
}
