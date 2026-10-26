// The commands of the tutor's registry (mw-t3xu9a.6, docs/ask-tutor.md 'What the tutor can do'): change a setting, tick a drill item, start a review round, add a word to his list
// and (a place) open a work. A button, a spoken yes and a tutor `do` run the same function, so each is checked here through the registry, with its args checked first.
import { readFileSync } from 'node:fs';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NO_CHAPTER } from '../../src/data/chapter';
import { localDate, getDay, setTicked } from '../../src/data/daily/dailyStore';
import { db } from '../../src/data/db';
import { forgetLexicon } from '../../src/data/lexicon';
import { todayNow } from '../../src/data/learnerToday';
import { wordIsListed } from '../../src/data/repositories';
import { setWorks } from '../../src/data/repositories';
import { setSetting } from '../../src/settings/store';
import { dailyTicksSetting } from '../../src/settings/definitions';
import { currentSettings } from '../../src/settings/registry';
import { hasPractise, takePractise } from '../../src/review/practise';
import { registerTalkLeave } from '../../src/talk/rustyOffer';
import { addWord, bibleTalkRegistry, changeSettings, lampasRegistry, tickToday, workDoor } from '../../src/tutor/registry';

afterAll(() => db.close());
beforeEach(async () => {
  await db.open();
  await Promise.all([db.settings.clear(), db.words.clear(), db.reviews.clear(), db.meta.clear()]);
  await db.meta.bulkPut([{ key: 'wordsSeeded', value: '1' }, { key: 'reviewsSeeded', value: '1' }]);
  window.location.hash = '';
  forgetLexicon();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => (String(input) === '/data/lexicon.json' ? new Response(readFileSync('public/data/lexicon.json', 'utf8'), { status: 200 }) : new Response('not found', { status: 404 }))),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const registry = lampasRegistry();
const scope = { title: '', chapter: NO_CHAPTER, verse: null };

describe('the registry lists the commands and the work place', () => {
  it('has the four commands of this story with their kinds (memorizing adds four, tests/unit/tutor-memorize.test.ts), and open-work as a place', () => {
    expect(registry.commands.map((c) => [c.name, c.kind]).slice(0, 4)).toEqual([
      ['set-setting', 'undoable'],
      ['tick-today', 'undoable'],
      ['start-review', 'free'],
      ['add-word', 'undoable'],
    ]);
    expect(registry.commands).toHaveLength(8);
    expect(registry.place('open-work')).toBeDefined();
    for (const command of registry.commands) expect(command.tell.length).toBeGreaterThan(10);
  });
});

describe('set-setting', () => {
  it('changes a setting through the registry, and its undo puts the previous value back', async () => {
    const before = (await currentSettings()).theme;
    const to = before === 'dark' ? 'light' : 'dark';
    const ran = await registry.run('set-setting', { name: 'theme', value: to });
    expect(ran).toMatchObject({ ok: true });
    expect((await currentSettings()).theme).toBe(to);
    expect(ran.ok && ran.said).toMatch(/^Changed: /);
    if (!ran.ok || !ran.undo) throw new Error('no undo');
    await ran.undo();
    expect((await currentSettings()).theme).toBe(before);
  });

  it('refuses a missing name, an extra arg and a wrong type before anything runs', async () => {
    const run = vi.spyOn(registry.command('set-setting')!, 'run');
    expect((await registry.run('set-setting', { value: 'dark' })).ok).toBe(false);
    expect((await registry.run('set-setting', { name: 'theme', value: 'dark', extra: 1 })).ok).toBe(false);
    expect((await registry.run('set-setting', { name: 7, value: 'dark' })).ok).toBe(false);
    expect(run).not.toHaveBeenCalled();
  });

  it('says what a value or a setting it does not allow is, and changes nothing', async () => {
    const before = await currentSettings();
    const ran = await registry.run('set-setting', { name: 'theme', value: 'plaid' });
    expect(ran.ok && ran.said).toMatch(/^Left out Theme/);
    expect(ran.ok && ran.undo).toBeUndefined();
    const none = await registry.run('set-setting', { name: 'nothing-like-this', value: 1 });
    expect(none.ok && none.said).toMatch(/no such setting/);
    expect(await currentSettings()).toEqual(before);
  });

  it('changeSettings is the one way in: the batch of an answer runs the command once per change, in order, with the refusals as sentences', async () => {
    const run = vi.spyOn(bibleTalkRegistry().command('set-setting')!, 'run');
    const result = await changeSettings([{ key: 'theme', value: 'dark' }, { key: 'theme', value: 'light' }, { key: 'theme', value: 'plaid' }, 'junk']);
    expect(run).toHaveBeenCalledTimes(3);
    expect(result.applied.map((a) => a.to)).toEqual(['dark', 'light']);
    expect(result.applied[1].from).toBe('dark');
    expect(result.refused).toHaveLength(2);
    expect(await changeSettings('not a list')).toEqual({ applied: [], refused: [] });
  });
});

describe('tick-today', () => {
  it('ticks an item by its title or its piece id, and its undo unticks', async () => {
    const date = localDate(new Date());
    const review = (await todayNow())!.find((i) => i.kind === 'review')!;
    const ran = await registry.run('tick-today', { item: review.title });
    expect(ran.ok).toBe(true);
    expect((await getDay(date)).ticked).toEqual(['review']);
    if (!ran.ok || !ran.undo) throw new Error('no undo');
    await ran.undo();
    expect((await getDay(date)).ticked).toEqual([]);
    expect((await registry.run('tick-today', { item: 'review' })).ok).toBe(true);
    expect((await getDay(date)).ticked).toEqual(['review']);
  });

  it('unticks with on: false, and that one undoes by ticking again; an item already so has no undo', async () => {
    const date = localDate(new Date());
    await setTicked(date, 'plan', true);
    const off = await registry.run('tick-today', { item: 'plan', on: false });
    expect((await getDay(date)).ticked).toEqual([]);
    if (!off.ok || !off.undo) throw new Error('no undo');
    await off.undo();
    expect((await getDay(date)).ticked).toEqual(['plan']);
    const again = await registry.run('tick-today', { item: 'plan' });
    expect(again.ok && again.undo).toBeUndefined();
  });

  it('is refused for an item Today does not hold and while Tick boxes is Off, and for a bad arg before it runs', async () => {
    const date = localDate(new Date());
    const run = vi.spyOn(registry.command('tick-today')!, 'run');
    expect((await registry.run('tick-today', {})).ok).toBe(false);
    expect((await registry.run('tick-today', { item: 3 })).ok).toBe(false);
    expect((await registry.run('tick-today', { item: 'Psalm 999' })).ok).toBe(false);
    expect(run).toHaveBeenCalledTimes(1);
    await setSetting(dailyTicksSetting, 'off');
    expect((await registry.run('tick-today', { item: 'review' })).ok).toBe(false);
    expect((await getDay(date)).ticked).toEqual([]);
  });

  it('tickToday is the tap path: it runs the command', async () => {
    const run = vi.spyOn(bibleTalkRegistry().command('tick-today')!, 'run');
    await tickToday('devotional', true);
    expect(run).toHaveBeenCalledWith({ item: 'devotional', on: true });
    expect((await getDay(localDate(new Date()))).ticked).toEqual(['devotional']);
  });
});

describe('start-review', () => {
  it('opens Review as takeRustyOffer did: the sheet closes, the items are practised, and the address is the Review screen', async () => {
    await db.words.put({ lemma: 'λόγος', lang: 'grc', lemmas: [], gloss: 'word', lesson: 1, state: 'solid', since: 0 });
    let closed = 0;
    const unregister = registerTalkLeave(() => closed++);
    const ran = await registry.run('start-review', { items: [{ kind: 'word', id: 'λόγος' }] });
    unregister();
    expect(ran.ok).toBe(true);
    expect(closed).toBe(1);
    expect(window.location.hash).toBe('#/review');
    expect(takePractise()).toEqual([{ kind: 'word', id: 'λόγος' }]);
    expect((await db.words.get('λόγος'))?.state).toBe('learning');
  });

  it('with no items opens the round of what is due, and is free: no undo', async () => {
    const ran = await registry.run('start-review', {});
    expect(ran.ok && ran.undo).toBeUndefined();
    expect(window.location.hash).toBe('#/review');
    expect(hasPractise()).toBe(false);
  });

  it('refuses an item of a kind it does not know before anything runs', async () => {
    const run = vi.spyOn(registry.command('start-review')!, 'run');
    expect((await registry.run('start-review', { items: [{ kind: 'verse', id: 'x' }] })).ok).toBe(false);
    expect((await registry.run('start-review', { items: [{ kind: 'word' }] })).ok).toBe(false);
    expect((await registry.run('start-review', { items: 'λόγος' })).ok).toBe(false);
    expect(run).not.toHaveBeenCalled();
    expect(window.location.hash).toBe('');
  });
});

describe('add-word', () => {
  it('puts a word of the lexicon on his list, and its undo takes it off again', async () => {
    const ran = await registry.run('add-word', { word: 'λόγος' });
    expect(ran.ok).toBe(true);
    expect(await wordIsListed('λόγος')).toBe(true);
    if (!ran.ok || !ran.undo) throw new Error('no undo');
    await ran.undo();
    expect(await wordIsListed('λόγος')).toBe(false);
    expect(await db.words.get('λόγος')).toBeUndefined();
  });

  it('a word he dropped comes back as learning, and its undo drops it again as it was', async () => {
    await db.words.put({ lemma: 'λόγος', lang: 'grc', lemmas: [], gloss: 'word', lesson: 4, state: 'dropped', since: 5 });
    const ran = await registry.run('add-word', { word: 'λόγος' });
    expect((await db.words.get('λόγος'))?.state).toBe('learning');
    if (!ran.ok || !ran.undo) throw new Error('no undo');
    await ran.undo();
    expect(await db.words.get('λόγος')).toMatchObject({ state: 'dropped', since: 5, lesson: 4 });
  });

  it('a word already on the list changes nothing and has no undo; one the lexicon lacks is not added', async () => {
    await db.words.put({ lemma: 'λόγος', lang: 'grc', lemmas: [], gloss: 'word', lesson: 1, state: 'solid', since: 0 });
    const already = await registry.run('add-word', { word: 'λόγος' });
    expect(already.ok && already.undo).toBeUndefined();
    expect((await db.words.get('λόγος'))?.state).toBe('solid');
    const unknown = await registry.run('add-word', { word: 'ξξξξξ' });
    expect(unknown.ok && unknown.undo).toBeUndefined();
    expect(await db.words.get('ξξξξξ')).toBeUndefined();
  });

  it('is refused for a missing, empty or non-text word before it runs', async () => {
    const run = vi.spyOn(registry.command('add-word')!, 'run');
    expect((await registry.run('add-word', {})).ok).toBe(false);
    expect((await registry.run('add-word', { word: '' })).ok).toBe(false);
    expect((await registry.run('add-word', { word: 4 })).ok).toBe(false);
    expect(run).not.toHaveBeenCalled();
  });

  it('addWord is the way in for a tap and for words_to_add: it runs the command and says how it ended', async () => {
    const run = vi.spyOn(bibleTalkRegistry().command('add-word')!, 'run');
    expect(await addWord(scope, 'λόγος')).toMatchObject({ headword: 'λόγος', result: 'added' });
    expect(await addWord(scope, 'λόγος')).toMatchObject({ headword: 'λόγος', result: 'already' });
    expect(run).toHaveBeenCalledTimes(2);
  });
});

describe('open-work', () => {
  it('is a place that takes an id, and refuses a work not on his shelf', async () => {
    const opened = await registry.open('open-work', { id: 'no-such-work' });
    expect(opened.ok).toBe(false);
    expect((await registry.open('open-work', {})).ok).toBe(false);
    expect((await registry.open('open-work', { id: 3 })).ok).toBe(false);
  });

  it('opens a work he ticked in Logos by its Logos address, and a work he did not tick not at all', async () => {
    const open = vi.spyOn(workDoor, 'open').mockImplementation(() => undefined);
    expect((await registry.open('open-work', { id: 'calvin-institutes-lcc' })).ok).toBe(false);
    expect(open).not.toHaveBeenCalled();
    await setWorks(['calvin-institutes-lcc']);
    expect((await registry.open('open-work', { id: 'calvin-institutes-lcc' })).ok).toBe(true);
    expect(open).toHaveBeenCalledTimes(1);
    expect(open.mock.calls[0][0]).toBe('logosres:LLS:ICRWJKC');
  });
});

