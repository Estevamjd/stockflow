import prisma from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default async function AdminBillingPage() {
  const billingEvents = await prisma.billingEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { tenant: true }
  });

  const mrr = await prisma.subscription.aggregate({
    _sum: { priceMonthly: true },
    where: { status: 'ACTIVE' }
  });

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-1000">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-slate-900">Assinaturas & <span className="text-indigo-600">Billing</span></h2>
          <p className="text-slate-500 font-medium mt-1">Gestão global de pagamentos e saúde financeira do SaaS.</p>
        </div>
        <div className="bg-white px-8 py-4 rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-100 flex items-center gap-6">
           <div className="text-right border-r pr-6 border-slate-100">
              <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">MRR Atual</span>
              <span className="text-3xl font-black text-indigo-600">{formatCurrency(Number(mrr._sum.priceMonthly || 0))}</span>
           </div>
           <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                 <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              </div>
           </div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-slate-200/40 border border-white/50 overflow-hidden">
        <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
           <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <div className="w-2 h-8 bg-indigo-600 rounded-full" />
              Fluxo Recente de Cobranças
           </h3>
           <Badge variant="outline" className="font-black text-[10px] tracking-widest px-4 py-1.5 rounded-full uppercase bg-white">Real-time Sync</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-10 py-6 text-xs font-black uppercase tracking-[0.2em] text-slate-400">Data / Hora</th>
                <th className="px-10 py-6 text-xs font-black uppercase tracking-[0.2em] text-slate-400">Cliente / Loja</th>
                <th className="px-10 py-6 text-xs font-black uppercase tracking-[0.2em] text-slate-400">Operação</th>
                <th className="px-10 py-6 text-xs font-black uppercase tracking-[0.2em] text-slate-400">Valor Bruto</th>
                <th className="px-10 py-6 text-right pr-12 text-xs font-black uppercase tracking-[0.2em] text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50">
              {billingEvents.map((evt) => (
                <tr key={evt.id} className="group hover:bg-slate-50/80 transition-all duration-300">
                  <td className="px-10 py-6">
                    <div className="text-sm font-bold text-slate-900">{formatDate(evt.createdAt)}</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">ID: {evt.id.substring(0,8)}</div>
                  </td>
                  <td className="px-10 py-6">
                    <div className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                      {evt.tenant?.name ?? "— Sem tenant —"}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 italic lowercase">
                      {evt.tenant?.slug ?? "(órfão)"}
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <Badge variant="outline" className="font-black text-[9px] tracking-widest px-2 py-0.5 rounded-md uppercase border-slate-200 bg-white">
                      {evt.type}
                    </Badge>
                  </td>
                  <td className="px-10 py-6">
                    <span className="text-sm font-black text-slate-900">
                      {evt.amount ? formatCurrency(Number(evt.amount)) : "—"}
                    </span>
                  </td>
                  <td className="px-10 py-6 text-right pr-12">
                    <Badge 
                      className={`font-black text-[10px] tracking-widest px-4 py-1.5 rounded-full uppercase shadow-sm ${
                        evt.status === 'processed' 
                          ? 'bg-emerald-500 text-white shadow-emerald-200' 
                          : 'bg-amber-500 text-white shadow-amber-200'
                      }`}
                    >
                      {evt.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {billingEvents.length === 0 && (
            <div className="py-20 text-center">
               <p className="text-slate-400 font-bold italic">Nenhum evento de faturamento registrado.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
