import type { UserRole } from '@/types/database';

/** Roles allowed to manage suppliers, products and purchases. */
export function isShopManagerRole(role?: string | UserRole | null) {
  return role === 'admin' || role === 'accountant';
}

export function isAdminRole(role?: string | UserRole | null) {
  return role === 'admin';
}
