// tests/unit/hebrew-letters.test.ts — the letter drill and Drill it on a Hebrew letter (mw-gdcyf98.11): the 27 glyphs (the 22 letters and the 5 final forms) with the Israeli scheme's sounds, the drill
// that runs over them and the Greek drill's 24 letters unchanged. Pure half: src/data/grammar/letterDrill.ts, hebrew/letterQuestions.ts, hebrew/drillSteps.ts.
import { describe, expect, it } from 'vitest';
import { loadChapter } from '../../src/data/chapter';
import { drillSteps } from '../../src/data/grammar/drillIt';
import { HEBREW_DRILL_WORDS, HEBREW_FINALS, HEBREW_GLYPHS, HEBREW_LETTERS, hebrewBare, hebrewConsonants, isHebrewDrillable } from '../../src/data/grammar/hebrew/letters';
import { buildHebrewLetter, buildHebrewSound, buildHebrewWord, soundsOf, wordHolds } from '../../src/data/grammar/hebrew/letterQuestions';
import { itemsOf } from '../../src/data/grammar/ladder';
import { GREEK_SET, HEBREW_SET, ROUND_SIZE, TARGETS, answerTarget, drawRound, isComplete, letterSetOf, rightCount, startLetterDrill } from '../../src/data/grammar/letterDrill';
import { ideaChoice, soundLesson } from '../../src/data/grammar/lessons';
import { ideaOfAny } from '../../src/data/grammar/ladders';
import { mulberry32 } from '../../src/data/quiz';
import { hebrewPronunciationOf, lessonsOf } from '../../src/speech/pronunciation';
import { stubChapterFetch } from '../support/chapter-fetch';

const scheme = hebrewPronunciationOf();

describe('the Hebrew 27 glyphs', () => {
  it('are the 22 letters, then the 5 final forms, each once', () => {
    expect(HEBREW_GLYPHS).toHaveLength(27);
    expect(new Set(HEBREW_GLYPHS).size).toBe(27);
    expect(HEBREW_GLYPHS.slice(0, 22).join('')).toBe('אבגדהוזחטיכלמנסעפצקרשת');
    expect(HEBREW_GLYPHS.slice(22).join('')).toBe('ךםןףץ');
    expect(HEBREW_FINALS.map((l) => l.key)).toEqual(['kaf', 'mem', 'nun', 'pe', 'tsade']);
  });

  it('each have the Israeli scheme\'s sound lesson, a final form the sound of its letter', () => {
    const lessons = lessonsOf(scheme);
    for (const letter of HEBREW_LETTERS) {
      expect(lessons[letter.lesson]?.sound, letter.name).toBeTruthy();
      const idea = ideaOfAny(letter.id);
      expect(soundLesson(idea, scheme), letter.name).toContain('Israeli');
    }
    // alef and ayin are not said; every other letter has a sound the questions can ask by
    expect(HEBREW_LETTERS.filter((l) => soundsOf(l, scheme).length === 0).map((l) => l.key)).toEqual(['alef', 'ayin']);
    expect(ideaChoice(ideaOfAny('he-letter-bet'), scheme)).toMatch(/^b, as in/);
    expect(soundsOf(HEBREW_LETTERS.find((l) => l.key === 'bet')!, scheme)).toEqual(['b', 'v']);
  });

  it('are the drill\'s 27 targets: each letter once in its ordinary shape, each final form once', () => {
    expect(HEBREW_SET.targets).toHaveLength(27);
    expect(HEBREW_SET.targets.filter((t) => t.form === 'small')).toHaveLength(22);
    expect(HEBREW_SET.targets.filter((t) => t.form === 'final').map((t) => t.letter)).toEqual(HEBREW_FINALS.map((l) => l.id));
    expect(letterSetOf('hbo')).toBe(HEBREW_SET);
  });
});

