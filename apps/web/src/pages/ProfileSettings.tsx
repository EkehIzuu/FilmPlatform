import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BackLink } from "../components/BackLink";
import { useAuth } from "../context/AuthContext";
import { isEmailVerifiedUser } from "../lib/verification";
import { useFilmData } from "../context/FilmDataContext";
import type { CreatorTier } from "../domain/types";
import { isAdminEmail } from "../lib/admin";
import {
  isValidUsername,
  normalizeUsername,
  PROFILE_LANGUAGES,
} from "../lib/profileDisplay";
import { birthYearFromDate } from "../lib/profileDetails";
import { isSupabaseConfigured } from "../lib/supabase";
import { findAvailableUsername, isUsernameTaken } from "../services/supabaseProfile";
import { CreatorVerificationPanel } from "../components/CreatorVerificationPanel";
import { getDeviceLocaleInfo } from "../lib/localization";
import { defaultUsername } from "../lib/usernames";

type ProfileSection =
  | "identity"
  | "birthLocation"
  | "education"
  | "links"
  | "preferences"
  | "creator";

const PROFILE_SECTION_META: { id: ProfileSection; label: string; icon: string }[] = [
  { id: "identity", label: "Basic info", icon: "👤" },
  { id: "birthLocation", label: "Birth & location", icon: "📍" },
  { id: "education", label: "Education", icon: "🎓" },
  { id: "links", label: "Links", icon: "🔗" },
  { id: "preferences", label: "Preferences", icon: "⚙️" },
  { id: "creator", label: "Creator", icon: "🎬" },
];

