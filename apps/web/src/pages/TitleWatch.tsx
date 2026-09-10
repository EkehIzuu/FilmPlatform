import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BackLink } from "../components/BackLink";
import { CommentThread } from "../components/CommentThread";
import { EngagementBar } from "../components/EngagementBar";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useFilmData } from "../context/FilmDataContext";
import { canViewTitle } from "../lib/ageGate";
import { findTitlePlaybackUpload } from "../lib/episodePlayback";
import { titleNeedsPayment } from "../lib/businessAnalytics";
import { formatMoney } from "../lib/monetization";
import { checkoutPayment } from "../services/payments";
import { resolveMediaUrl } from "../services/mediaStorage";

function isHlsUrl(u: string): boolean {
  return /\.m3u8(\?|$)/i.test(u);
}

export function TitleWatch() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { getTitleBySlug, state, trackEvent, hasTitleAccess, purchaseTitleAccess } = useFilmData();
  const [payBusy, setPayBusy] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<{ destroy: () => void } | null>(null);

  const title = slug ? getTitleBySlug(slug) : undefined;
  const upload = title ? findTitlePlaybackUpload(state, title) : undefined;
  const streamUrl = upload
    ? resolveMediaUrl(upload.publicUrl || upload.storagePath)
    : "";
  const allowed = title ? canViewTitle(user, title) : false;
  const paid = title ? titleNeedsPayment(title) : false;
  const canWatch = title && allowed && (!paid || hasTitleAccess(title.id));

  useEffect(() => {
    if (title) trackEvent("title_play", { titleId: title.id, slug: title.slug });
  }, [title, trackEvent]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !streamUrl) return;
    hlsRef.current?.destroy();
    hlsRef.current = null;
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
      } else {
        el.src = streamUrl;
      }
    });
    return () => {
      cancelled = true;
      hlsRef.current?.destroy();
    };
  }, [streamUrl]);

  if (!title) {
    return (
      <div className="page">
        <PageHeader title="Not found" subtitle="Title missing." />
        <BackLink to="/explore">Explore</BackLink>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="page">
        <PageHeader title={title.name} subtitle="Age-restricted." />
        <Link to="/profile" className="text-link">
          Profile
        </Link>
      </div>
    );
  }

  const onPayWatch = async () => {
    if (!user || !title || !paid) return;
    setPayBusy(true);
    try {
      const checkout = await checkoutPayment({
        email: user.email,
        amountCents: title.accessPriceCents ?? 0,
        currency: title.accessCurrency ?? "USD",
        referencePrefix: `title-${title.id}`,
        label: title.name,
        userId: user.id,
        paymentType: "title_access",
        titleId: title.id,
      });
      if (checkout.ok) {
        purchaseTitleAccess(title.id, { reference: checkout.reference });
      }
    } finally {
      setPayBusy(false);
    }
  };

  return (
    <div className="page page--full episode-player-page">
      <BackLink to={`/title/${title.slug}`} className="back-link--flush">
        {title.name}
      </BackLink>
      <PageHeader title={`Watch · ${title.name}`} subtitle={upload?.fileName ?? "Video"} />
      {!canWatch && paid && user ? (
        <div className="card paywall-card">
          <h2 className="form-title">Rent to watch</h2>
          <p className="small">
            {formatMoney(title.accessPriceCents ?? 0, title.accessCurrency ?? "USD")} — watch on
            the creator&apos;s profile anytime (no premiere required).
          </p>
          <button type="button" className="auth-submit" disabled={payBusy} onClick={() => void onPayWatch()}>
            {payBusy ? "Processing…" : "Pay & watch"}
          </button>
        </div>
      ) : null}
      <div className="episode-player-wrap">
        {streamUrl && canWatch ? (
          <video ref={videoRef} className="episode-player-video" controls playsInline />
        ) : !streamUrl ? (
          <p className="hint-banner">No video uploaded for this title yet.</p>
        ) : null}
      </div>
      <EngagementBar targetType="title" targetId={title.id} showBookmark bookmarkType="title" />
      <CommentThread targetType="title" targetId={title.id} defaultOpen />
    </div>
  );
}
