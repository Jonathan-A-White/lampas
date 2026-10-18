// The English font (Settings > Appearance > Font, mw-5r3p30.311): the list, that a choice persists and sets the English font variable only, and that
// the bundled faces are declared, licensed, credited and precached. Where the face is drawn (English text changes, Greek does not) is
// tests/e2e/fonts.spec.ts, because jsdom has no built CSS.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { injectManifestOptions } from '../../pwa-precache';
import { applyFont, restoreAppearance, startAppearanceSync } from '../../src/appearance/appearanceSync';
import { DEFAULT_FONT, ENGLISH_FONT_VAR, FONTS, isFont, stackOf } from '../../src/appearance/fonts';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { fontSetting } from '../../src/settings/definitions';
import { SETTINGS, writeSetting } from '../../src/settings/registry';
import { getSetting } from '../../src/settings/store';

const root = document.documentElement;
const english = () => root.style.getPropertyValue(ENGLISH_FONT_VAR);
const settle = () => new Promise((r) => setTimeout(r, 20));

beforeEach(async () => {
  clearBus();
  await db.open();
  await db.settings.clear();
  localStorage.clear();
  root.removeAttribute('style');
});
afterAll(() => db.close());

describe('the English fonts', () => {
  it("are the phone's own (the default), Literata, Atkinson Hyperlegible and Lexend", () => {
    expect(FONTS.map((f) => f.label)).toEqual(["The phone's own", 'Literata', 'Atkinson Hyperlegible', 'Lexend']);
    expect(DEFAULT_FONT).toBe('phone');
    expect(isFont('literata')).toBe(true);
    expect(isFont('comic-sans')).toBe(false);
    expect(stackOf('phone')).toBeNull();
  });

  it('each have one plain line that says who it suits', () => {
    const suits = { phone: /everyone/, literata: /serif/, atkinson: /low vision.*(older|eyes)|eyes|older/, lexend: /younger/ };
    for (const f of FONTS) {
      expect(f.line.length, f.id).toBeLessThanOrEqual(100);
      expect(f.line, f.id).toMatch(suits[f.id]);
      expect(f.line, f.id).toMatch(/suit|fits/);
    }
    expect(FONTS.find((f) => f.id === 'literata')?.line).toMatch(/^A book face for long reading/);
    expect(FONTS.find((f) => f.id === 'atkinson')?.line).toMatch(/^Very clear, made for low vision/);
    expect(FONTS.find((f) => f.id === 'lexend')?.line).toMatch(/^Built for reading ease/);
  });

  it('are none of them a novelty: every named face is serif or plain sans, with a generic fallback', () => {
    for (const f of FONTS.filter((x) => x.stack)) expect(f.stack, f.id).toMatch(/(serif|sans-serif)$/);
  });
});

describe('the Font setting', () => {
  it('is in the registry under Appearance, default the phone’s own, with the four choices', () => {
    const entry = SETTINGS.find((s) => s.key === 'font');
    expect(entry?.section).toBe('appearance');
    expect(entry?.label).toBe('Font');
    expect(entry?.allowed).toEqual({ kind: 'choice', values: FONTS.map((f) => ({ value: f.id, label: f.label })) });
    expect(fontSetting.default).toBe('phone');
  });

  it('persists a choice, and a value that is not a font reads back as the default', async () => {
    expect(await getSetting(fontSetting)).toBe('phone');
    await writeSetting('font', 'lexend');
    expect(await getSetting(fontSetting)).toBe('lexend');
    await db.settings.put({ key: 'font', value: 'papyrus' });
    expect(await getSetting(fontSetting)).toBe('phone');
  });

  it('sets the English font variable only: not the Greek, the Hebrew, the size or the theme', async () => {
    const stop = startAppearanceSync();
    try {
      await settle();
      root.style.setProperty('--lp-scale', '1.3');
      root.dataset.theme = 'sepia';
      await writeSetting('font', 'atkinson');
      expect(english()).toBe(stackOf('atkinson'));
      expect(english()).toContain('Atkinson Hyperlegible');
      expect(Array.from({ length: root.style.length }, (_, i) => root.style.item(i)).sort()).toEqual([ENGLISH_FONT_VAR, '--lp-scale'].sort());
      expect(root.style.getPropertyValue('--lp-scale')).toBe('1.3');
      expect(root.dataset.theme).toBe('sepia');
      await writeSetting('font', 'phone');
      expect(english()).toBe('');
    } finally {
      stop();
    }
  });

  it('is kept in localStorage too, so restoreAppearance paints it before the first render', () => {
    applyFont('literata');
    expect(localStorage.getItem('lampas.font')).toBe('literata');
    root.style.removeProperty(ENGLISH_FONT_VAR);
    restoreAppearance();
    expect(english()).toBe(stackOf('literata'));
    localStorage.setItem('lampas.font', 'nonsense');
    restoreAppearance();
    expect(english()).toBe('');
  });

  it('is loaded from the settings store at start', async () => {
    await db.settings.put({ key: 'font', value: 'lexend' });
    const stop = startAppearanceSync();
    try {
      await settle();
      expect(english()).toBe(stackOf('lexend'));
    } finally {
      stop();
    }
  });
});

describe('the bundled English faces', () => {
  const css = readFileSync('src/index.css', 'utf8');
  const bundled = readdirSync('src/fonts').filter((f) => /^(literata|atkinson-hyperlegible|lexend)-.*\.woff2$/.test(f));

  it('are three families at 400 and 700, each declared in index.css with its file present', () => {
    expect(bundled).toHaveLength(6);
    for (const file of bundled) {
      expect(css, file).toContain(`url("./fonts/${file}")`);
      expect(existsSync(`src/fonts/${file}`), file).toBe(true);
    }
    for (const family of ['Literata', 'Atkinson Hyperlegible', 'Lexend']) expect(css).toContain(`font-family: "${family}";`);
  });

  it('each have their OFL licence beside them and a credit in ATTRIBUTION.md', () => {
    const credits = readFileSync('ATTRIBUTION.md', 'utf8');
    for (const [name, licence] of [['Literata', 'OFL-literata.txt'], ['Atkinson Hyperlegible', 'OFL-atkinson-hyperlegible.txt'], ['Lexend', 'OFL-lexend.txt']]) {
      expect(readFileSync(`src/fonts/${licence}`, 'utf8'), licence).toMatch(/SIL Open Font License/);
      expect(credits, name).toContain(`**[${name}]`);
      expect(credits, name).toContain(`src/fonts/${licence}`);
    }
  });

  it('are precached: the worker precaches every woff2 the stylesheet names', () => {
    expect(injectManifestOptions.globPatterns.some((g) => g.includes('woff2'))).toBe(true);
    // a woff2 that index.css does not name is not emitted into dist/ and so is not precached
    for (const file of readdirSync('src/fonts').filter((f) => f.endsWith('.woff2'))) expect(css, file).toContain(`/${file}`);
  });

  it('never set a size: the font setting leaves --lp-scale and the size variables alone', () => {
    expect(css).not.toMatch(/--lp-font-english:\s*[^;]*font-size/);
  });
});
