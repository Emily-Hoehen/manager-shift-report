"use client";

import type { ReactNode } from "react";
import {
  BroomWideIcon,
  CircleCheckIcon,
  ClipboardCheckIcon,
  ClockIcon,
  TriangleExclamationIcon,
  UserHardHatIcon,
  VectorSquareIcon,
} from "./icons";
import { Button } from "../ui/Button";
import { DonutRing } from "../ui/Charts";
import { formatHMS, type ShiftLiveStatus } from "../../lib/managerShiftReportData";
import type { ThemePreference } from "../../hooks/useThemePreference";
import styles from "./ShiftInProgressPanel.module.css";

export type ShiftInProgressPanelManager = { id: string; name: string; avatar: string };

export type ShiftInProgressPanelSection = {
  key: string;
  icon: ReactNode;
  iconColor: string;
  title: string;
  noteCount: number;
};

/** The finished-report rollup the Side Panel shows once a shift is completed (Figma fileKey
 * 0UJDRcrFiXkn16yfc2MUEW, node 258:26708 "Side Panel" — the "Day Shift Completed" state), in place of
 * the in-progress note-count checklist: real captured numbers per section instead of a to-do list,
 * same SidebarStat layout the Daily Report page's own sidebar already uses for the whole day. */
export type ShiftCompletedStats = {
  hours: { percent: number; captured: string; total: string; associateArrival: number; totalAbsences: number };
  areaCoverage: {
    percent: number;
    serviced: number;
    total: number;
    notServiced: number;
    underServiced: number;
    fullyServiced: number;
    overServiced: number;
  };
  serviceCoverage: { percent: number; completed: number; expected: number };
  quality: { aiVerification: number; internalAudit: number; customerAudit: number };
  safetyIssues: number;
  reportIts: { accepted: number; submitted: number; rejected: number; acceptanceRate: number };
};

export type ShiftInProgressPanelProps = {
  /** "Day" / "Swing" / "Graveyard" — prefixes the status title ("Day Shift in Progress" / "Day Shift Completed"). */
  shiftLabel: string;
  /** "6:00AM EST - 2:30PM EST" style scheduled window (SHIFT_OPTIONS), shown under the status title in every state. */
  shiftTimeRange: string;
  /** Real-time status against this shift's own scheduled window (getShiftLiveStatus) — "notStarted" shows a grey, zeroed timer and a "Shift Not Started" title instead of the ticking in-progress display, regardless of completedBy. */
  liveStatus: ShiftLiveStatus;
  elapsedSeconds: number;
  progressPercent: number;
  managers: ShiftInProgressPanelManager[];
  sections: ShiftInProgressPanelSection[];
  isLocked: boolean;
  /** True for a past, already-ended shift whose report never actually came in (isPastMissedShift) —
      the panel no longer shows this in its own top row (see EndOfShiftReportPage's own header, Figma
      fileKey 0UJDRcrFiXkn16yfc2MUEW, node 312:44213), just used here to know the ticking timer/ring
      shouldn't render either. Still unlocked underneath (a manager can submit it late), just like a
      shift that's still in progress. */
  notSubmittedPastDeadline?: boolean;
  /** The finished-report numbers (see ShiftCompletedStats) — when present alongside isLocked, replaces the note-count checklist with the real rollup; omitted, the panel falls back to its old plain checklist still showing (e.g. a shift a manager just completed from this same page, before any richer data was wired up). */
  completedStats?: ShiftCompletedStats;
  canComplete: boolean;
  /** Hides the Complete Shift Report button and its hint entirely — for a viewer who could never take this action (Site Director, Other User), not just one who can't take it yet. Defaults to true. */
  showCompleteAction?: boolean;
  onCompleteClick: () => void;
  /** Jumps the left column to that section's card, expanding it first if it's collapsed — key is "managers" for the Shift Managers row, or a section's own key otherwise. */
  onSelectSection: (key: string) => void;
  /** Defaults to "light" (this page's own default) — the page passes its own live useThemePreference value through. */
  theme?: ThemePreference;
};

/**
 * ShiftInProgressPanel — the sticky sidebar on the desktop End of
 * Shift Report (Figma fileKey 0UJDRcrFiXkn16yfc2MUEW, node
 * 203:40371 "Side Panel"). A live ticking HH:MM:SS timer + progress
 * ring against the shift's fixed 8-hour duration, a Shift Managers
 * row (avatar stack, same roster as the Shift Managers card), an
 * at-a-glance checklist of every note-taking section's own note
 * count (mirrors each ShiftReportSectionCard's own badge — this is
 * the same data, just reachable without scrolling), and its own
 * copy of the Complete Shift Report action so it stays reachable
 * without scrolling back to the top. Notably excludes Shift Notes —
 * Figma's own checklist only lists the four sections with captured
 * data rings (Hours and Headcount / Areas Serviced / Service
 * Coverage / Quality).
 */
