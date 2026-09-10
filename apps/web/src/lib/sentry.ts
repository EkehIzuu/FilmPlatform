/** Sentry stub — install @sentry/react and wire init when ready (phase 3c). */
export async function initErrorMonitoring(): Promise<void> {
  if (!import.meta.env.VITE_SENTRY_DSN?.trim()) return;
  console.info("[Izora] VITE_SENTRY_DSN set — install @sentry/react to enable monitoring.");
}
