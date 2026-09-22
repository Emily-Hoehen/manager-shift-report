"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRightIcon, MoreHorizontalIcon, PlusIcon } from "./icons";
import { ManagerAppHeadcountEditSheet } from "./ManagerAppHeadcountEditSheet";
import { ManagerAppNoteComposerModal } from "./ManagerAppNoteComposerModal";
import { ManagerAppScreenHeader } from "./ManagerAppScreenHeader";
import { DonutRing, SegmentedDonutRing } from "../ui/Charts";
import {
  CURRENT_MANAGER_ID,
  SECTION_TITLES,
  formatTightClockTime,
  getManager,
  getShiftEndTimeLabel,
  getShiftMinutesRemaining,
  getTagColor,
  type SectionKey,
  type ShiftNote,
  type ShiftReportState,
} from "../../lib/managerShiftReportData";
import styles from "./ManagerAppShiftReportSection.module.css";

export type ManagerAppShiftReportSectionProps = {
  shift: ShiftReportState;
  sectionKey: SectionKey;
  onBack: () => void;
  onAddNote: (sectionKey: SectionKey, text: string, tags: string[]) => void;
  onEditNote: (sectionKey: SectionKey, noteId: string, text: string, tags: string[]) => void;
  onDeleteNote: (sectionKey: SectionKey, noteId: string) => void;
  onEditScheduledHeadcount: (value: number) => void;
  /** True while ManagerAppHome renders this screen's header itself (outside the slide-transition layer, so the header bar never slides — only the content beneath it does). */
  hideHeader?: boolean;
};

/**
 * ManagerAppShiftReportSection — full-screen detail for one Day
 * Shift Report section (pushed from ManagerAppShiftReportList, back
 * arrow returns there). Three fixed parts: the section's own
 * auto-captured data (read-only — never editable here), every
 * manager's existing notes on it so far, and a composer to add
 * another. Notes are additive: this never edits or removes another
 * manager's note, only appends the current manager's own.
 */
