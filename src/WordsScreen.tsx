// src/WordsScreen.tsx — the words he knows, by lesson. Tap a word to change what he knows of it (hold it to hear it):
// solid -> learning -> dropped (after a confirm) -> learning again.
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import type { SourceLanguage } from './data/chapter';
import { listWords, setWordState, type Word, type WordState } from './data/repositories';
import { backTo, navigate, openPlacement } from './nav/route';
import { useScrollMemory } from './nav/scrollMemory';
import { HeaderButton, ScreenHeader } from './ScreenHeader';
import { HintCard } from './tips/HintCard';
import { WORDS_OPENED } from './tips/hints';
import { speakWord } from './speech/greek';
import { useReportScreen } from './tutor/screenContext';
import { SpeakButton } from './speech/SpeakButton';
import { NO_SELECT, useLongPress } from './ui/longPress';
import { focusOnMount } from './ui/focus';
import { WordPicture } from './WordPicture';
import { faceOf } from './script/greekLang';
import { languageOfLemma } from './data/lemma';
import { languageOfWord } from './data/studyLanguage';
import { SourceSegment } from './ui/SourceSegment';
import { useLanguageInHand } from './useLanguageInHand';

const NEXT: Record<WordState, WordState> = { solid: 'learning', learning: 'dropped', dropped: 'learning' };

const PILL: Record<WordState, string> = {
  solid: 'border-line text-fg',
  learning: 'border-accent bg-accent text-accent-fg',
  dropped: 'border-line text-muted line-through',
};

const collators = { grc: new Intl.Collator('el'), hbo: new Intl.Collator('he') };

/** One word of the list: a tap changes what he knows of it, a long press says it (src/ui/longPress.ts). */
function WordRow({ word: w, onTap }: { word: Word; onTap: (w: Word) => void }) {
  const lang = languageOfWord(w);
  const press = useLongPress(() => onTap(w), () => void speakWord(w.lemma, lang === 'hbo' ? 'hebrew' : 'greek'));
  return (
    <li className="flex items-stretch">
      <SpeakButton text={w.lemma} id={`word:${w.lemma}`} label="Hear it" kind="speaker" language={lang === 'hbo' ? 'hebrew' : undefined} className="w-12 shrink-0 rounded-l-xl" />
      <button
        type="button"
        data-lemma={w.lemma}
        data-state={w.state}
        {...press}
        className={`flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2 pl-1 pr-3 text-left ${NO_SELECT}`}
      >
        <WordPicture lemma={w.lemma} size={56} className={w.state === 'dropped' ? 'opacity-50' : ''} />
        <span className="min-w-0 flex-1">
          <span {...faceOf(lang, { greek: 'text-2xl', hebrew: 'hebrew-choice' }, `block break-words ${w.state === 'dropped' ? 'text-muted' : ''}`)}>
            {w.lemma}
          </span>
          <span className="block break-words text-sm text-muted">{w.gloss}</span>
        </span>
        <span className={`shrink-0 rounded-full border px-3 py-1 text-sm ${PILL[w.state]}`}>{w.state}</span>
      </button>
    </li>
  );
}

/** The group of the words he took on the teach sheet (source 'frontier', no lesson); it sorts between 'Added by you' and Lesson 1. */
const FROM_READING = 0.5;

