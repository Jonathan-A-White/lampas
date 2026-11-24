// The settings lists are gathered from the files of src/settings/definitions/ and src/settings/entries/ (mw-6ww.175.105): a definition file added to a directory is in DEFINITIONS and in
// SETTINGS with no edit to src/settings/definitions/index.ts or src/settings/registry.ts.
import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { groupOf as groupIn, rowsInOrder } from 'pwa-kit/settings';
import { describe, expect, it } from 'vitest';
import { DoorButton } from '../../src/settings/SettingsHome';
import { DEFINITIONS } from '../../src/settings/definitions';
import type { SectionId } from '../../src/settings/define';
import { fromDefinition } from '../../src/settings/entry';
import { CONTROL_MODULES } from '../../src/settings/controls';
import { controlsOf, definitionsOf, derivedOf, doorsOf, entriesOf, extraRowsOf, layoutOf, rowsWith, type Modules } from '../../src/settings/gather';
import { CONTROLS, DOORS, GROUPS, HOME_SECTIONS, ROWS, SECTIONS, SETTINGS, TOOL_ROWS, homeEntries, readValues, rowOfSetting, settingOf, settingProblems, type SettingsRow } from '../support/settings';
import * as clash from '../fixtures/settings-controls-clash';
import { ExampleControl } from '../fixtures/settings-controls/example';

/** A section that only a fixture brings (SectionId lists the sections the app has). */
const FIXTURE_SECTION = 'fixtureSection' as SectionId;

const FIXTURE_DEFINITIONS: Modules = import.meta.glob('../fixtures/settings-definitions/*.ts', { eager: true });
const FIXTURE_ENTRIES: Modules = import.meta.glob('../fixtures/settings-entries/*.ts', { eager: true });
const FIXTURE_PAGES: Modules = import.meta.glob('../fixtures/settings-pages/*.ts', { eager: true });
const WRONG_PAGE: Modules = import.meta.glob('../fixtures/settings-pages-bad/wrongPage.ts', { eager: true });
const NO_TITLE: Modules = import.meta.glob('../fixtures/settings-pages-bad/noTitle.ts', { eager: true });
const FIXTURE_DERIVED: Modules = import.meta.glob('../fixtures/settings-derived/*.ts', { eager: true });
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

