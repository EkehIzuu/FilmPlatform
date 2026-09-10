import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { BackLink } from "../components/BackLink";
import { PageHeader } from "../components/PageHeader";
import { ProfileFeed } from "../components/ProfileFeed";
import { ProfileHeader } from "../components/ProfileHeader";
import { ProfileVisitorActions } from "../components/ProfileVisitorActions";
import { useAuth } from "../context/AuthContext";
import { useFilmData } from "../context/FilmDataContext";
import { useBackSwipe } from "../hooks/useBackSwipe";
import type { User } from "../domain/types";
import { buildUserFeed, type UserFeedFilter } from "../lib/userFeed";
import { isSupabaseConfigured } from "../lib/supabase";
import { fetchProfileByUsername } from "../services/supabaseProfile";

const TABS: { id: UserFeedFilter; icon: string; label: string }[] = [
  { id: "story", icon: "▶", label: "Clips" },
  { id: "post", icon: "▤", label: "Posts" },
  { id: "all", icon: "⊞", label: "All" },
];

export function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const { user: sessionUser } = useAuth();
  const { state, openConversationWith, toggleFollow, isFollowing } = useFilmData();
  const navigate = useNavigate();
  const { ref: swipeRef, handlers: swipeHandlers } = useBackSwipe(() => {
    if (typeof window !== "undefined" && window.history.length > 1) navigate(-1);
    else navigate("/watch/clips");
  });
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<UserFeedFilter>("story");

  useEffect(() => {
    if (!username) {
      setProfile(null);
      setLoading(false);
      return;
    }

    if (sessionUser?.username === username) {
      setProfile(sessionUser);
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured()) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    void fetchProfileByUsername(username).then((p) => {
      setProfile(p);
      setLoading(false);
    });
  }, [username, sessionUser]);

  const feed = useMemo(
    () => (profile ? buildUserFeed(state, profile.id) : []),
    [state, profile],
  );

  const postCount = useMemo(
    () => feed.filter((i) => i.kind === "story" || i.kind === "post").length,
    [feed],
  );

  const followsProfile = profile ? isFollowing("user", profile.id) : false;
  const isLockedView = Boolean(profile?.profileLocked) && !followsProfile;

  if (loading) {
    return (
      <div className="page">
        <PageHeader title="Profile" subtitle="Loading…" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page">
        <PageHeader title="Not found" subtitle="No user with this username." />
        <BackLink to="/explore" className="back-link--flush">
          Explore
        </BackLink>
      </div>
    );
  }

  if (sessionUser?.id === profile.id) {
    return <Navigate to="/profile" replace />;
  }

  return (
    <div className="page page--full profile-home profile-home--ig" ref={swipeRef} {...swipeHandlers}>
      <ProfileHeader
        user={profile}
        postCount={isLockedView ? 0 : postCount}
        actionRow={
          <ProfileVisitorActions
            profile={profile}
            isLockedView={isLockedView}
            following={followsProfile}
            onFollow={() => toggleFollow("user", profile.id)}
            onMessage={() => {
              const conv = openConversationWith(profile.id, {
                id: profile.id,
                displayName: profile.displayName,
                username: profile.username,
                avatarUrl: profile.avatarUrl,
                isCreator: profile.isCreator,
              });
              if (conv) navigate(`/inbox/${conv.id}`);
            }}
          />
        }
      />

      {isLockedView ? (
        <section className="profile-feed-section profile-feed-section--ig">
          <p className="profile-ig-locked small muted">
            This profile is locked. Follow to view posts and activity.
          </p>
        </section>
      ) : (
        <section className="profile-feed-section profile-feed-section--ig">
          <div className="profile-ig-tabs" role="tablist" aria-label="Profile content">
            {TABS.map((tab) => (
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
            emptyHint="No public activity yet."
            layout={filter === "story" ? "grid" : "list"}
          />
        </section>
      )}
    </div>
  );
}
