import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { RegionSelector } from "../components/RegionSelector";
import { StoryTray } from "../components/StoryTray";
import { useAuth } from "../context/AuthContext";
import { useFilmData } from "../context/FilmDataContext";
import { useRegionFilter } from "../hooks/useRegionFilter";
import { filterTitlesByRegion } from "../lib/premiereEngagement";

export function Explore() {
  const { user } = useAuth();
  const { state, listActiveStories, trackEvent } = useFilmData();
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState("");

  const { region } = useRegionFilter();

  const titles = useMemo(() => {
    let list = filterTitlesByRegion(
      state.titles.filter((t) => t.status === "published"),
      region,
    );
    const s = q.trim().toLowerCase();
    if (s) {
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(s) ||
          t.description.toLowerCase().includes(s) ||
          t.slug.includes(s),
      );
    }
    if (genre) {
      list = list.filter((t) => (t.genre || "").toLowerCase() === genre.toLowerCase());
    }
    return list;
  }, [state.titles, q, genre, region]);

  const genres = useMemo(() => {
    const g = new Set<string>();
    state.titles
      .filter((t) => t.status === "published")
      .forEach((t) => {
        if (t.genre) g.add(t.genre);
      });
    return [...g].sort();
  }, [state.titles]);

  return (
    <div className="page page--full explore-page">
      <PageHeader
        title="Discover"
        subtitle="Watch anytime on creator profiles — opening nights are on Premieres (home)."
      />
      {listActiveStories().length > 0 ? (
        <StoryTray stories={listActiveStories()} currentUserId={user?.id} />
      ) : null}
      <div className="explore-toolbar">
        <RegionSelector />
        <div className="filters-row">
          <label className="filter-field">
            Search
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, description…"
              type="search"
            />
          </label>
          <label className="filter-field">
            Genre
            <select value={genre} onChange={(e) => setGenre(e.target.value)}>
              <option value="">All</option>
              {genres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {titles.length === 0 ? (
        <div className="empty-state">
          <p>No titles match — create one in Creator mode or clear filters.</p>
        </div>
      ) : (
        <div className="explore-grid">
          {titles.map((t) => (
            <Link
              key={t.id}
              to={`/title/${t.slug}`}
              className="explore-card"
              onClick={() => trackEvent("explore_open_title", { slug: t.slug })}
            >
              <div className="explore-card-top">
                <span className="pill">{t.kind === "series" ? "Series" : "Movie"}</span>
                {t.genre ? <span className="pill">{t.genre}</span> : null}
              </div>
              <h2>{t.name}</h2>
              <p>{t.description.slice(0, 140)}{t.description.length > 140 ? "…" : ""}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
