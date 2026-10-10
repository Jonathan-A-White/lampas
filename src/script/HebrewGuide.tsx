// src/script/HebrewGuide.tsx — the pronunciation guide of a Hebrew word in the tutor's answer (mw-5r3p30.98, docs/hebrew.md): the bottom sheet a tap on the
// word opens (HebrewWord.tsx), and the card an answer to its Syllables and sounds carries. It reads the language's font class and direction from its
// src/script/scripts.ts entry, so a Hebrew Old Testament reader later reuses it unchanged.
import { useContext, useId } from 'react';
import { createPortal } from 'react-dom';
import type { HebrewSounds } from '../data/db';
import { SpeakButton } from '../speech/SpeakButton';
import { speak } from '../speech/greek';
import { BarSlot } from '../speech/SpeakingBarSlot';
import { HebrewAskContext, hebrewKey, noHebrewVoice } from './hebrewSpeech';
import { focusOnMount } from '../ui/focus';
import { useSheetBack } from '../ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from '../ui/sheetDrag';
import { HEBREW } from './scripts';

// The size is the parent's: the script class (src/index.css) sets 1.25em of it, which a size class on the span itself would not beat.
const HebrewLetters = ({ text }: { text: string }) => (
  <span lang={HEBREW.id} dir={HEBREW.dir} className={HEBREW.className}>
    {text}
  </span>
);

/** The sheet over the Talk sheet: the word large, Hear it, and Syllables and sounds (when the conversation can ask). `noVoice`: the tap that opened it found no Hebrew voice. */
export function HebrewGuide({ word, noVoice, onClose }: { word: string; noVoice: boolean; onClose: () => void }) {
  const asking = useContext(HebrewAskContext);
  const titleId = useId();
  const { drag, handle } = useSheetDrag(onClose);
  useEscapeToClose(onClose);
  useSheetBack(onClose);
  return createPortal(
    <div className="fixed inset-0 z-20 flex flex-col justify-end">
      <div data-testid="sheet-backdrop" aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ transform: drag ? `translateY(${drag}px)` : undefined }}
        className="relative rounded-t-2xl border-t border-line bg-surface pb-[calc(0.75rem+var(--lp-bar-inset))]"
      >
        <div data-testid="sheet-handle" {...handle} className="relative flex shrink-0 touch-none flex-col items-center px-4 pt-2">
          <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-line" />
          <div className="flex min-h-12 w-full items-center gap-2">
            <h2 id={titleId} className="min-w-0 flex-1 truncate text-xl font-semibold">
              How to say it
            </h2>
            <button type="button" ref={focusOnMount} onClick={onClose} className="min-h-11 min-w-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent">
              Done
            </button>
          </div>
        </div>
        {/* the answer this word interrupted waits paused: its Resume stays in view over the Talk sheet's own bar */}
        <BarSlot level={4} />
        <div className="space-y-3 border-t border-line px-4 py-3">
          <p className="break-words text-center text-5xl">
            <HebrewLetters text={word} />
          </p>
          {noVoice ? (
            <p role="status" className="text-center text-base text-bad">
              {noHebrewVoice}
            </p>
          ) : null}
          <div className="flex items-center justify-center gap-2">
            <SpeakButton text={word} id={hebrewKey(word)} label="Hear it" kind="speaker" language="hebrew" />
            <span aria-hidden="true" className="text-base text-muted">
              Hear it
            </span>
          </div>
          {asking ? (
            <button
              type="button"
              disabled={asking.busy}
              onClick={() => {
                onClose();
                asking.ask(word);
              }}
              className="min-h-12 w-full rounded-xl border border-accent px-4 text-lg font-medium text-accent active:bg-line disabled:opacity-40"
            >
              Syllables and sounds
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** The card an answer to a Hebrew word's sound question carries: the word, then its syllables in Hebrew letters, each over how it sounds, each a button that says it. */
export function HebrewSoundGuide({ guide }: { guide: HebrewSounds }) {
  return (
    <div data-hebrew-guide className="mt-2 border-t border-line pt-2">
      <p className="text-sm text-muted">How to say it</p>
      <p className="break-words text-3xl">
        <HebrewLetters text={guide.word} />
      </p>
      <ul className="mt-1 flex flex-wrap gap-2">
        {guide.syllables.map((syllable, i) => (
          <li key={i} data-syllable>
            <SyllableButton syllable={syllable} sound={guide.sounds[i]} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One syllable of the guide: its letters over its sound; a tap says the syllable (or its second tap stops it). */
function SyllableButton({ syllable, sound }: { syllable: string; sound: string | undefined }) {
  return (
    <button
      type="button"
      aria-label={`Hear ${syllable}`}
      onClick={() => void speak(syllable, hebrewKey(syllable), 'hebrew')}
      className="flex min-h-14 min-w-14 flex-col items-center justify-center rounded-xl border border-line px-3 py-1 text-3xl active:bg-line"
    >
      <HebrewLetters text={syllable} />
      <span data-sound className="text-lg text-muted">
        {sound ?? ''}
      </span>
    </button>
  );
}
