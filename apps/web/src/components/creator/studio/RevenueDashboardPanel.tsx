import { Link } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { useFilmData } from "../../../context/FilmDataContext";
import { buildBusinessAnalytics } from "../../../lib/businessAnalytics";
import { formatMoney } from "../../../lib/monetization";

export function RevenueDashboardPanel() {
  const { user } = useAuth();
  const { listAnalyticsEvents, state } = useFilmData();
  const events = listAnalyticsEvents();

  if (!user?.isCreator) {
    return <p className="muted small">Creator account required.</p>;
  }

  const biz = buildBusinessAnalytics(state, user.id, events);

  return (
    <div className="studio-panel filmmaker-panel">
      <div className="studio-panel-card biz-hero filmmaker-revenue-hero">
        <div className="studio-panel-head-row">
          <h2 className="studio-panel-title">Revenue</h2>
          <Link to="/creator/analytics" className="text-link small">
            Full analytics →
          </Link>
        </div>
        <div className="filmmaker-revenue-grid">
          <div>
            <span className="stat-label">Your net</span>
            <span className="stat-num stat-num--lg">{formatMoney(biz.creatorNetCents)}</span>
          </div>
          <div>
            <span className="stat-label">Gross sales</span>
            <span className="stat-num">{formatMoney(biz.grossCents)}</span>
          </div>
          <div>
            <span className="stat-label">Premiere tickets</span>
            <span className="stat-num">{biz.ticketsSold}</span>
            <p className="small muted">{biz.fillRatePct}% capacity fill</p>
          </div>
          <div>
            <span className="stat-label">Profile rentals</span>
            <span className="stat-num">{biz.paidTitleViews}</span>
            <p className="small muted">{formatMoney(biz.titleAccessRevenueCents)} net</p>
          </div>
        </div>
      </div>

      <div className="card-grid card-grid--compact">
        <div className="card">
          <h3 className="form-title">Premieres</h3>
          <p className="stat-num">{formatMoney(biz.premiereRevenueCents)}</p>
          <p className="small muted">{biz.reservationsCount} purchases</p>
        </div>
        <div className="card">
          <h3 className="form-title">Live gifts</h3>
          <p className="stat-num">{formatMoney(biz.liveGiftRevenueCents)}</p>
        </div>
        <div className="card">
          <h3 className="form-title">Boosts</h3>
          <p className="stat-num">{formatMoney(biz.boostRevenueCents)}</p>
        </div>
        <div className="card">
          <h3 className="form-title">Projected / mo</h3>
          <p className="stat-num">{formatMoney(biz.projectedMonthlyNet)}</p>
          <p className="small muted">Demo estimate</p>
        </div>
      </div>

      <div className="studio-panel-card" style={{ marginTop: "1rem" }}>
        <h3 className="form-title">Recent transactions</h3>
        {biz.recentTransactions.length === 0 ? (
          <p className="muted small">No sales yet — schedule a premiere or set a rental price.</p>
        ) : (
          <ul className="ledger-list">
            {biz.recentTransactions.map((tx) => (
              <li key={tx.id} className="small filmmaker-tx-row">
                <span>
                  <strong>{tx.label}</strong>
                  <span className="muted"> · {new Date(tx.at).toLocaleDateString()}</span>
                </span>
                <span>
                  {formatMoney(tx.netCents)} <span className="muted">net</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link to="/creator/monetization" className="text-link small" style={{ marginTop: "0.75rem" }}>
          Monetization settings →
        </Link>
      </div>
    </div>
  );
}
