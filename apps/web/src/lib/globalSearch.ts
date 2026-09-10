import type { FeatureFlags, FilmDataState, MessagePeer } from "../domain/types";
import { collectSearchablePeers } from "../domain/messagePeers";
import { peerMatchesQuery } from "./directMessages";
import { livePathForScheduled } from "./livePaths";
import { activeStories } from "./stories";

export type SearchResultKind =
  | "user"
  | "title"
  | "clip"
  | "community"
  | "premiere"
  | "live";

export type SearchResult = {
  id: string;
  kind: SearchResultKind;
  title: string;
  subtitle?: string;
  href: string;
  avatarUrl?: string;
  displayName?: string;
};

export type SearchSection = {
  label: string;
  results: SearchResult[];
};

const KIND_LABEL: Record<SearchResultKind, string> = {
  user: "People",
  title: "Titles & shows",
  clip: "Clips",
  community: "Communities",
  premiere: "Premieres",
  live: "Live",
};

export function sectionLabel(kind: SearchResultKind): string {
  return KIND_LABEL[kind];
}

function matches(q: string, ...parts: (string | undefined)[]): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return false;
  return parts.some((p) => p && p.toLowerCase().includes(s));
}

export function runGlobalSearch(
  state: FilmDataState,
  query: string,
  excludeUserId: string,
  flags: FeatureFlags,
  extraPeers: MessagePeer[] = [],
): SearchSection[] {
  const q = query.trim();
  if (q.length < 1) return [];

  const users: SearchResult[] = [];
  const seenUsers = new Set<string>();
  const peerById = new Map<string, MessagePeer>();

  for (const p of collectSearchablePeers(state, excludeUserId)) {
    peerById.set(p.id, p);
  }
  for (const p of extraPeers) {
    if (p.id !== excludeUserId) peerById.set(p.id, p);
  }

  for (const p of peerById.values()) {
    if (!peerMatchesQuery(p, q) || seenUsers.has(p.id)) continue;
    seenUsers.add(p.id);
    const href = p.username?.trim()
      ? `/u/${p.username.trim()}`
      : `/inbox?tab=messages`;
    users.push({
      id: `user-${p.id}`,
      kind: "user",
      title: p.displayName,
      subtitle: p.username ? `@${p.username}` : "Profile",
      href,
      avatarUrl: p.avatarUrl,
      displayName: p.displayName,
    });
  }

  const titles: SearchResult[] = [];
  if (flags.explore !== false) {
    for (const t of state.titles) {
      if (t.status !== "published") continue;
      if (!matches(q, t.name, t.description, t.slug, t.genre, t.region)) continue;
      titles.push({
        id: `title-${t.id}`,
        kind: "title",
        title: t.name,
        subtitle: [t.kind === "series" ? "Series" : "Movie", t.genre].filter(Boolean).join(" · "),
        href: `/title/${t.slug}`,
      });
    }
  }

  const clips: SearchResult[] = [];
  if (flags.clips !== false) {
    for (const s of activeStories(state.stories ?? [])) {
      if (!matches(q, s.caption, s.authorName)) continue;
      clips.push({
        id: `clip-${s.id}`,
        kind: "clip",
        title: s.caption?.trim() || `Clip by ${s.authorName}`,
        subtitle: s.authorName,
        href: `/clips?user=${encodeURIComponent(s.authorId)}`,
        avatarUrl: s.authorAvatarUrl,
        displayName: s.authorName,
      });
    }
  }

  const communities: SearchResult[] = [];
  if (flags.communities !== false) {
    const seenSlug = new Set<string>();
    for (const t of state.titles) {
      if (t.status !== "published" || seenSlug.has(t.slug)) continue;
      if (!matches(q, t.name, t.slug, t.description)) continue;
      seenSlug.add(t.slug);
      communities.push({
        id: `community-${t.slug}`,
        kind: "community",
        title: t.name,
        subtitle: "Community hub",
        href: `/communities/${t.slug}`,
      });
    }
  }

  const premieres: SearchResult[] = [];
  if (flags.premiere !== false) {
    for (const e of state.premiereEvents ?? []) {
      if (!matches(q, e.titleName, e.description)) continue;
      premieres.push({
        id: `premiere-${e.id}`,
        kind: "premiere",
        title: e.titleName,
        subtitle: "Premiere",
        href: `/premiere/${e.id}`,
      });
    }
  }

  const lives: SearchResult[] = [];
  if (flags.live !== false) {
    for (const l of state.scheduledLives ?? []) {
      if (!matches(q, l.title, l.description, l.roomId)) continue;
      lives.push({
        id: `live-${l.id}`,
        kind: "live",
        title: l.title,
        subtitle: l.ownerUsername ? `@${l.ownerUsername}` : "Scheduled live",
        href: livePathForScheduled(l),
      });
    }
  }

  const sections: SearchSection[] = [];
  if (users.length) sections.push({ label: sectionLabel("user"), results: users.slice(0, 8) });
  if (titles.length) sections.push({ label: sectionLabel("title"), results: titles.slice(0, 8) });
  if (clips.length) sections.push({ label: sectionLabel("clip"), results: clips.slice(0, 6) });
  if (communities.length) {
    sections.push({ label: sectionLabel("community"), results: communities.slice(0, 6) });
  }
  if (premieres.length) sections.push({ label: sectionLabel("premiere"), results: premieres.slice(0, 6) });
  if (lives.length) sections.push({ label: sectionLabel("live"), results: lives.slice(0, 6) });

  return sections;
}
