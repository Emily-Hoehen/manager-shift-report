/**
 * Data model for the End of Shift Report *list* — the page shown between
 * the Manager Queue's "End of Shift Report" card and the actual report
 * (EndOfShiftReportPage). One row per calendar day in the selected month,
 * each summarizing Day/Swing/Graveyard's own completion state for that day
 * (SHIFT_ORDER) so a manager can see a whole month at a glance before
 * drilling into a specific day's report.
 *
 * Today's row is the only one backed by real data — it reads the same
 * INITIAL_SHIFT_REPORTS/getShiftLiveStatus this session's End of Shift
 * Report itself uses, so the two pages never disagree about whether, say,
 * Swing has actually been completed yet. Every other day in the month is a
 * deterministic (not random — stable across renders) illustrative pattern,
 * the same convention as this feature's other static sample data.
 */

import {
  INITIAL_SHIFT_REPORTS,
  SHIFT_END_LABEL,
  SHIFT_LABELS,
  getManager,
  getShiftLiveStatus,
  type ShiftKey,
} from "./managerShiftReportData";

export const SHIFT_ORDER: ShiftKey[] = ["day", "swing", "graveyard"];

/** The LGA site's real Site Director (data/LGA Employees/lga_employees.csv) who signs off on a completed report. */
export const SITE_DIRECTOR = {
  name: "Juan Hernandez",
  role: "Site Director",
  avatar: "/lga-employees/juan-hernandez.png",
};

export type ShiftReportRowStatus = "completed" | "notSubmitted" | "dueLater" | "upcoming";

export type ShiftReportRow = {
  shiftKey: ShiftKey;
  status: ShiftReportRowStatus;
  completedByName?: string;
  completedByRole?: string;
  completedByAvatar?: string;
  /** "2:32 PM EDT | 9/17/2026" — only set when status is "completed"; when the manager actually submitted this shift's report. */
  completedAtLabel?: string;
  /** "Swing Shift Report due at 2:00PM EDT" — only set when status is "dueLater". */
  dueLabel?: string;
};

export type ShiftReportDayRow = {
  date: Date;
  isToday: boolean;
  isFuture: boolean;
  shifts: ShiftReportRow[];
  /** The Site Director signs off a whole day's reports together, not shift by shift — one flag per day, only ever true once every shift for that day has actually been submitted. */
  signedOffBySiteDirector: boolean;
  /** "7:02 AM EDT | 9/17/2026" — only set when signedOffBySiteDirector is true. */
  signedOffAtLabel?: string;
};

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "2:32 PM EDT | 9/17/2026" for a given day + minutes-since-midnight — used only to render a stand-in completion/sign-off timestamp, never for real date math. */
function formatClockAndDateLabel(onDate: Date, totalMinutes: number): string {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
  const stamp = new Date(onDate.getFullYear(), onDate.getMonth(), onDate.getDate(), 0, wrapped);
  const time = stamp.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const dateLabel = onDate.toLocaleDateString([], { month: "numeric", day: "numeric", year: "numeric" });
  return `${time} EDT | ${dateLabel}`;
}

/** "2:32 PM EDT | 9/17/2026" for right now — the timestamp a day gets when the Site Director actually signs off from the Shift Reports list, same format as every other sign-off/completion label on this page. */
export function formatSignOffNowLabel(): string {
  return formatClockAndDateLabel(new Date(), new Date().getHours() * 60 + new Date().getMinutes());
}

/** Roughly when a manager typically wraps up each shift's report — a few minutes past that shift's own scheduled end (SHIFT_END_LABEL). Only used to invent a plausible completedAtLabel for a past day's illustrative pattern (buildPastRow); today's own row uses the report's real completedAt instead. */
const SHIFT_TYPICAL_COMPLETION_MINUTES: Record<ShiftKey, number> = { day: 14 * 60 + 32, swing: 22 * 60 + 4, graveyard: 6 * 60 + 7 };

