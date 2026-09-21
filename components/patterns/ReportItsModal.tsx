"use client";

import { BottomSheet, type BottomSheetTheme } from "./BottomSheet";
import type { ReportItemEntry, ShiftReport } from "../../lib/mapShiftReportData";
import styles from "./ReportItsModal.module.css";

export type ReportItsModalProps = {
  open: boolean;
  onClose: () => void;
  shiftLabel: string;
  report: Pick<ShiftReport, "reportItems" | "totalReportIts" | "reportItsRejected" | "reportItsAcceptanceRate">;
  /** Defaults to "dark" (see BottomSheet) — the desktop End of Shift Report passes "light" instead. */
  theme?: BottomSheetTheme;
};

/**
 * ReportItsModal — one shift's itemized Report-Its list, in the shared
 * BottomSheet chrome. Matches Figma fileKey 0UJDRcrFiXkn16yfc2MUEW,
 * node 98:4172 ("Reports Its Modal").
 */
export function ReportItsModal({ open, onClose, shiftLabel, report, theme = "dark" }: ReportItsModalProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title={`${shiftLabel} Shift Report Its`} theme={theme}>
      <div className={styles.body} data-theme={theme}>
        <div className={styles.statRow}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Submitted</span>
            <span className={styles.statValue}>{report.totalReportIts}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Rejected</span>
            <span className={styles.statValue}>{report.reportItsRejected}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Acceptance Rate</span>
            <span className={styles.statValue}>{report.reportItsAcceptanceRate}%</span>
          </div>
        </div>

        <div className={styles.table}>
          <div className={styles.row}>
            <span className={styles.headerCell} data-col="associate">
              Associate
            </span>
            <span className={styles.headerCell} data-col="status">
              Status
            </span>
            <span className={styles.headerCell} data-col="goodCatch">
              Good Catch
            </span>
            <span className={styles.headerCell} data-col="location">
              Location
            </span>
            <span className={styles.headerCell} data-col="comments">
              Comments
            </span>
            <span className={styles.headerCell} data-col="summary">
              Summary
            </span>
            <span className={styles.headerCell} data-col="view" />
          </div>
          <div className={styles.hairline} />

          {report.reportItems.length === 0 && <p className={styles.empty}>No report-its this shift.</p>}
          {report.reportItems.map((item, i) => (
            <ReportItemRow key={`${item.title}-${i}`} item={item} isLast={i === report.reportItems.length - 1} />
          ))}
        </div>
      </div>
    </BottomSheet>
  );
}

function ReportItemRow({ item, isLast }: { item: ReportItemEntry; isLast: boolean }) {
  return (
    <>
      <div className={styles.row}>
        <div className={styles.cell} data-col="associate">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.submittedBy.avatar} alt="" className={styles.avatar} />
          <div className={styles.associateInfo}>
            <span className={styles.associateName}>{item.submittedBy.name}</span>
            <span className={styles.associatePosition}>{item.submittedBy.position}</span>
          </div>
        </div>
        <div className={styles.cell} data-col="status">
          {item.status === "Accepted" ? (
            <div className={styles.statusStack}>
              <span className={styles.statusAccepted}>Accepted</span>
              <span className={styles.statusWorkOrder}>Work Order #</span>
            </div>
          ) : (
            <span className={styles.statusRejected}>Rejected</span>
          )}
        </div>
        <div className={styles.cell} data-col="goodCatch">
          <span className={styles.plainText}>{item.goodCatch ? "Yes" : "No"}</span>
        </div>
        <div className={styles.cell} data-col="location">
          <span className={styles.plainText}>{item.location}</span>
        </div>
        <div className={styles.cell} data-col="comments">
          <span className={styles.plainText}>{item.commentsCount}</span>
        </div>
        <div className={styles.cell} data-col="summary">
          <span className={styles.plainText}>{item.description}</span>
        </div>
        <div className={styles.cell} data-col="view">
          <span className={styles.viewLink}>View</span>
        </div>
      </div>
      {!isLast && <div className={styles.hairline} />}
    </>
  );
}
