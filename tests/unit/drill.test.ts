// The pure parts of the Parsing drill: an RP code split into features, the features grouped into steps of four
// choices, and a round drawn from a chapter and the words he knows.
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import type { Word, WordState } from '../../src/data/db';
import { DRILL_SIZE, buildSteps, drawDrill } from '../../src/data/drill';
import { decodeParse, splitParse } from '../../src/data/parseCode';
import { mulberry32 } from '../../src/data/quiz';

const rom8 = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const codes = [...new Set(rom8.verses.flatMap((v) => v.g.map((g) => g.p)))];

const word = (lemma: string, state: WordState): Word => ({ lemma, lemmas: [lemma], gloss: `gloss of ${lemma}`, lesson: 1, state, since: 0 });
/** Every lemma Romans 8 uses, each as a word he knows: solid, except every third which he is learning. */
const everyLemma = (): Word[] => [...new Set(rom8.verses.flatMap((v) => v.g.map((g) => g.l)))].map((l, i) => word(l, i % 3 === 0 ? 'learning' : 'solid'));

describe('splitParse: an RP code as a part of speech and the features it names', () => {
  it('splits a finite verb into tense, voice, mood, person and number', () => {
    const { pos, features } = splitParse('V-PAI-3S');
    expect(pos).toBe('verb');
    expect(features.map((f) => [f.id, f.value])).toEqual([
      ['tense', 'present'],
      ['voice', 'active'],
      ['mood', 'indicative'],
      ['person', '3rd person'],
      ['number', 'singular'],
    ]);
  });

  it('splits a participle into tense, voice, mood, case, number and gender, and an infinitive into three', () => {
    expect(splitParse('V-PAP-DPM').features.map((f) => f.id)).toEqual(['tense', 'voice', 'mood', 'case', 'number', 'gender']);
    expect(splitParse('V-AAN').features.map((f) => f.id)).toEqual(['tense', 'voice', 'mood']);
  });

  it('splits a noun, an adjective and an article into case, number and gender', () => {
    for (const code of ['N-DSM', 'A-NSN', 'T-GPF']) expect(splitParse(code).features.map((f) => f.id)).toEqual(['case', 'number', 'gender']);
    expect(splitParse('N-DSM').pos).toBe('noun');
    expect(splitParse('T-GPF').pos).toBe('article');
  });

  it('gives a pronoun its person when the code has one, and every kind of pronoun the part of speech pronoun', () => {
    expect(splitParse('P-1AS').features.map((f) => [f.id, f.value])).toEqual([
      ['case', 'accusative'],
      ['person', '1st person'],
      ['number', 'singular'],
    ]);
    expect(splitParse('R-DSN').pos).toBe('pronoun');
    expect(splitParse('F-3GSM').features.map((f) => f.id)).toEqual(['case', 'person', 'number', 'gender']);
  });

  it('has nothing beyond the part of speech for a particle, a name and an indeclinable', () => {
    for (const code of ['PRT', 'PREP', 'CONJ-N', 'COND', 'N-PRI']) expect(splitParse(code).features).toEqual([]);
  });

  it('throws on a code it does not know', () => {
    expect(() => splitParse('Z-XXX')).toThrow(/Unknown parsing code/);
  });

  it('agrees with decodeParse on every code of the New Testament', () => {
    const decoded = new Set<string>();
    for (const book of readdirSync('public/data', { withFileTypes: true }).filter((d) => d.isDirectory())) {
      for (const file of readdirSync(`public/data/${book.name}`)) {
        const chapter = JSON.parse(readFileSync(`public/data/${book.name}/${file}`, 'utf8')) as Chapter;
        for (const code of Object.keys(chapter.parse)) decoded.add(code);
      }
    }
    expect(decoded.size).toBeGreaterThan(300);
    for (const code of decoded) {
      const { pos, features } = splitParse(code);
      const words = decodeParse(code);
      expect(words, code).toContain(pos === 'pronoun' ? 'pronoun' : pos);
      for (const f of features) expect(words, `${code}: ${f.value}`).toContain(f.value);
    }
  });
});

