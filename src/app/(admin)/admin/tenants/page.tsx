import { AdminService } from "@/services/admin.service";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function AdminTenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const limit = 20;

  const { tenants, total } = await AdminService.getTenantsList(page, limit);
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-slate-900">Gestão de <span className="text-indigo-600">Lojas</span></h2>
          <p className="text-slate-500 font-medium mt-1">Gerencie as instâncias e permissões do ecossistema SaaS.</p>
        </div>
        <div className="bg-white px-6 py-3 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center gap-4">
           <div className="text-right border-r pr-4 border-slate-100">
              <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Total</span>
              <span className="text-xl font-black text-slate-900">{total}</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-600">Sync Ativo</span>
           </div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-slate-200/40 border border-white/50 overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] text-slate-400">Nome / Loja</th>
              <th className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] text-slate-400">Plano Atual</th>
              <th className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] text-slate-400">Status</th>
              <th className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] text-slate-400">Data Cadastro</th>
              <th className="px-8 py-6 text-right pr-12 text-xs font-black uppercase tracking-[0.2em] text-slate-400">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/50">
            {tenants.map((tenant) => (
              <tr key={tenant.id} className="group hover:bg-slate-50/80 transition-all duration-300">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-200/50 group-hover:scale-110 transition-transform">
                      {tenant.name.substring(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{tenant.name}</div>
                      <div className="text-xs font-medium text-slate-400 lowercase italic">{tenant.slug}</div>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <Badge 
                    variant={tenant.plan === 'FREE' ? 'outline' : 'default'} 
                    className={`font-black text-[10px] tracking-widest px-3 py-1 rounded-full uppercase ${
                        tenant.plan === 'PRO' ? 'bg-violet-600 text-white shadow-lg shadow-violet-200' : 
                        tenant.plan === 'ENTERPRISE' ? 'bg-indigo-900 text-white shadow-lg shadow-indigo-300' : ''
                    }`}
                  >
                    {tenant.plan}
                  </Badge>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${tenant.isActive ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
                    <span className={`text-xs font-bold ${tenant.isActive ? 'text-green-600' : 'text-red-600 font-black'}`}>
                        {tenant.isActive ? "ATIVA" : "BLOQUEADA"}
                    </span>
                  </div>
                </td>
                <td className="px-8 py-6 text-sm font-bold text-slate-500">
                  {new Date(tenant.createdAt).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-8 py-6 text-right pr-12">
                  <Link 
                    href={`/admin/tenants/${tenant.id}`}
                    className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-5 py-2.5 rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-sm"
                  >
                    Detalhes <span className="text-lg">→</span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {tenants.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-slate-400 font-bold italic">Nenhum tenant cadastrado ainda.</p>
          </div>
        )}
      </div>
      
      {/* Basic pagination */}
      <div className="flex justify-center p-4">
         {totalPages > 1 && (
           <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-lg border border-slate-100">
              {page > 1 && (
                <Link href={`/admin/tenants?page=${page - 1}`} className="text-xs font-bold text-indigo-600 hover:underline">Anterior</Link>
              )}
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest px-4 border-x border-slate-100">
                Página {page} de {totalPages}
              </span>
              {page < totalPages && (
                <Link href={`/admin/tenants?page=${page + 1}`} className="text-xs font-bold text-indigo-600 hover:underline">Próxima</Link>
              )}
           </div>
         )}
      </div>
    </div>
  );
}
