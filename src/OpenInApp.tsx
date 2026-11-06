// src/OpenInApp.tsx — 'Open in the app' (mw-5r3p30.1041): a strip that FLOATS over the top of the screen (mw-5r3p30.1051: out of the flow, so it takes no room from ShellBars or --lp-bars-h and
// the reading text does not slide down when the API answers late; it floats UNDER the shell's other bars and the screen's own top bar (mw-5r3p30.1093, stripTop), so none is covered, until he taps 'Not now', clear of the floating ?) shown only in a Chrome tab (or a Custom Tab, a link tapped in another app) on Android where the installed Lampas is reported (src/openInApp.ts). The tap opens the address as it is NOW in a new tab with no referrer, with the verse at the top of the box in it (src/openInApp.ts handOverHref, goTo), which Chrome hands to the installed app; 'Not now' puts
// it away for the session (the tap guard then drops the taps that follow for a moment, src/ui/tapGuard.ts, mw-5r3p30.1100); a second tap of a double tap does nothing (oneTap, mw-5r3p30.1093). Never shown in the installed app, and nothing leaves the page unless he taps. It keeps the phone's own text size and wraps at large text.
import { useEffect, useRef, useState } from 'react';
import { DISMISSED_KEY, HAND_OVER_WAIT_MS, NOT_OPENED_HINT, goTo, handOverHref, installedAppSeen, STRIP_ROOM_VAR, stripRoom, stripTop } from './openInApp';
import { oneTap } from './ui/settle';

const dismissedBefore = (): boolean => {
  try {
    return window.sessionStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
};

export function OpenInApp() {
  const [shown, setShown] = useState(false);
  const [top, setTop] = useState<number | null>(null);
  const [stayed, setStayed] = useState(false);
  const watching = useRef<(() => void) | null>(null);
  const section = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (dismissedBefore()) return;
    let live = true;
    void installedAppSeen().then((seen) => live && setShown(seen));
    return () => {
      live = false;
    };
  }, []);
  // the strip stands where the bars above it and the screen's top bar end, and follows them: a screen change, a bar arriving, a turn of the phone
  useEffect(() => {
    if (!shown) return;
    let frame = 0;
    const place = (): void => {
      frame = 0;
      setTop(stripTop());
      document.documentElement.style.setProperty(STRIP_ROOM_VAR, `${stripRoom(section.current)}px`);
    };
    const soon = (): void => {
      if (frame === 0) frame = window.requestAnimationFrame(place);
    };
    place();
    const watch = new MutationObserver(soon);
    watch.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', soon);
    window.addEventListener('hashchange', soon);
    return () => {
      watch.disconnect();
      document.documentElement.style.removeProperty(STRIP_ROOM_VAR);
      window.removeEventListener('resize', soon);
      window.removeEventListener('hashchange', soon);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, [shown]);
  // mw-5r3p30.1091: after the tap, a page the app took over is hidden (pagehide, or visibilitychange to hidden) within the wait; one still showing after it was not taken over
  useEffect(() => () => watching.current?.(), []);
  if (!shown) return null;
  const handOver = (): void => {
    goTo(handOverHref());
    watching.current?.();
    const stop = (): void => {
      window.clearTimeout(timer);
      window.removeEventListener('pagehide', stop);
      document.removeEventListener('visibilitychange', onChange);
      watching.current = null;
    };
    const onChange = (): void => {
      if (document.visibilityState === 'hidden') stop();
    };
    const timer = window.setTimeout(() => {
      const visible = document.visibilityState === 'visible';
      stop();
      if (visible) setStayed(true);
    }, HAND_OVER_WAIT_MS);
    window.addEventListener('pagehide', stop);
    document.addEventListener('visibilitychange', onChange);
    watching.current = stop;
  };
  const putAway = (): void => {
    try {
      window.sessionStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // a tab that keeps no storage shows it again on the next open: harmless
    }
    setShown(false);
  };
  return (
    <section ref={section} aria-label="Open in the app" data-open-in-app style={{ top: top ?? '100%' }} className="absolute inset-x-0 flex flex-wrap items-center justify-center gap-2 border-b border-line bg-surface px-3 py-2 shadow-md">
      {stayed ? (
        <p className="chrome-text min-w-0 flex-1 basis-60">{NOT_OPENED_HINT}</p>
      ) : (
        <button type="button" onClick={() => oneTap('open-in-app', handOver)} className="chrome-text min-h-11 flex-1 rounded-xl bg-accent px-3 font-medium text-accent-fg">
          Open in the app
        </button>
      )}
      <button type="button" onClick={putAway} className="chrome-text min-h-11 rounded-xl border border-line px-4 font-medium">
        Not now
      </button>
    </section>
  );
}
