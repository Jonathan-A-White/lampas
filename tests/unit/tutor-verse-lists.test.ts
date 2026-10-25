// The tutor opens one verse list by name (mw-t3xu9a.10): the fact `verse-lists` (each list's id, name and count, in the order the Verse lists screen shows them) and the place `lists` taking an optional id,
// so a go to `lists` {id} opens #/lists/<id> as a tutor go and Back returns to where he was; without an id it opens the Verse lists screen; an id that is no list's is refused.
import 'fake-indexeddb/auto';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { createVerseList } from '../../src/data/repositories';
import { readTarget } from '../../src/talk/go';
import { lampasRegistry } from '../../src/tutor/registry';
import { ASYNC_WAIT_MS } from '../support/timeouts';

afterAll(() => db.close());
beforeEach(async () => {
  await db.open();
  await db.verseLists.clear();
  window.location.hash = '';
});

const registry = lampasRegistry();
const NOW = Date.UTC(2026, 9, 24, 9, 0, 0);

describe('the registry lists the fact and the place’s id', () => {
  it('has the fact verse-lists, not core, and the place lists taking an optional id', () => {
    const fact = registry.fact('verse-lists');
    expect(fact).toBeDefined();
    expect(fact?.core).toBeFalsy();
    expect(fact?.tell).toMatch(/id/);
    const place = registry.place('lists');
    expect(place?.tell).toContain('Opens Verse lists');
    const args = place?.args as { required?: string[]; properties: Record<string, unknown> };
    expect(Object.keys(args.properties)).toEqual(['id']);
    expect(args.required ?? []).toEqual([]);
  });
});

describe('the fact verse-lists', () => {
  it('gives each list’s id, name and count, newest first as the Verse lists screen shows them', async () => {
    const romans = await createVerseList('Romans 8 hope', ['Rom.8.28', 'Rom.8.38-39', 'Rom.8.1'], NOW);
    const refuge = await createVerseList('Refuge', ['Ps.62.1-2'], NOW + 1000);
    const read = await registry.read('verse-lists');
    expect(read).toEqual({
      ok: true,
      value: [
        { id: refuge.id, name: 'Refuge', count: 1 },
        { id: romans.id, name: 'Romans 8 hope', count: 3 },
      ],
    });
  });

  it('gives an empty list when he has none', async () => {
    expect(await registry.read('verse-lists')).toEqual({ ok: true, value: [] });
  });
});

describe('the place lists', () => {
  it('with an id opens that list as a tutor go, and Back returns to where he was', async () => {
    const romans = await createVerseList('Romans 8 hope', ['Rom.8.28'], NOW);
    await createVerseList('Refuge', ['Ps.62.1-2'], NOW + 1000);
    window.location.hash = '#/words';
    expect(await registry.open('lists', { id: romans.id })).toEqual({ ok: true });
    expect(window.location.hash).toBe(`#/lists/${romans.id}`);
    expect(window.history.state).toEqual({ tutorGo: true });
    window.history.back();
    await vi.waitFor(() => expect(window.location.hash).toBe('#/words'), { timeout: ASYNC_WAIT_MS });
  });

  it('with no id opens the Verse lists screen, as a tutor go', async () => {
    window.location.hash = '#/words';
    expect(await registry.open('lists', {})).toEqual({ ok: true });
    expect(window.location.hash).toBe('#/lists');
    expect(window.history.state).toEqual({ tutorGo: true });
  });

  it('refuses an id that is no list’s, and an id that is no whole number, and goes nowhere', async () => {
    await createVerseList('Romans 8 hope', ['Rom.8.28'], NOW);
    window.location.hash = '#/words';
    expect((await registry.open('lists', { id: 999 })).ok).toBe(false);
    expect((await registry.open('lists', { id: 0 })).ok).toBe(false);
    expect((await registry.open('lists', { id: 'Romans' })).ok).toBe(false);
    expect(window.location.hash).toBe('#/words');
  });

  it('is a go the talk reads: {name: lists, args: {id}} is a place of the registry', async () => {
    const reading = readTarget({ name: 'lists', args: { id: 3 } }, registry);
    expect(reading).toEqual({ ok: true, target: { name: 'lists', args: { id: 3 }, title: 'Verse lists' } });
  });
});
