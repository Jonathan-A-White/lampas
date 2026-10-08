// src/speech/wakeLock.ts — keeps the screen on while Lampas reads a chapter aloud (docs/pwa-best-practices.md section 11:
// the browser drops the lock whenever the page hides, so it is asked for again when the page is visible again).
// Held only while a reading is going: released on pause and stop. A phone without the API reads on regardless.
let wanted = false;
let sentinel: WakeLockSentinel | null = null;
let watching = false;

async function acquire(): Promise<void> {
  if (!wanted || sentinel || typeof navigator === 'undefined' || !navigator.wakeLock || document.visibilityState !== 'visible') return;
  try {
    const lock = await navigator.wakeLock.request('screen');
    if (!wanted) {
      void lock.release().catch(() => {});
      return;
    }
    sentinel = lock;
    lock.addEventListener('release', () => {
      if (sentinel === lock) sentinel = null;
    });
  } catch {
    // refused (low battery, not allowed): the reading goes on with the screen free to sleep
  }
}

export function keepAwake(): void {
  wanted = true;
  if (!watching && typeof document !== 'undefined') {
    watching = true;
    document.addEventListener('visibilitychange', () => void acquire());
  }
  void acquire();
}

export function letSleep(): void {
  wanted = false;
  const lock = sentinel;
  sentinel = null;
  void lock?.release().catch(() => {});
}
