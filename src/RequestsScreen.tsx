// src/RequestsScreen.tsx — Your requests (mw-vy3ghg.5, #/requests, reached from Settings > More and from About): every request he sent to the
// factory, the newest first, each with where it stands: Sent, Filed, Being built, Adopted in <version> (a link to the commit), Declined: <reason>
// or Now a setting: <name>. The backend pushes nothing for a grist, so while the screen is up it pulls the mill's request-status records
// (src/services/requestStatus.ts) when it opens, every requestTimings.pollMs and at once when the phone shows the app again (never while it is
// hidden: pwa-kit/requests' watchStatuses, whose statusLine and webLink word each row too); the list is a live query, so a record shows as it is applied.
// The list is drawn here, not by the kit's RequestsList: a long request opens and folds on a tap.
// At scale (mw-rfjjzd.15): the rows are grouped by kind, each group headed by its plural name and its count ('Books (14)', the header WordsScreen's lesson groups
// use), the newest first within a group and the group holding the newest request first; a library request is one row (its text counts the books); over 20 rows a
// search field filters them by the words he types (listFilter's matching, one word at a time, all of them needed), and the headers count what is shown.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { statusLine, watchStatuses, webLink } from 'pwa-kit/requests';
import { listRequests, recordOf, type RequestRow } from './data/repositories/requests';
import { backTo, requestsOf, useAddress } from './nav/route';
import { matching, type ListItem } from './ui/listFilter';
import { HeaderButton, ScreenHeader } from './ScreenHeader';
import { getDeviceKeyBytes } from './services/deviceKey';
import { pullStatuses, requestTimings } from './services/requestStatus';

const KIND_NAMES: Record<string, string> = {
  'grammar-approach': 'Grammar approach',
  'tutor-ask': 'Asked the tutor',
  // Ask for a book, and Ask the makers about these (the whole list of an import)
  book: 'Book',
  library: 'Your Logos library',
  // the three forms of Settings > Ask for more
  approach: 'Approach or programme',
  text: 'Text',
  translation: 'Translation',
  // asks of the boxes Ask for a book replaced, still on a phone that sent one
  'grammar-book': 'Grammar book',
  devotional: 'Devotional',
  'study-resource': 'Study resource',
};

/** A group's header, by kind: the plural of KIND_NAMES. */
const GROUP_NAMES: Record<string, string> = {
  'grammar-approach': 'Grammar approaches',
  'tutor-ask': 'Asked the tutor',
  book: 'Books',
  library: 'Your Logos library',
  approach: 'Approaches or programmes',
  text: 'Texts',
  translation: 'Translations',
  'grammar-book': 'Grammar books',
  devotional: 'Devotionals',
  'study-resource': 'Study resources',
};
const OTHER_GROUP = 'Other requests';

/** More rows than this show the search field. */
export const SEARCH_OVER = 20;

const wordsOf = (row: RequestRow): string => row.summary ?? row.text ?? 'A request';

/** The rows that hold every word typed, in the words, the kind's name or the status line; all of them for an empty search. */
function found(rows: readonly RequestRow[], query: string): RequestRow[] {
  const items = rows.map((row) => ({ id: row.txid, name: wordsOf(row), also: `${KIND_NAMES[row.kind] ?? ''} ${statusLine(recordOf(row))}` }));
  let kept: ListItem[] = items;
  for (const word of query.trim().split(/\s+/)) kept = matching(kept, word);
  const ids = new Set(kept.map((i) => i.id));
  return rows.filter((row) => ids.has(row.txid));
}

/** The rows by kind, the newest first within a group (rows come newest first) and the group with the newest row first. */
function grouped(rows: readonly RequestRow[]): { kind: string; name: string; rows: RequestRow[] }[] {
  const groups = new Map<string, { kind: string; name: string; rows: RequestRow[] }>();
  for (const row of rows) {
    const kind = row.kind in GROUP_NAMES ? row.kind : 'other';
    const group = groups.get(kind) ?? { kind, name: GROUP_NAMES[kind] ?? OTHER_GROUP, rows: [] };
    group.rows.push(row);
    groups.set(kind, group);
  }
  return [...groups.values()];
}

const sentOn = (ms: number): string => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/** Pulls the statuses now and then until the screen goes (pwa-kit/requests' watchStatuses: never while the page is hidden, at once when it is shown
 * again, one pull at a time); true while the last pull failed. A pull still on its way when the screen goes writes nothing. */
