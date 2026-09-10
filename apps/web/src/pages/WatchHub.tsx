import { Link, NavLink, Navigate, Route, Routes } from "react-router-dom";
import { useFilmData } from "../context/FilmDataContext";
import { PremiereList } from "./PremiereList";
import { LiveRoom } from "./LiveRoom";
import { Clips } from "./Clips";

export function WatchHub() {
  const { getFeatureFlags } = useFilmData();
  const f = getFeatureFlags();
  if (!f.premiere && !f.live && !f.clips) {
    return (
      <div className="page">
        <p className="muted small">Watch is unavailable right now.</p>
        <Link to="/" className="text-link">
          Home
        </Link>
      </div>
    );
  }

  return (
    <div className="page watch-hub">
      <header className="watch-hub-header">
        <nav className="watch-tabs" aria-label="Watch sections">
          {f.clips ? (
            <NavLink
              to="/watch/clips"
              className={({ isActive }) => (isActive ? "watch-tab active" : "watch-tab")}
            >
              Clips
            </NavLink>
          ) : null}
          {f.live ? (
            <NavLink
              to="/watch/live"
              className={({ isActive }) => (isActive ? "watch-tab active" : "watch-tab")}
            >
              Live
            </NavLink>
          ) : null}
          {f.premiere ? (
            <NavLink
              to="/watch/premiere"
              className={({ isActive }) => (isActive ? "watch-tab active" : "watch-tab")}
            >
              Premieres
            </NavLink>
          ) : null}
        </nav>
      </header>

      <div className="watch-hub-body">
      <Routes>
        <Route
          index
          element={<Navigate to={f.clips ? "clips" : f.premiere ? "premiere" : "live"} replace />}
        />
        {f.clips ? <Route path="clips" element={<Clips embedded />} /> : null}
        {f.premiere ? (
          <Route path="premiere" element={<PremiereList embedded />} />
        ) : null}
        {f.live ? (
          <Route path="live" element={<LiveRoom embedded />} />
        ) : null}
        <Route
          path="*"
          element={<Navigate to={f.clips ? "clips" : f.premiere ? "premiere" : "live"} replace />}
        />
      </Routes>
      </div>
    </div>
  );
}
