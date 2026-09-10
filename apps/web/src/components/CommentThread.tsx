import { FormEvent, useState } from "react";
import type { EngagementTargetType } from "../domain/types";
import { useAuth } from "../context/AuthContext";
import { useFilmData } from "../context/FilmDataContext";
import { ReportButton } from "./ReportButton";
import { UserAvatar } from "./UserAvatar";

type Props = {
  targetType: EngagementTargetType;
  targetId: string;
  defaultOpen?: boolean;
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function CommentThread({ targetType, targetId, defaultOpen = false }: Props) {
  const { user } = useAuth();
  const { listComments, addComment, deleteComment, commentCount } = useFilmData();
  const [open, setOpen] = useState(defaultOpen);
  const [draft, setDraft] = useState("");

  const comments = listComments(targetType, targetId);
  const total = commentCount(targetType, targetId);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    addComment(targetType, targetId, draft);
    setDraft("");
    setOpen(true);
  };

  return (
    <div className="comment-thread">
      <button
        type="button"
        className="comment-thread-toggle text-btn"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Hide" : "View"} comments ({total})
      </button>

      {open ? (
        <div className="comment-thread-body">
          {comments.length === 0 ? (
            <p className="muted small">No comments yet — start the thread.</p>
          ) : (
            <ul className="comment-list">
              {comments.map((c) => (
                <li key={c.id} className="comment-item">
                  <UserAvatar
                    displayName={c.authorName}
                    avatarUrl={c.authorAvatarUrl}
                    size="sm"
                  />
                  <div className="comment-item-main">
                    <div className="comment-item-head">
                      <strong>{c.authorName}</strong>
                      <span className="muted small">{formatWhen(c.createdAt)}</span>
                      {user?.id === c.authorId ? (
                        <button
                          type="button"
                          className="text-btn comment-delete"
                          onClick={() => deleteComment(c.id)}
                        >
                          Delete
                        </button>
                      ) : user ? (
                        <ReportButton targetType="comment" targetId={c.id} className="comment-report" />
                      ) : null}
                    </div>
                    <p className="comment-body">{c.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {user ? (
            <form className="comment-compose" onSubmit={onSubmit}>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Add a comment…"
                rows={2}
                maxLength={2000}
              />
              <button type="submit" className="btn-secondary" disabled={!draft.trim()}>
                Post comment
              </button>
            </form>
          ) : (
            <p className="muted small">Sign in to comment.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
