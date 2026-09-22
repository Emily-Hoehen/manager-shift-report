"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./Select.module.css";

export type SelectOption<T extends string> = {
  value: T;
  label: string;
};

export type DsSelectTheme = "light" | "dark";

export type DsSelectProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  ariaLabel: string;
  /** Optional inline label rendered to the left, e.g. "Filter" / "Sort" — pairs the select with its own field wrapper instead of the caller hand-rolling one. */
  label?: string;
  /** Stretches the trigger (and its drawer) to the width of the parent instead of the default content-hugging min-width — for a form field laid out label-above/field-below rather than inline next to other filter controls. */
  fullWidth?: boolean;
  /** Defaults to "light" (every existing caller's own page chrome) — a dark-theme page (e.g. the Manager App mobile flow) passes "dark" instead. */
  theme?: DsSelectTheme;
};

/**
 * DsSelect — the design system's "Dropdown" component (Figma fileKey
 * SWFMjlBJ4u9vSrVaomRe12, node 118:16287, "Dropdown Drawer"): a custom
 * button + listbox rather than a native `<select>`, since the open
 * drawer's per-row selected state (a blue tint fill plus a trailing
 * checkmark, not the browser's own highlight) isn't reproducible by
 * restyling a native option list. Closes on outside click or Escape,
 * same idiom as the page's date-preset menu. Shared across every page
 * with a "Filter / Sort / View by"-style control row (SowHierarchyPage,
 * SowTimeFirstPage).
 */
export function DsSelect<T extends string>({ value, onChange, options, ariaLabel, label, fullWidth, theme = "light" }: DsSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const select = (
    <div className={[styles.selectWrap, fullWidth ? styles.selectWrapFull : ""].filter(Boolean).join(" ")} data-theme={theme} ref={rootRef}>
      <button
        type="button"
        className={[styles.dsSelect, fullWidth ? styles.dsSelectFull : ""].filter(Boolean).join(" ")}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.dsSelectValue}>{selected?.label ?? ""}</span>
        <i className={["fa-solid fa-chevron-down", styles.selectCaret].join(" ")} aria-hidden="true" />
      </button>
      {open && (
        <div className={styles.dropdownDrawer} role="listbox" aria-label={ariaLabel}>
          {options.map((o) => {
            const isSelected = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={[styles.dropdownItem, isSelected ? styles.dropdownItemSelected : ""].filter(Boolean).join(" ")}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                <span className={styles.dropdownItemLabel}>{o.label}</span>
                {isSelected && <i className={["fa-solid fa-check", styles.dropdownItemCheck].join(" ")} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  if (!label) return select;

  return (
    <div className={styles.filterField} data-theme={theme}>
      <span className={styles.filterFieldLabel}>{label}</span>
      {select}
    </div>
  );
}