export function ShiftInProgressPanel({
  shiftLabel,
  shiftTimeRange,
  liveStatus,
  elapsedSeconds,
  progressPercent,
  managers,
  sections,
  isLocked,
  notSubmittedPastDeadline = false,
  completedStats,
  canComplete,
  showCompleteAction = true,
  onCompleteClick,
  onSelectSection,
  theme = "light",
}: ShiftInProgressPanelProps) {
  const notStarted = liveStatus === "notStarted";
  const [hh, mm, ss] = formatHMS(notStarted ? 0 : elapsedSeconds).split(":");
  const showCompletedRollup = isLocked && Boolean(completedStats);
  // The shift's own submitted/overdue/still-due status now lives in the page's own header instead (see
  // EndOfShiftReportPage, Figma fileKey 0UJDRcrFiXkn16yfc2MUEW, node 312:44213) — this panel only ever
  // shows the live ticking timer/ring while the shift is actually still ticking (in progress or not yet
  // started), and a plain "{Shift} Shift Summary" title the rest of the time (submitted, overdue, or
  // just-ended-and-not-yet-submitted).
  const showTicker = !isLocked && !notSubmittedPastDeadline && liveStatus !== "ended";

  return (
    <div className={styles.panel} data-theme={theme}>
      <div className={styles.topRow}>
        {showTicker ? (
          <>
            <div className={styles.statusText}>
              <span className={notStarted ? styles.statusTitleNotStarted : styles.statusTitle}>
                {shiftLabel} Shift {notStarted ? "Not Started" : "in Progress"}
              </span>
              <div className={[styles.timer, notStarted ? styles.timerNotStarted : ""].filter(Boolean).join(" ")}>
                <span>{hh}</span>
                <span className={styles.timerColon}>:</span>
                <span>{mm}</span>
                <span className={styles.timerColon}>:</span>
                <span>{ss}</span>
              </div>
              <span className={styles.shiftTimeRange}>{shiftTimeRange}</span>
            </div>
            <div className={styles.progressRingWrap}>
              <DonutRing
                percent={notStarted ? 0 : progressPercent}
                color={notStarted ? "var(--color-neutral-400)" : "var(--color-primary-500)"}
                trackColor={theme === "dark" ? "var(--color-neutral-700)" : "var(--color-neutral-300)"}
                size={56}
                strokeWidth={5}
              />
            </div>
          </>
        ) : (
          <div className={styles.statusText}>
            <span className={styles.statusTitleCompleted}>{shiftLabel} Shift Summary</span>
          </div>
        )}
      </div>

      <div className={styles.divider} />

      <button type="button" className={styles.row} onClick={() => onSelectSection("managers")}>
        <div className={styles.rowText}>
          <span className={styles.rowTitle}>Shift Managers</span>
          <span className={styles.rowCaption}>{managers.length} Managers on Shift</span>
        </div>
        <div className={styles.avatarStack}>
          {managers.slice(0, 4).map((manager) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img key={manager.id} src={manager.avatar} alt="" className={styles.avatarStackItem} />
          ))}
        </div>
      </button>

      {showCompletedRollup && completedStats ? (
        <CompletedStatsRollup stats={completedStats} onSelectSection={onSelectSection} />
      ) : (
        sections.map((section) => (
          <div key={section.key} className={styles.sectionBlock}>
            <div className={styles.divider} />
            <button type="button" className={styles.row} onClick={() => onSelectSection(section.key)}>
              <span className={styles.rowIcon} style={{ color: section.iconColor }}>
                {section.icon}
              </span>
              <div className={styles.rowText}>
                <span className={styles.rowTitle}>{section.title}</span>
                <span className={styles.rowCaption}>
                  {section.noteCount} note{section.noteCount === 1 ? "" : "s"} added
                </span>
              </div>
              <CircleCheckIcon className={[styles.rowCheck, section.noteCount > 0 ? styles.rowCheckDone : ""].filter(Boolean).join(" ")} />
            </button>
          </div>
        ))
      )}

      {/* A submitted report is done — no hint, no button, no trailing line either (the completed
          rollup ends right after Report Its Accepted). Only an in-progress shift still shows this. */}
      {!showCompletedRollup && <div className={styles.divider} />}

      {showCompleteAction && !showCompletedRollup && (
        <>
          {!canComplete && <p className={styles.hint}>Shift report can only be completed once a shift has ended and all sections have at least one note added</p>}
          <Button variant="primary" theme={theme} disabled={!canComplete} onClick={onCompleteClick} className={styles.completeButton}>
            Complete Shift Report
          </Button>
        </>
      )}
    </div>
  );
}

/** The Side Panel's own read-only stat rollup for a completed shift (see ShiftCompletedStats) — same
 * icon/value/label/caption/sub-row shape as the Daily Report page's own SidebarStat, just scoped to
 * one shift's numbers instead of the whole day's. Every block is clickable, same as the in-progress
 * checklist rows above — Safety issues and Report Its Accepted both jump to "quality" since that's
 * the one left-column card (QualityData) that actually holds all three (scores, safety, report its). */
