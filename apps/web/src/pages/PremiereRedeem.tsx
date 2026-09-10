import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { PremiereRecoveryBanner } from "../components/premiere/PremiereRecoveryBanner";
import { redeemErrorMessage } from "@/features/premiere/lib/premiereStatusCopy";
import { parsePremiereAttribution } from "@/features/premiere/lib/premiereAttribution";
import { useAuth } from "../context/AuthContext";
import { useFilmData } from "../context/FilmDataContext";

export function PremiereRedeem() {
  const { user } = useAuth();
  const { redeemPremiereShare } = useFilmData();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code") ?? "");
  const [err, setErr] = useState<string | null>(null);
  const nextTo = `/premiere/join${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  useEffect(() => {
    const q = searchParams.get("code");
    if (q) setCode(q);
  }, [searchParams]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    const attrib = parsePremiereAttribution(`?${searchParams.toString()}`);
    if (!user) {
      setErr(redeemErrorMessage("sign-in"));
      return;
    }
    const res = redeemPremiereShare(code);
    if (res.ok && res.eventId) {
      // Keep source attribution while entering cinema route.
      const q = new URLSearchParams();
      if (attrib.src) q.set("src", attrib.src);
      if (attrib.ref) q.set("ref", attrib.ref);
      if (attrib.code || code.trim()) q.set("code", attrib.code ?? code.trim());
      const suffix = q.toString() ? `?${q.toString()}` : "";
      navigate(`/premiere/${res.eventId}${suffix}`, { replace: true });
      return;
    }
    setErr(redeemErrorMessage(res.error));
  };

  return (
    <div className="page">
      <PageHeader
        title="Redeem share code"
        subtitle="Enter a code from someone who bought extra seats for the same showtime."
      />
      <form className="card stack-form" onSubmit={onSubmit}>
        <label>
          Share code
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="ABCD-EFGH"
            autoComplete="off"
            required
          />
        </label>
        <button type="submit" className="auth-submit">
          Redeem seat
        </button>
      </form>
      {err ? (
        <PremiereRecoveryBanner
          variant="error"
          message={err}
          actions={
            user
              ? [
                  { label: "Try again", to: "/premiere/join" },
                  { label: "My tickets", to: "/watch/tickets", primary: true },
                  { label: "Browse premieres", to: "/watch/premiere" },
                ]
              : [
                  { label: "Sign in", to: `/login?next=${encodeURIComponent(nextTo)}`, primary: true },
                  { label: "Create account", to: `/signup?next=${encodeURIComponent(nextTo)}` },
                  { label: "Browse premieres", to: "/watch/premiere" },
                ]
          }
        />
      ) : null}
      <p className="small muted" style={{ marginTop: "1rem" }}>
        <Link to="/watch/tickets" className="text-link">
          My tickets
        </Link>
        {" · "}
        <Link to="/watch/premiere" className="text-link">
          Browse premieres
        </Link>
      </p>
    </div>
  );
}
