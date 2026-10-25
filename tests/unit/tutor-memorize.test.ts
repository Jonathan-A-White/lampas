// What the tutor knows and does about memorizing (mw-fu7dqf.12, his Q8 A and the Q4 addition): three facts (memorizing, verseText, memorizeEvidence), four commands (memorize, unmemorize, moveVerse,
// startSession) and the place Memorize, all in the Bible talk's registry (src/tutor/registry.ts). The commands are src/memorize/commands.ts's own functions, the ones the buttons call.
import 'fake-indexeddb/auto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { createVerseList, getVerseList, setGreekInterest } from '../../src/data/repositories';
import { listMemorized, memorize, recordRecall } from '../../src/data/repositories/memorize';
import { clearBus } from '../../src/events/bus';
import * as commands from '../../src/memorize/commands';
import { verseTextOf } from '../../src/memorize/verseText';
import { isTutorGo } from '../../src/nav/route';
import { lampasRegistry, placeNameOf } from '../../src/tutor/registry';
import { stubChapterFetch } from '../support/chapter-fetch';
import { ASYNC_WAIT_MS } from '../support/timeouts';

afterAll(() => db.close());
beforeEach(async () => {
  await db.open();
  await Promise.all([db.reviews.clear(), db.recalls.clear(), db.verseLists.clear(), db.settings.clear(), db.words.clear(), db.meta.clear()]);
  await db.meta.bulkPut([{ key: 'wordsSeeded', value: '1' }, { key: 'reviewsSeeded', value: '1' }]);
  window.location.hash = '';
  stubChapterFetch();
  await setGreekInterest(3);
});
afterEach(() => {
  clearBus();
  vi.unstubAllGlobals();
});

const registry = lampasRegistry();
const NOW = Date.UTC(2026, 9, 24, 9, 0, 0);
const rows = async (): Promise<string[]> => (await listMemorized()).map((r) => `${r.lang}:${r.ref}`).sort();

describe('the registry lists what memorizing adds', () => {
  it('has the three facts, none of them core', () => {
    for (const name of ['memorizing', 'verseText', 'memorizeEvidence']) {
      const fact = registry.fact(name);
      expect(fact, name).toBeDefined();
      expect(fact?.core).toBeFalsy();
      expect(fact?.tell.length).toBeGreaterThan(10);
    }
  });

  it('has the four commands with their kinds, and the place Memorize, named so it does not meet the command memorize', () => {
    expect(registry.commands.map((c) => [c.name, c.kind]).filter(([name]) => ['memorize', 'unmemorize', 'moveVerse', 'startSession'].includes(name as string))).toEqual([
      ['memorize', 'undoable'],
      ['unmemorize', 'undoable'],
      ['moveVerse', 'undoable'],
      ['startSession', 'free'],
    ]);
    expect(placeNameOf('memorize')).toBe('memorize-screen');
    expect(registry.place('memorize-screen')?.tell).toBe('Opens Memorize');
    const all = [...registry.facts, ...registry.commands, ...registry.places].map((e) => e.name);
    expect(new Set(all).size).toBe(all.length);
  });

  it('is the buttons’ own functions: the registry runs commands.ts’s functions, not copies', () => {
    expect(registry.command('memorize')?.run).toBe(commands.memorizeVerse);
    expect(registry.command('unmemorize')?.run).toBe(commands.unmemorizeVerse);
    expect(registry.command('moveVerse')?.run).toBe(commands.moveVerse);
    expect(registry.command('startSession')?.run).toBe(commands.startSession);
  });
});

