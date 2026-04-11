"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Zap, PlayCircle, RotateCcw, CheckCircle, AlertCircle } from "lucide-react";

export default function IntegrationsPage() {
  const [mockMode, setMockMode] = useState(true);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);

  const generateSaleMutation = useMutation({
    mutationFn: () => fetch("/api/mock/generate-sale", { method: "POST" }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Venda simulada gerada com sucesso!");
        setLastResult({ success: true, message: `Venda criada: ${data.data?.id ?? ""}` });
      } else {
        toast.error(data.error);
        setLastResult({ success: false, message: data.error });
      }
    },
    onError: () => toast.error("Erro na simulação"),
  });

  const webhookMutation = useMutation({
    mutationFn: () => fetch("/api/mock/simulate-webhook", { method: "POST" }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Webhook simulado com sucesso!");
        setLastResult({ success: true, message: "Webhook processado" });
      } else {
        toast.error(data.error);
        setLastResult({ success: false, message: data.error });
      }
    },
    onError: () => toast.error("Erro na simulação"),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Integrações</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure e teste suas integrações de marketplace</p>
      </div>

      {/* Shopee Card */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <Zap className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Shopee</h2>
            <p className="text-sm text-muted-foreground">Sincronização de pedidos via API ou Mock</p>
          </div>
          <div className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${mockMode ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-green-100 text-green-700"}`}>
            {mockMode ? "Modo Mock" : "Produção"}
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <label className="flex items-center gap-2 cursor-pointer">
            <div className={`relative w-10 h-6 rounded-full transition-colors ${mockMode ? "bg-amber-400" : "bg-primary"}`}
              onClick={() => setMockMode(!mockMode)}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${mockMode ? "left-1" : "left-5"}`} />
            </div>
            <span className="text-sm text-foreground">Modo simulação (sem credenciais reais)</span>
          </label>
        </div>

        {mockMode && (
          <div className="space-y-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">🧪 Ambiente de teste ativo</p>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Gere vendas e webhooks simulados para testar o sistema sem precisar de credenciais reais da Shopee.
            </p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => generateSaleMutation.mutate()}
                disabled={generateSaleMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
                <PlayCircle className="w-4 h-4" />
                {generateSaleMutation.isPending ? "Gerando..." : "Gerar Venda Simulada"}
              </button>
              <button
                onClick={() => webhookMutation.mutate()}
                disabled={webhookMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors disabled:opacity-60">
                <RotateCcw className="w-4 h-4" />
                {webhookMutation.isPending ? "Simulando..." : "Simular Webhook"}
              </button>
            </div>
            {lastResult && (
              <div className={`flex items-start gap-2 text-sm p-3 rounded-lg ${lastResult.success ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400" : "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400"}`}>
                {lastResult.success ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                {lastResult.message}
              </div>
            )}
          </div>
        )}

        {!mockMode && (
          <div className="space-y-3">
            {[
              { label: "Partner ID", placeholder: "12345" },
              { label: "Partner Key", placeholder: "••••••••" },
              { label: "Shop ID", placeholder: "67890" },
              { label: "Access Token", placeholder: "••••••••" },
              { label: "Webhook Secret", placeholder: "••••••••" },
            ].map(({ label, placeholder }) => (
              <div key={label}>
                <label className="text-xs font-medium text-muted-foreground">{label}</label>
                <input type={label.includes("Key") || label.includes("Token") || label.includes("Secret") ? "password" : "text"}
                  placeholder={placeholder} readOnly
                  className="w-full mt-1 px-3 py-2 text-sm bg-muted rounded-lg border border-input text-muted-foreground cursor-not-allowed" />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">Configure as credenciais via variáveis de ambiente no servidor.</p>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-medium text-foreground mb-2">Webhook URL</h3>
        <code className="block bg-muted px-3 py-2 rounded-lg text-xs text-muted-foreground font-mono break-all">
          {typeof window !== "undefined" ? window.location.origin : "https://seu-dominio.com"}/api/webhooks/shopee
        </code>
        <p className="text-xs text-muted-foreground mt-2">Configure esta URL no painel de parceiros da Shopee para receber eventos de pedidos.</p>
      </div>
    </div>
  );
}
