// tests/unit/chosen-reading.test.ts — a reading laid into the text in place (mw-9ji6ek0.24, src/reader/chosenReading.ts): which units a reading set reads other than the text's own,
// and how VerseText draws them (the Greek view, the weave, the English; an omission; the brace with the text's own under RP; Variants Off) and the variant sheet's 'Read this'.
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import type { Chapter, VariantUnit, Verse } from '../../src/data/chapter';
import { weaveVerse, wovenInOrder } from '../../src/data/weave';
import { chosenUnits, edgeMarks } from '../../src/reader/chosenReading';
import { BASE, BYZANTINE, NA, unitKey, type ReadingSet } from '../../src/reader/readingSets';
import { VariantSheet } from '../../src/reader/VariantSheet';
import { VerseText } from '../../src/reader/VerseText';
import { braceReadings, readerVariants, shownUnits } from '../../src/reader/variants';
import type { ReaderView } from '../../src/data/repositories';
import type { Lookup } from '../../src/WordSheet';

afterEach(cleanup);

const rev3 = JSON.parse(readFileSync('public/data/rev/3.json', 'utf8')) as Chapter;
const verse = (n: number): Verse => rev3.verses.find((v) => v.n === n) as Verse;
const unitAt = (v: number, base: string): VariantUnit => rev3.variants!.find((u) => u.v === v && u.base === base) as VariantUnit;
/** Rev 3:2 'ἔμελλες ἀποβάλλειν': B ἠμελλες, B ἐμέλλον ἀποθάνειν, N ἔμελλον ἀποθανεῖν ('I was about to die') */
const dying = unitAt(2, 'ἔμελλες ἀποβάλλειν');
/** Rev 3:7 'αὐτήν εἰ μὴ ὁ ἀνοίγων': B and N 'καὶ κλείων' ('(and shutting)' in the MSB's parentheses) */
const shutting = unitAt(7, 'αὐτήν εἰ μὴ ὁ ἀνοίγων');
/** Rev 3:7 'τοῦ': N leaves it out */
const the = unitAt(7, 'τοῦ');

const mine = (...picks: [VariantUnit, number][]): ReadingSet => ({
  id: 'mine',
  name: 'Mine',
  choices: Object.fromEntries(picks.map(([u, i]) => [unitKey(rev3, u, rev3.variants!), i])),
});
const NA_DIES = mine([dying, 2]);

function draw(n: number, view: ReaderView, set: ReadingSet | null, opts: { on?: boolean; woven?: ReturnType<typeof wovenInOrder> | null; looks?: Lookup[] } = {}) {
  const chosen = set ? chosenUnits(rev3, set).filter((c) => c.unit.v === n) : [];
  const variants = opts.on === false ? undefined : readerVariants(rev3, { variants: 'all', witnesses: 'ecm', set }).byVerse?.get(n);
  return render(createElement(VerseText, { verse: verse(n), view, woven: opts.woven ?? null, onLook: (l: Lookup) => opts.looks?.push(l), chosen, variants }));
}

/** The text of a verse without its braces: the words as they read in the text. */
function inText(container: HTMLElement): string {
  const copy = container.cloneNode(true) as HTMLElement;
  copy.querySelectorAll('[data-brace]').forEach((b) => b.remove());
  return (copy.querySelector('[data-text]')!.textContent ?? '').replace(/\s+/g, ' ');
}

