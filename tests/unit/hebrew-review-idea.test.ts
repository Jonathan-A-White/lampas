// A Hebrew idea in Review (mw-gdcyf98.21): marking one known schedules its IDEA_KIND row; when it is due Review asks it through the Hebrew ladder, a letter by name or glyph and a word idea by tapping a word of
// the passage's Hebrew chapters, drawn right to left (lang 'hbo'); a Greek idea is asked as before; a question that cannot be drawn in Hebrew is refused for a Hebrew idea, with its reason.
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { buildHebrewConcept, buildHebrewIdeaQuestion, buildHebrewTapForm, hebrewFormOf, hebrewIdeasOfWord } from '../../src/data/grammar/hebrew/wordQuestions';
import { HEBREW_REFUSED, refuseHebrew } from '../../src/data/grammar/hebrew/refused';
import { ideaOf } from '../../src/data/grammar/ladder';
import { ideaOfAny } from '../../src/data/grammar/ladders';
import * as built from '../../src/data/grammar/questions';
import { mulberry32 } from '../../src/data/quiz';
import { getLevel, teachIdea } from '../../src/data/repositories/grammarLevels';
import { listDue } from '../../src/data/repositories/reviews';
import { hebrewPronunciationOf } from '../../src/speech/pronunciation';
import { GRAMMAR, KINDS } from '../../src/review/kinds';
import { drawReviewRound } from '../../src/review/round';
import { stubChapterFetch } from '../support/chapter-fetch';
import { readFileSync } from 'node:fs';
import type { Chapter } from '../../src/data/chapter';

const genesis = JSON.parse(readFileSync('public/data/gen/1.json', 'utf8')) as Chapter;
const DAY = 86_400_000;
const dueRow = (id: string) => ({ kind: 'grammar', id, step: 0, due: 0, lastWhen: 0, lapses: 0, rights: 0 });

beforeEach(async () => {
  stubChapterFetch();
  localStorage.clear();
  await db.open();
  await Promise.all([db.grammarLevels.clear(), db.reviews.clear(), db.settings.clear()]);
});

describe('marking a Hebrew idea known', () => {
  it('schedules its row, 30 days out, as a Greek idea\'s is', async () => {
    const now = Date.UTC(2026, 9, 28, 9, 0, 0);
    await teachIdea('he-article', 'known', now);
    expect(await getLevel('he-article')).toMatchObject({ level: 'solid' });
    const [row] = await db.reviews.toArray();
    expect(row).toMatchObject({ kind: 'grammar', id: 'he-article' });
    expect(row.due).toBeGreaterThan(now + 20 * DAY);
  });

  it('makes a Hebrew idea due in Review once its day comes, and the row of a Greek idea is as before', async () => {
    const now = Date.UTC(2026, 9, 28, 9, 0, 0);
    await teachIdea('he-article', 'got-it', now);
    await teachIdea('case-genitive', 'got-it', now);
    expect((await listDue('grammar', now + DAY)).map((r) => r.id).sort()).toEqual(['case-genitive', 'he-article']);
  });
});