/** Imported words with no lesson come first so he sees what he just added, then the words from his reading; then lessons in order. */
function byLesson(words: Word[], lang: SourceLanguage): { lesson: number; words: Word[] }[] {
  const groups = new Map<number, Word[]>();
  for (const w of words) {
    const key = w.lesson === 0 && w.source === 'frontier' ? FROM_READING : w.lesson;
    groups.set(key, [...(groups.get(key) ?? []), w]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([lesson, ws]) => ({ lesson, words: ws.sort((a, b) => collators[lang].compare(a.lemma, b.lemma)) }));
}

function countLine(words: Word[]): string {
  const n = (state: WordState) => words.filter((w) => w.state === state).length;
  const parts = [`${n('solid')} solid`, `${n('learning')} learning`];
  if (n('dropped') > 0) parts.push(`${n('dropped')} dropped`);
  return parts.join(', ');
}

export function WordsScreen() {
  const everyWord = useLiveQuery(listWords, []);
  // the words of the one language he chose, or of the Greek | Hebrew segment's where both are (mw-gdcyf98.19); at English only, the Greek ones
  const { lang: inHand, both } = useLanguageInHand();
  const lang: SourceLanguage = inHand ?? 'grc';
  const words = everyWord && inHand !== undefined ? everyWord.filter((w) => languageOfWord(w) === lang) : undefined;
  const [confirming, setConfirming] = useState<string | null>(null);
  const scrollRef = useScrollMemory('words');
  useReportScreen({ name: 'Words', facts: words ? [{ label: 'His words', value: countLine(words) }] : [] });

  const tap = (w: Word) => {
    const next = NEXT[w.state];
    if (next === 'dropped') setConfirming(w.lemma);
    else void setWordState(w.lemma, next);
  };

  const groups = byLesson(words ?? [], lang);
  return (
    <>
      <ScreenHeader
        title="Words"
        subtitle={words ? <span data-testid="word-counts">{countLine(words)}</span> : null}
        back={<HeaderButton onClick={() => backTo('home')}>‹ Reader</HeaderButton>}
        action={
          <>
            <HeaderButton onClick={() => navigate('test')}>Test</HeaderButton>
            <HeaderButton onClick={() => navigate('import')}>Import</HeaderButton>
          </>
        }
      />
      <HintCard event={WORDS_OPENED} className="mx-4 mt-2 shrink-0" />
      <main ref={scrollRef} className="screen min-h-0 flex-1 px-3">
        <div>
        {both ? <SourceSegment label="Words language" /> : null}
        {words?.length === 0 ? (
          <section data-testid="words-empty" aria-label="No words yet" className="px-3 pt-8 text-center">
            <p className="text-lg font-medium">No words yet.</p>
            <p className="mt-1 text-muted">
              Take the Placement to find where you are, or Import a list of Greek words you want to learn. Words you add show here.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => openPlacement('settings')} className="min-h-12 rounded-xl bg-accent text-lg font-medium text-accent-fg">
                Placement
              </button>
              <button type="button" onClick={() => navigate('import')} className="min-h-12 rounded-xl border border-line text-lg font-medium">
                Import
              </button>
            </div>
          </section>
        ) : null}
        {groups.map((g) => (
          <section key={g.lesson} aria-labelledby={`lesson-${g.lesson}`} className="pt-4">
            <h2 id={`lesson-${g.lesson}`} className="px-1 pb-1 text-sm font-semibold uppercase tracking-wide text-muted">
              {g.lesson === 0 ? 'Added by you' : g.lesson === FROM_READING ? 'From my reading' : `Lesson ${g.lesson}`}
            </h2>
            <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
              {g.words.map((w) => (
                <WordRow key={w.lemma} word={w} onTap={tap} />
              ))}
            </ul>
          </section>
        ))}
        </div>
      </main>
      {confirming ? (
        <div className="fixed inset-0 z-10 flex items-end bg-black/60">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="drop-title"
            className="w-full rounded-t-2xl border-t border-line bg-surface p-4 pb-[calc(1rem+var(--lp-bar-inset))]"
          >
            <h2 id="drop-title" className="text-lg font-semibold">
              Drop <span {...faceOf(languageOfLemma(confirming), { greek: 'text-2xl', hebrew: 'hebrew-choice' })}>{confirming}</span>?
            </h2>
            <p className="mt-1 text-muted">A dropped word is no longer tested. Tap it again to bring it back.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                ref={focusOnMount}
                onClick={() => setConfirming(null)}
                className="min-h-12 rounded-xl border border-line text-lg font-medium"
              >
                Keep
              </button>
              <button
                type="button"
                onClick={() => {
                  void setWordState(confirming, 'dropped');
                  setConfirming(null);
                }}
                className="min-h-12 rounded-xl bg-accent text-lg font-medium text-accent-fg"
              >
                Drop
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
