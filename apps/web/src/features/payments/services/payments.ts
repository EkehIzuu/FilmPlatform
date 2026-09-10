import { queuePendingPayment, clearPendingPayment } from "../lib/pendingPayments";
import { registerPayment, verifyPaymentOnServer, type PaymentType } from "./paystackApi";

export type CheckoutInput = {
  email: string;
  amountCents: number;
  currency: string;
  eventId: string;
  eventTitle: string;
  userId?: string;
  ticketCount?: number;
};

export type GenericCheckoutInput = {
  email: string;
  amountCents: number;
  currency: string;
  referencePrefix: string;
  label: string;
  metadata?: Record<string, string>;
  userId?: string;
  paymentType?: PaymentType;
  eventId?: string;
  titleId?: string;
  ticketCount?: number;
};

export type CheckoutResult = {
  ok: boolean;
  reference?: string;
  error?: string;
  demo?: boolean;
  verified?: boolean;
};

export function isPaystackConfigured(): boolean {
  return Boolean(import.meta.env.VITE_PAYSTACK_PUBLIC_KEY?.trim());
}

type PaystackResponse = { reference: string; status?: string };

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: Record<string, unknown>) => { openIframe: () => void };
    };
  }
}

function loadPaystackScript(): Promise<void> {
  if (window.PaystackPop) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-paystack="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const s = document.createElement("script");
    s.src = "https://js.paystack.co/v1/inline.js";
    s.async = true;
    s.dataset.paystack = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load Paystack."));
    document.body.appendChild(s);
  });
}

async function finalizeCheckout(
  reference: string,
  input: GenericCheckoutInput,
  demo: boolean,
): Promise<CheckoutResult> {
  if (!input.userId) {
    return { ok: true, reference, demo, verified: demo };
  }

  queuePendingPayment({
    reference,
    type: input.paymentType ?? "premiere",
    eventId: input.eventId,
    titleId: input.titleId,
    ticketCount: input.ticketCount,
  });

  await registerPayment({
    reference,
    type: input.paymentType ?? "premiere",
    userId: input.userId,
    amountCents: input.amountCents,
    currency: input.currency,
    eventId: input.eventId,
    titleId: input.titleId,
    ticketCount: input.ticketCount,
  });

  const verified = await verifyPaymentOnServer(reference);
  if (!verified.ok) {
    return { ok: false, error: verified.error ?? "Payment verification failed" };
  }
  clearPendingPayment(reference);
  return { ok: true, reference, demo: demo || verified.demo, verified: true };
}

export async function checkoutPayment(input: GenericCheckoutInput): Promise<CheckoutResult> {
  const key = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY?.trim();
  const reference = `${input.referencePrefix}-${Date.now()}`;

  if (!key) {
    await new Promise((r) => window.setTimeout(r, 450));
    return finalizeCheckout(`demo-${reference}`, input, true);
  }

  try {
    await loadPaystackScript();
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Paystack failed to load",
    };
  }

  const currency = (input.currency || "USD").toUpperCase();

  if (input.userId) {
    queuePendingPayment({
      reference,
      type: input.paymentType ?? "premiere",
      eventId: input.eventId,
      titleId: input.titleId,
      ticketCount: input.ticketCount,
    });
    await registerPayment({
      reference,
      type: input.paymentType ?? "premiere",
      userId: input.userId,
      amountCents: input.amountCents,
      currency,
      eventId: input.eventId,
      titleId: input.titleId,
      ticketCount: input.ticketCount,
    });
  }

  return new Promise((resolve) => {
    const handler = window.PaystackPop!.setup({
      key,
      email: input.email,
      amount: input.amountCents,
      currency,
      ref: reference,
      metadata: {
        label: input.label,
        type: input.paymentType ?? "premiere",
        user_id: input.userId ?? "",
        event_id: input.eventId ?? "",
        title_id: input.titleId ?? "",
        ticket_count: String(input.ticketCount ?? 1),
        ...input.metadata,
      },
      callback: (response: PaystackResponse) => {
        void (async () => {
          const ref = response.reference || reference;
          const done = await finalizeCheckout(ref, input, false);
          resolve(done);
        })();
      },
      onClose: () => {
        resolve({ ok: false, error: "Payment cancelled" });
      },
    });
    handler.openIframe();
  });
}

export async function checkoutPremiereTicket(input: CheckoutInput): Promise<CheckoutResult> {
  return checkoutPayment({
    email: input.email,
    amountCents: input.amountCents,
    currency: input.currency,
    referencePrefix: `premiere-${input.eventId}`,
    label: input.eventTitle,
    userId: input.userId,
    paymentType: "premiere",
    eventId: input.eventId,
    ticketCount: input.ticketCount,
    metadata: { event_id: input.eventId, event_title: input.eventTitle },
  });
}
