"use client";

import { useEffect, useRef, useState } from "react";
import { BroomWideIcon, CircleCheckIcon, ClipboardCheckIcon, ClockIcon, LockIcon, NoteStickyIcon, VectorSquareIcon } from "./icons";
import { ManagerAppScreenHeader } from "./ManagerAppScreenHeader";
import {
  CURRENT_MANAGER_ID,
  SECTION_ORDER,
  SECTION_TITLES,
  allSectionsHaveNotes,
  formatMinutesRemaining,
  formatTightClockTime,
  getManager,
  getResponsibleManager,
  getSectionNoteCount,
  getSectionPreview,
  getShiftEndTimeLabel,
  getShiftMinutesRemaining,
  getShiftReportHeading,
  type SectionKey,
  type ShiftReportState,
} from "../../lib/managerShiftReportData";
import styles from "./ManagerAppShiftReportList.module.css";

export type ManagerAppShiftReportListProps = {
  shift: ShiftReportState;
  onBack: () => void;
  onOpenSection: (key: SectionKey) => void;
  onOpenManagers: () => void;
  onComplete: () => void;
  /** True while ManagerAppHome renders this screen's header itself (outside the slide-transition layer, so the header bar never slides — only the content beneath it does). */
  hideHeader?: boolean;
};

const CONFIRM_EXIT_DURATION_MS = 260;

/** Icon + wash/icon color per section, matching Figma fileKey 0UJDRcrFiXkn16yfc2MUEW, node 134:26579's own icon bubbles — same hue-@15%-wash-plus-"100"-icon pairing convention as ManagerAppHome's KPI row. */
const SECTION_ICON: Record<SectionKey, { icon: React.ReactNode; wash: string; color: string }> = {
  shiftNotes: { icon: <NoteStickyIcon />, wash: "var(--wash-pinkle-light-15)", color: "var(--color-datavis-pinkle-100)" },
  hoursHeadcount: { icon: <ClockIcon />, wash: "var(--wash-warning-15)", color: "var(--color-text-dt-warning)" },
  areaCoverage: { icon: <VectorSquareIcon />, wash: "var(--wash-primary-15)", color: "var(--color-text-dt-blue)" },
  serviceCoverage: { icon: <BroomWideIcon />, wash: "rgba(175, 153, 255, 0.15)", color: "var(--color-datavis-purple-100)" },
  quality: { icon: <ClipboardCheckIcon />, wash: "var(--wash-success-light-15)", color: "var(--color-success-100)" },
};

/**
 * ManagerAppShiftReportList — the Day Shift Report section list.
 * Reached from Home's "End of Shift Report" tile. Shows the shift's
 * own live heading, a Shift Managers row that pushes its own full
 * roster screen (clock times, Responsible Manager flag, live Checked
 * In/Out status), then one row per report section with its own
 * preview stat and a check-circle
 * — grey until that section has at least one note, green once it
 * does. No arrows anywhere on this screen; nothing here is a "drill
 * into a list" affordance. Complete Report is a fixed footer: dimmed
 * and inert until every section has a note, then actionable only for
 * the Responsible Manager — everyone else sees a locked, informational
 * state instead once notes are complete.
 */
