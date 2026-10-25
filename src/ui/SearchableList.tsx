// src/ui/SearchableList.tsx — the one widget for a long list of tick choices (lexicons, voices, books, words): a search field on top that
// filters as he types, the ticked items first, and a bounded box that scrolls on its own, so the rest of the screen stays in reach.
// The vault's rule: 'A long list is a widget, not a page of rows' (pwa-best-practices 08). Use it for any list longer than about seven.
// Grown for the Library (mw-rfjjzd.4): `row` draws a row with a state control in place of the tick, `rankOf` orders more than two groups (pinned, on, off), `status` is the count
// line, `flat` lets the list be as long as the page's own box (the field then stays at the box's top) and `focus` marks one book and brings it into view.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { oneTap } from './settle';
import { matching, pluralOf, ranked, type ListItem } from './listFilter';

type Props = {
  /** Names the group and, as 'Search <label>', the field. */
  label: string;
  hint?: string;
  /** What one item is called, in the singular: 'No <noun> matches' for the empty search, and 'Search 36 <nouns>' (pluralOf) on the field. */
  noun: string;
  items: readonly ListItem[];
  ticked?: readonly string[];
  onToggle?: (id: string) => void;
  /** Draws one row: a control of its own (Off | On | Pin) where the tick would be. `ticked` and `onToggle` are then not used. */
  row?: (item: ListItem) => ReactNode;
  /** The group of an item, the lowest first (default: ticked 0, the rest 1). Asked when the list opens and when the search changes, not as he taps. */
  rankOf?: (id: string) => number;
  /** The line under the field in place of 'N ticked' ('19 on · 2 pinned'). */
  status?: string;
  /** The list is as long as its items and the page's box scrolls it; the field stays at the top of the box. The page names the list already, so there is no label line (the group keeps its name). */
  flat?: boolean;
  /** An item to bring into view and mark (aria-current) when the list opens. */
  focus?: string;
};

/** The ticked items lead the list. They are put first when the list opens and when the search changes, not as he ticks: a row that jumps
 *  from under his thumb makes the next tap land on the wrong one. */
export function SearchableList({ label, hint, noun, items, ticked = [], onToggle, row, rankOf, status, flat, focus }: Props) {
  const [query, setQuery] = useState('');
  const rankNow = (): Map<string, number> => new Map(items.map((i) => [i.id, rankOf ? rankOf(i.id) : ticked.includes(i.id) ? 0 : 1]));
  const [rank, setRank] = useState(rankNow);
  const shown = ranked(matching(items, query), rank);
  const marked = useRef<HTMLElement | null>(null);
  useEffect(() => {
    marked.current?.scrollIntoView?.({ block: 'center' });
  }, [focus]);
  const hintId = `${label.replace(/\s+/g, '-').toLowerCase()}-hint`;
  return (
    <div role="group" aria-label={label} className="mt-2">
      <div className={flat ? 'sticky top-0 z-10 bg-canvas pb-1' : undefined}>
        {flat ? null : <p className="text-base font-medium">{label}</p>}
        {hint ? (
          <p id={hintId} className="pb-1 text-sm text-muted">
            {hint}
          </p>
        ) : null}
        <input
          type="search"
          value={query}
          placeholder={`Search ${items.length} ${pluralOf(noun, items.length)}`}
          aria-label={`Search ${label}`}
          aria-describedby={hint ? hintId : undefined}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          onChange={(e) => {
            setQuery(e.target.value);
            setRank(rankNow());
          }}
          className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-base text-fg"
        />
        <p className="pt-1 text-sm text-muted" aria-live="polite">
          {status ?? `${ticked.length} ticked`}
          {query.trim() !== '' ? ` · ${shown.length} of ${items.length} shown` : ''}
        </p>
      </div>
      <div data-testid="searchable-list-box" className={`mt-1 rounded-lg border border-line ${flat ? '' : 'max-h-64 overflow-y-auto overscroll-contain'}`}>
        {shown.length === 0 ? <p className="px-3 py-3 text-base text-muted">No {noun} matches</p> : null}
        {shown.map((item) => {
          if (row) {
            return (
              <div
                key={item.id}
                ref={item.id === focus ? (el) => void (marked.current = el) : undefined}
                aria-current={item.id === focus ? 'true' : undefined}
                className="border-t border-line first:border-t-0"
              >
                {row(item)}
              </div>
            );
          }
          const on = ticked.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => oneTap(`${label}:${item.id}`, () => onToggle?.(item.id))}
              className="flex min-h-12 w-full items-center gap-3 border-t border-line px-3 text-left text-base first:border-t-0"
            >
              <span
                aria-hidden="true"
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border border-line ${on ? 'bg-accent text-accent-fg' : ''}`}
              >
                {on ? '✓' : ''}
              </span>
              {item.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
