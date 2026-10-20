// src/settings/SettingsHome.tsx — the pieces of the Settings home (mw-3ased2.1): the search field pinned at the top, a group's button and the rows the search found.
// src/SettingsScreen.tsx draws them; docs/layout/settings.md.
import { openSetting, openSettingsGroup, openSettingsSection, settingLink } from './link';
import { groupOf, type GroupId, type SettingsRow } from './rows';

/** The search field at the top: it filters the rows by name and hint as he types. It is pinned under the header (sticky), so it is in view however far he scrolls (mw-5r3p30.617). */
export function SettingsSearch({ query, onChange }: { query: string; onChange: (query: string) => void }) {
  return (
    <div className="sticky top-0 z-10 -mx-4 bg-canvas px-4 pb-2 pt-3">
      <input
        type="search"
        value={query}
        placeholder="Search settings"
        aria-label="Search settings"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        onChange={(e) => onChange(e.target.value)}
        className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-base text-fg"
      />
    </div>
  );
}

/** One group on the home: a thumb-sized button that opens its page. */
export function GroupButton({ id, title, hint }: { id: GroupId; title: string; hint: string }) {
  return (
    <li>
      <button
        type="button"
        data-group={id}
        onClick={() => openSettingsGroup(id)}
        className="flex min-h-12 w-full items-center gap-3 border-b border-line py-4 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-semibold">{title}</span>
          <span className="block text-base text-muted">{hint}</span>
        </span>
        <span aria-hidden="true" className="shrink-0 text-2xl text-muted">
          ›
        </span>
      </button>
    </li>
  );
}

/** Opens a row found by the search on its page: at the row when it has a link, else at its section. */
function openFound(row: SettingsRow): void {
  if (settingLink(row.key)) openSetting(row.key);
  else openSettingsSection(row.section);
}

/** What the search found: each row with the group it is in; choosing one opens its page at that row. */
export function Found({ rows, query }: { rows: readonly SettingsRow[]; query: string }) {
  if (rows.length === 0)
    return (
      <p role="status" className="py-4 text-base text-muted">
        Nothing in Settings matches “{query.trim()}”.
      </p>
    );
  return (
    <ul aria-label="Matching settings">
      {rows.map((row) => (
        <li key={row.key}>
          <button type="button" data-found={row.key} onClick={() => openFound(row)} className="block min-h-12 w-full border-b border-line py-3 text-left">
            <span className="block text-lg font-medium">{row.label}</span>
            <span className="block text-base text-muted">{row.hint}</span>
            <span className="block text-base text-accent">in {groupOf(row.section).title}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
