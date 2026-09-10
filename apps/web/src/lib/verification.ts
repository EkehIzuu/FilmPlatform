import type { CreatorTier, CreatorVerificationStatus, User } from "../domain/types";

export type { CreatorVerificationStatus };

export function isEmailVerifiedUser(user: User | null, emailVerified?: boolean): boolean {
  if (!user) return false;
  if (emailVerified !== undefined) return emailVerified;
  return user.emailVerified !== false;
}

export function isCreatorVerified(user: User): boolean {
  if (!user.isCreator) return false;
  if (user.creatorVerificationStatus === "approved") return true;
  return user.creatorTier === "verified" || user.creatorTier === "featured";
}

export function verificationStatusLabel(status: CreatorVerificationStatus): string {
  switch (status) {
    case "pending":
      return "Verification pending";
    case "approved":
      return "Verified creator";
    case "rejected":
      return "Verification declined";
    default:
      return "Not verified";
  }
}

export function canRequestCreatorVerification(user: User): boolean {
  return (
    user.isCreator &&
    (user.creatorVerificationStatus === "none" ||
      user.creatorVerificationStatus === "rejected" ||
      !user.creatorVerificationStatus)
  );
}
