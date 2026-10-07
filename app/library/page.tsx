import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

export default async function LibraryPage(){
  const {supabase,email}=await requireUser();
  const {data:resources}=await supabase.from("academy_resources")
    .select("id,title,description,category,resource_type,storage_path,external_url,mime_type,file_size_bytes,sort_order")
    .eq("active",true).order("category").order("sort_order").order("created_at",{ascending:false});

  const items=await Promise.all((resources??[]).map(async (r:any)=>{
    let href=r.external_url as string|null;
    if(!href&&r.storage_path){
      const {data}=await supabase.storage.from("academy-documents").createSignedUrl(r.storage_path,3600);
      href=data?.signedUrl??null;
    }
    return {...r,href};
  }));

  const categories=[...new Set(items.map((r:any)=>r.category))];

  return <AppShell title="Biblioteca" active="/library" email={email}>
    <section className="hero-card">
      <p className="eyebrow">REVIVER ACADEMY</p>
      <h2>Apostilas, guias e documentos.</h2>
      <p>Materiais de apoio organizados para estudo individual, ensaios e formação da equipa.</p>
    </section>

    {items.length===0?<div className="empty" style={{marginTop:18}}>A biblioteca ainda não possui documentos publicados.</div>:
      categories.map(category=><section key={category}>
        <div className="section-title"><h2>{category}</h2></div>
        <div className="grid grid-3">
          {items.filter((r:any)=>r.category===category).map((r:any)=><article className="card resource-card" key={r.id}>
            <span className="pill gold">{r.resource_type}</span>
            <h3>{r.title}</h3>
            <p className="muted">{r.description||"Material complementar da Reviver Academy."}</p>
            <div className="resource-meta">
              {r.mime_type&&<span className="muted small">{r.mime_type.split("/").pop()?.toUpperCase()}</span>}
              {r.file_size_bytes&&<span className="muted small">{Math.max(1,Math.round(r.file_size_bytes/1024))} KB</span>}
            </div>
            {r.href?<a className="button primary" href={r.href} target="_blank" rel="noopener noreferrer">Abrir material</a>:<span className="muted small">Ficheiro indisponível.</span>}
          </article>)}
        </div>
      </section>)
    }
  </AppShell>
}
