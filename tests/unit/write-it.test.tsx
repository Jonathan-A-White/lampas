// tests/unit/write-it.test.tsx — Write it (mw-86e9r1.51): how a letter moves through trace, copy and from memory; where the letter drill mixes Write it
// in; the pad's palm rejection (a touch during or after a pen stroke never draws); and the watch that keeps 'pen seen'.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { drawRound, startLetterDrill, withWriting, ROUND_SIZE, WRITE_PER_ROUND } from '../../src/data/grammar/letterDrill';
import { mulberry32 } from '../../src/data/random';
import { watchForPen } from '../../src/handwriting/penWatch';
import { FIRST_PROGRESS, RIGHTS_TO_MOVE, afterWrite, isWrittenFromMemory, parseProgress, progressLine, type WriteProgress } from '../../src/handwriting/progression';
import { recognize, type InkStroke } from '../../src/handwriting/recognizer';
import { GLYPHS, LETTERS, type Point, type Variant } from '../../src/handwriting/templates';
import { WritingPad } from '../../src/handwriting/WritingPad';
import { WRITERS, padOf, writing } from '../support/handwriting';

afterEach(cleanup);

// The model Write it draws is the FIRST variant of a letter's templates (GlyphStrokes.tsx), so it must be a letter as a pen writes it (mw-86e9r1.55): no jump
// inside a stroke, and a second stroke that begins on the first. The Governor saw alpha as a C bowl and a separate slash with a gap between them.
const dist = (a: Point, b: Point): number => Math.hypot(a[0] - b[0], a[1] - b[1]);
/** No two consecutive points of a stroke are further apart than this (design units: a capital is 1 high). */
const MAX_JUMP = 0.15;
/** A stroke after the first starts within this of a point of an earlier stroke. */
const TOUCH = 0.08;

/** Every place a variant's drawing breaks: a jump inside a stroke, or a later stroke that starts away from the strokes before it. */
function breaks(variant: Variant): { jumps: string[]; apart: number[] } {
  const jumps: string[] = [];
  variant.forEach((stroke, i) => {
    for (let k = 1; k < stroke.length; k += 1) {
      const d = dist(stroke[k - 1], stroke[k]);
      if (d > MAX_JUMP) jumps.push(`stroke ${i} jumps ${d.toFixed(2)} at point ${k}`);
    }
  });
  const apart: number[] = [];
  for (let i = 1; i < variant.length; i += 1) {
    const before = variant.slice(0, i).flat();
    if (!before.some((p) => dist(p, variant[i][0]) <= TOUCH)) apart.push(i);
  }
  return { jumps, apart };
}

/** The letters whose first variant has a stroke that starts away from the others, each with why a pen does that. Nothing else may. */
const SEPARATE_STROKES: Readonly<Record<string, string>> = {
  χ: 'two diagonals that cross: the second is drawn from its own top corner through the first',
  Χ: 'two diagonals that cross: the second is drawn from its own top corner through the first',
  ψ: 'the stem is a line of its own that the cup is drawn across',
  Ψ: 'the stem is a line of its own that the cup is drawn across',
  Η: 'two upright legs: the right leg is lifted to and drawn from its own top, across the end of the bar',
  Ξ: 'three separate bars, as printed: the middle and the bottom bar are lifted to',
};

describe('the model strokes Write it draws (the first variant of every letter)', () => {
  it('holds all 49 letters: the 24 small, the final sigma and the 24 capitals', () => {
    expect(LETTERS).toHaveLength(49);
    expect(LETTERS).toContain('ς');
    expect(LETTERS.filter((l) => l !== 'ς' && l === l.toUpperCase())).toHaveLength(24);
  });

  it('has no jump inside any stroke, and every later stroke starts on an earlier one, except the letters named with a reason', () => {
    const problems: string[] = [];
    for (const letter of LETTERS) {
      const { jumps, apart } = breaks(GLYPHS[letter][0]);
      problems.push(...jumps.map((j) => `${letter}: ${j}`));
      if (apart.length > 0 && !(letter in SEPARATE_STROKES)) problems.push(`${letter}: stroke ${apart.join(', ')} starts away from the strokes before it (the gap Write it showed on alpha)`);
    }
    expect(problems).toEqual([]);
  });

  it('keeps the list of separate strokes short, and every letter on it really has one', () => {
    expect(Object.keys(SEPARATE_STROKES).length).toBeLessThanOrEqual(8);
    for (const [letter, why] of Object.entries(SEPARATE_STROKES)) {
      expect(why.length, letter).toBeGreaterThan(10);
      expect(breaks(GLYPHS[letter][0]).apart, `${letter} is on the list but no longer has a separate stroke: take it off`).not.toEqual([]);
    }
  });

  it('catches the gap the Governor saw: a C bowl and a slash that starts away from its end', () => {
    const bowl: Point[] = [[0.47, 0.89], [0.4, 0.95]];
    const slash: Point[] = [[0.58, 0.5], [0.6, 0.78], [0.72, 0.98]];
    expect(breaks([bowl, slash]).apart).toEqual([1]);
    expect(breaks([[[0, 0], [0.4, 0]]]).jumps).toHaveLength(1);
  });

  it('draws small alpha as one joined stroke whose tail leaves the bowl at the bowl\'s end', () => {
    const alpha = GLYPHS['α'][0];
    // one pen movement, or two strokes that touch
    expect(alpha.length === 1 || breaks(alpha).apart.length === 0).toBe(true);
    expect(breaks(alpha).jumps).toEqual([]);
    const points = alpha.flat();
    // the bowl is there (it reaches the left, the top and the bottom of the body) ...
    expect(Math.min(...points.map((p) => p[0]))).toBeLessThan(0.1);
    expect(Math.min(...points.map((p) => p[1]))).toBeLessThan(0.55);
    expect(Math.max(...points.map((p) => p[1]))).toBeGreaterThan(0.98);
    // ... and the stroke ends in the tail, out to the lower right of it, every point of the way joined to the last
    const end = alpha[alpha.length - 1].at(-1)!;
    expect(end[0]).toBeGreaterThan(0.65);
    expect(end[1]).toBeGreaterThan(0.95);
    for (let i = 1; i < alpha.length; i += 1) expect(alpha[i].some((p) => dist(p, alpha[i - 1].at(-1)!) <= TOUCH) || alpha[i - 1].some((p) => dist(p, alpha[i][0]) <= TOUCH)).toBe(true);
  });
});

