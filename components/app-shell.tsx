import Link from "next/link";
import type { ReactNode } from "react";
import { WorshipThemeToggle } from "@/components/worship-theme-toggle";

type Props = { title:string; eyebrow?:string; active?:string; email?:string; variant?:"default"|"worship-member"; children:ReactNode };

const nav=[
  ["Dashboard","/dashboard"],
  ["Formação","/academy"],
  ["Vocal Gym","/vocal-gym"],
  ["Conquistas","/achievements"],
  ["Louvor","/worship"],
  ["Conteúdo","/media"],
  ["Perfil","/profile"],
  ["Admin","/admin"],
];

const worshipMemberNav=[
  ["Meu Louvor","/worship"],
  ["Repertório","/worship/repertoire"],
  ["Academy","/academy"],
  ["Biblioteca","/academy/resources"],
  ["Perfil","/profile"],
];

export function AppShell({title,eyebrow="REVIVER PLATFORM",active,email,variant="default",children}:Props){
  const visibleNav=variant==="worship-member"?worshipMemberNav:nav;
  return <div className="app-shell">
    <aside className="sidebar">
      <div><div className="brand-mark">R</div><p className="eyebrow">{eyebrow}</p><h2 className="sidebar-title">Reviver</h2>
        <nav className="sidebar-nav">{visibleNav.map(([label,href])=><Link className={active===href?"nav-item active":"nav-item"} href={href} key={href}>{label}</Link>)}</nav>
      </div>
      <div className="sidebar-footer">{email&&<span className="muted small">{email}</span>}<form action="/auth/logout" method="post"><button className="text-button">Sair</button></form></div>
    </aside>
    <main className="app-main"><header className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div>{active==="/worship"&&<WorshipThemeToggle/>}</header>{children}</main>
  </div>
}
