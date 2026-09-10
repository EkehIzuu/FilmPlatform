import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { LiveBroadcastShell } from "../components/live/LiveBroadcastShell";
import { PageHeader } from "../components/PageHeader";
import { LiveUpcomingList } from "../components/LiveUpcomingList";
import { useAuth } from "../context/AuthContext";
import { useFilmData } from "../context/FilmDataContext";
import type { User } from "../domain/types";
import { liveRoomIdForUser, profileLivePath, usernameFromRoomId } from "../lib/livePaths";

type Props = {
  embedded?: boolean;
  host?: User;
};

export function LiveRoom({ embedded = false, host }: Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user: sessionUser } = useAuth();
  const { trackEvent, listScheduledLives } = useFilmData();

  const titleLabel = searchParams.get("title") ?? "";
  const episodeLabel = searchParams.get("ep") ?? "";
  const spoilers = searchParams.get("spoilers") === "1";
  const scheduledLiveId = searchParams.get("live") ?? "";

  const roomId = host
    ? liveRoomIdForUser(host)
    : (searchParams.get("room")?.trim() ?? "");

  useEffect(() => {
    const legacy = searchParams.get("room")?.trim();
    if (host || !legacy) return;
    const handle = usernameFromRoomId(legacy);
    if (handle) {
      navigate(
        profileLivePath(handle, {
          liveId: scheduledLiveId || undefined,
          title: titleLabel || undefined,
          ep: episodeLabel || undefined,
          spoilers,
        }),
        { replace: true },
      );
    }
  }, [host, navigate, searchParams, scheduledLiveId, titleLabel, episodeLabel, spoilers]);

  const upcoming = listScheduledLives(false)
    .filter((l) => new Date(l.startsAt) >= new Date())
    .slice(0, 12);

  const hostLive = host
    ? listScheduledLives(false).find(
        (l) =>
          l.id === scheduledLiveId ||
          l.ownerId === host.id ||
          l.ownerUsername === host.username,
      )
    : undefined;

  if (host && roomId) {
    return (
      <LiveBroadcastShell
        host={host}
        roomId={roomId}
        titleLabel={titleLabel || hostLive?.title}
        scheduledLiveId={scheduledLiveId || hostLive?.id}
        embedded={embedded}
      />
    );
  }

  return (
    <div className={embedded ? "watch-panel page-live" : "page page-live"}>
      {embedded ? null : (
        <PageHeader
          title="Live"
          subtitle="Creator profile streams — TikTok-style layout, comments, gifts, guest requests."
        />
      )}

      {!host && upcoming.length > 0 ? (
        <section className="live-discovery">
          <h2 className="section-label">Upcoming lives</h2>
          <LiveUpcomingList lives={upcoming} />
        </section>
      ) : null}

      {!roomId ? (
        <p className="hint-banner">
          Open a creator&apos;s profile to watch their live.
          {sessionUser?.isCreator && sessionUser.username ? (
            <>
              {" "}
              <Link to={profileLivePath(sessionUser.username)} className="text-link">
                Go to your live →
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
