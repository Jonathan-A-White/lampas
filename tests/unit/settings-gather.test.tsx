// The settings lists are gathered from the files of src/settings/definitions/ and src/settings/entries/ (mw-6ww.175.105): a definition file added to a directory is in DEFINITIONS and in
// SETTINGS with no edit to src/settings/definitions/index.ts or src/settings/registry.ts.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFINITIONS } from '../../src/settings/definitions';
import { fromDefinition } from '../../src/settings/entry';
import { CONTROL_MODULES } from '../../src/settings/controls';
import { controlsOf, definitionsOf, entriesOf, type Modules } from '../../src/settings/gather';
import { CONTROLS, ROWS, SETTINGS } from '../support/settings';
import * as clash from '../fixtures/settings-controls-clash';
import { ExampleControl } from '../fixtures/settings-controls/example';

const FIXTURE_DEFINITIONS: Modules = import.meta.glob('../fixtures/settings-definitions/*.ts', { eager: true });
const FIXTURE_ENTRIES: Modules = import.meta.glob('../fixtures/settings-entries/*.ts', { eager: true });
const FIXTURE_CONTROLS: Modules = import.meta.glob('../fixtures/settings-controls/*.tsx', { eager: true });

describe('a definition file in a directory', () => {
  it('is in DEFINITIONS, in its order, and a setting kept outside is not', () => {
    expect(definitionsOf(FIXTURE_DEFINITIONS).map((d) => d.key)).toEqual(['exampleFixture', 'lastFixture']);
  });

  it('is in SETTINGS at its slot, among the entries made by hand, and one with no slot is last', () => {
    const keys = entriesOf(FIXTURE_DEFINITIONS, FIXTURE_ENTRIES, fromDefinition).map((e) => e.key);
    expect(keys).toEqual(['exampleFixture', 'handMadeFixture', 'lastFixture']);
  });

  it('is what the app gathers: no hand-kept list of settings is left in the two files', () => {
    const index = readFileSync('src/settings/definitions/index.ts', 'utf8');
    const registry = readFileSync('src/settings/registry.ts', 'utf8');
    expect(index).not.toMatch(/Setting,/);
    expect(registry).not.toMatch(/fromDefinition\(\w+Setting\)/);
    expect(index).toContain('import.meta.glob');
    expect(registry).toContain('entriesOf(');
  });
});

describe('the real lists', () => {
  it('have each setting once, and each declared one has its entry', () => {
    const keys = DEFINITIONS.map((d) => d.key);
    expect(new Set(keys).size).toBe(keys.length);
    const entries = SETTINGS.map((s) => s.key);
    expect(new Set(entries).size).toBe(entries.length);
    expect(keys.filter((key) => !entries.includes(key))).toEqual([]);
  });
});

// The controls are gathered from the files of src/settings/controls/ (mw-6ww.175.106): a control file added to a directory is in CONTROLS with no edit to src/settings/controls/index.ts.
describe('a control file in a directory', () => {
  it('is in CONTROLS under the row keys it names, and under each row that starts with a prefix it names', () => {
    const found = controlsOf(FIXTURE_CONTROLS, ['exampleFixture', 'example.one', 'example.two', 'other']);
    expect(Object.keys(found).sort()).toEqual(['example.one', 'example.two', 'exampleFixture']);
    expect(found.exampleFixture).toBe(ExampleControl);
    expect(found['example.two']).toBe(ExampleControl);
  });

  it('is refused when a second control draws the same row, naming the row', () => {
    expect(() => controlsOf({ ...FIXTURE_CONTROLS, clash }, ['exampleFixture'])).toThrow(/'exampleFixture'/);
  });

  it('is what the app gathers: no hand-kept list of controls is left in the index', () => {
    const index = readFileSync('src/settings/controls/index.ts', 'utf8');
    expect(index).toContain('import.meta.glob');
    expect(index).toContain('controlsOf(');
    expect(index).not.toMatch(/Control,/);
    expect(Object.keys(CONTROL_MODULES).length).toBeGreaterThan(20);
  });
});

describe('the real controls', () => {
  it('have each row of ROWS a control (the sermon sources are drawn together on their own page)', () => {
    expect(ROWS.map((r) => r.key).filter((key) => !key.startsWith('sermons.') && CONTROLS[key] === undefined)).toEqual([]);
  });
});