describe('the checker over the redrawn templates', () => {
  const ink = (letter: string, variant: number): InkStroke[] => writing(letter, { ...WRITERS[0], variant }, {});

  it('accepts every variant of every one of the 49 letters, drawn as written', () => {
    const refused: string[] = [];
    for (const letter of LETTERS) {
      GLYPHS[letter].forEach((_, variant) => {
        if (!recognize(ink(letter, variant), letter, padOf()).match) refused.push(`${letter} variant ${variant}`);
      });
    }
    expect(refused).toEqual([]);
  });

  it('still turns down a different letter: alpha and delta, nu and upsilon, rho and omicron, each both ways', () => {
    const mistaken: string[] = [];
    for (const [a, b] of [['α', 'δ'], ['ν', 'υ'], ['ρ', 'ο']]) {
      for (const [written, asked] of [[a, b], [b, a]]) {
        GLYPHS[written].forEach((_, variant) => {
          const result = recognize(ink(written, variant), asked, padOf());
          if (result.match || result.closest !== written) mistaken.push(`${written} variant ${variant} asked as ${asked}: match ${result.match}, closest ${result.closest}`);
        });
      }
    }
    expect(mistaken).toEqual([]);
  });
});

describe('the progression of a letter', () => {
  it('moves on after two rights at a stage, trace to copy to from memory', () => {
    expect(RIGHTS_TO_MOVE).toBe(2);
    let p: WriteProgress = FIRST_PROGRESS;
    p = afterWrite(p, true);
    expect(p).toEqual({ stage: 'trace', rights: 1 });
    p = afterWrite(p, true);
    expect(p).toEqual({ stage: 'copy', rights: 0 });
    p = afterWrite(afterWrite(p, true), true);
    expect(p).toEqual({ stage: 'memory', rights: 0 });
    expect(isWrittenFromMemory(p)).toBe(false);
    p = afterWrite(afterWrite(p, true), true);
    expect(p).toEqual({ stage: 'memory', rights: 2 });
    expect(isWrittenFromMemory(p)).toBe(true);
    expect(progressLine(p)).toBe('Written from memory');
  });

  it('never takes a right away or a stage back on a miss', () => {
    const p = { stage: 'copy', rights: 1 } as const;
    expect(afterWrite(p, false)).toEqual(p);
    expect(afterWrite(afterWrite(afterWrite(p, false), false), true)).toEqual({ stage: 'memory', rights: 0 });
  });

  it('reads anything kept that is not a progress as the first one', () => {
    for (const bad of [null, 3, 'trace', { stage: 'paint', rights: 1 }, { stage: 'copy', rights: -1 }, { stage: 'copy', rights: 1.5 }]) {
      expect(parseProgress(bad)).toEqual(FIRST_PROGRESS);
    }
    expect(parseProgress({ stage: 'copy', rights: 1 })).toEqual({ stage: 'copy', rights: 1 });
    expect(progressLine({ stage: 'trace', rights: 1 })).toBe('Trace: 1 of 2 right');
  });
});

describe('Write it in the letter drill', () => {
  const round = drawRound(startLetterDrill(), mulberry32(7));

  it('adds nothing with handwriting off', () => {
    expect(withWriting(round, false).map((s) => s.kind)).toEqual(Array(ROUND_SIZE).fill('choice'));
  });

  it('adds a Write it after every third question, on the letter that question asked, two at most', () => {
    const steps = withWriting(round, true);
    expect(steps).toHaveLength(ROUND_SIZE + WRITE_PER_ROUND);
    expect(steps.map((s) => s.kind)).toEqual(['choice', 'choice', 'choice', 'write', 'choice', 'choice', 'choice', 'write', 'choice', 'choice']);
    expect(steps[3]).toEqual({ kind: 'write', letter: round[2].target.letter });
    expect(steps[7]).toEqual({ kind: 'write', letter: round[5].target.letter });
    // the round's questions are the same ones, in the same order
    expect(steps.flatMap((s) => (s.kind === 'choice' ? [s.item] : []))).toEqual(round);
  });
});

