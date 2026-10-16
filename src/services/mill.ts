// src/services/mill.ts — the ONE client of the mill (bsv-kit/grist), gated by the licence (mw-8m9dyu.2). Lampas is free to read; whatever is sent
// to the mill is the AI, and the mill answers a licence only. Every send and every read of an answer goes through a function here, which
// refuses with the door's own "Licence required" (services/tutor.ts explains it as 'No licence') unless the phone is licensed, so nothing leaves
// an unlicensed phone. No other file under src/ imports bsv-kit/grist (tests/unit/mill-gate.test.ts fails on one that does): the tutor, the Bible
// talk, the reading check, the tips and the feedback all send through askGrind (tutor.ts), which sends through here. The wire half that carries
// `client_timing` and reads the record's time (it follows bsv-kit/grist's send.js and answer.js step for step, docs/protocol.md section 19; when
// bsv-kit takes `client_timing` and the row's time, it goes) lives here too, so that it is gated like the rest.
import { door, vault } from 'bsv-kit/bsv';
import { grist } from 'bsv-kit/grist';
import type { ClientTiming } from './clientTiming';
import { currentLicence } from './licenceNow';

export type MillFile = grist.GristFile;
export type MillAnswer = grist.GristAnswer;
/** The most files one send carries: bsv-kit's cap. */
export const MILL_MAX_FILES = grist.MAX_PHOTOS;
/** How often a screen that waits on the mill pulls (protocol section 19, "Waiting"). */
export const MILL_POLL_MS = grist.POLL_INTERVAL_MS;
/** The errors the mill client throws, for the callers that tell them apart. */
export const AwaitAbortedError = grist.AwaitAbortedError;
export const GristInputError = grist.GristInputError;

/** The backend answered a call with an HTTP status that is not success: it was reached, so the phone's connection is not the trouble (a 5xx is the backend or its proxy, with the factory's home off). */
export class BackendStatusError extends Error {
  readonly status: number;
  constructor(status: number, path: string) {
    super(`The backend answered ${status} to ${path}.`);
    this.name = 'BackendStatusError';
    this.status = status;
  }
}

/** Refuses with the door's licence refusal unless this phone is licensed. 'Checking' is not licensed yet: the AI is off until the check says so. */
export function requireLicence(): void {
  if (currentLicence() !== 'licensed') throw new door.RefusedError(door.LICENCE_REQUIRED, 401);
}

/** Who sealed a record's ciphertext, and its plaintext: the reading half of a mill record, for the request-status pull (requestStatus.ts). */
export const sealerOf = grist.sealerOf;
export const openCt = grist.openCt;

type Door = InstanceType<typeof door.Door>;

/** A door whose calls are timed: `total` is the time (ms) of all of them. */
export interface TimedDoor {
  door: Door;
  fetch(path: string, init?: RequestInit): Promise<Response>;
  total: number;
}

export function timedDoor(d: Door): TimedDoor {
  const timed: TimedDoor = {
    door: d,
    total: 0,
    async fetch(path, init) {
      const started = Date.now();
      try {
        return await d.fetch(path, init);
      } finally {
        timed.total += Date.now() - started;
      }
    },
  };
  return timed;
}

/** Who the backend says is who (GET /api/me): the mill's public key, and whether it serves the live event stream (the 'events' feature, docs/protocol.md section 15). */
export async function meOf(d: TimedDoor, signal: AbortSignal): Promise<{ mill: string; events: boolean }> {
  requireLicence();
  const response = await d.fetch('/me', { signal });
  if (!response.ok) throw new BackendStatusError(response.status, '/api/me');
  const body = (await response.json()) as { mill?: unknown; features?: unknown };
  const mill = typeof body.mill === 'string' ? body.mill.trim() : '';
  if (!mill) throw new Error('The backend names no mill key, so there is nowhere to send a grist.');
  return { mill, events: Array.isArray(body.features) && body.features.includes('events') };
}

const baseMime = (mime: string): string => mime.split(';')[0].trim().toLowerCase();

async function refusal(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.clone().json()) as { error?: unknown };
    if (typeof body.error === 'string' && body.error) return body.error;
  } catch {
    // not JSON: the fallback says it
  }
  return fallback;
}

export interface SendParams {
  door: TimedDoor;
  key: Uint8Array;
  mill: string;
  app: string;
  kind: string;
  v: string;
  input: unknown;
  files: MillFile[];
  /** the phone's part of its previous answer, in the plaintext beside `input` (docs/grist-client-timing.md) */
  clientTiming?: ClientTiming;
}

