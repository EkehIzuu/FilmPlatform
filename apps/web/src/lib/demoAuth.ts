/** Dev-only auto-login — credentials live in .env.local, never commit them. */

export function isDemoAutoLoginEnabled(): boolean {
  if (import.meta.env.VITE_AUTH_MODE?.trim().toLowerCase() === "supabase") {
    return false;
  }
  if (!import.meta.env.DEV) return false;
  const flag = import.meta.env.VITE_DEMO_AUTO_LOGIN?.trim().toLowerCase();
  return flag === "true" || flag === "1" || flag === "yes";
}

export function getDemoCredentials(): { email: string; password: string } | null {
  if (!isDemoAutoLoginEnabled()) return null;
  const email = import.meta.env.VITE_DEMO_EMAIL?.trim().toLowerCase();
  const password = import.meta.env.VITE_DEMO_PASSWORD ?? "";
  if (!email || !password) return null;
  return { email, password };
}
