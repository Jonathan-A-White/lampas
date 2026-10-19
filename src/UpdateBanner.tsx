// src/UpdateBanner.tsx: 'Update ready, tap to reload', above the content while a newer build waits, with a line under it
// naming the waiting version and what is in it (src/whatsNew/BannerSummary.tsx).
// The tap goes dead and says 'Updating…' until the page reloads.
// It stays in the shell's flow, at the top, so with nothing open it pushes the screen down and covers no header; `relative z-60` (the layer of the tutor's
// 'tap to play' bar, src/speech/TutorWaitingBar.tsx) lifts it above the Verse view (fixed, z-5) and every sheet, which would otherwise cover it
// and leave nothing to tap (mw-5r3p30.632, the fault of mw-5r3p30.322).
import { applyUpdate, useUpdateState } from 'pwa-kit/app-update';
import { BannerSummary } from './whatsNew/BannerSummary';

export function UpdateBanner() {
  const state = useUpdateState();
  if (state === 'none') return null;
  const updating = state === 'updating';
  return (
    <div data-update-banner className="relative z-60 shrink-0 border-b border-line bg-accent text-accent-fg">
      <button
        type="button"
        onClick={applyUpdate}
        disabled={updating}
        className="flex w-full items-center justify-center px-3 py-3 text-base font-medium disabled:opacity-70"
      >
        {updating ? 'Updating…' : 'Update ready, tap to reload'}
      </button>
      {updating ? null : <BannerSummary />}
    </div>
  );
}
