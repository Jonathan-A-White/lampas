// How much of a table (mw-irpgqi.2): the one rule 'is this idea's level within the extent' (src/data/grammar/extent.ts), what each extent makes of a
// table's cells (src/data/paradigms/index.ts standingOf, isAvailable, availableCount, availableText), and the settings whose choices are extents
// (src/settings/definitions/grammarExtent.ts: the Weave's Grammar, New words at and How much of a table read one table of options).
import { describe, expect, it } from 'vitest';
import type { GrammarLevel } from '../../src/data/db';
import { DEFAULT_EXTENT, EXTENTS, EXTENT_LABELS, withinExtent, type GrammarExtent } from '../../src/data/grammar/extent';
import { formPasses, WEAVE_GRAMMARS } from '../../src/data/grammar/formLevel';
import { ALWAYS_NEEDED, ideasOf } from '../../src/data/grammar/ladder';
import { availableCount, availableText, cellName, cellsOf, isAvailable, paradigmById, standingOf, type Levels } from '../../src/data/paradigms';
import { EXTENT_SETTINGS, extentOf, paradigmExtentSetting } from '../../src/settings/definitions/grammarExtent';
import { SETTINGS } from '../../src/settings/registry';

const article = paradigmById('article')!;
const level = (level: 'solid' | 'frontier' | 'notYet') => ({ level });
/** AC 1's reader: the nominative solid, the genitive at the frontier, the dative not yet (and the accusative with no row at all). Every other idea of the article is solid. */
const READER: Levels = new Map([
  ['article', level('solid')],
  ['number-singular', level('solid')],
  ['number-plural', level('solid')],
  ['gender-masculine', level('solid')],
  ['gender-feminine', level('solid')],
  ['gender-neuter', level('solid')],
  ['case-nominative', level('solid')],
  ['case-genitive', level('frontier')],
  ['case-dative', level('notYet')],
]);
const cellNamed = (name: string) => {
  for (const row of article.rows) for (const [c, cell] of row.cells.entries()) if (cellName(article, row, c) === name) return cell;
  throw new Error(`no cell ${name}`);
};
const NOMINATIVE = cellNamed('Nominative Singular Masculine');
const GENITIVE = cellNamed('Genitive Singular Masculine');
const DATIVE = cellNamed('Dative Singular Masculine');
const ACCUSATIVE = cellNamed('Accusative Singular Masculine');

describe('the extents', () => {
  it('are three, most to least, Solid and frontier the default (today\'s rule), each with its label', () => {
    expect(EXTENTS).toEqual(['any', 'solid+frontier', 'solid']);
    expect(DEFAULT_EXTENT).toBe('solid+frontier');
    expect(EXTENT_LABELS).toEqual({ any: 'Any', 'solid+frontier': 'Solid and frontier', solid: 'Solid only' });
  });

  it('withinExtent: Any takes every level, Solid and frontier takes solid and frontier, Solid only takes solid; no row is not yet', () => {
    for (const l of ['solid', 'frontier', 'notYet', undefined] as const) expect(withinExtent(l, 'any'), String(l)).toBe(true);
    expect(withinExtent('solid', 'solid+frontier')).toBe(true);
    expect(withinExtent('frontier', 'solid+frontier')).toBe(true);
    expect(withinExtent('notYet', 'solid+frontier')).toBe(false);
    expect(withinExtent(undefined, 'solid+frontier')).toBe(false);
    expect(withinExtent('solid', 'solid')).toBe(true);
    expect(withinExtent('frontier', 'solid')).toBe(false);
    expect(withinExtent('notYet', 'solid')).toBe(false);
    expect(withinExtent(undefined, 'solid')).toBe(false);
  });

  it('is the rule the Weave reads too: formPasses agrees with withinExtent at every extent and level, and the Weave dial has the same three values', () => {
    expect([...WEAVE_GRAMMARS].sort()).toEqual([...EXTENTS].sort());
    const ideas = [...ideasOf('N-GSF'), ...ALWAYS_NEEDED];
    for (const extent of EXTENTS) {
      for (const l of ['solid', 'frontier', 'notYet'] as const) {
        const levels = new Map<string, GrammarLevel>(ideas.map((id) => [id, { id, level: l, since: 0, how: 'placement' }]));
        expect(formPasses('N-GSF', levels, extent), `${extent} ${l}`).toBe(withinExtent(l, extent));
      }
    }
  });
});

