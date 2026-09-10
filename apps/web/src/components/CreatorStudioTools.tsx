import { Link } from "react-router-dom";
import { useFilmData } from "../context/FilmDataContext";
import type { FeatureFlags } from "../domain/types";

type ToolItem = {
  to: string;
  icon: string;
  title: string;
  hint: string;
  accent?: boolean;
  badge?: number;
};

type ToolSection = {
  id: string;
  label: string;
  items: ToolItem[];
};

function buildSections(f: FeatureFlags, inboxUnread: number): ToolSection[] {
  const sections: ToolSection[] = [];

  const grow: ToolItem[] = [
    {
      to: "/creator/analytics",
      icon: "≡",
      title: "Business analytics",
      hint: "Revenue, tickets, commissions",
    },
    {
      to: "/creator/monetization",
      icon: "₦",
      title: "Monetization",
      hint: "Pricing, coins, boosts",
    },
    {
      to: "/inbox?tab=messages",
      icon: "✉",
      title: "Messages",
      hint: "Fan & collab DMs",
      badge: inboxUnread > 0 ? inboxUnread : undefined,
    },
  ];
  if (f.communities) {
    grow.push({
      to: "/communities",
      icon: "◎",
      title: "Communities",
      hint: "Your title hubs",
    });
  }
  sections.push({ id: "grow", label: "Grow", items: grow });

  return sections;
}

type Props = {
  profilePath: string;
  followerCount: number;
};

export function CreatorStudioTools({ profilePath, followerCount }: Props) {
  const { getFeatureFlags, inboxUnreadCount } = useFilmData();
  const f = getFeatureFlags();
  const sections = buildSections(f, inboxUnreadCount());

  return (
    <div className="studio-tools">
      <section className="studio-tools-section">
        <h2 className="studio-tools-section-label">Grow</h2>
        <ul className="studio-tools-list">
          <li>
            <Link to={profilePath} className="studio-tools-link studio-tools-link--accent">
              <span className="studio-tools-icon" aria-hidden>
                👤
              </span>
              <span className="studio-tools-text">
                <strong>View public profile</strong>
                <span className="small muted">
                  {followerCount} follower{followerCount === 1 ? "" : "s"}
                </span>
              </span>
            </Link>
          </li>
        </ul>
      </section>

      {sections.map((section) => (
        <section key={section.id} className="studio-tools-section">
          <h2 className="studio-tools-section-label">{section.label}</h2>
          <ul className="studio-tools-list">
            {section.items.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={`studio-tools-link ${item.accent ? "studio-tools-link--accent" : ""}`}
                >
                  <span className="studio-tools-icon" aria-hidden>
                    {item.icon}
                  </span>
                  <span className="studio-tools-text">
                    <strong>{item.title}</strong>
                    <span className="small muted">{item.hint}</span>
                  </span>
                  {item.badge != null && item.badge > 0 ? (
                    <span className="studio-tools-badge">{item.badge > 9 ? "9+" : item.badge}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
