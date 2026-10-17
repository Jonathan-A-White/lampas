// @vitest-environment jsdom
// Write it teaches the form (mw-86e9r1.56): the model's strokes are in the order and direction a good hand writes the letter, each stroke carries a
// numbered start point and a direction cue that stay after the drawing animation, and a plain line says how many strokes.
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { GlyphStrokes, StrokeLine } from '../../src/handwriting/GlyphStrokes';
import { strokeLineOf } from '../../src/handwriting/writeText';
import { GLYPHS, LETTERS, STROKE_NOTES, type Variant } from '../../src/handwriting/templates';

afterEach(cleanup);

/** Where on the letter a stroke starts, as a fraction of the letter's own box (x from the left, y from the top). */
function startOf(letter: string, stroke = 0): { x: number; y: number } {
  const variant: Variant = GLYPHS[letter][0];
  const points = variant.flat();
  const [xs, ys] = [points.map((p) => p[0]), points.map((p) => p[1])];
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const first = variant[stroke][0];
  return { x: (first[0] - minX) / (maxX - minX || 1), y: (first[1] - minY) / (maxY - minY || 1) };
}

/** How many strokes each letter is taught with, and where the first one starts: at the top of the letter or at its left. */
const TAUGHT: Readonly<Record<string, readonly [number, 'top' | 'left']>> = {
  α: [1, 'top'], β: [1, 'left'], γ: [2, 'top'], δ: [1, 'top'], ε: [1, 'top'], ς: [1, 'top'], ζ: [1, 'top'], η: [2, 'top'],
  θ: [2, 'top'], ι: [1, 'top'], κ: [3, 'top'], λ: [2, 'top'], μ: [2, 'top'], ν: [1, 'top'], ξ: [1, 'top'], ο: [1, 'top'],
  π: [3, 'top'], ρ: [1, 'left'], σ: [1, 'top'], τ: [2, 'top'], υ: [1, 'top'], φ: [2, 'top'], χ: [2, 'top'], ψ: [2, 'top'], ω: [1, 'top'],
  Α: [2, 'left'], Β: [3, 'top'], Γ: [2, 'top'], Δ: [1, 'top'], Ε: [2, 'top'], Ζ: [1, 'top'], Η: [3, 'top'], Θ: [2, 'top'],
  Ι: [1, 'top'], Κ: [3, 'top'], Λ: [1, 'left'], Μ: [1, 'left'], Ν: [1, 'left'], Ξ: [3, 'top'], Ο: [1, 'top'], Π: [3, 'top'],
  Ρ: [2, 'top'], Σ: [1, 'top'], Τ: [2, 'top'], Υ: [2, 'top'], Φ: [2, 'top'], Χ: [2, 'top'], Ψ: [2, 'top'], Ω: [1, 'left'],
};
const NEAR = 0.34;

/** The turning of a stroke, by the area it sweeps (screen y runs down, so a positive sum is clockwise to the eye). */
const clockwise = (stroke: readonly (readonly [number, number])[]): boolean => {
  let sum = 0;
  for (let i = 1; i < stroke.length; i += 1) sum += (stroke[i][0] - stroke[i - 1][0]) * (stroke[i][1] + stroke[i - 1][1]);
  return sum < 0;
};

describe('the order a good hand writes each letter', () => {
  it('lists all 49 letters, small, final sigma and capital', () => {
    expect(Object.keys(TAUGHT).sort()).toEqual([...LETTERS].sort());
    expect(LETTERS).toHaveLength(49);
  });

  it('shows each letter with the number of strokes it is taught with, the first starting at the top or the left of it', () => {
    const wrong: string[] = [];
    for (const letter of LETTERS) {
      const [count, where] = TAUGHT[letter];
      const variant = GLYPHS[letter][0];
      if (variant.length !== count) wrong.push(`${letter}: ${variant.length} strokes, taught with ${count}`);
      const { x, y } = startOf(letter);
      if ((where === 'top' ? y : x) > NEAR) wrong.push(`${letter}: the first stroke starts at (${x.toFixed(2)}, ${y.toFixed(2)}), not at the ${where}`);
    }
    expect(wrong).toEqual([]);
  });

  it('writes a round letter the way a hand does, anticlockwise from the top (omicron, theta, phi and their capitals)', () => {
    for (const letter of ['ο', 'Ο', 'Θ', 'θ']) expect(clockwise(GLYPHS[letter][0][0]), letter).toBe(false);
    for (const letter of ['φ', 'Φ']) expect(clockwise(GLYPHS[letter][0][1]), letter).toBe(false);
  });

  it('writes an upright from the top down and a bar from the left to the right', () => {
    const wrong: string[] = [];
    for (const letter of LETTERS) {
      GLYPHS[letter][0].forEach((stroke, i) => {
        const [a, b] = [stroke[0], stroke[stroke.length - 1]];
        const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
        if (Math.abs(dx) < 0.1 && Math.abs(dy) > 0.3 && dy < 0 && i > 0) wrong.push(`${letter}: stroke ${i + 1} goes up`);
        if (Math.abs(dy) < 0.1 && Math.abs(dx) > 0.3 && dx < 0) wrong.push(`${letter}: stroke ${i + 1} goes right to left`);
      });
    }
    expect(wrong).toEqual([]);
  });

  it('has a note for each stroke of a letter with more than one, in the order it is drawn', () => {
    for (const letter of LETTERS) {
      const count = GLYPHS[letter][0].length;
      if (count > 1) expect(STROKE_NOTES[letter], `${letter} has ${count} strokes and no notes`).toHaveLength(count);
      else expect(STROKE_NOTES[letter], letter).toBeUndefined();
    }
  });
});