describe('the buttons', () => {
  /** every .tsx under src/ */
  const screens = (dir: string): string[] => readdirSync(dir).flatMap((name) => (statSync(join(dir, name)).isDirectory() ? screens(join(dir, name)) : name.endsWith('.tsx') ? [join(dir, name)] : []));

  it('write nothing to the schedule themselves: no screen imports memorize or unmemorize from the repository, only the commands', () => {
    const writers = screens('src').filter((file) => /import \{[^}]*\b(memorize|unmemorize|restoreVerseRows|recordRecall)\b[^}]*\} from '[^']*repositories\/memorize'/.test(readFileSync(file, 'utf8')));
    // a session records its recall through useSession (a hook), not a screen
    expect(writers).toEqual([]);
    for (const file of ['src/memorize/MemorizeControl.tsx', 'src/memorize/MemorizeScreen.tsx', 'src/lists/VerseListScreen.tsx']) expect(readFileSync(file, 'utf8'), file).toMatch(/from '[^']*memorize\/commands'|from '\.\/commands'/);
  });
});

describe('memorizing', () => {
  it('says nothing is memorized on an empty phone', async () => {
    expect(await registry.read('memorizing')).toEqual({ ok: true, value: { summary: 'Nothing memorized yet', verses: [] } });
  });

  it('reads his rows with the language, step, due, last score and misses, and the lists that hold each reference', async () => {
    const list = await createVerseList('Refuge', ['Rom.8.28'], 1);
    await memorize('Rom.8.28', ['en', 'el'], NOW);
    await memorize('John.3.16', ['en'], NOW);
    await recordRecall({ ref: 'Rom.8.28', lang: 'en', rung: 0, score: 0.8, missed: ['good', 'purpose'], asked: [{ token: 'all', lang: 'en' }], how: 'said' }, NOW);
    const read = await registry.read('memorizing');
    expect(read.ok).toBe(true);
    const value = (read as { value: { summary: string; verses: Array<Record<string, unknown>> } }).value;
    expect(value.summary).toMatch(/^2 verses memorized, 3 in all by language, \d due now$/);
    const rom = value.verses.find((v) => v.ref === 'Rom.8.28');
    expect(rom).toMatchObject({ heading: 'Romans 8:28', lists: [{ id: list.id, name: 'Refuge' }] });
    const en = (rom as { langs: Array<Record<string, unknown>> }).langs.find((l) => l.lang === 'en');
    expect(en).toMatchObject({ lang: 'en', step: expect.any(Number), due: expect.any(String), last: { score: 0.8, missed: ['good', 'purpose'] } });
    const el = (rom as { langs: Array<Record<string, unknown>> }).langs.find((l) => l.lang === 'el');
    expect(el).toMatchObject({ lang: 'el', last: null });
    expect(value.verses.find((v) => v.ref === 'John.3.16')).toMatchObject({ heading: 'John 3:16', lists: [] });
  });
});

describe('verseText', () => {
  it('gives a verse in English and Greek, and in the Weave once he memorizes it so', async () => {
    await memorize('Rom.8.28', ['en', 'el'], NOW);
    const two = await verseTextOf({ ref: 'Rom.8.28' });
    expect(Object.keys(two)).toEqual(['en', 'el']);
    expect(two.en).toContain('work together for the good');
    expect(two.el).toContain('ἀγαπῶσιν');
    await memorize('Rom.8.28', ['weave'], NOW);
    expect(Object.keys(await verseTextOf({ ref: 'Rom.8.28' }))).toEqual(['en', 'el', 'weave']);
  });

  it('is the text of a verse that is not memorized in English alone, and nothing for an Old Testament reference or a string that is no verse', async () => {
    expect(Object.keys(await verseTextOf({ ref: 'Rom.8.28' }))).toEqual(['en']);
    expect(await verseTextOf({ ref: 'Ps.62.1-2' })).toEqual({});
    expect(await verseTextOf({ ref: 'nonsense' })).toEqual({});
  });

  it('is read as the fact: the text of each verse he memorizes, by reference', async () => {
    await memorize('Rom.8.28', ['en', 'el'], NOW);
    const read = await registry.read('verseText');
    expect(read).toMatchObject({ ok: true, value: { 'Rom.8.28': { en: expect.stringContaining('work together'), el: expect.stringContaining('ἀγαπῶσιν') } } });
  });
});

