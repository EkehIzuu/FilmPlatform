import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useFilmData } from "../context/FilmDataContext";

/** Clips, live, communities — framed as premiere promotion tools. */
export function PromoteToolsSection() {
  const { user } = useAuth();
  const { getFeatureFlags } = useFilmData();
  const f = getFeatureFlags();

  const items: { to: string; icon: string; title: string; hint: string }[] = [];
  if (f.clips) {
    items.push({
      to: "/clips",
      icon: "⚡",
      title: "Trailers & clips",
      hint: "Teasers before opening night",
    });
  }
  if (f.live) {
    items.push({
      to: "/watch/live",
      icon: "●",
      title: "Premiere night live",
      hint: "Red carpet & after-party on profile",
    });
  }
  if (f.communities) {
    items.push({
      to: "/communities",
      icon: "💬",
      title: "Fan discussions",
      hint: "Threads per title",
    });
  }
  if (user?.isCreator) {
    items.push({
      to: "/creator/premiere",
      icon: "🎟️",
      title: "Schedule premiere",
      hint: "Ticketed synced screening",
    });
  }

  if (items.length === 0) return null;

  return (
    <section className="promote-tools-section">
      <h2 className="section-label">Promote your premiere</h2>
      <p className="small muted promote-tools-lead">
        Short clips, live Q&amp;A, and community posts fill the room before the curtain rises.
      </p>
      <ul className="promote-tools-grid">
        {items.map((item) => (
          <li key={item.to}>
            <Link to={item.to} className="card card-link promote-tools-card">
              <span className="promote-tools-icon" aria-hidden>
                {item.icon}
              </span>
              <strong>{item.title}</strong>
              <span className="small muted">{item.hint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
