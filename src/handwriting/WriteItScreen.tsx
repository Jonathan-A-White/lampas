// src/handwriting/WriteItScreen.tsx — Write it from a letter's lesson (mw-86e9r1.51): a full screen over the letter's sheet with one Write it card at a time.
// After a right he writes it again, or goes on to the next stage when the right moved him there, or is done; Skip and Done close it with nothing lost.
import { useState } from 'react';
import type { GrammarIdea } from '../data/grammar/ladder';
import { focusOnMount } from '../ui/focus';
import { useSheetBack } from '../ui/sheetBack';
import { isWrittenFromMemory, type WriteProgress, type WriteStage } from './progression';
import { WriteIt } from './WriteIt';
import { WRITE_PLAIN, WRITE_PRIMARY } from './writeText';

/** The button that goes on after a right: the next stage's name when the right moved him there. */
function goOnLabel(before: WriteStage, after: WriteProgress): string {
  if (before === after.stage || isWrittenFromMemory(after)) return 'Write it again';
  return after.stage === 'copy' ? 'Copy it' : 'Write it from memory';
}

export function WriteItScreen({ idea, onClose }: { idea: GrammarIdea; onClose: () => void }) {
  useSheetBack(onClose);
  // each card is a new attempt, at the stage he is at as it opens
  const [card, setCard] = useState(0);
  return (
    <div role="dialog" aria-modal="true" aria-label="Write it" className="fixed inset-0 z-40 flex flex-col bg-surface">
      <header className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-1">
        <h2 className="flex-1 title-wrap text-lg font-bold">Write it: {idea.title}</h2>
        <button type="button" onClick={onClose} className="min-h-11 min-w-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent">
          Done
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-3 pb-[calc(1rem+var(--lp-bar-inset))]">
        <WriteIt
          key={card}
          idea={idea}
          onSkip={onClose}
          afterRight={(after, stage) => (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" data-testid="write-next" ref={focusOnMount} onClick={() => setCard(card + 1)} className={WRITE_PRIMARY}>
                {goOnLabel(stage, after)}
              </button>
              <button type="button" onClick={onClose} className={WRITE_PLAIN}>
                Done
              </button>
            </div>
          )}
        />
      </div>
    </div>
  );
}
