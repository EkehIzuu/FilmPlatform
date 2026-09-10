import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { BackLink } from "../components/BackLink";
import { useAuth } from "../context/AuthContext";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";

export function ResetPassword() {
  const { updatePassword, authMode } = useAuth();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasRecovery, setHasRecovery] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setReady(true);
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setReady(true);
      return;
    }

    const check = async () => {
      const hash = window.location.hash;
      const isRecovery =
        hash.includes("type=recovery") || hash.includes("type=magiclink");

      const { data } = await supabase.auth.getSession();
      setHasRecovery(isRecovery || Boolean(data.session));
      setReady(true);
    };

    void check();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setHasRecovery(true);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      await updatePassword(password);
      setDone(true);
      window.history.replaceState(null, "", window.location.pathname);
      setTimeout(() => navigate("/", { replace: true }), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <AuthShell title="New password" subtitle="Verifying your reset link…">
        <p className="auth-loading muted">Please wait…</p>
      </AuthShell>
    );
  }

  if (authMode !== "supabase") {
    return (
      <AuthShell title="New password" subtitle="Supabase is not configured.">
        <p className="auth-error">Add Supabase keys in .env.local to use password reset.</p>
        <p className="auth-switch small">
          <BackLink to="/login">Sign in</BackLink>
        </p>
      </AuthShell>
    );
  }

  if (!hasRecovery) {
    return (
      <AuthShell
        title="Link expired"
        subtitle="Request a fresh reset email and open the newest link."
      >
        <p className="auth-switch small">
          <Link to="/forgot-password">Request new link</Link>
          {" · "}
          <Link to="/login">Sign in</Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" subtitle="Enter your new password below.">
      {done ? (
        <p className="auth-notice">Password updated. Opening Izora…</p>
      ) : (
        <form className="stack-form auth-form" onSubmit={onSubmit}>
          <label>
            New password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>
          <label>
            Confirm password
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </label>

          {error ? <p className="auth-error">{error}</p> : null}

          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? "Saving…" : "Update password"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
