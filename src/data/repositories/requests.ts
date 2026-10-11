// src/data/repositories/requests.ts — the requests Lampas sent to the factory (src/services/feedback.ts), each kept with its grist id (txid)
// so a status that comes back can be matched to it. A row is written when the mill has the grist, with status 'sent'; a request-status record
// from the mill (Postern's docs/protocol.md section 19, pulled by src/services/requestStatus.ts) moves it on. The cursor of the pulling is kept
// in the settings store ('requestsCursor': a number, no table).
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

/** The statuses a request moves through after 'sent', as the record names them. */
export const REQUEST_STATUSES = ['filed', 'building', 'landed', 'declined', 'adopted-as-setting'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

/** What a request-status record says (protocol section 19), already read: only fields the status carries. */
export interface StatusRecord {
  request: string;
  status: RequestStatus;
  ts: number;
  bead?: string;
  version?: string;
  commit?: string;
  url?: string;
  reason?: string;
  setting?: string;
}

/** The row after `record`: its sent fields, the new status and only what that status carries. */
function moved(row: RequestRow, record: StatusRecord): RequestRow {
  const { txid, kind, summary, text, app_version, sentAt } = row;
  const kept: RequestRow = { txid, kind, app_version, sentAt, status: record.status, statusAt: record.ts };
  if (summary !== undefined) kept.summary = summary;
  if (text !== undefined) kept.text = text;
  if (record.bead !== undefined) kept.bead = record.bead;
  if (record.status === 'landed') {
    if (record.version !== undefined) kept.version = record.version;
    if (record.commit !== undefined) kept.commit = record.commit;
    if (record.url !== undefined) kept.url = record.url;
  }
  if (record.status === 'declined' && record.reason !== undefined) kept.reason = record.reason;
  if (record.status === 'adopted-as-setting' && record.setting !== undefined) kept.setting = record.setting;
  return kept;
}

/** Applies a status record to the request it names. A request this phone does not hold, or a record no newer than the one the row already took,
 * changes nothing (a status per change, the newest by `ts` shown). Returns whether the row changed. */
export function applyRequestStatus(record: StatusRecord): Promise<boolean> {
  return db.transaction('rw', db.requests, async () => {
    const row = await db.requests.get(record.request);
    if (!row) return false;
    if (row.statusAt !== undefined && record.ts <= row.statusAt) return false;
    await db.requests.put(moved(row, record));
    return true;
  });
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
