import type { FilmDataState } from "./types";
import { seedMessagePeers } from "./messagePeers";
import { createInitialState } from "./seed";
import { withEngagementMigrated } from "../lib/migrateEngagement";

const KEY = "film-data-v1";

export function loadFilmData(): FilmDataState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const initial = createInitialState();
      saveFilmData(initial);
      return initial;
    }
    const parsed = JSON.parse(raw) as FilmDataState;
    if (!parsed.titles || !Array.isArray(parsed.titles)) {
      const initial = createInitialState();
      saveFilmData(initial);
      return initial;
    }
    if (!parsed.liveChatByRoom) parsed.liveChatByRoom = {};
    if (!parsed.episodes) parsed.episodes = [];
    if (!parsed.premiereEvents) parsed.premiereEvents = [];
    if (!parsed.premiereReservations) parsed.premiereReservations = [];
    if (!parsed.reviews) parsed.reviews = [];
    if (!parsed.follows) parsed.follows = [];
    if (!parsed.postLikes) parsed.postLikes = [];
    if (!parsed.contentLikes) parsed.contentLikes = [];
    if (!parsed.comments) parsed.comments = [];
    if (!parsed.bookmarks) parsed.bookmarks = [];
    if (!parsed.premiereReminders) parsed.premiereReminders = [];
    if (!parsed.reports) parsed.reports = [];
    if (!parsed.ledger) parsed.ledger = [];
    if (!parsed.titleAccessGrants) parsed.titleAccessGrants = [];
    if (!parsed.premiereShareClaims) parsed.premiereShareClaims = [];
    if (!parsed.stories) parsed.stories = [];
    // Drop clip previews that were persisted mid-upload: blob:/data: URLs only
    // live for the session that created them, so they're dead after a reload.
    parsed.stories = parsed.stories.filter(
      (s) => s?.mediaUrl && !/^(blob:|data:)/i.test(s.mediaUrl),
    );
    if (!parsed.dismissedStoryIds) parsed.dismissedStoryIds = [];
    if (!parsed.messagePeers) parsed.messagePeers = seedMessagePeers();
    if (!parsed.directConversations) parsed.directConversations = [];
    if (!parsed.directMessages) parsed.directMessages = [];
    if (!parsed.userBlocks) parsed.userBlocks = [];
    if (!parsed.events) {
      const legacy = (parsed as FilmDataState & { analyticsEvents?: FilmDataState["events"] })
        .analyticsEvents;
      parsed.events = Array.isArray(legacy) ? legacy : [];
    }
    // Migrate old cinemaEvents/cinemaReservations/cinemaReminders/cinemaShareClaims keys
    const p = parsed as FilmDataState & Record<string, unknown>;
    if (!parsed.premiereEvents && Array.isArray(p["cinemaEvents"])) {
      parsed.premiereEvents = p["cinemaEvents"] as FilmDataState["premiereEvents"];
    }
    if (!parsed.premiereReservations && Array.isArray(p["cinemaReservations"])) {
      parsed.premiereReservations = p["cinemaReservations"] as FilmDataState["premiereReservations"];
    }
    if (!parsed.premiereReminders && Array.isArray(p["cinemaReminders"])) {
      parsed.premiereReminders = p["cinemaReminders"] as FilmDataState["premiereReminders"];
    }
    if (!parsed.premiereShareClaims && Array.isArray(p["cinemaShareClaims"])) {
      parsed.premiereShareClaims = p["cinemaShareClaims"] as FilmDataState["premiereShareClaims"];
    }
    if (!parsed.featureFlags) {
      parsed.featureFlags = {
        premiere: true,
        live: true,
        communities: true,
        explore: true,
        clips: true,
      };
    } else {
      // Migrate old f.cinema → f.premiere
      const ff = parsed.featureFlags as FilmDataState["featureFlags"] & { cinema?: boolean };
      if (parsed.featureFlags.premiere === undefined && ff.cinema !== undefined) {
        parsed.featureFlags.premiere = ff.cinema;
      } else if (parsed.featureFlags.premiere === undefined) {
        parsed.featureFlags.premiere = true;
      }
      if (parsed.featureFlags.clips === undefined) {
        parsed.featureFlags.clips = true;
      }
    }
    return withEngagementMigrated(parsed);
  } catch {
    const initial = createInitialState();
    saveFilmData(initial);
    return initial;
  }
}

export function saveFilmData(state: FilmDataState): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}
