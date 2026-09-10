import type { FilmDataState, ScheduledLive } from "../domain/types";

export type LiveRecommendation = ScheduledLive & {
  isLiveNow: boolean;
  /** ms until start (negative once started). */
  startsInMs: number;
  followerCount: number;
  followsCreator: boolean;
};

/** Assume a scheduled live stays "live" for ~2h after its start time. */
const LIVE_DURATION_MS = 2 * 60 * 60 * 1000;
/** Only recommend upcoming lives starting within the next 24h. */
const UPCOMING_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Picks popular / personally-relevant lives to surface inside the Clips feed.
 * Ranking: live-now first, then creators the user follows, then by follower
 * count (popularity), then soonest to start.
 */
export function recommendedLives(
  state: FilmDataState,
  userId: string | undefined,
  limit = 4,
): LiveRecommendation[] {
  const now = Date.now();
  const follows = state.follows ?? [];

  const followerCountFor = (ownerId: string) =>
    follows.filter((f) => f.targetType === "user" && f.targetId === ownerId).length;

  const userFollows = new Set(
    follows
      .filter((f) => f.targetType === "user" && f.followerId === userId)
      .map((f) => f.targetId),
  );

  const enriched: LiveRecommendation[] = (state.scheduledLives ?? [])
    .map((l) => {
      const start = new Date(l.startsAt).getTime();
      const startsInMs = start - now;
      const isLiveNow = start <= now && now <= start + LIVE_DURATION_MS;
      return {
        ...l,
        isLiveNow,
        startsInMs,
        followerCount: followerCountFor(l.ownerId),
        followsCreator: userFollows.has(l.ownerId),
      };
    })
    .filter((l) => l.ownerId !== userId)
    .filter((l) => l.isLiveNow || (l.startsInMs > 0 && l.startsInMs <= UPCOMING_WINDOW_MS));

  enriched.sort((a, b) => {
    if (a.isLiveNow !== b.isLiveNow) return a.isLiveNow ? -1 : 1;
    if (a.followsCreator !== b.followsCreator) return a.followsCreator ? -1 : 1;
    if (b.followerCount !== a.followerCount) return b.followerCount - a.followerCount;
    return Math.abs(a.startsInMs) - Math.abs(b.startsInMs);
  });

  return enriched.slice(0, limit);
}

export function formatLiveStart(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Live now";
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `Starts in ${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `Starts in ${hrs}h`;
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
