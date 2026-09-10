import { getPremiereTimeline, SAMPLE_FEATURE_DURATION_SEC } from "../domain/premiereSync";
import type { PremiereEvent, FilmDataState, ScheduledLive, User } from "../domain/types";
import { profileLivePath } from "./livePaths";

/** Red carpet / pre-show — minutes before feature clock. */
export const PRE_SHOW_LEAD_MS = 15 * 60 * 1000;

/** Live reactions — minutes after feature start (during premiere). */
export const REACTIONS_AFTER_FEATURE_MS = 5 * 60 * 1000;

export function preShowLiveStartsAt(event: PremiereEvent): string {
  return new Date(new Date(event.featureStartsAt).getTime() - PRE_SHOW_LEAD_MS).toISOString();
}

export function reactionsLiveStartsAt(event: PremiereEvent): string {
  return new Date(
    new Date(event.featureStartsAt).getTime() + REACTIONS_AFTER_FEATURE_MS,
  ).toISOString();
}

/** After synced feature window (curtain). */
export function afterPartyLiveStartsAt(event: PremiereEvent): string {
  const endMs =
    new Date(event.featureStartsAt).getTime() +
    event.preRollAdSeconds * 1000 +
    SAMPLE_FEATURE_DURATION_SEC * 1000 +
    120 * 1000;
  return new Date(endMs).toISOString();
}

export function findLiveById(
  state: FilmDataState,
  liveId: string | undefined,
): ScheduledLive | undefined {
  if (!liveId) return undefined;
  return state.scheduledLives.find((l) => l.id === liveId);
}

export function findPremiereLive(
  state: FilmDataState,
  event: PremiereEvent,
  role: ScheduledLive["liveRole"],
): ScheduledLive | undefined {
  if (role === "pre_show" && event.preShowLiveId) {
    return findLiveById(state, event.preShowLiveId);
  }
  if (role === "after_party" && event.afterPartyLiveId) {
    return findLiveById(state, event.afterPartyLiveId);
  }
  return state.scheduledLives.find(
    (l) => l.premiereEventId === event.id && l.liveRole === role,
  );
}

export function profileLiveLinkForPremiere(
  username: string | undefined,
  event: PremiereEvent,
  live: ScheduledLive | undefined,
  extra?: { spoilers?: boolean },
): string | null {
  if (!username) return null;
  return profileLivePath(username, {
    liveId: live?.id,
    title: event.titleName,
    spoilers: extra?.spoilers,
  });
}

export function ownerUsernameForEvent(
  state: FilmDataState,
  event: PremiereEvent,
  owner?: Pick<User, "username" | "displayName"> | null,
): string | undefined {
  if (owner?.username?.trim()) return owner.username.trim();
  const live = state.scheduledLives.find((l) => l.ownerId === event.ownerId);
  if (live?.ownerUsername?.trim()) return live.ownerUsername.trim();
  return undefined;
}

export type PremiereStackLinks = {
  username?: string;
  preShow?: { live: ScheduledLive; href: string; at: string };
  premiere: { href: string; at: string };
  reactions?: { live: ScheduledLive; href: string; at: string };
  afterParty?: { live: ScheduledLive; href: string; at: string };
  phase: ReturnType<typeof getPremiereTimeline>["phase"];
};

export function buildPremiereStackLinks(
  state: FilmDataState,
  event: PremiereEvent,
  owner?: Pick<User, "username" | "displayName"> | null,
): PremiereStackLinks {
  const username = ownerUsernameForEvent(state, event, owner);
  const phase = getPremiereTimeline(event).phase;
  const preLive = findPremiereLive(state, event, "pre_show");
  const afterLive = findPremiereLive(state, event, "after_party");
  const reactionLive = findPremiereLive(state, event, "reactions");

  const premiere = {
    href: `/premiere/${event.id}`,
    at: event.featureStartsAt,
  };

  const out: PremiereStackLinks = { username, premiere, phase };

  if (username) {
    const preHref = profileLiveLinkForPremiere(username, event, preLive);
    if (preHref) {
      out.preShow = {
        live: preLive ?? ({} as ScheduledLive),
        href: preHref,
        at: preLive?.startsAt ?? preShowLiveStartsAt(event),
      };
    }
  }

  if (username && phase === "feature") {
    const reactHref = profileLiveLinkForPremiere(username, event, reactionLive, {
      spoilers: true,
    });
    if (reactHref) {
      out.reactions = {
        live: reactionLive ?? ({} as ScheduledLive),
        href: reactHref,
        at: reactionLive?.startsAt ?? reactionsLiveStartsAt(event),
      };
    }
  }

  if (username && (phase === "ended" || phase === "feature")) {
    const afterHref = profileLiveLinkForPremiere(username, event, afterLive);
    if (afterHref) {
      out.afterParty = {
        live: afterLive ?? ({} as ScheduledLive),
        href: afterHref,
        at: afterLive?.startsAt ?? afterPartyLiveStartsAt(event),
      };
    }
  }

  return out;
}
