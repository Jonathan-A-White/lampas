// The questions he has been asked, per idea (mw-indx1x6.1, docs/grammar.md 'More items from the mill'): kept newest-30 in the settings store, written when a question is asked in
// Review, Drill it, the short drill or Prove it; a kept item he has been asked is not served (the screens: seen-items-screens.test.tsx).
import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { MAX_SEEN, checkedItems, buildDrillItemsRequest, type AnsweredItem, type DrillItemsAnswer, type DrillItemsRequest } from '../../src/data/grammar/fetchedItems';
import { ideaOf } from '../../src/data/grammar/ladder';
import type { GrammarQuestion } from '../../src/data/grammar/questions';
import { countFetchedItems, listSeen, noteSeen, saveFetchedItems, takeFetchedItems } from '../../src/data/repositories';
import { GRAMMAR } from '../../src/review/kinds';
import { stubChapterFetch } from '../support/chapter-fetch';

const chapter = JSON.parse(readFileSync('public/data/1jn/1.json', 'utf8')) as Chapter;
const passage = [chapter];
const IDEA = 'declension-2';
const asked = (n: number): GrammarQuestion => ({ kind: 'tap-form', ideaId: IDEA, prompt: `Tap form ${n}`, options: ['a', 'b', 'c', 'd'], right: 'a', ref: '1 John 1:1' });

const TAP: AnsweredItem = {
  idea: IDEA,
  kind: 'tap-form',
  ref: '1 John 1:1',
  prompt: 'Tap the genitive singular noun',
  options: ['ἀρχῆς', 'λόγου', 'ζωῆς', 'ὀφθαλμοῖς'],
  right: 'λόγου',
};
const request = (): DrillItemsRequest => buildDrillItemsRequest([ideaOf(IDEA)], new Map([[IDEA, 2]]), passage) as DrillItemsRequest;
const keptItem = (prompt = TAP.prompt): GrammarQuestion => ({ ...checkedItems({ items: [TAP] } as DrillItemsAnswer, request(), passage)[0], prompt });

beforeEach(async () => {
  stubChapterFetch();
  localStorage.clear();
  await db.open();
  await db.settings.clear();
});

describe('the questions he has been asked', () => {
  it('keeps the newest MAX_SEEN of an idea, the oldest first', async () => {
    expect(MAX_SEEN).toBe(30);
    for (let n = 0; n < MAX_SEEN + 5; n++) await noteSeen(asked(n));
    const seen = await listSeen(IDEA);
    expect(seen).toHaveLength(MAX_SEEN);
    expect(seen[0]).toEqual({ prompt: 'Tap form 5', ref: '1 John 1:1' });
    expect(seen[MAX_SEEN - 1]).toEqual({ prompt: `Tap form ${MAX_SEEN + 4}`, ref: '1 John 1:1' });
    // in the settings store under seenItems.<idea id>
    expect(JSON.parse((await db.settings.get(`seenItems.${IDEA}`))?.value as string)).toHaveLength(MAX_SEEN);
  });

  it('moves a question asked again to the newest place, and keeps an idea apart from another', async () => {
    await noteSeen(asked(1));
    await noteSeen(asked(2));
    await noteSeen(asked(1));
    await noteSeen({ ...asked(9), ideaId: 'case-genitive' });
    expect((await listSeen(IDEA)).map((q) => q.prompt)).toEqual(['Tap form 2', 'Tap form 1']);
    expect((await listSeen('case-genitive')).map((q) => q.prompt)).toEqual(['Tap form 9']);
  });

  it('notes no question with no verse and none on an idea the mill is not asked about', async () => {
    await noteSeen({ ...asked(1), ref: undefined });
    await noteSeen({ ...asked(2), ideaId: 'letter-alpha' });
    await noteSeen({ ...asked(3), ideaId: 'no-such-idea' });
    expect(await db.settings.where('key').startsWith('seenItems.').count()).toBe(0);
  });

  it('reads back no entry that is not a prompt and a verse', async () => {
    await db.settings.put({ key: `seenItems.${IDEA}`, value: JSON.stringify([{ prompt: 'x' }, 4, { prompt: 'Tap form 1', ref: '1 John 1:1' }]) });
    expect(await listSeen(IDEA)).toEqual([{ prompt: 'Tap form 1', ref: '1 John 1:1' }]);
    await db.settings.put({ key: `seenItems.${IDEA}`, value: 'not json' });
    expect(await listSeen(IDEA)).toEqual([]);
  });

  it('is written when Review records an answer to a question', async () => {
    await GRAMMAR.record({ kind: 'grammar', id: IDEA, question: asked(4), mode: 'choice' }, true);
    expect(await listSeen(IDEA)).toEqual([{ prompt: 'Tap form 4', ref: '1 John 1:1' }]);
  });

  it('is not served again: a kept item he has been asked is dropped, and the next one is served', async () => {
    await saveFetchedItems([keptItem('Tap the genitive singular noun'), keptItem('Tap the second declension noun')]);
    await noteSeen(keptItem('Tap the genitive singular noun'));
    expect((await takeFetchedItems([IDEA])).get(IDEA)?.prompt).toBe('Tap the second declension noun');
    expect(await countFetchedItems(IDEA)).toBe(0);
    // and a kept list of nothing but seen items serves nothing and is emptied
    await saveFetchedItems([keptItem('Tap the genitive singular noun')]);
    expect((await takeFetchedItems([IDEA])).size).toBe(0);
    expect(await countFetchedItems(IDEA)).toBe(0);
  });
});
