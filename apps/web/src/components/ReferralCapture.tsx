import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { captureReferralFromUrl } from "../lib/referral";
import { useFilmData } from "../context/FilmDataContext";

/** Captures ?ref= for attribution on every navigation. */
export function ReferralCapture() {
  const location = useLocation();
  const { trackEvent } = useFilmData();

  useEffect(() => {
    captureReferralFromUrl(location.search);
    const q = new URLSearchParams(location.search);
    const ref = q.get("ref");
    if (ref) trackEvent("referral_hit", { ref });
  }, [location.search, trackEvent]);

  return null;
}
