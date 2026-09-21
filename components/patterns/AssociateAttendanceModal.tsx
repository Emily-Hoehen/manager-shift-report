"use client";

import { useState } from "react";
import { BottomSheet, type BottomSheetTheme } from "./BottomSheet";
import type { AssociateAttendanceEntry } from "../../lib/mapShiftReportData";
import styles from "./AssociateAttendanceModal.module.css";

const HEADCOUNT_TABS = ["Scheduled", "Actual Arrival", "Absent"] as const;
type HeadcountTab = (typeof HEADCOUNT_TABS)[number];

const ATTENDANCE_STATUS_TONE: Record<AssociateAttendanceEntry["status"], string> = {
  Arrived: "success",
  "Call Out": "warning",
  "No Call/No Show": "danger",
};

export type AssociateAttendanceModalProps = {
  open: boolean;
  onClose: () => void;
  shiftLabel: string;
  associates: AssociateAttendanceEntry[];
  /** Defaults to "dark" (see BottomSheet) — the desktop End of Shift Report passes "light" instead. */
  theme?: BottomSheetTheme;
};

/**
 * AssociateAttendanceModal — opened from Hours and Headcount's headcount
 * numbers, the real named LGA roster for this shift (data/LGA Employees/
 * lga_employees.csv), each with a Scheduled/Arrived/Absent status. Its
 * Arrived/Call Out/No Call-No Show tally always matches the Scheduled
 * Headcount/Actual Arrival/Total Absences figures shown above it (see
 * buildAssociateAttendance) — the same day's absences, just attributed to
 * specific named people. Same BottomSheet chrome and row/table treatment
 * as ReportItsModal — matches Figma fileKey 0UJDRcrFiXkn16yfc2MUEW, node
 * 98:3539 ("Day Shift
 * Associates"): filled pill filter buttons, not underline tabs.
 */
export function AssociateAttendanceModal({ open, onClose, shiftLabel, associates, theme = "dark" }: AssociateAttendanceModalProps) {
  const [activeTab, setActiveTab] = useState<HeadcountTab>("Scheduled");

  const arrivedCount = associates.filter((a) => a.status === "Arrived").length;
  const absentCount = associates.length - arrivedCount;
  const tabCounts: Record<HeadcountTab, number> = { Scheduled: associates.length, "Actual Arrival": arrivedCount, Absent: absentCount };

  const filteredAssociates = associates.filter((associate) => {
    if (activeTab === "Actual Arrival") return associate.status === "Arrived";
    if (activeTab === "Absent") return associate.status !== "Arrived";
    return true;
  });

  return (
    <BottomSheet open={open} onClose={onClose} title={`${shiftLabel} Shift Headcount`} theme={theme}>
      <div className={styles.body} data-theme={theme}>
        <div className={styles.filterRow}>
          {HEADCOUNT_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={styles.filterButton}
              aria-pressed={activeTab === tab}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "Scheduled" ? "All Scheduled" : tab} ({tabCounts[tab]})
            </button>
          ))}
        </div>

        <div className={styles.table}>
          <div className={styles.row}>
            <span className={styles.headerCell} data-col="associate">
              Associate
            </span>
            <span className={styles.headerCell} data-col="status">
              Status
            </span>
          </div>
          <div className={styles.hairline} />

          {filteredAssociates.length === 0 && <p className={styles.empty}>No associates match this filter.</p>}
          {filteredAssociates.map((associate, i) => (
            <AssociateRow key={associate.name} associate={associate} isLast={i === filteredAssociates.length - 1} />
          ))}
        </div>
      </div>
    </BottomSheet>
  );
}

function AssociateRow({ associate, isLast }: { associate: AssociateAttendanceEntry; isLast: boolean }) {
  return (
    <>
      <div className={styles.row}>
        <div className={styles.cell} data-col="associate">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={associate.avatar} alt="" className={styles.avatar} />
          <div className={styles.associateInfo}>
            <span className={styles.associateName}>{associate.name}</span>
            <span className={styles.associatePosition}>{associate.position}</span>
          </div>
        </div>
        <div className={styles.cell} data-col="status">
          <span className={styles.statusTag} data-tone={ATTENDANCE_STATUS_TONE[associate.status]}>
            {associate.status}
          </span>
        </div>
      </div>
      {!isLast && <div className={styles.hairline} />}
    </>
  );
}
