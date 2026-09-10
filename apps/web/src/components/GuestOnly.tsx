import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function GuestOnly({ children }: { children: ReactNode }) {
  const { user, authReady } = useAuth();

  if (!authReady) {
    return (
      <main className="auth-page">
        <p className="auth-loading muted">Connecting…</p>
      </main>
    );
  }

  if (user) return <Navigate to="/" replace />;

  return <>{children}</>;
}
