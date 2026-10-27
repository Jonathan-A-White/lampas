// src/RequestsScreen.tsx — Your requests (mw-vy3ghg.5, #/requests, reached from Settings > More and from About): every request he sent to the
// factory, the newest first, each with where it stands: Sent, Filed, Being built, Adopted in <version> (a link to the commit), Declined: <reason>
// or Now a setting: <name>, each worded with the date it was set (src/data/requestWording.ts; a filed one older than 7 days adds 'Still in the queue'). The backend pushes nothing for a grist, so while the screen is up it pulls the mill's request-status records
// (src/services/requestStatus.ts) when it opens, every requestTimings.pollMs and at once when the phone shows the app again (never while it is
// hidden: pwa-kit/requests' watchStatuses, whose statusLine words the search's view of a status, as the tutor's lines, and webLink links a landed row); the list is a live query, so a record shows as it is applied.
// The list is drawn here, not by the kit's RequestsList: every request is a button that opens it in full and folds it again (mw-5r3p30.794).
// At scale (mw-rfjjzd.15): the rows are grouped by kind, each group headed by its plural name and its count ('Books (14)', the header WordsScreen's lesson groups
// use), the newest first within a group and the group holding the newest request first; a library request is one row (its text counts the books); over 20 rows a
// search field filters them by the words he types (listFilter's matching, one word at a time, all of them needed), and the headers count what is shown.
// A status filter (mw-5r3p30.795), chips above the groups whenever there is a row: All, Waiting (sent, filed, building), Adopted (landed, adopted as a setting)
// and Declined, each with its count; the chip is kept while the screen is open, the search works within it, and a chip with no rows says so.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { statusLine, watchStatuses, webLink } from 'pwa-kit/requests';
import { FILTERS, filterOf, type StatusFilter } from './data/requestFilter';
import { sentOn, statusWording, stillInQueue } from './data/requestWording';
import { listRequests, recordOf, type RequestRow } from './data/repositories/requests';
import { backTo, requestsOf, useAddress } from './nav/route';
import { matching, type ListItem } from './ui/listFilter';
import { Chips } from './ui/Chips';
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

const NOTHING: Record<StatusFilter, string> = { all: 'Nothing sent yet', waiting: 'Nothing waiting', adopted: 'Nothing adopted', declined: 'Nothing declined' };

const inFilter = (rows: readonly RequestRow[], filter: StatusFilter): RequestRow[] => (filter === 'all' ? [...rows] : rows.filter((row) => filterOf(row.status) === filter));

const wordsOf = (row: RequestRow): string => row.summary ?? row.text ?? 'A request';

/** The line a request shows: his own words when the phone kept them (a tutor-ask since mw-5r3p30.794), else the summary or the text kept. */
const lineOf = (row: RequestRow): string => row.words ?? wordsOf(row);

