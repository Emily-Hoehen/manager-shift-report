/**
 * Static content for the Map feature — a site-wide performance view
 * over a map backdrop (public/map.png). Built from a reference
 * screenshot of an internal Mapbox-based dashboard; no Figma source.
 * Figures are illustrative sample data in the same spirit as
 * lib/homeDashboardData.ts, scoped to the LGA-LaGuardia site already
 * used across this project's other prototypes.
 *
 * The sidebar's Area Types / Areas lists (added from Figma fileKey
 * SWFMjlBJ4u9vSrVaomRe12, node 180:10834) are the exception — those
 * are real, aggregated from the actual SOW export via
 * lib/sowContract.ts's ContractBuilding[] (data/SOW_DeltaLGA.csv:
 * 7 buildings, 40 area types, 714 areas site-wide), the same source
 * ScopeOfWorkPage.tsx reads. Scores reuse lib/sowData.ts's
 * `scoreForDay` and photos reuse lib/sowImages.ts's
 * `photoForAreaType`, matching how ScopeOfWorkPage derives its own
 * area-type cards, so the Map's numbers move with the same date nav
 * convention (dayOffset: 0 = today, 1 = yesterday, ...).
 */

import type { ContractBuilding } from "./sowContract";
import { photoForAreaType } from "./sowImages";
import { hashSeed, scaleForDay, scoreForDay } from "./sowData";
import { computeShiftAreaServices } from "./mapAreaServiceData";

export type QualityScore = {
  label: string;
  count: string;
  value: string;
  tone: "success" | "neutral";
};

export const mapPageData = {
  siteName: "LGA-LaGuardia, NY",
  areaTypeOptions: ["Departures", "Arrivals", "Baggage Claim", "Concourses"],
  hoursCaptured: {
    value: "1,138h 5m",
    expectedLabel: "of 1,233h 42m shift time",
    percent: 92,
  },
  qualityScores: [
    { label: "AI Verification", count: "2,971 services", value: "4.87", tone: "success" },
    { label: "Internal Audit", count: "13 audits", value: "4.4", tone: "success" },
    { label: "Joint Audit", count: "0 audits", value: "N/A", tone: "neutral" },
    { label: "Customer Audit", count: "0 audits", value: "N/A", tone: "neutral" },
  ] satisfies QualityScore[],
};



/**
 * Half-hour service-activity bars from 6 AM to 5:30 AM the next day
 * (48 slots = a full 24-hour shift cycle), split into three equal
 * 8-hour bands — Day/Swing/Graveyard — matching the reference
 * screenshot's silhouette: a morning departures rush, a moderate
 * midday lull, an evening swing-shift peak, and a quiet overnight
 * graveyard with a small pre-dawn bump.
 */
export const shiftTimelineValues: number[] = [
  // Day 6:00–13:30
  85, 80, 72, 65, 58, 50, 44, 40, 34, 30, 26, 24, 22, 20, 18, 17,
  // Swing 14:00–21:30
  46, 50, 55, 58, 54, 50, 48, 52, 56, 60, 58, 54, 48, 42, 36, 30,
  // Graveyard 22:00–5:30
  22, 18, 14, 12, 10, 9, 8, 10, 13, 11, 9, 8, 7, 9, 12, 16,
];

export const shiftBands = [
  { label: "Day", startIndex: 0 },
  { label: "Swing", startIndex: 16 },
  { label: "Graveyard", startIndex: 32 },
];

/** One label every 6 slots (3 hours) — hour-of-day per slot, 6 = 6 AM ... 29 = 5 AM next day. */
export const shiftTimelineHours: number[] = Array.from({ length: 48 }, (_, i) => 6 + i * 0.5);

/* ---------------- Real Area Types / Areas (data/SOW_DeltaLGA.csv) ---------------- */

export type MapAreaTypeRow = {
  name: string;
  areaCount: number;
  score: number;
  photo?: string;
};

/** Every unique area type across all 7 buildings, area counts summed site-wide — mirrors ScopeOfWorkPage's own areaTypeGroups aggregation. */
export function buildMapAreaTypes(buildings: ContractBuilding[], dayOffset: number): MapAreaTypeRow[] {
  const totals = new Map<string, number>();
  buildings.forEach((building) => {
    building.areaTypes.forEach((areaType) => {
      totals.set(areaType.name, (totals.get(areaType.name) ?? 0) + areaType.areas.length);
    });
  });
  return Array.from(totals.entries()).map(([name, areaCount]) => ({
    name,
    areaCount,
    score: scoreForDay(name, dayOffset),
    photo: photoForAreaType(name, name),
  }));
}

/* ---------------- Daily report (right sidebar) ---------------- */

export type DailyReportPerson = {
  name: string;
  position: string;
  avatar: string;
};

export type DailyReportShift = {
  key: "day" | "swing" | "graveyard";
  label: string;
  timeRange: string;
  managers: DailyReportPerson[];
  hoursPercent: number;
  servicePercent: number;
  /** Real count of site-wide areas with at least one task scheduled for this shift (data/SOW_DeltaLGA.csv's own `shift` column) — the denominator missedServicesCount/Label are scaled against. */
  totalAreas: number;
  missedServicesCount: number;
  missedServicesLabel: string;
};

/** The site's overall manager-of-record. */
const siteManager: DailyReportPerson = {
  name: "Juan Hernandez",
  position: "Site Director",
  avatar: "/Juan.png",
};

/**
 * Each shift is covered by more than one manager — a lead (the shift's
 * long-standing named manager) plus two co-managers, all specific named
 * people with their own avatars in /public rather than pulled from
 * data/managers.csv. The lead is always managers[0]: FullDayReportModal's
 * Shift Manager section shows only the lead's own checkout status, and
 * buildNote's pickManager still picks from this whole array for
 * shift-note authorship — including buildShiftNote's own Day-shift
 * handoff note, which is specifically authored by Carmen Ramos.
 */
