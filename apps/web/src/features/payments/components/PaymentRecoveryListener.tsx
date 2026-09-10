import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useFilmData } from "@/context/FilmDataContext";
import { clearPendingPayment, loadPendingPayments } from "../lib/pendingPayments";
import { verifyPaymentOnServer } from "../services/paystackApi";

/**
 * Recovers tickets/rentals if the user paid but closed the tab before client fulfillment ran.
 */
export function PaymentRecoveryListener() {
  const { user } = useAuth();
  const { reservePremiereSeat, purchaseTitleAccess, hasPremiereAccess, hasTitleAccess } =
    useFilmData();
  const ran = useRef(false);

  useEffect(() => {
    if (!user || ran.current) return;
    ran.current = true;

    const pending = loadPendingPayments();
    if (pending.length === 0) return;

    void (async () => {
      for (const p of pending) {
        const verified = await verifyPaymentOnServer(p.reference);
        if (!verified.ok) continue;

        if (
          (verified.type === "premiere" || p.type === "premiere") &&
          (verified.eventId || p.eventId)
        ) {
          const eventId = verified.eventId || p.eventId!;
          if (!hasPremiereAccess(eventId)) {
            reservePremiereSeat(eventId, {
              reference: p.reference,
              status: verified.demo ? "demo" : "paid",
              ticketCount: verified.ticketCount ?? p.ticketCount ?? 1,
            });
          }
        }

        if (
          (verified.type === "title_access" || p.type === "title_access") &&
          (verified.titleId || p.titleId)
        ) {
          const titleId = verified.titleId || p.titleId!;
          if (!hasTitleAccess(titleId)) {
            purchaseTitleAccess(titleId, { reference: p.reference });
          }
        }

        clearPendingPayment(p.reference);
      }
    })();
  }, [
    user,
    reservePremiereSeat,
    purchaseTitleAccess,
    hasPremiereAccess,
    hasTitleAccess,
  ]);

  return null;
}
