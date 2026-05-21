import type { AgreementStatus } from '@prisma/client';

/** User-facing labels returned in API responses */
export const AGREEMENT_STATUS_LABELS: Record<AgreementStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  payment_pending: 'Payment Pending',
  completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  terminated: 'Terminated',
  expired: 'Expired',
};

export const OPEN_AGREEMENT_STATUSES: AgreementStatus[] = [
  'sent',
  'payment_pending',
  'completed',
];

export const BLOCKING_AGREEMENT_STATUSES: AgreementStatus[] = [
  'sent',
  'payment_pending',
  'completed',
];

export function formatAgreementStatus(status: AgreementStatus) {
  return {
    status,
    statusLabel: AGREEMENT_STATUS_LABELS[status] ?? status,
  };
}

export function enrichAgreement<T extends { status: AgreementStatus }>(row: T) {
  return {
    ...row,
    ...formatAgreementStatus(row.status),
  };
}
