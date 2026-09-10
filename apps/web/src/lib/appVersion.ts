/** Shown in Settings → About. Set VITE_APP_VERSION in .env for releases. */
export function getAppVersionInfo() {
  const version =
    (import.meta.env.VITE_APP_VERSION as string | undefined)?.trim() || "0.0.0";
  const build =
    (import.meta.env.VITE_APP_BUILD as string | undefined)?.trim() ||
    import.meta.env.MODE ||
    "dev";
  return { version, build };
}