/** A pad that keeps its strokes, as the card does. */
function Pad({ onStart }: { onStart?: () => void }) {
  const [strokes, setStrokes] = useState<InkStroke[]>([]);
  return <WritingPad strokes={strokes} onChange={setStrokes} onStart={onStart} label="Write it here" />;
}

const pad = () => screen.getByTestId('writing-pad');
const ev = (pointerId: number, pointerType: string, x: number, y: number) => ({ pointerId, pointerType, isPrimary: pointerId === 1, button: 0, buttons: 1, clientX: x, clientY: y });

function stroke(pointerId: number, type: string, from: [number, number], to: [number, number]): void {
  fireEvent.pointerDown(pad(), ev(pointerId, type, ...from));
  fireEvent.pointerMove(pad(), ev(pointerId, type, (from[0] + to[0]) / 2, (from[1] + to[1]) / 2));
  fireEvent.pointerMove(pad(), ev(pointerId, type, ...to));
  fireEvent.pointerUp(pad(), { ...ev(pointerId, type, ...to), buttons: 0 });
}

describe('the writing pad', () => {
  it('takes a finger and a pen, one stroke from down to up, and says when the first stroke starts', () => {
    const onStart = vi.fn();
    render(<Pad onStart={onStart} />);
    stroke(1, 'touch', [10, 10], [50, 50]);
    expect(pad()).toHaveAttribute('data-strokes', '1');
    expect(onStart).toHaveBeenCalledTimes(1);
    stroke(2, 'pen', [60, 10], [60, 80]);
    expect(pad()).toHaveAttribute('data-strokes', '2');
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('ignores a palm: a touch while the pen writes draws nothing', () => {
    render(<Pad />);
    fireEvent.pointerDown(pad(), ev(1, 'pen', 10, 10));
    fireEvent.pointerDown(pad(), ev(2, 'touch', 200, 200));
    fireEvent.pointerMove(pad(), ev(2, 'touch', 220, 220));
    fireEvent.pointerMove(pad(), ev(1, 'pen', 40, 40));
    fireEvent.pointerUp(pad(), { ...ev(2, 'touch', 220, 220), buttons: 0 });
    fireEvent.pointerUp(pad(), { ...ev(1, 'pen', 40, 40), buttons: 0 });
    expect(pad()).toHaveAttribute('data-strokes', '1');
    expect(pad().querySelectorAll('[data-ink]')).toHaveLength(1);
  });

  it('ignores a palm that rests between pen strokes, and drops a touch stroke the pen interrupts', () => {
    render(<Pad />);
    // the hand lands first and starts to drag
    fireEvent.pointerDown(pad(), ev(5, 'touch', 200, 200));
    fireEvent.pointerMove(pad(), ev(5, 'touch', 210, 210));
    // then the pen comes: the hand's stroke is not writing
    stroke(1, 'pen', [10, 10], [40, 40]);
    fireEvent.pointerUp(pad(), { ...ev(5, 'touch', 210, 210), buttons: 0 });
    expect(pad()).toHaveAttribute('data-strokes', '1');
    // between strokes the hand moves on the screen
    stroke(6, 'touch', [150, 150], [190, 190]);
    expect(pad()).toHaveAttribute('data-strokes', '1');
    stroke(1, 'pen', [50, 10], [50, 60]);
    expect(pad()).toHaveAttribute('data-strokes', '2');
  });

  it('ignores a second finger', () => {
    render(<Pad />);
    fireEvent.pointerDown(pad(), ev(1, 'touch', 10, 10));
    stroke(2, 'touch', [100, 100], [150, 150]);
    fireEvent.pointerMove(pad(), ev(1, 'touch', 30, 30));
    fireEvent.pointerUp(pad(), { ...ev(1, 'touch', 30, 30), buttons: 0 });
    expect(pad()).toHaveAttribute('data-strokes', '1');
  });
});

describe('the pen watch', () => {
  it('keeps pen seen at the first pen anywhere, and nothing for a finger or a mouse', async () => {
    const seen = vi.fn(() => Promise.resolve());
    const stop = watchForPen(seen);
    fireEvent.pointerDown(document.body, { pointerType: 'touch' });
    fireEvent.pointerDown(document.body, { pointerType: 'mouse' });
    expect(seen).not.toHaveBeenCalled();
    fireEvent.pointerDown(document.body, { pointerType: 'pen' });
    fireEvent.pointerDown(document.body, { pointerType: 'pen' });
    expect(seen).toHaveBeenCalledTimes(1);
    stop();
  });
});
