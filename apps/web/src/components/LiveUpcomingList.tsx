import { Link } from "react-router-dom";
import type { ScheduledLive } from "../domain/types";
import { livePathForScheduled } from "../lib/livePaths";
import { UserAvatar } from "./UserAvatar";

type Props = {
  lives: ScheduledLive[];
  /** Optional map ownerId → display info when ownerUsername missing */
  ownerLabels?: Record<string, { displayName: string; username?: string; avatarUrl?: string }>;
};

export function LiveUpcomingList({ lives, ownerLabels }: Props) {
  if (lives.length === 0) {
    return <p className="muted small">No upcoming lives scheduled.</p>;
  }

  return (
    <ul className="live-creator-list">
      {lives.map((l) => {
        const label = l.ownerUsername
          ? { displayName: l.ownerUsername, username: l.ownerUsername }
          : ownerLabels?.[l.ownerId];
        const handle = l.ownerUsername ?? label?.username;
        return (
          <li key={l.id} className="live-creator-card">
            <UserAvatar
              displayName={label?.displayName ?? "Creator"}
              avatarUrl={label?.avatarUrl}
              size="md"
            />
            <div className="live-creator-card-body">
              {handle ? (
                <p className="live-creator-handle muted small">@{handle}</p>
              ) : null}
              <strong>{l.title}</strong>
              <p className="muted small">
                {new Date(l.startsAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
              {l.description ? <p className="small">{l.description}</p> : null}
            </div>
            <Link to={livePathForScheduled(l)} className="btn-secondary live-creator-join">
              Join
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
