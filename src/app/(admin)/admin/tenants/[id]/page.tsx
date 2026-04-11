import { AdminService } from "@/services/admin.service";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { AdminTenantActions } from "./AdminTenantActions";

export default async function TenantDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenant = await AdminService.getTenantDetail(id);
  if (!tenant) return notFound();

  return (
    <div className="space-y-10 animate-in fade-in duration-1000">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-white p-8 rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600" />
        <div>
          <h2 className="text-4xl font-black tracking-tight text-slate-900 uppercase">{tenant.name}</h2>
          <div className="flex items-center gap-4 mt-2">
            <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-black text-xs tracking-widest uppercase italic border border-indigo-100">
              {tenant.slug}
            </span>
            <span className="text-slate-400 font-bold text-xs tracking-tight">ID: {tenant.id}</span>
          </div>
        </div>
        <div className="flex items-center">
           <AdminTenantActions 
              tenantId={tenant.id} 
              isActive={tenant.isActive} 
              currentPlan={tenant.plan} 
            />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <Card className="border-none shadow-2xl shadow-slate-200/40 rounded-[2rem] overflow-hidden bg-white/90 backdrop-blur-sm">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-6 px-8 flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-extrabold text-slate-900 tracking-tight">Configuração de Assinatura</CardTitle>
              <Badge variant="outline" className="font-black text-[10px] tracking-[0.2em]">{tenant.plan}</Badge>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-slate-50/80 p-6 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-colors">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Status do Gateway</div>
                  <div className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {tenant.subscription?.status || 'NÃO INTEGRADO'}
                  </div>
                </div>
                <div className="bg-slate-50/80 p-6 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-colors">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Próxima Renovação</div>
                  <div className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {tenant.subscription?.currentPeriodEnd ? 
                      format(tenant.subscription.currentPeriodEnd, "dd 'de' MMMM, yyyy", { locale: ptBR }) : '-'}
                  </div>
                </div>
                <div className="sm:col-span-2 bg-indigo-50/30 p-6 rounded-2xl border border-indigo-100 flex items-center justify-between">
                   <div>
                      <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Gateway Reference</div>
                      <div className="font-mono text-sm text-indigo-900 font-bold truncate max-w-[300px]">
                        {tenant.subscription?.stripeSubscriptionId || tenant.subscription?.mercadoPagoSubId || 'MÉTODO MANUAL'}
                      </div>
                   </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-2xl shadow-slate-200/40 rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-6 px-8">
              <CardTitle className="text-xl font-extrabold text-slate-900 tracking-tight">Equipe da Loja</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100/50 text-slate-400 uppercase tracking-widest font-black text-[10px]">
                      <tr>
                        <th className="px-8 py-5">Nome</th>
                        <th className="px-8 py-5">Contato</th>
                        <th className="px-8 py-5">Função</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tenant.users.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-5 font-bold text-slate-900">{u.name}</td>
                          <td className="px-8 py-5 text-slate-500 font-medium">{u.email}</td>
                          <td className="px-8 py-5">
                            <Badge variant="outline" className="font-black text-[10px] bg-white border-slate-200">{u.role}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
               </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="border-none shadow-2xl shadow-slate-200/40 rounded-[2rem] overflow-hidden bg-gradient-to-br from-indigo-600 to-blue-700 text-white">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-tight text-white/90">Uso Vitalício</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-between items-center bg-white/10 p-4 rounded-2xl backdrop-blur-md">
                <span className="text-xs font-bold text-white/70 uppercase">Produtos</span>
                <span className="font-black text-2xl">{tenant._count.products}</span>
              </div>
              <div className="flex justify-between items-center bg-white/10 p-4 rounded-2xl backdrop-blur-md">
                <span className="text-xs font-bold text-white/70 uppercase">Vendas</span>
                <span className="font-black text-2xl">{tenant._count.sales}</span>
              </div>
              <div className="flex justify-between items-center bg-white/10 p-4 rounded-2xl backdrop-blur-md">
                <span className="text-xs font-bold text-white/70 uppercase">Time Adm</span>
                <span className="font-black text-2xl">{tenant.users.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-2xl shadow-slate-200/40 rounded-[2rem] overflow-hidden">
             <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-6 px-8">
              <CardTitle className="text-xl font-extrabold text-slate-900 tracking-tight">Timeline de Faturamento</CardTitle>
            </CardHeader>
            <CardContent className="p-8">
               <div className="space-y-6 max-h-80 overflow-y-auto custom-scrollbar pr-4">
                 {tenant.billingEvents.length === 0 ? (
                   <div className="text-center py-10 italic text-slate-400 font-bold">Nenhum evento registrado.</div>
                 ) : (
                   tenant.billingEvents.map(evt => (
                     <div key={evt.id} className="relative pl-6 pb-6 last:pb-0 border-l border-slate-100">
                        <div className={`absolute left-0 top-0 -ml-[4.5px] w-2 h-2 rounded-full ${evt.status==='processed' ? 'bg-green-500' : 'bg-slate-300'}`} />
                        <div className="text-xs font-black text-slate-900 uppercase tracking-tight mb-1">{evt.type}</div>
                        <div className="flex justify-between items-center">
                           <span className="text-[10px] font-bold text-slate-400">{format(evt.createdAt, "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
                           {evt.amount && <span className="text-xs font-black text-green-600">R$ {Number(evt.amount).toFixed(2)}</span>}
                        </div>
                     </div>
                   ))
                 )}
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
