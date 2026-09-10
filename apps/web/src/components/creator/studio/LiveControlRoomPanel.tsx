import { Link } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { useFilmData } from "../../../context/FilmDataContext";
import { livePathForScheduled, profileLivePath } from "../../../lib/livePaths";

export function LiveControlRoomPanel() {
  const { user } = useAuth();
  const { listScheduledLives, getFeatureFlags } = useFilmData();
  const f = getFeatureFlags();

  const lives = user
    ? listScheduledLives(true)
        .filter((l) => l.ownerId === user.id)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    : [];

  const livePath = user?.username ? profileLivePath(user.username) : null;
  const now = Date.now();

  if (!f.live) {
    return (
      <div className="studio-panel">
        <p className="muted small">Profile live is disabled in feature flags.</p>
      </div>
    );
  }

  return (
    <div className="studio-panel filmmaker-panel">
      <div className="studio-panel-card">
        <h2 className="studio-panel-title">Live control room</h2>
        <p className="small muted studio-panel-lead">
          Pre-show, reactions, Q&amp;A — tied to premieres on your profile, not random social live.
        </p>

        {!user?.username ? (
          <p className="hint-banner small">
            Set a username in{" "}
            <Link to="/profile/settings" className="text-link">
              Settings
            </Link>{" "}
            for a shareable live URL.
          </p>
        ) : livePath ? (
          <div className="live-control-hero card">
            <p className="small muted">Your profile live</p>
            <Link to={livePath} className="auth-submit live-control-go-btn">
              ● Go live now
            </Link>
            <p className="small">
              <Link to={livePath} className="text-link">
                {livePath}
              </Link>
            </p>
            <p className="small muted">
              Host tools: chat, gifts, guest queue, polls — open the stream to moderate.
            </p>
          </div>
        ) : null}

        <div className="film-manager-actions" style={{ marginTop: "1rem" }}>
          <Link to="/creator/lives" className="btn-secondary">
            Schedule live
          </Link>
          <Link to="/watch/live" className="btn-secondary">
            Browse lives
          </Link>
        </div>
      </div>

      <div className="studio-panel-card">
        <h3 className="section-label">Scheduled</h3>
        {lives.length === 0 ? (
          <p className="muted small">No upcoming lives — schedule one for premiere night.</p>
        ) : (
          <ul className="premiere-builder-list">
            {lives.map((l) => {
              const soon = new Date(l.startsAt).getTime() - now < 86400000;
              return (
                <li key={l.id} className="card premiere-builder-row">
                  <div>
                    <strong>{l.title}</strong>
                    <p className="small muted">
                      {new Date(l.startsAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                      {soon ? " · soon" : ""}
                    </p>
                  </div>
                  <Link to={livePathForScheduled(l)} className="btn-secondary">
                    Open
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="studio-panel-card">
        <h3 className="section-label">Moderation</h3>
        <ul className="small muted filmmaker-tips">
          <li>Pin messages and clear spam from the live broadcast shell.</li>
          <li>Use Q&amp;A and polls during premiere-night after-parties.</li>
          <li>Premiere synced film chat is separate — in the cinema player room.</li>
        </ul>
      </div>
    </div>
  );
}
