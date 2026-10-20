// Today's devotional (mw-5r3p30.680): the tutor's "pick a different devotional" while Which devotional is Random re-draws today's pick through the ONE
// function the Another tap uses (dailyStore.ts pickAnotherDevotional) and leaves Which devotional on Random; with a fixed devotional the tutor's change
// of devotional is still a change of that setting.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { ASYNC_WAIT_MS } from '../support/timeouts';
import { DEFAULT_DEVOTIONAL, DEVOTIONALS, RANDOM, devotionalForDay, tickedDevotionals } from '../../src/data/daily/devotionals';

vi.mock('../../src/data/daily/dailyStore', async (original) => {
  const real = await original<typeof import('../../src/data/daily/dailyStore')>();
  return { ...real, pickAnotherDevotional: vi.fn(real.pickAnotherDevotional) };
});

import { getDay, localDate, pickAnotherDevotional } from '../../src/data/daily/dailyStore';
import { Today } from '../../src/today/Today';
import { applyChanges, currentSettings, settingOf, undoChange } from '../../src/settings/registry';

afterAll(() => {
  cleanup();
  db.close();
});

beforeEach(async () => {
  cleanup();
  vi.mocked(pickAnotherDevotional).mockClear();
  await db.open();
  await db.settings.clear();
});

const timeout = ASYNC_WAIT_MS;
const TWO = ['LLS:20.10.1', 'LLS:20.10.2'];
const todayDate = () => localDate(new Date());
const kept = async (key: string) => (await db.settings.get(key))?.value;

async function onRandom(): Promise<void> {
  await db.settings.bulkPut([
    { key: 'devotional', value: RANDOM },
    { key: 'devotionalDraw', value: TWO.join(',') },
  ]);
}

describe('the Today\'s devotional setting', () => {
  it('is a talkable entry that reads the id of the devotional Today shows', async () => {
    await onRandom();
    const entry = settingOf('todaysDevotional');
    expect(entry?.label).toBe("Today's devotional");
    const shown = devotionalForDay(RANDOM, TWO, new Date()).id;
    expect(await entry?.read()).toBe(shown);
    expect((await currentSettings()).todaysDevotional).toBe(shown);
  });

  it('with Random, "another" re-draws today through pickAnotherDevotional and Which devotional stays Random', async () => {
    await onRandom();
    const before = devotionalForDay(RANDOM, TWO, new Date()).id;
    const { applied, refused } = await applyChanges([{ key: 'todaysDevotional', value: 'another' }]);
    expect(refused).toEqual([]);
    expect(pickAnotherDevotional).toHaveBeenCalledTimes(1);
    const after = (await getDay(todayDate())).devotional;
    expect(after).toBeDefined();
    expect(after).not.toBe(before);
    expect(TWO).toContain(after);
    expect(await kept('devotional')).toBe(RANDOM);
    expect(applied).toHaveLength(1);
    expect(applied[0]).toMatchObject({ key: 'todaysDevotional', from: before, to: 'another' });
    // Undo puts the day's devotional back
    await undoChange(applied[0]);
    expect((await getDay(todayDate())).devotional).toBe(before);
    expect(await kept('devotional')).toBe(RANDOM);
  });

  it('with Random, a named devotional is today\'s alone and Which devotional stays Random', async () => {
    await onRandom();
    const { refused } = await applyChanges([{ key: 'todaysDevotional', value: DEVOTIONALS[3].id }]);
    expect(refused).toEqual([]);
    expect((await getDay(todayDate())).devotional).toBe(DEVOTIONALS[3].id);
    expect(await kept('devotional')).toBe(RANDOM);
  });

  it('with a fixed devotional, today\'s devotional is left alone and the tutor\'s change of devotional is still a change of Which devotional', async () => {
    await db.settings.put({ key: 'devotional', value: 'LLS:20.10.2' });
    const none = await applyChanges([{ key: 'todaysDevotional', value: 'another' }]);
    expect(none.refused).toEqual([]);
    expect(pickAnotherDevotional).not.toHaveBeenCalled();
    expect((await getDay(todayDate())).devotional).toBeUndefined();
    const { applied } = await applyChanges([{ key: 'devotional', value: DEFAULT_DEVOTIONAL }]);
    expect(applied).toEqual([expect.objectContaining({ key: 'devotional', from: 'LLS:20.10.2', to: DEFAULT_DEVOTIONAL })]);
    expect(await kept('devotional')).toBe(DEFAULT_DEVOTIONAL);
  });

  it('refuses a value it does not allow', async () => {
    await onRandom();
    const { applied, refused } = await applyChanges([{ key: 'todaysDevotional', value: 'LLS:NOPE' }]);
    expect(applied).toEqual([]);
    expect(refused).toHaveLength(1);
  });
});

describe('the Another tap on Today ends in the same function', () => {
  it('calls pickAnotherDevotional once and leaves Random', async () => {
    await onRandom();
    window.location.hash = '#/today';
    render(<Today />);
    const another = await screen.findByRole('button', { name: 'Another devotional' });
    await act(async () => {
      await userEvent.click(another);
    });
    await vi.waitFor(() => expect(pickAnotherDevotional).toHaveBeenCalledTimes(1), { timeout });
    expect(await kept('devotional')).toBe(RANDOM);
    expect(tickedDevotionals(TWO.join(','))).toEqual(TWO);
  });
});
