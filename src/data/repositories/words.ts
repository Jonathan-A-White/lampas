// src/data/repositories/words.ts — the words he knows. A repository owns its transactions.
import { publish } from '../../events/bus';
import { db, type Word, type WordState } from '../db';
import type { ImportWord } from '../importWords';
import { normaliseLemma } from '../lemma';
import { DAY, STEP_DAYS } from '../schedule';
import { SEED_WORDS } from '../seed-words';
import { announceDue, writeScheduled } from './reviews';

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

/** The word of the list that `lemma` (a headword or a lexicon lemma, as the tutor or the text writes it) stands for, if any. */
async function findListed(headword: string, lemmas: string[]): Promise<Word | undefined> {
  return (await db.words.get(headword)) ?? (await db.words.where('lemmas').anyOf(lemmas).first());
}

/** Whether `lemma` is on his list: a word he is learning or knows. A dropped word is not. */
export async function wordIsListed(lemma: string): Promise<boolean> {
  const { headword, lemmas } = normaliseLemma(lemma);
  if (!headword) return false;
  const found = await findListed(headword, lemmas);
  return found !== undefined && found.state !== 'dropped';
}

/**
 * Puts a lemma on the list as a word he is learning (the Talk answer's Add to my words, and a words_to_add the tutor sends).
 * 'already' when it is there (as a learning or solid word, found by headword or lexicon lemma): nothing changes. A dropped word
 * goes back to learning. 'ignored' for a blank lemma. A new word has no lesson (0), the gloss given and, when given, its part of speech.
 */
export async function addWordToLearn(lemma: string, gloss = '', now = Date.now(), pos = ''): Promise<'added' | 'already' | 'ignored'> {
  const { headword, lemmas } = normaliseLemma(lemma);
  if (!headword) return 'ignored';
  return db.transaction('rw', db.words, async () => {
    const found = await findListed(headword, lemmas);
    if (!found) {
      await db.words.add({ lemma: headword, lemmas, gloss, ...(pos ? { pos } : {}), lesson: 0, state: 'learning', since: now });
      return 'added';
    }
    if (found.state !== 'dropped') return 'already';
    await db.words.update(found.lemma, { state: 'learning', since: now, ...(found.gloss || !gloss ? {} : { gloss }), ...(found.pos || !pos ? {} : { pos }) });
    return 'added';
  });
}

/** Every lemma a solid word goes by (its headword and its lexicon lemmas, NFC): what the weave matches Greek words against. */
export async function listSolidLemmas(): Promise<Set<string>> {
  const solid = await db.words.where('state').equals('solid').toArray();
  return new Set(solid.flatMap((w) => [w.lemma, ...w.lemmas]).map((l) => l.normalize('NFC')));
}

/** Every lemma a learning word goes by (NFC), like listSolidLemmas: what the weave stands in Greek with its English beneath. */
export async function listLearningLemmas(): Promise<Set<string>> {
  const learning = await db.words.where('state').equals('learning').toArray();
  return new Set(learning.flatMap((w) => [w.lemma, ...w.lemmas]).map((l) => l.normalize('NFC')));
}

/** The headwords of his solid words, in the order of the list (lesson, then spelling): what the tutor is told he knows. */
export async function listSolidHeadwords(): Promise<string[]> {
  const solid = await db.words.where('state').equals('solid').toArray();
  return solid.sort((a, b) => a.lesson - b.lesson || a.lemma.localeCompare(b.lemma)).map((w) => w.lemma);
}

/** Every lemma a dropped word goes by (NFC), like listSolidLemmas: the new words the teach sheet must never offer. */
export async function listDroppedLemmas(): Promise<Set<string>> {
  const dropped = await db.words.where('state').equals('dropped').toArray();
  return new Set(dropped.flatMap((w) => [w.lemma, ...w.lemmas]).map((l) => l.normalize('NFC')));
}

/** What he told the teach sheet: Got it (learning, due now) or I know this (solid, the 30-day step). */
export type WordOutcome = 'got-it' | 'known';

/** The step whose gap is 30 days: where a word he already knows starts. */
const KNOWN_START_STEP = STEP_DAYS.indexOf(30);

/**
 * Takes a new word from his reading onto his list (the teach sheet): Got it makes it learning, lesson 0, source 'frontier', on the
 * schedule at step 0 and due now; I know this makes it solid and puts it at the 30-day step, due in 30 days. A word already on the
 * list keeps its place there and takes the state; one already on the schedule keeps its row. Publishes frontier-taught after the
 * write.
 */
export async function teachWord(lemma: string, gloss: string, outcome: WordOutcome, now = Date.now()): Promise<void> {
  const { headword, lemmas } = normaliseLemma(lemma);
  if (!headword) return;
  const state: WordState = outcome === 'known' ? 'solid' : 'learning';
  await db.transaction('rw', db.words, db.reviews, async () => {
    const found = (await db.words.get(headword)) ?? (await db.words.where('lemmas').anyOf(lemmas).first());
    if (found) await db.words.update(found.lemma, { state, since: now });
    else await db.words.add({ lemma: headword, lemmas, gloss, lesson: 0, source: 'frontier', state, since: now });
    const start = outcome === 'known' ? () => ({ step: KNOWN_START_STEP, due: now + 30 * DAY }) : undefined;
    await writeScheduled('word', [found?.lemma ?? headword], now, start);
  });
  publish({ kind: 'frontier-taught', lemma: headword, outcome });
  await announceDue(now);
}
