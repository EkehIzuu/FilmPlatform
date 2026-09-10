/** Merge remote patches with local state by id (remote wins on conflict). */

export function mergeById<T extends { id: string }>(
  prev: T[],
  next: T[],
  sort?: (a: T, b: T) => number,
): T[] {
  const map = new Map<string, T>();
  for (const row of prev) map.set(row.id, row);
  for (const row of next) map.set(row.id, row);
  const merged = [...map.values()];
  if (sort) merged.sort(sort);
  return merged;
}