/** Roughly when the Site Director reviews and signs off a day's reports — the following morning, once Graveyard's own report is finally in. Only used to invent a plausible signedOffAtLabel for a past day's illustrative pattern. */
const SITE_DIRECTOR_SIGNOFF_MINUTES = 8 * 60 + 15;

/** Today's row reads the real EndOfShiftReportPage state — completed shifts show that shift's own completedBy, an ended-but-uncompleted shift reads "notSubmitted", and anything not yet ended shows "dueLater" against its own scheduled end time (SHIFT_END_LABEL). The Site Director signs off the whole day at once, so today's own day-level sign-off is always false — there's no point in the day where every shift is both submitted and already reviewed. */
function buildTodayRow(date: Date, now: Date): ShiftReportDayRow {
  const shifts: ShiftReportRow[] = SHIFT_ORDER.map((shiftKey) => {
    const report = INITIAL_SHIFT_REPORTS[shiftKey];
    const liveStatus = getShiftLiveStatus(shiftKey, now);
    if (liveStatus !== "ended") {
      return { shiftKey, status: "dueLater", dueLabel: `${SHIFT_LABELS[shiftKey]} Shift Report due at ${SHIFT_END_LABEL[shiftKey]}` };
    }
    if (!report.completedBy) {
      return { shiftKey, status: "notSubmitted" };
    }
    const completedByManager = getManager(report, report.completedBy);
    const dateLabel = date.toLocaleDateString([], { month: "numeric", day: "numeric", year: "numeric" });
    return {
      shiftKey,
      status: "completed",
      completedByName: completedByManager?.name,
      completedByRole: completedByManager?.role,
      completedByAvatar: completedByManager?.avatar,
      completedAtLabel: report.completedAt ? `${report.completedAt} | ${dateLabel}` : undefined,
    };
  });
  return { date, isToday: true, isFuture: false, shifts, signedOffBySiteDirector: false };
}

/**
 * Every past day gets a stable, non-random illustrative pattern (day-of-month, not a live record) rather than
 * a real submission history — this list has no backend to read a month of history from, so every day but
 * today is flavor data, same convention as this feature's other static samples. Two patterns show up on
 * purpose so both partial-completion states are visible somewhere in a typical month: every 9th day, two of
 * the three shifts (Day, Swing) are missing; every 11th day (that isn't already a two-missing day), just Swing
 * is missing. Every other day is fully submitted, with an occasional (every 6th day) still pending the Site
 * Director's own day-level sign-off — which only ever applies once every shift for that day is actually in.
 */
function buildPastRow(date: Date): ShiftReportDayRow {
  const dayOfMonth = date.getDate();
  const twoMissing = dayOfMonth % 9 === 0;
  const oneMissing = !twoMissing && dayOfMonth % 11 === 0;
  const allSubmitted = !twoMissing && !oneMissing;

  const shifts: ShiftReportRow[] = SHIFT_ORDER.map((shiftKey, index) => {
    const leadManager = INITIAL_SHIFT_REPORTS[shiftKey].managers[0];
    // index 0 = Day, 1 = Swing, 2 = Graveyard (SHIFT_ORDER).
    const missing = twoMissing ? index !== 2 : oneMissing && index === 1;
    if (missing) {
      return { shiftKey, status: "notSubmitted" };
    }
    const completedAtLabel = formatClockAndDateLabel(date, SHIFT_TYPICAL_COMPLETION_MINUTES[shiftKey] + (dayOfMonth % 9));
    return { shiftKey, status: "completed", completedByName: leadManager.name, completedByRole: leadManager.role, completedByAvatar: leadManager.avatar, completedAtLabel };
  });
  const signedOffBySiteDirector = allSubmitted && dayOfMonth % 6 !== 0;
  const signedOffAtLabel = signedOffBySiteDirector
    ? formatClockAndDateLabel(new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1), SITE_DIRECTOR_SIGNOFF_MINUTES + (dayOfMonth % 10))
    : undefined;
  return { date, isToday: false, isFuture: false, shifts, signedOffBySiteDirector, signedOffAtLabel };
}

