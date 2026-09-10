/** Multiline profile lists (schools, certs) stored as newline-separated text. */

export function linesToList(text: string | undefined): string[] {
  if (!text?.trim()) return [];
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function listToLines(items: string[] | undefined): string | undefined {
  if (!items?.length) return undefined;
  const lines = items.map((s) => s.trim()).filter(Boolean);
  return lines.length ? lines.join("\n") : undefined;
}

export function formatLocation(city?: string, region?: string): string {
  return [city, region].filter(Boolean).join(", ");
}

export function formatDateOfBirth(iso?: string): string {
  if (!iso?.trim()) return "";
  const d = new Date(iso + "T12:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function birthYearFromDate(iso?: string): number | undefined {
  if (!iso?.trim()) return undefined;
  const y = Number(iso.slice(0, 4));
  return Number.isFinite(y) ? y : undefined;
}

export function hasProfileDetails(user: {
  headline?: string;
  workplace?: string;
  city?: string;
  region?: string;
  placeOfBirth?: string;
  dateOfBirth?: string;
  schools?: string;
  certifications?: string;
  languagesSpoken?: string;
  websiteUrl?: string;
  instagram?: string;
}): boolean {
  return Boolean(
    user.headline?.trim() ||
      user.workplace?.trim() ||
      user.city?.trim() ||
      user.region?.trim() ||
      user.placeOfBirth?.trim() ||
      user.dateOfBirth?.trim() ||
      user.schools?.trim() ||
      user.certifications?.trim() ||
      user.languagesSpoken?.trim() ||
      user.websiteUrl?.trim() ||
      user.instagram?.trim(),
  );
}