export function ProfileSettings() {
  const { user, updateProfile, authMode, signOut, emailVerified } = useAuth();
  const { listLedgerForCreator, dataMode } = useFilmData();
  const navigate = useNavigate();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<ProfileSection>("identity");
  const [dobValue, setDobValue] = useState(user?.dateOfBirth ?? "");
  const deviceLocale = getDeviceLocaleInfo();

  if (!user) return null;

  const publicPath = user.username ? `/u/${user.username}` : null;

  const onSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const ledger = user.isCreator ? listLedgerForCreator(user.id).slice(0, 15) : [];
  const currentYear = new Date().getFullYear();

  const shiftDobYear = (amount: number) => {
    const base = dobValue ? new Date(dobValue) : new Date();
    if (Number.isNaN(base.getTime())) return;
    const next = new Date(base);
    next.setFullYear(base.getFullYear() + amount);
    if (next.getFullYear() > currentYear) {
      next.setFullYear(currentYear);
    }
    if (next.getFullYear() < 1920) {
      next.setFullYear(1920);
    }
    setDobValue(next.toISOString().slice(0, 10));
  };

  const onIdentitySave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    const displayName = (fd.get("displayName") as string)?.trim() || user.displayName;
    const usernameRaw = (fd.get("username") as string)?.trim() ?? "";
    let username = usernameRaw ? normalizeUsername(usernameRaw) : user.username?.trim();

    if (username && !isValidUsername(username)) {
      setErr("Username must be 3–24 characters: letters, numbers, underscore.");
      return;
    }

    if (!username) {
      username = isSupabaseConfigured()
        ? await findAvailableUsername(displayName, user.email, user.id)
        : defaultUsername(displayName, user.email, user.id);
    }

    if (usernameRaw && username && isSupabaseConfigured()) {
      const taken = await isUsernameTaken(username, user.id);
      if (taken) {
        setErr(`@${username} is already taken.`);
        return;
      }
    }

    try {
      await updateProfile({
        displayName,
        username,
        bio: (fd.get("bio") as string)?.trim() || undefined,
        headline: (fd.get("headline") as string)?.trim() || undefined,
      });
      setMsg(dataMode === "supabase" ? "Identity saved." : "Identity saved locally.");
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not save identity.");
    }
  };

  const onBirthLocationSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    const dateOfBirth = (fd.get("dateOfBirth") as string)?.trim() || undefined;
    const birthYear = birthYearFromDate(dateOfBirth);
    const adultEl = e.currentTarget.querySelector<HTMLInputElement>('input[name="adult"]');

    await updateProfile({
      dateOfBirth,
      birthYear,
      placeOfBirth: (fd.get("placeOfBirth") as string)?.trim() || undefined,
      city: (fd.get("city") as string)?.trim() || undefined,
      region: (fd.get("region") as string)?.trim() || undefined,
      workplace: (fd.get("workplace") as string)?.trim() || undefined,
      adultConfirmed: !!adultEl?.checked,
    });
    setMsg(dataMode === "supabase" ? "Birth and location saved." : "Birth and location saved locally.");
  };

  const onEducationSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    await updateProfile({
      schools: (fd.get("schools") as string)?.trim() || undefined,
      certifications: (fd.get("certifications") as string)?.trim() || undefined,
      languagesSpoken: (fd.get("languagesSpoken") as string)?.trim() || undefined,
    });
    setMsg(dataMode === "supabase" ? "Education saved." : "Education saved locally.");
  };

  const onLinksSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    await updateProfile({
      websiteUrl: (fd.get("websiteUrl") as string)?.trim() || undefined,
      instagram: (fd.get("instagram") as string)?.replace(/^@/, "").trim() || undefined,
    });
    setMsg(dataMode === "supabase" ? "Links saved." : "Links saved locally.");
  };

  const onPreferencesSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    await updateProfile({
      preferredLanguage: (fd.get("preferredLanguage") as string) || "english",
      emailNotifications: !!fd.get("emailNotifications"),
      pushEnabled: !!fd.get("pushEnabled"),
    });
    setMsg(dataMode === "supabase" ? "Preferences saved." : "Preferences saved locally.");
  };

  const onCreatorSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    const enableCreator = !!fd.get("enableCreator");
    await updateProfile({
      isCreator: user.isCreator || enableCreator,
      creatorTier: (fd.get("tier") as CreatorTier) || user.creatorTier,
    });
    setMsg(dataMode === "supabase" ? "Creator settings saved." : "Creator settings saved locally.");
  };

  return (
    <div className="page app-settings-page">
      <header className="settings-inline-head">
        <BackLink to="/profile" className="back-link--flush settings-inline-back" aria-label="Your profile">
          ←
        </BackLink>
        <h1 className="settings-inline-title">Edit profile</h1>
      </header>
      <p className="page-header-sub">Update your public profile details</p>

      <div className="settings-desktop-layout">
      <section className="card settings-section">
        <div className="settings-section-picker">
          {PROFILE_SECTION_META.map((section) => (
            <button
              key={section.id}
              type="button"
              className={activeSection === section.id ? "settings-section-pill active" : "settings-section-pill"}
              onClick={() => setActiveSection(section.id)}
            >
              <span className="settings-pill-icon" aria-hidden>
                {section.icon}
              </span>
              <span>{section.label}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="settings-desktop-content">
      {activeSection === "identity" ? (
        <form className="stream-block stack-form profile-form" onSubmit={(e) => void onIdentitySave(e)}>
          <h2 className="form-title">Name &amp; identity</h2>
          <label>
            Display name
            <input name="displayName" defaultValue={user.displayName} required maxLength={80} />
          </label>
          <label>
            Username
            <input name="username" defaultValue={user.username ?? ""} placeholder="izu_films" maxLength={24} />
          </label>
          <p className="small muted">Letters, numbers, underscore only.</p>
          <label>
            Headline
            <input name="headline" defaultValue={user.headline ?? ""} placeholder="Filmmaker · Director" maxLength={120} />
          </label>
          <label>
            Bio
            <textarea name="bio" rows={3} maxLength={280} defaultValue={user.bio ?? ""} placeholder="Tell people what you create…" />
          </label>
          <button type="submit" className="btn-profile-save">Save basic info</button>
        </form>
      ) : null}

      {activeSection === "birthLocation" ? (
        <form className="stream-block stack-form profile-form" onSubmit={(e) => void onBirthLocationSave(e)}>
          <h2 className="form-title">Birth &amp; location</h2>
          <label>
            Date of birth
            <div className="dob-calendar-row">
              <button type="button" className="dob-jump-btn" onClick={() => shiftDobYear(-1)} aria-label="Jump back 1 year">«</button>
              <input
                name="dateOfBirth"
                type="date"
                value={dobValue}
                max={`${currentYear}-12-31`}
                min="1920-01-01"
                onChange={(e) => setDobValue(e.target.value)}
              />
              <button type="button" className="dob-jump-btn" onClick={() => shiftDobYear(1)} aria-label="Jump forward 1 year">»</button>
            </div>
          </label>
          <label>
            Place of birth
            <input name="placeOfBirth" defaultValue={user.placeOfBirth ?? ""} placeholder="City, country" maxLength={120} />
          </label>
          <label>
            City (where you live now)
            <input name="city" defaultValue={user.city ?? ""} placeholder="Your city" />
          </label>
          <label>
            Region / country
            <input name="region" defaultValue={user.region ?? ""} placeholder={deviceLocale.regionName ?? "Your country or region"} />
          </label>
          <label>
            Workplace / studio
            <input name="workplace" defaultValue={user.workplace ?? ""} placeholder="Izora Studios · Freelance" maxLength={120} />
          </label>
          <label className="checkbox-row">
            <input type="checkbox" name="adult" defaultChecked={user.adultConfirmed} />I confirm I meet age requirements for restricted titles.
          </label>
          <button type="submit" className="btn-profile-save">Save birth &amp; location</button>
        </form>
      ) : null}

      {activeSection === "education" ? (
        <form className="stream-block stack-form profile-form" onSubmit={(e) => void onEducationSave(e)}>
          <h2 className="form-title">Education &amp; credentials</h2>
          <label>
            Schools &amp; programs
            <textarea name="schools" rows={4} defaultValue={user.schools ?? ""} placeholder={"Film school, university, workshop\nCreator lab or mentorship"} />
          </label>
          <p className="small muted">One school or program per line.</p>
          <label>
            Certifications &amp; awards
            <textarea name="certifications" rows={4} defaultValue={user.certifications ?? ""} placeholder={"Festival selection\nCreator award"} />
          </label>
          <p className="small muted">One certification or award per line.</p>
          <label>
            Languages spoken
            <textarea name="languagesSpoken" rows={3} defaultValue={user.languagesSpoken ?? ""} placeholder={"English\nSpanish\nFrench"} />
          </label>
          <button type="submit" className="btn-profile-save">Save education</button>
        </form>
      ) : null}

      {activeSection === "links" ? (
        <form className="stream-block stack-form profile-form" onSubmit={(e) => void onLinksSave(e)}>
          <h2 className="form-title">Links</h2>
          <label>
            Website
            <input name="websiteUrl" type="url" defaultValue={user.websiteUrl ?? ""} placeholder="https://yoursite.com" />
          </label>
          <label>
            Instagram
            <input name="instagram" defaultValue={user.instagram ?? ""} placeholder="handle (no @)" />
          </label>
          <button type="submit" className="btn-profile-save">Save links</button>
        </form>
      ) : null}

      {activeSection === "preferences" ? (
        <form className="stream-block stack-form profile-form" onSubmit={(e) => void onPreferencesSave(e)}>
          <h2 className="form-title">Preferences</h2>
          <label>
            App language (subtitles &amp; AI)
            <select name="preferredLanguage" defaultValue={user.preferredLanguage ?? "english"}>
              {PROFILE_LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
          <p className="small muted">
            This device reports {deviceLocale.languageName} ({deviceLocale.locale})
            {deviceLocale.regionName ? ` in ${deviceLocale.regionName}` : ""}.
          </p>
          <label className="checkbox-row">
            <input type="checkbox" name="emailNotifications" defaultChecked={user.emailNotifications !== false} />
            Email me about cinema reminders &amp; premieres
          </label>
          <label className="checkbox-row">
            <input type="checkbox" name="pushEnabled" defaultChecked={user.pushEnabled === true} />
            Browser notifications for messages &amp; activity (when tab is in background)
          </label>
          <button type="submit" className="btn-profile-save">Save preferences</button>
        </form>
      ) : null}

      {activeSection === "creator" ? (
        <form className="stream-block stack-form profile-form" onSubmit={(e) => void onCreatorSave(e)}>
          <h2 className="form-title">Creator</h2>
          {!user.isCreator ? (
            <>
              <p className="small muted">
                Turn this on to upload titles, host lives, and use cinema tools. You can still post clips without it.
              </p>
              <label className="checkbox-row">
                <input type="checkbox" name="enableCreator" />
                Enable creator tools on my account
              </label>
            </>
          ) : (
            <>
              <p className="small muted">
                Tier <strong>{user.creatorTier ?? "free"}</strong>
                {authMode === "supabase" ? (
                  <span className="pill" style={{ marginLeft: "0.5rem" }}>
                    Cloud
                  </span>
                ) : null}
              </p>
              <label>
                Creator tier (demo)
                <select name="tier" defaultValue={user.creatorTier ?? "free"}>
                  <option value="free">Free</option>
                  <option value="verified">Verified</option>
                  <option value="featured">Featured</option>
                </select>
              </label>
              <CreatorVerificationPanel />
            </>
          )}
          <p className="small muted">Profile photo and cover: change them on your profile home (tap avatar or cover).</p>
          <button type="submit" className="btn-profile-save">Save creator settings</button>
        </form>
      ) : null}

      {msg ? <p className="hint-banner">{msg}</p> : null}
      {err ? <p className="hint-banner" style={{ borderColor: "var(--danger, #f85149)" }}>{err}</p> : null}

      {user.isCreator && ledger.length > 0 ? (
        <section className="stream-block">
          <h2 className="form-title">Payout ledger (demo)</h2>
          <ul className="ledger-list">
            {ledger.map((row) => (
              <li key={row.id} className="small">
                <strong>{(row.amountCents / 100).toFixed(2)}</strong> {row.currency} — {row.label}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {isAdminEmail(user.email) ? (
        <p style={{ marginTop: "1rem" }}>
          <Link to="/admin" className="text-link">
            Ops console →
          </Link>
        </p>
      ) : null}

      <section className="stream-block settings-account">
        <h2 className="form-title">Account</h2>
        {publicPath ? (
          <p className="small">
            <Link to={publicPath} className="text-link">
              View public profile →
            </Link>
          </p>
        ) : (
          <p className="small muted">Set a username above to get a public profile link.</p>
        )}
        <p className="small muted">
          Signed in as <strong>{user.email}</strong>
          {authMode === "local" ? " (demo)" : null}
        </p>
        {authMode === "supabase" ? (
          <p className="small muted">
            Email:{" "}
            {isEmailVerifiedUser(user, emailVerified) ? (
              <strong>Verified</strong>
            ) : (
              <>
                <strong>Not verified</strong> —{" "}
                <Link to="/verify-email" className="text-link">
                  confirm your email
                </Link>
              </>
            )}
          </p>
        ) : null}
        <button type="button" className="btn-sign-out" onClick={() => void onSignOut()}>
          Sign out
        </button>
      </section>
      </div>
      </div>
    </div>
  );
}
