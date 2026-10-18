// The lesson 'Rolling your r' (mw-5r3p30.359): the shipped Hard sounds lesson on the Greek ρ, read as data. It starts from the tap of 'butter', goes to the tapped r between
// vowels, has the pairs ρ/λ and ρ/δ to tell apart, words to say, and the trill as a stretch; its IPA is the screen's to show, never the text's. The stretch step is the engine's
// (src/data/hardSounds/schema.ts); the feature features/roll-r.feature proves the screens.
import { describe, expect, it } from 'vitest';
import { lessonProblems, type HardSoundLesson } from '../../src/data/hardSounds/schema';
import { learnLabel, lessonById, lessonsForLetter, saidFor } from '../../src/hardSounds/lessons';
import { accentOf } from '../../src/speech/accents';
import { SOUND_IDS } from '../../src/speech/sounds';
import raw from '../../src/data/hardSounds/tapped-r.json';

const lesson = lessonById('tapped-r') as HardSoundLesson;
const clone = (): Record<string, unknown> => JSON.parse(JSON.stringify(raw)) as Record<string, unknown>;
const stepsOf = (r: Record<string, unknown>): Record<string, unknown>[] => r.steps as Record<string, unknown>[];
const base = (c: string): string => c.normalize('NFD').charAt(0).toLowerCase();
/** The letters at which two words of the same length differ, as 'λρ' (sorted), or '' when they differ otherwise. */
const toldApartBy = (a: string, b: string): string => {
  const x = [...a].map(base);
  const y = [...b].map(base);
  const at = x.findIndex((c, i) => c !== y[i]);
  const same = x.length === y.length && x.every((c, i) => i === at || c === y[i]);
  return same && at >= 0 ? [x[at], y[at]].sort().join('') : '';
};

describe('Rolling your r', () => {
  it('is a shipped lesson that passes the schema, called Rolling your r, for Modern Greek, American and British ears', () => {
    expect(lessonProblems(raw)).toEqual([]);
    expect(lesson.title).toBe('Rolling your r');
    expect(lesson.scheme).toBe('modern');
    expect(lesson.for).toEqual(['american', 'british']);
    expect(lesson.letters).toEqual(['ρ']);
  });

  it('is offered from the Rho sheet as Learn to roll your r, in Modern Greek only', () => {
    expect(learnLabel(lesson)).toBe('Learn to roll your r (optional)');
    expect(lessonsForLetter('ρ', 'modern', accentOf('american')).map((l) => l.id)).toEqual(['tapped-r']);
    expect(lessonsForLetter('ρ', 'modern', accentOf('british')).map((l) => l.id)).toEqual(['tapped-r']);
    expect(lessonsForLetter('ρ', 'erasmian', accentOf('american'))).toEqual([]);
  });

  it('goes why, the tap, the tapped r, the pairs, say it, the trill as a stretch, a verse', () => {
    expect(lesson.steps.map((s) => s.kind)).toEqual(['why', 'from-known', 'hear', 'contrast', 'try', 'stretch', 'verse']);
  });

  it("says why the English r differs for an American and for a Briton, and starts from the tap of 'butter' and 'ladder'", () => {
    const [why, known] = lesson.steps;
    expect(saidFor(why.text, accentOf('american'))).toMatch(/bunched|pulled back/);
    expect(saidFor(why.text, accentOf('british'))).toMatch(/do not say it at all/);
    expect(saidFor(known.text, accentOf('american'))).toMatch(/butter/);
    expect(saidFor(known.text, accentOf('american'))).toMatch(/ladder/);
  });

  it('hears the tapped r between vowels, in ἀρχῆς and χεῖρες', () => {
    const hear = lesson.steps.find((s) => s.kind === 'hear');
    expect(hear && 'words' in hear ? hear.words : []).toEqual(expect.arrayContaining(['ἀρχῆς', 'χεῖρες']));
  });

  it('has a pair told apart by ρ and λ and one by ρ and δ', () => {
    const contrast = lesson.steps.find((s) => s.kind === 'contrast');
    const pairs = contrast && 'pairs' in contrast ? contrast.pairs : [];
    const told = pairs.map(([a, b]) => toldApartBy(a, b));
    expect(told).toContain('λρ');
    expect(told).toContain('δρ');
  });

  it('has a stretch step of words to hear and say, whose IPA is the trill, shown by the screen alone', () => {
    const stretch = lesson.steps.find((s) => s.kind === 'stretch');
    expect(stretch && 'ipa' in stretch ? stretch.ipa : '').toBe('/r/');
    expect(stretch && 'words' in stretch ? stretch.words.length : 0).toBeGreaterThan(1);
    expect(saidFor(stretch!.text, accentOf('american'))).toMatch(/stretch/i);
    expect(lesson.sounds).toEqual(['/ɾ/']);
  });

  it('names no IPA in any text', () => {
    const texts = lesson.steps.flatMap((s) => (typeof s.text === 'string' ? [s.text] : Object.values(s.text))).concat(lesson.title);
    for (const text of texts) {
      expect(text).not.toMatch(/[ɣʝðɛɔʃːçŋɾɡ]|\/r\//u);
      for (const id of SOUND_IDS) expect(text).not.toContain(id);
    }
  });

  it.each<[string, (r: Record<string, unknown>) => void, RegExp]>([
    ['a stretch step with no words', (r) => delete stepsOf(r).find((s) => s.kind === 'stretch')!.words, /words/],
    ['a stretch whose sound is not a slashed sound', (r) => (stepsOf(r).find((s) => s.kind === 'stretch')!.ipa = 'rolled'), /ipa/],
    ['a stretch that comes after the verse', (r) => stepsOf(r).push(stepsOf(r).splice(5, 1)[0]), /stretch|verse/],
    ['a stretch before the try step', (r) => stepsOf(r).splice(1, 0, stepsOf(r).splice(5, 1)[0]), /stretch/],
    ['a label with IPA', (r) => (r.learn = 'Learn to say ɾ'), /learn/],
    ['a label that is not a string', (r) => (r.learn = 3), /learn/],
  ])('rejects %s', (_, spoil, problem) => {
    const r = clone();
    spoil(r);
    expect(lessonProblems(r).join('\n')).toMatch(problem);
  });
});
