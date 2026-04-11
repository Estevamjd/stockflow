import { AdminService } from "@/services/admin.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { BanknotesIcon, UsersIcon, ShoppingBagIcon, Square3Stack3DIcon } from '@heroicons/react/24/outline'; // Assuming these icons are from heroicons

export default async function AdminDashboardPage() {
  const metrics = await AdminService.getSaasMetrics();

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <h2 className="text-4xl font-black tracking-tight text-slate-900 border-b-4 border-indigo-500 pb-2">
          Dashboard <span className="text-indigo-600">SaaS</span>
        </h2>
        <div className="text-right">
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Última atualização</p>
           <p className="text-sm font-semibold text-slate-600">{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        {/* MRR Card */}
        <Card className="group relative overflow-hidden border-none shadow-2xl shadow-indigo-100/40 rounded-3xl transition-all duration-300 hover:-translate-y-2 hover:shadow-indigo-200/50 hover:bg-indigo-600">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 transition-all duration-500 group-hover:scale-[2.5] group-hover:bg-white/5" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500 group-hover:text-indigo-100 transition-colors">MRR Total</CardTitle>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-white/20 group-hover:text-white transition-all">
              <BanknotesIcon className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-black text-slate-900 group-hover:text-white transition-colors tracking-tight">
              {formatCurrency(metrics.revenue.mrr)}
            </div>
            <p className="text-xs font-bold text-green-600 mt-2 bg-green-50 px-2 py-0.5 rounded-full inline-block group-hover:bg-white/10 group-hover:text-green-300 transition-all">
              +12.5% vs mês anterior
            </p>
          </CardContent>
        </Card>

        {/* Lojas Card */}
        <Card className="group relative overflow-hidden border-none shadow-2xl shadow-blue-100/40 rounded-3xl transition-all duration-300 hover:-translate-y-2 hover:shadow-blue-200/50 hover:bg-blue-600">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 transition-all duration-500 group-hover:scale-[2.5] group-hover:bg-white/5" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500 group-hover:text-blue-100 transition-colors">Lojas Ativas</CardTitle>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-white/20 group-hover:text-white transition-all">
              <UsersIcon className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-black text-slate-900 group-hover:text-white transition-colors tracking-tight">
              {metrics.tenants.active}
            </div>
            <p className="text-xs font-bold text-blue-600 mt-2 bg-blue-50 px-2 py-0.5 rounded-full inline-block group-hover:bg-white/10 group-hover:text-blue-300 transition-all">
              {metrics.tenants.total} cadastradas
            </p>
          </CardContent>
        </Card>

        {/* Vendas Card */}
        <Card className="group relative overflow-hidden border-none shadow-2xl shadow-violet-100/40 rounded-3xl transition-all duration-300 hover:-translate-y-2 hover:shadow-violet-200/50 hover:bg-violet-600">
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full -mr-16 -mt-16 transition-all duration-500 group-hover:scale-[2.5] group-hover:bg-white/5" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500 group-hover:text-violet-100 transition-colors">Total Vendas</CardTitle>
            <div className="p-2 rounded-xl bg-violet-50 text-violet-600 group-hover:bg-white/20 group-hover:text-white transition-all">
              <ShoppingBagIcon className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-black text-slate-900 group-hover:text-white transition-colors tracking-tight">
              {metrics.usage.totalSalesThisMonth}
            </div>
            <p className="text-xs font-bold text-violet-600 mt-2 bg-violet-50 px-2 py-0.5 rounded-full inline-block group-hover:bg-white/10 group-hover:text-violet-300 transition-all">
              Volume processado este mês
            </p>
          </CardContent>
        </Card>

        {/* Produtos Card */}
        <Card className="group relative overflow-hidden border-none shadow-2xl shadow-emerald-100/40 rounded-3xl transition-all duration-300 hover:-translate-y-2 hover:shadow-emerald-200/50 hover:bg-emerald-600">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 transition-all duration-500 group-hover:scale-[2.5] group-hover:bg-white/5" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500 group-hover:text-emerald-100 transition-colors">Produtos</CardTitle>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-white/20 group-hover:text-white transition-all">
              <Square3Stack3DIcon className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-black text-slate-900 group-hover:text-white transition-colors tracking-tight">
              {metrics.usage.totalProducts}
            </div>
            <p className="text-xs font-bold text-emerald-600 mt-2 bg-emerald-50 px-2 py-0.5 rounded-full inline-block group-hover:bg-white/10 group-hover:text-emerald-300 transition-all">
               Itens catalogados ativos
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 grid-cols-1">
        <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-6 px-8">
            <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
               <div className="w-2 h-8 bg-indigo-600 rounded-full" />
               Distribuição de Faturamento por Plano
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-8 px-8 pb-10">
            <div className="flex items-center gap-8 h-12">
               {Object.entries(metrics.revenue.mrrByPlan).map(([plan, amount]) => (
                 <div key={plan} className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.25em]">{plan}</span>
                       <span className="text-sm font-bold text-slate-900">{formatCurrency(Number(amount))}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-indigo-600 rounded-full transition-all duration-1000 ease-out" 
                         style={{ width: `${(Number(amount) / metrics.revenue.mrr) * 100 || 0}%` }} 
                       />
                    </div>
                 </div>
               ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
