import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/** Legacy route — creator tools live in Studio (home in creator mode). */
export function CreatorMore() {
  const { user } = useAuth();

  if (user?.isCreator) {
    return <Navigate to="/" replace />;
  }

  return <Navigate to="/profile" replace />;
}
