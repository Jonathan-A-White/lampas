// tests/unit/hebrew-ladder.test.ts — the Hebrew ladder's tiers (mw-gdcyf98.11, .12): the letters, the sounds and the marks, then the grammar tiers (nouns, pronouns, prepositions, verbs, joiners,
// sentences), each idea with its card, its Israeli sound lesson where it has a sound, and worked words that are words of Genesis 1 and Jonah 1. A card whose worked word is not in the chapter data is refused here, not patched by hand.
import { describe, expect, it } from 'vitest';
import { BOOKS } from '../../src/data/books';
import { loadChapter } from '../../src/data/chapter';
import { HEBREW_LADDER, HEBREW_PATH, HEBREW_VOWEL_IDEAS, isHebrewSoundIdea } from '../../src/data/grammar/hebrew/ladder';
import { HEBREW_LETTERS, HEBREW_LETTER_IDEAS, hebrewBare, hebrewConsonants } from '../../src/data/grammar/hebrew/letters';
import { HEBREW_TEACH } from '../../src/data/grammar/hebrew/teach';
import { cardTexts } from '../../src/data/grammar/teach';
import { pathProblems } from '../../src/data/grammar/pathGraph';
import { ladderFor } from '../../src/data/grammar/ladders';
import { HEBREW_LETTER_IDS, HEBREW_VOWEL_IDS } from '../../src/speech/schemes/hebrew-israeli-lessons';
import { hebrewPronunciationOf, lessonsOf } from '../../src/speech/pronunciation';
import { stubChapterFetch } from '../support/chapter-fetch';

const words = (text: string): number => text.trim().split(/\s+/).length;
const byTier = (tier: string) => HEBREW_LADDER.filter((i) => i.tier === tier);

