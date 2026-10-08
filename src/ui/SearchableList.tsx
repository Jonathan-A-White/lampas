// src/ui/SearchableList.tsx — the one widget for a long list of tick choices (lexicons, voices, books, words): a search field on top that
// filters as he types, the ticked items first, and a bounded box that scrolls on its own, so the rest of the screen stays in reach.
// The vault's rule: 'A long list is a widget, not a page of rows' (pwa-best-practices 08). Use it for any list longer than about seven.
import { useState } from 'react';
import { matching, tickedFirst, type ListItem } from './listFilter';

type Props = {
  /** Names the group and, as 'Search <label>', the field. */
  label: string;
  hint?: string;
  /** What one item is called, for the empty search: 'No <noun> matches'. */
  noun: string;
  items: readonly ListItem[];
  ticked: readonly string[];
  onToggle: (id: string) => void;
};

/** The ticked items lead the list. They are put first when the list opens and when the search changes, not as he ticks: a row that jumps
 *  from under his thumb makes the next tap land on the wrong one. */
export function SearchableList({ label, hint, noun, items, ticked, onToggle }: Props) {
  const [query, setQuery] = useState('');
  const [first, setFirst] = useState<ReadonlySet<string>>(() => new Set(ticked));
  const shown = tickedFirst(matching(items, query), first);
  const hintId = `${label.replace(/\s+/g, '-').toLowerCase()}-hint`;
  return (
    <div role="group" aria-label={label} className="mt-2">
      <p className="text-base font-medium">{label}</p>
      {hint ? (
        <p id={hintId} className="pb-1 text-sm text-muted">
          {hint}
        </p>
      ) : null}
      <input
        type="search"
        value={query}
        placeholder={`Search ${items.length} ${noun}s`}
        aria-label={`Search ${label}`}
        aria-describedby={hint ? hintId : undefined}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        onChange={(e) => {
          setQuery(e.target.value);
          setFirst(new Set(ticked));
        }}
        className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-base text-fg"
      />
      <p className="pt-1 text-sm text-muted" aria-live="polite">
        {ticked.length} ticked
        {query.trim() !== '' ? ` · ${shown.length} of ${items.length} shown` : ''}
      </p>
      <div data-testid="searchable-list-box" className="mt-1 max-h-64 overflow-y-auto overscroll-contain rounded-lg border border-line">
        {shown.length === 0 ? <p className="px-3 py-3 text-base text-muted">No {noun} matches</p> : null}
        {shown.map((item) => {
          const on = ticked.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => onToggle(item.id)}
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
