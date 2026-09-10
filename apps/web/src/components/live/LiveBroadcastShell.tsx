import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserAvatar } from "../UserAvatar";
import { useAuth } from "../../context/AuthContext";
import { useFilmData } from "../../context/FilmDataContext";
import { useLiveRoom } from "../../hooks/useLiveRoom";
import { LIVE_GIFTS } from "../../lib/monetization";
import { liveEngineIframeParams, profileLivePath } from "../../lib/livePaths";
import type { User } from "../../domain/types";

const liveUrl = import.meta.env.VITE_LIVE_URL || "http://localhost:3000";

type Props = {
  host: User;
  roomId: string;
  titleLabel?: string;
  scheduledLiveId?: string;
  embedded?: boolean;
};

export function LiveBroadcastShell({
  host,
  roomId,
  titleLabel,
  scheduledLiveId,
  embedded,
}: Props) {
  const { user } = useAuth();
  const { sendLiveGift, trackEvent, addReport } = useFilmData();
  const live = useLiveRoom();
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [chatText, setChatText] = useState("");
  const [showHostPanel, setShowHostPanel] = useState(false);
  const [showQa, setShowQa] = useState(false);
  const [pollQ, setPollQ] = useState("");
  const [pollOpts, setPollOpts] = useState("Yes\nNo");
  const [giftMsg, setGiftMsg] = useState<string | null>(null);
  const [requestPending, setRequestPending] = useState(false);
  const [audioOnly, setAudioOnly] = useState(false);
  const [hearts, setHearts] = useState<{ id: number; x: number }[]>([]);

  const isHost = user?.id === host.id;
  const isGuest = live.role === "guest" || live.guestAccepted;
  const coinBalance = user?.coinBalance ?? 0;

  const iframeRole = isHost || live.guestAccepted ? "host" : "viewer";
  const iframeSrc = useMemo(() => {
    try {
      const u = new URL(liveUrl);
      const params = liveEngineIframeParams(roomId, host.username, {
        role: iframeRole,
        layout: "broadcast",
        audioOnly: audioOnly && (isHost || isGuest),
      });
      u.search = params.toString();
      return u.toString();
    } catch {
      return "";
    }
  }, [roomId, host.username, iframeRole, audioOnly, isHost, isGuest]);

  const joinedRef = useRef(false);
  useEffect(() => {
    if (!user || !roomId || joinedRef.current) return;
    joinedRef.current = true;
    live.join({
      roomId,
      role: isHost ? "host" : "viewer",
      userId: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      claimHost: isHost,
      audioOnly: audioOnly && (isHost || isGuest),
    });
    trackEvent("live_join", { room: roomId, host: host.username, role: isHost ? "host" : "viewer" });
    return () => {
      joinedRef.current = false;
      live.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- join once per mount
  }, [roomId, user?.id, isHost]);

  // The video iframe (a separate origin, separate socket) only knows how to
  // tear down its own WebRTC connection — it can't end the live room itself.
  // Bridge its "I hung up" signal into the actual room-state action so the
  // stream + chat panel actually end instead of just going camera-less.
  useEffect(() => {
    let liveEngineOrigin: string | null = null;
    try {
      liveEngineOrigin = new URL(liveUrl).origin;
    } catch {
      liveEngineOrigin = null;
    }

    function onMessage(event: MessageEvent) {
      if (liveEngineOrigin && event.origin !== liveEngineOrigin) return;
      const data = event.data as { type?: string; message?: string } | null;
      if (!data || typeof data !== "object") return;

      if (data.type === "izora-live-left") {
        if (isHost) {
          live.endLive();
        } else if (host.username) {
          navigate(`/u/${host.username}`);
        } else {
          navigate(-1);
        }
      } else if (data.type === "izora-live-error" && data.message) {
        setGiftMsg(data.message);
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [isHost, live, navigate, host.username]);

  useEffect(() => {
    if (live.likeBurst > 0) {
      const id = Date.now();
      const x = 10 + Math.random() * 80;
      setHearts((h) => [...h.slice(-20), { id, x }]);
      window.setTimeout(() => {
        setHearts((h) => h.filter((p) => p.id !== id));
      }, 2000);
    }
  }, [live.likeBurst]);

  const pinned = live.chat.find((m) => m.id === live.pinnedId);

  const onSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const t = chatText.trim();
    if (!t || !user) return;
    live.sendChat(t);
    setChatText("");
  };

  const onDoubleTapLike = () => {
    live.sendLike();
  };

  const onGift = (giftId: string) => {
    if (!user) return;
    const g = LIVE_GIFTS.find((x) => x.id === giftId);
    if (!g) return;
    const res = sendLiveGift(host.id, giftId);
    if (res.ok) {
      live.sendGift({
        giftId: g.id,
        giftLabel: g.label,
        coins: g.coins,
        fromUserId: user.id,
        fromName: user.displayName,
      });
      live.sendChat(`sent ${g.label}`, { kind: "gift", giftId: g.id, giftLabel: g.label });
      setGiftMsg(null);
    } else if (res.error === "coins") setGiftMsg("Need more coins — Settings");
  };

  const onRequestGuest = async () => {
    setRequestPending(true);
    const res = await live.requestGuest("Can I join?");
    if (!res.ok) setGiftMsg(res.error === "queue-full" ? "Queue full" : "Could not request");
    setRequestPending(false);
  };

  const shareUrl =
    typeof window !== "undefined" && host.username
      ? `${window.location.origin}${profileLivePath(host.username, {
          liveId: scheduledLiveId,
          title: titleLabel,
        })}`
      : "";

  const copyShare = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setGiftMsg("Link copied");
    } catch {
      setGiftMsg("Copy failed");
    }
  };

  if (live.ended) {
    return (
      <div className="live-broadcast live-broadcast--ended">
        <p className="live-ended-title">Live ended</p>
        {host.username ? (
          <Link to={`/u/${host.username}`} className="text-link">
            Back to @{host.username}
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`live-broadcast ${embedded ? "live-broadcast--embedded" : ""}`}>
      <div className="live-broadcast-video" onDoubleClick={onDoubleTapLike}>
        {iframeSrc ? (
          <iframe
            ref={iframeRef}
            title={`${host.displayName} live`}
            src={iframeSrc}
            className="live-broadcast-iframe"
            allow="camera; microphone; display-capture; autoplay"
          />
        ) : null}
        <div className="live-broadcast-gradient" aria-hidden />
        {hearts.map((h) => (
          <span key={h.id} className="live-heart-float" style={{ left: `${h.x}%` }}>
            ❤️
          </span>
        ))}
        {live.gifts.map((g) => (
          <div key={g.id} className="live-gift-float">
            <strong>{g.fromName}</strong> sent {g.giftLabel}
          </div>
        ))}
      </div>

      <header className="live-broadcast-top">
        <div className="live-broadcast-host">
          <UserAvatar
            displayName={host.displayName}
            email={host.email}
            avatarUrl={host.avatarUrl}
            size="md"
          />
          <div>
            <span className="live-badge">LIVE</span>
            <strong className="live-host-line">{host.displayName}</strong>
            {titleLabel || live.state?.title ? (
              <p className="small live-topic">{live.state?.title || titleLabel}</p>
            ) : null}
          </div>
        </div>
        <div className="live-broadcast-stats">
          <span>{live.state?.viewerCount ?? 0} watching</span>
          <span>{live.state?.likeCount ?? 0} likes</span>
        </div>
        {live.networkHint ? <p className="live-net-hint small">{live.networkHint}</p> : null}
      </header>

      {pinned ? (
        <div className="live-pinned">
          <span className="small">📌 {pinned.authorName}: {pinned.body}</span>
        </div>
      ) : null}

      <div className="live-broadcast-comments">
        {live.toasts.map((t, i) => (
          <p key={i} className="live-join-toast small">
            {t.displayName} joined
          </p>
        ))}
        {live.chat.slice(-18).map((m) => (
          <p key={m.id} className="live-comment-line small">
            <strong>{m.authorName}</strong> {m.body}
          </p>
        ))}
      </div>

      {live.poll ? (
        <div className="live-poll-card card">
          <p className="small">
            <strong>{live.poll.question}</strong>
          </p>
          {live.poll.options.map((opt, i) => (
            <button key={i} type="button" className="btn-secondary live-poll-opt" onClick={() => live.votePoll(i)}>
              {opt}
            </button>
          ))}
        </div>
      ) : null}

      <footer className="live-broadcast-bottom">
        {user ? (
          <form className="live-comment-input" onSubmit={onSendChat}>
            <input
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder="Add comment…"
              maxLength={500}
            />
          </form>
        ) : (
          <Link to="/login" className="small text-link">
            Sign in to comment
          </Link>
        )}
        <div className="live-broadcast-actions">
          <button type="button" className="live-action-btn" onClick={() => live.sendLike()} aria-label="Like">
            ❤️
          </button>
          {!isHost && user ? (
            <>
              {LIVE_GIFTS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className="live-action-btn"
                  disabled={coinBalance < g.coins}
                  onClick={() => onGift(g.id)}
                  title={g.label}
                >
                  🎁
                </button>
              ))}
            </>
          ) : null}
          {!isHost && user && live.role === "viewer" && !live.guestAccepted ? (
            <button
              type="button"
              className="live-action-btn live-action-btn--accent"
              disabled={requestPending}
              onClick={() => void onRequestGuest()}
            >
              Request
            </button>
          ) : null}
          <button type="button" className="live-action-btn" onClick={() => void copyShare()} aria-label="Share">
            ↗
          </button>
          {isHost ? (
            <button type="button" className="live-action-btn" onClick={() => setShowHostPanel((v) => !v)}>
              ⚙
            </button>
          ) : null}
          {user && !isHost ? (
            <button
              type="button"
              className="live-action-btn"
              onClick={() => addReport("user", host.id, "Reported during live")}
              title="Report"
            >
              ⚑
            </button>
          ) : null}
        </div>
      </footer>

      {giftMsg ? <p className="live-toast-msg small">{giftMsg}</p> : null}

      {isHost && showHostPanel ? (
        <aside className="live-host-panel card">
          <h3 className="form-title">Host controls</h3>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={audioOnly}
              onChange={(e) => {
                setAudioOnly(e.target.checked);
                live.updateSettings({});
              }}
            />
            Audio-only mode
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={live.state?.slowMode}
              onChange={(e) => live.updateSettings({ slowMode: e.target.checked })}
            />
            Slow mode
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={live.state?.privateLive}
              onChange={(e) => live.updateSettings({ privateLive: e.target.checked })}
            />
            Private live (link only)
          </label>
          <label>
            Stream title
            <input
              defaultValue={live.state?.title ?? titleLabel ?? ""}
              onBlur={(e) => live.updateSettings({ title: e.target.value })}
            />
          </label>
          <p className="small muted">Guest requests ({live.state?.guestQueue.length ?? 0})</p>
          <ul className="live-guest-queue">
            {(live.state?.guestQueue ?? []).map((g) => (
              <li key={g.id} className="live-guest-queue-row">
                <span>{g.displayName}</span>
                <button type="button" className="text-btn" onClick={() => live.respondGuest(g.id, true)}>
                  Accept
                </button>
                <button type="button" className="text-btn" onClick={() => live.respondGuest(g.id, false)}>
                  Decline
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="btn-secondary" onClick={() => setShowQa((v) => !v)}>
            Q&amp;A ({live.qa.length})
          </button>
          {showQa ? (
            <ul className="live-qa-list small">
              {live.qa.map((q) => (
                <li key={q.id}>
                  <strong>{q.displayName}</strong>: {q.body}
                </li>
              ))}
            </ul>
          ) : null}
          <label>
            Poll question
            <input value={pollQ} onChange={(e) => setPollQ(e.target.value)} />
          </label>
          <label>
            Options (one per line)
            <textarea value={pollOpts} onChange={(e) => setPollOpts(e.target.value)} rows={2} />
          </label>
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              live.startPoll(
                pollQ,
                pollOpts.split("\n").map((s) => s.trim()).filter(Boolean),
              )
            }
          >
            Start poll
          </button>
          <button type="button" className="btn-secondary" onClick={() => live.clearPoll()}>
            Clear poll
          </button>
          <button type="button" className="btn-danger" onClick={() => live.endLive()}>
            End live
          </button>
          <p className="small muted">Recording to profile replay — coming soon (VOD save).</p>
          <p className="small muted">
            Layout: <strong>{live.state?.layout ?? "solo"}</strong>
            {live.state?.guestCount ? ` · ${live.state.guestCount} on stage` : ""}
          </p>
        </aside>
      ) : null}

      {!isHost && user ? (
        <button type="button" className="live-qa-fab" onClick={() => setShowQa((v) => !v)}>
          Q
        </button>
      ) : null}
      {!isHost && showQa && user ? (
        <form
          className="live-qa-form card"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const body = String(fd.get("q") ?? "").trim();
            if (body) {
              live.sendQa(body);
              e.currentTarget.reset();
            }
          }}
        >
          <input name="q" placeholder="Ask a question…" maxLength={300} />
          <button type="submit">Send</button>
        </form>
      ) : null}
    </div>
  );
}
