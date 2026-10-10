// src/resources/openApp.ts — a study link to an app opens by the app's own scheme (the link's href; the phone hands it to the app).
// When the phone has no app for the scheme nothing happens at all, so a tap also arms this: if the page is still in front after
// `waitMs` (no app took it: the page was not hidden, blurred or left), the link's https fallback is opened. https only, never the other way round.
// A link with no fallback says so instead: `onMissing` is called (the word sheet then tells him the app is not on the phone).
// Settings never asks: turning an app On opens nothing (a web page cannot see which apps a phone has) and offers Get <App> instead (mw-5r3p30.116).

export interface OpenEnv {
  waitMs: number;
  /** runs `fn` after `waitMs`; the returned function cancels it */
  after(fn: () => void): () => void;
  /** calls `fn` when the page goes away (hidden, blurred, left); the returned function stops listening */
  onAway(fn: () => void): () => void;
  open(url: string): void;
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
