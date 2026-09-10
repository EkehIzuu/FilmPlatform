import { formatCountdown, getPremiereTimeline } from "@/domain/premiereSync";
import type { PremiereEvent, PremiereReservation, FilmDataState, Title } from "@/domain/types";

export type MyTicketRow = {
  reservation: PremiereReservation;
  event: PremiereEvent;
  title?: Title;
  phase: ReturnType<typeof getPremiereTimeline>["phase"];
  statusLabel: string;
  canJoin: boolean;
  canWatchProfile: boolean;
};

export function buildMyTicketRows(state: FilmDataState, userId: string): MyTicketRow[] {
  const now = Date.now();
  return state.premiereReservations
    .filter((r) => r.userId === userId)
    .map((reservation) => {
      const event = state.premiereEvents.find((e) => e.id === reservation.eventId);
      if (!event) return null;
      const title = state.titles.find((t) => t.id === event.titleId);
      const tl = getPremiereTimeline(event, now);
      const phase = tl.phase;

      let statusLabel = "Upcoming";
      let canJoin = true;
      if (phase === "lobby") {
        statusLabel = `Starts in ${formatCountdown(tl.secondsUntilFeature)}`;
      } else if (phase === "ads") {
        statusLabel = "Pre-show live";
      } else if (phase === "feature") {
        statusLabel = "Premiere on now";
      } else if (phase === "ended") {
        statusLabel = "Premiere ended";
        canJoin = false;
      }

      const canWatchProfile =
        phase === "ended" &&
        !!title &&
        title.status === "published" &&
        title.kind === "movie";

      return {
        reservation,
        event,
        title,
        phase,
        statusLabel,
        canJoin,
        canWatchProfile,
      };
    })
    .filter((x): x is MyTicketRow => x != null)
    .sort(
      (a, b) =>
        new Date(a.event.featureStartsAt).getTime() -
        new Date(b.event.featureStartsAt).getTime(),
    );
}

export function splitTicketRows(rows: MyTicketRow[]) {
  const upcoming = rows.filter((r) => r.phase !== "ended");
  const past = rows.filter((r) => r.phase === "ended");
  return { upcoming, past };
}
