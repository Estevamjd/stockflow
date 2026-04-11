import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckIcon, Square3Stack3DIcon } from "@heroicons/react/24/outline";

const PLANS_INFO = [
  {
    name: "FREE",
    price: "R$ 0",
    features: ["Até 50 produtos", "1 usuário", "Relatórios básicos", "Suporte por email"],
    limits: "50 / 1 / 0"
  },
  {
    name: "STARTER",
    price: "R$ 49/mês",
    features: ["Até 500 produtos", "2 usuários", "Exportação Excel", "Suporte prioritário"],
    limits: "500 / 2 / 1"
  },
  {
    name: "PRO",
    price: "R$ 99/mês",
    features: ["Produtos ilimitados", "5 usuários", "Integração Shopee", "Dashboard avançado"],
    limits: "∞ / 5 / 1"
  },
  {
    name: "ENTERPRISE",
    price: "Sob consulta",
    features: ["Customizado", "Usuários ilimitados", "API Access", "Gerente de conta"],
    limits: "∞ / ∞ / ∞"
  }
];

export default function AdminPlansPage() {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-1000">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-slate-900">Catálogo de <span className="text-indigo-600">Planos</span></h2>
          <p className="text-slate-500 font-medium mt-1">Níveis de serviço, preços e limites transacionais do SaaS.</p>
        </div>
        <div className="bg-indigo-600 px-6 py-3 rounded-2xl shadow-xl shadow-indigo-200 text-white font-black text-xs uppercase tracking-widest">
           SaaS v2.4 Active
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        {PLANS_INFO.map((plan) => (
          <Card key={plan.name} className="flex flex-col group relative overflow-hidden border-none shadow-2xl shadow-slate-200/50 rounded-[2rem] transition-all duration-500 hover:-translate-y-3 hover:shadow-indigo-200/50 bg-white">
            <div className={`absolute top-0 inset-x-0 h-3 bg-gradient-to-r ${
              plan.name === 'FREE' ? 'from-slate-400 to-slate-500' :
              plan.name === 'STARTER' ? 'from-blue-400 to-blue-600' :
              plan.name === 'PRO' ? 'from-indigo-500 to-violet-600' :
              'from-slate-800 to-black'
            }`} />
            
            <CardHeader className="pt-10 pb-6 px-8 text-center">
              <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-[0.25em] mb-4">{plan.name}</CardTitle>
              <div className="text-4xl font-black text-slate-900 tracking-tighter">
                {plan.price}
              </div>
            </CardHeader>
            <CardContent className="flex-1 px-8 pb-10">
               <div className="bg-slate-50 p-4 rounded-2xl mb-8 flex justify-center gap-4">
                  <div className="text-center">
                     <span className="block text-[8px] font-black text-slate-400 uppercase mb-1">Limites</span>
                     <span className="text-sm font-black text-slate-900">{plan.limits}</span>
                  </div>
               </div>
               <ul className="space-y-4">
                 {plan.features.map(f => (
                   <li key={f} className="flex items-start gap-3">
                     <div className="mt-1 w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 group-hover:bg-indigo-500 transition-colors">
                        <CheckIcon className="w-3 h-3 text-indigo-600 group-hover:text-white transition-colors" />
                     </div>
                     <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">{f}</span>
                   </li>
                 ))}
               </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-sm">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-8 px-10">
          <CardTitle className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
             <div className="w-1.5 h-10 bg-indigo-600 rounded-full" />
             Configuração de Limites Técnicos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-10">
           <div className="bg-indigo-50/30 p-8 rounded-[2rem] border border-indigo-100 flex flex-col md:flex-row items-center gap-8 group">
             <div className="w-20 h-20 rounded-3xl bg-indigo-600 flex items-center justify-center shadow-2xl shadow-indigo-200 group-hover:rotate-12 transition-transform duration-500">
                <Square3Stack3DIcon className="w-10 h-10 text-white" />
             </div>
             <div className="flex-1 text-center md:text-left">
               <p className="text-slate-600 font-bold leading-relaxed">
                 Atualmente os limites são controlados via lógica no arquivo <code className="bg-white px-3 py-1 rounded-lg border border-indigo-100 text-indigo-600 mx-1">plan-limits.ts</code>.
               </p>
               <p className="mt-4 text-indigo-600 font-black uppercase text-xs tracking-widest bg-white inline-block px-4 py-1.5 rounded-full border border-indigo-100 shadow-sm animate-pulse">
                 V2 Roadmap: Implementar editor dinâmico via Dashboard
               </p>
             </div>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
