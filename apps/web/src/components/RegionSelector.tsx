import { useFilmData } from "../context/FilmDataContext";
import { useRegionFilter, listAvailableRegions } from "../hooks/useRegionFilter";
import { getDeviceLocaleInfo } from "../lib/localization";

export function RegionSelector() {
  const { state } = useFilmData();
  const { region, setRegion } = useRegionFilter();
  const regions = listAvailableRegions(state.titles);
  const deviceLocale = getDeviceLocaleInfo();

  if (regions.length === 0) return null;

  return (
    <div className="region-selector">
      <label className="region-selector-label">
        <span className="section-label">Region</span>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="region-selector-select"
          aria-label="Filter by region"
        >
          <option value="">Global — all regions</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <span className="small muted">
          Device: {deviceLocale.regionName ?? "global"} - {deviceLocale.languageName}
        </span>
      </label>
    </div>
  );
}
