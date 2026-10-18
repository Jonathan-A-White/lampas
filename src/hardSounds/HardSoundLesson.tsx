// src/hardSounds/HardSoundLesson.tsx — a Hard sounds lesson (mw-5r3p30.361, #/sounds?l=<id>&s=<step>; PROVISIONAL, the Governor to confirm the design): one
// step at a time, 'Step N of M', its heading, what it says in his English accent, and what the kind of step has: words to hear (each with its speaker),
// pairs of words told apart, words to say after the voice, or a verse rich in the sound with the sound's letters marked, which opens the Verse view on
// it, on Read it aloud with a licence (the reading check, as today) or on Listen without one. Previous and Next walk the steps, and the step is kept in the
// address, so Back from the verse comes back to it; Done at the end keeps the lesson Done and goes back. The sound's IPA shows only when his accent is
// IPA (the standard). Any lesson that passes src/data/hardSounds/schema.ts is drawn here; nothing in this file names one.
import { useEffect, useState, type ReactNode } from 'react';
import { bookOf } from '../data/books';
import { loadChapter } from '../data/chapter';
import type { HardSoundLesson as Lesson, HardSoundStep, StepKind } from '../data/hardSounds/schema';
import { refParts } from '../data/readingLadder';
import { markHardSoundDone, setReaderView } from '../data/repositories';
import { useAiAllowed } from '../gate/licenceContext';
import { navigate, openVerseAt, showSoundStep, soundLessonOf, useAddress } from '../nav/route';
import { HeaderButton, ScreenHeader } from '../ScreenHeader';
import { useAccent } from '../speech/accents/useAccent';
import { SpeakButton } from '../speech/SpeakButton';
import { useReportScreen } from '../tutor/screenContext';
import { greekMarked } from '../ui/GreekMarked';
import { setVerseAction } from '../verse/action';
import { lessonById, saidFor } from './lessons';
import { TryIt } from './TryIt';

/** Each kind of step's heading. */
const STEP_HEADINGS: Record<StepKind, string> = {
  why: 'Why it is hard for you',
  'from-known': 'Start from a sound you know',
  hear: 'Hear it',
  contrast: 'Tell them apart',
  try: 'Try it',
  verse: 'Read a verse',
};

const BUTTON = 'min-h-12 w-full rounded-xl border border-line px-4 text-lg font-medium text-accent active:bg-line';
const PRIMARY = 'min-h-12 w-full rounded-xl bg-accent px-4 text-lg font-medium text-accent-fg active:opacity-80';

/** Back where he came from (the Goal screen, or the letter sheet that opened the lesson); the Goal screen when the lesson was opened by a link. */
function goBack(): void {
  const at = (window.history.state as { i?: number } | null)?.i;
  if (typeof at === 'number' && at > 0) window.history.back();
  else navigate('goal', { replace: true });
}

const base = (c: string): string => c.normalize('NFD').charAt(0).toLowerCase();

/** `text` with every stretch spelt with one of `letters` marked, breathings, accents and capitals aside. */
function markLetters(text: string, letters: readonly string[]): ReactNode[] {
  const chars = [...text];
  const out: ReactNode[] = [];
  let plain = '';
  for (let i = 0; i < chars.length; ) {
    const hit = letters.find((l) => [...l].every((c, k) => chars[i + k] !== undefined && base(chars[i + k]) === base(c)));
    if (!hit) {
      plain += chars[i++];
      continue;
    }
    if (plain) out.push(plain);
    plain = '';
    const n = [...hit].length;
    out.push(
      <mark key={i} className="rounded-sm bg-accent text-accent-fg">
        {chars.slice(i, i + n).join('')}
      </mark>,
    );
    i += n;
  }
  if (plain) out.push(plain);
  return out;
}

/** A Greek word, its letters of the lesson marked, and its speaker. */
function Word({ word, letters, id }: { word: string; letters: readonly string[]; id: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span lang="grc" className="font-greek text-3xl">
        {markLetters(word, letters)}
      </span>
      <SpeakButton text={word} id={id} label={`Hear ${word}`} kind="speaker" />
    </span>
  );
}

function Words({ words, letters, at }: { words: readonly string[]; letters: readonly string[]; at: string }) {
  return (
    <ul className="mt-3 space-y-2">
      {words.map((word, i) => (
        <li key={`${word}-${i}`}>
          <Word word={word} letters={letters} id={`${at}-${i}`} />
        </li>
      ))}
    </ul>
  );
}

type Loaded = { status: 'loading' } | { status: 'ready'; greek: string } | { status: 'failed' };

