"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Input } from "../ui/Input";
import styles from "./ManagerAppHeadcountEditSheet.module.css";

export type ManagerAppHeadcountEditSheetProps = {
  open: boolean;
  /** Current Scheduled Headcount value, shown pre-filled when the sheet opens. */
  value: number;
  onSave: (value: number) => void;
  onCancel: () => void;
};

/** Matches .sheetClosing's animation-duration in ManagerAppHeadcountEditSheet.module.css. */
const EXIT_DURATION_MS = 260;

/**
 * ManagerAppHeadcountEditSheet — bottom sheet for entering how many
 * people were scheduled for a shift, opened by tapping the Scheduled
 * Headcount row in the Hours & Headcount report section. Mirrors
 * ManagerAppClockSheet's mount/exit-animation and focus/Escape handling.
 */
export function ManagerAppHeadcountEditSheet({ open, value, onSave, onCancel }: ManagerAppHeadcountEditSheetProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      setDraft(String(value));
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
  }, [open, value]);

  useEffect(() => {
    if (!mounted || closing) return;
    dialogRef.current?.querySelector("input")?.focus({ preventScroll: true });
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mounted, closing, onCancel]);

  if (!mounted) return null;

  const parsed = Number(draft);
  const isValid = draft.trim() !== "" && Number.isInteger(parsed) && parsed >= 0;

  function handleSave() {
    if (!isValid) return;
    onSave(parsed);
  }

  return (
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
          Edit Scheduled Headcount
        </h2>

        <Input
          wrapperClassName={styles.field}
          label="Scheduled Headcount"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
        />

        <div className={styles.actions}>
          <button type="button" className={styles.confirmButton} onClick={handleSave} disabled={!isValid}>
            Save
          </button>
          <button type="button" className={styles.cancelButton} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