const shiftManagers: Record<DailyReportShift["key"], DailyReportPerson[]> = {
  day: [
    { name: "William Guy", position: "Senior Site Manager", avatar: "/william.png" },
    { name: "Betty Rodriguez", position: "Operations Manager", avatar: "/Betty.jpg" },
    { name: "Edga Tacuri", position: "Site Supervisor", avatar: "/Edga.png" },
    { name: "Carmen Ramos", position: "Site Supervisor", avatar: "/Carmen.png" },
  ],
  swing: [
    { name: "Carlos Muruzumbay", position: "Shift Manager", avatar: "/Carlos.png" },
    { name: "Tonya Breland", position: "Site Supervisor", avatar: "/Tonya.png" },
    { name: "Kadeem Byfield", position: "Site Supervisor", avatar: "/Kadeem.png" },
  ],
  graveyard: [
    { name: "Braulio Abreu", position: "Shift Manager", avatar: "/Braulio.png" },
    { name: "Anabel Ramirez", position: "Site Supervisor", avatar: "/Anabel.jpg" },
    { name: "David Padilla", position: "Site Supervisor", avatar: "/David.png" },
  ],
};

function missedServicesLabel(count: number, total: number): string {
  if (count === 0) return `All ${total.toLocaleString()} areas serviced, none missed`;
  return `${count.toLocaleString()} of ${total.toLocaleString()} areas had missed services`;
}

/** Two-paragraph AI overview for the whole day, aggregated from the three shifts just built. The first paragraph is the data recap (missed areas, hours captured); the second is written as the Site Director's own sign-off remark — he reviewed all three shifts before signing off, so it reads as a personal note on staffing/coverage rather than another generated stat line. Joined with "\n" so callers that render one paragraph per line (FullDayReportModal, MapStatsPanel) split on it. */
function buildAiOverview(shifts: DailyReportShift[]): string {
  const totalMissed = shifts.reduce((sum, s) => sum + s.missedServicesCount, 0);
  const worstShift = shifts.reduce((worst, s) => (s.missedServicesCount > worst.missedServicesCount ? s : worst));
  const avgHoursPercent = Math.round(shifts.reduce((sum, s) => sum + s.hoursPercent, 0) / shifts.length);
  const avgServicePercent = Math.round(shifts.reduce((sum, s) => sum + s.servicePercent, 0) / shifts.length);
  const bestShift = shifts.reduce((best, s) => (s.servicePercent > best.servicePercent ? s : best));

  const recap = `Across all three shifts today, ${totalMissed.toLocaleString()} areas missed at least one service. ${worstShift.label} shift saw the most, with ${worstShift.missedServicesCount.toLocaleString()}. Hours captured averaged ${avgHoursPercent}% of paid time across the team.`;
  const signOffNote = `I reviewed each shift's handoff notes, staffing levels, and coverage gaps before signing off on the day. Service completion averaged ${avgServicePercent}% of expected volume, led by ${bestShift.label} shift, and every open item from earlier in the day was closed out by the time the next shift picked up. Overall a solid, well-covered day across the site.`;

  return `${recap}\n${signOffNote}`;
}

/** "Signed off at 7:47 AM EDT" for the site manager row — every day's sign-off falls in the same
 * real-world 7:30-8:00 AM window (the morning after Graveyard wraps, before the next Day shift's own
 * report is due), just jittered a few deterministic minutes per day instead of literally identical. */
function buildSignOffLabel(dayOffset: number): string {
  const minute = 30 + (Math.abs(hashSeed(`site-manager-signoff-${dayOffset}`)) % 30);
  return `Signed off at 7:${String(minute).padStart(2, "0")} AM EDT`;
}

/** Per-shift Hours/Service % for the Daily Report panel — real shift managers from data/managers.csv (their own `Shift` column matches) and a real total-areas-for-shift/missed-areas count from lib/mapAreaServiceData.ts's computeShiftAreaServices (the same per-area model the Shift Report drill-down reads, so the two surfaces always agree). */
export function buildDailyReport(
  dayOffset: number,
  buildings: ContractBuilding[]
): { siteManager: DailyReportPerson; siteManagerSignOff: string; aiOverview: string; shifts: DailyReportShift[] } {
  const shiftDefs: { key: DailyReportShift["key"]; label: string; timeRange: string }[] = [
    { key: "day", label: "Day", timeRange: "6:00 AM – 2:00 PM" },
    { key: "swing", label: "Swing", timeRange: "2:00 PM – 10:00 PM" },
    { key: "graveyard", label: "Graveyard", timeRange: "10:00 PM – 6:00 AM" },
  ];
  const shifts = shiftDefs.map((def) => {
    const managers = shiftManagers[def.key];
    const areaServices = computeShiftAreaServices(buildings, def.label, dayOffset);
    const totalAreas = areaServices.length;
    const missedCount = areaServices.filter((a) => a.servicesCompleted < a.servicesExpected).length;
    return {
      ...def,
      managers,
      hoursPercent: Math.round(scaleForDay(`${def.key}-hours`, dayOffset, 84, 101)),
      servicePercent: Math.round(scaleForDay(`${def.key}-service`, dayOffset, 90, 112)),
      totalAreas,
      missedServicesCount: missedCount,
      missedServicesLabel: missedServicesLabel(missedCount, totalAreas),
    };
  });
  return { siteManager, siteManagerSignOff: buildSignOffLabel(dayOffset), aiOverview: buildAiOverview(shifts), shifts };
}

