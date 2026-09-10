import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { getLiveSocketUrl } from "../lib/liveSocketUrl";

export type LiveRoomState = {
  roomId: string;
  isLive: boolean;
  title: string | null;
  likeCount: number;
  viewerCount: number;
  guestCount: number;
  layout: "solo" | "duo" | "grid";
  guestQueue: { id: string; displayName: string; avatarUrl?: string }[];
  pinnedChatId: string | null;
  slowMode: boolean;
  followersOnly: boolean;
  privateLive: boolean;
  poll: LivePoll | null;
  recentGifts: LiveGiftEvent[];
  topGifters: { userId: string; coins: number }[];
};

export type LiveChatMsg = {
  id: string;
  roomId: string;
  authorId?: string;
  authorName: string;
  authorAvatarUrl?: string;
  body: string;
  createdAt: string;
  kind?: "chat" | "gift" | "system";
  giftId?: string;
  giftLabel?: string;
};

export type LiveGiftEvent = {
  id: string;
  giftId: string;
  giftLabel: string;
  coins: number;
  fromUserId?: string;
  fromName: string;
  at: string;
};

export type LivePoll = {
  id: string;
  question: string;
  options: string[];
  votes: Record<string, number>;
};

export type LiveToast = {
  type: string;
  displayName?: string;
  at?: string;
};

type JoinOpts = {
  roomId: string;
  role: "host" | "viewer" | "guest";
  userId?: string;
  displayName: string;
  avatarUrl?: string;
  claimHost?: boolean;
  audioOnly?: boolean;
};

