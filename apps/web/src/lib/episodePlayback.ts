import type { Episode, FilmDataState, Title, UploadAsset } from "../domain/types";

/** Resolve playable media for an episode (explicit link or ordered episode uploads). */
export function findEpisodeUpload(
  state: FilmDataState,
  titleId: string,
  episodeId: string,
): UploadAsset | undefined {
  const linked = state.uploads.find(
    (u) =>
      u.titleId === titleId &&
      u.episodeId === episodeId &&
      u.status === "ready" &&
      (u.publicUrl || u.storagePath),
  );
  if (linked) return linked;

  const episodes = state.episodes
    .filter((e) => e.titleId === titleId)
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  const idx = episodes.findIndex((e) => e.id === episodeId);
  if (idx < 0) return undefined;

  const episodeUploads = state.uploads
    .filter(
      (u) =>
        u.titleId === titleId &&
        u.kind === "episode" &&
        u.status === "ready" &&
        (u.publicUrl || u.storagePath),
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return episodeUploads[idx] ?? episodeUploads[0];
}

/** Trailer or first ready video on a movie/single title. */
export function findTitlePlaybackUpload(
  state: FilmDataState,
  title: Title,
): UploadAsset | undefined {
  const kinds: UploadAsset["kind"][] = ["trailer", "episode", "announcement", "bts"];
  for (const kind of kinds) {
    const hit = state.uploads.find(
      (u) =>
        u.titleId === title.id &&
        u.kind === kind &&
        u.status === "ready" &&
        (u.publicUrl || u.storagePath),
    );
    if (hit) return hit;
  }
  return undefined;
}

export function getEpisode(
  state: FilmDataState,
  titleId: string,
  episodeId: string,
): Episode | undefined {
  return state.episodes.find((e) => e.id === episodeId && e.titleId === titleId);
}
