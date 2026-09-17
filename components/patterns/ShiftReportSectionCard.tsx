"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDownIcon, CircleCheckIcon, MoreHorizontalIcon } from "./icons";
import type { ShiftNote } from "../../lib/managerShiftReportData";
import styles from "./ShiftReportSectionCard.module.css";

export type ShiftReportNoteAuthor = { name: string; avatar: string };

export type ShiftReportSectionNotesConfig = {
  items: ShiftNote[];
  tagVocabulary: string[];
  isLocked: boolean;
  currentManagerId: string;
  getAuthor: (managerId: string) => ShiftReportNoteAuthor | undefined;
  onAdd: (text: string, tags: string[]) => void;
  onEdit: (noteId: string, text: string, tags: string[]) => void;
  onDelete: (noteId: string) => void;
};

export type ShiftReportSectionCardProps = {
  /** DOM id for this card — lets the Side Panel's own row for the same section scroll here and land at the top of the viewport. */
  id?: string;
  title: string;
  /** Small grey line under the title — only Shift Managers uses this ("4 Managers on Shift"). */
  subtitle?: string;
  /** A one-line data summary stacked directly under the title, inside titleGroup (Figma node 214:43034's "93% Hours Captured | 44 Associates Arrived") — distinct from `subtitle`, which sits right-aligned next to the chevron instead. */
  headerCaption?: string;
  /** Leading icon chip next to the title — same icon/color as this section's own row in the Side Panel. Omitted for Shift Managers, which has no Side Panel icon of its own. */
  icon?: ReactNode;
  iconColor?: string;
  /** The icon's own hue at a light wash, behind the icon glyph (Figma node 216:43750) — not the sidebar's plain-glyph treatment. */
  iconBackground?: string;
  open: boolean;
  onToggle: () => void;
  /** Omit for a section with no notes concept at all (Shift Managers) — hides the note-count/check badge and the whole Managers Notes block. */
  notes?: ShiftReportSectionNotesConfig;
  /** Captured-data body, rendered above the Managers Notes block when present. */
  children?: ReactNode;
};

/**
 * ShiftReportSectionCard — one collapsible card in the desktop End of
 * Shift Report (Figma fileKey 0UJDRcrFiXkn16yfc2MUEW, node 174:34927
 * "Details"). Every report section shares this same card shell: a
 * header row (title, optional "N notes added" + check-circle badge,
 * chevron) over a collapsible body. Sections that capture notes get a
 * "Manager Notes" list plus an always-visible inline composer (not a
 * modal, unlike the Manager App mobile equivalent — this is a desktop
 * page, not a pushed screen); Shift Managers has neither and just
 * supplies its own body as `children` with no `notes` prop.
 */
