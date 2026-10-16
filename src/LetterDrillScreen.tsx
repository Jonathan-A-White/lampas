// src/LetterDrillScreen.tsx — the letter drill that Got it on The Greek alphabet starts (mw-86e9r1.11, docs/grammar.md 'The letter drill'): a full screen over the idea
// sheet that asks the 24 letters, small and capital, by ear or by name, eight questions to a round (data/grammar/letterDrill.ts), each drawn as Review draws a letter
// (GrammarCard). After each answer he reads whether he was right and taps Next; a round ends on its score and 'Another round' / 'Done', and a drill in which every
// letter is right in both forms ends on 'Done' alone. Each answer is kept through noteDrillAnswer (a right one credits that letter; a sitting never makes it solid).
import { useState } from 'react';
import { answerTarget, drawRound, isComplete, newDrillRandom, rightCount, startLetterDrill, ROUND_SIZE, TARGETS, type LetterDrillState, type RoundItem } from './data/grammar/letterDrill';
import { ideaOf } from './data/grammar/ladder';
import { noteDrillAnswer } from './data/repositories';
import { GrammarCard } from './GrammarCard';
import { focusOnMount } from './ui/focus';
import { FootBar } from './ui/NextBar';
import { useSettled } from './ui/settle';
import { useSheetBack } from './ui/sheetBack';

const BUTTON = 'min-h-12 w-full rounded-xl border text-lg font-medium';
const PRIMARY = `${BUTTON} border-accent bg-accent text-accent-fg`;
const PLAIN = `${BUTTON} border-line text-accent active:bg-line`;

interface Sitting {
  drill: LetterDrillState;
  /** 1 for the first round */
  number: number;
  round: RoundItem[];
  /** the question being asked, or ROUND_SIZE when the round is over */
  at: number;
  /** the questions of this round answered right */
  rights: number;
}

export function LetterDrillScreen({ onClose }: { onClose: () => void }) {
  useSheetBack(onClose);
  const idea = ideaOf('alphabet');
  const [random] = useState(newDrillRandom);
  const [sitting, setSitting] = useState<Sitting>(() => {
    const drill = startLetterDrill();
    return { drill, number: 1, round: drawRound(drill, random), at: 0, rights: 0 };
  });
  // what he tapped on the question, held until he taps Next so he can read whether he was right
  const [picked, setPicked] = useState<string | null>(null);
  const { drill, round, at } = sitting;
  const over = at >= round.length;
  const item = over ? null : round[at];

  const pick = (option: string): void => {
    if (!item || picked !== null) return;
    const right = option === item.question.right;
    setPicked(option);
    setSitting({ ...sitting, drill: answerTarget(drill, item.target, right), rights: sitting.rights + (right ? 1 : 0) });
    void noteDrillAnswer(item.question, right).catch((error: unknown) => console.error('could not keep the letter drill answer', error));
  };
  const next = (): void => {
    setPicked(null);
    setSitting({ ...sitting, at: at + 1 });
  };
  const another = (): void => {
    setSitting({ drill, number: sitting.number + 1, round: drawRound(drill, random), at: 0, rights: 0 });
  };
  const done = isComplete(drill);
  // Done (and Another round) stand where Finish the round was: a second tap of a double tap on it waits for the round's end to settle (src/ui/settle.ts, mw-5r3p30.430)
  const settled = useSettled(`${sitting.number}:${at}`);

  return (
    <div role="dialog" aria-modal="true" aria-label="Letter drill" className="fixed inset-0 z-40 flex flex-col bg-surface">
      <header className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-1">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold">{idea.title}</h2>
          <p data-testid="letter-drill-step" className="text-sm text-muted">
            {over ? `Round ${sitting.number} done` : `Round ${sitting.number} · Question ${at + 1} of ${round.length}`}
          </p>
        </div>
        <button type="button" onClick={onClose} className="min-h-11 min-w-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent">
          Stop
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-3">
        {item ? (
          <GrammarCard key={`${sitting.number}:${at}`} question={item.question} mode="choice" picked={picked} onPick={pick} sideBySide />
        ) : (
          <div data-testid="letter-round-result">
            <h3 className="text-2xl font-bold">
              {sitting.rights} of {round.length} right
            </h3>
            <p data-testid="letter-progress" className="mt-1 text-lg">
              {rightCount(drill)} of {TARGETS.length} right so far
            </p>
            <p className="mt-1 text-base text-muted">
              {done
                ? 'Every letter is right, small and capital.'
                : 'The 24 letters each count twice: once small, once as a capital. A letter you miss comes back in the next round.'}
            </p>
          </div>
        )}
      </div>
      <FootBar>
        {item ? (
          picked !== null ? (
            <button type="button" data-testid="letter-next" ref={focusOnMount} onClick={next} className={PRIMARY}>
              {at + 1 >= ROUND_SIZE || at + 1 >= round.length ? 'Finish the round' : 'Next'}
            </button>
          ) : (
            <p className="min-h-12 text-center text-base text-muted">Tap an answer.</p>
          )
        ) : (
          <div className="flex flex-col gap-2">
            {done ? null : (
              <button type="button" ref={focusOnMount} onClick={() => settled() && another()} className={PRIMARY}>
                Another round
              </button>
            )}
            <button type="button" ref={done ? focusOnMount : undefined} onClick={() => settled() && onClose()} className={done ? PRIMARY : PLAIN}>
              Done
            </button>
          </div>
        )}
      </FootBar>
    </div>
  );
}
