export async function GET(){
  const header="Nome completo,Nome preferido,Email,Telefone,Data nascimento,Grupo,Funções,Instrumentos,Classificação vocal,Estado,Data entrada,Observações administrativas,Autoriza notificações,Preferência comunicação\n";
  const example='Exemplo Nome,Nome,+email@exemplo.pt,+351910000000,1990-01-31,A,"cantor_principal, backing_vocal",,Tenor,ativo,2026-01-01,,não,WhatsApp\n';
  return new Response("\uFEFF"+header+example,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="modelo-importacao-ministerios.csv"',"Cache-Control":"no-store"}});
}
