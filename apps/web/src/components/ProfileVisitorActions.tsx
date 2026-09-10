import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { FollowButton } from "./FollowButton";
import { useAuth } from "../context/AuthContext";
import { useFilmData } from "../context/FilmDataContext";
import type { User } from "../domain/types";

type Props = {
  profile: User;
  isLockedView: boolean;
  following: boolean;
  onMessage: () => void;
  onFollow: () => void;
};

export function ProfileVisitorActions({
  profile,
  isLockedView,
  following,
  onMessage,
  onFollow,
}: Props) {
  const { user: sessionUser } = useAuth();
  const { blockUser, unblockUser, isBlocked, isBlockedEitherWay, addReport } = useFilmData();
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSent, setReportSent] = useState(false);

  const blocked = isBlocked(profile.id);
  const blockedEitherWay = isBlockedEitherWay(profile.id);
  const canMessage = sessionUser && !blockedEitherWay && !isLockedView;
  const showActions = Boolean(sessionUser);

  const closeMenu = () => {
    setMenuOpen(false);
    setReportOpen(false);
  };

  const onReportSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!reportReason.trim()) return;
    addReport("user", profile.id, reportReason.trim());
    setReportReason("");
    setReportOpen(false);
    setReportSent(true);
    closeMenu();
    window.setTimeout(() => setReportSent(false), 3000);
  };

  if (!showActions) {
    return (
      <p className="profile-ig-guest-hint muted small">
        <Link to="/profile">Sign in</Link> to follow or message.
      </p>
    );
  }

  return (
    <>
      <div className="profile-ig-actions">
        <FollowButton
          following={following}
          onClick={onFollow}
          className="profile-ig-action-btn profile-ig-action-btn--follow"
        />
        {canMessage ? (
          <button type="button" className="profile-ig-action-btn" onClick={onMessage}>
            Message
          </button>
        ) : (
          <button type="button" className="profile-ig-action-btn" disabled>
            {isLockedView ? "Follow to message" : "Message"}
          </button>
        )}
        <div className="profile-overflow-menu profile-overflow-menu--inline">
          <button
            type="button"
            className="profile-ig-action-btn profile-ig-action-btn--icon"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="More options"
            onClick={() => {
              setMenuOpen((o) => !o);
              setReportOpen(false);
            }}
          >
            ⋯
          </button>
          {menuOpen ? (
            <>
              <button
                type="button"
                className="profile-overflow-menu__backdrop"
                aria-hidden
                tabIndex={-1}
                onClick={closeMenu}
              />
              <div className="profile-overflow-menu__dropdown" role="menu">
                {reportOpen ? (
                  <form className="profile-overflow-report" onSubmit={onReportSubmit}>
                    <label className="small">
                      Why are you reporting this profile?
                      <textarea
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        rows={3}
                        required
                        maxLength={500}
                        autoFocus
                      />
                    </label>
                    <div className="profile-overflow-report__actions">
                      <button type="submit" className="btn-secondary">
                        Submit
                      </button>
                      <button type="button" className="text-btn" onClick={() => setReportOpen(false)}>
                        Back
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    {blocked ? (
                      <button
                        type="button"
                        role="menuitem"
                        className="profile-overflow-menu__item"
                        onClick={() => {
                          unblockUser(profile.id);
                          closeMenu();
                        }}
                      >
                        Unblock
                      </button>
                    ) : (
                      <button
                        type="button"
                        role="menuitem"
                        className="profile-overflow-menu__item profile-overflow-menu__item--danger"
                        onClick={() => {
                          blockUser(profile.id);
                          closeMenu();
                        }}
                      >
                        Block
                      </button>
                    )}
                    <button
                      type="button"
                      role="menuitem"
                      className="profile-overflow-menu__item profile-overflow-menu__item--danger"
                      onClick={() => setReportOpen(true)}
                    >
                      Report
                    </button>
                  </>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
      {reportSent ? (
        <p className="profile-ig-toast small muted" role="status">
          Report submitted
        </p>
      ) : null}
    </>
  );
}