/** The shape checks bsv-kit's sendGrist makes before anything goes out. */
function check(files: MillFile[]): void {
  if (files.length > grist.MAX_PHOTOS) throw new grist.GristInputError(`${files.length} files is over the ${grist.MAX_PHOTOS} a grist may carry.`);
  let audio = 0;
  for (const file of files) {
    if (file.name !== undefined && (!file.name.trim() || /[\\/]/.test(file.name))) {
      throw new grist.GristInputError(`The file name ${JSON.stringify(file.name)} must be a base name: not empty, no folders.`);
    }
    const mime = baseMime(file.mime);
    if ((grist.AUDIO_MIMES as readonly string[]).includes(mime)) audio += file.bytes.length;
    else if (!(grist.PHOTO_MIMES as readonly string[]).includes(mime)) {
      throw new grist.GristInputError(`${file.mime || 'a file of no type'} is not a file a grist carries: use image/jpeg, image/png or image/webp, or audio/webm, audio/ogg or audio/mp4.`);
    } else if (file.bytes.length > grist.MAX_PHOTO_BYTES) {
      throw new grist.GristInputError(`A photo of ${file.bytes.length} bytes is over the ${grist.MAX_PHOTO_BYTES} bytes (8 MB) a photo may be.`);
    }
  }
  if (audio > grist.MAX_AUDIO_BYTES) throw new grist.GristInputError(`${audio} bytes of audio is over the ${grist.MAX_AUDIO_BYTES} bytes (8 MiB) a grist may carry.`);
}

function scriptOf(p: SendParams, attachments: grist.Attachment[]): string {
  const plaintext = { grist: { app: p.app, kind: p.kind, v: p.v }, input: p.input, attachments, ...(p.clientTiming ? { client_timing: p.clientTiming } : {}) };
  return grist.recordScriptHex(grist.sealEnvelope(JSON.stringify(plaintext), p.key, p.mill, Math.floor(Date.now() / 1000)));
}

/** A grist the backend has taken: its id, and its place in the backend's sequence (`seq`, where the wait pages from). */
export interface SentGrist {
  txid: string;
  seq: number;
}

/** Posts a grist's very bytes again, through `door`. Postern names a direct record by the sha256 of its script and answers the same bytes with the
 * record it already holds (server/internal/api/direct.go), so a resend never makes a second record: it either finds the first or is the first. */
export type Resend = (door: TimedDoor) => Promise<SentGrist>;

/**
 * The grist's POST went out and no reply came in time (the door's ApiTimeoutError with `sent`, on the call or on its body): the backend may have
 * taken it, late, on a stalled link (mw-5r3p30.302). Sending it as a new grist would make a second one; `resend` sends the same bytes again.
 */
export class SendUnknownError extends Error {
  readonly resend: Resend;
  constructor(resend: Resend, cause: unknown) {
    super('The grist went out and no reply came: the backend may have it.', { cause });
    this.name = 'SendUnknownError';
    this.resend = resend;
  }
}

