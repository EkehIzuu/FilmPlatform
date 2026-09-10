import type { StoryClip } from "../domain/types";

/** Stories expire after 24 hours (ephemeral clips). */
export const STORY_TTL_MS = 24 * 60 * 60 * 1000;

export function storyExpiresAt(fromIso: string = new Date().toISOString()): string {
  return new Date(new Date(fromIso).getTime() + STORY_TTL_MS).toISOString();
}

export function isStoryActive(story: StoryClip, now = Date.now()): boolean {
  return new Date(story.expiresAt).getTime() > now;
}

export function activeStories(stories: StoryClip[]): StoryClip[] {
  return stories.filter(isStoryActive).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function storiesByUser(stories: StoryClip[], userId: string): StoryClip[] {
  return activeStories(stories).filter((s) => s.authorId === userId);
}

export function storyMediaType(file: File): "video" | "image" {
  return file.type.startsWith("video/") ? "video" : "image";
}
