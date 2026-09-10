import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MediaPickZone } from "../components/MediaPickZone";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useFilmData } from "../context/FilmDataContext";
import type { UploadKind } from "../domain/types";
import {
  generateDubbing,
  generatePromo,
  generateSubtitles,
  isRealAiEnabled,
  suggestPricing,
} from "../services/aiService";
import { resolveMediaUrl } from "../services/mediaStorage";
import { suggestSmartPriceNgn } from "../lib/hackathonAi";
import { getDeviceLocaleInfo, GLOBAL_LANGUAGE_OPTIONS } from "../lib/localization";

const KINDS: { value: UploadKind; label: string }[] = [
  { value: "trailer", label: "Trailer" },
  { value: "feature", label: "Feature film" },
  { value: "pre_show", label: "Pre-show reel" },
  { value: "episode", label: "Episode" },
  { value: "bts", label: "Behind the scenes" },
  { value: "bloopers", label: "Bloopers" },
  { value: "interview", label: "Interview" },
  { value: "announcement", label: "Announcement" },
];

export function CreatorUpload() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { listMyTitles, addUpload, state, trackEvent } = useFilmData();
  const titles = listMyTitles();
  const uploads = state.uploads.filter((u) => titles.some((t) => t.id === u.titleId));
  const deviceLocale = getDeviceLocaleInfo();

  const [titleId, setTitleId] = useState("");
  const [kind, setKind] = useState<UploadKind>("trailer");
  const [file, setFile] = useState<File | null>(null);
  const [aiLanguage, setAiLanguage] = useState(deviceLocale.languageValue);
  const [sceneNote, setSceneNote] = useState("The creator shares a moment that can travel across cultures.");
  const [region, setRegion] = useState(deviceLocale.regionName ?? "Global");
  const [audienceDensity, setAudienceDensity] = useState<"low" | "medium" | "high">("medium");
  const [networkQuality, setNetworkQuality] = useState<"2g" | "3g" | "4g" | "wifi">("3g");
  const [baselinePrice, setBaselinePrice] = useState(1500);
  const [subtitlePreview, setSubtitlePreview] = useState("");
  const [dubbingPreview, setDubbingPreview] = useState("");
  const [promoPreview, setPromoPreview] = useState("");
  const [pricingGenerated, setPricingGenerated] = useState(false);
  const [suggestedPrice, setSuggestedPrice] = useState<number | null>(null);
  const [dataSaverMode, setDataSaverMode] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    const tid = searchParams.get("titleId");
    const k = searchParams.get("kind");
    if (tid && titles.some((t) => t.id === tid)) setTitleId(tid);
    if (k && KINDS.some((x) => x.value === k)) setKind(k as UploadKind);
  }, [searchParams, titles]);

  const selectedTitle = useMemo(
    () => titles.find((t) => t.id === titleId),
    [titleId, titles],
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!user?.isCreator || !titleId || !file) return;
    setUploadError("");
    addUpload({ titleId, kind, fileName: file.name, file });
    setFile(null);
  };

  const pricing = suggestSmartPriceNgn({
    audienceDensity,
    networkQuality,
    baselineNgn: baselinePrice,
  });

  const runSubtitlesAndDubbing = async () => {
    setAiBusy(true);
    try {
      const titleName = selectedTitle?.name ?? "Untitled";
      const [subs, dub] = await Promise.all([
        generateSubtitles({ titleName, language: aiLanguage, sceneNote }),
        generateDubbing({ language: aiLanguage, sceneNote }),
      ]);
      setSubtitlePreview(subs);
      setDubbingPreview(dub);
      trackEvent("ai_subtitle_generated", {
        titleId: selectedTitle?.id,
        language: aiLanguage,
        provider: isRealAiEnabled() ? "openai" : "local",
      });
      trackEvent("ai_dubbing_generated", {
        titleId: selectedTitle?.id,
        language: aiLanguage,
        provider: isRealAiEnabled() ? "openai" : "local",
      });
    } finally {
      setAiBusy(false);
    }
  };

  const runPromoCopilot = async () => {
    setAiBusy(true);
    try {
      const titleName = selectedTitle?.name ?? "Untitled";
      const price = suggestedPrice ?? pricing.suggestedNgn;
      const copy = await generatePromo({
        titleName,
        language: aiLanguage,
        region,
        priceNgn: price,
      });
      setPromoPreview(copy);
      trackEvent("ai_promo_generated", {
        titleId: selectedTitle?.id,
        language: aiLanguage,
        region,
        provider: isRealAiEnabled() ? "openai" : "local",
      });
    } finally {
      setAiBusy(false);
    }
  };

  const runSmartPricing = async () => {
    setAiBusy(true);
    try {
      const result = await suggestPricing({
        audienceDensity,
        networkQuality,
        baselineNgn: baselinePrice,
      });
      setPricingGenerated(true);
      setSuggestedPrice(result.suggestedNgn);
      setDataSaverMode(result.dataSaverMode);
      trackEvent("ai_pricing_generated", {
        titleId: selectedTitle?.id,
        audienceDensity,
        networkQuality,
        suggestedNgn: result.suggestedNgn,
        dataSaverMode: result.dataSaverMode,
        provider: isRealAiEnabled() ? "openai" : "local",
      });
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Upload"
        subtitle="Files upload to Supabase Storage when configured; otherwise local demo URLs."
      />

      {!user?.isCreator ? (
        <p className="hint-banner">Creator account required — see Profile.</p>
      ) : titles.length === 0 ? (
        <p className="hint-banner">
          Create a title first under <strong>My titles</strong>.
        </p>
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
            Type
            <select value={kind} onChange={(e) => setKind(e.target.value as UploadKind)}>
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>
          <MediaPickZone
            onFile={(f) => setFile(f ?? null)}
          />

          <button type="submit" disabled={!titleId || !file}>
            Upload
          </button>
          {uploadError ? <p className="small muted">{uploadError}</p> : null}
        </form>
      )}

      <section style={{ marginTop: "1.5rem" }}>
        <h2 className="section-label">Recent uploads</h2>
        {uploads.length === 0 ? (
          <p className="muted small">Nothing yet.</p>
        ) : (
          <ul className="upload-list">
            {uploads
              .slice()
              .reverse()
              .slice(0, 12)
              .map((u) => (
                <li key={u.id} className="upload-row">
                  <span>{u.fileName}</span>
                  <span className="pill">{u.kind}</span>
                  <span className="muted small">{u.status}</span>
                  {u.status === "ready" && (u.publicUrl || u.storagePath) ? (
                    <a
                      href={resolveMediaUrl(u.publicUrl || u.storagePath)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-link small"
                    >
                      Preview
                    </a>
                  ) : null}
                  {u.status === "uploading" || u.status === "processing" ? (
                    <progress value={u.progress} max={100} />
                  ) : null}
                </li>
              ))}
          </ul>
        )}
      </section>

      <section style={{ marginTop: "1.5rem", maxWidth: "760px" }}>
        <h2 className="section-label">AI Tools</h2>
        <div className="card stack-form">
          <p className="muted small" style={{ marginTop: 0 }}>
            {isRealAiEnabled()
              ? "OpenAI enabled via VITE_OPENAI_API_KEY."
              : "Local templates — add VITE_OPENAI_API_KEY for real AI."}
          </p>
          <label>
            AI language
            <select value={aiLanguage} onChange={(e) => setAiLanguage(e.target.value)}>
              {GLOBAL_LANGUAGE_OPTIONS.map((language) => (
                <option key={language.value} value={language.value}>
                  {language.label}
                </option>
              ))}
            </select>
          </label>
          <p className="small muted" style={{ marginTop: "-0.5rem" }}>
            Detected from this device: {deviceLocale.languageName} ({deviceLocale.locale}).
          </p>
          <label>
            Scene note / voice prompt
            <textarea
              value={sceneNote}
              onChange={(e) => setSceneNote(e.target.value)}
              rows={3}
              placeholder="Describe the scene to generate subtitles and a dubbing line."
            />
          </label>
          <div className="btn-row">
            <button
              type="button"
              className="btn-secondary"
              disabled={aiBusy}
              onClick={() => void runSubtitlesAndDubbing()}
            >
              Generate subtitles + dubbing
            </button>
          </div>

          {subtitlePreview ? (
            <div style={{ marginTop: "0.75rem" }}>
              <h3 className="section-label">Subtitle preview (WebVTT)</h3>
              <pre className="card small" style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                {subtitlePreview}
              </pre>
            </div>
          ) : null}

          {dubbingPreview ? (
            <p className="small" style={{ marginTop: "0.75rem" }}>
              <strong>Dub line:</strong> {dubbingPreview}
            </p>
          ) : null}

          <div className="upload-section-divider">Promo Copilot</div>

          <div className="btn-row">
            <button type="button" className="btn-secondary" disabled={aiBusy} onClick={() => void runPromoCopilot()}>
              Generate promo copy
            </button>
          </div>

          {promoPreview ? (
            <p className="small" style={{ marginTop: "0.75rem", whiteSpace: "pre-wrap" }}>
              <strong>Promo draft:</strong> {promoPreview}
            </p>
          ) : null}
        </div>
      </section>

      <section style={{ marginTop: "1rem", maxWidth: "760px" }}>
        <h2 className="section-label">Smart Pricing</h2>
        <div className="card stack-form">
          <label>
            Region
            <input
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="Global, United States, Brazil, India..."
            />
          </label>
          <label>
            Baseline ticket price (local currency)
            <input
              type="number"
              min={100}
              step={50}
              value={baselinePrice}
              onChange={(e) => setBaselinePrice(Number(e.target.value || 100))}
            />
          </label>
          <label>
            Audience demand level
            <select
              value={audienceDensity}
              onChange={(e) => setAudienceDensity(e.target.value as "low" | "medium" | "high")}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <label>
            Typical network quality
            <select
              value={networkQuality}
              onChange={(e) => setNetworkQuality(e.target.value as "2g" | "3g" | "4g" | "wifi")}
            >
              <option value="2g">2G</option>
              <option value="3g">3G</option>
              <option value="4g">4G</option>
              <option value="wifi">Wi-Fi</option>
            </select>
          </label>
          <div className="btn-row">
            <button type="button" className="btn-secondary" disabled={aiBusy} onClick={() => void runSmartPricing()}>
              Generate smart price
            </button>
          </div>
          {pricingGenerated && suggestedPrice !== null ? (
            <p className="small" style={{ marginTop: "0.65rem" }}>
              <strong>AI suggested price:</strong> {suggestedPrice}{" "}
              <span className="pill">
                {dataSaverMode ? "Data Saver ON" : "Standard mode"}
              </span>
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
