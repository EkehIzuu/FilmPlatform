import { useState, useRef, useEffect } from "react";
import { UserAvatar } from "./UserAvatar";
import { useAuth } from "../context/AuthContext";
import { useFilmData } from "../context/FilmDataContext";

type Props = {
  roomId: string;
  hostLabel?: string;
};

export function LiveChatPanel({ roomId, hostLabel }: Props) {
  const { user } = useAuth();
  const { sendLiveChat, liveChatForRoom } = useFilmData();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const messages = liveChatForRoom(roomId);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (!roomId.trim()) {
    return (
      <aside className="live-chat">
        <h3 className="live-chat-title">Live chat</h3>
        <p className="muted small">Open a creator&apos;s live to chat here.</p>
      </aside>
    );
  }

  return (
    <aside className="live-chat">
      <h3 className="live-chat-title">{hostLabel ? `${hostLabel}'s chat` : "Live chat"}</h3>
      <p className="live-chat-meta muted small">
        Chat with everyone watching{hostLabel ? ` ${hostLabel}` : ""} — video is in the player.
      </p>
      <div className="live-chat-msgs">
        {messages.length === 0 ? (
          <p className="muted small">No messages yet.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="live-chat-msg">
              <UserAvatar displayName={m.authorName} avatarUrl={m.authorAvatarUrl} size="sm" />
              <div className="live-chat-msg-inner">
                <span className="live-chat-author">{m.authorName}</span>
                <span className="live-chat-body">{m.body}</span>
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
      {user ? (
        <form
          className="live-chat-form"
          onSubmit={(e) => {
            e.preventDefault();
            sendLiveChat(roomId, text);
            setText("");
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Say something…"
            maxLength={500}
            aria-label="Chat message"
          />
          <button type="submit" disabled={!text.trim()}>
            Send
          </button>
        </form>
      ) : (
        <p className="muted small">Sign in from Profile to chat during live.</p>
      )}
    </aside>
  );
}
