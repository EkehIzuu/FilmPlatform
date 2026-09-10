import { useState } from "react";
import { Link } from "react-router-dom";
import { CreatorStudioTools } from "../components/CreatorStudioTools";
import { StudioOnboarding } from "../components/StudioOnboarding";
import { StudioRecentActivity } from "../components/StudioRecentActivity";
import { StudioUpNext } from "../components/StudioUpNext";
import { StudioProfilePanel } from "../components/creator/StudioTabPanels";
import { AudienceInsightsPanel } from "../components/creator/studio/AudienceInsightsPanel";
import { FilmManagerPanel } from "../components/creator/studio/FilmManagerPanel";
import { LiveControlRoomPanel } from "../components/creator/studio/LiveControlRoomPanel";
import { PremiereBuilderPanel } from "../components/creator/studio/PremiereBuilderPanel";
import { RevenueDashboardPanel } from "../components/creator/studio/RevenueDashboardPanel";
import { BecomeCreatorBanner } from "../components/BecomeCreatorBanner";
import { StudioTabs, type StudioTabId } from "../components/creator/StudioTabs";
import { useAuth } from "../context/AuthContext";
import { useFilmData } from "../context/FilmDataContext";
import {
  buildOnboardingSteps,
  buildStudioEarnings,
  buildStudioUpNext,
  countCreatorUploads,
  countCreatorViews,
  countFollowers,
  onboardingComplete,
  recentCreatorActivity,
} from "../lib/studioInsights";
import { activeStories } from "../lib/stories";

export function CreatorDashboard() {
  const { user } = useAuth();
  const { state, listMyTitles, listActiveStories, getFeatureFlags } = useFilmData();
  const [tab, setTab] = useState<StudioTabId>("overview");
  const f = getFeatureFlags();

  const titles = listMyTitles();
  const published = titles.filter((t) => t.status === "published").length;
  const drafts = titles.filter((t) => t.status === "draft").length;
  const clips =
    user && f.clips
      ? activeStories(listActiveStories()).filter((s) => s.authorId === user.id).length
      : 0;

  const earnings = user?.isCreator ? buildStudioEarnings(state, user.id) : null;
  const followers = user ? countFollowers(state, user.id) : 0;
  const views = user ? countCreatorViews(state, user.id) : 0;
  const videoCount = user ? countCreatorUploads(state, user.id) : 0;
  const profilePath = user?.username?.trim()
    ? `/u/${user.username.trim()}`
    : "/profile";

  const upNext = user
    ? buildStudioUpNext(state, user.id, { live: f.live, premiere: f.premiere })
    : [];
  const onboarding = user
    ? buildOnboardingSteps(state, user.id, { clips: f.clips, live: f.live })
    : [];
  const showOnboarding = !onboardingComplete(onboarding);
  const recent = user ? recentCreatorActivity(state, user.id, 5) : [];

  const isCreator = user?.isCreator === true;

  return (
    <div className="page page--full studio-page">
      {!isCreator ? <BecomeCreatorBanner /> : null}

      <header className="studio-header">
        <div className="studio-header-row">
          <div>
            <h1 className="studio-title">Creator studio</h1>
            {user?.displayName ? (
              <p className="small muted studio-greeting">
                Hi, {user.displayName} — schedule premieres, then promote with clips &amp; live
              </p>
            ) : (
              <p className="small muted studio-greeting">Schedule premieres · sell tickets · grow fans</p>
            )}
          </div>
        </div>
      </header>

      <div className="studio-hero-stats" role="list">
        <button
          type="button"
          className="studio-hero-stat"
          role="listitem"
          onClick={() => setTab("films")}
        >
          <span className="studio-hero-stat-value">{videoCount}</span>
          <span className="studio-hero-stat-label">Videos</span>
        </button>
        <button
          type="button"
          className="studio-hero-stat"
          role="listitem"
          onClick={() => setTab("profile")}
        >
          <span className="studio-hero-stat-value">{followers}</span>
          <span className="studio-hero-stat-label">Followers</span>
        </button>
        <button
          type="button"
          className="studio-hero-stat"
          role="listitem"
          onClick={() => setTab("audience")}
        >
          <span className="studio-hero-stat-value">{views}</span>
          <span className="studio-hero-stat-label">Views</span>
        </button>
        {earnings ? (
          <button
            type="button"
            className="studio-hero-stat studio-hero-stat--earnings"
            role="listitem"
            onClick={() => setTab("revenue")}
          >
            <span className="studio-hero-stat-value studio-hero-stat-value--sm">
              {earnings.ticketCount > 0
                ? `${(earnings.totalCents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} ${earnings.currency}`
                : "—"}
            </span>
            <span className="studio-hero-stat-label">Earnings</span>
          </button>
        ) : (
          <div className="studio-hero-stat" role="listitem">
            <span className="studio-hero-stat-value">—</span>
            <span className="studio-hero-stat-label">Earnings</span>
          </div>
        )}
      </div>

      {earnings && tab === "overview" ? (
        <button type="button" className="studio-earnings" onClick={() => setTab("revenue")}>
          <span className="studio-earnings-label">Earnings</span>
          <span className="studio-earnings-value">{earnings.label}</span>
          <span className="studio-earnings-cta small">Revenue dashboard →</span>
        </button>
      ) : null}

      <div className="studio-stats" role="list">
        <Link to="/creator/titles" className="studio-stat" role="listitem">
          <span className="studio-stat-value">{published}</span>
          <span className="studio-stat-label">Published</span>
        </Link>
        <Link to="/creator/titles" className="studio-stat" role="listitem">
          <span className="studio-stat-value">{drafts}</span>
          <span className="studio-stat-label">Drafts</span>
        </Link>
        {f.clips ? (
          <Link to="/clips" className="studio-stat" role="listitem">
            <span className="studio-stat-value">{clips}</span>
            <span className="studio-stat-label">Clips</span>
          </Link>
        ) : null}
        <Link to={profilePath} className="studio-stat" role="listitem">
          <span className="studio-stat-value">{followers}</span>
          <span className="studio-stat-label">Followers</span>
        </Link>
      </div>

      <StudioTabs active={tab} onChange={setTab}>
        {tab === "overview" ? (
          <>
            {showOnboarding ? <StudioOnboarding steps={onboarding} /> : null}
            <StudioUpNext items={upNext} />
            <CreatorStudioTools profilePath={profilePath} followerCount={followers} />
            <StudioRecentActivity items={recent} />
          </>
        ) : null}
        {tab === "films" ? <FilmManagerPanel /> : null}
        {tab === "premieres" ? <PremiereBuilderPanel /> : null}
        {tab === "revenue" ? <RevenueDashboardPanel /> : null}
        {tab === "audience" ? <AudienceInsightsPanel /> : null}
        {tab === "live" ? <LiveControlRoomPanel /> : null}
        {tab === "profile" ? <StudioProfilePanel profilePath={profilePath} /> : null}
      </StudioTabs>
    </div>
  );
}
