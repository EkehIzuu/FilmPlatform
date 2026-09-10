export type PaymentType = "premiere" | "title_access";

export type RegisterPaymentInput = {
  reference: string;
  type: PaymentType;
  userId: string;
  amountCents: number;
  currency: string;
  eventId?: string;
  titleId?: string;
  ticketCount?: number;
};

export type VerifyPaymentResult = {
  ok: boolean;
  error?: string;
  demo?: boolean;
  reference?: string;
  type?: PaymentType;
  userId?: string;
  eventId?: string;
  titleId?: string;
  ticketCount?: number;
};

function paymentsBaseUrl(): string {
  const explicit = import.meta.env.VITE_PAYMENTS_API_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const live = import.meta.env.VITE_LIVE_URL?.trim();
  if (live) return live.replace(/\/$/, "");
  return "http://localhost:3000";
}

export async function registerPayment(input: RegisterPaymentInput): Promise<{ ok: boolean }> {
  try {
    const res = await fetch(`${paymentsBaseUrl()}/api/payments/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return res.ok ? { ok: true } : { ok: false };
  } catch {
    return { ok: false };
  }
}

export async function verifyPaymentOnServer(reference: string): Promise<VerifyPaymentResult> {
  try {
    const res = await fetch(`${paymentsBaseUrl()}/api/payments/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference }),
    });
    const body = (await res.json()) as VerifyPaymentResult;
    return body;
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "verify-request-failed",
    };
  }
}

export async function paymentsApiHealth(): Promise<{ ok: boolean; paystack?: boolean }> {
  try {
    const res = await fetch(`${paymentsBaseUrl()}/api/payments/health`);
    if (!res.ok) return { ok: false };
    return (await res.json()) as { ok: boolean; paystack?: boolean };
  } catch {
    return { ok: false };
  }
}