function buildFutureRow(date: Date): ShiftReportDayRow {
  const shifts: ShiftReportRow[] = SHIFT_ORDER.map((shiftKey) => ({ shiftKey, status: "upcoming" }));
  return { date, isToday: false, isFuture: true, shifts, signedOffBySiteDirector: false };
}

/** Every calendar day of `monthDate`'s own month, oldest first — today (if it falls in this month) reads live report state, earlier days get an illustrative completion pattern, later days are just marked upcoming. */
export function buildShiftReportMonth(monthDate: Date, now: Date = new Date()): ShiftReportDayRow[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const days: ShiftReportDayRow[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    if (isSameDay(date, now)) days.push(buildTodayRow(date, now));
    else if (date.getTime() < startOfToday.getTime()) days.push(buildPastRow(date));
    else days.push(buildFutureRow(date));
  }
  return days;
}

/** "September 2026" — the list page's own month-filter label. */
export function getMonthLabel(monthDate: Date): string {
  return monthDate.toLocaleDateString([], { month: "long", year: "numeric" });
}

/**
 * The list's own default reading order — today first, then yesterday, then the day before that, and so on,
 * rather than plain oldest-to-newest. A day after today (still just "Upcoming") sorts after every past day
 * instead of before today, so the most actionable row (today) always leads and future placeholders trail at
 * the very end.
 */
export function sortDaysCurrentFirst(days: ShiftReportDayRow[], now: Date): ShiftReportDayRow[] {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const rank = (day: ShiftReportDayRow) => {
    const diffDays = Math.round((startOfToday - day.date.getTime()) / 86400000);
    return diffDays >= 0 ? diffDays : Number.MAX_SAFE_INTEGER + diffDays;
  };
  return [...days].sort((a, b) => rank(a) - rank(b));
}