/** POST /api/messages with a record's script. */
async function postRecord(d: TimedDoor, scriptHex: string): Promise<SentGrist> {
  const response = await d.fetch('/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scriptHex }) });
  if (response.status === 502 || response.status === 503 || response.status === 504) {
    throw new door.BackendUnreachableError(await refusal(response, 'The backend refused the grist.'));
  }
  if (!response.ok) throw new door.RefusedError(await refusal(response, 'The backend refused the grist.'), response.status);
  const body = (await door.withTimeout(response.json(), true)) as { txid?: unknown; seq?: unknown };
  if (typeof body.txid !== 'string') throw new Error('The backend took the grist but named no id.');
  if (typeof body.seq !== 'number') throw new Error('The backend took the grist but named no seq.');
  return { txid: body.txid, seq: body.seq };
}

/** Sends a grist as bsv-kit's sendGristRecord does and resolves with its txid and its place in the backend's sequence (`seq`, where the wait pages from),
 * and `resend`, which posts its very bytes again; throws the same errors (GristInputError when nothing was sent), and SendUnknownError when its fate is unknown. */
export async function sendTimedGrist(p: SendParams): Promise<SentGrist & { resend: Resend }> {
  requireLicence();
  check(p.files);
  const files = p.files.map((f) => ({ ...f, mime: baseMime(f.mime) }));
  try {
    // too large is found out before any upload: the attachments are stood in for by the longest entries the uploads can name
    scriptOf(p, files.map((f) => ({ hash: '0'.repeat(64), size: 99_999_999, mime: f.mime, ...(f.name === undefined ? {} : { name: f.name }) })));
  } catch (err) {
    if (err instanceof RangeError) throw new grist.GristInputError(`This grist is too large to send: ${err.message}.`);
    throw err;
  }
  const attachments: grist.Attachment[] = [];
  for (const file of files) {
    const sealed = grist.sealBytes(file.bytes, p.key, p.mill);
    const response = await p.door.fetch('/blobs', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: sealed.buffer.slice(sealed.byteOffset, sealed.byteOffset + sealed.byteLength) as ArrayBuffer });
    if (!response.ok) throw new door.RefusedError(await refusal(response, 'The image upload failed.'), response.status);
    // The upload has not sent the grist: a timeout here means nothing has gone.
    const body = (await door.withTimeout(response.json(), false)) as { hash?: unknown; size?: unknown };
    if (typeof body.hash !== 'string' || typeof body.size !== 'number') throw new Error('The upload succeeded but returned no hash.');
    attachments.push({ hash: body.hash, size: body.size, mime: file.mime, ...(file.name === undefined ? {} : { name: file.name }) });
  }
  // the script is made once: a second making seals afresh, and would be a second grist
  const scriptHex = scriptOf(p, attachments);
  const resend: Resend = (d) => {
    requireLicence();
    return postRecord(d, scriptHex);
  };
  try {
    return { ...(await postRecord(p.door, scriptHex)), resend };
  } catch (err) {
    if (err instanceof door.ApiTimeoutError && err.sent) throw new SendUnknownError(resend, err);
    throw err;
  }
}

interface Row {
  seq?: number;
  firstSeen?: string;
  signer?: string;
  payload?: { class?: string; from?: string; to?: string; ct?: unknown };
}

export interface Page {
  answer: grist.GristAnswer | null;
  next: number;
  /** the backend's own head as the page named it (`next` before it is held at the place asked from): below the place asked from, that place is not in this backend's sequence */
  head: number;
  /** the backend's time for the answer's record (epoch ms), when it named one */
  deliveredAt?: number;
  /** how long this page took, from the call to its body read (ms) */
  took: number;
}

/** The answer in a row, when the mill sealed it to `mine` and it is for `txid`. */
function answerIn(row: Row, key: Uint8Array, mine: string, mill: string, txid: string): grist.GristAnswer | undefined {
  const p = row.payload;
  if (!p || p.class !== 'grist' || p.from !== mill || p.to !== mine || typeof p.ct !== 'string') return undefined;
  if (row.signer && row.signer !== mill) return undefined;
  try {
    if (grist.sealerOf(p.ct) !== mill) return undefined;
    const answer = grist.decryptAnswer(p.ct, key);
    return answer.re === txid ? answer : undefined;
  } catch {
    return undefined;
  }
}

/** Reads ONE page of GET /api/messages after `since` as bsv-kit's readAnswerPage does, and also names the time the backend first saw the answer's record. */
export async function readTimedPage(txid: string, o: { door: TimedDoor; key: Uint8Array; since: number; mill: string; signal: AbortSignal }): Promise<Page> {
  requireLicence();
  const { door: d, key, signal } = o;
  if (signal.aborted) throw new grist.AwaitAbortedError();
  const mine = vault.publicKeyHexFromKey(key);
  // The door adds a listener to the signal it is given and never removes it: each page gets a signal of its own, linked to the caller's.
  const own = new AbortController();
  const stop = (): void => own.abort();
  signal.addEventListener('abort', stop, { once: true });
  let body: { records?: Row[]; next?: number };
  const started = Date.now();
  try {
    const response = await d.fetch(`/messages?since=${o.since}`, { signal: own.signal });
    if (!response.ok) throw new BackendStatusError(response.status, '/api/messages');
    body = (await response.json()) as typeof body;
  } catch (err) {
    if (signal.aborted) throw new grist.AwaitAbortedError();
    throw err;
  } finally {
    signal.removeEventListener('abort', stop);
  }
  const took = Date.now() - started;
  const head = body.next ?? 0;
  let next = Math.max(o.since, head);
  for (const row of body.records ?? []) {
    const answer = answerIn(row, key, mine, o.mill, txid);
    if (answer) {
      const at = typeof row.firstSeen === 'string' ? Date.parse(row.firstSeen) : NaN;
      return { answer, next, head, took, ...(Number.isFinite(at) ? { deliveredAt: at } : {}) };
    }
    next = Math.max(next, row.seq ?? 0);
  }
  return { answer: null, next, head, took };
}
