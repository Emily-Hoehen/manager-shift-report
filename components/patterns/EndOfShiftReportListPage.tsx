"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Nav } from "./Nav";
import { ManagerQueuePanel } from "./ManagerQueuePanel";
import { ButtonGroup } from "../ui/ButtonGroup";
import { ThemeToggle } from "../ui/ThemeToggle";
import { useThemePreference } from "../../hooks/useThemePreference";
import {
  ArrowRightIcon,
  BellIcon,
  BriefcaseIcon,
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CircleCheckIcon,
  ClipboardIcon,
  EnvelopeIcon,
  MoreIcon,
  PinIcon,
  PlusCircleIcon,
} from "./icons";
import { siteInfo } from "../../lib/homeDashboardData";
import { VIEWER_ROLE_LABELS, parseViewerRole, type ViewerRole } from "../../lib/managerShiftReportData";
import {
  SITE_DIRECTOR,
  buildShiftReportMonth,
  formatDateParam,
  getDayInProgressLabel,
  getDayRowDateLabel,
  getMonthLabel,
  getSignOffStatusDisplay,
  sortDaysCurrentFirst,
  type ShiftReportDayRow,
} from "../../lib/shiftReportListData";
import styles from "./EndOfShiftReportListPage.module.css";

/** Whether a day is ready for the Site Director's sign-off — every shift is in, no shift was missed, and nobody's signed off yet. Signing off only happens on the Daily Report page (DailyReportPage), not from this list, so a "ready" row here just routes there instead of end-of-shift-report — this is what gates that routing. Matches getSignOffStatusDisplay's own "Pending Sign-Off" (warning) branch, just as a plain boolean callers can gate UI on. */
function canSignOffDay(day: ShiftReportDayRow): boolean {
  return !day.isFuture && !day.signedOffBySiteDirector && getSignOffStatusDisplay(day).tone === "warning";
}

/** Whether a day's row actually opens the Daily Report instead of toggling anything in place — every day but a genuinely future one now qualifies (see ShiftReportDayRow/buildShiftReportMonth, which no longer produces future rows at all): a signed-off or ready-to-sign-off day opens it read-through-to-sign-off, and today opens it too so a Site Director can watch the day's shifts land live (Figma fileKey 0UJDRcrFiXkn16yfc2MUEW, node 247:21796). */
function opensDailyReport(day: ShiftReportDayRow): boolean {
  return day.signedOffBySiteDirector || canSignOffDay(day) || day.isToday;
}

/** The Daily Report link for a day that opens it (see opensDailyReport) — an already-signed-off day carries its own signedOffAtLabel along as a query param, so the Daily Report page opens already showing that same signed-off state instead of contradicting the list with its own "Sign Off Day" action. Today carries a `today=1` marker instead, so the Daily Report reads each shift's own live status rather than always showing the same illustrative "completed" sample it uses for every other day (this prototype has no per-day report history — see DailyReportPage). `date` (see formatDateParam) always rides along too, so the Daily Report's own big date heading — and, from there, a shift's own End of Shift Report page — shows the same calendar day this row does, instead of both always defaulting to the same fixed sample date. `viewerRole` (see ViewerRole) rides along as `as=` so the Daily Report and, from there, a shift's own page (End of Shift Report) know whether to show the Sign Off/note-editing UI at all. */
function dailyReportHref(day: ShiftReportDayRow, viewerRole: ViewerRole): string {
  const params = new URLSearchParams();
  params.set("date", formatDateParam(day.date));
  if (day.signedOffBySiteDirector) {
    params.set("signedOff", "1");
    if (day.signedOffAtLabel) params.set("at", day.signedOffAtLabel);
  }
  if (day.isToday) params.set("today", "1");
  if (viewerRole !== "director") params.set("as", viewerRole);
  return `/manage-shift/daily-report?${params.toString()}`;
}

const VIEWER_ROLE_OPTIONS = (Object.keys(VIEWER_ROLE_LABELS) as ViewerRole[]).map((role) => ({ id: role, label: VIEWER_ROLE_LABELS[role] }));

