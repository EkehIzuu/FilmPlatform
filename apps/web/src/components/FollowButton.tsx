type Props = {
  following: boolean;
  onClick: () => void;
  size?: "sm" | "md";
  followLabel?: string;
  followingLabel?: string;
  className?: string;
};

function PlusIcon() {
  return (
    <svg className="btn-follow__icon" viewBox="0 0 16 16" aria-hidden>
      <path
        fill="currentColor"
        d="M8 3.5a.5.5 0 0 1 .5.5v3.5H12a.5.5 0 0 1 0 1H8.5V12a.5.5 0 0 1-1 0V8.5H4a.5.5 0 0 1 0-1h3.5V4A.5.5 0 0 1 8 3.5z"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="btn-follow__icon" viewBox="0 0 16 16" aria-hidden>
      <path
        fill="currentColor"
        d="M12.207 4.793a1 1 0 0 1 0 1.414l-5 5a1 1 0 0 1-1.414 0l-2.5-2.5a1 1 0 1 1 1.414-1.414L6.5 9.086l4.293-4.293a1 1 0 0 1 1.414 0z"
      />
    </svg>
  );
}

export function FollowButton({
  following,
  onClick,
  size = "md",
  followLabel = "Follow",
  followingLabel = "Following",
  className = "",
}: Props) {
  return (
    <button
      type="button"
      className={[
        "btn-follow",
        size === "sm" ? "btn-follow--sm" : "",
        following ? "btn-follow--following" : "btn-follow--cta",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
      aria-pressed={following}
    >
      {following ? <CheckIcon /> : <PlusIcon />}
      <span className="btn-follow__label">{following ? followingLabel : followLabel}</span>
    </button>
  );
}
