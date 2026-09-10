export type PremiereAttribution = {
  src?: string;
  ref?: string;
  code?: string;
};

const STORAGE_PREFIX = "izora-premiere-attrib:";

export function parsePremiereAttribution(search: string): PremiereAttribution {
  try {
    const p = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
    const src = p.get("src") ?? undefined;
    const ref = p.get("ref") ?? undefined;
    const code = p.get("code") ?? undefined;
    return { src: src?.trim() || undefined, ref: ref?.trim() || undefined, code: code?.trim() || undefined };
  } catch {
    return {};
  }
}

export function storePremiereAttribution(eventId: string, attrib: PremiereAttribution): void {
  if (!eventId) return;
  const hasAny = Boolean(attrib.src || attrib.ref || attrib.code);
  if (!hasAny) return;
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${eventId}`, JSON.stringify(attrib));
  } catch {
    // ignore
  }
}

export function loadPremiereAttribution(eventId: string): PremiereAttribution {
  if (!eventId) return {};
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${eventId}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PremiereAttribution;
    if (!parsed || typeof parsed !== "object") return {};
    return {
      src: typeof parsed.src === "string" ? parsed.src : undefined,
      ref: typeof parsed.ref === "string" ? parsed.ref : undefined,
      code: typeof parsed.code === "string" ? parsed.code : undefined,
    };
  } catch {
    return {};
  }
}

