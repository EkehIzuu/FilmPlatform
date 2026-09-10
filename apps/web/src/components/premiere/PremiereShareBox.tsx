import { useMemo, useState } from "react";
import { shareOrCopy } from "@/lib/share";
import { formatShowtime } from "@/features/premiere/lib/premiereStatusCopy";

type Props = {
  eventId: string;
  titleName: string;
  featureStartsAt: string;
  variant?: "creator" | "fan";
  source?: string;
};

export function PremiereShareBox({
  eventId,
  titleName,
  featureStartsAt,
  variant = "fan",
  source = "share",
}: Props) {
  const [toast, setToast] = useState<string | null>(null);
  const url = useMemo(() => {
    const base = `${window.location.origin}/premiere/${eventId}`;
    const p = new URLSearchParams();
    p.set("src", source);
    p.set("ref", variant);
    return `${base}?${p.toString()}`;
  }, [eventId, source, variant]);
  const showtime = useMemo(() => formatShowtime(featureStartsAt), [featureStartsAt]);
  const payload = useMemo(
    () => ({
      title: `${titleName} — Premiere`,
      text:
        variant === "creator"
          ? `🎟️ Premiere tickets: “${titleName}”\nShowtime: ${showtime}\nBuy a seat and join the synced screening room.`
          : `🎟️ “${titleName}” premiere\nShowtime: ${showtime}\nBuy a seat and join the synced screening room.`,
      url,
    }),
    [titleName, showtime, url, variant],
  );

  const onShare = async () => {
    setToast(null);
    const res = await shareOrCopy(payload);
    if (res.ok && res.method === "share") setToast("Sharing opened.");
    else if (res.ok && res.method === "copy") setToast("Link copied.");
    else setToast("Could not share. Copy the link manually.");
    window.setTimeout(() => setToast(null), 2500);
  };

  const onCopy = async () => {
    setToast(null);
    const res = await shareOrCopy({ ...payload, text: payload.text });
    if (res.ok) setToast("Link copied.");
    else setToast("Copy failed. Select and copy the link below.");
    window.setTimeout(() => setToast(null), 2500);
  };

  return (
    <section className="premiere-share-box card" aria-label="Share this premiere">
      <p className="premiere-share-eyebrow small muted">
        {variant === "creator" ? "Promote this premiere" : "Share this premiere"}
      </p>
      <p className="premiere-share-title">
        <strong>{titleName}</strong> <span className="muted">·</span>{" "}
        <span className="small muted">Showtime {showtime}</span>
      </p>
      <p className="premiere-share-actions">
        <button type="button" className="auth-submit premiere-share-btn" onClick={() => void onShare()}>
          Share
        </button>
        <button type="button" className="btn-secondary premiere-share-btn" onClick={() => void onCopy()}>
          Copy link
        </button>
      </p>
      <p className="premiere-share-link-row small">
        <span className="muted">Link:</span> <code className="premiere-share-link">{url}</code>
      </p>
      {toast ? <p className="small muted premiere-share-toast">{toast}</p> : null}
    </section>
  );
}

