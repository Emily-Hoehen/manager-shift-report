"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  ChevronLeftIcon,
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
import type { ShiftCompletedStats } from "./ShiftInProgressPanel";
import { formatDateParam, formatSignOffNowLabel, parseDateParam } from "../../lib/shiftReportListData";
import { siteInfo } from "../../lib/homeDashboardData";
import { buildDailyReport } from "../../lib/mapPageData";
import type { ContractBuilding } from "../../lib/sowContract";
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
  parseViewerRole,
  type SectionKey,
  type ShiftKey,
  type ShiftManager,
  type ShiftReportState,
} from "../../lib/managerShiftReportData";
import styles from "./EndOfShiftReportPage.module.css";

function formatNowTimestamp() {
  return `${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} EDT`;
}

// "Tuesday, September 8" — the page's own big date header, same no-year format as DailyReportPage's
// own dateFormatter so the two pages read identically (getFullDateLabel's own year-inclusive format
// stays reserved for the smaller date-picker pill, matching DailyReportPage's pickerDateFormatter split).
const bigDateFormatter = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" });

// "Sep 8, 2026" — the Side Panel's own "Report Submitted by ... at ... on {date}" line (Figma fileKey
// 0UJDRcrFiXkn16yfc2MUEW, node 258:26708) — abbreviated month, no weekday, unlike the page's other
// date labels (bigDateFormatter/getFullDateLabel), since that full line is already long on its own.
const abbreviatedDateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

/** The Side Panel's own at-a-glance checklist (Figma fileKey 0UJDRcrFiXkn16yfc2MUEW, node 203:40371) — every note-taking section except Shift Notes, same icon/color pairing as ManagerAppShiftReportList's own SECTION_ICON so a section reads the same hue everywhere it appears. `iconBackground` is that same hue's own 15%-wash token (node 216:43750's left-column icon bubbles) — the Side Panel's own rows stay plain icon glyphs with no bubble. */
const SIDE_PANEL_SECTIONS: { key: SectionKey; icon: ReactNode; iconColor: string; iconBackground: string }[] = [
  { key: "shiftNotes", icon: <NoteStickyIcon />, iconColor: "var(--color-datavis-pinkle-500)", iconBackground: "var(--wash-pinkle-light-15)" },
  { key: "hoursHeadcount", icon: <ClockIcon />, iconColor: "var(--color-warning-500)", iconBackground: "var(--wash-warning-solid-15)" },
  { key: "areaCoverage", icon: <VectorSquareIcon />, iconColor: "var(--color-text-lt-blue)", iconBackground: "var(--wash-primary-blue-15)" },
  { key: "serviceCoverage", icon: <BroomWideIcon />, iconColor: "var(--color-datavis-purple-500)", iconBackground: "var(--wash-purple-15)" },
  { key: "quality", icon: <ClipboardCheckIcon />, iconColor: "var(--color-success-700)", iconBackground: "var(--wash-success-15)" },
];

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
const VALID_SHIFT_KEYS: ShiftKey[] = ["day", "swing", "graveyard"];

export type EndOfShiftReportPageProps = {
  contractBuildings: ContractBuilding[];
};

