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
import { frameOfPad } from '../../src/handwriting/padFrame';
import { WRITERS, onPad, writing, type Distortion, type Hand } from '../support/handwriting';

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

describe('a vav and a final nun on the pad that knows its line (mw-5r3p30.958)', () => {
  // the card tells the checker where the line is and how tall a letter is, from the pad's own height (padFrame.ts); a hand writes on that line
  const pad = frameOfPad(256)!;
  const cases: [Hand, Distortion][] = [];
  for (const scale of [0.8, 0.9, 1, 1.1, 1.25]) {
    for (const shiftY of [-0.08, 0, 0.08]) {
      for (const rotate of [0, 6, -6]) cases.push([{ scale, shiftY, shiftX: rotate / 30 }, { rotate, jitter: 0.008 }]);
    }
  }
  const onCard = (written: string, asked: string, writer: number, hand: Hand, distortion: Distortion) =>
    recognize(onPad(writing(written, WRITERS[writer], distortion), pad, 320, hand), asked, { script: 'hbo', ...pad });

  for (const [letter, other] of [['ו', 'ן'], ['ן', 'ו']]) {
    it(`takes a ${letter} written on the line for ${letter} and not for ${other}, in 90% of at least 50 hands`, () => {
      let right = 0;
      let wrong = 0;
      let total = 0;
      for (const [hand, distortion] of cases) {
        for (let writer = 0; writer < WRITERS.length; writer += 1) {
          total += 1;
          if (onCard(letter, letter, writer, hand, distortion).match) right += 1;
          if (onCard(letter, other, writer, hand, distortion).match) wrong += 1;
        }
      }
      expect(total).toBeGreaterThanOrEqual(50);
      console.info(`${letter}: ${right} of ${total} Right on its own card, ${wrong} of ${total} Right on the ${other} card`);
      expect(right / total).toBeGreaterThanOrEqual(0.9);
      expect(wrong / total).toBeLessThanOrEqual(0.1);
    });
  }

  it('leaves a writing whose place cannot tell them apart Right, as it was', () => {
    // a ו and a ן drawn with no line told: nothing to go by
    for (const [letter, asked] of [['ו', 'ן'], ['ן', 'ו']]) {
      expect(recognize(ink(letter), asked, { script: 'hbo' }).match).toBe(true);
    }
    // a stem that reaches from 0.2 above the line to 0.25 below it is as near a ן as a ו (byCase gives null): Right on either card
    const stem = onPad(writing('ו', WRITERS[0]), pad, 320).map((stroke) =>
      stroke.map((p) => ({ ...p, y: pad.baseline + (0.2 + 1.05 * (1 + (p.y - pad.baseline) / pad.capHeight) - 1) * pad.capHeight })),
    );
    expect([recognize(stem, 'ו', { script: 'hbo', ...pad }).match, recognize(stem, 'ן', { script: 'hbo', ...pad }).match]).toEqual([true, true]);
  });

  it('is unchanged for every other Hebrew letter: the pad tells nothing that moves them', () => {
    for (const glyph of HEBREW_GLYPHS) {
      if ('וןךףץ'.includes(glyph)) continue;
      for (let writer = 0; writer < WRITERS.length; writer += 1) {
        const strokes = onPad(writing(glyph, WRITERS[writer]), pad, 320);
        const [bare, told] = [hebrew(strokes, glyph), recognize(strokes, glyph, { script: 'hbo', ...pad })];
        expect(told, `${glyph} hand ${writer}`).toEqual(bare);
      }
    }
  });
});

describe('a hand that ignores the line is not told Not quite on its own card (mw-5r3p30.976)', () => {
  // the Deputy's check of 0.7.73: an honest ן written mid-pad and a ו written low were Not quite on their own cards. Not quite is for a writing that is clearly the twin.
  const pad = frameOfPad(256)!;
  const HEIGHT = 256;
  /** A writing of `letter` on the pad, its foot (design y 1) `shiftY` letter heights below the line, or with the middle of its ink at `middle` of the pad's height. */
  const written = (letter: string, writer: number, jitter: number, hand: { scale?: number; shiftY?: number; middle?: number }) => {
    const strokes = onPad(writing(letter, WRITERS[writer], { jitter }), pad, 320, { scale: hand.scale, shiftY: hand.shiftY });
    if (hand.middle === undefined) return strokes;
    const ys = strokes.flat().map((p) => p.y);
    const by = hand.middle * HEIGHT - (Math.min(...ys) + Math.max(...ys)) / 2;
    return strokes.map((stroke) => stroke.map((p) => ({ ...p, y: p.y + by })));
  };
  const verdictOn = (card: string, strokes: InkStroke[]) => recognize(strokes, card, { script: 'hbo', ...pad }).match;

  const CELLS: [string, string, { scale?: number; shiftY?: number; middle?: number }][] = [
    ['ן', 'ן middle at the pad centre, scale 0.7', { middle: 0.5, scale: 0.7 }],
    ['ן', 'ן middle at the pad centre, scale 1.0', { middle: 0.5, scale: 1 }],
    ['ו', 'ו centred low (0.65), scale 1.0', { middle: 0.65, scale: 1 }],
    ['ו', 'ו centred low (0.65), scale 1.4', { middle: 0.65, scale: 1.4 }],
    ['ו', 'ו written 0.35 below the line', { shiftY: 0.35 }],
    ['ו', 'ו written 0.5 below the line', { shiftY: 0.5 }],
    ['ן', 'ן written 0.15 high', { shiftY: -0.15 }],
    ['ן', 'ן written 0.25 high', { shiftY: -0.25 }],
  ];
  for (const [letter, name, hand] of CELLS) {
    it(`takes ${name} for its own letter: Right on the ${letter} card, all 6 writings`, () => {
      const results: boolean[] = [];
      for (const jitter of [0.004, 0.012]) for (let writer = 0; writer < WRITERS.length; writer += 1) results.push(verdictOn(letter, written(letter, writer, jitter, hand)));
      expect(results).toEqual([true, true, true, true, true, true]);
    });
  }

  it('still says Not quite to a writing that is clearly the twin: a ן drawn long, half a letter below the line, on the ו card, and a plain ו standing on the line on the ן card', () => {
    for (const jitter of [0.004, 0.012]) {
      for (let writer = 0; writer < WRITERS.length; writer += 1) {
        expect(verdictOn('ו', written('ן', writer, jitter, {})), `ן hand ${writer} jitter ${jitter} on the ו card`).toBe(false);
        expect(verdictOn('ן', written('ו', writer, jitter, {})), `ו hand ${writer} jitter ${jitter} on the ן card`).toBe(false);
      }
    }
  });
});

