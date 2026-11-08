// src/NumberSheet.tsx — the sheet a compound number opens (mw-5r3p30.1127, his ask 2026-11-06 on Genesis 14:14 'the 318'): the number as the English says it, the words the Hebrew or the Greek
// says it in, in source order, each with what it is worth, and the sum ('8 + 10 + 300 = 318'). Each word is a button that opens its own word sheet over this one (WordSheet.tsx WordOrNumber).
// The phrase is found by src/data/numerals.ts. Closes by a tap outside, a swipe down on its handle, Done, Escape or the phone's Back, as the word sheet does.
import { wordGloss, type Chapter, type GreekWord } from './data/chapter';
import type { NumeralPhrase } from './data/numerals';
import { cardForm } from './reader/septuagint';
import { faceOf } from './script/greekLang';
import { BarSlot } from './speech/SpeakingBarSlot';
import { hebrewPointedForm } from './speech/hebrewPronunciation';
import { useDoorTarget } from './tutor/door';
import { useSheetBack } from './ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from './ui/sheetDrag';

/** The words of a numeral phrase, by language: 'the Hebrew says it in 4 words'. */
const sayings = (phrase: NumeralPhrase): string => `${phrase.language === 'hbo' ? 'The Hebrew' : 'The Greek'} says it in ${phrase.parts.length} words`;

/** `covered`: a word sheet stands over this one, so Escape belongs to it. `onWord` opens the word sheet of one word of the phrase. */
export function NumberSheet({ chapter, phrase, covered, onWord, onClose }: { chapter: Chapter; phrase: NumeralPhrase; covered: boolean; onWord: (word: GreekWord) => void; onClose: () => void }) {
  const { drag, handle } = useSheetDrag(onClose);
  useEscapeToClose(onClose, !covered);
  useSheetBack(onClose);
  // nothing to ask the tutor about a number: the round ? is not drawn over this sheet
  useDoorTarget(() => undefined, true, true);
  const hebrew = phrase.language === 'hbo';
  const shown = (word: GreekWord): string => (hebrew ? hebrewPointedForm(word.t) : cardForm(chapter, word));
  const sum = phrase.sum.toLocaleString('en-US');
  return (
    // z-35 like the word sheet it opens: above the sheets it opens over, below the full-screen dialogs and the shell bars
    <div className="fixed inset-0 z-35 flex flex-col justify-end">
      <div data-testid="sheet-backdrop" aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Number"
        style={{ transform: drag ? `translateY(${drag}px)` : undefined }}
        className="relative rounded-t-2xl border-t border-line bg-surface"
      >
        <div data-testid="sheet-handle" {...handle} className="flex min-h-12 touch-none items-center justify-between gap-3 px-4 pt-2">
          <span aria-hidden="true" className="mx-auto h-1.5 w-10 rounded-full bg-line" />
          <button type="button" onClick={onClose} className="absolute right-2 top-1 min-h-11 min-w-11 rounded-lg px-3 text-base font-medium text-accent">
            Done
          </button>
        </div>
        <BarSlot level={4} />
        <div className="px-4 pb-[calc(1rem+var(--lp-end-inset))] pt-1">
          <h2 data-testid="number-sum" className="text-4xl font-bold tabular-nums">
            {sum}
          </h2>
          <p className="text-base text-muted">{sayings(phrase)}, in the order it is written</p>
          <ul aria-label="Words of the number" className="mt-2 flex max-h-[55dvh] flex-col overflow-y-auto">
            {phrase.parts.map((part) => {
              const gloss = wordGloss(chapter, part.word);
              return (
                <li key={part.index} data-number-word="" className="border-t border-line">
                  <button type="button" onClick={() => onWord(part.word)} className="flex min-h-14 w-full items-center justify-between gap-3 py-2 text-left active:bg-line">
                    <span className="flex min-w-0 flex-col">
                      <span {...faceOf(phrase.language, { greek: 'text-2xl font-semibold', hebrew: 'hebrew-choice text-2xl font-semibold' })}>{shown(part.word)}</span>
                      {gloss ? <span className="break-words text-base text-muted">{gloss}</span> : null}
                    </span>
                    {part.value !== undefined ? (
                      <span data-testid="number-value" className="shrink-0 text-2xl font-semibold tabular-nums">
                        {part.value.toLocaleString('en-US')}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
          <p data-testid="number-line" className="mt-3 border-t border-line pt-3 text-2xl font-semibold tabular-nums">
            {phrase.line}
          </p>
        </div>
      </div>
    </div>
  );
}
