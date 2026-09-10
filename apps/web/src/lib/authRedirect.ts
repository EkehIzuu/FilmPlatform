/** Base URL for Supabase auth redirects (email confirm, password reset). */

export function getAppOrigin(): string {

  const configured = import.meta.env.VITE_APP_URL?.trim();

  if (configured) return configured.replace(/\/$/, "");

  if (typeof window !== "undefined") return window.location.origin;

  return "http://localhost:5173";

}



export function getLoginRedirectUrl(): string {

  return `${getAppOrigin()}/login`;

}



export function getEmailConfirmRedirectUrl(): string {

  return `${getAppOrigin()}/auth/confirm`;

}



export function getResetPasswordRedirectUrl(): string {

  return `${getAppOrigin()}/reset-password`;

}