/**
 * EndOfShiftReportListPage — sits between the Manager Queue's "End of
 * Shift Report" card and the actual report (EndOfShiftReportPage):
 * Manager Queue → this list → a day's report. Matches Figma fileKey
 * 0UJDRcrFiXkn16yfc2MUEW, node 229:5034 ("Shift Reports") — a header
 * bar (Day / Report Status / Signed Off By / Sign-Off Status) over a
 * stack of individually-carded days, each a collapsible accordion:
 * collapsed, a day shows its own completion count, who signed it off,
 * and its sign-off status; expanded, it breaks into a child row per
 * shift with who completed it, when, and a bare arrow to open the
 * report. Today starts expanded by default. Every day's arrow opens
 * the same EndOfShiftReportPage (this prototype has no per-day report
 * data beyond today's own live state), which still shows its own
 * Day/Swing/Graveyard toggle once opened.
 */
export function EndOfShiftReportListPage() {
  const searchParams = useSearchParams();
  const [managerQueueOpen, setManagerQueueOpen] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);
  // Who's browsing the list right now (see ViewerRole) — starts from `?as=` so a link back here (the
  // Daily Report/End of Shift Report breadcrumbs) keeps whatever persona was already selected;
  // otherwise defaults to Site Director. Carried forward into every day's own Daily Report link below.
  const [viewerRole, setViewerRole] = useState<ViewerRole>(() => parseViewerRole(searchParams.get("as")));
  // Default reading order is "current day first" (sortDaysCurrentFirst) — flipping this shows the
  // classic oldest-first calendar order instead.
  const [oldestFirst, setOldestFirst] = useState(false);
  // Shared across the Shift Reports grid, Daily Report, and Shift Report pages (useThemePreference),
  // persisted to localStorage so switching to dark here keeps it dark after drilling into a day's
  // report and back.
  const [theme, setTheme] = useThemePreference();
  // Starts null so the server-rendered markup and the client's first render agree exactly (see
  // EndOfShiftReportPage's own note) — today's row depends on the real wall clock, which the server
  // can't know in advance. Filled in immediately after mount, client-side only.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  const monthDate = useMemo(() => {
    const base = now ?? new Date();
    return new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
  }, [now, monthOffset]);

  const days = useMemo(() => (now ? buildShiftReportMonth(monthDate, now) : []), [monthDate, now]);
  const orderedDays = now ? (oldestFirst ? days : sortDaysCurrentFirst(days, now)) : days;
  const isCurrentMonth = monthOffset === 0;

  function dayKey(day: ShiftReportDayRow): string {
    return day.date.toISOString();
  }

  return (
    <div className={styles.page} data-theme={theme}>
      <Nav
        theme={theme}
        orgLabel="SBM"
        orgIcon={<BriefcaseIcon />}
        siteLabel={siteInfo.client}
        siteSubLabel={siteInfo.siteName}
        siteIcon={<PinIcon />}
        links={[
          { label: "Home", href: "/" },
          { label: "Quality", href: "/quality/scope-of-work" },
          { label: "People", href: "/roster" },
          { label: "Safety", href: "#safety" },
          { label: "Financials", href: "#financials" },
        ]}
        showOlivia={false}
        utilityItems={[
          { icon: <PlusCircleIcon />, label: "Quick entries" },
          { icon: <ClipboardIcon />, label: "Manager Queue", onClick: () => setManagerQueueOpen(true) },
          { icon: <EnvelopeIcon />, label: "Messages" },
          { icon: <BellIcon />, label: "Notifications", hasNotification: true },
        ]}
        avatarFallback="EH"
        avatarAlt="Emily Hoehenrieder"
        menuIcon={<MoreIcon />}
        trailing={<ThemeToggle theme={theme} onChange={setTheme} />}
      />

      <main className={styles.main}>
        {/* View-as toggle — there's no real auth in this prototype (see ViewerRole), so this just
            previews what each persona would see: a Site Director can sign a completed day off; a
            Manager on Shift can add notes/complete a report, but only for whichever shift is actually
            theirs right now; everyone else gets the exact same pages read-only. */}
        <div className={styles.viewAsRow}>
          <span className={styles.viewAsLabel}>Viewing as</span>
          <ButtonGroup options={VIEWER_ROLE_OPTIONS} value={viewerRole} onChange={setViewerRole} variant="segmented" theme={theme} aria-label="View as" />
        </div>

        <div className={styles.rollup}>
          <h1 className={styles.rollupTitle}>Shift Reports</h1>

          <div className={styles.rollupControls}>
            <div className={styles.monthPicker}>
              <button type="button" className={styles.monthCaret} onClick={() => setMonthOffset((o) => o - 1)} aria-label="Previous month">
                <CaretLeftIcon />
              </button>
              <span className={styles.monthLabel}>{now ? getMonthLabel(monthDate) : ""}</span>
              <button
                type="button"
                className={styles.monthCaret}
                onClick={() => setMonthOffset((o) => o + 1)}
                disabled={isCurrentMonth}
                aria-label="Next month"
              >
                <CaretRightIcon />
              </button>
            </div>
          </div>
        </div>

        <div className={styles.tableHeader}>
          <button type="button" className={styles.sortableHeaderCell} onClick={() => setOldestFirst((v) => !v)}>
            Day
            <CaretDownIcon className={[styles.sortIcon, oldestFirst ? styles.sortIconFlipped : ""].filter(Boolean).join(" ")} />
          </button>
          <span className={styles.headerCell}>
            Status
            <CaretDownIcon className={styles.sortIcon} />
          </span>
          <span className={styles.headerCell}>
            Signed Off By
            <CaretDownIcon className={styles.sortIcon} />
          </span>
          <span className={styles.headerArrowSpacer} aria-hidden="true" />
        </div>

        <div className={styles.dayCards}>
          {orderedDays.map((day) => (
            <DayCard key={dayKey(day)} day={day} viewerRole={viewerRole} />
          ))}
          {now && orderedDays.length === 0 && <p className={styles.emptyState}>No days to show for this month.</p>}
        </div>
      </main>

      <ManagerQueuePanel open={managerQueueOpen} onClose={() => setManagerQueueOpen(false)} theme={theme} />
    </div>
  );
}

