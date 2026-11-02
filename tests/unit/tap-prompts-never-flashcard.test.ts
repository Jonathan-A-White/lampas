// mw-5r3p30.984: a question whose prompt tells him to tap what is on its card is never drawn as a flashcard (src/review/asksToTap.ts). Every kind of question the ladders draw, Greek and Hebrew,
// over many seeds: one whose prompt says 'Tap' (but not 'Tap to hear' alone) must be a question to tap, which stays its buttons at every step, a flashcard step included.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { gradedVerses } from '../../src/data/grammar/gradedVerses';
import { LADDER, ideaOf } from '../../src/data/grammar/ladder';
import { HEBREW_LADDER } from '../../src/data/grammar/hebrew/ladder';
import { buildHebrewIdeaQuestion } from '../../src/data/grammar/hebrew/wordQuestions';
import { buildIdeaQuestion, buildRoles, type GrammarQuestion } from '../../src/data/grammar/questions';
import { mulberry32 } from '../../src/data/quiz';
import { FLASHCARD_STEP } from '../../src/data/schedule';
import { hebrewPronunciationOf } from '../../src/speech/pronunciation';
import { asksToTap, modeForQuestion, modeOfQuestion } from '../../src/review/asksToTap';

const load = (file: string) => JSON.parse(readFileSync(`public/data/${file}.json`, 'utf8')) as Chapter;
const GREEK = [load('1jn/1'), load('jhn/1'), load('rom/8')];
const HEBREW = [load('gen/1')];
const SEEDS = 12;
/** every verse of the Greek chapters at his level, as Review draws a roles question (it asks only graded verses) */
const GRADED = gradedVerses(GREEK, () => true, new Set(GREEK.flatMap((c) => c.verses.flatMap((v) => v.g.map((w) => w.l.normalize('NFC'))))));

/** 'Tap the word that means ...', 'Tap to hear a letter, then tap it': the prompt sends him to something on the card. A bare 'Tap to hear' (a letter said aloud, then a question) does not. */
const sendsToTap = (q: GrammarQuestion): boolean => /\btap\b/i.test(q.prompt.replace(/tap to hear/gi, ''));

function drawnOf(): { q: GrammarQuestion; where: string }[] {
  const drawn: { q: GrammarQuestion; where: string }[] = [];
  for (let seed = 1; seed <= SEEDS; seed += 1) {
    for (const idea of LADDER) {
      for (const strong of [false, true]) {
        const q = buildIdeaQuestion(idea, GREEK, mulberry32(seed * 7919), undefined, undefined, undefined, GRADED, strong);
        drawn.push({ q, where: `${idea.id} seed ${seed}` });
      }
    }
    // who does it, which buildIdeaQuestion reaches only for a verse at his level
    for (const id of ['case-nominative', 'case-accusative']) {
      const q = buildRoles(ideaOf(id), GREEK, mulberry32(seed * 7919), GRADED);
      if (q) drawn.push({ q, where: `${id} roles seed ${seed}` });
    }
    for (const idea of HEBREW_LADDER) {
      drawn.push({ q: buildHebrewIdeaQuestion(idea, HEBREW, mulberry32(seed * 7919), hebrewPronunciationOf()), where: `${idea.id} (Hebrew) seed ${seed}` });
    }
  }
  return drawn;
}

describe('a question that says Tap is never a flashcard', () => {
  const drawn = drawnOf();

  it('draws every kind of question over the ladders, so the check below is not empty', () => {
    const kinds = new Set(drawn.map(({ q }) => q.kind));
    for (const kind of ['tap-form', 'roles', 'tap-use', 'sound', 'letter', 'ending', 'meaning', 'parse']) expect([...kinds], kind).toContain(kind);
    expect(drawn.some(({ q }) => q.lang === 'hbo' && q.kind === 'tap-form')).toBe(true);
    expect(drawn.some(({ q }) => q.lang === 'hbo' && q.kind === 'sound')).toBe(true);
  });

  it('asks every question whose prompt says Tap by its buttons, at every step and in a mode kept as a flashcard', () => {
    let tapped = 0;
    for (const { q, where } of drawn) {
      if (!sendsToTap(q)) continue;
      tapped += 1;
      expect(q.options.length, `${where}: "${q.prompt}" has something to tap`).toBeGreaterThan(0);
      expect(asksToTap(q), `${where}: "${q.prompt}" (${q.kind})`).toBe(true);
      expect(modeForQuestion(q, FLASHCARD_STEP), where).toBe('choice');
      expect(modeForQuestion(q, FLASHCARD_STEP + 3), where).toBe('choice');
      expect(modeOfQuestion(q, 'flashcard'), where).toBe('choice');
    }
    expect(tapped).toBeGreaterThan(50);
  });

  it('keeps a question that does not send him to tap a flashcard from the flashcard step', () => {
    const asked = drawn.filter(({ q }) => !sendsToTap(q) && q.kind !== 'parse' && q.kind !== 'say');
    expect(asked.length).toBeGreaterThan(50);
    for (const { q, where } of asked) expect(modeForQuestion(q, FLASHCARD_STEP), `${where}: "${q.prompt}" (${q.kind})`).toBe('flashcard');
  });
});
