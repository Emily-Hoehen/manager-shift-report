import type { ReactNode } from "react";
import { CircleCheckIcon, CircleExclamationIcon, ClipboardListIcon, ClockIcon } from "../patterns/icons";
import type { StatusTone } from "../../lib/shiftReportListData";
import styles from "./StatusTag.module.css";

export type StatusTagProps = {
  tone: StatusTone;
  label: string;
  theme?: "light" | "dark";
  /** Extra class on the label text only — lets a caller hide it (icon-only) at its own breakpoints without the tag knowing about layout. */
  labelClassName?: string;
};

/** A distinct glyph per tone, so the tag never relies on color alone — and the only thing left when a caller collapses it to icon-only. */
const TONE_ICON: Record<StatusTone, ReactNode> = {
  success: <CircleCheckIcon />,
  danger: <CircleExclamationIcon />,
  warning: <ClockIcon />,
  neutral: <ClipboardListIcon />,
};

/** StatusTag — a day's shift report or sign-off status (getShiftReportsStatusDisplay/getSignOffStatusDisplay) as a tinted, icon-led tag. Shared by the Shift Reports list's status columns and its calendar view so both read identically. */
export function StatusTag({ tone, label, theme = "light", labelClassName }: StatusTagProps) {
  return (
    <span className={styles.tag} data-tone={tone} data-theme={theme}>
      <span className={styles.icon}>{TONE_ICON[tone]}</span>
      <span className={[styles.label, labelClassName].filter(Boolean).join(" ")}>{label}</span>
    </span>
  );
}
