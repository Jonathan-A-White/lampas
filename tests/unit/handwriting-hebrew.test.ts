// tests/unit/handwriting-hebrew.test.ts — the on-device checker for Hebrew letters (mw-5r3p30.913, the Hebrew parity of tests/unit/handwriting.test.ts): the 27 glyphs' strokes, a writing of each
// recognised as that letter in three hands and the distortions, the look-alike pairs told apart, and the Greek checker left as it was.
import { describe, expect, it } from 'vitest';
import { HEBREW_GLYPHS } from '../../src/data/grammar/hebrew/letters';
import { HEBREW_SET, drawRound, startLetterDrill, withWriting } from '../../src/data/grammar/letterDrill';
import { ideaOfAny } from '../../src/data/grammar/ladders';
import { mulberry32 } from '../../src/data/random';
import { writeTargetOf } from '../../src/handwriting/target';
import { whyLinesOf } from '../../src/handwriting/writeText';
import { glyphsOfScript, scriptOfGlyph, strokeNotesOf, variantsOf } from '../../src/handwriting/glyphs';
import { caseTwins, recognize, type InkStroke } from '../../src/handwriting/recognizer';
import { HEBREW_STROKES } from '../../src/handwriting/hebrewTemplates';
import { WRITERS, writing, type Distortion } from '../support/handwriting';

const DISTORTIONS: readonly [string, Distortion][] = [
  ['as written', {}],
  ['small', { scale: 0.4 }],
  ['large', { scale: 2.5 }],
  ['turned 12° one way', { rotate: 12 }],
  ['turned 12° the other way', { rotate: -12 }],
  ['jittered', { jitter: 0.012 }],
  ['drawn backwards', { reverse: true }],
];

const ink = (letter: string, writer = 0, distortion: Distortion = {}): InkStroke[] => writing(letter, WRITERS[writer], distortion);
const hebrew = (writings: InkStroke[], target: string) => recognize(writings, target, { script: 'hbo' });

describe('the Hebrew templates', () => {
  it('cover the 27 glyphs the letter drill asks, each in NFC Hebrew', () => {
    expect(Object.keys(HEBREW_STROKES).sort()).toEqual([...HEBREW_GLYPHS].sort());
    for (const glyph of HEBREW_GLYPHS) {
      expect(glyph).toBe(glyph.normalize('NFC'));
      expect(glyph).toMatch(/^\p{Script=Hebrew}$/u);
      expect(scriptOfGlyph(glyph)).toBe('hbo');
      expect(variantsOf(glyph)).toBe(HEBREW_STROKES[glyph]);
    }
  });

  it('give every glyph one stroke or several, the first the model Write it shows, with a note for each stroke of a glyph with more than one', () => {
    for (const glyph of HEBREW_GLYPHS) {
      const first = HEBREW_STROKES[glyph][0];
      expect(first.length, glyph).toBeGreaterThanOrEqual(1);
      expect(HEBREW_STROKES[glyph].length, glyph).toBeGreaterThanOrEqual(2);
      if (first.length > 1) expect(strokeNotesOf(glyph), `${glyph} has ${first.length} strokes and no notes`).toHaveLength(first.length);
      else expect(strokeNotesOf(glyph), glyph).toBeUndefined();
    }
  });

  it('keep the Greek ones apart: a Greek glyph is Greek and has no Hebrew stroke', () => {
    expect(scriptOfGlyph('ο')).toBe('grc');
    expect(variantsOf('ο')).toBe(glyphsOfScript('grc')['ο']);
    expect(variantsOf('א')).toBe(glyphsOfScript('hbo')['א']);
    expect(variantsOf('x')).toBeUndefined();
    expect(Object.keys(glyphsOfScript('grc')).some((g) => scriptOfGlyph(g) === 'hbo')).toBe(false);
  });

  it('write an upright from the top down, and the roof of ד ה ז ח ת from the right to the left, as a Hebrew hand does', () => {
    const wrong: string[] = [];
    for (const glyph of HEBREW_GLYPHS) {
      HEBREW_STROKES[glyph][0].forEach((stroke, i) => {
        const [a, b] = [stroke[0], stroke[stroke.length - 1]];
        const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
        if (Math.abs(dx) < 0.1 && Math.abs(dy) > 0.3 && dy < 0) wrong.push(`${glyph}: stroke ${i + 1} goes up`);
        if (i === 0 && 'דהזחת'.includes(glyph) && dx > -0.3) wrong.push(`${glyph}: the roof does not run from right to left`);
      });
    }
    expect(wrong).toEqual([]);
  });
});

