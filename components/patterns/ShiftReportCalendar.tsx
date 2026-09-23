import Link from "next/link";
import { StatusTag } from "../ui/StatusTag";
import { CircleExclamationIcon } from "./icons";
import {
  getDayRowDateLabel,
  getShiftReportsStatusDisplay,
  getSignOffStatusDisplay,
  type ShiftReportDayRow,
} from "../../lib/shiftReportListData";
import styles from "./ShiftReportCalendar.module.css";

export type ShiftReportCalendarProps = {
  /** The month on screen — any date inside it works; only its year/month are read. */
  monthDate: Date;
  /** buildShiftReportMonth's own rows for monthDate — only days that have actually happened, today included. */
  days: ShiftReportDayRow[];
  /** Where a day's cell links to — the same Daily Report href the list row uses, so both views open the same page. */
  getDayHref: (day: ShiftReportDayRow) => string;
  theme?: "light" | "dark";
};

const WEEKDAYS = [
  { short: "Sun", long: "Sunday" },
  { short: "Mon", long: "Monday" },
  { short: "Tue", long: "Tuesday" },
  { short: "Wed", long: "Wednesday" },
  { short: "Thu", long: "Thursday" },
  { short: "Fri", long: "Friday" },
  { short: "Sat", long: "Saturday" },
];

type CalendarCell =
  | { kind: "outside"; dayOfMonth: number; key: string }
  | { kind: "notYet"; dayOfMonth: number; key: string }
  | { kind: "report"; dayOfMonth: number; key: string; day: ShiftReportDayRow };

/** Sun–Sat weeks covering monthDate's month — padded front and back with the neighboring months' own dates (greyed, inert) so every week is a full row. A day in this month with no row yet (still ahead of today) gets a bare date and nothing else. */
function buildWeeks(monthDate: Date, days: ShiftReportDayRow[]): CalendarCell[][] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = new Date(year, month, 1).getDay();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const rowsByDayOfMonth = new Map(days.map((day) => [day.date.getDate(), day]));

  const cells: CalendarCell[] = [];
  for (let i = leading; i > 0; i--) {
    cells.push({ kind: "outside", dayOfMonth: daysInPrevMonth - i + 1, key: `prev-${i}` });
  }
  for (let dayOfMonth = 1; dayOfMonth <= daysInMonth; dayOfMonth++) {
    const day = rowsByDayOfMonth.get(dayOfMonth);
    cells.push(day ? { kind: "report", dayOfMonth, key: `day-${dayOfMonth}`, day } : { kind: "notYet", dayOfMonth, key: `day-${dayOfMonth}` });
  }
  for (let dayOfMonth = 1; cells.length % 7 !== 0; dayOfMonth++) {
    cells.push({ kind: "outside", dayOfMonth, key: `next-${dayOfMonth}` });
  }

  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/**
 * ShiftReportCalendar — the Shift Reports list's month-at-a-glance view: a Sun–Sat grid where each day
 * that has happened shows its latest sign-off status (getSignOffStatusDisplay) as the same StatusTag the
 * list row's own Sign-Off Status column uses, plus a one-line shift report count underneath — red when
 * any report is missing, since a day can be signed off with reports still missing. Every such day links
 * to that day's Daily Report, exactly like its list row does.
 */
export function ShiftReportCalendar({ monthDate, days, getDayHref, theme = "light" }: ShiftReportCalendarProps) {
  const weeks = buildWeeks(monthDate, days);

  return (
    <div className={styles.calendar} data-theme={theme}>
      <table className={styles.table}>
        <thead>
          <tr>
            {WEEKDAYS.map((weekday) => (
              <th key={weekday.short} scope="col" className={styles.weekday}>
                <abbr title={weekday.long}>{weekday.short}</abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0].key}>
              {week.map((cell) => (
                <CalendarDayCell key={cell.key} cell={cell} getDayHref={getDayHref} theme={theme} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type CalendarDayCellProps = {
  cell: CalendarCell;
  getDayHref: (day: ShiftReportDayRow) => string;
  theme: "light" | "dark";
};

function CalendarDayCell({ cell, getDayHref, theme }: CalendarDayCellProps) {
  if (cell.kind !== "report") {
    return (
      <td className={styles.cell} data-kind={cell.kind}>
        <div className={styles.cellInner}>
          <span className={styles.dateNumber}>{cell.dayOfMonth}</span>
        </div>
      </td>
    );
  }

  const { day } = cell;
  const status = getSignOffStatusDisplay(day);
  const reports = getShiftReportsStatusDisplay(day);
  const isMissingReports = reports.tone === "danger";
  const accessibleLabel = [getDayRowDateLabel(day.date), day.isToday ? "Today" : null, status.title, reports.title, reports.caption]
    .filter(Boolean)
    .join(", ");

  return (
    <td className={styles.cell} data-kind="report" data-today={day.isToday || undefined}>
      <Link href={getDayHref(day)} className={styles.cellLink} aria-label={accessibleLabel} aria-current={day.isToday ? "date" : undefined}>
        <span className={styles.dateRow}>
          <span className={styles.dateNumber}>{cell.dayOfMonth}</span>
          {day.isToday && <span className={styles.todayTag}>Today</span>}
        </span>
        <StatusTag tone={status.tone} label={status.title} theme={theme} labelClassName={styles.statusTitle} />
        <span className={styles.reportsLine} data-missing={isMissingReports || undefined}>
          {isMissingReports && (
            <span className={styles.reportsIcon}>
              <CircleExclamationIcon />
            </span>
          )}
          <span className={styles.reportsText}>{reports.title}</span>
        </span>
      </Link>
    </td>
  );
}
