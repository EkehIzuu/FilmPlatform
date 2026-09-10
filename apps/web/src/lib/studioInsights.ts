import type {
  PremiereEvent,
  FilmDataState,
  ScheduledLive,
  UploadAsset,
} from "../domain/types";
import { livePathForScheduled } from "./livePaths";
import { buildUserFeed } from "./userFeed";

export type StudioUpNextItem = {
  id: string;
  kind: "live" | "premiere" | "draft" | "upload";
  title: string;
  subtitle: string;
  href: string;
  when?: string;
  urgent?: boolean;
};

export type StudioEarnings = {
  totalCents: number;
  currency: string;
  ticketCount: number;
  label: string;
};

export type OnboardingStep = {
  id: string;
  label: string;
  done: boolean;
  href: string;
};

export function buildStudioUpNext(
  state: FilmDataState,
  userId: string,
  opts: { live: boolean; premiere: boolean },
): StudioUpNextItem[] {
  const items: StudioUpNextItem[] = [];
  const now = Date.now();

  if (opts.live) {
    const lives = state.scheduledLives
      .filter((l) => l.ownerId === userId && new Date(l.startsAt).getTime() >= now - 3600000)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .slice(0, 2);
    for (const l of lives) {
      items.push(liveToUpNext(l));
    }
  }

  if (opts.premiere) {
    const events = state.premiereEvents
      .filter((e) => e.ownerId === userId && new Date(e.featureStartsAt).getTime() >= now - 86400000)
      .sort((a, b) => a.featureStartsAt.localeCompare(b.featureStartsAt))
      .slice(0, 2);
    for (const e of events) {
      items.push(premiereToUpNext(e, state, userId));
    }
  }

  const drafts = state.titles.filter((t) => t.ownerId === userId && t.status === "draft");
  if (drafts.length > 0) {
    items.push({
      id: "drafts",
      kind: "draft",
      title: `${drafts.length} draft title${drafts.length > 1 ? "s" : ""}`,
      subtitle: "Publish when ready for fans",
      href: "/creator/titles",
    });
  }

  const ownedTitleIds = new Set(
    state.titles.filter((t) => t.ownerId === userId).map((t) => t.id),
  );
  const stuck = state.uploads.filter(
    (u) =>
      ownedTitleIds.has(u.titleId) &&
      (u.status === "uploading" || u.status === "processing" || u.status === "failed"),
  );
  if (stuck.length > 0) {
    const u = stuck[0];
    items.push(uploadToUpNext(u));
  }

  return items.slice(0, 4);
}

function liveToUpNext(l: ScheduledLive): StudioUpNextItem {
  const d = new Date(l.startsAt);
  const soon = d.getTime() - Date.now() < 86400000;
  return {
    id: `live-${l.id}`,
    kind: "live",
    title: l.title,
    subtitle: l.ownerUsername ? `Live · @${l.ownerUsername}` : "Scheduled live",
    href: livePathForScheduled(l),
    when: formatWhen(l.startsAt),
    urgent: soon,
  };
}

function premiereToUpNext(
  e: PremiereEvent,
  state: FilmDataState,
  _userId: string,
): StudioUpNextItem {
  const sold = state.premiereReservations.filter((r) => r.eventId === e.id).length;
  const d = new Date(e.featureStartsAt);
  const soon = d.getTime() - Date.now() < 172800000;
  return {
    id: `premiere-${e.id}`,
    kind: "premiere",
    title: e.titleName,
    subtitle: `${sold}/${e.capacity} seats · ${(e.priceCents / 100).toFixed(0)} ${e.currency}`,
    href: `/creator/premiere`,
    when: formatWhen(e.featureStartsAt),
    urgent: soon,
  };
}

function uploadToUpNext(u: UploadAsset): StudioUpNextItem {
  return {
    id: `upload-${u.id}`,
    kind: "upload",
    title: u.fileName,
    subtitle: `Upload · ${u.status}`,
    href: "/creator/upload",
    urgent: u.status === "failed",
  };
}

