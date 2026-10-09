// The ring of his last 20 grammar answers and the settings New words at / Move it (mw-hqd5bz.11), in the settings store.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import {
  clearGrammarAnswers,
  getGrammarAnswers,
  getGrammarMove,
  getPickerGrammar,
  pushGrammarAnswer,
  setGrammarMove,
  setPickerGrammar,
} from '../../src/data/repositories';
import { clearBus, latest } from '../../src/events/bus';
import { makeMove, pendingMove } from '../../src/review/pickerMove';

beforeEach(async () => {
  clearBus();
  await db.open();
  await db.settings.clear();
});
afterAll(() => db.close());

const push = async (...answers: boolean[]) => {
  for (const a of answers) await pushGrammarAnswer(a);
};

describe('the answer ring', () => {
  it('starts empty and keeps the answers in order', async () => {
    expect(await getGrammarAnswers()).toEqual([]);
    await push(true, false, true);
    expect(await getGrammarAnswers()).toEqual([true, false, true]);
  });

  it('keeps only the last 20', async () => {
    await push(...Array<boolean>(5).fill(false), ...Array<boolean>(20).fill(true));
    const kept = await getGrammarAnswers();
    expect(kept).toHaveLength(20);
    expect(kept.every(Boolean)).toBe(true);
  });

  it('is forgotten by clearGrammarAnswers', async () => {
    await push(true);
    await clearGrammarAnswers();
    expect(await getGrammarAnswers()).toEqual([]);
  });
});

describe('New words at and Move it', () => {
  it('are Frontier grammar and Ask until chosen, and keep what is chosen', async () => {
    expect([await getPickerGrammar(), await getGrammarMove()]).toEqual(['frontier', 'ask']);
    await setPickerGrammar('solid');
    await setGrammarMove('auto');
    expect([await getPickerGrammar(), await getGrammarMove()]).toEqual(['solid', 'auto']);
  });

  it('pendingMove follows the rule and Move it: Off never, Ask and Auto say how', async () => {
    await setPickerGrammar('solid');
    await push(...Array<boolean>(20).fill(true));
    expect(await pendingMove()).toEqual({ to: 'frontier', how: 'ask' });
    await setGrammarMove('auto');
    expect(await pendingMove()).toEqual({ to: 'frontier', how: 'auto' });
    await setGrammarMove('off');
    expect(await pendingMove()).toBeNull();
  });

  it('pendingMove is null with 19 answers, and a made move sets the level, forgets the answers and tells the bus', async () => {
    await setPickerGrammar('solid');
    await push(...Array<boolean>(19).fill(true));
    expect(await pendingMove()).toBeNull();
    await pushGrammarAnswer(true);
    const move = await pendingMove();
    expect(move).not.toBeNull();
    await makeMove(move as NonNullable<typeof move>);
    expect(await getPickerGrammar()).toBe('frontier');
    expect(await getGrammarAnswers()).toEqual([]);
    expect(latest('picker-level-moved')).toEqual({ kind: 'picker-level-moved', level: 'frontier', how: 'ask' });
  });
});
