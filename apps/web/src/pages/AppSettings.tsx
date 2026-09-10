import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BackLink } from "../components/BackLink";
import { useAuth } from "../context/AuthContext";
import { useFilmData } from "../context/FilmDataContext";
import { getSupabase } from "../lib/supabase";
import { getAppVersionInfo } from "../lib/appVersion";
import { isAdminEmail } from "../lib/admin";
import { COIN_PACKS, formatMoney } from "../lib/monetization";
import { isEmailVerifiedUser } from "../lib/verification";
import type { User } from "../domain/types";

type AppSection =
  | "notifications"
  | "playback"
  | "display"
  | "privacy"
  | "coins"
  | "blocked"
  | "saved"
  | "help"
  | "about"
  | "shortcuts"
  | "safety"
  | "account";

const SECTIONS: { id: AppSection; label: string; icon: string }[] = [
  { id: "notifications", label: "Notifications", icon: "🔔" },
  { id: "playback", label: "Playback", icon: "▶️" },
  { id: "display", label: "Display", icon: "🖥️" },
  { id: "privacy", label: "Privacy", icon: "🔒" },
  { id: "coins", label: "Coins", icon: "🪙" },
  { id: "blocked", label: "Blocked", icon: "🚫" },
  { id: "saved", label: "Saved", icon: "🔖" },
  { id: "help", label: "Help", icon: "❓" },
  { id: "about", label: "About", icon: "ℹ️" },
  { id: "shortcuts", label: "Legal", icon: "📄" },
  { id: "safety", label: "Safety", icon: "🛡️" },
  { id: "account", label: "Account", icon: "👤" },
];

const SUPPORT_EMAIL = "support@izora.app";
const REMINDER_OPTIONS: { value: NonNullable<User["premiereReminderLead"]>; label: string }[] = [
  { value: "day", label: "1 day" },
  { value: "24h", label: "24 hrs" },
  { value: "1h", label: "1 hr" },
  { value: "30m", label: "30 mins" },
  { value: "20m", label: "20 mins" },
  { value: "10m", label: "10 mins" },
  { value: "5m", label: "5 mins" },
  { value: "1m", label: "1 min" },
  { value: "off", label: "Off" },
];

function reminderLeadFromForm(value: string): User["premiereReminderLead"] {
  if (
    value === "1m" ||
    value === "5m" ||
    value === "10m" ||
    value === "20m" ||
    value === "30m" ||
    value === "1h" ||
    value === "24h" ||
    value === "day" ||
    value === "off"
  ) {
    return value;
  }
  return "24h";
}

function dmPrivacyFromForm(value: string): User["dmPrivacy"] {
  if (value === "everyone" || value === "followers" || value === "none") return value;
  return "everyone";
}

