// src/data/repositories/ipaCourse.ts — the progress of the optional course 'Learn the IPA sounds' (mw-5r3p30.356, src/ipa/progress.ts), kept on the device as one text in the
// settings store. A repository owns its transactions: each change reads, changes and writes in one.
import { db } from '../db';
import { begin, markLearned, markPassed, noteAnswer, parseProgress, type IpaProgress } from '../../ipa/progress';
import type { Direction } from '../../ipa/drill';
import type { SoundId } from '../../speech/sounds';

const KEY = 'ipaCourse';

export async function getIpaProgress(): Promise<IpaProgress> {
  const row = await db.settings.get(KEY);
  return parseProgress(typeof row?.value === 'string' ? row.value : undefined);
}

async function change(update: (progress: IpaProgress) => IpaProgress): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const row = await db.settings.get(KEY);
    const next = update(parseProgress(typeof row?.value === 'string' ? row.value : undefined));
    await db.settings.put({ key: KEY, value: JSON.stringify(next) });
  });
}

/** He tapped Start on 'Why learn it?'. */
export const startIpaCourse = (): Promise<void> => change(begin);
/** He opened the card of a sound. */
export const learnIpaSound = (id: SoundId): Promise<void> => change((p) => markLearned(p, id));
/** An answer in a drill or the pass check. */
export const noteIpaAnswer = (id: SoundId, direction: Direction, right: boolean): Promise<void> => change((p) => noteAnswer(p, id, direction, right));
/** He passed the pass check. */
export const passIpaCheck = (when: number = Date.now()): Promise<void> => change((p) => markPassed(p, when));
