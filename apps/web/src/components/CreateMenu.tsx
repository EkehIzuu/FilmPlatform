import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useFilmData } from "../context/FilmDataContext";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function CreateMenu({ open, onClose }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getFeatureFlags } = useFilmData();
  const panelRef = useRef<HTMLDivElement>(null);
  const f = getFeatureFlags();
  const isCreator = user?.isCreator ?? false;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const go = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="create-menu-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={panelRef}
        className="create-menu-panel"
        role="dialog"
        aria-label="Create"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="create-menu-title">Create</h2>
        <p className="small muted create-menu-sub">
          Promote a premiere · or post to the community
        </p>

        <ul className="create-menu-list">
          {f.clips ? (
            <li>
              <button type="button" className="create-menu-item" onClick={() => go("/clips/new")}>
                <span className="create-menu-item-icon" aria-hidden>
                  ⚡
                </span>
                <span>
                  <strong>Post clip</strong>
                  <span className="small muted">24-hour story · photo or video</span>
                </span>
              </button>
            </li>
          ) : null}
          {f.communities ? (
            <li>
              <button
                type="button"
                className="create-menu-item"
                onClick={() => go("/post/community")}
              >
                <span className="create-menu-item-icon" aria-hidden>
                  ✎
                </span>
                <span>
                  <strong>Community post</strong>
                  <span className="small muted">Thread on a title hub</span>
                </span>
              </button>
            </li>
          ) : null}
        </ul>

        {f.live ? (
          <>
            <h3 className="create-menu-section">Live</h3>
            <ul className="create-menu-list">
              <li>
                <button
                  type="button"
                  className="create-menu-item create-menu-item--accent"
                  onClick={() => go("/go-live")}
                >
                  <span className="create-menu-item-icon" aria-hidden>
                    ●
                  </span>
                  <span>
                    <strong>Go live</strong>
                    <span className="small muted">Start broadcasting now</span>
                  </span>
                </button>
              </li>
            </ul>
          </>
        ) : null}
        {isCreator ? (
          <>
            <h3 className="create-menu-section">Premiere (core)</h3>
            <ul className="create-menu-list">
              {f.premiere ? (
                <li>
                  <button
                    type="button"
                    className="create-menu-item create-menu-item--accent"
                    onClick={() => go("/creator/premiere")}
                  >
                    <span className="create-menu-item-icon" aria-hidden>
                      🎟️
                    </span>
                    <span>
                      <strong>Schedule premiere</strong>
                      <span className="small muted">Ticket date · synced opening night</span>
                    </span>
                  </button>
                </li>
              ) : null}
              <li>
                <button type="button" className="create-menu-item" onClick={() => go("/creator/titles")}>
                  <span className="create-menu-item-icon" aria-hidden>
                    ▤
                  </span>
                  <span>
                    <strong>Title &amp; pricing</strong>
                    <span className="small muted">Upload · free or paid on profile</span>
                  </span>
                </button>
              </li>
            </ul>
            <h3 className="create-menu-section">Promote premiere</h3>
            <ul className="create-menu-list">
              {f.clips ? (
                <li>
                  <button type="button" className="create-menu-item" onClick={() => go("/clips/new")}>
                    <span className="create-menu-item-icon" aria-hidden>
                      ⚡
                    </span>
                    <span>
                      <strong>Trailer clip</strong>
                      <span className="small muted">24h sneak peek</span>
                    </span>
                  </button>
                </li>
              ) : null}
              {f.live ? (
                <li>
                  <button type="button" className="create-menu-item" onClick={() => go("/creator/lives")}>
                    <span className="create-menu-item-icon" aria-hidden>
                      ●
                    </span>
                    <span>
                      <strong>Premiere night live</strong>
                      <span className="small muted">Pre-show or after-party</span>
                    </span>
                  </button>
                </li>
              ) : null}
              <li>
                <button type="button" className="create-menu-item" onClick={() => go("/creator/upload")}>
                  <span className="create-menu-item-icon" aria-hidden>
                    ↑
                  </span>
                  <span>
                    <strong>Upload media</strong>
                    <span className="small muted">Film file for premiere</span>
                  </span>
                </button>
              </li>
            </ul>
          </>
        ) : (
          <p className="small muted create-menu-foot">
            Lives and cinema premieres are for creators. Switch to creator mode on your{" "}
            <Link to="/profile" onClick={onClose}>
              profile
            </Link>
            .
          </p>
        )}

        <button type="button" className="create-menu-cancel btn-secondary" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
