import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The place line (src/PlaceLine.tsx, .place-line in src/index.css) is 12 px text, so WCAG AA asks 4.5:1 of it (mw-5r3p30.477). It is muted colour at an
// opacity over the page, so its contrast is the blend's against the page. The colour and opacity are read from the CSS, the page of each theme from its block.
const css = readFileSync('src/index.css', 'utf8');

const blockOf = (selector: string): string => {
  const start = css.indexOf(selector);
  expect(start, selector).toBeGreaterThan(-1);
  return css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
};
const variable = (block: string, name: string): string => {
  const match = block.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`));
  expect(match, name).not.toBeNull();
  return match![1];
};

const rgb = (hex: string): number[] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const channel = (v: number): number => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = (c: number[]): number => 0.2126 * channel(c[0]) + 0.7152 * channel(c[1]) + 0.0722 * channel(c[2]);
const ratio = (a: number[], b: number[]): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const line = blockOf('.place-line {');
const opacity = Number(line.match(/opacity:\s*([\d.]+)/)?.[1]);

/** Contrast of the line's text (the theme's muted colour at the line's opacity) over `page`. */
const contrastOn = (muted: string, page: string): number => {
  const fg = rgb(muted);
  const bg = rgb(page);
  const blended = fg.map((v, i) => opacity * v + (1 - opacity) * bg[i]);
  return ratio(blended, bg);
};

describe('the place line', () => {
  it('is muted colour from the theme, dimmed by an opacity below 1', () => {
    expect(line).toMatch(/color:\s*var\(--lp-muted/);
    expect(opacity).toBeGreaterThan(0);
    expect(opacity).toBeLessThan(1);
  });

  const AA = 4.5;
  const themes: Array<[string, string, string]> = [
    ['light', ':root[data-theme="light"]', variable(blockOf(':root[data-theme="light"]'), '--lp-canvas')],
    ['dark, in the Immersive reader (pure black)', ':root {', '#000000'],
    ['dark, with Turn pages (the dark canvas)', ':root {', variable(blockOf(':root {'), '--lp-canvas')],
    ['sepia', ':root[data-theme="sepia"]', variable(blockOf(':root[data-theme="sepia"]'), '--lp-canvas')],
    ['high contrast', ':root[data-theme="contrast"]', variable(blockOf(':root[data-theme="contrast"]'), '--lp-canvas')],
  ];
  for (const [name, selector, page] of themes) {
    it(`reads at ${AA}:1 or more in ${name}`, () => {
      expect(contrastOn(variable(blockOf(selector), '--lp-muted'), page)).toBeGreaterThanOrEqual(AA);
    });
  }

  it('is the pure black the dark Immersive reader sets behind it', () => {
    expect(blockOf(":root[data-theme='dark']:has([data-reader][data-immersive='on'])")).toMatch(/--lp-canvas:\s*#000;/);
  });
});
