// tests/support/fake-postern.ts — a Postern backend behind a fetch (docs/api.md): the signed calls the tutor makes
// (GET /api/challenge, GET /api/me, POST and GET /api/messages), a mill that opens the grist it is sent with its own
// key and answers it, sealed to the phone. No network. Shared by the tutor feature steps and the e2e specs.
import { Hash, PrivateKey, PublicKey, Signature, Utils } from '@bsv/sdk';
import { grist } from 'bsv-kit/grist';
import { ASYNC_WAIT_MS } from './timeouts';

export const POSTERN_ORIGIN = 'https://postern.allmymind.org';
/** The mill's key: what the fake seals its answers with. */
export const MILL_KEY_HEX = '00'.repeat(31) + '07';
const MILL_KEY = PrivateKey.fromHex(MILL_KEY_HEX);
export const MILL_PUBLIC_KEY = MILL_KEY.toPublicKey().toString();
const millBytes = Uint8Array.from(Utils.toArray(MILL_KEY_HEX, 'hex'));
// the bound on answer()'s wait is real time even where a test fakes the clock: taken before any test can install fake timers
const realSetTimeout = globalThis.setTimeout;
const realClearTimeout = globalThis.clearTimeout;

/** What the fake opened of a grist: the header, the app's request, the attachments. */
export interface ReceivedGrist {
  grist: { app: string; kind: string; v: string; model?: string; effort?: string };
  input: Record<string, unknown>;
  attachments: { hash: string; size: number; mime: string; name?: string }[];
  /** the phone's part of its previous answer's round trip (docs/ask-tutor.md 'How long an answer takes'), when the grist carries one */
  client_timing?: Record<string, unknown>;
}

/** What the fake answers a grist with. */
export interface Reply {
  status: 'answered' | 'refused' | 'failed';
  answer?: unknown;
  reason?: string;
}

