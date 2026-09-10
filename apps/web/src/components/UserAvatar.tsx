import { profileAvatarSrc, profileInitials } from "../lib/profileDisplay";

type Props = {
  displayName: string;
  email?: string;
  avatarUrl?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const SIZE_PX = { sm: 32, md: 44, lg: 86, xl: 86 } as const;

export function UserAvatar({
  displayName,
  email,
  avatarUrl,
  size = "md",
  className = "",
}: Props) {
  const px = SIZE_PX[size];
  const src = profileAvatarSrc(avatarUrl);
  const initials = profileInitials(displayName, email);

  if (src) {
    return (
      <img
        src={src}
        alt=""
        width={px}
        height={px}
        className={`user-avatar user-avatar--${size} ${className}`.trim()}
        style={{ width: px, height: px }}
      />
    );
  }

  return (
    <span
      className={`user-avatar user-avatar--${size} user-avatar--fallback ${className}`.trim()}
      style={{ width: px, height: px, fontSize: size === "lg" || size === "xl" ? "1.75rem" : size === "md" ? "0.95rem" : "0.75rem" }}
      aria-hidden
    >
      {initials}
    </span>
  );
}
