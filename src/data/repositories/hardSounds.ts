// src/data/repositories/hardSounds.ts — which Hard sounds lessons (src/hardSounds/, mw-5r3p30.361) he has finished, kept on the device as one text in the settings
// store: the ids, as a JSON list. A repository owns its transactions: each change reads, changes and writes in one.
import { db } from '../db';

const KEY = 'hardSoundsDone';

/** The ids `text` holds; none for a text that is not a list of them. */
function parseDone(text: unknown): string[] {
  if (typeof text !== 'string') return [];
  try {
    const raw: unknown = JSON.parse(text);
    return Array.isArray(raw) ? [...new Set(raw.filter((id): id is string => typeof id === 'string'))] : [];
  } catch {
    return [];
  }
}

/** The lessons he has finished. */
export async function getHardSoundsDone(): Promise<string[]> {
  return parseDone((await db.settings.get(KEY))?.value);
}

/** He came to the end of the lesson `id` and tapped Done. */
export async function markHardSoundDone(id: string): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const done = parseDone((await db.settings.get(KEY))?.value);
    if (!done.includes(id)) await db.settings.put({ key: KEY, value: JSON.stringify([...done, id]) });
  });
}
