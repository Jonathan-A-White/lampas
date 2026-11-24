// The screens are gathered from the files of src/screens/ (mw-6ww.175.83, stage 3 of the Lampas registry): a screen file added to a directory is in the table routeOf and hashFor read, and App draws it,
// with no edit to src/nav/route.ts or src/App.tsx.
import { readFileSync, readdirSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ADDRESSES, ESSAY_PATH, hashFor, LESSONS_PATH, LISTS_PATH, MEMORIZE_PATH, nameOfFile, renderersOf, ROUTE_TABLE, ROUTES, routeIn, routeOf, routeTableOf, type Route, type ScreenModules } from '../support/routes';
import { RENDERERS, SCREEN_MODULES } from '../../src/screens';

const REAL_FILES = Object.keys(SCREEN_MODULES);
const FIXTURE_FILES = Object.keys(import.meta.glob('../fixtures/screens/*.tsx'));
const FIXTURE_SCREENS: ScreenModules = import.meta.glob('../fixtures/screens/*.tsx', { eager: true });
const SAME_NAME_FILES = Object.keys(import.meta.glob('../fixtures/screens-bad/exampleFixture.tsx'));
const WRONG_NAME: ScreenModules = import.meta.glob('../fixtures/screens-bad/wrongName.tsx', { eager: true });
const NO_SCREEN: ScreenModules = import.meta.glob('../fixtures/screens-bad/noScreen.tsx', { eager: true });

const EXAMPLE = 'exampleFixture' as Route;
const EXAMPLE_LIST = 'exampleListFixture' as Route;
/** The fixture list owns the addresses below its path, as ADDRESSES says for lists. */
const WITH_LIST = { ...ADDRESSES, exampleListFixture: { path: '#/example-list', under: true as const } };

describe('a screen file in a directory', () => {
  const table = routeTableOf([...REAL_FILES, ...FIXTURE_FILES], WITH_LIST);

  it('is in the table beside the real screens, and its address opens it', () => {
    expect(Object.keys(table)).toEqual(expect.arrayContaining([...ROUTES, EXAMPLE, EXAMPLE_LIST]));
    expect(routeIn(table, '#/exampleFixture')).toBe(EXAMPLE);
    expect(routeIn(table, '#/exampleFixture?x=1')).toBe(EXAMPLE);
    expect(table[EXAMPLE].path).toBe('#/exampleFixture');
  });

  it('owns the addresses below its path only when it says so', () => {
    expect(routeIn(table, '#/example-list')).toBe(EXAMPLE_LIST);
    expect(routeIn(table, '#/example-list/7')).toBe(EXAMPLE_LIST);
    expect(routeIn(table, '#/exampleFixture/7')).toBe('home');
    expect(routeIn(table, '#/example-listing')).toBe('home');
  });

  it('is drawn by its own render, and the real screens stay as they were', () => {
    const renders = renderersOf({ ...SCREEN_MODULES, ...FIXTURE_SCREENS });
    expect(renderToStaticMarkup(renders[EXAMPLE]({}))).toBe('<p>the example screen</p>');
    expect(routeIn(table, '#/words')).toBe('words');
    expect(routeIn(table, '#/lists/3')).toBe('lists');
    expect(routeIn(table, '#/')).toBe('home');
  });

  it('is not in the real table: that is the files of src/screens/ and nothing more', () => {
    expect(ROUTES).not.toContain(EXAMPLE);
    expect(routeOf('#/exampleFixture')).toBe('home');
  });

  it('a name used twice, a second Reader, a file of another name or of no screen is a mistake that says so', () => {
    expect(() => routeTableOf([...FIXTURE_FILES, ...SAME_NAME_FILES], WITH_LIST)).toThrow(/two screen files are named 'exampleFixture'/);
    expect(() => routeTableOf([...REAL_FILES, ...FIXTURE_FILES], { ...WITH_LIST, exampleFixture: { fallback: true } })).toThrow(/exactly one screen/);
    expect(() => routeTableOf(FIXTURE_FILES, WITH_LIST)).toThrow(/exactly one screen/);
    expect(routeIn(routeTableOf([]), '#/words')).toBe('home');
    expect(() => routeTableOf([...REAL_FILES, ...FIXTURE_FILES], { ...WITH_LIST, exampleFixture: { path: '#/words' } })).toThrow(/have the one address '#\/words'/);
    expect(() => renderersOf(WRONG_NAME)).toThrow(/is named for its screen/);
    expect(() => renderersOf(NO_SCREEN)).toThrow(/declares 0 screens/);
  });
});

describe('the real screens', () => {
  it('are the files of src/screens/, each named as its file is', () => {
    const files = readdirSync('src/screens')
      .filter((f) => f.endsWith('.tsx'))
      .map((f) => f.slice(0, -'.tsx'.length))
      .sort();
    expect([...ROUTES].sort()).toEqual(files);
    expect(REAL_FILES.map(nameOfFile).sort()).toEqual(files);
    expect(Object.keys(RENDERERS).sort()).toEqual(files);
    for (const route of ROUTES) expect(ROUTE_TABLE[route].name).toBe(route);
    for (const name of Object.keys(ADDRESSES)) expect(ROUTES, `ADDRESSES names '${name}'`).toContain(name);
  });

  it('open at the address they always had', () => {
    const addresses: Record<string, Route> = {
      '#/': 'home',
      '#/?b=rom&c=8': 'home',
      '#/nothing-here': 'home',
      '#/words': 'words',
      '#/diagram-lesson': 'diagram-lesson',
      '#/paradigms?t=article': 'paradigms',
      '#/preface': 'preface',
      '#/preface/robinson': 'essay',
      '#/lessons/variants': 'lessons',
      '#/lessons/variants/3': 'lessons',
      '#/lessons': 'home',
      '#/lists': 'lists',
      '#/lists/7': 'lists',
      '#/memorize': 'memorize',
      '#/memorize/Rom.8.28/en': 'memorize',
      '#/unlock?from=reader': 'unlock',
    };
    for (const [hash, route] of Object.entries(addresses)) expect(routeOf(hash), hash).toBe(route);
    expect([ROUTE_TABLE.lists.path, ROUTE_TABLE.memorize.path, ROUTE_TABLE.essay.path, ROUTE_TABLE.lessons.path]).toEqual([LISTS_PATH, MEMORIZE_PATH, ESSAY_PATH, LESSONS_PATH]);
    expect(hashFor('home')).toBe('#/');
    expect(hashFor('essay')).toBe('#/preface/robinson');
    expect(hashFor('lessons')).toBe('#/lessons/variants');
    expect(hashFor('ipa')).toBe('#/ipa');
    for (const route of ROUTES) if (route !== 'home') expect(routeOf(hashFor(route)), route).toBe(route);
  });

  it('are what route.ts and App.tsx use: no hand-kept list of them is left in the two files', () => {
    const route = readFileSync('src/nav/route.ts', 'utf8');
    const app = readFileSync('src/App.tsx', 'utf8');
    expect(route).not.toMatch(/if \(path === '#\//);
    expect(route).not.toMatch(/export type Route = '/);
    expect(route).toContain('routeTableOf(');
    expect(route).not.toContain('../screens');
    expect(app).not.toMatch(/route === '(words|settings|today)'/);
    expect(app).not.toMatch(/Screen \/>/);
    expect(readFileSync('src/screens/index.ts', 'utf8')).toContain('import.meta.glob');
  });
});
