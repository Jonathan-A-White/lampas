// src/ShellBars.tsx — the strip at the top of the app that holds the shell's bars, in the page flow and in this order: 'Update ready, tap to reload'
// (src/UpdateBanner.tsx), 'The tutor answered: tap to play' (src/speech/TutorWaitingBar.tsx) and 'Welcome back' (src/WelcomeBack.tsx). In the flow they stack and
// never overlap one another; `relative z-60` lifts the strip above the Verse view (fixed, z-5) and every sheet, so each bar can be tapped while one is open
// (mw-5r3p30.632). Its foot is written to --lp-bars-h on the page, and src/index.css starts every full-screen layer (`.fixed.inset-0`: the Verse view, the
// sheets and their backdrops) that far down and caps a sheet's panel to the room left, so a bar never covers a view's own header (mw-5r3p30.636).
import { useEffect, useRef, type ReactNode } from 'react';

export function ShellBars({ children }: { children: ReactNode }) {
  const strip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = strip.current;
    if (!element) return;
    const root = document.documentElement;
    // the strip's foot, from the top of the screen (under the phone's own top inset, which #root pads), or nothing while no bar shows
    const measure = (): void => {
      const { height, bottom } = element.getBoundingClientRect();
      root.style.setProperty('--lp-bars-h', height > 0 ? `${bottom}px` : '0px');
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return () => root.style.removeProperty('--lp-bars-h');
    const watch = new ResizeObserver(measure);
    watch.observe(element);
    return () => {
      watch.disconnect();
      root.style.removeProperty('--lp-bars-h');
    };
  }, []);
  return (
    <div ref={strip} data-shell-bars className="relative z-60 shrink-0">
      {children}
    </div>
  );
}
