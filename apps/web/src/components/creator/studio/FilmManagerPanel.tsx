import { Link } from "react-router-dom";
import { useFilmData } from "../../../context/FilmDataContext";
import { findTitleTrailerUpload, getActivePremiereForTitle } from "../../../lib/filmJourney";
import { formatMoney } from "../../../lib/monetization";

export function FilmManagerPanel() {
  const { listMyTitles, state } = useFilmData();
  const titles = listMyTitles();

  return (
    <div className="studio-panel filmmaker-panel">
      <div className="studio-panel-card">
        <div className="studio-panel-head-row">
          <h2 className="studio-panel-title">Film manager</h2>
          <Link to="/creator/titles#create-title" className="auth-submit studio-panel-cta-sm">
            + New film
          </Link>
        </div>
        <p className="small muted studio-panel-lead">
          Upload trailers &amp; features, set profile rental price, then schedule a premiere.
        </p>

        {titles.length === 0 ? (
          <p className="muted small">No titles yet — create your first film.</p>
        ) : (
          <ul className="film-manager-list">
            {titles.map((t) => {
              const trailer = findTitleTrailerUpload(state, t);
              const premiere = getActivePremiereForTitle(state, t.id);
              const featureUpload = state.uploads.find(
                (u) =>
                  u.titleId === t.id &&
                  u.kind === "episode" &&
                  u.status === "ready",
              );
              return (
                <li key={t.id} className="card film-manager-row">
                  <div className="film-manager-main">
                    <strong>{t.name}</strong>
                    <span className="pill" style={{ marginLeft: "0.35rem" }}>
                      {t.status}
                    </span>
                    <p className="small muted">
                      {t.kind === "series" ? "Series" : "Movie"}
                      {t.region ? ` · ${t.region}` : ""}
                      {" · "}
                      {t.accessMode === "paid"
                        ? formatMoney(t.accessPriceCents ?? 0, t.accessCurrency ?? "USD")
                        : "Free on profile"}
                    </p>
                    <ul className="film-manager-checklist small">
                      <li className={trailer ? "film-manager-check--ok" : ""}>
                        {trailer ? "✓" : "○"} Trailer
                      </li>
                      <li className={featureUpload || t.kind === "series" ? "film-manager-check--ok" : ""}>
                        {featureUpload || t.kind === "series" ? "✓" : "○"} Feature / episodes
                      </li>
                      <li className={premiere && premiere.phase !== "ended" ? "film-manager-check--ok" : ""}>
                        {premiere && premiere.phase !== "ended" ? "✓" : "○"} Premiere scheduled
                      </li>
                    </ul>
                    {premiere && premiere.phase !== "ended" ? (
                      <p className="small muted">
                        Next premiere:{" "}
                        {new Date(premiere.event.featureStartsAt).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    ) : null}
                  </div>
                  <div className="film-manager-actions">
                    <Link
                      to={`/creator/upload?titleId=${encodeURIComponent(t.id)}&kind=trailer`}
                      className="btn-secondary"
                    >
                      Upload trailer
                    </Link>
                    <Link
                      to={`/creator/upload?titleId=${encodeURIComponent(t.id)}`}
                      className="btn-secondary"
                    >
                      Upload film
                    </Link>
                    <Link to={`/creator/titles#title-${t.id}`} className="btn-secondary">
                      Pricing
                    </Link>
                    <Link
                      to={`/creator/premiere?titleId=${encodeURIComponent(t.id)}`}
                      className="btn-secondary film-manager-premiere-btn"
                    >
                      Schedule premiere
                    </Link>
                    <Link to={`/title/${t.slug}`} className="text-link small">
                      Preview →
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
