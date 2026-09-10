import { Link } from "react-router-dom";

export type PremiereRecoveryAction = {
  label: string;
  to: string;
  primary?: boolean;
};

type Props = {
  variant: "error" | "success" | "info" | "warn";
  message: string;
  actions?: PremiereRecoveryAction[];
};

export function PremiereRecoveryBanner({ variant, message, actions = [] }: Props) {
  return (
    <div
      className={`premiere-recovery-banner premiere-recovery-banner--${variant}`}
      role={variant === "error" ? "alert" : "status"}
    >
      <p className="premiere-recovery-banner-message">{message}</p>
      {actions.length > 0 ? (
        <p className="premiere-recovery-banner-actions">
          {actions.map((a) =>
            a.primary ? (
              <Link key={a.to + a.label} to={a.to} className="auth-submit premiere-recovery-cta">
                {a.label}
              </Link>
            ) : (
              <Link key={a.to + a.label} to={a.to} className="btn-secondary premiere-recovery-cta">
                {a.label}
              </Link>
            ),
          )}
        </p>
      ) : null}
    </div>
  );
}