describe('the Hebrew ladder', () => {
  it('has 28 ideas in the letters tier, 13 in the sounds tier, 3 in the marks tier and 26 in the grammar tiers', () => {
    expect(byTier('letters')).toHaveLength(28);
    expect(byTier('sounds')).toHaveLength(13);
    expect(byTier('marks')).toHaveLength(3);
    expect(Object.fromEntries(['nouns', 'pronouns', 'prepositions', 'verbs', 'joiners', 'sentences'].map((tier) => [tier, byTier(tier).length]))).toEqual({
      nouns: 5, pronouns: 3, prepositions: 4, verbs: 10, joiners: 2, sentences: 2,
    });
    expect(HEBREW_LADDER).toHaveLength(70);
  });

  it('is in tier order, with rungs from 1 in the order of the list', () => {
    const order = ['letters', 'sounds', 'marks', 'nouns', 'pronouns', 'prepositions', 'verbs', 'joiners', 'sentences'];
    expect(HEBREW_LADDER.map((i) => order.indexOf(i.tier))).toEqual([...HEBREW_LADDER.map((i) => order.indexOf(i.tier))].sort((a, b) => a - b));
    HEBREW_LADDER.forEach((idea, i) => expect([idea.id, idea.rung, idea.level]).toEqual([idea.id, i + 1, i + 1]));
  });

  it('has the ideas the story names, in the letters tier from the alphabet through shin and sin', () => {
    const ids = byTier('letters').map((i) => i.id);
    expect(ids[0]).toBe('he-alphabet');
    expect(ids.slice(1, 23)).toEqual(HEBREW_LETTER_IDEAS);
    expect(ids.slice(23)).toEqual(['he-final-forms', 'he-pair-bet-vet', 'he-pair-kaf-khaf', 'he-pair-pe-fe', 'he-shin-sin']);
    expect(byTier('sounds').map((i) => i.id)).toEqual([...HEBREW_VOWEL_IDEAS.slice(0, 8), 'he-vowel-shewa', 'he-dagesh', 'he-mappiq', 'he-furtive-patach', 'he-syllable']);
    expect(byTier('marks').map((i) => i.id)).toEqual(['he-maqaf', 'he-cantillation', 'he-ketiv-qere']);
  });

  it('has the grammar ideas the story names, tier by tier', () => {
    const ids = (tier: string) => byTier(tier).map((i) => i.id);
    expect(ids('nouns')).toEqual(['he-gender', 'he-number', 'he-article', 'he-construct', 'he-suffix-pronominal']);
    expect(ids('pronouns')).toEqual(['he-pronoun-personal', 'he-pronoun-demonstrative', 'he-pronoun-relative']);
    expect(ids('prepositions')).toEqual(['he-prep-inseparable', 'he-prep-min', 'he-object-marker', 'he-vav']);
    expect(ids('verbs')).toEqual([
      'he-root', 'he-qal', 'he-perfect', 'he-imperfect', 'he-imperative', 'he-participle', 'he-infinitive', 'he-vav-consecutive', 'he-stems', 'he-person-gender-number',
    ]);
    expect(ids('joiners')).toEqual(['he-conjunctions', 'he-interrogative']);
    expect(ids('sentences')).toEqual(['he-verbless-clause', 'he-word-order']);
  });

  it('is a DAG: every need is an idea of a lower rung, and the letters rest on the alphabet', () => {
    expect(pathProblems(HEBREW_LADDER)).toEqual([]);
    expect(HEBREW_PATH.byId.size).toBe(70);
    for (const idea of HEBREW_LADDER) for (const need of idea.needs) expect(HEBREW_PATH.byId.get(need)!.rung, `${idea.id} needs ${need}`).toBeLessThan(idea.rung);
    for (const id of HEBREW_LETTER_IDEAS) expect(HEBREW_PATH.byId.get(id)!.needs).toEqual(['he-alphabet']);
    expect(HEBREW_PATH.byId.get('he-final-forms')!.needs).toEqual(['he-letter-kaf', 'he-letter-mem', 'he-letter-nun', 'he-letter-pe', 'he-letter-tsade']);
  });

  it('prefixes every id he-, and the door answers for it', () => {
    for (const idea of HEBREW_LADDER) expect(idea.id.startsWith('he-'), idea.id).toBe(true);
    expect(ladderFor('hbo').ideas).toBe(HEBREW_LADDER);
  });

  it('has a text of under 80 words for every idea, none of it a sound', () => {
    for (const idea of HEBREW_LADDER) expect(words(idea.text), idea.id).toBeLessThan(80);
  });
});