describe('what each extent makes of a table (AC 1: one idea solid, one frontier, one not yet)', () => {
  it('isAvailable keeps its meaning with no extent given: his to learn when every idea is solid or frontier', () => {
    expect(isAvailable(NOMINATIVE, READER)).toBe(true);
    expect(isAvailable(GENITIVE, READER)).toBe(true);
    expect(isAvailable(DATIVE, READER)).toBe(false);
    expect(isAvailable(ACCUSATIVE, READER)).toBe(false);
    expect(isAvailable(GENITIVE, READER, DEFAULT_EXTENT)).toBe(true);
  });

  it('takes the extent: Any shows every cell, Solid only drops the frontier ones', () => {
    for (const cell of cellsOf(article)) expect(isAvailable(cell, READER, 'any')).toBe(true);
    expect(isAvailable(NOMINATIVE, READER, 'solid')).toBe(true);
    expect(isAvailable(GENITIVE, READER, 'solid')).toBe(false);
    expect(isAvailable(DATIVE, READER, 'solid')).toBe(false);
  });

  it('gives each cell its standing: open, notYet (shown under Any though not his), outside (his, hidden by Solid only) or locked', () => {
    const standings = (extent: GrammarExtent) => [NOMINATIVE, GENITIVE, DATIVE, ACCUSATIVE].map((cell) => standingOf(cell, READER, extent));
    expect(standings('any')).toEqual(['open', 'open', 'notYet', 'notYet']);
    expect(standings('solid+frontier')).toEqual(['open', 'open', 'locked', 'locked']);
    expect(standings('solid')).toEqual(['open', 'outside', 'locked', 'locked']);
  });

  it('counts the cells that are shown and his, and says it as the extent would: the list and the table read one line', () => {
    expect(availableCount(article, READER)).toEqual({ available: 12, total: 24 });
    expect(availableCount(article, READER, 'any')).toEqual({ available: 12, total: 24 });
    expect(availableCount(article, READER, 'solid+frontier')).toEqual({ available: 12, total: 24 });
    expect(availableCount(article, READER, 'solid')).toEqual({ available: 6, total: 24 });
    expect(availableText(availableCount(article, READER))).toBe('Available forms: 12 of 24');
    expect(availableText(availableCount(article, READER, 'any'), 'any')).toBe('All 24 forms shown, 12 available');
    expect(availableText(availableCount(article, READER, 'solid+frontier'), 'solid+frontier')).toBe('Available forms: 12 of 24');
    expect(availableText(availableCount(article, READER, 'solid'), 'solid')).toBe('Solid forms: 6 of 24');
  });
});

describe('the settings whose choices are extents (one table, src/settings/definitions/grammarExtent.ts)', () => {
  it('keep their stored values and their own subsets of options, each option naming the extent it stands for', () => {
    expect(EXTENT_SETTINGS.weaveGrammar.options.map((o) => [o.value, o.label, o.extent])).toEqual([
      ['any', 'Any', 'any'],
      ['solid', 'Solid', 'solid'],
      ['solid+frontier', '+ Frontier', 'solid+frontier'],
    ]);
    expect(EXTENT_SETTINGS.pickerGrammar.options.map((o) => [o.value, o.label, o.extent])).toEqual([
      ['solid', 'Solid grammar', 'solid'],
      ['frontier', 'Frontier grammar', 'solid+frontier'],
    ]);
    expect(EXTENT_SETTINGS.paradigmExtent.options.map((o) => [o.value, o.label, o.extent])).toEqual(EXTENTS.map((e) => [e, EXTENT_LABELS[e], e]));
  });

  it('extentOf reads a stored value as its extent, and a value a setting does not have as its default', () => {
    expect(extentOf('weaveGrammar', 'solid+frontier')).toBe('solid+frontier');
    expect(extentOf('weaveGrammar', 'solid')).toBe('solid');
    expect(extentOf('weaveGrammar', 'nope')).toBe('any');
    expect(extentOf('pickerGrammar', 'frontier')).toBe('solid+frontier');
    expect(extentOf('pickerGrammar', 'solid')).toBe('solid');
    expect(extentOf('pickerGrammar', '')).toBe('solid+frontier');
    for (const e of EXTENTS) expect(extentOf('paradigmExtent', e)).toBe(e);
    expect(extentOf('paradigmExtent', 'all')).toBe(DEFAULT_EXTENT);
  });

  it('feed the registry: the Grammar and New words at entries allow exactly the table\'s values, and How much of a table is a setting of its own', () => {
    for (const key of ['weaveGrammar', 'pickerGrammar', 'paradigmExtent'] as const) {
      const allowed = SETTINGS.find((s) => s.key === key)?.allowed;
      expect(allowed?.kind, key).toBe('choice');
      if (allowed?.kind === 'choice') expect(allowed.values).toEqual(EXTENT_SETTINGS[key].options.map(({ value, label }) => ({ value, label })));
    }
    expect(paradigmExtentSetting.key).toBe('paradigmExtent');
    expect(paradigmExtentSetting.default).toBe(DEFAULT_EXTENT);
    expect(paradigmExtentSetting.label).toBe('How much of a table');
    expect(paradigmExtentSetting.section).toBe('paradigms');
    expect(paradigmExtentSetting.parse('solid')).toBe('solid');
    expect(paradigmExtentSetting.parse('cram')).toBe(DEFAULT_EXTENT);
  });
});