export interface FakePostern {
  fetch: typeof fetch;
  /** every call made, as 'METHOD /path' */
  calls: string[];
  /** every grist the phone sent, opened */
  received: ReceivedGrist[];
  /** the txid the fake gave each grist in `received`, in the same order */
  txids: string[];
  /** every sealed upload the phone made to POST /api/blobs: its hash and byte length (a grist's attachments name them) */
  blobs: { hash: string; size: number }[];
  /** the Authorization header of each signed call */
  authorizations: string[];
  /** Answers a grist as soon as it arrives with this reply; undefined holds every grist until `answer` is called. */
  autoReply: Reply | undefined;
  /** What a grist whose input asks for lang 'el' is answered with instead of `autoReply` (a Greek reading check). */
  greekReply: Reply | undefined;
  /** What a grist of a given kind is answered with instead of `autoReply` (a forwarding grind such as 'feedback' answers {status:'sent'} while the tutor answers a talk). */
  kindReplies: Record<string, Reply>;
  /** A grist of a given kind is held: the fake takes it in but its POST does not return until this promise settles (a slow mill or phone on slow data). */
  holds: Record<string, Promise<void>>;
  /** The next POST /api/messages waits this long (ms, on the test's clock) before the fake takes its grist in, as a stalled link that delivers it late does; used once. */
  slowSendMs: number | undefined;
  /** Refuse every signed call as a backend does a key with no licence. */
  licensed: boolean;
  /** Make every call fail as an unreachable backend does (fetch rejects with a TypeError). */
  down: boolean;
  /** Every call is answered with this HTTP status and no work done, as the VPS's proxy does while the factory's home is off (502, 503 or 504); undefined = a working backend. */
  gateway: number | undefined;
  /** Answer the oldest grist not yet answered. The app sends its grist a moment after the tap that asks (on a loaded host, later than
   * the next step): with none waiting it waits up to `answerWaitMs` for the next one to arrive, and fails only then. Always await it. */
  answer(reply: Reply): Promise<void>;
  /** how long `answer` waits for a grist to arrive: the suite's ASYNC_WAIT_MS (real time, under fake timers too) */
  answerWaitMs: number;
  /** Ends whatever the phone still has in flight: answers every grist still waiting with `reply`, and every grist sent from now on as soon
   * as it arrives. For the end of a scenario, so a grist held for a step that never ran (the scenario failed first) does not keep the
   * app waiting into the next one. */
  endAll(reply: Reply): void;
  /** how many grists the fake has taken in and not answered yet: a scenario's end leaves none (`endAll`) */
  readonly inFlight: number;
  /** the `since` of every GET /api/messages, in order */
  sinces: number[];
  /** Puts a request-status record (docs/protocol.md section 19) for the key `to` (a public key in hex) on the backend, sealed by the mill unless
   * `sealedBy` (a private key in hex) says another key sealed it. The plaintext is sent as given. */
  sendStatus(to: string, plaintext: Record<string, unknown>, sealedBy?: string): void;
  /** Offer the live event stream (docs/protocol.md section 10): GET /api/me names the 'events' feature and GET /api/events stays open, saying `hello` and then
   * `message` {seq} for every record the backend takes in. Off by default: the phone polls. */
  events: boolean;
  /** Refuse GET /api/events (a 503, as a backend does when it is down) while the rest answers. */
  eventsRefused: boolean;
  /** how many event streams are open now */
  openStreams: number;
  /** Closes every open event stream from the backend's side, as a dropped link does. */
  dropStreams(): void;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const hex = (bytes: number[]): string => Utils.toHex(bytes);

/** The bytes a request body signs as: a string's UTF-8, a buffer's or view's own bytes, none for no body. */
function bodyBytes(body: BodyInit | null | undefined): number[] {
  if (body === undefined || body === null) return [];
  if (typeof body === 'string') return Utils.toArray(body, 'utf8');
  if (ArrayBuffer.isView(body)) return Array.from(new Uint8Array(body.buffer, body.byteOffset, body.byteLength));
  if (Object.prototype.toString.call(body) === '[object ArrayBuffer]') return Array.from(new Uint8Array(body as ArrayBuffer));
  throw new Error('the fake Postern cannot read this body');
}

/** The answer the fake gives to a question about συνεργεῖ, in the app's answer shape. */
export const SYNERGEI_ANSWER = {
  answer: 'συνεργεῖ is present active indicative, third person singular, of συνεργέω: "works together". Its subject is "all things".',
  words: [{ greek: 'συνεργεῖ', lemma: 'συνεργέω', note: 'verb, present active indicative, third person singular' }],
};

/** The answer the fake gives to a tips grist: one tip with a button to the Review screen (grinds/tips.answer.schema.json). */
export const TIP_ANSWER = {
  tip: { id: 'try-review', title: 'Try Review', body: 'Words come back on a schedule. Tap Review to see what is due.', action: { label: 'Open Review', screen: 'review' } },
};

/** The answer the fake gives to a reading of Romans 8:28, in the app's answer shape (grinds/verse-read.answer.schema.json). */
export const READING_ANSWER = {
  verdict: 'some-to-fix',
  focus_words: [
    { word: 'together', index: 7, chunks: ['to', 'geth', 'er'], tip: 'Say the th softly, with your tongue between your teeth.' },
    { word: 'purpose', index: 22, chunks: ['pur', 'pose'], tip: 'The first part sounds like per.', say: 'perpus' },
  ],
  note: 'Nearly there: two words to say again.',
};

/** READING_ANSWER with the times the scorer gave for "together" (seconds in the recording); "purpose" was not timed (mw-5r3p30.96). */
export const TIMED_READING_ANSWER = {
  ...READING_ANSWER,
  focus_words: [{ ...READING_ANSWER.focus_words[0], start: 1.2, end: 1.7 }, READING_ANSWER.focus_words[1]],
};

/** The answer the fake gives to a Greek reading of Romans 8:28: Greek words, their syllables, a tip in English. */
export const GREEK_READING_ANSWER = {
  verdict: 'some-to-fix',
  focus_words: [
    { word: 'συνεργεῖ', index: 8, chunks: ['συν', 'ερ', 'γεῖ'], tip: 'The γ before ε is a soft y, and the stress falls on the last part.' },
    { word: 'πρόθεσιν', index: 13, chunks: ['πρό', 'θε', 'σιν'], tip: 'The θ is the th of think; stress the first part.' },
  ],
  note: 'Nearly there: two Greek words to say again.',
};

/** The answer the fake gives to a reading with nothing to fix. */
export const WELL_READ_ANSWER = { verdict: 'well-read', focus_words: [], note: 'Clear and steady. Well read.' };

/** The answer the fake gives to a reading that covers only the first words of the verse (verdict incomplete). */
export const INCOMPLETE_ANSWER = {
  verdict: 'incomplete',
  focus_words: [],
  note: "I heard 'and we know that', then you stopped before 'all things work together'. Hold Read and read the whole verse.",
};

/** The answer the fake gives to a reading that covers the first six words of Romans 8:28 and stops (verdict partial, version 2 of the grind):
 * 'know' misread within the part he read, and 'work' (index 6) the word he stopped at. */
export const PARTIAL_ANSWER = {
  verdict: 'partial',
  focus_words: [{ word: 'know', index: 2, chunks: ['know'], tip: 'The k is silent: say no.', say: 'no' }],
  note: 'Good start: I heard "and we know that all things", then you stopped.',
  reached: 5,
  next_word: { word: 'work', index: 6, chunks: ['work'], tip: 'It rhymes with jerk, not with fork.', say: 'wurk' },
};

/** The next reading of the same verse, two words further: 'for' (index 8) is where he stopped. */
export const PARTIAL_FURTHER_ANSWER = {
  verdict: 'partial',
  focus_words: [],
  note: 'Better: you read through "work together" this time.',
  reached: 7,
  next_word: { word: 'for', index: 8, chunks: ['for'], tip: 'Say it softly, as in fur.' },
};

/** The answer the fake gives to a Bible talk question, in the app's answer shape (grinds/bible-talk.answer.schema.json). */
export const TALK_ANSWER = {
  answer: 'In this verse συνεργεῖ means "works together": God is the one who weaves every thing toward good for those who love him.',
  words: [{ greek: 'συνεργεῖ', lemma: 'συνεργέω', note: 'verb, present active indicative, third person singular' }],
};

/** The answer the fake gives to a quiz message (the bible-talk grind in quiz mode): one question, in the app's answer shape. */
export const QUIZ_ANSWER = {
  answer: 'Question 1: how does the passage begin, and what is not left for those in Christ Jesus?',
  words: [{ greek: 'κατάκριμα', lemma: 'κατάκριμα', note: 'noun, nominative singular neuter' }],
};

/** The answer the fake gives to a word-help question about συνεργεῖ (grammar), in the app's answer shape. */
export const GRAMMAR_HELP_ANSWER = {
  answer: 'συνεργεῖ is present active indicative, third person singular: the ending -εῖ is a contracted -έει. Check: who is the subject here?',
  words: [{ greek: 'συνεργεῖ', lemma: 'συνεργέω', note: 'verb, present active indicative, third person singular' }],
};

/** The answer the fake gives to a question about a grammar term (the Grammar sheet's Ask the tutor): the answer in the app's shape. */
export const GRAMMAR_TERM_ANSWER = {
  answer: 'A conjunction joins words or sentences. In Romans 8:2 γὰρ “for” gives the reason for what came before. Check: which two parts does it join here?',
  words: [{ greek: 'γὰρ', lemma: 'γάρ', note: 'conjunction' }],
};

/** The answer the fake gives to a Sound it out question about συνεργεῖ: the answer and the syllables to say. */
export const SOUND_HELP_ANSWER = {
  answer: 'Say it in three parts: sun, er, GEI. The stress is on the last part. Check: which part is stressed?',
  words: [{ greek: 'συνεργεῖ', lemma: 'συνεργέω', note: 'verb, present active indicative, third person singular' }],
  syllables: ['συν', 'ερ', 'γεῖ'],
};

/** a grist taken in and not answered yet */
type Waiting = { txid: string; from: string; kind: string };

export function makeFakePostern(): FakePostern {
  const issued = new Set<string>();
  const records: { seq: number; firstSeen: string; txid: string; signer?: string; payload: Record<string, unknown> }[] = [];
  const unanswered: Waiting[] = [];
  /** the answer() calls waiting for a grist to arrive, oldest first: each takes one */
  const waiters: (() => void)[] = [];
  const streams = new Set<ReadableStreamDefaultController<Uint8Array>>();
  const encoder = new TextEncoder();
  let counter = 0;

  /** A record taken in: every open event stream is told its seq. */
  const announce = (seq: number): void => {
    for (const stream of streams) stream.enqueue(encoder.encode(`event: message\ndata: {"seq":${seq}}\n\n`));
  };

  const fake: FakePostern = {
    fetch: undefined as unknown as typeof fetch,
    calls: [],
    received: [],
    txids: [],
    blobs: [],
    authorizations: [],
    autoReply: undefined,
    greekReply: undefined,
    kindReplies: {},
    holds: {},
    slowSendMs: undefined,
    licensed: true,
    down: false,
    gateway: undefined,
    sinces: [],
    events: false,
    eventsRefused: false,
    get inFlight() {
      return unanswered.length;
    },
    get openStreams() {
      return streams.size;
    },
    dropStreams() {
      for (const stream of [...streams]) {
        streams.delete(stream);
        stream.close();
      }
    },
    sendStatus(to, plaintext, sealedBy) {
      const sealer = sealedBy ? Uint8Array.from(Utils.toArray(sealedBy, 'hex')) : millBytes;
      const envelope = grist.sealEnvelope(JSON.stringify(plaintext), sealer, to, 1_790_000_000);
      const signer = sealedBy ? PrivateKey.fromHex(sealedBy).toPublicKey().toString() : MILL_PUBLIC_KEY;
      records.push({ seq: records.length + 1, firstSeen: new Date().toISOString(), txid: `direct:${hex(Hash.sha256(Utils.toArray(`status-${records.length}`, 'utf8')))}`, signer, payload: { ...envelope } });
      announce(records.length);
    },
    answerWaitMs: ASYNC_WAIT_MS,
    answer(reply) {
      const take = (): void => answerGrist(unanswered.shift() as Waiting, reply);
      // a grist only waits while no answer() does: the first answer() to wait takes the next one in
      if (unanswered.length > 0) {
        take();
        return Promise.resolve();
      }
      const waitMs = fake.answerWaitMs;
      return new Promise<void>((resolve, reject) => {
        const waiter = (): void => {
          realClearTimeout(timer);
          take();
          resolve();
        };
        const timer = realSetTimeout(() => {
          waiters.splice(waiters.indexOf(waiter), 1);
          reject(new Error(`no grist arrived within ${waitMs} ms`));
        }, waitMs);
        waiters.push(waiter);
      });
    },
    endAll(reply) {
      fake.autoReply = reply;
      fake.greekReply = undefined;
      fake.kindReplies = {};
      while (unanswered.length > 0) answerGrist(unanswered.shift() as Waiting, reply);
    },
  };
  const answerGrist = (next: Waiting, reply: Reply): void => {
    const plaintext = { re: next.txid, ...reply, grind: { app: 'lampas', kind: next.kind, v: '1' } };
    const envelope = grist.sealEnvelope(JSON.stringify(plaintext), millBytes, next.from, 1_790_000_000);
    records.push({ seq: records.length + 1, firstSeen: new Date().toISOString(), txid: `direct:${hex(Hash.sha256(Utils.toArray(`answer-${next.txid}`, 'utf8')))}`, signer: MILL_PUBLIC_KEY, payload: { ...envelope } });
    announce(records.length);
  };

  fake.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (fake.down) throw new TypeError('Failed to fetch');
    if (fake.gateway !== undefined) return json(fake.gateway, { error: 'upstream is down' });
    const url = new URL(typeof input === 'string' ? input : input.toString());
    const method = (init?.method ?? 'GET').toUpperCase();
    if (url.origin !== POSTERN_ORIGIN) return json(404, { error: 'not the backend' });
    fake.calls.push(`${method} ${url.pathname}`);

    if (url.pathname === '/api/challenge') {
      counter += 1;
      const nonce = hex(Utils.toArray(`nonce-${counter}`.padEnd(40, '0'), 'utf8'));
      issued.add(nonce);
      return json(200, { nonce });
    }

    const authorization = new Headers(init?.headers).get('Authorization') ?? '';
    fake.authorizations.push(authorization);
    const match = /^Postern2 ([0-9a-f]{66}):([0-9a-f]+):([0-9a-f]+)$/.exec(authorization);
    if (!match) return json(401, { error: 'bad header', reason: 'malformed_authorization' });
    const [, pubkey, nonce, signature] = match;
    if (!issued.delete(nonce)) return json(401, { error: 'unknown nonce', reason: 'nonce' });
    // v2 (docs/protocol.md §1): one request per signature, over the method, the request target and the body's hash.
    const bytes = bodyBytes(init?.body);
    const message = `postern-v2\n${method}\n${url.pathname}${url.search}\n${Utils.toHex(Hash.sha256(bytes))}\n${nonce}`;
    if (!PublicKey.fromString(pubkey).verify(message, Signature.fromDER(signature, 'hex'))) {
      return json(401, { error: 'bad signature', reason: 'signature' });
    }
    if (!fake.licensed) return json(401, { error: 'no licence', reason: 'no_licence' });

    if (url.pathname === '/api/me' && method === 'GET') {
      return json(200, { pubkey, mill: MILL_PUBLIC_KEY, network: 'testnet', features: fake.events ? ['grist', 'events'] : ['grist'], apps: ['lampas'] });
    }
    if (url.pathname === '/api/events' && method === 'GET') {
      if (!fake.events || fake.eventsRefused) return json(503, { error: 'no event stream' });
      let controller!: ReadableStreamDefaultController<Uint8Array>;
      const body = new ReadableStream<Uint8Array>({
        start(c) {
          controller = c;
          streams.add(c);
          c.enqueue(encoder.encode(`event: hello\ndata: {"head":${records.length},"view":""}\n\n`));
        },
        cancel() {
          streams.delete(controller);
        },
      });
      // a fetch that is aborted ends its body, as a browser's does
      init?.signal?.addEventListener('abort', () => {
        if (streams.delete(controller)) controller.error(new DOMException('The operation was aborted.', 'AbortError'));
      });
      return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store' } });
    }
    if (url.pathname === '/api/blobs' && method === 'POST') {
      const blob = { hash: Utils.toHex(Hash.sha256(bytes)), size: bytes.length };
      fake.blobs.push(blob);
      return json(201, blob);
    }
    if (url.pathname === '/api/messages' && method === 'POST') {
      const slow = fake.slowSendMs;
      fake.slowSendMs = undefined;
      if (slow !== undefined) await new Promise((resolve) => setTimeout(resolve, slow));
      const { scriptHex } = JSON.parse(String(init?.body)) as { scriptHex: string };
      const { envelope } = grist.readRecordScript(scriptHex);
      if (envelope.from !== pubkey || envelope.to !== MILL_PUBLIC_KEY) return json(403, { error: 'not to the mill from you' });
      const txid = `direct:${hex(Hash.sha256(Utils.toArray(scriptHex, 'hex')))}`;
      // as Postern does (server/internal/api/direct.go): a record is named by its script's hash, and the same bytes again are answered 200 with the record it holds, never taken twice
      const held = records.find((r) => r.txid === txid);
      if (held) return json(200, { txid, seq: held.seq });
      const seq = records.length + 1;
      records.push({ seq, firstSeen: new Date().toISOString(), txid, signer: pubkey, payload: { ...envelope } });
      announce(seq);
      const opened = JSON.parse(grist.openCt(envelope.ct, millBytes)) as ReceivedGrist;
      fake.received.push(opened);
      fake.txids.push(txid);
      const waiting = { txid, from: pubkey, kind: opened.grist.kind };
      unanswered.push(waiting);
      // a reply set for this grist answers THIS grist, not the oldest one waiting: an earlier grist may be held on purpose
      const answerThis = (reply: Reply): void => {
        unanswered.splice(unanswered.indexOf(waiting), 1);
        answerGrist(waiting, reply);
      };
      const greek = fake.greekReply !== undefined && (opened.input as { lang?: unknown } | undefined)?.lang === 'el';
      const byKind = fake.kindReplies[opened.grist.kind];
      if (byKind) answerThis(byKind);
      else if (fake.autoReply) answerThis(greek && fake.greekReply ? fake.greekReply : fake.autoReply);
      else waiters.shift()?.();
      const hold = fake.holds[opened.grist.kind];
      if (hold) await hold;
      // the grist's own place, as the backend names it: an answer the fake made at once is after it
      return json(201, { txid, seq });
    }
    if (url.pathname === '/api/messages' && method === 'GET') {
      const since = Number(url.searchParams.get('since') ?? '0');
      fake.sinces.push(since);
      const visible = records.filter((r) => r.seq > since && (r.payload.to === pubkey || r.payload.from === pubkey));
      return json(200, { records: visible, next: records.length });
    }
    return json(404, { error: 'no such route' });
  }) as typeof fetch;
  return fake;
}
