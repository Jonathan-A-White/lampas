// The tutor client's registry for Lampas (mw-t3xu9a.4, docs/ask-tutor.md 'What the tutor can see'): the six facts it reads, the places it may take him to
// (one for every screen of src/nav/route.ts, and a chapter), and the screen key its up-front list goes by.
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { todayNow } from '../../src/data/learnerToday';
import { currentSettings } from '../../src/settings/registry';
import { ROUTES, routeOf } from '../../src/nav/route';
import { SCREEN_NAMES } from '../../src/tutor/screen';
import { reportScreen } from '../../src/tutor/screenContext';
import { askRegistry, placeNameOf, lampasRegistry, screenKey } from '../../src/tutor/registry';

afterAll(() => db.close());
beforeEach(async () => {
  await db.open();
  await Promise.all([db.settings.clear(), db.words.clear(), db.reviews.clear(), db.meta.clear()]);
  await db.meta.bulkPut([{ key: 'wordsSeeded', value: '1' }, { key: 'reviewsSeeded', value: '1' }]);
  window.location.hash = '';
});
afterEach(() => {
  document.body.innerHTML = '';
});

const registry = lampasRegistry();

describe('the facts', () => {
  it('defines the ten facts (the three of memorizing are in tests/unit/tutor-memorize.test.ts, verse-lists in tests/unit/tutor-verse-lists.test.ts), three of them core', () => {
    expect(registry.facts.map((f) => f.name).sort()).toEqual(['memorizeEvidence', 'memorizing', 'progress', 'rusty-words', 'settings', 'today-drill', 'verse-lists', 'verseText', 'where-he-is', 'works']);
    expect(registry.facts.filter((f) => f.core).map((f) => f.name).sort()).toEqual(['settings', 'today-drill', 'where-he-is']);
    for (const fact of registry.facts) expect(fact.tell.length).toBeGreaterThan(10);
  });

  it('today-drill is the field of the Today chip, as todayNow has it', async () => {
    const read = await registry.read('today-drill');
    expect(read).toEqual({ ok: true, value: await todayNow() });
    expect((read as { value: unknown[] }).value.length).toBeGreaterThan(0);
  });

  it('settings is what every setting holds now', async () => {
    expect(await registry.read('settings')).toEqual({ ok: true, value: await currentSettings() });
  });

  it('where-he-is reads the reader address, the open screen and the sheets open', async () => {
    window.location.hash = '#/?b=jhn&c=3&v=16&view=greek';
    expect(await registry.read('where-he-is')).toEqual({
      ok: true,
      value: { screen: 'Reader', route: 'home', reader: { book: 'jhn', chapter: 3, view: 'greek', verse: 16 } },
    });
    window.location.hash = '#/words';
    const stop = reportScreen({ name: 'Words', facts: [{ label: 'His words', value: '3' }] });
    document.body.innerHTML = '<div role="dialog"><h2>Talk</h2></div><div role="dialog"><h3>Word</h3></div>';
    expect(await registry.read('where-he-is')).toEqual({
      ok: true,
      value: { screen: 'Words', route: 'words', facts: [{ label: 'His words', value: '3' }], sheets: ['Talk', 'Word'] },
    });
    stop();
  });

  it('progress, rusty-words and works read without failing on an empty phone', async () => {
    for (const name of ['progress', 'rusty-words', 'works']) expect((await registry.read(name)).ok).toBe(true);
    expect(await registry.read('progress')).toMatchObject({ ok: true, value: { learner: expect.any(String) } });
  });
});

describe('the places', () => {
  it('has a place for every route of the route table, and no name twice', () => {
    expect(ROUTES.length).toBeGreaterThanOrEqual(28);
    const names = registry.places.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
    for (const route of ROUTES) expect(registry.place(placeNameOf(route)), route).toBeDefined();
    expect(registry.place('chapter')).toBeDefined();
    const all = [...registry.facts, ...registry.commands, ...registry.places].map((e) => e.name);
    expect(new Set(all).size).toBe(all.length);
  });

  it.each(ROUTES)('opens %s through navigate, as a pushed entry marked as a tutor go', async (route) => {
    window.location.hash = route === 'home' ? '#/words' : '';
    const opened = await registry.open(placeNameOf(route), {});
    expect(opened).toEqual({ ok: true });
    expect(routeOf(window.location.hash)).toBe(route);
    expect(window.history.state).toEqual({ tutorGo: true });
  });

  it('opens a chapter, refusing a book or chapter the app does not have', async () => {
    expect(await registry.open('chapter', { book: 'col', chapter: 1 })).toEqual({ ok: true });
    expect(window.location.hash).toBe('#/?b=col&c=1');
    expect(window.history.state).toEqual({ tutorGo: true });
    expect(await registry.open('chapter', { book: 'col', chapter: 9 })).toMatchObject({ ok: false });
    expect(await registry.open('chapter', { book: 'psa', chapter: 1 })).toMatchObject({ ok: false });
  });

  it('tells each screen by the name the app gives it', () => {
    for (const [route, name] of Object.entries(SCREEN_NAMES)) expect(registry.place(placeNameOf(route as keyof typeof SCREEN_NAMES))?.tell).toContain(name);
  });
});

describe('the catalogue and the screen key', () => {
  it('lists every name with its tell line, sorted', () => {
    const catalogue = registry.catalogue();
    expect(catalogue.map((c) => c.name)).toEqual([...catalogue.map((c) => c.name)].sort());
    expect(catalogue.every((c) => c.tell && c.tell.length > 0)).toBe(true);
    // 4200 before memorizing (mw-fu7dqf.12) added three facts, four commands and the session args of a place, 1,712 bytes; every request carries it
    // then 5,900 on main; the fact verse-lists and the id of the place lists (mw-t3xu9a.10) add about 240 bytes
    expect(JSON.stringify(catalogue).length).toBeLessThan(6200);
  });

  it('keys the up-front list by the screen name, the Reader for the plain address', () => {
    window.location.hash = '#/';
    expect(screenKey()).toBe('Reader');
    window.location.hash = '#/memory';
    expect(screenKey()).toBe('Memory');
    const stop = reportScreen({ name: 'Goal', facts: [] });
    expect(screenKey()).toBe('Goal');
    stop();
  });

  it('the verse ask has a smaller set: facts only, and its own settings', () => {
    const ask = askRegistry();
    expect(ask.places).toHaveLength(0);
    expect(ask.facts.map((f) => f.name).sort()).toEqual(['settings', 'today-drill', 'where-he-is']);
    expect(ask.facts.every((f) => f.core)).toBe(true);
  });
});