export function EndOfShiftReportPage({ contractBuildings }: EndOfShiftReportPageProps) {
  const searchParams = useSearchParams();
  const [managerQueueOpen, setManagerQueueOpen] = useState(false);
  // Whichever day's row was actually clicked on the Shift Reports list, or a shift row on the Daily
  // Report (both carry `?date=`, see dailyReportHref/DailyReportPage's own ShiftRow) — falls back to
  // today's real date for a direct visit with no date param (e.g. today's own live shift).
  const reportDate = parseDateParam(searchParams.get("date")) ?? new Date();
  // Same today/signed-off state DailyReportPage's own ShiftRow carried over here (see this file's own
  // dailyReportHref) — used only to keep the Site Director note card below in whichever of its three
  // stages (Reports Pending / unsigned / signed off) DailyReportPage itself would be showing for this
  // same day, instead of the two pages ever disagreeing about it.
  const isToday = searchParams.get("today") === "1";
  // Same anchor-day sample as DailyReportPage's own dailyReport (pinned to dayOffset 0, not this
  // page's own reportDate — this prototype has no per-day report history, see this file's own header
  // comment) — just for the Site Director's note card at the top, matching DailyReportPage's copy of
  // the same day so the two pages never disagree about what Juan actually wrote.
  const dailyReport = buildDailyReport(0, contractBuildings);
  // A Site Director can sign off from here too now, same "Sign Off on Day" input as DailyReportPage's
  // own (see confirmSignOff below) — starts from whatever DailyReportPage's own ShiftRow forwarded
  // (`signedOff`/`at`), but this page's own sign-off only updates this page's own state, same as every
  // other independent-per-page convention in this feature (no shared backend to persist it back to
  // DailyReportPage with).
  const [signOffOverride, setSignOffOverride] = useState<{ timestamp: string; note: string } | null>(null);
  const [signOffNoteDraft, setSignOffNoteDraft] = useState("");
  const trimmedSignOffNote = signOffNoteDraft.trim();
  const isSignedOff = signOffOverride !== null || searchParams.get("signedOff") === "1";
  // Same exact text/timestamp DailyReportPage's own signOff shows for this same day (see its own
  // initialSignOff) — the second line of the shared aiOverview (the first is a plain shift recap, not
  // Juan's own remark), and whichever timestamp the list originally marked this day signed off at
  // (`at`, forwarded here via dailyReportHref/ShiftRow), falling back to the same anchor-day label
  // DailyReportPage falls back to when there's no list-provided one.
  const directorNoteText = signOffOverride?.note ?? (dailyReport.aiOverview.split("\n")[1] ?? dailyReport.aiOverview);
  const directorNoteTimestamp = signOffOverride?.timestamp ?? (searchParams.get("at") || dailyReport.siteManagerSignOff.replace(/^Signed off at /, ""));

  function confirmSignOff() {
    if (!trimmedSignOffNote) return;
    setSignOffOverride({ timestamp: formatSignOffNowLabel(), note: trimmedSignOffNote });
    setSignOffNoteDraft("");
  }
  // One independent ShiftReportState per shift (INITIAL_SHIFT_REPORTS) — the
  // Day/Swing/Graveyard toggle below just switches which slice `shift` reads
  // from; notes/completion made on one shift never touch the others'.
  // Arriving from a day the Shift Reports list already marks "completed" (every day before today —
  // see DailyReportPage's ShiftRow, which is the only place `?completed=1` gets added) seeds every
  // shift as already submitted, by its own lead manager, instead of the perpetually-uncompleted
  // sample state INITIAL_SHIFT_REPORTS starts from — this prototype has no real per-day report
  // history (see DailyReportPage's own file header comment), so every historical day tells the same
  // illustrative "already submitted" story rather than only Day's own pre-seeded one.
  const [reports, setReports] = useState<Record<ShiftKey, ShiftReportState>>(() => {
    if (searchParams.get("completed") !== "1") return INITIAL_SHIFT_REPORTS;
    return Object.fromEntries(
      VALID_SHIFT_KEYS.map((key) => {
        const base = INITIAL_SHIFT_REPORTS[key];
        if (base.completedBy) return [key, base];
        const submittedBy = base.managers[0];
        return [key, { ...base, completedBy: submittedBy?.id ?? null, completedAt: base.sections.shiftNotes.notes.at(-1)?.timestamp ?? submittedBy?.clockOut ?? null }];
      })
    ) as Record<ShiftKey, ShiftReportState>;
  });
  // Arriving from a specific shift's own row on the Shift Reports list (?shift=swing) opens straight
  // to that shift's toggle instead of always defaulting to Day.
  const requestedShiftKey = searchParams.get("shift");
  const initialShiftKey = VALID_SHIFT_KEYS.includes(requestedShiftKey as ShiftKey) ? (requestedShiftKey as ShiftKey) : "day";
  const [activeShiftKey, setActiveShiftKey] = useState<ShiftKey>(initialShiftKey);
  // Who's looking at this page (see ViewerRole) — only a Manager on Shift can add notes or complete a
  // report, and only for whichever shift is actually theirs right now (canEditShift below); Site
  // Director and Other User both get the exact same read-only rendering here.
  const viewerRole = parseViewerRole(searchParams.get("as"));
  // Always returns to the Daily Report for this same date/persona — this page is only ever reached
  // by selecting a shift's row there (DailyReportPage's ShiftRow), so "back" means back to it rather
  // than up to the Shift Reports list. Round-trips the same today/signed-off state DailyReportPage's
  // own ShiftRow carried over here (`today`/`signedOff`/`at`), so going back doesn't reset today's
  // shifts to "completed" or drop the Site Director's note back to its unsigned state.
  const todayParam = searchParams.get("today") === "1" ? "&today=1" : "";
  const signedOffParam = searchParams.get("signedOff") === "1" ? `&signedOff=1&at=${encodeURIComponent(searchParams.get("at") ?? "")}` : "";
  const dailyReportHref = `/manage-shift/daily-report?date=${formatDateParam(reportDate)}${viewerRole === "director" ? "" : `&as=${viewerRole}`}${todayParam}${signedOffParam}`;
  // Same "Shift Reports / Daily Report" breadcrumb as DailyReportPage's own header, in the same spot
  // (headerTopRow, left of the date picker) — this page is nested under Daily Report, so it reads the
  // same way there does rather than getting its own, different breadcrumb.
  const listHref = viewerRole === "director" ? "/manage-shift/end-of-shift-reports" : `/manage-shift/end-of-shift-reports?as=${viewerRole}`;
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
  // Same "nothing to sign off yet" check as DailyReportPage's own dayInProgress — true until every
  // shift (not just the one currently toggled to) has actually ended. Defaults to true (matching
  // DailyReportPage's own SSR-safe default) until `now` fills in client-side.
  const dayInProgress = isToday && (now === null || VALID_SHIFT_KEYS.some((key) => getShiftLiveStatus(key, now) !== "ended"));

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
  // Only a Manager on Shift can touch this report at all, and only once this specific shift has
  // actually started — a future shift they're not checked into yet stays read-only, same as it would
  // for the Site Director or Other User (viewerRole !== "manager" is read-only unconditionally).
  const canEditShift = viewerRole === "manager" && isCurrentResponsible && liveStatus !== "notStarted";
  // Not gated on `isLocked` — Day loads pre-completed for display (title, no
  // counter), but a manager can still add notes and complete the report
  // again from here, same as an in-progress shift.
  const canComplete = readyToComplete && hasEnded && canEditShift;

  const quality = shift.sections.quality;
  const qualityAccepted = quality.reportIts.submitted - quality.reportIts.rejected;

  // Only read once isLocked (see ShiftInProgressPanel's own completedStats prop) — the same shift
  // section data the left column's own captured-data cards already render, just reshaped for the Side
  // Panel's rollup.
  const completedByManager = shift.completedBy ? getManager(shift, shift.completedBy) : undefined;
  const submittedAtLabel = shift.completedAt ? `${shift.completedAt} on ${abbreviatedDateFormatter.format(reportDate)}` : undefined;
  const completedStats: ShiftCompletedStats = {
    hours: {
      percent: shift.sections.hoursHeadcount.percentCaptured,
      captured: shift.sections.hoursHeadcount.hoursCaptured,
      total: shift.sections.hoursHeadcount.totalTime,
      associateArrival: shift.sections.hoursHeadcount.actualArrival,
      totalAbsences: shift.sections.hoursHeadcount.totalAbsences,
    },
    areaCoverage: {
      percent: shift.sections.areaCoverage.percentServiced,
      serviced: shift.sections.areaCoverage.areasServiced,
      total: shift.sections.areaCoverage.areasTotal,
      notServiced: shift.sections.areaCoverage.breakdown.notServiced,
      underServiced: shift.sections.areaCoverage.breakdown.underServiced,
      fullyServiced: shift.sections.areaCoverage.breakdown.fullyServiced,
      overServiced: shift.sections.areaCoverage.breakdown.overServiced,
    },
    serviceCoverage: {
      percent: shift.sections.serviceCoverage.percentCompleted,
      completed: shift.sections.serviceCoverage.servicesCompleted,
      expected: shift.sections.serviceCoverage.servicesExpected,
    },
    quality: {
      aiVerification: quality.aiVerification.score,
      internalAudit: quality.internalAudit.score,
      customerAudit: quality.customerAudit.score,
    },
    safetyIssues: quality.safety.incidents,
    reportIts: {
      accepted: qualityAccepted,
      submitted: quality.reportIts.submitted,
      rejected: quality.reportIts.rejected,
      acceptanceRate: quality.reportIts.acceptanceRate,
    },
  };

  function notesConfigFor(sectionKey: SectionKey): ShiftReportSectionNotesConfig {
    const section = shift.sections[sectionKey];
    return {
      items: section.notes,
      tagVocabulary: section.tagVocabulary,
      // Locked (no composer, no edit/delete menu) once the report's actually been submitted
      // (isLocked), or for anyone who isn't the Manager on Shift for this specific, already-started
      // shift (canEditShift) beforehand — a submitted report is done, not just re-completable with
      // more notes added after the fact.
      isLocked: isLocked || !canEditShift,
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
        <header className={styles.headerBlock}>
          <div className={styles.headerTopRow}>
            <div className={styles.breadcrumb}>
              <Link href={listHref} className={styles.breadcrumbMuted}>
                Shift Reports /
              </Link>
              <span className={styles.breadcrumbCurrent}>Daily Report</span>
            </div>
            <div className={styles.datePicker}>
              <button type="button" className={styles.dateCaret} disabled aria-label="Previous day">
                <CaretLeftIcon />
              </button>
              <span className={styles.dateLabel}>{getFullDateLabel(reportDate)}</span>
              <button type="button" className={styles.dateCaret} disabled aria-label="Next day">
                <CaretRightIcon />
              </button>
            </div>
          </div>
          <h2 className={styles.bigDate}>{bigDateFormatter.format(reportDate)}</h2>
        </header>

        <div className={styles.directorNoteCard}>
          {dayInProgress ? (
            // Nothing to sign off yet — same as DailyReportPage's own "Reports Pending" card, no
            // avatar/note to show yet either.
            <div className={styles.reportsPendingGroup}>
              <p className={styles.reportsPendingTitle}>Shift Reports Pending</p>
              <p>Sign Off Due by 8:00am EST on {getFullDateLabel(new Date((now ?? reportDate).getFullYear(), (now ?? reportDate).getMonth(), (now ?? reportDate).getDate() + 1))}.</p>
            </div>
          ) : (
            <>
              {isSignedOff ? (
                // Juan's own note, once he's actually signed off.
                <div className={styles.directorNoteText}>
                  <p>{directorNoteText}</p>
                </div>
              ) : (
                // Not signed off yet — same "Sign Off on Day" input as DailyReportPage's own, only for
                // the Site Director; a Manager on Shift or Other User viewing the same unsigned day
                // just sees the plain card below with nothing to fill in.
                viewerRole === "director" && (
                  <div className={styles.signOffFormGroup}>
                    <p className={styles.signOffHeading}>Sign Off on Day</p>
                    <textarea
                      id="end-of-shift-sign-off-note"
                      className={styles.signOffNoteInput}
                      value={signOffNoteDraft}
                      onChange={(e) => setSignOffNoteDraft(e.target.value)}
                      placeholder="Add a note about the daily report..."
                      rows={4}
                      required
                    />
                  </div>
                )
              )}
              <div className={styles.directorNotePersonRow}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={dailyReport.siteManager.avatar} alt="" className={styles.directorNoteAvatar} />
                <div className={styles.directorNoteInfo}>
                  <div className={styles.directorNoteNameRow}>
                    <span className={styles.directorNoteName}>{dailyReport.siteManager.name}</span>
                    <span className={styles.directorNotePosition}>{dailyReport.siteManager.position}</span>
                  </div>
                  {isSignedOff && <span className={styles.directorNoteComplete}>Signed off at {directorNoteTimestamp}</span>}
                </div>
                {!isSignedOff && viewerRole === "director" && (
                  <Button variant="primary" theme="light" onClick={confirmSignOff} disabled={!trimmedSignOffNote}>
                    Sign Off on Day
                  </Button>
                )}
              </div>
            </>
          )}
        </div>

        <div className={styles.rollup}>
          <Link href={dailyReportHref} className={styles.backLink} aria-label="Back to Daily Report">
            <span className={styles.backLinkIcon}>
              <ChevronLeftIcon />
            </span>
            <h1 className={styles.backLinkText}>{SHIFT_LABELS[activeShiftKey]} Shift</h1>
          </Link>

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
              completed={isLocked}
            >
              <div className={styles.managersTable}>
                {shift.managers.map((manager) => (
                  <ManagerRow key={manager.id} manager={manager} now={now} isLocked={isLocked} />
                ))}
              </div>
            </ShiftReportSectionCard>

            <ShiftReportSectionCard
              id="section-shiftNotes"
              title={SECTION_TITLES.shiftNotes}
              open={openSections.shiftNotes}
              onToggle={() => toggleSection("shiftNotes")}
              notes={notesConfigFor("shiftNotes")}
              completed={isLocked}
            />

            <ShiftReportSectionCard
              id="section-hoursHeadcount"
              title={SECTION_TITLES.hoursHeadcount}
              open={openSections.hoursHeadcount}
              onToggle={() => toggleSection("hoursHeadcount")}
              notes={notesConfigFor("hoursHeadcount")}
              completed={isLocked}
            >
              <HoursHeadcountData shift={shift} />
            </ShiftReportSectionCard>

            <ShiftReportSectionCard
              id="section-areaCoverage"
              title={SECTION_TITLES.areaCoverage}
              open={openSections.areaCoverage}
              onToggle={() => toggleSection("areaCoverage")}
              notes={notesConfigFor("areaCoverage")}
              completed={isLocked}
            >
              <AreaCoverageData shift={shift} />
            </ShiftReportSectionCard>

            <ShiftReportSectionCard
              id="section-serviceCoverage"
              title={SECTION_TITLES.serviceCoverage}
              open={openSections.serviceCoverage}
              onToggle={() => toggleSection("serviceCoverage")}
              notes={notesConfigFor("serviceCoverage")}
              completed={isLocked}
            >
              <ServiceCoverageData shift={shift} />
            </ShiftReportSectionCard>

            <ShiftReportSectionCard
              id="section-quality"
              title={SECTION_TITLES.quality}
              open={openSections.quality}
              onToggle={() => toggleSection("quality")}
              notes={notesConfigFor("quality")}
              completed={isLocked}
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
            submittedByName={completedByManager?.name}
            submittedAtLabel={submittedAtLabel}
            completedStats={completedStats}
            canComplete={canComplete}
            showCompleteAction={viewerRole === "manager"}
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

function ManagerRow({ manager, now, isLocked }: { manager: ShiftManager; now: Date | null; isLocked: boolean }) {
  // Still on shift: nobody has clocked out yet, so the row shows a live elapsed "Time on Shift" and a placeholder "--:--" Clocked Out.
  // `now` is null only for the initial server-rendered/pre-hydration frame (see EndOfShiftReportPage's own note); 0 elapsed there is fine since the real value replaces it within a frame of mount.
  const elapsed = now ? getElapsedSeconds(manager.clockIn, now) : 0;
  // A submitted report means the shift is over — nobody's still clocked in by then, so every manager
  // reads as checked out (with a real Checked Out time) once the report is locked, regardless of
  // manager.checkedOut (only meaningful while the shift is still in progress).
  const checkedOut = isLocked || Boolean(manager.checkedOut);

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
      <div className={[styles.managerTimeCol, styles.managerTimeColFirst].join(" ")}>
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
