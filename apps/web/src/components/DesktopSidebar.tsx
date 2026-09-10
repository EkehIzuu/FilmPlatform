import { Link, NavLink } from "react-router-dom";
import { BrandLogo } from "./BrandLogo";
import { ModeToggle } from "./ModeToggle";
import { UserAvatar } from "./UserAvatar";
import { useAuth } from "../context/AuthContext";
import { useFilmData } from "../context/FilmDataContext";
import { isAdminEmail } from "../lib/admin";
import type { AppMode } from "../types";

type Props = {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  onCreateClick: () => void;
};

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? "desktop-sidebar-link active" : "desktop-sidebar-link";

function FanLinks({
  explore,
  showWatch,
  clips,
}: {
  explore: boolean;
  showWatch: boolean;
  clips: boolean;
}) {
  return (
    <>
      <NavLink to="/" end className={linkClass}>
        <span className="desktop-sidebar-icon" aria-hidden>
          🎬
        </span>
        Premieres
      </NavLink>
      {explore ? (
        <NavLink to="/explore" className={linkClass}>
          <span className="desktop-sidebar-icon" aria-hidden>
            ◎
          </span>
          Discover
        </NavLink>
      ) : null}
      {showWatch ? (
        <NavLink to="/watch" className={linkClass}>
          <span className="desktop-sidebar-icon" aria-hidden>
            ▶
          </span>
          Watch
        </NavLink>
      ) : null}
      {clips ? (
        <NavLink to="/clips" className={linkClass}>
          <span className="desktop-sidebar-icon" aria-hidden>
            ▤
          </span>
          Clips
        </NavLink>
      ) : null}
    </>
  );
}

function CreatorLinks({
  premiere,
  clips,
  explore,
}: {
  premiere: boolean;
  clips: boolean;
  explore: boolean;
}) {
  return (
    <>
      <NavLink to="/" end className={linkClass}>
        <span className="desktop-sidebar-icon" aria-hidden>
          ⌂
        </span>
        Studio
      </NavLink>
      {premiere ? (
        <NavLink to="/creator/premiere" className={linkClass}>
          <span className="desktop-sidebar-icon" aria-hidden>
            🎟️
          </span>
          Premieres
        </NavLink>
      ) : null}
      <NavLink to="/creator/titles" className={linkClass}>
        <span className="desktop-sidebar-icon" aria-hidden>
          ▤
        </span>
        Titles
      </NavLink>
      <NavLink to="/creator/analytics" className={linkClass}>
        <span className="desktop-sidebar-icon" aria-hidden>
          📊
        </span>
        Insights
      </NavLink>
      {clips ? (
        <NavLink to="/clips" className={linkClass}>
          <span className="desktop-sidebar-icon" aria-hidden>
            🎞️
          </span>
          Clips
        </NavLink>
      ) : null}
      {explore ? (
        <NavLink to="/explore" className={linkClass}>
          <span className="desktop-sidebar-icon" aria-hidden>
            ◎
          </span>
          Discover
        </NavLink>
      ) : null}
    </>
  );
}

/** Persistent left nav rail, ≥900px only (see .desktop-sidebar in index.css). */
export function DesktopSidebar({ mode, onModeChange, onCreateClick }: Props) {
  const { user } = useAuth();
  const { getFeatureFlags } = useFilmData();
  if (!user) return null;

  const f = getFeatureFlags();
  const showWatch = f.premiere || f.live;

  return (
    <aside className="desktop-sidebar" aria-label="Primary">
      <BrandLogo variant="compact" className="desktop-sidebar-brand" />

      <button
        type="button"
        className="desktop-sidebar-create"
        onClick={onCreateClick}
        aria-label="Create"
      >
        <span aria-hidden>+</span> Create
      </button>

      <nav className="desktop-sidebar-nav" aria-label="Sections">
        {mode === "fan" ? (
          <FanLinks explore={f.explore} showWatch={showWatch} clips={f.clips} />
        ) : (
          <CreatorLinks premiere={f.premiere} clips={f.clips} explore={f.explore} />
        )}
      </nav>

      <div className="desktop-sidebar-foot">
        <ModeToggle mode={mode} onChange={onModeChange} className="desktop-sidebar-mode-toggle" />
        <Link to="/profile" className="desktop-sidebar-profile">
          <UserAvatar
            displayName={user.displayName}
            email={user.email}
            avatarUrl={user.avatarUrl}
            size="sm"
          />
          <span className="desktop-sidebar-profile-name">{user.displayName}</span>
        </Link>
        <div className="desktop-sidebar-foot-links">
          <NavLink to="/settings" className="desktop-sidebar-icon-btn" aria-label="Settings" title="Settings">
            <span aria-hidden>⚙</span>
          </NavLink>
          {isAdminEmail(user.email) ? (
            <NavLink to="/admin" className="desktop-sidebar-icon-btn" aria-label="Ops" title="Ops">
              <span aria-hidden>◆</span>
            </NavLink>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
