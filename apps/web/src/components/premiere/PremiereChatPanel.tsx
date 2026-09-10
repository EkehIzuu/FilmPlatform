import { FormEvent, useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  appendPremiereChat,
  loadPremiereChat,
  PREMIERE_CHAT_REFRESH,
  type PremiereChatMessage,
} from "../../lib/premiereRoomChat";

type Props = {
  eventId: string;
  titleName: string;
  disabled?: boolean;
};

export function PremiereChatPanel({ eventId, titleName, disabled }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<PremiereChatMessage[]>(() =>
    loadPremiereChat(eventId),
  );
  const [text, setText] = useState("");
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setMessages(loadPremiereChat(eventId));
    const onRefresh = (e: Event) => {
      const detail = (e as CustomEvent<{ eventId: string }>).detail;
      if (detail?.eventId === eventId) setMessages(loadPremiereChat(eventId));
    };
    window.addEventListener(PREMIERE_CHAT_REFRESH, onRefresh);
    return () => window.removeEventListener(PREMIERE_CHAT_REFRESH, onRefresh);
  }, [eventId]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onSend = (e: FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || !user || disabled) return;
    const next = appendPremiereChat(eventId, {
      authorName: user.displayName,
      body,
      kind: "chat",
    });
    setMessages(next);
    setText("");
  };

  return (
    <aside className="premiere-chat-panel" aria-label={`Premiere chat for ${titleName}`}>
      <h3 className="premiere-chat-title">Screening chat</h3>
      <p className="small muted premiere-chat-hint">
        Audience reactions for this showtime (saved in your browser).
      </p>
      <ul ref={listRef} className="premiere-chat-messages">
        {messages.length === 0 ? (
          <li className="small muted">Be first to react when the curtain rises…</li>
        ) : (
          messages.map((m) => (
            <li key={m.id} className={`premiere-chat-msg${m.kind === "reaction" ? " premiere-chat-msg--reaction" : ""}`}>
              <strong>{m.authorName}</strong>{" "}
              <span>{m.body}</span>
            </li>
          ))
        )}
      </ul>
      {user ? (
        <form className="premiere-chat-form" onSubmit={onSend}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Cheer, react, no spoilers…"
            maxLength={280}
            disabled={disabled}
          />
          <button type="submit" className="btn-secondary" disabled={disabled || !text.trim()}>
            Send
          </button>
        </form>
      ) : (
        <p className="small muted">Sign in to chat during the premiere.</p>
      )}
      {disabled ? <p className="small muted">Chat closed after curtain. Join the next screening to react live.</p> : null}
    </aside>
  );
}