export function buildStudioEarnings(
  state: FilmDataState,
  creatorId: string,
): StudioEarnings {
  const rows = state.ledger.filter((l) => l.creatorId === creatorId);
  const ticketCount = rows.filter((l) => l.source === "premiere_reservation").length;
  const totalCents = rows.reduce((s, r) => s + r.amountCents, 0);
  const currency = rows[0]?.currency ?? "USD";
  const display = totalCents / 100;
  const label =
    ticketCount === 0
      ? "No ticket sales yet"
      : `${display.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${currency} · ${ticketCount} ticket${ticketCount > 1 ? "s" : ""}`;

  return { totalCents, currency, ticketCount, label };
}

export function countFollowers(state: FilmDataState, userId: string): number {
  return state.follows.filter((f) => f.targetType === "user" && f.targetId === userId).length;
}

/** Title page views from analytics (creator-owned titles). */
export function countCreatorViews(state: FilmDataState, userId: string): number {
  const ownedIds = new Set(
    state.titles.filter((t) => t.ownerId === userId).map((t) => t.id),
  );
  const ownedSlugs = new Set(
    state.titles.filter((t) => t.ownerId === userId).map((t) => t.slug),
  );
  return (state.events ?? []).filter((e) => {
    if (e.type !== "title_view") return false;
    const id = e.meta?.titleId;
    const slug = e.meta?.slug;
    if (typeof id === "string" && ownedIds.has(id)) return true;
    if (typeof slug === "string" && ownedSlugs.has(slug)) return true;
    return false;
  }).length;
}

export function countCreatorUploads(state: FilmDataState, userId: string): number {
  const ownedIds = new Set(
    state.titles.filter((t) => t.ownerId === userId).map((t) => t.id),
  );
  return state.uploads.filter((u) => ownedIds.has(u.titleId)).length;
}

export function buildOnboardingSteps(
  state: FilmDataState,
  userId: string,
  flags: { clips: boolean; live: boolean; premiere?: boolean },
): OnboardingStep[] {
  const hasPublished = state.titles.some(
    (t) => t.ownerId === userId && t.status === "published",
  );
  const ownedIds = new Set(state.titles.filter((t) => t.ownerId === userId).map((t) => t.id));
  const hasUpload = state.uploads.some(
    (u) => ownedIds.has(u.titleId) && u.status === "ready",
  );
  const hasLive =
    flags.live &&
    state.scheduledLives.some((l) => l.ownerId === userId);
  const hasClip =
    flags.clips &&
    (state.stories ?? []).some((s) => s.authorId === userId);
  const hasPremiere =
    flags.premiere &&
    state.premiereEvents.some((e) => e.ownerId === userId);

  const steps: OnboardingStep[] = [
    {
      id: "title",
      label: "Publish a film",
      done: hasPublished,
      href: "/creator/titles#create-title",
    },
    {
      id: "upload",
      label: "Upload trailer",
      done: hasUpload,
      href: "/creator/upload",
    },
  ];
  if (flags.premiere) {
    steps.push({
      id: "premiere",
      label: "Schedule a premiere",
      done: hasPremiere,
      href: "/creator/premiere",
    });
  }
  if (flags.live) {
    steps.push({
      id: "live",
      label: "Schedule premiere-night live",
      done: hasLive,
      href: "/creator/lives",
    });
  }
  if (flags.clips) {
    steps.push({
      id: "clip",
      label: "Post a promo clip",
      done: hasClip,
      href: "/clips/new",
    });
  }
  return steps;
}

export function onboardingComplete(steps: OnboardingStep[]): boolean {
  return steps.every((s) => s.done);
}

export function recentCreatorActivity(state: FilmDataState, userId: string, limit = 5) {
  return buildUserFeed(state, userId).slice(0, limit);
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  if (diff < 0) return "Started";
  if (diff < 3600000) return `in ${Math.max(1, Math.round(diff / 60000))}m`;
  if (diff < 86400000) return `today ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
