// tests/support/his-words.ts — the Governor's own progress as a fixture: the 63 BMA words, lessons 1-9 solid and lesson 10 learning.
// Lampas used to put these on every phone at the first open (mw-5r3p30.385: a new reader starts empty); a test that needs a reader
// with a word list calls seedHisWords() where it used to open the app and wait for the seed. It writes what the old seed wrote, including
// the meta flag the schedule's upgrade path reads, so seedScheduleIfFirstOpen still has its words to schedule.
import { db, type Word } from '../../src/data/db';
import { normaliseLemma } from '../../src/data/lemma';
import { SEED_WORDS } from '../../src/data/seed-words';

/** Lessons up to this one are solid, as the old seed had it. */
export const HIS_LAST_SOLID_LESSON = 9;

/**
 * Puts the 63 words in exactly as the old seed did, every word given at the one moment the flag records; returns false (and changes nothing) when it has been done.
 * A phone like this holds only the example words (repositories/words.ts holdsOnlyExampleWords): the tutor is told nothing of it as a learner (mw-yrmkdf.8).
 */
export async function seedExampleWords(now = Date.now()): Promise<boolean> {
  return db.transaction('rw', db.words, db.meta, async () => {
    if (await db.meta.get('wordsSeeded')) return false;
    await db.words.bulkPut(
      SEED_WORDS.map((s): Word => {
        const { headword, lemmas } = normaliseLemma(s.lemma);
        return { lemma: headword, lang: 'grc', lemmas, gloss: s.gloss, lesson: s.lesson, state: s.lesson <= HIS_LAST_SOLID_LESSON ? 'solid' : 'learning', since: now };
      }),
    );
    await db.meta.put({ key: 'wordsSeeded', value: String(now) });
    return true;
  });
}

/**
 * His progress as a fixture: the example words, and one of them touched a moment later (the first word of lesson 10 he is learning), so the phone is his
 * own and the tutor is told the words (mw-yrmkdf.8). Returns false (and changes nothing) when the words were already in.
 */
export async function seedHisWords(now = Date.now()): Promise<boolean> {
  if (!(await seedExampleWords(now))) return false;
  const first = SEED_WORDS.find((s) => s.lesson > HIS_LAST_SOLID_LESSON);
  if (first) await db.words.update(normaliseLemma(first.lemma).headword, { since: now + 1 });
  return true;
}
