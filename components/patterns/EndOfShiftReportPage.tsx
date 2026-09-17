"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Nav } from "./Nav";
import { ManagerQueuePanel } from "./ManagerQueuePanel";
import { ShiftReportSectionCard, type ShiftReportSectionNotesConfig } from "./ShiftReportSectionCard";
import { ShiftInProgressPanel } from "./ShiftInProgressPanel";
import { Button } from "../ui/Button";
import { ButtonGroup } from "../ui/ButtonGroup";
import { Modal } from "../ui/Modal";
import { DonutRing, SegmentedDonutRing } from "../ui/Charts";
import {
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
  NoteStickyIcon,
  PinIcon,
  PlusCircleIcon,
  VectorSquareIcon,
} from "./icons";
import { siteInfo } from "../../lib/homeDashboardData";
import {
  INITIAL_SHIFT_REPORTS,
  SECTION_TITLES,
  SHIFT_DURATION_SECONDS,
  SHIFT_LABELS,
  SHIFT_OPTIONS,
  allSectionsHaveNotes,
  formatHMS,
  getElapsedSeconds,
  getFullDateLabel,
  getManager,
  getResponsibleManager,
  getSectionNoteCount,
  getShiftLiveStatus,
  nextNoteId,
  type SectionKey,
  type ShiftKey,
  type ShiftManager,
  type ShiftReportState,
} from "../../lib/managerShiftReportData";
import styles from "./EndOfShiftReportPage.module.css";

function formatNowTimestamp() {
  return `${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} EDT`;
}

/** The Side Panel's own at-a-glance checklist (Figma fileKey 0UJDRcrFiXkn16yfc2MUEW, node 203:40371) — every note-taking section except Shift Notes, same icon/color pairing as ManagerAppShiftReportList's own SECTION_ICON so a section reads the same hue everywhere it appears. `iconBackground` is that same hue's own 15%-wash token (node 216:43750's left-column icon bubbles) — the Side Panel's own rows stay plain icon glyphs with no bubble. */
const SIDE_PANEL_SECTIONS: { key: SectionKey; icon: ReactNode; iconColor: string; iconBackground: string }[] = [
  { key: "shiftNotes", icon: <NoteStickyIcon />, iconColor: "var(--color-datavis-pinkle-500)", iconBackground: "var(--wash-pinkle-light-15)" },
  { key: "hoursHeadcount", icon: <ClockIcon />, iconColor: "var(--color-warning-500)", iconBackground: "var(--wash-warning-solid-15)" },
  { key: "areaCoverage", icon: <VectorSquareIcon />, iconColor: "var(--color-text-lt-blue)", iconBackground: "var(--wash-primary-blue-15)" },
  { key: "serviceCoverage", icon: <BroomWideIcon />, iconColor: "var(--color-datavis-purple-500)", iconBackground: "var(--wash-purple-15)" },
  { key: "quality", icon: <ClipboardCheckIcon />, iconColor: "var(--color-success-700)", iconBackground: "var(--wash-success-15)" },
];

/** Keyed lookup of the above, so each left-column card can show the same icon/color as its Side Panel row. */
const SECTION_ICON_MAP: Record<SectionKey, { icon: ReactNode; iconColor: string; iconBackground: string }> = Object.fromEntries(
  SIDE_PANEL_SECTIONS.map(({ key, icon, iconColor, iconBackground }) => [key, { icon, iconColor, iconBackground }])
) as Record<SectionKey, { icon: ReactNode; iconColor: string; iconBackground: string }>;

/**
 * EndOfShiftReportPage — the desktop "Manage Shift / End of Shift
 * Report" page (Figma fileKey 0UJDRcrFiXkn16yfc2MUEW, node
 * 174:34927 "Details" — the shift-in-progress state), reached from
 * the Manager Queue's own link. Same shift-report record and
 * section vocabulary as the Manager App mobile flow
 * (lib/managerShiftReportData.ts), rebuilt as a two-column desktop
 * page: a scrolling left column of collapsible section cards
 * (ShiftReportSectionCard, open by default, each with its own
 * inline note composer replacing the mobile flow's full-screen
 * modal) and a sticky right sidebar (ShiftInProgressPanel) with a
 * live ticking shift timer, a progress ring, and its own copy of
 * the Complete Shift Report action.
 *
 * Unlike the mobile flow, this page has no check-in step — managers
 * can't clock in from the web, so every manager on shift.managers is
 * always shown already checked in (live "Time on Shift" elapsed, an
 * unset "--:--" Clocked Out) rather than gated behind a clock-in
 * sheet or branching on a real clock-out time.
 *
 * This page's ShiftReportState is its own independent in-memory
 * copy, not shared with ManagerAppHome's — consistent with this
 * whole feature's existing convention of keeping parallel
 * prototypes visibly-similar but not literally wired together
 * without a real backend.
 */
