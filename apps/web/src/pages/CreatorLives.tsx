import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useFilmData } from "../context/FilmDataContext";
import { livePathForScheduled, profileLivePath } from "../lib/livePaths";

export function CreatorLives() {
  const { user } = useAuth();
  const { listMyTitles, scheduleLive, listScheduledLives } = useFilmData();
  const titles = listMyTitles();
  const mine = listScheduledLives(true).sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  const [titleId, setTitleId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [description, setDescription] = useState("");

  const myLivePath = user?.username ? profileLivePath(user.username) : null;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!user?.isCreator || !titleId || !startsAt) return;
    scheduleLive({
      titleId,
      startsAt: new Date(startsAt).toISOString(),
      description,
    });
    setDescription("");
  };

  return (
    <div className="page">
      <PageHeader
        title="Profile lives"
        subtitle="Q&A, BTS, premiere-night chat — fans open your profile live, never a room number."
      />

      {!user?.isCreator ? (
        <p className="hint-banner">Creator account required — see Profile.</p>
      ) : !user.username ? (
        <p className="hint-banner">
          Set a username in{" "}
          <Link to="/profile/settings" className="text-link">
            Settings
          </Link>{" "}
          so fans get a shareable live link like <code>/u/you/live</code>.
        </p>
      ) : null}

      {user?.isCreator && myLivePath ? (
        <p className="hint-banner small">
          Your live page:{" "}
          <Link to={myLivePath} className="text-link">
            {myLivePath}
          </Link>
        </p>
      ) : null}

      <div className="creator-manage-layout">
      {!user?.isCreator ? null : titles.length === 0 ? (
        <p className="hint-banner">Create a title under My titles first.</p>
      ) : (
        <form className="card stack-form" onSubmit={onSubmit}>
          <label>
            Title
            <select value={titleId} onChange={(e) => setTitleId(e.target.value)} required>
              <option value="">Choose…</option>
              {titles.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Starts at
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
            />
          </label>
          <label>
            Description
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </label>
          <button type="submit">Schedule</button>
        </form>
      )}

      <section style={{ marginTop: "1.5rem" }}>
        <h2 className="section-label">Your scheduled lives</h2>
        {mine.length === 0 ? (
          <div className="empty-state">
            <p>None yet — schedule one above.</p>
            {myLivePath ? (
              <Link to={myLivePath} className="text-link">
                Open your live page →
              </Link>
            ) : null}
          </div>
        ) : (
          <ul className="schedule-list">
            {mine.map((l) => (
              <li key={l.id} className="schedule-row">
                <div>
                  <strong>{l.title}</strong>
                  <div className="muted small">
                    {new Date(l.startsAt).toLocaleString()}
                    {user?.username ? (
                      <>
                        {" "}
                        · <code>/u/{user.username}/live</code>
                      </>
                    ) : null}
                  </div>
                  {l.description ? <p className="small">{l.description}</p> : null}
                </div>
                <Link className="text-link" to={livePathForScheduled(l)}>
                  Open →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      </div>
    </div>
  );
}