function PersonChip({ name, role, avatar }: { name: string; role: string; avatar: string }) {
  return (
    <div className={styles.personChip}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={avatar} alt="" className={styles.personAvatar} />
      <div className={styles.personText}>
        <span className={styles.personName}>{name}</span>
        <span className={styles.personRole}>{role}</span>
      </div>
    </div>
  );
}

function DayCard({ day, viewerRole }: { day: ShiftReportDayRow; viewerRole: ViewerRole }) {
  const dateLabel = getDayRowDateLabel(day.date);
  const dayInProgress = getDayInProgressLabel(day);
  const signOffStatus = getSignOffStatusDisplay(day);

  const rowContent = (
    <>
      <div className={styles.dayCell}>
        <div className={styles.dayCellText}>
          <span className={styles.dayDate}>{dateLabel}</span>
          {dayInProgress && <span className={styles.dayInProgress}>{dayInProgress}</span>}
        </div>
      </div>

      <div className={styles.signOffStatusCell}>
        <span className={styles.signOffTitle} data-tone={signOffStatus.tone}>
          {signOffStatus.tone === "success" && <CircleCheckIcon className={styles.signOffTitleIcon} />}
          {signOffStatus.title}
        </span>
        {signOffStatus.caption && (
          <span className={styles.signOffCaption} data-tone={signOffStatus.tone}>
            {signOffStatus.caption}
          </span>
        )}
      </div>

      <div className={styles.signedOffByCell}>
        {day.signedOffBySiteDirector ? (
          <PersonChip name={SITE_DIRECTOR.name} role={SITE_DIRECTOR.role} avatar={SITE_DIRECTOR.avatar} />
        ) : (
          <span className={styles.cellMutedDash}>—</span>
        )}
      </div>

      <span className={styles.rowArrow}>
        <ArrowRightIcon />
      </span>
    </>
  );

  return (
    <div className={styles.dayCard}>
      <Link href={dailyReportHref(day, viewerRole)} className={styles.dayHeaderRow}>
        {rowContent}
      </Link>
    </div>
  );
}

