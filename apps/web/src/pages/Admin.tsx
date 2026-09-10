import { useCallback, useEffect, useState } from "react";
import { BackLink } from "../components/BackLink";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useFilmData } from "../context/FilmDataContext";
import { isAdminEmail } from "../lib/admin";
import { isSupabaseConfigured } from "../lib/supabase";
import {
  adminResolveVerification,
  fetchPendingVerifications,
  type VerificationCandidate,
} from "../services/verification";

export function Admin() {
  const { user, refreshProfile } = useAuth();
  const {
    listOpenReports,
    setReportStatus,
    setFeatureFlags,
    getFeatureFlags,
    state,
    blockUser,
  } = useFilmData();
  const flags = getFeatureFlags();
  const reports = listOpenReports();
  const [pending, setPending] = useState<VerificationCandidate[]>([]);
  const [verifyBusy, setVerifyBusy] = useState<string | null>(null);
  const [verifyErr, setVerifyErr] = useState<string | null>(null);

  const loadPending = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setPending([]);
      return;
    }
    setPending(await fetchPendingVerifications());
  }, []);

  useEffect(() => {
    if (user && isAdminEmail(user.email)) void loadPending();
  }, [user, loadPending]);

  const onResolve = async (id: string, status: "approved" | "rejected") => {
    setVerifyBusy(id);
    setVerifyErr(null);
    try {
      await adminResolveVerification(id, status);
      await loadPending();
      if (user?.id === id) await refreshProfile();
    } catch (e) {
      setVerifyErr(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setVerifyBusy(null);
    }
  };

  if (!user || !isAdminEmail(user.email)) {
    return (
      <div className="page">
        <PageHeader title="Admin" subtitle="Restricted." />
        <p className="muted small">
          Set <code>VITE_ADMIN_EMAILS</code> in <code>.env</code> to your email (comma-separated).
        </p>
        <BackLink to="/">Home</BackLink>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title="Ops"
        subtitle="Moderation queue, creator verification, and feature flags."
      />

      <section className="card verification-admin-section" style={{ marginBottom: "1.25rem" }}>
        <h2 className="form-title">Creator verification ({pending.length})</h2>
        {!isSupabaseConfigured() ? (
          <p className="muted small">Connect Supabase to review verification requests.</p>
        ) : pending.length === 0 ? (
          <p className="muted small">No pending requests.</p>
        ) : (
          <ul className="verification-admin-list">
            {pending.map((c) => (
              <li key={c.id} className="verification-admin-item">
                <strong>{c.displayName}</strong>
                {c.username ? <span className="muted small"> @{c.username}</span> : null}
                <p className="small">{c.email}</p>
                {c.message ? <p className="small">{c.message}</p> : null}
                {c.requestedAt ? (
                  <p className="muted small">
                    {new Date(c.requestedAt).toLocaleString()}
                  </p>
                ) : null}
                <div className="report-admin-actions">
                  <button
                    type="button"
                    className="text-btn"
                    disabled={verifyBusy === c.id}
                    onClick={() => void onResolve(c.id, "approved")}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="text-btn"
                    disabled={verifyBusy === c.id}
                    onClick={() => void onResolve(c.id, "rejected")}
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {verifyErr ? <p className="auth-error small">{verifyErr}</p> : null}
        <p className="muted small" style={{ marginTop: "0.75rem" }}>
          Also set admin emails in Supabase <code>platform_config.admin_emails</code> (migration{" "}
          <code>014</code>) for RLS-backed admin actions.
        </p>
      </section>

      <section className="card" style={{ marginBottom: "1.25rem" }}>
        <h2 className="form-title">Feature flags</h2>
        <ul className="admin-flag-list">
          {(Object.keys(flags) as (keyof typeof flags)[]).map((k) => (
            <li key={k}>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={flags[k]}
                  onChange={(e) => setFeatureFlags({ [k]: e.target.checked })}
                />
                {k}
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2 className="form-title">Open reports ({reports.length})</h2>
        {reports.length === 0 ? (
          <p className="muted small">No open reports.</p>
        ) : (
          <ul className="report-admin-list">
            {reports.map((r) => (
              <li key={r.id} className="report-admin-item">
                <strong>{r.targetType}</strong> · <code>{r.targetId}</code>
                <p className="small">{r.reason}</p>
                <p className="muted small">
                  {new Date(r.createdAt).toLocaleString()} · reporter {r.reporterId}
                </p>
                <div className="report-admin-actions">
                  <button
                    type="button"
                    className="text-btn"
                    onClick={() => setReportStatus(r.id, "resolved")}
                  >
                    Resolve
                  </button>
                  <button
                    type="button"
                    className="text-btn"
                    onClick={() => setReportStatus(r.id, "dismissed")}
                  >
                    Dismiss
                  </button>
                  {r.targetType === "user" ? (
                    <button
                      type="button"
                      className="text-btn"
                      onClick={() => {
                        blockUser(r.targetId);
                        setReportStatus(r.id, "resolved");
                      }}
                    >
                      Block user
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="small muted">
        Ledger rows: {state.ledger.length} · Events: {state.events.length} · Blocks:{" "}
        {(state.userBlocks ?? []).length}
      </p>
    </div>
  );
}
