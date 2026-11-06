// src/ToolsScreen.tsx — Tools (#/tools, mw-5r3p30.754): the things that work on the Bible without being the Bible (his words of 2026-10-24): his Logos library, Verse lists, Memorize, Paradigms, Words and
// Review. They were rows of Settings; they are a place of their own now, one tap from the Reader's Menu. Each is a door to the screen it always opened (src/tools.ts), and Back from that screen returns here.
// The doors are the rows TOOL_ROWS of src/settings/rows.ts: the same dials and the Logos switch hide them as they did in Settings. docs/layout/settings.md 'Tools'.
import { useLiveQuery } from 'dexie-react-hooks';
import { verseListCount } from './data/repositories';
import { countDueVerses } from './data/repositories/memorize';
import { countsOf } from './library/kinds';
import { useShelf } from './library/useShelf';
import { backTo } from './nav/route';
import { KINDS } from './resources/catalogue';
import { HeaderButton, ScreenHeader } from './ScreenHeader';
import { readValues, visibleToolRows } from './settings/rows';
import { openTool } from './tools';
import { useReportScreen } from './tutor/screenContext';

/** The line under a door's name: what the tool holds now where that is known, else what the tool is for. */
function useDetails(): Record<string, string | undefined> {
  const states = useShelf();
  const lists = useLiveQuery(verseListCount, []);
  const due = useLiveQuery(() => countDueVerses(), []);
  const on = states === undefined ? undefined : KINDS.reduce((sum, kind) => sum + countsOf(kind, states).on, 0);
  return {
    library: on === undefined ? undefined : `${on} ${on === 1 ? 'book' : 'books'} on`,
    'link.lists': lists === undefined ? undefined : lists === 0 ? 'none yet' : `${lists} ${lists === 1 ? 'list' : 'lists'}`,
    'link.memorize': due === undefined ? undefined : due === 0 ? 'nothing due' : `${due} due`,
  };
}

export function ToolsScreen() {
  const values = useLiveQuery(readValues, []);
  const details = useDetails();
  const rows = values ? visibleToolRows(values, '') : [];
  useReportScreen({ name: 'Tools', facts: rows.map((r) => ({ label: r.label, value: details[r.key] ?? r.hint })) });
  return (
    <>
      <ScreenHeader title="Tools" back={<HeaderButton onClick={() => backTo('home')}>‹ Reader</HeaderButton>} />
      <main className="screen min-h-0 flex-1 px-4">
        <p className="pt-3 text-base text-muted">What you use on the Bible, beside the Bible itself.</p>
        <ul aria-label="Tools" className="mt-3 divide-y divide-line rounded-lg border border-line">
          {rows.map((row) => (
            <li key={row.key}>
              <button type="button" data-tool={row.key} onClick={() => openTool(row.key)} className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left">
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span data-tool-name className="text-base font-medium">
                      {row.label}
                    </span>
                    {details[row.key] ? <span className="shrink-0 text-base text-muted">{details[row.key]}</span> : null}
                  </span>
                  <span className="block text-base text-muted">{row.hint}</span>
                </span>
                <span aria-hidden="true" className="shrink-0 text-muted">
                  ›
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="h-[var(--lp-end-inset)]" aria-hidden="true" />
      </main>
    </>
  );
}
