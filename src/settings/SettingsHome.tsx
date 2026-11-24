// src/settings/SettingsHome.tsx — the pieces of the Settings home (mw-3ased2.1): the search field pinned at the top, a group's button, a door's button (mw-6ww.175.87) and the rows the search found (a door among them, mw-6ww.175.103).
// The search field, the group button and the found rows are the kit's (pwa-kit/settings; its look is themed in src/index.css, 'Settings home'); what is here is Lampas's:
// where a tap goes, and the long lists the search answers as one row each beside the settings (mw-qtu3zvz.281). src/SettingsScreen.tsx draws them; docs/layout/settings.md.
import { Found as FoundRows, GroupButton as KitGroupButton, SettingsSearch } from 'pwa-kit/settings';
import { openLibrary } from '../nav/route';
import { openTool } from '../tools';
import { openDoor, openFoundRow, openSermonSources, openSettingsGroup } from './link';
import { keepHomeSearch } from './useHomeSearch';
import type { ListMatches } from './useListMatches';
import { GROUPS, HOME_SECTIONS, type GroupId, type HomeDoor, type SettingsRow } from './rows';

/** The search field at the top: it filters the rows by name and hint as he types. It is pinned under the header (sticky), so it is in view however far he scrolls (mw-5r3p30.617). */
export { SettingsSearch };

/** One group on the home: a thumb-sized button that opens its page. */
export function GroupButton({ id, title, hint }: { id: GroupId; title: string; hint: string }) {
  return <KitGroupButton id={id} title={title} hint={hint} onOpen={openSettingsGroup} />;
}

/** A row of the home that is no group (What Lampas has counted, rows.ts COUNTED_DOOR): drawn as the kit draws a group's button (its classes: title, hint, chevron) but marked data-door, not data-group, since it is no group. */
export function DoorButton({ id, title, hint, link }: { id: string; title: string; hint: string; link: string }) {
  return (
    <li>
      <button type="button" data-door={id} onClick={() => openDoor(link)} className="bk-settings__group">
        <span className="bk-settings__group-text">
          <span className="bk-settings__group-title">{title}</span>
          <span className="bk-settings__group-hint">{hint}</span>
        </span>
        <span aria-hidden="true" className="bk-settings__chevron">
          ›
        </span>
      </button>
    </li>
  );
}

/** Opens a row found by the search on its page, at the row, scrolled to and marked: a setting, the library door and a row that is no setting alike (mw-5r3p30.877). */
function openFound(row: SettingsRow): void {
  openFoundRow(row.key);
}

/** What the search found, in layers (mw-qtu3zvz.281): first the settings, the doors of the home and the Tools that match, each with where it is (a setting with the group it is in; a door of the home, What Lampas has
 *  counted, rows.ts foundDoors, 'in Settings'; a tool, moved out of Settings to the Tools screen, mw-5r3p30.754, 'in Tools'); choosing one opens its page at that row. Then each long list that has matches (the sermon
 *  sources, the books of his library) as ONE row saying how many match, which opens the list filtered to the search: the next layer down. No member of a list is listed here one by one. */
export function Found({
  rows,
  doors,
  tools,
  lists,
  query,
}: {
  rows: readonly SettingsRow[];
  doors: readonly HomeDoor[];
  tools: readonly SettingsRow[];
  lists: ListMatches;
  query: string;
}) {
  // with nothing found among any, the kit's list says so
  if (rows.length === 0 && doors.length === 0 && tools.length === 0 && lists.sermons === 0 && lists.library === 0) return <FoundRows rows={rows} query={query} groups={GROUPS} homeSections={HOME_SECTIONS} onOpen={openFound} />;
  return (
    <>
      {rows.length > 0 ? <FoundRows rows={rows} query={query} groups={GROUPS} homeSections={HOME_SECTIONS} onOpen={openFound} /> : null}
      {doors.length > 0 ? <FoundDoors doors={doors} /> : null}
      {tools.length > 0 ? <FoundTools tools={tools} /> : null}
      {lists.sermons > 0 || lists.library > 0 ? <FoundLists lists={lists} query={query} /> : null}
    </>
  );
}
/** The doors of the home that hold the search (What Lampas has counted, mw-6ww.175.103), drawn as the kit draws a found setting (its classes) but saying 'in Settings', since a door is in no group:
 *  it is a row of the Settings home itself. A tap opens the door's own page (its `link`), as its row of the home does. */
function FoundDoors({ doors }: { doors: readonly HomeDoor[] }) {
  return (
    <ul aria-label="Matching pages" className="bk-settings__list">
      {doors.map((door) => (
        <li key={door.id}>
          <button type="button" data-found={door.id} onClick={() => openDoor(door.link)} className="bk-settings__found">
            <span className="bk-settings__found-label">{door.title}</span>
            <span className="bk-settings__found-hint">{door.hint}</span>
            <span className="bk-settings__found-where">in Settings</span>
          </button>
        </li>
      ))}
    </ul>
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

/** The long lists that hold the search, each ONE row: 'Sermon sources · 14 match ›' (opens the list of sermon sources filtered to the search, the page's own back arrow bringing him back to the search) and 'Books of your
 *  library · 3 match ›' (opens the Library filtered). The count is what the opened page then shows (useListMatches). A list of 3 or fewer is not spread under its row: the row is one tap from them, and a search that
 *  names one source then reads the same as one that names forty (mw-qtu3zvz.281, PROVISIONAL, the Governor to confirm). */
function FoundLists({ lists, query }: { lists: ListMatches; query: string }) {
  const row = (list: 'sermons' | 'library', title: string, count: number, open: () => void) => (
    <li key={list}>
      <button type="button" data-found-list={list} onClick={open} className="flex min-h-12 w-full items-center gap-3 border-b border-line py-3 text-left">
        <span className="min-w-0 flex-1 text-lg font-medium">{`${title} · ${count} match`}</span>
        <span aria-hidden="true" className="shrink-0 text-accent">
          ›
        </span>
      </button>
    </li>
  );
  return (
    <ul aria-label="Matching lists">
      {lists.sermons > 0 ? row('sermons', 'Sermon sources', lists.sermons, () => openSermonSources(undefined, query.trim())) : null}
      {lists.library > 0 ? row('library', 'Books of your library', lists.library, () => {
        // the Library is outside Settings: the entry keeps the search so that Back finds it as he left it
        keepHomeSearch(query);
        openLibrary({ search: query.trim() });
      }) : null}
    </ul>
  );
}
