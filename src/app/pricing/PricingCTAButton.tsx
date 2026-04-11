"use client";

import { useState } from "react";
import { Zap, ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { generateWhatsAppLink } from "@/lib/whatsapp/client";

interface PricingCTAButtonProps {
  planKey: string;
  planName: string;
  isPro: boolean;
  ctaText: string;
  userEmail?: string | null;
}

export function PricingCTAButton({ planKey, planName, isPro, ctaText, userEmail }: PricingCTAButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (planKey === "free") {
    return (
      <Link
        href="/register"
        className="flex items-center justify-center gap-2 py-3 rounded-xl border border-white/15 hover:border-white/30 text-white font-semibold text-sm transition-all"
      >
        {ctaText}
        <ArrowRight className="w-4 h-4" />
      </Link>
    );
  }

  const handleWhatsAppRedirect = () => {
    setIsLoading(true);
    toast.success("Redirecionando para o WhatsApp...", { icon: "💬" });
    
    // Pequeno delay para exibir o loading e o toast
    setTimeout(() => {
      window.open(generateWhatsAppLink(planName, userEmail), "_blank");
      setIsLoading(false);
    }, 800);
  };

  return (
    <button
      onClick={handleWhatsAppRedirect}
      disabled={isLoading}
      className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-70 ${
        isPro
          ? "bg-blue-600 hover:bg-blue-700 text-white"
          : "border border-white/15 hover:border-white/30 text-white"
      }`}
    >
      {isLoading ? (
        <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
      ) : (
        <>
          {isPro && <Zap className="w-4 h-4" />}
          {ctaText}
          <ExternalLink className="w-4 h-4 opacity-50 ml-1" />
        </>
      )}
    </button>
  );
}
