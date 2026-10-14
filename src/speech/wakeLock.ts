// src/speech/wakeLock.ts — keeps the screen on while Lampas reads a chapter aloud (docs/pwa-best-practices.md section 11:
// the browser drops the lock whenever the page hides, so it is asked for again when the page is visible again).
// Held only while a holder wants it: reading aloud (keepAwake / letSleep: released on pause and stop) and the Immersive reader while the Reader is
// open (holdAwake('immersive') / releaseAwake('immersive'), src/immersive.ts). The lock is kept while any holder remains and let go with the last.
// A phone without the API reads on regardless.
const holders = new Set<string>();
let sentinel: WakeLockSentinel | null = null;
let watching = false;
/** a request is out: a second holder arriving meanwhile must not ask for a second lock */
let asking = false;

async function acquire(): Promise<void> {
  if (holders.size === 0 || sentinel || asking || typeof navigator === 'undefined' || !navigator.wakeLock || document.visibilityState !== 'visible') return;
  asking = true;
  try {
    const lock = await navigator.wakeLock.request('screen');
    if (holders.size === 0) {
      void lock.release().catch(() => {});
      return;
    }
    sentinel = lock;
    lock.addEventListener('release', () => {
      if (sentinel === lock) sentinel = null;
    });
  } catch {
    // refused (low battery, not allowed): the reading goes on with the screen free to sleep
  } finally {
    asking = false;
  }
}

export function holdAwake(holder: string): void {
  holders.add(holder);
  if (!watching && typeof document !== 'undefined') {
    watching = true;
    document.addEventListener('visibilitychange', () => void acquire());
  }
  void acquire();
}

export function releaseAwake(holder: string): void {
  holders.delete(holder);
  if (holders.size > 0) return;
  const lock = sentinel;
  sentinel = null;
  void lock?.release().catch(() => {});
}

/** Reading aloud wants the screen on. */
export function keepAwake(): void {
  holdAwake('reading');
}

export function letSleep(): void {
  releaseAwake('reading');
}