describe('chosenUnits: the units a set reads other than the text’s own', () => {
  it('Byzantine reads none; NA reads the NA alternative of each unit that has one; Mine reads what it chose', () => {
    expect(chosenUnits(rev3, BYZANTINE)).toEqual([]);
    const na = chosenUnits(rev3, NA).filter((c) => c.unit.v === 2);
    expect(na.map((c) => [c.unit.base, c.alt.text])).toContainEqual(['ἔμελλες ἀποβάλλειν', 'ἔμελλον ἀποθανεῖν']);
    const [one] = chosenUnits(rev3, NA_DIES);
    expect(one).toMatchObject({ index: 2, english: 'I was about to die', sameEnglish: false, omitted: false });
    expect(one.alt.text).toBe('ἔμελλον ἀποθανεῖν');
  });

  it('a unit whose choice is the text’s own (BASE) is not chosen, and an `apart` reading is never laid in', () => {
    expect(chosenUnits(rev3, mine([dying, BASE]))).toEqual([]);
    const apart: VariantUnit = { ...dying, alts: [{ code: 'N', text: 'ὁ μὲν... ὁ δὲ', apart: true }] };
    const chapter = { ...rev3, variants: [apart] };
    expect(chosenUnits(chapter, { id: 'mine', name: 'Mine', choices: { [unitKey(rev3, apart, [apart])]: 0 } })).toEqual([]);
  });

  it('marks an omission', () => {
    const [left] = chosenUnits(rev3, mine([the, 0]));
    expect(left).toMatchObject({ omitted: true, english: '' });
  });

  it('keeps the edge marks of the chunks it replaces', () => {
    expect(edgeMarks('(except', 'opens)')).toEqual({ lead: '(', trail: ')' });
    expect(edgeMarks('is about', 'to die;')).toEqual({ lead: '', trail: ';' });
    expect(edgeMarks('“Wake', 'up,”')).toEqual({ lead: '“', trail: ',”' });
  });
});

describe('the Greek view', () => {
  it('lays the reading’s words in place of the unit’s, marked data-chosen, each a Tap that opens its card', () => {
    const looks: Lookup[] = [];
    const { container } = draw(2, 'greek', NA_DIES, { looks });
    const text = inText(container);
    expect(text).toContain('ἔμελλον ἀποθανεῖν');
    expect(text).not.toContain('ἔμελλες');
    expect(text).not.toContain('ἀποβάλλειν');
    const chosen = [...container.querySelectorAll('[data-chosen]')];
    expect(chosen.map((c) => c.textContent!.trim()).join(' ')).toContain('ἀποθανεῖν');
    expect(container.querySelectorAll('[data-variant]')).toHaveLength(1); // the other unit of the verse (στήρισον) is still dotted
    fireEvent.click(screen.getByText('ἀποθανεῖν'));
    expect(looks[0].words.map((w) => [w.t, w.l, w.s])).toEqual([['ἀποθανεῖν', 'ἀποθνήσκω', 'G599']]);
    expect(looks[0].variant).toBe('in variant NA');
  });

  it('the brace after the words holds the text’s own reading under RP, and not the reading in place', () => {
    const { container } = draw(2, 'greek', NA_DIES);
    const braces = [...container.querySelectorAll('[data-brace]')];
    const brace = braces.find((b) => b.textContent!.includes('RP'))!;
    const readings = [...brace.querySelectorAll('[data-brace-reading]')].map((r) => [r.querySelector('[data-brace-text]')!.textContent!.trim(), ...[...r.querySelectorAll('[data-witness]')].map((c) => c.textContent)]);
    expect(readings).toEqual([
      ['ἔμελλες ἀποβάλλειν', 'RP'],
      ['ἠμελλες ἀποβάλλειν', 'B'],
      ['ἐμέλλον ἀποθάνειν', 'B'],
    ]);
  });

  it('an omission leaves the words out and a small ⸆ in their place', () => {
    const { container } = draw(7, 'greek', mine([the, 0]));
    const text = inText(container);
    expect(text).not.toContain('τοῦ');
    expect(text).toContain('⸆');
    expect(container.querySelector('[data-chosen-omitted]')).not.toBeNull();
  });

  it('with the text’s own reading chosen, nothing changes and nothing is marked data-chosen', () => {
    const { container } = draw(2, 'greek', mine([dying, BASE]));
    expect(container.querySelectorAll('[data-chosen]')).toHaveLength(0);
    expect(inText(container)).toContain('ἔμελλες ἀποβάλλειν');
  });
});

