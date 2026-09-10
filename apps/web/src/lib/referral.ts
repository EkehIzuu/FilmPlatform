const REF_KEY = "film_ref_code";
const SESSION_KEY = "film_ref_captured";

export function captureReferralFromUrl(search: string): void {
  try {
    const q = new URLSearchParams(search);
    const ref = q.get("ref")?.trim();
    if (!ref) return;
    sessionStorage.setItem(SESSION_KEY, ref);
    localStorage.setItem(REF_KEY, ref);
  } catch {
    /* ignore */
  }
}

export function getStoredReferral(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY) ?? localStorage.getItem(REF_KEY);
  } catch {
    return null;
  }
}
