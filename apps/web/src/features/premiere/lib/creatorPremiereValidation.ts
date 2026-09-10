export type CreatorPremiereFormInput = {
  titleId: string;
  featureStartsAt: string;
  capacity: number;
  priceCents: number;
  currency: string;
  adVideoUrl: string;
  featureVideoUrl: string;
  adUploadId: string;
  featureUploadId: string;
};

export type CreatorPremiereValidation = {
  ok: boolean;
  errors: string[];
};

export function validateCreatorPremiereForm(
  input: CreatorPremiereFormInput,
  nowMs: number = Date.now(),
): CreatorPremiereValidation {
  const errors: string[] = [];

  if (!input.titleId.trim()) {
    errors.push("Choose a film title for this screening.");
  }

  if (!input.featureStartsAt.trim()) {
    errors.push("Set a showtime — when the synced feature should start.");
  } else {
    const start = new Date(input.featureStartsAt).getTime();
    if (Number.isNaN(start)) {
      errors.push("Showtime is not a valid date.");
    } else if (start < nowMs - 60_000) {
      errors.push("Showtime must be in the future. Pick a later date and time.");
    }
  }

  if (!Number.isFinite(input.capacity) || input.capacity < 1) {
    errors.push("Seat capacity must be at least 1.");
  }

  if (!Number.isFinite(input.priceCents) || input.priceCents < 0) {
    errors.push("Ticket price cannot be negative.");
  }

  if (!input.currency.trim()) {
    errors.push("Enter a currency code (e.g. USD, EUR, NGN).");
  }

  const hasFeature = Boolean(input.featureUploadId.trim() || input.featureVideoUrl.trim());
  if (!hasFeature) {
    errors.push("Add the movie file for this premiere.");
  }

  return { ok: errors.length === 0, errors };
}
