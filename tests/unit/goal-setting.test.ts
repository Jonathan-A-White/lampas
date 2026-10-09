// The 'goal' setting (mw-hqd5bz.4): a text setting the Settings screen and the tutor write through the registry; it keeps
// 'Read 1 John 1:1' (or nothing) and tells the bus.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { getGoal } from '../../src/data/repositories';
import { clearBus, latest } from '../../src/events/bus';
import { applyChanges, currentSettings, settingOf, undoChange, writeSetting } from '../../src/settings/registry';
import { settingsBlock, settingsChangesSchema } from '../../src/settings/grindText';

afterAll(() => db.close());

beforeEach(async () => {
  clearBus();
  await db.open();
  await db.settings.clear();
});

describe('the goal setting', () => {
  it('is a text setting called Goal with a hint', () => {
    const entry = settingOf('goal');
    expect(entry?.label).toBe('Goal');
    expect(entry?.hint).toBe('The passage you are working toward: a book, a chapter or a verse.');
    expect(entry?.allowed).toMatchObject({ kind: 'text', example: '1 John 1:1' });
  });

  it('saves Read 1 John 1:1 and publishes goal-changed with the goal', async () => {
    await writeSetting('goal', '1 John 1:1');
    expect(await getGoal()).toBe('Read 1 John 1:1');
    expect(latest('goal-changed')).toEqual({ kind: 'goal-changed', goal: { book: '1jn', chapter: 1, verse: 1 } });
  });

  it('saves a chapter and a whole book, however it was typed', async () => {
    await writeSetting('goal', 'read 1 john 1');
    expect(await getGoal()).toBe('Read 1 John 1');
    await writeSetting('goal', '1jn');
    expect(await getGoal()).toBe('Read 1 John');
    expect(latest('goal-changed')?.goal).toEqual({ book: '1jn' });
  });

  it('clears with an empty text and publishes goal-changed with no goal', async () => {
    await writeSetting('goal', '1 John 1');
    await writeSetting('goal', '');
    expect(await getGoal()).toBe('');
    expect(latest('goal-changed')).toEqual({ kind: 'goal-changed', goal: null });
  });

  it('refuses, in applyChanges, a book the text lacks, a chapter or verse past the end, and a number, naming the setting', async () => {
    const { applied, refused } = await applyChanges([
      { key: 'goal', value: 'Hezekiah 1' },
      { key: 'goal', value: '1 John 6' },
      { key: 'goal', value: '1 John 1:99' },
      { key: 'goal', value: 3 },
    ]);
    expect(applied).toEqual([]);
    expect(refused).toHaveLength(4);
    expect(refused[0]).toBe('Left out Goal: "Hezekiah 1" is not a value it allows.');
    expect(await getGoal()).toBe('');
    expect(latest('goal-changed')).toBeUndefined();
  });

  it('applies 1 John 1 from the tutor and shows it as Goal: Read 1 John 1', async () => {
    const { applied, refused } = await applyChanges([{ key: 'goal', value: '1 John 1' }]);
    expect(refused).toEqual([]);
    expect(applied).toEqual([{ key: 'goal', label: 'Goal', from: '', to: '1 John 1', shown: 'Goal: Read 1 John 1' }]);
    expect(await getGoal()).toBe('Read 1 John 1');
  });

  it('clears from the tutor with an empty text and shows Goal: none; Undo puts the goal back', async () => {
    await writeSetting('goal', '1 John 1:1');
    const { applied } = await applyChanges([{ key: 'goal', value: '' }]);
    expect(applied[0]).toMatchObject({ from: 'Read 1 John 1:1', to: '', shown: 'Goal: none' });
    expect(await getGoal()).toBe('');
    await undoChange(applied[0]);
    expect(await getGoal()).toBe('Read 1 John 1:1');
    expect(latest('goal-changed')?.goal).toEqual({ book: '1jn', chapter: 1, verse: 1 });
  });

  it('is reported to the tutor as the saved text, empty when none', async () => {
    expect((await currentSettings()).goal).toBe('');
    await writeSetting('goal', 'Romans 8:28');
    expect((await currentSettings()).goal).toBe('Read Romans 8:28');
  });

  it('is told to the grind as text with an example, and as a string of at most 80 characters', () => {
    expect(settingsBlock()).toContain('Value: text, for example "1 John 1:1" (a book, a chapter or a verse; "" for none).');
    const items = (settingsChangesSchema().items as { anyOf: { properties: { key: { const: string }; value: unknown } }[] }).anyOf;
    expect(items.find((i) => i.properties.key.const === 'goal')?.properties.value).toEqual({ type: 'string', maxLength: 80 });
  });
});
