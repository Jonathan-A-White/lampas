// tests/unit/handwriting.test.ts — the on-device Greek handwriting checker (mw-86e9r1.50, src/handwriting/).
// The writings are synthesised (tests/support/handwriting.ts), not recorded: three hands per letter, then each hand scaled,
// rotated, jittered and drawn backwards. A recorded set from the pen itself is the next thing to check this against.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { mulberry32 } from '../../src/data/random';
import { LETTERS, GLYPHS } from '../../src/handwriting/templates';
import { caseTwins, recognize, type InkStroke } from '../../src/handwriting/recognizer';
import { WRITERS, padOf, writing, type Distortion } from '../support/handwriting';

const SMALL = 'αβγδεζηθικλμνξοπρστυφχψω';
const CAPITALS = SMALL.toUpperCase();

const DISTORTIONS: readonly [string, Distortion][] = [
  ['as written', {}],
  ['small', { scale: 0.4 }],
  ['large', { scale: 2.5 }],
  ['turned 15° one way', { rotate: 15 }],
  ['turned 15° the other way', { rotate: -15 }],
  ['jittered', { jitter: 0.015 }],
  ['jittered and turned', { jitter: 0.012, rotate: 10 }],
  ['drawn backwards', { reverse: true }],
];

function ink(letter: string, writer = 0, distortion: Distortion = {}): InkStroke[] {
  return writing(letter, WRITERS[writer], distortion);
}


describe('the templates', () => {
  it('cover all 24 small and 24 capital letters and the final sigma, each in NFC Greek', () => {
    expect([...LETTERS].sort()).toEqual([...(SMALL + 'ς' + CAPITALS)].sort());
    for (const letter of LETTERS) {
      expect(letter).toBe(letter.normalize('NFC'));
      expect(letter).toMatch(/^\p{Script=Greek}$/u);
    }
  });

  it('hold two or more ways of writing every letter, one stroke and several', () => {
    for (const letter of LETTERS) {
      expect(GLYPHS[letter].length, letter).toBeGreaterThanOrEqual(2);
    }
    const counts = new Set(Object.values(GLYPHS).flatMap((variants) => variants.map((variant) => variant.length)));
    expect(counts.has(1)).toBe(true);
    expect(counts.has(2)).toBe(true);
  });
});

describe('a writing of a letter', () => {
  for (const [name, distortion] of DISTORTIONS) {
    it(`is recognised as that letter, ${name}`, () => {
      const misses: string[] = [];
      for (const letter of LETTERS) {
        for (let writer = 0; writer < WRITERS.length; writer += 1) {
          const result = recognize(ink(letter, writer, distortion), letter, padOf(distortion));
          if (!result.match || result.closest !== letter) {
            misses.push(`${letter} (hand ${writer}) -> ${result.closest} ${result.score.toFixed(2)}`);
          }
        }
      }
      expect(misses).toEqual([]);
    });
  }

  it('is recognised from the strokes alone too, where only the case of a same-shaped pair is open', () => {
    for (const letter of LETTERS) {
      for (let writer = 0; writer < WRITERS.length; writer += 1) {
        const result = recognize(ink(letter, writer), letter);
        expect(result.match, `${letter} hand ${writer}`).toBe(true);
        expect([letter, ...caseTwins(letter)], `${letter} hand ${writer}`).toContain(result.closest);
      }
    }
  });

  it('does not depend on the order or direction of the strokes', () => {
    for (const letter of LETTERS) {
      const forwards = ink(letter, 0);
      const backwards = [...forwards].reverse().map((stroke) => [...stroke].reverse());
      const a = recognize(forwards, letter, padOf());
      const b = recognize(backwards, letter, padOf());
      expect(b.match, letter).toBe(true);
      expect(b.score, letter).toBeCloseTo(a.score, 1);
    }
  });
});

describe('the classic confusables', () => {
  const PAIRS = [
    'νυ', 'ος', 'ζξ', 'ες', 'ρφ', 'κχ', // the six the story names, small
    'ΝΥ', 'ΟΣ', 'ΖΞ', 'ΕΣ', 'ΡΦ', 'ΚΧ', // and capital
    'ΑΛ', 'ΓΤ', 'ΒΡ', 'ΗΝ', 'ΟΘ', 'ΕΞ', 'ΑΔ', 'ΠΤ', 'ΙΤ', 'ΩΨ',
    'σς', 'βρ', 'γχ', 'μν', 'ηπ', 'ωυ', 'θο', 'δσ',
  ];
  for (const pair of PAIRS) {
    const [a, b] = [...pair];
    it(`${a} and ${b} are told apart, both ways, in every hand and distortion`, () => {
      const failures: string[] = [];
      for (const [from, to] of [
        [a, b],
        [b, a],
      ]) {
        for (const [name, distortion] of DISTORTIONS) {
          for (let writer = 0; writer < WRITERS.length; writer += 1) {
            const result = recognize(ink(from, writer, distortion), to, padOf(distortion));
            if (result.match || result.closest !== from) {
              failures.push(`${from} (hand ${writer}, ${name}) read as ${result.closest} asked for ${to}, match ${result.match}`);
            }
          }
        }
      }
      expect(failures).toEqual([]);
    });
  }
});

