// src/settings/SettingsHome.tsx — the pieces of the Settings home (mw-3ased2.1): the search field pinned at the top, a group's button and the rows the search found.
// The search field, the group button and the found rows are the kit's (pwa-kit/settings; its look is themed in src/index.css, 'Settings home'); what is here is Lampas's:
// where a tap goes, and the books of his library the search finds beside the settings. src/SettingsScreen.tsx draws them; docs/layout/settings.md.
import { Found as FoundRows, GroupButton as KitGroupButton, SettingsSearch } from 'pwa-kit/settings';
import { openLibrary } from '../nav/route';
import { openTool } from '../tools';
import { detailOf, infoOf } from '../library/kinds';
import { openFoundRow, openSettingsGroup } from './link';
import type { searchLibrary } from './librarySearch';
import { GROUPS, HOME_SECTIONS, type GroupId, type SettingsRow } from './rows';

/** The search field at the top: it filters the rows by name and hint as he types. It is pinned under the header (sticky), so it is in view however far he scrolls (mw-5r3p30.617). */
export { SettingsSearch };

/** One group on the home: a thumb-sized button that opens its page. */
export function GroupButton({ id, title, hint }: { id: GroupId; title: string; hint: string }) {
  return <KitGroupButton id={id} title={title} hint={hint} onOpen={openSettingsGroup} />;
}

/** Opens a row found by the search on its page, at the row, scrolled to and marked: a setting, the library door and a row that is no setting alike (mw-5r3p30.877). */
function openFound(row: SettingsRow): void {
  openFoundRow(row.key);
}

/** What the search found among the settings, the Tools and the books of his library: each setting with the group it is in; choosing one opens its page at that row. A tool (Words, Verse lists, Your Logos library…
 *  moved out of Settings to the Tools screen, mw-5r3p30.754) is listed 'in Tools' and opens its own screen; a book opens its kind page at it. */
export function Found({ rows, tools, books, query }: { rows: readonly SettingsRow[]; tools: readonly SettingsRow[]; books: ReturnType<typeof searchLibrary>; query: string }) {
  // with nothing found among any, the kit's list says so
  if (rows.length === 0 && tools.length === 0 && books.total === 0) return <FoundRows rows={rows} query={query} groups={GROUPS} homeSections={HOME_SECTIONS} onOpen={openFound} />;
  return (
    <>
      {rows.length > 0 ? <FoundRows rows={rows} query={query} groups={GROUPS} homeSections={HOME_SECTIONS} onOpen={openFound} /> : null}
      {tools.length > 0 ? <FoundTools tools={tools} /> : null}
      {books.total > 0 ? <FoundBooks books={books} /> : null}
    </>
  );
}

/** The Tools that hold the search, drawn as the kit draws a found setting (its classes, themed in src/index.css) but saying 'in Tools'; a tap opens the tool's screen. */
function FoundTools({ tools }: { tools: readonly SettingsRow[] }) {
  return (
    <ul aria-label="Matching tools" className="bk-settings__list">
      {tools.map((row) => (
        <li key={row.key}>
          <button type="button" data-found={row.key} onClick={() => openTool(row.key)} className="bk-settings__found">
            <span className="bk-settings__found-label">{row.label}</span>
            <span className="bk-settings__found-hint">{row.hint}</span>
            <span className="bk-settings__found-where">in Tools</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** The books of his library that hold the search (the `library` source of the search, mw-rfjjzd.5): 'BDAG · Your Logos library', opening the kind page at the book; more than are shown are one tap away in the Library. */
function FoundBooks({ books }: { books: ReturnType<typeof searchLibrary> }) {
  const more = books.total - books.books.length;
  return (
    <ul aria-label="Matching books">
      {books.books.map((entry) => (
        <li key={entry.resource}>
          <button
            type="button"
            data-found-book={entry.resource}
            onClick={() => openLibrary({ kind: entry.kind, book: entry.resource })}
            className="block min-h-12 w-full border-b border-line py-3 text-left"
          >
            <span className="block text-lg font-medium">{`${entry.short} · Your Logos library`}</span>
            <span className="block text-base text-muted">{detailOf(entry)}</span>
            <span className="block text-base text-accent">{`in ${infoOf(entry.kind).plural}`}</span>
          </button>
        </li>
      ))}
      {more > 0 ? (
        <li>
          <button type="button" onClick={() => openLibrary()} className="block min-h-12 w-full border-b border-line py-3 text-left text-base font-medium text-accent">
            {`${more} more ${more === 1 ? 'book' : 'books'} in Your Logos library ›`}
          </button>
        </li>
      ) : null}
    </ul>
  );
}
