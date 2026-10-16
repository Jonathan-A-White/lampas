// tests/unit/write-it.test.tsx — Write it (mw-86e9r1.51): how a letter moves through trace, copy and from memory; where the letter drill mixes Write it
// in; the pad's palm rejection (a touch during or after a pen stroke never draws); and the watch that keeps 'pen seen'.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { drawRound, startLetterDrill, withWriting, ROUND_SIZE, WRITE_PER_ROUND } from '../../src/data/grammar/letterDrill';
import { mulberry32 } from '../../src/data/random';
import { watchForPen } from '../../src/handwriting/penWatch';
import { FIRST_PROGRESS, RIGHTS_TO_MOVE, afterWrite, isWrittenFromMemory, parseProgress, progressLine, type WriteProgress } from '../../src/handwriting/progression';
import type { InkStroke } from '../../src/handwriting/recognizer';
import { WritingPad } from '../../src/handwriting/WritingPad';

afterEach(cleanup);

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