describe('which strokes were off', () => {
  it('names nothing off in a good writing', () => {
    for (const letter of LETTERS) {
      const result = recognize(ink(letter, 0), letter, padOf());
      expect(result.offStrokes, letter).toEqual([]);
      expect(result.missing, letter).toBe(false);
    }
  });

  it('names what is off when a letter is written for another: a nu asked as upsilon lacks the round bottom, an epsilon asked as final sigma lacks its tail', () => {
    for (const [written, asked] of [
      ['ν', 'υ'],
      ['ε', 'ς'],
      ['ς', 'ε'],
    ]) {
      for (let writer = 0; writer < WRITERS.length; writer += 1) {
        const strokes = ink(written, writer);
        const result = recognize(strokes, asked, padOf());
        expect(result.match, `${written} as ${asked} hand ${writer}`).toBe(false);
        expect(result.closest, `${written} as ${asked} hand ${writer}`).toBe(written);
        expect(result.missing || result.offStrokes.length > 0, `${written} as ${asked} hand ${writer}`).toBe(true);
        for (const index of result.offStrokes) expect(index).toBeLessThan(strokes.length);
      }
    }
  });

  it('names the bar of a sigma as the stroke that does not belong in an omicron', () => {
    const result = recognize(ink('σ', 1), 'ο', padOf());
    expect(result.match).toBe(false);
    expect(result.closest).toBe('σ');
    expect(result.offStrokes.length).toBeGreaterThan(0);
  });

  it('counts a stroke by its place in what was handed over', () => {
    const strokes = ink('Α', 0);
    // a stray line inside the letter, below the bar, written first
    const stray: InkStroke = [
      { x: 275, y: 476, t: 1 },
      { x: 300, y: 476, t: 20 },
      { x: 325, y: 476, t: 40 },
    ];
    const result = recognize([stray, ...strokes], 'Α', padOf());
    expect(result.offStrokes).toContain(0);
    expect(result.offStrokes).not.toContain(1);
    expect(result.offStrokes).not.toContain(2);
    expect(result.offStrokes).not.toContain(3);
  });
});

describe('what it does with ink that is not a letter', () => {
  it('says no to nothing, to a tap and to a letter it has no template for', () => {
    for (const strokes of [[], [[]], [[{ x: 5, y: 5, t: 0 }]], [[{ x: 5, y: 5, t: 0 }, { x: 5, y: 5, t: 9 }]]]) {
      const result = recognize(strokes, 'α');
      expect(result.match).toBe(false);
      expect(result.score).toBe(0);
    }
    expect(recognize(ink('α'), 'a').match).toBe(false);
    expect(recognize(ink('α'), 'a').closest).toBe('α');
  });

  it('ignores a stray speck beside a letter', () => {
    const speck: InkStroke = [
      { x: 500, y: 500, t: 5000 },
      { x: 503, y: 501, t: 5010 },
    ];
    const result = recognize([...ink('β', 0), speck], 'β', padOf());
    expect(result.match).toBe(true);
  });

  it('gives a higher score to a neater writing than to a rough one', () => {
    const neat = recognize(ink('ω', 0), 'ω', padOf());
    const rough = recognize(ink('ω', 0, { jitter: 0.05 }), 'ω', padOf());
    expect(neat.score).toBeGreaterThan(rough.score);
    expect(neat.score).toBeGreaterThan(0.5);
    expect(neat.score).toBeLessThanOrEqual(1);
  });
});

