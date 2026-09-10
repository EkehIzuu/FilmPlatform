import { Link } from "react-router-dom";
import { CreatorPremiereWorkflowSteps } from "../CreatorPremiereWorkflowSteps";
import { useFilmData } from "../../../context/FilmDataContext";
import { getPremiereTimeline } from "../../../domain/premiereSync";
import {
  formatShowtime,
  getPhaseStatusLine,
} from "@/features/premiere/lib/premiereStatusCopy";
import { formatMoney } from "../../../lib/monetization";

export function PremiereBuilderPanel() {
  const { listMyPremiereEvents, premiereReservationCount, getFeatureFlags } = useFilmData();
  const f = getFeatureFlags();
  const events = listMyPremiereEvents().sort(
    (a, b) => new Date(b.featureStartsAt).getTime() - new Date(a.featureStartsAt).getTime(),
  );

  if (!f.premiere) {
    return (
      <div className="studio-panel">
        <p className="muted small">Premieres are disabled in feature flags.</p>
      </div>
    );
  }

  return (
    <div className="studio-panel filmmaker-panel">
      <div className="studio-panel-card">
        <div className="studio-panel-head-row">
          <h2 className="studio-panel-title">Premiere builder</h2>
          <Link to="/creator/premiere" className="auth-submit studio-panel-cta-sm">
            Schedule premiere →
          </Link>
        </div>
        <p className="small muted studio-panel-lead">
          Ticketed opening nights — fans buy seats, join at showtime, watch on your profile after curtain.
        </p>

        <CreatorPremiereWorkflowSteps />

        {events.length === 0 ? (
          <div className="premiere-builder-empty card">
            <p className="muted small">No premieres scheduled yet.</p>
            <Link to="/creator/premiere" className="auth-submit" style={{ marginTop: "0.75rem" }}>
              Schedule your first premiere
            </Link>
          </div>
        ) : (
          <ul className="premiere-builder-list">
            {events.map((ev) => {
              const sold = premiereReservationCount(ev.id);
              const left = Math.max(0, ev.capacity - sold);
              const tl = getPremiereTimeline(ev);
              const phase = tl.phase;
              const fill = ev.capacity > 0 ? Math.round((sold / ev.capacity) * 100) : 0;
              return (
                <li key={ev.id} className="card premiere-builder-row">
                  <div>
                    <strong>{ev.titleName}</strong>
                    <p className="small muted">
                      {formatShowtime(ev.featureStartsAt)} · {getPhaseStatusLine(tl)}
                    </p>
                    <p className="small">
                      <strong>{sold}</strong> sold · <strong>{left}</strong> left ·{" "}
                      {formatMoney(ev.priceCents, ev.currency)} · {fill}% full
                    </p>
                    <p className="small muted">
                      {phase === "lobby"
                        ? "Fans see countdown in My tickets before showtime."
                        : phase === "ended"
                          ? "Screening ended — fans may watch on profile if published."
                          : "Screening is live — fans with tickets can join now."}
                    </p>
                  </div>
                  <div className="film-manager-actions">
                    <Link to={`/premiere/${ev.id}`} className="auth-submit studio-panel-cta-sm">
                      Preview room
                    </Link>
                    <Link to="/watch/premiere" className="btn-secondary">
                      Fan listing
                    </Link>
                    <Link to="/creator/premiere" className="text-link small">
                      Edit schedule
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="studio-panel-card">
        <h3 className="section-label">How fans enter</h3>
        <ul className="small muted filmmaker-tips">
          <li>Fans buy on your premiere ticket page (linked from home &amp; Screening Hub).</li>
          <li>Tickets appear in My tickets with countdown until showtime.</li>
          <li>At showtime they enter the synced screening room — same clock for everyone.</li>
          <li>Multi-seat purchases can generate share codes for friends.</li>
        </ul>
        <p className="small" style={{ marginTop: "0.65rem" }}>
          <Link to="/creator/premiere" className="text-link">
            Open full premiere builder →
          </Link>
          {" · "}
          <Link to="/premiere/join" className="text-link">
            Test share-code redeem
          </Link>
        </p>
      </div>
    </div>
  );
}
