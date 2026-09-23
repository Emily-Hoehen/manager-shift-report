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
  /** The Site Director signs off a whole day's reports together, not shift by shift — one flag per day. Only possible once every shift has ended, but a shift whose report was never submitted doesn't block it. */
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

/** Roughly when the Site Director reviews and signs off a day's reports — the following morning, once Graveyard's own report is finally in. Same 7:30-8:00 AM window every day's sign-off falls in (see buildSignOffLabel in lib/mapPageData.ts, so the two pages' own illustrative sign-off times never disagree); only used to invent a plausible signedOffAtLabel for a past day's illustrative pattern. */
const SITE_DIRECTOR_SIGNOFF_MINUTES = 7 * 60 + 30;

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

/** Illustrative past days (day-of-month) with shift reports that never came in — every other past day
 * is fully submitted (see buildPastRow). A missed report doesn't stop the Site Director from signing
 * the day off, so these deliberately cover both outcomes: one or two shifts missed and signed off
 * anyway (SIGNED_OFF_DESPITE_MISSED_DAYS), and one or all three missed and still awaiting sign-off. */
const PAST_MISSED_SHIFTS: Record<number, ShiftKey[]> = {
  3: ["graveyard"],
  10: ["day", "swing", "graveyard"],
  15: ["swing", "graveyard"],
  17: ["graveyard"],
};

/** PAST_MISSED_SHIFTS days the Site Director signed off even with reports missing. */
const SIGNED_OFF_DESPITE_MISSED_DAYS = [3, 15];

/** Whether `shiftKey`'s report on `date` is one of PAST_MISSED_SHIFTS — shared with DailyReportPage
 * (its own ShiftRow tone) and EndOfShiftReportPage (whether that shift loads unlocked instead of
 * pre-seeded "completed"), so every surface agrees about which past shift, on which day, never
 * actually got submitted. */
export function isPastMissedShift(shiftKey: ShiftKey, date: Date): boolean {
  return PAST_MISSED_SHIFTS[date.getDate()]?.includes(shiftKey) ?? false;
}

/**
 * Every past day gets a stable, non-random illustrative pattern (day-of-month, not a live record) rather than
 * a real submission history — this list has no backend to read a month of history from, so every day but
 * today is flavor data, same convention as this feature's other static samples. Only today's own row (see
 * buildTodayRow) can show a shift still in progress; PAST_MISSED_SHIFTS are the only past days with a
 * shift not submitted — every other past day's shifts are fully submitted. Sign-off follows its own
 * every-6th-day pattern below, with PAST_MISSED_SHIFTS days set explicitly instead.
 */
function buildPastRow(date: Date): ShiftReportDayRow {
  const dayOfMonth = date.getDate();
  const hasMissedShift = SHIFT_ORDER.some((key) => isPastMissedShift(key, date));

  const shifts: ShiftReportRow[] = SHIFT_ORDER.map((shiftKey) => {
    if (isPastMissedShift(shiftKey, date)) return { shiftKey, status: "notSubmitted" };

    const leadManager = INITIAL_SHIFT_REPORTS[shiftKey].managers[0];
    const completedAtLabel = formatClockAndDateLabel(date, SHIFT_TYPICAL_COMPLETION_MINUTES[shiftKey] + (dayOfMonth % 9));
    return {
      shiftKey,
      status: "completed",
      completedByName: leadManager.name,
      completedByRole: leadManager.role,
      completedByAvatar: leadManager.avatar,
      completedAtLabel,
    };
  });
  const signedOffBySiteDirector = hasMissedShift ? SIGNED_OFF_DESPITE_MISSED_DAYS.includes(dayOfMonth) : dayOfMonth % 6 !== 0;
  const signedOffAtLabel = signedOffBySiteDirector
    ? formatClockAndDateLabel(new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1), SITE_DIRECTOR_SIGNOFF_MINUTES + (dayOfMonth % 10))
    : undefined;
  return { date, isToday: false, isFuture: false, shifts, signedOffBySiteDirector, signedOffAtLabel };
}

/** Every calendar day of `monthDate`'s own month that has actually happened so far, oldest first — today (if it falls in this month) reads live report state, earlier days get an illustrative completion pattern. Days later than today aren't real yet, so they're left out of the grid entirely rather than shown as "Upcoming". */
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

/** Round-trips a day row's own date through a `?date=` URL param (see dailyReportHref and the Daily
 * Report/End of Shift Report pages it links to) — plain `toISOString()` would shift the day backward
 * for any timezone west of UTC, since it converts to UTC first; this keeps the same calendar day the
 * list itself is showing, both encoding and decoding in local time. */
export function formatDateParam(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateParam(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
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

export type StatusTone = "success" | "warning" | "danger" | "neutral";
export type SignOffStatusTone = StatusTone;
export type StatusDisplay = { title: string; caption?: string; tone: StatusTone };
export type SignOffStatusDisplay = StatusDisplay;

/**
 * The day row's own "Shift Reports" column — how many of the day's three shift reports came in. Still
 * underway (neutral, with whichever report is due next), one or more never submitted once the day
 * ended (danger, naming which), or all three in (success).
 */
export function getShiftReportsStatusDisplay(day: ShiftReportDayRow): StatusDisplay {
  const submitted = getCompletedCount(day);
  const title = `${submitted}/${day.shifts.length} Shifts Submitted`;

  const nextDue = day.shifts.find((s) => s.status === "dueLater");
  if (nextDue) return { title, caption: nextDue.dueLabel, tone: "neutral" };

  const missed = day.shifts.filter((s) => s.status === "notSubmitted");
  if (missed.length === day.shifts.length) return { title, caption: "No Shift Reports Submitted", tone: "danger" };
  if (missed.length > 0) {
    const label = missed.map((s) => SHIFT_LABELS[s.shiftKey]).join(", ");
    return { title, caption: `${label} Shift${missed.length === 1 ? "" : "s"} Not Submitted`, tone: "danger" };
  }

  return { title, tone: "success" };
}

/**
 * The day row's own "Sign-Off Status" column (Figma fileKey 0UJDRcrFiXkn16yfc2MUEW, node 229:5034) — one of
 * three states: still underway ("Pending Reports"), the day has ended but the Site Director hasn't
 * reviewed it yet ("Pending Sign-Off"), or the Site Director has already signed off ("Signed Off").
 * Missing shift reports don't block sign-off — getShiftReportsStatusDisplay reports those separately.
 */
export function getSignOffStatusDisplay(day: ShiftReportDayRow): SignOffStatusDisplay {
  if (day.isFuture) return { title: "Upcoming", tone: "neutral" };

  if (day.shifts.some((s) => s.status === "dueLater")) {
    return { title: "Pending Reports", caption: "Day In Progress", tone: "neutral" };
  }

  if (day.signedOffBySiteDirector) {
    return { title: "Signed Off", caption: day.signedOffAtLabel, tone: "success" };
  }

  return { title: "Pending Sign-Off", caption: "Awaiting Site Director", tone: "warning" };
}

