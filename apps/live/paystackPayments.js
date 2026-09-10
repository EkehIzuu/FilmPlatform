import crypto from "node:crypto";

/**
 * Paystack verify + webhook (production path).
 * Set PAYSTACK_SECRET_KEY in apps/live/.env or environment.
 */

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY?.trim() || "";
const PAYSTACK_BASE = "https://api.paystack.co";

/** @type {Map<string, object>} */
const pendingByReference = new Map();

/** @type {Map<string, object>} */
const fulfilledByReference = new Map();

export function isPaystackServerConfigured() {
  return Boolean(PAYSTACK_SECRET);
}

export function registerPendingPayment(payload) {
  const reference = String(payload.reference || "").trim();
  if (!reference) return { ok: false, error: "missing-reference" };
  pendingByReference.set(reference, {
    reference,
    type: String(payload.type || "cinema"),
    userId: String(payload.userId || ""),
    eventId: payload.eventId ? String(payload.eventId) : undefined,
    titleId: payload.titleId ? String(payload.titleId) : undefined,
    amountCents: Number(payload.amountCents) || 0,
    currency: String(payload.currency || "USD").toUpperCase(),
    ticketCount: payload.ticketCount ? Number(payload.ticketCount) : 1,
    createdAt: new Date().toISOString(),
  });
  return { ok: true, reference };
}

export function getFulfillment(reference) {
  const ref = String(reference || "").trim();
  return fulfilledByReference.get(ref) || null;
}

async function paystackVerify(reference) {
  if (!PAYSTACK_SECRET) {
    return { ok: false, error: "paystack-not-configured" };
  }
  const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
  });
  if (!res.ok) {
    return { ok: false, error: `verify-http-${res.status}` };
  }
  const body = await res.json();
  if (!body?.status || body.data?.status !== "success") {
    return { ok: false, error: "payment-not-success", raw: body };
  }
  return { ok: true, data: body.data };
}

function fulfill(reference, pending, paystackData) {
  const meta = paystackData?.metadata || {};
  const payload = {
    reference,
    type: pending?.type || meta.type || "cinema",
    userId: pending?.userId || meta.user_id || "",
    eventId: pending?.eventId || meta.event_id,
    titleId: pending?.titleId || meta.title_id,
    amountCents: pending?.amountCents ?? paystackData?.amount ?? 0,
    currency: (pending?.currency || paystackData?.currency || "USD").toUpperCase(),
    ticketCount: pending?.ticketCount ?? (Number(meta.ticket_count) || 1),
    paidAt: paystackData?.paid_at || new Date().toISOString(),
  };
  fulfilledByReference.set(reference, {
    reference,
    type: payload.type,
    payload,
    fulfilledAt: new Date().toISOString(),
  });
  pendingByReference.delete(reference);
  return payload;
}

export async function verifyAndFulfill(reference) {
  const ref = String(reference || "").trim();
  if (!ref) return { ok: false, error: "missing-reference" };

  const existing = fulfilledByReference.get(ref);
  if (existing) return { ok: true, fulfilled: true, ...existing.payload };

  const pending = pendingByReference.get(ref);

  if (!PAYSTACK_SECRET) {
    if (!pending) return { ok: false, error: "demo-only-with-register" };
    const payload = fulfill(ref, pending, null);
    return { ok: true, demo: true, ...payload };
  }

  const verified = await paystackVerify(ref);
  if (!verified.ok) return verified;

  const payload = fulfill(ref, pending, verified.data);
  return { ok: true, ...payload };
}

export function verifyPaystackSignature(rawBody, signatureHeader) {
  if (!PAYSTACK_SECRET || !signatureHeader) return false;
  const hash = crypto.createHmac("sha512", PAYSTACK_SECRET).update(rawBody).digest("hex");
  return hash === signatureHeader;
}

export async function handleWebhookEvent(event) {
  if (event?.event !== "charge.success") {
    return { ok: true, ignored: true };
  }
  const reference = event?.data?.reference;
  if (!reference) return { ok: false, error: "no-reference" };
  return verifyAndFulfill(reference);
}
