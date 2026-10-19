// src/ImmersiveHint.tsx — the card that says how the Immersive reader works (src/immersive.ts), drawn above the Reader's text while Immersive
// reader is On and the setting Immersive reader card is On. 'Got it' closes it until the Reader opens again; "Don't show this again" sets the
// setting to Off (Settings > Immersive reader card brings it back). It sits in the page's flow above the text, so it never covers the round
// Ask button, and nothing is drawn until the saved choice is read. It slides away with the bars (src/Away.tsx) and comes back with them: pinned above
// the text while he reads it took a quarter of the screen upright and nearly half sideways (mw-5r3p30.331).
import { useState } from 'react';
import { Away } from './Away';
import { immersiveHintSetting } from './settings/definitions';
import { setSetting, useSetting } from './settings/store';
import { useHeldSpace } from './ui/heldSpace';

export const IMMERSIVE_HINT_LINES = [
  'Scroll down and the bars slide away.',
  'Tap with two fingers to bring them back or put them away.',
  'To leave immersive reading: Settings > Immersive reader.',
] as const;

export function ImmersiveHint({ enabled, away }: { enabled: boolean; away: boolean }) {
  const setting = useSetting(immersiveHintSetting);
  const [closed, setClosed] = useState(false);
  // the card's place stays empty for a moment after it goes, so a double tap on Got it does not land on the text that slides up into it (mw-8m9dyu.10)
  const held = useHeldSpace();
  if (!enabled || setting !== 'on' || closed) return held.space;
  const close = (card: Element | null) => {
    held.hold(card);
    setClosed(true);
  };
  return (
    <Away enabled away={away}>
    <aside role="note" aria-label="How the immersive reader works" data-immersive-hint className="mx-2 mt-2 shrink-0 rounded-2xl border border-line bg-surface p-3">
      {IMMERSIVE_HINT_LINES.map((line) => (
        <p key={line} className="py-0.5 text-lg leading-snug">
          {line}
        </p>
      ))}
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={(e) => close(e.currentTarget.closest('aside'))} className="min-h-12 flex-1 rounded-xl bg-accent px-4 text-base font-semibold text-accent-fg">
          Got it
        </button>
        <button
          type="button"
          onClick={(e) => {
            close(e.currentTarget.closest('aside'));
            void setSetting(immersiveHintSetting, 'off');
          }}
          className="min-h-12 flex-1 rounded-xl border border-line px-4 text-base font-medium"
        >
          Don&apos;t show this again
        </button>
      </div>
    </aside>
    </Away>
  );
}
