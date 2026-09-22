"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BriefcaseIcon, ChevronDownIcon, LayerGroupIcon, LocationDotIcon, PinIcon, SearchIcon, UpRightAndDownLeftFromCenterIcon, XmarkIcon } from "./icons";
import type { ZoomTarget } from "./MapShiftReportSections";
import { MapShiftTimeline } from "./MapShiftTimeline";
import { MapStatsPanel } from "./MapStatsPanel";
import { FullShiftReportModal } from "./FullShiftReportModal";
import { buildDailyReport, buildMapAreaTypes, mapPageData, type DailyReportShift } from "../../lib/mapPageData";
import { buildShiftAreaTypeDetail, buildShiftReport } from "../../lib/mapShiftReportData";
import {
  computeDailyAreaCoverageBreakdown,
  computeDailyAreaServices,
  computeShiftAreaCoverageBreakdown,
  computeShiftAreaServices,
  statusForCounts,
  type AreaStatus,
} from "../../lib/mapAreaServiceData";
import { formatDateParam } from "../../lib/shiftReportListData";
import type { ContractBuilding } from "../../lib/sowContract";
import { ANCHOR_DATE } from "../../lib/sowData";
import styles from "./MapPage.module.css";

/** Worst-first order for rolling several areas' statuses up into one area type's status (see areaTypeStatuses below) — missed or incomplete anywhere in a type outranks it being over-serviced or fully completed elsewhere. */
const STATUS_PRIORITY: AreaStatus[] = ["missed", "incomplete", "over-serviced", "completed"];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Deterministic pseudo-position for an area on the map backdrop (28–78% x, 38–73% y — roughly the terminal footprint in public/map-clean.png), since real per-area geo-coordinates aren't part of the SOW export. */
function pseudoPositionForArea(areaId: string): { x: number; y: number } {
  let hash = 0;
  for (let i = 0; i < areaId.length; i++) hash = (hash * 31 + areaId.charCodeAt(i)) % 9973;
  return { x: 28 + (hash % 500) / 10, y: 38 + ((Math.floor(hash / 8)) % 350) / 10 };
}

export type MapPageProps = {
  contractBuildings: ContractBuilding[];
};

/**
 * MapPage — site-wide performance view over a map backdrop.
 * No Figma source: built from a reference screenshot of an internal
 * Mapbox dashboard. Rather than wiring up a real Mapbox instance
 * (API key, tile styling, 3D building layer), the backdrop is a
 * static image — this project's other "map" surfaces
 * (SitePerformanceSection, ManagerAppClockSheet) take the same
 * static-image approach.
 *
 * public/map-clean.png is derived from public/map.png (the original
 * reference screenshot, which has the whole dashboard UI baked into
 * its pixels, chrome and all) with the top bar, search/area-type
 * row, and bottom timeline strip painted out — this page rebuilds
 * those as real interactive elements, so the raw screenshot can't be
 * used directly as a backdrop without doubling every control.
 */
