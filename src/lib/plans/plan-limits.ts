/**
 * Re-export central dos tipos relacionados a planos.
 *
 * Existe para padronizar o caminho de import em todo o codebase
 * (`@/lib/plans/plan-limits`) sem espalhar imports diretos do `@prisma/client`
 * nem duplicar definições.
 *
 * Os limites em si vivem em `@/constants/plans` (PLAN_DETAILS).
 */
export type { PlanName } from "@prisma/client";
export { PLAN_DETAILS, type PlanLimits } from "@/constants/plans";
