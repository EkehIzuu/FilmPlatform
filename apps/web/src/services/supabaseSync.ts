import type { FilmDataState } from "../domain/types";
import { createInitialState } from "../domain/seed";
import { getSupabase } from "../lib/supabase";

const SHARED_STATE_ID = "shared";

function normalizeFilmState(raw: FilmDataState): FilmDataState {
  return {
    ...raw,
    liveChatByRoom: raw.liveChatByRoom ?? {},
    episodes: raw.episodes ?? [],
    premiereEvents: raw.premiereEvents ?? [],
    premiereReservations: raw.premiereReservations ?? [],
    reviews: raw.reviews ?? [],
    follows: raw.follows ?? [],
    postLikes: raw.postLikes ?? [],
    premiereReminders: raw.premiereReminders ?? [],
    reports: raw.reports ?? [],
    ledger: raw.ledger ?? [],
    featureFlags: raw.featureFlags ?? {
      premiere: true,
      live: true,
      communities: true,
      explore: true,
    },
  };
}

export async function loadFilmStateFromSupabase(): Promise<FilmDataState | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("film_app_state")
    .select("state")
    .eq("id", SHARED_STATE_ID)
    .maybeSingle();

  if (error) {
    console.warn("[supabase] load film_app_state failed", error.message);
    return null;
  }
  if (!data?.state) return null;
  return normalizeFilmState(data.state as FilmDataState);
}

export async function pushFilmStateToSupabase(state: FilmDataState): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase.from("film_app_state").upsert({
    id: SHARED_STATE_ID,
    state,
    updated_at: new Date().toISOString(),
  });

  if (error) console.warn("[supabase] push film_app_state failed", error.message);
}

export async function ensureFilmStateOnSupabase(): Promise<FilmDataState> {
  const existing = await loadFilmStateFromSupabase();
  if (existing) return existing;
  const initial = createInitialState("__seed_creator__");
  await pushFilmStateToSupabase(initial);
  return initial;
}
