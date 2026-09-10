import { Link } from "react-router-dom";

/** Bump when replacing public/izora-icon.png so browsers don't serve a stale file. */
const ICON = "/izora-icon.png?v=2";

type Props = {
  variant?: "full" | "compact";
  className?: string;
};

export function BrandLogo({ variant = "compact", className = "" }: Props) {
  const img =
    variant === "full" ? (
      <img
        src={ICON}
        alt="Izora"
        className="brand-logo-img"
        width={88}
        height={88}
        decoding="async"
      />
    ) : (
      <img
        src={ICON}
        alt="Izora"
        className="brand-logo-mark"
        width={40}
        height={40}
        decoding="async"
      />
    );

  return (
    <Link
      to="/"
      className={`brand-logo brand-logo--${variant} ${className}`.trim()}
      aria-label="Izora home"
    >
      {img}
    </Link>
  );
}