function useStatusPulling(): boolean {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const stop = new AbortController();
    let mill: string | undefined;
    const unwatch = watchStatuses(
      async () => {
        mill = (await pullStatuses({ key: getDeviceKeyBytes(), signal: stop.signal, mill })).mill;
      },
      { everyMs: requestTimings.pollMs, onResult: (didFail) => !stop.signal.aborted && setFailed(didFail) },
    );
    return () => {
      stop.abort();
      unwatch();
    };
  }, []);
  return failed;
}

/** A request's words, cut at three lines; when the cut hides some, the words are a button that opens them all and folds them again. Whether the
 * cut hides anything is measured (a phone's width and type size decide), at first and whenever the box changes size while it is folded. */
function RequestText({ text }: { text: string }) {
  const box = useRef<HTMLParagraphElement>(null);
  const [cut, setCut] = useState(false);
  const [open, setOpen] = useState(false);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el || open) return;
    const measure = (): void => setCut(el.scrollHeight > el.clientHeight + 1);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    return () => watch.disconnect();
  }, [text, open]);
  const toggle = (): void => setOpen((was) => !was);
  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    toggle();
  };
  const openable = cut || open;
  return (
    <p
      ref={box}
      className={`break-words text-lg ${open ? '' : 'line-clamp-3'} ${openable ? 'cursor-pointer' : ''}`}
      {...(openable ? { role: 'button', tabIndex: 0, 'aria-expanded': open, onClick: toggle, onKeyDown } : {})}
    >
      {text}
    </p>
  );
}

function Request({ row }: { row: RequestRow }) {
  const record = recordOf(row);
  const line = statusLine(record);
  const link = row.status === 'landed' ? webLink(row.url) : undefined;
  return (
    <li data-request className="border-b border-line py-3">
      <RequestText text={wordsOf(row)} />
      <p data-request-sent className="pt-1 text-sm text-muted">
        {KIND_NAMES[row.kind] ?? 'Request'} · {sentOn(row.sentAt)}
      </p>
      <p data-request-status className="pt-1 text-lg font-semibold">
        {link ? (
          <a href={link} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-accent underline">
            {line}
          </a>
        ) : (
          line
        )}
      </p>
    </li>
  );
}

/** The search field (over SEARCH_OVER rows) and the groups of the rows that match it. */
function RequestGroups({ rows, query, onQuery }: { rows: readonly RequestRow[]; query: string; onQuery: (q: string) => void }) {
  const searching = rows.length > SEARCH_OVER;
  const shown = searching ? found(rows, query) : rows;
  const asking = searching && query.trim() !== '';
  return (
    <>
      {searching ? (
        <div className="pb-2">
          <input
            type="search"
            value={query}
            placeholder={`Search ${rows.length} requests`}
            aria-label="Search your requests"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            onChange={(e) => onQuery(e.target.value)}
            className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-base text-fg"
          />
          <p className="pt-1 text-sm text-muted" aria-live="polite">
            {asking ? `${shown.length} of ${rows.length} shown` : `${rows.length} requests`}
          </p>
        </div>
      ) : null}
      {shown.length === 0 ? <p className="py-3 text-base text-muted">No request matches</p> : null}
      {grouped(shown).map((group) => (
        <section key={group.kind} data-request-group={group.kind} aria-labelledby={`requests-${group.kind}`} className="pt-3">
          <h2 id={`requests-${group.kind}`} className="px-1 pb-1 text-sm font-semibold uppercase tracking-wide text-muted">
            {group.name} ({group.rows.length})
          </h2>
          <ul aria-label={group.name}>
            {group.rows.map((row) => (
              <Request key={row.txid} row={row} />
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

export function RequestsScreen() {
  const requests = useLiveQuery(listRequests, []);
  const [query, setQuery] = useState('');
  const failed = useStatusPulling();
  const from = requestsOf(useAddress());
  const back = from === 'about' ? 'About' : 'Settings';
  return (
    <>
      <ScreenHeader title="Your requests" back={<HeaderButton onClick={() => backTo(from)}>‹ {back}</HeaderButton>} />
      <main className="screen min-h-0 flex-1 px-4">
        <div>
          <p className="py-4 text-base text-muted">What became of the things you asked for. The factory tells this phone as each one is filed, built, or answered.</p>
          {failed ? (
            <p role="status" className="pb-3 text-base text-muted">
              Could not check for news just now. This is what the phone has.
            </p>
          ) : null}
          {requests === undefined ? null : requests.length === 0 ? (
            <p data-requests-empty className="py-4 text-lg">
              Nothing sent yet. When you ask for another approach, or the tutor offers to send what it could not do, it is listed here.
            </p>
          ) : (
            <RequestGroups rows={requests} query={query} onQuery={setQuery} />
          )}
        </div>
      </main>
    </>
  );
}
