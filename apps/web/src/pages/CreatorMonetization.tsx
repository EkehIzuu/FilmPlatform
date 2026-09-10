import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useFilmData } from "../context/FilmDataContext";
import { BOOST_PRODUCTS, COIN_PACKS, formatMoney, LIVE_GIFTS, PLATFORM_COMMISSION_RATE } from "../lib/monetization";

export function CreatorMonetization() {
  const { user } = useAuth();
  const { purchaseCoinPack, purchaseBoost } = useFilmData();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!user?.isCreator) {
    return (
      <div className="page">
        <PageHeader title="Monetization" subtitle="Creator tools" />
        <p className="hint-banner">Creator account required.</p>
      </div>
    );
  }

  const onBuyCoins = (packId: string) => {
    setErr(null);
    setMsg(null);
    const res = purchaseCoinPack(packId);
    if (res.ok) setMsg("Coins added to your wallet (demo).");
    else setErr(res.error === "sign-in" ? "Sign in first." : "Could not purchase.");
  };

  return (
    <div className="page">
      <PageHeader
        title="Monetization"
        subtitle={`Izora takes ${Math.round(PLATFORM_COMMISSION_RATE * 100)}% on paid premieres, rentals, gifts, and boosts.`}
      />

      <section className="card">
        <h2 className="form-title">Your wallet</h2>
        <p className="stat-num">{user.coinBalance ?? 0} coins</p>
        <p className="small muted">Fans buy coins to send gifts on your live streams.</p>
      </section>

      <section className="card" style={{ marginTop: "1rem" }}>
        <h2 className="form-title">Buy coins (demo)</h2>
        <ul className="coin-pack-list">
          {COIN_PACKS.map((pack) => (
            <li key={pack.id} className="coin-pack-row">
              <div>
                <strong>{pack.label}</strong>
                <p className="small muted">{formatMoney(pack.priceCents, pack.currency)}</p>
              </div>
              <button type="button" className="btn-secondary" onClick={() => onBuyCoins(pack.id)}>
                Buy
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card" style={{ marginTop: "1rem" }}>
        <h2 className="form-title">Live gifts (fan → you)</h2>
        <p className="small muted">When fans tip on your live, you keep ~70% after coin conversion.</p>
        <ul className="ledger-list">
          {LIVE_GIFTS.map((g) => (
            <li key={g.id} className="small">
              {g.label} — {g.coins} coins
            </li>
          ))}
        </ul>
      </section>

      <section className="card" style={{ marginTop: "1rem" }}>
        <h2 className="form-title">Promotion boosts</h2>
        <ul className="ledger-list">
          {BOOST_PRODUCTS.map((b) => (
            <li key={b.id} className="small">
              <strong>{b.label}</strong> — {formatMoney(b.priceCents, b.currency)}
              <button
                type="button"
                className="text-btn"
                style={{ marginLeft: "0.5rem" }}
                onClick={() => {
                  const res = purchaseBoost(b.id);
                  if (res.ok) setMsg(`${b.label} purchased (demo) — see analytics for platform fee.`);
                  else setErr("Could not purchase boost.");
                }}
              >
                Purchase
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card" style={{ marginTop: "1rem" }}>
        <h2 className="form-title">How you earn</h2>
        <ul className="small settings-report-list">
          <li>
            <strong>Profile watch</strong> — set a title free or paid; upload without a premiere.
          </li>
          <li>
            <strong>Premiere night</strong> — ticketed synced screening (scheduled showing).
          </li>
          <li>
            <strong>Live stream</strong> — profile-based; gifts use coins.
          </li>
        </ul>
        <p className="small" style={{ marginTop: "0.75rem" }}>
          <Link to="/creator/analytics" className="text-link">
            View analytics →
          </Link>
        </p>
      </section>

      {msg ? <p className="hint-banner">{msg}</p> : null}
      {err ? <p className="auth-error">{err}</p> : null}
    </div>
  );
}
