import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { UserAvatar } from "../components/UserAvatar";
import { useAuth } from "../context/AuthContext";
import { useFilmData } from "../context/FilmDataContext";
import { resolveMediaUrl } from "../services/mediaStorage";
import { isSupabaseConfigured } from "../lib/supabase";
import { fetchProfile } from "../services/supabaseProfile";
import { livePathForScheduled } from "../lib/livePaths";
import {
  formatLiveStart,
  recommendedLives,
  type LiveRecommendation,
} from "../lib/liveRecommendations";
import type { StoryClip } from "../domain/types";

function formatWhen(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  const h = Math.max(0, Math.floor(ms / 3600000));
  if (h < 1) return "Expires soon";
  if (h < 24) return `${h}h left`;
  return new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

function ClipMenu({ story, isOwner }: { story: StoryClip; isOwner: boolean }) {
  const { toggleBookmark, isBookmarked, toggleFollow, isFollowing, dismissStory, deleteStory } =
    useFilmData();
  const [open, setOpen] = useState(false);
  const saved = isBookmarked("story", story.id);
  const following = isFollowing("user", story.authorId);
  const close = () => setOpen(false);

  return (
    <div className="clip-menu">
      <button
        type="button"
        className="clip-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Clip options"
        onClick={() => setOpen((o) => !o)}
      >
        ⋯
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="clip-menu-backdrop"
            aria-hidden
            tabIndex={-1}
            onClick={close}
          />
          <div className="clip-menu-dropdown" role="menu">
            <button
              type="button"
              role="menuitem"
              className="clip-menu-item"
              onClick={() => {
                toggleBookmark("story", story.id);
                close();
              }}
            >
              <span aria-hidden>🔖</span> {saved ? "Saved" : "Save"}
            </button>
            {!isOwner ? (
              <button
                type="button"
                role="menuitem"
                className="clip-menu-item"
                onClick={() => {
                  toggleFollow("user", story.authorId);
                  close();
                }}
              >
                <span aria-hidden>{following ? "✓" : "＋"}</span>{" "}
                {following ? "Following" : "Follow"}
              </button>
            ) : null}
            {!isOwner ? (
              <button
                type="button"
                role="menuitem"
                className="clip-menu-item"
                onClick={() => {
                  dismissStory(story.id);
                  close();
                }}
              >
                <span aria-hidden>🚫</span> Not interested
              </button>
            ) : null}
            {isOwner ? (
              <button
                type="button"
                role="menuitem"
                className="clip-menu-item clip-menu-item--danger"
                onClick={() => {
                  deleteStory(story.id);
                  close();
                }}
              >
                <span aria-hidden>🗑️</span> Delete
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

/** Replies to a clip are private: delivered as a DM to the creator, tagged with the clip. */
function ClipReplyComposer({
  story,
  open,
  onClose,
}: {
  story: StoryClip;
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const { openConversationWith, sendDirectMessage } = useFilmData();
  const [body, setBody] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!user || user.id === story.authorId || !open) return null;

  const onSend = (e: FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    const conv = openConversationWith(story.authorId, {
      id: story.authorId,
      displayName: story.authorName,
      avatarUrl: story.authorAvatarUrl,
      isCreator: false,
    });
    if (!conv) return;
    const ref = story.caption?.trim() ? `your clip "${story.caption.trim()}"` : "your clip";
    sendDirectMessage(conv.id, `↩ Reply to ${ref}: ${text}`);
    setBody("");
    onClose();
  };

  return (
    <form className="clip-msg-composer" onSubmit={onSend}>
      <input
        ref={inputRef}
        className="clip-msg-input"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={`Reply to ${story.authorName}…`}
        maxLength={500}
        aria-label={`Reply privately to ${story.authorName}`}
      />
      <button type="submit" className="clip-msg-send" disabled={!body.trim()}>
        Send
      </button>
      <button type="button" className="clip-msg-cancel" onClick={onClose}>
        Cancel
      </button>
    </form>
  );
}

/** TikTok-style share sheet: suggests external apps + native OS share + copy. */
function ClipShareSheet({ story, onClose }: { story: StoryClip; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/watch/clips?user=${encodeURIComponent(story.authorId)}`;
  const text = story.caption?.trim() || `Watch ${story.authorName}'s clip on Izora`;
  const e = encodeURIComponent;

  const targets = [
    { id: "whatsapp", label: "WhatsApp", glyph: "⬤", href: `https://wa.me/?text=${e(`${text} ${url}`)}` },
    { id: "telegram", label: "Telegram", glyph: "✈", href: `https://t.me/share/url?url=${e(url)}&text=${e(text)}` },
    { id: "x", label: "X", glyph: "𝕏", href: `https://twitter.com/intent/tweet?text=${e(text)}&url=${e(url)}` },
    { id: "facebook", label: "Facebook", glyph: "f", href: `https://www.facebook.com/sharer/sharer.php?u=${e(url)}` },
    {
      id: "email",
      label: "Email",
      glyph: "✉",
      href: `mailto:?subject=${e(`${story.authorName} on Izora`)}&body=${e(`${text}\n\n${url}`)}`,
    },
  ];

  const openTarget = (href: string) => {
    window.open(href, "_blank", "noopener,noreferrer");
    onClose();
  };

  const nativeShare = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: `${story.authorName} on Izora`, text, url });
      }
    } catch {
      // user dismissed — keep sheet open so they can pick another option
      return;
    }
    onClose();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard?.writeText(url);
      setCopied(true);
      window.setTimeout(onClose, 900);
    } catch {
      onClose();
    }
  };

  const hasNativeShare = typeof navigator !== "undefined" && Boolean(navigator.share);

  return (
    <div
      className="clip-share-backdrop"
      role="presentation"
      onClick={onClose}
      onTouchEnd={(ev) => ev.stopPropagation()}
    >
      <div
        className="clip-share-sheet"
        role="dialog"
        aria-label="Share clip"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="clip-share-handle" aria-hidden />
        <h3 className="clip-share-title">Share to</h3>
        <div className="clip-share-grid">
          {targets.map((t) => (
            <button
              key={t.id}
              type="button"
              className="clip-share-app"
              onClick={() => openTarget(t.href)}
            >
              <span className={`clip-share-app-icon clip-share-app-icon--${t.id}`} aria-hidden>
                {t.glyph}
              </span>
              <span className="clip-share-app-label">{t.label}</span>
            </button>
          ))}
          {hasNativeShare ? (
            <button type="button" className="clip-share-app" onClick={() => void nativeShare()}>
              <span className="clip-share-app-icon clip-share-app-icon--more" aria-hidden>
                ⋯
              </span>
              <span className="clip-share-app-label">More</span>
            </button>
          ) : null}
        </div>
        <button type="button" className="clip-share-copy" onClick={() => void copyLink()}>
          {copied ? "Link copied ✓" : "Copy link"}
        </button>
        <button type="button" className="clip-share-cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}

type FeedEntry =
  | { kind: "clip"; story: StoryClip }
  | { kind: "live"; live: LiveRecommendation };

/** Weave recommended lives into the clip feed so users discover them while scrolling. */
function buildFeed(stories: StoryClip[], lives: LiveRecommendation[]): FeedEntry[] {
  const entries: FeedEntry[] = [];
  let li = 0;
  // Lead with the top recommendation (usually a live-now stream) for visibility.
  if (lives.length > 0) entries.push({ kind: "live", live: lives[li++] });
  stories.forEach((story, i) => {
    entries.push({ kind: "clip", story });
    // Drop another recommendation every 5 clips.
    if ((i + 1) % 5 === 0 && li < lives.length) {
      entries.push({ kind: "live", live: lives[li++] });
    }
  });
  // Append any leftover recommendations at the end.
  while (li < lives.length) entries.push({ kind: "live", live: lives[li++] });
  return entries;
}

export function Clips({ embedded = false }: { embedded?: boolean } = {}) {
  const { user } = useAuth();
  const { state, listActiveStories, toggleLike, likeCount, userLiked } = useFilmData();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const focusUserId = params.get("user") ?? undefined;
  const lastTapRef = useRef<{ id: string; at: number } | null>(null);
  const tapTimerRef = useRef<number | null>(null);
  const touchHandledAtRef = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipedRef = useRef(false);
  const peekActiveRef = useRef(false);
  const peekRef = useRef<HTMLDivElement | null>(null);
  const [peekStory, setPeekStory] = useState<StoryClip | null>(null);
  const [shareStory, setShareStory] = useState<StoryClip | null>(null);
  const [burstId, setBurstId] = useState<string | null>(null);
  const [replyOpenId, setReplyOpenId] = useState<string | null>(null);
  const [brokenIds, setBrokenIds] = useState<Set<string>>(() => new Set());

  const markBroken = (storyId: string, src: string) => {
    console.warn("[Izora] clip media failed to load", { storyId, src });
    setBrokenIds((prev) => {
      if (prev.has(storyId)) return prev;
      const next = new Set(prev);
      next.add(storyId);
      return next;
    });
  };

  const all = listActiveStories();

  const visible = useMemo(() => {
    if (!focusUserId) return all;
    return all.filter((s) => s.authorId === focusUserId);
  }, [all, focusUserId]);

  const liveRecs = useMemo(
    () => (focusUserId ? [] : recommendedLives(state, user?.id, 4)),
    [state, user?.id, focusUserId],
  );

  const feed = useMemo(() => buildFeed(visible, liveRecs), [visible, liveRecs]);

  const focusName = visible[0]?.authorName;

  useEffect(
    () => () => {
      if (tapTimerRef.current !== null) window.clearTimeout(tapTimerRef.current);
    },
    [],
  );

  const isFullscreen = () =>
    typeof document !== "undefined" &&
    Boolean(
      document.fullscreenElement ||
        (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement,
    );

  const openFullscreen = (el: Element | null) => {
    if (!el || typeof document === "undefined") return;
    if (isFullscreen()) return;
    if ("requestFullscreen" in el) {
      void (el as Element & { requestFullscreen: () => Promise<void> }).requestFullscreen();
    }
  };

  const exitFullscreen = () => {
    if (typeof document === "undefined" || !isFullscreen()) return;
    if (document.exitFullscreen) {
      void document.exitFullscreen();
    } else {
      const d = document as Document & { webkitExitFullscreen?: () => void };
      d.webkitExitFullscreen?.();
    }
  };

  const handleLikeTap = (storyId: string) => {
    if (!user) return;
    toggleLike("story", storyId);
  };

  /** Open the clip author's profile. Clips only store an id, so resolve a username. */
  const openAuthorProfile = async (story: StoryClip) => {
    if (user?.id === story.authorId) {
      navigate("/profile");
      return;
    }
    const peer = (state.messagePeers ?? []).find((p) => p.id === story.authorId);
    if (peer?.username) {
      navigate(`/u/${encodeURIComponent(peer.username)}`);
      return;
    }
    if (isSupabaseConfigured()) {
      const profile = await fetchProfile(story.authorId);
      if (profile?.username) {
        navigate(`/u/${encodeURIComponent(profile.username)}`);
        return;
      }
    }
    // No public profile resolvable — fall back to this author's clips.
    navigate(`${embedded ? "/watch/clips" : "/clips"}?user=${encodeURIComponent(story.authorId)}`);
  };

  /** Double-tap always LIKES (never unlikes) and shows a heart burst. */
  const doubleTapLike = (storyId: string) => {
    if (!user) return;
    if (!userLiked("story", storyId)) toggleLike("story", storyId);
    setBurstId(storyId);
    window.setTimeout(() => setBurstId((b) => (b === storyId ? null : b)), 700);
  };

  const clearTapTimer = () => {
    if (tapTimerRef.current !== null) {
      window.clearTimeout(tapTimerRef.current);
      tapTimerRef.current = null;
    }
  };

  /**
   * A tap that opens fullscreen is delayed briefly so a second tap can cancel
   * it and LIKE instead — double-tap likes the clip without going fullscreen.
   */
  const registerTap = (storyId: string, targetEl: Element | null) => {
    const now = Date.now();
    const prev = lastTapRef.current;
    if (prev && prev.id === storyId && now - prev.at <= 300) {
      clearTapTimer();
      lastTapRef.current = null;
      doubleTapLike(storyId);
      return;
    }
    lastTapRef.current = { id: storyId, at: now };
    clearTapTimer();
    tapTimerRef.current = window.setTimeout(() => {
      tapTimerRef.current = null;
      lastTapRef.current = null;
      openFullscreen(targetEl);
    }, 280);
  };

  const viewportWidth = () =>
    typeof window !== "undefined" ? window.innerWidth || 360 : 360;

  /** Move the slide-in profile panel directly (no re-render) for smooth tracking. */
  const setPeekTransform = (px: number, animate: boolean) => {
    const el = peekRef.current;
    if (!el) return;
    el.style.transition = animate ? "transform 0.22s ease" : "none";
    el.style.transform = `translateX(${px}px)`;
  };

  const cancelPeek = () => {
    if (!peekActiveRef.current) return;
    peekActiveRef.current = false;
    setPeekTransform(viewportWidth(), true);
    window.setTimeout(() => setPeekStory(null), 220);
  };

  const onTouchStartMedia = (e: ReactTouchEvent) => {
    const t = e.changedTouches[0];
    touchStartRef.current = t ? { x: t.clientX, y: t.clientY } : null;
    swipedRef.current = false;
  };

  const onTouchMoveMedia = (e: ReactTouchEvent, story: StoryClip) => {
    const start = touchStartRef.current;
    const t = e.changedTouches[0];
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;

    if (!peekActiveRef.current) {
      // Start the profile peek only on a clear right-to-left drag.
      if (dx < -16 && Math.abs(dx) > Math.abs(dy) + 6) {
        peekActiveRef.current = true;
        setPeekStory(story);
      } else {
        return;
      }
    }
    // The panel rides in from the right edge, following the finger.
    const vw = viewportWidth();
    setPeekTransform(Math.max(0, Math.min(vw, vw + dx)), false);
  };

  const onTouchMedia = (e: ReactTouchEvent, story: StoryClip, targetEl: Element | null) => {
    const start = touchStartRef.current;
    const t = e.changedTouches[0];
    const dx = start && t ? t.clientX - start.x : 0;
    const dy = start && t ? t.clientY - start.y : 0;

    // A clear vertical swipe while fullscreen closes the clip (TikTok-style).
    if (isFullscreen() && Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx)) {
      swipedRef.current = true;
      cancelPeek();
      exitFullscreen();
      return;
    }

    // Right-to-left swipe → slide the creator's profile in, then navigate.
    if (peekActiveRef.current) {
      peekActiveRef.current = false;
      swipedRef.current = true;
      const vw = viewportWidth();
      const committed = dx < -Math.min(140, vw * 0.32);
      if (committed) {
        setPeekTransform(0, true);
        window.setTimeout(() => {
          if (isFullscreen()) exitFullscreen();
          void openAuthorProfile(story);
          setPeekStory(null);
        }, 220);
      } else {
        setPeekTransform(vw, true);
        window.setTimeout(() => setPeekStory(null), 220);
      }
      return;
    }

    // Mark that touch handled this so the synthesized click below is ignored.
    touchHandledAtRef.current = Date.now();
    registerTap(story.id, targetEl);
  };

  return (
    <div className={embedded ? "clips-page clips-page--embedded" : "page page--full clips-page"}>
      {embedded ? null : (
        <header className="clips-page-header stream-block">
          <div>
            <h1 className="clips-title">Clips</h1>
            <p className="small muted clips-subtitle">
              Short stories — fans and creators can post. Lives &amp; premieres stay in
              creator tools.
            </p>
          </div>
        </header>
      )}

      {focusUserId && focusName ? (
        <p className="clips-focus-label small muted">
          <Link to="/clips" className="text-link">
            All clips
          </Link>
          {" · "}
          {focusName}
        </p>
      ) : null}

      <ul className="clips-feed">
        {feed.length === 0 ? (
          <li className="clips-feed-empty muted small">
            No active clips — post one; it disappears after 24 hours.
          </li>
        ) : (
          feed.map((entry) => {
            if (entry.kind === "live") {
              const live = entry.live;
              const handle = live.ownerUsername;
              return (
                <li key={`live-${live.id}`} className="clips-feed-item clips-live-rec">
                  <p className="clips-live-eyebrow small muted">
                    {live.followsCreator ? "Live from someone you follow" : "Recommended live"}
                  </p>
                  <Link to={livePathForScheduled(live)} className="clips-live-card">
                    <UserAvatar displayName={handle ?? live.title} size="md" />
                    <div className="clips-live-card-body">
                      <span
                        className={
                          live.isLiveNow
                            ? "clips-live-badge clips-live-badge--on"
                            : "clips-live-badge"
                        }
                      >
                        {live.isLiveNow ? "● LIVE" : "Upcoming"}
                      </span>
                      <strong className="clips-live-title">{live.title}</strong>
                      {handle ? <span className="muted small">@{handle}</span> : null}
                      <span className="muted small">{formatLiveStart(live.startsAt)}</span>
                    </div>
                    <span className="clips-live-join">Join</span>
                  </Link>
                </li>
              );
            }
            const story = entry.story;
            const src = resolveMediaUrl(story.mediaUrl);
            const isOwner = user?.id === story.authorId;
            const liked = userLiked("story", story.id);
            const likes = likeCount("story", story.id);
            return (
              <li key={story.id} className="clips-feed-item">
                <div
                  className="clips-media-wrap"
                  onTouchStart={onTouchStartMedia}
                  onTouchMove={(e) => onTouchMoveMedia(e, story)}
                  onTouchEnd={(e) => onTouchMedia(e, story, e.currentTarget)}
                  onClick={(e) => {
                    // Don't re-open fullscreen from the click that follows a swipe-to-exit.
                    if (swipedRef.current) {
                      swipedRef.current = false;
                      return;
                    }
                    // Ignore the click synthesized right after a touch (handled there).
                    if (Date.now() - touchHandledAtRef.current < 600) return;
                    registerTap(story.id, e.currentTarget);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openFullscreen(e.currentTarget);
                    }
                  }}
                  aria-label="Open clip in full screen"
                >
                  {burstId === story.id ? (
                    <span className="clips-heart-burst" aria-hidden>
                      ♥
                    </span>
                  ) : null}
                  <div className="clips-media-inner">
                    <div className="clips-overlay-top">
                      <ClipMenu story={story} isOwner={isOwner} />
                    </div>
                    <div className="clips-float-metrics">
                      <button
                        type="button"
                        className={
                          liked
                            ? "clips-float-pill clips-float-pill--btn clips-float-pill--liked"
                            : "clips-float-pill clips-float-pill--btn"
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLikeTap(story.id);
                        }}
                        onTouchEnd={(e) => e.stopPropagation()}
                        aria-pressed={liked}
                        aria-label={liked ? "Unlike clip" : "Like clip"}
                        title="Like"
                      >
                        <span className="clips-float-icon">♥</span>
                        {likes > 0 ? <span className="clips-float-count">{likes}</span> : null}
                      </button>
                      {!isOwner ? (
                        <button
                          type="button"
                          className="clips-float-pill clips-float-pill--btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReplyOpenId((id) => (id === story.id ? null : story.id));
                          }}
                          onTouchEnd={(e) => e.stopPropagation()}
                          aria-label={`Reply to ${story.authorName}`}
                          title="Reply"
                        >
                          ↩
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="clips-float-pill clips-float-pill--btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShareStory(story);
                        }}
                        onTouchEnd={(e) => e.stopPropagation()}
                        aria-label="Share clip"
                        title="Share"
                      >
                        ↗
                      </button>
                    </div>
                    {brokenIds.has(story.id) || !src ? (
                      <div className="clips-media clips-media--broken">
                        <span>Clip unavailable</span>
                        <span className="small">This clip didn’t save its video. Re-post it.</span>
                      </div>
                    ) : story.mediaType === "video" ? (
                      <video
                        className="clips-media"
                        src={src}
                        playsInline
                        muted
                        autoPlay
                        loop
                        controls={false}
                        controlsList="nodownload noplaybackrate nofullscreen noremoteplayback"
                        disablePictureInPicture
                        preload="metadata"
                        onError={() => markBroken(story.id, src)}
                      />
                    ) : (
                      <img
                        className="clips-media"
                        src={src}
                        alt=""
                        loading="lazy"
                        onError={() => markBroken(story.id, src)}
                      />
                    )}
                    <div className="clips-overlay-bottom">
                      <button
                        type="button"
                        className="clips-overlay-author"
                        onClick={(e) => {
                          e.stopPropagation();
                          void openAuthorProfile(story);
                        }}
                        onTouchEnd={(e) => e.stopPropagation()}
                        aria-label={`View ${story.authorName}'s profile`}
                      >
                        <UserAvatar
                          displayName={story.authorName}
                          avatarUrl={story.authorAvatarUrl}
                          size="sm"
                        />
                        <div className="clips-overlay-author-text">
                          <strong>{story.authorName}</strong>
                          <span className="clips-meta-line">
                            <span className="clips-tag">Clip</span>
                            <span aria-hidden> · </span>
                            {formatWhen(story.expiresAt)}
                          </span>
                        </div>
                      </button>
                      {story.caption ? (
                        <p className="clips-overlay-caption">{story.caption}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
                <ClipReplyComposer
                  story={story}
                  open={replyOpenId === story.id}
                  onClose={() => setReplyOpenId((id) => (id === story.id ? null : id))}
                />
              </li>
            );
          })
        )}
      </ul>
      {shareStory ? (
        <ClipShareSheet story={shareStory} onClose={() => setShareStory(null)} />
      ) : null}
      {peekStory ? (
        <div
          ref={peekRef}
          className="clip-swipe-peek"
          style={{ transform: "translateX(100%)" }}
          aria-hidden
        >
          <UserAvatar
            displayName={peekStory.authorName}
            avatarUrl={peekStory.authorAvatarUrl}
            size="lg"
          />
          <strong className="clip-swipe-peek-name">{peekStory.authorName}</strong>
          <span className="clip-swipe-peek-hint">Opening profile…</span>
        </div>
      ) : null}
    </div>
  );
}