describe('the Greek letter drill', () => {
  it('is unchanged: 24 letters, small and capital, 48 targets, alpha to omega', () => {
    expect(letterSetOf('grc')).toBe(GREEK_SET);
    expect(GREEK_SET.targets).toBe(TARGETS);
    expect(TARGETS).toHaveLength(48);
    expect(itemsOf('alphabet').map((l) => l.glyphs![0]).join('')).toBe('αβγδεζηθικλμνξοπρστυφχψω');
    expect(itemsOf('alphabet').map((l) => l.glyphs![1]).join('')).toBe('ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ');
    const round = drawRound(startLetterDrill(), mulberry32(3));
    expect(round).toHaveLength(ROUND_SIZE);
    for (const item of round) expect(item.question.lang).toBeUndefined();
  });
});

describe('the Hebrew letter drill', () => {
  it('draws a round of 8 questions about the Hebrew glyphs, heard or asked, each with four Hebrew glyphs and the right one among them', () => {
    const round = drawRound(startLetterDrill(), mulberry32(5), undefined, false, HEBREW_SET);
    expect(round).toHaveLength(ROUND_SIZE);
    for (const { target, question, mode } of round) {
      expect(mode === 'hear' || mode === 'name').toBe(true);
      expect(question.lang).toBe('hbo');
      expect(question.ideaId).toBe('he-alphabet');
      expect(question.options).toHaveLength(4);
      expect(question.options).toContain(question.right);
      for (const option of question.options) expect(HEBREW_GLYPHS, option).toContain(option);
      const letter = HEBREW_LETTERS.find((l) => l.id === target.letter)!;
      expect(question.right).toBe(target.form === 'final' ? letter.final : letter.letter);
      if (mode === 'hear') expect(question.say).toBe(question.right);
    }
  });

  it('asks the sound from the Hebrew scheme\'s lesson, and never offers a letter that says the same beside it', () => {
    const bet = HEBREW_LETTERS.find((l) => l.key === 'bet')!;
    let bySound = 0;
    for (let seed = 1; seed <= 60; seed += 1) {
      const q = buildHebrewLetter({ letter: bet, form: 'small' }, mulberry32(seed), scheme);
      if (!q.prompt.includes('sounds like')) {
        expect(q.prompt).toBe('Which letter is Bet?');
        continue;
      }
      bySound += 1;
      expect(q.prompt).toBe(`Which letter sounds like ${ideaChoice(ideaOfAny('he-letter-bet'), scheme)}?`);
      for (const option of q.options) {
        const letter = HEBREW_LETTERS.find((l) => l.letter === option)!;
        if (letter.key !== 'bet') expect(soundsOf(letter, scheme), letter.name).not.toContain('b');
      }
    }
    expect(bySound).toBeGreaterThan(10);
    // alef is said as nothing: it is asked by name
    for (let seed = 1; seed <= 20; seed += 1) expect(buildHebrewLetter({ letter: HEBREW_LETTERS[0], form: 'small' }, mulberry32(seed), scheme).prompt).toBe('Which letter is Alef?');
  });

  it('hears a letter with no other letter of its sound among the four, and offers final forms beside final forms', () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const kaf = HEBREW_LETTERS.find((l) => l.key === 'kaf')!;
      const q = buildHebrewSound({ letter: kaf, form: 'final' }, mulberry32(seed), scheme);
      expect(q.right).toBe('ך');
      for (const option of q.options) expect(HEBREW_FINALS.map((l) => l.final)).toContain(option);
      expect(q.options.filter((o) => o !== 'ך').every((o) => HEBREW_LETTERS.find((l) => l.final === o)!.key !== 'kaf')).toBe(true);
    }
  });

  it('goes on in rounds until all 27 are right, asking again what was missed', () => {
    let state = startLetterDrill();
    const random = mulberry32(11);
    let rounds = 0;
    const forms = new Set<string>();
    while (!isComplete(state, HEBREW_SET)) {
      rounds += 1;
      expect(rounds).toBeLessThan(30);
      for (const [i, item] of drawRound(state, random, undefined, false, HEBREW_SET).entries()) {
        forms.add(item.target.form);
        state = answerTarget(state, item.target, rounds > 1 || i % 2 === 0);
      }
    }
    expect(rightCount(state, HEBREW_SET)).toBe(27);
    expect([...forms].sort()).toEqual(['final', 'small']);
    expect(rounds).toBeGreaterThanOrEqual(4);
  });
});

