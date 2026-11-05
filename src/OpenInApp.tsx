// src/OpenInApp.tsx — 'Open in the app' (mw-5r3p30.1041): a strip that FLOATS over the top of the screen (mw-5r3p30.1051: out of the flow, so it takes no room from ShellBars or --lp-bars-h and
// the reading text does not slide down when the API answers late; it covers the top edge until he taps 'Not now', clear of the floating ?) shown only in a Chrome tab on Android where the installed Lampas is reported (src/openInApp.ts). The tap opens the address as it is NOW in a new tab with no referrer, with the verse at the top of the box in it (src/openInApp.ts handedHref, goTo), which Chrome hands to the installed app; 'Not now' puts
// it away for the session. Never shown in the installed app, and nothing leaves the page unless he taps. It keeps the phone's own text size and wraps at large text.
import { useEffect, useState } from 'react';
import { DISMISSED_KEY, goTo, handedHref, installedAppSeen, verseOnTop } from './openInApp';

const dismissedBefore = (): boolean => {
  try {
    return window.sessionStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
};

export function OpenInApp() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (dismissedBefore()) return;
    let live = true;
    void installedAppSeen().then((seen) => live && setShown(seen));
    return () => {
      live = false;
    };
  }, []);
  if (!shown) return null;
  const putAway = (): void => {
    try {
      window.sessionStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // a tab that keeps no storage shows it again on the next open: harmless
    }
    setShown(false);
  };
  return (
    <section aria-label="Open in the app" data-open-in-app className="absolute inset-x-0 top-0 flex flex-wrap items-center justify-center gap-2 border-b border-line bg-surface px-3 py-2 shadow-md">
      <button type="button" onClick={() => goTo(handedHref(window.location.href, verseOnTop()))} className="chrome-text min-h-11 flex-1 rounded-xl bg-accent px-3 font-medium text-accent-fg">
        Open in the app
      </button>
      <button type="button" onClick={putAway} className="chrome-text min-h-11 rounded-xl border border-line px-4 font-medium">
        Not now
      </button>
    </section>
  );
}
