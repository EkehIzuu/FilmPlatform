import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FollowButton } from "../components/FollowButton";
import { FeaturedTrailersSection } from "../components/FeaturedTrailersSection";
import { FilmJourneyBar } from "../components/FilmJourneyBar";
import { MyTicketsStrip } from "../components/MyTicketsStrip";
import { PremiereHeroSection } from "../components/PremiereHeroSection";
import { PremiereStrip } from "../components/PremiereStrip";
import { RegionSelector } from "../components/RegionSelector";
import { TrailerClipsSection } from "../components/TrailerClipsSection";
import { TrendingPremieresSection } from "../components/TrendingPremieresSection";
import { ProfileFeed } from "../components/ProfileFeed";
import { PromoteToolsSection } from "../components/PromoteToolsSection";
import { StoryTray } from "../components/StoryTray";
import { WatchAnytimeSection } from "../components/WatchAnytimeSection";
import { useAuth } from "../context/AuthContext";
import { useFilmData } from "../context/FilmDataContext";
import { buildFollowingFeed, type UserFeedFilter } from "../lib/homeFeed";
import { getStoredReferral } from "../lib/referral";

export function Home() {
  const { user } = useAuth();
  const {
    listActiveStories,
    trackEvent,
    followedTitleIds,
    state,
    toggleFollow,
    isFollowing,
  } = useFilmData();
  const [feedFilter, setFeedFilter] = useState<UserFeedFilter>("all");
  const [feedOpen, setFeedOpen] = useState(false);
  const refCode = getStoredReferral();
  const followSet = new Set(followedTitleIds());
  const followedTitles = state.titles.filter(
    (t) => followSet.has(t.id) && t.status === "published",
  );

  const followingFeed = useMemo(
    () => (user ? buildFollowingFeed(state, user.id) : []),
    [state, user],
  );

  const suggestedCreators = useMemo(() => {
    if (!user) return [];
    const followed = new Set(
      state.follows
        .filter((f) => f.followerId === user.id && f.targetType === "user")
        .map((f) => f.targetId),
    );
    return state.titles
      .filter((t) => t.status === "published" && t.ownerId !== user.id && !followed.has(t.ownerId))
      .slice(0, 4)
      .map((t) => ({ ownerId: t.ownerId, titleName: t.name, slug: t.slug }));
  }, [state.titles, state.follows, user]);

  return (
    <div className="page page--full home-premiere-page">
      <header className="home-premiere-tagline">
        <p className="home-premiere-brand">Izora</p>
        <p className="small muted">
          Your next screening starts here: trailer → ticket → showtime → watch on profile.
        </p>
      </header>

      <div className="home-controls-row">
        <FilmJourneyBar activeStep="discover" compact />
        <RegionSelector />
      </div>

      {refCode ? (
        <p className="hint-banner small">
          Referral: <code>{refCode}</code>
        </p>
      ) : null}

      <div className="home-hero-row">
        <PremiereHeroSection />
        <section className="card home-premiere-next-step">
          <p className="premiere-hero-eyebrow">Start in 1 tap</p>
          <h2 className="section-label" style={{ marginTop: 0 }}>Premiere first</h2>
          <p className="small muted">
            Already bought a seat? Open My tickets for countdown and entry. New here? Browse scheduled screenings.
          </p>
          <p className="home-premiere-next-step-actions">
          <Link to="/my-tickets" className="auth-submit">
            Open My tickets
          </Link>
          <Link to="/watch/premiere" className="btn-secondary">
              Browse premieres
            </Link>
          </p>
        </section>
      </div>
      <MyTicketsStrip />
      <PremiereStrip />
      <TrendingPremieresSection />
      <FeaturedTrailersSection />
      <TrailerClipsSection />
      <WatchAnytimeSection />
      <PromoteToolsSection />

      {listActiveStories().length > 0 ? (
        <section className="home-stories-section">
          <h2 className="section-label">Stories &amp; sneak peeks</h2>
          <StoryTray stories={listActiveStories()} currentUserId={user?.id} />
        </section>
      ) : null}

      {user && followedTitles.length > 0 ? (
        <section>
          <h2 className="section-label">Creators you follow</h2>
          <div className="card-grid card-grid--compact">
            {followedTitles.map((t) => (
              <Link key={t.id} to={`/title/${t.slug}`} className="card card-link">
                <h2>{t.name}</h2>
                <p className="small muted">Title page &amp; next premiere</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {user ? (
        <section className="home-feed-section home-feed-section--collapsed">
          <button
            type="button"
            className="home-feed-toggle"
            onClick={() => setFeedOpen((v) => !v)}
            aria-expanded={feedOpen}
          >
            <h2 className="section-label">Fan feed (optional)</h2>
            <span className="small muted">{feedOpen ? "Hide" : "Show"}</span>
          </button>
          {feedOpen ? (
            <>
              <div className="profile-feed-tabs" role="tablist">
                {(["all", "story", "post", "live", "premiere"] as UserFeedFilter[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={feedFilter === f ? "profile-feed-tab active" : "profile-feed-tab"}
                    onClick={() => setFeedFilter(f)}
                  >
                    {f === "all" ? "All" : f === "premiere" ? "Premieres" : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
              <ProfileFeed
                items={followingFeed}
                filter={feedFilter}
                emptyHint="Follow creators to see premiere updates and posts."
              />
              {suggestedCreators.length > 0 && followingFeed.length < 3 ? (
                <div className="home-suggest">
                  <p className="small muted">Suggested creators</p>
                  <ul className="home-suggest-list">
                    {suggestedCreators.map((s) => (
                      <li key={s.ownerId}>
                        <Link to={`/title/${s.slug}`} className="text-link">
                          {s.titleName}
                        </Link>
                        <FollowButton
                          size="sm"
                          following={isFollowing("user", s.ownerId)}
                          onClick={() => toggleFollow("user", s.ownerId)}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      ) : null}

      <p className="small muted home-foot-links">
        <Link to="/saved" className="text-link" onClick={() => trackEvent("nav_click", { to: "/saved" })}>
          Saved
        </Link>
        {" · "}
        <Link to="/my-tickets" className="text-link">
          My tickets
        </Link>
        {" · "}
        <Link to="/premiere/join" className="text-link">
          Redeem code
        </Link>
        {" · "}
        <Link to="/settings" className="text-link">
          Settings
        </Link>
      </p>
    </div>
  );
}
