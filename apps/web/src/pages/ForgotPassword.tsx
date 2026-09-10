import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { BackLink } from "../components/BackLink";
import { useAuth } from "../context/AuthContext";

export function ForgotPassword() {
  const { requestPasswordReset, authMode } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Reset password"
      subtitle={
        authMode === "supabase"
          ? "We will email you a link to choose a new password."
          : "Password reset needs Supabase — add keys in .env.local."
      }
    >
      {sent ? (
        <p className="auth-notice">
          If an account exists for <strong>{email.trim().toLowerCase()}</strong>, check your
          inbox (and spam) for the reset link.
        </p>
      ) : (
        <form className="stack-form auth-form" onSubmit={onSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              required
              disabled={authMode !== "supabase"}
            />
          </label>

          {error ? <p className="auth-error">{error}</p> : null}

          <button
            type="submit"
            className="auth-submit"
            disabled={busy || authMode !== "supabase"}
          >
            {busy ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}

      <p className="auth-switch small">
        <BackLink to="/login">Sign in</BackLink>
      </p>
    </AuthShell>
  );
}
