"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CircleCheckIcon, TriangleExclamationIcon } from "./icons";
import { ManagerAppSelectShiftDrawer } from "./ManagerAppSelectShiftDrawer";
import selectStyles from "../ui/Select.module.css";
import { SHIFT_OPTIONS, type ShiftKey } from "../../lib/managerShiftReportData";
import styles from "./ManagerAppClockSheet.module.css";

export type ManagerAppClockSheetMode = "check-in" | "check-out";

export type ManagerAppClockSheetProps = {
  open: boolean;
  mode: ManagerAppClockSheetMode;
  /** Elapsed-shift summary shown in the check-out copy, e.g. "2h 14m". Ignored for check-in. */
  elapsedLabel?: string;
  /** Which shift the manager is clocking into — check-in only, defaulted by the caller off time-of-day (see getDefaultShiftForTime) but changeable here before confirming. */
  selectedShift: ShiftKey;
  onSelectShift: (key: ShiftKey) => void;
  onConfirm: () => void;
  onCancel: () => void;
  /** Check-out only — shows an inline reminder that the End of Shift Report hasn't been submitted yet. Checking out is still allowed. */
  showReportWarning?: boolean;
  onGoToReport?: () => void;
};

/** Matches .sheetClosing's animation-duration in ManagerAppClockSheet.module.css — how long the slide-down exit runs before this actually unmounts. */
const EXIT_DURATION_MS = 260;

/**
 * ManagerAppClockSheet — bottom sheet for starting/ending a shift.
 * Opens from the shift-clock card on the Manager App home screen;
 * confirming starts or stops the shift timer. Closes on Escape, a
 * backdrop tap, Cancel, or Check In/Out — all four slide the sheet
 * back down instead of just vanishing, so it stays mounted for
 * EXIT_DURATION_MS after `open` goes false to let that animation play
 * out before actually unmounting. Rendered as position:fixed, but
 * scoped to the phone screen by AndroidPhoneFrame's .screen transform
 * (see that component), not the real browser viewport.
 */
export function ManagerAppClockSheet({
  open,
  mode,
  elapsedLabel,
  selectedShift,
  onSelectShift,
  onConfirm,
  onCancel,
  showReportWarning,
  onGoToReport,
}: ManagerAppClockSheetProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const [shiftDrawerOpen, setShiftDrawerOpen] = useState(false);

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
    }, EXIT_DURATION_MS);
    return () => clearTimeout(timeout);
    // Only `open` should retrigger this — `mounted` is read, not depended on, so a close-timeout already in flight isn't restarted by the mounted-state update it itself causes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!mounted || closing) return;
    // preventScroll: true — without it, focusing this dialog while it's still off-screen
    // (mid slide-up, via transform) makes the browser scroll .scrollArea (AndroidPhoneFrame's
    // scroll container, which holds the dashboard behind this fixed overlay) to try to bring
    // it into view, so the dashboard content visibly jumps/scrolls underneath the sheet.
    dialogRef.current?.focus({ preventScroll: true });
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mounted, closing, onCancel]);

  if (!mounted) return null;

  const isCheckIn = mode === "check-in";

  return (
    <>
    <div className={styles.overlay} onClick={onCancel}>
      <div
        ref={dialogRef}
        className={[styles.sheet, closing ? styles.sheetClosing : ""].filter(Boolean).join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className={styles.title}>
          {isCheckIn ? "Check in to start your shift" : "Check out to end your shift"}
        </h2>

        {isCheckIn && (
          <>
            <div className={styles.shiftPicker}>
              <span className={styles.shiftPickerLabel}>Checking in for</span>
              {/* Opens the full Select Shift drawer instead of an inline dropdown — a plain row of
                  buttons stops fitting the moment there are more than three shifts to choose from,
                  and a drawer is the friendlier target on an Android-width screen either way. */}
              <div className={selectStyles.selectWrap} data-theme="dark">
                <button
                  type="button"
                  className={[selectStyles.dsSelect, selectStyles.dsSelectFull].join(" ")}
                  aria-haspopup="dialog"
                  onClick={() => setShiftDrawerOpen(true)}
                >
                  <span className={selectStyles.dsSelectValue}>{SHIFT_OPTIONS.find((s) => s.key === selectedShift)?.label} Shift</span>
                  <i className={["fa-solid fa-chevron-down", selectStyles.selectCaret].join(" ")} aria-hidden="true" />
                </button>
              </div>
              <span className={styles.shiftPickerCaption}>{SHIFT_OPTIONS.find((s) => s.key === selectedShift)?.timeRange}</span>
            </div>

            <span className={styles.divider} aria-hidden="true" />
          </>
        )}

        <div className={styles.introGroup}>
          <p className={styles.subtitle}>
            {isCheckIn ? (
              <>
                We&rsquo;ve confirmed your location to help
                <br />
                verify your check-in.
              </>
            ) : (
              `You’re about to end your shift after ${elapsedLabel ?? "0m"}.`
            )}
          </p>

          <div className={styles.locationGroup}>
            <div className={styles.locationBadge}>
              <CircleCheckIcon className={styles.locationIcon} />
              <span>You&rsquo;re within the service area.</span>
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/checkinpic.png" alt="" className={styles.mapPreview} aria-hidden="true" />
          </div>

          {!isCheckIn && showReportWarning && (
            <div className={styles.reportWarning}>
              <TriangleExclamationIcon className={styles.reportWarningIcon} />
              <span>
                You haven&rsquo;t submitted your End of Shift Report yet.{" "}
                <button type="button" className={styles.reportWarningLink} onClick={onGoToReport}>
                  Go to Shift Report
                </button>
              </span>
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.confirmButton} onClick={onConfirm}>
            {isCheckIn ? "Check In" : "Check Out"}
          </button>
          <button type="button" className={styles.cancelButton} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>

    {isCheckIn && (
      <ManagerAppSelectShiftDrawer
        open={shiftDrawerOpen}
        value={selectedShift}
        onSelect={onSelectShift}
        onClose={() => setShiftDrawerOpen(false)}
      />
    )}
    </>
  );
}
