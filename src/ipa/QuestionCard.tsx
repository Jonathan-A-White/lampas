// src/ipa/QuestionCard.tsx — one question of the course 'Learn the IPA sounds', drawn for the drill and the pass check (mw-5r3p30.356). HEAR: the prompt and the Tap to
// hear bar (the voice says the word), the choices are symbols. SEE: the symbol large, the choices are key words. `tell` says whether the answer is told at
// once (the drill) or the choice is only marked as his, with no hint of which was right (the pass check).
import { TapToHear } from '../TapToHear';
import type { SoundId } from '../speech/sounds';
import type { IpaQuestion } from './drill';

const CHOICE = 'min-h-14 w-full rounded-xl border px-4 py-2 text-left active:bg-line disabled:opacity-100';

export function QuestionCard({ question, picked, onPick, tell }: { question: IpaQuestion; picked: SoundId | null; onPick: (id: SoundId) => void; tell: boolean }) {
  const answered = picked !== null;
  return (
    <div data-testid="ipa-question" data-direction={question.direction}>
      <p data-testid="ipa-prompt" className="text-xl font-medium">
        {question.prompt}
      </p>
      {question.symbol ? (
        <p data-testid="ipa-symbol" className="mt-3 text-center font-serif text-7xl">
          {question.symbol}
        </p>
      ) : null}
      {question.say ? (
        <div className="mt-3">
          <TapToHear text={question.say} />
        </div>
      ) : null}
      <ul className="mt-4 space-y-2">
        {question.options.map((option) => {
          const isRight = tell && answered && option.id === question.right;
          const isWrong = tell && answered && option.id === picked && option.id !== question.right;
          const isPicked = !tell && answered && option.id === picked;
          return (
            <li key={option.id}>
              <button
                type="button"
                data-option=""
                data-sound={option.id}
                disabled={answered}
                aria-pressed={answered ? option.id === picked : undefined}
                onClick={() => onPick(option.id)}
                className={`${CHOICE} ${question.direction === 'hear' ? 'font-serif text-3xl' : 'text-lg'} ${isRight ? 'border-good' : isWrong ? 'border-bad' : isPicked ? 'border-accent' : 'border-line'}`}
              >
                {option.label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
