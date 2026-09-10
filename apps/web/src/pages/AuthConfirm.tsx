import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { useAuth } from "../context/AuthContext";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";

type Status = "loading" | "success" | "error";

export function AuthConfirm() {
  const { authMode, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (!isSupabaseConfigured() || authMode !== "supabase") {
      setStatus("error");
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setStatus("error");
      return;
    }

    let cancelled = false;

    const finish = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (cancelled) return;
      if (error || !data.session) {
        setStatus("error");
        return;
      }
      await refreshProfile();
      window.history.replaceState(null, "", window.location.pathname);
      setStatus("success");
      setTimeout(() => navigate("/", { replace: true }), 1200);
    };

    void finish();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        void refreshProfile().then(() => {
          if (cancelled) return;
          window.history.replaceState(null, "", window.location.pathname);
          setStatus("success");
          setTimeout(() => navigate("/", { replace: true }), 1200);
        });
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [authMode, navigate, refreshProfile]);

  if (authMode !== "supabase") {
    return (
      <AuthShell title="Email confirmed" subtitle="Demo mode — no confirmation needed.">
        <p className="auth-switch small">
          <Link to="/">Home</Link>
        </p>
      </AuthShell>
    );
  }

  if (status === "loading") {
    return (
      <AuthShell title="Confirming email" subtitle="Hang on…">
        <p className="auth-loading muted">Verifying your link…</p>
      </AuthShell>
    );
  }

  if (status === "success") {
    return (
      <AuthShell title="Email confirmed" subtitle="You're all set.">
        <p className="auth-notice">Redirecting to Izora…</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Link invalid or expired" subtitle="Request a fresh confirmation email.">
      <p className="auth-switch small">
        <Link to="/verify-email">Resend confirmation</Link>
        {" · "}
        <Link to="/login">Sign in</Link>
      </p>
    </AuthShell>
  );
}
