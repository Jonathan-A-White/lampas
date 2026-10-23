// src/library/LibraryScreen.tsx — Your Logos library (#/library, docs/design/library-at-scale.md 3.3): a card that says how many of the books Lampas can open are on, a search over every
// book's title, author and series, and seven rows, one for each kind, with their counts from his shelf. A kind's row opens its page (src/library/KindPage.tsx, #/library?kind=lexicon);
// a search result opens the page at the book. The address picks the page: a kind it does not know is the home.
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { importNote } from '../data/repositories';
import { backTo, libraryOf, openLibrary, useAddress } from '../nav/route';
import { CATALOGUE, entryOf, KINDS, type CatalogueEntry } from '../resources/catalogue';
import { HeaderButton, ScreenHeader } from '../ScreenHeader';
import { SCREEN_NAMES } from '../tutor/screen';
import { useReportScreen } from '../tutor/screenContext';
import { matching } from '../ui/listFilter';
import { ImportLibrary } from './ImportLibrary';
import { KindPage } from './KindPage';
import { countLine, countsOf, infoOf, KIND_INFO, STATE_LABEL } from './kinds';
import { useShelf } from './useShelf';

/** The most results the search shows at once; the line under the field says when more match. */
const MAX_RESULTS = 50;

const ITEMS = CATALOGUE.map((e) => ({ id: e.resource, name: e.short, also: [e.title, e.author, e.series].filter(Boolean).join(' ') }));
/** The day an import was made, as the card says it: '8 Oct'. */
const importedOn = (at: number): string => new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const BUTTON = 'min-h-12 rounded-lg border border-line px-4 text-base font-medium';

export function LibraryScreen() {
  const { kind, book, import: importing } = libraryOf(useAddress());
  if (importing) return <ImportLibrary />;
  const known = KINDS.find((k) => k === kind);
  return known ? <KindPage kind={known} book={book} /> : <LibraryHome />;
}

function LibraryHome() {
  const states = useShelf();
  const note = useLiveQuery(async () => (await importNote()) ?? null, []);
  const [query, setQuery] = useState('');
  const on = KINDS.reduce((sum, kind) => sum + (states ? countsOf(kind, states).on : 0), 0);
  const searching = query.trim() !== '';
  const found = searching ? matching(ITEMS, query) : [];
  const results = found.slice(0, MAX_RESULTS).map((item) => entryOf(item.id)!);
  useReportScreen({
    name: SCREEN_NAMES.library,
    facts: states ? KIND_INFO.map((i) => ({ label: i.plural, value: countLine(i.kind, states) })) : [],
  });
  return (
    <>
      <ScreenHeader title={SCREEN_NAMES.library} back={<HeaderButton onClick={() => backTo('settings')}>‹ Settings</HeaderButton>} />
      <main className="screen min-h-0 flex-1 px-4">
        <section data-testid="library-card" className="mt-3 rounded-xl border border-line bg-surface p-3">
          {states === undefined ? null : on > 0 || note ? (
            <>
              <p className="text-base">
                {on} of the {CATALOGUE.length} books Lampas can open are on.
              </p>
              {note ? (
                <p data-testid="import-line" className="mt-1 text-base text-muted">
                  Imported {importedOn(note.at)} from a list of {note.books.toLocaleString('en')} books{note.newSince > 0 ? ` · ${note.newSince} new since` : ''}.
                </p>
              ) : null}
              <button type="button" className={`${BUTTON} mt-2`} onClick={() => openLibrary({ import: true })}>
                {note ? 'Import again' : 'Import'}
              </button>
            </>
          ) : (
            <>
              <p className="text-base">
                Lampas opens a Logos library&rsquo;s lexicons, grammars, Greek texts, interlinears, commentaries, Bibles and devotionals. Import your list, or tick the ones you own.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className={BUTTON} onClick={() => openLibrary({ import: true })}>
                  Import
                </button>
                <button type="button" className={BUTTON} onClick={() => openLibrary({ kind: 'lexicon' })}>
                  Tick by hand
                </button>
              </div>
            </>
          )}
        </section>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your books"
          aria-label="Search your books"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          className="mt-3 min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-base text-fg"
        />
        {searching ? (
          <Results results={results} found={found.length} states={states} />
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
            {KIND_INFO.map((info) => (
              <li key={info.kind} data-testid="kind-row" data-label={info.plural}>
                <button type="button" onClick={() => openLibrary({ kind: info.kind })} className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left text-base">
                  <span className="min-w-0 flex-1 font-medium">{info.plural}</span>{' '}
                  <span data-testid="kind-count" className="shrink-0 text-muted">
                    {states ? countLine(info.kind, states) : ''}
                  </span>{' '}
                  <span aria-hidden="true" className="shrink-0 text-muted">
                    ›
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

function Results({ results, found, states }: { results: CatalogueEntry[]; found: number; states: ReturnType<typeof useShelf> }) {
  if (found === 0) return <p className="pt-3 text-base text-muted">No book matches</p>;
  return (
    <>
      <p className="pt-3 text-sm text-muted" aria-live="polite">
        {found > MAX_RESULTS ? `${MAX_RESULTS} of ${found} shown: type more to narrow them` : `${found} ${found === 1 ? 'book' : 'books'}`}
      </p>
      <ul data-testid="library-results" className="mt-1 divide-y divide-line rounded-lg border border-line">
        {results.map((entry) => (
          <li key={entry.resource}>
            <button
              type="button"
              onClick={() => openLibrary({ kind: entry.kind, book: entry.resource })}
              className="flex min-h-12 w-full flex-col items-start justify-center px-3 py-2 text-left text-base"
            >
              <span data-testid="result-title" className="title-wrap font-medium">
                {entry.short}
              </span>
              <span className="text-sm text-muted">
                {infoOf(entry.kind).singular} · {entry.kind === 'bible' && states?.get(entry.resource) === 'on' ? 'Chosen' : STATE_LABEL[states?.get(entry.resource) ?? 'off']}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
