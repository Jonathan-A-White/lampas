// What a talk's key says it is about, how the Share screen names it, and the list of recent talks it offers (mw-y3qno5.2).
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { addTurn, listRecentTalks } from '../../src/data/repositories';
import { describeShare } from '../../src/share/shareText';
import { newTalkRef, placeOf, talkLabel, timeAgo } from '../../src/share/talkPlace';

beforeEach(() => db.talks.clear());
afterAll(() => db.close());

describe('placeOf', () => {
  it('reads the keys the talks are kept under', () => {
    expect(placeOf('rom.8')).toEqual({ kind: 'bible', book: 'rom', chapter: 8, unit: null, quiz: false });
    expect(placeOf('rom.8.28')).toEqual({ kind: 'bible', book: 'rom', chapter: 8, unit: '28', quiz: false });
    expect(placeOf('1jn.1.1-4')).toEqual({ kind: 'bible', book: '1jn', chapter: 1, unit: '1-4', quiz: false });
    expect(placeOf('rom.8.1-11:quiz')).toEqual({ kind: 'bible', book: 'rom', chapter: 8, unit: '1-11', quiz: true });
    expect(placeOf('screen.my-study-way')).toEqual({ kind: 'screen', name: 'My study way' });
    expect(placeOf(newTalkRef(1760000000000))).toEqual({ kind: 'free', at: 1760000000000 });
  });

  it('refuses a key this app does not make', () => {
    for (const ref of ['', 'xyz.8', 'rom', 'rom.0', 'rom.8.x', 'rom.8.1.2', 'screen.nope', 'talk.soon']) expect(placeOf(ref)).toBeNull();
  });
});

describe('talkLabel and timeAgo', () => {
  it('names a talk as the lists show it', () => {
    expect(talkLabel('rom.8')).toBe('Romans 8');
    expect(talkLabel('rom.8.28')).toBe('Romans 8:28');
    expect(talkLabel('rom.8.1-11:quiz')).toBe('Quiz on Romans 8:1-11');
    expect(talkLabel('screen.goal')).toBe('Ask the tutor: Goal');
    expect(talkLabel(newTalkRef(Date.UTC(2026, 9, 10, 12)))).toBe('Talk of 10 Oct');
  });

  it('says how long ago, in the words he reads', () => {
    const now = Date.UTC(2026, 9, 10, 12);
    expect(timeAgo(now - 20_000, now)).toBe('just now');
    expect(timeAgo(now - 60_000, now)).toBe('1 minute ago');
    expect(timeAgo(now - 5 * 60_000, now)).toBe('5 minutes ago');
    expect(timeAgo(now - 3_600_000, now)).toBe('1 hour ago');
    expect(timeAgo(now - 2 * 3_600_000, now)).toBe('2 hours ago');
    expect(timeAgo(now - 24 * 3_600_000, now)).toBe('yesterday');
    expect(timeAgo(now - 3 * 24 * 3_600_000, now)).toBe('3 days ago');
    expect(timeAgo(now - 10 * 24 * 3_600_000, now)).toBe('30 Sep');
  });
});

describe('describeShare', () => {
  it('says what is waiting', () => {
    expect(describeShare({ files: [], text: 'x' })).toBe('Some words');
    expect(describeShare({ files: [{ name: 'a', type: 'image/png', bytes: new ArrayBuffer(1) }], text: undefined })).toBe('1 picture');
    const two = [1, 2].map(() => ({ name: 'a', type: 'image/png', bytes: new ArrayBuffer(1) }));
    expect(describeShare({ files: two, text: 'x' })).toBe('2 pictures and some words');
  });
});

describe('listRecentTalks', () => {
  it('lists each conversation once, the newest turn first, with the first thing he said in it', async () => {
    await addTurn('rom.8', 'First about the chapter?', 'a', [], 1000);
    await addTurn('rom.8.28', 'First about the verse?', 'a', [], 2000);
    await addTurn('rom.8', 'Second about the chapter?', 'a', [], 3000);
    await addTurn('screen.goal', 'raw words', 'a', [], 500, { changes: [], refused: [], cleanQ: 'Cleaned words.' });
    expect(await listRecentTalks()).toEqual([
      { ref: 'rom.8', firstQuestion: 'First about the chapter?', lastWhen: 3000 },
      { ref: 'rom.8.28', firstQuestion: 'First about the verse?', lastWhen: 2000 },
      { ref: 'screen.goal', firstQuestion: 'Cleaned words.', lastWhen: 500 },
    ]);
    expect(await listRecentTalks(2)).toHaveLength(2);
  });

  it('lists nothing when no talk was had', async () => {
    expect(await listRecentTalks()).toEqual([]);
  });
});
