import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BackLink } from "../components/BackLink";
import { UserAvatar } from "../components/UserAvatar";
import { useAuth } from "../context/AuthContext";
import { useFilmData } from "../context/FilmDataContext";
import { otherMemberId, peerProfilePath } from "../lib/directMessages";
import { isSupabaseConfigured } from "../lib/supabase";
import { fetchProfile } from "../services/supabaseProfile";

export function MessageThread() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  const {
    getConversation,
    messagesForConversation,
    sendDirectMessage,
    markConversationRead,
    getMessagePeer,
    cacheMessagePeer,
  } = useFilmData();

  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const conv = conversationId ? getConversation(conversationId) : undefined;
  const messages = conversationId ? messagesForConversation(conversationId) : [];
  const peerId = conv && user ? otherMemberId(conv, user.id) : undefined;
  const peer = peerId ? getMessagePeer(peerId) : undefined;
  const peerName = peer?.displayName ?? "Member";
  const peerPath = peer ? peerProfilePath(peer) : undefined;

  useEffect(() => {
    if (conversationId && conv && user) {
      markConversationRead(conversationId);
    }
  }, [conversationId, conv, user, markConversationRead]);

  // Resolve an unknown DM partner (e.g. someone who replied to your clip) from
  // their Supabase profile so the thread shows a real name instead of "Member".
  useEffect(() => {
    if (!peerId || peer || !isSupabaseConfigured()) return;
    let cancelled = false;
    void fetchProfile(peerId).then((p) => {
      if (cancelled || !p) return;
      cacheMessagePeer({
        id: p.id,
        displayName: p.displayName,
        username: p.username,
        avatarUrl: p.avatarUrl,
        isCreator: p.isCreator,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [peerId, peer, cacheMessagePeer]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const onSend = (e: FormEvent) => {
    e.preventDefault();
    if (!conversationId || !draft.trim()) return;
    sendDirectMessage(conversationId, draft);
    setDraft("");
  };

  if (!user) return null;

  if (!conversationId || !conv) {
    return (
      <div className="page message-thread-page">
        <BackLink to="/inbox?tab=messages" className="back-link--flush">
          Messages
        </BackLink>
        <p className="muted small">Conversation not found.</p>
      </div>
    );
  }

  return (
    <div className="page message-thread-page">
      <header className="message-thread-top">
        <BackLink to="/inbox?tab=messages" className="back-link--flush">
          Messages
        </BackLink>
        <div className="message-thread-peer">
          <UserAvatar displayName={peerName} avatarUrl={peer?.avatarUrl} size="md" />
          {peerPath ? (
            <Link to={peerPath} className="message-thread-peer-name">
              {peerName}
            </Link>
          ) : (
            <span className="message-thread-peer-name">{peerName}</span>
          )}
          {peer?.username ? (
            <span className="muted small">@{peer.username}</span>
          ) : null}
        </div>
      </header>

      <div className="message-thread-msgs">
        {messages.length === 0 ? (
          <p className="muted small message-thread-empty">
            No messages yet — say hello.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === user.id;
            return (
              <div
                key={m.id}
                className={mine ? "message-bubble message-bubble--sent" : "message-bubble message-bubble--received"}
              >
                <p className="message-bubble-body">{m.body}</p>
                <time className="message-bubble-time muted small" dateTime={m.createdAt}>
                  {new Date(m.createdAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </time>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <form className="message-thread-compose" onSubmit={onSend}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message…"
          maxLength={2000}
          aria-label="Write a message"
        />
        <button type="submit" disabled={!draft.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
