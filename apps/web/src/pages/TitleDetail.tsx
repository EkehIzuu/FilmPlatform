import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BackLink } from "../components/BackLink";
import { CommentThread } from "../components/CommentThread";
import { EngagementBar } from "../components/EngagementBar";
import { FollowButton } from "../components/FollowButton";
import { PageHeader } from "../components/PageHeader";
import { PostSubmitButton } from "../components/PostSubmitButton";
import { PremiereStackBar } from "../components/PremiereStackBar";
import { TitlePremierePanel } from "../components/TitlePremierePanel";
import { UserAvatar } from "../components/UserAvatar";
import { useAuth } from "../context/AuthContext";
import { useFilmData } from "../context/FilmDataContext";
import { canViewTitle } from "../lib/ageGate";
import { getActivePremiereForTitle } from "../lib/filmJourney";
import { profileLivePath } from "../lib/livePaths";
import { getStoredReferral } from "../lib/referral";
import { fetchProfile } from "../services/supabaseProfile";
import type { User } from "../domain/types";

export function TitleDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const {
    getTitleBySlug,
    listEpisodes,
    trackEvent,
    toggleFollow,
    isFollowing,
    addReview,
    listReviewsForTitle,
    titleRatingSummary,
    addReport,
    listPosts,
    addPost,
    state,
  } = useFilmData();
  const title = slug ? getTitleBySlug(slug) : undefined;
  const episodes = title ? listEpisodes(title.id) : [];
  const reviews = title ? listReviewsForTitle(title.id) : [];
  const posts = title ? listPosts(title.slug) : [];
  const { avg, count } = title ? titleRatingSummary(title.id) : { avg: 0, count: 0 };

  const [rating, setRating] = useState(5);
  const [reviewBody, setReviewBody] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [owner, setOwner] = useState<User | null>(null);
  const [socialOpen, setSocialOpen] = useState(false);
  const [postBody, setPostBody] = useState("");
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const [postReportReason, setPostReportReason] = useState("");

  useEffect(() => {
    if (!title) {
      setOwner(null);
      return;
    }
    void fetchProfile(title.ownerId).then(setOwner);
  }, [title?.ownerId]);

  useEffect(() => {
    if (title) {
      trackEvent("title_view", {
        slug: title.slug,
        titleId: title.id,
        ref: getStoredReferral() ?? undefined,
      });
    }
  }, [title, trackEvent]);

  if (!slug || !title) {
    return (
      <div className="page">
        <PageHeader title="Not found" subtitle="This film isn't in the catalog yet." />
        <BackLink to="/" className="back-link--flush">
          Premieres
        </BackLink>
      </div>
    );
  }

  const allowed = canViewTitle(user, title);
  const premiere = getActivePremiereForTitle(state, title.id);
  const event = premiere?.event;

  const onReview = (e: FormEvent) => {
    e.preventDefault();
    if (!user || !reviewBody.trim()) return;
    addReview(title.id, rating, reviewBody);
    setReviewBody("");
  };

  const onPost = (e: FormEvent) => {
    e.preventDefault();
    if (!title || !postBody.trim()) return;
    addPost(title.slug, postBody);
    setPostBody("");
  };

  const onReportPost = (e: FormEvent, postId: string) => {
    e.preventDefault();
    if (!postReportReason.trim()) return;
    addReport("post", postId, postReportReason);
    setPostReportReason("");
    setReportPostId(null);
  };

  const onReport = (e: FormEvent) => {
    e.preventDefault();
    if (!reportReason.trim()) return;
    addReport("title", title.id, reportReason);
    setReportReason("");
    setReportOpen(false);
  };

  return (
    <div className="page page--full page--film-detail">
      <BackLink to="/" className="back-link--flush">
        ← Premieres
      </BackLink>

      <header className="film-detail-header">
        <h1 className="film-detail-title">{title.name}</h1>
        <p className="film-detail-synopsis">{title.description}</p>
        <p className="meta-row small">
          <span className="pill">{title.kind === "series" ? "Series" : "Movie"}</span>
          {title.genre ? <span className="pill">{title.genre}</span> : null}
          {title.region ? <span className="pill">{title.region}</span> : null}
          {title.listingBoost === "featured" ? (
            <span className="pill pill-accent">Featured</span>
          ) : null}
          {title.minAge ? <span className="pill">Min age {title.minAge}+</span> : null}
        </p>
      </header>

      <TitlePremierePanel title={title} owner={owner} allowed={allowed} />

      {event && premiere && premiere.phase !== "ended" ? (
        <section className="card" style={{ marginTop: "1rem" }}>
          <PremiereStackBar event={event} owner={owner} />
        </section>
      ) : null}

      {user ? (
        <div className="title-actions-row">
          <FollowButton
            following={isFollowing("title", title.id)}
            onClick={() => toggleFollow("title", title.id)}
            followLabel="Follow film"
            followingLabel="Following"
          />
          <FollowButton
            following={isFollowing("user", title.ownerId)}
            onClick={() => toggleFollow("user", title.ownerId)}
            followLabel="Follow creator"
            followingLabel="Following"
          />
          <button type="button" className="btn-secondary" onClick={() => setReportOpen((v) => !v)}>
            Report
          </button>
        </div>
      ) : null}

      {title.kind === "series" && episodes.length > 0 && allowed ? (
        <section className="film-episodes-section">
          <h2 className="section-label">Episodes</h2>
          <ul className="episode-list">
            {episodes.map((ep) => (
              <li key={ep.id} className="episode-list-item">
                <div>
                  <strong>{ep.label}</strong> — {ep.name}
                </div>
                <Link
                  to={`/title/${title.slug}/episode/${ep.id}`}
                  className="btn-secondary episode-play-btn"
                >
                  Play
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="film-social-section">
        <button
          type="button"
          className="home-feed-toggle"
          onClick={() => setSocialOpen((v) => !v)}
          aria-expanded={socialOpen}
        >
          <h2 className="section-label">Community &amp; reviews</h2>
          <span className="small muted">{socialOpen ? "Hide" : "Show"}</span>
        </button>
        {socialOpen && allowed ? (
          <>
            <EngagementBar targetType="title" targetId={title.id} showBookmark bookmarkType="title" />
            <div className="film-detail-extras">
              {owner?.username ? (
                <Link
                  to={profileLivePath(owner.username, { title: title.name })}
                  className="text-link small"
                >
                  Creator live (premiere night)
                </Link>
              ) : null}
            </div>

            <section style={{ marginTop: "1rem" }}>
              <h3 className="section-label">Community</h3>
              {user ? (
                <form className="stack-form" onSubmit={onPost}>
                  <label>
                    New post
                    <textarea
                      value={postBody}
                      onChange={(e) => setPostBody(e.target.value)}
                      rows={3}
                      placeholder="Theories, reactions, episode talk…"
                      maxLength={2000}
                    />
                  </label>
                  <PostSubmitButton disabled={!postBody.trim()} />
                </form>
              ) : (
                <p className="muted small">
                  <Link to="/login">Sign in</Link> to post.
                </p>
              )}
              <ul className="post-list">
                {posts.length === 0 ? (
                  <li className="empty-inline muted">No posts yet — start the thread.</li>
                ) : (
                  [...posts].reverse().map((p) => (
                    <li key={p.id} className="post-card">
                      <div className="post-meta small post-meta--with-avatar">
                        <UserAvatar
                          displayName={p.authorName}
                          avatarUrl={p.authorAvatarUrl}
                          size="sm"
                        />
                        <strong>{p.authorName}</strong>
                        <span className="muted">
                          {new Date(p.createdAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                      <p className="post-body">{p.body}</p>
                      <EngagementBar targetType="post" targetId={p.id} />
                      <CommentThread targetType="post" targetId={p.id} />
                      <div className="post-actions">
                        {user ? (
                          <button
                            type="button"
                            className="text-btn"
                            onClick={() => setReportPostId((id) => (id === p.id ? null : p.id))}
                          >
                            Report
                          </button>
                        ) : null}
                      </div>
                      {reportPostId === p.id && user ? (
                        <form className="inline-report" onSubmit={(e) => onReportPost(e, p.id)}>
                          <input
                            value={postReportReason}
                            onChange={(e) => setPostReportReason(e.target.value)}
                            placeholder="Reason"
                            required
                          />
                          <button type="submit">Send</button>
                        </form>
                      ) : null}
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section style={{ marginTop: "1rem" }}>
              <h3 className="section-label">
                Ratings {count > 0 ? `· ${avg.toFixed(1)} / 5 (${count})` : ""}
              </h3>
              {user ? (
                <form className="stack-form review-form" onSubmit={onReview}>
                  <label>
                    Your rating
                    <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>
                          {n} stars
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Short review
                    <textarea
                      value={reviewBody}
                      onChange={(e) => setReviewBody(e.target.value)}
                      rows={2}
                      maxLength={800}
                      placeholder="No spoilers…"
                    />
                  </label>
                  <button type="submit" disabled={!reviewBody.trim()}>
                    Post review
                  </button>
                </form>
              ) : null}
              <ul className="review-list">
                {reviews.length === 0 ? (
                  <li className="muted small">No reviews yet.</li>
                ) : (
                  reviews.map((r) => (
                    <li key={r.id} className="review-item card">
                      <strong>{r.authorName}</strong>{" "}
                      <span className="muted">
                        {r.rating}★ · {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                      <p>{r.body}</p>
                    </li>
                  ))
                )}
              </ul>
            </section>
          </>
        ) : null}
      </section>

      {reportOpen && user ? (
        <form className="card stack-form report-form" onSubmit={onReport}>
          <label>
            Why are you reporting this title?
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              rows={2}
              required
            />
          </label>
          <button type="submit">Submit report</button>
        </form>
      ) : null}
    </div>
  );
}