/** The verse step: the reference, the verse in Greek with the sound's letters marked and a speaker, and the way into the Verse view. */
function VerseStep({ reference, letters, at }: { reference: string; letters: readonly string[]; at: string }) {
  const ai = useAiAllowed();
  const place = refParts(reference);
  const [loaded, setLoaded] = useState<Loaded>({ status: 'loading' });
  useEffect(() => {
    if (!place) return;
    let alive = true;
    loadChapter(place.book, place.chapter).then(
      (chapter) => {
        const verse = chapter.verses.find((v) => v.n === place.verse);
        if (alive) setLoaded(verse ? { status: 'ready', greek: verse.g.map((w) => w.t).join(' ') } : { status: 'failed' });
      },
      () => alive && setLoaded({ status: 'failed' }),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference]);
  if (!place) return null;
  const open = async (): Promise<void> => {
    // Read it aloud is the reading check, sent to the mill: with a licence only (src/verse/action.ts); without one he hears the verse
    setVerseAction(ai ? 'read' : 'listen');
    await setReaderView('greek');
    openVerseAt({ book: place.book, chapter: place.chapter, verse: place.verse, view: 'greek' });
  };
  return (
    <div className="mt-3 space-y-3">
      <p className="text-base font-medium">{`${bookOf(place.book)?.name ?? place.book} ${place.chapter}:${place.verse}`}</p>
      {loaded.status === 'loading' ? (
        <p role="status" className="text-base text-muted">
          Loading the verse…
        </p>
      ) : loaded.status === 'failed' ? (
        <p role="alert" className="text-base text-muted">
          Could not load the verse{navigator.onLine === false ? ', and you are offline' : ''}.
        </p>
      ) : (
        <>
          <p data-testid="sound-verse" lang="grc" className="font-greek text-[length:var(--lp-greek-size)] leading-relaxed">
            {markLetters(loaded.greek, letters)}
          </p>
          <SpeakButton text={loaded.greek} id={`${at}-verse`} label="Hear the verse" kind="speaker" />
        </>
      )}
      <button type="button" onClick={() => void open()} className={BUTTON}>
        {ai ? 'Read it aloud' : 'Listen to it'}
      </button>
    </div>
  );
}

/** What a step has beyond its text. */
function StepBody({ step, lesson, at }: { step: HardSoundStep; lesson: Lesson; at: string }) {
  switch (step.kind) {
    case 'why':
      return null;
    case 'from-known':
      return step.words ? <Words words={step.words} letters={lesson.letters} at={at} /> : null;
    case 'try':
      return <TryIt words={step.words} renderWord={(word, i) => <Word word={word} letters={lesson.letters} id={`${at}-${i}`} />} />;
    case 'hear':
      return <Words words={step.words} letters={lesson.letters} at={at} />;
    case 'contrast':
      return (
        <ul className="mt-3 space-y-3">
          {step.pairs.map(([a, b], i) => (
            <li key={`${a}-${b}`} data-pair className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line px-3 py-2">
              <Word word={a} letters={lesson.letters} id={`${at}-${i}-a`} />
              <span aria-hidden="true" className="text-muted">
                ·
              </span>
              <Word word={b} letters={lesson.letters} id={`${at}-${i}-b`} />
            </li>
          ))}
        </ul>
      );
    case 'verse':
      return <VerseStep reference={step.ref} letters={lesson.letters} at={at} />;
  }
}

/** The lesson's steps, one at a time: `step` is the one on screen, `onStep` moves to another, `onDone` is Done on the last. */
export function LessonSteps({ lesson, step, onStep, onDone }: { lesson: Lesson; step: number; onStep: (step: number) => void; onDone: () => void }) {
  const accent = useAccent();
  const at = Math.min(Math.max(0, step), lesson.steps.length - 1);
  const shown = lesson.steps[at];
  const last = at === lesson.steps.length - 1;
  const key = `sound-${lesson.id}-${at}`;
  return (
    <main data-testid="sound-lesson" className="screen min-h-0 flex-1 px-4 pt-4">
      {accent.id === 'ipa' ? (
        <p data-testid="sound-ipa" className="text-base text-muted">
          The sound: {lesson.sounds.join(' ')}
        </p>
      ) : null}
      <p data-testid="sound-step" className="text-sm text-muted">
        Step {at + 1} of {lesson.steps.length}
      </p>
      <h2 className="mt-1 text-2xl font-semibold">{STEP_HEADINGS[shown.kind]}</h2>
      <p className="mt-2 text-lg">{greekMarked(saidFor(shown.text, accent))}</p>
      <StepBody key={key} step={shown} lesson={lesson} at={key} />
      <div className="mt-6 grid grid-cols-2 gap-3 pb-[var(--lp-end-inset)]">
        {at > 0 ? (
          <button type="button" onClick={() => onStep(at - 1)} className={BUTTON}>
            Previous
          </button>
        ) : (
          <span />
        )}
        <button type="button" onClick={() => (last ? onDone() : onStep(at + 1))} className={PRIMARY}>
          {last ? 'Done' : 'Next'}
        </button>
      </div>
    </main>
  );
}

/** The screen at #/sounds: the lesson the address names, at its step. */
export function HardSoundLesson() {
  const address = soundLessonOf(useAddress());
  const lesson = lessonById(address.lesson);
  useReportScreen({
    name: 'Hard sounds',
    facts: lesson
      ? [
          { label: 'About', value: 'An optional lesson on a Greek sound his English makes hard; never needed for anything else in Lampas' },
          { label: 'Lesson', value: lesson.title },
          { label: 'Step', value: `${STEP_HEADINGS[lesson.steps[Math.min(address.step, lesson.steps.length - 1)].kind]} (${Math.min(address.step, lesson.steps.length - 1) + 1} of ${lesson.steps.length})` },
        ]
      : [{ label: 'Lesson', value: 'None found' }],
  });
  return (
    <>
      <ScreenHeader title={lesson?.title ?? 'Hard sounds'} back={<HeaderButton onClick={goBack}>‹ Back</HeaderButton>} />
      {lesson ? (
        <LessonSteps
          lesson={lesson}
          step={address.step}
          onStep={showSoundStep}
          onDone={() => {
            void markHardSoundDone(lesson.id).catch((error: unknown) => console.error('could not keep the lesson done', error));
            goBack();
          }}
        />
      ) : (
        <main className="screen min-h-0 flex-1 px-4 pt-4">
          <p className="text-lg">There is no such lesson. It may have been taken out.</p>
        </main>
      )}
    </>
  );
}
