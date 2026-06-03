import type { Prisma } from '@prisma/client';

export const PEER_MESSAGE_NOTIFICATION_TYPE = 'MESSAGE_NEW' as const;

export function normalizeRole(role?: string): string {
  return String(role ?? '').trim().toLowerCase();
}

export function isAdminRole(role?: string): boolean {
  return normalizeRole(role) === 'admin';
}

/** Renter↔owner chat — not shown in admin notification views. */
export function excludePeerMessageNotifications(): Prisma.NotificationWhereInput {
  return { type: { not: PEER_MESSAGE_NOTIFICATION_TYPE } };
}

export function canUseMessaging(role?: string): boolean {
  const r = normalizeRole(role);
  return r === 'owner' || r === 'renter';
}