describe('buildSteps: the questions about one word', () => {
  it('asks the part of speech first, then a verb tense, voice, mood, and person and number', () => {
    const steps = buildSteps('V-PAI-3S', mulberry32(1));
    expect(steps.map((s) => s.id)).toEqual(['pos', 'tense', 'voice', 'mood', 'person+number']);
    expect(steps.map((s) => s.right)).toEqual(['verb', 'present', 'active', 'indicative', '3rd person singular']);
  });

  it('asks a participle its case, then number and gender', () => {
    const steps = buildSteps('V-AAP-GSM', mulberry32(1));
    expect(steps.map((s) => s.id)).toEqual(['pos', 'tense', 'voice', 'mood', 'case', 'number+gender']);
    expect(steps[5].right).toBe('singular masculine');
  });

  it('asks a noun its case, then number and gender', () => {
    const steps = buildSteps('N-DSM', mulberry32(1));
    expect(steps.map((s) => [s.id, s.right])).toEqual([
      ['pos', 'noun'],
      ['case', 'dative'],
      ['number+gender', 'singular masculine'],
    ]);
  });

  it('asks only the part of speech of a particle', () => {
    expect(buildSteps('PRT', mulberry32(1)).map((s) => s.id)).toEqual(['pos']);
  });

  it('puts the right answer among four different choices at every step of every code in Romans 8', () => {
    for (const code of codes) {
      for (const step of buildSteps(code, mulberry32(3))) {
        expect(step.options, `${code} ${step.id}`).toHaveLength(4);
        expect(new Set(step.options).size, `${code} ${step.id}`).toBe(4);
        expect(step.options, `${code} ${step.id}`).toContain(step.right);
      }
    }
  });

  it('splits every code in Romans 8 into steps without throwing, whatever the random numbers', () => {
    for (const code of codes) for (let seed = 0; seed < 20; seed += 1) expect(() => buildSteps(code, mulberry32(seed))).not.toThrow();
  });

  it('is stable for a seed', () => {
    expect(buildSteps('V-PAI-3S', mulberry32(9))).toEqual(buildSteps('V-PAI-3S', mulberry32(9)));
  });
});

describe('drawDrill: a round from a chapter and his words', () => {
  it('draws ten occurrences of words he knows, the same ten for the same seed', () => {
    const words = everyLemma();
    const round = drawDrill(rom8, words, mulberry32(7));
    expect(round).toHaveLength(DRILL_SIZE);
    expect(drawDrill(rom8, words, mulberry32(7))).toEqual(round);
    const known = new Set(words.map((w) => w.lemma));
    for (const q of round) {
      expect(known.has(q.lemma)).toBe(true);
      const verse = rom8.verses.find((v) => v.n === q.verse);
      expect(verse?.g[q.at].t).toBe(q.form);
      expect(verse?.g.map((g) => g.t)).toEqual(q.words);
      expect(q.reference).toBe(`Romans 8:${q.verse}`);
      expect(q.steps[0].id).toBe('pos');
      expect(q.parsing).toBe(rom8.parse[q.code]);
    }
  });

  it('asks ten different words when he knows that many, learning ones among the first', () => {
    const round = drawDrill(rom8, everyLemma(), mulberry32(7));
    expect(new Set(round.map((q) => q.lemma)).size).toBe(DRILL_SIZE);
  });

  it('asks only words he knows, never a dropped one', () => {
    const words = everyLemma().map((w): Word => ({ ...w, state: 'dropped' }));
    expect(drawDrill(rom8, words, mulberry32(7))).toEqual([]);
    const some = everyLemma();
    some.forEach((w, i) => (w.state = i < 3 ? 'solid' : 'dropped'));
    const lemmas = new Set(drawDrill(rom8, some, mulberry32(7)).map((q) => q.lemma));
    expect([...lemmas].every((l) => some.slice(0, 3).some((w) => w.lemma === l))).toBe(true);
  });

  it('leaves out words with nothing to parse beyond the part of speech while there are others, and uses them when the round is short', () => {
    const plain = (q: { steps: unknown[] }) => q.steps.length === 1;
    expect(drawDrill(rom8, everyLemma(), mulberry32(7)).some(plain)).toBe(false);
    const onlyParticles = rom8.verses.flatMap((v) => v.g).filter((g) => g.p === 'PRT' || g.p === 'CONJ').map((g) => word(g.l, 'solid'));
    const round = drawDrill(rom8, onlyParticles, mulberry32(7));
    expect(round.length).toBeGreaterThan(0);
    expect(round.every(plain)).toBe(true);
  });

  it('gives a short round when he knows few words', () => {
    const [first] = everyLemma();
    const round = drawDrill(rom8, [first], mulberry32(7));
    expect(round.length).toBeGreaterThan(0);
    expect(round.length).toBeLessThan(DRILL_SIZE + 1);
    expect(round.every((q) => q.lemma === first.lemma)).toBe(true);
  });

  it('prefers the words he is learning', () => {
    const words = everyLemma();
    const learning = new Set(words.filter((w) => w.state === 'learning').map((w) => w.lemma));
    const round = drawDrill(rom8, words, mulberry32(7));
    expect(round.filter((q) => learning.has(q.lemma)).length).toBeGreaterThanOrEqual(5);
  });
});
