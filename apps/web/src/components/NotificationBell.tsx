import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useFilmData } from "../context/FilmDataContext";

export function NotificationBell() {
  const { user } = useAuth();
  const { inboxUnreadCount } = useFilmData();

  if (!user) return null;

  const n = inboxUnreadCount();

  return (
    <Link
      to="/inbox"
      className="notif-bell-btn"
      aria-label={n > 0 ? `Inbox, ${n} unread` : "Inbox"}
    >
      <span className="notif-bell-icon" aria-hidden>
        🔔
      </span>
      {n > 0 ? <span className="notif-badge">{n > 9 ? "9+" : n}</span> : null}
    </Link>
  );
}
