// src/data/repositories/ipaCourse.ts — the progress of the optional course 'Learn the IPA sounds' (mw-5r3p30.356, src/ipa/progress.ts), kept on the device as one text in the
// settings store, one for each language of the course (Greek under 'ipaCourse', Hebrew under its own key: mw-gdcyf98.24). A repository owns its transactions: each change reads, changes and writes in one.
import { db } from '../db';
import type { CourseLanguage } from '../../ipa/course';
import { begin, markLearned, markPassed, noteAnswer, parseProgress, progressKeyOf, type IpaProgress } from '../../ipa/progress';
import type { Direction } from '../../ipa/drill';
import type { SoundId } from '../../speech/sounds';

export async function getIpaProgress(language: CourseLanguage = 'grc'): Promise<IpaProgress> {
  const row = await db.settings.get(progressKeyOf(language));
  return parseProgress(typeof row?.value === 'string' ? row.value : undefined);
}

async function change(language: CourseLanguage, update: (progress: IpaProgress) => IpaProgress): Promise<void> {
  const key = progressKeyOf(language);
  await db.transaction('rw', db.settings, async () => {
    const row = await db.settings.get(key);
    const next = update(parseProgress(typeof row?.value === 'string' ? row.value : undefined));
    await db.settings.put({ key, value: JSON.stringify(next) });
  });
}

/** He tapped Start on 'Why learn it?'. */
export const startIpaCourse = (language: CourseLanguage = 'grc'): Promise<void> => change(language, begin);
/** He opened the card of a sound. */
export const learnIpaSound = (id: SoundId, language: CourseLanguage = 'grc'): Promise<void> => change(language, (p) => markLearned(p, id));
/** An answer in a drill or the pass check. */
export const noteIpaAnswer = (id: SoundId, direction: Direction, right: boolean, language: CourseLanguage = 'grc'): Promise<void> => change(language, (p) => noteAnswer(p, id, direction, right));
/** He passed the pass check. */
export const passIpaCheck = (when: number = Date.now(), language: CourseLanguage = 'grc'): Promise<void> => change(language, (p) => markPassed(p, when));