describe('the case of a letter whose small and capital shapes are the same', () => {
  it('is told by the size when the pad says how tall a capital is', () => {
    expect(caseTwins('ο')).toContain('Ο');
    expect(caseTwins('Ο')).toContain('ο');
    const { capHeight } = padOf();
    const small = ink('ο', 0);
    expect(recognize(small, 'ο', { capHeight }).match).toBe(true);
    expect(recognize(small, 'Ο', { capHeight }).match).toBe(false);
    expect(recognize(small, 'Ο', { capHeight }).caseChecked).toBe(true);
    const big = ink('Ο', 0);
    expect(recognize(big, 'Ο', { capHeight }).match).toBe(true);
    expect(recognize(big, 'ο', { capHeight }).match).toBe(false);
  });

  it('is told by where it sits on the line when the pad gives the line too: the stem of ρ goes below it, that of Ρ stops on it', () => {
    expect(caseTwins('ρ')).toContain('Ρ');
    expect(caseTwins('χ')).toContain('Χ');
    const pad = padOf();
    for (const [letter, other] of [
      ['ρ', 'Ρ'],
      ['Ρ', 'ρ'],
      ['χ', 'Χ'],
      ['Χ', 'χ'],
      ['ο', 'Ο'],
      ['Ι', 'ι'],
    ]) {
      for (let writer = 0; writer < WRITERS.length; writer += 1) {
        const strokes = ink(letter, writer);
        expect(recognize(strokes, letter, pad).match, `${letter} hand ${writer}`).toBe(true);
        const wrong = recognize(strokes, other, pad);
        expect(wrong.match, `${letter} asked as ${other} hand ${writer}`).toBe(false);
        expect(wrong.closest).toBe(letter);
        expect(wrong.caseChecked).toBe(true);
      }
    }
  });

  it('is left open when the pad says nothing of size: either case matches', () => {
    const small = ink('ο', 0);
    expect(recognize(small, 'Ο').match).toBe(true);
    expect(recognize(small, 'Ο').caseChecked).toBe(false);
    expect(recognize(small, 'ο').match).toBe(true);
    expect(recognize(small, 'ο').caseChecked).toBe(false);
  });
});

describe('ink that is not the letter asked for', () => {
  it('is turned down for every other letter, in every hand', () => {
    const wrongOnes: string[] = [];
    LETTERS.forEach((letter, index) => {
      const asked = LETTERS[(index + 7) % LETTERS.length];
      for (let writer = 0; writer < WRITERS.length; writer += 1) {
        if (recognize(ink(letter, writer), asked, padOf()).match) wrongOnes.push(`${letter} accepted as ${asked}`);
      }
    });
    expect(wrongOnes).toEqual([]);
  });

  it('is almost never taken for a letter when it is a scribble', () => {
    const random = mulberry32(5);
    let accepted = 0;
    for (let k = 0; k < 200; k += 1) {
      const scribble = Array.from({ length: 1 + Math.floor(random() * 3) }, () => {
        let x = random() * 200;
        let y = random() * 200;
        let t = 0;
        return Array.from({ length: 20 + Math.floor(random() * 30) }, () => {
          x += (random() - 0.5) * 60;
          y += (random() - 0.5) * 60;
          t += 10;
          return { x, y, t };
        });
      });
      if (recognize(scribble, LETTERS[k % LETTERS.length]).match) accepted += 1;
    }
    expect(accepted).toBeLessThanOrEqual(4);
  });
});

describe('speed and the network', () => {
  it('checks one letter in well under 50 ms: the quicker quarter of 40 checks under 10 ms, so a phone five times slower still has room', () => {
    const strokes = ink('ξ', 1);
    recognize(strokes, 'ξ'); // warm up
    const times: number[] = [];
    for (let i = 0; i < 40; i += 1) {
      const start = performance.now();
      recognize(strokes, 'ξ', padOf());
      times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    expect(times[Math.floor(times.length / 4)]).toBeLessThan(10);
  });

  it('builds its templates and answers the first letter of a session in under 50 ms on this box too', async () => {
    vi.resetModules();
    const fresh = await import('../../src/handwriting/recognizer');
    const strokes = ink('ζ', 0);
    const start = performance.now();
    const result = fresh.recognize(strokes, 'ζ', padOf());
    expect(performance.now() - start).toBeLessThan(50);
    expect(result.match).toBe(true);
  });

  it('never touches the network and imports nothing but itself', () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    try {
      recognize(ink('λ', 0), 'λ');
    } finally {
      vi.unstubAllGlobals();
    }
    expect(fetch).not.toHaveBeenCalled();
    for (const file of ['recognizer.ts', 'templates.ts']) {
      const source = readFileSync(`src/handwriting/${file}`, 'utf8');
      expect(source, file).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|navigator\.onLine/);
      for (const line of source.split('\n').filter((l) => /^import\b/.test(l))) {
        expect(line, `${file}: ${line}`).toMatch(/from '\.\/(recognizer|templates)'/);
      }
    }
  });
});
