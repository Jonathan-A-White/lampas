// src/ipa/IpaCourse.tsx — the optional course 'Learn the IPA sounds' (mw-5r3p30.356, #/ipa; PROVISIONAL, the Governor to confirm the design). Reached only by the Optional entries
// on the Goal screen (./OptionalEntry.tsx) and never required, counted, nudged or pushed. It opens on 'Why learn it?' (until he has tapped Start once), then the sounds:
// a card for each (the symbol, his accent's key word, the letters that make it, the voice saying a word that has it), the drill, and the pass check, which
// offers 'Show IPA in hints' on a pass. It teaches Greek (#/ipa) or Hebrew (#/ipa?lang=he, mw-gdcyf98.24): the same screens on the chosen pronunciation of that language, Hebrew drawn right to left.
// What is kept is ./progress.ts, through data/repositories/ipaCourse.ts, apart for each language.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { getIpaProgress, learnIpaSound, passIpaCheck, startIpaCourse } from '../data/repositories';
import { backTo, ipaLanguageOf, navigate, useAddress } from '../nav/route';
import { HeaderButton, ScreenHeader } from '../ScreenHeader';
import { englishAccentSetting } from '../settings/definitions/englishAccent';
import { setSetting } from '../settings/store';
import { chooseAccent } from '../speech/accents';
import { SpeakButton } from '../speech/SpeakButton';
import type { SoundId } from '../speech/sounds';
import { useAccent } from '../speech/accents/useAccent';
import { useReportScreen } from '../tutor/screenContext';
import type { EnglishAccent } from '../speech/accents';
import type { Pronunciation } from '../speech/pronunciation';
import { checkResult, courseAccent, courseScheme, courseSounds, type CheckAnswer, type CheckResult, type CourseLanguage, type CourseSound } from './course';
import { IpaCheck, IpaDrill, PLAIN, PRIMARY } from './IpaDrill';
import { marked } from './marked';
import { solidOf, type IpaProgress } from './progress';

type View = { kind: 'why' } | { kind: 'home' } | { kind: 'card'; id: SoundId } | { kind: 'drill' } | { kind: 'check' } | { kind: 'result'; result: CheckResult };

/** The lessons of the course, or null when `scheme` cannot teach it yet. */
function soundsOf(scheme: Pronunciation, accent: EnglishAccent): CourseSound[] | null {
  try {
    return courseSounds(scheme, accent);
  } catch {
    return null;
  }
}

export function IpaCourse() {
  const language = ipaLanguageOf(useAddress());
  const progress = useLiveQuery(() => getIpaProgress(language), [language]);
  const accent = useAccent();
  const name = language === 'he' ? 'Hebrew' : 'Greek';
  // the lessons are the chosen pronunciation's of the language, in the key words of the chosen English accent (American's when that is IPA)
  const scheme = courseScheme(language);
  const [view, setView] = useState<View | null>(null);
  // a pronunciation that has no lesson for a sound it writes has no course yet (courseSounds throws, naming it): the screen says so rather than break
  const sounds = soundsOf(scheme, courseAccent(accent));
  const current: View | null = view ?? (progress ? (progress.started ? { kind: 'home' } : { kind: 'why' }) : null);

  useReportScreen({
    name: 'Learn the IPA sounds',
    facts: [
      { label: 'About', value: `An optional course, not needed for Lampas or for reading ${name}: the IPA symbols for the sounds of the ${name}, drilled both ways` },
      { label: 'Sounds', value: progress && sounds ? `${progress.learned.length} of ${sounds.length} opened, ${solidOf(progress).length} solid` : 'Loading' },
      { label: 'Pass check', value: progress?.passedAt !== undefined ? 'Passed' : 'Not passed yet' },
    ],
  });

  const back =
    current?.kind === 'home' || current?.kind === 'why' || current === null ? (
      <HeaderButton onClick={() => backTo('goal')}>‹ Goal</HeaderButton>
    ) : (
      <HeaderButton onClick={() => setView({ kind: 'home' })}>‹ Sounds</HeaderButton>
    );
  return (
    <>
      <ScreenHeader title={language === 'he' ? 'Learn the IPA sounds of Hebrew' : 'Learn the IPA sounds'} back={back} />
      {sounds === null ? (
        <main className="screen min-h-0 flex-1 px-4 pt-4" data-testid="ipa-unavailable">
          <p className="text-lg">The {name} pronunciation you chose has no lessons in this course yet. Choose another in Settings.</p>
        </main>
      ) : current === null || !progress ? (
        <main className="screen min-h-0 flex-1" aria-busy="true" />
      ) : current.kind === 'why' ? (
        <Why
          language={language}
          onStart={() => {
            void startIpaCourse(language);
            setView({ kind: 'home' });
          }}
          onNotNow={() => navigate('goal')}
        />
      ) : current.kind === 'card' ? (
        <SoundCard language={language} sound={sounds.find((s) => s.id === current.id)!} sounds={sounds} onOpen={(id) => setView({ kind: 'card', id })} />
      ) : current.kind === 'drill' ? (
        <IpaDrill language={language} progress={progress} sounds={sounds} onDone={() => setView({ kind: 'home' })} />
      ) : current.kind === 'check' ? (
        <IpaCheck
          language={language}
          sounds={sounds}
          onResult={(answers: CheckAnswer[]) => {
            const result = checkResult(answers);
            if (result.passed) void passIpaCheck(Date.now(), language);
            setView({ kind: 'result', result });
          }}
        />
      ) : current.kind === 'result' ? (
        <CheckResultView result={current.result} onAgain={() => setView({ kind: 'check' })} onBack={() => setView({ kind: 'home' })} />
      ) : (
        <Home progress={progress} sounds={sounds} onView={setView} />
      )}
    </>
  );
}

