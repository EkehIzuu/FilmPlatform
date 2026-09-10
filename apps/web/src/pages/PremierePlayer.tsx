import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { BackLink } from "../components/BackLink";
import { PageHeader } from "../components/PageHeader";
import { PremiereAccessGate } from "../components/premiere/PremiereAccessGate";
import { PremiereRecoveryBanner } from "../components/premiere/PremiereRecoveryBanner";
import { PremiereShareBox } from "../components/premiere/PremiereShareBox";
import { PremierePlayerShell } from "../components/premiere/PremierePlayerShell";
import {
  checkoutErrorMessage,
  reserveErrorMessage,
  ticketEntitlementSummary,
} from "@/features/premiere/lib/premiereStatusCopy";
import {
  loadPremiereAttribution,
  parsePremiereAttribution,
  storePremiereAttribution,
} from "@/features/premiere/lib/premiereAttribution";
import type { User } from "../domain/types";
import { fetchProfile } from "../services/supabaseProfile";
import { useAuth } from "../context/AuthContext";
import { useFilmData } from "../context/FilmDataContext";
import { getPremiereTimeline } from "../domain/premiereSync";
import { canViewTitle } from "../lib/ageGate";
import { resolveMediaUrl } from "../services/mediaStorage";
import { checkoutPremiereTicket } from "../services/payments";

function isHlsUrl(u: string): boolean {
  return /\.m3u8(\?|$)/i.test(u);
}