/** "Thursday, September 17" — a day row's own date heading (no year; the month filter already states it). */
export function getDayRowDateLabel(date: Date): string {
  return date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

export function getCompletedCount(day: ShiftReportDayRow): number {
  return day.shifts.filter((s) => s.status === "completed").length;
}

/** Whether the Site Director has signed off this day's reports yet — a single day-level flag (see ShiftReportDayRow), not one per shift. */
export function isDaySignedOff(day: ShiftReportDayRow): boolean {
  return day.signedOffBySiteDirector;
}

/** "Day In Progress" under a day's own date — Figma fileKey 0UJDRcrFiXkn16yfc2MUEW, node 229:5034's "Shift Reports" list. Only shown while a shift still hasn't ended yet; a fully-ended day (whether clean, missing a report, or already signed off) shows nothing extra under its date. */
export function getDayInProgressLabel(day: ShiftReportDayRow): string | undefined {
  if (day.isFuture) return undefined;
  return day.shifts.some((s) => s.status === "dueLater") ? "Day In Progress" : undefined;
}

export type SignOffStatusTone = "success" | "warning" | "danger" | "neutral";
export type SignOffStatusDisplay = { title: string; caption?: string; tone: SignOffStatusTone };

/**
 * The day row's own "Sign-Off Status" column (Figma fileKey 0UJDRcrFiXkn16yfc2MUEW, node 229:5034) — one of
 * four states: still underway ("Pending Reports"), a manager missed a submission after the day ended
 * ("Signed Off Blocked"), every report is in but the Site Director hasn't reviewed it yet ("Pending
 * Sign-Off"), or the Site Director has already signed off ("Signed Off").
 */
export function getSignOffStatusDisplay(day: ShiftReportDayRow): SignOffStatusDisplay {
  if (day.isFuture) return { title: "Upcoming", tone: "neutral" };

  if (day.shifts.some((s) => s.status === "dueLater")) {
    return { title: "Pending Reports", caption: "Day In Progress", tone: "neutral" };
  }

  const missed = day.shifts.filter((s) => s.status === "notSubmitted");
  if (missed.length > 0) {
    const label = missed.map((s) => SHIFT_LABELS[s.shiftKey]).join(", ");
    return { title: "Signed Off Blocked", caption: `${label} Shift Report${missed.length === 1 ? "" : "s"} Incomplete`, tone: "danger" };
  }

  if (day.signedOffBySiteDirector) {
    return { title: "Signed Off", caption: day.signedOffAtLabel, tone: "success" };
  }

  return { title: "Pending Sign-Off", caption: "Awaiting Site Director", tone: "warning" };
}

/**
 * The "v2" flat data-grid layout (Figma fileKey 0UJDRcrFiXkn16yfc2MUEW, node 229:1569) — same
 * underlying day data as the accordion list above, regrouped into five columns instead of four:
 * a plain completion count, who completed each shift, the Site Director's own sign-off (their name
 * once signed, otherwise a short blocked/pending title), and a colored status tag for whatever still
 * needs attention. Unlike getSignOffStatusDisplay, the "which shifts are missing/still due" detail
 * lives on the completion count (missedCaption) and the status tag (tag/tagCaption) instead of a
 * caption under the sign-off column, matching the Figma layout's own column split.
 */
export type ShiftReportRowV2Display = {
  completedLabel: string;
  missedCaption?: string;
  completedByLabel: string;
  signOff:
    | { kind: "signedOff"; name: string; timestamp?: string }
    | { kind: "title"; title: string; caption?: string; tone: SignOffStatusTone };
  tag?: { label: string; tone: "warning" | "danger" };
  tagCaption?: string;
};

export function getShiftReportRowV2Display(day: ShiftReportDayRow): ShiftReportRowV2Display {
  const totalCount = day.shifts.length;
  const completedCount = getCompletedCount(day);
  const completedLabel = day.isFuture ? "—" : completedCount === totalCount ? "All Completed" : `${completedCount} / ${totalCount} Completed`;
  const completedByLabel = day.shifts.map((s) => s.completedByName).filter((name): name is string => Boolean(name)).join(", ") || "—";

  if (day.isFuture) {
    return { completedLabel, completedByLabel, signOff: { kind: "title", title: "Upcoming", tone: "neutral" } };
  }

  const dueLater = day.shifts.filter((s) => s.status === "dueLater");
  if (dueLater.length > 0) {
    const [next, ...rest] = dueLater;
    return {
      completedLabel,
      completedByLabel,
      signOff: { kind: "title", title: "Pending Reports", caption: "Day In Progress", tone: "neutral" },
      tag: { label: `${SHIFT_LABELS[next.shiftKey]} Shift due by ${SHIFT_END_LABEL[next.shiftKey]}`, tone: "warning" },
      tagCaption: rest.length > 0 ? rest.map((s) => `${SHIFT_LABELS[s.shiftKey]} due by ${SHIFT_END_LABEL[s.shiftKey]}`).join(", ") : undefined,
    };
  }

  const missed = day.shifts.filter((s) => s.status === "notSubmitted");
  if (missed.length > 0) {
    const label = missed.map((s) => SHIFT_LABELS[s.shiftKey]).join(", ");
    return {
      completedLabel,
      missedCaption: `${label} Report Incomplete`,
      completedByLabel,
      signOff: { kind: "title", title: "Sign Off Blocked", tone: "danger" },
      tag: { label: "Incomplete Reports", tone: "danger" },
    };
  }

  if (day.signedOffBySiteDirector) {
    return { completedLabel, completedByLabel, signOff: { kind: "signedOff", name: SITE_DIRECTOR.name, timestamp: day.signedOffAtLabel } };
  }

  return {
    completedLabel,
    completedByLabel,
    signOff: { kind: "title", title: "Sign Off Incomplete", tone: "danger" },
    tag: { label: "Sign-Off Incomplete", tone: "danger" },
  };
}
