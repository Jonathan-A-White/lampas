// tests/support/fake-postern.ts — a Postern backend behind a fetch (docs/api.md): the signed calls the tutor makes
// (GET /api/challenge, GET /api/me, POST and GET /api/messages), a mill that opens the grist it is sent with its own
// key and answers it, sealed to the phone. No network. Shared by the tutor feature steps and the e2e specs.
import { Hash, PrivateKey, PublicKey, Signature, Utils } from '@bsv/sdk';
import { grist } from 'bsv-kit/grist';

export const POSTERN_ORIGIN = 'https://postern.allmymind.org';
/** The mill's key: what the fake seals its answers with. */
export const MILL_KEY_HEX = '00'.repeat(31) + '07';
const MILL_KEY = PrivateKey.fromHex(MILL_KEY_HEX);
export const MILL_PUBLIC_KEY = MILL_KEY.toPublicKey().toString();
const millBytes = Uint8Array.from(Utils.toArray(MILL_KEY_HEX, 'hex'));

/** What the fake opened of a grist: the header, the app's request, the attachments. */
export interface ReceivedGrist {
  grist: { app: string; kind: string; v: string; model?: string; effort?: string };
  input: Record<string, unknown>;
  attachments: unknown[];
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
  /** the Authorization header of each signed call */
  authorizations: string[];
  /** Answers a grist as soon as it arrives with this reply; undefined holds every grist until `answer` is called. */
  autoReply: Reply | undefined;
  /** Refuse every signed call as a backend does a key with no licence. */
  licensed: boolean;
  /** Make every call fail as an unreachable backend does (fetch rejects with a TypeError). */
  down: boolean;
  /** Answer the oldest grist not yet answered. */
  answer(reply: Reply): void;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const hex = (bytes: number[]): string => Utils.toHex(bytes);

/** The answer the fake gives to a question about συνεργεῖ, in the app's answer shape. */
export const SYNERGEI_ANSWER = {
  answer: 'συνεργεῖ is present active indicative, third person singular, of συνεργέω: "works together". Its subject is "all things".',
  words: [{ greek: 'συνεργεῖ', lemma: 'συνεργέω', note: 'verb, present active indicative, third person singular' }],
};

export function makeFakePostern(): FakePostern {
  const issued = new Set<string>();
  const records: { seq: number; txid: string; signer?: string; payload: Record<string, unknown> }[] = [];
  const unanswered: { txid: string; from: string }[] = [];
  let counter = 0;

  const fake: FakePostern = {
    fetch: undefined as unknown as typeof fetch,
    calls: [],
    received: [],
    authorizations: [],
    autoReply: undefined,
    licensed: true,
    down: false,
    answer(reply) {
      const next = unanswered.shift();
      if (!next) throw new Error('no grist is waiting for an answer');
      const plaintext = { re: next.txid, ...reply, grind: { app: 'lampas', kind: 'verse-ask', v: '1' } };
      const envelope = grist.sealEnvelope(JSON.stringify(plaintext), millBytes, next.from, 1_790_000_000);
      records.push({ seq: records.length + 1, txid: `direct:${hex(Hash.sha256(Utils.toArray(`answer-${next.txid}`, 'utf8')))}`, signer: MILL_PUBLIC_KEY, payload: { ...envelope } });
    },
  };

  fake.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (fake.down) throw new TypeError('Failed to fetch');
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
    const body = typeof init?.body === 'string' ? init.body : '';
    const message = `postern-v2\n${method}\n${url.pathname}${url.search}\n${Utils.toHex(Hash.sha256(Utils.toArray(body, 'utf8')))}\n${nonce}`;
    if (!PublicKey.fromString(pubkey).verify(message, Signature.fromDER(signature, 'hex'))) {
      return json(401, { error: 'bad signature', reason: 'signature' });
    }
    if (!fake.licensed) return json(401, { error: 'no licence', reason: 'no_licence' });

    if (url.pathname === '/api/me' && method === 'GET') {
      return json(200, { pubkey, mill: MILL_PUBLIC_KEY, network: 'testnet', features: ['grist'], apps: ['lampas'] });
    }
    if (url.pathname === '/api/messages' && method === 'POST') {
      const { scriptHex } = JSON.parse(String(init?.body)) as { scriptHex: string };
      const { envelope } = grist.readRecordScript(scriptHex);
      if (envelope.from !== pubkey || envelope.to !== MILL_PUBLIC_KEY) return json(403, { error: 'not to the mill from you' });
      const txid = `direct:${hex(Hash.sha256(Utils.toArray(scriptHex, 'hex')))}`;
      records.push({ seq: records.length + 1, txid, signer: pubkey, payload: { ...envelope } });
      fake.received.push(JSON.parse(grist.openCt(envelope.ct, millBytes)) as ReceivedGrist);
      unanswered.push({ txid, from: pubkey });
      if (fake.autoReply) fake.answer(fake.autoReply);
      return json(201, { txid, seq: records.length });
    }
    if (url.pathname === '/api/messages' && method === 'GET') {
      const since = Number(url.searchParams.get('since') ?? '0');
      const visible = records.filter((r) => r.seq > since && (r.payload.to === pubkey || r.payload.from === pubkey));
      return json(200, { records: visible, next: records.length });
    }
    return json(404, { error: 'no such route' });
  }) as typeof fetch;
  return fake;
}
