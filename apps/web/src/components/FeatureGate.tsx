import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import type { FeatureFlags } from "../domain/types";
import { useFilmData } from "../context/FilmDataContext";

type Props = {
  flag: keyof FeatureFlags;
  children: ReactNode;
};

export function FeatureGate({ flag, children }: Props) {
  const { getFeatureFlags } = useFilmData();
  if (!getFeatureFlags()[flag]) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
