import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LiveBroadcastShell } from "../components/live/LiveBroadcastShell";
import { useAuth } from "../context/AuthContext";
import { liveRoomIdForUser, profileLivePath } from "../lib/livePaths";

export function GoLive() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate("/login", { replace: true });
  }, [user, navigate]);

  if (!user) return null;

  const roomId = liveRoomIdForUser(user);

  // If user has a username, keep the URL canonical so viewers can share it
  useEffect(() => {
    if (user.username?.trim()) {
      const canonical = profileLivePath(user.username);
      if (window.location.pathname !== canonical) {
        navigate(canonical, { replace: true });
      }
    }
  }, [user.username, navigate]);

  return (
    <LiveBroadcastShell
      host={user}
      roomId={roomId}
    />
  );
}
