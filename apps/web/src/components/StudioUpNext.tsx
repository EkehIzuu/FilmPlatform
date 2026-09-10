import { Link } from "react-router-dom";
import type { StudioUpNextItem } from "../lib/studioInsights";

type Props = {
  items: StudioUpNextItem[];
};

const KIND_ICON: Record<StudioUpNextItem["kind"], string> = {
  live: "▶",
  premiere: "🎬",
  draft: "▤",
  upload: "↑",
};

export function StudioUpNext({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <section className="studio-up-next">
      <h2 className="studio-tools-section-label">Needs attention</h2>
      <ul className="studio-up-next-list">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              to={item.href}
              className={`studio-up-next-row ${item.urgent ? "studio-up-next-row--urgent" : ""}`}
            >
              <span className="studio-up-next-icon" aria-hidden>
                {KIND_ICON[item.kind]}
              </span>
              <span className="studio-up-next-body">
                <strong>{item.title}</strong>
                <span className="small muted">{item.subtitle}</span>
              </span>
              {item.when ? <span className="studio-up-next-when small">{item.when}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