function CompletedStatsRollup({ stats, onSelectSection }: { stats: ShiftCompletedStats; onSelectSection: (key: string) => void }) {
  const qualityAverage = ((stats.quality.aiVerification + stats.quality.internalAudit + stats.quality.customerAudit) / 3).toFixed(2);

  return (
    <>
      <div className={styles.divider} />
      <SidebarStatBlock
        icon={<ClockIcon />}
        iconClassName={styles.statIconYellow}
        value={`${stats.hours.percent}%`}
        label="Hours Captured"
        onClick={() => onSelectSection("hoursHeadcount")}
      >
        <p className={styles.statCaption}>
          {stats.hours.captured} of {stats.hours.total} shift time
        </p>
        <div className={styles.statSubRow}>
          <span>Associate Arrival</span>
          <span>{stats.hours.associateArrival}</span>
        </div>
        <div className={styles.statSubRow}>
          <span>Total Absences</span>
          <span>{stats.hours.totalAbsences}</span>
        </div>
      </SidebarStatBlock>

      <div className={styles.divider} />
      <SidebarStatBlock
        icon={<VectorSquareIcon />}
        iconClassName={styles.statIconBlue}
        value={`${stats.areaCoverage.percent}%`}
        label="Areas Serviced"
        onClick={() => onSelectSection("areaCoverage")}
      >
        <p className={styles.statCaption}>
          {stats.areaCoverage.serviced.toLocaleString()} of {stats.areaCoverage.total.toLocaleString()} total areas
        </p>
        <div className={styles.statSubRow}>
          <span>Not Serviced</span>
          <span>{stats.areaCoverage.notServiced}</span>
        </div>
        <div className={styles.statSubRow}>
          <span>Under Serviced</span>
          <span>{stats.areaCoverage.underServiced}</span>
        </div>
        <div className={styles.statSubRow}>
          <span>Full Serviced</span>
          <span>{stats.areaCoverage.fullyServiced}</span>
        </div>
        <div className={styles.statSubRow}>
          <span>Over Serviced</span>
          <span>{stats.areaCoverage.overServiced}</span>
        </div>
      </SidebarStatBlock>

      <div className={styles.divider} />
      <SidebarStatBlock
        icon={<BroomWideIcon />}
        iconClassName={styles.statIconPurple}
        value={`${stats.serviceCoverage.percent}%`}
        label="Service Coverage"
        onClick={() => onSelectSection("serviceCoverage")}
      >
        <p className={styles.statCaption}>
          {stats.serviceCoverage.completed.toLocaleString()} of {stats.serviceCoverage.expected.toLocaleString()} services completed
        </p>
      </SidebarStatBlock>

      <div className={styles.divider} />
      <SidebarStatBlock
        icon={<ClipboardCheckIcon />}
        iconClassName={styles.statIconGreen}
        value={qualityAverage}
        label="Verification Score"
        onClick={() => onSelectSection("quality")}
      >
        <div className={styles.statValueRow}>
          <span className={styles.statValue}>{stats.quality.internalAudit.toFixed(2)}</span>
          <span className={styles.statLabelMuted}>Internal Audit</span>
        </div>
        <div className={styles.statValueRow}>
          <span className={styles.statValue}>{stats.quality.customerAudit.toFixed(2)}</span>
          <span className={styles.statLabelMuted}>Customer Audit</span>
        </div>
      </SidebarStatBlock>

      <SidebarStatBlock
        icon={<UserHardHatIcon />}
        iconClassName={styles.statIconOrange}
        value={stats.safetyIssues.toLocaleString()}
        label="Safety issues"
        onClick={() => onSelectSection("quality")}
      />

      {/* No divider here — Safety and Report Its both read as part of the same Quality section, not
          two separate ones. */}
      <SidebarStatBlock
        icon={<TriangleExclamationIcon />}
        iconClassName={styles.statIconPink}
        value={stats.reportIts.accepted.toLocaleString()}
        label="Report Its Accepted"
        onClick={() => onSelectSection("quality")}
      >
        <div className={styles.statSubRow}>
          <span>Submitted</span>
          <span>{stats.reportIts.submitted}</span>
        </div>
        <div className={styles.statSubRow}>
          <span>Rejected</span>
          <span>{stats.reportIts.rejected}</span>
        </div>
        <div className={styles.statSubRow}>
          <span>Acceptance Rate</span>
          <span>{stats.reportIts.acceptanceRate}%</span>
        </div>
      </SidebarStatBlock>
    </>
  );
}

function SidebarStatBlock({
  icon,
  iconClassName,
  value,
  label,
  children,
  onClick,
}: {
  icon: ReactNode;
  iconClassName?: string;
  value: string;
  label: string;
  children?: ReactNode;
  /** Jumps the left column to this stat's own section card (same as the in-progress checklist rows
      above) — every completed stat block is clickable, not just read-only. */
  onClick?: () => void;
}) {
  return (
    <button type="button" className={styles.statBlock} onClick={onClick}>
      <div className={styles.statHeaderRow}>
        <span className={[styles.rowIconStatic, iconClassName].filter(Boolean).join(" ")}>{icon}</span>
        <div className={styles.statValueRow}>
          <span className={styles.statValue}>{value}</span>
          <span className={styles.statLabel}>{label}</span>
        </div>
      </div>
      {children && <div className={styles.statBody}>{children}</div>}
    </button>
  );
}