// The rows are gathered from the definitions (mw-6ww.175.107): a definition file that names a page, a section and a place has its row in the right group with no edit to src/settings/rows.ts, and the
// tests that read the registry hold no list of every setting, so the same checks pass with the fixture setting added.
describe('a definition file with a page, a section and a place', () => {
  const fixtureEntries = entriesOf(FIXTURE_PAGES, {}, fromDefinition);
  const laid = layoutOf(SECTIONS, GROUPS, FIXTURE_PAGES, HOME_SECTIONS);
  const rowsOfFixture = rowsWith([...ROWS, ...fixtureEntries.map(rowOfSetting)], extraRowsOf(FIXTURE_PAGES));

  it('brings its section, with its title, after the listed ones and last on its page, and the other pages keep theirs', () => {
    expect(laid.sections.at(-1)).toEqual({ id: 'fixtureSection', title: 'The fixture section', hint: 'A section that only a test brings.' });
    expect(laid.sections.slice(0, SECTIONS.length)).toEqual(SECTIONS);
    expect(laid.pages.find((g) => g.id === 'tutor')?.sections.at(-1)).toBe('fixtureSection');
    expect(laid.pages.filter((g) => g.id !== 'tutor')).toEqual(GROUPS.filter((g) => g.id !== 'tutor'));
    expect(laid.pages.find((g) => g.id === 'tutor')?.sections.slice(0, -1)).toEqual(GROUPS.find((g) => g.id === 'tutor')?.sections);
  });

  it('has its row in the group of its page, at its place, and a setting of a section a page holds needs no page', () => {
    const rows = rowsInOrder(laid.sections, rowsOfFixture);
    const mine = rows.filter((r) => r.section === FIXTURE_SECTION).map((r) => r.key);
    // the settings at their slots (7, 8), the row `after` the first, then the rows that are no settings by their place
    expect(mine).toEqual(['pageFixture', 'fixtureAfter', 'pageFixtureTwo', 'link.fixture']);
    expect(groupIn(laid.pages, FIXTURE_SECTION).id).toBe('tutor');
    expect(groupIn(laid.pages, 'talk' as SectionId).id).toBe('tutor');
    expect(fixtureEntries.find((e) => e.key === 'pageFixtureOld')?.section).toBe('talk');
    expect(rowsOfFixture.find((r) => r.key === 'pageFixture')?.ai).toBe(true);
    expect(rowsOfFixture.find((r) => r.key === 'pageFixtureTwo')?.ai).toBeUndefined();
  });

  it('puts a door of the home before the group it names', () => {
    const doors = [...DOORS, ...doorsOf(FIXTURE_PAGES)];
    expect(doors.map((d) => d.id)).toEqual(['counted', 'fixtureDoor']);
    const ids = homeEntries({ developerMode: 'on' }, ROWS, doors).map((e) => e.id);
    expect(ids.indexOf('fixtureDoor')).toBe(ids.indexOf('listening') - 1);
    expect(ids.indexOf('counted')).toBe(ids.indexOf('developer') - 1);
  });

  it('opens the address the door names, on the home and not What Lampas has counted', async () => {
    const [door] = doorsOf(FIXTURE_PAGES);
    expect(door.link).toBe('#/settings?page=fixtureDoor');
    window.location.hash = '#/settings';
    render(<DoorButton id={door.id} title={door.title} hint={door.hint} link={door.link} />);
    await userEvent.click(screen.getByRole('button', { name: /Fixture door/ }));
    expect(window.location.hash).toBe(door.link);
  });

  it('is refused when it names a page its section is not on, or brings a section with no title, naming the setting', () => {
    expect(() => layoutOf(SECTIONS, GROUPS, WRONG_PAGE, HOME_SECTIONS)).toThrow(/'wrongPageFixture'.*'daily'.*'talk'.*'tutor'/);
    expect(() => layoutOf(SECTIONS, GROUPS, NO_TITLE, HOME_SECTIONS)).toThrow(/'noTitleFixture'.*sectionTitle/);
  });

  it('is refused when a row names a row to come after that is not there', () => {
    expect(() => rowsWith(ROWS, extraRowsOf(FIXTURE_PAGES))).toThrow(/'pageFixture'/);
  });

  it('adds nothing a test must be told of: the registry checks of the three shared tests hold with it added', () => {
    expect(settingProblems([...SETTINGS, ...fixtureEntries])).toEqual([]);
    expect(fixtureEntries.map((e) => e.key)).toEqual(['pageFixture', 'pageFixtureTwo', 'pageFixtureOld']);
  });
});

