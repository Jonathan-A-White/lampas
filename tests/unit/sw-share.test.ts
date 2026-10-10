// The worker takes a share from another app (mw-y3qno5.2): a POST to the share target parks the pictures and words in Dexie and answers with a redirect to
// the Share screen; a GET to the same path is a page load and is left to the app. src/sw.ts runs here as if it were the worker.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { SHARE_TARGET_PATH } from '../../src/share/target';

vi.mock('workbox-precaching', () => ({ precacheAndRoute: vi.fn(), createHandlerBoundToURL: vi.fn() }));
vi.mock('workbox-routing', () => ({ registerRoute: vi.fn(), NavigationRoute: class {} }));

type FetchListener = (event: { request: Request; respondWith: (p: Promise<Response> | Response) => void }) => void;
const fetchListeners: FetchListener[] = [];

beforeAll(async () => {
  vi.spyOn(window, 'addEventListener').mockImplementation(((type: string, listener: FetchListener) => {
    if (type === 'fetch') fetchListeners.push(listener);
  }) as typeof window.addEventListener);
  Object.assign(window, { skipWaiting: vi.fn(), clients: { claim: vi.fn() }, __WB_MANIFEST: [] });
  Object.defineProperty(window, 'caches', { configurable: true, value: { keys: async () => [], open: vi.fn() } });
  await import('../../src/sw');
});

beforeEach(() => db.shares.clear());
afterAll(() => db.close());

/** The answer the worker gives to `request`, or undefined when no listener answered it. */
async function answerTo(request: Request): Promise<Response | undefined> {
  let answer: Promise<Response> | Response | undefined;
  for (const listener of fetchListeners) listener({ request, respondWith: (p) => (answer = p) });
  return answer;
}

const picture = (name: string, bytes: number[]): File => new File([new Uint8Array(bytes)], name, { type: 'image/png' });

/** A POST to the share target. Node's Request cannot parse a jsdom File, so the request is a stand-in with the url, the method and the form. */
function post(form: FormData, path = SHARE_TARGET_PATH): Request {
  return { method: 'POST', url: `${window.location.origin}${path}`, formData: async () => form } as unknown as Request;
}

function sharePost(): Request {
  const form = new FormData();
  form.append('files', picture('one.png', [1, 2, 3]));
  form.append('files', picture('two.png', [4, 5]));
  form.append('title', 'A lexicon entry');
  form.append('text', 'ἀγάπη in BDAG');
  return post(form);
}

describe('the worker taking a share', () => {
  it('parks two pictures and the words as one pending share and redirects to the Share screen', async () => {
    const answer = await answerTo(sharePost());
    expect(answer?.status).toBe(303);
    const rows = await db.shares.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].files.map((f) => f.name)).toEqual(['one.png', 'two.png']);
    expect(rows[0].files.map((f) => f.type)).toEqual(['image/png', 'image/png']);
    expect(Array.from(new Uint8Array(rows[0].files[0].bytes))).toEqual([1, 2, 3]);
    expect(rows[0].text).toBe('A lexicon entry\nἀγάπη in BDAG');
    const to = new URL(answer?.headers.get('Location') ?? '');
    expect(to.pathname).toBe('/');
    expect(to.hash).toBe(`#/share?s=${encodeURIComponent(rows[0].id)}`);
  });

  it('keeps one share only: a second replaces the first', async () => {
    await answerTo(sharePost());
    await answerTo(sharePost());
    expect(await db.shares.count()).toBe(1);
  });

  it('parks a share of words alone, with no files', async () => {
    const form = new FormData();
    form.append('text', 'https://example.org/entry');
    await answerTo(post(form));
    const rows = await db.shares.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].files).toEqual([]);
    expect(rows[0].text).toBe('https://example.org/entry');
  });

  it('answers a share with nothing in it by opening Home, and parks nothing', async () => {
    const answer = await answerTo(post(new FormData()));
    expect(new URL(answer?.headers.get('Location') ?? '').hash).toBe('');
    expect(await db.shares.count()).toBe(0);
  });

  it('does not answer a GET to the share URL, nor a POST anywhere else', async () => {
    expect(await answerTo(new Request(`${window.location.origin}${SHARE_TARGET_PATH}`))).toBeUndefined();
    expect(await answerTo(post(new FormData(), '/elsewhere'))).toBeUndefined();
    expect(await db.shares.count()).toBe(0);
  });
});
