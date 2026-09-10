import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useFilmData } from "../context/FilmDataContext";
import type { User } from "../domain/types";
import { userFollowCounts } from "../lib/profileFollowCounts";
import { formatLocation } from "../lib/profileDetails";
import { resolveMediaUrl } from "../services/mediaStorage";
import { isCreatorVerified } from "../lib/verification";
import { UserAvatar } from "./UserAvatar";
import { VerifiedBadge } from "./VerifiedBadge";

type Props = {
  user: User;
  isOwner?: boolean;
  onChangeAvatar?: () => void;
  avatarBusy?: boolean;
  postCount?: number;
  /** Follow / Message / ⋮ for visitors, or pass custom owner actions. */
  actionRow?: ReactNode;
};

function ProfileIgStats({
  userId,
  postCount,
}: {
  userId: string;
  postCount: number;
}) {
  const { state } = useFilmData();
  const { following, followers } = useMemo(
    () => userFollowCounts(state.follows, userId),
    [state.follows, userId],
  );

  return (
    <div className="profile-ig-stats" aria-label="Profile stats">
      <div className="profile-ig-stat">
        <strong>{postCount}</strong>
        <span>posts</span>
      </div>
      <div className="profile-ig-stat">
        <strong>{followers}</strong>
        <span>followers</span>
      </div>
      <div className="profile-ig-stat">
        <strong>{following}</strong>
        <span>following</span>
      </div>
    </div>
  );
}

export function ProfileHeader({
  user,
  isOwner = false,
  onChangeAvatar,
  avatarBusy = false,
  postCount = 0,
  actionRow,
}: Props) {
  const location = formatLocation(user.city, user.region);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);
  const avatarSrc = resolveMediaUrl(user.avatarUrl);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(target)) {
        setAvatarMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const ownerActions =
    isOwner && !actionRow ? (
      <div className="profile-ig-actions">
        <Link to="/profile/settings" className="profile-ig-action-btn">
          Edit profile
        </Link>
        {user.isCreator ? (
          <Link to="/creator" className="profile-ig-action-btn profile-ig-action-btn--accent">
            Studio
          </Link>
        ) : null}
      </div>
    ) : null;

  return (
    <section className="profile-ig">
      <header className="profile-ig-topbar">
        <span className="profile-ig-topbar-spacer" aria-hidden />
        <h1 className="profile-ig-topbar-title">
          {user.username ? `@${user.username}` : user.displayName}
        </h1>
        {isOwner ? (
          <Link
            to="/profile/settings"
            className="profile-ig-topbar-btn"
            aria-label="Settings"
            title="Settings"
          >
            ⚙
          </Link>
        ) : (
          <span className="profile-ig-topbar-spacer" aria-hidden />
        )}
      </header>

      <div className="profile-ig-main">
        <div className="profile-ig-avatar-wrap">
          {isOwner && onChangeAvatar ? (
            <div className="profile-avatar-wrap" ref={avatarMenuRef}>
              <UserAvatar
                displayName={user.displayName}
                email={user.email}
                avatarUrl={user.avatarUrl}
                size="xl"
                className="profile-ig-avatar"
              />
              <button
                type="button"
                className="profile-avatar-camera-btn"
                title="Change profile photo"
                aria-label="Change profile photo"
                disabled={avatarBusy}
                onClick={() => setAvatarMenuOpen((open) => !open)}
              >
                {avatarBusy ? "…" : "📷"}
              </button>
              {avatarMenuOpen ? (
                <div
                  className="profile-media-menu profile-media-menu--avatar"
                  role="menu"
                  aria-label="Profile photo options"
                >
                  <button
                    type="button"
                    className="profile-media-menu-item"
                    onClick={() => {
                      if (avatarSrc) window.open(avatarSrc, "_blank", "noopener,noreferrer");
                      setAvatarMenuOpen(false);
                    }}
                    disabled={!avatarSrc}
                  >
                    View photo
                  </button>
                  <button
                    type="button"
                    className="profile-media-menu-item"
                    onClick={() => {
                      onChangeAvatar();
                      setAvatarMenuOpen(false);
                    }}
                  >
                    Change photo
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <UserAvatar
              displayName={user.displayName}
              email={user.email}
              avatarUrl={user.avatarUrl}
              size="xl"
              className="profile-ig-avatar"
            />
          )}
        </div>

        <ProfileIgStats userId={user.id} postCount={postCount} />
      </div>

      <div className="profile-ig-bio">
        <p className="profile-ig-name">
          {user.displayName}
          <VerifiedBadge user={user} className="profile-hero-verified" />
          {isCreatorVerified(user) ? (
            <span className="profile-ig-verified-pill" aria-label="Verified">
              ✓
            </span>
          ) : null}
        </p>
        {user.headline ? <p className="profile-ig-headline">{user.headline}</p> : null}
        {user.bio ? <p className="profile-ig-text">{user.bio}</p> : null}
        {location ? <p className="profile-ig-text profile-ig-text--muted">{location}</p> : null}
        {user.websiteUrl || user.instagram ? (
          <p className="profile-ig-links">
            {user.websiteUrl ? (
              <a href={user.websiteUrl} target="_blank" rel="noreferrer" className="profile-ig-link">
                {user.websiteUrl.replace(/^https?:\/\//, "")}
              </a>
            ) : null}
            {user.instagram ? (
              <a
                href={`https://instagram.com/${user.instagram}`}
                target="_blank"
                rel="noreferrer"
                className="profile-ig-link"
              >
                @{user.instagram}
              </a>
            ) : null}
          </p>
        ) : null}
      </div>

      {actionRow ? <div className="profile-ig-actions-wrap">{actionRow}</div> : ownerActions}
    </section>
  );
}
