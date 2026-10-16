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
  it('are Phone (the default), Light, Dark and Sepia', () => {
    expect(THEMES.map((t) => t.id)).toEqual(['phone', 'light', 'dark', 'sepia']);
    expect(THEMES.find((t) => t.id === 'sepia')?.label).toBe('Sepia');
  });

  it("follow the phone's scheme only for Phone", () => {
    expect(paletteOf('phone', true)).toBe('dark');
    expect(paletteOf('phone', false)).toBe('light');
    expect(paletteOf('dark', false)).toBe('dark');
    expect(paletteOf('light', true)).toBe('light');
    expect(paletteOf('sepia', true)).toBe('sepia');
    expect(paletteOf('sepia', false)).toBe('sepia');
  });

  it("have a browser bar colour that is the palette's canvas, and dark's is the manifest's", () => {
    expect(THEME_COLORS.dark).toBe(THEME_COLOR);
    expect(variablesOf(':root {')).toContain(`--lp-canvas: ${THEME_COLORS.dark};`);
    expect(variablesOf(':root[data-theme="light"]')).toContain(`--lp-canvas: ${THEME_COLORS.light};`);
    expect(variablesOf(':root[data-theme="sepia"]')).toContain(`--lp-canvas: ${THEME_COLORS.sepia};`);
  });

  it('write the light palette the same way into it from the phone as from the choice', () => {
    const chosen = variablesOf(':root[data-theme="light"]');
    expect(chosen).toHaveLength(9);
    expect(variablesOf(':root:not([data-theme="dark"])')).toEqual(chosen);
  });

  it('give the dark and sepia palettes every variable the light one has', () => {
    const names = (lines: string[]) => lines.map((l) => l.split(':')[0]).sort();
    expect(names(variablesOf(':root {'))).toEqual(names(variablesOf(':root[data-theme="light"]')));
    expect(names(variablesOf(':root[data-theme="sepia"]'))).toEqual(names(variablesOf(':root[data-theme="light"]')));
  });
});

/** WCAG 2's relative luminance of a #rrggbb colour. */
const luminance = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** WCAG 2's contrast ratio of two #rrggbb colours, 1 to 21. */
const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/** The colour of `--lp-<name>` in the block that opens with `selector`. */
const colourOf = (selector: string, name: string): string => {
  const line = variablesOf(selector).find((l) => l.startsWith(`--lp-${name}:`));
  const hex = line?.match(/#[0-9a-f]{6}/i)?.[0];
  expect(hex, `${selector} --lp-${name}`).toBeDefined();
  return hex!;
};

describe('the Sepia palette', () => {
  const sepia = ':root[data-theme="sepia"]';
  const canvas = colourOf(sepia, 'canvas');
  const surface = colourOf(sepia, 'surface');

  it('is warm paper with dark brown text', () => {
    expect(canvas).toBe('#f4ecd8');
    expect(colourOf(sepia, 'fg')).toBe('#3b2f20');
  });

  it('gives body text at least 7:1 (WCAG AAA) on the page and on a card', () => {
    expect(contrast(colourOf(sepia, 'fg'), canvas)).toBeGreaterThanOrEqual(7);
    expect(contrast(colourOf(sepia, 'fg'), surface)).toBeGreaterThanOrEqual(7);
  });

  it('gives the verse numbers (the muted colour) at least 4.5:1, dimmer than the text', () => {
    const muted = colourOf(sepia, 'muted');
    expect(contrast(muted, canvas)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(muted, surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(muted, canvas)).toBeLessThan(contrast(colourOf(sepia, 'fg'), canvas));
  });

  it('keeps the Greek of the weave (the accent) and the text on an accent button readable', () => {
    const accent = colourOf(sepia, 'accent');
    expect(contrast(accent, canvas)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colourOf(sepia, 'accent-fg'), accent)).toBeGreaterThanOrEqual(4.5);
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
