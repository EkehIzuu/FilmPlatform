import type { AppMode } from "../types";

type Props = {
  mode: AppMode;
  onChange: (mode: AppMode) => void;
  className?: string;
};

export function ModeToggle({ mode, onChange, className = "" }: Props) {
  return (
    <div
      className={`mode-toggle ${className}`.trim()}
      role="group"
      aria-label="Fan or Creator mode"
    >
      <button
        type="button"
        className={mode === "fan" ? "active" : ""}
        onClick={() => onChange("fan")}
      >
        Fan
      </button>
      <button
        type="button"
        className={mode === "creator" ? "active" : ""}
        onClick={() => onChange("creator")}
      >
        Creator
      </button>
    </div>
  );
}
