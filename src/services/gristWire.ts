// src/services/gristWire.ts — the two wire halves askGrind needs that bsv-kit's grist cannot give it yet: sending a grist whose plaintext also carries
// `client_timing` (sendGrist builds {grist, input, attachments} and nothing else), and reading one page of answers with the backend's time for the
// record (readAnswerPage hides the row). Both follow bsv-kit/grist's send.js and answer.js step for step (docs/protocol.md section 19), and
// both time the calls to the backend so the network's share of a round trip is known. When bsv-kit takes `client_timing` and the row's time, this file goes.
import { door, vault } from 'bsv-kit/bsv';
import { grist } from 'bsv-kit/grist';
import type { ClientTiming } from './clientTiming';

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
  const response = await d.fetch('/me', { signal });
  if (!response.ok) throw new Error(`The backend answered ${response.status} to /api/me.`);
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
  files: grist.GristFile[];
  /** the phone's part of its previous answer, in the plaintext beside `input` (docs/grist-client-timing.md) */
  clientTiming?: ClientTiming;
}

/** The shape checks bsv-kit's sendGrist makes before anything goes out. */
function check(files: grist.GristFile[]): void {
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

/** Sends a grist as bsv-kit's sendGristRecord does and resolves with its txid and its place in the backend's sequence (`seq`, where the wait pages from);
 * throws the same errors (GristInputError when nothing was sent). */
export async function sendTimedGrist(p: SendParams): Promise<{ txid: string; seq: number }> {
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
  const response = await p.door.fetch('/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scriptHex: scriptOf(p, attachments) }) });
  if (response.status === 502 || response.status === 503 || response.status === 504) {
    throw new door.BackendUnreachableError(await refusal(response, 'The backend refused the grist.'));
  }
  if (!response.ok) throw new door.RefusedError(await refusal(response, 'The backend refused the grist.'), response.status);
  const body = (await door.withTimeout(response.json(), true)) as { txid?: unknown; seq?: unknown };
  if (typeof body.txid !== 'string') throw new Error('The backend took the grist but named no id.');
  if (typeof body.seq !== 'number') throw new Error('The backend took the grist but named no seq.');
  return { txid: body.txid, seq: body.seq };
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
    if (!response.ok) throw new Error(`The backend answered ${response.status} to /api/messages.`);
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
