import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BackLink } from "../components/BackLink";
import { PageHeader } from "../components/PageHeader";
import { LiveRoom } from "./LiveRoom";
import { useAuth } from "../context/AuthContext";
import type { User } from "../domain/types";
import { normalizeUsername } from "../lib/profileDisplay";
import { isSupabaseConfigured } from "../lib/supabase";
import { fetchProfileByUsername } from "../services/supabaseProfile";

export function ProfileLive() {
  const { username } = useParams<{ username: string }>();
  const { user: sessionUser } = useAuth();
  const [host, setHost] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) {
      setHost(null);
      setLoading(false);
      return;
    }

    const normalizedRouteUsername = normalizeUsername(username);
    if (
      sessionUser?.username &&
      normalizeUsername(sessionUser.username) === normalizedRouteUsername
    ) {
      setHost(sessionUser);
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured()) {
      setHost({
        id: `local-${username}`,
        email: "",
        displayName: username,
        username,
        isCreator: true,
      });
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetchProfileByUsername(username).then((p) => {
      setHost(p);
      setLoading(false);
    });
  }, [username, sessionUser]);

  if (!username) {
    return (
      <div className="page">
        <PageHeader title="Live" subtitle="Creator not found." />
        <BackLink to="/watch/live">Browse lives</BackLink>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page">
        <PageHeader title="Live" subtitle="Loading…" />
      </div>
    );
  }

  if (!host) {
    return (
      <div className="page">
        <PageHeader title="Live" subtitle={`No profile @${username}.`} />
        <p className="muted small">Check the username or browse scheduled lives.</p>
        <Link to="/watch/live" className="text-link">
          Upcoming lives
        </Link>
      </div>
    );
  }

  return <LiveRoom host={host} />;
}