describe('the English view', () => {
  it('draws the unit’s chunks as the reading’s English, the chunks’ edge marks kept', () => {
    const { container } = draw(2, 'english', NA_DIES);
    const text = inText(container);
    expect(text).toContain('which I was about to die; for');
    expect(text).not.toContain('is about');
    expect(container.querySelector('[data-chosen]')).not.toBeNull();
  });

  it('Revelation 3:7 reads (and shutting) where the text has (except Him who opens)', () => {
    const { container } = draw(7, 'english', mine([shutting, 1]));
    const text = inText(container);
    expect(text).toContain('can shut (and shutting) and no one');
    expect(text).not.toContain('except');
  });

  it('a reading whose English is the text’s own leaves the MSB’s words and marks them', () => {
    const that = unitAt(9, 'ὅτι');
    const set = mine([that, 0]);
    const chosen = chosenUnits(rev3, set).filter((c) => c.unit.v === 9);
    expect(chosen[0].sameEnglish).toBe(true);
    const { container } = render(createElement(VerseText, { verse: verse(9), view: 'english', woven: null, onLook: () => {}, chosen }));
    expect(container.querySelector('[data-chosen]')).not.toBeNull();
  });

  it('an omission leaves the English out and a ⸆ in its place', () => {
    const { container } = draw(7, 'english', mine([the, 0]));
    expect(inText(container)).toContain('⸆');
  });

  it('the brace holds the text’s own English under RP', () => {
    const { container } = draw(2, 'english', NA_DIES);
    const brace = [...container.querySelectorAll('[data-brace]')].find((b) => b.textContent!.includes('RP'))!;
    expect(brace.textContent).toContain('you were about to throw away');
    expect(brace.getAttribute('data-brace-lang')).toBe('english');
  });

  it('a Tap on a word of the reading in place opens the cards of the reading’s Greek', () => {
    const looks: Lookup[] = [];
    draw(2, 'english', NA_DIES, { looks });
    fireEvent.click(screen.getByText('die;'));
    expect(looks[0].words.map((w) => w.t)).toEqual(['ἔμελλον', 'ἀποθανεῖν']);
    expect(looks[0]).toMatchObject({ fromEnglish: true, tapped: 'die' });
  });
});

describe('the weave', () => {
  it('shows the reading’s Greek where the unit’s chunks are woven', () => {
    const v = verse(2);
    const woven = wovenInOrder(v, weaveVerse(v, { solid: new Set(v.g.map((w) => w.l)) }), 'english');
    const { container } = draw(2, 'english', NA_DIES, { woven });
    const text = inText(container);
    expect(text).toContain('ἔμελλον');
    expect(text).toContain('ἀποθανεῖν');
    expect(text).not.toContain('ἀποβάλλειν');
    expect(container.querySelector('[data-chosen]')).not.toBeNull();
  });
});

describe('Variants Off', () => {
  it('shows the reading in place with its mark and no brace', () => {
    const { container } = draw(2, 'greek', NA_DIES, { on: false });
    expect(inText(container)).toContain('ἔμελλον ἀποθανεῖν');
    expect(container.querySelector('[data-chosen]')).not.toBeNull();
    expect(container.querySelector('[data-brace]')).toBeNull();
    expect(container.querySelector('[data-variant]')).toBeNull();
  });
});

