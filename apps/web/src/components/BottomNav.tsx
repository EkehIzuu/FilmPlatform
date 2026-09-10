import { NavLink, useLocation } from "react-router-dom";
import { useFilmData } from "../context/FilmDataContext";
import type { AppMode } from "../types";

type Props = {
  mode: AppMode;
  onCreateClick: () => void;
};

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? "bottom-nav-link active" : "bottom-nav-link";

function isWatchPath(pathname: string): boolean {
  return (
    pathname.startsWith("/watch") ||
    pathname === "/my-tickets" ||
    pathname.startsWith("/premiere") ||
    pathname === "/live" ||
    /^\/u\/[^/]+\/live/.test(pathname)
  );
}

export function BottomNav({ mode, onCreateClick }: Props) {
  const location = useLocation();
  const { getFeatureFlags } = useFilmData();
  const f = getFeatureFlags();
  const showWatch = f.premiere || f.live;
  const watchActive = isWatchPath(location.pathname);
  const premieresActive =
    location.pathname === "/" ||
    location.pathname.startsWith("/premiere/") ||
    location.pathname === "/watch/premiere";

  if (mode === "fan") {
    return (
      <div className="bottom-nav-inner bottom-nav-inner--fan">
        <NavLink to="/" end className={({ isActive }) => linkClass({ isActive: isActive || premieresActive })}>
          <span className="bottom-nav-icon" aria-hidden>
            🎬
          </span>
          <span>Premieres</span>
        </NavLink>
        {f.explore ? (
          <NavLink to="/explore" className={linkClass}>
            <span className="bottom-nav-icon" aria-hidden>
              ◎
            </span>
            <span>Discover</span>
          </NavLink>
        ) : (
          <span className="bottom-nav-spacer" aria-hidden />
        )}
        <button
          type="button"
          className="bottom-nav-create"
          onClick={onCreateClick}
          aria-label="Create"
          title="Create"
        >
          <span className="bottom-nav-create-glow" aria-hidden />
          <span className="bottom-nav-create-icon" aria-hidden>
            +
          </span>
        </button>
        {showWatch ? (
          <NavLink
            to="/watch"
            className={({ isActive }) =>
              linkClass({ isActive: isActive || (watchActive && !premieresActive) })
            }
          >
            <span className="bottom-nav-icon" aria-hidden>
              ▶
            </span>
            <span>Watch</span>
          </NavLink>
        ) : (
          <span className="bottom-nav-spacer" aria-hidden />
        )}
        <NavLink to="/profile" className={linkClass}>
          <span className="bottom-nav-icon" aria-hidden>
            👤
          </span>
          <span>Profile</span>
        </NavLink>
      </div>
    );
  }

  return (
    <div className="bottom-nav-inner bottom-nav-inner--creator">
      <NavLink to="/" end className={linkClass}>
        <span className="bottom-nav-icon" aria-hidden>
          ⌂
        </span>
        <span>Studio</span>
      </NavLink>
      {f.premiere ? (
        <NavLink to="/creator/premiere" className={linkClass}>
          <span className="bottom-nav-icon" aria-hidden>
            🎟️
          </span>
          <span>Premieres</span>
        </NavLink>
      ) : (
        <span className="bottom-nav-spacer" aria-hidden />
      )}
      <button
        type="button"
        className="bottom-nav-create"
        onClick={onCreateClick}
        aria-label="Create"
        title="Create"
      >
        <span className="bottom-nav-create-glow" aria-hidden />
        <span className="bottom-nav-create-icon" aria-hidden>
          +
        </span>
      </button>
      <NavLink to="/creator/titles" className={linkClass}>
        <span className="bottom-nav-icon" aria-hidden>
          ▤
        </span>
        <span>Titles</span>
      </NavLink>
      <NavLink to="/profile" className={linkClass}>
        <span className="bottom-nav-icon" aria-hidden>
          👤
        </span>
        <span>Profile</span>
      </NavLink>
    </div>
  );
}
