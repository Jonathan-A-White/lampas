// src/data/repositories/words.ts — the words he knows. A repository owns its transactions.
import { db, type Word, type WordState } from '../db';
import type { ImportWord } from '../importWords';
import { normaliseLemma } from '../lemma';
import { SEED_WORDS } from '../seed-words';

export type { Word, WordState };

const SEEDED_KEY = 'wordsSeeded';
/** Lessons up to this one are solid when seeded; the next lesson is the one he is learning. */
const LAST_SOLID_LESSON = 9;

/** Seeds the example list on the first open only; returns whether it did. Words he deletes never come back. */
export async function seedWordsIfFirstOpen(now = Date.now()): Promise<boolean> {
  return db.transaction('rw', db.words, db.meta, async () => {
    if (await db.meta.get(SEEDED_KEY)) return false;
    await db.words.bulkPut(
      SEED_WORDS.map((s): Word => {
        const { headword, lemmas } = normaliseLemma(s.lemma);
        return { lemma: headword, lemmas, gloss: s.gloss, lesson: s.lesson, state: s.lesson <= LAST_SOLID_LESSON ? 'solid' : 'learning', since: now };
      }),
    );
    await db.meta.put({ key: SEEDED_KEY, value: String(now) });
    return true;
  });
}

export function listWords(): Promise<Word[]> {
  return db.words.toArray();
}

export async function setWordState(lemma: string, state: WordState, now = Date.now()): Promise<void> {
  await db.words.update(lemma, { state, since: now });
}

/** Adds imported words as learning; a lemma already in the list keeps its state. Returns how many were new. */
export async function addImportedWords(words: ImportWord[], now = Date.now()): Promise<{ added: number; existing: number }> {
  return db.transaction('rw', db.words, async () => {
    let added = 0;
    for (const w of words) {
      if (await db.words.get(w.headword)) continue;
      await db.words.add({ lemma: w.headword, lemmas: w.lemmas, gloss: w.gloss, lesson: w.lesson, state: 'learning', since: now });
      added += 1;
    }
    return { added, existing: words.length - added };
  });
}

/** Every lemma a solid word goes by (its headword and its lexicon lemmas, NFC): what the weave matches Greek words against. */
export async function listSolidLemmas(): Promise<Set<string>> {
  const solid = await db.words.where('state').equals('solid').toArray();
  return new Set(solid.flatMap((w) => [w.lemma, ...w.lemmas]).map((l) => l.normalize('NFC')));
}

/** The headwords of his solid words, in the order of the list (lesson, then spelling): what the tutor is told he knows. */
export async function listSolidHeadwords(): Promise<string[]> {
  const solid = await db.words.where('state').equals('solid').toArray();
  return solid.sort((a, b) => a.lesson - b.lesson || a.lemma.localeCompare(b.lemma)).map((w) => w.lemma);
}
