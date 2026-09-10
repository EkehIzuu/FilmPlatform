import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CreatorPremiereWorkflowSteps } from "../components/creator/CreatorPremiereWorkflowSteps";
import { PageHeader } from "../components/PageHeader";
import { PremierePromoToolkit } from "../components/premiere/PremierePromoToolkit";
import { PremiereRecoveryBanner } from "../components/premiere/PremiereRecoveryBanner";
import { PremiereShareBox } from "../components/premiere/PremiereShareBox";
import { useAuth } from "../context/AuthContext";
import { useFilmData } from "../context/FilmDataContext";
import { getPremiereTimeline } from "../domain/premiereSync";
import { validateCreatorPremiereForm } from "@/features/premiere/lib/creatorPremiereValidation";
import {
  formatShowtime,
  getPhaseStatusLine,
} from "@/features/premiere/lib/premiereStatusCopy";
import { formatMoney } from "../lib/monetization";
import { resolveMediaUrl } from "../services/mediaStorage";

export function CreatorPremiere() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const {
    listMyTitles,
    addPremiereEvent,
    listMyPremiereEvents,
    deletePremiereEvent,
    premiereReservationCount,
    trackEvent,
    listAnalyticsEvents,
    state,
    addUpload,
  } = useFilmData();
  const titles = listMyTitles();
  const mine = listMyPremiereEvents().sort(
    (a, b) => new Date(b.featureStartsAt).getTime() - new Date(a.featureStartsAt).getTime(),
  );

  const [titleId, setTitleId] = useState(searchParams.get("titleId") ?? "");
  const [label, setLabel] = useState("");
  const [featureStartsAt, setFeatureStartsAt] = useState("");
  const [preRollAdSeconds, setPreRollAdSeconds] = useState(300);
  const [adVideoUrl, setAdVideoUrl] = useState("");
  const [featureVideoUrl, setFeatureVideoUrl] = useState("");
  const [adUploadId, setAdUploadId] = useState("");
  const [featureUploadId, setFeatureUploadId] = useState("");
  const [adHlsUrl, setAdHlsUrl] = useState("");
  const [featureHlsUrl, setFeatureHlsUrl] = useState("");
  const [featureSubtitleVttUrl, setFeatureSubtitleVttUrl] = useState("");
  const [capacity, setCapacity] = useState(200);
  const [priceCents, setPriceCents] = useState(999);
  const [currency, setCurrency] = useState("USD");
  const [description, setDescription] = useState("");
  const [schedulePreShow, setSchedulePreShow] = useState(true);
  const [scheduleAfterParty, setScheduleAfterParty] = useState(true);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [lastScheduledId, setLastScheduledId] = useState<string | null>(null);

  useEffect(() => {
    const q = searchParams.get("titleId");
    if (q) setTitleId(q);
  }, [searchParams]);

  const readyUploads = useMemo(
    () =>
      state.uploads.filter(
        (u) => u.titleId === titleId && u.status === "ready" && (u.publicUrl || u.storagePath),
      ),
    [state.uploads, titleId],
  );

  const selectedAdUpload = state.uploads.find((u) => u.id === adUploadId);
  const selectedFeatureUpload = state.uploads.find((u) => u.id === featureUploadId);

  const uploadPremiereFile = (slot: "pre_show" | "feature", file: File | null) => {
    if (!file) return;
    if (!titleId) {
      setFormErrors(["Choose a film title before uploading premiere files."]);
      return;
    }
    const uploadId = addUpload({
      titleId,
      kind: slot,
      fileName: file.name,
      file,
    });
    if (!uploadId) {
      setFormErrors(["Could not start upload. Confirm you are signed in as a creator."]);
      return;
    }
    if (slot === "pre_show") {
      setAdUploadId(uploadId);
      setAdVideoUrl("");
    } else {
      setFeatureUploadId(uploadId);
      setFeatureVideoUrl("");
    }
    setFormErrors([]);
  };

  const checkoutByEventAndSource = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const e of listAnalyticsEvents()) {
      if (e.type !== "premiere_checkout") continue;
      const eventId = typeof e.meta?.eventId === "string" ? e.meta.eventId : "";
      const src = typeof e.meta?.src === "string" ? e.meta.src : "unknown";
      if (!eventId) continue;
      if (!map[eventId]) map[eventId] = {};
      map[eventId][src] = (map[eventId][src] ?? 0) + 1;
    }
    return map;
  }, [listAnalyticsEvents]);

  const pickUploadUrl = (uploadId: string, fallback: string) => {
    if (!uploadId) return fallback.trim() || fallback;
    const row = readyUploads.find((u) => u.id === uploadId);
    if (!row) return fallback.trim() || fallback;
    return resolveMediaUrl(row.publicUrl || row.storagePath);
  };

  const uploadStatusText = (uploadId: string): string | null => {
    const upload = state.uploads.find((u) => u.id === uploadId);
    if (!upload) return null;
    if (upload.status === "ready") return `${upload.fileName} is ready.`;
    if (upload.status === "failed") return `${upload.fileName} failed. Choose the file again.`;
    return `${upload.fileName} is ${upload.status} (${upload.progress}%).`;
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormErrors([]);
    setLastScheduledId(null);

    if (!user?.isCreator) {
      setFormErrors(["Creator account required to schedule a premiere."]);
      return;
    }

    const validation = validateCreatorPremiereForm({
      titleId,
      featureStartsAt,
      capacity,
      priceCents,
      currency,
      adVideoUrl,
      featureVideoUrl,
      adUploadId,
      featureUploadId,
    });
    if (!validation.ok) {
      setFormErrors(validation.errors);
      return;
    }

    if (selectedFeatureUpload && selectedFeatureUpload.status !== "ready") {
      setFormErrors(["Movie upload is still processing. Wait until it is ready, then schedule the premiere."]);
      return;
    }

    if (selectedAdUpload && selectedAdUpload.status !== "ready") {
      setFormErrors(["Pre-show upload is still processing. Wait until it is ready, or clear it before scheduling."]);
      return;
    }

    const t = titles.find((x) => x.id === titleId);
    const titleName = label.trim() || t?.name || "Untitled";
    const adSource = pickUploadUrl(adUploadId, adVideoUrl.trim());
    const featureSource = pickUploadUrl(featureUploadId, featureVideoUrl.trim());
    const created = addPremiereEvent(
      {
        titleId,
        titleName,
        featureStartsAt: new Date(featureStartsAt).toISOString(),
        preRollAdSeconds: adSource ? preRollAdSeconds : 0,
        adVideoUrl: adSource,
        featureVideoUrl: featureSource,
        adHlsUrl: adHlsUrl.trim() || undefined,
        featureHlsUrl: featureHlsUrl.trim() || undefined,
        featureSubtitleVttUrl: featureSubtitleVttUrl.trim() || undefined,
        capacity: Math.max(1, Math.floor(capacity)),
        priceCents: Math.max(0, Math.floor(priceCents)),
        currency: currency.trim() || "USD",
        description: description.trim(),
      },
      { schedulePreShow, scheduleAfterParty },
    );

    if (!created) {
      setFormErrors(["Could not schedule premiere. Confirm you are signed in as a creator."]);
      return;
    }

    setLastScheduledId(created.id);
    setLabel("");
    setDescription("");
  };

  return (
    <div className="page creator-premiere-page">
      <PageHeader
        title="Schedule a premiere"
        subtitle="Ticketed synced screening — fans buy a seat, join at showtime, then watch on your profile after curtain."
      />

      <CreatorPremiereWorkflowSteps />

      {!user?.isCreator ? (
        <PremiereRecoveryBanner
          variant="warn"
          message="You need a creator account to schedule premieres."
          actions={[
            { label: "Become a creator", to: "/profile", primary: true },
            { label: "Creator studio", to: "/creator" },
          ]}
        />
      ) : titles.length === 0 ? (
        <PremiereRecoveryBanner
          variant="info"
          message="Publish a film title first, then schedule its opening night."
          actions={[
            { label: "My titles", to: "/creator/titles", primary: true },
            { label: "Upload video", to: "/creator/upload" },
          ]}
        />
      ) : (
        <>
          {lastScheduledId ? (
            <PremiereRecoveryBanner
              variant="success"
              message="Premiere scheduled. Preview the screening room, then share the ticket page with fans."
              actions={[
                { label: "Preview screening room", to: `/premiere/${lastScheduledId}`, primary: true },
                { label: "View in list below", to: "#your-premieres" },
              ]}
            />
          ) : null}

          {formErrors.length > 0 ? (
            <PremiereRecoveryBanner
              variant="error"
              message={formErrors.join(" ")}
              actions={[{ label: "Creator studio", to: "/creator" }]}
            />
          ) : null}

          <form className="card stack-form premiere-creator-form" onSubmit={onSubmit}>
              <p className="small muted premiere-creator-form-lead">
                Set showtime and tickets. Everyone watches on the same clock when the curtain rises.
              </p>

              {/* Section 1 — The Film */}
              <section className="premiere-form-section">
                <p className="premiere-form-section-title">The Film</p>
                <label>
                  Film title
                  <select
                    value={titleId}
                    onChange={(e) => {
                      setTitleId(e.target.value);
                      setAdUploadId("");
                      setFeatureUploadId("");
                    }}
                    required
                  >
                    <option value="">Choose a title…</option>
                    {titles.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Screening name (optional)
                  <input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Defaults to your film title"
                  />
                </label>
                <label>
                  Description for fans
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
                </label>
              </section>

              {/* Section 2 — The Show */}
              <section className="premiere-form-section">
                <p className="premiere-form-section-title">The Show</p>
                <label>
                  Showtime (when the feature starts)
                  <input
                    type="datetime-local"
                    value={featureStartsAt}
                    onChange={(e) => setFeatureStartsAt(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Pre-show length (seconds)
                  <input
                    type="number"
                    min={0}
                    max={3600}
                    value={preRollAdSeconds}
                    onChange={(e) => setPreRollAdSeconds(Number(e.target.value))}
                  />
                </label>
                <p className="small muted">
                  Pre-show runs from (showtime − pre-roll) — e.g. 300 s = 5 min before feature.
                </p>
                <label>
                  Movie file
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => uploadPremiereFile("feature", e.target.files?.[0] ?? null)}
                    disabled={!titleId}
                  />
                </label>
                {featureUploadId ? (
                  <p className="small muted">{uploadStatusText(featureUploadId)}</p>
                ) : (
                  <p className="small muted">Choose the feature movie file for this premiere.</p>
                )}
                <label>
                  Pre-show file (optional)
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => uploadPremiereFile("pre_show", e.target.files?.[0] ?? null)}
                    disabled={!titleId}
                  />
                </label>
                {adUploadId ? <p className="small muted">{uploadStatusText(adUploadId)}</p> : null}
                {readyUploads.length > 0 ? (
                  <>
                    <label>
                      Existing pre-show upload
                      <select value={adUploadId} onChange={(e) => setAdUploadId(e.target.value)}>
                        <option value="">No pre-show selected</option>
                        {readyUploads.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.fileName} ({u.kind})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Existing movie upload
                      <select
                        value={featureUploadId}
                        onChange={(e) => setFeatureUploadId(e.target.value)}
                      >
                        <option value="">No movie upload selected</option>
                        {readyUploads.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.fileName} ({u.kind})
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                ) : (
                  <p className="small muted">
                    Upload a movie file here, or use URL fallbacks below.
                  </p>
                )}
                <label>
                  Pre-show URL fallback (optional)
                  <input
                    value={adVideoUrl}
                    onChange={(e) => setAdVideoUrl(e.target.value)}
                    placeholder="https://…"
                    disabled={Boolean(adUploadId)}
                  />
                </label>
                <label>
                  Ad HLS (m3u8) — optional
                  <input
                    value={adHlsUrl}
                    onChange={(e) => setAdHlsUrl(e.target.value)}
                    placeholder="https://cdn/…/ad.m3u8"
                  />
                </label>
                <label>
                  Seat capacity
                  <input
                    type="number"
                    min={1}
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                  />
                </label>
                <fieldset className="premiere-stack-fieldset">
                  <legend className="small">Premiere night stack (profile lives)</legend>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={schedulePreShow}
                      onChange={(e) => setSchedulePreShow(e.target.checked)}
                    />
                    Pre-show live on your profile (~15 min before feature)
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={scheduleAfterParty}
                      onChange={(e) => setScheduleAfterParty(e.target.checked)}
                    />
                    After-party live when the synced screening ends
                  </label>
                </fieldset>
              </section>

              {/* Section 3 — Tickets */}
              <section className="premiere-form-section">
                <p className="premiere-form-section-title">Tickets</p>
                <label>
                  Ticket price (cents)
                  <input
                    type="number"
                    min={0}
                    value={priceCents}
                    onChange={(e) => setPriceCents(Number(e.target.value))}
                  />
                </label>
                <p className="small muted">
                  Fans will pay about {formatMoney(Math.max(0, priceCents), currency || "USD")} per seat
                  {priceCents === 0 ? " (free screening)" : ""}.
                </p>
                <label>
                  Currency
                  <input value={currency} onChange={(e) => setCurrency(e.target.value)} />
                </label>
                <label>
                  Movie URL fallback
                  <input
                    value={featureVideoUrl}
                    onChange={(e) => setFeatureVideoUrl(e.target.value)}
                    placeholder="https://… your film"
                    disabled={Boolean(featureUploadId)}
                  />
                </label>
                <label>
                  Feature HLS (m3u8) — optional
                  <input
                    value={featureHlsUrl}
                    onChange={(e) => setFeatureHlsUrl(e.target.value)}
                    placeholder="https://cdn/…/master.m3u8"
                  />
                </label>
                <label>
                  Subtitles (WebVTT) — optional
                  <input
                    value={featureSubtitleVttUrl}
                    onChange={(e) => setFeatureSubtitleVttUrl(e.target.value)}
                    placeholder="https://…/en.vtt"
                  />
                </label>
              </section>

              <button type="submit" className="auth-submit">
                Schedule premiere
              </button>
            </form>
        </>
      )}

      <section id="your-premieres" style={{ marginTop: "1.5rem" }}>
        <h2 className="section-label">Your scheduled premieres</h2>
        <p className="small muted">
          Step 2 &amp; 3 — Preview each screening room, then share the ticket link with fans.
        </p>
        {mine.length === 0 ? (
          <p className="muted small">No premieres yet. Use the form above to schedule your first showtime.</p>
        ) : (
          <ul className="title-admin-list creator-premiere-list">
            {mine.map((ev) => {
              const sold = premiereReservationCount(ev.id);
              const left = Math.max(0, ev.capacity - sold);
              const tl = getPremiereTimeline(ev);
              const fill = ev.capacity > 0 ? Math.round((sold / ev.capacity) * 100) : 0;
              return (
                <li key={ev.id} className="card title-admin-row creator-premiere-row">
                  <div>
                    <strong>{ev.titleName}</strong>
                    <p className="small muted">
                      Showtime {formatShowtime(ev.featureStartsAt)} · {getPhaseStatusLine(tl)}
                    </p>
                    <p className="small">
                      <strong>{sold}</strong> sold · <strong>{left}</strong> seats left ·{" "}
                      {formatMoney(ev.priceCents, ev.currency)} · {fill}% full
                    </p>
                    <p className="creator-premiere-share-hint small muted">
                      Fan ticket page:{" "}
                      <Link to={`/premiere/${ev.id}`} className="text-link">
                        /premiere/{ev.id.slice(0, 8)}…
                      </Link>
                    </p>
                    <PremiereShareBox
                      eventId={ev.id}
                      titleName={ev.titleName}
                      featureStartsAt={ev.featureStartsAt}
                      variant="creator"
                      source="creator"
                    />
                    <PremierePromoToolkit
                      eventId={ev.id}
                      titleName={ev.titleName}
                      featureStartsAt={ev.featureStartsAt}
                      checkoutBySource={checkoutByEventAndSource[ev.id] ?? {}}
                      onTrackClick={(channel) => trackEvent("premiere_promo_click", { eventId: ev.id, channel })}
                    />
                  </div>
                  <div className="film-manager-actions creator-premiere-row-actions">
                    <Link to={`/premiere/${ev.id}`} className="auth-submit studio-panel-cta-sm">
                      Preview room
                    </Link>
                    <Link to="/watch/premiere" className="btn-secondary">
                      Fan listing
                    </Link>
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => {
                        if (window.confirm("Delete this premiere? Existing tickets will be removed.")) {
                          deletePremiereEvent(ev.id);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
