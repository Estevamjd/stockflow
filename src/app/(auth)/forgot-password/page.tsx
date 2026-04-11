import Link from "next/link";
import { Zap, Mail, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Recuperar senha · StockFlow",
};

const SUPPORT_EMAIL = "suporte@stockflow.com";

export default function ForgotPasswordPage() {
  const subject = encodeURIComponent("Recuperação de senha — StockFlow");
  const body = encodeURIComponent(
    "Olá, preciso recuperar minha senha.\n\n" +
      "Email cadastrado: \n" +
      "Nome do tenant/empresa: \n\n" +
      "Obrigado!"
  );
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;

  return (
    <div className="w-full max-w-md">
      <div className="bg-white dark:bg-slate-900 border border-border dark:border-slate-800 rounded-2xl shadow-xl p-8 animate-fade-in">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-slate-900 dark:text-white">
            StockFlow
          </span>
        </div>

        <h1 className="text-center text-xl font-semibold text-slate-900 dark:text-white mb-2">
          Recuperar senha
        </h1>
        <p className="text-center text-sm text-slate-600 dark:text-slate-400 mb-6">
          Enquanto a recuperação automática está em desenvolvimento, entre em
          contato com o suporte e ajudaremos a redefinir sua senha.
        </p>

        <a
          href={mailto}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all shadow-lg active:scale-[0.98]"
        >
          <Mail className="w-4 h-4" />
          Falar com o suporte
        </a>

        <div className="mt-4 p-4 bg-muted/50 rounded-xl border border-border/50 text-center">
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Ou envie um email diretamente para:
            <br />
            <span className="font-mono text-slate-900 dark:text-slate-200 font-bold">
              {SUPPORT_EMAIL}
            </span>
          </p>
        </div>

        <Link
          href="/login"
          className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-primary hover:underline underline-offset-4 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para o login
        </Link>
      </div>
    </div>
  );
}
