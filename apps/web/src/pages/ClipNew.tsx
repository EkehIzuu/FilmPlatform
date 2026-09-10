import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BackLink } from "../components/BackLink";
import { MediaPickZone } from "../components/MediaPickZone";
import { PostSubmitButton } from "../components/PostSubmitButton";
import { useAuth } from "../context/AuthContext";
import { useFilmData } from "../context/FilmDataContext";

export function ClipNew() {
  const { user } = useAuth();
  const { addStory, dataReady, dataMode } = useFilmData();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | undefined>();
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!user) return null;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (dataMode === "supabase" && !dataReady) {
      setErr("Still loading your account data. Wait a moment, then try again.");
      return;
    }
    if (!file) {
      setErr("Add a photo or video first.");
      return;
    }
    setBusy(true);
    try {
      await addStory({ file, caption });
      navigate("/clips", { replace: true });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Could not post clip. Try again.";
      setErr(message);
      console.error("[clip-new] post failed:", message, error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <header className="settings-inline-head">
        <BackLink to="/clips" className="back-link--flush settings-inline-back" aria-label="Back to clips">
          ←
        </BackLink>
        <h1 className="settings-inline-title">Post a clip</h1>
      </header>
      <p className="page-header-sub">Visible for 24 hours — fans and creators can post.</p>

      {err ? (
        <div className="clip-post-error-banner" role="alert">
          {err}
        </div>
      ) : null}

      <form className="stream-block stack-form clip-new-form" onSubmit={(e) => void onSubmit(e)}>
        <MediaPickZone disabled={busy} onFile={setFile} />
        <label>
          Caption (optional)
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={2}
            maxLength={280}
            placeholder="Behind the scenes, reaction, trailer tease…"
          />
        </label>

        <p className="small muted">
          Hosting scheduled lives or ticketed premiere shows is only available in creator mode under
          Creator tools.
        </p>
        <PostSubmitButton busy={busy} busyLabel="Posting…" disabled={!file}>
          Post clip
        </PostSubmitButton>
      </form>
    </div>
  );
}
