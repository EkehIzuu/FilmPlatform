import { isCreatorVerified } from "../lib/verification";
import type { User } from "../domain/types";

type Props = {
  user: User;
  className?: string;
};

export function VerifiedBadge({ user, className = "" }: Props) {
  if (!isCreatorVerified(user)) return null;
  return (
    <span
      className={`verified-badge${className ? ` ${className}` : ""}`}
      title="Verified creator"
      aria-label="Verified creator"
    >
      ✓
    </span>
  );
}
