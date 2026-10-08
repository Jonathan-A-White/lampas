import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { THEME_COLORS, THEMES, paletteOf } from '../../src/appearance/themes';
import { TEXT_SIZES, normaliseTextPercent } from '../../src/appearance/textSizes';
import { THEME_COLOR } from '../../pwa-manifest';
import { DEFAULT_RATE, LANGUAGES, RATE_MAX, RATE_MIN, normaliseRate } from '../../src/speech/languages';

const css = readFileSync('src/index.css', 'utf8');
/** The `--lp-…: value;` lines of the block that opens with `selector`. */
const variablesOf = (selector: string): string[] => {
  const start = css.indexOf(selector);
  expect(start, selector).toBeGreaterThan(-1);
  const block = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  return block.split('\n').map((l) => l.trim()).filter((l) => /^--lp-(canvas|surface|line|fg|muted|accent|accent-fg|good|bad):/.test(l));
};

describe('the themes', () => {
  it('are Phone (the default), Light and Dark', () => {
    expect(THEMES.map((t) => t.id)).toEqual(['phone', 'light', 'dark']);
  });

  it("follow the phone's scheme only for Phone", () => {
    expect(paletteOf('phone', true)).toBe('dark');
    expect(paletteOf('phone', false)).toBe('light');
    expect(paletteOf('dark', false)).toBe('dark');
    expect(paletteOf('light', true)).toBe('light');
  });

  it("have a browser bar colour that is the palette's canvas, and dark's is the manifest's", () => {
    expect(THEME_COLORS.dark).toBe(THEME_COLOR);
    expect(variablesOf(':root {')).toContain(`--lp-canvas: ${THEME_COLORS.dark};`);
    expect(variablesOf(':root[data-theme="light"]')).toContain(`--lp-canvas: ${THEME_COLORS.light};`);
  });

  it('write the light palette the same way into it from the phone as from the choice', () => {
    const chosen = variablesOf(':root[data-theme="light"]');
    expect(chosen).toHaveLength(9);
    expect(variablesOf(':root:not([data-theme="dark"])')).toEqual(chosen);
  });

  it('give the dark palette every variable the light one has', () => {
    const names = (lines: string[]) => lines.map((l) => l.split(':')[0]).sort();
    expect(names(variablesOf(':root {'))).toEqual(names(variablesOf(':root[data-theme="light"]')));
  });
});

describe('the text sizes', () => {
  it('run from 85% to 160% with the phone own size (100%) between', () => {
    expect(TEXT_SIZES.map((t) => t.percent)).toEqual([85, 100, 130, 160]);
  });

  it('keep a saved size in range and fall back to 100 for nonsense', () => {
    expect(normaliseTextPercent(50)).toBe(85);
    expect(normaliseTextPercent(400)).toBe(160);
    expect(normaliseTextPercent(130)).toBe(130);
    expect(normaliseTextPercent('big')).toBe(100);
    expect(normaliseTextPercent(undefined)).toBe(100);
  });
});

describe('the speech rates', () => {
  it('belong to each language of the registry, 0.5 to 1.5, normal 1', () => {
    expect(LANGUAGES.map((l) => l.id)).toEqual(['english', 'greek']);
    expect([RATE_MIN, RATE_MAX, DEFAULT_RATE]).toEqual([0.5, 1.5, 1]);
  });

  it('keep a saved rate in range and 1 for nonsense', () => {
    expect(normaliseRate(0.1)).toBe(0.5);
    expect(normaliseRate(9)).toBe(1.5);
    expect(normaliseRate(0.7)).toBe(0.7);
    expect(normaliseRate('0.7')).toBe(0.7);
    expect(normaliseRate('')).toBe(1);
    expect(normaliseRate(null)).toBe(1);
    expect(normaliseRate(Number.NaN)).toBe(1);
  });
});