describe('memorizeEvidence', () => {
  it('reads every recall with its summary line, the same the Ask for more form sends', async () => {
    expect(await registry.read('memorizeEvidence')).toEqual({ ok: true, value: { summary: 'No recalls yet', evidence: [] } });
    await memorize('Rom.8.28', ['en'], NOW);
    await recordRecall({ ref: 'Rom.8.28', lang: 'en', rung: 0, score: 0.8, missed: ['good'], asked: [{ token: 'all', lang: 'en' }], how: 'said' }, NOW);
    const read = await registry.read('memorizeEvidence');
    expect(read).toMatchObject({ ok: true, value: { summary: '1 verse, 1 recall, 0 passed', evidence: [{ ref: 'Rom.8.28', lang: 'en', recalls: [{ rung: 0, score: 0.8, missed: ['good'], gap: 0, how: 'said' }] }] } });
  });
});

describe('memorize', () => {
  it('makes the English row, says so, and its undo removes it', async () => {
    const ran = await registry.run('memorize', { ref: 'Rom.8.28' });
    expect(ran.ok && ran.said).toBe('Memorizing Romans 8:28 in English');
    expect(await rows()).toEqual(['en:Rom.8.28']);
    if (!ran.ok || !ran.undo) throw new Error('no undo');
    await ran.undo();
    expect(await rows()).toEqual([]);
  });

  it('undoes only what it added: a language he already had stays', async () => {
    await memorize('Rom.8.28', ['en'], NOW);
    const ran = await registry.run('memorize', { ref: 'Rom.8.28', langs: ['en', 'el'] });
    expect(ran.ok && ran.said).toBe('Memorizing Romans 8:28 in Greek');
    if (!ran.ok || !ran.undo) throw new Error('no undo');
    await ran.undo();
    expect(await rows()).toEqual(['en:Rom.8.28']);
  });

  it('refuses a language that is no language before anything runs, and skips an Old Testament reference with no undo', async () => {
    expect((await registry.run('memorize', { ref: 'Rom.8.28', langs: ['fr'] })).ok).toBe(false);
    const ot = await registry.run('memorize', { ref: 'Ps.62.1-2' });
    expect(ot).toMatchObject({ ok: true, said: 'No Old Testament text in Lampas yet: Ps 62:1-2' });
    expect(ot.ok && ot.undo).toBeUndefined();
    expect(await rows()).toEqual([]);
  });
});

describe('unmemorize', () => {
  it('with no lang removes every row, and its undo puts them back at the step they were', async () => {
    await memorize('Rom.8.28', ['en', 'el'], NOW);
    await recordRecall({ ref: 'Rom.8.28', lang: 'en', rung: 0, score: 1, missed: [], asked: [], how: 'said' }, NOW);
    const before = await db.reviews.where('kind').equals('verse').toArray();
    const ran = await registry.run('unmemorize', { ref: 'Rom.8.28' });
    expect(ran.ok && ran.said).toBe('Stopped memorizing Romans 8:28');
    expect(await rows()).toEqual([]);
    if (!ran.ok || !ran.undo) throw new Error('no undo');
    await ran.undo();
    expect(await db.reviews.where('kind').equals('verse').toArray()).toEqual(before);
  });

  it('with a lang removes that one only', async () => {
    await memorize('Rom.8.28', ['en', 'el'], NOW);
    const ran = await registry.run('unmemorize', { ref: 'Rom.8.28', lang: 'el' });
    expect(ran.ok && ran.said).toBe('Stopped memorizing Romans 8:28 in Greek');
    expect(await rows()).toEqual(['en:Rom.8.28']);
  });

  it('has no undo when nothing was memorized', async () => {
    const ran = await registry.run('unmemorize', { ref: 'Rom.8.28' });
    expect(ran.ok && ran.said).toBe('Romans 8:28 was not memorized');
    expect(ran.ok && ran.undo).toBeUndefined();
  });
});

