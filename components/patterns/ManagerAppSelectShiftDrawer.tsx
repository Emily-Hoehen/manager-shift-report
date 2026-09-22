"use client";

import { useEffect, useId, useRef, useState } from "react";
import { XmarkIcon } from "./icons";
import { SHIFT_OPTIONS, type ShiftKey } from "../../lib/managerShiftReportData";
import styles from "./ManagerAppSelectShiftDrawer.module.css";

export type ManagerAppSelectShiftDrawerProps = {
  open: boolean;
  value: ShiftKey;
  onSelect: (key: ShiftKey) => void;
  onClose: () => void;
};

/** Matches .sheetClosing's animation-duration in ManagerAppSelectShiftDrawer.module.css. */
const EXIT_DURATION_MS = 260;

/**
 * ManagerAppSelectShiftDrawer — bottom sheet for picking which shift
 * to check in for, opened from ManagerAppClockSheet's own "Checking
 * in for" field (Figma fileKey 0UJDRcrFiXkn16yfc2MUEW, node
 * 394:49836, "Select Shift Drawer"). Stacks above ManagerAppClockSheet
 * (higher z-index), same bottom-sheet mechanics and mount/exit
 * animation as the rest of this app's sheets.
 */
export function ManagerAppSelectShiftDrawer({ open, value, onSelect, onClose }: ManagerAppSelectShiftDrawerProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!mounted || closing) return;
    dialogRef.current?.focus({ preventScroll: true });
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mounted, closing, onClose]);

  if (!mounted) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        ref={dialogRef}
        className={[styles.sheet, closing ? styles.sheetClosing : ""].filter(Boolean).join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            Select Shift
          </h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
            <XmarkIcon />
          </button>
        </div>

        <div className={styles.list} role="listbox" aria-label="Select Shift">
          {SHIFT_OPTIONS.map((option) => {
            const isSelected = option.key === value;
            return (
              <button
                key={option.key}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={styles.row}
                data-selected={isSelected}
                onClick={() => {
                  onSelect(option.key);
                  onClose();
                }}
              >
                <span className={styles.rowLabel}>{option.label} Shift</span>
                {isSelected && <i className={["fa-solid fa-check", styles.rowCheck].join(" ")} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
