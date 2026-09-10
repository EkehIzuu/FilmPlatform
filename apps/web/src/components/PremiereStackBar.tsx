import { Link } from "react-router-dom";
import type { PremiereEvent } from "../domain/types";
import { buildPremiereStackLinks } from "../lib/premiereStack";
import { useFilmData } from "../context/FilmDataContext";
import type { User } from "../domain/types";

type Props = {
  event: PremiereEvent;
  owner?: Pick<User, "username" | "displayName"> | null;
  compact?: boolean;
};

export function PremiereStackBar({ event, owner, compact }: Props) {
  const { state } = useFilmData();
  const stack = buildPremiereStackLinks(state, event, owner);

  if (!stack.username && !stack.preShow && !stack.afterParty && !stack.reactions) {
    return null;
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });

  return (
    <div className={`premiere-stack ${compact ? "premiere-stack--compact" : ""}`}>
      <p className="small muted premiere-stack-label">
        Premiere night — synced film + profile live (no room numbers)
      </p>
      <ul className="premiere-stack-list">
        {stack.preShow ? (
          <li className="premiere-stack-item">
            <span className="premiere-stack-step">Pre-show</span>
            <Link to={stack.preShow.href} className="text-link">
              @{stack.username} live — red carpet
            </Link>
            <span className="muted small"> · {fmt(stack.preShow.at)}</span>
          </li>
        ) : null}
        <li className="premiere-stack-item premiere-stack-item--accent">
          <span className="premiere-stack-step">Premiere</span>
          <Link to={stack.premiere.href} className="text-link">
            Ticketed synced screening
          </Link>
          <span className="muted small"> · {fmt(stack.premiere.at)}</span>
        </li>
        {stack.reactions && stack.phase === "feature" ? (
          <li className="premiere-stack-item">
            <span className="premiere-stack-step">Reactions</span>
            <Link to={stack.reactions.href} className="text-link">
              Join @{stack.username} live
            </Link>
            <span className="muted small"> · spoilers OK</span>
          </li>
        ) : null}
        {stack.afterParty && (stack.phase === "ended" || stack.phase === "feature") ? (
          <li className="premiere-stack-item">
            <span className="premiere-stack-step">After-party</span>
            <Link to={stack.afterParty.href} className="text-link">
              Continue with @{stack.username}
            </Link>
            <span className="muted small"> · {fmt(stack.afterParty.at)}</span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
