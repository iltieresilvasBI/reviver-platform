import {createClient} from "@/lib/supabase/server";

export async function GET(){
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  const uid=claims?.claims?.sub;
  if(!uid) return Response.json({ok:false,error:"Authentication required."},{status:401});

  const [{data:profile},{data:network}]=await Promise.all([
    supabase.from("profiles").select("global_role").eq("id",String(uid)).maybeSingle(),
    supabase.from("networks").select("id").eq("slug","worship").eq("active",true).maybeSingle(),
  ]);
  const {data:membership}=network
    ?await supabase.from("network_memberships").select("role,status").eq("network_id",network.id).eq("user_id",String(uid)).maybeSingle()
    :{data:null as any};
  const canLead=profile?.global_role==="admin"||(membership?.status==="active"&&membership?.role==="leader");
  if(!canLead) return Response.json({ok:false,error:"Leader access required."},{status:403});

  const header="Nome completo,Nome preferido,Email,Telefone,Data nascimento,Grupo,Funções,Instrumentos,Classificação vocal,Estado,Data entrada,Observações administrativas,Autoriza notificações,Preferência comunicação\n";
  const example='Exemplo Nome,Nome,+email@exemplo.pt,+351910000000,1990-01-31,A,"cantor_principal, backing_vocal",,Tenor,ativo,2026-01-01,,não,WhatsApp\n';
  return new Response("\uFEFF"+header+example,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="modelo-importacao-ministerios.csv"',"Cache-Control":"no-store"}});
}
