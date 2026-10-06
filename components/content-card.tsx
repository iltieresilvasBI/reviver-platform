import Link from "next/link";

export function ContentCard({item,href}:{item:any,href?:string}){
  const cover=item.media?.find((m:any)=>m.media_type==="cover")??item.media?.[0];
  const inner=<><div style={{aspectRatio:"16/9",borderRadius:14,overflow:"hidden",background:"#111317",marginBottom:14}}>
    {cover?.external_url?<img src={cover.external_url} alt={cover.alt_text??item.title} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:item.youtube_id?<img src={`https://i.ytimg.com/vi/${item.youtube_id}/hqdefault.jpg`} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{height:"100%",display:"grid",placeItems:"center",color:"#6f747b"}}>REVIVER</div>}
  </div><span className="pill gold">{item.content_type}</span><h3 style={{fontSize:22,margin:"10px 0 6px"}}>{item.title}</h3><p className="muted" style={{lineHeight:1.6}}>{item.summary}</p>
  {item.event_start&&<p className="small">{new Date(item.event_start).toLocaleString("pt-PT")}{item.event_location?` · ${item.event_location}`:""}</p>}</>;
  return href?<Link className="card" href={href}>{inner}</Link>:<article className="card">{inner}</article>
}