describe('moveVerse', () => {
  it('moves the reference between lists and the verse stays memorized; its undo puts both lists back', async () => {
    const from = await createVerseList('Refuge', ['Ps.46.1', 'Rom.8.28'], 1);
    const to = await createVerseList('Hope', ['Rom.15.13'], 2);
    await memorize('Rom.8.28', ['en', 'el'], NOW);
    const ran = await registry.run('moveVerse', { ref: 'Rom.8.28', from: from.id, to: to.id });
    expect(ran.ok && ran.said).toBe('Moved Romans 8:28 from Refuge to Hope');
    expect((await getVerseList(from.id))?.refs).toEqual(['Ps.46.1']);
    expect((await getVerseList(to.id))?.refs).toEqual(['Rom.15.13', 'Rom.8.28']);
    expect(await rows()).toEqual(['el:Rom.8.28', 'en:Rom.8.28']);
    if (!ran.ok || !ran.undo) throw new Error('no undo');
    await ran.undo();
    expect((await getVerseList(from.id))?.refs).toEqual(['Ps.46.1', 'Rom.8.28']);
    expect((await getVerseList(to.id))?.refs).toEqual(['Rom.15.13']);
  });

  it('refuses a list that is not there, a reference the list does not hold, and the same list twice', async () => {
    const from = await createVerseList('Refuge', ['Rom.8.28'], 1);
    const to = await createVerseList('Hope', [], 2);
    expect((await registry.run('moveVerse', { ref: 'Rom.8.28', from: from.id, to: 999 })).ok).toBe(false);
    expect((await registry.run('moveVerse', { ref: 'John.3.16', from: from.id, to: to.id })).ok).toBe(false);
    expect((await registry.run('moveVerse', { ref: 'Rom.8.28', from: from.id, to: from.id })).ok).toBe(false);
    expect((await getVerseList(from.id))?.refs).toEqual(['Rom.8.28']);
  });

  it('leaves both lists as they were when the other already holds the reference, and says so', async () => {
    const from = await createVerseList('Refuge', ['Rom.8.28'], 1);
    const to = await createVerseList('Hope', ['Rom.8.28'], 2);
    const ran = await registry.run('moveVerse', { ref: 'Rom.8.28', from: from.id, to: to.id });
    expect(ran.ok && ran.said).toBe('Hope holds Romans 8:28 already');
    expect(ran.ok && ran.undo).toBeUndefined();
    expect((await getVerseList(from.id))?.refs).toEqual(['Rom.8.28']);
  });
});

describe('startSession and the place', () => {
  it('opens the session as a step of Back marked as a tutor go, and Back returns to where he was', async () => {
    await memorize('Rom.8.28', ['en'], NOW);
    window.location.hash = '#/words';
    const ran = await registry.run('startSession', { ref: 'Rom.8.28', lang: 'en' });
    expect(ran.ok && ran.said).toBe('Opened Romans 8:28 in English');
    expect(window.location.hash).toBe('#/memorize/Rom.8.28/en');
    expect(isTutorGo()).toBe(true);
    window.history.back();
    const timeout = ASYNC_WAIT_MS;
    await vi.waitFor(() => expect(window.location.hash).toBe('#/words'), { timeout });
  });

  it('refuses a verse that is not memorized in that language, an Old Testament reference and a language that is no language', async () => {
    await memorize('Rom.8.28', ['en'], NOW);
    window.location.hash = '#/words';
    expect((await registry.run('startSession', { ref: 'Rom.8.28', lang: 'el' })).ok).toBe(false);
    expect((await registry.run('startSession', { ref: 'Ps.62.1-2', lang: 'en' })).ok).toBe(false);
    expect((await registry.run('startSession', { ref: 'Rom.8.28', lang: 'fr' })).ok).toBe(false);
    expect(window.location.hash).toBe('#/words');
  });

  it('opens Memorize through navigate, as a tutor go', async () => {
    window.location.hash = '#/words';
    expect(await registry.open('memorize-screen', {})).toEqual({ ok: true });
    expect(window.location.hash).toBe('#/memorize');
    expect(window.history.state).toEqual({ tutorGo: true });
  });
});