const SMALL_BUTTON = 'min-h-12 rounded-xl border border-line px-4 text-lg font-medium text-accent active:bg-line';

/** 'Why learn it?', the first thing the Optional entry opens: it says first that the course is not needed, then what it is for. Start and Not now are the same size and weight. */
function Why({ language, onStart, onNotNow }: { language: CourseLanguage; onStart: () => void; onNotNow: () => void }) {
  return (
    <main className="screen min-h-0 flex-1 px-4 pt-4" data-testid="ipa-why">
      <h2 className="text-2xl font-semibold">Why learn it?</h2>
      <p className="mt-3 text-lg font-medium">You do not need this for Lampas or for reading {language === 'he' ? 'Hebrew' : 'Greek'}. It is only here if you want it.</p>
      <p className="mt-3 text-base">IPA is the one standard way to write down how a word sounds. Learning it gets you:</p>
      <ul className="mt-2 list-disc space-y-2 pl-6 text-base">
        <li>One standard for every language and dictionary: the same symbols everywhere, so a sound you learn here reads the same in any other.</li>
        <li>Exactness where English key words blur: “as in” a word sounds a little different in every English, and a symbol is one sound.</li>
        <li>The marks used in pronunciation guides: you can read the symbols a dictionary or a grammar book writes between slashes.</li>
      </ul>
      <p className="mt-3 text-base text-muted">It takes a little while: a card for each sound, a drill, and a pass check at the end. Nothing else in Lampas waits on it.</p>
      <div className="mt-5 grid grid-cols-2 gap-3 pb-[var(--lp-end-inset)]">
        <button type="button" data-testid="ipa-start" onClick={onStart} className={`${SMALL_BUTTON} w-full`}>
          Start
        </button>
        <button type="button" data-testid="ipa-not-now" onClick={onNotNow} className={`${SMALL_BUTTON} w-full`}>
          Not now
        </button>
      </div>
    </main>
  );
}