export function ShiftReportSectionCard({ id, title, subtitle, headerCaption, icon, iconColor, iconBackground, open, onToggle, notes, children }: ShiftReportSectionCardProps) {
  const noteCount = notes?.items.length ?? 0;
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const editingNote = notes?.items.find((n) => n.id === editingNoteId) ?? null;

  return (
    <section id={id} className={styles.card}>
      <button type="button" className={styles.header} aria-expanded={open} onClick={onToggle}>
        <span className={styles.titleRow}>
          {icon && (
            <span className={styles.iconChip} style={{ backgroundColor: iconBackground, color: iconColor }}>
              {icon}
            </span>
          )}
          <span className={styles.titleGroup}>
            <span className={styles.title}>{title}</span>
            {headerCaption && <span className={styles.headerCaption}>{headerCaption}</span>}
          </span>
        </span>
        <span className={styles.headerRight}>
          {notes && (
            <>
              <span className={[styles.noteCount, noteCount > 0 ? styles.noteCountDone : ""].filter(Boolean).join(" ")}>
                {noteCount} note{noteCount === 1 ? "" : "s"} added
              </span>
              <CircleCheckIcon className={[styles.checkIcon, noteCount > 0 ? styles.checkIconDone : ""].filter(Boolean).join(" ")} />
            </>
          )}
          {subtitle && <span className={styles.headerSubtitle}>{subtitle}</span>}
          <ChevronDownIcon className={[styles.chevron, open ? styles.chevronOpen : ""].filter(Boolean).join(" ")} />
        </span>
      </button>

      {/* Always rendered (never conditionally mounted) so the grid-rows track below can animate smoothly between 0 and its content's real height — a collapsed section is fully clipped via bodyWrap's own overflow:hidden, not absent from the DOM. */}
      <div className={styles.bodyWrap} data-open={open}>
        <div className={styles.bodyInner}>
          <div className={styles.body}>
            {children}

            {notes && (
              <div className={styles.notesGroup}>
                {children ? (
                  // A divider separates the notes block from the captured-data content above it.
                  <div className={styles.notesDivider} />
                ) : (
                  // No captured data precedes this section (Shift Notes) — nothing to divide from, so
                  // an empty-state sentence anchors the block instead until the first note replaces it.
                  noteCount === 0 && <p className={styles.notesZeroState}>No notes have been added to the shift. Add one below.</p>
                )}

                {noteCount > 0 && (
                  <div className={styles.notesList}>
                    {notes.items.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        author={notes.getAuthor(note.managerId)}
                        canManage={!notes.isLocked && note.managerId === notes.currentManagerId}
                        onEdit={() => setEditingNoteId(note.id)}
                        onDelete={() => {
                          if (editingNoteId === note.id) setEditingNoteId(null);
                          notes.onDelete(note.id);
                        }}
                      />
                    ))}
                  </div>
                )}

                {!notes.isLocked && (
                  <NoteComposer
                    key={editingNoteId ?? "new"}
                    sectionLabel={title}
                    tagVocabulary={notes.tagVocabulary}
                    initialNote={editingNote}
                    onSubmit={(text, tags) => {
                      if (editingNote) {
                        notes.onEdit(editingNote.id, text, tags);
                        setEditingNoteId(null);
                      } else {
                        notes.onAdd(text, tags);
                      }
                    }}
                    onCancelEdit={editingNote ? () => setEditingNoteId(null) : undefined}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function NoteCard({
  note,
  author,
  canManage,
  onEdit,
  onDelete,
}: {
  note: ShiftNote;
  author?: ShiftReportNoteAuthor;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
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
          {note.tags.map((tag) => (
            <span key={tag} className={styles.noteTag}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function NoteComposer({
  sectionLabel,
  tagVocabulary,
  initialNote,
  onSubmit,
  onCancelEdit,
}: {
  sectionLabel: string;
  tagVocabulary: string[];
  initialNote: ShiftNote | null;
  onSubmit: (text: string, tags: string[]) => void;
  onCancelEdit?: () => void;
}) {
  const [text, setText] = useState(initialNote?.text ?? "");
  const [selectedTags, setSelectedTags] = useState<string[]>(initialNote?.tags ?? []);

  function toggleTag(tag: string) {
    setSelectedTags((current) => (current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]));
  }

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed, selectedTags);
    setText("");
    setSelectedTags([]);
  }

  return (
    <div className={styles.composer}>
      <textarea
        className={styles.textarea}
        placeholder={`Add a note about ${sectionLabel.toLowerCase()}...`}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className={styles.composerFooter}>
        <div className={styles.tagPickerRow}>
          <span className={styles.tagPickerLabel}>Quick Tag</span>
          <div className={styles.tagOptionsRow}>
            {tagVocabulary.map((tag) => {
              const selected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  className={[styles.tagOption, selected ? styles.tagOptionSelected : ""].filter(Boolean).join(" ")}
                  aria-pressed={selected}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.composerActions}>
          <button type="button" className={styles.addNoteButton} onClick={handleSubmit} disabled={text.trim().length === 0}>
            {initialNote ? "Save Note" : "Add Note"}
          </button>
          {onCancelEdit && (
            <button type="button" className={styles.cancelEditButton} onClick={onCancelEdit}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
