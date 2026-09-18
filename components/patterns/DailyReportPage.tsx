"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Nav } from "./Nav";
import { ManagerQueuePanel } from "./ManagerQueuePanel";
import {
  BellIcon,
  BriefcaseIcon,
  BroomWideIcon,
  ChevronDownIcon,
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
import { DonutRing, SegmentedDonutRing } from "../ui/Charts";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { AssociateAttendanceModal } from "./AssociateAttendanceModal";
import { ReportItsModal } from "./ReportItsModal";
import { formatMinutesToHoursLabel, parseHoursLabelToMinutes } from "./FullShiftReportModal";
import { buildDailyReport, type QualityScore } from "../../lib/mapPageData";
import { buildShiftReport, type ManagerNote, type ShiftReport } from "../../lib/mapShiftReportData";
import { computeDailyAreaCoverageBreakdown, type AreaCoverageBreakdown } from "../../lib/mapAreaServiceData";
import { formatSignOffNowLabel } from "../../lib/shiftReportListData";
import type { ContractBuilding } from "../../lib/sowContract";
import { ANCHOR_DATE } from "../../lib/sowData";
import { siteInfo } from "../../lib/homeDashboardData";
import styles from "./DailyReportPage.module.css";

const dateFormatter = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" });

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
  const [expandedShiftKeys, setExpandedShiftKeys] = useState<Set<ShiftReport["shiftKey"]>>(() => new Set());

  const dailyReport = buildDailyReport(0, contractBuildings);
  const allShiftReports = dailyReport.shifts.map((shift) => buildShiftReport(shift, 0, contractBuildings));
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
          <div className={styles.breadcrumb}>
            <Link href="/manage-shift/end-of-shift-reports" className={styles.breadcrumbMuted}>
              Shift Reports /
            </Link>
            <span className={styles.breadcrumbCurrent}>Daily Report</span>
          </div>
          <h1 className={styles.bigDate}>{dateFormatter.format(ANCHOR_DATE)}</h1>
        </header>

        <div className={styles.body}>
          <div className={styles.mainColumn}>
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
                {!signOff && (
                  <Button variant="primary" theme="light" className={styles.signOffButtonFit} onClick={() => setSignOffModalOpen(true)}>
                    Sign Off Day
                  </Button>
                )}
              </div>
            </div>

            {allShiftReports.map((report) => (
              <ShiftCard
                key={report.shiftKey}
                report={report}
                expanded={expandedShiftKeys.has(report.shiftKey)}
                onToggle={() =>
                  setExpandedShiftKeys((current) => {
                    const next = new Set(current);
                    if (next.has(report.shiftKey)) next.delete(report.shiftKey);
                    else next.add(report.shiftKey);
                    return next;
                  })
                }
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

/* ---------------- Shift card ---------------- */

function ShiftCard({ report, expanded, onToggle }: { report: ShiftReport; expanded: boolean; onToggle: () => void }) {
  const reportedNote = report.notes[0];
  const reportedByName = report.managers[0]?.name ?? reportedNote?.author.name;
  const shiftQualityScores = QUALITY_DISPLAY_LABELS.map((label) => report.qualityScores.find((q) => q.label === label)).filter(
    (s): s is NonNullable<typeof s> => Boolean(s)
  );
  const cardRef = useRef<HTMLDivElement>(null);
  const [headcountModalOpen, setHeadcountModalOpen] = useState(false);
  const [reportItsModalOpen, setReportItsModalOpen] = useState(false);

  useEffect(() => {
    if (expanded) cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [expanded]);

  return (
    <div className={styles.shiftCard} ref={cardRef}>
      <button type="button" className={styles.shiftCardHeader} onClick={onToggle} aria-expanded={expanded}>
        <div className={styles.shiftCardHeaderText}>
          <span className={[styles.shiftCardTitle, expanded ? "" : styles.shiftCardTitleCollapsed].filter(Boolean).join(" ")}>
            {report.label} Shift
          </span>
          {reportedNote && (
            <span className={styles.shiftCardMeta}>
              Reported at {reportedNote.timestamp} by {reportedByName}
            </span>
          )}
        </div>

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

        <ChevronDownIcon className={[styles.shiftCardCaret, expanded ? styles.shiftCardCaretOpen : ""].filter(Boolean).join(" ")} />
      </button>

      <div
        className={[styles.shiftCardBodyWrap, expanded ? styles.shiftCardBodyWrapOpen : ""].filter(Boolean).join(" ")}
        aria-hidden={!expanded}
        inert={!expanded}
      >
        <div className={styles.shiftCardBody}>
          <div className={styles.shiftCardBodyContent}>
            <Section title="Shift Managers">
              <div className={styles.managerList}>
                {report.managers.map((manager, index) => {
                  const clock = report.managerClockTimes[manager.name];
                  return (
                    <div key={manager.name} className={styles.managerRow}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={manager.avatar} alt="" className={styles.managerAvatar} />
                      <div className={styles.managerInfo}>
                        <span className={styles.managerName}>{manager.name}</span>
                        <span className={styles.managerPosition}>{manager.position}</span>
                        {index === 0 && reportedNote && (
                          <span className={styles.managerCheckedOut}>Reported at {reportedNote.timestamp}</span>
                        )}
                      </div>
                      <div className={styles.managerDivider} />
                      <ManagerTimeStat value={clock?.clockIn ?? "—"} label="Clocked In" />
                      <ManagerTimeStat value={clock?.clockOut ?? "—"} label="Clocked Out" />
                      <ManagerTimeStat value={clock?.totalTimeLabel ?? "—"} label="Total Time" />
                    </div>
                  );
                })}
              </div>
            </Section>

            <Section title="Shift Notes">
              <div className={styles.noteV2List}>
                {report.notes.map((note, i) => (
                  <NoteCalloutV2Item key={`${note.author.name}-${i}`} note={note} />
                ))}
              </div>
            </Section>

            <Section title="Hours and Headcount">
              <div className={styles.sectionRows}>
                <LeadStatV2
                  ringColor="var(--color-datavis-yellow-700)"
                  percent={report.hoursPercent}
                  amount={report.hoursCapturedLabel}
                  label="Hours Captured"
                  caption={`of ${report.hoursPaidLabel} shift time`}
                />
                <button
                  type="button"
                  className={[styles.headcountGrid, styles.headcountCard].join(" ")}
                  onClick={() => setHeadcountModalOpen(true)}
                >
                  <HeadcountStat label="Scheduled Headcount" value={report.scheduledHeadcount} />
                  <HeadcountStat label="Actual Arrival" value={report.actualArrival} />
                  <HeadcountStat label="Total Absences" value={report.totalAbsences} />
                  <div className={styles.headcountSubGroup}>
                    <HeadcountInlineStat label="No Call/No Show" value={report.noCallNoShowCount} />
                    <HeadcountInlineStat label="Call Outs" value={report.callOutsCount} />
                  </div>
                </button>
              </div>
              <div className={styles.noteV2List}>
                {report.hoursNote.map((note, i) => (
                  <NoteCalloutV2Item key={`${note.author.name}-${i}`} note={note} />
                ))}
              </div>
            </Section>

            <Section title="Area Coverage">
              <div className={styles.areaCoverageStack}>
                <AreaCoverageStat coverage={report.areaCoverage} />
                <AreaCoverageBreakdownRow coverage={report.areaCoverage} />
              </div>
              <div className={styles.noteV2List}>
                {report.areaCoverageNote.map((note, i) => (
                  <NoteCalloutV2Item key={`${note.author.name}-${i}`} note={note} />
                ))}
              </div>
            </Section>

            <Section title="Service Coverage">
              <LeadStatV2
                ringColor="var(--color-datavis-purple-500)"
                percent={report.servicesPercent}
                amount={report.servicesCompletedCount.toLocaleString()}
                label="Services Completed"
                caption={`of ${report.servicesExpectedCount.toLocaleString()} expected`}
              />
              <div className={styles.noteV2List}>
                {report.servicesNote.map((note, i) => (
                  <NoteCalloutV2Item key={`${note.author.name}-${i}`} note={note} />
                ))}
              </div>
            </Section>

            <Section title="Quality">
              <div className={styles.scoreChipRow}>
                {shiftQualityScores.map((score) => (
                  <div key={score.label} className={styles.scoreCard}>
                    <span className={styles.scoreBadge} data-tone={score.tone}>
                      {score.value}
                    </span>
                    <div className={styles.scoreCardTextGroup}>
                      <span className={styles.scoreCardLabel}>{score.label}</span>
                      <span className={styles.scoreCardCaption}>{score.count}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.qualitySubsectionRow}>
                <button
                  type="button"
                  className={[styles.qualitySubsection, styles.qualitySubsectionButton].join(" ")}
                  onClick={() => setReportItsModalOpen(true)}
                >
                  <h4 className={styles.qualitySubsectionTitle}>Report Its</h4>
                  <div className={styles.qualityStatRow}>
                    <HeadcountStat label="Submitted" value={report.totalReportIts} />
                    <HeadcountStat label="Rejected" value={report.reportItsRejected} />
                    <HeadcountStat label="Acceptance Rate" value={`${report.reportItsAcceptanceRate}%`} />
                  </div>
                </button>

                <div className={styles.verticalDivider} />

                <div className={styles.qualitySubsection}>
                  <h4 className={styles.qualitySubsectionTitle}>Safety</h4>
                  {report.safetyIssues.length === 0 ? (
                    <span className={styles.safetyEmptyState}>There are no safety issues for this shift</span>
                  ) : (
                    <div className={styles.qualityStatRow}>
                      <HeadcountStat label="Incidents" value={report.safetyIssues.length} />
                      <div className={styles.headcountStat}>
                        <span className={styles.headcountLabel}>Incident Status</span>
                        <span className={styles.safetyReportStatusBadge}>
                          <CircleCheckIcon className={styles.safetyReportStatusIcon} /> Incident Report Created
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.noteV2List}>
                {report.scoresNote.map((note, i) => (
                  <NoteCalloutV2Item key={`${note.author.name}-${i}`} note={note} />
                ))}
              </div>
            </Section>
          </div>
        </div>
      </div>

      <AssociateAttendanceModal
        open={headcountModalOpen}
        onClose={() => setHeadcountModalOpen(false)}
        shiftLabel={report.label}
        associates={report.associateAttendance}
      />

      <ReportItsModal open={reportItsModalOpen} onClose={() => setReportItsModalOpen(false)} shiftLabel={report.label} report={report} />
    </div>
  );
}

/* ---------------- Shared small pieces ---------------- */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      <div className={styles.sectionBody}>{children}</div>
    </div>
  );
}

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

function LeadStatV2({
  percent,
  amount,
  label,
  caption,
  ringColor,
}: {
  percent: number;
  amount: string;
  label: string;
  caption: string;
  ringColor: string;
}) {
  return (
    <div className={styles.leadStatRow}>
      <div className={styles.leadStatRing}>
        <DonutRing percent={percent} color={ringColor} trackColor="var(--color-neutral-300)" size={68} strokeWidth={6} />
        <span className={styles.leadStatRingLabel}>{percent}%</span>
      </div>
      <div className={styles.leadStatTextStack}>
        <span className={styles.leadStatValueLabel}>{label}</span>
        <div className={styles.leadStatValueRow}>
          <span className={styles.leadStatStackValue}>{amount}</span>
          <span className={styles.leadStatCaption}>{caption}</span>
        </div>
      </div>
    </div>
  );
}

function AreaCoverageStat({ coverage }: { coverage: AreaCoverageBreakdown }) {
  return (
    <div className={styles.leadStatRow}>
      <div className={styles.leadStatRing}>
        <SegmentedDonutRing
          size={68}
          strokeWidth={6}
          segments={[
            { value: coverage.notServicedCount, color: "var(--color-danger-300)" },
            { value: coverage.underServicedCount, color: "var(--color-warning-300)" },
            { value: coverage.fullyServicedCount, color: "var(--color-success-300)" },
            { value: coverage.overServicedCount, color: "var(--color-success-700)" },
            { value: coverage.noFrequencyCount, color: "var(--color-neutral-500)" },
          ]}
        />
        <span className={styles.leadStatRingLabel}>{coverage.servicedPercent}%</span>
      </div>
      <div className={styles.leadStatTextStack}>
        <span className={styles.leadStatValueLabel}>Areas Serviced</span>
        <div className={styles.leadStatValueRow}>
          <span className={styles.leadStatStackValue}>{coverage.servicedCount.toLocaleString()}</span>
          <span className={styles.leadStatCaption}>of {coverage.totalAreas.toLocaleString()} total areas</span>
        </div>
      </div>
    </div>
  );
}

const COVERAGE_BREAKDOWN_ITEMS: { key: keyof AreaCoverageBreakdown; label: string; color: string }[] = [
  { key: "notServicedCount", label: "Not Serviced", color: "var(--color-danger-300)" },
  { key: "underServicedCount", label: "Under-Serviced", color: "var(--color-warning-300)" },
  { key: "fullyServicedCount", label: "Fully Serviced", color: "var(--color-success-300)" },
  { key: "overServicedCount", label: "Over-Serviced", color: "var(--color-success-700)" },
  { key: "noFrequencyCount", label: "No Frequency", color: "var(--color-neutral-500)" },
];

function AreaCoverageBreakdownRow({ coverage }: { coverage: AreaCoverageBreakdown }) {
  return (
    <div className={styles.coverageBreakdownRow}>
      {COVERAGE_BREAKDOWN_ITEMS.map((item) => {
        const count = coverage[item.key] as number;
        const percent = coverage.totalAreas > 0 ? Math.round((count / coverage.totalAreas) * 100) : 0;
        return (
          <div key={item.label} className={styles.coverageBreakdownItem}>
            <div className={styles.coverageBreakdownLabelRow}>
              <span className={styles.coverageBreakdownDot} style={{ backgroundColor: item.color }} />
              <span className={styles.coverageBreakdownLabel}>{item.label}</span>
            </div>
            <div className={styles.coverageBreakdownValueRow}>
              <span className={styles.coverageBreakdownValue}>{count.toLocaleString()} areas</span>
              <span className={styles.coverageBreakdownPercent}>({percent}%)</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HeadcountStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className={styles.headcountStat}>
      <span className={styles.headcountLabel}>{label}</span>
      <span className={styles.headcountValue}>{typeof value === "number" ? value.toLocaleString() : value}</span>
    </div>
  );
}

function HeadcountInlineStat({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.headcountInlineStat}>
      <span className={styles.headcountInlineLabel}>{label}</span>
      <span className={styles.headcountInlineValue}>{value.toLocaleString()}</span>
    </div>
  );
}

function ManagerTimeStat({ value, label }: { value: string; label: string }) {
  return (
    <div className={styles.managerTimeStat}>
      <span className={styles.managerTimeValue}>{value}</span>
      <span className={styles.managerTimeLabel}>{label}</span>
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

function tagSlug(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function NoteCalloutV2Item({ note }: { note: ManagerNote }) {
  return (
    <div className={styles.noteV2}>
      <p className={styles.noteV2Text}>
        {note.text.split("\n").map((line, i) => (
          <span key={i}>
            {line}
            <br />
          </span>
        ))}
      </p>
      {note.tags.length > 0 && (
        <div className={styles.noteV2TagRow}>
          {note.tags.map((tag) => (
            <span key={tag} className={styles.noteV2Tag} data-tag={tagSlug(tag)}>
              {tag}
            </span>
          ))}
        </div>
      )}
      <div className={styles.noteV2Footer}>
        {note.author.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={note.author.avatar} alt="" className={styles.noteV2Avatar} />
        ) : (
          <span className={styles.noteV2Avatar} aria-hidden="true" />
        )}
        <span className={styles.noteV2Author}>{note.author.name}</span>
        <span className={styles.noteV2Time}>{note.timestamp}</span>
      </div>
    </div>
  );
}
