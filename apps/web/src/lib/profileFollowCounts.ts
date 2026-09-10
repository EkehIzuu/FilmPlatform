import type { FollowEdge } from "../domain/types";

export function userFollowCounts(follows: FollowEdge[], userId: string) {
  let following = 0;
  let followers = 0;
  for (const edge of follows) {
    if (edge.targetType !== "user") continue;
    if (edge.followerId === userId) following += 1;
    if (edge.targetId === userId) followers += 1;
  }
  return { following, followers };
}
