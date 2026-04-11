import Link from "next/link";
import { Zap, Check, X } from "lucide-react";
import { PLANS, type PlanKey } from "@/lib/plans";

export const metadata = {
  title: "Planos — StockFlow",
  description: "Escolha o plano ideal para o seu negócio. Comece grátis hoje.",
};

const PLAN_ORDER: PlanKey[] = ["free", "basic", "pro", "premium"];

const FEATURE_LIST = [
  { key: "maxProducts",           label: "Produtos" },
  { key: "maxSalesPerMonth",      label: "Vendas por mês" },
  { key: "maxUsers",              label: "Usuários" },
  { key: "excelExport",           label: "Exportação Excel" },
  { key: "advancedReports",       label: "Relatórios avançados" },
  { key: "smartAlerts",           label: "Alertas inteligentes" },
  { key: "shopeeAutoIntegration", label: "Integração Shopee automática" },
  { key: "multiStore",            label: "Multi-loja" },
  { key: "prioritySupport",       label: "Suporte prioritário" },
  { key: "apiAccess",             label: "API (em breve)" },
];

function formatFeatureValue(key: string, plan: (typeof PLANS)[PlanKey]): React.ReactNode {
  if (key === "maxProducts") {
    return plan.maxProducts === null ? "Ilimitado" : `até ${plan.maxProducts}`;
  }
  if (key === "maxSalesPerMonth") {
    return plan.maxSalesPerMonth === null ? "Ilimitado" : `até ${plan.maxSalesPerMonth}`;
  }
  if (key === "maxUsers") {
    return plan.maxUsers >= 999 ? "Ilimitado" : `${plan.maxUsers} usuário${plan.maxUsers > 1 ? "s" : ""}`;
  }
  const featureValue = (plan.features as unknown as Record<string, boolean>)[key];
  return featureValue ? (
    <Check className="w-4 h-4 text-green-400 mx-auto" />
  ) : (
    <X className="w-4 h-4 text-slate-600 mx-auto" />
  );
}

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PricingCTAButton } from "./PricingCTAButton";

