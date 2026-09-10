import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { useAuth } from "../context/AuthContext";

export function Signup() {
  const { signUp, authMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const rawFrom = (location.state as { from?: string } | null)?.from;
  const nextParam = searchParams.get("next");
  const from =
    nextParam?.startsWith("/") && nextParam !== "/login" && nextParam !== "/signup"
      ? nextParam
      : rawFrom && rawFrom !== "/login" && rawFrom !== "/signup"
        ? rawFrom
        : "/";

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isCreator, setIsCreator] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (authMode === "supabase" && password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setBusy(true);
    try {
      const needsConfirm = await signUp(email, password, displayName, isCreator);
      if (needsConfirm) {
        navigate("/verify-email", { replace: true, state: { email: email.trim().toLowerCase() } });
        return;
      }
      if (authMode === "supabase") {
        setNotice("Account created — you're signed in.");
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle={
        authMode === "supabase"
          ? "Fans watch premieres. Creators upload, price, and earn."
          : "Demo signup — stored in this browser only."
      }
    >
      <form className="stack-form auth-form" onSubmit={onSubmit}>
        <label>
          Display name
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
            placeholder="Kemi"
            required
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={authMode === "supabase" ? 6 : 1}
            placeholder="At least 6 characters"
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

        <label className="checkbox-row auth-creator-row">
          <input
            type="checkbox"
            checked={isCreator}
            onChange={(e) => setIsCreator(e.target.checked)}
          />
          I&apos;m a filmmaker / creator
        </label>

        {error ? <p className="auth-error">{error}</p> : null}
        {notice ? <p className="auth-notice">{notice}</p> : null}

        <button type="submit" className="auth-submit" disabled={busy}>
          {busy ? "Creating account…" : "Sign up"}
        </button>
      </form>

      <p className="auth-switch small">
        Already have an account?{" "}
        <Link to="/login" state={location.state}>
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