describe('readerVariants with a set', () => {
  it('carries the chosen units of each verse, shown or not, and marks the shown unit with the reading in place', () => {
    const off = readerVariants(rev3, { variants: 'off', witnesses: 'ecm', set: NA_DIES });
    expect(off.byVerse).toBeNull();
    expect(off.chosenByVerse.get(2)).toHaveLength(1);
    const on = readerVariants(rev3, { variants: 'english', witnesses: 'ecm', set: NA_DIES });
    expect(on.byVerse?.get(2)?.find((s) => s.unit === dying)?.chosen).toBe(2);
  });

  it('keeps a chosen unit the English filter would hide, so he can put the text’s reading back', () => {
    const that = unitAt(9, 'ὅτι');
    const set = mine([that, 0]);
    const on = readerVariants(rev3, { variants: 'english', witnesses: 'ecm', set });
    expect(on.byVerse?.get(9)?.some((s) => s.unit === that)).toBe(true);
  });

  it('braceReadings of a chosen unit leaves out the reading in place and adds the text’s own as RP', () => {
    const [shown] = shownUnits([dying], { english: 'all', witnesses: 'ecm' }, rev3.verses).map((s) => ({ ...s, chosen: 2 }));
    expect(braceReadings(shown, 'greek').map((r) => [r.text, r.chips])).toEqual([
      ['ἔμελλες ἀποβάλλειν', ['RP']],
      ['ἠμελλες ἀποβάλλειν', ['B']],
      ['ἐμέλλον ἀποθάνειν', ['B']],
    ]);
  });
});

describe('the variant sheet’s Read this', () => {
  const sheet = (chosen: number | undefined, onRead: (i: number) => void = () => {}) => {
    const [shown] = shownUnits([dying], { english: 'all', witnesses: 'ecm' }, rev3.verses);
    return render(createElement(VariantSheet, { shown: { ...shown, ...(chosen === undefined ? {} : { chosen }) }, verse: verse(2), reference: 'Revelation 3:2', onClose: () => {}, onLook: () => {}, onRead }));
  };

  it('puts Read this on each other reading, and not on the text’s own while it is the one in place', () => {
    sheet(undefined);
    expect(screen.getAllByRole('button', { name: 'Read this' })).toHaveLength(3);
    expect(screen.queryByText('Reading this')).toBeNull();
  });

  it('with a reading in place says Reading this on it (not a button) and offers Read this on the text’s own', () => {
    sheet(2);
    expect(screen.getByText('Reading this').tagName).not.toBe('BUTTON');
    expect(screen.getAllByRole('button', { name: 'Read this' })).toHaveLength(3); // the text's own and the two Byzantine alternatives
    const own = screen.getAllByText('The text reads')[0].closest('section')!;
    expect(within(own as HTMLElement).getByRole('button', { name: 'Read this' })).toBeTruthy();
  });

  it('a tap says which reading: its index among the unit’s alternatives, BASE for the text’s own', () => {
    const read: number[] = [];
    sheet(2, (i) => read.push(i));
    const own = screen.getAllByText('The text reads')[0].closest('section') as HTMLElement;
    fireEvent.click(within(own).getByRole('button', { name: 'Read this' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Read this' })[1]);
    expect(read).toEqual([BASE, 0]);
  });

  it('an apart reading has no Read this', () => {
    const apart: VariantUnit = { ...dying, alts: [{ code: 'N', text: 'ὁ μὲν... ὁ δὲ', apart: true }, dying.alts[2]], english: { ...dying.english, alts: ['the one…', 'I was about to die'] } };
    const [shown] = shownUnits([apart], { english: 'all', witnesses: 'ecm' }, rev3.verses);
    render(createElement(VariantSheet, { shown, verse: verse(2), reference: 'Revelation 3:2', onClose: () => {}, onRead: () => {} }));
    expect(screen.getAllByRole('button', { name: 'Read this' })).toHaveLength(1);
  });

  it('says in one line that read aloud, copy, Read check and the diagram keep the Byzantine words', () => {
    sheet(2);
    expect(screen.getByText(/Read aloud, copy, Read check and the diagram keep the Byzantine words/)).toBeTruthy();
  });

  it('has no Read this where the Reader gives it nothing to do', () => {
    const [shown] = shownUnits([dying], { english: 'all', witnesses: 'ecm' }, rev3.verses);
    render(createElement(VariantSheet, { shown, verse: verse(2), reference: 'Revelation 3:2', onClose: () => {} }));
    expect(screen.queryByRole('button', { name: 'Read this' })).toBeNull();
  });
});
