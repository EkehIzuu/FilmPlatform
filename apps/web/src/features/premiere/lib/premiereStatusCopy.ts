import {
  formatCountdown,
  type PremiereTimeline,
} from "@/domain/premiereSync";

/** Safe showtime label — `weekday` cannot be combined with `dateStyle`/`timeStyle` in Intl. */
export function formatShowtime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Date TBD";
  try {
    return d.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return d.toLocaleString();
  }
}

/** Consistent phase line for list, tickets, and player surfaces. */
export function getPhaseStatusLine(tl: PremiereTimeline): string {
  switch (tl.phase) {
    case "lobby":
      return `Lobby open · showtime in ${formatCountdown(tl.secondsUntilFeature)}`;
    case "ads":
      return `Pre-show · feature in ${formatCountdown(tl.secondsUntilFeature)}`;
    case "feature":
      return "Screening live (synced clock)";
    case "ended":
      return "Curtain closed — screening ended";
  }
}

export function checkoutErrorMessage(error?: string): string {
  if (!error) {
    return "Payment did not complete. You were not charged, or verification is still pending.";
  }
  const e = error.toLowerCase();
  if (e.includes("cancel")) {
    return "Checkout was cancelled. You can try again when ready.";
  }
  if (e.includes("verify") || e.includes("verification")) {
    return "Payment could not be verified yet. Check My tickets in a moment, then retry if needed.";
  }
  if (e.includes("load paystack") || e.includes("network")) {
    return "Could not reach the payment provider. Check your connection and try again.";
  }
  return error;
}

export function reserveErrorMessage(error?: string): string {
  switch (error) {
    case "sign-in":
      return "Sign in to reserve a seat.";
    case "full":
      return "This screening is sold out.";
    case "missing":
      return "This premiere is no longer available.";
    default:
      return "We could not save your ticket. Please try again.";
  }
}

export function redeemErrorMessage(error?: string): string {
  switch (error) {
    case "sign-in":
      return "Sign in to redeem a share code.";
    case "invalid":
      return "That share code is invalid or expired.";
    case "used":
      return "All seats from this share link have already been used.";
    case "missing":
      return "The premiere for this code could not be found.";
    default:
      return "Could not redeem this code. Double-check it and try again.";
  }
}

export function ticketEntitlementSummary(
  titleName: string,
  ticketCount: number,
  showtimeIso: string,
): string {
  const n = Math.max(1, ticketCount);
  return `Access confirmed: ${n} seat${n > 1 ? "s" : ""} for “${titleName}” · Showtime ${formatShowtime(showtimeIso)}.`;
}
