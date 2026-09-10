import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BackLink } from "./BackLink";
import { BecomeCreatorBanner } from "./BecomeCreatorBanner";
import { useAuth } from "../context/AuthContext";

type Props = {
  children: ReactNode;
  /** When true, show page tools if user enables creator mid-session (banner only on block). */
  showEnableInline?: boolean;
};

/** Lives, cinema, title uploads, and premiere hosting require a creator account. */
export function RequireCreator({ children, showEnableInline = true }: Props) {
  const { user } = useAuth();

  if (!user) return null;

  if (user.isCreator) return <>{children}</>;

  return (
    <div className="page page--full">
      {showEnableInline ? <BecomeCreatorBanner /> : null}
      <h1 className="profile-hero-name" style={{ margin: "1rem 0 0.5rem" }}>
        Creator tools need an enabled account
      </h1>
      <p className="muted small">
        Switching to <strong>Creator</strong> in the header only changes the layout. Tap{" "}
        <strong>Enable creator account</strong> above to unlock titles, uploads, lives, and cinema.
        Fans can always post short clips on <Link to="/clips">Clips</Link>.
      </p>
      <p className="small">
        <Link to="/" className="text-link">
          Back to Studio
        </Link>
        {" · "}
        <BackLink to="/profile">Profile</BackLink>
      </p>
    </div>
  );
}
