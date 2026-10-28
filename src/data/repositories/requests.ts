// src/data/repositories/requests.ts — the requests Lampas sent to the factory (src/services/feedback.ts), each kept with its grist id (txid)
// so a status that comes back can be matched to it. A row is written when the mill has the grist, with status 'sent'; a request-status record
// from the mill (Postern's docs/protocol.md section 19, pulled by src/services/requestStatus.ts) moves it on (pwa-kit/requests' applyUpdates decides how; this file is Dexie as its store). The cursor of the pulling is kept
// in the settings store ('requestsCursor': a number, no table).
import { applyUpdates, dayOf, GROWN_UP, REQUEST_STATUSES as KIT_STATUSES, type RequestRecord, type RequestStatus as KitStatus, type RequestStore, type StatusUpdate } from 'pwa-kit/requests';
import { db, type RequestRow } from '../db';

export type { RequestRow };

/** What a sender knows of a request when it goes out; the row adds status 'sent'. */
export type SentRequest = Omit<RequestRow, 'status'>;

/** Keeps `request` as sent. The same txid is one row. */
export async function keepRequest(request: SentRequest): Promise<void> {
  await db.requests.put({ ...request, status: 'sent' });
}

/** Every request kept, the newest first. */
export async function listRequests(): Promise<RequestRow[]> {
  return db.requests.orderBy('sentAt').reverse().toArray();
}

/** The statuses a request moves through after 'sent', as the record names them (pwa-kit/requests' list less 'sent'). */
export const REQUEST_STATUSES = KIT_STATUSES.filter((status): status is RequestStatus => status !== 'sent');
export type RequestStatus = Exclude<KitStatus, 'sent'>;

/** What a request-status record says (protocol section 19), already read: only fields the status carries. It is pwa-kit/requests' StatusUpdate. */
export type StatusRecord = StatusUpdate;

/** What a status record may carry besides its status (the kit's moved() keeps only what each status carries: reason and bead for built-differently and moved too). */
const STATUS_FIELDS = ['bead', 'version', 'commit', 'url', 'reason', 'setting'] as const;

/** The kit's record of a row, for the kit to move on: Lampas keeps no talk or person on a row, so they are the app's one reader's. */
export function recordOf(row: RequestRow): RequestRecord {
  const words = row.words ?? row.text ?? row.summary ?? '';
  const record: RequestRecord = {
    id: row.txid,
    kind: row.kind,
    words,
    summary: row.summary ?? words,
    talkId: '',
    who: GROWN_UP,
    sentAt: row.sentAt,
    day: dayOf(row.sentAt),
    status: row.status as KitStatus,
  };
  if (row.statusAt !== undefined) record.statusAt = row.statusAt;
  for (const field of STATUS_FIELDS) if (row[field] !== undefined) record[field] = row[field];
  return record;
}

/** The row after the kit moved its record: the row's sent fields, the new status and only what that status carries (the kit decides which). */
function rowOf(row: RequestRow, moved: RequestRecord): RequestRow {
  const { txid, kind, summary, words, text, resource, pictures, app_version, sentAt } = row;
  const kept: RequestRow = { txid, kind, app_version, sentAt, status: moved.status, statusAt: moved.statusAt };
  if (summary !== undefined) kept.summary = summary;
  if (words !== undefined) kept.words = words;
  if (text !== undefined) kept.text = text;
  if (resource !== undefined) kept.resource = resource;
  if (pictures !== undefined) kept.pictures = pictures;
  for (const field of STATUS_FIELDS) if (moved[field] !== undefined) kept[field] = moved[field];
  return kept;
}

/** Applies a status record to the request it names. A request this phone does not hold, or a record no newer than the one the row already took,
 * changes nothing (a status per change, the newest by `ts` shown: the kit's applyUpdates). Returns whether the row changed. */
export function applyRequestStatus(record: StatusRecord): Promise<boolean> {
  return db.transaction('rw', db.requests, async () => {
    const row = await db.requests.get(record.request);
    if (!row) return false;
    const { records, changed } = applyUpdates([recordOf(row)], [record]);
    if (changed.length === 0) return false;
    await db.requests.put(rowOf(row, records[0]));
    return true;
  });
}

/** The store pwa-kit/requests files into, over the requests table (Dexie stays the store): `all` is the rows as the kit's records, newest first, with no `words`
 * even though the table keeps his own beside the tutor's summary: the kit's twin check compares words, so with none it never takes a row for the same ask filed
 * twice (a request that failed after its grist went out is sent again on a Retry, never answered as sent); `put` keeps a record the table does not hold yet, as
 * sent (a request already kept with its grist id is left as it is, so a status it took is never undone). */
export function requestStore(appVersion: string): RequestStore {
  return {
    async all() {
      return (await listRequests()).map((row) => ({ ...recordOf(row), words: '' }));
    },
    async put(record) {
      await db.transaction('rw', db.requests, async () => {
        if (await db.requests.get(record.id)) return;
        const what = record.kind === 'tutor-ask' ? { summary: record.summary, words: record.words } : { text: record.words };
        await keepRequest({ txid: record.id, kind: record.kind, ...what, app_version: appVersion, sentAt: record.sentAt });
      });
    },
  };
}

const CURSOR_KEY = 'requestsCursor';

/** Where the last pull of GET /api/messages stopped: the backend's `next`, 0 before the first pull. */
export async function getRequestsCursor(): Promise<number> {
  const row = await db.settings.get(CURSOR_KEY);
  const value = typeof row?.value === 'string' ? Number(row.value) : NaN;
  return Number.isInteger(value) && value > 0 ? value : 0;
}

/** Keeps the cursor; it never goes back. */
export function setRequestsCursor(cursor: number): Promise<void> {
  return db.transaction('rw', db.settings, async () => {
    if (cursor > (await getRequestsCursor())) await db.settings.put({ key: CURSOR_KEY, value: String(cursor) });
  });
}
