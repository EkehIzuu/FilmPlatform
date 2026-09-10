import { Link } from "react-router-dom";
import type { StoryClip } from "../domain/types";
import { UserAvatar } from "./UserAvatar";

type AuthorGroup = {
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  stories: StoryClip[];
};

function groupByAuthor(stories: StoryClip[]): AuthorGroup[] {
  const map = new Map<string, AuthorGroup>();
  for (const story of stories) {
    let group = map.get(story.authorId);
    if (!group) {
      group = {
        authorId: story.authorId,
        authorName: story.authorName,
        authorAvatarUrl: story.authorAvatarUrl,
        stories: [],
      };
      map.set(story.authorId, group);
    }
    group.stories.push(story);
  }
  return [...map.values()].sort((a, b) =>
    (b.stories[0]?.createdAt ?? "").localeCompare(a.stories[0]?.createdAt ?? ""),
  );
}

type Props = {
  stories: StoryClip[];
  currentUserId?: string;
  showAdd?: boolean;
};

export function StoryTray({ stories, currentUserId, showAdd = true }: Props) {
  const groups = groupByAuthor(stories);
  const myStories = currentUserId
    ? stories.filter((s) => s.authorId === currentUserId)
    : [];

  return (
    <div className="story-tray" role="list" aria-label="Active stories">
      {showAdd ? (
        <Link
          to="/clips/new"
          className="story-ring story-ring--add"
          role="listitem"
          title="Post a clip"
        >
          <span className="story-ring-inner story-ring-inner--add">+</span>
          <span className="story-ring-label">Your clip</span>
        </Link>
      ) : null}
      {currentUserId && myStories.length > 0 ? (
        <Link
          to={`/clips?user=${encodeURIComponent(currentUserId)}`}
          className="story-ring story-ring--mine"
          role="listitem"
          title="Your stories"
        >
          <UserAvatar
            displayName={myStories[0].authorName}
            avatarUrl={myStories[0].authorAvatarUrl}
            size="lg"
            className="story-ring-avatar"
          />
          <span className="story-ring-label">You</span>
        </Link>
      ) : null}
      {groups
        .filter((g) => g.authorId !== currentUserId)
        .map((g) => (
          <Link
            key={g.authorId}
            to={`/clips?user=${encodeURIComponent(g.authorId)}`}
            className="story-ring"
            role="listitem"
            title={g.authorName}
          >
            <UserAvatar
              displayName={g.authorName}
              avatarUrl={g.authorAvatarUrl}
              size="lg"
              className="story-ring-avatar"
            />
            <span className="story-ring-label">{g.authorName.split(" ")[0]}</span>
          </Link>
        ))}
    </div>
  );
}