describe('every card of the Hebrew ladder', () => {
  it('has one, and no card is for an idea the ladder lacks', () => {
    expect(Object.keys(HEBREW_TEACH).sort()).toEqual(HEBREW_LADDER.map((i) => i.id).sort());
  });

  it('says what it is, how to spot it, and works a word step by step, in under 80 words of teaching', () => {
    for (const idea of HEBREW_LADDER) {
      const card = HEBREW_TEACH[idea.id];
      expect(card.whatItIs.trim(), `${idea.id}: whatItIs`).not.toBe('');
      expect(card.howToSpot.trim(), `${idea.id}: howToSpot`).not.toBe('');
      expect(words(`${card.whatItIs} ${card.howToSpot}`), `${idea.id}: teaching`).toBeLessThan(80);
      expect(card.worked.length, `${idea.id}: worked`).toBeGreaterThan(0);
      for (const worked of card.worked) {
        expect(worked.ref, `${idea.id}: ${worked.word} has a reference`).toMatch(/^(Genesis|Jonah) 1:\d+$/);
        expect(worked.gloss.trim(), `${idea.id}: gloss`).not.toBe('');
        expect(worked.gloss, 'a gloss is one sense').not.toMatch(/\//);
        expect(worked.steps.length, `${idea.id}: ${worked.word} steps`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('fills every table: a caption, columns, and as many cells in each row as there are columns', () => {
    for (const idea of HEBREW_LADDER) {
      const table = HEBREW_TEACH[idea.id].table;
      if (!table) continue;
      expect(table.caption, idea.id).not.toBe('');
      for (const row of table.rows) expect(row.cells, `${idea.id}: ${row.label}`).toHaveLength(table.columns.length);
    }
    expect(HEBREW_TEACH['he-alphabet'].table!.rows).toHaveLength(22);
    expect(HEBREW_TEACH['he-final-forms'].table!.rows.map((r) => r.cells[1])).toEqual(['ך', 'ם', 'ן', 'ף', 'ץ']);
  });

  it('names no sound: the sound is the Israeli scheme\'s lesson (the Greek rule mw-5r3p30.312)', () => {
    const SOUNDY = /\b(sounds?|sounded|pronounc\w*|spoken|speak\w*|says?|said|voice\w*|heard|hear\w*|aloud|rhymes?|as in)\b|“[a-z]{1,3}”/i;
    for (const idea of HEBREW_LADDER) {
      const texts = [idea.text, ...cardTexts(HEBREW_TEACH[idea.id])];
      for (const text of texts) expect(SOUNDY.test(text), `${idea.id}: ${text}`).toBe(false);
    }
  });
});

describe('every letter and vowel idea', () => {
  const scheme = hebrewPronunciationOf();
  const lessons = lessonsOf(scheme);

  it('is the Israeli scheme\'s ids: the 22 letters and the 9 vowels, each with a lesson', () => {
    expect(HEBREW_LETTER_IDEAS).toEqual(HEBREW_LETTER_IDS);
    expect(HEBREW_VOWEL_IDEAS).toEqual(HEBREW_VOWEL_IDS);
    expect(scheme.language).toBe('he');
    for (const id of [...HEBREW_LETTER_IDS, ...HEBREW_VOWEL_IDS]) {
      expect(HEBREW_PATH.byId.has(id), `${id} is an idea`).toBe(true);
      expect(isHebrewSoundIdea(id), id).toBe(true);
      expect(lessons[id]?.sound, `${id} has a lesson`).toBeTruthy();
    }
    expect(Object.keys(lessons).sort()).toEqual([...HEBREW_LETTER_IDS, ...HEBREW_VOWEL_IDS].sort());
  });

  it('knows each letter\'s lesson by its data: the 22 letters, five with a final form', () => {
    expect(HEBREW_LETTERS).toHaveLength(22);
    for (const letter of HEBREW_LETTERS) expect(lessons[letter.lesson], letter.name).toBeDefined();
    expect(HEBREW_LETTERS.filter((l) => l.final).map((l) => l.final).join('')).toBe('ךםןףץ');
  });
});

describe('a worked word', () => {
  it('is a word of the verse it names, as the text spells it (no cantillation, maqaf or sof pasuq)', async () => {
    stubChapterFetch();
    const missing: string[] = [];
    for (const idea of HEBREW_LADDER) {
      for (const worked of HEBREW_TEACH[idea.id].worked) {
        const [, name, chapter, verse] = /^(.+) (\d+):(\d+)$/.exec(worked.ref!) ?? [];
        const book = BOOKS.find((b) => b.name === name);
        if (!book) {
          missing.push(`${idea.id}: no book ${worked.ref}`);
          continue;
        }
        const verses = (await loadChapter(book.code, Number(chapter))).verses;
        const found = verses.find((v) => v.n === Number(verse))?.g.map((w) => hebrewBare(w.t)) ?? [];
        if (!found.includes(hebrewBare(worked.word))) missing.push(`${idea.id}: ${worked.word} is not in ${worked.ref}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('holds the letter of its letter\'s card', () => {
    const wrong: string[] = [];
    for (const letter of HEBREW_LETTERS) for (const worked of HEBREW_TEACH[letter.id].worked) if (!hebrewConsonants(worked.word).includes(letter.letter)) wrong.push(`${letter.id}: ${worked.word}`);
    expect(wrong).toEqual([]);
  });
});