describe('the real rows and pages', () => {
  it('are gathered: no row that is not a setting, no section or door is written out in rows.ts', () => {
    const rows = readFileSync('src/settings/rows.ts', 'utf8');
    expect(rows).toContain('extraRowsOf(EXTRA_MODULES)');
    expect(rows).toContain('layoutOf(');
    expect(rows).toContain('doorsOf(EXTRA_MODULES)');
    expect(rows).not.toMatch(/key: 'link\./);
    expect(rows).not.toMatch(/AI_KEYS/);
    expect(readFileSync('src/settings/extraRows/index.ts', 'utf8')).toContain('import.meta.glob');
  });

  it('draw each page in the order of its sections, the rows made from the settings before the rows that are not, the Bibles in Logos directly after logosBible', () => {
    const order = (rows: readonly SettingsRow[]): string[] => rows.map((r) => r.key);
    const keys = order(ROWS);
    const sectionRank = (r: SettingsRow): number => SECTIONS.findIndex((sec) => sec.id === r.section);
    for (let i = 1; i < ROWS.length; i++) expect(sectionRank(ROWS[i]), ROWS[i].key).toBeGreaterThanOrEqual(sectionRank(ROWS[i - 1]));
    const isSetting = new Set(SETTINGS.map((s) => s.key));
    for (const sec of SECTIONS) {
      const inSection = ROWS.filter((r) => r.section === sec.id && !r.key.startsWith('sermons.'));
      const firstOther = inSection.findIndex((r) => !isSetting.has(r.key) && !r.key.startsWith('logosBible'));
      if (firstOther >= 0) for (const r of inSection.slice(firstOther)) expect(isSetting.has(r.key), `${r.key} in ${sec.id}`).toBe(false);
    }
    expect(keys.slice(keys.indexOf('logosBible'), keys.indexOf('logosBible') + 4)).toEqual(['logosBible', 'logosBibleOt', 'logosBibleApocrypha', 'logosBibleSeptuagint']);
    expect(TOOL_ROWS.map((r) => r.key)).toEqual(['library', 'link.lists', 'link.memorize', 'link.paradigms', 'link.words', 'link.review']);
    expect(DOORS.map((d) => d.id)).toEqual(['counted']);
  });

  it('list the Settings home: the groups with a row, What Lampas has counted last before Developer, and last of all until Developer mode is found', () => {
    expect(
      homeEntries({ developerMode: 'on' })
        .map((e) => e.id)
        .slice(-2),
    ).toEqual(['counted', 'developer']);
    expect(
      homeEntries({ developerMode: 'hidden' })
        .map((e) => e.id)
        .at(-1),
    ).toBe('counted');
    expect(GROUPS.map((g) => g.id)).toEqual(['reading', 'greek', 'tutor', 'listening', 'daily', 'study', 'account', 'developer']);
  });
});

// A value a row depends on that no setting holds is gathered from the files too (mw-6ww.175.112): a file that exports one is read by readValues with no edit to src/settings/rows.ts.
describe('a derived value in a file of a directory', () => {
  const dependsOnKey = (key: string): SettingsRow => ({ key: `needs.${key}`, label: 'Needs', hint: 'A row that depends on a derived value.', section: FIXTURE_SECTION, dependsOn: { key, shown: (value) => value !== '' } });

  it('is given by readValues, from the settings it reads, and a key a family matches is given too', async () => {
    const derived = derivedOf(FIXTURE_DERIVED);
    expect(derived).toHaveLength(2);
    const rows = [dependsOnKey('fixture.pair'), dependsOnKey('fixture.family.alpha'), dependsOnKey('theme')];
    const values = await readValues(rows, derived);
    const [theme, weave] = [String(await settingOf('theme')?.read()), String(await settingOf('weave')?.read())];
    expect(values['fixture.pair']).toBe(`${theme}+${weave}`);
    expect(values['fixture.family.alpha']).toBe('alpha');
    // a key no derived value matches is still the setting's own
    expect(values.theme).toBe(theme);
  });

  it('is not given by the real readValues until its file is among the real ones, and the real derived values are gathered, not written out in rows.ts', async () => {
    const real = await readValues([dependsOnKey('fixture.pair')]);
    expect(real['fixture.pair']).toBe('undefined');
    const rows = readFileSync('src/settings/rows.ts', 'utf8');
    expect(rows).toContain('derivedOf(');
    expect(rows).not.toMatch(/no setting of its own/);
    for (const name of ['DEPTH_KEY', 'LOGOS_RANDOM_KEY', 'LOGOS_REPHIL_KEY', 'OWNS_PREFIX']) expect(rows, name).not.toMatch(new RegExp(`if \\(key.*${name}`));
  });

  it('gives the real derived values from the real files: the higher dial, the pair of settings, Developer mode', async () => {
    const values = await readValues();
    expect(values.depth).toMatch(/^[0-5]$/);
    expect(values['devotional.logosRandom']).toBe('off');
    expect(values['pronunciationSeparate.grc']).toBe('off');
    expect(['hidden', 'on', 'off']).toContain(values.developerMode);
  });
});