/** The sounds, his count, and the way to the drill and the pass check. */
function Home({ progress, sounds, onView }: { progress: IpaProgress; sounds: readonly CourseSound[]; onView: (view: View) => void }) {
  const solid = new Set(solidOf(progress));
  const learned = progress.learned.length;
  return (
    <main className="screen min-h-0 flex-1 px-4 pt-4" data-testid="ipa-home">
      <p data-testid="ipa-count" className="text-lg">
        {learned} of {sounds.length} sounds opened · {solid.size} solid
      </p>
      {progress.passedAt !== undefined ? (
        <p data-testid="ipa-passed" className="mt-1 text-base text-good">
          You passed the pass check.
        </p>
      ) : null}
      <p className="mt-1 text-base text-muted">Open a sound to see it, then drill the ones you have opened.</p>
      <div className="mt-3 flex flex-col gap-2">
        {learned >= 2 ? (
          <button type="button" data-testid="ipa-drill" onClick={() => onView({ kind: 'drill' })} className={PRIMARY}>
            Drill the sounds
          </button>
        ) : (
          <p data-testid="ipa-drill-wait" className="text-base text-muted">
            Open at least two sounds to drill them.
          </p>
        )}
        <button type="button" data-testid="ipa-check" onClick={() => onView({ kind: 'check' })} className={PLAIN}>
          Pass check
        </button>
      </div>
      <ul className="mt-4 divide-y divide-line rounded-xl border border-line" aria-label="Sounds">
        {sounds.map((s) => (
          <li key={s.id} data-sound={s.id}>
            <button type="button" onClick={() => onView({ kind: 'card', id: s.id })} className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left active:bg-line">
              <span className="w-16 shrink-0 font-serif text-2xl">{s.id}</span>
              <span className="min-w-0 flex-1 truncate text-base text-muted">{s.choice}</span>
              <span className="shrink-0 text-sm font-medium text-accent">{solid.has(s.id) ? 'Solid' : progress.learned.includes(s.id) ? 'Opened' : 'New'}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-4 pb-[var(--lp-end-inset)]">
        <button type="button" data-testid="ipa-why-again" onClick={() => onView({ kind: 'why' })} className="min-h-12 text-base font-medium text-accent">
          Why learn it?
        </button>
      </p>
    </main>
  );
}

/** One sound: the symbol, his accent's key word, the letters that make it, and the voice saying a word that has it. Opening it counts as meeting the sound. */
function SoundCard({ language, sound, sounds, onOpen }: { language: CourseLanguage; sound: CourseSound; sounds: readonly CourseSound[]; onOpen: (id: SoundId) => void }) {
  useEffect(() => void learnIpaSound(sound.id, language), [sound.id, language]);
  const at = sounds.findIndex((s) => s.id === sound.id);
  const before = sounds[at - 1];
  const after = sounds[at + 1];
  return (
    <main className="screen min-h-0 flex-1 px-4 pt-4" data-testid="ipa-card" data-sound={sound.id}>
      <p data-testid="ipa-card-symbol" className="text-center font-serif text-7xl">
        {sound.id}
      </p>
      <p data-testid="ipa-card-key" className="mt-3 text-center text-xl">
        {sound.keyWord}
      </p>
      <h2 className="mt-5 text-base font-medium">{language === 'he' ? 'Hebrew' : 'Greek'} letters that make it</h2>
      <ul data-testid="ipa-card-letters" className="mt-1 space-y-1 text-lg">
        {sound.letters.map((letter) => (
          <li key={letter}>{marked(language, letter)}</li>
        ))}
      </ul>
      <h2 className="mt-5 text-base font-medium">Hear it</h2>
      <div className="mt-1 flex items-center gap-3">
        <SpeakButton text={sound.word} id={`ipa-${sound.id}`} label="Hear it" kind="speaker" language={language === 'he' ? 'hebrew' : 'greek'} className="shrink-0" />
        <p data-testid="ipa-card-word" className="text-lg">
          {marked(language, sound.word)} {sound.at === 'start' ? 'starts with it' : 'has it inside'}
        </p>
      </div>
      {sound.confusables.length ? (
        <p data-testid="ipa-card-confusable" className="mt-5 text-base text-muted">
          Easy to mix up with {sound.confusables.join(' and ')}: they are drilled together.
        </p>
      ) : null}
      <div className="mt-5 grid grid-cols-2 gap-3 pb-[var(--lp-end-inset)]">
        <button type="button" disabled={!before} onClick={() => before && onOpen(before.id)} className={`${SMALL_BUTTON} w-full disabled:opacity-40`}>
          ‹ {before?.id ?? ''}
        </button>
        <button type="button" disabled={!after} onClick={() => after && onOpen(after.id)} className={`${SMALL_BUTTON} w-full disabled:opacity-40`}>
          {after?.id ?? ''} ›
        </button>
      </div>
    </main>
  );
}

/** How the pass check went. A pass offers 'Show IPA in hints'; whatever the result, the symbols that were missed are named. */
function CheckResultView({ result, onAgain, onBack }: { result: CheckResult; onAgain: () => void; onBack: () => void }) {
  const [shown, setShown] = useState(false);
  const showIpa = async (): Promise<void> => {
    await setSetting(englishAccentSetting, 'ipa');
    chooseAccent('ipa');
    setShown(true);
  };
  return (
    <main className="screen min-h-0 flex-1 px-4 pt-4" data-testid="ipa-result" data-result={result.passed ? 'passed' : 'not-yet'}>
      <h2 className="text-2xl font-bold">{result.passed ? 'You passed.' : 'Not yet.'}</h2>
      <p data-testid="ipa-score" className="mt-1 text-lg">
        {result.rights} of {result.total} right
      </p>
      {result.toPractise.length ? (
        <p data-testid="ipa-practise" className="mt-3 text-lg">
          {result.passed ? 'Worth another look: ' : 'Practise these: '}
          <span className="font-serif text-2xl">{result.toPractise.join('  ')}</span>
        </p>
      ) : null}
      <div className="mt-5 flex flex-col gap-2 pb-[var(--lp-end-inset)]">
        {result.passed ? (
          shown ? (
            <p role="status" data-testid="ipa-hints-shown" className="text-base">
              Hints now show IPA. You can change it in Settings, under English accent.
            </p>
          ) : (
            <button type="button" data-testid="ipa-show-ipa" onClick={() => void showIpa()} className={PRIMARY}>
              Show IPA in hints
            </button>
          )
        ) : null}
        <button type="button" data-testid="ipa-back-to-sounds" onClick={onBack} className={result.passed ? PLAIN : PRIMARY}>
          Back to the sounds
        </button>
        <button type="button" data-testid="ipa-again" onClick={onAgain} className={PLAIN}>
          Try the pass check again
        </button>
      </div>
    </main>
  );
}
