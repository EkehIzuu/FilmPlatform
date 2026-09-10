import { FormEvent, useEffect, useState } from "react";

import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { AuthShell } from "../components/AuthShell";

import { useAuth } from "../context/AuthContext";

import { getDemoCredentials } from "../lib/demoAuth";

import { formatAuthError, isEmailNotConfirmedError } from "../lib/authErrors";
import { useLocalAuthMode } from "../lib/localAuth";



export function Login() {

  const { signIn, authMode, resendConfirmationEmail } = useAuth();
  const localAuth = useLocalAuthMode();

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



  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);

  const [resendBusy, setResendBusy] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [info, setInfo] = useState<string | null>(null);

  const [needsConfirm, setNeedsConfirm] = useState(false);



  useEffect(() => {

    const demo = getDemoCredentials();

    if (demo?.email) setEmail(demo.email);

  }, []);



  const onSubmit = async (e: FormEvent) => {

    e.preventDefault();

    setError(null);

    setInfo(null);

    setNeedsConfirm(false);

    setBusy(true);

    try {

      await signIn(email, password);

      navigate(from, { replace: true });

    } catch (err) {

      const raw = err instanceof Error ? err.message : "Could not sign in.";

      setNeedsConfirm(isEmailNotConfirmedError(raw));

      setError(formatAuthError(raw));

    } finally {

      setBusy(false);

    }

  };



  const onResend = async () => {

    setResendBusy(true);

    setInfo(null);

    setError(null);

    try {

      await resendConfirmationEmail(email);

      setInfo("Confirmation email sent — check your inbox (and spam).");

    } catch (err) {

      setError(err instanceof Error ? err.message : "Could not resend email.");

    } finally {

      setResendBusy(false);

    }

  };



  return (

    <AuthShell

      title="Welcome back"

      subtitle={
        localAuth
          ? "Local demo auth — no Supabase login or email confirmation."
          : authMode === "supabase"
            ? "Sign in with your Izora account."
            : "Demo sign-in — any email works locally."
      }

    >

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

          />

        </label>

        <label>

          Password

          <input

            type="password"

            value={password}

            onChange={(e) => setPassword(e.target.value)}

            autoComplete="current-password"

            minLength={authMode === "supabase" ? 6 : 1}

            placeholder="••••••••"

            required

          />

        </label>



        {authMode === "supabase" ? (

          <p className="auth-forgot small">

            <Link to="/forgot-password">Forgot password?</Link>

          </p>

        ) : null}



        {error ? <p className="auth-error">{error}</p> : null}

        {info ? <p className="hint-banner small">{info}</p> : null}



        {needsConfirm && !localAuth && authMode === "supabase" ? (

          <div className="auth-confirm-help small">

            <p className="muted">

              <strong>Dev fix:</strong> Supabase → SQL Editor → run{" "}

              <code>supabase/006_confirm_user_email.sql</code>

              <br />

              Or Auth → Providers → Email → turn off <strong>Confirm email</strong>.

            </p>

            <button

              type="button"

              className="btn-secondary"

              disabled={resendBusy || !email.trim()}

              onClick={() => void onResend()}

            >

              {resendBusy ? "Sending…" : "Resend confirmation email"}

            </button>

          </div>

        ) : null}



        <button type="submit" className="auth-submit" disabled={busy}>

          {busy ? "Signing in…" : "Sign in"}

        </button>

      </form>



      <p className="auth-switch small">

        New here?{" "}

        <Link to="/signup" state={location.state}>

          Create an account

        </Link>

      </p>

    </AuthShell>

  );

}