export function EndOfShiftReportPage() {
  const [managerQueueOpen, setManagerQueueOpen] = useState(false);
  // One independent ShiftReportState per shift (INITIAL_SHIFT_REPORTS) — the
  // Day/Swing/Graveyard toggle below just switches which slice `shift` reads
  // from; notes/completion made on one shift never touch the others'.
  const [reports, setReports] = useState<Record<ShiftKey, ShiftReportState>>(INITIAL_SHIFT_REPORTS);
  const [activeShiftKey, setActiveShiftKey] = useState<ShiftKey>("day");
  const shift = reports[activeShiftKey];
  // The roster's own lead/Responsible Manager doubles as "the signed-in
  // manager" for whichever shift is active — there's no real auth in this
  // prototype, and each shift's own first manager is who notes get
  // attributed to and who can complete that shift's report (matches
  // CURRENT_MANAGER_ID's role for Day specifically, generalized to Swing/
  // Graveyard's own lead managers too).
  const leadManager = shift.managers[0];
  const currentManagerId = leadManager.id;

  function updateShift(updater: (prev: ShiftReportState) => ShiftReportState) {
    setReports((prev) => ({ ...prev, [activeShiftKey]: updater(prev[activeShiftKey]) }));
  }

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    managers: true,
    shiftNotes: true,
    hoursHeadcount: true,
    areaCoverage: true,
    serviceCoverage: true,
    quality: true,
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Set by the Side Panel's own rows (handleSelectSection) — the id of the
  // left-column card to scroll to once it's guaranteed to be expanded and
  // laid out. Cleared right after the scroll fires.
  const [pendingScrollKey, setPendingScrollKey] = useState<string | null>(null);
  // Starts null (not `new Date()`) so the server-rendered markup and the
  // client's first render agree exactly — computing "now" during SSR would
  // bake in the render timestamp, which never matches the moment the client
  // hydrates and causes a text-content mismatch. The effect below fills in
  // the real, ticking value immediately after mount, client-side only.
  const [now, setNow] = useState<Date | null>(null);

  // Drives every live elapsed-time display on the page (the Side Panel's
  // big timer + progress ring, and each Shift Managers row's own "Time on
  // Shift") off one shared clock tick, rather than a separate interval per row.
  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  function toggleSection(key: string) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // Expands the target section (a no-op if it's already open) and queues the
  // scroll; the effect below fires once that state change has actually been
  // committed to the DOM, so the card is at its full expanded height before
  // scrollIntoView measures where "the top of it" is.
  function handleSelectSection(key: string) {
    setOpenSections((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
    setPendingScrollKey(key);
  }

  useEffect(() => {
    if (!pendingScrollKey) return;
    document.getElementById(`section-${pendingScrollKey}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setPendingScrollKey(null);
  }, [pendingScrollKey, openSections]);

  function handleAddNote(sectionKey: SectionKey, text: string, tags: string[]) {
    updateShift((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionKey]: {
          ...prev.sections[sectionKey],
          notes: [...prev.sections[sectionKey].notes, { id: nextNoteId(), managerId: currentManagerId, timestamp: formatNowTimestamp(), text, tags }],
        },
      },
    }));
  }

  function handleEditNote(sectionKey: SectionKey, noteId: string, text: string, tags: string[]) {
    updateShift((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionKey]: {
          ...prev.sections[sectionKey],
          notes: prev.sections[sectionKey].notes.map((note) => (note.id === noteId ? { ...note, text, tags } : note)),
        },
      },
    }));
  }

  function handleDeleteNote(sectionKey: SectionKey, noteId: string) {
    updateShift((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionKey]: {
          ...prev.sections[sectionKey],
          notes: prev.sections[sectionKey].notes.filter((note) => note.id !== noteId),
        },
      },
    }));
  }

  function handleConfirmComplete() {
    updateShift((prev) => ({ ...prev, completedBy: currentManagerId, completedAt: formatNowTimestamp() }));
    setConfirmOpen(false);
  }

  const isLocked = Boolean(shift.completedBy);
  const responsibleManager = getResponsibleManager(shift);
  const isCurrentResponsible = responsibleManager?.id === currentManagerId;
  const shiftElapsedSeconds = now ? getElapsedSeconds(leadManager.clockIn, now) : 0;
  const hasEnded = shiftElapsedSeconds >= SHIFT_DURATION_SECONDS;
  const progressPercent = Math.min(100, (shiftElapsedSeconds / SHIFT_DURATION_SECONDS) * 100);
  // Against Day 6:00AM-2:30PM / Swing 2:00PM-10:00PM / Graveyard 10:00PM-6:00AM (SHIFT_SCHEDULE), independent of
  // any manager's own clock-in — drives the Side Panel's "Shift Not Started" (grey timer) display below.
  const liveStatus = now ? getShiftLiveStatus(activeShiftKey, now) : "inProgress";
  const shiftTimeRange = SHIFT_OPTIONS.find((option) => option.key === activeShiftKey)?.timeRange ?? "";
  const readyToComplete = allSectionsHaveNotes(shift);
  // Not gated on `isLocked` — Day loads pre-completed for display (title, no
  // counter), but a manager can still add notes and complete the report
  // again from here, same as an in-progress shift.
  const canComplete = readyToComplete && hasEnded && isCurrentResponsible;

  const quality = shift.sections.quality;
  const qualityAverageScore = ((quality.aiVerification.score + quality.internalAudit.score + quality.customerAudit.score) / 3).toFixed(2);
  const qualityAccepted = quality.reportIts.submitted - quality.reportIts.rejected;
  const safetyIssuesCaption =
    quality.safety.incidents === 0 ? "no safety issues" : `${quality.safety.incidents} safety issue${quality.safety.incidents === 1 ? "" : "s"}`;
  const qualityHeaderCaption = `${qualityAverageScore} average score | ${qualityAccepted} report its accepted | ${safetyIssuesCaption}`;

  function notesConfigFor(sectionKey: SectionKey): ShiftReportSectionNotesConfig {
    const section = shift.sections[sectionKey];
    return {
      items: section.notes,
      tagVocabulary: section.tagVocabulary,
      // Never actually locked — a completed shift still shows its own
      // "Completed" state (title, badge), but a manager can keep adding and
      // managing notes and re-complete the report from here regardless.
      isLocked: false,
      currentManagerId,
      getAuthor: (managerId) => {
        const manager = getManager(shift, managerId);
        return manager ? { name: manager.name, avatar: manager.avatar } : undefined;
      },
      onAdd: (text, tags) => handleAddNote(sectionKey, text, tags),
      onEdit: (noteId, text, tags) => handleEditNote(sectionKey, noteId, text, tags),
      onDelete: (noteId) => handleDeleteNote(sectionKey, noteId),
    };
  }

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
        <div className={styles.header}>
          <div className={styles.breadcrumb}>
            <span className={styles.breadcrumbMuted}>Manage Shift /</span>
            <span className={styles.breadcrumbCurrent}>End of Shift Report</span>
          </div>
          <div className={styles.datePicker}>
            <button type="button" className={styles.dateCaret} disabled aria-label="Previous day">
              <CaretLeftIcon />
            </button>
            <span className={styles.dateLabel}>{getFullDateLabel()}</span>
            <button type="button" className={styles.dateCaret} disabled aria-label="Next day">
              <CaretRightIcon />
            </button>
          </div>
        </div>

        <div className={styles.rollup}>
          <div className={styles.rollupTitleGroup}>
            <h1 className={styles.rollupTitle}>{SHIFT_LABELS[shift.shiftKey]} Shift</h1>

            {isLocked && (
              <div className={styles.completedBadge}>
                <CircleCheckIcon className={styles.completedBadgeIcon} />
                <div className={styles.completedBadgeText}>
                  <span className={styles.completedBadgeTitle}>Report Completed</span>
                  <span className={styles.completedBadgeCaption}>
                    By {getManager(shift, shift.completedBy!)?.name ?? "a manager"} at {shift.completedAt}
                  </span>
                </div>
              </div>
            )}
          </div>

          <ButtonGroup
            options={SHIFT_OPTIONS.map((option) => ({ id: option.key, label: option.label }))}
            value={activeShiftKey}
            onChange={setActiveShiftKey}
            theme="light"
            variant="segmented"
            trackColor="var(--color-neutral-200)"
            trackElevated
            thumbColor="var(--color-neutral-100)"
            thumbElevated
            activeTextColor="var(--color-text-lt-blue)"
            aria-label="Shift"
          />
        </div>

        <div className={styles.columns}>
          <div className={styles.leftColumn}>
            <ShiftReportSectionCard
              id="section-managers"
              title="Shift Managers"
              subtitle={`${shift.managers.length} Managers on Shift`}
              open={openSections.managers}
              onToggle={() => toggleSection("managers")}
            >
              <div className={styles.managersTable}>
                {shift.managers.map((manager) => (
                  <ManagerRow key={manager.id} manager={manager} now={now} />
                ))}
              </div>
            </ShiftReportSectionCard>

            <ShiftReportSectionCard
              id="section-shiftNotes"
              title={SECTION_TITLES.shiftNotes}
              icon={SECTION_ICON_MAP.shiftNotes.icon}
              iconColor={SECTION_ICON_MAP.shiftNotes.iconColor}
              iconBackground={SECTION_ICON_MAP.shiftNotes.iconBackground}
              open={openSections.shiftNotes}
              onToggle={() => toggleSection("shiftNotes")}
              notes={notesConfigFor("shiftNotes")}
            />

            <ShiftReportSectionCard
              id="section-hoursHeadcount"
              title={SECTION_TITLES.hoursHeadcount}
              headerCaption={`${shift.sections.hoursHeadcount.percentCaptured}% Hours Captured | ${shift.sections.hoursHeadcount.actualArrival} Associates Arrived`}
              icon={SECTION_ICON_MAP.hoursHeadcount.icon}
              iconColor={SECTION_ICON_MAP.hoursHeadcount.iconColor}
              iconBackground={SECTION_ICON_MAP.hoursHeadcount.iconBackground}
              open={openSections.hoursHeadcount}
              onToggle={() => toggleSection("hoursHeadcount")}
              notes={notesConfigFor("hoursHeadcount")}
            >
              <HoursHeadcountData shift={shift} />
            </ShiftReportSectionCard>

            <ShiftReportSectionCard
              id="section-areaCoverage"
              title={SECTION_TITLES.areaCoverage}
              headerCaption={`${shift.sections.areaCoverage.percentServiced}% Area Coverage - ${shift.sections.areaCoverage.areasServiced.toLocaleString()} of ${shift.sections.areaCoverage.areasTotal.toLocaleString()} total areas`}
              icon={SECTION_ICON_MAP.areaCoverage.icon}
              iconColor={SECTION_ICON_MAP.areaCoverage.iconColor}
              iconBackground={SECTION_ICON_MAP.areaCoverage.iconBackground}
              open={openSections.areaCoverage}
              onToggle={() => toggleSection("areaCoverage")}
              notes={notesConfigFor("areaCoverage")}
            >
              <AreaCoverageData shift={shift} />
            </ShiftReportSectionCard>

            <ShiftReportSectionCard
              id="section-serviceCoverage"
              title={SECTION_TITLES.serviceCoverage}
              headerCaption={`${shift.sections.serviceCoverage.percentCompleted}% Service Coverage - ${shift.sections.serviceCoverage.servicesCompleted.toLocaleString()} of ${shift.sections.serviceCoverage.servicesExpected.toLocaleString()} expected services`}
              icon={SECTION_ICON_MAP.serviceCoverage.icon}
              iconColor={SECTION_ICON_MAP.serviceCoverage.iconColor}
              iconBackground={SECTION_ICON_MAP.serviceCoverage.iconBackground}
              open={openSections.serviceCoverage}
              onToggle={() => toggleSection("serviceCoverage")}
              notes={notesConfigFor("serviceCoverage")}
            >
              <ServiceCoverageData shift={shift} />
            </ShiftReportSectionCard>

            <ShiftReportSectionCard
              id="section-quality"
              title={SECTION_TITLES.quality}
              headerCaption={qualityHeaderCaption}
              icon={SECTION_ICON_MAP.quality.icon}
              iconColor={SECTION_ICON_MAP.quality.iconColor}
              iconBackground={SECTION_ICON_MAP.quality.iconBackground}
              open={openSections.quality}
              onToggle={() => toggleSection("quality")}
              notes={notesConfigFor("quality")}
            >
              <QualityData shift={shift} />
            </ShiftReportSectionCard>
          </div>

          <ShiftInProgressPanel
            shiftLabel={SHIFT_LABELS[shift.shiftKey]}
            shiftTimeRange={shiftTimeRange}
            liveStatus={liveStatus}
            elapsedSeconds={shiftElapsedSeconds}
            progressPercent={progressPercent}
            managers={shift.managers}
            sections={SIDE_PANEL_SECTIONS.map((s) => ({
              key: s.key,
              icon: s.icon,
              iconColor: s.iconColor,
              title: SECTION_TITLES[s.key],
              noteCount: getSectionNoteCount(shift, s.key),
            }))}
            isLocked={isLocked}
            canComplete={canComplete}
            onCompleteClick={() => setConfirmOpen(true)}
            onSelectSection={handleSelectSection}
          />
        </div>
      </main>

      <ManagerQueuePanel open={managerQueueOpen} onClose={() => setManagerQueueOpen(false)} theme="light" />

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Complete this shift report?" theme="light">
        <p className={styles.confirmBody}>Every section locks once completed. Other managers can still view it, but no further notes can be added.</p>
        <div className={styles.confirmActions}>
          <Button variant="primary" theme="light" onClick={handleConfirmComplete}>
            Complete Shift Report
          </Button>
          <Button variant="secondary" theme="light" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function ManagerRow({ manager, now }: { manager: ShiftManager; now: Date | null }) {
  // Still on shift: nobody has clocked out yet, so the row shows a live elapsed "Time on Shift" and a placeholder "--:--" Clocked Out.
  // `now` is null only for the initial server-rendered/pre-hydration frame (see EndOfShiftReportPage's own note); 0 elapsed there is fine since the real value replaces it within a frame of mount.
  const elapsed = now ? getElapsedSeconds(manager.clockIn, now) : 0;
  const checkedOut = Boolean(manager.checkedOut);

  return (
    <div className={styles.managerRow}>
      <div className={styles.managerInfo}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={manager.avatar} alt="" className={styles.managerAvatar} />
        <div className={styles.managerNameCol}>
          <span className={styles.managerName}>{manager.name}</span>
          <span className={styles.managerRole}>{manager.role}</span>
        </div>
      </div>
      <span className={styles.managerDivider} />
      <div className={styles.managerTimeCol}>
        <span className={styles.managerTimeValue}>{manager.clockIn}</span>
        <span className={styles.managerTimeLabel}>Checked In</span>
      </div>
      <div className={styles.managerTimeCol}>
        <span className={styles.managerTimeValue}>{checkedOut ? manager.totalTime : formatHMS(elapsed)}</span>
        <span className={styles.managerTimeLabel}>Time on Shift</span>
      </div>
      <div className={styles.managerTimeCol}>
        {checkedOut ? (
          <>
            <span className={styles.managerTimeValue}>{manager.clockOut}</span>
            <span className={styles.managerTimeLabel}>Checked Out</span>
          </>
        ) : (
          <span className={styles.managerCheckedInBadge}>Checked In</span>
        )}
      </div>
    </div>
  );
}

function RingStat({
  percent,
  color,
  label,
  value,
  caption,
  segments,
  size = 70,
}: {
  percent: number;
  color?: string;
  label: string;
  value: string;
  caption: string;
  segments?: { value: number; color: string }[];
  size?: number;
}) {
  return (
    <div className={styles.ringStat}>
      <div className={styles.ringWrap}>
        {segments ? (
          <SegmentedDonutRing segments={segments} trackColor="var(--color-neutral-300)" size={size} strokeWidth={7} />
        ) : (
          <DonutRing percent={percent} color={color ?? "var(--color-primary-500)"} trackColor="var(--color-neutral-300)" size={size} strokeWidth={7} />
        )}
        <span className={styles.ringPercentLabel}>{percent}%</span>
      </div>
      <div className={styles.ringStatText}>
        <span className={styles.ringStatLabel}>{label}</span>
        <div className={styles.ringStatValueRow}>
          <span className={styles.ringStatValue}>{value}</span>
          <span className={styles.ringStatCaption}>{caption}</span>
        </div>
      </div>
    </div>
  );
}

function HoursHeadcountData({ shift }: { shift: ShiftReportState }) {
  const d = shift.sections.hoursHeadcount;
  return (
    <div className={styles.dataGroup}>
      <div className={styles.flatDataGroup}>
        <RingStat percent={d.percentCaptured} color="var(--color-warning-500)" label="Hours Captured" value={d.hoursCaptured} caption={`of ${d.totalTime} shift time`} size={80} />
        <div className={styles.headcountRow}>
          <div className={[styles.headcountItem, styles.headcountItemFlex].join(" ")}>
            <span className={styles.headcountItemLabel}>Scheduled Headcount</span>
            <span className={styles.headcountItemValue}>{d.scheduledHeadcount}</span>
          </div>
          <span className={styles.headcountDivider} />
          <div className={[styles.headcountItem, styles.headcountItemFlex].join(" ")}>
            <span className={styles.headcountItemLabel}>Actual Arrival</span>
            <span className={styles.headcountItemValue}>{d.actualArrival}</span>
          </div>
          <span className={styles.headcountDivider} />
          <div className={styles.absencesGroup}>
            <div className={[styles.headcountItem, styles.headcountItemFixed].join(" ")}>
              <span className={styles.headcountItemLabel}>Total Absences</span>
              <span className={styles.headcountItemValue}>{d.totalAbsences}</span>
            </div>
            <div className={[styles.headcountItem, styles.headcountItemFixed].join(" ")}>
              <span className={[styles.headcountItemLabel, styles.headcountItemLabelMuted].join(" ")}>No Call/No Show</span>
              <span className={[styles.headcountItemValue, styles.headcountItemValueMuted].join(" ")}>{d.noCallNoShow}</span>
            </div>
            <div className={[styles.headcountItem, styles.headcountItemFixed].join(" ")}>
              <span className={[styles.headcountItemLabel, styles.headcountItemLabelMuted].join(" ")}>Call Outs</span>
              <span className={[styles.headcountItemValue, styles.headcountItemValueMuted].join(" ")}>{d.callOuts}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const AREA_BREAKDOWN_COLORS = {
  notServiced: "var(--color-danger-500)",
  underServiced: "var(--color-warning-300)",
  fullyServiced: "var(--color-success-500)",
  overServiced: "var(--color-success-900)",
  noFrequency: "var(--color-neutral-600)",
} as const;

function AreaCoverageData({ shift }: { shift: ShiftReportState }) {
  const d = shift.sections.areaCoverage;
  const rows: { key: keyof typeof AREA_BREAKDOWN_COLORS; label: string; value: number }[] = [
    { key: "notServiced", label: "Not Serviced", value: d.breakdown.notServiced },
    { key: "underServiced", label: "Under-Serviced", value: d.breakdown.underServiced },
    { key: "fullyServiced", label: "Fully Serviced", value: d.breakdown.fullyServiced },
    { key: "overServiced", label: "Over Serviced", value: d.breakdown.overServiced },
    { key: "noFrequency", label: "No Frequency", value: d.breakdown.noFrequency },
  ];

  const leftRows = rows.slice(0, 3);
  const rightRows = rows.slice(3);

  return (
    <div className={styles.dataGroup}>
      <div className={styles.coverageRow}>
        <div className={styles.ringStat}>
          <div className={styles.ringWrap}>
            <SegmentedDonutRing segments={rows.map((row) => ({ value: row.value, color: AREA_BREAKDOWN_COLORS[row.key] }))} trackColor="var(--color-neutral-300)" size={80} strokeWidth={7} />
            <span className={styles.ringPercentLabel}>{d.percentServiced}%</span>
          </div>
          <div className={styles.ringStatText}>
            <span className={styles.ringStatLabel}>Areas Serviced</span>
            <div className={styles.ringStatValueRow}>
              <span className={styles.ringStatValue}>{d.areasServiced.toLocaleString()}</span>
              <span className={styles.ringStatCaption}>of {d.areasTotal.toLocaleString()} total areas</span>
            </div>
          </div>
        </div>

        <div className={styles.coverageLegendColumns}>
          {[leftRows, rightRows].map((column, columnIndex) => (
            <div key={columnIndex} className={styles.coverageLegendColumn}>
              {column.map((row) => {
                const pct = d.areasTotal > 0 ? Math.round((row.value / d.areasTotal) * 100) : 0;
                return (
                  <div key={row.key} className={styles.coverageLegendItem}>
                    <span className={styles.coverageLegendLabelGroup}>
                      <span className={styles.coverageLegendBar} style={{ backgroundColor: AREA_BREAKDOWN_COLORS[row.key] }} aria-hidden="true" />
                      <span className={styles.coverageLegendLabel}>{row.label}</span>
                    </span>
                    <span className={styles.coverageLegendValue}>
                      {row.value.toLocaleString()} areas <span className={styles.coverageLegendPercent}>({pct}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ServiceCoverageData({ shift }: { shift: ShiftReportState }) {
  const d = shift.sections.serviceCoverage;
  return (
    <div className={styles.dataGroup}>
      <div className={styles.flatDataGroup}>
        <RingStat
          percent={d.percentCompleted}
          color="var(--color-datavis-purple-100)"
          label="Services Completed"
          value={d.servicesCompleted.toLocaleString()}
          caption={`of ${d.servicesExpected.toLocaleString()} expected`}
          size={80}
        />
      </div>
    </div>
  );
}

function ScoreChip({ score, label, caption }: { score: number; label: string; caption: string }) {
  return (
    <div className={styles.scoreChipGroup}>
      <span className={styles.scoreChip}>{score.toFixed(2)}</span>
      <div className={styles.scoreChipText}>
        <span className={styles.scoreChipLabel}>{label}</span>
        <span className={styles.scoreChipCaption}>{caption}</span>
      </div>
    </div>
  );
}

function ReportItRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={styles.reportItRow}>
      <span className={styles.reportItLabel}>{label}</span>
      <span className={styles.reportItValue}>{value}</span>
    </div>
  );
}

function QualityData({ shift }: { shift: ShiftReportState }) {
  const d = shift.sections.quality;
  return (
    <div className={styles.dataGroup}>
      <div className={styles.qualityRowsGroup}>
        <div className={styles.qualityColumnsRow}>
          <div className={styles.qualityColumn}>
            <span className={styles.qualityGroupLabel}>Scores</span>
            <div className={styles.scoresList}>
              <ScoreChip score={d.aiVerification.score} label="AI Verification" caption={`${d.aiVerification.count.toLocaleString()} ${d.aiVerification.unit}`} />
              <ScoreChip score={d.internalAudit.score} label="Internal Audit" caption={`${d.internalAudit.count.toLocaleString()} ${d.internalAudit.unit}`} />
              <ScoreChip score={d.customerAudit.score} label="Customer Audit" caption={`${d.customerAudit.count.toLocaleString()} ${d.customerAudit.unit}`} />
            </div>
          </div>

          <div className={styles.qualityColumn}>
            <span className={styles.qualityGroupLabel}>Report Its</span>
            <div className={styles.reportItsList}>
              <ReportItRow label="Submitted" value={d.reportIts.submitted} />
              <ReportItRow label="Rejected" value={d.reportIts.rejected} />
              <ReportItRow label="Acceptance Rate" value={`${d.reportIts.acceptanceRate}%`} />
            </div>
          </div>
        </div>

        <div className={styles.qualityColumn}>
          <span className={styles.qualityGroupLabel}>Safety</span>
          <p className={styles.safetyEmptyState}>There were no safety issues this shift</p>
        </div>
      </div>
    </div>
  );
}
