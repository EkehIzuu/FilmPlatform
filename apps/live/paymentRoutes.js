import express from "express";
import {
  getFulfillment,
  handleWebhookEvent,
  isPaystackServerConfigured,
  registerPendingPayment,
  verifyAndFulfill,
  verifyPaystackSignature,
} from "./paystackPayments.js";

export function registerPaymentRoutes(app) {
  const router = express.Router();

  router.get("/payments/health", (_req, res) => {
    res.json({
      ok: true,
      paystack: isPaystackServerConfigured(),
    });
  });

  router.post("/payments/register", (req, res) => {
    const result = registerPendingPayment(req.body || {});
    if (!result.ok) {
      res.status(400).json(result);
      return;
    }
    res.json(result);
  });

  router.post("/payments/verify", async (req, res) => {
    try {
      const reference = req.body?.reference;
      const result = await verifyAndFulfill(reference);
      if (!result.ok) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : "verify-failed",
      });
    }
  });

  router.get("/payments/fulfillment/:reference", (req, res) => {
    const row = getFulfillment(req.params.reference);
    if (!row) {
      res.status(404).json({ ok: false, error: "not-found" });
      return;
    }
    res.json({ ok: true, ...row.payload });
  });

  app.post(
    "/api/webhooks/paystack",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const signature = req.headers["x-paystack-signature"];
      const raw = req.body;
      if (!Buffer.isBuffer(raw)) {
        res.status(400).send("invalid body");
        return;
      }
      if (isPaystackServerConfigured() && !verifyPaystackSignature(raw, signature)) {
        res.status(401).send("invalid signature");
        return;
      }
      try {
        const event = JSON.parse(raw.toString("utf8"));
        const result = await handleWebhookEvent(event);
        res.status(200).json(result);
      } catch (err) {
        res.status(500).json({
          ok: false,
          error: err instanceof Error ? err.message : "webhook-failed",
        });
      }
    },
  );

  app.use("/api", express.json(), router);
}
