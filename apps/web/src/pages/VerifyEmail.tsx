import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { useAuth } from "../context/AuthContext";

export function VerifyEmail() {
  const { user, authMode, emailVerified, resendConfirmationEmail } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const emailFromState = (location.state as { email?: string } | null)?.email?.trim();
  const email = user?.email ?? emailFromState ?? "";
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (authMode === "supabase" && emailVerified && user) {
      navigate("/", { replace: true });
    }
  }, [authMode, emailVerified, user, navigate]);

  if (authMode !== "supabase") {
    return (
      <AuthShell title="Email verification" subtitle="Not required for demo auth.">
        <p className="auth-switch small">
          <Link to="/">Continue to Izora</Link>
        </p>
      </AuthShell>
    );
  }

  const onResend = async () => {
    if (!email) {
      setErr("Enter your email on the sign-in page first.");
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      await resendConfirmationEmail(email);
      setMsg("Confirmation email sent — open the link in your inbox.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not resend.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Confirm your email"
      subtitle="We sent a link to finish setting up your account."
    >
      {email ? (
        <p className="small muted">
          Sent to <strong>{email}</strong>
        </p>
      ) : (
        <p className="small muted">Check the inbox you used to sign up.</p>
      )}

      <ol className="verify-email-steps small">
        <li>Open the confirmation email from Izora.</li>
        <li>Tap the link — you&apos;ll land back here signed in.</li>
        <li>Return to sign in if the link expired.</li>
      </ol>

      {msg ? <p className="auth-notice">{msg}</p> : null}
      {err ? <p className="auth-error">{err}</p> : null}

      <button
        type="button"
        className="auth-submit"
        disabled={busy || !email}
        onClick={() => void onResend()}
      >
        {busy ? "Sending…" : "Resend confirmation email"}
      </button>

      <p className="auth-switch small">
        Already confirmed? <Link to="/login">Sign in</Link>
      </p>
    </AuthShell>
  );
}