describe('Drill it on a Hebrew letter', () => {
  const alefId = 'he-letter-alef';

  it('is for the 22 letters; the alphabet has the letter drill and no other Hebrew idea a drill yet', () => {
    expect(HEBREW_LETTERS.every((l) => isHebrewDrillable(l.id))).toBe(true);
    for (const id of ['he-alphabet', 'he-final-forms', 'he-vowel-patach', 'he-dagesh']) expect(isHebrewDrillable(id), id).toBe(false);
  });

  it('asks its name, its sound and a word that holds it, in four steps', () => {
    const steps = drillSteps(alefId, { seed: 3 });
    expect(steps.map((s) => s.title)).toEqual(['See a letter and pick its name', 'Pick a letter from its name or its sound', 'Hear a letter, or pick its sound', 'Find the letter in a word']);
    for (const step of steps) expect(step.questions.length, step.title).toBeGreaterThanOrEqual(2);
    expect(steps[3].words).toBe(true);
    for (const step of steps) for (const q of step.questions) expect(q.lang, q.prompt).toBe('hbo');
    expect(steps[0].questions.every((q) => q.prompt === 'What is this letter called?' && q.right === 'Alef')).toBe(true);
  });

  it('asks a letter with a sound what it sounds like, in the Israeli scheme\'s words', () => {
    const steps = drillSteps('he-letter-bet', { seed: 3 });
    const sounds = steps.flatMap((s) => s.questions).filter((q) => q.prompt === 'What does this letter sound like?');
    expect(sounds.length).toBeGreaterThan(0);
    for (const q of sounds) expect(q.right).toBe(ideaChoice(ideaOfAny('he-letter-bet'), scheme));
  });

  it('asks the word from the chapters of the goal that holds the letter, in its dictionary form, else from the words of Genesis 1 and Jonah 1', async () => {
    stubChapterFetch();
    const gen = await loadChapter('gen', 1);
    const lemmas = new Set(gen.verses.flatMap((v) => v.g.map((w) => hebrewBare(w.l))));
    const fromPassage = drillSteps('he-letter-bet', { seed: 3, passage: [gen] })[3].questions;
    expect(fromPassage.length).toBeGreaterThan(0);
    for (const q of fromPassage) {
      expect(q.prompt).toMatch(/^Which of these words has the letter Bet, ב\?$/);
      expect(wordHolds(q.right, HEBREW_LETTERS[1])).toBe(true);
      expect(q.options.filter((o) => wordHolds(o, HEBREW_LETTERS[1]))).toEqual([q.right]);
    }
    expect(fromPassage.some((q) => lemmas.has(q.right))).toBe(true);
    // a Greek goal has no Hebrew word: the fixed words fill in
    const none = drillSteps('he-letter-bet', { seed: 3, passage: [] })[3].questions;
    expect(none.length).toBeGreaterThan(0);
    for (const q of none) expect(HEBREW_DRILL_WORDS).toContain(q.right);
  });

  it('can ask a word question of every letter', () => {
    for (const letter of HEBREW_LETTERS) {
      const q = buildHebrewWord({ letter, form: 'small' }, HEBREW_DRILL_WORDS, mulberry32(1));
      expect(q, letter.name).not.toBeNull();
      expect(wordHolds(q!.right, letter)).toBe(true);
    }
  });
});

describe('the drill\'s fixed Hebrew words', () => {
  it('are words of Genesis 1 and Jonah 1 and hold all 22 letters between them', async () => {
    stubChapterFetch();
    const spellings = new Set<string>();
    for (const [code, n] of [['gen', 1], ['jon', 1]] as const) for (const v of (await loadChapter(code, n)).verses) for (const w of v.g) spellings.add(hebrewBare(w.t));
    expect(HEBREW_DRILL_WORDS.filter((w) => !spellings.has(hebrewBare(w)))).toEqual([]);
    expect(new Set(HEBREW_DRILL_WORDS.flatMap((w) => [...hebrewConsonants(w)])).size).toBe(22);
  });
});
