import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { MessagePeopleSearch } from "../components/MessagePeopleSearch";
import { UserAvatar } from "../components/UserAvatar";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useFilmData } from "../context/FilmDataContext";
import type { MessagePeer } from "../domain/types";
import { conversationIsUnread, otherMemberId } from "../lib/directMessages";
import { isSupabaseConfigured } from "../lib/supabase";
import { fetchProfile } from "../services/supabaseProfile";
import { MessageThread } from "./MessageThread";

type Tab = "notifications" | "messages";

export function Inbox() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  if (conversationId) {
    return <MessageThread />;
  }

  return <InboxHome />;
}

function InboxHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tab: Tab = searchParams.get("tab") === "messages" ? "messages" : "notifications";
  const [peopleSearchOpen, setPeopleSearchOpen] = useState(false);

  const {
    notificationsForUser,
    unreadNotificationCount,
    unreadMessagesCount,
    markNotificationRead,
    markAllNotificationsRead,
    listConversations,
    openConversationWith,
    getMessagePeer,
    cacheMessagePeer,
  } = useFilmData();

  const conversations = listConversations();

  // Pull real names/avatars for any DM partners we don't know yet (e.g. people
  // who replied to a clip), so the list shows them instead of "Member".
  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;
    let cancelled = false;
    const unknown = conversations
      .map((c) => otherMemberId(c, user.id))
      .filter((id) => id && !getMessagePeer(id));
    for (const id of [...new Set(unknown)]) {
      void fetchProfile(id).then((p) => {
        if (cancelled || !p) return;
        cacheMessagePeer({
          id: p.id,
          displayName: p.displayName,
          username: p.username,
          avatarUrl: p.avatarUrl,
          isCreator: p.isCreator,
        });
      });
    }
    return () => {
      cancelled = true;
    };
  }, [conversations, user, getMessagePeer, cacheMessagePeer]);

  const setTab = (t: Tab) => {
    if (t === "messages") navigate("/inbox?tab=messages");
    else navigate("/inbox");
  };

  const startChat = useCallback(
    (peerId: string, peer?: MessagePeer) => {
      const conv = openConversationWith(peerId, peer);
      if (conv) navigate(`/inbox/${conv.id}`);
    },
    [navigate, openConversationWith],
  );

  if (!user) return null;

  const notifItems = notificationsForUser().slice(0, 40);

  return (
    <div className="page inbox-page">
      <PageHeader title="Inbox" subtitle="Notifications and messages" />

      <div className="inbox-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "notifications"}
          className={tab === "notifications" ? "inbox-tab active" : "inbox-tab"}
          onClick={() => setTab("notifications")}
        >
          Notifications
          {unreadNotificationCount() > 0 ? (
            <span className="inbox-tab-badge">{unreadNotificationCount()}</span>
          ) : null}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "messages"}
          className={tab === "messages" ? "inbox-tab active" : "inbox-tab"}
          onClick={() => setTab("messages")}
        >
          Messages
          {unreadMessagesCount() > 0 ? (
            <span className="inbox-tab-badge">{unreadMessagesCount()}</span>
          ) : null}
        </button>
      </div>

      {tab === "notifications" ? (
        <section className="inbox-panel">
          <div className="inbox-panel-head">
            <span className="muted small">Recent activity</span>
            {unreadNotificationCount() > 0 ? (
              <button type="button" className="text-btn" onClick={markAllNotificationsRead}>
                Mark all read
              </button>
            ) : null}
          </div>
          {notifItems.length === 0 ? (
            <p className="muted small inbox-empty">
              Nothing yet — uploads, lives, and messages will show here.
            </p>
          ) : (
            <ul className="inbox-notif-list">
              {notifItems.map((it) => (
                <li key={it.id}>
                  {it.href ? (
                    <Link
                      to={it.href}
                      className={`inbox-notif-item ${it.read ? "read" : ""}`}
                      onClick={() => markNotificationRead(it.id)}
                    >
                      {it.message}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className={`inbox-notif-item text-btn-block ${it.read ? "read" : ""}`}
                      onClick={() => markNotificationRead(it.id)}
                    >
                      {it.message}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section className="messages-page">
          <div className="messages-page-toolbar">
            <h2 className="messages-page-title">Messages</h2>
            <button
              type="button"
              className="messages-search-btn"
              aria-label="Search people"
              title="Search people"
              onClick={() => setPeopleSearchOpen(true)}
            >
              <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden fill="none" stroke="currentColor" strokeWidth="2.25">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {conversations.length === 0 ? (
            <p className="muted small messages-page-empty">
              No conversations yet. Tap search to find someone to message.
            </p>
          ) : (
            <ul className="messages-thread-list">
              {conversations.map((c) => {
                const otherId = otherMemberId(c, user.id);
                const p = getMessagePeer(otherId);
                const name = p?.displayName ?? "Member";
                const unread = conversationIsUnread(c, user.id);
                const sent = c.lastMessageSenderId === user.id;
                const preview = c.lastMessagePreview
                  ? `${sent ? "You: " : ""}${c.lastMessagePreview}`
                  : "No messages yet";

                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="messages-thread-row"
                      onClick={() => navigate(`/inbox/${c.id}`)}
                    >
                      <UserAvatar
                        displayName={name}
                        avatarUrl={p?.avatarUrl}
                        size="md"
                      />
                      <span className="messages-thread-row-body">
                        <span className="messages-thread-row-top">
                          <span className="messages-thread-row-name">
                            {name}
                            {unread ? (
                              <span className="inbox-unread-dot" aria-label="Unread" />
                            ) : null}
                          </span>
                          {c.lastMessageAt ? (
                            <time
                              className="messages-thread-row-time muted small"
                              dateTime={c.lastMessageAt}
                            >
                              {formatMessageTime(c.lastMessageAt)}
                            </time>
                          ) : null}
                        </span>
                        <span className="messages-thread-row-preview muted small">
                          {preview}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <MessagePeopleSearch
        open={peopleSearchOpen}
        onClose={() => setPeopleSearchOpen(false)}
        onPick={startChat}
      />
    </div>
  );
}

function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
