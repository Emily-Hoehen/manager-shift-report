"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Nav } from "./Nav";
import { ManagerQueuePanel } from "./ManagerQueuePanel";
import { ButtonGroup } from "../ui/ButtonGroup";
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
import { SHIFT_END_LABEL, SHIFT_LABELS } from "../../lib/managerShiftReportData";
import {
  SITE_DIRECTOR,
  buildShiftReportMonth,
  getDayInProgressLabel,
  getDayRowDateLabel,
  getMonthLabel,
  getShiftReportRowV2Display,
  getSignOffStatusDisplay,
  sortDaysCurrentFirst,
  type ShiftReportDayRow,
  type ShiftReportRow,
} from "../../lib/shiftReportListData";
import styles from "./EndOfShiftReportListPage.module.css";

/** Whether a day is ready for the Site Director's sign-off — every shift is in, no shift was missed, and nobody's signed off yet. Signing off only happens on the Daily Report page (DailyReportPage), not from this list, so a "ready" row here just routes there instead of end-of-shift-report — this is what gates that routing. Matches getSignOffStatusDisplay's own "Pending Sign-Off" (warning) branch, just as a plain boolean callers can gate UI on. */
function canSignOffDay(day: ShiftReportDayRow): boolean {
  return !day.isFuture && !day.signedOffBySiteDirector && getSignOffStatusDisplay(day).tone === "warning";
}

/** The Daily Report link for a day that already opens it (see opensDailyReport/canSignOff above) — an already-signed-off day carries its own signedOffAtLabel along as a query param, so the Daily Report page opens already showing that same signed-off state instead of contradicting the list with its own "Sign Off Day" action. A day that's merely ready for sign-off still opens the Daily Report unsigned, same as visiting it fresh. */
function dailyReportHref(day: ShiftReportDayRow): string {
  if (!day.signedOffBySiteDirector) return "/manage-shift/daily-report";
  const params = new URLSearchParams({ signedOff: "1" });
  if (day.signedOffAtLabel) params.set("at", day.signedOffAtLabel);
  return `/manage-shift/daily-report?${params.toString()}`;
}

type GridVersion = "v1" | "v2";

const GRID_VERSION_OPTIONS = [
  { id: "v1" as GridVersion, label: "V1" },
  { id: "v2" as GridVersion, label: "V2" },
];

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
  const [managerQueueOpen, setManagerQueueOpen] = useState(false);
  const [gridVersion, setGridVersion] = useState<GridVersion>("v1");
  const [monthOffset, setMonthOffset] = useState(0);
  // Default reading order is "current day first" (sortDaysCurrentFirst) — flipping this shows the
  // classic oldest-first calendar order instead.
  const [oldestFirst, setOldestFirst] = useState(false);
  // Which days the manager has manually toggled away from their own default expand state (today
  // starts expanded, every other day starts collapsed) — see isDayExpanded.
  const [toggledDateKeys, setToggledDateKeys] = useState<Set<string>>(new Set());
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

  function isDayExpanded(day: ShiftReportDayRow): boolean {
    const toggled = toggledDateKeys.has(dayKey(day));
    return day.isToday ? !toggled : toggled;
  }

  function toggleDay(day: ShiftReportDayRow) {
    if (day.isFuture) return;
    setToggledDateKeys((prev) => {
      const next = new Set(prev);
      const key = dayKey(day);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className={styles.page}>
      <Nav
        theme="light"
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
      />

      <main className={styles.main}>
        <div className={styles.rollup}>
          <h1 className={styles.rollupTitle}>Shift Reports</h1>

          <div className={styles.rollupControls}>
            <ButtonGroup
              options={GRID_VERSION_OPTIONS}
              value={gridVersion}
              onChange={setGridVersion}
              variant="segmented"
              theme="light"
              aria-label="Data grid version"
            />

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

        {gridVersion === "v1" ? (
          <>
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
                <DayCard key={dayKey(day)} day={day} expanded={isDayExpanded(day)} onToggle={() => toggleDay(day)} />
              ))}
              {now && orderedDays.length === 0 && <p className={styles.emptyState}>No days to show for this month.</p>}
            </div>
          </>
        ) : (
          <>
            <div className={styles.tableHeaderV2}>
              <button type="button" className={styles.sortableHeaderCell} onClick={() => setOldestFirst((v) => !v)}>
                Day
                <CaretDownIcon className={[styles.sortIcon, oldestFirst ? styles.sortIconFlipped : ""].filter(Boolean).join(" ")} />
              </button>
              <span className={styles.headerCell}>
                Shift Reports Completed
                <CaretDownIcon className={styles.sortIcon} />
              </span>
              <span className={styles.headerCell}>
                Reports Completed By
                <CaretDownIcon className={styles.sortIcon} />
              </span>
              <span className={styles.headerCell}>
                Site Director Sign-Off
                <CaretDownIcon className={styles.sortIcon} />
              </span>
              <span className={styles.headerCell}>
                Status
                <CaretDownIcon className={styles.sortIcon} />
              </span>
              <span className={styles.headerArrowSpacer} aria-hidden="true" />
            </div>

            <div className={styles.dayCards}>
              {orderedDays.map((day) => (
                <DayRowV2 key={dayKey(day)} day={day} />
              ))}
              {now && orderedDays.length === 0 && <p className={styles.emptyState}>No days to show for this month.</p>}
            </div>
          </>
        )}
      </main>

      <ManagerQueuePanel open={managerQueueOpen} onClose={() => setManagerQueueOpen(false)} theme="light" />
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

