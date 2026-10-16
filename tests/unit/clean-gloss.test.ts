// A gloss is shown as plain English (mw-5r3p30.384): the dictionary's 'range: chosen' form ('spirit/breath: spirit') and a case before a
// preposition's meanings ('dat: in, by, with') are cleaned once by src/data/gloss.ts cleanGloss, where a gloss comes in. The sweep reads every
// gloss the screens can show (Words, the word sheet, the Quick test, Review, the teach sheet, the Goal screen, Drill it's examples and what the
// tutor is sent all read one of these: the lexicon, a chapter file's lex, the seed) and fails on any still in a source form.
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cleanGloss, sourceFormOf } from '../../src/data/gloss';
import type { Chapter } from '../../src/data/chapter';
import type { LemmaLexicon } from '../../src/data/lexicon';
import { parseImport } from '../../src/data/importWords';
import { readRound, saveRound } from '../../src/data/roundKeep';
import type { Question } from '../../src/data/quiz';
import { SEED_WORDS } from '../../src/data/seed-words';
import { parseExampleWords } from '../../scripts/seed-build';
import { parseLexicon } from '../../scripts/data-build';

describe('cleanGloss', () => {
  it.each([
    ['spirit/breath: spirit', 'spirit, breath'],
    ['evil/harm: evil', 'evil, harm'],
    ['to test/tempt: tempt', 'to test, tempt'],
    ['temptation/testing: temptation', 'temptation, testing'],
    ['be weary/sick: weak', 'be weary, sick, weak'],
    ['to do/make: do', 'to do, make'],
    ['to keep/guard: observe', 'to keep, guard, observe'],
    ['prison/watch: prison', 'prison, watch'],
    ['voice/sound: voice', 'voice, sound'],
    ['that/since: that', 'that, since'],
    ['by/under: by', 'by, under'],
    ['to keep: observe', 'to keep, observe'],
    ['lord: God', 'lord, God'],
    ['hell: Hades', 'hell, Hades'],
    ['an age: age', 'an age'],
    ['to see: see', 'to see'],
    ['be weak: weak', 'be weak'],
    ['elder: Elder', 'elder'],
  ])('reads the dictionary form %j as %j', (raw, clean) => {
    expect(cleanGloss(raw)).toBe(clean);
  });

  it.each([
    ['dat: in, by, with', 'in, by, with (dative)'],
    ['gen: through; acc: because of', 'through (genitive); because of (accusative)'],
    ['to say, speak (aor: εἶπον)', 'to say, speak (aorist εἶπον)'],
  ])('reads the case or tense written before the meanings %j as %j', (raw, clean) => {
    expect(cleanGloss(raw)).toBe(clean);
  });

  it.each(['flesh', 'cause/charge', 'to call (on)/name', 'he/she/it said (aorist of λέγω)', 'except; if not', 'how much/many?', ''])(
    'leaves a gloss with no source form as it is: %j',
    (plain) => {
      expect(cleanGloss(plain)).toBe(plain);
      expect(sourceFormOf(plain)).toBeUndefined();
    },
  );

  it('names the source form a gloss still has, and none once it is cleaned', () => {
    expect(sourceFormOf('spirit/breath: spirit')).toBe('range: chosen');
    expect(sourceFormOf('dat: in, by, with')).toBe('dat:');
    expect(sourceFormOf('to say, speak (aor: εἶπον)')).toBe('aor:');
    for (const raw of ['spirit/breath: spirit', 'dat: in, by, with', 'to say, speak (aor: εἶπον)']) {
      expect(sourceFormOf(cleanGloss(raw))).toBeUndefined();
      expect(cleanGloss(cleanGloss(raw))).toBe(cleanGloss(raw));
    }
  });
});

/** Every gloss of `entries` that is still in a source form, as 'where: gloss (form)'. */
const unclean = (entries: Array<[where: string, gloss: string]>): string[] =>
  entries.flatMap(([where, gloss]) => {
    const form = sourceFormOf(gloss);
    return form ? [`${where}: ${gloss} (${form})`] : [];
  });

describe('every gloss a screen can show', () => {
  it('in the lexicon (Words, a word from a link or a talk) is clean', () => {
    const lexicon = JSON.parse(readFileSync('public/data/lexicon.json', 'utf8')) as LemmaLexicon;
    expect(unclean(Object.entries(lexicon).map(([lemma, e]) => [lemma, e.g]))).toEqual([]);
    expect(lexicon['πνεῦμα'].g).toBe('spirit, breath');
  });

  it("in every chapter file (the word sheet, the teach sheet, the Goal screen, Drill it's examples, what the tutor is sent) is clean", () => {
    const found: Array<[string, string]> = [];
    for (const book of readdirSync('public/data', { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== 'ladder')) {
      for (const file of readdirSync(`public/data/${book.name}`)) {
        const chapter = JSON.parse(readFileSync(`public/data/${book.name}/${file}`, 'utf8')) as Chapter;
        for (const [strongs, e] of Object.entries(chapter.lex)) found.push([`${book.name}/${file} ${strongs}`, e.g]);
      }
    }
    expect(found.length).toBeGreaterThan(5000);
    expect(unclean(found)).toEqual([]);
  });

  it("in the seed (the Quick test's and Review's other choices) is clean", () => {
    expect(unclean(SEED_WORDS.map((s) => [s.lemma, s.gloss]))).toEqual([]);
    expect(SEED_WORDS.find((s) => s.lemma === 'ἐν')?.gloss).toBe('in, by, with (dative)');
  });

  it('comes in clean from the seed build, the data build and Import', () => {
    expect(parseExampleWords('| 34 | ἐν | 1 | 1 | dat: in, by, with | Preposition | (2763x) |')[0].gloss).toBe('in, by, with (dative)');
    const tbesg = 'G4151\tG4151G =\tG4151G\tπνεῦμα\tpneuma\tG:N-N\tspirit/breath: spirit\tthe spirit';
    expect(parseLexicon(tbesg).get('G4151')?.gloss).toBe('spirit, breath');
    expect(parseImport('πνεῦμα — spirit/breath: spirit')).toMatchObject([{ ok: true, gloss: 'spirit, breath' }]);
  });

  it('in a Quick test round kept before this version (Resume) is clean, and the right answer is still the right one', () => {
    const question: Question = {
      lemma: 'πνεῦμα',
      prompt: 'πνεῦμα',
      gloss: 'spirit/breath: spirit',
      options: ['spirit/breath: spirit', 'flesh', 'dat: in, by, with', 'son'],
    };
    saveRound({ questions: [question], index: 0, picked: 'spirit/breath: spirit', missed: [question], answers: [{ lemma: 'ἐν', picked: 'dat: in, by, with', right: true }] });
    const round = readRound()!;
    expect(round.questions[0]).toMatchObject({ gloss: 'spirit, breath', options: ['spirit, breath', 'flesh', 'in, by, with (dative)', 'son'] });
    expect(round.picked).toBe(round.questions[0].gloss);
    expect(unclean([...round.questions, ...round.missed].flatMap((q) => [q.gloss, ...q.options]).map((g) => ['round', g]))).toEqual([]);
    expect(round.answers).toEqual([{ lemma: 'ἐν', picked: 'in, by, with (dative)', right: true }]);
    localStorage.clear();
  });
});
