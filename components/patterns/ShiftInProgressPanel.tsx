"use client";

import type { ReactNode } from "react";
import { CircleCheckIcon } from "./icons";
import { Button } from "../ui/Button";
import { DonutRing } from "../ui/Charts";
import { formatHMS, type ShiftLiveStatus } from "../../lib/managerShiftReportData";
import styles from "./ShiftInProgressPanel.module.css";

export type ShiftInProgressPanelManager = { id: string; name: string; avatar: string };

export type ShiftInProgressPanelSection = {
  key: string;
  icon: ReactNode;
  iconColor: string;
  title: string;
  noteCount: number;
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
  canComplete: boolean;
  onCompleteClick: () => void;
  /** Jumps the left column to that section's card, expanding it first if it's collapsed — key is "managers" for the Shift Managers row, or a section's own key otherwise. */
  onSelectSection: (key: string) => void;
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
  canComplete,
  onCompleteClick,
  onSelectSection,
}: ShiftInProgressPanelProps) {
  const notStarted = liveStatus === "notStarted";
  const [hh, mm, ss] = formatHMS(notStarted ? 0 : elapsedSeconds).split(":");

  return (
    <div className={styles.panel}>
      <div className={styles.topRow}>
        {isLocked ? (
          <div className={styles.statusText}>
            <span className={styles.statusTitleCompleted}>{shiftLabel} Shift Completed</span>
            <span className={styles.shiftTimeRange}>{shiftTimeRange}</span>
          </div>
        ) : (
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
              <DonutRing percent={notStarted ? 0 : progressPercent} color={notStarted ? "var(--color-neutral-400)" : "var(--color-primary-500)"} trackColor="var(--color-neutral-300)" size={56} strokeWidth={5} />
            </div>
          </>
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

      {sections.map((section) => (
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
      ))}

      <div className={styles.divider} />

      {/* Always reachable, even once already completed — a manager can keep adding notes and re-complete the report from here. */}
      {!canComplete && <p className={styles.hint}>Shift report can only be completed once a shift has ended and all sections have at least one note added</p>}
      <Button variant="primary" theme="light" disabled={!canComplete} onClick={onCompleteClick} className={styles.completeButton}>
        Complete Shift Report
      </Button>
    </div>
  );
}