describe('a due Hebrew idea in Review', () => {
  it('is asked from the Hebrew ladder: a tap-form on a word of the open Old Testament chapter, drawn Hebrew', async () => {
    localStorage.setItem('lampas.chapter', JSON.stringify({ book: 'gen', chapter: 1 }));
    const [item] = await GRAMMAR.draw([dueRow('he-article')], mulberry32(3));
    expect(item).toMatchObject({ kind: 'grammar', id: 'he-article' });
    const q = item.kind === 'grammar' ? item.question : null;
    expect(q).toMatchObject({ kind: 'tap-form', ideaId: 'he-article', lang: 'hbo', facet: { id: 'spot' } });
    expect(q?.options).toHaveLength(4);
    expect(q?.options).toContain(q?.right);
    expect(q?.right).toMatch(/^[ו]?[הבכל]?[ְ-ׇ]*ה/u);
    expect(q?.ref).toMatch(/^Genesis 1:/);
  });

  it('is asked in the Hebrew chapters even with a New Testament chapter open: Review reads the last Old Testament chapter', async () => {
    const [item] = await GRAMMAR.draw([dueRow('he-perfect')], mulberry32(5));
    const q = item.kind === 'grammar' ? item.question : null;
    expect(q?.lang).toBe('hbo');
    expect(q?.ideaId).toBe('he-perfect');
  });

  it('is a letter asked by name or glyph, drawn Hebrew', async () => {
    const [item] = await GRAMMAR.draw([dueRow('he-letter-bet')], mulberry32(3));
    const q = item.kind === 'grammar' ? item.question : null;
    expect(q?.lang).toBe('hbo');
    expect(q?.kind).toMatch(/^(letter|sound)$/);
  });

  it('is asked what it says of itself when the passage has no word that shows it', async () => {
    const q = buildHebrewIdeaQuestion(ideaOfAny('he-person-gender-number'), [genesis], mulberry32(1), hebrewPronunciationOf());
    expect(q).toMatchObject({ kind: 'concept', ideaId: 'he-person-gender-number', right: ideaOfAny('he-person-gender-number').title });
    expect(q.options.every((o) => !/[Ͱ-Ͽ]/u.test(o))).toBe(true);
    expect(q.options).toHaveLength(4);
  });

  it('comes in a round with the Greek ideas, which are asked as before', async () => {
    const now = Date.now();
    await db.reviews.bulkPut([dueRow('he-article'), dueRow('declension-2')].map((r) => ({ ...r, due: now - 1000 })));
    const { items } = await drawReviewRound(mulberry32(3));
    const asked = items.filter((i) => i.kind === 'grammar');
    expect(asked.map((i) => i.id).sort()).toEqual(['declension-2', 'he-article']);
    const greek = asked.find((i) => i.id === 'declension-2');
    expect(greek && greek.kind === 'grammar' ? greek.question.lang : 'x').toBeUndefined();
    expect(KINDS[1]).toBe(GRAMMAR);
  });

  it('draws a tap-form that none of the other three options shows the idea of', () => {
    const idea = ideaOfAny('he-article');
    for (let seed = 1; seed < 20; seed += 1) {
      const q = buildHebrewTapForm(idea, [genesis], mulberry32(seed));
      expect(q).not.toBeNull();
      const verse = genesis.verses.find((v) => `Genesis 1:${v.n}` === q!.ref)!;
      const shows = (form: string) => verse.g.some((w) => hebrewFormOf(w) === form && hebrewIdeasOfWord(genesis, w).includes('he-article'));
      expect(shows(q!.right)).toBe(true);
      expect(q!.options.filter((o) => o !== q!.right).some(shows)).toBe(false);
      expect(new Set(q!.options).size).toBe(4);
    }
    expect(buildHebrewConcept(idea, mulberry32(1)).kind).toBe('concept');
  });
});

describe('the questions that cannot be drawn in Hebrew', () => {
  const hebrew = ideaOfAny('he-alphabet');
  const greekOnly: [string, () => unknown][] = [
    ['buildMovable', () => built.buildMovable(hebrew, mulberry32(1))],
    ['buildMarksChangeWord', () => built.buildMarksChangeWord(hebrew, mulberry32(1))],
    ['buildEnclitic', () => built.buildEnclitic(hebrew, mulberry32(1))],
    ['buildSoundAlike', () => built.buildSoundAlike(hebrew, mulberry32(1))],
    ['buildSubscript', () => built.buildSubscript(hebrew, mulberry32(1))],
    ['buildPunctuation', () => built.buildPunctuation(hebrew, mulberry32(1))],
    ['buildPreposition', () => built.buildPreposition(hebrew, mulberry32(1))],
    ['buildCompound', () => built.buildCompound(hebrew, mulberry32(1))],
    ['buildStress', () => built.buildStress(hebrew, [genesis], mulberry32(1))],
    ['buildSyllables', () => built.buildSyllables(hebrew, [genesis], mulberry32(1))],
    ['buildBreathing', () => built.buildBreathing(hebrew, [genesis], mulberry32(1))],
  ];

  it.each(greekOnly)('%s is refused for a Hebrew idea, with its reason', (_, ask) => {
    expect(ask).toThrow(/is not asked of the Hebrew idea he-alphabet: .+/);
  });

  it('still builds for a Greek idea', () => {
    expect(built.buildMovable(ideaOf('movable-letters'), mulberry32(1)).ideaId).toBe('movable-letters');
  });

  it('gives each refused kind a reason of its own', () => {
    for (const [kind, reason] of Object.entries(HEBREW_REFUSED)) {
      expect(reason.length, kind).toBeGreaterThan(20);
      expect(() => refuseHebrew(hebrew, kind)).toThrow(reason);
    }
    expect(() => refuseHebrew(ideaOf('alphabet'), 'movable letters')).not.toThrow();
  });
});
