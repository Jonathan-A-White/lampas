// The key to the marks of a variant brace (mw-9ji6ek0.43, src/reader/VariantKey.tsx): the quiet line under the Reader's first braces, put away for good by its ×, and the sheet one tap from a
// brace that says what each mark means. The samples take their look from variantEnglishClass (src/reader/englishSource.ts), so a later change of look changes the key.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import type { GreekWord, VariantUnit } from '../../src/data/chapter';
import { dismissVariantKey, getVariantKeyDismissed } from '../../src/data/repositories';
import { variantEnglishClass } from '../../src/reader/englishSource';
import { VariantBrace } from '../../src/reader/VariantBrace';
import { VariantKeyLine, VariantKeySheet, VariantKeyContext, KEY_LINK } from '../../src/reader/VariantKey';
import { shownUnits } from '../../src/reader/variants';

afterAll(() => db.close());
afterEach(cleanup);
beforeEach(async () => {
  window.location.hash = '';
  await db.open();
  await db.settings.clear();
});

const w = (t: string): GreekWord => ({ t, tr: '', s: 'G1', l: t, p: 'X' });
const unit = (source: 'msb' | 'lampas'): VariantUnit => ({
  v: 3,
  w: [1],
  base: 'ὑπὸ',
  alts: [{ code: 'N', text: 'διὰ', g: [w('διὰ')] }],
  english: { source, base: 'by', alts: ['through'] },
  changesEnglish: true,
  witness: 'na',
});
const sampleOf = (source: 'msb' | 'lampas') => screen.getByTestId(`variant-key-sample-${source}`);

describe('the samples of the key', () => {
  it('take the classes the text uses, so a change of look reaches the key', () => {
    render(createElement(VariantKeySheet, { onClose: () => {} }));
    const lampas = sampleOf('lampas');
    const msb = sampleOf('msb');
    expect(lampas.classList.contains(variantEnglishClass({ english: { source: 'lampas', base: '', alts: [] } }))).toBe(true);
    expect(msb.classList.contains(variantEnglishClass({ english: { source: 'msb', base: '', alts: [] } }))).toBe(true);
    expect(lampas.className).not.toBe(msb.className);
  });

  it('are drawn with the class a brace gives the English of each source', () => {
    for (const source of ['lampas', 'msb'] as const) {
      const shown = shownUnits([unit(source)], { english: 'all', witnesses: 'ecm' })[0];
      const { container, unmount } = render(createElement(VariantBrace, { shown, language: 'english' }));
      const text = container.querySelector('[data-brace-text]') as HTMLElement;
      render(createElement(VariantKeyLine, { onMore: () => {}, onDismiss: () => {} }));
      expect([...sampleOf(source).classList].filter((c) => text.classList.contains(c)).length).toBeGreaterThan(0);
      unmount();
      cleanup();
    }
  });
});

describe('the key line', () => {
  it('names each look and the witness letters, and has a way to put it away and a way to read more', () => {
    let more = 0;
    let away = 0;
    render(createElement(VariantKeyLine, { onMore: () => (more += 1), onDismiss: () => (away += 1) }));
    const note = screen.getByTestId('variant-key-line');
    expect(note.textContent).toMatch(/Lampas’s English/);
    expect(note.textContent).toMatch(/MSB’s footnote/);
    expect(note.textContent).toMatch(/NA/);
    expect(note.textContent).toMatch(/Greek text/);
    fireEvent.click(within(note).getByRole('button', { name: 'What the marks mean' }));
    fireEvent.click(within(note).getByRole('button', { name: 'Put the key away' }));
    expect([more, away]).toEqual([1, 1]);
  });
});

describe('putting the key away', () => {
  it('is kept: it is not shown again until the profile is new', async () => {
    expect(await getVariantKeyDismissed()).toBe(false);
    await dismissVariantKey();
    expect(await getVariantKeyDismissed()).toBe(true);
  });
});

describe('the sheet', () => {
  it('names every mark, and its link opens the lesson Where the English comes from', () => {
    render(createElement(VariantKeySheet, { onClose: () => {} }));
    const sheet = screen.getByRole('dialog', { name: 'What the marks in a brace mean' });
    for (const name of ['NA', 'B', 'ECM', 'RP']) expect(within(sheet).getByText(name, { selector: '[data-key-chip]' })).toBeTruthy();
    fireEvent.click(within(sheet).getByRole('button', { name: KEY_LINK }));
    expect(window.location.hash).toBe('#/lessons/variants/4');
  });
});

describe('a brace', () => {
  it('opens the key from its opening mark, in one tap, when the Reader gives it a way', () => {
    const shown = shownUnits([unit('lampas')], { english: 'all', witnesses: 'ecm' })[0];
    let opened = 0;
    render(createElement(VariantKeyContext.Provider, { value: () => (opened += 1) }, createElement(VariantBrace, { shown, language: 'english' })));
    fireEvent.click(screen.getByRole('button', { name: 'What the marks mean' }));
    expect(opened).toBe(1);
  });

  it('draws no such button where nothing can open the key (a card)', () => {
    const shown = shownUnits([unit('lampas')], { english: 'all', witnesses: 'ecm' })[0];
    render(createElement(VariantBrace, { shown, language: 'english' }));
    expect(screen.queryByRole('button', { name: 'What the marks mean' })).toBeNull();
  });
});
