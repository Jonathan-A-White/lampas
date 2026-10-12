// src/ImmersiveHint.tsx — the card that says how the Immersive reader works (src/immersive.ts), drawn above the Reader's text while Immersive
// reader is On and the setting Immersive reader card is On. 'Got it' closes it until the Reader opens again; "Don't show this again" sets the
// setting to Off (Settings > Immersive reader card brings it back). It sits in the page's flow above the text, so it never covers the round
// Ask button, and nothing is drawn until the saved choice is read.
import { useState } from 'react';
import { immersiveHintSetting } from './settings/definitions';
import { setSetting, useSetting } from './settings/store';

export const IMMERSIVE_HINT_LINES = [
  'Scroll down and the bars slide away.',
  'Tap with three fingers to bring them back.',
  'To leave immersive reading: Settings > Immersive reader.',
] as const;

export function ImmersiveHint({ enabled }: { enabled: boolean }) {
  const setting = useSetting(immersiveHintSetting);
  const [closed, setClosed] = useState(false);
  if (!enabled || setting !== 'on' || closed) return null;
  return (
    <aside role="note" aria-label="How the immersive reader works" data-immersive-hint className="mx-2 mt-2 shrink-0 rounded-2xl border border-line bg-surface p-3">
      {IMMERSIVE_HINT_LINES.map((line) => (
        <p key={line} className="py-0.5 text-lg leading-snug">
          {line}
        </p>
      ))}
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={() => setClosed(true)} className="min-h-12 flex-1 rounded-xl bg-accent px-4 text-base font-semibold text-accent-fg">
          Got it
        </button>
        <button
          type="button"
          onClick={() => {
            setClosed(true);
            void setSetting(immersiveHintSetting, 'off');
          }}
          className="min-h-12 flex-1 rounded-xl border border-line px-4 text-base font-medium"
        >
          Don&apos;t show this again
        </button>
      </div>
    </aside>
  );
}
