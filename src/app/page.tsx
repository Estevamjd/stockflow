import Link from "next/link";
import {
  Zap,
  Package,
  TrendingUp,
  BarChart2,
  ShoppingBag,
  Star,
  CheckCircle,
  ArrowRight,
  ChevronRight,
} from "lucide-react";

export const metadata = {
  title: "StockFlow — Controle de Estoque para Vendedores da Shopee",
  description:
    "Controle seu estoque, vendas e lucro em um só lugar. Feito para quem vende na Shopee e trabalha com produtos personalizados.",
};

const TESTIMONIALS = [
  {
    name: "Camila R.",
    role: "Vendedora Shopee · Tubetes personalizados",
    text: "Antes eu perdia venda porque não sabia o que tinha em estoque. Com o StockFlow, isso acabou. Sei exatamente o que tenho e quanto lucrei no mês.",
    rating: 5,
  },
  {
    name: "Diego P.",
    role: "Vendedor Shopee · Kits festa",
    text: "Em 10 minutos eu já tinha tudo cadastrado e o dashboard já mostrava meu lucro do mês. Muito simples e direto ao ponto.",
    rating: 5,
  },
  {
    name: "Fernanda L.",
    role: "Empreendedora · Lembrancinhas",
    text: "O alerta de estoque baixo me salvou várias vezes. Agora nunca mais fico sem produto na hora H.",
    rating: 5,
  },
];

const BENEFITS = [
  {
    icon: Package,
    title: "Nunca mais perca vendas por falta de estoque",
    desc: "Alertas automáticos quando o estoque está baixo. Você sempre sabe o que precisa comprar antes de acabar.",
  },
  {
    icon: TrendingUp,
    title: "Saiba exatamente quanto você lucra",
    desc: "O sistema calcula automaticamente o lucro de cada venda. Sem planilha, sem dor de cabeça.",
  },
  {
    icon: BarChart2,
    title: "Controle simples, resultado real",
    desc: "Dashboard visual com tudo o que importa: vendas do dia, produtos mais vendidos e sua margem de lucro.",
  },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Cadastre seus produtos", desc: "Adicione nome, custo, preço de venda e quantidade em estoque." },
  { step: "02", title: "Registre suas vendas", desc: "Selecione os produtos vendidos. O sistema desconta do estoque automaticamente." },
  { step: "03", title: "Veja seu lucro em tempo real", desc: "Acompanhe o lucro por produto, por mês e por canal de venda." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      {/* ─── NAVBAR ─────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0f1e]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Zap className="w-5 h-5 text-blue-400" />
            StockFlow
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-slate-400">
            <a href="#beneficios" className="hover:text-white transition-colors">Benefícios</a>
            <a href="#como-funciona" className="hover:text-white transition-colors">Como funciona</a>
            <Link href="/pricing" className="hover:text-white transition-colors">Planos</Link>
          </div>
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

      {/* ─── HERO ───────────────────────────────────── */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-400 bg-blue-400/10 border border-blue-400/20 rounded-full px-4 py-2 mb-6">
            <ShoppingBag className="w-3.5 h-3.5" />
            Feito para quem vende na Shopee e trabalha com personalizados
          </div>
          <h1 className="text-4xl md:text-6xl font-black leading-tight mb-6 tracking-tight">
            Controle seu estoque e saiba{" "}
            <span className="text-blue-400">exatamente quanto você lucra</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Sem planilhas. Sem bagunça. Um dashboard simples que mostra suas vendas,
            estoque e lucro — tudo em tempo real.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold text-base transition-colors"
            >
              Começar grátis
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/pricing"
              className="flex items-center justify-center gap-2 border border-white/10 hover:border-white/30 text-slate-300 hover:text-white px-8 py-4 rounded-xl font-semibold text-base transition-all"
            >
              Ver planos
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <p className="text-slate-500 text-sm mt-5">
            Grátis para sempre no plano Free · Sem cartão de crédito
          </p>
        </div>
      </section>

      {/* ─── SOCIAL PROOF / STATS ───────────────────── */}
      <section className="pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-3 gap-6 bg-white/3 border border-white/5 rounded-2xl p-8">
            {[
              { value: "500+", label: "Vendedores ativos" },
              { value: "R$ 2M+", label: "Em vendas controladas" },
              { value: "4.9/5", label: "Avaliação média" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl md:text-3xl font-black text-white">{stat.value}</p>
                <p className="text-slate-400 text-sm mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── BENEFÍCIOS ─────────────────────────────── */}
      <section id="beneficios" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black mb-4">
              Por que usar o StockFlow?
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Pensado para a realidade de quem vende na Shopee e lida com produtos personalizados todo dia.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {BENEFITS.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="bg-white/3 border border-white/8 rounded-2xl p-6 hover:border-blue-600/30 transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-600/15 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="font-bold text-white text-base mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COMO FUNCIONA ──────────────────────────── */}
      <section id="como-funciona" className="py-20 px-6 bg-white/2">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black mb-4">
              Simples de usar desde o primeiro dia
            </h2>
            <p className="text-slate-400 text-lg">
              Comece a controlar seu estoque em menos de 10 minutos.
            </p>
          </div>
          <div className="space-y-6">
            {HOW_IT_WORKS.map(({ step, title, desc }, i) => (
              <div key={step} className="flex gap-6 items-start">
                <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-600/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-400 font-black text-sm">{step}</span>
                </div>
                <div className="flex-1 border-b border-white/5 pb-6" style={{ borderBottomWidth: i < HOW_IT_WORKS.length - 1 ? 1 : 0 }}>
                  <h3 className="font-bold text-white text-base mb-1">{title}</h3>
                  <p className="text-slate-400 text-sm">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── DEPOIMENTOS ────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black mb-4">
              Resultado de quem já usa
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="bg-white/3 border border-white/8 rounded-2xl p-6"
              >
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
                <div>
                  <p className="text-white font-semibold text-sm">{t.name}</p>
                  <p className="text-slate-500 text-xs">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA FINAL ──────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-gradient-to-br from-blue-600/20 to-blue-900/10 border border-blue-600/30 rounded-3xl p-12">
            <h2 className="text-3xl md:text-4xl font-black mb-4">
              Pronto para organizar seu negócio?
            </h2>
            <p className="text-slate-400 mb-8 text-lg">
              Comece grátis hoje. Sem cartão de crédito.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold text-base transition-colors"
              >
                Criar conta grátis
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/pricing"
                className="flex items-center justify-center gap-2 border border-white/15 hover:border-white/30 text-slate-300 hover:text-white px-8 py-4 rounded-xl font-semibold text-base transition-all"
              >
                Ver planos
              </Link>
            </div>
            <div className="flex items-center justify-center gap-6 mt-8 text-slate-500 text-sm">
              {["Grátis para sempre no Free", "Sem cartão de crédito", "Cancele quando quiser"].map((item) => (
                <div key={item} className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─────────────────────────────────── */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-slate-400">
            <Zap className="w-4 h-4 text-blue-400" />
            StockFlow
          </div>
          <p className="text-slate-600 text-sm">
            © {new Date().getFullYear()} StockFlow · Controle de estoque para vendedores
          </p>
          <div className="flex gap-4 text-sm text-slate-500">
            <Link href="/login" className="hover:text-white transition-colors">Entrar</Link>
            <Link href="/register" className="hover:text-white transition-colors">Cadastrar</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Planos</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
