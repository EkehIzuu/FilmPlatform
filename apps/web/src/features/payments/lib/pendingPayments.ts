import type { PaymentType } from "../services/paystackApi";

const STORAGE_KEY = "izora-pending-payments";

export type PendingPayment = {
  reference: string;
  type: PaymentType;
  eventId?: string;
  titleId?: string;
  ticketCount?: number;
  createdAt: string;
};

export function loadPendingPayments(): PendingPayment[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingPayment[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePendingPayments(rows: PendingPayment[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rows.slice(-20)));
  } catch {
    /* ignore */
  }
}

export function queuePendingPayment(row: Omit<PendingPayment, "createdAt">): void {
  const list = loadPendingPayments().filter((p) => p.reference !== row.reference);
  list.push({ ...row, createdAt: new Date().toISOString() });
  savePendingPayments(list);
}

export function clearPendingPayment(reference: string): void {
  savePendingPayments(loadPendingPayments().filter((p) => p.reference !== reference));
}
