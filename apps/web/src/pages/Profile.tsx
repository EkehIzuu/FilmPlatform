import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProfileFeed } from "../components/ProfileFeed";
import { ProfileHeader } from "../components/ProfileHeader";
import { useAuth } from "../context/AuthContext";
import { useFilmData } from "../context/FilmDataContext";
import { useBackSwipe } from "../hooks/useBackSwipe";
import { buildUserFeed, type UserFeedFilter } from "../lib/userFeed";
import { isMediaStorageEnabled, uploadAvatarFile } from "../services/mediaStorage";

type Tab = { id: UserFeedFilter; icon: string; label: string };

const TABS: Tab[] = [
  { id: "story", icon: "▶", label: "Clips" },
  { id: "post", icon: "▤", label: "Posts" },
  { id: "all", icon: "⊞", label: "All" },
];

const CREATOR_TABS: Tab[] = [
  { id: "title", icon: "🎬", label: "Titles" },
  { id: "live", icon: "●", label: "Live" },
];

export function Profile() {
  const { user, updateProfile } = useAuth();
  const { state } = useFilmData();
  const navigate = useNavigate();
  const { ref: swipeRef, handlers: swipeHandlers } = useBackSwipe(() => {
    if (typeof window !== "undefined" && window.history.length > 1) navigate(-1);
    else navigate("/watch/clips");
  });
  const [filter, setFilter] = useState<UserFeedFilter>("story");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);

  const feed = useMemo(
    () => (user ? buildUserFeed(state, user.id) : []),
    [state, user],
  );

  const postCount = useMemo(
    () => feed.filter((i) => i.kind === "story" || i.kind === "post").length,
    [feed],
  );

  const tabs = useMemo(() => {
    if (!user?.isCreator) return TABS;
    return [...TABS, ...CREATOR_TABS];
  }, [user?.isCreator]);

  if (!user) return null;

  const onAvatarPick = async (file: File | undefined) => {
    if (!file) return;
    setAvatarBusy(true);
    try {
      if (isMediaStorageEnabled()) {
        const { storagePath } = await uploadAvatarFile({ userId: user.id, file });
        await updateProfile({ avatarUrl: storagePath });
      } else {
        await updateProfile({ avatarUrl: URL.createObjectURL(file) });
      }
    } finally {
      setAvatarBusy(false);
      if (avatarRef.current) avatarRef.current.value = "";
    }
  };

  return (
    <div className="page page--full profile-home profile-home--ig" ref={swipeRef} {...swipeHandlers}>
      <input
        ref={avatarRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        hidden
        onChange={(e) => void onAvatarPick(e.target.files?.[0])}
      />

      <ProfileHeader
        user={user}
        isOwner
        postCount={postCount}
        avatarBusy={avatarBusy}
        onChangeAvatar={() => avatarRef.current?.click()}
      />

      <section className="profile-feed-section profile-feed-section--ig">
        <div className="profile-ig-tabs" role="tablist" aria-label="Profile content">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={filter === tab.id}
              aria-label={tab.label}
              title={tab.label}
              className={filter === tab.id ? "profile-ig-tab active" : "profile-ig-tab"}
              onClick={() => setFilter(tab.id)}
            >
              <span aria-hidden>{tab.icon}</span>
            </button>
          ))}
        </div>
        <ProfileFeed
          items={feed}
          filter={filter}
          emptyHint="Nothing here yet — post a clip or join a community."
          layout={filter === "story" ? "grid" : "list"}
        />
      </section>
    </div>
  );
}