describe('the wide sweep of a vav and a final nun on the pad (mw-5r3p30.976)', () => {
  // each letter, on both cards: its foot from 0.5 letter heights above the line to 0.75 below it, scale 0.6 to 1.4, turned -10, 0, 10, in the 3 hands
  const pad = frameOfPad(256)!;
  const SHIFTS = Array.from({ length: 13 }, (_, i) => Math.round((-0.5 + 0.1 * i) * 100) / 100).concat([0.75]);
  const SCALES = [0.6, 0.8, 1, 1.25, 1.4];
  const TURNS = [-10, 0, 10];
  interface Cell { scale: number; shiftY: number; own: number; twin: number; inside: boolean }
  const sweep = (letter: string, other: string): Cell[] => {
    const cells: Cell[] = [];
    for (const scale of SCALES) {
      for (const shiftY of SHIFTS) {
        const cell: Cell = { scale, shiftY, own: 0, twin: 0, inside: true };
        for (const rotate of TURNS) {
          for (let writer = 0; writer < WRITERS.length; writer += 1) {
            const strokes = onPad(writing(letter, WRITERS[writer], { rotate, jitter: 0.008 }), pad, 320, { scale, shiftY });
            const ys = strokes.flat().map((p) => p.y);
            if (Math.min(...ys) < 0 || Math.max(...ys) > 256) cell.inside = false;
            if (recognize(strokes, letter, { script: 'hbo', ...pad }).match) cell.own += 1;
            if (recognize(strokes, other, { script: 'hbo', ...pad }).match) cell.twin += 1;
          }
        }
        cells.push(cell);
      }
    }
    return cells;
  };
  for (const [letter, other] of [['ו', 'ן'], ['ן', 'ו']]) {
    it(`never tells a ${letter} written anywhere inside the pad Not quite on its own card; its ${other} twin, where Right on the ${letter} card, is listed`, () => {
      const cells = sweep(letter, other);
      const show = (pick: (c: Cell) => number): string =>
        SCALES.map((scale) => `scale ${scale}: ` + cells.filter((c) => c.scale === scale).map((c) => `${c.shiftY >= 0 ? '+' : ''}${c.shiftY.toFixed(2)}:${pick(c)}${c.inside ? '' : '*'}`).join(' ')).join('\n');
      console.info(`a ${letter} written at each foot (letter heights below the line) and scale, 9 writings a cell, * the ink leaves the pad\nRight on the ${letter} card (its own):\n${show((c) => c.own)}\nRight on the ${other} card (its twin's, the price):\n${show((c) => c.twin)}`);
      const cellsFalse = cells.filter((c) => c.inside && c.own < 9);
      expect(cellsFalse.map((c) => `scale ${c.scale} foot ${c.shiftY}: ${c.own} of 9 Right`)).toEqual([]);
    });
  }
});

describe('the other checks that judge by place on the pad (mw-5r3p30.976)', () => {
  // recognizer.ts byCase is the only one: a small and a capital Greek letter of one shape (ο Ο, ι Ι, ρ Ρ) told by size and place when the pad gives a capHeight and a baseline. Write it gives them to a Hebrew
  // card only (WriteIt.tsx check), so a hand that ignores the line on a Greek card is never told Not quite; framed, it would be (the same sweep as the vav's), which no pad asks of it today.
  const pad = frameOfPad(256)!;
  it('leaves a Greek letter written anywhere on the pad Right on its own card, as the Greek card asks with no frame', () => {
    for (const letter of ['ο', 'Ο', 'ι', 'Ι', 'ρ', 'Ρ']) {
      for (const hand of [{}, { scale: 0.7, shiftY: 0.3 }, { scale: 1.4 }, { shiftY: -0.4 }, { shiftY: 0.5 }]) {
        expect(recognize(onPad(writing(letter, WRITERS[0]), pad, 320, hand), letter).match, `${letter} ${JSON.stringify(hand)}`).toBe(true);
      }
    }
  });
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
