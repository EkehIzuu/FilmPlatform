import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { CreateMenu } from "./CreateMenu";
import { DesktopSidebar } from "./DesktopSidebar";
import { GlobalSearchModal } from "./GlobalSearchModal";
import { NotificationBell } from "./NotificationBell";
import { ProfileSettingsButton } from "./ProfileSettingsButton";
import { SearchTrigger } from "./SearchTrigger";
import { useAuth } from "../context/AuthContext";
import { requestPushPermission } from "../lib/pushNotifications";
import { isAdminEmail } from "../lib/admin";
import { EmailVerificationBanner } from "./EmailVerificationBanner";
import type { AppMode } from "../types";

type Props = {
  mode: AppMode;
  onModeChange: (m: AppMode) => void;
};

export function Layout({ mode, onModeChange }: Props) {
  const location = useLocation();
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (user?.pushEnabled) {
      void requestPushPermission();
    }
  }, [user?.pushEnabled]);

  useEffect(() => {
    if (!user) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [user]);

  const isWatchRoute =
    location.pathname === "/watch" || location.pathname.startsWith("/watch/");
  const isFullBleed =
    location.pathname === "/live" ||
    location.pathname.startsWith("/watch/live") ||
    /^\/premiere\/[^/]+$/.test(location.pathname);
  const onOwnProfile = location.pathname === "/profile";
  const isSettingsRoute =
    location.pathname === "/settings" ||
    location.pathname === "/profile/settings" ||
    location.pathname === "/clips/new";

  return (
    <div className="app-shell">
      <DesktopSidebar mode={mode} onModeChange={onModeChange} onCreateClick={() => setCreateOpen(true)} />

      {isSettingsRoute ? null : (
        <header className={`top-bar${isWatchRoute ? " top-bar--watch" : ""}`}>
          <div className="top-bar-inner">
            {onOwnProfile && user ? (
              <div className="top-bar-left-actions">
                <ProfileSettingsButton />
              </div>
            ) : user ? (
              <div className="top-bar-left-actions">
                <SearchTrigger onClick={() => setSearchOpen(true)} />
              </div>
            ) : (
              <Link to="/login" className="top-bar-profile top-bar-profile--guest">
                Sign in
              </Link>
            )}
            <div className="top-bar-right">
              <NotificationBell />
              {user && isAdminEmail(user.email) ? (
                <NavLink to="/admin" className="admin-link">
                  Ops
                </NavLink>
              ) : null}
            </div>
          </div>
        </header>
      )}

      <main className={`main ${isFullBleed ? "main--live" : ""}`}>
        <EmailVerificationBanner />
        <Outlet context={{ mode, setMode: onModeChange }} />
      </main>

      <footer className="site-footer small muted">
        <Link to="/legal/terms">Terms</Link>
        <span aria-hidden> · </span>
        <Link to="/legal/privacy">Privacy</Link>
        <span aria-hidden> · </span>
        <Link to="/legal/guidelines">Guidelines</Link>
      </footer>

      {isSettingsRoute ? null : onOwnProfile ? (
        <button
          type="button"
          className="bottom-nav-create bottom-nav-create--profile-only"
          onClick={() => setCreateOpen(true)}
          aria-label="Create"
          title="Create"
        >
          <span className="bottom-nav-create-glow" aria-hidden />
          <span className="bottom-nav-create-icon" aria-hidden>
            +
          </span>
        </button>
      ) : (
        <nav className="bottom-nav" aria-label="Primary navigation">
          <BottomNav mode={mode} onCreateClick={() => setCreateOpen(true)} />
        </nav>
      )}

      <CreateMenu open={createOpen} onClose={() => setCreateOpen(false)} />
      <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
