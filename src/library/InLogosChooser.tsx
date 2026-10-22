// src/library/InLogosChooser.tsx — the chooser behind "In another book…" (docs/design/library-at-scale.md 3.6, mw-rfjjzd.9): a verse (or a chapter) in the books of his Logos shelf that open at it.
// A sheet of its own (a direct role=dialog child of the layer, below the shell's bars like every sheet): a search field, then Pinned, Commentaries on the book, Greek texts and Interlinears
// (for an Old Testament place, Bibles and Interlinears), each folded to its first three with 'N more'; search opens every group; Manage at the foot goes to the Library. Every row is a
// Logos link (logosRes.ts) and arms the ref.ly fallback the way every Open in Logos does. The rows come from src/library/inLogos.ts; nothing here reads a book's text.
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { openLibrary } from '../nav/route';
import type { CatalogueEntry } from '../resources/catalogue';
import { armFallback } from '../resources/openApp';
import type { StudyPlace } from '../resources/types';
import { afterSheetEntryGone, useSheetBack } from '../ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from '../ui/sheetDrag';
import { detailOf, inLogosGroups, SHOWN_ROWS } from './inLogos';
import { useInLogosRows } from './useInLogosRows';

const ROW = 'flex min-h-12 items-center gap-2 rounded-xl border border-line px-4 py-2 text-left text-base font-medium text-accent active:bg-line';

export interface InLogosChooserProps {
  place: StudyPlace;
  /** the place as it is written: 'Romans 8:31' */
  name: string;
  onClose: () => void;
  /** the books it may name (the catalogue); a test hands it its own */
  entries?: readonly CatalogueEntry[];
}

export function InLogosChooser({ place, name, onClose, entries }: InLogosChooserProps) {
  const rows = useInLogosRows(place, entries);
  const [query, setQuery] = useState('');
  // the groups he unfolded
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());
  const { drag, handle } = useSheetDrag(onClose);
  useEscapeToClose(onClose);
  useSheetBack(onClose);
  const searching = query.trim() !== '';
  const groups = rows ? inLogosGroups(rows, place, query) : [];
  const title = `${name} in Logos`;

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div data-testid="in-logos-backdrop" aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-in-logos-chooser
        style={{ transform: drag ? `translateY(${drag}px)` : undefined }}
        className="relative flex [--lp-panel-max:92dvh] flex-col rounded-t-2xl border-t border-line bg-surface"
      >
        <div data-testid="in-logos-handle" {...handle} className="flex min-h-12 shrink-0 touch-none items-center justify-between gap-3 px-4 pt-2">
          <span aria-hidden="true" className="mx-auto h-1.5 w-10 rounded-full bg-line" />
          <button type="button" onClick={onClose} className="absolute right-2 top-1 min-h-11 min-w-11 rounded-lg px-3 text-base font-medium text-accent">
            Close
          </button>
        </div>
        <h2 className="shrink-0 px-4 pb-2 text-xl font-semibold">{title}</h2>
        <div className="shrink-0 px-4 pb-2">
          <input
            type="search"
            value={query}
            placeholder={`Search ${rows?.length ?? 0} books`}
            aria-label={`Search books for ${name}`}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            onChange={(e) => setQuery(e.target.value)}
            className="min-h-12 w-full rounded-lg border border-line bg-canvas px-3 text-base text-fg"
          />
        </div>
        <div data-testid="in-logos-scroll" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4">
          {rows && groups.length === 0 ? <p role="status" className="py-2 text-base text-muted">{searching ? 'No book matches.' : 'No book of yours opens here.'}</p> : null}
          {groups.map((group) => {
            const folded = searching || opened.has(group.key) ? 0 : Math.max(0, group.rows.length - SHOWN_ROWS);
            return (
              <div key={group.key} role="group" aria-label={group.title} className="pb-3">
                <h3 className="pb-1 text-base font-semibold text-muted">{group.title}</h3>
                <div className="flex flex-col gap-2">
                  {group.rows.slice(0, group.rows.length - folded).map(({ entry, link }) => (
                    <a key={entry.resource} href={link.url} data-fallback={link.fallback} aria-label={`Open ${name} in ${entry.short}`} onClick={() => armFallback(link.fallback)} className={ROW}>
                      <span className="min-w-0 flex-1">
                        <span className="block break-words">{entry.short}</span>
                        {detailOf(entry) ? <span className="block break-words text-sm font-normal text-muted">{detailOf(entry)}</span> : null}
                      </span>
                      <span aria-hidden="true">›</span>
                    </a>
                  ))}
                </div>
                {folded ? (
                  <button type="button" onClick={() => setOpened(new Set([...opened, group.key]))} className="mt-1 min-h-11 px-1 text-base font-medium text-accent underline underline-offset-4">
                    {folded} more
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="shrink-0 border-t border-line px-4 pt-1 pb-[calc(0.5rem+var(--lp-bar-inset))]">
          <button
            type="button"
            onClick={() => {
              onClose();
              afterSheetEntryGone(() => openLibrary());
            }}
            className="min-h-12 w-full rounded-xl px-4 text-base font-medium text-accent active:bg-line"
          >
            Manage in Your Logos library
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
