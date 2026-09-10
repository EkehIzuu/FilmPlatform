import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useFilmData } from "../../context/FilmDataContext";
import { buildBusinessAnalytics } from "../../lib/businessAnalytics";
import { profileLivePath } from "../../lib/livePaths";
import { formatMoney } from "../../lib/monetization";
import { buildStudioAnalyticsStats } from "../../lib/studioAnalytics";

function formatBytes(name: string): string {
  return name;
}

function formatUploadStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function StudioUploadPanel() {
  const { user } = useAuth();
  const { getFeatureFlags } = useFilmData();
  const f = getFeatureFlags();
  const hasUsername = Boolean(user?.username?.trim());

  return (
    <div className="studio-panel">
      <div className="studio-panel-card">
        <h2 className="studio-panel-title">Upload &amp; publish</h2>
        <p className="small muted studio-panel-lead">
          Trailers, episodes, and extras attach to your titles. Full AI studio lives on the
          upload page.
        </p>
        <div className="studio-panel-actions">
          <Link to="/creator/upload" className="studio-panel-cta">
            Open upload studio →
          </Link>
          <Link to="/creator/titles#create-title" className="btn-secondary studio-panel-btn">
            + New title
          </Link>
        </div>
        <ul className="studio-quick-grid">
          {f.clips ? (
            <li>
              <Link to="/clips/new" className="studio-quick-card">
                <span className="studio-quick-icon" aria-hidden>
                  ⚡
                </span>
                <strong>Post clip</strong>
                <span className="small muted">24h story</span>
              </Link>
            </li>
          ) : null}
          {f.live ? (
            <li>
              <Link
                to={hasUsername && user?.username ? profileLivePath(user.username) : "/profile/settings"}
                className="studio-quick-card studio-quick-card--live"
              >
                <span className="studio-quick-icon" aria-hidden>
                  ●
                </span>
                <strong>{hasUsername ? "Go live" : "Set username"}</strong>
                <span className="small muted">
                  {hasUsername ? "Profile stream" : "Required for live"}
                </span>
              </Link>
            </li>
          ) : null}
          {f.communities ? (
            <li>
              <Link to="/post/community" className="studio-quick-card">
                <span className="studio-quick-icon" aria-hidden>
                  ✎
                </span>
                <strong>Community post</strong>
                <span className="small muted">Title hub</span>
              </Link>
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}

export function StudioLibraryPanel() {
  const { listMyTitles, state } = useFilmData();
  const titles = listMyTitles();
  const uploads = state.uploads.filter((u) => titles.some((t) => t.id === u.titleId));

  return (
    <div className="studio-panel">
      <div className="studio-panel-card">
        <div className="studio-panel-head-row">
          <h2 className="studio-panel-title">My library</h2>
          <Link to="/creator/titles" className="text-link small">
            All titles →
          </Link>
        </div>
        {titles.length === 0 ? (
          <p className="muted small">No titles yet — create one to start uploading.</p>
        ) : (
          <ul className="studio-library-list">
            {titles.map((t) => (
              <li key={t.id}>
                <Link to={`/title/${t.slug}`} className="studio-library-row">
                  <span>
                    <strong>{t.name}</strong>
                    <span className="pill" style={{ marginLeft: "0.35rem" }}>
                      {t.status}
                    </span>
                  </span>
                  <span className="small muted">{t.kind}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="studio-panel-card">
        <div className="studio-panel-head-row">
          <h2 className="studio-panel-title">Uploads</h2>
          <Link to="/creator/upload" className="text-link small">
            Upload more →
          </Link>
        </div>
        {uploads.length === 0 ? (
          <p className="muted small">No files uploaded yet.</p>
        ) : (
          <ul className="studio-library-list">
            {uploads
              .slice()
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .slice(0, 12)
              .map((u) => {
                const title = titles.find((t) => t.id === u.titleId);
                return (
                  <li key={u.id} className="studio-library-row studio-library-row--static">
                    <span>
                      <strong>{formatBytes(u.fileName)}</strong>
                      <span className="small muted"> · {title?.name ?? "Title"}</span>
                    </span>
                    <span className="small">
                      <span className="pill">{u.kind}</span>{" "}
                      <span className="muted">{formatUploadStatus(u.status)}</span>
                    </span>
                  </li>
                );
              })}
          </ul>
        )}
      </div>
    </div>
  );
}

export function StudioAnalyticsPanel() {
  const { user } = useAuth();
  const { listAnalyticsEvents, listLedgerForCreator, state } = useFilmData();
  const events = listAnalyticsEvents();
  const ledger = user?.isCreator ? listLedgerForCreator(user.id) : [];

  if (!user) return null;

  const stats = buildStudioAnalyticsStats(events, ledger, user.id);
  const biz = user.isCreator ? buildBusinessAnalytics(state, user.id, events) : null;
  const myEvents = events.filter((e) => e.userId === user.id).slice().reverse().slice(0, 8);

  return (
    <div className="studio-panel">
      <div className="studio-panel-card">
        <div className="studio-panel-head-row">
          <h2 className="studio-panel-title">Analytics</h2>
          <Link to="/creator/analytics" className="text-link small">
            Full insights →
          </Link>
        </div>
        <div className="studio-analytics-grid">
          <div className="studio-analytics-stat">
            <span className="studio-analytics-num">{stats.total}</span>
            <span className="studio-analytics-label">Your events</span>
          </div>
          <div className="studio-analytics-stat">
            <span className="studio-analytics-num">{stats.aiActions}</span>
            <span className="studio-analytics-label">AI workflows</span>
          </div>
          <div className="studio-analytics-stat">
            <span className="studio-analytics-num">₦{stats.grossNgn.toFixed(0)}</span>
            <span className="studio-analytics-label">Gross revenue</span>
          </div>
          <div className="studio-analytics-stat">
            <span className="studio-analytics-num">{stats.localizedLanguages}</span>
            <span className="studio-analytics-label">Languages</span>
          </div>
        </div>
        {biz ? (
          <p className="small muted" style={{ marginTop: "0.75rem" }}>
            Net earnings: <strong>{formatMoney(biz.creatorNetCents)}</strong> ·{" "}
            {biz.ticketsSold} premiere ticket{biz.ticketsSold === 1 ? "" : "s"} ·{" "}
            {biz.paidTitles} paid title{biz.paidTitles === 1 ? "" : "s"}
          </p>
        ) : null}
        <p className="small muted" style={{ marginTop: "0.5rem" }}>
          Projected monthly: <strong>₦{stats.projectedMonthlyNgn.toLocaleString()}</strong> (demo
          multiplier from ledger).
        </p>
        {myEvents.length > 0 ? (
          <ul className="studio-recent-list" style={{ marginTop: "0.75rem" }}>
            {myEvents.map((e) => (
              <li key={e.id}>
                <span className="studio-recent-row">
                  <code className="small">{e.type}</code>
                  <span className="muted small">
                    {new Date(e.createdAt).toLocaleString(undefined, {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small" style={{ marginTop: "0.75rem" }}>
            Upload, publish, or go live — activity will show here.
          </p>
        )}
      </div>
    </div>
  );
}

export function StudioProfilePanel({ profilePath }: { profilePath: string }) {
  const { user, updateProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!user) return null;

  const onSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    const displayName = String(fd.get("displayName") ?? "").trim();
    const bio = String(fd.get("bio") ?? "").trim();
    await updateProfile({
      displayName: displayName || user.displayName,
      bio: bio || undefined,
    });
    setMsg("Profile updated.");
    setSaving(false);
  };

  return (
    <div className="studio-panel">
      <div className="studio-panel-card">
        <h2 className="studio-panel-title">Creator profile</h2>
        <p className="small muted studio-panel-lead">
          Fans see this on your public page. Full account settings are in Profile settings.
        </p>
        <form className="stack-form studio-profile-form" onSubmit={onSave}>
          <label>
            Display name
            <input name="displayName" defaultValue={user.displayName} maxLength={80} />
          </label>
          <label>
            Bio
            <textarea
              name="bio"
              rows={3}
              maxLength={280}
              defaultValue={user.bio ?? ""}
              placeholder="Tell fans what you make…"
            />
          </label>
          <button type="submit" className="btn-secondary" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
          {msg ? <p className="small" style={{ color: "var(--izora-gold)" }}>{msg}</p> : null}
        </form>
        <div className="studio-profile-links">
          <Link to={profilePath} className="text-link small">
            View public profile →
          </Link>
          <Link to="/profile/settings" className="text-link small">
            Account &amp; privacy →
          </Link>
          <Link to="/profile" className="text-link small">
            Fan profile &amp; feed →
          </Link>
        </div>
      </div>
    </div>
  );
}
