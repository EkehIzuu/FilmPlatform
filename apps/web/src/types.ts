export type AppMode = "fan" | "creator";

export type LayoutOutletContext = {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
};
