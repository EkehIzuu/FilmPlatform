import type { ReactNode } from "react";

export type StudioTabId =
  | "overview"
  | "films"
  | "premieres"
  | "revenue"
  | "audience"
  | "live"
  | "profile";

const TABS: { id: StudioTabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "films", label: "Films" },
  { id: "premieres", label: "Premieres" },
  { id: "revenue", label: "Revenue" },
  { id: "audience", label: "Audience" },
  { id: "live", label: "Live" },
  { id: "profile", label: "Profile" },
];

type Props = {
  active: StudioTabId;
  onChange: (id: StudioTabId) => void;
  children: ReactNode;
};

export function StudioTabs({ active, onChange, children }: Props) {
  return (
    <div className="studio-tabs">
      <div className="studio-tabs-list studio-tabs-list--scroll" role="tablist" aria-label="Filmmaker studio">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            className={active === tab.id ? "studio-tab active" : "studio-tab"}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="studio-tabs-panel" role="tabpanel">
        {children}
      </div>
    </div>
  );
}