export function ManagerAppShiftReportList({ shift, onBack, onOpenSection, onOpenManagers, onComplete, hideHeader }: ManagerAppShiftReportListProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const currentManager = getManager(shift, CURRENT_MANAGER_ID);
  const responsibleManager = getResponsibleManager(shift);
  const isCurrentResponsible = currentManager?.isResponsible ?? false;
  const leadManager = shift.managers[0];
  const minutesRemaining = getShiftMinutesRemaining(shift.shiftKey);
  const hasEnded = minutesRemaining <= 0;
  const readyToComplete = allSectionsHaveNotes(shift);
  const canComplete = readyToComplete && hasEnded;
  const isCompleted = Boolean(shift.completedBy);

  function handleConfirmComplete() {
    setConfirmOpen(false);
    onComplete();
  }

  return (
    <div className={styles.screen}>
      {!hideHeader && <ManagerAppScreenHeader title="End of Shift Report" onBack={onBack} />}

      <div className={[styles.main, isCompleted ? styles.mainNoFooter : ""].filter(Boolean).join(" ")}>
        <div className={styles.titleBlock}>
          <h1 className={styles.heading}>{getShiftReportHeading(shift.shiftKey)}</h1>
          <div className={styles.metaRow}>
            <span className={styles.metaTime}>
              {formatTightClockTime(leadManager.clockIn)} to {hasEnded ? getShiftEndTimeLabel(shift.shiftKey) : "Current"}
            </span>
            <span className={styles.metaDot}>•</span>
            <span className={hasEnded ? styles.metaEnded : styles.metaCountdown}>{hasEnded ? "Shift has ended" : `Shift ends in ${formatMinutesRemaining(minutesRemaining)}`}</span>
          </div>
        </div>

        {isCompleted && (
          <div className={styles.completedBanner}>
            <CircleCheckIcon className={styles.completeIconDone} />
            <div className={styles.completeText}>
              <span className={styles.completeTitle}>Report Completed</span>
              <span className={styles.completeCaption}>
                By {getManager(shift, shift.completedBy!)?.name ?? "a manager"} at {shift.completedAt}
              </span>
            </div>
          </div>
        )}

        <div className={styles.sectionsGroup}>
          <button type="button" className={styles.managersCard} onClick={onOpenManagers}>
            <div className={styles.managersTopRow}>
              <div className={styles.sectionRowMain}>
                <span className={styles.sectionRowTitle}>Shift Managers</span>
                <span className={[styles.sectionRowPreview, responsibleManager ? styles.sectionRowPreviewDefault : ""].filter(Boolean).join(" ")}>
                  {responsibleManager ? `Responsible Manager: ${responsibleManager.name}` : "No responsible manager chosen"}
                </span>
              </div>
              {!isCompleted && (
                <CircleCheckIcon className={[styles.sectionCheck, responsibleManager ? styles.sectionCheckDone : ""].filter(Boolean).join(" ")} />
              )}
            </div>
            <span className={styles.managersDivider} aria-hidden="true" />
            <div className={styles.managersBottomRow}>
              <span className={styles.sectionRowPreview}>{shift.managers.length} managers checked into shift</span>
              <div className={styles.managerAvatarStack}>
                {shift.managers.slice(0, 4).map((manager) => (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img key={manager.id} src={manager.avatar} alt="" className={styles.managerStackAvatar} />
                ))}
              </div>
            </div>
          </button>

          {SECTION_ORDER.map((key) => {
            const sectionDone = getSectionNoteCount(shift, key) > 0;
            return (
              <button key={key} type="button" className={styles.sectionRow} onClick={() => onOpenSection(key)}>
                <span className={styles.sectionIconBubble} style={{ backgroundColor: SECTION_ICON[key].wash, color: SECTION_ICON[key].color }}>
                  {SECTION_ICON[key].icon}
                </span>
                <div className={styles.sectionRowMain}>
                  <span className={styles.sectionRowTitle}>{SECTION_TITLES[key]}</span>
                  <span className={styles.sectionRowPreview}>{getSectionPreview(shift, key)}</span>
                </div>
                {!isCompleted && <CircleCheckIcon className={[styles.sectionCheck, sectionDone ? styles.sectionCheckDone : ""].filter(Boolean).join(" ")} />}
              </button>
            );
          })}
        </div>

        {!isCompleted && !canComplete && (
          <p className={styles.completionHint}>Shift report can only be completed once a shift has ended and all sections have at least one note added</p>
        )}
      </div>

      {!isCompleted && (
        <div className={styles.footer}>
          {!canComplete ? (
            <button type="button" className={styles.completeButton} disabled>
              Submit Report
            </button>
          ) : isCurrentResponsible ? (
            <button type="button" className={styles.completeButton} onClick={() => setConfirmOpen(true)}>
              Submit Report
            </button>
          ) : (
            <div className={styles.completeCard}>
              <LockIcon className={styles.completeIconLocked} />
              <div className={styles.completeText}>
                <span className={styles.completeTitle}>Locked</span>
                <span className={styles.completeCaption}>
                  Only {responsibleManager?.name ?? "the Responsible Manager"} can complete this shift report.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <CompleteConfirmSheet open={confirmOpen} onConfirm={handleConfirmComplete} onCancel={() => setConfirmOpen(false)} />
    </div>
  );
}

function CompleteConfirmSheet({ open, onConfirm, onCancel }: { open: boolean; onConfirm: () => void; onCancel: () => void }) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return;
    }
    if (!mounted) return;
    setClosing(true);
    const timeout = setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, CONFIRM_EXIT_DURATION_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!mounted || closing) return;
    dialogRef.current?.focus({ preventScroll: true });
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mounted, closing, onCancel]);

  if (!mounted) return null;

  return (
    <div className={styles.confirmOverlay} onClick={onCancel}>
      <div
        ref={dialogRef}
        className={[styles.confirmSheet, closing ? styles.confirmSheetClosing : ""].filter(Boolean).join(" ")}
        role="alertdialog"
        aria-modal="true"
        aria-label="Complete shift report"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <span className={styles.confirmGrabber} aria-hidden="true" />
        <h2 className={styles.confirmTitle}>Complete this shift report?</h2>
        <p className={styles.confirmSubtitle}>
          Every section locks once completed. Other managers can still be viewed, but no further notes can be added.
        </p>
        <div className={styles.confirmActions}>
          <button type="button" className={styles.confirmButton} onClick={onConfirm}>
            Complete Shift Report
          </button>
          <button type="button" className={styles.cancelButton} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