export function AppSettings() {
  const { user, updateProfile, authMode, signOut, emailVerified, requestPasswordReset } = useAuth();
  const { listBlockedUsers, unblockUser, dataMode, purchaseCoinPack } = useFilmData();
  const navigate = useNavigate();
  const [msg, setMsg] = useState<string | null>(null);
  const [accountErr, setAccountErr] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<AppSection>("notifications");
  const [playbackReminderLead, setPlaybackReminderLead] = useState<NonNullable<User["premiereReminderLead"]>>(
    user?.premiereReminderLead ?? "24h",
  );
  const [privacyDmSetting, setPrivacyDmSetting] = useState<NonNullable<User["dmPrivacy"]>>(
    user?.dmPrivacy ?? "everyone",
  );
  const { version, build } = getAppVersionInfo();

  if (!user) return null;

  const blocked = listBlockedUsers();

  const flash = (text: string) => {
    setMsg(text);
    window.setTimeout(() => setMsg(null), 2500);
  };

  const flashAccountError = (text: string) => {
    setAccountErr(text);
    window.setTimeout(() => setAccountErr(null), 4000);
  };

  const onNotifySave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await updateProfile({
      emailNotifications: !!fd.get("emailNotifications"),
      pushEnabled: !!fd.get("pushEnabled"),
      marketingEmails: !!fd.get("marketingEmails"),
    });
    flash("Notifications saved.");
  };

  const onPlaybackSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await updateProfile({
      premiereReminderLead: reminderLeadFromForm(playbackReminderLead),
      trailerAutoplay: !!fd.get("trailerAutoplay"),
      dataSaver: !!fd.get("dataSaver"),
      showtimesLocal: !!fd.get("showtimesLocal"),
    });
    flash("Playback settings saved.");
  };

  const onDisplaySave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await updateProfile({
      displayOverApps: !!fd.get("displayOverApps"),
    });
    flash("Display settings saved.");
  };

  const onPrivacySave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await updateProfile({
      dmPrivacy: dmPrivacyFromForm(privacyDmSetting),
      profileLocked: !!fd.get("profileLocked"),
    });
    flash("Privacy settings saved.");
  };

  const onSignOut = async () => {
    const shouldSignOut = window.confirm("Are you sure you want to sign out?");
    if (!shouldSignOut) return;
    await signOut();
    navigate("/login", { replace: true });
  };

  const onSwitchAccount = async () => {
    await signOut();
    navigate("/login?next=/profile", { replace: true });
  };

  const onRequestResetPassword = async () => {
    try {
      if (authMode === "local") {
        flashAccountError("Password reset is only available for cloud accounts.");
        return;
      }
      await requestPasswordReset(user.email);
      flash("Password reset link sent to your email.");
    } catch (err: unknown) {
      flashAccountError(err instanceof Error ? err.message : "Could not send reset link.");
    }
  };

  const onChangeEmail = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const nextEmail = String(fd.get("newEmail") ?? "").trim().toLowerCase();
    if (!nextEmail) {
      flashAccountError("Enter a new email address.");
      return;
    }

    try {
      if (authMode === "local") {
        await updateProfile({ email: nextEmail });
        flash("Email updated for this device.");
        return;
      }

      const supabase = getSupabase();
      if (!supabase) {
        flashAccountError("Supabase is not configured.");
        return;
      }
      const { error } = await supabase.auth.updateUser({ email: nextEmail });
      if (error) throw error;
      flash("Email change requested. Check both inboxes to confirm.");
    } catch (err: unknown) {
      flashAccountError(err instanceof Error ? err.message : "Could not request email change.");
    }
  };

  return (
    <div className="page app-settings-page">
      <header className="settings-inline-head">
        <BackLink to="/profile" className="back-link--flush settings-inline-back" aria-label="Your profile">
          ←
        </BackLink>
        <h1 className="settings-inline-title">Settings</h1>
      </header>
      <p className="page-header-sub">App preferences, safety, and account</p>

      <div className="settings-desktop-layout">
      <section className="card settings-section">
        <div className="settings-section-picker">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={activeSection === s.id ? "settings-section-pill active" : "settings-section-pill"}
              onClick={() => setActiveSection(s.id)}
            >
              <span className="settings-pill-icon" aria-hidden>
                {s.icon}
              </span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="settings-desktop-content">
      {msg ? <p className="hint-banner">{msg}</p> : null}
      {accountErr ? <p className="hint-banner" style={{ borderColor: "var(--danger, #f85149)" }}>{accountErr}</p> : null}

      {activeSection === "notifications" ? (
        <form className="stream-block stack-form profile-form" onSubmit={(e) => void onNotifySave(e)}>
          <h2 className="form-title">Notifications</h2>
          <label className="checkbox-row">
            <input
              type="checkbox"
              name="emailNotifications"
              defaultChecked={user.emailNotifications !== false}
            />
            Email me about cinema reminders and premieres
          </label>
          <label className="checkbox-row">
            <input type="checkbox" name="pushEnabled" defaultChecked={user.pushEnabled === true} />
            Browser notifications when the tab is in the background
          </label>
          <label className="checkbox-row">
            <input type="checkbox" name="marketingEmails" defaultChecked={user.marketingEmails === true} />
            Product news, tips, and occasional promos from Izora
          </label>
          <button type="submit" className="btn-profile-save">
            Save notifications
          </button>
        </form>
      ) : null}

      {activeSection === "playback" ? (
        <form className="stream-block stack-form profile-form" onSubmit={(e) => void onPlaybackSave(e)}>
          <h2 className="form-title">Playback &amp; premieres</h2>
          <div className="settings-choice-group" role="radiogroup" aria-label="Premiere reminder lead time">
            <p className="small muted" style={{ marginTop: 0 }}>
              Remind me before a premiere I have a ticket for
            </p>
            <div className="settings-choice-grid">
              {REMINDER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={playbackReminderLead === opt.value}
                  className={
                    playbackReminderLead === opt.value
                      ? "settings-choice-chip settings-choice-chip--active"
                      : "settings-choice-chip"
                  }
                  onClick={() => setPlaybackReminderLead(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <label className="checkbox-row">
            <input type="checkbox" name="showtimesLocal" defaultChecked={user.showtimesLocal !== false} />
            Show premiere times in my local timezone
          </label>
          <label className="checkbox-row">
            <input type="checkbox" name="trailerAutoplay" defaultChecked={user.trailerAutoplay !== false} />
            Autoplay trailers when browsing (muted)
          </label>
          <label className="checkbox-row">
            <input type="checkbox" name="dataSaver" defaultChecked={user.dataSaver === true} />
            Data saver — lower default video quality when possible
          </label>
          <button type="submit" className="btn-profile-save">
            Save playback
          </button>
        </form>
      ) : null}

      {activeSection === "display" ? (
        <form className="stream-block stack-form profile-form" onSubmit={(e) => void onDisplaySave(e)}>
          <h2 className="form-title">Display</h2>
          <label className="checkbox-row">
            <input
              type="checkbox"
              name="displayOverApps"
              defaultChecked={user.displayOverApps !== false}
            />
            Show mini player over other apps
          </label>
          <p className="small muted">
            When supported, keep watching a premiere in a small window while you use other apps. On web,
            this uses picture-in-picture where your browser allows it.
          </p>
          <button type="submit" className="btn-profile-save">
            Save display
          </button>
        </form>
      ) : null}

      {activeSection === "privacy" ? (
        <form className="stream-block stack-form profile-form" onSubmit={(e) => void onPrivacySave(e)}>
          <h2 className="form-title">Privacy</h2>
          <div className="settings-choice-group" role="radiogroup" aria-label="Who can message me">
            <p className="small muted" style={{ marginTop: 0 }}>
              Who can message me
            </p>
            <div className="settings-choice-grid">
              <button
                type="button"
                role="radio"
                aria-checked={privacyDmSetting === "everyone"}
                className={
                  privacyDmSetting === "everyone"
                    ? "settings-choice-chip settings-choice-chip--active"
                    : "settings-choice-chip"
                }
                onClick={() => setPrivacyDmSetting("everyone")}
              >
                Everyone
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={privacyDmSetting === "followers"}
                className={
                  privacyDmSetting === "followers"
                    ? "settings-choice-chip settings-choice-chip--active"
                    : "settings-choice-chip"
                }
                onClick={() => setPrivacyDmSetting("followers")}
              >
                People I follow
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={privacyDmSetting === "none"}
                className={
                  privacyDmSetting === "none"
                    ? "settings-choice-chip settings-choice-chip--active"
                    : "settings-choice-chip"
                }
                onClick={() => setPrivacyDmSetting("none")}
              >
                No one
              </button>
            </div>
          </div>
          <p className="small muted">
            Blocked accounts can never message you. Message controls apply as DMs roll out.
          </p>
          <label className="checkbox-row">
            <input type="checkbox" name="profileLocked" defaultChecked={user.profileLocked === true} />
            Lock profile (non-followers see limited profile)
          </label>
          <button type="submit" className="btn-profile-save">
            Save privacy
          </button>
        </form>
      ) : null}

      {activeSection === "coins" ? (
        <section className="stream-block stack-form profile-form">
          <h2 className="form-title">Coins &amp; gifts</h2>
          <p className="stat-num">{user.coinBalance ?? 0} coins</p>
          <p className="small muted">
            Use coins to send gifts during creator live streams. Izora takes a commission on coin purchases
            and gifts.
          </p>
          <ul className="coin-pack-list" style={{ marginTop: "0.75rem" }}>
            {COIN_PACKS.map((pack) => (
              <li key={pack.id} className="coin-pack-row">
                <div>
                  <strong>{pack.label}</strong>
                  <p className="small muted">{formatMoney(pack.priceCents, pack.currency)}</p>
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    const res = purchaseCoinPack(pack.id);
                    flash(res.ok ? "Coins added (demo)." : "Could not purchase coins.");
                  }}
                >
                  Buy
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {activeSection === "blocked" ? (
        <section className="stream-block stack-form profile-form">
          <h2 className="form-title">Blocked accounts</h2>
          <p className="small muted">Blocked people cannot message you. You will not see each other in DMs.</p>
          {blocked.length === 0 ? (
            <p className="small muted">You have not blocked anyone.</p>
          ) : (
            <ul className="blocked-users-list">
              {blocked.map((b) => (
                <li key={b.id} className="blocked-user-row">
                  <div>
                    <strong>{b.displayName}</strong>
                    {b.username ? <span className="muted small"> @{b.username}</span> : null}
                  </div>
                  <button type="button" className="text-btn" onClick={() => unblockUser(b.id)}>
                    Unblock
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="small muted">
            To block someone, open their profile and tap <strong>Block</strong>.
          </p>
        </section>
      ) : null}

      {activeSection === "saved" ? (
        <section className="stream-block stack-form profile-form">
          <h2 className="form-title">Saved</h2>
          <p className="small muted">Quick access to your watch-later list and premiere tickets.</p>
          <ul className="settings-link-list">
            <li>
              <Link to="/saved" className="text-link">
                Saved · Watch later
              </Link>
            </li>
            <li>
              <Link to="/my-tickets" className="text-link">
                My premiere tickets
              </Link>
            </li>
          </ul>
        </section>
      ) : null}

      {activeSection === "help" ? (
        <section className="stream-block stack-form profile-form">
          <h2 className="form-title">Help &amp; support</h2>
          <p className="small">
            <strong>How Izora works:</strong> discover global films and creator videos, get a ticket,
            join the premiere room at showtime, and watch with the community - like a night at the
            cinema, online.
          </p>
          <ul className="settings-link-list">
            <li>
              <Link to="/premiere/join" className="text-link">
                Redeem a share code
              </Link>
            </li>
            <li>
              <Link to="/" className="text-link">
                Browse premieres
              </Link>
            </li>
          </ul>
          <p className="small muted">
            Need help? Email{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-link">
              {SUPPORT_EMAIL}
            </a>
            . Include your account email and what went wrong.
          </p>
        </section>
      ) : null}

      {activeSection === "about" ? (
        <section className="stream-block stack-form profile-form settings-about-panel">
          <h2 className="form-title">About Izora</h2>
          <p className="small">
            Izora is a global video, film, and creator platform. Creators can host ticketed screening
            nights, publish clips, go live, and reach audiences in their own regions and languages.
          </p>
          <p className="small muted">
            Built for audiences everywhere, with region-aware discovery and language-aware AI tools.
          </p>
          <dl className="settings-about-meta">
            <div>
              <dt>App version</dt>
              <dd>
                v{version} <span className="muted">({build})</span>
              </dd>
            </div>
          </dl>
        </section>
      ) : null}

      {activeSection === "shortcuts" ? (
        <section className="stream-block stack-form profile-form">
          <h2 className="form-title">Legal</h2>
          <ul className="settings-link-list">
            <li>
              <Link to="/saved" className="text-link">
                Saved · Watch later
              </Link>
            </li>
            <li>
              <Link to="/legal/terms" className="text-link">
                Terms of service
              </Link>
            </li>
            <li>
              <Link to="/legal/privacy" className="text-link">
                Privacy policy
              </Link>
            </li>
            <li>
              <Link to="/legal/guidelines" className="text-link">
                Community guidelines
              </Link>
            </li>
          </ul>
        </section>
      ) : null}

      {activeSection === "safety" ? (
        <section className="stream-block stack-form profile-form">
          <h2 className="form-title">Safety &amp; reporting</h2>
          <p className="small">
            You can report content that breaks our guidelines. Look for <strong>Report</strong> on:
          </p>
          <ul className="small settings-report-list">
            <li>Titles and community posts</li>
            <li>Comments on titles, clips, and posts</li>
            <li>Other people&apos;s profiles (report account)</li>
          </ul>
          <p className="small muted">
            Reports go to the moderation queue
            {isAdminEmail(user.email) ? " (you have Ops access)" : ""}.
          </p>
        </section>
      ) : null}

      {activeSection === "account" ? (
        <section className="stream-block settings-account profile-form">
          <h2 className="form-title">Account</h2>
          <p className="small muted">
            Signed in as <strong>{user.email}</strong>
            {authMode === "local" ? " (demo)" : ` · ${dataMode} data`}
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
                    Confirm email
                  </Link>
                </>
              )}
            </p>
          ) : null}
          {isAdminEmail(user.email) ? (
            <p className="small">
              <Link to="/admin" className="text-link">
                Ops console →
              </Link>
            </p>
          ) : null}
          <div className="btn-row">
            <button type="button" className="btn-secondary" onClick={() => void onSwitchAccount()}>
              Switch account
            </button>
            <button type="button" className="btn-secondary" onClick={() => void onRequestResetPassword()}>
              Reset password
            </button>
          </div>
          <form className="stack-form" onSubmit={(e) => void onChangeEmail(e)}>
            <label>
              Reset email
              <input
                type="email"
                name="newEmail"
                placeholder="new-email@example.com"
                defaultValue=""
                autoComplete="email"
              />
            </label>
            <button type="submit" className="btn-profile-save">
              Request email change
            </button>
          </form>
          <p className="small muted">
            Security extras (2FA, active sessions, sign out all devices) are next.
          </p>
          <button type="button" className="btn-sign-out" onClick={() => void onSignOut()}>
            Sign out
          </button>
        </section>
      ) : null}
      </div>
      </div>
    </div>
  );
}
