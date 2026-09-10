import { FormEvent, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { isSupabaseConfigured } from "../lib/supabase";
import {
  canRequestCreatorVerification,
  isCreatorVerified,
  verificationStatusLabel,
} from "../lib/verification";
import {
  submitCreatorVerificationRequest,
} from "../services/verification";

export function CreatorVerificationPanel() {
  const { user, authMode, updateProfile, refreshProfile } = useAuth();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  if (!user?.isCreator) return null;

  const status = user.creatorVerificationStatus ?? "none";
  const verified = isCreatorVerified(user);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOk(null);
    const text = message.trim();
    if (text.length < 20) {
      setErr("Tell us a bit about your work (at least 20 characters).");
      return;
    }
    setBusy(true);
    try {
      if (authMode === "supabase" && isSupabaseConfigured()) {
        await submitCreatorVerificationRequest(user, text);
        await refreshProfile();
      } else {
        await updateProfile({
          creatorVerificationStatus: "pending",
          verificationMessage: text,
          verificationRequestedAt: new Date().toISOString(),
        });
      }
      setOk("Request submitted. Our team will review it soon.");
      setMessage("");
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Could not submit request.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="verification-panel card">
      <h2 className="form-title">Creator verification</h2>
      {verified ? (
        <p className="hint-banner small">
          Your account is verified. A checkmark appears on your public profile.
        </p>
      ) : (
        <>
          <p className="small muted">
            Status: <strong>{verificationStatusLabel(status)}</strong>
          </p>
          {status === "pending" ? (
            <p className="small muted">
              We&apos;re reviewing your request. You&apos;ll see a verified badge once approved.
            </p>
          ) : null}
          {status === "rejected" ? (
            <p className="small muted">
              Your last request was declined. You can submit a new request with updated details.
            </p>
          ) : null}
          {canRequestCreatorVerification(user) ? (
            <form className="stack-form" onSubmit={(e) => void onSubmit(e)}>
              <label>
                Why should we verify you?
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={500}
                  placeholder="Link your portfolio, IMDb, past releases, or festival selections…"
                  required
                />
              </label>
              {err ? <p className="auth-error small">{err}</p> : null}
              {ok ? <p className="hint-banner small">{ok}</p> : null}
              <button type="submit" disabled={busy}>
                {busy ? "Submitting…" : "Request verification"}
              </button>
            </form>
          ) : null}
        </>
      )}
    </section>
  );
}
