import { useEffect } from "react";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";
import { loadSocialPatch } from "../services/socialSync";
import { showLocalNotification } from "../lib/pushNotifications";

type Options = {
  userId: string | undefined;
  pushEnabled: boolean;
  enabled: boolean;
  onSocialPatch: (patch: Awaited<ReturnType<typeof loadSocialPatch>>) => void;
};

export function useFilmRealtime({ userId, pushEnabled, enabled, onSocialPatch }: Options) {
  useEffect(() => {
    if (!enabled || !userId || !isSupabaseConfigured()) return;

    const supabase = getSupabase();
    if (!supabase) return;

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const refresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        void loadSocialPatch(userId).then((patch) => {
          if (patch) onSocialPatch(patch);
        });
      }, 400);
    };

    const maybePush = (title: string, body: string, href?: string, tag?: string) => {
      if (!pushEnabled) return;
      showLocalNotification(title, { body, tag, href, whenVisible: true });
    };

    const channel = supabase
      .channel(`film-social-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "direct_messages" },
        () => refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "direct_conversations" },
        () => refresh(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          refresh();
          const row = payload.new as {
            message?: string;
            user_id?: string;
            href?: string;
            kind?: string;
          };
          if (row.user_id === userId && row.message) {
            maybePush(
              row.kind === "message" ? "New message" : "Izora",
              row.message,
              row.href,
              `notif-${row.kind ?? "app"}`,
            );
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "user_stories" },
        () => refresh(),
      )
      // Live engagement: likes, comments and follows from anyone.
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "content_likes" },
        () => refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "post_likes" },
        () => refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "content_comments" },
        () => refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "follows" },
        () => refresh(),
      )
      .subscribe();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [userId, pushEnabled, enabled, onSocialPatch]);
}
