import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type Props = {
  to: string;
  children: ReactNode;
  className?: string;
};

export function BackLink({ to, children, className = "" }: Props) {
  return (
    <Link to={to} className={`back-link ${className}`.trim()}>
      <svg
        className="back-link-chevron"
        viewBox="0 0 24 24"
        width={18}
        height={18}
        aria-hidden
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
      <span className="back-link-text">{children}</span>
    </Link>
  );
}
