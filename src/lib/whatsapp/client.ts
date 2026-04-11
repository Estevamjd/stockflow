export function generateWhatsAppLink(planName: string, userEmail?: string | null) {
  const phone = "5521990034905";

  const messages: Record<string, string> = {
    free: "Quero começar no plano gratuito",
    basic: "Quero assinar o plano BASIC",
    starter: "Quero assinar o plano STARTER",
    pro: "Quero assinar o plano PRO",
    premium: "Quero o plano PREMIUM e suporte completo",
    enterprise: "Quero o plano ENTERPRISE e suporte completo"
  };

  const key = planName.toLowerCase().trim();
  const text = messages[key] || `Tenho interesse no plano ${planName} do StockFlow.`;
  
  const message = encodeURIComponent(
    `Olá! ${text}\n\n📧 Email: ${userEmail || "Não informado"}\n\nPode me ajudar com a ativação?`
  );

  return `https://wa.me/${phone}?text=${message}`;
}
