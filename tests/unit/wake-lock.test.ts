// src/speech/wakeLock.ts: the screen stays on while ANY holder wants it (reading aloud, the Immersive reader), and goes back to sleep when the last one lets go.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { holdAwake, keepAwake, letSleep, releaseAwake } from '../../src/speech/wakeLock';

let requests: number;
let released: number;
/** the release listener of each lock handed out: the browser dropping a lock fires it */
let dropped: Array<() => void>;

beforeEach(() => {
  requests = 0;
  released = 0;
  dropped = [];
  Object.defineProperty(navigator, 'wakeLock', {
    configurable: true,
    value: {
      request: vi.fn(async () => {
        requests += 1;
        return {
          addEventListener: (_: string, listener: () => void) => dropped.push(listener),
          release: async () => {
            released += 1;
          },
        };
      }),
    },
  });
});

afterEach(() => {
  releaseAwake('immersive');
  letSleep();
  delete (navigator as unknown as { wakeLock?: unknown }).wakeLock;
});

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('wake lock holders', () => {
  it('asks for the lock when a holder wants it, once for two holders, and releases it on the last one letting go', async () => {
    holdAwake('immersive');
    await settle();
    expect(requests).toBe(1);

    keepAwake();
    await settle();
    expect(requests).toBe(1);

    letSleep();
    await settle();
    expect(released).toBe(0);

    releaseAwake('immersive');
    await settle();
    expect(released).toBe(1);
  });

  it('keeps the lock for reading aloud when the Immersive reader lets go', async () => {
    keepAwake();
    holdAwake('immersive');
    await settle();
    releaseAwake('immersive');
    await settle();
    expect(requests).toBe(1);
    expect(released).toBe(0);
    letSleep();
    await settle();
    expect(released).toBe(1);
  });

  it('holding twice under one name still lets go at one release', async () => {
    holdAwake('immersive');
    holdAwake('immersive');
    await settle();
    releaseAwake('immersive');
    await settle();
    expect(released).toBe(1);
  });

  it('asks again when the browser drops the lock while a holder still wants it', async () => {
    holdAwake('immersive');
    await settle();
    expect(requests).toBe(1);
    dropped[0]();
    await settle();
    expect(requests).toBe(2);

    // let go by its holder: no lock is asked for after it
    releaseAwake('immersive');
    await settle();
    expect(released).toBe(1);
    expect(requests).toBe(2);
  });

  it('does nothing, and does not throw, where the phone has no wake lock', async () => {
    delete (navigator as unknown as { wakeLock?: unknown }).wakeLock;
    expect(() => holdAwake('immersive')).not.toThrow();
    await settle();
    expect(() => releaseAwake('immersive')).not.toThrow();
    expect(requests).toBe(0);
  });
});
