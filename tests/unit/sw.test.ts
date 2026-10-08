// The worker the Update banner talks to: SKIP_WAITING from a window makes it skip waiting, and on
// activate it claims the open windows so the page's controllerchange fires. src/sw.ts runs here as
// if it were the worker: `self` is the jsdom window, given the few members the worker touches.
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('workbox-precaching', () => ({ precacheAndRoute: vi.fn(), createHandlerBoundToURL: vi.fn() }));
vi.mock('workbox-routing', () => ({ registerRoute: vi.fn(), NavigationRoute: class {} }));

type Listener = (event: unknown) => void;
const listeners = new Map<string, Listener>();
const skipWaiting = vi.fn(async () => undefined);
const claim = vi.fn(async () => undefined);

beforeAll(async () => {
  vi.spyOn(window, 'addEventListener').mockImplementation(((type: string, listener: Listener) => {
    listeners.set(type, listener);
  }) as typeof window.addEventListener);
  Object.assign(window, { skipWaiting, clients: { claim }, __WB_MANIFEST: [] });
  Object.defineProperty(window, 'caches', { configurable: true, value: { keys: async () => [], open: vi.fn() } });
  await import('../../src/sw');
});

describe('the service worker taking over', () => {
  it("skips waiting on {type:'SKIP_WAITING'} from a window", () => {
    listeners.get('message')?.({ data: { type: 'SKIP_WAITING' } });
    expect(skipWaiting).toHaveBeenCalledTimes(1);
  });

  it('does not skip waiting for any other message', () => {
    skipWaiting.mockClear();
    listeners.get('message')?.({ data: { type: 'something-else' } });
    listeners.get('message')?.({ data: undefined });
    expect(skipWaiting).not.toHaveBeenCalled();
  });

  it('claims the open windows on activate', async () => {
    let settled: Promise<unknown> = Promise.resolve();
    listeners.get('activate')?.({ waitUntil: (p: Promise<unknown>) => (settled = p) });
    await settled;
    expect(claim).toHaveBeenCalledTimes(1);
  });
});