export default async function PricingPage() {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      {/* ─── NAVBAR ─────────────────────────────────── */}
      <nav className="border-b border-white/5 bg-[#0a0f1e]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <Zap className="w-5 h-5 text-blue-400" />
            StockFlow
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-300 hover:text-white transition-colors">
              Entrar
            </Link>
            <Link
              href="/register"
              className="text-sm bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              Começar grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── HEADER ─────────────────────────────────── */}
      <section className="py-16 px-6 text-center">
        <h1 className="text-4xl md:text-5xl font-black mb-4">
          Planos simples e transparentes
        </h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto">
          Comece grátis e faça upgrade quando precisar crescer. Sem surpresas na fatura.
        </p>
      </section>

      {/* ─── CARDS DE PLANOS ────────────────────────── */}
      <section className="pb-16 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-6">
          {PLAN_ORDER.map((key) => {
            const plan = PLANS[key];
            const isPro = key === "pro";
            return (
              <div
                key={key}
                className={`relative rounded-2xl p-6 flex flex-col border transition-all ${
                  isPro
                    ? "bg-blue-600/10 border-blue-500 ring-1 ring-blue-500/50"
                    : "bg-white/3 border-white/8 hover:border-white/15"
                }`}
              >
                {isPro && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      ✦ Mais popular
                    </span>
                  </div>
                )}

                {/* Plano info */}
                <div className="mb-6">
                  <h2 className="text-lg font-black text-white mb-1">{plan.name}</h2>
                  <p className="text-slate-400 text-xs mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">
                      {plan.price === null
                        ? "—"
                        : plan.price === 0
                        ? "Grátis"
                        : `R$ ${(plan.price / 100).toFixed(2).replace(".", ",")}`}
                    </span>
                    {plan.price !== null && plan.price > 0 && (
                      <span className="text-slate-500 text-sm">/mês</span>
                    )}
                  </div>
                </div>

                {/* Limites rápidos */}
                <div className="space-y-2 mb-6 flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Produtos</span>
                    <span className="text-white font-semibold">
                      {plan.maxProducts === null ? "Ilimitado" : `até ${plan.maxProducts}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Vendas/mês</span>
                    <span className="text-white font-semibold">
                      {plan.maxSalesPerMonth === null ? "Ilimitado" : `até ${plan.maxSalesPerMonth}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Usuários</span>
                    <span className="text-white font-semibold">
                      {plan.maxUsers >= 999 ? "Ilimitado" : plan.maxUsers}
                    </span>
                  </div>

                  <div className="border-t border-white/5 my-3" />

                  {/* Features */}
                  {[
                    { key: "excelExport", label: "Exportação Excel" },
                    { key: "advancedReports", label: "Relatórios avançados" },
                    { key: "smartAlerts", label: "Alertas inteligentes" },
                    { key: "shopeeAutoIntegration", label: "Integração Shopee" },
                    { key: "multiStore", label: "Multi-loja" },
                    { key: "prioritySupport", label: "Suporte prioritário" },
                  ].map(({ key: fKey, label }) => {
                    const has = (plan.features as unknown as Record<string, boolean>)[fKey];
                    return (
                      <div key={fKey} className="flex items-center gap-2 text-sm">
                        {has ? (
                          <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-slate-700 flex-shrink-0" />
                        )}
                        <span className={has ? "text-slate-300" : "text-slate-600"}>{label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* CTA */}
                <PricingCTAButton 
                  planKey={key}
                  planName={plan.name}
                  ctaText={plan.cta}
                  isPro={isPro}
                  userEmail={userEmail}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── TABELA COMPARATIVA ─────────────────────── */}
      <section className="pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-black text-center mb-8">Comparação completa</h2>
          <div className="bg-white/2 border border-white/8 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8">
                  <th className="text-left px-5 py-4 text-slate-400 font-semibold w-40">
                    Funcionalidade
                  </th>
                  {PLAN_ORDER.map((key) => (
                    <th
                      key={key}
                      className={`px-5 py-4 text-center font-bold ${
                        key === "pro" ? "text-blue-400" : "text-white"
                      }`}
                    >
                      {PLANS[key].name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURE_LIST.map(({ key, label }, index) => (
                  <tr
                    key={key}
                    className={`border-b border-white/5 ${
                      index % 2 === 0 ? "bg-white/1" : ""
                    }`}
                  >
                    <td className="px-5 py-3 text-slate-300">{label}</td>
                    {PLAN_ORDER.map((planKey) => (
                      <td key={planKey} className="px-5 py-3 text-center text-white font-medium">
                        {formatFeatureValue(key, PLANS[planKey])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── FAQ RÁPIDO ─────────────────────────────── */}
      <section className="pb-20 px-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-black text-center mb-8">Perguntas frequentes</h2>
          <div className="space-y-4">
            {[
              {
                q: "O plano Free é realmente grátis para sempre?",
                a: "Sim. O plano Free é permanentemente gratuito, com limite de 100 produtos e 500 vendas por mês.",
              },
              {
                q: "Como faço upgrade para um plano pago?",
                a: "Entre em contato via e-mail e nossa equipe ativa o plano manualmente. Integração de pagamento automático em breve.",
              },
              {
                q: "Posso cancelar a qualquer momento?",
                a: "Sim. Sem fidelidade, sem multa. Cancele quando quiser e fique no plano Free.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="bg-white/2 border border-white/8 rounded-xl p-5">
                <p className="font-semibold text-white mb-2">{q}</p>
                <p className="text-slate-400 text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─────────────────────────────────── */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-slate-400">
            <Zap className="w-4 h-4 text-blue-400" />
            StockFlow
          </Link>
          <p className="text-slate-600 text-sm">
            © {new Date().getFullYear()} StockFlow · Controle de estoque para vendedores
          </p>
          <div className="flex gap-4 text-sm text-slate-500">
            <Link href="/login" className="hover:text-white transition-colors">Entrar</Link>
            <Link href="/register" className="hover:text-white transition-colors">Cadastrar</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
