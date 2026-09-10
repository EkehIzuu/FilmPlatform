import type { ReactNode } from "react";

type Props = {
  children?: ReactNode;
  disabled?: boolean;
  busy?: boolean;
  busyLabel?: string;
};

export function PostSubmitButton({
  children = "Post",
  disabled = false,
  busy = false,
  busyLabel = "Posting…",
}: Props) {
  return (
    <button
      type="submit"
      className="btn-post-submit"
      disabled={disabled || busy}
    >
      <span className="btn-post-submit-shine" aria-hidden />
      <span className="btn-post-submit-content">
        <svg
          className="btn-post-submit-icon"
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
          <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
        <span>{busy ? busyLabel : children}</span>
      </span>
    </button>
  );
}
