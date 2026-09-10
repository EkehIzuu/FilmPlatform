import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { appendPremiereChat } from "../../lib/premiereRoomChat";

const REACTIONS = ["🎬", "👏", "🔥", "❤️", "😮"] as const;

type Props = {
  eventId: string;
  disabled?: boolean;
  onReact?: () => void;
};

type Floater = { id: number; emoji: string; x: number };

export function PremiereReactionOverlay({ eventId, disabled, onReact }: Props) {
  const { user } = useAuth();
  const [floaters, setFloaters] = useState<Floater[]>([]);

  useEffect(() => {
    if (floaters.length === 0) return;
    const t = window.setTimeout(() => {
      setFloaters((f) => f.slice(1));
    }, 2200);
    return () => window.clearTimeout(t);
  }, [floaters]);

  const burst = (emoji: string) => {
    if (disabled) return;
    const id = Date.now() + Math.random();
    const x = 15 + Math.random() * 70;
    setFloaters((f) => [...f.slice(-12), { id, emoji, x }]);
    onReact?.();
    if (user) {
      appendPremiereChat(eventId, {
        authorName: user.displayName,
        body: emoji,
        kind: "reaction",
      });
    }
  };

  return (
    <>
      <div className="premiere-reaction-floaters" aria-hidden>
        {floaters.map((f) => (
          <span
            key={f.id}
            className="premiere-reaction-floater"
            style={{ left: `${f.x}%` }}
          >
            {f.emoji}
          </span>
        ))}
      </div>
      <div className="premiere-reaction-bar">
        {REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className="premiere-reaction-btn"
            disabled={disabled}
            onClick={() => burst(emoji)}
            aria-label={`React ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </>
  );
}