describe('GlyphStrokes numbers the strokes and shows which way the pen goes', () => {
  it('draws one numbered start marker per stroke, 1..n, at the first point of the stroke, for all 49 letters', () => {
    for (const letter of LETTERS) {
      const { container, unmount } = render(<GlyphStrokes letter={letter} />);
      const variant = GLYPHS[letter][0];
      const markers = [...container.querySelectorAll('[data-start-marker]')];
      expect(markers, letter).toHaveLength(variant.length);
      markers.forEach((marker, i) => {
        expect(marker.getAttribute('data-start-marker'), letter).toBe(String(i + 1));
        expect(marker.querySelector('text')?.textContent, letter).toBe(String(i + 1));
        const dot = marker.querySelector('circle')!;
        expect(Number(dot.getAttribute('cx')), `${letter} ${i + 1}`).toBeCloseTo(variant[i][0][0], 2);
        expect(Number(dot.getAttribute('cy')), `${letter} ${i + 1}`).toBeCloseTo(variant[i][0][1], 2);
        const text = marker.querySelector('text')!;
        expect(Number(text.getAttribute('x'))).toBeCloseTo(variant[i][0][0], 2);
      });
      unmount();
    }
  });

  it.each(['α', 'β', 'κ', 'ξ'])('puts the markers of %s on the first point of each stroke, numbered in order', (letter) => {
    const { container } = render(<GlyphStrokes letter={letter} animate />);
    const variant = GLYPHS[letter][0];
    const markers = [...container.querySelectorAll('[data-start-marker]')];
    expect(markers.map((m) => m.querySelector('text')?.textContent)).toEqual(variant.map((_, i) => String(i + 1)));
    markers.forEach((m, i) => {
      const dot = m.querySelector('circle')!;
      expect([Number(dot.getAttribute('cx')), Number(dot.getAttribute('cy'))].map((n) => Math.round(n * 100))).toEqual(variant[i][0].map((n) => Math.round(n * 100)));
    });
  });

  it('has a direction cue for every stroke, naming the stroke, whether it animates or not', () => {
    for (const animate of [true, false]) {
      for (const letter of ['α', 'κ', 'Β', 'π']) {
        const { container, unmount } = render(<GlyphStrokes letter={letter} animate={animate} />);
        const cues = [...container.querySelectorAll('[data-direction]')];
        expect(cues.map((c) => c.getAttribute('data-direction'))).toEqual(GLYPHS[letter][0].map((_, i) => String(i + 1)));
        unmount();
      }
    }
  });

  it('points the cue the way the stroke runs', () => {
    // a plain stem that runs down: the cue is turned to point down (90 degrees)
    const { container } = render(<GlyphStrokes letter="Ι" />);
    expect(container.querySelector('[data-direction="1"]')?.getAttribute('transform')).toMatch(/rotate\(9\d(\.\d+)?\)|rotate\(90\)/);
  });

  it('still draws the markers and the cues with animate off, and their number does not depend on the faint model', () => {
    for (const faint of [true, false]) {
      const { container, unmount } = render(<GlyphStrokes letter="κ" faint={faint} />);
      expect(container.querySelectorAll('[data-start-marker]')).toHaveLength(3);
      expect(container.querySelectorAll('[data-direction]')).toHaveLength(3);
      expect(container.querySelector('svg')?.getAttribute('data-animate')).toBeNull();
      unmount();
    }
  });
});

describe('the plain line under the model says how many strokes', () => {
  it('says Two strokes with what each is for a letter with two, and One stroke for a letter with one', () => {
    render(<StrokeLine letter="π" />);
    expect(screen.getByTestId('write-stroke-line').textContent).toMatch(/^Three strokes: the top bar first, then the left leg, then the right leg\.$/);
    cleanup();
    render(<StrokeLine letter="τ" />);
    expect(screen.getByTestId('write-stroke-line').textContent).toMatch(/^Two strokes: the top bar first, then the stem\.$/);
    cleanup();
    render(<StrokeLine letter="ο" />);
    expect(screen.getByTestId('write-stroke-line').textContent).toMatch(/^One stroke/);
  });

  it('reads aloud to a screen reader: it is plain text, not hidden', () => {
    const { container } = render(<StrokeLine letter="τ" />);
    const line = screen.getByTestId('write-stroke-line');
    expect(line.closest('[aria-hidden="true"]')).toBeNull();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('has a line for every letter that counts its strokes and numbers them', () => {
    for (const letter of LETTERS) {
      const count = GLYPHS[letter][0].length;
      expect(strokeLineOf(letter), letter).toMatch(count === 1 ? /^One stroke/ : new RegExp(`^${['', '', 'Two', 'Three', 'Four'][count]} strokes`));
    }
  });
});
