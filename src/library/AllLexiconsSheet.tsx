// src/library/AllLexiconsSheet.tsx — 'All N lexicons' (docs/design/library-at-scale.md 3.5, mw-rfjjzd.8): the sheet the word sheet's Study row opens when more lexicons are On than the row draws.
// A search field, then every lexicon that is On as a full-width row that opens the word's entry in it (the pinned ones first, as the row drew them), and Manage at the foot, which opens the
// Lexicons page of the Library. A direct role=dialog child of its own .fixed.inset-0 overlay (rig decision mw-5r3p30.636), over the word sheet; Back, Done, Escape and a tap outside close it.
import { useState } from 'react';
import { greekLang } from '../script/greekLang';
import { armFallback } from '../resources/openApp';
import type { LexiconEntry } from '../resources/logos';
import { focusOnMount } from '../ui/focus';
import { matching } from '../ui/listFilter';
import { useEscapeToClose } from '../ui/sheetDrag';
import { useSheetBack } from '../ui/sheetBack';

interface Props {
  /** the word the rows open, as the word sheet names it (its lemma) */
  word: string;
  /** every lexicon On that has an entry for the word, the pinned ones first */
  entries: readonly (LexiconEntry & { pinned: boolean })[];
  onClose: () => void;
  /** a row's app did not open: the word sheet then says Logos is not on the phone */
  onMissing: () => void;
  /** Manage was tapped: open the Lexicons page of the Library */
  onManage: () => void;
}

export function AllLexiconsSheet({ word, entries, onClose, onMissing, onManage }: Props) {
  const [query, setQuery] = useState('');
  useEscapeToClose(onClose);
  useSheetBack(onClose);
  const shown = matching(
    entries.map((e) => ({ id: e.id, name: e.link.tile ?? e.name, also: e.name })),
    query,
  ).map((item) => entries.find((e) => e.id === item.id)!);
  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div data-testid="all-lexicons-backdrop" aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div role="dialog" aria-modal="true" aria-label="All lexicons" className="relative flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-line bg-surface">
        <div className="flex min-h-12 shrink-0 items-center justify-between gap-2 px-4 pt-2">
          <h2 className="min-w-0 text-xl font-bold">{`All ${entries.length} lexicons`}</h2>
          <button type="button" ref={focusOnMount} onClick={onClose} className="min-h-11 min-w-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent">
            Done
          </button>
        </div>
        <div className="shrink-0 px-4 pt-1">
          <input
            type="search"
            value={query}
            placeholder={`Search ${entries.length} lexicons`}
            aria-label="Search lexicons"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            onChange={(e) => setQuery(e.target.value)}
            className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-base text-fg"
          />
          <p className="pt-1 text-sm text-muted" aria-live="polite">
            {query.trim() === '' ? 'Each opens ' : `${shown.length} of ${entries.length} shown · each opens `}
            <span {...greekLang(true)} className="font-greek">{word}</span>
          </p>
        </div>
        <div data-testid="all-lexicons-list" className="mx-4 mt-1 min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-lg border border-line">
          {shown.length === 0 ? <p className="px-3 py-3 text-base text-muted">No lexicon matches</p> : null}
          {shown.map(({ id, link, pinned }) => (
            <a
              key={id}
              href={link.url}
              data-lexicon={link.tile}
              data-fallback={link.fallback}
              aria-label={`${link.label} for ${word}`}
              onClick={() => armFallback(link.fallback, undefined, onMissing)}
              {...(link.url.startsWith('https:') ? { target: '_blank', rel: 'noreferrer' } : {})}
              className="flex min-h-12 w-full flex-col justify-center border-t border-line px-3 py-1 text-left first:border-t-0 active:bg-line"
            >
              <span className="title-wrap text-base font-medium text-accent">{link.tile}</span>
              <span className="text-sm text-muted">
                {pinned ? 'Pinned · opens ' : 'Opens '}<span {...greekLang(true)} className="font-greek">{word}</span>
              </span>
            </a>
          ))}
        </div>
        <div className="shrink-0 px-4 pb-[calc(0.5rem+var(--lp-end-inset))] pt-2">
          <button type="button" onClick={onManage} className="min-h-12 w-full rounded-xl border border-line text-base font-medium text-accent active:bg-line">
            Manage
          </button>
        </div>
      </div>
    </div>
  );
}
