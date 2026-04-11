import { type Session } from "next-auth";
import prisma from "@/lib/db";

export function getTenantId(session: Session): string {
  const user = session.user as { tenantId?: string };
  if (!user.tenantId) {
    throw new Error("TENANT_NOT_FOUND");
  }
  return user.tenantId;
}

export function requireTenant(session: Session | null): string {
  if (!session?.user) throw new Error("UNAUTHORIZED");
  const tenantId = (session.user as { tenantId?: string }).tenantId;
  if (!tenantId) throw new Error("TENANT_NOT_FOUND");
  return tenantId;
}

export function withTenant<T extends Record<string, unknown>>(
  query: T,
  tenantId: string
): T & { tenantId: string } {
  return { ...query, tenantId };
}

export async function assertResourceBelongsToTenant(
  model: string,
  id: string,
  tenantId: string
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const record = await (prisma as Record<string, any>)[model].findFirst({
    where: { id, tenantId },
    select: { id: true },
  });

  if (!record) {
    throw new Error("RESOURCE_NOT_FOUND");
  }
}

export async function getTenantByShopId(shopId: string): Promise<string | null> {
  const tenant = await prisma.tenant.findFirst({
    where: { shopeeShopId: shopId },
    select: { id: true },
  });
  return tenant?.id ?? null;
}
