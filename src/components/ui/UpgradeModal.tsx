"use client";

import { X, Zap, TrendingUp, Package, Bell, BarChart2, Infinity, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { generateWhatsAppLink } from "@/lib/whatsapp/client";
import { useSession } from "next-auth/react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  currentPlan?: string;
  limitType?: 'products' | 'users' | 'sales' | 'features';
}

const PRO_BENEFITS = [
  { icon: Package,    text: "Produtos ilimitados" },
  { icon: Infinity,   text: "Vendas ilimitadas por mês" },
  { icon: BarChart2,  text: "Relatórios avançados de lucro" },
  { icon: Bell,       text: "Alertas inteligentes de estoque" },
  { icon: TrendingUp, text: "Integração automática com Shopee" },
];

export function UpgradeModal({
  isOpen,
  onClose,
  title,
  description,
  currentPlan = "free",
  limitType,
}: UpgradeModalProps) {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleWhatsAppRedirect = () => {
    setIsLoading(true);
    toast.success("Redirecionando para o WhatsApp...", { icon: "💬" });
    const userEmail = session?.user?.email;

    setTimeout(() => {
      window.open(generateWhatsAppLink("Pro ou Premium", userEmail), "_blank");
      setIsLoading(false);
      onClose();
    }, 800);
  };

  let finalTitle = title || "Você atingiu o limite do seu plano";
  const finalDesc = description || "Faça upgrade para ter acesso total e ilimitado a todas as funcionalidades do sistema.";
  
  if (!title) {
    switch (limitType) {
      case 'products': finalTitle = "Limite de Produtos Atingido"; break;
      case 'users': finalTitle = "Limite de Usuários Atingido"; break;
      case 'sales': finalTitle = "Limite de Vendas Mensais Atingido"; break;
      case 'features': finalTitle = "Funcionalidade Premium"; break;
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 z-10">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">{finalTitle}</h2>
            <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">Plano atual: {currentPlan}</p>
          </div>
        </div>

        <p className="text-slate-300 text-sm mb-5">{finalDesc}</p>

        {/* Benefícios */}
        <div className="bg-slate-800/60 rounded-xl p-4 mb-5 border border-slate-700">
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3">
            ✦ O que você ganha com o Pro
          </p>
          <ul className="space-y-2">
            {PRO_BENEFITS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2 text-sm text-slate-200">
                <Icon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Ações */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleWhatsAppRedirect}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-75 text-white font-bold text-sm transition-colors"
          >
            {isLoading ? (
               <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
               <>
                 <Zap className="w-4 h-4" />
                 Falar com a equipe pelo WhatsApp
                 <ArrowUpRight className="w-4 h-4 opacity-70 ml-1" />
               </>
            )}
          </button>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-300 text-sm py-2 transition-colors"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}
