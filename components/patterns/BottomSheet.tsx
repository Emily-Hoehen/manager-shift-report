"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { XmarkIcon } from "./icons";
import styles from "./BottomSheet.module.css";

export type BottomSheetTheme = "dark" | "light";

export type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Defaults to "dark" — the Map feature's own dark UI this sheet was originally built for. Callers on
      a light-theme page (e.g. the desktop End of Shift Report) pass "light" instead. */
  theme?: BottomSheetTheme;
  children: ReactNode;
};

/**
 * BottomSheet — shared full-width bottom-sheet chrome, matching Figma
 * fileKey 0UJDRcrFiXkn16yfc2MUEW (nodes 98:4172 "Reports Its Modal" and
 * 98:3539 "Day Shift Associates" — both the same sheet shell around
 * different bodies). Deliberately not built on ui/Modal, which centers
 * a capped-width dialog: this instead runs the full viewport width with
 * a fixed 40px gap above it (the rest of the screen still shows the
 * blurred page behind), flush with the bottom edge like a real bottom
 * sheet, rounded on its top corners only. Its own content is capped and
 * centered at 1440px with a 40px padding "border" around it, independent
 * of whatever width the page behind it happens to be. Every sheet that
 * reuses this gets the exact same chrome for free — only the title and
 * body content differ per caller.
 */
export function BottomSheet({ open, onClose, title, theme = "dark", children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sheetRef.current?.focus();
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.overlay} data-theme={theme} onClick={onClose}>
      <div
        ref={sheetRef}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.sheetScroll}>
          <div className={styles.sheetContent}>
            <div className={styles.header}>
              <h2 className={styles.title}>{title}</h2>
              <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
                <XmarkIcon />
              </button>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