function DayCard({ day, expanded, onToggle }: { day: ShiftReportDayRow; expanded: boolean; onToggle: () => void }) {
  const dateLabel = getDayRowDateLabel(day.date);
  const dayInProgress = getDayInProgressLabel(day);
  const signOffStatus = getSignOffStatusDisplay(day);
  const isOpen = expanded && !day.isFuture;
  // A signed-off day, or one that's just ready for sign-off, opens the whole-day Daily Report (the
  // same document the Map's "View Daily Report" opens, just as a real 4insite page instead of a
  // modal) instead of toggling the per-shift accordion — signing off itself only happens there, not
  // from this list, so both states point the Site Director to the one place that can actually do it.
  const isSignedOff = day.signedOffBySiteDirector;
  const canSignOff = canSignOffDay(day);
  const opensDailyReport = isSignedOff || canSignOff;

  const rowContent = (
    <>
      <div className={styles.dayCell}>
        {!opensDailyReport && (
          <CaretRightIcon className={[styles.expandCaret, isOpen ? styles.expandCaretOpen : ""].filter(Boolean).join(" ")} />
        )}
        <div className={styles.dayCellText}>
          <span className={styles.dayDate}>{dateLabel}</span>
          {dayInProgress && <span className={styles.dayInProgress}>{dayInProgress}</span>}
        </div>
      </div>

      <div className={styles.signOffStatusCell}>
        {day.isFuture ? (
          <span className={styles.cellMutedDash}>—</span>
        ) : (
          <>
            <span className={styles.signOffTitle} data-tone={signOffStatus.tone}>
              {signOffStatus.tone === "success" && <CircleCheckIcon className={styles.signOffTitleIcon} />}
              {signOffStatus.title}
            </span>
            {signOffStatus.caption && (
              <span className={styles.signOffCaption} data-tone={signOffStatus.tone}>
                {signOffStatus.caption}
              </span>
            )}
          </>
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
      {opensDailyReport ? (
        <Link href={dailyReportHref(day)} className={styles.dayHeaderRow}>
          {rowContent}
        </Link>
      ) : (
        <button type="button" className={styles.dayHeaderRow} onClick={onToggle} disabled={day.isFuture} aria-expanded={isOpen}>
          {rowContent}
        </button>
      )}

      {isOpen && day.shifts.map((shift) => <ShiftChildRow key={shift.shiftKey} shift={shift} />)}
    </div>
  );
}

function ShiftChildRow({ shift }: { shift: ShiftReportRow }) {
  const label = SHIFT_LABELS[shift.shiftKey];

  return (
    <Link href={`/manage-shift/end-of-shift-report?shift=${shift.shiftKey}`} className={styles.childRow}>
      <span className={styles.childDayCell}>{label} Shift</span>

      <div className={styles.signOffStatusCell}>
        {shift.status === "notSubmitted" && <span className={styles.overduePill}>{label} Report Overdue</span>}
        {shift.status === "dueLater" && (
          <>
            <span className={styles.signOffTitle} data-tone="neutral">
              Shift In Progress
            </span>
            <span className={styles.signOffCaption}>Report Due at {SHIFT_END_LABEL[shift.shiftKey]}</span>
          </>
        )}
        {shift.status === "upcoming" && <span className={styles.cellMutedDash}>—</span>}
        {shift.status === "completed" && (
          <>
            <span className={styles.signOffTitle}>
              <CircleCheckIcon className={styles.signOffTitleIcon} />
              Report Completed
            </span>
            {shift.completedAtLabel && <span className={styles.signOffCaption}>{shift.completedAtLabel}</span>}
          </>
        )}
      </div>

      <div className={styles.signedOffByCell}>
        {shift.status === "completed" && shift.completedByName && shift.completedByAvatar ? (
          <PersonChip name={shift.completedByName} role={shift.completedByRole ?? ""} avatar={shift.completedByAvatar} />
        ) : (
          <span className={styles.cellMutedDash}>—</span>
        )}
      </div>

      <span className={styles.rowArrow}>
        <ArrowRightIcon />
      </span>
    </Link>
  );
}

/**
 * The "v2" flat data-grid row (Figma fileKey 0UJDRcrFiXkn16yfc2MUEW, node 229:1569) — one row per
 * day, no accordion. See getShiftReportRowV2Display for how the five columns are derived.
 */
function DayRowV2({ day }: { day: ShiftReportDayRow }) {
  const dateLabel = getDayRowDateLabel(day.date);
  const v2 = getShiftReportRowV2Display(day);
  const canSignOff = canSignOffDay(day);
  const rowClassName = [styles.dayRowV2, day.isFuture ? styles.dayRowV2Disabled : ""].filter(Boolean).join(" ");

  const content = (
    <>
      <span className={styles.dayCellV2}>
        <span className={styles.dayDate}>{dateLabel}</span>
      </span>

      <div className={styles.reportStatusCell}>
        {day.isFuture ? (
          <span className={styles.cellMutedDash}>—</span>
        ) : (
          <div className={styles.reportStatusText}>
            <span className={styles.reportStatusCount}>{v2.completedLabel}</span>
            {v2.missedCaption && (
              <span className={styles.reportStatusCaption} data-tone="danger">
                {v2.missedCaption}
              </span>
            )}
          </div>
        )}
      </div>

      <div className={styles.completedByCellV2}>
        <span className={styles.completedByTextV2}>{v2.completedByLabel}</span>
      </div>

      <div className={styles.signOffStatusCell}>
        {v2.signOff.kind === "signedOff" ? (
          <>
            <span className={styles.signOffTitle}>
              <CircleCheckIcon className={styles.signOffTitleIcon} />
              {v2.signOff.name}
            </span>
            {v2.signOff.timestamp && <span className={styles.signOffCaption}>{v2.signOff.timestamp}</span>}
          </>
        ) : (
          <>
            <span className={styles.signOffTitle} data-tone={v2.signOff.tone}>
              {v2.signOff.title}
            </span>
            {v2.signOff.caption && (
              <span className={styles.signOffCaption} data-tone={v2.signOff.tone}>
                {v2.signOff.caption}
              </span>
            )}
          </>
        )}
      </div>

      <div className={styles.statusTagCellV2}>
        {v2.tag && (
          <span className={styles.statusTagV2} data-tone={v2.tag.tone}>
            {v2.tag.label}
          </span>
        )}
        {v2.tagCaption && <span className={styles.statusTagCaptionV2}>{v2.tagCaption}</span>}
      </div>

      <span className={styles.rowArrow}>{!day.isFuture && <ArrowRightIcon />}</span>
    </>
  );

  if (day.isFuture) {
    return (
      <div className={rowClassName} aria-disabled="true">
        {content}
      </div>
    );
  }

  // A signed-off day, or one that's just ready for sign-off, opens the consolidated Daily Report (so
  // the Site Director can review every shift's own data there before signing off — that's the only
  // place sign-off actually happens, not this list) instead of the per-shift end-of-shift report.
  const href = day.signedOffBySiteDirector || canSignOff ? dailyReportHref(day) : "/manage-shift/end-of-shift-report";

  return (
    <Link href={href} className={rowClassName}>
      {content}
    </Link>
  );
}
