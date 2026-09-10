import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function EmailVerificationBanner() {
  const { user, authMode, emailVerified, resendConfirmationEmail } = useAuth();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (authMode !== "supabase" || !user || emailVerified) return null;

  const onResend = async () => {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      await resendConfirmationEmail(user.email);
      setMsg("Confirmation email sent — check your inbox.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not resend email.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="email-verification-banner" role="status">
      <p>
        <strong>Verify your email</strong> to secure your account and unlock all features.
      </p>
      <div className="email-verification-banner-actions">
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => void onResend()}>
          {busy ? "Sending…" : "Resend email"}
        </button>
        <Link to="/verify-email" className="text-link small">
          More options
        </Link>
      </div>
      {msg ? <p className="small">{msg}</p> : null}
      {err ? <p className="auth-error small">{err}</p> : null}
    </div>
  );
}
