// src/ui/SourceSegment.tsx — the Greek | Hebrew segment (mw-gdcyf98.10, PROVISIONAL): a two-step control at the top of the Goal and Placement screens, drawn only while both
// languages are chosen, that says which ladder the screen draws (languageInHand.ts). Its value is kept in sourceSegmentStore.ts. Later screens that choose between the
// two sources reuse it.
import type { LadderLang } from '../data/grammar/ladders';
import { useSourceSegment, writeSourceSegment } from './sourceSegmentStore';

const STEPS: readonly { lang: LadderLang; label: string }[] = [
  { lang: 'grc', label: 'Greek' },
  { lang: 'hbo', label: 'Hebrew' },
];

/** The two-step segment: the step in hand is pressed. A step is a 48 px button that may shrink to its label (a third of a phone held sideways leaves a screen 208 px); the pair is a group named by `label`. */
export function SourceSegment({ label = 'Language' }: { label?: string }) {
  const segment = useSourceSegment();
  return (
    <div role="group" aria-label={label} data-testid="source-segment" className="mx-4 mt-3 flex overflow-hidden rounded-xl border border-line">
      {STEPS.map((step) => (
        <button
          key={step.lang}
          type="button"
          aria-pressed={segment === step.lang}
          data-lang={step.lang}
          onClick={() => writeSourceSegment(step.lang)}
          className={`min-h-12 min-w-0 flex-1 px-1 text-lg font-medium ${segment === step.lang ? 'bg-accent text-accent-fg' : 'text-fg active:bg-line'}`}
        >
          {step.label}
        </button>
      ))}
    </div>
  );
}