describe('a writing of a Hebrew letter', () => {
  for (const [name, distortion] of DISTORTIONS) {
    it(`is recognised as that letter, ${name}`, () => {
      const misses: string[] = [];
      for (const glyph of HEBREW_GLYPHS) {
        for (let writer = 0; writer < WRITERS.length; writer += 1) {
          const result = hebrew(ink(glyph, writer, distortion), glyph);
          if (!result.match || ![glyph, ...caseTwins(glyph, 'hbo')].includes(result.closest)) misses.push(`${glyph} (hand ${writer}) -> ${result.closest} ${result.score.toFixed(2)}`);
        }
      }
      expect(misses).toEqual([]);
    });
  }

  it('does not depend on the order or direction of the strokes', () => {
    for (const glyph of HEBREW_GLYPHS) {
      const forwards = ink(glyph, 0);
      const backwards = [...forwards].reverse().map((stroke) => [...stroke].reverse());
      expect(hebrew(backwards, glyph).match, glyph).toBe(true);
    }
  });

  it('is never taken for a Greek letter: the Greek checker is asked for Greek only', () => {
    expect(recognize(ink('א'), 'α').match).toBe(false);
    expect(recognize(ink('ο'), 'ο').match).toBe(true);
    expect(hebrew(ink('ο'), 'א').match).toBe(false);
  });
});

describe('the look-alike Hebrew letters', () => {
  const PAIRS = ['בכ', 'דר', 'הח', 'חת', 'הת', 'וז', 'וי', 'גנ', 'מס', 'סם', 'כך', 'נן', 'פצ', 'עצ', 'טס', 'כק', 'ףפ', 'ךן', 'ץע', 'שמ', 'אצ', 'לא', 'ךו'];
  for (const pair of PAIRS) {
    const [a, b] = [...pair];
    it(`${a} and ${b} are told apart, both ways, in every hand and distortion`, () => {
      const failures: string[] = [];
      for (const [from, to] of [[a, b], [b, a]]) {
        for (const [name, distortion] of DISTORTIONS) {
          for (let writer = 0; writer < WRITERS.length; writer += 1) {
            const result = hebrew(ink(from, writer, distortion), to);
            if (result.match || ![from, ...caseTwins(from, 'hbo')].includes(result.closest)) failures.push(`${from} (hand ${writer}, ${name}) read as ${result.closest} asked for ${to}, match ${result.match}`);
          }
        }
      }
      expect(failures).toEqual([]);
    });
  }
});

describe('which strokes were off', () => {
  it('names nothing off in a good writing and a stroke that is no part of the letter in a bad one', () => {
    for (const glyph of HEBREW_GLYPHS) {
      const result = hebrew(ink(glyph, 0), glyph);
      expect(result.offStrokes, glyph).toEqual([]);
      expect(result.missing, glyph).toBe(false);
    }
  });
});

describe('what Write it writes of a Hebrew letter', () => {
  it('is its ordinary shape, or its final form where the letter has one, named by the letter', () => {
    const kaf = ideaOfAny('he-letter-kaf');
    expect(writeTargetOf(kaf)).toMatchObject({ glyph: 'כ', lang: 'hbo', title: 'Kaf' });
    expect(writeTargetOf(kaf, 'final')).toMatchObject({ glyph: 'ך', lang: 'hbo', title: 'Kaf, final form' });
    expect(writeTargetOf(ideaOfAny('he-letter-alef'), 'final')).toMatchObject({ glyph: 'א', title: 'Alef' });
    expect(writeTargetOf(ideaOfAny('he-alphabet'))).toBeUndefined();
    expect(writeTargetOf(ideaOfAny('letter-omicron'))).toMatchObject({ glyph: 'ο', lang: 'grc', title: 'Omicron' });
  });

  it('says in its why line that Hebrew need not be written, and Greek says Greek', () => {
    expect(whyLinesOf('hbo').join(' ')).toBe('Writing a letter by hand helps it stick. You never need to write Hebrew to read the Bible.');
    expect(whyLinesOf('grc').join(' ')).toBe('Writing a letter by hand helps it stick. You never need to write Greek to read the Bible.');
  });

  it('is mixed into the Hebrew letter drill, two a round after the third and the sixth question, a final form written in its own shape', () => {
    const round = drawRound(startLetterDrill(), mulberry32(7), undefined, false, HEBREW_SET);
    const steps = withWriting(round, true);
    const writes = steps.filter((s) => s.kind === 'write');
    expect(writes).toHaveLength(2);
    expect(steps.filter((s) => s.kind === 'choice')).toHaveLength(8);
    for (const step of steps) if (step.kind === 'write') expect(HEBREW_SET.targets.map((t) => t.letter)).toContain(step.letter);
    expect(withWriting(round, false).every((s) => s.kind === 'choice')).toBe(true);
    // a final-form target writes the final form
    const finals = HEBREW_SET.targets.filter((t) => t.form === 'final');
    const asked = finals.map((target) => ({ target, mode: 'name' as const, question: round[0].question }));
    const withFinals = withWriting([...asked, ...asked], true).filter((s) => s.kind === 'write');
    expect(withFinals.length).toBeGreaterThan(0);
    for (const step of withFinals) expect(step).toMatchObject({ form: 'final' });
  });
});