/** The rows that hold every word typed, in his words, the summary, the kind's name or the status's word (the kit's statusLine: no date, so a digit he types never matches one); all of them for an empty search. */
function found(rows: readonly RequestRow[], query: string): RequestRow[] {
  const items = rows.map((row) => ({ id: row.txid, name: lineOf(row), also: `${row.summary ?? ''} ${KIND_NAMES[row.kind] ?? ''} ${statusLine(recordOf(row))}` }));
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

/** A request, folded to three lines of its words; the row is a button, a tap opens it in place (his words, the tutor's summary when it is another thing,
 * the date the status was set, the bead, the version it shipped in) and a second tap folds it. The landed link sits beside the button, not in it. */
function Request({ row, now }: { row: RequestRow; now: number }) {
  const [open, setOpen] = useState(false);
  const record = recordOf(row);
  const status = statusWording(record);
  const queued = stillInQueue(record, now);
  const link = row.status === 'landed' ? webLink(row.url) : undefined;
  const shown = lineOf(row);
  const summary = row.summary !== undefined && row.summary !== shown ? row.summary : undefined;
  const detailId = `request-detail-${row.txid}`;
  return (
    <li data-request className="border-b border-line py-3">
      <button
        type="button"
        data-request-toggle
        aria-expanded={open}
        aria-controls={open ? detailId : undefined}
        onClick={() => setOpen((was) => !was)}
        className="block min-h-11 w-full text-left"
      >
        <span data-request-words className={`break-words text-lg ${open ? 'block' : 'line-clamp-3'}`}>
          {shown}
        </span>
        <span data-request-sent className="block pt-1 text-sm text-muted">
          {KIND_NAMES[row.kind] ?? 'Request'} · {sentOn(row.sentAt)}
          {row.pictures ? ` · ${row.pictures === 1 ? '1 picture' : `${row.pictures} pictures`}` : ''}
        </span>
        {link ? null : (
          <span data-request-status className="block pt-1 text-lg font-semibold">
            {status}
          </span>
        )}
      </button>
      {link ? (
        <p data-request-status className="pt-1 text-lg font-semibold">
          <a href={link} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-accent underline">
            {status}
          </a>
        </p>
      ) : null}
      {queued ? (
        <p data-request-queue className="text-sm text-muted">
          Still in the queue
        </p>
      ) : null}
      {open ? (
        <dl id={detailId} data-request-detail className="pt-2 text-base">
          {summary !== undefined ? <Detail label="The tutor's summary">{summary}</Detail> : null}
          {row.statusAt !== undefined ? <Detail label="Status set">{sentOn(row.statusAt)}</Detail> : null}
          {row.bead ? <Detail label="Bead">{row.bead}</Detail> : null}
          {row.version ? <Detail label="Shipped in">{row.version}</Detail> : null}
        </dl>
      ) : null}
    </li>
  );
}

function Detail({ label, children }: { label: string; children: string }) {
  return (
    <div className="pt-1">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  );
}

/** The status chips, the search field (over SEARCH_OVER rows in the chip) and the groups of the rows that match it. */
function RequestGroups({ rows, query, onQuery, now }: { rows: readonly RequestRow[]; query: string; onQuery: (q: string) => void; now: number }) {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const counts = Object.fromEntries(FILTERS.map(([value]) => [value, inFilter(rows, value).length])) as Record<StatusFilter, number>;
  const inChip = inFilter(rows, filter);
  const searching = rows.length > SEARCH_OVER;
  const shown = searching ? found(inChip, query) : inChip;
  const asking = searching && query.trim() !== '';
  return (
    <>
      <div className="pb-2">
        <Chips name="Status" current={filter} options={FILTERS.map(([value, label]) => [value, `${label} (${counts[value]})`] as const)} onChoose={(next) => setFilter(next as StatusFilter)} />
      </div>
      {searching ? (
        <div className="pb-2">
          <input
            type="search"
            value={query}
            placeholder={`Search ${inChip.length} requests`}
            aria-label="Search your requests"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            onChange={(e) => onQuery(e.target.value)}
            className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-base text-fg"
          />
          <p className="pt-1 text-sm text-muted" aria-live="polite">
            {asking ? `${shown.length} of ${inChip.length} shown` : `${inChip.length} requests`}
          </p>
        </div>
      ) : null}
      {inChip.length === 0 ? <p className="py-3 text-base text-muted">{NOTHING[filter]}</p> : shown.length === 0 ? <p className="py-3 text-base text-muted">No request matches</p> : null}
      {grouped(shown).map((group) => (
        <section key={group.kind} data-request-group={group.kind} aria-labelledby={`requests-${group.kind}`} className="pt-3">
          <h2 id={`requests-${group.kind}`} className="px-1 pb-1 text-sm font-semibold uppercase tracking-wide text-muted">
            {group.name} ({group.rows.length})
          </h2>
          <ul aria-label={group.name}>
            {group.rows.map((row) => (
              <Request key={row.txid} row={row} now={now} />
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
  const [now] = useState(() => Date.now()); // when the screen opened: what 'Still in the queue' is measured at
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
            <RequestGroups rows={requests} query={query} onQuery={setQuery} now={now} />
          )}
        </div>
      </main>
    </>
  );
}
