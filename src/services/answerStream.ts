// src/services/answerStream.ts — the backend's live event stream (docs/protocol.md section 10, GET /api/events) as the tutor's wait hears it: while an
// answer is awaited the phone listens, and the backend names every record it takes in (`message` {seq}), the answer's among them, so the page that
// holds it is fetched at once instead of at the next poll. Read with fetch, not EventSource (which cannot send the signed Authorization header), as
// Postern's own src/services/live.ts does, with its dropped-stream rules: a reconnect backs off from 1 s to 30 s, and a stream that has pinged nothing
// for staleMs (the backend pings every 25 s) is a socket the OS suspended or a link that died, and is read as dropped.
// The stream is open only while somebody listens (listenForAnswers ... close): the waits that are out at once share one connection, the last one to
// close ends it, so nothing is held open while no answer is awaited (the battery cost of an idle connection is Postern's
// docs/research/battery-and-responsiveness.md). The stream never carries an answer, only its seq: whoever listens keeps its poll as a backstop.
import { door, vault } from 'bsv-kit/bsv';

/** The timings, in one object so a test may shorten them. */
export const streamTimings = {
  /** The first wait before a dropped stream is opened again; it doubles with each failure. */
  reconnectMinMs: 1000,
  /** The longest wait between two tries. */
  reconnectMaxMs: 30_000,
  /** This long with no word (the backend pings every 25 s) and the stream is read as dropped. */
  staleMs: 60_000,
  /** How often an open stream is checked for having gone quiet. */
  checkMs: 5000,
};

export interface StreamListener {
  /** The backend said something worth looking at: `seq` of a record it indexed, or none for its hello on connect and for the page coming back to the screen. */
  wake(seq?: number): void;
  /** The stream was up and is not now. */
  down(): void;
}

export interface AnswerStream {
  /** Whether the stream is up now: open and heard from within staleMs. */
  live(): boolean;
  /** Stops listening; the stream closes with its last listener. */
  close(): void;
}

interface Connection {
  listeners: Set<StreamListener>;
  abort: AbortController;
  live: boolean;
  /** cuts the open stream, if there is one (it is then read as dropped and opened again) */
  cut?: () => void;
  /** when the stream last said anything (ms) */
  heard: number;
}

const connections = new Map<string, Connection>();

/** Parses one server-sent event block ("event: x\ndata: {...}"), as Postern's live.ts does. */
export function parseEventBlock(block: string): { event: string; data: string } | null {
  let event = 'message';
  const data: string[] = [];
  for (const line of block.split('\n')) {
    if (line.startsWith(':') || line === '') continue;
    const colon = line.indexOf(':');
    const field = colon < 0 ? line : line.slice(0, colon);
    const value = colon < 0 ? '' : line.slice(colon + 1).replace(/^ /, '');
    if (field === 'event') event = value;
    else if (field === 'data') data.push(value);
  }
  return data.length || event !== 'message' ? { event, data: data.join('\n') } : null;
}

function seqOf(data: string): number | undefined {
  try {
    const seq = (JSON.parse(data) as { seq?: unknown }).seq;
    return typeof seq === 'number' ? seq : undefined;
  } catch {
    return undefined;
  }
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const done = (): void => {
      clearTimeout(timer);
      signal.removeEventListener('abort', done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal.addEventListener('abort', done);
  });
}

function setLive(c: Connection, live: boolean): void {
  if (c.live === live) return;
  c.live = live;
  if (!live) for (const l of [...c.listeners]) l.down();
}

/** One stream, from its headers to its end; rejects when it cannot be opened, was cut for silence or broke. */
async function listen(c: Connection, d: InstanceType<typeof door.Door>, onOpen: () => void): Promise<void> {
  const { signal } = c.abort;
  const response = await d.fetch('/events', { headers: { Accept: 'text/event-stream' }, signal });
  if (!response.ok || !response.body) throw new Error(`The event stream answered ${response.status}.`);
  const reader = response.body.getReader();
  c.heard = Date.now();
  c.cut = () => void reader.cancel().catch(() => undefined);
  onOpen();
  setLive(c, true);
  let quiet = false;
  let watch: ReturnType<typeof setTimeout> | undefined;
  const check = (): void => {
    // a page nobody is looking at keeps no true time: it is judged when it comes back
    if (typeof document !== 'undefined' && document.hidden) c.heard = Date.now();
    if (Date.now() - c.heard > streamTimings.staleMs) {
      quiet = true;
      c.cut?.();
      return;
    }
    watch = setTimeout(check, streamTimings.checkMs);
  };
  watch = setTimeout(check, streamTimings.checkMs);
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      c.heard = Date.now();
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
      let split = buffer.indexOf('\n\n');
      while (split >= 0) {
        const parsed = parseEventBlock(buffer.slice(0, split));
        buffer = buffer.slice(split + 2);
        if (parsed?.event === 'hello') for (const l of [...c.listeners]) l.wake();
        else if (parsed?.event === 'message') for (const l of [...c.listeners]) l.wake(seqOf(parsed.data));
        split = buffer.indexOf('\n\n');
      }
    }
  } catch (err) {
    if (!quiet) throw err;
  } finally {
    clearTimeout(watch);
    c.cut = undefined;
  }
  if (quiet) throw new Error('The event stream went quiet.');
}

/** Keeps a stream open until the connection is closed, opening it again after a drop with a backoff. */
async function run(c: Connection, d: InstanceType<typeof door.Door>): Promise<void> {
  const { signal } = c.abort;
  let backoff = streamTimings.reconnectMinMs;
  while (!signal.aborted) {
    try {
      await listen(c, d, () => (backoff = streamTimings.reconnectMinMs));
    } catch (err) {
      // a refused sign-in (no licence) will not be better for asking again: the poll carries on alone
      if (err instanceof door.RefusedError) return;
    }
    setLive(c, false);
    if (signal.aborted) return;
    await sleep(backoff, signal);
    backoff = Math.min(streamTimings.reconnectMaxMs, backoff * 2);
  }
}

export interface StreamTarget {
  baseUrl: string;
  /** the device key's 32 bytes: it signs the call */
  key: Uint8Array;
}

/** Starts listening on the event stream (opening it unless another listener already has) and calls `listener` for what it says. Call `close` when
 * the answer is no longer awaited. */
export function listenForAnswers(target: StreamTarget, listener: StreamListener): AnswerStream {
  const id = `${target.baseUrl}|${vault.publicKeyHexFromKey(target.key)}`;
  let c = connections.get(id);
  if (!c) {
    c = { listeners: new Set(), abort: new AbortController(), live: false, heard: Date.now() };
    connections.set(id, c);
    void run(c, new door.Door({ baseUrl: target.baseUrl, key: target.key }));
  }
  const conn = c;
  conn.listeners.add(listener);
  const onVisible = (): void => {
    if (document.visibilityState !== 'visible') return;
    // the OS may have suspended the stream and swallowed what it said: look now, and open a new stream if this one has gone quiet
    if (Date.now() - conn.heard > streamTimings.staleMs) conn.cut?.();
    listener.wake();
  };
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);
  let closed = false;
  return {
    live: () => conn.live,
    close() {
      if (closed) return;
      closed = true;
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible);
      conn.listeners.delete(listener);
      if (conn.listeners.size === 0) {
        conn.abort.abort();
        conn.live = false;
        if (connections.get(id) === conn) connections.delete(id);
      }
    },
  };
}
