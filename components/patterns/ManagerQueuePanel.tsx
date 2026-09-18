"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { ChartLineIcon, ChevronRightIcon, ClipboardCheckIcon, ClipboardListIcon, TriangleExclamationIcon, XmarkIcon } from "./icons";
import { clockedInAvatars } from "../../lib/homeDashboardData";
import styles from "./ManagerQueuePanel.module.css";

export type ManagerQueuePanelTheme = "light" | "dark";

export type ManagerQueuePanelProps = {
  open: boolean;
  onClose: () => void;
  theme?: ManagerQueuePanelTheme;
};

/**
 * ManagerQueuePanel — the "Manager Queue" report drawer, opened from the
 * Nav's Clipboard utility icon on every page that renders <Nav> (Home,
 * Quality/Scope of Work via SowNav, Roster). Mostly static content — a
 * manager's real queue counts would come from a backend this prototype
 * doesn't have — except End of Shift Report, the one card that's a real
 * link (to /manage-shift/end-of-shift-reports, the month list — from
 * there a manager picks a day to reach the actual report), since that
 * flow actually exists in this prototype. MapPage doesn't render <Nav>
 * at all, so this panel isn't reachable there.
 */
export function ManagerQueuePanel({ open, onClose, theme = "light" }: ManagerQueuePanelProps) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const onSiteAvatars = clockedInAvatars.slice(0, 3);
  const teamStructureAvatar = clockedInAvatars[3];

  return (
    <div className={styles.panel} data-theme={theme} role="dialog" aria-label="Manager Queue" aria-modal="true">
      <div className={styles.header}>
        <h1 className={styles.heading} data-theme={theme}>
          Manager Queue
        </h1>
        <button type="button" className={styles.closeButton} data-theme={theme} onClick={onClose} aria-label="Close">
          <XmarkIcon />
        </button>
      </div>

      <div className={styles.grid}>
        <Link href="/manage-shift/end-of-shift-reports" className={styles.card} data-theme={theme} onClick={onClose}>
          <span className={styles.leadIcon} data-theme={theme} data-tone="primary">
            <ClipboardCheckIcon />
          </span>
          <div className={styles.cardMain}>
            <TitleLink theme={theme}>Shift Reports</TitleLink>
          </div>
        </Link>

        <div className={styles.card} data-theme={theme}>
          <span className={styles.leadIcon} data-theme={theme} data-tone="danger">
            <TriangleExclamationIcon />
          </span>
          <div className={styles.cardMain}>
            <TitleLink theme={theme}>Hours Manager</TitleLink>
            <p className={styles.caption} data-theme={theme}>
              Approvals for <strong>Today</strong> are Due in <strong>16 hours</strong>.
            </p>
          </div>
        </div>

        <div className={styles.card} data-theme={theme}>
          <div className={styles.cardMain}>
            <TitleLink theme={theme}>Who&rsquo;s On-Site Today</TitleLink>
            <p className={styles.caption} data-theme={theme}>
              Associates Clocked-In
            </p>
          </div>
          <div className={styles.avatarStack}>
            {onSiteAvatars.map((person) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={person.name} src={person.avatar} alt="" className={styles.avatarStackItem} />
            ))}
            <span className={styles.avatarStackMore}>+48</span>
          </div>
          <span className={styles.value} data-theme={theme}>
            51
          </span>
        </div>

        <div className={styles.card} data-theme={theme}>
          <div className={styles.cardMain}>
            <TitleLink theme={theme}>Service Validation</TitleLink>
            <p className={styles.caption} data-theme={theme}>
              0 Verifications Today
            </p>
            <div className={styles.progressTrack} data-theme={theme}>
              <div className={styles.progressFill} style={{ width: "92%" }} />
            </div>
          </div>
          <div className={styles.stackedStat}>
            <span className={styles.statLineDanger} data-theme={theme}>
              <TriangleExclamationIcon className={styles.statLineIcon} /> 7576 <span className={styles.statLineLabel}>Incomplete</span>
            </span>
            <span className={styles.statLineWarning} data-theme={theme}>
              7576 <span className={styles.statLineLabel}>Remaining</span>
            </span>
          </div>
        </div>

        <QueueCard theme={theme} title="Billing Forecast" value="0">
          <span className={styles.captionWarning} data-theme={theme}>
            0 Sales Orders Pending
          </span>{" "}
          <span className={styles.captionMuted} data-theme={theme}>
            |
          </span>{" "}
          <span className={styles.captionDanger} data-theme={theme}>
            0 Sales Orders Past Due
          </span>
        </QueueCard>

        <QueueCard theme={theme} title="Open Complaints" caption="Most Recent: 06/24/2026" value="0" />
        <QueueCard theme={theme} title="New Employee Requests" value="0">
          <span className={styles.captionWarning} data-theme={theme}>
            0 Pending
          </span>{" "}
          <span className={styles.captionMuted} data-theme={theme}>
            |
          </span>{" "}
          <span className={styles.captionDanger} data-theme={theme}>
            0 Past Due
          </span>
        </QueueCard>

        <QueueCard theme={theme} title="Pending Report Its" caption="Most Recent: 09/15/2026" value="9" />
        <QueueCard theme={theme} title="New Attestations" caption="Most Recent: 09/15/2026" value="531" />
        <QueueCard theme={theme} title="Past Due To-Dos" caption="Most Recent: 09/15/2026" value="19" />

        <QueueCard theme={theme} title="Incomplete Routes" caption="Most Recent: 07/31/2026" value="0" />
        <QueueCard theme={theme} title="Incomplete Professionalism Audits" caption="Last Completed: 09/11/2026" value="218" />
        <QueueCard theme={theme} title="Incomplete Employee Scorecards" caption="Due In: 15 days" value="37" />

        <QueueCard theme={theme} title="Occupant Reports" caption="Most Recent: N/A" value="0" />

        <div className={styles.card} data-theme={theme}>
          <div className={styles.cardMain}>
            <TitleLink theme={theme}>Team Structure</TitleLink>
            <p className={styles.caption} data-theme={theme}>
              Unassigned Employees
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={teamStructureAvatar.avatar} alt="" className={styles.singleAvatar} />
          <span className={styles.value} data-theme={theme}>
            1
          </span>
        </div>

        <QueueCard theme={theme} title="Service Frequency Notifications" caption="Most Recent: 4:30 PM" />

        <QueueCard theme={theme} title="Pending Employee Service Review" caption="Most Recent: 09/15/2026" value="3" />
        <QueueCard theme={theme} title="Compliance Monitoring" caption="Managers, sites, and violation summary" />
        <QueueCard theme={theme} title="Customer Surveys Pending Response" caption="Most Recent Returned: 08/26/2026" value="4" />

        <QueueCard theme={theme} title="Customer Contacts Pending Validation" caption="Most Recent: 06/09/2026" value="193" />
      </div>

      <h2 className={styles.subheading} data-theme={theme}>
        Manager Tools
      </h2>

      <div className={styles.toolsGrid}>
        <button type="button" className={styles.toolCard} data-theme={theme}>
          <span className={styles.toolIcon} data-theme={theme}>
            <ClipboardListIcon />
          </span>
          <span className={styles.toolLabel} data-theme={theme}>
            Accredit Transcripts
          </span>
        </button>
        <button type="button" className={styles.toolCard} data-theme={theme}>
          <span className={styles.toolIcon} data-theme={theme}>
            <ChartLineIcon />
          </span>
          <span className={styles.toolLabel} data-theme={theme}>
            Course Assignment Manager
          </span>
        </button>
      </div>
    </div>
  );
}

function TitleLink({ theme, children }: { theme: ManagerQueuePanelTheme; children: ReactNode }) {
  return (
    <span className={styles.titleLink} data-theme={theme}>
      {children}
      <ChevronRightIcon className={styles.titleArrow} />
    </span>
  );
}

function QueueCard({
  theme,
  title,
  caption,
  value,
  children,
}: {
  theme: ManagerQueuePanelTheme;
  title: string;
  caption?: string;
  value?: string;
  children?: ReactNode;
}) {
  return (
    <div className={styles.card} data-theme={theme}>
      <div className={styles.cardMain}>
        <TitleLink theme={theme}>{title}</TitleLink>
        {(caption || children) && (
          <p className={styles.caption} data-theme={theme}>
            {children ?? caption}
          </p>
        )}
      </div>
      {value && (
        <span className={styles.value} data-theme={theme}>
          {value}
        </span>
      )}
    </div>
  );
}
