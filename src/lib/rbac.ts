import { UserRole } from "@prisma/client";

export type Resource = 'product' | 'sale' | 'user' | 'inventory' | 'billing' | 'admin';
export type Action = 'create' | 'read' | 'update' | 'delete' | 'manage';

const ROLE_PERMISSIONS: Record<UserRole, Partial<Record<Resource, Action[]>>> = {
  SUPERADMIN: {
    admin: ['manage'],
    product: ['manage' as Action], // manage includes all
    sale: ['manage' as Action],
    user: ['manage' as Action],
    billing: ['manage' as Action],
    inventory: ['manage' as Action],
  },
  OWNER: {
    product: ['create', 'read', 'update', 'delete'],
    sale: ['create', 'read', 'update', 'delete'],
    user: ['create', 'read', 'update', 'delete'],
    billing: ['read', 'manage' as Action], // manage for payment
    inventory: ['create', 'read', 'update', 'delete'],
  },
  ADMIN: {
    product: ['create', 'read', 'update', 'delete'],
    sale: ['create', 'read', 'update', 'delete'],
    user: ['read', 'update'],
    inventory: ['create', 'read', 'update', 'delete'],
  },
  MEMBER: {
    product: ['read', 'update'],
    sale: ['create', 'read'],
    inventory: ['read', 'update'],
  },
  VIEWER: {
    product: ['read'],
    sale: ['read'],
    inventory: ['read'],
  },
};

export function can(role: UserRole, resource: Resource, action: Action): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;

  const resourceActions = permissions[resource];
  if (!resourceActions) return false;

  return resourceActions.includes(action) || resourceActions.includes('manage' as Action);
}