export function useLiveRoom() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [role, setRole] = useState<"host" | "viewer" | "guest" | null>(null);
  const [state, setState] = useState<LiveRoomState | null>(null);
  const [chat, setChat] = useState<LiveChatMsg[]>([]);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [likeBurst, setLikeBurst] = useState(0);
  const [gifts, setGifts] = useState<LiveGiftEvent[]>([]);
  const [toasts, setToasts] = useState<LiveToast[]>([]);
  const [poll, setPoll] = useState<LivePoll | null>(null);
  const [qa, setQa] = useState<{ id: string; displayName: string; body: string }[]>([]);
  const [ended, setEnded] = useState(false);
  const [guestAccepted, setGuestAccepted] = useState(false);
  const [networkHint, setNetworkHint] = useState<string | null>(null);

  const disconnect = useCallback(() => {
    const s = socketRef.current;
    if (s) {
      s.emit("live-leave");
      s.disconnect();
    }
    socketRef.current = null;
    setConnected(false);
    setRole(null);
    setState(null);
  }, []);

  const join = useCallback((opts: JoinOpts) => {
    disconnect();
    const s = io(getLiveSocketUrl(), { transports: ["websocket", "polling"] });
    socketRef.current = s;

    s.on("connect", () => {
      setConnected(true);
      s.emit("live-join", opts, (res: {
        ok: boolean;
        role?: "host" | "viewer" | "guest";
        state?: LiveRoomState;
        chat?: LiveChatMsg[];
        error?: string;
      }) => {
        if (!res?.ok) {
          setNetworkHint(res?.error ?? "Could not join live");
          return;
        }
        setRole(res.role ?? opts.role);
        if (res.state) setState(res.state);
        if (res.chat?.length) setChat(res.chat);
        if (res.state?.pinnedChatId) setPinnedId(res.state.pinnedChatId);
      });
    });

    s.on("disconnect", () => setConnected(false));

    s.on("live-state", (st: LiveRoomState) => setState(st));

    s.on("live-chat", (msg: LiveChatMsg) => {
      setChat((prev) => [...prev.slice(-299), msg]);
    });

    s.on("live-delete-chat", ({ messageId }: { messageId: string }) => {
      setChat((prev) => prev.filter((m) => m.id !== messageId));
      setPinnedId((p) => (p === messageId ? null : p));
    });

    s.on("live-pin", ({ messageId }: { messageId: string | null }) => {
      setPinnedId(messageId);
    });

    s.on("live-like", ({ count }: { count: number }) => {
      setState((prev) => (prev ? { ...prev, likeCount: count } : prev));
      setLikeBurst((n) => n + 1);
    });

    s.on("live-gift", (gift: LiveGiftEvent) => {
      setGifts((prev) => [...prev.slice(-12), gift]);
      setState((prev) =>
        prev ? { ...prev, recentGifts: [...(prev.recentGifts || []), gift].slice(-8) } : prev,
      );
    });

    s.on("live-toast", (t: LiveToast) => {
      setToasts((prev) => [...prev.slice(-5), t]);
      window.setTimeout(() => {
        setToasts((prev) => prev.slice(1));
      }, 4000);
    });

    s.on("live-poll", (p: LivePoll | null) => setPoll(p));

    s.on("live-qa", (q: { id: string; displayName: string; body: string }) => {
      setQa((prev) => [q, ...prev].slice(0, 30));
    });

    s.on("live-ended", () => setEnded(true));

    s.on("live-guest-accepted", () => setGuestAccepted(true));
    s.on("live-guest-rejected", () => setGuestAccepted(false));
    s.on("live-guest-removed", () => {
      setGuestAccepted(false);
      setRole("viewer");
    });

    s.on("connect_error", () => {
      setNetworkHint("Live server unreachable — run npm run dev at repo root");
    });
  }, [disconnect]);

  const sendChat = useCallback((body: string, extra?: Partial<LiveChatMsg>) => {
    socketRef.current?.emit("live-chat", { body, ...extra });
  }, []);

  const sendLike = useCallback(() => {
    socketRef.current?.emit("live-like");
  }, []);

  const sendGift = useCallback((gift: Omit<LiveGiftEvent, "id" | "at">) => {
    socketRef.current?.emit("live-gift", gift);
  }, []);

  const requestGuest = useCallback((message?: string) => {
    return new Promise<{ ok: boolean; error?: string }>((resolve) => {
      socketRef.current?.emit("live-guest-request", { message }, (res: { ok: boolean; error?: string }) => {
        resolve(res ?? { ok: false });
      });
    });
  }, []);

  const respondGuest = useCallback((requestId: string, accept: boolean) => {
    socketRef.current?.emit("live-guest-respond", { requestId, accept }, () => {});
  }, []);

  const removeGuest = useCallback((socketId: string) => {
    socketRef.current?.emit("live-guest-remove", { socketId });
  }, []);

  const pinChat = useCallback((messageId: string | null) => {
    socketRef.current?.emit("live-pin", { messageId });
  }, []);

  const deleteChat = useCallback((messageId: string) => {
    socketRef.current?.emit("live-delete-chat", { messageId });
  }, []);

  const updateSettings = useCallback(
    (patch: Partial<Pick<LiveRoomState, "slowMode" | "followersOnly" | "privateLive" | "title" | "isLive">>) => {
      socketRef.current?.emit("live-settings", patch);
    },
    [],
  );

  const startPoll = useCallback((question: string, options: string[]) => {
    socketRef.current?.emit("live-poll", { question, options });
  }, []);

  const votePoll = useCallback((optionIndex: number) => {
    socketRef.current?.emit("live-poll-vote", { optionIndex });
  }, []);

  const clearPoll = useCallback(() => {
    socketRef.current?.emit("live-poll", { clear: true });
  }, []);

  const sendQa = useCallback((body: string) => {
    socketRef.current?.emit("live-qa", { body });
  }, []);

  const endLive = useCallback(() => {
    socketRef.current?.emit("live-end");
  }, []);

  useEffect(() => () => disconnect(), [disconnect]);

  return {
    connected,
    role,
    state,
    chat,
    pinnedId,
    likeBurst,
    gifts,
    toasts,
    poll,
    qa,
    ended,
    guestAccepted,
    networkHint,
    join,
    disconnect,
    sendChat,
    sendLike,
    sendGift,
    requestGuest,
    respondGuest,
    removeGuest,
    pinChat,
    deleteChat,
    updateSettings,
    startPoll,
    votePoll,
    clearPoll,
    sendQa,
    endLive,
  };
}
