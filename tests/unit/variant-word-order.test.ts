// tests/unit/variant-word-order.test.ts — a unit whose other reading is the same Greek words in another order (Matthew 3:4 αὐτοῦ ἦν / ἦν αὐτοῦ, 'his was' / 'was his') does not
// change the English (mw-9ji6ek0.31): the 'english' filter hides it, 'all' shows it, and its sheet says 'Word order only: emphasis, not meaning'.
import { cleanup, render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Chapter, VariantUnit } from '../../src/data/chapter';
import { wordOrderOnly, wordOrderOnlyUnit } from '../../src/data/variantVerse';
import { chosenUnits } from '../../src/reader/chosenReading';
import { NA } from '../../src/reader/readingSets';
import { VariantSheet, WORD_ORDER_ONLY } from '../../src/reader/VariantSheet';
import { shownUnits } from '../../src/reader/variants';

afterEach(cleanup);

const mat3: Chapter = JSON.parse(readFileSync('public/data/mat/3.json', 'utf8'));
const unit34 = (): VariantUnit => mat3.variants!.find((u) => u.v === 4 && u.base === 'αὐτοῦ ἦν')!;

describe('wordOrderOnly', () => {
  it('is true for the same words in another order, and not for other words, a word more or a word fewer', () => {
    expect(wordOrderOnly('αὐτοῦ ἦν', 'ἦν αὐτοῦ')).toBe(true);
    expect(wordOrderOnly('ὁ Ἰησοῦς', 'Ἰησοῦς ὁ')).toBe(true);
    expect(wordOrderOnly('αὐτοῦ ἦν', 'αὐτοῦ ἦν')).toBe(false);
    expect(wordOrderOnly('αὐτοῦ ἦν', 'ἦν αὐτῶν')).toBe(false);
    expect(wordOrderOnly('αὐτοῦ ἦν', 'ἦν αὐτοῦ καὶ')).toBe(false);
    expect(wordOrderOnly('ἦν', '')).toBe(false);
    expect(wordOrderOnly('ἦν', 'ἦν')).toBe(false);
  });
});

describe('Matthew 3:4, αὐτοῦ ἦν / ἦν αὐτοῦ', () => {
  it('the committed unit is the one reported: his was / was his, NA', () => {
    const u = unit34();
    expect(u.english).toMatchObject({ base: 'his was', alts: ['was his'] });
    expect(u.witness).toBe('na');
    expect(wordOrderOnlyUnit(u)).toBe(true);
  });

  it("is sameEnglish, so 'Those that change the English' hides it and 'All' shows it", () => {
    const u = unit34();
    const verses = mat3.verses;
    expect(shownUnits([u], { english: 'english', witnesses: 'ecm' }, verses)).toEqual([]);
    const [all] = shownUnits([u], { english: 'all', witnesses: 'ecm' }, verses);
    expect(all.unit).toBe(u);
    expect(all.readings.map((r) => r.sameEnglish)).toEqual([true]);
  });

  it('is sameEnglish with no verse to compare in, too', () => {
    expect(shownUnits([unit34()], { english: 'english', witnesses: 'ecm' })).toEqual([]);
  });

  it('read in place under NA it keeps the MSB’s English words', () => {
    const [chosen] = chosenUnits({ code: mat3.code, chapter: mat3.chapter, variants: [unit34()], verses: mat3.verses }, NA);
    expect(chosen.sameEnglish).toBe(true);
  });

  it("its sheet says 'Word order only: emphasis, not meaning' above Ask the tutor", () => {
    const [shown] = shownUnits([unit34()], { english: 'all', witnesses: 'ecm' }, mat3.verses);
    render(createElement(VariantSheet, { shown, reference: 'Matthew 3:4', onClose: () => {}, onAsk: () => {} }));
    const line = document.querySelector('[data-word-order-only]');
    expect(WORD_ORDER_ONLY).toBe('Word order only: emphasis, not meaning');
    expect(line?.textContent).toBe(WORD_ORDER_ONLY);
    const ask = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Ask the tutor')!;
    expect(line!.compareDocumentPosition(ask) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('a unit that changes the words has no such line', () => {
    const u: VariantUnit = { ...unit34(), alts: [{ code: 'N', text: 'ἦν αὐτῶν' }] };
    const [shown] = shownUnits([u], { english: 'all', witnesses: 'ecm' });
    render(createElement(VariantSheet, { shown, reference: 'Matthew 3:4', onClose: () => {} }));
    expect(document.querySelector('[data-word-order-only]')).toBeNull();
  });
});

// Romans 8:38 δυνάμεις οὔτε ἐνεστῶτα οὔτε μέλλοντα / ἐνεστῶτα οὔτε μέλλοντα οὔτε δυνάμεις: the same words in another order, but the MSB's own footnote gives other English
// ('neither angels nor principalities…'), so it counts as changing the English (mw-9ji6ek0.42).
describe('Romans 8:38, word order only with the MSB footnote’s own English', () => {
  const rom8: Chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8'));
  const unit = (): VariantUnit => rom8.variants!.find((u) => u.v === 38 && u.base === 'δυνάμεις οὔτε ἐνεστῶτα οὔτε μέλλοντα')!;

  it('is shown under Those that change the English, its reading not sameEnglish', () => {
    const u = unit();
    expect(wordOrderOnly(u.base, u.alts[0].text)).toBe(true);
    const [shown] = shownUnits([u], { english: 'english', witnesses: 'ecm' }, rom8.verses);
    expect(shown.unit).toBe(u);
    expect(shown.readings.map((r) => r.sameEnglish)).toEqual([false]);
  });

  it('read in place under NA it is not sameEnglish: the MSB’s English follows the reading', () => {
    const [chosen] = chosenUnits({ code: rom8.code, chapter: rom8.chapter, variants: [unit()], verses: rom8.verses }, NA);
    expect(chosen.sameEnglish).toBe(false);
  });

  it('its sheet has no Word order only line', () => {
    const [shown] = shownUnits([unit()], { english: 'all', witnesses: 'ecm' }, rom8.verses);
    render(createElement(VariantSheet, { shown, reference: 'Romans 8:38', verse: rom8.verses.find((v) => v.n === 38), onClose: () => {}, onAsk: () => {} }));
    expect(document.querySelector('[data-word-order-only]')).toBeNull();
  });

  it('yesterday’s cached chapter (changesEnglish false, the same shape) still reads: the Reader judges the reading itself', () => {
    const cached: VariantUnit = { ...unit(), changesEnglish: false };
    const [shown] = shownUnits([cached], { english: 'english', witnesses: 'ecm' }, rom8.verses);
    expect(shown.readings).toHaveLength(1);
  });
});
