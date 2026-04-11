import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminSidebar from "./components/AdminSidebar";
import type { SessionUser } from "@/types";

export const metadata: Metadata = {
  title: "Admin | StockFlow SaaS",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Defesa em profundidade — o middleware já bloqueia, mas se alguém
  // editar o middleware no futuro o layout continua seguro.
  // SOMENTE SUPERADMIN entra aqui. OWNER é dono de tenant, não do SaaS.
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as SessionUser | undefined)?.role;

  if (!session || userRole !== "SUPERADMIN") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans antialiased text-slate-900">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Modern Header with Glassmorphism */}
        <header className="h-20 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 flex items-center px-10 sticky top-0 z-40 transition-all duration-300">
          <div className="flex flex-col">
            <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-700 via-blue-600 to-indigo-800 bg-clip-text text-transparent italic">
              SuperAdmin <span className="text-slate-300 not-italic font-light mx-2">|</span> <span className="not-italic text-slate-800 font-bold uppercase text-[10px] tracking-[0.2em]">Management</span>
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100/50 text-indigo-600 text-[11px] font-bold uppercase tracking-wider shadow-sm">
              Dashboard Live
            </div>
          </div>
        </header>

        <main className="p-10 flex-1 overflow-auto custom-scrollbar bg-gradient-to-br from-transparent via-indigo-50/10 to-transparent">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
