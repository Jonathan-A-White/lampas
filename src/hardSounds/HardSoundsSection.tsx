// src/hardSounds/HardSoundsSection.tsx — 'Hard sounds (optional)' on the Goal screen (mw-5r3p30.361): below the main path, the lessons of the chosen Greek
// pronunciation written for his English accent (./lessons.ts), each marked Done or Not yet; a tap opens one (#/sounds). Nothing else pushes them: no
// lesson blocks a letter, a Drill or the level, and Learn next never names one. Nothing is drawn when his accent has no lessons.
// With `language="he"` it is 'Hard sounds of Hebrew (optional)' (mw-5r3p30.912): the lessons of the chosen Hebrew pronunciation, drawn while his Hebrew dial is above 0.
import { useLiveQuery } from 'dexie-react-hooks';
import { getGreekPronunciation, getHardSoundsDone } from '../data/repositories';
import { openSoundLesson } from '../nav/route';
import { useAccent } from '../speech/accents/useAccent';
import { chosenPronunciation } from '../speech/greek';
import { chosenHebrewPronunciation, pronunciationOf, type PronunciationLanguage } from '../speech/pronunciation';
import { useInterestLevels } from '../settings/useInterestLevels';
import { lessonsFor } from './lessons';

export function HardSoundsSection({ language = 'grc' }: { language?: PronunciationLanguage }) {
  const hebrew = language === 'he';
  const accent = useAccent();
  const levels = useInterestLevels();
  const done = useLiveQuery(getHardSoundsDone, []);
  // until the saved choice of pronunciation is read, the one the speaker already holds (as the idea sheet)
  const chosen = useLiveQuery(getGreekPronunciation, []);
  const scheme = hebrew ? chosenHebrewPronunciation() : chosen === undefined ? chosenPronunciation() : pronunciationOf(chosen);
  const lessons = lessonsFor(scheme.id, accent);
  // Hebrew's section is for a reader of Hebrew, as the IPA course's Hebrew entry is
  if (lessons.length === 0 || (hebrew && !(levels && levels.he >= 1))) return null;
  const name = hebrew ? 'Hard sounds of Hebrew (optional)' : 'Hard sounds (optional)';
  return (
    <section aria-label={name} className="mt-6 text-left">
      <h2 className="text-base font-medium text-muted">{name}</h2>
      <p className="text-base text-muted">{hebrew ? 'Hebrew' : 'Greek'} sounds your English makes hard, one short lesson each. Nothing else waits on them.</p>
      <ul className="mt-1 divide-y divide-line rounded-xl border border-line">
        {lessons.map((lesson) => {
          const finished = done?.includes(lesson.id) ?? false;
          return (
            <li key={lesson.id} data-lesson={lesson.id}>
              <button
                type="button"
                onClick={() => openSoundLesson(lesson.id)}
                className="flex min-h-12 w-full items-center justify-between gap-3 px-3 py-2 text-left text-base active:bg-line"
              >
                <span data-title className="min-w-0 flex-1 text-lg font-medium text-accent">
                  {lesson.title}
                </span>
                <span data-done className={`shrink-0 ${finished ? 'font-medium' : 'text-muted'}`}>
                  {finished ? 'Done' : 'Not yet'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
