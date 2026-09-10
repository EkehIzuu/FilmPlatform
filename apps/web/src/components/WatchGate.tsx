import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useFilmData } from "../context/FilmDataContext";

type Props = {
  children: ReactNode;
};

export function WatchGate({ children }: Props) {
  const { getFeatureFlags } = useFilmData();
  const f = getFeatureFlags();
  if (!f.premiere && !f.live) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
