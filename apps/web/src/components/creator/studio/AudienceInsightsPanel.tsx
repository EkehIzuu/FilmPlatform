import { Link } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { useFilmData } from "../../../context/FilmDataContext";
import { buildAudienceInsights } from "../../../lib/audienceInsights";

export function AudienceInsightsPanel() {
  const { user } = useAuth();
  const { listAnalyticsEvents, state } = useFilmData();
  const events = listAnalyticsEvents();

  if (!user?.isCreator) {
    return <p className="muted small">Creator account required.</p>;
  }

  const insights = buildAudienceInsights(state, user.id, events);

  return (
    <div className="studio-panel filmmaker-panel">
      <div className="studio-panel-card">
        <h2 className="studio-panel-title">Audience insights</h2>
        <p className="small muted studio-panel-lead">
          Funnel from film page → play → ticket — demo metrics from local analytics events.
        </p>
        <div className="filmmaker-insights-stats">
          <div className="studio-analytics-stat">
            <span className="studio-analytics-num">{insights.totalPlays}</span>
            <span className="studio-analytics-label">Profile plays</span>
          </div>
          <div className="studio-analytics-stat">
            <span className="studio-analytics-num">{insights.totalPremiereJoins}</span>
            <span className="studio-analytics-label">Premiere joins</span>
          </div>
          <div className="studio-analytics-stat">
            <span className="studio-analytics-num">{insights.avgViewToPlayPct}%</span>
            <span className="studio-analytics-label">Avg view → play</span>
          </div>
        </div>
      </div>

      <div className="studio-panel-card">
        <h3 className="form-title">Drop-off by film</h3>
        {insights.funnels.length === 0 ? (
          <p className="muted small">Publish a title and drive traffic to see funnels.</p>
        ) : (
          <ul className="audience-funnel-list">
            {insights.funnels.map((f) => (
              <li key={f.titleId} className="card audience-funnel-row">
                <div className="audience-funnel-head">
                  <Link to={`/title/${f.slug}`} className="text-link">
                    <strong>{f.titleName}</strong>
                  </Link>
                </div>
                <div className="audience-funnel-bar-wrap" title="Views → plays → tickets">
                  <div
                    className="audience-funnel-bar audience-funnel-bar--views"
                    style={{ width: `${Math.min(100, f.pageViews * 8)}%` }}
                  />
                  <div
                    className="audience-funnel-bar audience-funnel-bar--plays"
                    style={{ width: `${Math.min(100, f.plays * 12)}%` }}
                  />
                  <div
                    className="audience-funnel-bar audience-funnel-bar--tickets"
                    style={{ width: `${Math.min(100, f.ticketCheckouts * 20)}%` }}
                  />
                </div>
                <p className="small muted">
                  {f.pageViews} views · {f.plays} plays · {f.ticketCheckouts} checkouts ·{" "}
                  {f.premiereJoins} joined premiere
                </p>
                <p className="small">
                  Drop-off: <strong>{100 - f.viewToPlayPct}%</strong> leave before play
                  {f.plays > 0 ? (
                    <>
                      {" · "}
                      <strong>{100 - f.playToTicketPct}%</strong> play without buying
                    </>
                  ) : null}
                </p>
              </li>
            ))}
          </ul>
        )}
        <p className="small muted" style={{ marginTop: "0.75rem" }}>
          Production: wire watch-time heartbeats and premiere exit events for real drop-off curves.
        </p>
      </div>
    </div>
  );
}
