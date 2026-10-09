// src/resources/openApp.ts — a study link to an app opens by the app's own scheme (the link's href; the phone hands it to the app).
// When the phone has no app for the scheme nothing happens at all, so a tap also arms this: if the page is still in front after
// `waitMs` (no app took it: the page was not hidden, blurred or left), the link's https fallback is opened. https only, never the other way round.
// A link with no fallback says so instead: `onMissing` is called (the word sheet then tells him the app is not on the phone).
// Settings asks the same question once, when he turns an app On: `checkApp` opens the app itself and hears whether the page went away.

export interface OpenEnv {
  waitMs: number;
  /** runs `fn` after `waitMs`; the returned function cancels it */
  after(fn: () => void): () => void;
  /** calls `fn` when the page goes away (hidden, blurred, left); the returned function stops listening */
  onAway(fn: () => void): () => void;
  open(url: string): void;
  /** hands an app's own address to the phone in this tab (an address the phone cannot open does nothing) */
  launch(url: string): void;
  /** calls `fn` once when the page is back in front; the returned function stops listening */
  onReturn(fn: () => void): () => void;
}

export const browserEnv: OpenEnv = {
  waitMs: 1500,
  after: (fn) => {
    const id = window.setTimeout(fn, browserEnv.waitMs);
    return () => window.clearTimeout(id);
  },
  onAway: (fn) => {
    const hidden = (): void => {
      if (document.visibilityState === 'hidden') fn();
    };
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('pagehide', fn);
    window.addEventListener('blur', fn);
    return () => {
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('pagehide', fn);
      window.removeEventListener('blur', fn);
    };
  },
  open: (url) => {
    if (!window.open(url, '_blank', 'noopener')) window.location.assign(url);
  },
  // a tap on a link to the app's own address, as the Study tiles are: what a phone is known to hand to an app
  launch: (url) => {
    const a = document.createElement('a');
    a.href = url;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
  },
  onReturn: (fn) => {
    const back = (): void => {
      if (document.visibilityState === 'visible') fn();
    };
    document.addEventListener('visibilitychange', back);
    window.addEventListener('focus', fn);
    return () => {
      document.removeEventListener('visibilitychange', back);
      window.removeEventListener('focus', fn);
    };
  },
};

/** Arms the wait for a tap on an app link. When the page is still in front after it: opens the https fallback, or, for a link with none
 *  (or one that is not https), calls `onMissing`. With neither, nothing is armed. */
export function armFallback(fallback: string | undefined, env: OpenEnv = browserEnv, onMissing?: () => void): void {
  const web = fallback?.startsWith('https://') ? fallback : undefined;
  const run = web ? (): void => env.open(web) : onMissing;
  if (!run) return;
  let stopListening = (): void => {};
  const cancel = env.after(() => {
    stopListening();
    run();
  });
  stopListening = env.onAway(() => {
    cancel();
    stopListening();
  });
}

/** Settings' check that an app is on the phone: opens `probe` (the app's own address) once. The page going away means the app opened:
 *  `onOpened` is called at once, and `onBack` when the page is next in front. The page still in front after the wait means no app took it:
 *  `onMissing`. Returns a function that drops the check. */
export function checkApp(
  probe: string,
  handlers: { onOpened?: () => void; onBack: () => void; onMissing: () => void },
  env: OpenEnv = browserEnv,
): () => void {
  let stopReturn = (): void => {};
  let stopAway = (): void => {};
  const cancelWait = env.after(() => {
    stopAway();
    handlers.onMissing();
  });
  stopAway = env.onAway(() => {
    cancelWait();
    stopAway();
    handlers.onOpened?.();
    stopReturn = env.onReturn(() => {
      stopReturn();
      handlers.onBack();
    });
  });
  env.launch(probe);
  return () => {
    cancelWait();
    stopAway();
    stopReturn();
  };
}
