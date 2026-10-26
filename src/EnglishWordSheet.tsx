// src/EnglishWordSheet.tsx — the small sheet an English word opens at Just English (mw-5r3p30.707): the word as tapped, Listen, and Look it up in Logos (his English
// dictionary, Webster's 1828: src/resources/logos.ts ENGLISH_DICTIONARY). No Greek on it: at that step the Greek word sheet is not drawn (WordSheet.tsx). With Logos off
// it says so, with one tap to turn it on. At the Greek steps the Greek word sheet carries the same row (EnglishDictionaryRow, shown only while Logos is on).
// Closes by a tap outside, a swipe down on its handle, Done, Escape or the phone's Back.
import { useLiveQuery } from 'dexie-react-hooks';
import { bareEnglish } from './data/chapter';
import { getStudyResources, setResourceOn } from './data/repositories';
import { englishDictionaryLink, englishHeadwords, ENGLISH_DICTIONARY } from './resources/logos';
import { armFallback } from './resources/openApp';
import { SpeakButton } from './speech/SpeakButton';
import { BarSlot } from './speech/SpeakingBarSlot';
import { useSheetBack } from './ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from './ui/sheetDrag';

const ROW = 'flex min-h-12 items-center justify-center rounded-xl border border-line px-3 text-center text-base font-medium text-accent active:bg-line';

/** One Look it up in Logos link for each word of `text` (one word: 'Look it up in Logos'; several, or `named`: 'Look it up in Logos: <word>'). `english` adds ' (English)' to the name, for the Greek word sheet.
 * `offer` draws the Turn on Logos line when Logos is off; without it, a Logos that is off draws nothing. Nothing while it is not known whether Logos is on. */
export function EnglishDictionaryRow({ text, english = false, offer = false, named = false }: { text: string; english?: boolean; offer?: boolean; named?: boolean }) {
  const study = useLiveQuery(getStudyResources, []);
  const words = englishHeadwords(text);
  if (study === undefined || words.length === 0) return null;
  if (!study.on.includes('logos')) {
    if (!offer) return null;
    return <TurnOnLogos />;
  }
  return (
    <div role="group" aria-label={`English dictionary: ${ENGLISH_DICTIONARY.name}`} className="mt-3 flex flex-col gap-2">
      {words.map((word) => {
        const link = englishDictionaryLink(word);
        if (!link) return null;
        const name = `Look it up in Logos${english ? ' (English)' : ''}${words.length > 1 || named ? `: ${word}` : ''}`;
        return (
          <a key={word} href={link.url} data-fallback={link.fallback} onClick={() => armFallback(link.fallback)} className={ROW}>
            {name}
          </a>
        );
      })}
    </div>
  );
}

/** The words of a chunk, each as bareEnglish gives it ('the beginning,' is 'the' and 'beginning'), for the sheet that lists a chunk of more than one word. */
const wordsOf = (chunk: string): string[] => chunk.split(/\s+/).map(bareEnglish).filter((w) => /[\p{L}\p{N}]/u.test(w));

/** The Turn on Logos line: what the sheets say while Logos is off, with the one tap that turns it on. */
export function TurnOnLogos() {
  return (
    <div role="status" className="mt-3">
      <p className="text-base text-muted">Turn on Logos to look words up</p>
      <button type="button" onClick={() => void setResourceOn('logos', true)} className="mt-2 min-h-12 rounded-xl bg-accent px-6 text-base font-medium text-accent-fg">
        Turn on Logos
      </button>
    </div>
  );
}

/** The words of an English chunk of an Old Testament chapter, one row each under the Hebrew words it renders (the Hebrew word sheet of an English tap, mw-5vvlay.2): the word, its own Listen and its
 *  own Look it up in Logos (Webster's 1828). The Turn on Logos line is the Hebrew words' own, so the rows say nothing of Logos while it is off. */
export function EnglishWordList({ text }: { text: string }) {
  const each = wordsOf(text);
  if (each.length === 0) return null;
  return (
    <ul aria-label="English words" className="mt-3 flex flex-col">
      {each.map((w, i) => (
        <li key={i} data-chunk-word className="border-t border-line pb-3 pt-2">
          <div className="flex items-center justify-between gap-2">
            <span lang="en" className="min-w-0 break-words text-xl font-semibold">
              {w}
            </span>
            <SpeakButton text={w} id={`english-word:${w}:${i}`} label={`Listen: ${w}`} kind="speaker" language="english" className="shrink-0" />
          </div>
          <EnglishDictionaryRow text={w} named={each.length > 1} />
        </li>
      ))}
    </ul>
  );
}

/** `listWords` (an Old Testament chunk, mw-uqlxea.2, where there is no Greek word to open): a chunk of more than one word lists each word under the heading, with its own Listen and its own
 * Look it up in Logos (Webster's 1828), so the sheet answers for any word of the chunk; a chunk of one word is the sheet as it always was. */
export function EnglishWordSheet({ english, onClose, listWords = false }: { english: string; onClose: () => void; listWords?: boolean }) {
  const { drag, handle } = useSheetDrag(onClose);
  useEscapeToClose(onClose);
  useSheetBack(onClose);
  const word = bareEnglish(english);
  const each = listWords ? wordsOf(english) : [];
  const several = each.length > 1;
  return (
    // z-35 like the Greek word sheet: above the sheets it opens over, below the full-screen dialogs and the shell bars
    <div className="fixed inset-0 z-35 flex flex-col justify-end">
      <div data-testid="sheet-backdrop" aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="English word"
        style={{ transform: drag ? `translateY(${drag}px)` : undefined }}
        className="relative rounded-t-2xl border-t border-line bg-surface"
      >
        <div data-testid="sheet-handle" {...handle} className="flex min-h-12 touch-none items-center justify-between gap-3 px-4 pt-2">
          <span aria-hidden="true" className="mx-auto h-1.5 w-10 rounded-full bg-line" />
          <button type="button" onClick={onClose} className="absolute right-2 top-1 min-h-11 min-w-11 rounded-lg px-3 text-base font-medium text-accent">
            Done
          </button>
        </div>
        {/* a reading or answer paused by the word he tapped keeps its Resume in view */}
        <BarSlot level={4} />
        <div className="px-4 pb-[calc(1rem+var(--lp-end-inset))] pt-1">
          <div className="flex items-start justify-between gap-2">
            <h2 data-testid="english-word" lang="en" className="min-w-0 break-words text-3xl font-bold">
              {word}
            </h2>
            <SpeakButton text={word} id={`english-word:${word}`} label="Listen" kind="speaker" language="english" className="shrink-0" />
          </div>
          {several ? (
            <ul aria-label="Words" className="mt-2 flex flex-col">
              {each.map((w, i) => (
                <li key={i} data-chunk-word className="border-t border-line pb-3 pt-2">
                  <div className="flex items-center justify-between gap-2">
                    <span lang="en" className="min-w-0 break-words text-xl font-semibold">
                      {w}
                    </span>
                    <SpeakButton text={w} id={`english-word:${w}:${i}`} label={`Listen: ${w}`} kind="speaker" language="english" className="shrink-0" />
                  </div>
                  <EnglishDictionaryRow text={w} offer={i === 0} named />
                </li>
              ))}
            </ul>
          ) : (
            <EnglishDictionaryRow text={word} offer />
          )}
        </div>
      </div>
    </div>
  );
}
