import type { Title, User } from "../domain/types";

export function userAge(user: User | null): number | null {
  if (!user) return null;
  const now = new Date();
  if (user.dateOfBirth) {
    const born = new Date(user.dateOfBirth + "T12:00:00");
    if (!Number.isNaN(born.getTime())) {
      let age = now.getFullYear() - born.getFullYear();
      const m = now.getMonth() - born.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < born.getDate())) age -= 1;
      return Math.max(0, age);
    }
  }
  if (!user.birthYear) return null;
  return Math.max(0, now.getFullYear() - user.birthYear);
}

export function canViewTitle(user: User | null, title: Title): boolean {
  const min = title.minAge ?? 0;
  if (min <= 0) return true;
  if (user?.adultConfirmed && min <= 18) return true;
  const age = userAge(user);
  if (age === null) return min <= 13;
  return age >= min;
}
