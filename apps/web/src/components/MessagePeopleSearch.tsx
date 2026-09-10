import { useEffect, useMemo, useRef, useState } from "react";
import { UserAvatar } from "./UserAvatar";
import { useAuth } from "../context/AuthContext";
import { useFilmData } from "../context/FilmDataContext";
import type { MessagePeer } from "../domain/types";
import { isSupabaseConfigured } from "../lib/supabase";
import { searchProfiles } from "../services/supabaseProfile";

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (peerId: string, peer?: MessagePeer) => void;
};

function userToPeer(u: {
  id: string;
  displayName: string;
  username?: string;
  avatarUrl?: string;
  isCreator?: boolean;
}): MessagePeer {
  return {
    id: u.id,
    displayName: u.displayName,
    username: u.username,
    avatarUrl: u.avatarUrl,
    isCreator: u.isCreator,
  };
}

export function MessagePeopleSearch({ open, onClose, onPick }: Props) {
  const { user } = useAuth();
  const { searchMessagePeers } = useFilmData();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [remotePeers, setRemotePeers] = useState<MessagePeer[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setQ("");
      setRemotePeers([]);
      return;
    }
    const t = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!user || !isSupabaseConfigured() || q.trim().length < 2) {
      setRemotePeers([]);
      return;
    }
    let cancelled = false;
    setBusy(true);
    void searchProfiles(q, user.id, 12).then((rows) => {
      if (cancelled) return;
      setRemotePeers(rows.map(userToPeer));
      setBusy(false);
    });
    return () => {
      cancelled = true;
    };
  }, [q, user]);

  const results = useMemo(() => {
    const byId = new Map<string, MessagePeer>();
    for (const p of searchMessagePeers(q).slice(0, 12)) byId.set(p.id, p);
    for (const p of remotePeers) byId.set(p.id, p);
    return [...byId.values()];
  }, [searchMessagePeers, q, remotePeers]);

  if (!open) return null;

  return (
    <div className="msg-search-backdrop" role="presentation" onClick={onClose}>
      <div
        className="msg-search-panel"
        role="dialog"
        aria-label="Search people to message"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="msg-search-head">
          <span className="msg-search-icon" aria-hidden>
            <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth="2.25">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            ref={inputRef}
            type="search"
            className="msg-search-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name or @username"
            autoComplete="off"
            aria-label="Search people"
          />
          <button type="button" className="msg-search-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="msg-search-body">
          {q.trim().length === 0 ? (
            <p className="muted small msg-search-hint">Find someone to start a conversation.</p>
          ) : busy && results.length === 0 ? (
            <p className="muted small msg-search-hint">Searching…</p>
          ) : results.length === 0 ? (
            <p className="muted small msg-search-hint">No people found.</p>
          ) : (
            <ul className="msg-search-list">
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="msg-search-item"
                    onClick={() => {
                      onPick(p.id, p);
                      onClose();
                    }}
                  >
                    <UserAvatar displayName={p.displayName} avatarUrl={p.avatarUrl} size="sm" />
                    <span className="msg-search-item-meta">
                      <span className="msg-search-item-name">{p.displayName}</span>
                      {p.username ? (
                        <span className="muted small">@{p.username}</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
