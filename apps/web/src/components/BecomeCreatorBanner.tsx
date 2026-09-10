import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type Props = {
  compact?: boolean;
};

/** Shown when user is in creator mode but has not enabled a creator account yet. */
export function BecomeCreatorBanner({ compact = false }: Props) {
  const { user, updateProfile } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!user || user.isCreator) return null;

  const enable = async () => {
    setBusy(true);
    try {
      await updateProfile({ isCreator: true, creatorTier: user.creatorTier ?? "free" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`become-creator-banner${compact ? " become-creator-banner--compact" : ""}`}>
      <div className="become-creator-banner-text">
        <strong>Enable creator tools</strong>
        <p className="small muted">
          Creator mode is on, but your account is still a fan profile. Turn on creator tools to
          upload titles, host lives, run cinema premieres, and use the full studio. You can still
          post clips anytime on <Link to="/clips">Clips</Link>.
        </p>
      </div>
      <div className="become-creator-banner-actions">
        <button type="button" className="studio-panel-cta" disabled={busy} onClick={() => void enable()}>
          {busy ? "Enabling…" : "Enable creator account"}
        </button>
        <Link to="/profile/settings" className="btn-secondary studio-panel-btn">
          Settings
        </Link>
      </div>
    </div>
  );
}
