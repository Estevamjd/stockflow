import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { MarketplaceService } from "@/services/marketplace.service";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Cron de processamento da fila de webhooks.
 *
 * Autenticação: `Authorization: Bearer ${CRON_SECRET}`.
 *  - Vercel Cron envia o header automaticamente quando configurado em
 *    `vercel.json` se o secret for definido em env.
 *  - Em testes locais, chamar com:
 *      curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/process-webhooks
 *  - Sem CRON_SECRET configurado, recusa com 503 (não 200) — falhar
 *    ruidosamente é melhor que processar fila aberta para a internet.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    logger.error("CRON_SECRET ausente — recusando execução de cron");
    return NextResponse.json(
      { error: "Service unavailable" },
      { status: 503 }
    );
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const pendingEvents = await prisma.webhookEvent.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 50,
    });

    if (pendingEvents.length === 0) {
      return NextResponse.json(
        { success: true, message: "Nenhum webhook pendente na fila." },
        { status: 200 }
      );
    }

    logger.info(
      { count: pendingEvents.length },
      "[Cron] Processando fila de webhooks"
    );

    let processedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const event of pendingEvents) {
      // Claim atômico: marca PROCESSING somente se ainda estiver PENDING.
      // Garante que dois crons paralelos não processem o mesmo evento.
      const claim = await prisma.webhookEvent.updateMany({
        where: { id: event.id, status: "PENDING" },
        data: { status: "PROCESSING" },
      });
      if (claim.count === 0) {
        skippedCount++;
        continue;
      }

      try {
        await MarketplaceService.processWebhookEvent(event);
        processedCount++;
      } catch (err) {
        logger.error(
          { err, eventId: event.id },
          "[Cron] Erro ao processar evento individual"
        );
        // Devolve o evento para PENDING para retry no próximo ciclo,
        // ou marca FAILED se já passou do limite (futuro: contador de tentativas).
        await prisma.webhookEvent.update({
          where: { id: event.id },
          data: {
            status: "FAILED",
            errorMessage: err instanceof Error ? err.message : String(err),
          },
        });
        errorCount++;
      }
    }

    return NextResponse.json(
      {
        success: true,
        processed: processedCount,
        errors: errorCount,
        skipped: skippedCount,
      },
      { status: 200 }
    );
  } catch (err) {
    logger.error({ err }, "[Cron] Falha crítica no job de webhooks");
    return NextResponse.json(
      { error: "Erro interno no processamento da fila" },
      { status: 500 }
    );
  }
}
