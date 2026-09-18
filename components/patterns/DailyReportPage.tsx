"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Nav } from "./Nav";
import { ManagerQueuePanel } from "./ManagerQueuePanel";
import {
  ArrowRightIcon,
  BellIcon,
  BriefcaseIcon,
  BroomWideIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CircleCheckIcon,
  ClipboardCheckIcon,
  ClipboardIcon,
  ClockIcon,
  EnvelopeIcon,
  MoreIcon,
  PinIcon,
  PlusCircleIcon,
  TriangleExclamationIcon,
  UserHardHatIcon,
  VectorSquareIcon,
} from "./icons";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { formatMinutesToHoursLabel, parseHoursLabelToMinutes } from "./FullShiftReportModal";
import { buildDailyReport, type QualityScore } from "../../lib/mapPageData";
import { buildShiftReport, type ShiftReport } from "../../lib/mapShiftReportData";
import { computeDailyAreaCoverageBreakdown } from "../../lib/mapAreaServiceData";
import { formatSignOffNowLabel, SHIFT_ORDER } from "../../lib/shiftReportListData";
import {
  INITIAL_SHIFT_REPORTS,
  SHIFT_LABELS,
  getShiftLiveStatus,
  parseViewerRole,
  type ShiftKey,
} from "../../lib/managerShiftReportData";
import type { ContractBuilding } from "../../lib/sowContract";
import { ANCHOR_DATE } from "../../lib/sowData";
import { siteInfo } from "../../lib/homeDashboardData";
import styles from "./DailyReportPage.module.css";

const dateFormatter = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" });
const pickerDateFormatter = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

type ShiftRowTone = "completed" | "inProgress" | "notStarted" | "overdue";

/** Today's own per-shift tone (see buildTodayRow in shiftReportListData, which this mirrors) — only meaningful while isToday is true; a past/illustrative day's shifts are always "completed". */
function getTodayShiftTone(shiftKey: ShiftKey, now: Date | null): ShiftRowTone {
  if (!now) return "notStarted";
  const liveStatus = getShiftLiveStatus(shiftKey, now);
  if (liveStatus !== "ended") return liveStatus === "inProgress" ? "inProgress" : "notStarted";
  return INITIAL_SHIFT_REPORTS[shiftKey].completedBy ? "completed" : "overdue";
}

/** Same three Quality categories FullDayReportModalV2 shows in the Map — kept identical here so the two surfaces never disagree. */
const QUALITY_DISPLAY_LABELS = ["AI Verification", "Internal Audit", "Customer Audit"] as const;

function buildDailyQualityScore(shiftReports: ShiftReport[], label: (typeof QUALITY_DISPLAY_LABELS)[number]): QualityScore {
  const perShift = shiftReports
    .map((report) => report.qualityScores.find((score) => score.label === label))
    .filter((score): score is QualityScore => Boolean(score));
  const totalCount = perShift.reduce((sum, score) => sum + (parseInt(score.count.replace(/[^\d]/g, ""), 10) || 0), 0);
  const scoredValues = perShift.filter((score) => score.value !== "N/A").map((score) => Number(score.value));
  const averageValue = scoredValues.length > 0 ? (scoredValues.reduce((sum, value) => sum + value, 0) / scoredValues.length).toFixed(2) : "N/A";
  const countLabel = label === "AI Verification" ? `${totalCount.toLocaleString()} services` : `${totalCount} audit${totalCount === 1 ? "" : "s"}`;
  return { label, count: countLabel, value: averageValue, tone: scoredValues.length > 0 ? "success" : "neutral" };
}

export type DailyReportPageProps = {
  contractBuildings: ContractBuilding[];
};

/**
 * DailyReportPage — the Daily Report, reached from a signed-off day on the Shift Reports list
 * (EndOfShiftReportListPage), as its own light-mode page within 4insite's own nav chrome instead
 * of the dark modal (FullDayReportModalV2) the Map feature opens this same content in. Same data
 * and layout as FullDayReportModalV2 — same shift-card accordion, same Daily Summary sidebar —
 * just without the overlay/dialog chrome, and pinned to the Map's own ANCHOR_DATE sample day (this
 * prototype has no per-day report data beyond that one day, same convention EndOfShiftReportPage
 * uses for every day's own shift report).
 */
