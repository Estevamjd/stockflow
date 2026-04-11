"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Square3Stack3DIcon, 
  UsersIcon, 
  BanknotesIcon,
  HomeIcon,
  ArrowRightOnRectangleIcon
} from "@heroicons/react/24/outline";

const ADMIN_NAVIGATION = [
  { name: 'Visão Geral', href: '/admin', icon: HomeIcon },
  { name: 'Lojas (Tenants)', href: '/admin/tenants', icon: UsersIcon },
  { name: 'Assinaturas & Billing', href: '/admin/billing', icon: BanknotesIcon },
  { name: 'Planos', href: '/admin/plans', icon: Square3Stack3DIcon },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <div className="w-68 bg-gradient-to-b from-[#0F172A] via-[#1E1B4B] to-[#111827] text-white flex flex-col min-h-screen border-r border-white/5 shadow-2xl">
      <div className="h-20 flex items-center px-8 border-b border-white/5 bg-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
             <Square3Stack3DIcon className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">
            StockFlow <span className="text-indigo-400 font-light">Admin</span>
          </span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-8 space-y-2">
        {ADMIN_NAVIGATION.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative overflow-hidden ${
                isActive 
                  ? "bg-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] backdrop-blur-md border border-white/10" 
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-indigo-500 rounded-r-full shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
              )}
              <item.icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-indigo-400' : ''}`} />
              <span className="font-medium tracking-wide">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-white/5 bg-black/10 backdrop-blur-sm">
        <Link 
          href="/"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all group"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Sair do Admin</span>
        </Link>
      </div>
    </div>
  );
}
