import { useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { BackLink } from "../components/BackLink";
import { CommentThread } from "../components/CommentThread";
import { EngagementBar } from "../components/EngagementBar";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useFilmData } from "../context/FilmDataContext";
import { canViewTitle } from "../lib/ageGate";
import { findEpisodeUpload, getEpisode } from "../lib/episodePlayback";
import { resolveMediaUrl } from "../services/mediaStorage";

function isHlsUrl(u: string): boolean {
  return /\.m3u8(\?|$)/i.test(u);
}

export function EpisodePlayer() {
  const { slug, episodeId } = useParams<{ slug: string; episodeId: string }>();
  const { user } = useAuth();
  const { getTitleBySlug, state, trackEvent } = useFilmData();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<{ destroy: () => void } | null>(null);

  const title = slug ? getTitleBySlug(slug) : undefined;
  const episode =
    title && episodeId ? getEpisode(state, title.id, episodeId) : undefined;
  const upload =
    title && episodeId ? findEpisodeUpload(state, title.id, episodeId) : undefined;
  const streamUrl = upload
    ? resolveMediaUrl(upload.publicUrl || upload.storagePath)
    : "";
  const allowed = title ? canViewTitle(user, title) : false;

  useEffect(() => {
    if (title && episode) {
      trackEvent("episode_play", { titleId: title.id, episodeId: episode.id, slug: title.slug });
    }
  }, [title, episode, trackEvent]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !streamUrl) return;

    hlsRef.current?.destroy();
    hlsRef.current = null;
    v.removeAttribute("src");
    v.load();

    let cancelled = false;

    if (!isHlsUrl(streamUrl)) {
      v.src = streamUrl;
      return () => {
        cancelled = true;
      };
    }

    void import("hls.js").then(({ default: Hls }) => {
      if (cancelled || !videoRef.current) return;
      const el = videoRef.current;
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true });
        hls.loadSource(streamUrl);
        hls.attachMedia(el);
        hlsRef.current = hls;
      } else if (el.canPlayType("application/vnd.apple.mpegurl")) {
        el.src = streamUrl;
      } else {
        el.src = streamUrl;
      }
    });

    return () => {
      cancelled = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [streamUrl]);

  if (!slug || !title || !episodeId) {
    return (
      <div className="page">
        <PageHeader title="Not found" subtitle="Missing title or episode." />
        <BackLink to="/explore">Explore</BackLink>
      </div>
    );
  }

  if (!episode) {
    return (
      <div className="page">
        <PageHeader title={title.name} subtitle="Episode not found." />
        <BackLink to={`/title/${title.slug}`}>Back to title</BackLink>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="page">
        <PageHeader title={title.name} subtitle={`${episode.label} — ${episode.name}`} />
        <div className="hint-banner">
          Age-restricted — update your profile to watch this title.
        </div>
        <Link to="/profile" className="text-link">
          Profile
        </Link>
      </div>
    );
  }

  return (
    <div className="page page--full episode-player-page">
      <BackLink to={`/title/${title.slug}`} className="back-link--flush">
        {title.name}
      </BackLink>
      <PageHeader title={`${episode.label}: ${episode.name}`} subtitle={title.name} />

      <div className="episode-player-wrap">
        {streamUrl ? (
          <video
            ref={videoRef}
            className="episode-player-video"
            controls
            playsInline
            preload="metadata"
          />
        ) : (
          <div className="episode-player-placeholder hint-banner">
            No video file linked yet — upload an episode file in{" "}
            <Link to="/creator/upload" className="text-link">
              Creator upload
            </Link>
            .
          </div>
        )}
      </div>

      <EngagementBar
        targetType="episode"
        targetId={episode.id}
        showBookmark
        bookmarkType="episode"
      />
      <CommentThread targetType="episode" targetId={episode.id} defaultOpen />
    </div>
  );
}
