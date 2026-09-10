import { formatShowtime } from "@/features/premiere/lib/premiereStatusCopy";
import { shareOrCopy } from "@/lib/share";

type Props = {
  eventId: string;
  titleName: string;
  featureStartsAt: string;
  checkoutBySource: Record<string, number>;
  onTrackClick?: (channel: string) => void;
};

function buildTrackedLink(eventId: string, source: string): string {
  const p = new URLSearchParams();
  p.set("src", source);
  p.set("ref", "creator");
  return `${window.location.origin}/premiere/${eventId}?${p.toString()}`;
}

export function PremierePromoToolkit({
  eventId,
  titleName,
  featureStartsAt,
  checkoutBySource,
  onTrackClick,
}: Props) {
  const showtime = formatShowtime(featureStartsAt);
  const baseText = `🎟️ ${titleName}\nShowtime: ${showtime}\nBuy a seat and join my synced premiere screening.`;

  const openShareUrl = (channel: "whatsapp" | "x" | "telegram") => {
    const link = buildTrackedLink(eventId, channel);
    const text = `${baseText}\n${link}`;
    let href = "";
    if (channel === "whatsapp") {
      href = `https://wa.me/?text=${encodeURIComponent(text)}`;
    } else if (channel === "x") {
      href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    } else {
      href = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(baseText)}`;
    }
    onTrackClick?.(channel);
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const copyPromoLink = async () => {
    const link = buildTrackedLink(eventId, "copy");
    const payload = {
      title: `${titleName} — Premiere`,
      text: baseText,
      url: link,
    };
    const res = await shareOrCopy(payload);
    if (res.ok) onTrackClick?.("copy");
  };

  return (
    <div className="premiere-promo-toolkit card">
      <p className="small muted">
        <strong>Promote with templates</strong> — one tap message links with source tags.
      </p>
      <p className="premiere-promo-actions">
        <button type="button" className="btn-secondary" onClick={() => openShareUrl("whatsapp")}>
          WhatsApp
        </button>
        <button type="button" className="btn-secondary" onClick={() => openShareUrl("x")}>
          X
        </button>
        <button type="button" className="btn-secondary" onClick={() => openShareUrl("telegram")}>
          Telegram
        </button>
        <button type="button" className="btn-secondary" onClick={() => void copyPromoLink()}>
          Copy promo link
        </button>
      </p>
      <p className="small muted">
        Conversions:{" "}
        {`WA ${checkoutBySource.whatsapp ?? 0} · X ${checkoutBySource.x ?? 0} · TG ${
          checkoutBySource.telegram ?? 0
        } · Copy ${checkoutBySource.copy ?? 0} · Room ${checkoutBySource.room ?? 0} · Home ${
          checkoutBySource.home ?? 0
        }`}
      </p>
    </div>
  );
}