export function DailyReportPage({ contractBuildings }: DailyReportPageProps) {
  const searchParams = useSearchParams();
  const [managerQueueOpen, setManagerQueueOpen] = useState(false);

  // Who's looking at this page (see ViewerRole) — only the Site Director can sign off a day here; a
  // Manager on Shift or Other User both just get a read-only view of the same content. Set by the
  // Shift Reports list's own persona toggle, carried over as a `?as=` param.
  const viewerRole = parseViewerRole(searchParams.get("as"));

  // Set only by the Shift Reports list's own today row (see dailyReportHref) — every other entry
  // point (a past, illustrative day) keeps this page's original always-the-same-sample-day behavior.
  // While true, the three shift rows below read live status (getShiftLiveStatus/INITIAL_SHIFT_REPORTS)
  // instead of always showing "completed", same live source the list's own today row already reads.
  const isToday = searchParams.get("today") === "1";

  // Starts null so the server-rendered markup and the client's first render agree exactly (today's
  // live shift status can't be known during SSR) — filled in immediately after mount, client-side only.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    if (!isToday) return;
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, [isToday]);

  // The header's own date picker (Figma fileKey 0UJDRcrFiXkn16yfc2MUEW, node 265:34511) — this
  // prototype has no per-day report data beyond the one ANCHOR_DATE sample (see the file header
  // comment), so stepping the picker only moves the big date heading itself, not the content below it.
  const [viewDate, setViewDate] = useState(ANCHOR_DATE);

  const dailyReport = buildDailyReport(0, contractBuildings);
  const allShiftReports = dailyReport.shifts.map((shift) => buildShiftReport(shift, 0, contractBuildings));
  const shiftReportByKey = Object.fromEntries(allShiftReports.map((report) => [report.shiftKey, report])) as Record<ShiftKey, ShiftReport>;
  const dailyAreaCoverage = computeDailyAreaCoverageBreakdown(contractBuildings, 0);

  // A day the Shift Reports list already marks "Signed Off" (?signedOff=1&at=...) opens here already
  // signed off too — the list and this page have to agree, not contradict each other by showing a
  // "Sign Off Day" action for a day that's supposedly already done. There's no real stored note for
  // those illustrative already-signed-off days, so it falls back to the AI overview's own review
  // paragraph (mapPageData's buildAiOverview writes that paragraph in Juan's own voice already). A day
  // that's just ready for sign-off (no signedOff param) still starts unsigned, same as before.
  const signedOffParam = searchParams.get("signedOff") === "1";
  const signedOffAtParam = searchParams.get("at");
  const initialSignOff = signedOffParam
    ? {
        timestamp: signedOffAtParam || dailyReport.siteManagerSignOff.replace(/^Signed off at /, ""),
        note: dailyReport.aiOverview.split("\n")[1] ?? dailyReport.aiOverview,
      }
    : null;

  // Starts unsigned unless arriving from an already-signed-off list day (see initialSignOff above) —
  // reviewing every shift's own data on this page (rather than just the list's compact row) is the
  // point of signing off from here, so there's normally something left to do.
  // note is required, not optional — a Site Director's sign-off has to carry his own review remark,
  // not just a timestamp, so confirmSignOff below refuses to fire without one.
  const [signOff, setSignOff] = useState<{ timestamp: string; note: string } | null>(initialSignOff);
  const [signOffModalOpen, setSignOffModalOpen] = useState(false);
  const [signOffNoteDraft, setSignOffNoteDraft] = useState("");
  const trimmedSignOffNote = signOffNoteDraft.trim();

  function confirmSignOff() {
    if (!trimmedSignOffNote) return;
    setSignOff({ timestamp: formatSignOffNowLabel(), note: trimmedSignOffNote });
    setSignOffModalOpen(false);
    setSignOffNoteDraft("");
  }

  const totalManagers = allShiftReports.reduce((sum, r) => sum + r.managers.length, 0);
  const totalAssociates = allShiftReports.reduce((sum, r) => sum + r.scheduledHeadcount, 0);

  const capturedMinutes = allShiftReports.reduce((sum, r) => sum + parseHoursLabelToMinutes(r.hoursCapturedLabel), 0);
  const paidMinutes = allShiftReports.reduce((sum, r) => sum + parseHoursLabelToMinutes(r.hoursPaidLabel), 0);

  const realServicesCompleted = allShiftReports.reduce((sum, r) => sum + r.servicesCompletedCount, 0);
  const realServicesExpected = allShiftReports.reduce((sum, r) => sum + r.servicesExpectedCount, 0);
  const realServicesPercent = realServicesExpected > 0 ? Math.round((realServicesCompleted / realServicesExpected) * 100) : 0;

  const dailyQualityScores = QUALITY_DISPLAY_LABELS.map((label) => buildDailyQualityScore(allShiftReports, label));
  const totalSafetyIssues = allShiftReports.reduce((sum, r) => sum + r.safetyIssues.length, 0);
  const reportItsSubmitted = allShiftReports.reduce((sum, r) => sum + r.totalReportIts, 0);
  const reportItsAccepted = allShiftReports.reduce((sum, r) => sum + r.reportItsAccepted, 0);
  const reportItsAcceptanceRate = reportItsSubmitted > 0 ? Math.round((reportItsAccepted / reportItsSubmitted) * 100) : 0;

  const shiftTones: Record<ShiftKey, ShiftRowTone> = Object.fromEntries(
    SHIFT_ORDER.map((key) => [key, isToday ? getTodayShiftTone(key, now) : "completed"])
  ) as Record<ShiftKey, ShiftRowTone>;
  const dayInProgress = isToday && SHIFT_ORDER.some((key) => shiftTones[key] === "inProgress" || shiftTones[key] === "notStarted");
  const signOffDueLabel = pickerDateFormatter.format(addDays(now ?? ANCHOR_DATE, 1));

  const asParam = viewerRole === "director" ? "" : `&as=${viewerRole}`;
  const listHref = viewerRole === "director" ? "/manage-shift/end-of-shift-reports" : `/manage-shift/end-of-shift-reports?as=${viewerRole}`;

  return (
    <div className={styles.page}>
      <Nav
        theme="light"
        orgLabel="SBM"
        orgIcon={<BriefcaseIcon />}
        siteLabel={siteInfo.client}
        siteSubLabel={siteInfo.siteName}
        siteIcon={<PinIcon />}
        links={[
          { label: "Home", href: "/" },
          { label: "Quality", href: "/quality/scope-of-work" },
          { label: "People", href: "/roster" },
          { label: "Safety", href: "#safety" },
          { label: "Financials", href: "#financials" },
        ]}
        showOlivia={false}
        utilityItems={[
          { icon: <PlusCircleIcon />, label: "Quick entries" },
          { icon: <ClipboardIcon />, label: "Manager Queue", onClick: () => setManagerQueueOpen(true) },
          { icon: <EnvelopeIcon />, label: "Messages" },
          { icon: <BellIcon />, label: "Notifications", hasNotification: true },
        ]}
        avatarFallback="EH"
        avatarAlt="Emily Hoehenrieder"
        menuIcon={<MoreIcon />}
      />

      <main className={styles.main}>
        <header className={styles.headerBlock}>
          <div className={styles.headerTopRow}>
            <div className={styles.breadcrumb}>
              <Link href={listHref} className={styles.breadcrumbMuted}>
                Shift Reports /
              </Link>
              <span className={styles.breadcrumbCurrent}>Daily Report</span>
            </div>
            <div className={styles.datePicker}>
              <button type="button" className={styles.dateCaret} onClick={() => setViewDate((d) => addDays(d, -1))} aria-label="Previous day">
                <CaretLeftIcon />
              </button>
              <span className={styles.dateLabel}>{pickerDateFormatter.format(viewDate)}</span>
              <button type="button" className={styles.dateCaret} onClick={() => setViewDate((d) => addDays(d, 1))} aria-label="Next day">
                <CaretRightIcon />
              </button>
            </div>
          </div>
          <h1 className={styles.bigDate}>{dateFormatter.format(ANCHOR_DATE)}</h1>
        </header>

        <div className={styles.body}>
          <div className={styles.mainColumn}>
            {dayInProgress ? (
              // Nothing to sign off yet — at least one of today's shifts hasn't ended (Figma fileKey
              // 0UJDRcrFiXkn16yfc2MUEW, node 247:21796's "Reports Pending" card), so there's no note or
              // avatar row to show, just the same due-by copy every viewer sees.
              <div className={styles.dailySummaryCard}>
                <div className={styles.dailySummaryText}>
                  <p className={styles.reportsPendingTitle}>Reports Pending</p>
                  <p>Sign Off Due by 8:00am EST on {signOffDueLabel}.</p>
                </div>
              </div>
            ) : (
              <div className={styles.dailySummaryCard}>
                {/* Juan's own note only exists once he's actually signed off with one in the modal below
                    — before that, there's nothing here to show yet, just the sign-off action itself. */}
                {signOff && (
                  <div className={styles.dailySummaryText}>
                    {signOff.note.split("\n").map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                )}
                <div className={styles.signOffPersonRow}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={dailyReport.siteManager.avatar} alt="" className={styles.signOffAvatar} />
                  <div className={styles.signOffInfo}>
                    <div className={styles.signOffNameRow}>
                      <span className={styles.signOffName}>{dailyReport.siteManager.name}</span>
                      <span className={styles.signOffPosition}>{dailyReport.siteManager.position}</span>
                    </div>
                    {signOff && <span className={styles.signOffComplete}>Signed off at {signOff.timestamp}</span>}
                  </div>
                  {/* Only the Site Director can actually sign a day off — a Manager on Shift or Other
                      User viewing an unsigned day just sees the same card with no action on it. */}
                  {!signOff && viewerRole === "director" && (
                    <Button variant="primary" theme="light" className={styles.signOffButtonFit} onClick={() => setSignOffModalOpen(true)}>
                      Sign Off Day
                    </Button>
                  )}
                </div>
              </div>
            )}

            {SHIFT_ORDER.map((shiftKey) => (
              <ShiftRow
                key={shiftKey}
                shiftKey={shiftKey}
                report={shiftReportByKey[shiftKey]}
                tone={shiftTones[shiftKey]}
                href={`/manage-shift/end-of-shift-report?shift=${shiftKey}${asParam}`}
              />
            ))}
          </div>

          <aside className={styles.sidebar}>
            <div className={styles.summaryCard}>
              <h2 className={styles.summaryTitle}>Daily Summary</h2>
              <div className={styles.hairline} />

              <SidebarStat icon={<VectorSquareIcon />} value={`${dailyAreaCoverage.servicedPercent}%`} label="Areas Serviced">
                <p className={styles.sidebarStatCaption}>
                  {dailyAreaCoverage.servicedCount.toLocaleString()} of {dailyAreaCoverage.totalAreas.toLocaleString()} total areas serviced
                </p>
                <div className={styles.sidebarSubRow}>
                  <span>Not Serviced</span>
                  <span>{dailyAreaCoverage.notServicedCount}</span>
                </div>
                <div className={styles.sidebarSubRow}>
                  <span>Under Serviced</span>
                  <span>{dailyAreaCoverage.underServicedCount}</span>
                </div>
                <div className={styles.sidebarSubRow}>
                  <span>Full Serviced</span>
                  <span>{dailyAreaCoverage.fullyServicedCount}</span>
                </div>
                <div className={styles.sidebarSubRow}>
                  <span>Over Serviced</span>
                  <span>{dailyAreaCoverage.overServicedCount}</span>
                </div>
                <div className={styles.sidebarSubRow}>
                  <span>No Frequency</span>
                  <span>{dailyAreaCoverage.noFrequencyCount}</span>
                </div>
              </SidebarStat>

              <div className={styles.hairline} />
              <SidebarStat
                icon={<BroomWideIcon />}
                iconClassName={styles.sidebarStatIconPurple}
                value={`${realServicesPercent}%`}
                label="Service Coverage"
              >
                <p className={styles.sidebarStatCaption}>
                  {realServicesCompleted.toLocaleString()} of {realServicesExpected.toLocaleString()} services completed
                </p>
              </SidebarStat>

              <div className={styles.hairline} />
              <SidebarStat
                icon={<ClockIcon />}
                iconClassName={styles.sidebarStatIconYellow}
                value={formatMinutesToHoursLabel(capturedMinutes)}
                label="Hours Captured"
              >
                <p className={styles.sidebarStatCaption}>
                  {formatMinutesToHoursLabel(capturedMinutes)} of {formatMinutesToHoursLabel(paidMinutes)} shift time
                </p>
                <div className={styles.sidebarSubRow}>
                  <span>Managers on site</span>
                  <span>{totalManagers}</span>
                </div>
                <div className={styles.sidebarSubRow}>
                  <span>Associates on site</span>
                  <span>{totalAssociates}</span>
                </div>
              </SidebarStat>

              <div className={styles.hairline} />
              <div className={styles.sidebarStatBlock}>
                <div className={styles.sidebarStatHeaderRow}>
                  <span className={[styles.sidebarStatIcon, styles.sidebarStatIconGreen].join(" ")}>
                    <ClipboardCheckIcon />
                  </span>
                  {dailyQualityScores[0] && (
                    <div className={styles.sidebarStatValueRow}>
                      <span className={styles.sidebarStatValue}>{dailyQualityScores[0].value}</span>
                      <span className={styles.sidebarStatLabel}>Verification Score</span>
                    </div>
                  )}
                </div>
                <div className={styles.sidebarStatBody}>
                  <div className={styles.sidebarQualityRows}>
                    {dailyQualityScores.slice(1).map(
                      (score) =>
                        score && (
                          <div key={score.label} className={styles.sidebarStatValueRow}>
                            <span className={styles.sidebarStatValue}>{score.value}</span>
                            <span className={styles.sidebarStatLabel}>{score.label}</span>
                          </div>
                        )
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.hairline} />
              <SidebarStat
                icon={<UserHardHatIcon />}
                iconClassName={styles.sidebarStatIconOrange}
                value={totalSafetyIssues.toLocaleString()}
                label="Safety issues"
              />

              <div className={styles.hairline} />
              <SidebarStat
                icon={<TriangleExclamationIcon />}
                iconClassName={styles.sidebarStatIconPink}
                value={reportItsAccepted.toLocaleString()}
                label="Report Its Accepted"
              >
                <div className={styles.sidebarSubRow}>
                  <span>Submitted</span>
                  <span>{reportItsSubmitted}</span>
                </div>
                <div className={styles.sidebarSubRow}>
                  <span>Accepted</span>
                  <span>{reportItsAccepted}</span>
                </div>
                <div className={styles.sidebarSubRow}>
                  <span>Rejected</span>
                  <span>{reportItsSubmitted - reportItsAccepted}</span>
                </div>
                <div className={styles.sidebarSubRow}>
                  <span>Acceptance Rate</span>
                  <span>{reportItsAcceptanceRate}%</span>
                </div>
              </SidebarStat>
            </div>
          </aside>
        </div>
      </main>

      <ManagerQueuePanel open={managerQueueOpen} onClose={() => setManagerQueueOpen(false)} theme="light" />

      <Modal open={signOffModalOpen} onClose={() => setSignOffModalOpen(false)} title="Sign off today's reports?" theme="light">
        <label className={styles.signOffNoteLabel} htmlFor="daily-report-sign-off-note">
          Note (required)
        </label>
        <textarea
          id="daily-report-sign-off-note"
          className={styles.signOffNoteInput}
          value={signOffNoteDraft}
          onChange={(e) => setSignOffNoteDraft(e.target.value)}
          placeholder="Add a note about today's shifts..."
          rows={4}
          required
        />
        <div className={styles.confirmActions}>
          <Button variant="primary" theme="light" onClick={confirmSignOff} disabled={!trimmedSignOffNote}>
            Sign Off Day
          </Button>
          <Button variant="secondary" theme="light" onClick={() => setSignOffModalOpen(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/* ---------------- Shift row ---------------- */

/**
 * ShiftRow — a shift's own row on the Daily Report (Figma fileKey 0UJDRcrFiXkn16yfc2MUEW, node
 * 265:34511's collapsed shift accordion). No longer an inline accordion: clicking one navigates to
 * that shift's own full page (End of Shift Report, `?shift=X`) instead of expanding in place — the
 * "left and right info changes" drill-down the shift's own page (managers, notes, hours, area/service
 * coverage, quality on the left; a matching side panel on the right) already provides, rather than
 * duplicating all of that content again here. `tone` (see ShiftRowTone) picks which of the four states
 * (Figma node 247:21796 in-progress/not-started, 265:32034 overdue) this row renders as; only
 * "completed" shows the three metric stats, since that's the only tone with a real finished report
 * behind it in this prototype's data (allShiftReports/mapPageData).
 */
function ShiftRow({ shiftKey, report, tone, href }: { shiftKey: ShiftKey; report: ShiftReport; tone: ShiftRowTone; href: string }) {
  const label = SHIFT_LABELS[shiftKey];
  const reportedNote = report.notes[0];
  const reportedByName = report.managers[0]?.name ?? reportedNote?.author.name;
  const managersOnShift = INITIAL_SHIFT_REPORTS[shiftKey].managers.length;

  const metaLabel =
    tone === "completed"
      ? reportedNote && `Reported at ${reportedNote.timestamp} by ${reportedByName}`
      : tone === "inProgress"
        ? `${managersOnShift} manager${managersOnShift === 1 ? "" : "s"} checked in`
        : tone === "overdue"
          ? `${label} Report Overdue`
          : "Shift Not Started";

  return (
    <Link href={href} className={styles.shiftCard} data-tone={tone}>
      <div className={styles.shiftCardHeader}>
        <div className={styles.shiftCardHeaderText}>
          <span className={styles.shiftCardTitle} data-tone={tone}>
            {label} Shift{tone === "inProgress" ? " in Progress" : ""}
          </span>
          {metaLabel && <span className={styles.shiftCardMeta}>{metaLabel}</span>}
        </div>

        {tone === "completed" && (
          <div className={styles.shiftCardStatsExpanded}>
            <ShiftHeaderStat icon={<VectorSquareIcon />} title={`${report.areaCoverage.servicedPercent}% Areas Serviced`}>
              {report.areaCoverage.servicedCount.toLocaleString()} of {report.areaCoverage.totalAreas.toLocaleString()}
            </ShiftHeaderStat>
            <ShiftHeaderStat icon={<BroomWideIcon />} iconClassName={styles.shiftHeaderStatIconPurple} title={`${report.servicesPercent}% Services Completed`}>
              {report.servicesCompletedCount.toLocaleString()} of {report.servicesExpectedCount.toLocaleString()}
            </ShiftHeaderStat>
            <ShiftHeaderStat icon={<ClockIcon />} iconClassName={styles.shiftHeaderStatIconYellow} title={`${report.hoursPercent}% Hours Captured`}>
              {report.hoursCapturedLabel} of {report.hoursPaidLabel}
            </ShiftHeaderStat>
          </div>
        )}

        <ArrowRightIcon className={styles.shiftCardArrow} />
      </div>
    </Link>
  );
}

/* ---------------- Shared small pieces ---------------- */

function ShiftHeaderStat({
  icon,
  iconClassName,
  title,
  children,
}: {
  icon: ReactNode;
  iconClassName?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.shiftHeaderStatItem}>
      <span className={[styles.shiftHeaderStatIcon, iconClassName].filter(Boolean).join(" ")}>{icon}</span>
      <div className={styles.shiftHeaderStatText}>
        <span className={styles.shiftHeaderStatTitle}>{title}</span>
        <span className={styles.shiftHeaderStatSubtitle}>{children}</span>
      </div>
    </div>
  );
}

function SidebarStat({
  icon,
  iconClassName,
  value,
  label,
  children,
}: {
  icon: ReactNode;
  iconClassName?: string;
  value: string;
  label: string;
  children?: ReactNode;
}) {
  return (
    <div className={styles.sidebarStatBlock}>
      <div className={styles.sidebarStatHeaderRow}>
        <span className={[styles.sidebarStatIcon, iconClassName].filter(Boolean).join(" ")}>{icon}</span>
        <div className={styles.sidebarStatValueRow}>
          <span className={styles.sidebarStatValue}>{value}</span>
          <span className={styles.sidebarStatLabel}>{label}</span>
        </div>
      </div>
      {children && <div className={styles.sidebarStatBody}>{children}</div>}
    </div>
  );
}