export function PremierePlayer() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { user } = useAuth();
  const { getPremiereEvent, hasPremiereAccess, reservePremiereSeat, trackEvent, state } = useFilmData();

  const event = id ? getPremiereEvent(id) : undefined;
  const title = event ? state.titles.find((t) => t.id === event.titleId) : undefined;
  const ageAllowed = title ? canViewTitle(user, title) : true;
  const canWatch = event ? hasPremiereAccess(event.id) && ageAllowed : false;
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutSuccess, setCheckoutSuccess] = useState("");
  const [ticketQty, setTicketQty] = useState(1);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [owner, setOwner] = useState<User | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [clock, setClock] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => setClock((c) => c + 1), 450);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (event && canWatch) trackEvent("premiere_player_open", { eventId: event.id });
  }, [event, canWatch, trackEvent]);

  useEffect(() => {
    if (!event) return;
    const attrib = parsePremiereAttribution(location.search);
    storePremiereAttribution(event.id, attrib);
  }, [event?.id, location.search]);

  useEffect(() => {
    if (!event) {
      setOwner(null);
      return;
    }
    void fetchProfile(event.ownerId).then(setOwner);
  }, [event?.ownerId]);

  const tl = event ? getPremiereTimeline(event) : null;
  const phase = tl?.phase ?? "lobby";

  const streamUrl =
    phase === "ads"
      ? resolveMediaUrl(event?.adHlsUrl || event?.adVideoUrl || "")
      : phase === "feature"
        ? resolveMediaUrl(event?.featureHlsUrl || event?.featureVideoUrl || "")
        : "";

  const subtitleUrl = event?.featureSubtitleVttUrl
    ? resolveMediaUrl(event.featureSubtitleVttUrl)
    : "";

  const onReserve = async () => {
    if (!event || !user) return;
    setCheckoutError("");
    setCheckoutSuccess("");
    setCheckoutBusy(true);
    try {
      const qty = Math.max(1, Math.min(10, ticketQty));
      const checkout = await checkoutPremiereTicket({
        email: user.email,
        amountCents: event.priceCents * qty,
        currency: event.currency,
        eventId: event.id,
        eventTitle: event.titleName,
        userId: user.id,
        ticketCount: qty,
      });
      if (!checkout.ok) {
        setCheckoutError(checkoutErrorMessage(checkout.error));
        return;
      }
      const res = reservePremiereSeat(event.id, {
        reference: checkout.reference,
        status: checkout.demo ? "demo" : "paid",
        ticketCount: qty,
      });
      if (!res.ok) {
        setCheckoutError(reserveErrorMessage(res.error));
        return;
      }
      if (res.shareCode) setShareCode(res.shareCode);
      setCheckoutSuccess(
        res.already
          ? "You already have a ticket for this screening."
          : ticketEntitlementSummary(event.titleName, qty, event.featureStartsAt),
      );
      const attrib = loadPremiereAttribution(event.id);
      trackEvent("premiere_checkout", {
        eventId: event.id,
        reference: checkout.reference,
        demo: checkout.demo ?? false,
        src: attrib.src,
        ref: attrib.ref,
        code: attrib.code,
      });
    } finally {
      setCheckoutBusy(false);
    }
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !event || !canWatch) return;
    if (phase === "lobby" || phase === "ended" || !streamUrl) {
      hlsRef.current?.destroy();
      hlsRef.current = null;
      v.removeAttribute("src");
      v.load();
      return;
    }

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

    import("hls.js").then(({ default: Hls }) => {
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
  }, [event, canWatch, phase, streamUrl]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !event || !streamUrl) return;
    if (phase === "lobby" || phase === "ended") return;

    const sync = () => {
      const tline = getPremiereTimeline(event);
      const seek = tline.seekSeconds;
      if (!Number.isFinite(v.duration) || v.duration <= 0) return;
      const t = Math.min(seek, Math.max(0, v.duration - 0.2));
      if (Math.abs(v.currentTime - t) > 2.5) v.currentTime = t;
    };

    const onMeta = () => sync();
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("timeupdate", sync);
    sync();
    return () => {
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("timeupdate", sync);
    };
  }, [event, streamUrl, phase, clock]);

  if (!event) {
    return (
      <div className="page">
        <PageHeader title="Screening not found" subtitle="This premiere may have been removed or the link is wrong." />
        <PremiereRecoveryBanner
          variant="warn"
          message="We could not find this screening. Check My tickets for your active showtimes."
          actions={[
            { label: "My tickets", to: "/watch/tickets", primary: true },
            { label: "Browse premieres", to: "/watch/premiere" },
          ]}
        />
      </div>
    );
  }

  if (!ageAllowed && title) {
    return (
      <div className="page page-premiere">
        <PageHeader title={event.titleName} subtitle="Age-restricted screening." />
        <PremiereRecoveryBanner
          variant="warn"
          message={`This film requires age ${title.minAge}+. Update your date of birth or verification in profile settings.`}
          actions={[
            { label: "Profile settings", to: "/profile/settings", primary: true },
            { label: "My tickets", to: "/watch/tickets" },
            { label: "Browse premieres", to: "/watch/premiere" },
          ]}
        />
      </div>
    );
  }

  if (!canWatch) {
    return (
      <>
        <PremiereAccessGate
          event={event}
          title={title}
          owner={owner}
          userEmail={user?.email}
          returnTo={`${location.pathname}${location.search}`}
          ticketQty={ticketQty}
          onTicketQtyChange={setTicketQty}
          checkoutBusy={checkoutBusy}
          checkoutError={checkoutError}
          checkoutSuccess={checkoutSuccess}
          shareCode={shareCode}
          onBuy={() => void onReserve()}
        />
        <div className="page" style={{ paddingTop: 0 }}>
          <BackLink to="/watch/premiere">All premieres</BackLink>
        </div>
      </>
    );
  }

  if (!tl) return null;

  return (
    <>
      <PremierePlayerShell
        event={event}
        title={title}
        owner={owner}
        tl={tl}
        showLobbyVideo={!!streamUrl && phase === "lobby"}
      >
        <PremiereShareBox
          eventId={event.id}
          titleName={event.titleName}
          featureStartsAt={event.featureStartsAt}
            source="room"
        />
        {streamUrl ? (
          <div className="premiere-video-wrap">
            <video
              ref={videoRef}
              className="premiere-video"
              controls
              playsInline
              autoPlay
              muted
              crossOrigin="anonymous"
            >
              {phase === "feature" && subtitleUrl ? (
                <track
                  kind="subtitles"
                  src={subtitleUrl}
                  srcLang="en"
                  label="Subtitles"
                  default
                />
              ) : null}
            </video>
            <p className="muted small premiere-unmute-hint">
              Muted for autoplay — unmute for sound.
            </p>
          </div>
        ) : phase === "lobby" ? null : phase === "ended" ? (
          <PremiereRecoveryBanner
            variant="info"
            message="The synced stream has ended. Watch on the creator profile if available."
            actions={
              title?.slug
                ? [
                    { label: "Watch on profile", to: `/title/${title.slug}/watch`, primary: true },
                    { label: "My tickets", to: "/watch/tickets" },
                    { label: "Browse premieres", to: "/watch/premiere" },
                  ]
                : [
                    { label: "My tickets", to: "/watch/tickets", primary: true },
                    { label: "Browse premieres", to: "/watch/premiere" },
                  ]
            }
          />
        ) : (
          <div className="premiere-lobby card">
            <p className="muted small">
              Stream is not ready yet. Stay in the room — playback starts on the shared showtime clock.
            </p>
            <Link to="/watch/tickets" className="text-link small">
              My tickets
            </Link>
          </div>
        )}
      </PremierePlayerShell>
      <div className="page page-premiere" style={{ paddingTop: 0 }}>
        <BackLink to="/watch/premiere">All premieres</BackLink>
      </div>
    </>
  );
}
