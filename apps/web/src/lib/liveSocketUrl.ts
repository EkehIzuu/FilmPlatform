/** Base URL for live engine Socket.IO (matches VITE_LIVE_URL). */
export function getLiveSocketUrl(): string {
  const raw = import.meta.env.VITE_LIVE_URL || "http://localhost:3000";
  try {
    const u = new URL(raw);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "http://localhost:3000";
  }
}
