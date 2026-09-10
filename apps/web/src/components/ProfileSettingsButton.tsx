import { Link } from "react-router-dom";

type Props = {
  className?: string;
};

export function ProfileSettingsButton({ className = "" }: Props) {
  return (
    <Link
      to="/settings"
      className={`profile-settings-btn ${className}`.trim()}
      title="Settings"
      aria-label="Account settings"
    >
      <svg
        className="profile-settings-btn-icon"
        viewBox="0 0 24 24"
        width={20}
        height={20}
        aria-hidden
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    </Link>
  );
}
