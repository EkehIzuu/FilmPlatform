import { FormEvent, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useFilmData } from "../context/FilmDataContext";
import type { Title } from "../domain/types";

function visibilityLabel(status: Title["status"]): string {
  return status === "published" ? "Public" : "Only you";
}

export function CreatorTitles() {
  const { user } = useAuth();
  const location = useLocation();
  const { listMyTitles, addTitle, deleteTitle, updateTitle } = useFilmData();
  const mine = listMyTitles();

  useEffect(() => {
    if (location.hash === "#create-title") {
      document.getElementById("create-title")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [location.hash]);

  const [name, setName] = useState("");
  const [kind, setKind] = useState<"movie" | "series">("series");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [genre, setGenre] = useState("");
  const [region, setRegion] = useState("");
  const [minAge, setMinAge] = useState("");
  const [listingBoost, setListingBoost] = useState<Title["listingBoost"]>("none");
  const [subtitleVttUrl, setSubtitleVttUrl] = useState("");
  const [accessMode, setAccessMode] = useState<Title["accessMode"]>("free");
  const [accessPriceCents, setAccessPriceCents] = useState(499);
  const [err, setErr] = useState<string | null>(null);
  const [pricingId, setPricingId] = useState<string | null>(null);
  const [editAccessMode, setEditAccessMode] = useState<Title["accessMode"]>("free");
  const [editPriceCents, setEditPriceCents] = useState(499);

  const reset = () => {
    setName("");
    setDescription("");
    setGenre("");
    setRegion("");
    setMinAge("");
    setSubtitleVttUrl("");
    setAccessMode("free");
    setAccessPriceCents(499);
    setStatus("draft");
    setListingBoost("none");
    setKind("series");
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!user?.isCreator) {
      setErr("Creator account required — sign up with creator checked in Profile.");
      return;
    }
    const ma = minAge.trim() ? Number(minAge) : undefined;
    const t = addTitle({
      name,
      kind,
      description,
      status,
      genre,
      region,
      minAge: Number.isFinite(ma) ? ma : undefined,
      listingBoost,
      subtitleVttUrl: subtitleVttUrl.trim() || undefined,
      accessMode,
      accessPriceCents: accessMode === "paid" ? accessPriceCents : 0,
      accessCurrency: "USD",
    });
    if (t) {
      reset();
    } else {
      setErr("Could not create title.");
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="My titles"
        subtitle="Create movies and series, then choose when they become visible to viewers."
      />

      {!user?.isCreator ? (
        <p className="hint-banner">
          Switch to a creator account in <Link to="/profile">Profile</Link>, then come back.
        </p>
      ) : null}

      <div className="creator-manage-layout">
      {!user?.isCreator ? null : (
        <div id="create-title" className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 className="form-title">Create title</h2>
          {err ? <p className="err-text">{err}</p> : null}
          <form className="stack-form" onSubmit={onSubmit}>
            <label>
              Format
              <select value={kind} onChange={(e) => setKind(e.target.value as "movie" | "series")}>
                <option value="series">Series</option>
                <option value="movie">Movie</option>
              </select>
            </label>
            <label>
              Title name
              <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="My great film…" />
            </label>
            <label>
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                required
                placeholder="What's this title about?"
              />
            </label>
            <label>
              Genre
              <input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Drama" />
            </label>
            <label>
              Region
              <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Global, Nigeria, Brazil…" />
            </label>
            <label>
              Watch access
              <select
                value={accessMode}
                onChange={(e) => setAccessMode(e.target.value as Title["accessMode"])}
              >
                <option value="free">Free on profile</option>
                <option value="paid">Paid rental</option>
              </select>
            </label>
            {accessMode === "paid" ? (
              <label>
                Rental price (cents)
                <input
                  type="number"
                  min={100}
                  value={accessPriceCents}
                  onChange={(e) => setAccessPriceCents(Number(e.target.value) || 0)}
                />
              </label>
            ) : null}
            <label>
              Minimum age (optional)
              <input
                type="number"
                min={0}
                max={21}
                value={minAge}
                onChange={(e) => setMinAge(e.target.value)}
                placeholder="e.g. 18"
              />
            </label>
            <label>
              Visibility
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "draft" | "published")}
              >
                <option value="draft">Draft — only you</option>
                <option value="published">Published — public</option>
              </select>
            </label>
            <label>
              Explore boost
              <select
                value={listingBoost}
                onChange={(e) => setListingBoost(e.target.value as Title["listingBoost"])}
              >
                <option value="none">Standard</option>
                <option value="featured">Featured</option>
              </select>
            </label>
            <label>
              Subtitle WebVTT URL (optional)
              <input
                value={subtitleVttUrl}
                onChange={(e) => setSubtitleVttUrl(e.target.value)}
                placeholder="https://…/subs.vtt"
              />
            </label>
            <button type="submit">Create title</button>
          </form>
        </div>
      )}

      <section style={{ marginTop: "1.5rem" }}>
        <h2 className="section-label">Your titles ({mine.length})</h2>
        {mine.length === 0 ? (
          <div className="empty-state">
            <p>No titles yet — create one above, or import seed data on first load in another browser profile.</p>
          </div>
        ) : (
          <ul className="title-admin-list">
            {mine.map((t) => (
              <li key={t.id} id={`title-${t.id}`} className="card title-admin-row">
                <div>
                  <Link to={`/title/${t.slug}`}>
                    <strong>{t.name}</strong>
                  </Link>
                  <span className="muted small"> · {t.slug}</span>
                  <p className="small muted">
                    {visibilityLabel(t.status)}
                    {t.accessMode === "paid"
                      ? ` · paid rental (${((t.accessPriceCents ?? 0) / 100).toFixed(2)} ${t.accessCurrency ?? "USD"})`
                      : " · free on profile"}
                  </p>
                </div>
                <div className="title-admin-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      if (pricingId === t.id) {
                        setPricingId(null);
                        return;
                      }
                      setPricingId(t.id);
                      setEditAccessMode(t.accessMode ?? "free");
                      setEditPriceCents(t.accessPriceCents ?? 499);
                    }}
                  >
                    {pricingId === t.id ? "Close pricing" : "Pricing"}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() =>
                      updateTitle(t.id, { status: t.status === "published" ? "draft" : "published" })
                    }
                  >
                    {t.status === "published" ? "Make draft" : "Make public"}
                  </button>
                  <button type="button" className="btn-danger" onClick={() => deleteTitle(t.id)}>
                    Delete
                  </button>
                </div>
                {pricingId === t.id ? (
                  <form
                    className="stack-form title-pricing-edit"
                    onSubmit={(e) => {
                      e.preventDefault();
                      updateTitle(t.id, {
                        accessMode: editAccessMode,
                        accessPriceCents:
                          editAccessMode === "paid" ? editPriceCents : 0,
                        accessCurrency: t.accessCurrency ?? "USD",
                      });
                      setPricingId(null);
                    }}
                  >
                    <label>
                      Profile watch
                      <select
                        value={editAccessMode}
                        onChange={(e) =>
                          setEditAccessMode(e.target.value as Title["accessMode"])
                        }
                      >
                        <option value="free">Free on profile</option>
                        <option value="paid">Paid rental</option>
                      </select>
                    </label>
                    {editAccessMode === "paid" ? (
                      <label>
                        Price (cents)
                        <input
                          type="number"
                          min={100}
                          value={editPriceCents}
                          onChange={(e) => setEditPriceCents(Number(e.target.value) || 0)}
                        />
                      </label>
                    ) : null}
                    <button type="submit" className="btn-secondary">
                      Save pricing
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
      </div>
    </div>
  );
}