export function ManagerAppShiftReportSection({
  shift,
  sectionKey,
  onBack,
  onAddNote,
  onEditNote,
  onDeleteNote,
  onEditScheduledHeadcount,
  hideHeader,
}: ManagerAppShiftReportSectionProps) {
  const section = shift.sections[sectionKey];
  const isLocked = Boolean(shift.completedBy);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<ShiftNote | null>(null);
  const [headcountEditOpen, setHeadcountEditOpen] = useState(false);

  function openComposerForNew() {
    setEditingNote(null);
    setComposerOpen(true);
  }

  function openComposerForEdit(note: ShiftNote) {
    setEditingNote(note);
    setComposerOpen(true);
  }

  return (
    <div className={styles.screen}>
      {!hideHeader && <ManagerAppScreenHeader title={SECTION_TITLES[sectionKey]} onBack={onBack} />}
      <div className={[styles.main, isLocked ? styles.mainNoFooter : ""].filter(Boolean).join(" ")}>
        {sectionKey === "shiftNotes" && section.notes.length === 0 ? (
          <p className={styles.zeroState}>
            No shift notes have been added.
            <br />
            Add a note below
          </p>
        ) : sectionKey === "shiftNotes" ? (
          <div className={styles.notesList}>
            {section.notes.map((note) => (
              <NoteCard
                key={note.id}
                shift={shift}
                note={note}
                canManage={!isLocked && note.managerId === CURRENT_MANAGER_ID}
                onEdit={() => openComposerForEdit(note)}
                onDelete={() => onDeleteNote(sectionKey, note.id)}
              />
            ))}
          </div>
        ) : (
          <>
            <AutoCapturedData
              shift={shift}
              sectionKey={sectionKey}
              editable={!isLocked}
              onEditScheduledHeadcount={() => setHeadcountEditOpen(true)}
            />

            <div className={styles.group}>
              <span className={styles.notesLabel}>Notes</span>
              {section.notes.length === 0 ? (
                <p className={styles.emptyNotes}>
                  No notes have been added to this section.
                  <br />
                  Add a note below
                </p>
              ) : (
                <div className={styles.notesList}>
                  {section.notes.map((note) => (
                    <NoteCard
                      key={note.id}
                      shift={shift}
                      note={note}
                      canManage={!isLocked && note.managerId === CURRENT_MANAGER_ID}
                      onEdit={() => openComposerForEdit(note)}
                      onDelete={() => onDeleteNote(sectionKey, note.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {!isLocked && (
        <div className={styles.footer}>
          <button type="button" className={styles.addNoteButton} onClick={openComposerForNew}>
            <PlusIcon />
            Add Note
          </button>
        </div>
      )}

      <ManagerAppNoteComposerModal
        open={composerOpen}
        sectionTitle={SECTION_TITLES[sectionKey]}
        tagVocabulary={section.tagVocabulary}
        initialNote={editingNote}
        onCancel={() => setComposerOpen(false)}
        onSubmit={(text, tags) => {
          if (editingNote) {
            onEditNote(sectionKey, editingNote.id, text, tags);
          } else {
            onAddNote(sectionKey, text, tags);
          }
          setComposerOpen(false);
        }}
      />

      {sectionKey === "hoursHeadcount" && (
        <ManagerAppHeadcountEditSheet
          open={headcountEditOpen}
          value={shift.sections.hoursHeadcount.scheduledHeadcount}
          onCancel={() => setHeadcountEditOpen(false)}
          onSave={(value) => {
            onEditScheduledHeadcount(value);
            setHeadcountEditOpen(false);
          }}
        />
      )}
    </div>
  );
}

function NoteCard({
  shift,
  note,
  canManage,
  onEdit,
  onDelete,
}: {
  shift: ShiftReportState;
  note: ShiftNote;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const author = getManager(shift, note.managerId);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [menuOpen]);

  return (
    <div className={styles.noteCard}>
      <div className={styles.noteTopRow}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={author?.avatar ?? ""} alt="" className={styles.noteAvatar} />
        <span className={styles.noteName}>{author?.name ?? "Unknown manager"}</span>
        <span className={styles.noteTimestamp}>{note.timestamp}</span>
        {canManage && (
          <div className={styles.noteMenuWrap} ref={menuRef}>
            <button type="button" className={styles.noteMenuButton} aria-label="Note options" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
              <MoreHorizontalIcon />
            </button>
            {menuOpen && (
              <div className={styles.noteMenu} role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className={styles.noteMenuItem}
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit();
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={[styles.noteMenuItem, styles.noteMenuItemDanger].join(" ")}
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <p className={styles.noteText}>{note.text}</p>
      {note.tags.length > 0 && (
        <div className={styles.noteTagRow}>
          {note.tags.map((tag) => {
            const tagColor = getTagColor(tag);
            return (
              <span key={tag} className={styles.noteTag} style={{ backgroundColor: tagColor.wash, color: tagColor.color }}>
                {tag}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AutoCapturedData({
  shift,
  sectionKey,
  editable,
  onEditScheduledHeadcount,
}: {
  shift: ShiftReportState;
  sectionKey: SectionKey;
  editable: boolean;
  onEditScheduledHeadcount: () => void;
}) {
  const s = shift.sections;

  if (sectionKey === "hoursHeadcount") {
    const d = s.hoursHeadcount;
    return (
      <div className={styles.group}>
        <ShiftCapturedDataHeading shift={shift} />

        <div className={styles.card}>
          <div className={styles.ringStatRow}>
            <div className={styles.ringWrap}>
              <DonutRing percent={d.percentCaptured} color="var(--color-text-dt-warning)" trackColor="var(--color-neutral-700)" size={64} strokeWidth={6} />
              <span className={styles.ringPercentLabel}>{d.percentCaptured}%</span>
            </div>
            <div className={styles.ringStatDetails}>
              <span className={styles.ringStatLabel}>Hours Captured</span>
              <div className={styles.ringStatValueStack}>
                <span className={styles.ringStatValue}>{d.hoursCaptured}</span>
                <span className={styles.ringStatCaption}>of {d.totalTime} shift time</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.headcountRowsGroup}>
            <HeadcountRow
              label="Scheduled Headcount"
              value={d.scheduledHeadcount}
              onPress={editable ? onEditScheduledHeadcount : undefined}
            />
            <HeadcountRow label="Actual Arrival" value={d.actualArrival} />
            <HeadcountRow label="Total Absences" value={d.totalAbsences} />
            <HeadcountRow label="No Call/No Show" value={d.noCallNoShow} indented muted />
            <HeadcountRow label="Call Outs" value={d.callOuts} indented muted />
          </div>
        </div>
      </div>
    );
  }

  if (sectionKey === "areaCoverage") {
    const d = s.areaCoverage;
    const rows = [
      { key: "notServiced", label: "Not serviced", value: d.breakdown.notServiced, color: "var(--color-text-dt-danger)" },
      { key: "underServiced", label: "Under-serviced", value: d.breakdown.underServiced, color: "var(--color-warning-100)" },
      { key: "fullyServiced", label: "Fully Serviced", value: d.breakdown.fullyServiced, color: "var(--color-success-100)" },
      { key: "overServiced", label: "Over Serviced", value: d.breakdown.overServiced, color: "var(--color-success-700)" },
    ];
    return (
      <div className={styles.group}>
        <ShiftCapturedDataHeading shift={shift} />
        <div className={styles.card}>
          <div className={styles.ringStatRow}>
            <div className={styles.ringWrap}>
              <SegmentedDonutRing segments={rows.map((row) => ({ value: row.value, color: row.color }))} trackColor="var(--color-neutral-700)" size={64} strokeWidth={6} />
              <span className={styles.ringPercentLabel}>{d.percentServiced}%</span>
            </div>
            <div className={styles.ringStatDetails}>
              <span className={styles.ringStatLabel}>Areas Serviced</span>
              <div className={styles.ringStatValueRow}>
                <span className={styles.ringStatValue}>{d.areasServiced.toLocaleString()}</span>
                <span className={styles.ringStatCaption}>of {d.areasTotal.toLocaleString()} total areas</span>
              </div>
            </div>
          </div>
          <div className={styles.breakdownRowsGroup}>
            {rows.map((row) => (
              <BreakdownRow key={row.key} label={row.label} value={row.value} total={d.areasTotal} color={row.color} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (sectionKey === "serviceCoverage") {
    const d = s.serviceCoverage;
    return (
      <div className={styles.group}>
        <ShiftCapturedDataHeading shift={shift} />
        <div className={styles.card}>
          <div className={styles.ringStatRow}>
            <div className={styles.ringWrap}>
              <DonutRing percent={d.percentCompleted} color="var(--color-datavis-purple-100)" trackColor="var(--color-neutral-700)" size={64} strokeWidth={6} />
              <span className={styles.ringPercentLabel}>{d.percentCompleted}%</span>
            </div>
            <div className={styles.ringStatDetails}>
              <span className={styles.ringStatLabel}>Services Completed</span>
              <div className={styles.ringStatValueRow}>
                <span className={styles.ringStatValue}>{d.servicesCompleted.toLocaleString()}</span>
                <span className={styles.ringStatCaption}>of {d.servicesExpected.toLocaleString()} expected</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const d = s.quality;
  return (
    <div className={styles.group}>
      <ShiftCapturedDataHeading shift={shift} />
      <div className={styles.card}>
        <div className={styles.qualityCardsGroup}>
          <QualityCard label="AI Verification" score={d.aiVerification.score} count={d.aiVerification.count} unit={d.aiVerification.unit} />
          <QualityCard label="Internal Audit" score={d.internalAudit.score} count={d.internalAudit.count} unit={d.internalAudit.unit} />
          <QualityCard label="Customer Audit" score={d.customerAudit.score} count={d.customerAudit.count} unit={d.customerAudit.unit} />
        </div>
      </div>
      <div className={styles.card}>
        <span className={styles.cardTitle}>Report Its</span>
        <div className={styles.headcountRowsGroup}>
          <HeadcountRow label="Submitted" value={d.reportIts.submitted} />
          <HeadcountRow label="Rejected" value={d.reportIts.rejected} />
          <HeadcountRow label="Acceptance Rate" value={d.reportIts.acceptanceRate} suffix="%" />
        </div>
      </div>
      <div className={styles.card}>
        <span className={styles.cardTitle}>Safety</span>
        <p className={styles.safetyText}>
          {d.safety.incidents === 0
            ? "There were no safety issues this shift"
            : `${d.safety.incidents} incident${d.safety.incidents === 1 ? "" : "s"} reported · ${d.safety.reportStatus}`}
        </p>
      </div>
    </div>
  );
}

function ShiftCapturedDataHeading({ shift }: { shift: ShiftReportState }) {
  const hasEnded = getShiftMinutesRemaining(shift.shiftKey) <= 0;
  return (
    <div className={styles.groupLabelBlock}>
      <span className={styles.groupLabelWhite}>Shift Captured Data</span>
      <span className={styles.groupSubtitle}>
        Data captured from {formatTightClockTime(shift.managers[0].clockIn)} - {hasEnded ? getShiftEndTimeLabel(shift.shiftKey) : "Current"}
      </span>
    </div>
  );
}

function HeadcountRow({
  label,
  value,
  indented,
  muted,
  suffix,
  onPress,
}: {
  label: string;
  value: number;
  indented?: boolean;
  muted?: boolean;
  suffix?: string;
  /** When set, the row becomes tappable (currently just Scheduled Headcount) — e.g. to enter how many people were scheduled for the shift. */
  onPress?: () => void;
}) {
  const rowClassName = [styles.headcountRow, indented ? styles.headcountRowIndented : "", muted ? styles.headcountRowMuted : ""].filter(Boolean).join(" ");
  const content = (
    <>
      <span className={styles.headcountLabel}>{label}</span>
      <span className={styles.headcountValue}>
        {value.toLocaleString()}
        {suffix ?? ""}
      </span>
      {onPress && <ChevronRightIcon className={styles.headcountChevron} />}
    </>
  );

  if (onPress) {
    return (
      <button type="button" className={[rowClassName, styles.headcountRowEditable].join(" ")} onClick={onPress}>
        {content}
      </button>
    );
  }

  return <div className={rowClassName}>{content}</div>;
}

function QualityCard({ label, score, count, unit }: { label: string; score: number; count: number; unit: string }) {
  return (
    <div className={styles.qualityRow}>
      <span className={styles.qualityScoreChip}>{score.toFixed(2)}</span>
      <div className={styles.qualityRowDetails}>
        <span className={styles.qualityRowLabel}>{label}</span>
        <span className={styles.qualityRowCaption}>
          {count.toLocaleString()} {unit}
        </span>
      </div>
    </div>
  );
}

function BreakdownRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className={styles.breakdownRow}>
      <span className={styles.breakdownBar} style={{ backgroundColor: color }} aria-hidden="true" />
      <span className={styles.breakdownLabel}>{label}</span>
      <span className={styles.breakdownValue}>
        {value.toLocaleString()} areas <span className={styles.breakdownPercent}>({percent}%)</span>
      </span>
    </div>
  );
}
