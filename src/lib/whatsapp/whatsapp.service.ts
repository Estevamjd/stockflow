export class WhatsAppService {
  private static async logOnly(message: string): Promise<boolean> {
    console.log(`[WhatsApp - ADMIN]: \n${message}\n`);
    return true;
  }

  static async sendToAdmin(message: string): Promise<boolean> {
    const provider = process.env.WHATSAPP_PROVIDER || 'log';
    const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;

    if (!adminNumber) {
      console.warn("[WhatsApp] ADMIN_WHATSAPP_NUMBER não configurado.");
      return false;
    }

    try {
      if (provider === 'log') {
        return this.logOnly(message);
      } else if (provider === 'callmebot') {
        const apiKey = process.env.CALLMEBOT_API_KEY;
        if (!apiKey) throw new Error("CALLMEBOT_API_KEY ausente.");
        const url = `https://api.callmebot.com/whatsapp.php?phone=${adminNumber}&text=${encodeURIComponent(message)}&apikey=${apiKey}`;
        const res = await fetch(url);
        return res.ok;
      } else if (provider === 'evolution') {
        const url = process.env.EVOLUTION_API_URL;
        const key = process.env.EVOLUTION_API_KEY;
        const instance = process.env.EVOLUTION_INSTANCE;
        if (!url || !key || !instance) throw new Error("Configuração EVOLUTION incompleta.");
        const res = await fetch(`${url}/message/sendText/${instance}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": key
          },
          body: JSON.stringify({ number: adminNumber, text: message })
        });
        return res.ok;
      }
    } catch (error) {
      console.error("[WhatsApp] Erro ao enviar mensagem para admin:", error);
    }
    return false; // Nunca lança erro real se falhar
  }

  static formatNewTenant(tenantName: string, plan: string, email: string): string {
    return `🎉 *Novo Cadastro (SaaS)*\n\n🏢 Loja: ${tenantName}\n📧 Email: ${email}\n🎁 Plano: ${plan}`;
  }

  static formatPlanUpgrade(tenantName: string, oldPlan: string, newPlan: string): string {
    return `🚀 *Upgrade de Plano!*\n\n🏢 Loja: ${tenantName}\n⬆️ De: ${oldPlan} ➔ Para: ${newPlan}`;
  }

  static formatPlanCancel(tenantName: string, plan: string, reason?: string): string {
    return `⚠️ *Cancelamento de Assinatura*\n\n🏢 Loja: ${tenantName}\n📉 Plano: ${plan}\n💬 Motivo: ${reason || 'Não informado'}`;
  }

  static formatPaymentFailed(tenantName: string, amount: number): string {
    return `❌ *Falha de Pagamento*\n\n🏢 Loja: ${tenantName}\n💰 Valor: R$ ${amount.toFixed(2)}`;
  }
}