export function MapPage({ contractBuildings }: MapPageProps) {
  const [date, setDate] = useState(() => new Date(ANCHOR_DATE));
  const [searchValue, setSearchValue] = useState("");
  const [areaType, setAreaType] = useState(mapPageData.areaTypeOptions[0]);
  const [areaMenuOpen, setAreaMenuOpen] = useState(false);
  const [selectedShiftKey, setSelectedShiftKey] = useState<DailyReportShift["key"] | null>(null);
  const [selectedAreaTypeName, setSelectedAreaTypeName] = useState<string | null>(null);
  const [zoomTarget, setZoomTarget] = useState<ZoomTarget | null>(null);
  /** Permanently null — the status filter buttons are disabled (no-op onClick below), so every downstream stat/list that branches on "statusFilter === null" always takes its unfiltered path, and the sidebar/map content never changes from clicking them. */
  const statusFilter: AreaStatus | null = null;
  const [fullReportOpen, setFullReportOpen] = useState(false);
  const areaMenuRef = useRef<HTMLDivElement>(null);

  const dayOffset = Math.round((ANCHOR_DATE.getTime() - date.getTime()) / MS_PER_DAY);
  const mapAreaTypes = useMemo(() => buildMapAreaTypes(contractBuildings, dayOffset), [contractBuildings, dayOffset]);
  const dailyReport = useMemo(() => buildDailyReport(dayOffset, contractBuildings), [dayOffset, contractBuildings]);

  const selectedShift = selectedShiftKey ? (dailyReport.shifts.find((s) => s.key === selectedShiftKey) ?? null) : null;
  const shiftReport = useMemo(
    () => (selectedShift ? buildShiftReport(selectedShift, dayOffset, contractBuildings) : null),
    [selectedShift, dayOffset, contractBuildings]
  );
  const areaTypeDetail = useMemo(
    () => (selectedShift && selectedAreaTypeName ? buildShiftAreaTypeDetail(selectedShift, dayOffset, contractBuildings, selectedAreaTypeName) : null),
    [selectedShift, dayOffset, contractBuildings, selectedAreaTypeName]
  );
  /** Whole-day "Areas Serviced" breakdown for FullDayReportModal's Daily Summary sidebar — every one of the site's 709 areas against its combined expected/completed across the Day/Swing/Graveyard shifts (see computeDailyAreaCoverageBreakdown), so it's the same physical areas being counted once each for the day, not a fresh set (or a sum of shift-level counts) per shift. */
  const dailyAreaCoverage = useMemo(() => computeDailyAreaCoverageBreakdown(contractBuildings, dayOffset), [contractBuildings, dayOffset]);
  const zoomPosition = zoomTarget ? pseudoPositionForArea(zoomTarget.areaId) : null;

  /** Every area WITH a scheduled task for whatever's currently in view — the selected shift once one's picked, otherwise the whole day (see computeDailyAreaServices) — so the map pins and the sidebar's unfiltered Area Types list always agree. Deliberately narrower than dailyAreaCoverage/scopedAreaCoverage below: a status pin doesn't make sense for an area with nothing scheduled. */
  const activeAreaServices = useMemo(
    () => (selectedShift ? computeShiftAreaServices(contractBuildings, selectedShift.label, dayOffset) : computeDailyAreaServices(contractBuildings, dayOffset)),
    [selectedShift, contractBuildings, dayOffset]
  );

  /** Not/Under/Fully/Over-Serviced/No-Frequency area breakdown for the sidebar's "Areas Serviced" section, against the real site-wide area count (every shift is responsible for the whole site) — shift-filtered reads that shift's own numbers, unfiltered reuses dailyAreaCoverage, so the map sidebar and the Daily Report's Daily Summary always show identical day-level numbers. */
  const scopedAreaCoverage = useMemo(
    () => (selectedShift ? computeShiftAreaCoverageBreakdown(contractBuildings, selectedShift.label, dayOffset) : dailyAreaCoverage),
    [selectedShift, contractBuildings, dayOffset, dailyAreaCoverage]
  );

  /** Services Completed/Expected summed across just the areas the active status button narrows to (or every area, when no button is active) — so the sidebar's Services Completed stat always matches what the status filter is currently showing, not the whole site regardless of filter. */
  const filteredServicesStat = useMemo(() => {
    const relevant =
      statusFilter === null
        ? activeAreaServices
        : activeAreaServices.filter((area) => statusForCounts(area.servicesCompleted, area.servicesExpected) === statusFilter);
    const completed = relevant.reduce((sum, area) => sum + area.servicesCompleted, 0);
    const expected = relevant.reduce((sum, area) => sum + area.servicesExpected, 0);
    return { completed, expected, percent: expected > 0 ? Math.round((completed / expected) * 100) : 0 };
  }, [activeAreaServices, statusFilter]);

  /** Services Completed/Expected summed across every area in the current scope, regardless of the active status filter — the denominator MapStatsPanel uses to scale Hours Captured and Quality Scores down to just the filtered subset (there's no per-area hours/audit data to sum directly, so those are derived proportionally from how much of the site's total completed/expected services the filtered areas represent). */
  const totalServicesStat = useMemo(() => {
    const completed = activeAreaServices.reduce((sum, area) => sum + area.servicesCompleted, 0);
    const expected = activeAreaServices.reduce((sum, area) => sum + area.servicesExpected, 0);
    return { completed, expected };
  }, [activeAreaServices]);

  /** Area-type-level status (one map pin per type, not per individual area — 714 individual pins on pseudo-random positions would just be noise): the "worst" status present among the type's own areas, worst-first by STATUS_PRIORITY. A sum-of-the-type's-completed/expected approach would dilute a single missed or incomplete area into invisibility once a type has a dozen-plus otherwise-fine areas — this way one shortfall anywhere in a type still flags the whole type's pin. */
  const areaTypeStatuses = useMemo(() => {
    const statusesByType = new Map<string, Set<AreaStatus>>();
    activeAreaServices.forEach((area) => {
      const status = statusForCounts(area.servicesCompleted, area.servicesExpected);
      const statuses = statusesByType.get(area.areaTypeName) ?? new Set<AreaStatus>();
      statuses.add(status);
      statusesByType.set(area.areaTypeName, statuses);
    });
    const result = new Map<string, AreaStatus>();
    statusesByType.forEach((statuses, name) => {
      result.set(name, STATUS_PRIORITY.find((status) => statuses.has(status)) ?? "completed");
    });
    return result;
  }, [activeAreaServices]);

  /** Disabled — the status filter buttons are still clickable but intentionally don't change anything on the page (see the `statusFilter` constant above). */
  function toggleStatusFilter(_status: AreaStatus) {}

  useEffect(() => {
    if (!areaMenuOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (areaMenuRef.current && !areaMenuRef.current.contains(e.target as Node)) {
        setAreaMenuOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setAreaMenuOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [areaMenuOpen]);

  function shiftDay(delta: number) {
    setDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + delta);
      return next;
    });
  }

  function handleSelectShift(key: DailyReportShift["key"]) {
    setSelectedShiftKey(key);
    setSelectedAreaTypeName(null);
    setZoomTarget(null);
  }

  function handleBackToDaily() {
    setSelectedShiftKey(null);
    setSelectedAreaTypeName(null);
    setZoomTarget(null);
  }

  return (
    <div className={styles.page}>
      <div
        className={styles.backdropWrap}
        style={zoomPosition ? { transform: "scale(1.6)", transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%` } : undefined}
      >
        <img src="/map-clean.png" alt="" className={styles.backdrop} />
        {zoomTarget && zoomPosition && (
          <div className={styles.zoomPin} style={{ left: `${zoomPosition.x}%`, top: `${zoomPosition.y}%` }}>
            <LocationDotIcon className={styles.zoomPinIcon} />
            <span className={styles.zoomPinLabel}>{zoomTarget.displayName}</span>
          </div>
        )}
      </div>

      {zoomTarget && (
        <button type="button" className={styles.zoomResetButton} onClick={() => setZoomTarget(null)}>
          <XmarkIcon />
          Reset view
        </button>
      )}

      <header className={styles.topBar}>
        <img src="/brand/4insite-logo-dark.svg" alt="4Insite" className={styles.logo} width={32} height={32} />
        <button type="button" className={styles.chip}>
          <span className={styles.chipIcon}>
            <BriefcaseIcon />
          </span>
          <span>SBM</span>
        </button>
        <button type="button" className={styles.chip}>
          <span className={styles.chipIcon}>
            <PinIcon />
          </span>
          <span>Delta</span>
          <span className={styles.chipDivider} />
          <span>{mapPageData.siteName}</span>
        </button>
      </header>

      <div className={styles.controlBar}>
        <label className={styles.searchField}>
          <SearchIcon className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search area types"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className={styles.searchInput}
            aria-label="Search area types"
          />
        </label>

        <div className={styles.areaMenuWrap} ref={areaMenuRef}>
          <button
            type="button"
            className={styles.areaMenuButton}
            onClick={() => setAreaMenuOpen((open) => !open)}
            aria-haspopup="listbox"
            aria-expanded={areaMenuOpen}
          >
            <LayerGroupIcon className={styles.areaMenuIcon} />
            <span>{areaType}</span>
            <ChevronDownIcon className={styles.areaMenuCaret} />
          </button>
          {areaMenuOpen && (
            <ul className={styles.areaMenuList} role="listbox">
              {mapPageData.areaTypeOptions.map((option) => (
                <li key={option}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={option === areaType}
                    className={[styles.areaMenuItem, option === areaType ? styles.areaMenuItemActive : ""].filter(Boolean).join(" ")}
                    onClick={() => {
                      setAreaType(option);
                      setAreaMenuOpen(false);
                    }}
                  >
                    {option}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button type="button" className={styles.listViewButton}>
          <UpRightAndDownLeftFromCenterIcon className={styles.listViewIcon} />
          <span>List View</span>
        </button>
      </div>

      <Link href={`/manage-shift/daily-report?date=${formatDateParam(date)}`} className={styles.viewDailyReportButton}>
        <UpRightAndDownLeftFromCenterIcon className={styles.viewDailyReportIcon} />
        <span>View Daily Report</span>
      </Link>

      <div className={styles.statsPanelWrap}>
        <MapStatsPanel
          date={date}
          onPrevDay={() => shiftDay(-1)}
          onNextDay={() => shiftDay(1)}
          areaTypes={mapAreaTypes}
          selectedShift={selectedShift}
          onClearShiftFilter={handleBackToDaily}
          shiftReport={shiftReport}
          onZoomToArea={setZoomTarget}
          areaTypeDetail={areaTypeDetail}
          onSelectAreaType={setSelectedAreaTypeName}
          onClearAreaType={() => setSelectedAreaTypeName(null)}
          onOpenFullReport={() => setFullReportOpen(true)}
          statusFilter={statusFilter}
          onToggleStatusFilter={toggleStatusFilter}
          areaTypeStatuses={areaTypeStatuses}
          areaCoverage={scopedAreaCoverage}
          filteredServicesStat={filteredServicesStat}
          totalServicesStat={totalServicesStat}
        />
      </div>

      <footer className={styles.footer}>
        <MapShiftTimeline selectedShiftKey={selectedShiftKey} shifts={dailyReport.shifts} onSelectShift={handleSelectShift} />
      </footer>

      {fullReportOpen && shiftReport && (
        <FullShiftReportModal
          report={shiftReport}
          siteName={mapPageData.siteName}
          date={date}
          siteManager={dailyReport.siteManager}
          onClose={() => setFullReportOpen(false)}
        />
      )}
    </div>
  );
}
