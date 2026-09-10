import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserAvatar } from "./UserAvatar";
import { useAuth } from "../context/AuthContext";
import { useFilmData } from "../context/FilmDataContext";
import type { MessagePeer } from "../domain/types";
import { runGlobalSearch } from "../lib/globalSearch";
import { isSupabaseConfigured } from "../lib/supabase";
import { searchProfiles } from "../services/supabaseProfile";

type Props = {
  open: boolean;
  onClose: () => void;
};

function profileToPeer(u: {
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

export function GlobalSearchModal({ open, onClose }: Props) {
  const { user } = useAuth();
  const { state, getFeatureFlags, trackEvent } = useFilmData();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [remotePeers, setRemotePeers] = useState<MessagePeer[]>([]);
  const [remoteBusy, setRemoteBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setQ("");
      setRemotePeers([]);
      return;
    }
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!user || !isSupabaseConfigured() || q.trim().length < 2) {
      setRemotePeers([]);
      return;
    }
    let cancelled = false;
    setRemoteBusy(true);
    void searchProfiles(q, user.id, 10).then((rows) => {
      if (cancelled) return;
      setRemotePeers(rows.map(profileToPeer));
      setRemoteBusy(false);
    });
    return () => {
      cancelled = true;
    };
  }, [q, user]);

  const sections = useMemo(
    () =>
      runGlobalSearch(state, q, user?.id ?? "", getFeatureFlags(), remotePeers),
    [state, q, user?.id, getFeatureFlags, remotePeers],
  );

  const total = sections.reduce((n, s) => n + s.results.length, 0);
  const flags = getFeatureFlags();
  const showExploreFoot =
    q.trim().length > 0 &&
    flags.explore !== false &&
    sections.some((s) => s.label.includes("Titles"));

  const pick = useCallback(
    (href: string, label: string) => {
      trackEvent("global_search_open", { href, label, query: q.trim() });
      onClose();
      navigate(href);
    },
    [navigate, onClose, q, trackEvent],
  );

  if (!open) return null;

  return (
    <div
      className="global-search-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="global-search-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Search Film"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="global-search-head">
          <span className="global-search-icon" aria-hidden>
            <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth="2.25">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            ref={inputRef}
            type="search"
            className="global-search-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="People, titles, clips, communities…"
            autoComplete="off"
            aria-label="Search"
          />
          <button type="button" className="global-search-close" onClick={onClose} aria-label="Close search">
            ✕
          </button>
        </div>

        <div className="global-search-body">
          {q.trim().length === 0 ? (
            <p className="global-search-hint muted small">
              Try a creator name, show title, or @username. Press <kbd>Esc</kbd> to close.
            </p>
          ) : remoteBusy && total === 0 ? (
            <p className="global-search-hint muted small">Searching…</p>
          ) : total === 0 ? (
            <p className="global-search-hint muted small">No results — try different keywords.</p>
          ) : (
            sections.map((section) => (
              <section key={section.label} className="global-search-section">
                <h3 className="global-search-section-label">{section.label}</h3>
                <ul className="global-search-list">
                  {section.results.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        className="global-search-item"
                        onClick={() => pick(r.href, r.title)}
                      >
                        {r.kind === "user" || r.kind === "clip" ? (
                          <UserAvatar
                            displayName={r.displayName ?? r.title}
                            avatarUrl={r.avatarUrl}
                            size="sm"
                          />
                        ) : (
                          <span className="global-search-item-icon" aria-hidden>
                            {r.kind === "title" ? "▶" : r.kind === "community" ? "💬" : r.kind === "premiere" ? "🎬" : "📡"}
                          </span>
                        )}
                        <span className="global-search-item-text">
                          <span className="global-search-item-title">{r.title}</span>
                          {r.subtitle ? (
                            <span className="global-search-item-sub muted small">{r.subtitle}</span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>

        {showExploreFoot ? (
          <div className="global-search-foot">
            <Link
              to={`/explore`}
              className="global-search-foot-link small"
              onClick={() => {
                trackEvent("global_search_explore", { query: q.trim() });
                onClose();
              }}
            >
              Browse all titles in Explore →
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
