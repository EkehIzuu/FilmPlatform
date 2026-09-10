import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { FilmDataProvider } from "./context/FilmDataContext";
import { initAnalytics, trackPageView } from "./lib/analytics";
import { initErrorMonitoring } from "./lib/sentry";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PaymentRecoveryListener } from "@/features/payments";
import "./index.css";

initAnalytics();
void initErrorMonitoring();

function RouteAnalytics() {
  const location = useLocation();
  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);
  return null;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <RouteAnalytics />
      <AuthProvider>
        <FilmDataProvider>
          <PaymentRecoveryListener />
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </FilmDataProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
