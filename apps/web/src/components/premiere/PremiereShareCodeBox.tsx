import { useMemo, useState } from "react";
import { shareOrCopy } from "@/lib/share";

type Props = {
  code: string;
  titleName?: string;
  source?: string;
};

export function PremiereShareCodeBox({ code, titleName, source = "code" }: Props) {
  const [toast, setToast] = useState<string | null>(null);
  const redeemUrl = useMemo(() => {
    const base = `${window.location.origin}/premiere/join`;
    const p = new URLSearchParams();
    p.set("code", code);
    p.set("src", source);
    p.set("ref", "share_code");
    return `${base}?${p.toString()}`;
  }, [code, source]);

  const onShare = async () => {
    const payload = {
      title: titleName ? `${titleName} — Share code` : "Premiere share code",
      text: `Use this code to redeem a premiere seat: ${code}`,
      url: redeemUrl,
    };
    const res = await shareOrCopy(payload);
    setToast(res.ok ? (res.method === "share" ? "Sharing opened." : "Redeem link copied.") : "Could not share right now.");
    window.setTimeout(() => setToast(null), 2500);
  };

  const onCopy = async () => {
    const payload = {
      title: "Premiere share code",
      text: `Redeem code: ${code}`,
      url: redeemUrl,
    };
    const res = await shareOrCopy(payload);
    setToast(res.ok ? "Redeem link copied." : "Copy failed.");
    window.setTimeout(() => setToast(null), 2500);
  };

  return (
    <div className="premiere-share-code-box">
      <p className="small muted">
        Share code: <strong>{code}</strong>
      </p>
      <p className="premiere-share-actions">
        <button type="button" className="btn-secondary premiere-share-btn" onClick={() => void onShare()}>
          Share code
        </button>
        <button type="button" className="btn-secondary premiere-share-btn" onClick={() => void onCopy()}>
          Copy redeem link
        </button>
      </p>
      <p className="small muted premiere-share-link-row">
        <code className="premiere-share-link">{redeemUrl}</code>
      </p>
      {toast ? <p className="small muted premiere-share-toast">{toast}</p> : null}
    </div>
  );
}

