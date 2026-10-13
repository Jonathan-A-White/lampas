// src/services/requestStatus.ts — what became of the requests he sent: the request-status records the mill seals to this phone (Postern's
// docs/protocol.md section 19, "Request status"). The backend pushes nothing for a grist (section 9, item 6), so the app pulls GET /api/messages?since=
// from a cursor it keeps (src/data/repositories/requests.ts) and applies each record once. A record counts only when it is a grist record from the
// mill to this key, signed (when the backend says who) by the mill and sealed by the mill, whose plaintext is a request-status for a request this
// phone holds; anything else is skipped, and the cursor passes it. bsv-kit's answerIn takes an answer by its `re`; a status has none, so this
// reads the page itself with the same checks.
import { door, vault } from 'bsv-kit/bsv';
import { POSTERN_DOOR } from '../config';
import { MILL_POLL_MS, openCt, requireLicence, sealerOf } from './mill';
import { applyRequestStatus, getRequestsCursor, REQUEST_STATUSES, setRequestsCursor, type RequestStatus, type StatusRecord } from '../data/repositories/requests';

/** The timings, in one object so a test may shorten them. */
export const requestTimings = {
  /** How often the screen pulls while it is up (protocol section 19, "Waiting": every 20 seconds). */
  pollMs: MILL_POLL_MS,
};

/** The most pages one pull reads, so a backend that never stops giving records cannot hold the screen. */
const MAX_PAGES = 50;

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const text = (value: unknown, max: number): string | undefined => (typeof value === 'string' && value.length > 0 ? value.slice(0, max) : undefined);
const isStatus = (value: unknown): value is RequestStatus => (REQUEST_STATUSES as readonly unknown[]).includes(value);

/** The commit link, when it is a web link: nothing else is ever drawn as one. */
function webLink(value: unknown): string | undefined {
  const link = text(value, 300);
  return link !== undefined && /^https:\/\/\S+$/.test(link) ? link : undefined;
}

/** A request-status plaintext, read into only what the app keeps; undefined when it is not one. */
export function readStatus(plain: unknown): StatusRecord | undefined {
  if (!isObject(plain) || plain.kind !== 'request-status') return undefined;
  const request = text(plain.request, 100);
  if (request === undefined || !request.startsWith('direct:') || !isStatus(plain.status)) return undefined;
  if (typeof plain.ts !== 'number' || !Number.isFinite(plain.ts)) return undefined;
  const record: StatusRecord = { request, status: plain.status, ts: plain.ts };
  const fields = { bead: text(plain.bead, 60), version: text(plain.version, 40), commit: text(plain.commit, 64), url: webLink(plain.url), reason: text(plain.reason, 400), setting: text(plain.setting, 200) };
  for (const [name, value] of Object.entries(fields)) if (value !== undefined) (record as unknown as Record<string, string>)[name] = value;
  return record;
}

interface Row {
  seq?: number;
  signer?: string;
  payload?: { class?: string; from?: string; to?: string; ct?: unknown };
}

/** The status in a row, when the mill sealed it to `mine`; undefined for every other record. */
function statusIn(row: Row, key: Uint8Array, mine: string, mill: string): StatusRecord | undefined {
  const p = row.payload;
  if (!p || p.class !== 'grist' || p.from !== mill || p.to !== mine || typeof p.ct !== 'string') return undefined;
  if (row.signer && row.signer !== mill) return undefined;
  try {
    if (sealerOf(p.ct) !== mill) return undefined;
    return readStatus(JSON.parse(openCt(p.ct, key)));
  } catch {
    return undefined;
  }
}

export interface PullOptions {
  /** the device key's 32 bytes: it signs the calls and opens the records */
  key: Uint8Array;
  signal?: AbortSignal;
  /** the mill's public key, when a pull before this one learned it (GET /api/me names it) */
  mill?: string;
  baseUrl?: string;
}

async function millOf(d: InstanceType<typeof door.Door>): Promise<string> {
  const response = await d.fetch('/me');
  if (!response.ok) throw new Error(`The backend answered ${response.status} to /api/me.`);
  const body = (await response.json()) as { mill?: unknown };
  const mill = typeof body.mill === 'string' ? body.mill.trim() : '';
  if (!mill) throw new Error('The backend names no mill key.');
  return mill;
}

/** Pulls every page of GET /api/messages after the kept cursor, applies the request-status records and moves the cursor on, page by page.
 * Resolves with the mill key it used. Rejects when the backend cannot be reached (what was applied stays applied). */
export async function pullStatuses(options: PullOptions): Promise<{ mill: string }> {
  requireLicence();
  const { key, signal } = options;
  const d = new door.Door({ baseUrl: options.baseUrl ?? POSTERN_DOOR, key });
  const mill = options.mill ?? (await millOf(d));
  const mine = vault.publicKeyHexFromKey(key);
  for (let pages = 0; pages < MAX_PAGES && !signal?.aborted; pages += 1) {
    const since = await getRequestsCursor();
    const response = await d.fetch(`/messages?since=${since}`, { signal });
    if (!response.ok) throw new Error(`The backend answered ${response.status} to /api/messages.`);
    const body = (await response.json()) as { records?: Row[]; next?: number };
    // The screen went while the page was on its way: it writes nothing (a later visit pulls it again from the kept cursor).
    if (signal?.aborted) break;
    const rows = body.records ?? [];
    let next = Math.max(since, typeof body.next === 'number' ? body.next : 0);
    for (const row of rows) {
      const status = statusIn(row, key, mine, mill);
      if (status) await applyRequestStatus(status);
      if (signal?.aborted) return { mill };
      next = Math.max(next, row.seq ?? 0);
    }
    if (signal?.aborted) break;
    await setRequestsCursor(next);
    if (next <= since || rows.length === 0) break;
  }
  return { mill };
}
